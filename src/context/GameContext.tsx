'use client';

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { GameState, Player, GamePhase, Role, PlayerStatus, VoteResult, AssignmentMode, CustomRoleConfig } from '@/types/game';

interface GameContextType {
  gameState: GameState;
  initializeGame: (playerNames: string[], mode?: AssignmentMode, customConfig?: CustomRoleConfig) => void;
  startGame: () => void;
  castVote: (voterId: string, targetId: string) => void;
  submitNightAction: (playerId: string, targetId: string, actionType: 'kill' | 'protect' | 'investigate' | 'silence' | 'roleblock') => void;
  nextPhase: () => void;
  nextPlayer: () => void;
  resetGame: () => void;
  kamikazeRevenge: (targetId: string) => void;
  calculateVoteResult: () => VoteResult;
  getAvailableCustomRoles: () => Role[];
}

const GameContext = createContext<GameContextType | undefined>(undefined);

type GameAction =
  | { type: 'INITIALIZE_GAME'; payload: { playerNames: string[]; mode?: AssignmentMode; customConfig?: CustomRoleConfig } }
  | { type: 'START_GAME' }
  | { type: 'CAST_VOTE'; payload: { voterId: string; targetId: string } }
  | { type: 'NIGHT_ACTION'; payload: { playerId: string; targetId: string; actionType: 'kill' | 'protect' | 'investigate' | 'silence' | 'roleblock' } }
  | { type: 'NEXT_PHASE' }
  | { type: 'NEXT_PLAYER' }
  | { type: 'ELIMINATE_PLAYER'; payload: string }
  | { type: 'KAMIKAZE_REVENGE'; payload: string }
  | { type: 'RESET_GAME' }
  | { type: 'SET_WINNER'; payload: 'Mafia' | 'Town' | 'Joker' };

const initialState: GameState = {
  players: [],
  currentPhase: GamePhase.SETUP,
  dayCount: 1,
  votes: {},
  nightActions: {},
  currentPlayerIndex: 0,
};

function assignRolesRecommended(playerNames: string[]): Player[] {
  const numPlayers = playerNames.length;
  const roles: Role[] = [];
  
  // Mafia roles (1 per 4 players, minimum 1)
  const numMafia = Math.max(1, Math.floor(numPlayers / 4));
  
  // Add Mafia roles
  for (let i = 0; i < numMafia; i++) {
    if (i === 0 && numPlayers >= 8) {
      // First mafia is Godfather for larger games
      roles.push(Role.GODFATHER);
    } else {
      roles.push(Role.MAFIA);
    }
  }
  
  // Add Hooker (mafia role) for very large games
  if (numPlayers >= 12) {
    roles.push(Role.HOOKER);
  }
  
  // Add town special roles based on player count
  if (numPlayers >= 5) roles.push(Role.DETECTIVE);
  if (numPlayers >= 7) roles.push(Role.DOCTOR);
  if (numPlayers >= 9) roles.push(Role.SILENCER);
  if (numPlayers >= 11) roles.push(Role.KAMIKAZE);
  
  // Add Joker for medium+ games (independent role)
  if (numPlayers >= 10) roles.push(Role.JOKER);
  
  // Fill remaining with Citizens
  while (roles.length < numPlayers) {
    roles.push(Role.CITIZEN);
  }
  
  // Shuffle roles
  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [roles[i], roles[j]] = [roles[j], roles[i]];
  }
  
  return playerNames.map((name, index) => ({
    id: `player-${index}`,
    name,
    role: roles[index],
    status: PlayerStatus.ALIVE,
    isRevealed: false,
    isSilenced: false,
    isRoleblocked: false,
  }));
}

function assignRolesCustom(playerNames: string[], customConfig: CustomRoleConfig): Player[] {
  const { selectedRoles, totalPlayers } = customConfig;
  const roles: Role[] = [...selectedRoles];
  
  // Calculate remaining players after special roles
  const remainingPlayers = totalPlayers - selectedRoles.length;
  
  // Distribute remaining between Mafia and Citizens
  // At least 1 Mafia, prefer 1 Mafia per 4 total players
  const recommendedMafia = Math.max(1, Math.floor(totalPlayers / 4));
  const numMafia = Math.min(recommendedMafia, Math.max(1, Math.floor(remainingPlayers / 3)));
  const numCitizens = remainingPlayers - numMafia;
  
  // Add Mafia and Citizens
  for (let i = 0; i < numMafia; i++) {
    roles.push(Role.MAFIA);
  }
  for (let i = 0; i < numCitizens; i++) {
    roles.push(Role.CITIZEN);
  }
  
  // Shuffle roles
  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [roles[i], roles[j]] = [roles[j], roles[i]];
  }
  
  return playerNames.map((name, index) => ({
    id: `player-${index}`,
    name,
    role: roles[index],
    status: PlayerStatus.ALIVE,
    isRevealed: false,
    isSilenced: false,
    isRoleblocked: false,
  }));
}

function checkWinCondition(players: Player[]): 'Mafia' | 'Town' | 'Joker' | null {
  const alivePlayers = players.filter(p => p.status === PlayerStatus.ALIVE);
  const aliveMafia = alivePlayers.filter(p => 
    p.role === Role.MAFIA || p.role === Role.GODFATHER || p.role === Role.HOOKER
  );
  const aliveTown = alivePlayers.filter(p => 
    p.role === Role.CITIZEN || p.role === Role.DETECTIVE || 
    p.role === Role.DOCTOR || p.role === Role.SILENCER || 
    p.role === Role.KAMIKAZE
  );
  const aliveJoker = alivePlayers.find(p => p.role === Role.JOKER);
  
  // Joker wins if they're the only one left or if they were voted out (handled elsewhere)
  if (aliveJoker && alivePlayers.length === 1) return 'Joker';
  
  // Town wins if all mafia are eliminated
  if (aliveMafia.length === 0) return 'Town';
  
  // Mafia wins if they equal or outnumber town
  if (aliveMafia.length >= aliveTown.length) return 'Mafia';
  
  return null;
}

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'INITIALIZE_GAME':
      const { playerNames, mode = AssignmentMode.RECOMMENDED, customConfig } = action.payload;
      let players: Player[];
      
      if (mode === AssignmentMode.CUSTOM && customConfig) {
        players = assignRolesCustom(playerNames, customConfig);
      } else {
        players = assignRolesRecommended(playerNames);
      }
      
      return {
        ...initialState,
        players,
        assignmentMode: mode,
        customRoleConfig: customConfig,
      };
      
    case 'START_GAME':
      return {
        ...state,
        currentPhase: GamePhase.DAY,
      };
      
    case 'CAST_VOTE':
      return {
        ...state,
        votes: {
          ...state.votes,
          [action.payload.voterId]: action.payload.targetId,
        },
      };
      
    case 'NIGHT_ACTION':
      const { playerId, targetId, actionType } = action.payload;
      const player = state.players.find(p => p.id === playerId);
      
      if (!player) return state;
      
      let newNightActions = { ...state.nightActions };
      
      if (actionType === 'kill') {
        if (player.role === Role.MAFIA) {
          newNightActions.mafiaTarget = targetId;
        } else if (player.role === Role.GODFATHER) {
          newNightActions.godfatherTarget = targetId;
        }
      } else if (actionType === 'protect' && player.role === Role.DOCTOR) {
        newNightActions.doctorTarget = targetId;
      } else if (actionType === 'investigate' && player.role === Role.DETECTIVE) {
        newNightActions.detectiveTarget = targetId;
      } else if (actionType === 'silence' && player.role === Role.SILENCER) {
        newNightActions.silencerTarget = targetId;
      } else if (actionType === 'roleblock' && player.role === Role.HOOKER) {
        newNightActions.hookerTarget = targetId;
      }
      
      return {
        ...state,
        nightActions: newNightActions,
      };
      
    case 'ELIMINATE_PLAYER':
      return {
        ...state,
        players: state.players.map(p =>
          p.id === action.payload
            ? { ...p, status: PlayerStatus.ELIMINATED }
            : p
        ),
      };
      
    case 'KAMIKAZE_REVENGE':
      return {
        ...state,
        players: state.players.map(p =>
          p.id === action.payload
            ? { ...p, status: PlayerStatus.ELIMINATED }
            : p
        ),
      };
      
    case 'NEXT_PHASE':
      let newPhase = state.currentPhase;
      let newDayCount = state.dayCount;
      let newPlayers = [...state.players];
      
      if (state.currentPhase === GamePhase.DAY) {
        newPhase = GamePhase.NIGHT;
        
        // Clear silencing effects from previous day
        newPlayers = newPlayers.map(p => ({
          ...p,
          isSilenced: false,
          isRoleblocked: false
        }));
        
      } else if (state.currentPhase === GamePhase.NIGHT) {
        newPhase = GamePhase.DAY;
        newDayCount += 1;
        
        // Process night actions
        const { 
          mafiaTarget, 
          godfatherTarget, 
          doctorTarget, 
          detectiveTarget,
          silencerTarget,
          hookerTarget 
        } = state.nightActions;
        
        // Apply roleblocking first
        const roleblockTargets = hookerTarget ? [hookerTarget] : [];
        
        // Apply silencing for next day
        if (silencerTarget) {
          newPlayers = newPlayers.map(p =>
            p.id === silencerTarget
              ? { ...p, isSilenced: true }
              : p
          );
        }
        
        // Process kills (Mafia or Godfather)
        const killTarget = godfatherTarget || mafiaTarget;
        if (killTarget && killTarget !== doctorTarget) {
          newPlayers = newPlayers.map(p =>
            p.id === killTarget
              ? { ...p, status: PlayerStatus.ELIMINATED }
              : p
          );
        }
        
        // Detective investigation results could be processed here
        // For now, we'll handle this in the UI
      }
      
      const winner = checkWinCondition(newPlayers);
      
      return {
        ...state,
        currentPhase: winner ? GamePhase.GAME_OVER : newPhase,
        dayCount: newDayCount,
        players: newPlayers,
        votes: {},
        nightActions: {},
        winner: winner || undefined,
        currentPlayerIndex: 0,
      };
      
    case 'NEXT_PLAYER':
      return {
        ...state,
        currentPlayerIndex: (state.currentPlayerIndex + 1) % state.players.length,
      };
      
    case 'RESET_GAME':
      return initialState;
      
    default:
      return state;
  }
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [gameState, dispatch] = useReducer(gameReducer, initialState);
  
  const initializeGame = (playerNames: string[], mode: AssignmentMode = AssignmentMode.RECOMMENDED, customConfig?: CustomRoleConfig) => {
    dispatch({ type: 'INITIALIZE_GAME', payload: { playerNames, mode, customConfig } });
  };
  
  const startGame = () => {
    dispatch({ type: 'START_GAME' });
  };
  
  const castVote = (voterId: string, targetId: string) => {
    dispatch({ type: 'CAST_VOTE', payload: { voterId, targetId } });
  };
  
  const submitNightAction = (playerId: string, targetId: string, actionType: 'kill' | 'protect' | 'investigate' | 'silence' | 'roleblock') => {
    dispatch({ type: 'NIGHT_ACTION', payload: { playerId, targetId, actionType } });
  };
  
  const nextPhase = () => {
    dispatch({ type: 'NEXT_PHASE' });
  };
  
  const nextPlayer = () => {
    dispatch({ type: 'NEXT_PLAYER' });
  };
  
  const resetGame = () => {
    dispatch({ type: 'RESET_GAME' });
  };
  
  const kamikazeRevenge = (targetId: string) => {
    dispatch({ type: 'KAMIKAZE_REVENGE', payload: targetId });
  };
  
  const calculateVoteResult = (): VoteResult => {
    const voteCount: Record<string, number> = {};
    const alivePlayers = gameState.players.filter(p => p.status === PlayerStatus.ALIVE);
    
    // Count votes
    Object.values(gameState.votes).forEach(targetId => {
      voteCount[targetId] = (voteCount[targetId] || 0) + 1;
    });
    
    // Find player with most votes
    let maxVotes = 0;
    let eliminatedPlayer: Player | undefined;
    let isTie = false;
    
    Object.entries(voteCount).forEach(([playerId, votes]) => {
      if (votes > maxVotes) {
        maxVotes = votes;
        eliminatedPlayer = gameState.players.find(p => p.id === playerId);
        isTie = false;
      } else if (votes === maxVotes && maxVotes > 0) {
        isTie = true;
      }
    });
    
    return {
      eliminatedPlayer: isTie ? undefined : eliminatedPlayer,
      isTie,
      voteCount,
    };
  };
  
  const getAvailableCustomRoles = (): Role[] => {
    return [
      Role.DETECTIVE,
      Role.DOCTOR,
      Role.SILENCER,
      Role.KAMIKAZE,
      Role.JOKER,
      Role.GODFATHER,
      Role.HOOKER
    ];
  };

  return (
    <GameContext.Provider
      value={{
        gameState,
        initializeGame,
        startGame,
        castVote,
        submitNightAction,
        nextPhase,
        nextPlayer,
        resetGame,
        kamikazeRevenge,
        calculateVoteResult,
        getAvailableCustomRoles,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}