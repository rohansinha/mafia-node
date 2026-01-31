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
   * Note: In browser environment, we use a different approach with Server-Sent Events
   * or a lightweight signaling mechanism
   */
  async startHosting(sessionId: string): Promise<{ sessionId: string; port: number }> {
    this.isHost = true;
    this.sessionId = sessionId;
    
    // For local multiplayer, we'll use the Next.js API route as the WebSocket server
    // The host connects to their own server
    const port = this.config.port || DEFAULT_LOCAL_PORT;
    
    console.log(`[NetworkManager] Starting host session: ${sessionId}`);
    
    return { sessionId, port };
  }

  /**
   * Broadcast a message to all connected players
   */
  broadcast(message: GameMessage): void {
    if (!this.isHost) {
      console.warn('[NetworkManager] Only host can broadcast');
      return;
    }

    const messageWithTimestamp = {
      ...message,
      timestamp: Date.now(),
    };

    this.connections.forEach((connection) => {
      if (connection.ws && connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.send(JSON.stringify(messageWithTimestamp));
      }
    });
  }

  /**
   * Send a message to a specific player
   */
  sendToPlayer(playerId: string, message: GameMessage): void {
    const connection = this.connections.get(playerId);
    if (connection?.ws && connection.ws.readyState === WebSocket.OPEN) {
      const messageWithTimestamp = {
        ...message,
        timestamp: Date.now(),
      };
      connection.ws.send(JSON.stringify(messageWithTimestamp));
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
      
      try {
        this.ws = new WebSocket(serverUrl);

        this.ws.onopen = () => {
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
            this.handleMessage(message);
          } catch (error) {
            console.error('[NetworkManager] Failed to parse message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('[NetworkManager] WebSocket error:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('[NetworkManager] Connection closed');
          this.stopHeartbeat();
          this.handleMessage({ type: MessageType.ERROR, payload: { message: 'Connection lost' } });
        };

        // Connection timeout
        setTimeout(() => {
          if (this.ws?.readyState !== WebSocket.OPEN) {
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
 * Note: This is a simplified version; actual implementation may vary
 */
export function getLocalIpAddress(): string {
  // In browser environment, we can't directly get the IP
  // The host will need to check their network settings
  // For now, return localhost for development
  if (typeof window !== 'undefined') {
    return window.location.hostname || 'localhost';
  }
  return 'localhost';
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
