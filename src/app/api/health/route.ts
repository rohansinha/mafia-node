/**
 * Health Check API Route
 * 
 * Provides a simple health check endpoint for Azure App Service
 * to verify that the application is running correctly.
 * 
 * This endpoint returns:
 * - Application status
 * - Configuration status
 * - Environment information
 * - Build information
 */

import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Basic health check data
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'unknown',
      uptime: process.uptime ? process.uptime() : 'unknown',
      configuration: {
        applicationInsightsConfigured: !!process.env.NEXT_PUBLIC_APPLICATIONINSIGHTS_CONNECTION_STRING,
        nodeEnv: process.env.NODE_ENV,
        hasConfigOverrides: !!(
          process.env.NEXT_PUBLIC_NIGHT_ACTION_TIME ||
          process.env.NEXT_PUBLIC_DISCUSSION_TIME ||
          process.env.NEXT_PUBLIC_VOTING_TIME
        )
      },
      build: {
        nextVersion: '14.2.7',
        buildTime: new Date().toISOString()
      }
    };

    return NextResponse.json(healthData, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-cache',
      }
    });
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'unhealthy', 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    );
  }
}