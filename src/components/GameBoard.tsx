/**
 * Game Board Component - Main game coordinator and display
 * 
 * Handles routing between different game phases and modes:
 * - MODE_SELECTION: Shows GameModeSelection component
 * - LOCAL_MULTIPLAYER: Shows LocalMultiplayerHost (on localhost) or LocalMultiplayerClient (remote)
 * - Online mode: Shows OnlinePlay placeholder
 * - GAME_OVER: Shows GameOver results
 * - DAY/NIGHT phases: Shows game interface with player status
 * 
 * Displays current game status, player information, and phase content.
 * Provides reset functionality and live game statistics.
 */
'use client';

import { useState, useEffect } from 'react';
import { useGame } from '@/context/GameContext';
import { GamePhase, PlayerStatus, GameMode } from '@/types/game';
import GameModeSelection from '@/components/GameModeSelection';
import OnlinePlay from '@/components/OnlinePlay';
import LocalMultiplayerHost from '@/components/LocalMultiplayerHost';
import LocalMultiplayerClient from '@/components/LocalMultiplayerClient';
import DayPhase from '@/components/DayPhase';
import NightPhase from '@/components/NightPhase';
import GameOver from '@/components/GameOver';

export default function GameBoard() {
  const { gameState, resetGame } = useGame();
  // Use state to avoid hydration mismatch - check host status only on client
  const [isHost, setIsHost] = useState<boolean | null>(null);

  useEffect(() => {
    const hostname = window.location.hostname;
    setIsHost(hostname === 'localhost' || hostname === '127.0.0.1');
  }, []);

  // Route to mode selection if no mode chosen yet
  if (gameState.currentPhase === GamePhase.MODE_SELECTION) {
    return <GameModeSelection />;
  }

  // Route to online placeholder if online mode selected
  if (gameState.gameMode === GameMode.ONLINE) {
    return <OnlinePlay />;
  }

  // Route to local multiplayer - host device gets host screen, others get join screen
  // Show loading state while determining host status
  if (gameState.gameMode === GameMode.LOCAL_MULTIPLAYER) {
    if (isHost === null) {
      return (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="text-white/70">Loading...</div>
        </div>
      );
    }
    if (isHost) {
      return <LocalMultiplayerHost />;
    }
    return <LocalMultiplayerClient />;
  }

  // Route to game over screen when game ends
  if (gameState.currentPhase === GamePhase.GAME_OVER) {
    return <GameOver />;
  }

  // Filter for alive players to display current game status
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
          {/* Display all players with color-coded status indicators */}
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

      {/* Phase-specific content - routes to appropriate component */}
      {gameState.currentPhase === GamePhase.DAY ? (
        <DayPhase />
      ) : (
        <NightPhase />
      )}
    </div>
  );
}