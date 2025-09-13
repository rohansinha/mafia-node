'use client';

import { useGame } from '@/context/GameContext';
import { Role } from '@/types/game';

export default function GameOver() {
  const { gameState, resetGame } = useGame();

  const getMafiaPlayers = () => {
    return gameState.players.filter(p => p.role === Role.MAFIA);
  };

  const getWinnerEmoji = () => {
    return gameState.winner === 'Mafia' ? '🔪' : '🎉';
  };

  const getWinnerColor = () => {
    return gameState.winner === 'Mafia' 
      ? 'bg-red-600/20 border-red-500 text-red-200'
      : 'bg-green-600/20 border-green-500 text-green-200';
  };

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 space-y-6">
      <h1 className="text-3xl font-bold text-white text-center">
        {getWinnerEmoji()} Game Over {getWinnerEmoji()}
      </h1>

      <div className={`text-center p-6 border-2 rounded-lg ${getWinnerColor()}`}>
        <h2 className="text-2xl font-bold mb-2">
          {gameState.winner} Wins!
        </h2>
        {gameState.winner === 'Mafia' ? (
          <p className="text-lg">
            The Mafia has successfully eliminated enough townspeople to take control!
          </p>
        ) : (
          <p className="text-lg">
            The town has successfully identified and eliminated all the Mafia!
          </p>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-white text-center">Final Roles</h3>
        <div className="grid grid-cols-1 gap-2">
          {gameState.players.map((player) => (
            <div
              key={player.id}
              className={`p-3 rounded-lg border flex justify-between items-center ${
                player.role === Role.MAFIA
                  ? 'bg-red-600/20 border-red-500/30 text-red-200'
                  : player.role === Role.DETECTIVE
                  ? 'bg-blue-600/20 border-blue-500/30 text-blue-200'
                  : player.role === Role.DOCTOR
                  ? 'bg-green-600/20 border-green-500/30 text-green-200'
                  : 'bg-gray-600/20 border-gray-500/30 text-gray-200'
              }`}
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