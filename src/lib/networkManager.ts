/**
 * Network Manager - Handles WebSocket communication for multiplayer modes
 * 
 * This module provides a unified networking layer that supports:
 * - Local multiplayer (devices on same network, no internet required)
 * - Online multiplayer (future: internet-based with dedicated server)
 * 
 * Architecture:
 * - Host device runs the WebSocket server and orchestrates the game
 * - Client devices connect to the host and submit their actions
 * - All game state is managed by the host; clients receive updates
 * 
 * TODO: Online Multiplayer Future Enhancements
 * - [ ] Implement dedicated game server (Node.js/Express + Socket.io)
 * - [ ] Add room creation/joining with room codes
 * - [ ] Implement player authentication (optional accounts)
 * - [ ] Add reconnection handling for dropped connections
 * - [ ] Server-side game state validation
 * - [ ] Add spectator mode
 * - [ ] Implement chat functionality
 * - [ ] Add latency compensation
 */

import { 
  GameState, 
  GameMessage, 
  MessageType, 
  Player,
  GamePhase,
  NightActionType,
  Role
} from '@/types/game';

// ============================================================================
// TYPES
// ============================================================================

export interface NetworkConfig {
  mode: 'local' | 'online';
  serverUrl?: string;           // For online mode: dedicated server URL
  port?: number;                // For local mode: WebSocket port
}

export interface PlayerConnection {
  playerId: string;
  playerName: string;
  ws?: WebSocket;
  isConnected: boolean;
  lastSeen: number;
}

export type MessageHandler = (message: GameMessage, senderId?: string) => void;

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_LOCAL_PORT = 3001;
const HEARTBEAT_INTERVAL = 5000;
const CONNECTION_TIMEOUT = 15000;

// ============================================================================
// NETWORK MANAGER CLASS
// ============================================================================

/**
 * NetworkManager handles all WebSocket communication for multiplayer games.
 * Can operate as either a host (server) or client.
 */
export class NetworkManager {
  private config: NetworkConfig;
  private ws: WebSocket | null = null;
  private messageHandlers: Map<MessageType, MessageHandler[]> = new Map();
  private isHost: boolean = false;
  private connections: Map<string, PlayerConnection> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private sessionId: string = '';
  private localPlayerId: string = '';

  constructor(config: NetworkConfig) {
    this.config = config;
  }

  // --------------------------------------------------------------------------
  // HOST METHODS (Server-side for local multiplayer)
  // --------------------------------------------------------------------------

  /**
   * Start hosting a local multiplayer session
   * Connects to the WebSocket server as the host
   */
  async startHosting(sessionId: string): Promise<{ sessionId: string; port: number }> {
    this.isHost = true;
    this.sessionId = sessionId;
    
    const port = this.config.port || DEFAULT_LOCAL_PORT;
    
    console.log(`[NetworkManager] Starting host session: ${sessionId}`);
    
    // Connect to the WebSocket server as host
    return new Promise((resolve, reject) => {
      let isSettled = false;
      
      try {
        // Use ws://localhost:port/?session=X&host=true format
        const wsUrl = `ws://localhost:${port}/?session=${sessionId}&host=true`;
        console.log(`[NetworkManager] Connecting to: ${wsUrl}`);
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          if (isSettled) return;
          isSettled = true;
          console.log('[NetworkManager] Host connected to WebSocket server');
          resolve({ sessionId, port });
        };

        this.ws.onmessage = (event) => {
          try {
            const message: GameMessage = JSON.parse(event.data);
            console.log('[NetworkManager] Host received message:', message.type, JSON.stringify(message).substring(0, 200));
            this.handleMessage(message);
          } catch (error) {
            console.error('[NetworkManager] Failed to parse message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('[NetworkManager] Host WebSocket error:', error);
          // Don't reject here - wait for onclose which gives us more info
        };

        this.ws.onclose = (event) => {
          console.log(`[NetworkManager] Host connection closed: code=${event.code}, reason=${event.reason}`);
          // Only reject if we haven't settled yet (connection failed during setup)
          if (!isSettled) {
            isSettled = true;
            reject(new Error(`Connection failed: ${event.reason || `code ${event.code}`}`));
          }
        };

        // Connection timeout
        setTimeout(() => {
          if (!isSettled) {
            isSettled = true;
            this.ws?.close();
            reject(new Error('Host connection timeout - is the server running?'));
          }
        }, 5000);

      } catch (error) {
        if (!isSettled) {
          isSettled = true;
          reject(error);
        }
      }
    });
  }

  /**
   * Broadcast a message to all connected players (host only)
   * Sends through the WebSocket server which relays to all players
   */
  broadcast(message: GameMessage): void {
    if (!this.isHost) {
      console.warn('[NetworkManager] Only host can broadcast');
      return;
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const messageWithTimestamp = {
        ...message,
        timestamp: Date.now(),
      };
      this.ws.send(JSON.stringify(messageWithTimestamp));
    } else {
      console.warn('[NetworkManager] Cannot broadcast: not connected to server');
    }
  }

  /**
   * Send a message to a specific player (host only)
   * Sends through the WebSocket server which relays to the target player
   */
  sendToPlayer(playerId: string, message: GameMessage): void {
    if (!this.isHost) {
      console.warn('[NetworkManager] Only host can send to specific players');
      return;
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const messageWithTimestamp = {
        ...message,
        targetPlayerId: playerId,
        timestamp: Date.now(),
      };
      this.ws.send(JSON.stringify(messageWithTimestamp));
    } else {
      console.warn('[NetworkManager] Cannot send: not connected to server');
    }
  }

  /**
   * Handle a new player connection (called by WebSocket server)
   */
  handlePlayerConnection(playerId: string, playerName: string, ws: WebSocket): void {
    this.connections.set(playerId, {
      playerId,
      playerName,
      ws,
      isConnected: true,
      lastSeen: Date.now(),
    });

    // Notify all players of the new connection
    this.broadcast({
      type: MessageType.PLAYER_JOINED,
      payload: { playerId, playerName },
    });

    console.log(`[NetworkManager] Player connected: ${playerName} (${playerId})`);
  }

  /**
   * Handle player disconnection
   */
  handlePlayerDisconnection(playerId: string): void {
    const connection = this.connections.get(playerId);
    if (connection) {
      connection.isConnected = false;
      
      this.broadcast({
        type: MessageType.PLAYER_LEFT,
        payload: { playerId, playerName: connection.playerName },
      });

      console.log(`[NetworkManager] Player disconnected: ${connection.playerName}`);
    }
  }

  // --------------------------------------------------------------------------
  // CLIENT METHODS
  // --------------------------------------------------------------------------

  /**
   * Connect to a host as a client
   */
  async connect(serverUrl: string, playerId: string, playerName: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.localPlayerId = playerId;
      let isSettled = false;
      
      console.log(`[NetworkManager] Attempting to connect to: ${serverUrl}`);
      
      try {
        this.ws = new WebSocket(serverUrl);

        this.ws.onopen = () => {
          if (isSettled) return;
          isSettled = true;
          console.log('[NetworkManager] Connected to host');
          
          // Send join message
          this.send({
            type: MessageType.JOIN_GAME,
            payload: { playerId, playerName },
            playerId,
          });

          this.startHeartbeat();
          resolve(true);
        };

        this.ws.onmessage = (event) => {
          try {
            const message: GameMessage = JSON.parse(event.data);
            console.log('[NetworkManager] Client received:', message.type);
            this.handleMessage(message);
          } catch (error) {
            console.error('[NetworkManager] Failed to parse message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('[NetworkManager] WebSocket error:', error);
          if (!isSettled) {
            isSettled = true;
            reject(error);
          }
        };

        this.ws.onclose = (event) => {
          console.log(`[NetworkManager] Connection closed: code=${event.code}, reason=${event.reason}`);
          this.stopHeartbeat();
          if (!isSettled) {
            isSettled = true;
            reject(new Error(`Connection closed: code ${event.code}, reason: ${event.reason || 'unknown'}`));
          } else {
            this.handleMessage({ type: MessageType.ERROR, payload: { message: 'Connection lost' } });
          }
        };

        // Connection timeout
        setTimeout(() => {
          if (!isSettled && this.ws?.readyState !== WebSocket.OPEN) {
            isSettled = true;
            console.log('[NetworkManager] Connection timeout');
            this.ws?.close();
            reject(new Error('Connection timeout'));
          }
        }, CONNECTION_TIMEOUT);

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Send a message to the host
   */
  send(message: GameMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const messageWithTimestamp = {
        ...message,
        timestamp: Date.now(),
        playerId: this.localPlayerId,
      };
      this.ws.send(JSON.stringify(messageWithTimestamp));
    } else {
      console.warn('[NetworkManager] Cannot send: not connected');
    }
  }

  // --------------------------------------------------------------------------
  // MESSAGE HANDLING
  // --------------------------------------------------------------------------

  /**
   * Register a handler for a specific message type
   */
  on(messageType: MessageType, handler: MessageHandler): void {
    const handlers = this.messageHandlers.get(messageType) || [];
    handlers.push(handler);
    this.messageHandlers.set(messageType, handlers);
  }

  /**
   * Remove a handler for a message type
   */
  off(messageType: MessageType, handler: MessageHandler): void {
    const handlers = this.messageHandlers.get(messageType) || [];
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
      this.messageHandlers.set(messageType, handlers);
    }
  }

  /**
   * Handle an incoming message
   */
  private handleMessage(message: GameMessage): void {
    const handlers = this.messageHandlers.get(message.type) || [];
    console.log(`[NetworkManager] handleMessage: ${message.type}, handlers: ${handlers.length}`);
    handlers.forEach((handler) => {
      try {
        handler(message, message.playerId);
      } catch (error) {
        console.error(`[NetworkManager] Error in handler for ${message.type}:`, error);
      }
    });
  }

  // --------------------------------------------------------------------------
  // UTILITY METHODS
  // --------------------------------------------------------------------------

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        // Send a ping (browsers handle this automatically, but we can track it)
      }
    }, HEARTBEAT_INTERVAL);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.connections.clear();
    this.messageHandlers.clear();
    
    console.log('[NetworkManager] Disconnected');
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Get list of connected players (host only)
   */
  getConnectedPlayers(): PlayerConnection[] {
    return Array.from(this.connections.values()).filter(c => c.isConnected);
  }

  /**
   * Get session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a random session ID for local multiplayer
 */
export function generateSessionId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/**
 * Get the local IP address for displaying to players
 * Uses WebRTC to detect the local network IP address
 */
export function getLocalIpAddress(): string {
  // In browser environment, we can't directly get the IP synchronously
  // Return empty string initially - use detectLocalIpAddress() for async detection
  if (typeof window !== 'undefined') {
    // If accessed via IP already, use that
    const hostname = window.location.hostname;
    if (hostname && hostname !== 'localhost' && !hostname.includes('127.0.0.1')) {
      return hostname;
    }
  }
  return '';
}

/**
 * Async function to detect local IP address using WebRTC
 * Falls back to manual entry if detection fails
 */
export async function detectLocalIpAddress(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  
  // If already accessed via IP, use that
  const hostname = window.location.hostname;
  if (hostname && hostname !== 'localhost' && !hostname.includes('127.0.0.1')) {
    return hostname;
  }

  return new Promise((resolve) => {
    // Timeout after 3 seconds
    const timeout = setTimeout(() => {
      resolve(null);
    }, 3000);

    try {
      const pc = new RTCPeerConnection({ iceServers: [] });
      pc.createDataChannel('');
      
      pc.onicecandidate = (event) => {
        if (!event.candidate) return;
        
        const candidate = event.candidate.candidate;
        // Look for local IP in the candidate string
        const ipMatch = candidate.match(/([0-9]{1,3}\.){3}[0-9]{1,3}/);
        if (ipMatch) {
          const ip = ipMatch[0];
          // Filter out localhost and link-local addresses
          if (!ip.startsWith('127.') && !ip.startsWith('169.254.')) {
            clearTimeout(timeout);
            pc.close();
            resolve(ip);
          }
        }
      };

      pc.createOffer()
        .then(offer => pc.setLocalDescription(offer))
        .catch(() => {
          clearTimeout(timeout);
          resolve(null);
        });
    } catch {
      clearTimeout(timeout);
      resolve(null);
    }
  });
}

/**
 * Create a connection URL for clients to join
 */
export function createConnectionUrl(host: string, port: number, sessionId: string): string {
  const protocol = host === 'localhost' ? 'ws' : 'wss';
  return `${protocol}://${host}:${port}/api/ws?session=${sessionId}`;
}

// ============================================================================
// GAME STATE SYNC HELPERS
// ============================================================================

/**
 * Create a sanitized game state for a specific player
 * Removes information they shouldn't see (other players' roles, etc.)
 */
export function sanitizeGameStateForPlayer(
  gameState: GameState, 
  playerId: string
): Partial<GameState> {
  const player = gameState.players.find(p => p.id === playerId);
  
  // During night phase, players only see their own role and alive status
  const sanitizedPlayers = gameState.players.map(p => ({
    id: p.id,
    name: p.name,
    status: p.status,
    // Only reveal role if it's their own role or if the role has been publicly revealed
    role: (p.id === playerId || p.isRevealed) ? p.role : undefined,
    isRevealed: p.isRevealed,
    isSilenced: p.isSilenced,
  }));

  return {
    gameMode: gameState.gameMode,
    players: sanitizedPlayers as Player[],
    currentPhase: gameState.currentPhase,
    dayCount: gameState.dayCount,
    // Only include votes if in day phase and voting is happening
    votes: gameState.currentPhase === GamePhase.DAY ? gameState.votes : {},
    winner: gameState.winner,
    currentNightActorId: gameState.currentNightActorId,
  };
}

/**
 * Determine which mafia member should choose the kill target
 * Priority: Godfather > Random Mafia (rotates each round)
 */
export function selectMafiaKiller(
  players: Player[], 
  dayCount: number
): Player | null {
  const aliveMafia = players.filter(
    p => p.status === 'Alive' && (p.role === Role.MAFIA || p.role === Role.GODFATHER)
  );

  if (aliveMafia.length === 0) return null;

  // Godfather has priority
  const godfather = aliveMafia.find(p => p.role === Role.GODFATHER);
  if (godfather) return godfather;

  // Rotate among regular mafia based on day count
  const regularMafia = aliveMafia.filter(p => p.role === Role.MAFIA);
  if (regularMafia.length === 0) return null;

  const selectedIndex = (dayCount - 1) % regularMafia.length;
  return regularMafia[selectedIndex];
}
