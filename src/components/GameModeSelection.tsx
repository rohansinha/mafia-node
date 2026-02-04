/**
 * Game Mode Selection Component
 * 
 * Initial screen that allows users to choose between:
 * - Local Offline mode: Device-passing gameplay for in-person groups (single device)
 * - Local Multiplayer: Host (on localhost) or Join (on remote devices)
 * - Online Multiplayer mode: Individual devices for remote play (coming soon)
 * 
 * Provides clear descriptions of each mode's features and availability status.
 */
'use client';

import { useState, useEffect } from 'react';
import { useGame } from '@/context/GameContext';
import { GameMode } from '@/types/game';

export default function GameModeSelection() {
  const { selectGameMode } = useGame();
  // Use state to avoid hydration mismatch - check host status only on client
  const [isHost, setIsHost] = useState<boolean | null>(null);

  useEffect(() => {
    const hostname = window.location.hostname;
    setIsHost(hostname === 'localhost' || hostname === '127.0.0.1');
  }, []);

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
        {/* Local Offline Mode - Device-passing gameplay */}
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
              ✓ Single device • ✓ No internet required • ✓ Device passing
            </div>
          </div>
        </button>

        {/* Local Multiplayer Mode - Host or Join based on device */}
        <button
          onClick={() => handleModeSelect(GameMode.LOCAL_MULTIPLAYER)}
          className="w-full p-6 bg-purple-600/20 border-2 border-purple-500 rounded-lg 
            hover:bg-purple-600/30 transition-colors group"
        >
          <div className="text-center space-y-2">
            <div className="text-4xl">{isHost === null ? '📡' : isHost ? '🖥️' : '📡'}</div>
            <h3 className="text-xl font-bold text-purple-200">
              {isHost === null ? 'Local Multiplayer' : isHost ? 'Host Multiplayer Game' : 'Join Game'}
            </h3>
            <p className="text-purple-300 text-sm">
              {isHost === null 
                ? 'Multiple devices on same network'
                : isHost 
                  ? 'Set up and host a game. Other devices on your network can join.'
                  : 'Connect to a game hosted on another device. Enter the host address and session code.'
              }
            </p>
            <div className="text-purple-400 text-xs mt-3 opacity-80">
              {isHost === null
                ? '✓ Same WiFi network • ✓ Multiple devices'
                : isHost
                  ? '✓ Configure game • ✓ Players join you • ✓ Same WiFi network'
                  : '✓ Same WiFi network • ✓ Enter host address • ✓ Enter session code'
              }
            </div>
          </div>
        </button>

        {/* Online Multiplayer Mode - Future implementation placeholder */}
        <button
          onClick={() => handleModeSelect(GameMode.ONLINE)}
          className="w-full p-6 bg-blue-600/20 border-2 border-blue-500 rounded-lg 
            hover:bg-blue-600/30 transition-colors group relative opacity-60"
          disabled
        >
          <div className="text-center space-y-2">
            <div className="text-4xl">🌐</div>
            <h3 className="text-xl font-bold text-blue-200">Online Multiplayer</h3>
            <p className="text-blue-300 text-sm">
              Play remotely over the internet. Join rooms with a code!
            </p>
            <div className="text-blue-400 text-xs mt-3 opacity-80">
              🚧 Coming soon • ✓ Remote play • ✓ Room codes
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