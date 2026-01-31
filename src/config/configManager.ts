/**
 * Game Configuration Manager - Loads and manages JSON-based game settings
 * 
 * This utility loads configuration from gameConfig.json and provides:
 * - Type-safe access to all game settings
 * - Environment-specific overrides
 * - Runtime configuration updates
 * - Validation and defaults
 * 
 * Usage:
 * - Import { gameConfig } from '@/config/configManager'
 * - Access settings like gameConfig.timing.nightActionTime
 * - Check logging settings with gameConfig.isLoggingEnabled('logUserActions')
 */

// Import configuration data inline to avoid deployment issues
const configData = {
  "game": {
    "timing": {
      "nightActionTime": 60,
      "discussionTime": 300,
      "votingTime": 45,
      "resultsDisplayTime": 10,
      "roleRevealTime": 15,
      "kamikazeRevengeTime": 30,
      "transitionDelay": 2000,
      "nightTurnTransitionDelay": 5000,
      "audioPromptReplayDelay": 10
    },
    "players": {
      "minPlayers": 4,
      "maxPlayers": 20
    },
    "features": {
      "enableDevicePassingConfirmations": true,
      "showRoleHints": true,
      "enableAnimations": true,
      "autoAdvancePhases": false,
      "skipConfirmations": false,
      "showTimers": true
    }
  },
  "logging": {
    "enableApplicationInsights": true,
    "logUserActions": true,
    "logGameEvents": true,
    "logExceptions": true,
    "logMetrics": true,
    "logSessionAnalytics": true,
    "enableConsoleLogging": true,
    "consoleLogLevel": "info"
  },
  "ui": {
    "theme": "dark",
    "animationDuration": 300,
    "enableHapticFeedback": true,
    "fontSizeMultiplier": 1.0,
    "highContrastMode": false
  },
  "tts": {
    "provider": "azure",
    "azure": {
      "voice": "en-US-GuyNeural",
      "style": "serious",
      "rate": "0%",
      "pitch": "0%"
    },
    "elevenlabs": {
      "voiceId": "TxGEqnHWrfWFTfGW9XjX",
      "modelId": "eleven_monolingual_v1",
      "stability": 0.5,
      "similarityBoost": 0.75
    }
  },
  "environment": {
    "development": {
      "timing": {
        "nightActionTime": 20,
        "discussionTime": 60,
        "votingTime": 15
      },
      "logging": {
        "enableApplicationInsights": false,
        "consoleLogLevel": "debug"
      }
    },
    "production": {
      "logging": {
        "enableConsoleLogging": false,
        "consoleLogLevel": "error"
      }
    }
  },
  "version": "1.0.0",
  "description": "Mafia Game Configuration - Controls timing, features, and logging settings"
};

// Type definitions for the configuration structure
export interface TimingConfig {
  nightActionTime: number;      // Time in seconds each player gets for night actions
  discussionTime: number;       // Time in seconds for day phase discussion
  votingTime: number;           // Time in seconds each player gets to vote
  resultsDisplayTime: number;   // Time in seconds to display vote results
  roleRevealTime: number;       // Time in seconds to show role assignments
  kamikazeRevengeTime: number;  // Time in seconds for kamikaze revenge selection
  transitionDelay: number;      // Delay in milliseconds between UI transitions
  nightTurnTransitionDelay: number; // Delay in milliseconds between night role turns
  audioPromptReplayDelay: number;   // Delay in seconds before auto-replaying audio prompt
}

export interface LoggingConfig {
  enableApplicationInsights: boolean;  // Master toggle for Application Insights
  logUserActions: boolean;             // Log user actions (votes, night actions)
  logGameEvents: boolean;              // Log game events (phase changes, eliminations)
  logExceptions: boolean;              // Log exceptions and errors
  logMetrics: boolean;                 // Log performance metrics
  logSessionAnalytics: boolean;        // Log game session analytics
  enableConsoleLogging: boolean;       // Enable console logging
  consoleLogLevel: 'debug' | 'info' | 'warn' | 'error';  // Console log level
}

export interface PlayersConfig {
  minPlayers: number;    // Minimum players required to start
  maxPlayers: number;    // Maximum players allowed
}

export interface FeaturesConfig {
  enableDevicePassingConfirmations: boolean;  // Show device passing confirmations
  showRoleHints: boolean;                      // Show role hints during setup
  enableAnimations: boolean;                   // Enable UI animations
  autoAdvancePhases: boolean;                  // Auto-advance when timers expire
  skipConfirmations: boolean;                  // Skip confirmation dialogs
  showTimers: boolean;                         // Show countdown timers
}

export interface UIConfig {
  theme: 'dark' | 'light';        // UI theme
  animationDuration: number;       // Animation duration in milliseconds
  enableHapticFeedback: boolean;   // Enable haptic feedback on mobile
  fontSizeMultiplier: number;      // Font size multiplier for accessibility
  highContrastMode: boolean;       // High contrast mode for accessibility
}

export interface AzureTTSConfig {
  voice: string;       // Azure Neural voice name (e.g., "en-US-GuyNeural")
  style: string;       // Speaking style (e.g., "serious", "cheerful")
  rate: string;        // Speech rate ("slow", "medium", "fast")
  pitch: string;       // Pitch ("low", "medium", "high")
}

export interface ElevenLabsTTSConfig {
  voiceId: string;         // ElevenLabs voice ID
  modelId: string;         // Model ID (e.g., "eleven_monolingual_v1")
  stability: number;       // Voice stability (0-1)
  similarityBoost: number; // Similarity boost (0-1)
}

export interface TTSConfig {
  provider: 'browser' | 'azure' | 'elevenlabs';  // TTS provider to use
  azure?: AzureTTSConfig;                         // Azure-specific settings
  elevenlabs?: ElevenLabsTTSConfig;               // ElevenLabs-specific settings
}

export interface GameConfig {
  timing: TimingConfig;
  logging: LoggingConfig;
  players: PlayersConfig;
  features: FeaturesConfig;
  ui: UIConfig;
  tts?: TTSConfig;        // Text-to-speech configuration
  version: string;
}

/**
 * Deep merge function for configuration objects
 */
function deepMerge(target: any, source: any): any {
  const result = { ...target };
  
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  
  return result;
}

/**
 * Load configuration with environment-specific overrides
 */
function loadConfig(): GameConfig {
  try {
    let config = {
      timing: configData.game.timing,
      logging: configData.logging,
      players: configData.game.players,
      features: configData.game.features,
      ui: configData.ui,
      tts: configData.tts as TTSConfig,
      version: configData.version,
    };

    // Apply environment-specific overrides
    const isDevelopment = typeof process !== 'undefined' && process.env?.NODE_ENV === 'development';
    const isProduction = typeof process !== 'undefined' && process.env?.NODE_ENV === 'production';

    if (isDevelopment && configData.environment.development) {
      config = deepMerge(config, {
        timing: configData.environment.development.timing || {},
        logging: configData.environment.development.logging || {},
      });
    }

    if (isProduction && configData.environment.production) {
      config = deepMerge(config, {
        logging: configData.environment.production.logging || {},
      });
    }

    // Apply environment variable overrides (with safety checks)
    if (typeof process !== 'undefined' && process.env) {
      if (process.env.NEXT_PUBLIC_NIGHT_ACTION_TIME) {
        const value = parseInt(process.env.NEXT_PUBLIC_NIGHT_ACTION_TIME, 10);
        if (!isNaN(value) && value > 0) {
          config.timing.nightActionTime = value;
        }
      }

      if (process.env.NEXT_PUBLIC_DISCUSSION_TIME) {
        const value = parseInt(process.env.NEXT_PUBLIC_DISCUSSION_TIME, 10);
        if (!isNaN(value) && value > 0) {
          config.timing.discussionTime = value;
        }
      }

      if (process.env.NEXT_PUBLIC_VOTING_TIME) {
        const value = parseInt(process.env.NEXT_PUBLIC_VOTING_TIME, 10);
        if (!isNaN(value) && value > 0) {
          config.timing.votingTime = value;
        }
      }

      if (process.env.NEXT_PUBLIC_DISABLE_INSIGHTS === 'true') {
        config.logging.enableApplicationInsights = false;
      }

      if (process.env.NEXT_PUBLIC_ENABLE_DEBUG_LOGGING === 'true') {
        config.logging.enableConsoleLogging = true;
        config.logging.consoleLogLevel = 'debug';
      }

      // Ensure Application Insights is only enabled if connection string exists
      if (isProduction && !process.env.NEXT_PUBLIC_APPLICATIONINSIGHTS_CONNECTION_STRING) {
        config.logging.enableApplicationInsights = false;
      }
    }

    return config as GameConfig;
  } catch (error) {
    console.error('Error loading configuration, using defaults:', error);
    
    // Return safe defaults if configuration loading fails
    return {
      timing: {
        nightActionTime: 60,
        discussionTime: 300,
        votingTime: 45,
        resultsDisplayTime: 10,
        roleRevealTime: 15,
        kamikazeRevengeTime: 30,
        transitionDelay: 2000,
        nightTurnTransitionDelay: 5000,
        audioPromptReplayDelay: 10
      },
      logging: {
        enableApplicationInsights: false,
        logUserActions: true,
        logGameEvents: true,
        logExceptions: true,
        logMetrics: true,
        logSessionAnalytics: true,
        enableConsoleLogging: true,
        consoleLogLevel: 'info'
      },
      players: {
        minPlayers: 4,
        maxPlayers: 20
      },
      features: {
        enableDevicePassingConfirmations: true,
        showRoleHints: true,
        enableAnimations: true,
        autoAdvancePhases: false,
        skipConfirmations: false,
        showTimers: true
      },
      ui: {
        theme: 'dark',
        animationDuration: 300,
        enableHapticFeedback: true,
        fontSizeMultiplier: 1.0,
        highContrastMode: false
      },
      tts: {
        provider: 'azure',
        azure: {
          voice: 'en-US-GuyNeural',
          style: 'serious',
          rate: '0%',
          pitch: '0%'
        },
        elevenlabs: {
          voiceId: 'TxGEqnHWrfWFTfGW9XjX',
          modelId: 'eleven_monolingual_v1',
          stability: 0.5,
          similarityBoost: 0.75
        }
      },
      version: '1.0.0'
    };
  }
}

/**
 * Game configuration instance
 */
export const gameConfig = loadConfig();

/**
 * Configuration utilities
 */
export const configUtils = {
  /**
   * Check if a specific type of logging is enabled
   */
  isLoggingEnabled(type: keyof LoggingConfig): boolean {
    return gameConfig.logging.enableApplicationInsights && gameConfig.logging[type] === true;
  },

  /**
   * Get timing value in milliseconds
   */
  getTimingMs(key: keyof TimingConfig): number {
    return gameConfig.timing[key] * 1000;
  },

  /**
   * Format time duration for display
   */
  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${seconds}s`;
  },

  /**
   * Check if a game feature is enabled
   */
  isFeatureEnabled(feature: keyof FeaturesConfig): boolean {
    return gameConfig.features[feature] === true;
  },

  /**
   * Get console logging enabled status
   */
  shouldLogToConsole(level: 'debug' | 'info' | 'warn' | 'error'): boolean {
    if (!gameConfig.logging.enableConsoleLogging) return false;
    
    const levels = ['debug', 'info', 'warn', 'error'];
    const configLevel = levels.indexOf(gameConfig.logging.consoleLogLevel);
    const messageLevel = levels.indexOf(level);
    
    return messageLevel >= configLevel;
  },

  /**
   * Get timing configuration for a specific environment
   */
  getEnvironmentTiming(): TimingConfig {
    return gameConfig.timing;
  },

  /**
   * Update configuration at runtime (for user preferences)
   */
  updateConfig(updates: Partial<GameConfig>): void {
    Object.assign(gameConfig, deepMerge(gameConfig, updates));
  },

  /**
   * Get the full configuration object
   */
  getFullConfig(): GameConfig {
    return gameConfig;
  },

  /**
   * Validate configuration values
   */
  validateConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate timing values
    if (gameConfig.timing.nightActionTime < 5) {
      errors.push('Night action time must be at least 5 seconds');
    }
    
    if (gameConfig.timing.discussionTime < 30) {
      errors.push('Discussion time must be at least 30 seconds');
    }
    
    if (gameConfig.timing.votingTime < 10) {
      errors.push('Voting time must be at least 10 seconds');
    }

    // Validate player limits
    if (gameConfig.players.minPlayers < 3) {
      errors.push('Minimum players must be at least 3');
    }
    
    if (gameConfig.players.maxPlayers > 50) {
      errors.push('Maximum players cannot exceed 50');
    }
    
    if (gameConfig.players.minPlayers >= gameConfig.players.maxPlayers) {
      errors.push('Minimum players must be less than maximum players');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },
};

export default gameConfig;