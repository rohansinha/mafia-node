# 🎭 Mafia Game Web App

A digital implementation of the classic Mafia party game designed for large groups to play using a single device.

## Features

- **Multi-player Support**: Handle 4+ players with automatic role assignment
- **Role Management**: Mafia, Detective, Doctor, and Citizen roles
- **Phase Management**: Alternating Day and Night phases
- **Voting System**: Democratic elimination process during day phases
- **Night Actions**: Special abilities for Mafia, Detective, and Doctor
- **Single Device Play**: Pass the device around for private actions
- **Responsive Design**: Mobile and tablet-friendly interface

## Game Rules

### Roles

- **Mafia** 🔪: Eliminate townspeople during night phases. Win by outnumbering or equaling non-Mafia players.
- **Detective** 🕵️: Investigate one player per night to learn their role. Win by eliminating all Mafia.
- **Doctor** 🏥: Protect one player per night from Mafia attacks. Win by eliminating all Mafia.
- **Citizen** 👥: No special abilities. Win by eliminating all Mafia through voting.

### Game Flow

1. **Setup**: Enter player names and assign roles randomly
2. **Day Phase**: Discussion and voting to eliminate a suspected Mafia member
3. **Night Phase**: Special roles take secret actions
4. **Win Conditions**: 
   - Town wins when all Mafia are eliminated
   - Mafia wins when they equal or outnumber the town

### Role Distribution

- **4-6 players**: 1 Mafia, 1 Detective, rest Citizens
- **7+ players**: 1 Mafia, 1 Detective, 1 Doctor, rest Citizens  
- **Large groups**: Additional Mafia members (1 per 4 players)

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Modern web browser

### Installation

1. **Clone or download the project**
2. **Install Node.js** if not already installed:
   - Download from [nodejs.org](https://nodejs.org/)
   - Or use package manager: `winget install OpenJS.NodeJS`

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```

5. **Open your browser** and navigate to `http://localhost:3000`

### Production Build

```bash
npm run build
npm start
```

## How to Play

1. **Setup Phase**:
   - Enter player names (minimum 4 required)
   - Click "Assign Roles" to randomly distribute roles
   - Show each player their role privately
   - Click "Start Game"

2. **Day Phase**:
   - Discuss and decide who to vote out
   - Pass device to each player to cast their vote
   - View results and eliminate the player with most votes
   - Tied votes result in no elimination

3. **Night Phase**:
   - Pass device to Mafia member(s) to choose elimination target
   - Pass to Detective to investigate a player
   - Pass to Doctor to protect a player
   - Actions are resolved automatically

4. **Repeat** until one side wins

## Game Tips

- **For Mafia**: Blend in, deflect suspicion, coordinate with other Mafia members
- **For Detective**: Use investigation results wisely, don't reveal yourself too early
- **For Doctor**: Protect key players, try to save Detective or other important townspeople  
- **For Citizens**: Pay attention to voting patterns and player behavior

## Technical Details

- Built with **Next.js 14** and **TypeScript**
- Styled with **Tailwind CSS**
- Uses React Context for state management
- Responsive design for mobile/tablet play
- No backend required - runs entirely in browser

## Project Structure

```
src/
├── app/              # Next.js app router
├── components/       # React components
│   ├── SetupPhase.tsx
│   ├── GameBoard.tsx
│   ├── DayPhase.tsx
│   ├── NightPhase.tsx
│   └── GameOver.tsx
├── context/          # React context
│   └── GameContext.tsx
└── types/            # TypeScript types
    └── game.ts
```

## Contributing

Feel free to submit issues and enhancement requests!

## License

This project is open source and available under the [MIT License](LICENSE).