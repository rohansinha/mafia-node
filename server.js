/**
 * Custom Server for Mafia Game
 * 
 * This server runs both Next.js and a WebSocket server for local multiplayer.
 * The WebSocket server handles real-time communication between host and players.
 */

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { WebSocketServer } = require('ws');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0'; // Listen on all interfaces for local network access
const port = parseInt(process.env.PORT || '3000', 10);
const wsPort = parseInt(process.env.WS_PORT || '3001', 10);

// Initialize Next.js
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Store active game sessions
const sessions = new Map();

/**
 * Session structure:
 * {
 *   sessionId: {
 *     host: ws,
 *     players: Map<playerId, { ws, playerName, isConnected, gameRole, gamePlayerId }>,
 *     gameStarted: boolean,
 *     gameState: any
 *   }
 * }
 * 
 * - playerId: The persistent browser ID (stored in localStorage)
 * - gamePlayerId: The ID used in game state (assigned when game starts)
 * - gameRole: The player's role (assigned when game starts)
 */

app.prepare().then(() => {
  // Create HTTP server for Next.js
  const httpServer = createServer(async (req, res) => {
    try {
      // Note: url.parse is deprecated but is the standard Next.js pattern
      // The WHATWG URL API requires different handling for Next.js
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error handling request:', err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  httpServer.listen(port, hostname, () => {
    console.log(`> Next.js ready on http://${hostname}:${port}`);
  });

  // Create WebSocket server on separate port for game communication
  const wss = new WebSocketServer({ port: wsPort, host: hostname });

  console.log(`> WebSocket server ready on ws://${hostname}:${wsPort}`);

  wss.on('connection', (ws, req) => {
    console.log(`[WS] Incoming connection - URL: ${req.url}`);
    
    // Parse URL carefully - req.url might be just "/?session=X" or "/api/ws?session=X"
    let url;
    try {
      url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    } catch (e) {
      console.error('[WS] Failed to parse URL:', req.url, e);
      ws.close(4002, 'Invalid URL');
      return;
    }
    
    const sessionId = url.searchParams.get('session');
    const isHost = url.searchParams.get('host') === 'true';

    console.log(`[WS] Parsed - Session: ${sessionId}, IsHost: ${isHost}`);

    if (!sessionId) {
      console.log('[WS] Connection rejected: No session ID');
      ws.close(4001, 'Session ID required');
      return;
    }

    console.log(`[WS] New connection - Session: ${sessionId}, IsHost: ${isHost}`);

    if (isHost) {
      // Host is connecting
      if (sessions.has(sessionId)) {
        console.log(`[WS] Host reconnecting to session ${sessionId}`);
      } else {
        sessions.set(sessionId, {
          host: ws,
          players: new Map(),
          gameState: null,
        });
        console.log(`[WS] New session created: ${sessionId}`);
      }
      
      const session = sessions.get(sessionId);
      session.host = ws;

      // Send confirmation to host that connection is established
      ws.send(JSON.stringify({
        type: 'HOST_CONNECTED',
        payload: { sessionId },
        timestamp: Date.now(),
      }));
      console.log(`[WS] Sent HOST_CONNECTED to session ${sessionId}`);

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          console.log(`[WS] Host message received:`, message.type);
          handleHostMessage(sessionId, message);
        } catch (err) {
          console.error('[WS] Error parsing host message:', err);
        }
      });

      ws.on('close', (code, reason) => {
        console.log(`[WS] Host disconnected from session ${sessionId}, code: ${code}, reason: ${reason}`);
        // Notify all players that host disconnected
        const session = sessions.get(sessionId);
        if (session) {
          session.players.forEach((player) => {
            if (player.ws.readyState === 1) { // WebSocket.OPEN
              player.ws.send(JSON.stringify({
                type: 'HOST_DISCONNECTED',
                timestamp: Date.now(),
              }));
            }
          });
        }
      });

      ws.on('error', (err) => {
        console.error(`[WS] Host WebSocket error for session ${sessionId}:`, err);
      });

      return; // Important: don't fall through to player handling
    }

    // Player is connecting
    const session = sessions.get(sessionId);
    
    if (!session) {
      console.log(`[WS] Player rejected: Session ${sessionId} not found`);
      ws.send(JSON.stringify({
        type: 'error',
        payload: { message: 'Session not found. Check the session code and try again.' },
        timestamp: Date.now(),
      }));
      ws.close(4004, 'Session not found');
      return;
    }

    // Player ID from the connection (will be set when they send JOIN_GAME)
    let playerId = null;
    let playerName = null;
    let isReconnection = false;

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log(`[WS] Player message received - Type: ${message.type}, Session: ${sessionId}`);
        
        // Handle join_game message (new join or reconnection)
        if (message.type === 'join_game') {
          playerId = message.payload.playerId;
          playerName = message.payload.playerName;
          
          // Check if this is a reconnection (player with this ID already exists)
          const existingPlayer = session.players.get(playerId);
          
          if (existingPlayer) {
            // Reconnection - update the WebSocket connection
            isReconnection = true;
            existingPlayer.ws = ws;
            existingPlayer.isConnected = true;
            
            console.log(`[WS] Player reconnected: ${playerName} (${playerId}) in session ${sessionId}`);
            
            // Notify host of reconnection
            if (session.host && session.host.readyState === 1) {
              session.host.send(JSON.stringify({
                type: 'player_reconnected',
                payload: { 
                  playerId, 
                  playerName,
                  gamePlayerId: existingPlayer.gamePlayerId,
                  gameRole: existingPlayer.gameRole,
                },
                timestamp: Date.now(),
              }));
            }
            
            // If game has started, send the player their game state
            if (session.gameStarted && existingPlayer.gamePlayerId) {
              ws.send(JSON.stringify({
                type: 'rejoin_game',
                payload: {
                  gamePlayerId: existingPlayer.gamePlayerId,
                  gameRole: existingPlayer.gameRole,
                  gameStarted: true,
                },
                timestamp: Date.now(),
              }));
            }
          } else {
            // New player joining
            session.players.set(playerId, { 
              ws, 
              playerName, 
              isConnected: true,
              gamePlayerId: null,
              gameRole: null,
            });
            
            console.log(`[WS] New player joined: ${playerName} (${playerId}) in session ${sessionId}`);
            console.log(`[WS] Session now has ${session.players.size} player(s)`);
            
            // Forward join message to host
            if (session.host && session.host.readyState === 1) {
              session.host.send(JSON.stringify({
                ...message,
                timestamp: Date.now(),
              }));
            }
          }
        } else if (message.type === 'assign_game_role') {
          // Host is assigning a game role to a player (when game starts)
          const { targetPlayerId, gamePlayerId, gameRole } = message.payload;
          const player = session.players.get(targetPlayerId);
          if (player) {
            player.gamePlayerId = gamePlayerId;
            player.gameRole = gameRole;
            session.gameStarted = true;
            console.log(`[WS] Assigned role ${gameRole} to ${player.playerName}`);
          }
        } else if (playerId) {
          // Forward other messages to host
          handlePlayerMessage(sessionId, playerId, message);
        }
      } catch (err) {
        console.error('[WS] Error parsing player message:', err);
      }
    });

    ws.on('close', () => {
      if (playerId) {
        const player = session.players.get(playerId);
        
        if (player) {
          // Mark as disconnected but don't remove (allow reconnection)
          player.isConnected = false;
          player.ws = null;
          
          console.log(`[WS] Player disconnected: ${playerName} (${playerId}) - keeping in session for reconnection`);
          
          // Notify host of disconnection (but player can still reconnect)
          if (session.host && session.host.readyState === 1) {
            session.host.send(JSON.stringify({
              type: 'player_disconnected',
              payload: { playerId, playerName, canReconnect: true },
              timestamp: Date.now(),
            }));
          }
        }
      }
    });
  });

  // Handle messages from host to players
  function handleHostMessage(sessionId, message) {
    const session = sessions.get(sessionId);
    if (!session) return;

    // Check if message is for a specific player or broadcast
    if (message.targetPlayerId) {
      // Send to specific player
      const player = session.players.get(message.targetPlayerId);
      if (player && player.ws.readyState === 1) {
        player.ws.send(JSON.stringify({
          ...message,
          timestamp: Date.now(),
        }));
      }
    } else {
      // Broadcast to all players
      session.players.forEach((player) => {
        if (player.ws.readyState === 1) {
          player.ws.send(JSON.stringify({
            ...message,
            timestamp: Date.now(),
          }));
        }
      });
    }
  }

  // Handle messages from players to host
  function handlePlayerMessage(sessionId, playerId, message) {
    const session = sessions.get(sessionId);
    if (!session || !session.host) return;

    if (session.host.readyState === 1) {
      session.host.send(JSON.stringify({
        ...message,
        playerId,
        timestamp: Date.now(),
      }));
    }
  }

  // Cleanup stale sessions periodically
  setInterval(() => {
    sessions.forEach((session, sessionId) => {
      // Remove sessions where host has been disconnected for too long
      if (!session.host || session.host.readyState !== 1) {
        if (session.players.size === 0) {
          console.log(`[WS] Cleaning up stale session: ${sessionId}`);
          sessions.delete(sessionId);
        }
      }
    });
  }, 60000); // Every minute
});
