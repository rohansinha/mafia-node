/**
 * Type definitions for the Mafia game.
 * Contains all enums, interfaces, and type definitions used throughout the application.
 * Defines game states, player properties, roles, phases, and configuration options.
 */

// All available roles in the game with their abilities
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

// Game mode selection for local vs online play
export enum GameMode {
  OFFLINE = 'Offline',    // Local device-passing gameplay
  ONLINE = 'Online'       // Online multiplayer (future implementation)
}

// Different phases of the game flow
export enum GamePhase {
  MODE_SELECTION = 'Mode Selection', // Initial screen to choose game mode
  SETUP = 'Setup',                   // Role assignment and game configuration
  DAY = 'Day',                       // Discussion and voting phase
  NIGHT = 'Night',                   // Special role actions phase
  GAME_OVER = 'Game Over'            // End game results
}

// Role assignment methods
export enum AssignmentMode {
  RECOMMENDED = 'Recommended',       // Balanced automatic assignment
  CUSTOM = 'Custom'                  // User-defined role selection
}

// Player status during the game
export enum PlayerStatus {
  ALIVE = 'Alive',                   // Player is still in the game
  ELIMINATED = 'Eliminated',         // Player has been eliminated/killed
  PROTECTED = 'Protected'            // Player is protected by doctor (unused currently)
}

// Individual player object with all necessary properties
export interface Player {
  id: string;                        // Unique identifier for the player
  name: string;                      // Display name entered by user
  role: Role;                        // Assigned role with special abilities
  status: PlayerStatus;              // Current game status (alive/eliminated)
  isRevealed: boolean;               // Whether role has been publicly revealed
  isSilenced?: boolean;              // Whether player is silenced (can't speak in day phase)
  isRoleblocked?: boolean;           // Whether player's night action is blocked
}

// Configuration for custom role assignment mode
export interface CustomRoleConfig {
  selectedRoles: Role[];             // Roles selected by user (excluding CITIZEN and MAFIA)
  totalPlayers: number;              // Total number of players in the game
}

// Main game state containing all game information
export interface GameState {
  gameMode?: GameMode;               // Selected game mode (offline/online)
  players: Player[];                 // Array of all players in the game
  currentPhase: GamePhase;           // Current phase of the game
  dayCount: number;                  // Current day number
  votes: Record<string, string>;     // Mapping of voter ID to voted player ID
  nightActions: {                    // All night actions submitted by players
    mafiaTarget?: string;            // Player targeted by basic mafia
    doctorTarget?: string;           // Player protected by doctor
    detectiveTarget?: string;        // Player investigated by detective
    godfatherTarget?: string;        // Player targeted by godfather
    hookerTarget?: string;           // Player roleblocked by hooker
    kamikazeTarget?: string;         // Player targeted by kamikaze (unused)
    silencerTarget?: string;         // Player silenced by silencer
  };
  winner?: 'Mafia' | 'Town' | 'Joker'; // Winner of the game when game ends
  currentPlayerIndex: number;        // Index for device-passing mechanics
  assignmentMode?: AssignmentMode;   // Method used for role assignment
  customRoleConfig?: CustomRoleConfig; // Configuration for custom mode
}

// Result of vote counting during day phase
export interface VoteResult {
  eliminatedPlayer?: Player;         // Player with most votes (undefined if tie)
  isTie: boolean;                    // Whether there was a tie in voting
  voteCount: Record<string, number>; // Count of votes per player
}