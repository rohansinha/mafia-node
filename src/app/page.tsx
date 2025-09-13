'use client';

import { useState } from 'react';
import { useGame } from '@/context/GameContext';
import { GamePhase } from '@/types/game';
import SetupPhase from '@/components/SetupPhase';
import GameBoard from '@/components/GameBoard';

export default function Home() {
  const { gameState } = useGame();

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 p-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">🎭 Mafia Game</h1>
          <p className="text-gray-300">Digital party game for groups</p>
        </div>

        {gameState.currentPhase === GamePhase.SETUP ? (
          <SetupPhase />
        ) : (
          <GameBoard />
        )}
      </div>
    </main>
  );
}