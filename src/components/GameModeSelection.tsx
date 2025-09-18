/**
 * Game Mode Selection Component
 * 
 * Initial screen that allows users to choose between:
 * - Local Offline mode: Device-passing gameplay for in-person groups
 * - Online Multiplayer mode: Individual devices for remote play (coming soon)
 * 
 * Provides clear descriptions of each mode's features and availability status.
 */
'use client';

import { useGame } from '@/context/GameContext';
import { GameMode } from '@/types/game';

export default function GameModeSelection() {
  const { selectGameMode } = useGame();

  /**
   * Handles game mode selection and transitions to appropriate next phase
   */
  const handleModeSelect = (mode: GameMode) => {
    selectGameMode(mode);
  };

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-lg p-8 space-y-6 max-w-md mx-auto">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-white">🕵️ Mafia Game</h1>
        <p className="text-white/80 text-lg">Choose your game mode</p>
      </div>

      <div className="space-y-4">
        {/* Local Offline Mode - Fully functional device-passing gameplay */}
        <button
          onClick={() => handleModeSelect(GameMode.OFFLINE)}
          className="w-full p-6 bg-green-600/20 border-2 border-green-500 rounded-lg 
            hover:bg-green-600/30 transition-colors group"
        >
          <div className="text-center space-y-2">
            <div className="text-4xl">📱</div>
            <h3 className="text-xl font-bold text-green-200">Local Offline</h3>
            <p className="text-green-300 text-sm">
              Pass one device around your group. Perfect for in-person gatherings!
            </p>
            <div className="text-green-400 text-xs mt-3 opacity-80">
              ✓ Available now • ✓ No internet required • ✓ Private & secure
            </div>
          </div>
        </button>

        {/* Online Multiplayer Mode - Future implementation placeholder */}
        <button
          onClick={() => handleModeSelect(GameMode.ONLINE)}
          className="w-full p-6 bg-blue-600/20 border-2 border-blue-500 rounded-lg 
            hover:bg-blue-600/30 transition-colors group relative"
        >
          <div className="text-center space-y-2">
            <div className="text-4xl">🌐</div>
            <h3 className="text-xl font-bold text-blue-200">Online Multiplayer</h3>
            <p className="text-blue-300 text-sm">
              Each player uses their own device. Play remotely with friends!
            </p>
            <div className="text-blue-400 text-xs mt-3 opacity-80">
              🚧 Coming soon • ✓ Remote play • ✓ Individual devices
            </div>
          </div>
          
          {/* Coming Soon Badge */}
          <div className="absolute top-2 right-2 bg-yellow-500 text-yellow-900 text-xs font-bold px-2 py-1 rounded">
            SOON
          </div>
        </button>
      </div>

      <div className="text-center text-white/60 text-xs">
        <p>Choose the mode that works best for your group!</p>
      </div>
    </div>
  );
}