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
 */

import { ApplicationInsights } from '@microsoft/applicationinsights-web';

// Initialize Application Insights if connection string is available
let appInsights: ApplicationInsights | null = null;

if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_APPLICATIONINSIGHTS_CONNECTION_STRING) {
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
  
  console.log('✅ Application Insights initialized successfully');
} else if (typeof window !== 'undefined') {
  console.log('⚠️ Application Insights connection string not found');
}

/**
 * Logger utility for the Mafia game
 */
export class GameLogger {
  /**
   * Log game events (role assignments, player actions, etc.)
   */
  static logGameEvent(eventName: string, properties: Record<string, any> = {}, metrics: Record<string, number> = {}) {
    if (appInsights) {
      appInsights.trackEvent({
        name: `Game_${eventName}`,
        properties: {
          timestamp: new Date().toISOString(),
          ...properties
        },
        measurements: metrics
      });
    }
    
    // Also log to console for development
    console.log(`🎮 ${eventName}:`, properties);
  }

  /**
   * Log exceptions with context
   */
  static logException(error: Error, context: Record<string, any> = {}) {
    if (appInsights) {
      appInsights.trackException({
        exception: error,
        properties: {
          timestamp: new Date().toISOString(),
          context: JSON.stringify(context)
        }
      });
    }
    
    // Also log to console
    console.error('❌ Exception:', error.message, context);
  }

  /**
   * Log performance metrics
   */
  static logMetric(name: string, value: number, properties: Record<string, any> = {}) {
    if (appInsights) {
      appInsights.trackMetric({
        name: `Game_${name}`,
        average: value
      }, properties);
    }
    
    console.log(`📊 Metric ${name}:`, value, properties);
  }

  /**
   * Log user actions for analytics
   */
  static logUserAction(action: string, userId: string, properties: Record<string, any> = {}) {
    this.logGameEvent('UserAction', {
      action,
      userId,
      ...properties
    });
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
    this.logGameEvent('GameSession', sessionData, {
      playerCount: sessionData.playerCount,
      duration: sessionData.duration || 0
    });
  }
}

export default GameLogger;