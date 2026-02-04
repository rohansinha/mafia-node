# 🎭 Mafia Game Web App

A feature-rich digital implementation of the classic Mafia party game with extensive role customization, multiple game modes, and enhanced gameplay mechanics.

## 🌟 Features

### Game Modes
- **🎮 Mode Selection**: Choose between Local Offline, Local Multiplayer, and Online Multiplayer
- **📱 Local Offline**: Pass one device around your group - perfect for in-person gatherings
- **🖥️ Local Multiplayer (Host)**: Set up and host a game from your computer - other devices on your WiFi can join
- **📡 Join Game**: Connect to a hosted game from any device on the same network
- **🌐 Online Multiplayer**: Play remotely over the internet (coming soon)

### Role System
- **🎯 9 Unique Roles**: Comprehensive role system across 3 teams
- **🔄 Dual Assignment Modes**: Recommended balanced distribution or Custom role selection
- **⚡ Special Abilities**: Night actions, roleblocking, silencing, and revenge mechanics
- **🏆 Multiple Win Conditions**: Mafia victory, Town victory, or Independent survival victories
- **🟡 Independent Roles**: Neutral players who win by surviving - can strategically help either team

### Gameplay Features
- **👥 Multi-player Support**: Handle 4+ players with intelligent role assignment
- **🌅 Day/Night Phases**: Alternating discussion and action phases
- **🗳️ Voting System**: Democratic elimination with tie handling
- **🔇 Silencing Mechanics**: Players can be silenced during discussion
- **💥 Revenge Mechanics**: Special elimination chains for certain roles
- **📊 Win Condition Tracking**: Real-time game state and victory detection

### User Experience
- **📱 Mobile-First Design**: Optimized for smartphone and tablet use
- **🎨 Enhanced UI**: Color-coded roles, progress indicators, and intuitive navigation
- **🔧 Flexible Setup**: Custom role configuration with validation
- **📈 Game Statistics**: Player status tracking and role reveal system

## 🎲 Game Rules

### Roles & Abilities

#### Mafia Team 🔴
- **Mafia** 🔪: Basic Mafia member who can eliminate players at night
- **Godfather** 👑: Enhanced Mafia leader with kill ability


#### Town Team 🔵  
- **Detective** 🕵️: Investigate one player per night to learn their role
- **Doctor** 🏥: Protect one player per night from attacks
- **Citizen** 👥: No special abilities, but crucial for voting

#### Independent Roles 🟡
Independent players win by **surviving until the end of the game**. They can strategically choose to help either Mafia or Town to increase their chances of survival. For game balance purposes, independents count as citizens when calculating the mafia:citizen ratio.

- **Joker** 🃏: Wins immediately if voted out during day phase, OR by surviving
- **Kamikaze** 💥: When voted out, can choose another player to eliminate. Wins by surviving
- **Hooker** 🚫: Can roleblock other players, preventing their night actions. Wins by surviving
- **Silencer** 🔇: Can silence players, preventing them from speaking during next day phase. Wins by surviving

### Game Flow

1. **Mode Selection**: Choose between Local Offline or Online play
2. **Setup Phase**: 
   - Select assignment mode (Recommended or Custom)
   - Enter player names and configure roles
   - Private role reveals to each player
3. **Day Phase**: 
   - Group discussion (silenced players cannot speak)
   - Democratic voting to eliminate suspects
   - Special elimination handling (Joker wins, Kamikaze revenge)
4. **Night Phase**: 
   - Mafia team wakes up together and agrees on target
   - One Mafia member selects the elimination target
   - Special roles perform their abilities (called by role name, not player name)
   - Doctor protection and roleblocking resolution
5. **Win Detection**: Game ends when victory conditions are met

### Win Conditions

- **🔴 Mafia Victory**: Mafia equals or outnumbers Town
- **🔵 Town Victory**: All Mafia members are eliminated  
- **🟡 Joker Victory**: Joker is voted out during day phase (instant win)
- **🟡 Independent Survival**: Hooker, Silencer, Kamikaze, and Joker all win if they survive to the end

### Assignment Modes

#### Recommended Mode (Balanced)
- **6 players**: 2 Mafia, 4 Citizens (minimum game size)
- **7 players**: 2 Mafia, 1 Detective, 4 Citizens
- **8 players**: 1 Godfather + 1 Mafia, 1 Detective, 1 Doctor, 4 Citizens
- **10+ players**: Additional special roles for balance (Joker)
- **12+ players**: + Hooker, + Kamikaze, + Silencer

**Mafia Rules:**
- Enforced: 1 mafia per 4 players (minimum 2)
- Recommended: 1 mafia per 3 players for better gameplay

**Independent Role Balancing:**
- Independent roles count as citizens for mafia:citizen ratio calculations
- This ensures game balance when adding multiple independent roles

#### Custom Mode (User-Defined)
- Choose specific roles and quantities
- Player count validation and role distribution
- Flexible configuration for unique game experiences

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Modern web browser
- 4+ players for optimal experience

### Quick Start

1. **Clone and install**:
   ```bash
   git clone <repository-url>
   cd mafia-node
   npm install
   ```

2. **Development server** (with local multiplayer support):
   ```bash
   npm run dev
   ```
   This starts both Next.js (port 3000) and WebSocket server (port 3001).
   Navigate to `http://localhost:3000`

3. **Development server** (Next.js only, no multiplayer):
   ```bash
   npm run dev:next
   ```

4. **Production build**:
   ```bash
   npm run build
   npm start
   ```

## 🎯 How to Play

### Local Offline Mode (Single Device)
1. **Choose Game Mode**: Select "Local Offline"
2. **Select Assignment Mode**: Choose Recommended for balanced games or Custom for specific role selection
3. **Configure Players**: Enter names and customize roles if using Custom mode
4. **Role Assignment**: View role distribution and pass device for private role reveals
5. **Start Game**: Begin with Day 1 discussion phase

### Local Multiplayer Mode (Multiple Devices)

**On the Host Device (computer running the server):**
1. Start the server with `npm run dev`
2. Open `http://localhost:3000` in your browser
3. Select "Host Multiplayer Game"
4. Configure players and roles
5. Share the **Host Address** (your IP, e.g., `192.168.1.100`) and **Session Code** with players

**On Player Devices (phones/tablets on same WiFi):**
1. Open `http://<host-ip>:3000` in browser (e.g., `http://192.168.1.100:3000`)
2. Select "Join Game"
3. Enter the **Host Address** and **Session Code** shown on the host
4. Enter your name and connect

### Gameplay Loop
1. **Day Phase**:
   - Open discussion about suspects (silenced players cannot speak)
   - Pass device for private voting
   - View results and handle special eliminations
   - Check for victory conditions

2. **Night Phase**:
   - Mafia coordinates elimination target
   - Special roles perform abilities (investigate, protect, silence, roleblock)
   - Doctor protection and action resolution
   - Advance to next day

3. **Victory**: Game ends when any team/player achieves their win condition

## 🔧 Technical Architecture

### Tech Stack
- **Frontend**: Next.js 14 with TypeScript and React 18
- **Backend**: Custom Node.js server with WebSocket support for real-time multiplayer
- **Styling**: Tailwind CSS with responsive design
- **State Management**: React Context with useReducer pattern
- **Real-time Communication**: WebSocket (ws) for local multiplayer
- **Build System**: Next.js with optimized production builds

### Project Structure
```
├── server.js              # Custom server (Next.js + WebSocket)
src/
├── app/                    # Next.js app router
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main game entry
├── components/            # React components
│   ├── GameModeSelection.tsx  # Mode selection screen
│   ├── SetupPhase.tsx     # Game setup and role assignment
│   ├── GameBoard.tsx      # Main game coordinator
│   ├── LocalMultiplayerHost.tsx  # Host game screen
│   ├── LocalMultiplayerClient.tsx # Join game screen
│   ├── DayPhase.tsx       # Day phase voting and discussion
│   ├── NightPhase.tsx     # Night phase actions
│   ├── GameOver.tsx       # End game results
│   └── OnlinePlay.tsx     # Online mode placeholder
├── context/               # State management
│   └── GameContext.tsx    # Game state and actions
├── lib/                   # Utilities
│   └── networkManager.ts  # WebSocket communication
└── types/                 # TypeScript definitions
    └── game.ts            # Game interfaces and enums
```

### Key Features Implementation
- **Role System**: Enum-based role definitions with comprehensive abilities
- **State Management**: Centralized game state with action-based updates
- **Phase Management**: Clean separation of game phases with proper transitions
- **Assignment Logic**: Dual system supporting both balanced and custom role distribution
- **Action Resolution**: Sophisticated night action processing with proper priority
- **UI/UX**: Mobile-first responsive design with intuitive navigation

## 📈 Recent Enhancements

### Role System Expansion
- ✅ Added 5 new roles (Hooker, Kamikaze, Joker, Silencer, Godfather)
- ✅ Renamed Jester to Joker for clarity
- ✅ Removed less-used roles (Serial Killer, Vigilante, Bodyguard)
- ✅ Implemented special abilities (roleblocking, silencing, revenge kills)
- ✅ **Independent Role System**: Hooker, Silencer, Kamikaze, and Joker are now independent - they win by surviving and can play for either team
- ✅ **Game Balance**: Independent roles count as citizens for mafia:citizen ratio calculations

### Assignment System Overhaul
- ✅ Created dual assignment modes (Recommended/Custom)
- ✅ Built custom role picker with team-grouped selection (Mafia/Town/Independent)
- ✅ Enhanced setup flow with multi-step configuration
- ✅ Added role count validation and distribution logic

### Game Mode Infrastructure
- ✅ Implemented game mode selection system
- ✅ Created Local Offline mode (fully functional)
- ✅ **Local Multiplayer**: Custom WebSocket server for real-time multi-device gameplay
- ✅ Auto-detection of host vs client based on localhost access
- ✅ WebRTC-based IP detection for easy connection setup
- ✅ Built Online Multiplayer placeholder (future development)
- ✅ Enhanced game flow with proper phase management

### UI/UX Improvements
- ✅ Mobile-first responsive design
- ✅ Color-coded role system with visual indicators
- ✅ Enhanced voting interface with player status
- ✅ Comprehensive game statistics and progress tracking
- ✅ Intuitive navigation and user feedback

### Text-to-Speech Support
- ✅ Voice announcements during night phase
- ✅ Multiple TTS providers supported (Browser, Azure, ElevenLabs)
- ✅ Configurable voice settings per provider
- ✅ Automatic fallback to browser TTS if cloud provider fails

## 🔊 Text-to-Speech Configuration

The game supports voice announcements during night phases. You can configure the TTS provider in `src/config/gameConfig.json`:

### Available Providers

| Provider | Quality | Free Tier | Setup Required |
|----------|---------|-----------|----------------|
| `browser` | Basic | Unlimited | None |
| `azure` | Natural (Neural) | 500K chars/month | API Key + Region |
| `elevenlabs` | Most Natural | 10K chars/month | API Key |

### Configuration Example

In `gameConfig.json`, set the `tts.provider` to your preferred option:

```json
{
  "tts": {
    "provider": "browser",  // "browser", "azure", or "elevenlabs"
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
  }
}
```

### Environment Variables

For cloud TTS providers, set these environment variables:

**Azure Cognitive Services:**
```env
NEXT_PUBLIC_AZURE_SPEECH_KEY=your-azure-speech-key
NEXT_PUBLIC_AZURE_SPEECH_REGION=your-region  # e.g., eastus
```

**ElevenLabs:**
```env
NEXT_PUBLIC_ELEVENLABS_API_KEY=your-elevenlabs-api-key
```

### Voice Options

**Azure Neural Voices:**
- `en-US-GuyNeural` - Deep male voice (recommended)
- `en-US-DavisNeural` - Narrative male voice
- `en-US-TonyNeural` - Casual male voice
- `en-US-JennyNeural` - Female voice

**Azure Styles:** `serious`, `cheerful`, `terrified`, `shouting`, `whispering`

**ElevenLabs Voice IDs:**
- `TxGEqnHWrfWFTfGW9XjX` - Josh (deep, narrative)
- `EXAVITQu4vr4xnSDxMaL` - Bella (female)
- `21m00Tcm4TlvDq8ikWAM` - Rachel (female)
- `pNInz6obpgDQGcFmaJgB` - Adam (deep male)

## 📋 TODO

- [x] Update "Role Distribution Preview" to show Godfather as part of Mafia team
- [x] Change default to 6 player minimum game, with 2 Mafia and 4 Civilians
- [ ] Special role selection should allow 0 citizens/civilians 

### Local Multiplayer Enhancements
- [ ] Implement WebSocket server for local network communication
- [ ] Add QR code generation for easy device joining
- [ ] Handle reconnection when player device loses connection
- [ ] Add host transfer capability if host device disconnects
- [ ] Implement lobby system with ready-up before game starts

### Online Multiplayer (Future)
- [ ] Create dedicated game server (Node.js/Express + Socket.io)
- [ ] Implement room creation with shareable room codes
- [ ] Add player authentication (optional user accounts)
- [ ] Server-side game state validation and anti-cheat
- [ ] Implement spectator mode for eliminated players or observers
- [ ] Add in-game chat functionality
- [ ] Latency compensation for real-time actions
- [ ] Implement matchmaking system for public games
- [ ] Add friend system and private invites
- [ ] Server-side TTS or audio streaming from host
- [ ] Persistent game history and statistics
- [ ] Leaderboards and ranking system

## 🔮 Future Development

### Game Modes
| Mode | Status | Description |
|------|--------|-------------|
| Local Offline | ✅ Complete | Single device, pass around |
| Local Multiplayer | 🔄 In Progress | Multiple devices, same network |
| Online Multiplayer | 📋 Planned | Internet play with dedicated server |

### Online Multiplayer Architecture (Planned)
```
┌─────────────────┐     ┌──────────────────┐
│  Game Server    │     │   Database       │
│  (Node.js)      │◄───►│   (PostgreSQL)   │
│  - Socket.io    │     │   - Users        │
│  - Game logic   │     │   - Games        │
│  - Validation   │     │   - Statistics   │
└────────┬────────┘     └──────────────────┘
         │
    WebSocket/HTTP
         │
┌────────┴────────┐
│   Players       │
│   (Browsers)    │
│   - React UI    │
│   - Real-time   │
└─────────────────┘
```

### Additional Features
- 🔄 Game replay and statistics tracking
- 🔄 Custom rule sets and game variants
- 🔄 Enhanced role abilities and mechanics
- 🔄 Tournament and league play support

## 🤝 Contributing

We welcome contributions! Areas for enhancement:
- Additional role implementations
- Online multiplayer development
- UI/UX improvements
- Game balance adjustments
- Performance optimizations

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

---

### Development Notes
- Built with accessibility and mobile-first principles
- Comprehensive TypeScript coverage for type safety
- Modular component architecture for maintainability
- Performance optimized with Next.js best practices