# Sprint 1 Implementation Checklist

## Sprint Goal
Users can instantly join virtual-dev.com as anonymous users and see the basic 2D map

---

## Pre-Sprint Setup

### Repository Setup
- [ ] Create GitHub repository: `virtual-dev`
- [ ] Initialize monorepo structure OR separate repos
  ```
  virtual-dev/
  ├── frontend/          # React app
  ├── backend/           # Node.js server
  └── README.md
  ```
- [ ] Set up `.gitignore` for Node.js and React
- [ ] Create `dev`, `staging`, `main` branches
- [ ] Set up branch protection rules

### Development Environment
- [ ] Install Node.js 20+
- [ ] Install PostgreSQL 16
- [ ] Install Redis 7
- [ ] Install VS Code + recommended extensions
- [ ] Set up environment variables (`.env` files)

### Project Management
- [ ] Set up Jira/Linear/Trello board
- [ ] Import user stories from CSV
- [ ] Schedule sprint ceremonies
- [ ] Create team Slack/Discord channel

### Supabase Setup
- [ ] Create Supabase account at supabase.com
- [ ] Create new project: "virtual-dev"
- [ ] Copy Project URL and anon key
- [ ] Follow `supabase_setup_guide.md` for full setup
- [ ] Create tables (chat_messages, npc_configs)
- [ ] Set up Row Level Security policies
- [ ] Test database connection

---

## Backend Implementation

### 1. Project Initialization
```bash
cd backend
npm init -y
npm install express socket.io cors dotenv uuid
npm install --save-dev typescript @types/node @types/express ts-node nodemon
npx tsc --init
```

**Tasks:**
- [ ] Initialize Node.js project with TypeScript
- [ ] Configure `tsconfig.json`
- [ ] Set up folder structure:
  ```
  backend/
  ├── src/
  │   ├── server.ts
  │   ├── websocket/
  │   │   └── handler.ts
  │   ├── utils/
  │   │   └── usernameGenerator.ts
  │   ├── models/
  │   └── config/
  ├── package.json
  └── .env
  ```
- [ ] Create basic Express server
- [ ] Add CORS configuration

### 2. Username Generator (US-1.2)
**File:** `src/utils/usernameGenerator.ts`

```typescript
const adjectives = [
  'Swift', 'Brave', 'Clever', 'Mighty', 'Silent',
  'Happy', 'Zen', 'Turbo', 'Epic', 'Cool',
  'Cyber', 'Pixel', 'Quantum', 'Digital', 'Neural'
];

const nouns = [
  'Panda', 'Tiger', 'Dragon', 'Wizard', 'Ninja',
  'Coder', 'Hacker', 'Builder', 'Maker', 'Dev',
  'Phoenix', 'Lynx', 'Falcon', 'Wolf', 'Bear'
];

export function generateUsername(): string {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 1000);
  return `${adj}_${noun}_${num}`;
}

export function generateAvatarColor(): string {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
    '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}
```

**Tasks:**
- [ ] Create username generator function
- [ ] Create avatar color generator
- [ ] Write unit tests for generator
- [ ] Ensure username uniqueness in active sessions

### 3. WebSocket Setup (US-1.4)
**File:** `src/websocket/handler.ts`

```typescript
import { Server, Socket } from 'socket.io';
import { generateUsername, generateAvatarColor } from '../utils/usernameGenerator';

interface ActiveUser {
  sessionId: string;
  username: string;
  position: { x: number; y: number };
  avatarColor: string;
  socket: Socket;
}

const activeUsers = new Map<string, ActiveUser>();

export function setupWebSocket(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log('User connected:', socket.id);

    // Handle user join
    socket.on('join', (data: { sessionId?: string }) => {
      // TODO: Implement join logic
    });

    // Handle movement
    socket.on('move', (data: { position: { x: number; y: number } }) => {
      // TODO: Implement movement logic
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      // TODO: Implement disconnect logic
    });
  });
}
```

**Tasks:**
- [ ] Set up Socket.io server
- [ ] Implement `join` event handler
- [ ] Implement `move` event handler
- [ ] Implement `disconnect` event handler
- [ ] Broadcast user updates to all clients
- [ ] Add heartbeat mechanism
- [ ] Test reconnection logic

### 4. Session Management (US-1.1, US-1.5)
**File:** `src/services/sessionService.ts`

```typescript
import { v4 as uuidv4 } from 'uuid';
import { redisClient } from '../config/redis';

export async function createSession(sessionId?: string) {
  const id = sessionId || uuidv4();
  const username = generateUsername();
  const avatarColor = generateAvatarColor();
  
  const session = {
    sessionId: id,
    username,
    avatarColor,
    position: { x: 400, y: 300 }, // spawn position
    createdAt: Date.now()
  };

  // Store in Redis with 24-hour expiration
  await redisClient.setex(
    `session:${id}`,
    86400, // 24 hours
    JSON.stringify(session)
  );

  return session;
}

export async function getSession(sessionId: string) {
  const data = await redisClient.get(`session:${sessionId}`);
  return data ? JSON.parse(data) : null;
}
```

**Tasks:**
- [ ] Set up Redis connection
- [ ] Implement session creation
- [ ] Implement session retrieval
- [ ] Set 24-hour expiration
- [ ] Handle session not found
- [ ] Test session persistence

### 5. Server Entry Point
**File:** `src/server.ts`

```typescript
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { setupWebSocket } from './websocket/handler';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Setup WebSocket handlers
setupWebSocket(io);

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

**Tasks:**
- [ ] Create Express app
- [ ] Set up HTTP server
- [ ] Configure Socket.io
- [ ] Add health check endpoint
- [ ] Start server
- [ ] Test server startup

---

## Frontend Implementation

### 1. Project Initialization
```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm install socket.io-client phaser zustand @supabase/supabase-js
npm install --save-dev @types/phaser
```

**Tasks:**
- [ ] Create React project with Vite + TypeScript
- [ ] Install dependencies (including Supabase)
- [ ] Configure Tailwind CSS
- [ ] Set up folder structure:
  ```
  frontend/
  ├── src/
  │   ├── App.tsx
  │   ├── main.tsx
  │   ├── components/
  │   ├── game/
  │   │   ├── GameScene.ts
  │   │   └── PhaserGame.tsx
  │   ├── store/
  │   │   └── gameStore.ts
  │   ├── services/
  │   │   ├── socket.ts
  │   │   └── chatService.ts
  │   ├── lib/
  │   │   └── supabase.ts
  │   └── types/
  │       └── index.ts
  ```

### 2. WebSocket Client (US-1.4)
**File:** `src/services/socket.ts`

```typescript
import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;

  connect() {
    this.socket = io(import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001', {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    this.setupListeners();
  }

  private setupListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Connected to server');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    // More event listeners...
  }

  emit(event: string, data: any) {
    this.socket?.emit(event, data);
  }

  on(event: string, callback: (data: any) => void) {
    this.socket?.on(event, callback);
  }

  disconnect() {
    this.socket?.disconnect();
  }
}

export const socketService = new SocketService();
```

**Tasks:**
- [ ] Create Socket.io client service
- [ ] Implement connection logic
- [ ] Add reconnection handling
- [ ] Set up event listeners
- [ ] Add connection status indicator
- [ ] Test disconnect/reconnect

### 3. Session Management (US-1.5)
**File:** `src/utils/session.ts`

```typescript
const SESSION_KEY = 'virtual-dev-session';

export function getSessionId(): string | null {
  return localStorage.getItem(SESSION_KEY);
}

export function setSessionId(sessionId: string): void {
  localStorage.setItem(SESSION_KEY, sessionId);
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}
```

**Tasks:**
- [ ] Create localStorage helpers
- [ ] Store session ID on join
- [ ] Retrieve session ID on page load
- [ ] Clear expired sessions
- [ ] Test persistence across refreshes

### 4. State Management
**File:** `src/store/gameStore.ts`

```typescript
import create from 'zustand';

interface User {
  sessionId: string;
  username: string;
  position: { x: number; y: number };
  avatarColor: string;
}

interface GameState {
  currentUser: User | null;
  otherUsers: Map<string, User>;
  isConnected: boolean;
  setCurrentUser: (user: User) => void;
  updateUserPosition: (sessionId: string, position: { x: number; y: number }) => void;
  addUser: (user: User) => void;
  removeUser: (sessionId: string) => void;
  setConnected: (status: boolean) => void;
}

export const useGameStore = create<GameState>((set) => ({
  currentUser: null,
  otherUsers: new Map(),
  isConnected: false,
  setCurrentUser: (user) => set({ currentUser: user }),
  updateUserPosition: (sessionId, position) => set((state) => {
    const user = state.otherUsers.get(sessionId);
    if (user) {
      const updatedUsers = new Map(state.otherUsers);
      updatedUsers.set(sessionId, { ...user, position });
      return { otherUsers: updatedUsers };
    }
    return state;
  }),
  addUser: (user) => set((state) => {
    const updatedUsers = new Map(state.otherUsers);
    updatedUsers.set(user.sessionId, user);
    return { otherUsers: updatedUsers };
  }),
  removeUser: (sessionId) => set((state) => {
    const updatedUsers = new Map(state.otherUsers);
    updatedUsers.delete(sessionId);
    return { otherUsers: updatedUsers };
  }),
  setConnected: (status) => set({ isConnected: status })
}));
```

**Tasks:**
- [ ] Set up Zustand store
- [ ] Define state interface
- [ ] Implement state actions
- [ ] Connect to WebSocket events
- [ ] Test state updates

### 5. Phaser Game Scene (US-1.3)
**File:** `src/game/GameScene.ts`

```typescript
import Phaser from 'phaser';
import { useGameStore } from '../store/gameStore';
import { socketService } from '../services/socket';

export class GameScene extends Phaser.Scene {
  private playerDot?: Phaser.GameObjects.Arc;
  private otherDots: Map<string, Phaser.GameObjects.Arc> = new Map();

  constructor() {
    super('GameScene');
  }

  create() {
    // Create map background
    this.add.rectangle(400, 300, 800, 600, 0x1a1a1a);
    
    // Create grid
    this.createGrid();
    
    // Create player dot
    const currentUser = useGameStore.getState().currentUser;
    if (currentUser) {
      this.createPlayerDot(currentUser);
    }

    // Set up input
    this.input.on('pointerdown', this.handleClick, this);
    this.input.keyboard?.on('keydown', this.handleKeyPress, this);
  }

  private createGrid() {
    const graphics = this.add.graphics();
    graphics.lineStyle(1, 0x333333, 0.5);
    
    // Vertical lines
    for (let x = 0; x <= 800; x += 50) {
      graphics.lineBetween(x, 0, x, 600);
    }
    
    // Horizontal lines
    for (let y = 0; y <= 600; y += 50) {
      graphics.lineBetween(0, y, 800, y);
    }
  }

  private createPlayerDot(user: any) {
    this.playerDot = this.add.circle(
      user.position.x,
      user.position.y,
      10,
      parseInt(user.avatarColor.replace('#', ''), 16)
    );
  }

  private handleKeyPress(event: KeyboardEvent) {
    // TODO: Implement WASD movement
  }

  private handleClick(pointer: Phaser.Input.Pointer) {
    // TODO: Implement click-to-move
  }

  update() {
    // Update other users' positions
    // TODO: Implement
  }
}
```

**Tasks:**
- [ ] Create Phaser scene
- [ ] Render map background
- [ ] Create grid overlay
- [ ] Render player dot
- [ ] Implement keyboard controls (WASD)
- [ ] Implement click-to-move
- [ ] Render other users' dots
- [ ] Add username labels
- [ ] Test rendering on different screen sizes

### 6. Phaser Game Component
**File:** `src/game/PhaserGame.tsx`

```typescript
import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { GameScene } from './GameScene';

export function PhaserGame() {
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: 'game-container',
      scene: [GameScene],
      backgroundColor: '#1a1a1a',
      physics: {
        default: 'arcade',
        arcade: {
          debug: false
        }
      }
    };

    gameRef.current = new Phaser.Game(config);

    return () => {
      gameRef.current?.destroy(true);
    };
  }, []);

  return <div id="game-container" />;
}
```

**Tasks:**
- [ ] Create Phaser game component
- [ ] Configure Phaser
- [ ] Mount game to DOM
- [ ] Handle cleanup on unmount
- [ ] Test game initialization

### 7. Main App Component
**File:** `src/App.tsx`

```typescript
import { useEffect } from 'react';
import { PhaserGame } from './game/PhaserGame';
import { socketService } from './services/socket';
import { useGameStore } from './store/gameStore';
import { getSessionId, setSessionId } from './utils/session';

export default function App() {
  const { setCurrentUser, setConnected } = useGameStore();

  useEffect(() => {
    // Connect to WebSocket
    socketService.connect();

    // Join as anonymous user
    const sessionId = getSessionId();
    socketService.emit('join', { sessionId });

    // Listen for join confirmation
    socketService.on('joined', (data) => {
      setCurrentUser(data);
      setSessionId(data.sessionId);
      setConnected(true);
    });

    return () => {
      socketService.disconnect();
    };
  }, []);

  return (
    <div className="w-screen h-screen bg-gray-900 flex items-center justify-center">
      <div className="relative">
        <PhaserGame />
        <ConnectionStatus />
      </div>
    </div>
  );
}

function ConnectionStatus() {
  const isConnected = useGameStore((state) => state.isConnected);
  
  return (
    <div className="absolute top-4 right-4">
      <div className={`px-3 py-1 rounded-full text-xs ${
        isConnected ? 'bg-green-500' : 'bg-red-500'
      }`}>
        {isConnected ? 'Connected' : 'Disconnected'}
      </div>
    </div>
  );
}
```

**Tasks:**
- [ ] Create main App component
- [ ] Connect to WebSocket on mount
- [ ] Send join event
- [ ] Handle joined response
- [ ] Display connection status
- [ ] Render Phaser game
- [ ] Test full flow

---

## Testing Checklist

### Unit Tests
- [ ] Username generator returns valid format
- [ ] Session creation stores in Redis
- [ ] Session retrieval works correctly
- [ ] WebSocket events emit correctly

### Integration Tests
- [ ] User can join without credentials
- [ ] Username is randomly generated
- [ ] Session persists on refresh
- [ ] WebSocket connects successfully
- [ ] User dot renders on map

### Manual Testing
- [ ] Open virtual-dev.com
- [ ] Verify instant entry (no login)
- [ ] Check random username assigned
- [ ] Verify map renders
- [ ] Test page refresh (username persists)
- [ ] Test after 24 hours (new username)
- [ ] Open multiple tabs (different users)
- [ ] Test on mobile browser

---

## Sprint 1 Definition of Done

- [ ] All user stories marked as Done
- [ ] Code reviewed and approved
- [ ] Unit tests passing (>80% coverage)
- [ ] Integration tests passing
- [ ] Deployed to staging environment
- [ ] Manual testing completed
- [ ] No critical bugs
- [ ] Demo prepared
- [ ] Documentation updated

---

## Common Issues & Solutions

### Issue: WebSocket connection fails
**Solution:** Check CORS configuration and firewall rules

### Issue: Username not persisting on refresh
**Solution:** Verify localStorage is enabled and sessionId is being stored

### Issue: Map not rendering
**Solution:** Check Phaser configuration and canvas mounting

### Issue: Redis connection error
**Solution:** Ensure Redis is running and connection string is correct

---

## Sprint 1 Demo Script

1. **Open virtual-dev.com**
   - Show instant access (no login screen)
   - Point out random username (e.g., "Swift_Panda_42")

2. **Show 2D Map**
   - User dot visible on grid
   - Boundaries working

3. **Test Session Persistence**
   - Refresh page
   - Same username appears

4. **Test Multi-User**
   - Open incognito window
   - Different username assigned
   - Both dots visible (if movement implemented)

5. **Show Connection Status**
   - Green indicator = connected
   - Disconnect server = red indicator

---

*Sprint 1 - Week 1-2*  
*Last Updated: November 12, 2025*
