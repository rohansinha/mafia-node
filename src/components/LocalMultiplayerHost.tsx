/**
 * Local Multiplayer Host Component
 * 
 * This component serves as the game orchestrator for local multiplayer mode.
 * It runs on a dedicated "host" device that:
 * - Displays the game board and current state
 * - Plays audio prompts (TTS) for all players
 * - Manages WebSocket connections from player devices
 * - Coordinates the game flow (phases, turns, actions)
 * 
 * Players connect from their own devices and only see their own role/actions.
 * The host device should be placed centrally where all players can hear it.
 */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useGame } from '@/context/GameContext';
import { 
  Player, 
  PlayerStatus, 
  Role, 
  GamePhase,
  MessageType,
  GameMessage,
  ConnectionStatus 
} from '@/types/game';
import { GameLogger } from '@/lib/logger';
import { useSpeech } from '@/hooks/useSpeech';
import { 
  NetworkManager, 
  generateSessionId, 
  getLocalIpAddress,
  selectMafiaKiller,
  PlayerConnection 
} from '@/lib/networkManager';
import { gameConfig } from '@/config/configManager';
import { MAFIA_TEAM_ROLES, getRoleEmoji, getRoleColor } from '@/constants/roles';

// ============================================================================
// TYPES
// ============================================================================

interface ConnectedPlayer {
  playerId: string;
  playerName: string;
  isConnected: boolean;
  hasSubmittedAction: boolean;
}

type HostPhase = 'waiting-for-players' | 'role-reveal' | 'game-active';

// ============================================================================
// COMPONENT
// ============================================================================

export default function LocalMultiplayerHost() {
  const { gameState, submitNightAction, castVote, nextPhase } = useGame();
  const speech = useSpeech();
  
  // Session state
  const [sessionId] = useState(() => generateSessionId());
  const [hostIp] = useState(() => getLocalIpAddress());
  const [hostPhase, setHostPhase] = useState<HostPhase>('waiting-for-players');
  const [connectedPlayers, setConnectedPlayers] = useState<ConnectedPlayer[]>([]);
  
  // Night phase state
  const [currentNightRole, setCurrentNightRole] = useState<string | null>(null);
  const [awaitingActionFrom, setAwaitingActionFrom] = useState<string[]>([]);
  const [nightActionsReceived, setNightActionsReceived] = useState<Record<string, boolean>>({});
  
  // Network manager ref
  const networkRef = useRef<NetworkManager | null>(null);
  
  // Speech refs
  const hasAnnouncedPhase = useRef(false);
  
  const alivePlayers = gameState.players.filter(p => p.status === PlayerStatus.ALIVE);

  // --------------------------------------------------------------------------
  // NETWORK INITIALIZATION
  // --------------------------------------------------------------------------

  useEffect(() => {
    // Initialize network manager for hosting
    const network = new NetworkManager({ mode: 'local', port: 3001 });
    networkRef.current = network;

    // Start hosting
    network.startHosting(sessionId).then(({ sessionId: sid, port }) => {
      console.log(`[Host] Session started: ${sid} on port ${port}`);
    });

    // Set up message handlers
    network.on(MessageType.JOIN_GAME, (message) => {
      const { playerId, playerName } = message.payload as { playerId: string; playerName: string };
      handlePlayerJoin(playerId, playerName);
    });

    network.on(MessageType.SUBMIT_ACTION, (message) => {
      const { actionType, targetId } = message.payload as { actionType: string; targetId: string };
      handleActionSubmission(message.playerId!, actionType, targetId);
    });

    network.on(MessageType.SUBMIT_VOTE, (message) => {
      const { targetId } = message.payload as { targetId: string };
      handleVoteSubmission(message.playerId!, targetId);
    });

    return () => {
      network.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // --------------------------------------------------------------------------
  // PLAYER CONNECTION HANDLERS
  // --------------------------------------------------------------------------

  const handlePlayerJoin = useCallback((playerId: string, playerName: string) => {
    setConnectedPlayers(prev => {
      // Check if player already exists
      const existing = prev.find(p => p.playerId === playerId);
      if (existing) {
        return prev.map(p => 
          p.playerId === playerId ? { ...p, isConnected: true } : p
        );
      }
      return [...prev, {
        playerId,
        playerName,
        isConnected: true,
        hasSubmittedAction: false,
      }];
    });

    // Send current game state to the newly connected player
    if (networkRef.current) {
      networkRef.current.sendToPlayer(playerId, {
        type: MessageType.GAME_STATE_UPDATE,
        payload: {
          phase: gameState.currentPhase,
          dayCount: gameState.dayCount,
          players: gameState.players.map(p => ({
            id: p.id,
            name: p.name,
            status: p.status,
            // Only send role if it's this player's role or revealed
            role: p.id === playerId || p.isRevealed ? p.role : undefined,
            isRevealed: p.isRevealed,
            isSilenced: p.isSilenced,
          })),
        },
      });
    }

    GameLogger.logGameEvent('PlayerConnected', { playerId, playerName, sessionId });
  }, [gameState, sessionId]);

  const handlePlayerDisconnect = useCallback((playerId: string) => {
    setConnectedPlayers(prev => 
      prev.map(p => p.playerId === playerId ? { ...p, isConnected: false } : p)
    );
  }, []);

  // --------------------------------------------------------------------------
  // ACTION HANDLERS
  // --------------------------------------------------------------------------

  const handleActionSubmission = useCallback((
    playerId: string, 
    actionType: string, 
    targetId: string
  ) => {
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return;

    // Submit the action to game context
    submitNightAction(playerId, targetId, actionType as any);

    // Mark as received
    setNightActionsReceived(prev => ({ ...prev, [playerId]: true }));

    // Notify the player their action was received
    if (networkRef.current) {
      networkRef.current.sendToPlayer(playerId, {
        type: MessageType.ACTION_RECEIVED,
        payload: { success: true },
      });
    }

    // Check if all expected actions are received
    setAwaitingActionFrom(prev => prev.filter(id => id !== playerId));

    GameLogger.logUserAction('nightAction', playerId, { actionType, targetId, mode: 'local-multiplayer' });
  }, [gameState.players, submitNightAction]);

  const handleVoteSubmission = useCallback((playerId: string, targetId: string) => {
    castVote(playerId, targetId);

    if (networkRef.current) {
      networkRef.current.sendToPlayer(playerId, {
        type: MessageType.VOTE_RECEIVED,
        payload: { success: true },
      });
    }

    GameLogger.logUserAction('vote', playerId, { targetId, mode: 'local-multiplayer' });
  }, [castVote]);

  // --------------------------------------------------------------------------
  // PHASE MANAGEMENT
  // --------------------------------------------------------------------------

  // Broadcast game state updates when phase changes
  useEffect(() => {
    if (networkRef.current && gameState.currentPhase !== GamePhase.MODE_SELECTION) {
      networkRef.current.broadcast({
        type: MessageType.PHASE_CHANGE,
        payload: {
          phase: gameState.currentPhase,
          dayCount: gameState.dayCount,
        },
      });
    }
    hasAnnouncedPhase.current = false;
  }, [gameState.currentPhase, gameState.dayCount]);

  // Handle night phase - determine who needs to act
  useEffect(() => {
    if (gameState.currentPhase === GamePhase.NIGHT && !hasAnnouncedPhase.current) {
      hasAnnouncedPhase.current = true;
      
      // Announce night
      speech.announceNightOpening(gameState.dayCount);
      
      // Start night phase sequence
      startNightPhaseSequence();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.currentPhase, gameState.dayCount, speech]);

  const startNightPhaseSequence = useCallback(() => {
    // Determine the order of night actions
    const roleOrder: (Role | 'MAFIA_KILL')[] = [
      'MAFIA_KILL',    // Special: Godfather or rotating mafia
      Role.HOOKER,
      Role.DETECTIVE,
      Role.DOCTOR,
      Role.SILENCER,
    ];

    // Filter to only roles with alive players
    const activeRoles = roleOrder.filter(role => {
      if (role === 'MAFIA_KILL') {
        return alivePlayers.some(p => p.role === Role.MAFIA || p.role === Role.GODFATHER);
      }
      return alivePlayers.some(p => p.role === role);
    });

    if (activeRoles.length > 0) {
      processNextNightRole(activeRoles, 0);
    } else {
      // No night actions needed, advance to day
      nextPhase();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alivePlayers, nextPhase]);

  const processNextNightRole = useCallback((
    roleOrder: (Role | 'MAFIA_KILL')[], 
    index: number
  ) => {
    if (index >= roleOrder.length) {
      // All night actions complete
      speech.announceNightEnding();
      setTimeout(() => nextPhase(), 3000);
      return;
    }

    const role = roleOrder[index];
    setCurrentNightRole(role === 'MAFIA_KILL' ? 'MAFIA_TEAM' : role);

    // Determine which player(s) should act
    let actingPlayers: Player[] = [];

    if (role === 'MAFIA_KILL') {
      // Select the mafia killer (Godfather priority, else rotating)
      const killer = selectMafiaKiller(gameState.players, gameState.dayCount);
      if (killer) {
        actingPlayers = [killer];
      }
    } else {
      actingPlayers = alivePlayers.filter(p => p.role === role);
    }

    if (actingPlayers.length === 0) {
      // Skip to next role
      processNextNightRole(roleOrder, index + 1);
      return;
    }

    // Announce the role's turn
    const announcement = role === 'MAFIA_KILL' ? 'MAFIA_TEAM' : role.toString();
    speech.announceRoleTurn(announcement);

    // Request action from the player(s)
    const playerIds = actingPlayers.map(p => p.id);
    setAwaitingActionFrom(playerIds);

    // Send action request to each player
    actingPlayers.forEach(player => {
      if (networkRef.current) {
        networkRef.current.sendToPlayer(player.id, {
          type: MessageType.REQUEST_ACTION,
          payload: {
            role: role === 'MAFIA_KILL' ? 'MAFIA_KILL' : role,
            validTargets: getValidTargets(role, player),
          },
        });
      }
    });

    // Set timeout to auto-advance if no action received
    const timeout = (gameConfig.timing.nightActionTime || 60) * 1000;
    setTimeout(() => {
      // If still waiting, skip this role
      if (awaitingActionFrom.length > 0) {
        console.log(`[Host] Timeout waiting for ${role}, skipping`);
        setAwaitingActionFrom([]);
        processNextNightRole(roleOrder, index + 1);
      }
    }, timeout);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alivePlayers, gameState.players, gameState.dayCount, speech, nextPhase]);

  // When all actions for current role are received, move to next
  useEffect(() => {
    if (awaitingActionFrom.length === 0 && currentNightRole) {
      // Small delay before next role
      const delay = gameConfig.timing.nightTurnTransitionDelay || 5000;
      setTimeout(() => {
        // This will be handled by the processNextNightRole's timeout or completion
      }, delay);
    }
  }, [awaitingActionFrom, currentNightRole]);

  const getValidTargets = (role: Role | 'MAFIA_KILL', actingPlayer: Player): Player[] => {
    switch (role) {
      case 'MAFIA_KILL':
      case Role.MAFIA:
      case Role.GODFATHER:
        // Can target non-mafia players
        return alivePlayers.filter(p => !MAFIA_TEAM_ROLES.includes(p.role));
      case Role.HOOKER:
        // Can't target Godfather or other Hookers
        return alivePlayers.filter(p => p.role !== Role.GODFATHER && p.role !== Role.HOOKER);
      default:
        return alivePlayers;
    }
  };

  // --------------------------------------------------------------------------
  // UI HELPERS
  // --------------------------------------------------------------------------

  const MIN_PLAYERS = gameConfig.players.minPlayers || 6;
  const connectedCount = connectedPlayers.filter(p => p.isConnected).length;
  const hasEnoughPlayers = connectedCount >= MIN_PLAYERS;

  const allPlayersConnected = connectedPlayers.length >= gameState.players.length &&
    connectedPlayers.every(cp => 
      gameState.players.some(p => p.name === cp.playerName && cp.isConnected)
    );

  const canStartGame = hostPhase === 'waiting-for-players' && hasEnoughPlayers;

  // Determine the button message
  const getStartButtonText = () => {
    if (canStartGame) return 'Start Game';
    if (connectedCount < MIN_PLAYERS) {
      return `Need ${MIN_PLAYERS - connectedCount} more player${MIN_PLAYERS - connectedCount === 1 ? '' : 's'} (minimum ${MIN_PLAYERS})`;
    }
    return 'Waiting for all players to connect...';
  };

  const handleStartGame = () => {
    setHostPhase('game-active');
    
    // Send each player their role
    gameState.players.forEach(player => {
      if (networkRef.current) {
        networkRef.current.sendToPlayer(player.id, {
          type: MessageType.GAME_STATE_UPDATE,
          payload: {
            yourRole: player.role,
            players: gameState.players.map(p => ({
              id: p.id,
              name: p.name,
              status: p.status,
              role: p.id === player.id ? p.role : undefined,
            })),
          },
        });
      }
    });

    // Announce game start
    speech.speak("The game is starting. Each player has received their role on their device.");
  };

  // --------------------------------------------------------------------------
  // RENDER
  // --------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold mb-2">🎭 Mafia - Host</h1>
        <div className="bg-blue-900/50 rounded-lg p-4 inline-block">
          <p className="text-sm text-gray-300 mb-1">Session Code</p>
          <p className="text-4xl font-mono font-bold tracking-widest">{sessionId}</p>
          <p className="text-xs text-gray-400 mt-2">
            Players connect to: <span className="font-mono">{hostIp}:3001</span>
          </p>
        </div>
      </div>

      {/* Waiting for Players */}
      {hostPhase === 'waiting-for-players' && (
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl font-semibold mb-4 text-center">
            Waiting for Players ({connectedPlayers.filter(p => p.isConnected).length}/{gameState.players.length})
          </h2>
          
          <div className="grid gap-3 mb-6">
            {gameState.players.map(player => {
              const connection = connectedPlayers.find(cp => cp.playerName === player.name);
              const isConnected = connection?.isConnected || false;
              
              return (
                <div 
                  key={player.id}
                  className={`p-4 rounded-lg flex items-center justify-between ${
                    isConnected ? 'bg-green-900/50 border border-green-500' : 'bg-gray-800 border border-gray-600'
                  }`}
                >
                  <span className="font-medium">{player.name}</span>
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    isConnected ? 'bg-green-500 text-white' : 'bg-gray-600 text-gray-300'
                  }`}>
                    {isConnected ? '✓ Connected' : 'Waiting...'}
                  </span>
                </div>
              );
            })}
          </div>

          <button
            onClick={handleStartGame}
            disabled={!canStartGame}
            className={`w-full py-4 rounded-lg font-bold text-lg transition-all ${
              canStartGame 
                ? 'bg-green-600 hover:bg-green-500 cursor-pointer' 
                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
            }`}
          >
            {getStartButtonText()}
          </button>
        </div>
      )}

      {/* Game Active */}
      {hostPhase === 'game-active' && (
        <div className="max-w-4xl mx-auto">
          {/* Phase Display */}
          <div className="text-center mb-6">
            <div className={`inline-block px-6 py-3 rounded-full text-xl font-bold ${
              gameState.currentPhase === GamePhase.DAY 
                ? 'bg-yellow-500 text-black' 
                : gameState.currentPhase === GamePhase.NIGHT
                ? 'bg-indigo-900 text-white'
                : 'bg-gray-700'
            }`}>
              {gameState.currentPhase === GamePhase.DAY && `☀️ Day ${gameState.dayCount}`}
              {gameState.currentPhase === GamePhase.NIGHT && `🌙 Night ${gameState.dayCount}`}
              {gameState.currentPhase === GamePhase.GAME_OVER && '🏁 Game Over'}
            </div>
          </div>

          {/* Night Phase - Current Role */}
          {gameState.currentPhase === GamePhase.NIGHT && currentNightRole && (
            <div className="bg-indigo-900/50 rounded-lg p-6 mb-6 text-center">
              <h3 className="text-lg text-gray-300 mb-2">Current Turn</h3>
              <p className="text-3xl font-bold">
                {currentNightRole === 'MAFIA_TEAM' ? '🔪 Mafia' : `${getRoleEmoji(currentNightRole as Role)} ${currentNightRole}`}
              </p>
              {awaitingActionFrom.length > 0 && (
                <p className="text-sm text-gray-400 mt-2">
                  Waiting for action... ({awaitingActionFrom.length} pending)
                </p>
              )}
            </div>
          )}

          {/* Player Status Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {gameState.players.map(player => (
              <div 
                key={player.id}
                className={`p-3 rounded-lg ${
                  player.status === PlayerStatus.ALIVE 
                    ? 'bg-gray-800' 
                    : 'bg-red-900/30 opacity-60'
                }`}
              >
                <p className="font-medium truncate">{player.name}</p>
                <p className="text-sm text-gray-400">
                  {player.status === PlayerStatus.ELIMINATED ? '💀 Eliminated' : '✓ Alive'}
                </p>
                {player.isRevealed && (
                  <p className={`text-xs mt-1 ${getRoleColor(player.role)}`}>
                    {getRoleEmoji(player.role)} {player.role}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Game Over */}
          {gameState.currentPhase === GamePhase.GAME_OVER && gameState.winner && (
            <div className="mt-8 text-center">
              <h2 className={`text-4xl font-bold mb-4 ${
                gameState.winner === 'Mafia' ? 'text-red-500' : 
                gameState.winner === 'Town' ? 'text-blue-500' : 'text-yellow-500'
              }`}>
                {gameState.winner} Wins!
              </h2>
            </div>
          )}
        </div>
      )}

      {/* Audio Status */}
      <div className="fixed bottom-4 right-4">
        <button
          onClick={() => speech.testSpeech()}
          className="bg-gray-700 hover:bg-gray-600 p-3 rounded-full"
          title="Test Audio"
        >
          🔊
        </button>
      </div>
    </div>
  );
}
