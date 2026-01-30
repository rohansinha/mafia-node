/**
 * Game Context Provider - Central state management for the Mafia game.
 * 
 * Architecture:
 * - Uses React Context + useReducer for predictable state management
 * - Memoized action handlers prevent unnecessary re-renders
 * - Pure utility functions for game logic (testable, reusable)
 * - Type-safe actions and state transitions
 * 
 * @module context/GameContext
 */
'use client';

import React, { 
  createContext, 
  useContext, 
  useReducer, 
  useCallback, 
  useMemo, 
  ReactNode 
} from 'react';
import { 
  GameState, 
  Player, 
  GamePhase, 
  Role, 
  PlayerStatus, 
  VoteResult, 
  AssignmentMode, 
  CustomRoleConfig, 
  GameMode,
  NightActions,
  NightActionType,
  GameAction
} from '@/types/game';
import { GameLogger } from '@/lib/logger';
import { 
  assignRolesRecommended, 
  assignRolesCustom, 
  checkWinCondition,
  calculateVoteResult as calcVoteResult,
  getAlivePlayers
} from '@/utils/gameUtils';
import { CUSTOM_ASSIGNABLE_ROLES } from '@/constants/roles';

/**
 * Interface defining all available game actions and state
 */
interface GameContextType {
  gameState: GameState;
  selectGameMode: (mode: GameMode) => void;
  initializeGame: (playerNames: string[], mode?: AssignmentMode, customConfig?: CustomRoleConfig) => void;
  startGame: () => void;
  castVote: (voterId: string, targetId: string) => void;
  submitNightAction: (playerId: string, targetId: string, actionType: NightActionType) => void;
  nextPhase: () => void;
  nextPlayer: () => void;
  resetGame: () => void;
  kamikazeRevenge: (targetId: string) => void;
  calculateVoteResult: () => VoteResult;
  getAvailableCustomRoles: () => Role[];
}

const GameContext = createContext<GameContextType | undefined>(undefined);

// Initial game state - starts at mode selection
const initialState: GameState = {
  players: [],
  currentPhase: GamePhase.MODE_SELECTION,
  dayCount: 1,
  votes: {},
  nightActions: {},
  currentPlayerIndex: 0,
};

/**
 * Process night phase actions and return updated players
 */
function processNightActions(players: Player[], nightActions: NightActions): Player[] {
  const { 
    mafiaTarget, 
    godfatherTarget, 
    doctorTarget,
    silencerTarget
  } = nightActions;
  
  let updatedPlayers = [...players];
  
  // Apply silencing for next day
  if (silencerTarget) {
    updatedPlayers = updatedPlayers.map(p =>
      p.id === silencerTarget ? { ...p, isSilenced: true } : p
    );
  }
  
  // Process kills (Godfather takes priority over regular Mafia)
  const killTarget = godfatherTarget || mafiaTarget;
  if (killTarget && killTarget !== doctorTarget) {
    updatedPlayers = updatedPlayers.map(p =>
      p.id === killTarget ? { ...p, status: PlayerStatus.ELIMINATED } : p
    );
  }
  
  return updatedPlayers;
}

/**
 * Clear night effects from players
 */
function clearNightEffects(players: Player[]): Player[] {
  return players.map(p => ({
    ...p,
    isSilenced: false,
    isRoleblocked: false,
  }));
}

/**
 * Main game state reducer - handles all state transitions.
 * Processes actions and returns new state based on game logic.
 * Central hub for all game state modifications.
 */
function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SELECT_GAME_MODE':
      return {
        ...state,
        gameMode: action.payload,
        // Both modes currently go to SETUP - online will be different when implemented
        currentPhase: action.payload === GameMode.OFFLINE ? GamePhase.SETUP : GamePhase.SETUP,
      };
      
    case 'INITIALIZE_GAME':
      const { playerNames, mode = AssignmentMode.RECOMMENDED, customConfig } = action.payload;
      let players: Player[];
      
      if (mode === AssignmentMode.CUSTOM && customConfig) {
        players = assignRolesCustom(playerNames, customConfig);
      } else {
        players = assignRolesRecommended(playerNames);
      }
      
      return {
        ...state,
        players,
        assignmentMode: mode,
        customRoleConfig: customConfig,
        currentPhase: GamePhase.SETUP,
        dayCount: 1,
        votes: {},
        nightActions: {},
        currentPlayerIndex: 0,
      };
      
    case 'START_GAME':
      return {
        ...state,
        currentPhase: GamePhase.NIGHT,
      };
      
    case 'CAST_VOTE':
      return {
        ...state,
        votes: {
          ...state.votes,
          [action.payload.voterId]: action.payload.targetId,
        },
      };
      
    case 'NIGHT_ACTION': {
      const { playerId, targetId, actionType } = action.payload;
      const player = state.players.find(p => p.id === playerId);
      
      if (!player) return state;
      
      const newNightActions = { ...state.nightActions };
      
      switch (actionType) {
        case 'kill':
          if (player.role === Role.MAFIA) {
            newNightActions.mafiaTarget = targetId;
          } else if (player.role === Role.GODFATHER) {
            newNightActions.godfatherTarget = targetId;
          }
          break;
        case 'protect':
          if (player.role === Role.DOCTOR) {
            newNightActions.doctorTarget = targetId;
          }
          break;
        case 'investigate':
          if (player.role === Role.DETECTIVE) {
            newNightActions.detectiveTarget = targetId;
          }
          break;
        case 'silence':
          if (player.role === Role.SILENCER) {
            newNightActions.silencerTarget = targetId;
          }
          break;
        case 'roleblock':
          if (player.role === Role.HOOKER) {
            newNightActions.hookerTarget = targetId;
          }
          break;
      }
      
      return {
        ...state,
        nightActions: newNightActions,
      };
    }
      
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
      
    case 'NEXT_PHASE': {
      let newPhase = state.currentPhase;
      let newDayCount = state.dayCount;
      let newPlayers = [...state.players];
      
      if (state.currentPhase === GamePhase.DAY) {
        newPhase = GamePhase.NIGHT;
        newPlayers = clearNightEffects(newPlayers);
      } else if (state.currentPhase === GamePhase.NIGHT) {
        newPhase = GamePhase.DAY;
        newDayCount += 1;
        newPlayers = processNightActions(newPlayers, state.nightActions);
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
    }
      
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
  
  // Memoized action creators prevent unnecessary re-renders
  const selectGameMode = useCallback((mode: GameMode) => {
    try {
      GameLogger.logUserAction('selectGameMode', 'system', { mode });
      dispatch({ type: 'SELECT_GAME_MODE', payload: mode });
    } catch (error) {
      GameLogger.logException(error as Error, { action: 'selectGameMode', mode });
      throw error;
    }
  }, []);
  
  const initializeGame = useCallback((
    playerNames: string[], 
    mode: AssignmentMode = AssignmentMode.RECOMMENDED, 
    customConfig?: CustomRoleConfig
  ) => {
    try {
      GameLogger.logGameEvent('InitializeGame', { 
        playerCount: playerNames.length, 
        assignmentMode: mode,
        hasCustomConfig: !!customConfig 
      });
      dispatch({ type: 'INITIALIZE_GAME', payload: { playerNames, mode, customConfig } });
    } catch (error) {
      GameLogger.logException(error as Error, { 
        action: 'initializeGame', 
        playerCount: playerNames.length, 
        mode 
      });
      throw error;
    }
  }, []);
  
  const startGame = useCallback(() => {
    try {
      GameLogger.logGameEvent('StartGame', { 
        playerCount: gameState.players.length,
        gameMode: gameState.gameMode,
        phase: gameState.currentPhase 
      });
      dispatch({ type: 'START_GAME' });
    } catch (error) {
      GameLogger.logException(error as Error, { action: 'startGame' });
      throw error;
    }
  }, [gameState.players.length, gameState.gameMode, gameState.currentPhase]);
  
  const castVote = useCallback((voterId: string, targetId: string) => {
    try {
      GameLogger.logUserAction('castVote', voterId, { 
        targetId, 
        phase: gameState.currentPhase,
        dayCount: gameState.dayCount 
      });
      dispatch({ type: 'CAST_VOTE', payload: { voterId, targetId } });
    } catch (error) {
      GameLogger.logException(error as Error, { 
        action: 'castVote', 
        voterId, 
        targetId 
      });
      throw error;
    }
  }, [gameState.currentPhase, gameState.dayCount]);
  
  const submitNightAction = useCallback((
    playerId: string, 
    targetId: string, 
    actionType: NightActionType
  ) => {
    try {
      GameLogger.logUserAction('nightAction', playerId, { 
        targetId, 
        actionType, 
        phase: gameState.currentPhase,
        dayCount: gameState.dayCount 
      });
      dispatch({ type: 'NIGHT_ACTION', payload: { playerId, targetId, actionType } });
    } catch (error) {
      GameLogger.logException(error as Error, { 
        action: 'submitNightAction', 
        playerId, 
        targetId, 
        actionType 
      });
      throw error;
    }
  }, [gameState.currentPhase, gameState.dayCount]);
  
  const nextPhase = useCallback(() => {
    try {
      const alivePlayers = getAlivePlayers(gameState.players);
      GameLogger.logGameEvent('PhaseTransition', { 
        fromPhase: gameState.currentPhase,
        dayCount: gameState.dayCount,
        playerCount: alivePlayers.length
      });
      dispatch({ type: 'NEXT_PHASE' });
    } catch (error) {
      GameLogger.logException(error as Error, { action: 'nextPhase' });
      throw error;
    }
  }, [gameState.currentPhase, gameState.dayCount, gameState.players]);
  
  const nextPlayer = useCallback(() => {
    try {
      GameLogger.logGameEvent('NextPlayer', { 
        currentPlayerIndex: gameState.currentPlayerIndex,
        phase: gameState.currentPhase 
      });
      dispatch({ type: 'NEXT_PLAYER' });
    } catch (error) {
      GameLogger.logException(error as Error, { action: 'nextPlayer' });
      throw error;
    }
  }, [gameState.currentPlayerIndex, gameState.currentPhase]);
  
  const resetGame = useCallback(() => {
    try {
      GameLogger.logGameEvent('ResetGame', { 
        previousPlayerCount: gameState.players.length,
        previousPhase: gameState.currentPhase,
        previousDayCount: gameState.dayCount 
      });
      dispatch({ type: 'RESET_GAME' });
    } catch (error) {
      GameLogger.logException(error as Error, { action: 'resetGame' });
      throw error;
    }
  }, [gameState.players.length, gameState.currentPhase, gameState.dayCount]);
  
  const kamikazeRevenge = useCallback((targetId: string) => {
    try {
      GameLogger.logGameEvent('KamikazeRevenge', { 
        targetId,
        phase: gameState.currentPhase,
        dayCount: gameState.dayCount 
      });
      dispatch({ type: 'KAMIKAZE_REVENGE', payload: targetId });
    } catch (error) {
      GameLogger.logException(error as Error, { action: 'kamikazeRevenge', targetId });
      throw error;
    }
  }, [gameState.currentPhase, gameState.dayCount]);
  
  // Use memoized vote calculation from utility module
  const calculateVoteResult = useCallback((): VoteResult => {
    try {
      const result = calcVoteResult(gameState.votes, gameState.players);
      
      GameLogger.logGameEvent('VoteCalculated', {
        totalVotes: Object.keys(gameState.votes).length,
        eliminatedPlayerId: result.eliminatedPlayer?.id,
        isTie: result.isTie,
        voteDistribution: result.voteCount,
        dayCount: gameState.dayCount
      });
      
      return result;
    } catch (error) {
      GameLogger.logException(error as Error, { action: 'calculateVoteResult' });
      throw error;
    }
  }, [gameState.votes, gameState.players, gameState.dayCount]);
  
  // Return memoized constant array
  const getAvailableCustomRoles = useCallback((): Role[] => {
    return CUSTOM_ASSIGNABLE_ROLES;
  }, []);

  // Memoize context value to prevent unnecessary re-renders in consumers
  const contextValue = useMemo<GameContextType>(() => ({
    gameState,
    selectGameMode,
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
  }), [
    gameState,
    selectGameMode,
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
  ]);

  return (
    <GameContext.Provider value={contextValue}>
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