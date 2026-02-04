/**
 * Game Utilities - Reusable helper functions for game logic
 * 
 * Contains pure functions for:
 * - Role assignment algorithms
 * - Win condition evaluation
 * - Vote calculation
 * - Player filtering and grouping
 * - Array shuffling
 * 
 * These utilities are pure functions with no side effects,
 * making them easy to test and reuse across the application.
 */

import { Player, PlayerStatus, VoteResult, Role, CustomRoleConfig, AssignmentMode } from '@/types/game';
import { MAFIA_TEAM_ROLES, TOWN_TEAM_ROLES, ROLE_CONFIGS, Team, getRolesByTeam } from '@/constants/roles';

/**
 * Fisher-Yates shuffle algorithm - O(n) time complexity
 * Creates a new shuffled array without mutating the original
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Generate a unique player ID
 */
export function generatePlayerId(index: number): string {
  return `player-${index}-${Date.now()}`;
}

/**
 * Create a new player object with default values
 */
export function createPlayer(
  id: string,
  name: string,
  role: Role,
  status: PlayerStatus = PlayerStatus.ALIVE
): Player {
  return {
    id,
    name,
    role,
    status,
    isRevealed: false,
    isSilenced: false,
    isRoleblocked: false,
  };
}

/**
 * Assigns roles using the recommended balanced distribution.
 * Automatically determines the optimal role mix based on player count.
 * 
 * Distribution logic:
 * - Minimum 6 players: 2 Mafia, 4 Citizens
 * - Enforced: 1 mafia per 4 players (minimum 2 for 6 players)
 * - Recommended: 1 mafia per 3 players for better gameplay
 * - 8+ players: Godfather replaces one Mafia
 * - 10+ players: Additional special roles for balance
 */
export function assignRolesRecommended(playerNames: string[]): Player[] {
  const numPlayers = playerNames.length;
  const roles: Role[] = [];
  
  // Calculate number of Mafia roles
  // Enforced: 1 per 4 players, minimum 2 for base game (6 players)
  // For 6 players: 2 mafia, for 7-8: 2 mafia, 9-11: 3 mafia, 12+: 4 mafia, etc.
  const enforcedMafia = Math.max(2, Math.floor(numPlayers / 4));
  // Recommended: 1 per 3 players for better balance
  const recommendedMafia = Math.floor(numPlayers / 3);
  // Use recommended count but ensure at least enforced minimum
  const numMafia = Math.max(enforcedMafia, Math.min(recommendedMafia, Math.floor(numPlayers / 3)));
  
  // Add Mafia roles with Godfather for larger games
  for (let i = 0; i < numMafia; i++) {
    if (i === 0 && numPlayers >= 8) {
      roles.push(Role.GODFATHER);
    } else {
      roles.push(Role.MAFIA);
    }
  }
  
  // Add Hooker for very large games (replaces one Mafia slot's power with roleblock)
  if (numPlayers >= 12) {
    roles.push(Role.HOOKER);
  }
  
  // Add town special roles progressively based on player count
  if (numPlayers >= 7) roles.push(Role.DETECTIVE);
  if (numPlayers >= 8) roles.push(Role.DOCTOR);
  if (numPlayers >= 10) roles.push(Role.SILENCER);
  if (numPlayers >= 12) roles.push(Role.KAMIKAZE);
  
  // Add Joker for large games
  if (numPlayers >= 11) roles.push(Role.JOKER);
  
  // Fill remaining slots with Citizens
  while (roles.length < numPlayers) {
    roles.push(Role.CITIZEN);
  }
  
  // Shuffle and assign
  const shuffledRoles = shuffleArray(roles);
  
  return playerNames.map((name, index) => 
    createPlayer(`player-${index}`, name, shuffledRoles[index])
  );
}

/**
 * Assigns roles using custom user-defined configuration.
 * Independent roles count as citizens for mafia:citizen balancing.
 */
export function assignRolesCustom(playerNames: string[], customConfig: CustomRoleConfig): Player[] {
  const { selectedRoles, totalPlayers } = customConfig;
  const roles: Role[] = [...selectedRoles];
  
  // Count independent roles - they count as citizens for balancing
  const independentCount = selectedRoles.filter(r => 
    ROLE_CONFIGS[r]?.team === Team.INDEPENDENT
  ).length;
  
  // Count mafia roles already selected
  const selectedMafiaCount = selectedRoles.filter(r => 
    ROLE_CONFIGS[r]?.team === Team.MAFIA
  ).length;
  
  const remainingPlayers = totalPlayers - selectedRoles.length;
  const recommendedMafia = Math.max(1, Math.floor(totalPlayers / 4));
  
  // Subtract already selected mafia from recommended amount
  const additionalMafiaNeeded = Math.max(0, recommendedMafia - selectedMafiaCount);
  const numMafia = Math.min(additionalMafiaNeeded, Math.max(0, Math.floor(remainingPlayers / 3)));
  const numCitizens = remainingPlayers - numMafia;
  
  for (let i = 0; i < numMafia; i++) {
    roles.push(Role.MAFIA);
  }
  for (let i = 0; i < numCitizens; i++) {
    roles.push(Role.CITIZEN);
  }
  
  const shuffledRoles = shuffleArray(roles);
  
  return playerNames.map((name, index) => 
    createPlayer(`player-${index}`, name, shuffledRoles[index])
  );
}

/**
 * Get alive players from player list
 */
export function getAlivePlayers(players: Player[]): Player[] {
  return players.filter(p => p.status === PlayerStatus.ALIVE);
}

/**
 * Get players by team
 */
export function getPlayersByTeam(players: Player[], team: Team): Player[] {
  const teamRoles = getRolesByTeam(team);
  return players.filter(p => teamRoles.includes(p.role));
}

/**
 * Get alive Mafia team members
 */
export function getAliveMafia(players: Player[]): Player[] {
  return players.filter(p => 
    p.status === PlayerStatus.ALIVE && MAFIA_TEAM_ROLES.includes(p.role)
  );
}

/**
 * Get alive Town team members
 */
export function getAliveTown(players: Player[]): Player[] {
  return players.filter(p => 
    p.status === PlayerStatus.ALIVE && TOWN_TEAM_ROLES.includes(p.role)
  );
}

/**
 * Get the alive Joker player if exists
 */
export function getAliveJoker(players: Player[]): Player | undefined {
  return players.find(p => 
    p.status === PlayerStatus.ALIVE && p.role === Role.JOKER
  );
}

/**
 * Winner type for game end conditions
 */
export type Winner = 'Mafia' | 'Town' | 'Joker' | null;

/**
 * Checks current game state for win conditions.
 * Returns the winning team/player or null if game should continue.
 * 
 * Win conditions:
 * - Joker: Wins by being voted out (handled separately) or surviving alone
 * - Town: Wins by eliminating all Mafia members
 * - Mafia: Wins by equaling or outnumbering Town members
 */
export function checkWinCondition(players: Player[]): Winner {
  const alivePlayers = getAlivePlayers(players);
  const aliveMafia = getAliveMafia(players);
  const aliveTown = getAliveTown(players);
  const aliveJoker = getAliveJoker(players);
  
  // Joker wins if they're the sole survivor
  if (aliveJoker && alivePlayers.length === 1) {
    return 'Joker';
  }
  
  // Town wins by complete elimination of Mafia team
  if (aliveMafia.length === 0) {
    return 'Town';
  }
  
  // Mafia wins by achieving voting majority
  if (aliveMafia.length >= aliveTown.length) {
    return 'Mafia';
  }
  
  return null;
}

/**
 * Calculate vote results from a votes record
 */
export function calculateVoteResult(
  votes: Record<string, string>,
  players: Player[]
): VoteResult {
  const voteCount: Record<string, number> = {};
  
  // Count votes
  Object.values(votes).forEach(targetId => {
    voteCount[targetId] = (voteCount[targetId] || 0) + 1;
  });
  
  // Find player with most votes
  let maxVotes = 0;
  let eliminatedPlayer: Player | undefined;
  let isTie = false;
  
  Object.entries(voteCount).forEach(([playerId, voteNum]) => {
    if (voteNum > maxVotes) {
      maxVotes = voteNum;
      eliminatedPlayer = players.find(p => p.id === playerId);
      isTie = false;
    } else if (voteNum === maxVotes && maxVotes > 0) {
      isTie = true;
    }
  });
  
  return {
    eliminatedPlayer: isTie ? undefined : eliminatedPlayer,
    isTie,
    voteCount,
  };
}

/**
 * Get valid night action targets based on role restrictions
 * 
 * Mafia/Godfather can target all non-mafia players (including Hooker)
 * Hooker cannot target Godfather (immune) or other Hookers
 */
export function getValidNightTargets(
  actingPlayer: Player,
  allPlayers: Player[]
): Player[] {
  const alivePlayers = getAlivePlayers(allPlayers);
  const roleConfig = ROLE_CONFIGS[actingPlayer.role];
  
  if (!roleConfig.nightAction) {
    return [];
  }
  
  return alivePlayers.filter(target => {
    // Can't target self unless specifically allowed
    if (target.id === actingPlayer.id && !roleConfig.canTargetSelf) {
      return false;
    }
    
    // Mafia/Godfather can target everyone except other Mafia/Godfather
    // This means they CAN target Hooker (who is on their team but not protected)
    if (actingPlayer.role === Role.MAFIA || actingPlayer.role === Role.GODFATHER) {
      if (target.role === Role.MAFIA || target.role === Role.GODFATHER) {
        return false;
      }
      return true;
    }
    
    // Hooker can't target Godfather (immune) or other Hookers
    if (actingPlayer.role === Role.HOOKER) {
      if (target.role === Role.GODFATHER || target.role === Role.HOOKER) {
        return false;
      }
    }
    
    return true;
  });
}

/**
 * Check if a player should skip their action due to being roleblocked
 */
export function isRoleblocked(player: Player): boolean {
  // Godfather is immune to roleblock
  if (player.role === Role.GODFATHER) {
    return false;
  }
  return player.isRoleblocked ?? false;
}

/**
 * Process night kill with doctor protection check
 */
export function processNightKill(
  killTarget: string | undefined,
  doctorTarget: string | undefined
): string | undefined {
  if (!killTarget) return undefined;
  if (killTarget === doctorTarget) return undefined;
  return killTarget;
}

/**
 * Calculate role distribution preview for custom mode
 * 
 * Mafia rules:
 * - Enforced minimum: 1 mafia per 4 players (min 2 for 6 players)
 * - If Godfather selected in custom roles, counts toward mafia requirement
 */
export function calculateRoleDistribution(
  selectedRoles: Role[],
  totalPlayers: number
): { numMafia: number; numCitizens: number; isValid: boolean; enforcedMafia: number } {
  const remainingPlayers = totalPlayers - selectedRoles.length;
  
  // Count mafia-team roles already selected (Godfather, Hooker)
  const selectedMafiaCount = selectedRoles.filter(r => 
    r === Role.GODFATHER || r === Role.MAFIA || r === Role.HOOKER
  ).length;
  
  // Enforced: 1 per 4 players, minimum 2 for base game
  const enforcedMafia = Math.max(2, Math.floor(totalPlayers / 4));
  
  // Calculate how many more mafia needed (at least 1 regular mafia if none selected)
  const additionalMafiaNeeded = Math.max(0, enforcedMafia - selectedMafiaCount);
  const numMafia = Math.max(additionalMafiaNeeded, 1); // At least 1 mafia if no mafia-team selected
  
  const numCitizens = remainingPlayers - numMafia;
  
  return {
    numMafia,
    numCitizens,
    isValid: numCitizens >= 0,
    enforcedMafia,
  };
}
