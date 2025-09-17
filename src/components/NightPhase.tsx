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

export default function NightPhase() {
  const { gameState, submitNightAction, nextPhase } = useGame();
  
  // Component state for managing night action flow
  const [selectedAction, setSelectedAction] = useState<'kill' | 'protect' | 'investigate' | 'silence' | 'roleblock' | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<string>('');     // Currently selected target
  const [currentRoleIndex, setCurrentRoleIndex] = useState(0);          // Index in the role order

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
   * Submits the current role's action and progresses to next role
   */
  const handleSubmitAction = () => {
    if (selectedTarget && selectedAction && currentRolePlayers[0]) {
      submitNightAction(currentRolePlayers[0].id, selectedTarget, selectedAction);
      
      // Move to next role or end night phase
      if (currentRoleIndex < activeRoles.length - 1) {
        setCurrentRoleIndex(currentRoleIndex + 1);
        setSelectedTarget('');
        setSelectedAction(null);
      } else {
        nextPhase();
      }
    }
  };

  /**
   * Skips the current role's action and progresses to next role
   */
  const handleSkipAction = () => {
    if (currentRoleIndex < activeRoles.length - 1) {
      setCurrentRoleIndex(currentRoleIndex + 1);
      setSelectedTarget('');
      setSelectedAction(null);
    } else {
      nextPhase();
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
        return 'Choose someone to eliminate (as Godfather)';
      case Role.DOCTOR:
        return 'Choose someone to protect from attacks';
      case Role.DETECTIVE:
        return 'Choose someone to investigate their role';
      case Role.SILENCER:
        return 'Choose someone to silence during next day phase';
      case Role.HOOKER:
        return 'Choose someone to block their night action';
      default:
        return 'Choose your action';
    }
  };

  /**
   * Gets role-specific color scheme for UI theming
   */
  const getRoleColor = (role: Role) => {
    switch (role) {
      case Role.MAFIA:
      case Role.GODFATHER:
        return 'bg-red-600/20 border-red-500 text-red-200';
      case Role.DOCTOR:
        return 'bg-green-600/20 border-green-500 text-green-200';
      case Role.DETECTIVE:
        return 'bg-blue-600/20 border-blue-500 text-blue-200';
      case Role.SILENCER:
        return 'bg-purple-600/20 border-purple-500 text-purple-200';
      case Role.HOOKER:
        return 'bg-pink-600/20 border-pink-500 text-pink-200';
      default:
        return 'bg-gray-600/20 border-gray-500 text-gray-200';
    }
  };

  /**
   * Gets detailed role instructions for player guidance
   */
  const getRoleInstructions = (role: Role) => {
    switch (role) {
      case Role.MAFIA:
        return 'Work with other Mafia to eliminate town members';
      case Role.GODFATHER:
        return 'You appear innocent to Detective investigations and are immune to Hooker';
      case Role.DOCTOR:
        return 'Protect someone from being killed tonight';
      case Role.DETECTIVE:
        return 'Learn someone\'s role (Godfather appears as Citizen)';
      case Role.SILENCER:
        return 'Prevent someone from speaking during tomorrow\'s discussion';
      case Role.HOOKER:
        return 'Block someone\'s night action (except Godfather)';
      default:
        return '';
    }
  };

  // Main night phase UI with role-specific interface
  return (
    <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 space-y-4">
      <h2 className="text-2xl font-bold text-white text-center">🌙 Night Phase</h2>
      
      {/* Progress indicator showing which roles have acted */}
      <div className="flex justify-center space-x-2 mb-4">
        {activeRoles.map((role, index) => (
          <div
            key={role}
            className={`w-3 h-3 rounded-full ${
              index < currentRoleIndex ? 'bg-green-500' :    // Completed
              index === currentRoleIndex ? 'bg-purple-500' : // Current
              'bg-gray-500'                                   // Pending
            }`}
          />
        ))}
      </div>
      
      <div className={`text-center p-4 border rounded-lg ${getRoleColor(currentRole)}`}>
        <h3 className="text-lg font-semibold mb-2">
          {currentRole} Turn
        </h3>
        <p className="text-sm mb-2">
          Pass the device to: <strong>{currentRolePlayers[0]?.name}</strong>
        </p>
        <p className="text-xs opacity-80">
          {getRoleInstructions(currentRole)}
        </p>
      </div>

      {selectedAction ? (
        <div className="space-y-4">
          <p className="text-white/80 text-center">{getActionDescription(currentRole)}</p>
          
          {actionTargets.length > 0 ? (
            <div className="space-y-2">
              {actionTargets.map((player) => (
                <button
                  key={player.id}
                  onClick={() => setSelectedTarget(player.id)}
                  className={`w-full p-3 rounded-lg border-2 transition-colors ${
                    selectedTarget === player.id
                      ? 'border-purple-500 bg-purple-600/30 text-white'
                      : 'border-white/30 bg-white/5 text-white/80 hover:bg-white/10'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span>{player.name}</span>
                    <span className="text-xs opacity-70">{player.role}</span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-white/60 text-center">No valid targets available</p>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleSkipAction}
              className="flex-1 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Skip Action
            </button>
            <button
              onClick={handleSubmitAction}
              disabled={!selectedTarget}
              className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              Confirm Action
            </button>
          </div>
        </div>
      ) : (
        // Initial action selection screen - player decides whether to act
        <div className="text-center">
          <p className="text-white/80 mb-4">{getActionDescription(currentRole)}</p>
          <div className="space-y-2">
            <button
              onClick={() => setSelectedAction(getActionType(currentRole) as any)}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              Take Action
            </button>
            <div>
              <button
                onClick={handleSkipAction}
                className="text-white/60 hover:text-white/80 text-sm underline"
              >
                Skip this role
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Progress summary showing remaining roles */}
      <div className="bg-white/5 rounded-lg p-3">
        <div className="text-white/70 text-xs">
          <p>Progress: {currentRoleIndex + 1} of {activeRoles.length} roles</p>
          <p>Remaining: {activeRoles.slice(currentRoleIndex + 1).join(', ') || 'None'}</p>
        </div>
      </div>
    </div>
  );
}