# Game Configuration

This document explains how to configure the Mafia game using the JSON-based configuration system.

## Configuration Files

- **`src/config/gameConfig.json`** - Main configuration file with all game settings
- **`src/config/configManager.ts`** - TypeScript utility for loading and managing configuration

## Configuration Structure

### Game Timing Settings

Controls how long players have for various game phases:

```json
{
  "game": {
    "timing": {
      "nightActionTime": 60,        // Seconds each player gets for night actions
      "discussionTime": 300,        // Seconds for day phase discussion
      "votingTime": 45,             // Seconds each player gets to vote
      "resultsDisplayTime": 10,     // Seconds to show vote results
      "roleRevealTime": 15,         // Seconds to show role assignments
      "kamikazeRevengeTime": 30,    // Seconds for kamikaze revenge selection
      "transitionDelay": 2000       // Milliseconds between UI transitions
    }
  }
}
```

### Logging Configuration

Controls Application Insights and console logging:

```json
{
  "logging": {
    "enableApplicationInsights": true,    // Master toggle for Azure Application Insights
    "logUserActions": true,              // Log votes, night actions, etc.
    "logGameEvents": true,               // Log phase changes, eliminations
    "logExceptions": true,               // Log errors and exceptions
    "logMetrics": true,                  // Log performance metrics
    "logSessionAnalytics": true,         // Log game session data
    "enableConsoleLogging": true,        // Enable console.log output
    "consoleLogLevel": "info"            // Console log level (debug/info/warn/error)
  }
}
```

### Player and Feature Settings

```json
{
  "game": {
    "players": {
      "minPlayers": 4,                   // Minimum players to start
      "maxPlayers": 20                   // Maximum players allowed
    },
    "features": {
      "enableDevicePassingConfirmations": true,
      "showRoleHints": true,
      "enableAnimations": true,
      "autoAdvancePhases": false,
      "skipConfirmations": false,
      "showTimers": true
    }
  }
}
```

## Environment Overrides

The configuration supports environment-specific overrides:

### Development Environment
```json
{
  "environment": {
    "development": {
      "timing": {
        "nightActionTime": 20,           // Faster for testing
        "discussionTime": 60,
        "votingTime": 15
      },
      "logging": {
        "enableApplicationInsights": false,  // Disabled in development
        "consoleLogLevel": "debug"
      }
    }
  }
}
```

### Production Environment
```json
{
  "environment": {
    "production": {
      "logging": {
        "enableConsoleLogging": false,      // Reduce console noise
        "consoleLogLevel": "error"
      }
    }
  }
}
```

## Environment Variables

You can override specific settings using environment variables:

### Azure App Service Configuration

Add these to your App Service → Configuration → Application settings:

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_NIGHT_ACTION_TIME` | Override night action time | `30` |
| `NEXT_PUBLIC_DISCUSSION_TIME` | Override discussion time | `180` |
| `NEXT_PUBLIC_VOTING_TIME` | Override voting time | `30` |
| `NEXT_PUBLIC_DISABLE_INSIGHTS` | Disable Application Insights | `true` |
| `NEXT_PUBLIC_ENABLE_DEBUG_LOGGING` | Enable debug logging | `true` |
| `NEXT_PUBLIC_APPLICATIONINSIGHTS_CONNECTION_STRING` | Application Insights connection | `InstrumentationKey=...` |

## Usage in Code

### Import Configuration
```typescript
import { gameConfig, configUtils } from '@/config/configManager';
```

### Access Settings
```typescript
// Get timing values
const nightTime = gameConfig.timing.nightActionTime;
const votingTime = configUtils.getTimingMs('votingTime'); // In milliseconds

// Check if features are enabled
if (configUtils.isFeatureEnabled('showTimers')) {
  // Show countdown timers
}

// Check logging settings
if (configUtils.isLoggingEnabled('logUserActions')) {
  // Log user actions
}
```

### Format Time for Display
```typescript
const formattedTime = configUtils.formatTime(180); // "3:00"
const shortTime = configUtils.formatTime(45);      // "45s"
```

### Runtime Configuration Updates
```typescript
// Update configuration (for user preferences)
configUtils.updateConfig({
  ui: {
    theme: 'light',
    enableAnimations: false
  }
});
```

## Validation

The configuration includes validation to ensure sensible values:

```typescript
const validation = configUtils.validateConfig();
if (!validation.isValid) {
  console.error('Configuration errors:', validation.errors);
}
```

## Best Practices

1. **Never commit sensitive data** - Use environment variables for connection strings
2. **Test timing changes** - Ensure game flow works with new timing values
3. **Use environment overrides** - Keep development settings separate from production
4. **Validate changes** - Use the validation utility when modifying configuration
5. **Document custom settings** - Add comments for any custom timing values

## Example Configuration Changes

### Quick Game Mode (for testing)
```json
{
  "game": {
    "timing": {
      "nightActionTime": 10,
      "discussionTime": 30,
      "votingTime": 10
    }
  }
}
```

### Tournament Mode (longer thinking time)
```json
{
  "game": {
    "timing": {
      "nightActionTime": 120,
      "discussionTime": 600,
      "votingTime": 60
    }
  }
}
```

### Minimal Logging (performance focused)
```json
{
  "logging": {
    "enableApplicationInsights": true,
    "logUserActions": false,
    "logGameEvents": true,
    "logExceptions": true,
    "logMetrics": false,
    "logSessionAnalytics": true
  }
}
```