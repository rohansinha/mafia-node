/**
 * Setup Phase Component - Game configuration and player setup
 * 
 * Handles the complete game setup process including:
 * - Assignment mode selection (Recommended vs Custom)
 * - Player name entry and management
 * - Custom role selection and configuration
 * - Game initialization and role assignment
 * 
 * Setup flow:
 * 1. Mode selection: Recommended (balanced) or Custom (user-defined) roles
 * 2. For Recommended: Enter player names → automatic role assignment
 * 3. For Custom: Set player count → select roles → enter names → assignment
 * 
 * Features:
 * - Dynamic player list management (add/remove players)
 * - Role validation for Custom mode
 * - Seamless transition to game start
 */
'use client';

import { useState } from 'react';
import { useGame } from '@/context/GameContext';
import { AssignmentMode, Role } from '@/types/game';
import { GameLogger } from '@/lib/logger';
import { gameConfig, configUtils } from '@/config/configManager';

export default function SetupPhase() {
  // Component state for managing setup flow
  const [step, setStep] = useState<'mode' | 'players' | 'custom-roles' | 'roles'>('mode');
  const [assignmentMode, setAssignmentMode] = useState<AssignmentMode>(AssignmentMode.RECOMMENDED);
  const [playerNames, setPlayerNames] = useState<string[]>(['']);               // Player name inputs
  const [selectedRoles, setSelectedRoles] = useState<Role[]>([]);              // Custom mode role selection
  const [totalPlayers, setTotalPlayers] = useState<number>(6);                 // Custom mode player count
  
  // State for player-by-player role revelation
  const [currentRevealIndex, setCurrentRevealIndex] = useState(0);
  const [showRole, setShowRole] = useState(false);
  
  const { gameState, initializeGame, startGame, getAvailableCustomRoles } = useGame();

  /**
   * Adds a new empty player name input field
   */
  const addPlayer = () => {
    setPlayerNames([...playerNames, '']);
  };

  /**
   * Removes a player name input at the specified index
   */
  const removePlayer = (index: number) => {
    if (playerNames.length > 1) {
      setPlayerNames(playerNames.filter((_, i) => i !== index));
    }
  };

  /**
   * Updates the player name at the specified index
   */
  const updatePlayerName = (index: number, name: string) => {
    const newNames = [...playerNames];
    newNames[index] = name;
    setPlayerNames(newNames);
  };

  /**
   * Toggles role selection in custom mode
   */
  const toggleRole = (role: Role) => {
    setSelectedRoles(prev => 
      prev.includes(role) 
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  /**
   * Handles assignment mode selection and navigation
   */
  const handleModeSelect = (mode: AssignmentMode) => {
    setAssignmentMode(mode);
    if (mode === AssignmentMode.RECOMMENDED) {
      setStep('players');  // Go directly to player names for recommended mode
    } else {
      setStep('custom-roles');  // Go to role selection for custom mode
    }
  };

  /**
   * Validates custom role selection and proceeds to player setup
   */
  const handleCustomRolesNext = () => {
    // Ensure we have room for at least 1 Citizen and 1 Mafia + selected roles
    if (selectedRoles.length + 2 <= totalPlayers) {
      const names = Array.from({ length: totalPlayers }, (_, i) => `Player ${i + 1}`);
      setPlayerNames(names);
      setStep('players');
    }
  };

  /**
   * Initializes the game with validated player names and assignment mode
   */
  const handleInitialize = () => {
    try {
      const validNames = playerNames.filter(name => name.trim() !== '');
      const minPlayers = gameConfig.players.minPlayers;
      const maxPlayers = gameConfig.players.maxPlayers;
      
      if (validNames.length >= minPlayers && validNames.length <= maxPlayers) {
        GameLogger.logGameEvent('SetupInitialize', {
          assignmentMode,
          playerCount: validNames.length,
          hasCustomConfig: assignmentMode === AssignmentMode.CUSTOM,
          selectedRoles: assignmentMode === AssignmentMode.CUSTOM ? selectedRoles : undefined
        });

        if (assignmentMode === AssignmentMode.CUSTOM) {
          initializeGame(validNames, assignmentMode, { selectedRoles, totalPlayers });
        } else {
          initializeGame(validNames, assignmentMode);
        }
        setStep('roles');  // Show role assignments before starting
      } else {
        GameLogger.logGameEvent('SetupError', { 
          error: validNames.length < minPlayers ? 'insufficient_players' : 'too_many_players',
          playerCount: validNames.length,
          minRequired: minPlayers,
          maxAllowed: maxPlayers
        });
      }
    } catch (error) {
      GameLogger.logException(error as Error, { 
        action: 'handleInitialize',
        assignmentMode,
        playerCount: playerNames.length
      });
    }
  };

  /**
   * Starts the actual game after role assignments are shown
   */
  const handleStartGame = () => {
    try {
      GameLogger.logGameEvent('GameStartFromSetup', {
        playerCount: gameState.players.length,
        assignmentMode: gameState.assignmentMode
      });
      startGame();
    } catch (error) {
      GameLogger.logException(error as Error, { action: 'handleStartGame' });
    }
  };

  /**
   * Handles revealing the role to the current player
   */
  const handleRevealRole = () => {
    setShowRole(true);
  };

  /**
   * Moves to the next player's role revelation or starts the game if all are done
   */
  const handleNextPlayer = () => {
    if (currentRevealIndex < gameState.players.length - 1) {
      setCurrentRevealIndex(currentRevealIndex + 1);
      setShowRole(false);
    } else {
      // All players have seen their roles, start the game
      handleStartGame();
    }
  };

  /**
   * Resets role revelation to start over
   */
  const handleRestartRevelation = () => {
    setCurrentRevealIndex(0);
    setShowRole(false);
  };

  /**
   * Returns appropriate color styling for each role type
   */
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Mafia':
      case 'Godfather':
        return 'bg-red-600 text-white';        // Red for Mafia team
      case 'Detective':
        return 'bg-blue-600 text-white';       // Blue for Detective
      case 'Doctor':
        return 'bg-green-600 text-white';      // Green for Doctor
      case 'Silencer':
        return 'bg-purple-600 text-white';     // Purple for Silencer
      case 'Kamikaze':
        return 'bg-orange-600 text-white';     // Orange for Kamikaze
      case 'Joker':
        return 'bg-yellow-600 text-black';     // Yellow for Joker (black text for contrast)
      case 'Hooker':
        return 'bg-pink-600 text-white';       // Pink for Hooker
      default:
        return 'bg-gray-600 text-white';       // Gray for Citizens and others
    }
  };

  /**
   * Returns detailed role description for each role type
   */
  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'Mafia':
        return 'Your goal: Eliminate all non-Mafia players';
      case 'Godfather':
        return 'Your goal: Lead the Mafia to victory. Immune to Detective and Hooker';
      case 'Detective':
        return 'Your goal: Investigate and find the Mafia';
      case 'Doctor':
        return 'Your goal: Protect players from the Mafia';
      case 'Silencer':
        return 'Your goal: Mute players during discussion phase';
      case 'Kamikaze':
        return 'Your goal: Take someone with you if voted out';
      case 'Joker':
        return 'Your goal: Get voted out to win!';
      case 'Hooker':
        return 'Your goal: Block other players\' night actions';
      case 'Citizen':
        return 'Your goal: Find and eliminate the Mafia';
      default:
        return 'Your goal: Help your team win';
    }
  };

  // Assignment Mode Selection Screen
  if (step === 'mode') {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 space-y-6">
        <h2 className="text-2xl font-bold text-white text-center">Choose Assignment Mode</h2>
        
        <div className="space-y-4">
          {/* Recommended mode - balanced automatic assignment */}
          <button
            onClick={() => handleModeSelect(AssignmentMode.RECOMMENDED)}
            className="w-full p-4 bg-white/5 hover:bg-white/10 border border-white/20 rounded-lg text-left transition-colors"
          >
            <h3 className="text-lg font-semibold text-white mb-2">🎯 Recommended</h3>
            <p className="text-white/70 text-sm">
              Automatically assigns roles based on player count. Perfect for new players and balanced gameplay.
            </p>
            <div className="text-white/60 text-xs mt-2 space-y-1">
              <p>• 4-6 players: 1 Mafia, 1 Detective, rest Citizens</p>
              <p>• 7+ players: + Doctor</p>
              <p>• 8+ players: Godfather replaces Mafia</p>
              <p>• 10+ players: + Joker</p>
            </div>
          </button>

          <button
            onClick={() => handleModeSelect(AssignmentMode.CUSTOM)}
            className="w-full p-4 bg-white/5 hover:bg-white/10 border border-white/20 rounded-lg text-left transition-colors"
          >
            <h3 className="text-lg font-semibold text-white mb-2">⚙️ Custom</h3>
            <p className="text-white/70 text-sm">
              Select specific roles you want to include. Great for experienced players who want to try different combinations.
            </p>
            <p className="text-white/60 text-xs mt-2">
              Choose from Detective, Doctor, Silencer, Kamikaze, Joker, Godfather, and Hooker
            </p>
          </button>
        </div>
      </div>
    );
  }

  // Custom Role Selection Screen
  if (step === 'custom-roles') {
    const availableRoles = getAvailableCustomRoles();
    const remainingSlots = totalPlayers - selectedRoles.length - 2; // -2 for citizen and mafia minimum

    return (
      <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setStep('mode')}
            className="text-white/70 hover:text-white"
          >
            ← Back
          </button>
          <h2 className="text-2xl font-bold text-white">Custom Role Selection</h2>
          <div></div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-white/80 text-sm mb-2">Total Players</label>
            <input
              type="number"
              min="4"
              max="20"
              value={totalPlayers}
              onChange={(e) => setTotalPlayers(parseInt(e.target.value) || 6)}
              className="w-full px-4 py-2 rounded-lg bg-white/20 border border-white/30 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white mb-3">
              Select Special Roles ({selectedRoles.length} selected)
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {availableRoles.map((role) => (
                <button
                  key={role}
                  onClick={() => toggleRole(role)}
                  disabled={!selectedRoles.includes(role) && remainingSlots <= 0}
                  className={`p-3 rounded-lg border-2 transition-colors text-left ${
                    selectedRoles.includes(role)
                      ? 'border-purple-500 bg-purple-600/30'
                      : remainingSlots > 0
                      ? 'border-white/30 bg-white/5 hover:bg-white/10'
                      : 'border-white/10 bg-white/5 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-white font-medium">{role}</span>
                    {selectedRoles.includes(role) && (
                      <span className="text-purple-300">✓</span>
                    )}
                  </div>
                  <p className="text-white/60 text-xs mt-1">
                    {getRoleDescription(role)}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white/5 rounded-lg p-4">
            <h4 className="text-white font-medium mb-2">Role Distribution Preview</h4>
            <div className="text-white/70 text-sm space-y-1">
              <p>Selected special roles: {selectedRoles.length}</p>
              {(() => {
                const remainingPlayers = totalPlayers - selectedRoles.length;
                const recommendedMafia = Math.max(1, Math.floor(totalPlayers / 4));
                const numMafia = Math.min(recommendedMafia, Math.max(1, Math.floor(remainingPlayers / 3)));
                const numCitizens = remainingPlayers - numMafia;
                
                return (
                  <>
                    <p>Citizens: {Math.max(0, numCitizens)}</p>
                    <p>Mafia: {numMafia}</p>
                    <p>Total: {totalPlayers}</p>
                    {numCitizens < 0 && (
                      <p className="text-red-400">⚠️ Too many roles selected! Remove {Math.abs(numCitizens)} role(s).</p>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>

        <button
          onClick={handleCustomRolesNext}
          disabled={(() => {
            const remainingPlayers = totalPlayers - selectedRoles.length;
            const recommendedMafia = Math.max(1, Math.floor(totalPlayers / 4));
            const numMafia = Math.min(recommendedMafia, Math.max(1, Math.floor(remainingPlayers / 3)));
            const numCitizens = remainingPlayers - numMafia;
            return numCitizens < 0;
          })()}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-colors"
        >
          Continue to Player Setup
        </button>
      </div>
    );
  }

  // Player-by-Player Role Revelation Screen
  if (step === 'roles' && gameState.players.length > 0) {
    const currentPlayer = gameState.players[currentRevealIndex];
    
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Role Assignments</h2>
          <span className="text-white/60 text-sm">
            Player {currentRevealIndex + 1} of {gameState.players.length}
          </span>
        </div>
        
        {!showRole ? (
          // Device passing screen - hide role until player is ready
          <div className="text-center space-y-6">
            <div className="bg-white/5 rounded-lg p-6 border border-white/20">
              <h3 className="text-xl font-semibold text-white mb-4">
                Pass the device to:
              </h3>
              <div className="text-3xl font-bold text-purple-300 mb-4">
                {currentPlayer.name}
              </div>
              <p className="text-white/70 text-sm">
                Make sure only {currentPlayer.name} can see the screen, then reveal your role.
              </p>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={handleRevealRole}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-6 rounded-lg transition-colors text-lg"
              >
                I&apos;m {currentPlayer.name} - Show My Role
              </button>
              
              <div className="flex gap-2">
                <button
                  onClick={handleRestartRevelation}
                  className="flex-1 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm"
                >
                  Start Over
                </button>
                {currentRevealIndex > 0 && (
                  <button
                    onClick={() => setCurrentRevealIndex(currentRevealIndex - 1)}
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                  >
                    Previous Player
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          // Role reveal screen - shows the player's role and description
          <div className="text-center space-y-6">
            <div className="bg-white/5 rounded-lg p-6 border border-white/20">
              <h3 className="text-xl font-semibold text-white mb-4">
                {currentPlayer.name}, your role is:
              </h3>
              <div className={`inline-block px-6 py-3 rounded-full font-bold text-lg mb-4 ${getRoleColor(currentPlayer.role)}`}>
                {currentPlayer.role}
              </div>
              <p className="text-white/70 text-sm">
                {getRoleDescription(currentPlayer.role)}
              </p>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={handleNextPlayer}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-lg transition-colors text-lg"
              >
                {currentRevealIndex < gameState.players.length - 1 ? 'Next Player' : 'Start Game'}
              </button>
              
              <button
                onClick={() => setShowRole(false)}
                className="w-full py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm"
              >
                Hide Role (Pass Device)
              </button>
            </div>
          </div>
        )}
        
        {/* Progress indicator */}
        <div className="mt-6">
          <div className="flex justify-between text-white/60 text-xs mb-2">
            <span>Progress</span>
            <span>{currentRevealIndex + 1} / {gameState.players.length}</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2">
            <div 
              className="bg-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentRevealIndex + 1) / gameState.players.length) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>
    );
  }

  // Player Setup Screen
  return (
    <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setStep(assignmentMode === AssignmentMode.CUSTOM ? 'custom-roles' : 'mode')}
          className="text-white/70 hover:text-white"
        >
          ← Back
        </button>
        <h2 className="text-2xl font-bold text-white">Setup Players</h2>
        <span className="text-white/60 text-sm">
          {assignmentMode} Mode
        </span>
      </div>
      
      {assignmentMode === AssignmentMode.CUSTOM ? (
        <div className="bg-white/5 rounded-lg p-4">
          <h3 className="text-white font-medium mb-2">Selected Configuration</h3>
          <div className="text-white/70 text-sm space-y-1">
            <p>Special roles: {selectedRoles.join(', ') || 'None'}</p>
            <p>Total players: {totalPlayers}</p>
          </div>
        </div>
      ) : null}

      <div className="space-y-3">
        {playerNames.map((name, index) => (
          <div key={index} className="flex gap-2">
            <input
              type="text"
              placeholder={`Player ${index + 1} name`}
              value={name}
              onChange={(e) => updatePlayerName(index, e.target.value)}
              className="flex-1 px-4 py-2 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            {playerNames.length > 1 && assignmentMode === AssignmentMode.RECOMMENDED && (
              <button
                onClick={() => removePlayer(index)}
                className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      {assignmentMode === AssignmentMode.RECOMMENDED && (
        <div className="flex gap-2">
          <button
            onClick={addPlayer}
            className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            Add Player
          </button>
        </div>
      )}

      <div className="text-center">
        <div className="text-white/70 text-sm mb-4">
          <p>Minimum 4 players required</p>
          <p>Current players: {playerNames.filter(name => name.trim()).length}</p>
        </div>
        
        <button
          onClick={handleInitialize}
          disabled={playerNames.filter(name => name.trim()).length < 4}
          className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-lg transition-colors"
        >
          Assign Roles
        </button>
      </div>

      {assignmentMode === AssignmentMode.RECOMMENDED && (
        <div className="text-white/60 text-xs space-y-1">
          <p>• 4-6 players: 1 Mafia, 1 Detective, rest Citizens</p>
          <p>• 7+ players: 1 Mafia, 1 Detective, 1 Doctor, rest Citizens</p>
          <p>• 8+ players: Godfather replaces Mafia</p>
          <p>• 10+ players: + Joker, 11+ players: + Kamikaze</p>
          <p>• 12+ players: + Hooker</p>
        </div>
      )}
    </div>
  );
}