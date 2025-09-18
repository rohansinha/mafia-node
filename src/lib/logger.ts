/**
 * Application Insights Configuration
 * 
 * Configures Azure Application Insights for telemetry, logging, and exception tracking.
 * This file initializes monitoring for the Mafia game application.
 * 
 * Features:
 * - Automatic exception tracking
 * - Custom event logging for game actions
 * - Performance monitoring
 * - User session tracking
 * - Configurable logging based on game configuration
 */

import { ApplicationInsights } from '@microsoft/applicationinsights-web';
import { gameConfig, configUtils } from '@/config/configManager';

// Initialize Application Insights if connection string is available and logging is enabled
let appInsights: ApplicationInsights | null = null;

try {
  if (typeof window !== 'undefined' && 
      gameConfig.logging.enableApplicationInsights &&
      process.env.NEXT_PUBLIC_APPLICATIONINSIGHTS_CONNECTION_STRING) {
    appInsights = new ApplicationInsights({
      config: {
        connectionString: process.env.NEXT_PUBLIC_APPLICATIONINSIGHTS_CONNECTION_STRING,
        enableAutoRouteTracking: true,
        enableCorsCorrelation: true,
        enableRequestHeaderTracking: true,
        enableResponseHeaderTracking: true,
      },
    });

    appInsights.loadAppInsights();
    appInsights.trackPageView(); // Initial page view
    
    if (configUtils.shouldLogToConsole('info')) {
      console.log('✅ Application Insights initialized successfully');
    }
  } else if (typeof window !== 'undefined' && configUtils.shouldLogToConsole('info')) {
    if (!gameConfig.logging.enableApplicationInsights) {
      console.log('ℹ️ Application Insights disabled by configuration');
    } else {
      console.log('⚠️ Application Insights connection string not found');
    }
  }
} catch (error) {
  console.error('❌ Failed to initialize Application Insights:', error);
  appInsights = null;
}

/**
 * Logger utility for the Mafia game
 */
export class GameLogger {
  /**
   * Log game events (role assignments, player actions, etc.)
   */
  static logGameEvent(eventName: string, properties: Record<string, any> = {}, metrics: Record<string, number> = {}) {
    if (configUtils.isLoggingEnabled('logGameEvents') && appInsights) {
      appInsights.trackEvent({
        name: `Game_${eventName}`,
        properties: {
          timestamp: new Date().toISOString(),
          ...properties
        },
        measurements: metrics
      });
    }
    
    // Console logging based on configuration
    if (configUtils.shouldLogToConsole('info')) {
      console.log(`🎮 ${eventName}:`, properties);
    }
  }

  /**
   * Log exceptions with context
   */
  static logException(error: Error, context: Record<string, any> = {}) {
    if (configUtils.isLoggingEnabled('logExceptions') && appInsights) {
      appInsights.trackException({
        exception: error,
        properties: {
          timestamp: new Date().toISOString(),
          context: JSON.stringify(context)
        }
      });
    }
    
    // Console logging based on configuration
    if (configUtils.shouldLogToConsole('error')) {
      console.error('❌ Exception:', error.message, context);
    }
  }

  /**
   * Log performance metrics
   */
  static logMetric(name: string, value: number, properties: Record<string, any> = {}) {
    if (configUtils.isLoggingEnabled('logMetrics') && appInsights) {
      appInsights.trackMetric({
        name: `Game_${name}`,
        average: value
      }, properties);
    }
    
    if (configUtils.shouldLogToConsole('info')) {
      console.log(`📊 Metric ${name}:`, value, properties);
    }
  }

  /**
   * Log user actions for analytics
   */
  static logUserAction(action: string, userId: string, properties: Record<string, any> = {}) {
    if (configUtils.isLoggingEnabled('logUserActions')) {
      this.logGameEvent('UserAction', {
        action,
        userId,
        ...properties
      });
    }
  }

  /**
   * Track custom dimensions for game analytics
   */
  static trackGameSession(sessionData: {
    playerCount: number;
    gameMode: string;
    assignmentMode: string;
    duration?: number;
    winner?: string;
  }) {
    if (configUtils.isLoggingEnabled('logSessionAnalytics')) {
      this.logGameEvent('GameSession', sessionData, {
        playerCount: sessionData.playerCount,
        duration: sessionData.duration || 0
      });
    }
  }
}

export default GameLogger;