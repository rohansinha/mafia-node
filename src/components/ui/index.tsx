/**
 * Reusable UI Components
 * 
 * Shared components for consistent styling and behavior:
 * - Buttons with variants
 * - Cards and panels
 * - Progress indicators
 * - Player cards
 * - Role badges
 * 
 * These components follow a consistent API and styling pattern
 * for better maintainability and visual consistency.
 */

import React, { memo, ReactNode, ButtonHTMLAttributes } from 'react';
import { Player, PlayerStatus, Role } from '@/types/game';
import { getRoleConfig, ROLE_CONFIGS } from '@/constants/roles';

// ============================================================================
// Button Component
// ============================================================================

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  children: ReactNode;
}

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-purple-600 hover:bg-purple-700 text-white',
  secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
  danger: 'bg-red-600 hover:bg-red-700 text-white',
  success: 'bg-green-600 hover:bg-green-700 text-white',
  warning: 'bg-orange-600 hover:bg-orange-700 text-white',
  ghost: 'bg-white/5 hover:bg-white/10 text-white border border-white/20',
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg font-bold',
};

export const Button = memo(function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled,
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled}
      className={`
        ${buttonVariants[variant]}
        ${buttonSizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        rounded-lg transition-colors
        ${className}
      `.trim()}
      {...props}
    >
      {children}
    </button>
  );
});

// ============================================================================
// Card Component
// ============================================================================

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const cardPadding: Record<string, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export const Card = memo(function Card({
  children,
  className = '',
  padding = 'md',
}: CardProps) {
  return (
    <div className={`bg-white/10 backdrop-blur-md rounded-lg ${cardPadding[padding]} ${className}`}>
      {children}
    </div>
  );
});

// ============================================================================
// Alert Panel Component
// ============================================================================

export type AlertVariant = 'info' | 'warning' | 'error' | 'success';

interface AlertPanelProps {
  variant?: AlertVariant;
  title?: string;
  children: ReactNode;
  className?: string;
}

const alertVariants: Record<AlertVariant, { bg: string; border: string; text: string }> = {
  info: { bg: 'bg-blue-600/20', border: 'border-blue-500', text: 'text-blue-200' },
  warning: { bg: 'bg-yellow-600/20', border: 'border-yellow-500', text: 'text-yellow-200' },
  error: { bg: 'bg-red-600/20', border: 'border-red-500', text: 'text-red-200' },
  success: { bg: 'bg-green-600/20', border: 'border-green-500', text: 'text-green-200' },
};

export const AlertPanel = memo(function AlertPanel({
  variant = 'info',
  title,
  children,
  className = '',
}: AlertPanelProps) {
  const styles = alertVariants[variant];
  return (
    <div className={`${styles.bg} border ${styles.border} rounded-lg p-4 ${className}`}>
      {title && <h3 className={`${styles.text} font-semibold mb-2`}>{title}</h3>}
      <div className={`${styles.text} text-sm`}>{children}</div>
    </div>
  );
});

// ============================================================================
// Progress Bar Component
// ============================================================================

interface ProgressBarProps {
  progress: number; // 0 to 1
  label?: string;
  showPercentage?: boolean;
  className?: string;
}

export const ProgressBar = memo(function ProgressBar({
  progress,
  label,
  showPercentage = true,
  className = '',
}: ProgressBarProps) {
  const percentage = Math.round(progress * 100);
  
  return (
    <div className={className}>
      {(label || showPercentage) && (
        <div className="flex justify-between text-white/60 text-xs mb-2">
          {label && <span>{label}</span>}
          {showPercentage && <span>{percentage}%</span>}
        </div>
      )}
      <div className="w-full bg-white/20 rounded-full h-2">
        <div
          className="bg-purple-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
});

// ============================================================================
// Role Badge Component
// ============================================================================

interface RoleBadgeProps {
  role: Role;
  size?: 'sm' | 'md' | 'lg';
  showEmoji?: boolean;
  className?: string;
}

const badgeSizes: Record<string, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
  lg: 'px-4 py-2 text-base font-bold',
};

export const RoleBadge = memo(function RoleBadge({
  role,
  size = 'md',
  showEmoji = true,
  className = '',
}: RoleBadgeProps) {
  const config = getRoleConfig(role);
  
  return (
    <span
      className={`
        inline-block rounded-full ${config.color.badge}
        ${badgeSizes[size]}
        ${className}
      `.trim()}
    >
      {showEmoji && `${config.emoji} `}
      {config.displayName}
    </span>
  );
});

// ============================================================================
// Player Card Component
// ============================================================================

interface PlayerCardProps {
  player: Player;
  selected?: boolean;
  disabled?: boolean;
  showRole?: boolean;
  showStatus?: boolean;
  onClick?: () => void;
  className?: string;
}

export const PlayerCard = memo(function PlayerCard({
  player,
  selected = false,
  disabled = false,
  showRole = false,
  showStatus = true,
  onClick,
  className = '',
}: PlayerCardProps) {
  const isAlive = player.status === PlayerStatus.ALIVE;
  const isClickable = onClick && !disabled;
  
  return (
    <div
      onClick={isClickable ? onClick : undefined}
      className={`
        p-3 rounded-lg border-2 transition-colors
        ${selected ? 'border-purple-500 bg-purple-600/30' : 'border-white/30 bg-white/5'}
        ${isClickable ? 'cursor-pointer hover:bg-white/10' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${!isAlive && showStatus ? 'opacity-60' : ''}
        ${className}
      `.trim()}
    >
      <div className="flex justify-between items-center">
        <div>
          <span className="text-white font-medium">{player.name}</span>
          {player.isSilenced && (
            <span className="ml-2 text-purple-300 text-xs">🔇</span>
          )}
        </div>
        {showRole && <RoleBadge role={player.role} size="sm" />}
        {showStatus && !showRole && (
          <span className={`text-xs ${isAlive ? 'text-green-400' : 'text-red-400'}`}>
            {isAlive ? '✅' : '💀'}
          </span>
        )}
      </div>
      {showRole && (
        <p className="text-white/60 text-xs mt-1">
          {getRoleConfig(player.role).description}
        </p>
      )}
    </div>
  );
});

// ============================================================================
// Player Status Grid Component
// ============================================================================

interface PlayerStatusGridProps {
  players: Player[];
  columns?: 2 | 3 | 4;
  className?: string;
}

export const PlayerStatusGrid = memo(function PlayerStatusGrid({
  players,
  columns = 2,
  className = '',
}: PlayerStatusGridProps) {
  const gridCols: Record<number, string> = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
  };
  
  return (
    <div className={`grid ${gridCols[columns]} gap-2 ${className}`}>
      {players.map(player => (
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
  );
});

// ============================================================================
// Section Header Component
// ============================================================================

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}

export const SectionHeader = memo(function SectionHeader({
  title,
  subtitle,
  action,
  className = '',
}: SectionHeaderProps) {
  return (
    <div className={`flex justify-between items-center ${className}`}>
      <div>
        <h2 className="text-xl font-bold text-white">{title}</h2>
        {subtitle && <p className="text-white/70 text-sm">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
});

// ============================================================================
// Device Passing Screen Component
// ============================================================================

interface DevicePassingProps {
  playerName: string;
  instruction?: string;
  onReveal: () => void;
  onBack?: () => void;
  onRestart?: () => void;
}

export const DevicePassingScreen = memo(function DevicePassingScreen({
  playerName,
  instruction = 'Make sure only they can see the screen, then reveal.',
  onReveal,
  onBack,
  onRestart,
}: DevicePassingProps) {
  return (
    <div className="text-center space-y-6">
      <div className="bg-white/5 rounded-lg p-6 border border-white/20">
        <h3 className="text-xl font-semibold text-white mb-4">
          Pass the device to:
        </h3>
        <div className="text-3xl font-bold text-purple-300 mb-4">
          {playerName}
        </div>
        <p className="text-white/70 text-sm">{instruction}</p>
      </div>
      
      <div className="space-y-3">
        <Button variant="primary" size="lg" fullWidth onClick={onReveal}>
          I&apos;m {playerName} - Show My Role
        </Button>
        
        <div className="flex gap-2">
          {onRestart && (
            <Button variant="secondary" fullWidth onClick={onRestart}>
              Start Over
            </Button>
          )}
          {onBack && (
            <Button variant="ghost" fullWidth onClick={onBack}>
              Previous Player
            </Button>
          )}
        </div>
      </div>
    </div>
  );
});

// ============================================================================
// Selectable List Component
// ============================================================================

interface SelectableListProps<T> {
  items: T[];
  selectedId?: string;
  onSelect: (item: T) => void;
  renderItem: (item: T, isSelected: boolean) => ReactNode;
  getItemId: (item: T) => string;
  disabled?: boolean;
  className?: string;
}

export function SelectableList<T>({
  items,
  selectedId,
  onSelect,
  renderItem,
  getItemId,
  disabled = false,
  className = '',
}: SelectableListProps<T>) {
  return (
    <div className={`space-y-2 ${className}`}>
      {items.map(item => {
        const itemId = getItemId(item);
        const isSelected = selectedId === itemId;
        
        return (
          <button
            key={itemId}
            onClick={() => !disabled && onSelect(item)}
            disabled={disabled}
            className={`
              w-full p-3 rounded-lg border-2 transition-colors text-left
              ${isSelected ? 'border-purple-500 bg-purple-600/30' : 'border-white/30 bg-white/5'}
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/10'}
            `.trim()}
          >
            {renderItem(item, isSelected)}
          </button>
        );
      })}
    </div>
  );
}

// Components are exported individually using `export const` above
