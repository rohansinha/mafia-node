/**
 * Custom React Hooks for Mafia Game
 * 
 * Provides reusable hooks for:
 * - Game state selectors with memoization
 * - Night phase management
 * - Voting state management
 * - Player filtering utilities
 * - Device passing flow
 * 
 * These hooks encapsulate common patterns and reduce code duplication
 * while providing performance benefits through memoization.
 */

import { useMemo, useState, useCallback } from 'react';
import { useGame } from '@/context/GameContext';
import { Player, PlayerStatus, Role } from '@/types/game';
import { NIGHT_ACTION_ORDER, MAFIA_TEAM_ROLES, TOWN_TEAM_ROLES } from '@/constants/roles';

/**
 * Hook for accessing filtered player lists with memoization
 */
export function usePlayers() {
  const { gameState } = useGame();
  
  const alivePlayers = useMemo(
    () => gameState.players.filter(p => p.status === PlayerStatus.ALIVE),
    [gameState.players]
  );
  
  const eliminatedPlayers = useMemo(
    () => gameState.players.filter(p => p.status === PlayerStatus.ELIMINATED),
    [gameState.players]
  );
  
  const silencedPlayers = useMemo(
    () => gameState.players.filter(p => p.isSilenced && p.status === PlayerStatus.ALIVE),
    [gameState.players]
  );
  
  const mafiaPlayers = useMemo(
    () => gameState.players.filter(p => MAFIA_TEAM_ROLES.includes(p.role)),
    [gameState.players]
  );
  
  const townPlayers = useMemo(
    () => gameState.players.filter(p => TOWN_TEAM_ROLES.includes(p.role)),
    [gameState.players]
  );
  
  const aliveMafia = useMemo(
    () => alivePlayers.filter(p => MAFIA_TEAM_ROLES.includes(p.role)),
    [alivePlayers]
  );
  
  const aliveTown = useMemo(
    () => alivePlayers.filter(p => TOWN_TEAM_ROLES.includes(p.role)),
    [alivePlayers]
  );
  
  const jokerPlayer = useMemo(
    () => gameState.players.find(p => p.role === Role.JOKER),
    [gameState.players]
  );
  
  return {
    allPlayers: gameState.players,
    alivePlayers,
    eliminatedPlayers,
    silencedPlayers,
    mafiaPlayers,
    townPlayers,
    aliveMafia,
    aliveTown,
    jokerPlayer,
    playerCount: gameState.players.length,
    aliveCount: alivePlayers.length,
  };
}

/**
 * Hook for managing night phase state and flow
 */
export function useNightPhase() {
  const { gameState, submitNightAction, nextPhase } = useGame();
  const { alivePlayers } = usePlayers();
  
  const [currentRoleIndex, setCurrentRoleIndex] = useState(0);
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const [nightStep, setNightStep] = useState<'eyes-closed' | 'role-turn' | 'action-selection'>('eyes-closed');
  const [showAction, setShowAction] = useState(false);
  
  // Get roles with alive players in night action order
  const activeRoles = useMemo(() => 
    NIGHT_ACTION_ORDER.filter(role => 
      alivePlayers.some(p => p.role === role)
    ),
    [alivePlayers]
  );
  
  const currentRole = activeRoles[currentRoleIndex];
  
  const currentRolePlayers = useMemo(() =>
    alivePlayers.filter(p => p.role === currentRole),
    [alivePlayers, currentRole]
  );
  
  // Get valid targets based on role
  const actionTargets = useMemo(() => {
    if (!currentRole) return [];
    
    switch (currentRole) {
      case Role.MAFIA:
      case Role.GODFATHER:
        return alivePlayers.filter(p => !MAFIA_TEAM_ROLES.includes(p.role));
      case Role.HOOKER:
        return alivePlayers.filter(p => 
          p.role !== Role.HOOKER && p.role !== Role.GODFATHER
        );
      default:
        return alivePlayers;
    }
  }, [currentRole, alivePlayers]);
  
  const startNightActions = useCallback(() => {
    setNightStep('role-turn');
  }, []);
  
  const showActionInterface = useCallback(() => {
    setShowAction(true);
    setNightStep('action-selection');
  }, []);
  
  const completeAction = useCallback(() => {
    if (currentRoleIndex < activeRoles.length - 1) {
      setCurrentRoleIndex(prev => prev + 1);
      setSelectedTarget('');
      setShowAction(false);
      setNightStep('role-turn');
    } else {
      nextPhase();
    }
  }, [currentRoleIndex, activeRoles.length, nextPhase]);
  
  const submitAction = useCallback((actionType: 'kill' | 'protect' | 'investigate' | 'silence' | 'roleblock') => {
    if (selectedTarget && currentRolePlayers[0]) {
      submitNightAction(currentRolePlayers[0].id, selectedTarget, actionType);
      completeAction();
    }
  }, [selectedTarget, currentRolePlayers, submitNightAction, completeAction]);
  
  const skipAction = useCallback(() => {
    completeAction();
  }, [completeAction]);
  
  const resetNightPhase = useCallback(() => {
    setCurrentRoleIndex(0);
    setSelectedTarget('');
    setNightStep('eyes-closed');
    setShowAction(false);
  }, []);
  
  return {
    currentRole,
    currentRoleIndex,
    currentRolePlayers,
    activeRoles,
    actionTargets,
    selectedTarget,
    setSelectedTarget,
    nightStep,
    showAction,
    startNightActions,
    showActionInterface,
    submitAction,
    skipAction,
    resetNightPhase,
    isLastRole: currentRoleIndex >= activeRoles.length - 1,
    progress: activeRoles.length > 0 ? (currentRoleIndex + 1) / activeRoles.length : 0,
  };
}

/**
 * Hook for managing day phase voting
 */
export function useVoting() {
  const { gameState, castVote, nextPlayer, calculateVoteResult } = useGame();
  const { alivePlayers } = usePlayers();
  
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const [showVoting, setShowVoting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  
  // Find next player who hasn't voted
  const currentVoter = useMemo(() => {
    for (let i = 0; i < alivePlayers.length; i++) {
      const playerIndex = (gameState.currentPlayerIndex + i) % alivePlayers.length;
      const player = alivePlayers[playerIndex];
      if (!gameState.votes[player.id]) {
        return player;
      }
    }
    return null;
  }, [alivePlayers, gameState.currentPlayerIndex, gameState.votes]);
  
  // Get valid voting targets (excluding current voter)
  const votingTargets = useMemo(() =>
    alivePlayers.filter(p => p.id !== currentVoter?.id),
    [alivePlayers, currentVoter]
  );
  
  const allVotesCast = Object.keys(gameState.votes).length === alivePlayers.length;
  
  const voteResult = useMemo(
    () => calculateVoteResult(),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- calculateVoteResult is stable
    [gameState.votes, gameState.players]
  );
  
  const submitVote = useCallback(() => {
    if (selectedTarget && currentVoter) {
      castVote(currentVoter.id, selectedTarget);
      setSelectedTarget('');
      setShowVoting(false);
      nextPlayer();
    }
  }, [selectedTarget, currentVoter, castVote, nextPlayer]);
  
  const openVotingModal = useCallback(() => {
    setShowVoting(true);
  }, []);
  
  const closeVotingModal = useCallback(() => {
    setShowVoting(false);
    setSelectedTarget('');
  }, []);
  
  const openResults = useCallback(() => {
    setShowResults(true);
  }, []);
  
  const closeResults = useCallback(() => {
    setShowResults(false);
  }, []);
  
  return {
    currentVoter,
    votingTargets,
    selectedTarget,
    setSelectedTarget,
    showVoting,
    showResults,
    allVotesCast,
    voteResult,
    submitVote,
    openVotingModal,
    closeVotingModal,
    openResults,
    closeResults,
    voteCount: Object.keys(gameState.votes).length,
    totalVoters: alivePlayers.length,
  };
}

/**
 * Hook for device passing flow (role revelation, player turns)
 */
export function useDevicePassing(playerList: Player[]) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  
  const currentPlayer = playerList[currentIndex];
  const isLastPlayer = currentIndex >= playerList.length - 1;
  const progress = playerList.length > 0 ? (currentIndex + 1) / playerList.length : 0;
  
  const reveal = useCallback(() => {
    setIsRevealed(true);
  }, []);
  
  const hide = useCallback(() => {
    setIsRevealed(false);
  }, []);
  
  const nextPlayer = useCallback(() => {
    if (!isLastPlayer) {
      setCurrentIndex(prev => prev + 1);
      setIsRevealed(false);
    }
  }, [isLastPlayer]);
  
  const previousPlayer = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setIsRevealed(false);
    }
  }, [currentIndex]);
  
  const reset = useCallback(() => {
    setCurrentIndex(0);
    setIsRevealed(false);
  }, []);
  
  const goToPlayer = useCallback((index: number) => {
    if (index >= 0 && index < playerList.length) {
      setCurrentIndex(index);
      setIsRevealed(false);
    }
  }, [playerList.length]);
  
  return {
    currentPlayer,
    currentIndex,
    isRevealed,
    isLastPlayer,
    progress,
    reveal,
    hide,
    nextPlayer,
    previousPlayer,
    reset,
    goToPlayer,
    totalPlayers: playerList.length,
  };
}

/**
 * Hook for managing Kamikaze revenge mechanic
 */
export function useKamikazeRevenge() {
  const { kamikazeRevenge, nextPhase } = useGame();
  const { alivePlayers } = usePlayers();
  
  const [targetId, setTargetId] = useState<string>('');
  const [isActive, setIsActive] = useState(false);
  
  const availableTargets = useMemo(() =>
    alivePlayers.filter(p => p.role !== Role.KAMIKAZE),
    [alivePlayers]
  );
  
  const activate = useCallback((kamikazePlayerId: string) => {
    setIsActive(true);
    // Filter out the kamikaze player from targets
    setTargetId('');
  }, []);
  
  const executeRevenge = useCallback(() => {
    if (targetId) {
      kamikazeRevenge(targetId);
      nextPhase();
      setIsActive(false);
      setTargetId('');
    }
  }, [targetId, kamikazeRevenge, nextPhase]);
  
  const skipRevenge = useCallback(() => {
    nextPhase();
    setIsActive(false);
    setTargetId('');
  }, [nextPhase]);
  
  return {
    isActive,
    targetId,
    setTargetId,
    availableTargets,
    activate,
    executeRevenge,
    skipRevenge,
  };
}

/**
 * Hook for game progress tracking
 */
export function useGameProgress() {
  const { gameState } = useGame();
  const { aliveCount, playerCount } = usePlayers();
  
  return {
    dayCount: gameState.dayCount,
    currentPhase: gameState.currentPhase,
    winner: gameState.winner,
    gameMode: gameState.gameMode,
    assignmentMode: gameState.assignmentMode,
    aliveCount,
    playerCount,
    eliminatedCount: playerCount - aliveCount,
    survivalRate: playerCount > 0 ? (aliveCount / playerCount) * 100 : 0,
  };
}
