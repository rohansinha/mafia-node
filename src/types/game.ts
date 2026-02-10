/**
 * Type definitions for the Mafia game.
 * Contains all enums, interfaces, and type definitions used throughout the application.
 * Defines game states, player properties, roles, phases, and configuration options.
 * 
 * Architecture:
 * - Enums provide type-safe constants for game states
 * - Interfaces define the shape of complex objects
 * - Types provide unions and aliases for flexibility
 * 
 * @module types/game
 */

// ============================================================================
// ROLE DEFINITIONS
// ============================================================================

/**
 * All available roles in the game with their abilities.
 * Each role belongs to a team and may have special night actions.
 */
export enum Role {
  // Mafia team roles
  MAFIA = 'Mafia',        // Basic mafia member who can eliminate players at night
  GODFATHER = 'Godfather', // Enhanced mafia leader with kill ability
  HOOKER = 'Hooker',      // Can roleblock other players, preventing their night actions
  
  // Town team roles
  DETECTIVE = 'Detective', // Can investigate one player per night to learn their role
  DOCTOR = 'Doctor',      // Can protect one player per night from attacks
  CITIZEN = 'Citizen',    // No special abilities, wins by eliminating all mafia
  SILENCER = 'Silencer',  // Can silence players, preventing them from speaking during day phase
  
  // Independent roles
  JOKER = 'Joker',        // Wins immediately if voted out during day phase
  KAMIKAZE = 'Kamikaze',  // When voted out, can choose another player to eliminate
}

// ============================================================================
// GAME MODE AND PHASE DEFINITIONS
// ============================================================================

/**
 * Game mode selection for local vs online play
 */
export enum GameMode {
  OFFLINE = 'Offline',              // Local device-passing gameplay (single device)
  LOCAL_MULTIPLAYER = 'LocalMultiplayer', // Local network multiplayer (multiple devices, no internet)
  ONLINE = 'Online'                 // Online multiplayer (future implementation)
}

/**
 * Player connection status for local multiplayer
 */
export enum ConnectionStatus {
  DISCONNECTED = 'Disconnected',
  CONNECTING = 'Connecting',
  CONNECTED = 'Connected',
}

/**
 * Message types for local multiplayer WebSocket communication
 */
export enum MessageType {
  // Connection messages
  JOIN_GAME = 'join_game',
  REJOIN_GAME = 'rejoin_game',
  PLAYER_JOINED = 'player_joined',
  PLAYER_LEFT = 'player_left',
  PLAYER_RECONNECTED = 'player_reconnected',
  PLAYER_DISCONNECTED = 'player_disconnected',
  
  // Game state messages
  GAME_STATE_UPDATE = 'game_state_update',
  PHASE_CHANGE = 'phase_change',
  
  // Action messages
  REQUEST_ACTION = 'request_action',
  SUBMIT_ACTION = 'submit_action',
  ACTION_RECEIVED = 'action_received',
  
  // Vote messages
  REQUEST_VOTE = 'request_vote',
  SUBMIT_VOTE = 'submit_vote',
  VOTE_RECEIVED = 'vote_received',
  
  // Audio/notification messages
  AUDIO_PLAYING = 'audio_playing',
  PLAYER_TURN = 'player_turn',
  
  // Error messages
  ERROR = 'error',
}

/**
 * WebSocket message structure for local multiplayer
 */
export interface GameMessage {
  type: MessageType;
  payload?: unknown;
  playerId?: string;
  timestamp?: number;
}

/**
 * Local multiplayer session info
 */
export interface LocalSession {
  sessionId: string;              // Unique session identifier
  hostIp: string;                 // Host device IP address
  port: number;                   // WebSocket port
  connectedPlayers: string[];     // List of connected player IDs
  isHost: boolean;                // Whether this device is the host
}

/**
 * Different phases of the game flow
 */
export enum GamePhase {
  MODE_SELECTION = 'Mode Selection', // Initial screen to choose game mode
  SETUP = 'Setup',                   // Role assignment and game configuration
  DAY = 'Day',                       // Discussion and voting phase
  NIGHT = 'Night',                   // Special role actions phase
  GAME_OVER = 'Game Over'            // End game results
}

/**
 * Role assignment methods
 */
export enum AssignmentMode {
  RECOMMENDED = 'Recommended',       // Balanced automatic assignment
  CUSTOM = 'Custom'                  // User-defined role selection
}

// ============================================================================
// PLAYER DEFINITIONS
// ============================================================================

/**
 * Player status during the game
 */
export enum PlayerStatus {
  ALIVE = 'Alive',                   // Player is still in the game
  ELIMINATED = 'Eliminated',         // Player has been eliminated/killed
  PROTECTED = 'Protected'            // Player is protected by doctor (unused currently)
}

/**
 * Individual player object with all necessary properties
 */
export interface Player {
  readonly id: string;               // Unique identifier for the player
  readonly name: string;             // Display name entered by user
  role: Role;                        // Assigned role with special abilities
  status: PlayerStatus;              // Current game status (alive/eliminated)
  isRevealed: boolean;               // Whether role has been publicly revealed
  isSilenced?: boolean;              // Whether player is silenced (can't speak in day phase)
  isRoleblocked?: boolean;           // Whether player's night action is blocked
}

// ============================================================================
// CONFIGURATION DEFINITIONS
// ============================================================================

/**
 * Configuration for custom role assignment mode
 */
export interface CustomRoleConfig {
  readonly selectedRoles: Role[];    // Roles selected by user (excluding CITIZEN and MAFIA)
  readonly totalPlayers: number;     // Total number of players in the game
}

// ============================================================================
// GAME STATE DEFINITIONS
// ============================================================================

/**
 * Night actions tracking object
 */
export interface NightActions {
  mafiaTarget?: string;              // Player targeted by basic mafia
  doctorTarget?: string;             // Player protected by doctor
  detectiveTarget?: string;          // Player investigated by detective
  godfatherTarget?: string;          // Player targeted by godfather
  hookerTarget?: string;             // Player roleblocked by hooker
  kamikazeTarget?: string;           // Player targeted by kamikaze (unused)
  silencerTarget?: string;           // Player silenced by silencer
}

/**
 * Winner type for game end
 */
export type Winner = 'Mafia' | 'Town' | 'Joker';

/**
 * Main game state containing all game information
 */
export interface GameState {
  gameMode?: GameMode;               // Selected game mode (offline/online)
  players: Player[];                 // Array of all players in the game
  currentPhase: GamePhase;           // Current phase of the game
  dayCount: number;                  // Current day number
  votes: Record<string, string>;     // Mapping of voter ID to voted player ID
  nightActions: NightActions;        // All night actions submitted by players
  winner?: Winner;                   // Winner of the game when game ends
  currentPlayerIndex: number;        // Index for device-passing mechanics
  assignmentMode?: AssignmentMode;   // Method used for role assignment
  customRoleConfig?: CustomRoleConfig; // Configuration for custom mode
  // Local multiplayer specific
  localSession?: LocalSession;       // Session info for local multiplayer
  currentNightActorId?: string;      // Player whose turn it is for night action
  awaitingActionFrom?: string[];     // Player IDs we're waiting for actions from
}

// ============================================================================
// RESULT TYPES
// ============================================================================

/**
 * Result of vote counting during day phase
 */
export interface VoteResult {
  eliminatedPlayer?: Player;         // Player with most votes (undefined if tie)
  isTie: boolean;                    // Whether there was a tie in voting
  voteCount: Record<string, number>; // Count of votes per player
}

// ============================================================================
// ACTION TYPES
// ============================================================================

/**
 * Night action type union
 */
export type NightActionType = 'kill' | 'protect' | 'investigate' | 'silence' | 'roleblock';

/**
 * Game action for context updates
 */
export type GameAction =
  | { type: 'SELECT_GAME_MODE'; payload: GameMode }
  | { type: 'INITIALIZE_GAME'; payload: { playerNames: string[]; mode?: AssignmentMode; customConfig?: CustomRoleConfig } }
  | { type: 'START_GAME' }
  | { type: 'CAST_VOTE'; payload: { voterId: string; targetId: string } }
  | { type: 'NIGHT_ACTION'; payload: { playerId: string; targetId: string; actionType: NightActionType } }
  | { type: 'NEXT_PHASE' }
  | { type: 'NEXT_PLAYER' }
  | { type: 'ELIMINATE_PLAYER'; payload: string }
  | { type: 'KAMIKAZE_REVENGE'; payload: string }
  | { type: 'RESET_GAME' }
  | { type: 'SET_WINNER'; payload: Winner };