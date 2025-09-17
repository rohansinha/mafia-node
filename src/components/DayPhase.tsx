'use client';

import { useState } from 'react';
import { useGame } from '@/context/GameContext';
import { PlayerStatus, Role } from '@/types/game';

export default function DayPhase() {
  const { gameState, castVote, nextPhase, calculateVoteResult, kamikazeRevenge } = useGame();
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const [showVoting, setShowVoting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showKamikazeChoice, setShowKamikazeChoice] = useState(false);
  const [kamikazeTarget, setKamikazeTarget] = useState<string>('');

  const alivePlayers = gameState.players.filter(p => p.status === PlayerStatus.ALIVE);
  const silencedPlayers = gameState.players.filter(p => p.isSilenced && p.status === PlayerStatus.ALIVE);
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
    
    // Check if eliminated player is Kamikaze
    if (voteResult.eliminatedPlayer?.role === Role.KAMIKAZE) {
      const otherPlayers = alivePlayers.filter(p => p.id !== voteResult.eliminatedPlayer?.id);
      if (otherPlayers.length > 0) {
        setShowKamikazeChoice(true);
        return;
      }
    }
    
    // Check if eliminated player is Joker (wins immediately)
    if (voteResult.eliminatedPlayer?.role === Role.JOKER) {
      // Joker wins - this will be handled by the game logic
    }
    
    nextPhase();
    setShowResults(false);
  };

  const handleKamikazeRevenge = () => {
    if (kamikazeTarget) {
      // Process Kamikaze revenge kill
      kamikazeRevenge(kamikazeTarget);
      nextPhase();
      setShowKamikazeChoice(false);
      setShowResults(false);
      setKamikazeTarget('');
    }
  };

  // Kamikaze revenge selection screen
  if (showKamikazeChoice) {
    const voteResult = calculateVoteResult();
    const kamikazePlayer = voteResult.eliminatedPlayer;
    const otherPlayers = alivePlayers.filter(p => p.id !== kamikazePlayer?.id);

    return (
      <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 space-y-4">
        <h2 className="text-2xl font-bold text-white text-center">💥 Kamikaze Revenge!</h2>
        
        <div className="text-center p-4 bg-orange-600/20 border border-orange-500 rounded-lg">
          <p className="text-orange-200 text-lg font-semibold">
            {kamikazePlayer?.name} was a Kamikaze!
          </p>
          <p className="text-orange-300 text-sm mt-1">
            They can take one player with them!
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-white/80 text-center">Choose who to eliminate:</p>
          {otherPlayers.map((player) => (
            <button
              key={player.id}
              onClick={() => setKamikazeTarget(player.id)}
              className={`w-full p-3 rounded-lg border-2 transition-colors ${
                kamikazeTarget === player.id
                  ? 'border-orange-500 bg-orange-600/30 text-white'
                  : 'border-white/30 bg-white/5 text-white/80 hover:bg-white/10'
              }`}
            >
              {player.name} ({player.role})
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              nextPhase();
              setShowKamikazeChoice(false);
              setShowResults(false);
            }}
            className="flex-1 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            Skip Revenge
          </button>
          <button
            onClick={handleKamikazeRevenge}
            disabled={!kamikazeTarget}
            className="flex-1 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            Take Revenge
          </button>
        </div>
      </div>
    );
  }

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
          <div className={`text-center p-4 border rounded-lg ${
            voteResult.eliminatedPlayer.role === Role.JOKER 
              ? 'bg-yellow-600/20 border-yellow-500' 
              : voteResult.eliminatedPlayer.role === Role.KAMIKAZE
              ? 'bg-orange-600/20 border-orange-500'
              : 'bg-red-600/20 border-red-500'
          }`}>
            <p className={`text-lg font-semibold ${
              voteResult.eliminatedPlayer.role === Role.JOKER ? 'text-yellow-200' : 
              voteResult.eliminatedPlayer.role === Role.KAMIKAZE ? 'text-orange-200' : 'text-red-200'
            }`}>
              {voteResult.eliminatedPlayer.name} has been eliminated!
            </p>
            <p className={`text-sm mt-1 ${
              voteResult.eliminatedPlayer.role === Role.JOKER ? 'text-yellow-300' : 
              voteResult.eliminatedPlayer.role === Role.KAMIKAZE ? 'text-orange-300' : 'text-red-300'
            }`}>
              They were a {voteResult.eliminatedPlayer.role}
            </p>
            {voteResult.eliminatedPlayer.role === Role.JOKER && (
              <p className="text-yellow-300 text-sm mt-2 font-semibold">
                🃏 The Joker wins the game! 🃏
              </p>
            )}
            {voteResult.eliminatedPlayer.role === Role.KAMIKAZE && (
              <p className="text-orange-300 text-sm mt-2 font-semibold">
                💥 Kamikaze activated! 💥
              </p>
            )}
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
          {voteResult.eliminatedPlayer?.role === Role.JOKER ? 'End Game' : 'Continue to Night Phase'}
        </button>
      </div>
    );
  }

  if (showVoting && currentPlayer) {
    const isCurrentPlayerSilenced = currentPlayer.isSilenced;
    
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 space-y-4">
        <h2 className="text-2xl font-bold text-white text-center">
          {currentPlayer.name}&apos;s Vote
        </h2>
        
        {isCurrentPlayerSilenced && (
          <div className="text-center p-3 bg-purple-600/20 border border-purple-500 rounded-lg">
            <p className="text-purple-200 text-sm">
              🔇 {currentPlayer.name} is silenced and cannot speak during discussion, but can still vote.
            </p>
          </div>
        )}
        
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
              <div className="flex justify-between items-center">
                <span>{player.name}</span>
                {player.isSilenced && <span className="text-purple-300 text-xs">🔇 Silenced</span>}
              </div>
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
      <h2 className="text-2xl font-bold text-white text-center">☀️ Day {gameState.dayCount} - Discussion & Voting</h2>
      
      {/* Silenced players notification */}
      {silencedPlayers.length > 0 && (
        <div className="bg-purple-600/20 border border-purple-500 rounded-lg p-4">
          <h3 className="text-purple-200 font-semibold mb-2">🔇 Silenced Players</h3>
          <p className="text-purple-300 text-sm">
            The following players cannot speak during discussion (but can still vote):
          </p>
          <div className="mt-2 space-x-2">
            {silencedPlayers.map(player => (
              <span key={player.id} className="inline-block bg-purple-600 text-white px-2 py-1 rounded text-xs">
                {player.name}
              </span>
            ))}
          </div>
        </div>
      )}
      
      <div className="text-center p-4 bg-blue-600/20 border border-blue-500 rounded-lg">
        <p className="text-blue-200 text-lg">
          Discuss who might be the Mafia and vote to eliminate someone!
        </p>
        {silencedPlayers.length > 0 && (
          <p className="text-blue-300 text-sm mt-2">
            Remember: Silenced players cannot participate in discussion.
          </p>
        )}
      </div>

      {currentPlayer && !gameState.votes[currentPlayer.id] ? (
        <div className="text-center">
          <p className="text-white/80 mb-4">
            Pass the device to <strong className="text-white">{currentPlayer.name}</strong>
            {currentPlayer.isSilenced && <span className="text-purple-300 ml-2">(🔇 Silenced)</span>}
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