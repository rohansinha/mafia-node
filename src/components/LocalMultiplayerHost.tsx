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
  detectLocalIpAddress,
  selectMafiaKiller,
  PlayerConnection 
} from '@/lib/networkManager';
import { gameConfig } from '@/config/configManager';
import { MAFIA_TEAM_ROLES, getRoleEmoji, getRoleColor } from '@/constants/roles';

// ============================================================================
// TYPES
// ============================================================================

interface ConnectedPlayer {
  playerId: string;        // Persistent browser ID
  playerName: string;
  isConnected: boolean;
  hasSubmittedAction: boolean;
  gamePlayerId?: string;   // ID in the game state (assigned when game starts)
}

type HostPhase = 'waiting-for-players' | 'role-reveal' | 'game-active';

// ============================================================================
// COMPONENT
// ============================================================================

export default function LocalMultiplayerHost() {
  const { gameState, submitNightAction, castVote, nextPhase, initializeGame, startGame } = useGame();
  const speech = useSpeech();
  
  // Session state
  const [sessionId] = useState(() => generateSessionId());
  const [hostIp, setHostIp] = useState<string>('');
  const [isDetectingIp, setIsDetectingIp] = useState(true);
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
  
  // Flag to send roles after initialization
  const pendingRoleSend = useRef(false);
  
  const alivePlayers = gameState.players.filter(p => p.status === PlayerStatus.ALIVE);

  // --------------------------------------------------------------------------
  // IP ADDRESS DETECTION
  // --------------------------------------------------------------------------

  useEffect(() => {
    detectLocalIpAddress().then((ip) => {
      setHostIp(ip || '');
      setIsDetectingIp(false);
    });
  }, []);

  // --------------------------------------------------------------------------
  // SEND ROLES AFTER GAME INITIALIZATION
  // --------------------------------------------------------------------------

  useEffect(() => {
    // When players are initialized and we're waiting to send roles
    if (pendingRoleSend.current && gameState.players.length > 0 && hostPhase === 'game-active') {
      pendingRoleSend.current = false;
      
      // Map connected players to game players by name order
      const activeConnections = connectedPlayers.filter(p => p.isConnected);
      
      gameState.players.forEach((player, index) => {
        const connection = activeConnections[index];
        if (connection && networkRef.current) {
          console.log(`[Host] Sending role ${player.role} to ${connection.playerName} (${connection.playerId})`);
          
          // Notify server of role assignment (for reconnection support)
          networkRef.current.send({
            type: 'assign_game_role' as any,
            payload: {
              targetPlayerId: connection.playerId,
              gamePlayerId: player.id,
              gameRole: player.role,
            },
          });
          
          // Send role to the player
          networkRef.current.sendToPlayer(connection.playerId, {
            type: MessageType.GAME_STATE_UPDATE,
            payload: {
              yourRole: player.role,
              playerId: player.id,
              phase: gameState.currentPhase,
              dayCount: gameState.dayCount,
              players: gameState.players.map(p => ({
                id: p.id,
                name: p.name,
                status: p.status,
                role: p.id === player.id ? p.role : undefined,
              })),
            },
          });
          
          // Update connectedPlayers with their game player ID
          setConnectedPlayers(prev => prev.map(cp => 
            cp.playerId === connection.playerId 
              ? { ...cp, gamePlayerId: player.id } 
              : cp
          ));
        }
      });

      // Announce game start
      speech.speak("The game is starting. Each player has received their role on their device.");
    }
  }, [gameState.players, hostPhase, connectedPlayers, speech]);

  // --------------------------------------------------------------------------
  // NETWORK INITIALIZATION
  // --------------------------------------------------------------------------

  useEffect(() => {
    let isMounted = true;
    
    // Initialize network manager for hosting
    const network = new NetworkManager({ mode: 'local', port: 3001 });
    networkRef.current = network;

    // Start hosting
    network.startHosting(sessionId)
      .then(({ sessionId: sid, port }) => {
        if (isMounted) {
          console.log(`[Host] Session started: ${sid} on port ${port}`);
        }
      })
      .catch((error) => {
        // Only log error if component is still mounted
        if (isMounted) {
          console.error('[Host] Failed to start session:', error);
        }
      });

    // Set up message handlers
    network.on(MessageType.JOIN_GAME, (message) => {
      if (!isMounted) return;
      const { playerId, playerName } = message.payload as { playerId: string; playerName: string };
      handlePlayerJoin(playerId, playerName);
    });

    network.on(MessageType.PLAYER_RECONNECTED, (message) => {
      if (!isMounted) return;
      const { playerId, playerName } = message.payload as { playerId: string; playerName: string };
      handlePlayerReconnect(playerId, playerName);
    });

    network.on(MessageType.PLAYER_DISCONNECTED, (message) => {
      if (!isMounted) return;
      const { playerId, playerName } = message.payload as { playerId: string; playerName: string };
      handlePlayerDisconnect(playerId, playerName);
    });

    network.on(MessageType.SUBMIT_ACTION, (message) => {
      if (!isMounted) return;
      const { actionType, targetId } = message.payload as { actionType: string; targetId: string };
      handleActionSubmission(message.playerId!, actionType, targetId);
    });

    network.on(MessageType.SUBMIT_VOTE, (message) => {
      if (!isMounted) return;
      const { targetId } = message.payload as { targetId: string };
      handleVoteSubmission(message.playerId!, targetId);
    });

    return () => {
      isMounted = false;
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

  const handlePlayerDisconnect = useCallback((playerId: string, playerName: string) => {
    console.log(`[Host] Player disconnected: ${playerName} (${playerId})`);
    setConnectedPlayers(prev => 
      prev.map(p => p.playerId === playerId ? { ...p, isConnected: false } : p)
    );
    
    // Announce disconnection if game is active
    if (hostPhase === 'game-active') {
      speech.speak(`${playerName} has disconnected. They can rejoin using the same session code.`);
    }
    
    GameLogger.logGameEvent('PlayerDisconnected', { playerId, playerName, sessionId });
  }, [hostPhase, speech, sessionId]);

  const handlePlayerReconnect = useCallback((playerId: string, playerName: string) => {
    console.log(`[Host] Player reconnected: ${playerName} (${playerId})`);
    setConnectedPlayers(prev => 
      prev.map(p => p.playerId === playerId ? { ...p, isConnected: true } : p)
    );
    
    // Find the player's game state and send it to them
    const connectedPlayer = connectedPlayers.find(p => p.playerId === playerId);
    if (connectedPlayer && networkRef.current) {
      // Find their game player
      const gamePlayer = gameState.players.find(p => p.name === connectedPlayer.playerName);
      
      if (gamePlayer && hostPhase === 'game-active') {
        // Send their full game state
        networkRef.current.sendToPlayer(playerId, {
          type: MessageType.GAME_STATE_UPDATE,
          payload: {
            yourRole: gamePlayer.role,
            playerId: gamePlayer.id,
            phase: gameState.currentPhase,
            dayCount: gameState.dayCount,
            players: gameState.players.map(p => ({
              id: p.id,
              name: p.name,
              status: p.status,
              role: p.id === gamePlayer.id || p.isRevealed ? p.role : undefined,
              isRevealed: p.isRevealed,
              isSilenced: p.isSilenced,
            })),
          },
        });
        
        speech.speak(`${playerName} has reconnected.`);
      }
    }
    
    GameLogger.logGameEvent('PlayerReconnected', { playerId, playerName, sessionId });
  }, [connectedPlayers, gameState, hostPhase, speech, sessionId]);

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
    // Get connected player names
    const playerNames = connectedPlayers
      .filter(p => p.isConnected)
      .map(p => p.playerName);
    
    // Mark that we need to send roles after state updates
    pendingRoleSend.current = true;
    
    // Initialize game with connected players (assigns roles)
    initializeGame(playerNames);
    
    // Set host phase to active (roles will be sent by useEffect when gameState.players updates)
    setHostPhase('game-active');
    startGame();
  };

  // --------------------------------------------------------------------------
  // RENDER
  // --------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold mb-2">🎭 Mafia - Host</h1>
        
        {/* Connection Info Box */}
        <div className="bg-blue-900/50 rounded-lg p-4 inline-block max-w-md">
          <p className="text-lg text-gray-200 mb-3">Players enter these values to join:</p>
          
          {/* Host Address */}
          <div className="mb-3">
            <p className="text-xs text-gray-400 mb-1">Host Address</p>
            {isDetectingIp ? (
              <p className="text-lg font-mono bg-gray-800 rounded px-3 py-2">Detecting...</p>
            ) : hostIp ? (
              <p className="text-2xl font-mono font-bold bg-gray-800 rounded px-3 py-2 select-all">{hostIp}</p>
            ) : (
              <div className="bg-yellow-900/50 border border-yellow-600 rounded p-2">
                <p className="text-yellow-300 text-sm mb-1">⚠️ Could not detect IP automatically</p>
                <p className="text-gray-300 text-xs">
                  On Windows: Open CMD and run <code className="bg-gray-700 px-1 rounded">ipconfig</code>
                  <br />Look for &quot;IPv4 Address&quot; (e.g., 192.168.1.xxx)
                </p>
              </div>
            )}
          </div>
          
          {/* Session Code */}
          <div>
            <p className="text-xs text-gray-400 mb-1">Session Code</p>
            <p className="text-4xl font-mono font-bold tracking-widest bg-gray-800 rounded px-3 py-2 select-all">{sessionId}</p>
          </div>
        </div>
      </div>

      {/* Waiting for Players */}
      {hostPhase === 'waiting-for-players' && (
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl font-semibold mb-4 text-center">
            Connected Players ({connectedPlayers.filter(p => p.isConnected).length}/{MIN_PLAYERS} minimum)
          </h2>
          
          <div className="grid gap-3 mb-6">
            {connectedPlayers.length === 0 ? (
              <div className="p-4 rounded-lg bg-gray-800 border border-gray-600 text-center text-gray-400">
                No players connected yet. Share the session code above with players.
              </div>
            ) : (
              connectedPlayers.map((player, index) => (
                <div 
                  key={player.playerId}
                  className={`p-4 rounded-lg flex items-center justify-between ${
                    player.isConnected 
                      ? 'bg-green-900/50 border border-green-500' 
                      : 'bg-yellow-900/30 border border-yellow-600'
                  }`}
                >
                  <span className="font-medium">
                    <span className="text-gray-400 mr-2">#{index + 1}</span>
                    {player.playerName}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    player.isConnected 
                      ? 'bg-green-500 text-white' 
                      : 'bg-yellow-600 text-white'
                  }`}>
                    {player.isConnected ? '✓ Connected' : '⚠ Disconnected'}
                  </span>
                </div>
              ))
            )}
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
