/**
 * Game Over Component - Victory screen and game results
 * 
 * Displays the final game results including:
 * - Winner announcement with team-specific styling
 * - Complete player roster with role reveals
 * - Team compositions (Mafia, Town, Special roles)
 * - Game restart functionality
 * 
 * @module components/GameOver
 */
'use client';

import { useMemo, memo } from 'react';
import { useGame } from '@/context/GameContext';
import { Role, PlayerStatus } from '@/types/game';
import { getRoleConfig, MAFIA_TEAM_ROLES, TOWN_TEAM_ROLES } from '@/constants/roles';
import { Card, Button, RoleBadge } from '@/components/ui';

export default memo(function GameOver() {
  const { gameState, resetGame } = useGame();

  // Memoized team groupings for performance
  const mafiaPlayers = useMemo(() =>
    gameState.players.filter(p => MAFIA_TEAM_ROLES.includes(p.role)),
    [gameState.players]
  );
  
  const townPlayers = useMemo(() =>
    gameState.players.filter(p => TOWN_TEAM_ROLES.includes(p.role)),
    [gameState.players]
  );
  
  const jokerPlayer = useMemo(() =>
    gameState.players.find(p => p.role === Role.JOKER),
    [gameState.players]
  );

  const winnerConfig = useMemo(() => {
    switch (gameState.winner) {
      case 'Mafia':
        return {
          emoji: '🔪',
          color: 'bg-red-600/20 border-red-500 text-red-200',
          description: 'The Mafia has successfully eliminated enough townspeople to take control!',
        };
      case 'Joker':
        return {
          emoji: '🃏',
          color: 'bg-yellow-600/20 border-yellow-500 text-yellow-200',
          description: 'The Joker has achieved their goal and won the game!',
        };
      default:
        return {
          emoji: '🎉',
          color: 'bg-green-600/20 border-green-500 text-green-200',
          description: 'The town has successfully identified and eliminated all threats!',
        };
    }
  }, [gameState.winner]);

  return (
    <Card padding="lg" className="space-y-6">
      <h1 className="text-3xl font-bold text-white text-center">
        {winnerConfig.emoji} Game Over {winnerConfig.emoji}
      </h1>

      <div className={`text-center p-6 border-2 rounded-lg ${winnerConfig.color}`}>
        <h2 className="text-2xl font-bold mb-2">
          {gameState.winner} Win{gameState.winner === 'Joker' ? 's' : ''}!
        </h2>
        <p className="text-lg">{winnerConfig.description}</p>
      </div>

      {/* Team breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Mafia Team */}
        <div className="bg-red-600/10 border border-red-500/30 rounded-lg p-4">
          <h4 className="text-red-300 font-semibold mb-2">🔪 Mafia Team</h4>
          <div className="space-y-1 text-sm">
            {mafiaPlayers.map(player => (
              <div key={player.id} className="flex justify-between">
                <span className="text-red-200">{player.name}</span>
                <span className="text-red-300">{player.role}</span>
              </div>
            ))}
            {mafiaPlayers.length === 0 && (
              <p className="text-red-400/60 text-xs">No mafia players</p>
            )}
          </div>
        </div>

        {/* Town Team */}
        <div className="bg-blue-600/10 border border-blue-500/30 rounded-lg p-4">
          <h4 className="text-blue-300 font-semibold mb-2">🏛️ Town Team</h4>
          <div className="space-y-1 text-sm">
            {townPlayers.map(player => (
              <div key={player.id} className="flex justify-between">
                <span className="text-blue-200">{player.name}</span>
                <span className="text-blue-300">{player.role}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Independent */}
        {jokerPlayer && (
          <div className="bg-yellow-600/10 border border-yellow-500/30 rounded-lg p-4">
            <h4 className="text-yellow-300 font-semibold mb-2">🃏 Independent</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-yellow-200">{jokerPlayer.name}</span>
                <span className="text-yellow-300">{jokerPlayer.role}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-white text-center">Final Roles</h3>
        <div className="grid grid-cols-1 gap-2">
          {gameState.players.map((player) => {
            const roleConfig = getRoleConfig(player.role);
            return (
              <div
                key={player.id}
                className={`p-3 rounded-lg border flex justify-between items-center
                  ${roleConfig.color.bg}/20 border-${roleConfig.color.border}/30 ${roleConfig.color.text}`}
              >
                <div>
                  <span className="font-medium">{player.name}</span>
                  <span className="ml-2 text-sm opacity-75">
                    ({player.status === PlayerStatus.ALIVE ? '✅ Survived' : '💀 Eliminated'})
                  </span>
                </div>
                <RoleBadge role={player.role} size="sm" />
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-center text-white/70">
          <p>Game lasted {gameState.dayCount} day{gameState.dayCount !== 1 ? 's' : ''}</p>
          <p>Assignment mode: {gameState.assignmentMode || 'Recommended'}</p>
          {mafiaPlayers.length > 0 && (
            <p className="mt-1">
              Mafia members: {mafiaPlayers.map(p => p.name).join(', ')}
            </p>
          )}
        </div>

        <Button variant="primary" size="lg" fullWidth onClick={resetGame}>
          Play Again
        </Button>
      </div>
    </Card>
  );
})