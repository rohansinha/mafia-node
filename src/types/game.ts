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

export enum GamePhase {
  SETUP = 'Setup',
  DAY = 'Day',
  NIGHT = 'Night',
  GAME_OVER = 'Game Over'
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

export interface GameState {
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
}

export interface VoteResult {
  eliminatedPlayer?: Player;
  isTie: boolean;
  voteCount: Record<string, number>;
}