'use client';

import { useGame } from '@/context/GameContext';
import { GamePhase, PlayerStatus } from '@/types/game';
import DayPhase from '@/components/DayPhase';
import NightPhase from '@/components/NightPhase';
import GameOver from '@/components/GameOver';

export default function GameBoard() {
  const { gameState, resetGame } = useGame();

  if (gameState.currentPhase === GamePhase.GAME_OVER) {
    return <GameOver />;
  }

  const alivePlayers = gameState.players.filter(p => p.status === PlayerStatus.ALIVE);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-md rounded-lg p-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white">
              {gameState.currentPhase === GamePhase.DAY ? '☀️ Day' : '🌙 Night'} {gameState.dayCount}
            </h2>
            <p className="text-white/70">
              {alivePlayers.length} players alive
            </p>
          </div>
          <button
            onClick={resetGame}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm"
          >
            Reset Game
          </button>
        </div>
      </div>

      {/* Player Status */}
      <div className="bg-white/10 backdrop-blur-md rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-3">Player Status</h3>
        <div className="grid grid-cols-2 gap-2">
          {gameState.players.map((player) => (
            <div
              key={player.id}
              className={`p-2 rounded-lg text-center text-sm ${
                player.status === PlayerStatus.ALIVE
                  ? 'bg-green-600/20 border border-green-500/30 text-green-200'
                  : 'bg-red-600/20 border border-red-500/30 text-red-200'
              }`}
            >
              <div className="font-medium">{player.name}</div>
              <div className="text-xs opacity-75">
                {player.status === PlayerStatus.ALIVE ? 'Alive' : 'Eliminated'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Phase Content */}
      {gameState.currentPhase === GamePhase.DAY ? (
        <DayPhase />
      ) : (
        <NightPhase />
      )}
    </div>
  );
}