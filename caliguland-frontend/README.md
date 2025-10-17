# Caliguland Frontend 🎮

**React + TypeScript frontend for the Caliguland social prediction market game**

[![React](https://img.shields.io/badge/React-18.2-blue)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue)]()
[![Vite](https://img.shields.io/badge/Vite-5.0-purple)]()
[![Cypress](https://img.shields.io/badge/Cypress-13.6-green)]()

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open browser
open http://localhost:3000
```

The frontend will proxy API requests to `http://localhost:8000` (game server).

---

## 📋 Prerequisites

Before running the frontend, ensure the game server is running:

```bash
cd ../caliguland-game
npm install
npm run dev
```

---

## 🏗️ Architecture

### Tech Stack
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool & dev server
- **Zustand** - State management
- **Tailwind CSS** - Styling
- **Cypress** - E2E testing

### Project Structure

```
caliguland-frontend/
├── src/
│   ├── components/         # React components
│   │   ├── Layout.tsx      # Main layout wrapper
│   │   ├── Lobby.tsx       # Join game screen
│   │   ├── GameBoard.tsx   # Main game view
│   │   ├── Feed.tsx        # Social feed
│   │   ├── BettingPanel.tsx # Betting interface
│   │   ├── MarketDisplay.tsx # Odds display
│   │   └── PlayersList.tsx  # Player list
│   ├── services/           # API & WebSocket
│   │   ├── api.ts          # REST API client
│   │   └── websocket.ts    # WebSocket service
│   ├── store/              # State management
│   │   └── gameStore.ts    # Zustand store
│   ├── types/              # TypeScript types
│   │   └── game.ts         # Game types
│   ├── styles/             # CSS
│   │   └── index.css       # Tailwind CSS
│   ├── App.tsx             # Root component
│   └── main.tsx            # Entry point
├── cypress/                # E2E tests
│   ├── e2e/               # Test specs
│   └── support/           # Test helpers
├── index.html             # HTML entry
├── vite.config.ts         # Vite config
├── tailwind.config.js     # Tailwind config
└── cypress.config.ts      # Cypress config
```

---

## 🎮 Features

### Core Gameplay
- ✅ **Join Game** - Enter name and join lobby
- ✅ **Real-time Feed** - Social timeline with posts
- ✅ **Betting System** - Bet YES/NO with adjustable amounts
- ✅ **Market Display** - Live odds and volume
- ✅ **Player List** - See all active players
- ✅ **WebSocket Updates** - Real-time game state

### UI/UX
- ✅ **Responsive Design** - Works on all screen sizes
- ✅ **Dark Theme** - Modern dark UI
- ✅ **Real-time Updates** - Live feed and market data
- ✅ **Loading States** - Smooth UX with loading indicators
- ✅ **Error Handling** - Graceful error messages

---

## 🧪 Testing

### Run All Tests

```bash
# Run Cypress in headless mode
npm test

# Open Cypress UI
npm run test:open
```

### Test Suites

1. **01-join-game.cy.ts** - Join game flow
2. **02-place-bet.cy.ts** - Betting functionality
3. **03-post-feed.cy.ts** - Social feed posting
4. **04-market-display.cy.ts** - Market odds display
5. **05-complete-game.cy.ts** - Full game cycle
6. **06-multiplayer.cy.ts** - Multiple players
7. **07-websocket-updates.cy.ts** - Real-time updates

### Test Coverage
- ✅ User joins game
- ✅ User places bets (YES/NO)
- ✅ User posts to feed
- ✅ Market odds update
- ✅ WebSocket connections
- ✅ Multi-player scenarios
- ✅ Complete game flow

---

## 📡 API Integration

The frontend connects to these endpoints:

### REST API (`/api/v1/`)
- `GET /game` - Get current game state
- `POST /join` - Join game
- `POST /bet` - Place a bet
- `POST /post` - Post to feed
- `POST /dm` - Send direct message
- `GET /market` - Get market odds

### WebSocket (`/ws`)
- Real-time game state updates
- New posts in feed
- Market odds changes
- Player join/leave events

---

## 🎨 Components

### Layout
Main wrapper with header, footer, and game info display.

### Lobby
Join screen with player name input and game instructions.

### GameBoard
Main game view with 3 columns:
- Left: Question, Market, Players
- Middle: Social Feed
- Right: Betting Panel

### Feed
Social timeline with:
- Scrollable post list
- Post input (280 chars)
- Real-time updates

### BettingPanel
Betting interface with:
- YES/NO selection
- Amount slider (10-1000)
- Quick amount buttons
- Bet history

### MarketDisplay
Shows current odds:
- YES/NO percentages
- Visual progress bars
- Share counts
- Total volume

### PlayersList
List of active players:
- Player names
- Human vs AI indicators
- NPC badges
- Win counts

---

## 🔧 Development

### Hot Reload
```bash
npm run dev
```

Changes to source files will automatically reload the browser.

### Build for Production
```bash
npm run build
```

Output in `dist/` directory.

### Preview Production Build
```bash
npm run preview
```

---

## 🚀 Deployment

### Option 1: Static Hosting (Vercel, Netlify)
```bash
npm run build
# Deploy dist/ folder
```

### Option 2: Docker
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
RUN npm install -g serve
CMD ["serve", "-s", "dist", "-l", "3000"]
```

### Option 3: Serve with Nginx
```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://game-server:8000;
    }
    
    location /ws {
        proxy_pass http://game-server:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

## 🐛 Troubleshooting

### Issue: "Cannot connect to game server"
**Solution**: Ensure game server is running on `http://localhost:8000`
```bash
cd ../caliguland-game
npm run dev
```

### Issue: "WebSocket connection failed"
**Solution**: Check WebSocket endpoint in browser console. Ensure no CORS issues.

### Issue: "Cypress tests fail"
**Solution**: 
1. Start game server first
2. Start frontend dev server
3. Run Cypress tests

### Issue: "Build fails"
**Solution**: Clear node_modules and reinstall
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

---

## 📚 Learn More

- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Guide](https://vitejs.dev/guide/)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Cypress Documentation](https://docs.cypress.io/)

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

Apache-2.0

---

**Built with ❤️ for Caliguland**

