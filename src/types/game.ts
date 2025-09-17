export enum Role {
  MAFIA = 'Mafia',
  DETECTIVE = 'Detective',
  DOCTOR = 'Doctor',
  CITIZEN = 'Citizen',
  JOKER = 'Joker',
  GODFATHER = 'Godfather',
  HOOKER = 'Hooker',
  KAMIKAZE = 'Kamikaze',
  SILENCER = 'Silencer'
}

export enum GameMode {
  OFFLINE = 'Offline',
  ONLINE = 'Online'
}

export enum GamePhase {
  MODE_SELECTION = 'Mode Selection',
  SETUP = 'Setup',
  DAY = 'Day',
  NIGHT = 'Night',
  GAME_OVER = 'Game Over'
}

export enum AssignmentMode {
  RECOMMENDED = 'Recommended',
  CUSTOM = 'Custom'
}

export enum PlayerStatus {
  ALIVE = 'Alive',
  ELIMINATED = 'Eliminated',
  PROTECTED = 'Protected'
}

export interface Player {
  id: string;
  name: string;
  role: Role;
  status: PlayerStatus;
  isRevealed: boolean;
  isSilenced?: boolean;
  isRoleblocked?: boolean;
}

export interface CustomRoleConfig {
  selectedRoles: Role[]; // Roles selected by user (excluding CITIZEN and MAFIA)
  totalPlayers: number;
}

export interface GameState {
  gameMode?: GameMode;
  players: Player[];
  currentPhase: GamePhase;
  dayCount: number;
  votes: Record<string, string>; // playerId -> votedForPlayerId
  nightActions: {
    mafiaTarget?: string;
    doctorTarget?: string;
    detectiveTarget?: string;
    godfatherTarget?: string;
    hookerTarget?: string;
    kamikazeTarget?: string;
    silencerTarget?: string;
  };
  winner?: 'Mafia' | 'Town' | 'Joker';
  currentPlayerIndex: number; // For passing device around
  assignmentMode?: AssignmentMode;
  customRoleConfig?: CustomRoleConfig;
}

export interface VoteResult {
  eliminatedPlayer?: Player;
  isTie: boolean;
  voteCount: Record<string, number>;
}