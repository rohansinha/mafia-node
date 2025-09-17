'use client';

import { useGame } from '@/context/GameContext';
import { Role } from '@/types/game';

export default function GameOver() {
  const { gameState, resetGame } = useGame();

  const getMafiaPlayers = () => {
    return gameState.players.filter(p => 
      p.role === Role.MAFIA || p.role === Role.GODFATHER || p.role === Role.HOOKER
    );
  };

  const getTownPlayers = () => {
    return gameState.players.filter(p => 
      p.role === Role.CITIZEN || p.role === Role.DETECTIVE || 
      p.role === Role.DOCTOR || p.role === Role.SILENCER || 
      p.role === Role.KAMIKAZE
    );
  };

  const getJokerPlayer = () => {
    return gameState.players.find(p => p.role === Role.JOKER);
  };

  const getWinnerEmoji = () => {
    switch (gameState.winner) {
      case 'Mafia':
        return '🔪';
      case 'Joker':
        return '�';
      default:
        return '�🎉';
    }
  };

  const getWinnerColor = () => {
    switch (gameState.winner) {
      case 'Mafia':
        return 'bg-red-600/20 border-red-500 text-red-200';
      case 'Joker':
        return 'bg-yellow-600/20 border-yellow-500 text-yellow-200';
      default:
        return 'bg-green-600/20 border-green-500 text-green-200';
    }
  };

  const getWinnerDescription = () => {
    switch (gameState.winner) {
      case 'Mafia':
        return 'The Mafia has successfully eliminated enough townspeople to take control!';
      case 'Joker':
        return 'The Joker has achieved their goal and won the game!';
      default:
        return 'The town has successfully identified and eliminated all threats!';
    }
  };

  const getRoleColor = (role: Role) => {
    switch (role) {
      case Role.MAFIA:
      case Role.GODFATHER:
        return 'bg-red-600/20 border-red-500/30 text-red-200';
      case Role.DETECTIVE:
        return 'bg-blue-600/20 border-blue-500/30 text-blue-200';
      case Role.DOCTOR:
        return 'bg-green-600/20 border-green-500/30 text-green-200';
      case Role.SILENCER:
        return 'bg-purple-600/20 border-purple-500/30 text-purple-200';
      case Role.KAMIKAZE:
        return 'bg-orange-600/20 border-orange-500/30 text-orange-200';
      case Role.JOKER:
        return 'bg-yellow-600/20 border-yellow-500/30 text-yellow-200';
      case Role.HOOKER:
        return 'bg-pink-600/20 border-pink-500/30 text-pink-200';
      default:
        return 'bg-gray-600/20 border-gray-500/30 text-gray-200';
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 space-y-6">
      <h1 className="text-3xl font-bold text-white text-center">
        {getWinnerEmoji()} Game Over {getWinnerEmoji()}
      </h1>

      <div className={`text-center p-6 border-2 rounded-lg ${getWinnerColor()}`}>
        <h2 className="text-2xl font-bold mb-2">
          {gameState.winner} Win{gameState.winner === 'Joker' ? 's' : ''}!
        </h2>
        <p className="text-lg">
          {getWinnerDescription()}
        </p>
      </div>

      {/* Team breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Mafia Team */}
        <div className="bg-red-600/10 border border-red-500/30 rounded-lg p-4">
          <h4 className="text-red-300 font-semibold mb-2">🔪 Mafia Team</h4>
          <div className="space-y-1 text-sm">
            {getMafiaPlayers().map(player => (
              <div key={player.id} className="flex justify-between">
                <span className="text-red-200">{player.name}</span>
                <span className="text-red-300">{player.role}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Town Team */}
        <div className="bg-blue-600/10 border border-blue-500/30 rounded-lg p-4">
          <h4 className="text-blue-300 font-semibold mb-2">🏛️ Town Team</h4>
          <div className="space-y-1 text-sm">
            {getTownPlayers().map(player => (
              <div key={player.id} className="flex justify-between">
                <span className="text-blue-200">{player.name}</span>
                <span className="text-blue-300">{player.role}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Independent */}
        {getJokerPlayer() && (
          <div className="bg-yellow-600/10 border border-yellow-500/30 rounded-lg p-4">
            <h4 className="text-yellow-300 font-semibold mb-2">🃏 Independent</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-yellow-200">{getJokerPlayer()?.name}</span>
                <span className="text-yellow-300">{getJokerPlayer()?.role}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-white text-center">Final Roles</h3>
        <div className="grid grid-cols-1 gap-2">
          {gameState.players.map((player) => (
            <div
              key={player.id}
              className={`p-3 rounded-lg border flex justify-between items-center ${getRoleColor(player.role)}`}
            >
              <div>
                <span className="font-medium">{player.name}</span>
                <span className="ml-2 text-sm opacity-75">
                  ({player.status === 'Alive' ? '✅ Survived' : '💀 Eliminated'})
                </span>
              </div>
              <span className="font-bold">{player.role}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-center text-white/70">
          <p>Game lasted {gameState.dayCount} day{gameState.dayCount !== 1 ? 's' : ''}</p>
          <p>Assignment mode: {gameState.assignmentMode || 'Recommended'}</p>
          {getMafiaPlayers().length > 0 && (
            <p className="mt-1">
              Mafia members: {getMafiaPlayers().map(p => p.name).join(', ')}
            </p>
          )}
        </div>

        <button
          onClick={resetGame}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg transition-colors"
        >
          Play Again
        </button>
      </div>
    </div>
  );
}