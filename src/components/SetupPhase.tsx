'use client';

import { useState } from 'react';
import { useGame } from '@/context/GameContext';

export default function SetupPhase() {
  const [playerNames, setPlayerNames] = useState<string[]>(['']);
  const [showRoles, setShowRoles] = useState(false);
  const { gameState, initializeGame, startGame } = useGame();

  const addPlayer = () => {
    setPlayerNames([...playerNames, '']);
  };

  const removePlayer = (index: number) => {
    if (playerNames.length > 1) {
      setPlayerNames(playerNames.filter((_, i) => i !== index));
    }
  };

  const updatePlayerName = (index: number, name: string) => {
    const newNames = [...playerNames];
    newNames[index] = name;
    setPlayerNames(newNames);
  };

  const handleInitialize = () => {
    const validNames = playerNames.filter(name => name.trim() !== '');
    if (validNames.length >= 4) {
      initializeGame(validNames);
      setShowRoles(true);
    }
  };

  const handleStartGame = () => {
    startGame();
    setShowRoles(false);
  };

  if (showRoles && gameState.players.length > 0) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 space-y-4">
        <h2 className="text-2xl font-bold text-white text-center mb-6">Role Assignments</h2>
        <div className="space-y-3">
          {gameState.players.map((player, index) => (
            <div key={player.id} className="bg-white/5 rounded-lg p-4 border border-white/20">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-white mb-2">{player.name}</h3>
                <div className={`inline-block px-4 py-2 rounded-full font-bold text-sm ${
                  player.role === 'Mafia' 
                    ? 'bg-red-600 text-white'
                    : player.role === 'Detective'
                    ? 'bg-blue-600 text-white'
                    : player.role === 'Doctor'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-600 text-white'
                }`}>
                  {player.role}
                </div>
                {player.role === 'Mafia' && (
                  <p className="text-red-300 text-sm mt-2">Your goal: Eliminate all non-Mafia players</p>
                )}
                {player.role === 'Detective' && (
                  <p className="text-blue-300 text-sm mt-2">Your goal: Find and eliminate the Mafia</p>
                )}
                {player.role === 'Doctor' && (
                  <p className="text-green-300 text-sm mt-2">Your goal: Protect players from the Mafia</p>
                )}
                {player.role === 'Citizen' && (
                  <p className="text-gray-300 text-sm mt-2">Your goal: Find and eliminate the Mafia</p>
                )}
              </div>
            </div>
          ))}
        </div>
        
        <div className="text-center mt-6">
          <p className="text-white/80 text-sm mb-4">
            Show each player their role privately, then start the game!
          </p>
          <button
            onClick={handleStartGame}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-lg transition-colors"
          >
            Start Game
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">Setup Players</h2>
      
      <div className="space-y-3">
        {playerNames.map((name, index) => (
          <div key={index} className="flex gap-2">
            <input
              type="text"
              placeholder={`Player ${index + 1} name`}
              value={name}
              onChange={(e) => updatePlayerName(index, e.target.value)}
              className="flex-1 px-4 py-2 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            {playerNames.length > 1 && (
              <button
                onClick={() => removePlayer(index)}
                className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          onClick={addPlayer}
          className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
        >
          Add Player
        </button>
      </div>

      <div className="text-center">
        <div className="text-white/70 text-sm mb-4">
          <p>Minimum 4 players required</p>
          <p>Current players: {playerNames.filter(name => name.trim()).length}</p>
        </div>
        
        <button
          onClick={handleInitialize}
          disabled={playerNames.filter(name => name.trim()).length < 4}
          className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-lg transition-colors"
        >
          Assign Roles
        </button>
      </div>

      <div className="text-white/60 text-xs space-y-1">
        <p>• 4-6 players: 1 Mafia, 1 Detective, rest Citizens</p>
        <p>• 7+ players: 1 Mafia, 1 Detective, 1 Doctor, rest Citizens</p>
        <p>• Large groups: Additional Mafia (1 per 4 players)</p>
      </div>
    </div>
  );
}