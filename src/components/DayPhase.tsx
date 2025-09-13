'use client';

import { useState } from 'react';
import { useGame } from '@/context/GameContext';
import { PlayerStatus } from '@/types/game';

export default function DayPhase() {
  const { gameState, castVote, nextPhase, calculateVoteResult } = useGame();
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const [showVoting, setShowVoting] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const alivePlayers = gameState.players.filter(p => p.status === PlayerStatus.ALIVE);
  const currentPlayer = alivePlayers[gameState.currentPlayerIndex % alivePlayers.length];
  const votingTargets = alivePlayers.filter(p => p.id !== currentPlayer?.id);

  const handleCastVote = () => {
    if (selectedTarget && currentPlayer) {
      castVote(currentPlayer.id, selectedTarget);
      setSelectedTarget('');
      setShowVoting(false);
    }
  };

  const handleShowResults = () => {
    setShowResults(true);
  };

  const handleNextPhase = () => {
    const voteResult = calculateVoteResult();
    if (voteResult.eliminatedPlayer) {
      // Player elimination is handled in context
    }
    nextPhase();
    setShowResults(false);
  };

  if (showResults) {
    const voteResult = calculateVoteResult();
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 space-y-4">
        <h2 className="text-2xl font-bold text-white text-center">Vote Results</h2>
        
        <div className="space-y-3">
          {Object.entries(voteResult.voteCount).map(([playerId, count]) => {
            const player = gameState.players.find(p => p.id === playerId);
            return (
              <div key={playerId} className="bg-white/5 rounded-lg p-3 flex justify-between items-center">
                <span className="text-white font-medium">{player?.name}</span>
                <span className="text-white bg-purple-600 px-2 py-1 rounded">{count} votes</span>
              </div>
            );
          })}
        </div>

        {voteResult.eliminatedPlayer ? (
          <div className="text-center p-4 bg-red-600/20 border border-red-500 rounded-lg">
            <p className="text-red-200 text-lg font-semibold">
              {voteResult.eliminatedPlayer.name} has been eliminated!
            </p>
            <p className="text-red-300 text-sm mt-1">
              They were a {voteResult.eliminatedPlayer.role}
            </p>
          </div>
        ) : (
          <div className="text-center p-4 bg-yellow-600/20 border border-yellow-500 rounded-lg">
            <p className="text-yellow-200 text-lg font-semibold">
              No elimination - tie vote!
            </p>
          </div>
        )}

        <button
          onClick={handleNextPhase}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg transition-colors"
        >
          Continue to Night Phase
        </button>
      </div>
    );
  }

  if (showVoting && currentPlayer) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 space-y-4">
        <h2 className="text-2xl font-bold text-white text-center">
          {currentPlayer.name}'s Vote
        </h2>
        
        <p className="text-white/80 text-center">
          Who do you want to vote to eliminate?
        </p>

        <div className="space-y-2">
          {votingTargets.map((player) => (
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
            onClick={() => setShowVoting(false)}
            className="flex-1 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCastVote}
            disabled={!selectedTarget}
            className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            Cast Vote
          </button>
        </div>
      </div>
    );
  }

  const allVotesCast = Object.keys(gameState.votes).length === alivePlayers.length;

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 space-y-4">
      <h2 className="text-2xl font-bold text-white text-center">Day Phase - Discussion & Voting</h2>
      
      <div className="text-center p-4 bg-blue-600/20 border border-blue-500 rounded-lg">
        <p className="text-blue-200 text-lg">
          Discuss who might be the Mafia and vote to eliminate someone!
        </p>
      </div>

      {currentPlayer && !gameState.votes[currentPlayer.id] ? (
        <div className="text-center">
          <p className="text-white/80 mb-4">
            Pass the device to <strong className="text-white">{currentPlayer.name}</strong>
          </p>
          <button
            onClick={() => setShowVoting(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            Vote ({currentPlayer.name})
          </button>
        </div>
      ) : (
        <div className="text-center space-y-4">
          <div className="text-white/80">
            <p>Votes cast: {Object.keys(gameState.votes).length} / {alivePlayers.length}</p>
          </div>
          
          {allVotesCast ? (
            <button
              onClick={handleShowResults}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              Show Results
            </button>
          ) : (
            <p className="text-white/60">Waiting for all players to vote...</p>
          )}
        </div>
      )}
    </div>
  );
}