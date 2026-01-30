/**
 * Night Phase Component - Sequential special role actions
 * 
 * Handles the night phase where special roles perform their actions in order:
 * - Mafia Team (all together): Choose victim to eliminate collaboratively
 * - Hooker: Roleblock a player (preventing their action)
 * - Detective: Investigate a player's role
 * - Doctor: Protect a player from elimination
 * - Silencer: Silence a player for next day phase
 * 
 * Key features:
 * - Mafia team wakes up together and agrees on target
 * - Sequential role processing for other roles (one role at a time)
 * - Uses role names (not player names) when calling turns
 * - Role-specific targeting restrictions
 * - Skip option for roles that don't want to act
 * - Action submission and phase progression
 * 
 * Role restrictions:
 * - Mafia/Godfather can target all non-mafia players (including Hooker)
 * - Hooker cannot target Godfather (immune) or other Hookers
 * - Other roles can target anyone alive
 */
'use client';

import { useState, useEffect, useRef } from 'react';
import { useGame } from '@/context/GameContext';
import { Role, PlayerStatus } from '@/types/game';
import { GameLogger } from '@/lib/logger';
import { MAFIA_TEAM_ROLES } from '@/constants/roles';
import { useSpeech } from '@/hooks/useSpeech';
import { gameConfig } from '@/config/configManager';

// Get the night turn transition delay from config (default 5 seconds)
const NIGHT_TURN_DELAY = gameConfig.timing.nightTurnTransitionDelay || 5000;

export default function NightPhase() {
  const { gameState, submitNightAction, nextPhase } = useGame();
  const speech = useSpeech();
  
  // Component state for managing night action flow
  const [selectedTarget, setSelectedTarget] = useState<string>('');     // Currently selected target
  const [currentRoleIndex, setCurrentRoleIndex] = useState(0);          // Index in the role order
  
  // State for device passing flow
  const [nightStep, setNightStep] = useState<'eyes-closed' | 'transition' | 'role-turn' | 'action-selection'>('eyes-closed');
  const [showAction, setShowAction] = useState(false);
  const [transitionCountdown, setTransitionCountdown] = useState(0);    // Countdown in seconds
  
  // Track if we've announced the current role (to avoid repeated announcements)
  const announcedRoleIndex = useRef(-1);
  const hasAnnouncedNightOpening = useRef(false);

  const alivePlayers = gameState.players.filter(p => p.status === PlayerStatus.ALIVE);
  
  // Get all alive mafia team members (for collaborative kill)
  const aliveMafiaTeam = alivePlayers.filter(p => MAFIA_TEAM_ROLES.includes(p.role));
  
  // Define night role action order
  // Mafia team acts first (together), then individual roles
  // We use 'MAFIA_TEAM' as a special marker for combined mafia action
  const roleOrder: (Role | 'MAFIA_TEAM')[] = [
    'MAFIA_TEAM',  // All mafia wake up together
    Role.HOOKER, 
    Role.DETECTIVE, 
    Role.DOCTOR, 
    Role.SILENCER
  ];
  
  // Filter to only roles that have living players
  const activeRoles = roleOrder.filter(role => {
    if (role === 'MAFIA_TEAM') {
      // Include if any mafia team member is alive (excluding Hooker who acts separately)
      return alivePlayers.some(p => p.role === Role.MAFIA || p.role === Role.GODFATHER);
    }
    return alivePlayers.some(p => p.role === role);
  });

  const currentRole = activeRoles[currentRoleIndex];
  
  // Get players for current role
  const currentRolePlayers = currentRole === 'MAFIA_TEAM'
    ? alivePlayers.filter(p => p.role === Role.MAFIA || p.role === Role.GODFATHER)
    : alivePlayers.filter(p => p.role === currentRole);
    
  // Speech announcement effect - announce when entering role-turn for a NEW role
  useEffect(() => {
    if (nightStep === 'role-turn' && currentRole && announcedRoleIndex.current !== currentRoleIndex) {
      announcedRoleIndex.current = currentRoleIndex;
      const roleName = currentRole === 'MAFIA_TEAM' ? 'MAFIA_TEAM' : String(currentRole);
      speech.announceRoleTurn(roleName);
    }
  }, [nightStep, currentRole, currentRoleIndex, speech]);
  
  // Transition countdown effect - wait before showing next role turn
  useEffect(() => {
    if (nightStep === 'transition' && transitionCountdown > 0) {
      const timer = setTimeout(() => {
        setTransitionCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (nightStep === 'transition' && transitionCountdown === 0) {
      // Transition complete, move to role turn
      setNightStep('role-turn');
    }
  }, [nightStep, transitionCountdown]);
  
  // Announce night opening when entering eyes-closed phase
  useEffect(() => {
    if (nightStep === 'eyes-closed' && !hasAnnouncedNightOpening.current) {
      hasAnnouncedNightOpening.current = true;
      speech.announceNightOpening(gameState.dayCount);
    }
  }, [nightStep, gameState.dayCount, speech]);
  
  // Cleanup speech on unmount
  useEffect(() => {
    return () => {
      speech.stop();
    };
  }, [speech]);
  
  /**
   * Get valid targets based on role-specific restrictions
   * Mafia/Godfather can target all non-mafia players (including Hooker)
   */
  const getActionTargets = (role: Role | 'MAFIA_TEAM') => {
    switch (role) {
      case 'MAFIA_TEAM':
      case Role.MAFIA:
      case Role.GODFATHER:
        // Mafia can target all non-mafia players (including Hooker)
        return alivePlayers.filter(p => 
          p.role !== Role.MAFIA && p.role !== Role.GODFATHER
        );
      case Role.HOOKER:
        // Hooker can roleblock anyone except Godfather (immune) and other Hookers
        return alivePlayers.filter(p => 
          p.role !== Role.HOOKER && p.role !== Role.GODFATHER
        );
      case Role.DETECTIVE:
      case Role.DOCTOR:
      case Role.SILENCER:
        // These roles can target anyone alive
        return alivePlayers;
      default:
        return alivePlayers;
    }
  };

  const actionTargets = getActionTargets(currentRole);

  /**
   * Starts the night phase by showing eyes closed instruction
   */
  const handleStartNightActions = () => {
    setNightStep('role-turn');
  };

  /**
   * Reveals the action interface for the current role
   */
  const handleShowActionInterface = () => {
    setShowAction(true);
    setNightStep('action-selection');
  };

  /**
   * Handles completing an action and moving to next role or ending night
   * Includes a transition delay to allow players to put the phone down
   */
  const handleCompleteAction = () => {
    if (currentRoleIndex < activeRoles.length - 1) {
      // Move to next role with transition delay
      setCurrentRoleIndex(currentRoleIndex + 1);
      setSelectedTarget('');
      setShowAction(false);
      // Start transition countdown (in seconds)
      setTransitionCountdown(Math.ceil(NIGHT_TURN_DELAY / 1000));
      setNightStep('transition');
    } else {
      GameLogger.logGameEvent('NightPhaseComplete', {
        actionsCompleted: currentRoleIndex + 1,
        dayCount: gameState.dayCount
      });
      nextPhase();
    }
  };

  /**
   * Submits the current role's action and progresses to next role
   */
  const handleSubmitAction = () => {
    try {
      const actionType = getActionTypeForRole(currentRole);
      // For mafia team, use the first alive mafia member as the actor
      const actingPlayer = currentRolePlayers[0];
      
      if (selectedTarget && actionType && actingPlayer) {
        GameLogger.logUserAction('nightAction', actingPlayer.id, {
          role: currentRole === 'MAFIA_TEAM' ? 'Mafia Team' : currentRole,
          action: actionType,
          targetId: selectedTarget,
          dayCount: gameState.dayCount,
          roleIndex: currentRoleIndex
        });

        submitNightAction(actingPlayer.id, selectedTarget, actionType);
        handleCompleteAction();
      }
    } catch (error) {
      GameLogger.logException(error as Error, {
        action: 'handleSubmitAction',
        currentRole: currentRole === 'MAFIA_TEAM' ? 'Mafia Team' : currentRole,
        selectedTarget
      });
    }
  };

  /**
   * Helper to get action type for a role
   */
  const getActionTypeForRole = (role: Role | 'MAFIA_TEAM'): 'kill' | 'protect' | 'investigate' | 'silence' | 'roleblock' | null => {
    switch (role) {
      case 'MAFIA_TEAM':
      case Role.MAFIA:
      case Role.GODFATHER:
        return 'kill';
      case Role.DOCTOR:
        return 'protect';
      case Role.DETECTIVE:
        return 'investigate';
      case Role.SILENCER:
        return 'silence';
      case Role.HOOKER:
        return 'roleblock';
      default:
        return null;
    }
  };

  /**
   * Skips the current role's action and progresses to next role
   */
  const handleSkipAction = () => {
    try {
      GameLogger.logUserAction('nightActionSkipped', currentRolePlayers[0]?.id || 'unknown', {
        role: currentRole === 'MAFIA_TEAM' ? 'Mafia Team' : currentRole,
        dayCount: gameState.dayCount,
        roleIndex: currentRoleIndex
      });

      handleCompleteAction();
    } catch (error) {
      GameLogger.logException(error as Error, {
        action: 'handleSkipAction',
        currentRole: currentRole === 'MAFIA_TEAM' ? 'Mafia Team' : currentRole,
        currentRoleIndex
      });
    }
  };

  // Eyes closed instruction screen - shown at start of night
  if (nightStep === 'eyes-closed') {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">🌙 Night {gameState.dayCount}</h2>
          {/* Speech toggle button */}
          <button
            onClick={speech.toggleSpeech}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              speech.isEnabled 
                ? 'bg-green-600/30 border border-green-500 text-green-200' 
                : 'bg-gray-600/30 border border-gray-500 text-gray-300'
            }`}
            title={speech.isEnabled ? 'Disable voice announcements' : 'Enable voice announcements'}
          >
            {speech.isEnabled ? '🔊' : '🔇'} Voice {speech.isEnabled ? 'On' : 'Off'}
          </button>
        </div>
        
        <div className="text-center space-y-4">
          <div className="bg-blue-800/40 border border-blue-600 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-blue-200 mb-4">
              👁️‍🗨️ Everyone Close Your Eyes
            </h3>
            <p className="text-blue-300 text-lg">
              All players must close their eyes and keep them closed until instructed otherwise.
            </p>
            <p className="text-blue-400 text-sm mt-3">
              The night phase is about to begin. Special roles will be called one by one.
            </p>
            {speech.isEnabled && (
              <div className="mt-4 space-y-2">
                <p className="text-green-300 text-xs">
                  🔊 Voice announcements enabled - roles will be called out loud
                </p>
                {/* Test speech button */}
                <button
                  onClick={speech.testSpeech}
                  disabled={speech.isSpeaking}
                  className="px-4 py-2 bg-green-600/30 border border-green-500 text-green-200 rounded-lg text-sm hover:bg-green-600/50 transition-colors disabled:opacity-50"
                >
                  {speech.isSpeaking ? '🔊 Speaking...' : '🎤 Test Voice'}
                </button>
                {!speech.isReady && (
                  <p className="text-yellow-300 text-xs">⏳ Loading voices...</p>
                )}
              </div>
            )}
          </div>
          
          <div className="bg-purple-600/20 border border-purple-500 rounded-lg p-4">
            <p className="text-purple-200 text-sm">
              <strong>Night Roles Active:</strong> {activeRoles.length > 0 ? activeRoles.join(', ') : 'None'}
            </p>
          </div>
        </div>
        
        <button
          onClick={handleStartNightActions}
          className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-4 px-6 rounded-lg transition-colors text-lg"
        >
          Begin Night Actions
        </button>
      </div>
    );
  }

  // Transition screen - countdown between role turns
  if (nightStep === 'transition') {
    const nextRole = activeRoles[currentRoleIndex];
    const nextRoleName = nextRole === 'MAFIA_TEAM' ? 'Mafia Team' : nextRole;
    
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 space-y-6">
        <h2 className="text-2xl font-bold text-white text-center">🌙 Night {gameState.dayCount}</h2>
        
        <div className="text-center space-y-6">
          <div className="bg-yellow-800/40 border border-yellow-600 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-yellow-200 mb-4">
              👁️‍🗨️ Everyone Close Your Eyes
            </h3>
            <p className="text-yellow-300 text-lg mb-4">
              Place the phone down and close your eyes.
            </p>
            <p className="text-yellow-400 text-sm">
              The next role will be called in...
            </p>
          </div>
          
          {/* Countdown display */}
          <div className="flex flex-col items-center">
            <div className="text-6xl font-bold text-yellow-300 mb-2">
              {transitionCountdown}
            </div>
            <p className="text-white/60 text-sm">seconds</p>
          </div>
          
          <div className="bg-purple-600/20 border border-purple-500 rounded-lg p-4">
            <p className="text-purple-200 text-sm">
              <strong>Next:</strong> {nextRoleName}
            </p>
          </div>
          
          {/* Skip button for impatient users */}
          <button
            onClick={() => setNightStep('role-turn')}
            className="px-6 py-2 bg-gray-600/50 hover:bg-gray-600 text-white/70 rounded-lg transition-colors text-sm"
          >
            Skip Wait
          </button>
        </div>
        
        {/* Progress indicator */}
        <div className="mt-4">
          <div className="flex justify-between text-white/60 text-xs mb-2">
            <span>Night Progress</span>
            <span>{currentRoleIndex + 1} / {activeRoles.length}</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2">
            <div 
              className="bg-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentRoleIndex) / activeRoles.length) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>
    );
  }

  // Device passing screen - shown when it's a role's turn
  if (nightStep === 'role-turn' && !showAction) {
    const isMafiaTeam = currentRole === 'MAFIA_TEAM';
    const displayRoleName = isMafiaTeam ? 'Mafia Team' : currentRole;
    
    // Get role names for display (e.g., "Godfather and Mafia")
    const getMafiaTeamDisplay = () => {
      const roles = currentRolePlayers.map(p => p.role);
      const uniqueRoles = Array.from(new Set(roles));
      return uniqueRoles.join(' and ');
    };
    
    // Replay the voice announcement for current role
    const handleReplayAnnouncement = () => {
      const roleName = currentRole === 'MAFIA_TEAM' ? 'MAFIA_TEAM' : String(currentRole);
      speech.announceRoleTurn(roleName);
    };
    
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 space-y-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">🌙 Night Actions</h2>
          <div className="flex items-center gap-2">
            {/* Replay announcement button */}
            {speech.isEnabled && (
              <button
                onClick={handleReplayAnnouncement}
                disabled={speech.isSpeaking}
                className="flex items-center gap-1 px-2 py-1 rounded bg-purple-600/30 border border-purple-500 text-purple-200 text-xs hover:bg-purple-600/50 transition-colors disabled:opacity-50"
                title="Replay voice announcement"
              >
                {speech.isSpeaking ? '🔊' : '🔁'} {speech.isSpeaking ? 'Speaking...' : 'Replay'}
              </button>
            )}
            <span className="text-white/60 text-sm">
              {currentRoleIndex + 1} of {activeRoles.length}
            </span>
          </div>
        </div>
        
        <div className="text-center space-y-4">
          <div className="bg-gray-800/60 border border-gray-600 rounded-lg p-6">
            {isMafiaTeam ? (
              <>
                <h3 className="text-lg font-semibold text-red-300 mb-4">
                  🔪 Mafia Team&apos;s Turn
                </h3>
                <div className="text-xl font-bold text-red-200 mb-4">
                  {getMafiaTeamDisplay()}
                </div>
                <p className="text-gray-300 text-sm">
                  Mafia team, open your eyes and look at each other.
                  <br />Agree on which player to eliminate tonight.
                  <br />One of you will then select the target on the device.
                </p>
                <div className="mt-4 bg-red-900/30 rounded-lg p-3">
                  <p className="text-red-200 text-xs">
                    <strong>Mafia members:</strong> {currentRolePlayers.map(p => `${p.role}`).join(', ')}
                  </p>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-gray-200 mb-4">
                  {displayRoleName}&apos;s Turn
                </h3>
                <p className="text-gray-300 text-sm">
                  {displayRoleName}, open your eyes and take the device privately.
                  <br />Everyone else must keep their eyes closed.
                </p>
              </>
            )}
          </div>
          
          <div className="space-y-3">
            <button
              onClick={handleShowActionInterface}
              className={`w-full font-bold py-4 px-6 rounded-lg transition-colors text-lg ${
                isMafiaTeam 
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
            >
              {isMafiaTeam ? "We're the Mafia - Show Our Action" : `I'm the ${displayRoleName} - Show My Action`}
            </button>
            
            <button
              onClick={handleSkipAction}
              className="w-full py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm"
            >
              Skip Action (No Target)
            </button>
          </div>
        </div>
        
        {/* Progress indicator */}
        <div className="mt-6">
          <div className="flex justify-between text-white/60 text-xs mb-2">
            <span>Night Progress</span>
            <span>{currentRoleIndex + 1} / {activeRoles.length}</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2">
            <div 
              className="bg-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentRoleIndex + 1) / activeRoles.length) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>
    );
  }

  /**
   * Maps role to its corresponding action type
   */
  const getActionType = (role: Role | 'MAFIA_TEAM'): 'kill' | 'protect' | 'investigate' | 'silence' | 'roleblock' | null => {
    switch (role) {
      case 'MAFIA_TEAM':
      case Role.MAFIA:
      case Role.GODFATHER:
        return 'kill';
      case Role.DOCTOR:
        return 'protect';
      case Role.DETECTIVE:
        return 'investigate';
      case Role.SILENCER:
        return 'silence';
      case Role.HOOKER:
        return 'roleblock';
      default:
        return null;
    }
  };

  /**
   * Gets user-friendly action description for each role
   */
  const getActionDescription = (role: Role | 'MAFIA_TEAM'): string => {
    switch (role) {
      case 'MAFIA_TEAM':
        return 'Choose someone to eliminate together as a team';
      case Role.MAFIA:
        return 'Choose someone to eliminate';
      case Role.GODFATHER:
        return 'Choose someone to eliminate (you are immune to Detective and Hooker)';
      case Role.DOCTOR:
        return 'Choose someone to protect from elimination';
      case Role.DETECTIVE:
        return 'Choose someone to investigate (you will learn their role)';
      case Role.SILENCER:
        return "Choose someone to silence during tomorrow's discussion";
      case Role.HOOKER:
        return 'Choose someone to roleblock (prevent their action)';
      default:
        return 'Choose your target';
    }
  };

  /**
   * Gets role-specific color styling
   */
  const getRoleColor = (role: Role | 'MAFIA_TEAM'): string => {
    switch (role) {
      case 'MAFIA_TEAM':
      case Role.MAFIA:
      case Role.GODFATHER:
      case Role.HOOKER:
        return 'bg-red-600/20 border-red-500';
      case Role.DETECTIVE:
        return 'bg-blue-600/20 border-blue-500';
      case Role.DOCTOR:
        return 'bg-green-600/20 border-green-500';
      case Role.SILENCER:
        return 'bg-purple-600/20 border-purple-500';
      default:
        return 'bg-gray-600/20 border-gray-500';
    }
  };

  // Handle case where no night roles are alive
  if (!currentRole || currentRolePlayers.length === 0) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 space-y-4">
        <h2 className="text-2xl font-bold text-white text-center">🌙 Night Phase</h2>
        <p className="text-white/80 text-center">No active night roles. Moving to day phase...</p>
        <button
          onClick={nextPhase}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg transition-colors"
        >
          Continue to Day Phase
        </button>
      </div>
    );
  }

  const actionType = getActionType(currentRole);
  const isMafiaTeam = currentRole === 'MAFIA_TEAM';
  const displayRoleName = isMafiaTeam ? 'Mafia Team' : currentRole;

  // Action selection screen - main night action interface
  return (
    <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-white">🌙 {displayRoleName}&apos;s Action</h2>
        <span className="text-white/60 text-sm">
          {currentRoleIndex + 1} of {activeRoles.length}
        </span>
      </div>

      {/* Role info panel */}
      <div className={`p-4 rounded-lg border ${getRoleColor(currentRole)}`}>
        <h3 className="text-white font-semibold mb-2">
          {isMafiaTeam ? `Mafia Team (${currentRolePlayers.map(p => p.role).join(', ')})` : displayRoleName}
        </h3>
        <p className="text-white/80 text-sm">{getActionDescription(currentRole)}</p>
      </div>

      {/* Target selection */}
      <div className="space-y-2">
        <p className="text-white/70 text-sm">Select your target:</p>
        {actionTargets.map((target) => (
          <button
            key={target.id}
            onClick={() => setSelectedTarget(target.id)}
            className={`w-full p-3 rounded-lg border-2 transition-colors text-left ${
              selectedTarget === target.id
                ? 'border-purple-500 bg-purple-600/30 text-white'
                : 'border-white/30 bg-white/5 text-white/80 hover:bg-white/10'
            }`}
          >
            {target.name}
          </button>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 pt-4">
        <button
          onClick={() => {
            setShowAction(false);
            setNightStep('role-turn');
          }}
          className="flex-1 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleSkipAction}
          className="flex-1 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
        >
          Skip
        </button>
        <button
          onClick={() => actionType && handleSubmitAction()}
          disabled={!selectedTarget || !actionType}
          className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
        >
          Confirm
        </button>
      </div>

      {/* Progress bar */}
      <div className="mt-4">
        <div className="flex justify-between text-white/60 text-xs mb-2">
          <span>Night Progress</span>
          <span>{currentRoleIndex + 1} / {activeRoles.length}</span>
        </div>
        <div className="w-full bg-white/20 rounded-full h-2">
          <div
            className="bg-purple-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentRoleIndex + 1) / activeRoles.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}