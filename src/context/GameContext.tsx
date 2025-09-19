/**
 * Game Context Provider - Central state management for the Mafia game.
 * 
 * This file contains:
 * - GameContextType interface defining all available game actions
 * - GameAction type union for all possible state changes
 * - Role assignment functions (recommended and custom modes)
 * - Win condition checking logic
 * - Main game reducer handling all state transitions
 * - Provider component wrapping the entire application
 * - Custom hook for accessing game state and actions
 */
'use client';

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { GameState, Player, GamePhase, Role, PlayerStatus, VoteResult, AssignmentMode, CustomRoleConfig, GameMode } from '@/types/game';
import { GameLogger } from '@/lib/logger';

// Interface defining all available game actions and state
interface GameContextType {
  gameState: GameState;                    // Current game state
  selectGameMode: (mode: GameMode) => void; // Choose between offline/online mode
  initializeGame: (playerNames: string[], mode?: AssignmentMode, customConfig?: CustomRoleConfig) => void; // Set up new game
  startGame: () => void;                   // Begin gameplay after setup
  castVote: (voterId: string, targetId: string) => void; // Submit day phase vote
  submitNightAction: (playerId: string, targetId: string, actionType: 'kill' | 'protect' | 'investigate' | 'silence' | 'roleblock') => void; // Submit night action
  nextPhase: () => void;                   // Advance to next game phase
  nextPlayer: () => void;                  // Move to next player for device passing
  resetGame: () => void;                   // Reset to initial state
  kamikazeRevenge: (targetId: string) => void; // Handle kamikaze revenge kill
  calculateVoteResult: () => VoteResult;   // Calculate day phase voting results
  getAvailableCustomRoles: () => Role[];   // Get roles available for custom assignment
}

const GameContext = createContext<GameContextType | undefined>(undefined);

// Union type defining all possible actions that can modify game state
type GameAction =
  | { type: 'SELECT_GAME_MODE'; payload: GameMode }                              // User selects offline/online mode
  | { type: 'INITIALIZE_GAME'; payload: { playerNames: string[]; mode?: AssignmentMode; customConfig?: CustomRoleConfig } } // Set up new game with players and roles
  | { type: 'START_GAME' }                                                       // Begin gameplay after setup
  | { type: 'CAST_VOTE'; payload: { voterId: string; targetId: string } }       // Player votes during day phase
  | { type: 'NIGHT_ACTION'; payload: { playerId: string; targetId: string; actionType: 'kill' | 'protect' | 'investigate' | 'silence' | 'roleblock' } } // Night phase actions
  | { type: 'NEXT_PHASE' }                                                       // Advance to next game phase
  | { type: 'NEXT_PLAYER' }                                                      // Move to next player for device passing
  | { type: 'ELIMINATE_PLAYER'; payload: string }                               // Remove player from game
  | { type: 'KAMIKAZE_REVENGE'; payload: string }                               // Handle kamikaze revenge elimination
  | { type: 'RESET_GAME' }                                                       // Reset to initial state
  | { type: 'SET_WINNER'; payload: 'Mafia' | 'Town' | 'Joker' };               // Set game winner

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
 * Assigns roles using the recommended balanced distribution.
 * Automatically determines the optimal role mix based on player count.
 * 
 * Distribution logic:
 * - 4-6 players: 1 Mafia, 1 Detective, rest Citizens
 * - 7-9 players: 1 Mafia, 1 Detective, 1 Doctor, rest Citizens  
 * - 10+ players: Additional Mafia and special roles for balance
 */
function assignRolesRecommended(playerNames: string[]): Player[] {
  const numPlayers = playerNames.length;
  const roles: Role[] = [];
  
  // Calculate optimal number of Mafia roles (1 per 4 players, minimum 1)
  const numMafia = Math.max(1, Math.floor(numPlayers / 4));
  
  // Add Mafia roles with enhanced roles for larger games
  for (let i = 0; i < numMafia; i++) {
    if (i === 0 && numPlayers >= 8) {
      // First mafia is Godfather for larger games (enhanced killing ability)
      roles.push(Role.GODFATHER);
    } else {
      // Additional mafia are basic Mafia members
      roles.push(Role.MAFIA);
    }
  }
  
  // Add Hooker (mafia roleblocking role) for very large games
  if (numPlayers >= 12) {
    roles.push(Role.HOOKER);
  }
  
  // Add town special roles progressively based on player count
  if (numPlayers >= 5) roles.push(Role.DETECTIVE);  // Investigation ability
  if (numPlayers >= 7) roles.push(Role.DOCTOR);     // Protection ability
  if (numPlayers >= 9) roles.push(Role.SILENCER);   // Silencing ability
  if (numPlayers >= 11) roles.push(Role.KAMIKAZE);  // Revenge elimination
  
  // Add Joker for medium+ games (independent win condition)
  if (numPlayers >= 10) roles.push(Role.JOKER);
  
  // Fill remaining slots with basic Citizens
  while (roles.length < numPlayers) {
    roles.push(Role.CITIZEN);
  }
  
  // Shuffle roles array to randomize assignment
  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [roles[i], roles[j]] = [roles[j], roles[i]];
  }
  
  // Create player objects with assigned roles
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

/**
 * Assigns roles using custom user-defined configuration.
 * Allows players to select specific special roles, then fills remaining
 * slots with Mafia and Citizens in balanced proportions.
 */
function assignRolesCustom(playerNames: string[], customConfig: CustomRoleConfig): Player[] {
  const { selectedRoles, totalPlayers } = customConfig;
  const roles: Role[] = [...selectedRoles];
  
  // Calculate how many slots remain after user-selected special roles
  const remainingPlayers = totalPlayers - selectedRoles.length;
  
  // Distribute remaining slots between Mafia and Citizens
  // Ensure at least 1 Mafia, prefer ~1 Mafia per 4 total players for balance
  const recommendedMafia = Math.max(1, Math.floor(totalPlayers / 4));
  const numMafia = Math.min(recommendedMafia, Math.max(1, Math.floor(remainingPlayers / 3)));
  const numCitizens = remainingPlayers - numMafia;
  
  // Add calculated Mafia and Citizens to the role pool
  for (let i = 0; i < numMafia; i++) {
    roles.push(Role.MAFIA);
  }
  for (let i = 0; i < numCitizens; i++) {
    roles.push(Role.CITIZEN);
  }
  
  // Shuffle the complete role array for random assignment
  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [roles[i], roles[j]] = [roles[j], roles[i]];
  }
  
  // Create player objects with shuffled role assignments
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

/**
 * Checks current game state for win conditions.
 * Returns the winning team/player or null if game should continue.
 * 
 * Win conditions:
 * - Joker: Wins by being voted out (handled in day phase) or surviving alone
 * - Town: Wins by eliminating all Mafia members
 * - Mafia: Wins by equaling or outnumbering Town members
 */
function checkWinCondition(players: Player[]): 'Mafia' | 'Town' | 'Joker' | null {
  const alivePlayers = players.filter(p => p.status === PlayerStatus.ALIVE);
  
  // Categorize alive players by team affiliation
  const aliveMafia = alivePlayers.filter(p => 
    p.role === Role.MAFIA || p.role === Role.GODFATHER || p.role === Role.HOOKER
  );
  const aliveTown = alivePlayers.filter(p => 
    p.role === Role.CITIZEN || p.role === Role.DETECTIVE || 
    p.role === Role.DOCTOR || p.role === Role.SILENCER || 
    p.role === Role.KAMIKAZE
  );
  const aliveJoker = alivePlayers.find(p => p.role === Role.JOKER);
  
  // Log win condition check
  GameLogger.logGameEvent('WinConditionCheck', {
    totalAlive: alivePlayers.length,
    aliveMafia: aliveMafia.length,
    aliveTown: aliveTown.length,
    aliveJoker: !!aliveJoker,
    mafiaMembers: aliveMafia.map(p => ({ id: p.id, role: p.role })),
    townMembers: aliveTown.map(p => ({ id: p.id, role: p.role }))
  });
  
  // Joker wins if they're the sole survivor (alternate win condition)
  if (aliveJoker && alivePlayers.length === 1) {
    GameLogger.logGameEvent('GameWon', { winner: 'Joker', winCondition: 'sole_survivor' });
    return 'Joker';
  }
  
  // Town wins by complete elimination of Mafia team
  if (aliveMafia.length === 0) {
    GameLogger.logGameEvent('GameWon', { winner: 'Town', winCondition: 'mafia_eliminated' });
    return 'Town';
  }
  
  // Mafia wins by achieving voting majority (equal or greater than town)
  if (aliveMafia.length >= aliveTown.length) {
    GameLogger.logGameEvent('GameWon', { winner: 'Mafia', winCondition: 'voting_majority' });
    return 'Mafia';
  }
  
  // Game continues if no win condition is met
  return null;
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
  
  const selectGameMode = (mode: GameMode) => {
    try {
      GameLogger.logUserAction('selectGameMode', 'system', { mode, playerCount: gameState.players.length });
      dispatch({ type: 'SELECT_GAME_MODE', payload: mode });
    } catch (error) {
      GameLogger.logException(error as Error, { action: 'selectGameMode', mode });
      throw error; // Re-throw to allow component to handle if needed
    }
  };
  
  const initializeGame = (playerNames: string[], mode: AssignmentMode = AssignmentMode.RECOMMENDED, customConfig?: CustomRoleConfig) => {
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
  };
  
  const startGame = () => {
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
  };
  
  const castVote = (voterId: string, targetId: string) => {
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
  };
  
  const submitNightAction = (playerId: string, targetId: string, actionType: 'kill' | 'protect' | 'investigate' | 'silence' | 'roleblock') => {
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
  };
  
  const nextPhase = () => {
    try {
      GameLogger.logGameEvent('PhaseTransition', { 
        fromPhase: gameState.currentPhase,
        dayCount: gameState.dayCount,
        playerCount: gameState.players.filter(p => p.status === 'Alive').length
      });
      dispatch({ type: 'NEXT_PHASE' });
    } catch (error) {
      GameLogger.logException(error as Error, { action: 'nextPhase' });
      throw error;
    }
  };
  
  const nextPlayer = () => {
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
  };
  
  const resetGame = () => {
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
  };
  
  const kamikazeRevenge = (targetId: string) => {
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
  };
  
  const calculateVoteResult = (): VoteResult => {
    try {
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

      const result = {
        eliminatedPlayer: isTie ? undefined : eliminatedPlayer,
        isTie,
        voteCount,
      };

      GameLogger.logGameEvent('VoteCalculated', {
        totalVotes: Object.keys(gameState.votes).length,
        eliminatedPlayerId: result.eliminatedPlayer?.id,
        isTie: result.isTie,
        maxVotes,
        voteDistribution: voteCount,
        dayCount: gameState.dayCount
      });

      return result;
    } catch (error) {
      GameLogger.logException(error as Error, { action: 'calculateVoteResult' });
      throw error;
    }
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