'use client';

import { useState } from 'react';
import { useGame } from '@/context/GameContext';
import { Role, PlayerStatus } from '@/types/game';

export default function NightPhase() {
  const { gameState, submitNightAction, nextPhase } = useGame();
  const [selectedAction, setSelectedAction] = useState<'kill' | 'protect' | 'investigate' | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const [currentRoleIndex, setCurrentRoleIndex] = useState(0);

  const alivePlayers = gameState.players.filter(p => p.status === PlayerStatus.ALIVE);
  const roleOrder = [Role.MAFIA, Role.DETECTIVE, Role.DOCTOR];
  const activeRoles = roleOrder.filter(role => 
    alivePlayers.some(p => p.role === role)
  );

  const currentRole = activeRoles[currentRoleIndex];
  const currentRolePlayers = alivePlayers.filter(p => p.role === currentRole);
  const actionTargets = alivePlayers.filter(p => 
    currentRole === Role.MAFIA ? p.role !== Role.MAFIA : true
  );

  const handleSubmitAction = () => {
    if (selectedTarget && selectedAction && currentRolePlayers[0]) {
      submitNightAction(currentRolePlayers[0].id, selectedTarget, selectedAction);
      
      if (currentRoleIndex < activeRoles.length - 1) {
        setCurrentRoleIndex(currentRoleIndex + 1);
        setSelectedTarget('');
        setSelectedAction(null);
      } else {
        nextPhase();
      }
    }
  };

  const handleSkipAction = () => {
    if (currentRoleIndex < activeRoles.length - 1) {
      setCurrentRoleIndex(currentRoleIndex + 1);
      setSelectedTarget('');
      setSelectedAction(null);
    } else {
      nextPhase();
    }
  };

  if (!currentRole || currentRolePlayers.length === 0) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 space-y-4">
        <h2 className="text-2xl font-bold text-white text-center">Night Phase</h2>
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

  const getActionType = () => {
    switch (currentRole) {
      case Role.MAFIA:
        return 'kill';
      case Role.DOCTOR:
        return 'protect';
      case Role.DETECTIVE:
        return 'investigate';
      default:
        return null;
    }
  };

  const getActionDescription = () => {
    switch (currentRole) {
      case Role.MAFIA:
        return 'Choose someone to eliminate';
      case Role.DOCTOR:
        return 'Choose someone to protect from the Mafia';
      case Role.DETECTIVE:
        return 'Choose someone to investigate';
      default:
        return '';
    }
  };

  const getRoleColor = () => {
    switch (currentRole) {
      case Role.MAFIA:
        return 'bg-red-600/20 border-red-500';
      case Role.DOCTOR:
        return 'bg-green-600/20 border-green-500';
      case Role.DETECTIVE:
        return 'bg-blue-600/20 border-blue-500';
      default:
        return 'bg-gray-600/20 border-gray-500';
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 space-y-4">
      <h2 className="text-2xl font-bold text-white text-center">🌙 Night Phase</h2>
      
      <div className={`text-center p-4 border rounded-lg ${getRoleColor()}`}>
        <h3 className="text-white text-lg font-semibold mb-2">
          {currentRole} Turn
        </h3>
        <p className="text-white/80">
          Pass the device to: <strong className="text-white">{currentRolePlayers[0]?.name}</strong>
        </p>
      </div>

      {selectedAction ? (
        <div className="space-y-4">
          <p className="text-white/80 text-center">{getActionDescription()}</p>
          
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
                {player.name}
              </button>
            ))}
          </div>

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
        <div className="text-center">
          <p className="text-white/80 mb-4">{getActionDescription()}</p>
          <button
            onClick={() => setSelectedAction(getActionType() as any)}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            Take Action
          </button>
        </div>
      )}
    </div>
  );
}