/**
 * Main application page that serves as the entry point for the Mafia game.
 * Handles the top-level routing between Setup Phase (for offline mode) and GameBoard.
 * Provides the main layout with gradient background and title.
 */
'use client';

import { useState, useEffect } from 'react';
import { useGame } from '@/context/GameContext';
import { GamePhase, GameMode } from '@/types/game';
import SetupPhase from '@/components/SetupPhase';
import GameBoard from '@/components/GameBoard';
import { GameLogger } from '@/lib/logger';

export default function Home() {
  const { gameState } = useGame();

  // Track app session start
  useEffect(() => {
    GameLogger.logGameEvent('AppSessionStart', {
      timestamp: new Date().toISOString(),
      currentPhase: gameState.currentPhase,
      gameMode: gameState.gameMode
    });

    // Track when game ends
    if (gameState.currentPhase === GamePhase.GAME_OVER && gameState.winner) {
      GameLogger.trackGameSession({
        playerCount: gameState.players.length,
        gameMode: gameState.gameMode || GameMode.OFFLINE,
        assignmentMode: gameState.assignmentMode || 'unknown',
        winner: gameState.winner
      });
    }
  }, [gameState.currentPhase, gameState.gameMode, gameState.winner, gameState.players.length, gameState.assignmentMode]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 p-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">🎭 Mafia Game</h1>
          <p className="text-gray-300">Digital party game for groups</p>
        </div>

        {/* Route to SetupPhase only for offline mode, otherwise GameBoard handles all phases */}
        {gameState.currentPhase === GamePhase.SETUP && gameState.gameMode === GameMode.OFFLINE ? (
          <SetupPhase />
        ) : (
          <GameBoard />
        )}
      </div>
    </main>
  );
}