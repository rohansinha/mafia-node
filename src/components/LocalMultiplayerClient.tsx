/**
 * Local Multiplayer Client Component
 * 
 * This component runs on each player's personal device in local multiplayer mode.
 * It connects to the host device via WebSocket and allows the player to:
 * - View their assigned role (privately)
 * - Submit night actions when it's their turn
 * - Cast votes during day phase
 * - See game state updates (who's alive, phase changes)
 * 
 * The player only sees information relevant to them - they never see other players' roles
 * unless those roles have been publicly revealed.
 */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
import { NetworkManager } from '@/lib/networkManager';
import { getRoleEmoji, getRoleColor, getRoleDescription, MAFIA_TEAM_ROLES } from '@/constants/roles';

// ============================================================================
// TYPES
// ============================================================================

interface ClientState {
  connectionStatus: ConnectionStatus;
  myRole?: Role;
  myPlayerId?: string;
  currentPhase: GamePhase;
  dayCount: number;
  players: Partial<Player>[];
  isMyTurn: boolean;
  validTargets: Partial<Player>[];
  actionType?: string;
  hasSubmittedAction: boolean;
  hasSubmittedVote: boolean;
  winner?: string;
}

interface JoinFormData {
  sessionCode: string;
  playerName: string;
  hostAddress: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

const PLAYER_NAME_STORAGE_KEY = 'mafia_player_name';
const PLAYER_ID_STORAGE_KEY = 'mafia_player_id';
const LAST_SESSION_STORAGE_KEY = 'mafia_last_session';

/**
 * Get or create a persistent player ID for this browser
 */
function getOrCreatePlayerId(): string {
  if (typeof window === 'undefined') return '';
  
  let playerId = localStorage.getItem(PLAYER_ID_STORAGE_KEY);
  if (!playerId) {
    playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(PLAYER_ID_STORAGE_KEY, playerId);
  }
  return playerId;
}

/**
 * Save the current session info for potential reconnection
 */
function saveSessionInfo(sessionCode: string, hostAddress: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LAST_SESSION_STORAGE_KEY, JSON.stringify({
    sessionCode,
    hostAddress,
    timestamp: Date.now(),
  }));
}

/**
 * Get last session info if still valid (within 2 hours)
 */
function getLastSessionInfo(): { sessionCode: string; hostAddress: string } | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const data = localStorage.getItem(LAST_SESSION_STORAGE_KEY);
    if (!data) return null;
    
    const session = JSON.parse(data);
    const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);
    
    if (session.timestamp > twoHoursAgo) {
      return { sessionCode: session.sessionCode, hostAddress: session.hostAddress };
    }
  } catch (e) {
    console.error('Failed to parse last session:', e);
  }
  return null;
}

export default function LocalMultiplayerClient() {
  // Persistent player ID
  const [persistentPlayerId] = useState(() => getOrCreatePlayerId());
  
  // Connection form state - auto-detect host address from browser URL and load cached player name
  const [formData, setFormData] = useState<JoinFormData>(() => {
    const detectedHost = typeof window !== 'undefined' ? window.location.hostname : '';
    const cachedName = typeof window !== 'undefined' ? localStorage.getItem(PLAYER_NAME_STORAGE_KEY) || '' : '';
    const lastSession = getLastSessionInfo();
    
    return {
      sessionCode: lastSession?.sessionCode || '',
      playerName: cachedName,
      hostAddress: lastSession?.hostAddress || detectedHost,
    };
  });
  const [isJoining, setIsJoining] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Client game state
  const [clientState, setClientState] = useState<ClientState>({
    connectionStatus: ConnectionStatus.DISCONNECTED,
    currentPhase: GamePhase.MODE_SELECTION,
    dayCount: 0,
    players: [],
    isMyTurn: false,
    validTargets: [],
    hasSubmittedAction: false,
    hasSubmittedVote: false,
  });

  // Selected target for action/vote
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);

  // Network manager ref
  const networkRef = useRef<NetworkManager | null>(null);

  // --------------------------------------------------------------------------
  // CONNECTION
  // --------------------------------------------------------------------------

  const handleJoinGame = async () => {
    if (!formData.sessionCode || !formData.playerName || !formData.hostAddress) {
      setErrorMessage('Please fill in all fields');
      return;
    }

    // Cache player name and session info for reconnection
    localStorage.setItem(PLAYER_NAME_STORAGE_KEY, formData.playerName);
    saveSessionInfo(formData.sessionCode, formData.hostAddress);

    setIsJoining(true);
    setErrorMessage(null);
    setClientState(prev => ({ ...prev, connectionStatus: ConnectionStatus.CONNECTING }));

    try {
      const network = new NetworkManager({ mode: 'local' });
      networkRef.current = network;

      // Use persistent player ID for reconnection support
      const playerId = persistentPlayerId;
      console.log(`[Client] Using persistent player ID: ${playerId}`);

      // Set up message handlers before connecting
      setupMessageHandlers(network, playerId);

      // Connect to host - WebSocket server is on port 3001 at root path
      const serverUrl = `ws://${formData.hostAddress}:3001/?session=${formData.sessionCode}`;
      console.log(`[Client] Attempting to join session ${formData.sessionCode} at ${serverUrl}`);
      console.log(`[Client] Host address from form: ${formData.hostAddress}`);
      await network.connect(serverUrl, playerId, formData.playerName);

      setClientState(prev => ({
        ...prev,
        connectionStatus: ConnectionStatus.CONNECTED,
        myPlayerId: playerId,
      }));

      GameLogger.logUserAction('joinGame', playerId, { 
        sessionCode: formData.sessionCode, 
        playerName: formData.playerName 
      });

    } catch (error) {
      console.error('Failed to join game:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setErrorMessage(`Failed to connect: ${errorMsg}. Check the host address and session code.`);
      setClientState(prev => ({ ...prev, connectionStatus: ConnectionStatus.DISCONNECTED }));
    } finally {
      setIsJoining(false);
    }
  };

  const setupMessageHandlers = (network: NetworkManager, playerId: string) => {
    // Handle successful rejoin (reconnection to an existing game)
    network.on(MessageType.REJOIN_GAME, (message) => {
      const payload = message.payload as { 
        gamePlayerId: string; 
        gameRole: string; 
        gameStarted: boolean;
      };
      console.log('[Client] Rejoin successful:', payload);
      
      if (payload.gameStarted) {
        setClientState(prev => ({
          ...prev,
          myRole: payload.gameRole as Role,
          myPlayerId: payload.gamePlayerId,
          connectionStatus: ConnectionStatus.CONNECTED,
        }));
        setErrorMessage(null);
      }
    });
    
    // Game state updates
    network.on(MessageType.GAME_STATE_UPDATE, (message) => {
      const payload = message.payload as any;
      setClientState(prev => ({
        ...prev,
        myRole: payload.yourRole || prev.myRole,
        currentPhase: payload.phase || prev.currentPhase,
        dayCount: payload.dayCount || prev.dayCount,
        players: payload.players || prev.players,
        winner: payload.winner,
      }));
    });

    // Phase changes
    network.on(MessageType.PHASE_CHANGE, (message) => {
      const payload = message.payload as { phase: GamePhase; dayCount: number };
      setClientState(prev => ({
        ...prev,
        currentPhase: payload.phase,
        dayCount: payload.dayCount,
        isMyTurn: false,
        hasSubmittedAction: false,
        hasSubmittedVote: false,
      }));
      setSelectedTarget(null);
    });

    // Action request (it's my turn)
    network.on(MessageType.REQUEST_ACTION, (message) => {
      const payload = message.payload as { role: string; validTargets: Player[] };
      setClientState(prev => ({
        ...prev,
        isMyTurn: true,
        actionType: payload.role,
        validTargets: payload.validTargets,
        hasSubmittedAction: false,
      }));
    });

    // Vote request
    network.on(MessageType.REQUEST_VOTE, (message) => {
      const payload = message.payload as { validTargets: Player[] };
      setClientState(prev => ({
        ...prev,
        isMyTurn: true,
        validTargets: payload.validTargets,
        hasSubmittedVote: false,
      }));
    });

    // Action received confirmation
    network.on(MessageType.ACTION_RECEIVED, () => {
      setClientState(prev => ({
        ...prev,
        isMyTurn: false,
        hasSubmittedAction: true,
      }));
      setSelectedTarget(null);
    });

    // Vote received confirmation
    network.on(MessageType.VOTE_RECEIVED, () => {
      setClientState(prev => ({
        ...prev,
        isMyTurn: false,
        hasSubmittedVote: true,
      }));
      setSelectedTarget(null);
    });

    // Error messages
    network.on(MessageType.ERROR, (message) => {
      const payload = message.payload as { message: string };
      setErrorMessage(payload.message);
      if (payload.message === 'Connection lost') {
        setClientState(prev => ({ ...prev, connectionStatus: ConnectionStatus.DISCONNECTED }));
      }
    });
  };

  // --------------------------------------------------------------------------
  // RECONNECTION
  // --------------------------------------------------------------------------

  const handleReconnect = async () => {
    setErrorMessage(null);
    await handleJoinGame();
  };

  // --------------------------------------------------------------------------
  // ACTIONS
  // --------------------------------------------------------------------------

  const handleSubmitAction = () => {
    if (!selectedTarget || !networkRef.current) return;

    const actionType = getActionTypeFromRole(clientState.actionType || '');
    
    networkRef.current.send({
      type: MessageType.SUBMIT_ACTION,
      payload: {
        actionType,
        targetId: selectedTarget,
      },
    });
  };

  const handleSubmitVote = () => {
    if (!selectedTarget || !networkRef.current) return;

    networkRef.current.send({
      type: MessageType.SUBMIT_VOTE,
      payload: {
        targetId: selectedTarget,
      },
    });
  };

  const handleSkipAction = () => {
    if (!networkRef.current) return;

    networkRef.current.send({
      type: MessageType.SUBMIT_ACTION,
      payload: {
        actionType: 'skip',
        targetId: null,
      },
    });
  };

  const getActionTypeFromRole = (role: string): string => {
    switch (role) {
      case 'MAFIA_KILL':
      case Role.MAFIA:
      case Role.GODFATHER:
        return 'kill';
      case Role.DOCTOR:
        return 'protect';
      case Role.DETECTIVE:
        return 'investigate';
      case Role.HOOKER:
        return 'roleblock';
      case Role.SILENCER:
        return 'silence';
      default:
        return 'unknown';
    }
  };

  const getActionVerb = (role: string): string => {
    switch (role) {
      case 'MAFIA_KILL':
      case Role.MAFIA:
      case Role.GODFATHER:
        return 'eliminate';
      case Role.DOCTOR:
        return 'protect';
      case Role.DETECTIVE:
        return 'investigate';
      case Role.HOOKER:
        return 'roleblock';
      case Role.SILENCER:
        return 'silence';
      default:
        return 'target';
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      networkRef.current?.disconnect();
    };
  }, []);

  // --------------------------------------------------------------------------
  // RENDER - DISCONNECTED (with reconnect option)
  // --------------------------------------------------------------------------

  if (clientState.connectionStatus === ConnectionStatus.DISCONNECTED && clientState.myRole) {
    // Was in a game but got disconnected - show reconnect UI
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4 flex flex-col items-center justify-center">
        <div className="max-w-md w-full text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold mb-2">Connection Lost</h1>
          <p className="text-gray-400 mb-6">
            You were disconnected from the game. Click below to rejoin.
          </p>
          
          {errorMessage && (
            <div className="bg-red-900/50 border border-red-500 rounded-lg p-3 mb-4 text-red-300">
              {errorMessage}
            </div>
          )}
          
          <button
            onClick={handleReconnect}
            disabled={isJoining}
            className="w-full p-4 rounded-lg font-bold text-lg bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          >
            {isJoining ? 'Reconnecting...' : '🔄 Reconnect to Game'}
          </button>
          
          <p className="text-sm text-gray-500 mt-4">
            Session: {formData.sessionCode} • Your role is safe
          </p>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER - JOIN FORM
  // --------------------------------------------------------------------------

  if (clientState.connectionStatus === ConnectionStatus.DISCONNECTED) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4 flex flex-col items-center justify-center">
        <div className="max-w-md w-full">
          <h1 className="text-3xl font-bold text-center mb-2">🎭 Join Game</h1>
          <p className="text-gray-400 text-center mb-6">Enter the session code shown on the host device</p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Your Name</label>
              <input
                type="text"
                value={formData.playerName}
                onChange={(e) => setFormData(prev => ({ ...prev, playerName: e.target.value }))}
                className="w-full p-3 rounded-lg bg-gray-800 border border-gray-600 focus:border-blue-500 focus:outline-none"
                placeholder="Enter your name"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Session Code</label>
              <input
                type="text"
                value={formData.sessionCode}
                onChange={(e) => setFormData(prev => ({ ...prev, sessionCode: e.target.value.toUpperCase() }))}
                className="w-full p-3 rounded-lg bg-gray-800 border border-gray-600 focus:border-blue-500 focus:outline-none font-mono text-xl tracking-widest text-center"
                placeholder="ABC123"
                maxLength={6}
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Host Address 
                {formData.hostAddress && <span className="text-green-400 ml-2">✓ Auto-detected</span>}
              </label>
              <input
                type="text"
                value={formData.hostAddress}
                onChange={(e) => setFormData(prev => ({ ...prev, hostAddress: e.target.value }))}
                className="w-full p-3 rounded-lg bg-gray-800 border border-gray-600 focus:border-blue-500 focus:outline-none font-mono text-lg"
                placeholder="192.168.1.100"
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.hostAddress 
                  ? 'Auto-filled from your browser URL. Change only if needed.'
                  : 'The IP address shown on the host device'}
              </p>
            </div>

            {errorMessage && (
              <div className="bg-red-900/50 border border-red-500 rounded-lg p-3 text-red-300 text-sm">
                {errorMessage}
              </div>
            )}

            <button
              onClick={handleJoinGame}
              disabled={isJoining}
              className={`w-full py-4 rounded-lg font-bold text-lg transition-all ${
                isJoining 
                  ? 'bg-gray-700 text-gray-400 cursor-wait' 
                  : 'bg-blue-600 hover:bg-blue-500'
              }`}
            >
              {isJoining ? 'Connecting...' : 'Join Game'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER - CONNECTING
  // --------------------------------------------------------------------------

  if (clientState.connectionStatus === ConnectionStatus.CONNECTING) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-xl">Connecting to game...</p>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER - WAITING FOR GAME START
  // --------------------------------------------------------------------------

  if (!clientState.myRole) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">✓</div>
          <h2 className="text-2xl font-bold mb-2">Connected!</h2>
          <p className="text-gray-400">Waiting for the host to start the game...</p>
          <p className="text-sm text-gray-500 mt-4">Player: {formData.playerName}</p>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER - GAME ACTIVE
  // --------------------------------------------------------------------------

  const myPlayer = clientState.players.find(p => p.name === formData.playerName);
  const isAlive = myPlayer?.status !== PlayerStatus.ELIMINATED;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      {/* Header with role */}
      <div className="text-center mb-6">
        <p className="text-sm text-gray-400 mb-1">Your Role</p>
        <div className={`inline-block px-6 py-3 rounded-lg ${getRoleColor(clientState.myRole)} bg-opacity-20`}>
          <span className="text-4xl mr-3">{getRoleEmoji(clientState.myRole)}</span>
          <span className="text-2xl font-bold">{clientState.myRole}</span>
        </div>
        <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
          {getRoleDescription(clientState.myRole)}
        </p>
      </div>

      {/* Phase indicator */}
      <div className="text-center mb-6">
        <div className={`inline-block px-4 py-2 rounded-full ${
          clientState.currentPhase === GamePhase.DAY 
            ? 'bg-yellow-500 text-black' 
            : clientState.currentPhase === GamePhase.NIGHT
            ? 'bg-indigo-900'
            : 'bg-gray-700'
        }`}>
          {clientState.currentPhase === GamePhase.DAY && `☀️ Day ${clientState.dayCount}`}
          {clientState.currentPhase === GamePhase.NIGHT && `🌙 Night ${clientState.dayCount}`}
          {clientState.currentPhase === GamePhase.GAME_OVER && '🏁 Game Over'}
        </div>
      </div>

      {/* Eliminated message */}
      {!isAlive && (
        <div className="bg-red-900/30 rounded-lg p-6 text-center mb-6">
          <p className="text-2xl mb-2">💀</p>
          <p className="text-xl font-bold text-red-400">You have been eliminated</p>
          <p className="text-gray-400 mt-2">Watch the rest of the game unfold...</p>
        </div>
      )}

      {/* Night Action Interface */}
      {clientState.currentPhase === GamePhase.NIGHT && clientState.isMyTurn && isAlive && (
        <div className="bg-indigo-900/50 rounded-lg p-6 mb-6">
          <h3 className="text-xl font-bold mb-4 text-center">
            It&apos;s your turn to {getActionVerb(clientState.actionType || '')}!
          </h3>
          
          <div className="grid gap-3 mb-4">
            {clientState.validTargets.map(target => (
              <button
                key={target.id}
                onClick={() => setSelectedTarget(target.id || null)}
                className={`p-4 rounded-lg text-left transition-all ${
                  selectedTarget === target.id
                    ? 'bg-blue-600 border-2 border-blue-400'
                    : 'bg-gray-800 hover:bg-gray-700 border-2 border-transparent'
                }`}
              >
                <span className="font-medium">{target.name}</span>
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSubmitAction}
              disabled={!selectedTarget}
              className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                selectedTarget 
                  ? 'bg-green-600 hover:bg-green-500' 
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
              }`}
            >
              Confirm
            </button>
            <button
              onClick={handleSkipAction}
              className="px-6 py-3 rounded-lg bg-gray-700 hover:bg-gray-600"
            >
              Skip
            </button>
          </div>
        </div>
      )}

      {/* Waiting message during night */}
      {clientState.currentPhase === GamePhase.NIGHT && !clientState.isMyTurn && isAlive && (
        <div className="bg-gray-800 rounded-lg p-6 text-center">
          {clientState.hasSubmittedAction ? (
            <>
              <p className="text-2xl mb-2">✓</p>
              <p className="text-xl">Action submitted</p>
              <p className="text-gray-400 mt-2">Waiting for other players...</p>
            </>
          ) : (
            <>
              <p className="text-2xl mb-2">😴</p>
              <p className="text-xl">Night time</p>
              <p className="text-gray-400 mt-2">
                {MAFIA_TEAM_ROLES.includes(clientState.myRole!) 
                  ? "Wait for the host to call for the Mafia's action..."
                  : "Close your eyes and wait for your turn..."}
              </p>
            </>
          )}
        </div>
      )}

      {/* Day Phase - Voting */}
      {clientState.currentPhase === GamePhase.DAY && isAlive && (
        <div className="bg-yellow-900/30 rounded-lg p-6 mb-6">
          <h3 className="text-xl font-bold mb-4 text-center">
            {clientState.hasSubmittedVote ? 'Vote submitted!' : 'Cast your vote'}
          </h3>
          
          {!clientState.hasSubmittedVote && (
            <>
              <div className="grid gap-3 mb-4">
                {clientState.players
                  .filter(p => p.status !== PlayerStatus.ELIMINATED && p.name !== formData.playerName)
                  .map(target => (
                    <button
                      key={target.id}
                      onClick={() => setSelectedTarget(target.id || null)}
                      className={`p-4 rounded-lg text-left transition-all ${
                        selectedTarget === target.id
                          ? 'bg-yellow-600 border-2 border-yellow-400'
                          : 'bg-gray-800 hover:bg-gray-700 border-2 border-transparent'
                      }`}
                    >
                      <span className="font-medium">{target.name}</span>
                    </button>
                  ))}
              </div>

              <button
                onClick={handleSubmitVote}
                disabled={!selectedTarget}
                className={`w-full py-3 rounded-lg font-bold transition-all ${
                  selectedTarget 
                    ? 'bg-yellow-600 hover:bg-yellow-500 text-black' 
                    : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                }`}
              >
                Submit Vote
              </button>
            </>
          )}

          {clientState.hasSubmittedVote && (
            <p className="text-center text-gray-400">Waiting for other players to vote...</p>
          )}
        </div>
      )}

      {/* Game Over */}
      {clientState.currentPhase === GamePhase.GAME_OVER && clientState.winner && (
        <div className="text-center">
          <h2 className={`text-4xl font-bold mb-4 ${
            clientState.winner === 'Mafia' ? 'text-red-500' : 
            clientState.winner === 'Town' ? 'text-blue-500' : 'text-yellow-500'
          }`}>
            {clientState.winner} Wins!
          </h2>
          <p className="text-gray-400">
            {clientState.winner === 'Mafia' && MAFIA_TEAM_ROLES.includes(clientState.myRole!) && '🎉 Congratulations!'}
            {clientState.winner === 'Town' && !MAFIA_TEAM_ROLES.includes(clientState.myRole!) && '🎉 Congratulations!'}
          </p>
        </div>
      )}

      {/* Player list (minimal info) */}
      <div className="mt-8">
        <h4 className="text-sm text-gray-400 mb-2">Players</h4>
        <div className="flex flex-wrap gap-2">
          {clientState.players.map(player => (
            <span 
              key={player.id}
              className={`px-3 py-1 rounded-full text-sm ${
                player.status === PlayerStatus.ELIMINATED 
                  ? 'bg-red-900/30 text-red-400 line-through' 
                  : 'bg-gray-800'
              }`}
            >
              {player.name}
              {player.name === formData.playerName && ' (you)'}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
