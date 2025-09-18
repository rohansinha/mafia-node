/**
 * Online Play Placeholder Component
 * 
 * Professional placeholder screen for future online multiplayer functionality.
 * Displays planned features, development status, and provides navigation
 * back to mode selection to try offline mode instead.
 * 
 * Features to be implemented:
 * - Individual device support for each player
 * - Real-time synchronization across devices
 * - Room creation and joining system
 * - Remote play capabilities
 */
'use client';

import { useGame } from '@/context/GameContext';

export default function OnlinePlay() {
  const { resetGame } = useGame();

  /**
   * Returns user to mode selection by resetting game state
   */
  const handleGoBack = () => {
    resetGame();
  };

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-lg p-8 space-y-6 max-w-md mx-auto">
      <div className="text-center space-y-4">
        <div className="text-6xl">🚧</div>
        <h1 className="text-3xl font-bold text-white">Coming Soon!</h1>
        <p className="text-white/80 text-lg">Online multiplayer mode</p>
      </div>

      <div className="space-y-4 text-center">
        <div className="bg-blue-600/20 border border-blue-500 rounded-lg p-6">
          <h3 className="text-xl font-bold text-blue-200 mb-3">🌐 Online Features</h3>
          <ul className="text-blue-300 text-sm space-y-2 text-left">
            <li>• Each player uses their own device</li>
            <li>• Play remotely with friends anywhere</li>
            <li>• Real-time synchronization</li>
            <li>• Private game rooms with codes</li>
            <li>• Voice chat integration</li>
            <li>• Cross-platform compatibility</li>
          </ul>
        </div>

        <div className="bg-yellow-600/20 border border-yellow-500 rounded-lg p-4">
          <h4 className="text-lg font-bold text-yellow-200 mb-2">📅 Development Status</h4>
          <p className="text-yellow-300 text-sm">
            We&apos;re working hard to bring you online multiplayer! 
            This feature is currently in development and will be available soon.
          </p>
        </div>

        <div className="bg-green-600/20 border border-green-500 rounded-lg p-4">
          <h4 className="text-lg font-bold text-green-200 mb-2">💡 Meanwhile...</h4>
          <p className="text-green-300 text-sm">
            Try our Local Offline mode! Perfect for in-person gatherings 
            where everyone can share one device.
          </p>
        </div>
      </div>

      <button
        onClick={handleGoBack}
        className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
      >
        ← Back to Mode Selection
      </button>

      <div className="text-center text-white/60 text-xs">
        <p>Want to be notified when online mode is ready?</p>
        <p className="text-white/40 mt-1">Follow our updates for release announcements!</p>
      </div>
    </div>
  );
}