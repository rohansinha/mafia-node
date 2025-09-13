export enum Role {
  MAFIA = 'Mafia',
  DETECTIVE = 'Detective',
  DOCTOR = 'Doctor',
  CITIZEN = 'Citizen'
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
  };
  winner?: 'Mafia' | 'Town';
  currentPlayerIndex: number; // For passing device around
}

export interface VoteResult {
  eliminatedPlayer?: Player;
  isTie: boolean;
  voteCount: Record<string, number>;
}