/**
 * Role Constants and Configuration
 * 
 * Centralized role definitions providing:
 * - Role metadata (display names, descriptions, colors)
 * - Team affiliations for win condition checks
 * - Night action configurations
 * - Role assignment distribution logic
 * 
 * This enables easy addition of new roles and modification of existing ones
 * without touching multiple components.
 */

import { Role } from '@/types/game';

/**
 * Team affiliations for grouping roles
 */
export enum Team {
  MAFIA = 'Mafia',
  TOWN = 'Town',
  INDEPENDENT = 'Independent',
}

/**
 * Night action types available to roles
 */
export type NightActionType = 'kill' | 'protect' | 'investigate' | 'silence' | 'roleblock' | null;

/**
 * Complete role configuration interface
 */
export interface RoleConfig {
  role: Role;
  displayName: string;
  team: Team;
  description: string;
  shortDescription: string;
  nightAction: NightActionType;
  canTargetSelf: boolean;
  canTargetTeammates: boolean;
  isImmuneTo: Role[];
  color: {
    bg: string;
    border: string;
    text: string;
    badge: string;
  };
  emoji: string;
  minPlayersRequired: number;
}

/**
 * Complete role configurations - single source of truth for all role data
 */
export const ROLE_CONFIGS: Record<Role, RoleConfig> = {
  [Role.MAFIA]: {
    role: Role.MAFIA,
    displayName: 'Mafia',
    team: Team.MAFIA,
    description: 'Your goal: Eliminate all non-Mafia players',
    shortDescription: 'Basic mafia member who can eliminate players at night',
    nightAction: 'kill',
    canTargetSelf: false,
    canTargetTeammates: false,
    isImmuneTo: [],
    color: {
      bg: 'bg-red-600',
      border: 'border-red-500',
      text: 'text-red-200',
      badge: 'bg-red-600 text-white',
    },
    emoji: '🔪',
    minPlayersRequired: 4,
  },
  [Role.GODFATHER]: {
    role: Role.GODFATHER,
    displayName: 'Godfather',
    team: Team.MAFIA,
    description: 'Your goal: Lead the Mafia to victory. Immune to Detective and Hooker',
    shortDescription: 'Enhanced mafia leader with immunity to detection and roleblock',
    nightAction: 'kill',
    canTargetSelf: false,
    canTargetTeammates: false,
    isImmuneTo: [Role.DETECTIVE, Role.HOOKER],
    color: {
      bg: 'bg-red-700',
      border: 'border-red-600',
      text: 'text-red-200',
      badge: 'bg-red-700 text-white',
    },
    emoji: '👔',
    minPlayersRequired: 8,
  },
  [Role.HOOKER]: {
    role: Role.HOOKER,
    displayName: 'Hooker',
    team: Team.INDEPENDENT,
    description: "Your goal: Survive until the end! Block players' night actions to stay useful.",
    shortDescription: 'Independent role - roleblocks players, wins by surviving',
    nightAction: 'roleblock',
    canTargetSelf: false,
    canTargetTeammates: false,
    isImmuneTo: [],
    color: {
      bg: 'bg-pink-600',
      border: 'border-pink-500',
      text: 'text-pink-200',
      badge: 'bg-pink-600 text-white',
    },
    emoji: '💋',
    minPlayersRequired: 12,
  },
  [Role.DETECTIVE]: {
    role: Role.DETECTIVE,
    displayName: 'Detective',
    team: Team.TOWN,
    description: 'Your goal: Investigate and find the Mafia',
    shortDescription: 'Can investigate one player per night to learn their role',
    nightAction: 'investigate',
    canTargetSelf: false,
    canTargetTeammates: true,
    isImmuneTo: [],
    color: {
      bg: 'bg-blue-600',
      border: 'border-blue-500',
      text: 'text-blue-200',
      badge: 'bg-blue-600 text-white',
    },
    emoji: '🔍',
    minPlayersRequired: 5,
  },
  [Role.DOCTOR]: {
    role: Role.DOCTOR,
    displayName: 'Doctor',
    team: Team.TOWN,
    description: 'Your goal: Protect players from the Mafia',
    shortDescription: 'Can protect one player per night from attacks',
    nightAction: 'protect',
    canTargetSelf: true,
    canTargetTeammates: true,
    isImmuneTo: [],
    color: {
      bg: 'bg-green-600',
      border: 'border-green-500',
      text: 'text-green-200',
      badge: 'bg-green-600 text-white',
    },
    emoji: '💉',
    minPlayersRequired: 7,
  },
  [Role.CITIZEN]: {
    role: Role.CITIZEN,
    displayName: 'Citizen',
    team: Team.TOWN,
    description: 'Your goal: Find and eliminate the Mafia',
    shortDescription: 'No special abilities, wins by eliminating all mafia',
    nightAction: null,
    canTargetSelf: false,
    canTargetTeammates: false,
    isImmuneTo: [],
    color: {
      bg: 'bg-gray-600',
      border: 'border-gray-500',
      text: 'text-gray-200',
      badge: 'bg-gray-600 text-white',
    },
    emoji: '👤',
    minPlayersRequired: 4,
  },
  [Role.SILENCER]: {
    role: Role.SILENCER,
    displayName: 'Silencer',
    team: Team.INDEPENDENT,
    description: 'Your goal: Survive! Use your silencing power strategically to help your chosen team.',
    shortDescription: 'Independent role - silences players, wins by surviving',
    nightAction: 'silence',
    canTargetSelf: false,
    canTargetTeammates: true,
    isImmuneTo: [],
    color: {
      bg: 'bg-purple-600',
      border: 'border-purple-500',
      text: 'text-purple-200',
      badge: 'bg-purple-600 text-white',
    },
    emoji: '🔇',
    minPlayersRequired: 9,
  },
  [Role.KAMIKAZE]: {
    role: Role.KAMIKAZE,
    displayName: 'Kamikaze',
    team: Team.INDEPENDENT,
    description: 'Your goal: Survive, or take someone down with you if voted out!',
    shortDescription: 'Independent role - when voted out, eliminates another player',
    nightAction: null,
    canTargetSelf: false,
    canTargetTeammates: true,
    isImmuneTo: [],
    color: {
      bg: 'bg-orange-600',
      border: 'border-orange-500',
      text: 'text-orange-200',
      badge: 'bg-orange-600 text-white',
    },
    emoji: '💥',
    minPlayersRequired: 11,
  },
  [Role.JOKER]: {
    role: Role.JOKER,
    displayName: 'Joker',
    team: Team.INDEPENDENT,
    description: 'Your goal: Get voted out to win! Play chaotically.',
    shortDescription: 'Independent role - wins if voted out during day phase',
    nightAction: null,
    canTargetSelf: false,
    canTargetTeammates: false,
    isImmuneTo: [],
    color: {
      bg: 'bg-yellow-600',
      border: 'border-yellow-500',
      text: 'text-yellow-900',
      badge: 'bg-yellow-600 text-black',
    },
    emoji: '🃏',
    minPlayersRequired: 10,
  },
};

/**
 * Get role configuration by role enum
 */
export function getRoleConfig(role: Role): RoleConfig {
  return ROLE_CONFIGS[role];
}

/**
 * Get all roles belonging to a specific team
 */
export function getRolesByTeam(team: Team): Role[] {
  return Object.values(ROLE_CONFIGS)
    .filter(config => config.team === team)
    .map(config => config.role);
}

/**
 * Get all roles that have night actions
 */
export function getNightActionRoles(): Role[] {
  return Object.values(ROLE_CONFIGS)
    .filter(config => config.nightAction !== null)
    .map(config => config.role);
}

/**
 * Check if a role belongs to a specific team
 */
export function isRoleInTeam(role: Role, team: Team): boolean {
  return ROLE_CONFIGS[role].team === team;
}

/**
 * Get role color styling
 */
export function getRoleColor(role: Role | string): string {
  const config = ROLE_CONFIGS[role as Role];
  return config?.color.badge || 'bg-gray-600 text-white';
}

/**
 * Get role emoji
 */
export function getRoleEmoji(role: Role | string): string {
  const config = ROLE_CONFIGS[role as Role];
  return config?.emoji || '👤';
}

/**
 * Get role description
 */
export function getRoleDescription(role: Role | string): string {
  const config = ROLE_CONFIGS[role as Role];
  return config?.description || 'Your goal: Help your team win';
}

/**
 * Night action order for processing (Mafia acts first)
 */
export const NIGHT_ACTION_ORDER: Role[] = [
  Role.MAFIA,
  Role.GODFATHER,
  Role.HOOKER,
  Role.DETECTIVE,
  Role.DOCTOR,
  Role.SILENCER,
];

/**
 * Roles available for custom assignment mode
 */
export const CUSTOM_ASSIGNABLE_ROLES: Role[] = [
  Role.DETECTIVE,
  Role.DOCTOR,
  Role.SILENCER,
  Role.KAMIKAZE,
  Role.JOKER,
  Role.GODFATHER,
  Role.HOOKER,
];

/**
 * Mafia team roles for win condition checks
 */
export const MAFIA_TEAM_ROLES: Role[] = [Role.MAFIA, Role.GODFATHER];

/**
 * Independent roles - win by surviving, can play for either team
 */
export const INDEPENDENT_ROLES: Role[] = [Role.HOOKER, Role.JOKER, Role.KAMIKAZE, Role.SILENCER];

/**
 * Town team roles for win condition checks
 */
export const TOWN_TEAM_ROLES: Role[] = [
  Role.CITIZEN,
  Role.DETECTIVE,
  Role.DOCTOR,
];
