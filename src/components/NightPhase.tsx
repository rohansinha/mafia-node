/**
 * Night Phase Component - Sequential special role actions
 * 
 * Handles the night phase where special roles perform their actions in order:
 * - Mafia/Godfather: Choose victim to eliminate
 * - Hooker: Roleblock a player (preventing their action)
 * - Detective: Investigate a player's role
 * - Doctor: Protect a player from elimination
 * - Silencer: Silence a player for next day phase
 * 
 * Key features:
 * - Sequential role processing (one role at a time)
 * - Role-specific targeting restrictions
 * - Skip option for roles that don't want to act
 * - Action submission and phase progression
 * 
 * Role restrictions:
 * - Mafia cannot target other Mafia members
 * - Hooker cannot target Godfather or other Hookers
 * - Other roles can target anyone alive
 */
'use client';

import { useState } from 'react';
import { useGame } from '@/context/GameContext';
import { Role, PlayerStatus } from '@/types/game';
import { GameLogger } from '@/lib/logger';

export default function NightPhase() {
  const { gameState, submitNightAction, nextPhase } = useGame();
  
  // Component state for managing night action flow
  const [selectedAction, setSelectedAction] = useState<'kill' | 'protect' | 'investigate' | 'silence' | 'roleblock' | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<string>('');     // Currently selected target
  const [currentRoleIndex, setCurrentRoleIndex] = useState(0);          // Index in the role order
  
  // New state for device passing flow
  const [nightStep, setNightStep] = useState<'eyes-closed' | 'role-turn' | 'action-selection'>('eyes-closed');
  const [showAction, setShowAction] = useState(false);

  const alivePlayers = gameState.players.filter(p => p.status === PlayerStatus.ALIVE);
  
  // Define night role action order (Mafia acts first, then others)
  const roleOrder = [
    Role.MAFIA, 
    Role.GODFATHER, 
    Role.HOOKER, 
    Role.DETECTIVE, 
    Role.DOCTOR, 
    Role.SILENCER
  ];
  
  // Filter to only roles that have living players
  const activeRoles = roleOrder.filter(role => 
    alivePlayers.some(p => p.role === role)
  );

  const currentRole = activeRoles[currentRoleIndex];
  const currentRolePlayers = alivePlayers.filter(p => p.role === currentRole);
  
  /**
   * Get valid targets based on role-specific restrictions
   */
  const getActionTargets = (role: Role) => {
    switch (role) {
      case Role.MAFIA:
      case Role.GODFATHER:
        // Mafia cannot kill other mafia team members (includes Hooker)
        return alivePlayers.filter(p => 
          p.role !== Role.MAFIA && p.role !== Role.GODFATHER && p.role !== Role.HOOKER
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
   */
  const handleCompleteAction = () => {
    if (currentRoleIndex < activeRoles.length - 1) {
      setCurrentRoleIndex(currentRoleIndex + 1);
      setSelectedTarget('');
      setSelectedAction(null);
      setShowAction(false);
      setNightStep('role-turn');
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
      if (selectedTarget && selectedAction && currentRolePlayers[0]) {
        GameLogger.logUserAction('nightAction', currentRolePlayers[0].id, {
          role: currentRole,
          action: selectedAction,
          targetId: selectedTarget,
          dayCount: gameState.dayCount,
          roleIndex: currentRoleIndex
        });

        submitNightAction(currentRolePlayers[0].id, selectedTarget, selectedAction);
        handleCompleteAction();
      }
    } catch (error) {
      GameLogger.logException(error as Error, {
        action: 'handleSubmitAction',
        currentRole,
        selectedAction,
        selectedTarget
      });
    }
  };

  /**
   * Skips the current role's action and progresses to next role
   */
  const handleSkipAction = () => {
    try {
      GameLogger.logUserAction('nightActionSkipped', currentRolePlayers[0]?.id || 'unknown', {
        role: currentRole,
        dayCount: gameState.dayCount,
        roleIndex: currentRoleIndex
      });

      handleCompleteAction();
    } catch (error) {
      GameLogger.logException(error as Error, {
        action: 'handleSkipAction',
        currentRole,
        currentRoleIndex
      });
    }
  };

  // Eyes closed instruction screen - shown at start of night
  if (nightStep === 'eyes-closed') {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 space-y-6">
        <h2 className="text-2xl font-bold text-white text-center">🌙 Night {gameState.dayCount}</h2>
        
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

  // Device passing screen - shown when it's a role's turn
  if (nightStep === 'role-turn' && !showAction) {
    const currentRolePlayer = currentRolePlayers[0];
    
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 space-y-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">🌙 Night Actions</h2>
          <span className="text-white/60 text-sm">
            {currentRoleIndex + 1} of {activeRoles.length}
          </span>
        </div>
        
        <div className="text-center space-y-4">
          <div className="bg-gray-800/60 border border-gray-600 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-200 mb-4">
              {currentRole} Player&apos;s Turn
            </h3>
            <div className="text-2xl font-bold text-purple-300 mb-4">
              {currentRolePlayer?.name}
            </div>
            <p className="text-gray-300 text-sm">
              {currentRolePlayer?.name}, open your eyes and take the device privately.
              <br />Everyone else must keep their eyes closed.
            </p>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={handleShowActionInterface}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-6 rounded-lg transition-colors text-lg"
            >
              I&apos;m {currentRolePlayer?.name} - Show My Action
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

  /**
   * Maps role to its corresponding action type
   */
  const getActionType = (role: Role) => {
    switch (role) {
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
  const getActionDescription = (role: Role) => {
    switch (role) {
      case Role.MAFIA:
        return 'Choose someone to eliminate';
      case Role.GODFATHER:
        return 'Choose someone to eliminate (you are immune to Detective and Hooker)';
      case Role.DOCTOR:
        return 'Choose someone to protect from elimination';
      case Role.DETECTIVE:
        return 'Choose someone to investigate (you will learn their role)';
      case Role.SILENCER:
        return 'Choose someone to silence during tomorrow\'s discussion';
      case Role.HOOKER:
        return 'Choose someone to roleblock (prevent their action)';
      default:
        return 'Choose your target';
    }
  };

  /**
   * Gets role-specific instructions for the player
   */
  const getRoleInstructions = (role: Role) => {
    switch (role) {
      case Role.MAFIA:
        return 'As Mafia, eliminate threats to gain majority voting power.';
      case Role.GODFATHER:
        return 'As Godfather, eliminate threats. You cannot be detected or roleblocked.';
      case Role.DOCTOR:
        return 'As Doctor, save players from elimination. Choose wisely.';
      case Role.DETECTIVE:
        return 'As Detective, learn roles to identify the Mafia team.';
      case Role.SILENCER:
        return 'As Silencer, prevent players from speaking during day discussion.';
      case Role.HOOKER:
        return 'As Hooker, block other players\' night actions.';
      default:
        return 'Use your special ability to help your team win.';
    }
  };

  /**
   * Gets role-specific color styling
   */
  const getRoleColor = (role: Role) => {
    switch (role) {
      case Role.MAFIA:
      case Role.GODFATHER:
      case Role.HOOKER:
        return 'bg-red-600/20 border-red-500';        // Red for Mafia team
      case Role.DETECTIVE:
        return 'bg-blue-600/20 border-blue-500';      // Blue for Detective
      case Role.DOCTOR:
        return 'bg-green-600/20 border-green-500';    // Green for Doctor
      case Role.SILENCER:
        return 'bg-purple-600/20 border-purple-500';  // Purple for Silencer
      default:
        return 'bg-gray-600/20 border-gray-500';      // Gray default
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

}