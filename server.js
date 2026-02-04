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

// Session structure: { sessionId: { host: ws, players: Map<playerId, { ws, playerName }>, gameState: any } }

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
    const url = new URL(req.url, `http://${req.headers.host}`);
    const sessionId = url.searchParams.get('session');
    const isHost = url.searchParams.get('host') === 'true';

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

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          handleHostMessage(sessionId, message);
        } catch (err) {
          console.error('[WS] Error parsing host message:', err);
        }
      });

      ws.on('close', () => {
        console.log(`[WS] Host disconnected from session ${sessionId}`);
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

    } else {
      // Player is connecting
      const session = sessions.get(sessionId);
      
      if (!session) {
        console.log(`[WS] Player rejected: Session ${sessionId} not found`);
        ws.send(JSON.stringify({
          type: 'ERROR',
          payload: { message: 'Session not found. Check the session code and try again.' },
          timestamp: Date.now(),
        }));
        ws.close(4004, 'Session not found');
        return;
      }

      // Temporary player ID until they send JOIN_GAME message
      let playerId = null;
      let playerName = null;

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          
          if (message.type === 'JOIN_GAME') {
            playerId = message.payload.playerId;
            playerName = message.payload.playerName;
            
            // Register player in session
            session.players.set(playerId, { ws, playerName });
            
            console.log(`[WS] Player joined: ${playerName} (${playerId}) in session ${sessionId}`);
            
            // Forward join message to host
            if (session.host && session.host.readyState === 1) {
              session.host.send(JSON.stringify({
                ...message,
                timestamp: Date.now(),
              }));
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
          console.log(`[WS] Player disconnected: ${playerName} (${playerId})`);
          session.players.delete(playerId);
          
          // Notify host of disconnection
          if (session.host && session.host.readyState === 1) {
            session.host.send(JSON.stringify({
              type: 'PLAYER_LEFT',
              payload: { playerId, playerName },
              timestamp: Date.now(),
            }));
          }
        }
      });
    }
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
