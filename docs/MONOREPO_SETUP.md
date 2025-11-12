# Virtual Dev - Monorepo Setup with pnpm Workspaces

## Why Monorepo?

Virtual Dev uses a **monorepo with pnpm workspaces** for:
- ✅ Shared TypeScript types between backend and frontend
- ✅ Atomic commits across both codebases
- ✅ Single CI/CD pipeline
- ✅ Coordinated versioning
- ✅ Simpler development workflow

---

## Project Structure

```
virtual-dev/
├── apps/
│   ├── backend/              # Node.js + Socket.io server
│   │   ├── src/
│   │   │   ├── server.ts
│   │   │   ├── websocket/
│   │   │   │   └── handler.ts
│   │   │   ├── services/
│   │   │   │   ├── sessionService.ts
│   │   │   │   └── npcService.ts
│   │   │   ├── utils/
│   │   │   │   └── usernameGenerator.ts
│   │   │   └── config/
│   │   │       └── redis.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── .env
│   │
│   └── frontend/             # React + Phaser.js app
│       ├── src/
│       │   ├── App.tsx
│       │   ├── main.tsx
│       │   ├── components/
│       │   │   ├── ChatPanel.tsx
│       │   │   ├── ConnectionStatus.tsx
│       │   │   └── UserList.tsx
│       │   ├── game/
│       │   │   ├── GameScene.ts
│       │   │   ├── PhaserGame.tsx
│       │   │   └── config.ts
│       │   ├── store/
│       │   │   └── gameStore.ts
│       │   ├── services/
│       │   │   ├── socket.ts
│       │   │   └── chatService.ts
│       │   └── lib/
│       │       └── supabase.ts
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       ├── tailwind.config.js
│       └── .env.local
│
├── packages/
│   └── shared/               # Shared TypeScript types
│       ├── src/
│       │   ├── index.ts
│       │   └── types/
│       │       ├── user.ts
│       │       ├── message.ts
│       │       ├── npc.ts
│       │       └── websocket.ts
│       ├── package.json
│       └── tsconfig.json
│
├── docs/                     # All documentation files
├── package.json              # Root package.json
├── pnpm-workspace.yaml       # pnpm workspace config
├── .gitignore
└── README.md
```

---

## Step-by-Step Setup

### 1. Install pnpm

```bash
# Install pnpm globally
npm install -g pnpm

# Verify installation
pnpm --version
```

### 2. Create Project Structure

```bash
# Create root directory
mkdir virtual-dev
cd virtual-dev

# Create directory structure
mkdir -p apps/backend/src
mkdir -p apps/frontend/src
mkdir -p packages/shared/src/types
mkdir -p docs

# Copy your existing docs
# (docs/ folder already exists with all documentation)
```

### 3. Initialize Root Package

**Create `package.json`:**
```json
{
  "name": "virtual-dev",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "pnpm -r --parallel dev",
    "dev:backend": "pnpm --filter backend dev",
    "dev:frontend": "pnpm --filter frontend dev",
    "build": "pnpm -r build",
    "build:backend": "pnpm --filter backend build",
    "build:frontend": "pnpm --filter frontend build",
    "test": "pnpm -r test",
    "lint": "pnpm -r lint",
    "clean": "pnpm -r clean && rm -rf node_modules"
  },
  "devDependencies": {
    "typescript": "^5.3.0"
  },
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=8.0.0"
  }
}
```

**Create `pnpm-workspace.yaml`:**
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

**Create `.gitignore`:**
```
# Dependencies
node_modules/
.pnpm-store/

# Build outputs
dist/
build/
.next/

# Environment variables
.env
.env.local
.env*.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
pnpm-debug.log*

# Testing
coverage/

# Misc
.turbo/
```

### 4. Set Up Shared Package

**`packages/shared/package.json`:**
```json
{
  "name": "@virtual-dev/shared",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "clean": "rm -rf dist"
  },
  "devDependencies": {
    "typescript": "^5.3.0"
  }
}
```

**`packages/shared/tsconfig.json`:**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**`packages/shared/src/index.ts`:**
```typescript
// Export all types
export * from './types/user';
export * from './types/message';
export * from './types/npc';
export * from './types/websocket';
```

**`packages/shared/src/types/user.ts`:**
```typescript
export interface Position {
  x: number;
  y: number;
}

export interface User {
  sessionId: string;
  username: string;
  position: Position;
  avatarColor: string;
  connectedAt?: number;
  lastActive?: number;
}

export interface ActiveSession extends User {
  createdAt: number;
}
```

**`packages/shared/src/types/message.ts`:**
```typescript
export interface ChatMessage {
  id: string;
  sender_session_id: string;
  sender_username: string;
  receiver_session_id?: string;
  message: string;
  message_type: 'user' | 'npc';
  created_at: string;
}
```

**`packages/shared/src/types/npc.ts`:**
```typescript
import { Position } from './user';

export interface NPCConfig {
  id: string;
  name: string;
  role: string;
  position: Position;
  system_prompt: string;
  avatar_icon: string;
  description: string;
  is_active: boolean;
  created_at: string;
}
```

**`packages/shared/src/types/websocket.ts`:**
```typescript
import { User, Position } from './user';

export interface ClientToServerEvents {
  join: (data: { sessionId?: string }) => void;
  move: (data: { position: Position }) => void;
  'npc:interact': (data: { npcId: string; message: string }) => void;
}

export interface ServerToClientEvents {
  joined: (data: User) => void;
  'users:update': (data: { users: User[] }) => void;
  'user:moved': (data: { sessionId: string; position: Position }) => void;
  'user:disconnected': (data: { sessionId: string }) => void;
  'npc:response': (data: { npcId: string; message: string; streaming?: boolean }) => void;
  'proximity:enter': (data: { targetSessionId: string; targetUsername: string; targetType: 'user' | 'npc' }) => void;
  'proximity:exit': (data: { targetSessionId: string }) => void;
}
```

### 5. Set Up Backend

```bash
cd apps/backend
pnpm init
```

**`apps/backend/package.json`:**
```json
{
  "name": "backend",
  "version": "1.0.0",
  "main": "dist/server.js",
  "scripts": {
    "dev": "nodemon --exec ts-node src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@virtual-dev/shared": "workspace:*",
    "express": "^4.18.2",
    "socket.io": "^4.7.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "uuid": "^9.0.1",
    "redis": "^4.6.10",
    "@anthropic-ai/sdk": "^0.10.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/uuid": "^9.0.7",
    "typescript": "^5.3.0",
    "ts-node": "^10.9.1",
    "nodemon": "^3.0.2"
  }
}
```

**`apps/backend/tsconfig.json`:**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**`apps/backend/.env.example`:**
```env
PORT=3001
FRONTEND_URL=http://localhost:5173
REDIS_URL=redis://localhost:6379
ANTHROPIC_API_KEY=your_api_key_here
NODE_ENV=development
```

### 6. Set Up Frontend

```bash
cd apps/frontend

# Using Vite create command
pnpm create vite . --template react-ts
```

**Update `apps/frontend/package.json`:**
```json
{
  "name": "frontend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@virtual-dev/shared": "workspace:*",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "phaser": "^3.70.0",
    "socket.io-client": "^4.7.2",
    "@supabase/supabase-js": "^2.39.0",
    "zustand": "^4.4.7"
  },
  "devDependencies": {
    "@types/react": "^18.2.43",
    "@types/react-dom": "^18.2.17",
    "@vitejs/plugin-react": "^4.2.1",
    "typescript": "^5.3.0",
    "vite": "^5.0.8",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.32",
    "autoprefixer": "^10.4.16"
  }
}
```

**`apps/frontend/.env.local.example`:**
```env
VITE_BACKEND_URL=http://localhost:3001
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**`apps/frontend/tsconfig.json`:**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### 7. Install Dependencies

```bash
# From root directory
cd /path/to/virtual-dev

# Install all dependencies (root + all workspaces)
pnpm install

# Build shared package first
pnpm --filter @virtual-dev/shared build
```

---

## Using Shared Types

### In Backend (`apps/backend/src/server.ts`):

```typescript
import { User, Position, ClientToServerEvents, ServerToClientEvents } from '@virtual-dev/shared';
import { Server } from 'socket.io';

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173'
  }
});

const activeUsers = new Map<string, User>();

io.on('connection', (socket) => {
  socket.on('join', (data) => {
    const user: User = {
      sessionId: socket.id,
      username: generateUsername(),
      position: { x: 400, y: 300 },
      avatarColor: generateColor()
    };

    activeUsers.set(socket.id, user);
    socket.emit('joined', user);
  });

  socket.on('move', (data) => {
    const user = activeUsers.get(socket.id);
    if (user) {
      user.position = data.position;
      io.emit('user:moved', { sessionId: socket.id, position: data.position });
    }
  });
});
```

### In Frontend (`apps/frontend/src/services/socket.ts`):

```typescript
import { io, Socket } from 'socket.io-client';
import { ClientToServerEvents, ServerToClientEvents } from '@virtual-dev/shared';

class SocketService {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

  connect() {
    this.socket = io(import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001');
    this.setupListeners();
  }

  private setupListeners() {
    this.socket?.on('joined', (user) => {
      console.log('Joined as:', user.username);
      // user is fully typed!
    });

    this.socket?.on('user:moved', ({ sessionId, position }) => {
      // position is fully typed!
      console.log(`User ${sessionId} moved to`, position);
    });
  }

  emit(event: keyof ClientToServerEvents, data: any) {
    this.socket?.emit(event, data);
  }
}

export const socketService = new SocketService();
```

### In Frontend Store (`apps/frontend/src/store/gameStore.ts`):

```typescript
import { create } from 'zustand';
import { User, Position } from '@virtual-dev/shared';

interface GameState {
  currentUser: User | null;
  otherUsers: Map<string, User>;
  setCurrentUser: (user: User) => void;
  updateUserPosition: (sessionId: string, position: Position) => void;
}

export const useGameStore = create<GameState>((set) => ({
  currentUser: null,
  otherUsers: new Map(),
  setCurrentUser: (user) => set({ currentUser: user }),
  updateUserPosition: (sessionId, position) => set((state) => {
    const user = state.otherUsers.get(sessionId);
    if (user) {
      const updatedUsers = new Map(state.otherUsers);
      updatedUsers.set(sessionId, { ...user, position });
      return { otherUsers: updatedUsers };
    }
    return state;
  })
}));
```

---

## Development Workflow

### Start Everything (Parallel):
```bash
# From root directory
pnpm dev

# This runs both backend and frontend concurrently
```

### Start Individual Services:
```bash
# Backend only
pnpm dev:backend

# Frontend only
pnpm dev:frontend
```

### Build for Production:
```bash
# Build everything
pnpm build

# Build specific workspace
pnpm build:backend
pnpm build:frontend
```

### Add Dependencies:
```bash
# Add to backend
pnpm --filter backend add express

# Add to frontend
pnpm --filter frontend add react-icons

# Add to shared
pnpm --filter @virtual-dev/shared add -D @types/node
```

### Run Tests:
```bash
# Run all tests
pnpm test

# Test specific workspace
pnpm --filter backend test
```

---

## Benefits of This Setup

### 1. Type Safety Across Stack
```typescript
// Change in packages/shared/src/types/user.ts
export interface User {
  sessionId: string;
  username: string;
  position: Position;
  avatarColor: string;
  status: 'online' | 'away' | 'offline'; // NEW FIELD
}

// TypeScript will immediately show errors in both:
// - apps/backend/src/server.ts
// - apps/frontend/src/components/UserList.tsx
```

### 2. Atomic Changes
```bash
# One commit for WebSocket event change
git add packages/shared/src/types/websocket.ts
git add apps/backend/src/websocket/handler.ts
git add apps/frontend/src/services/socket.ts
git commit -m "Add proximity:enter event"
```

### 3. Simple Scripts
```bash
# One command to run everything
pnpm dev

# One command to deploy everything
pnpm build && deploy.sh
```

### 4. Efficient Dependency Management
- pnpm saves disk space with single store
- Faster installs (hard links instead of copies)
- Strict dependency resolution (no phantom dependencies)

---

## Common Commands

```bash
# Install dependencies
pnpm install

# Add dependency to workspace
pnpm --filter <workspace-name> add <package>

# Remove dependency
pnpm --filter <workspace-name> remove <package>

# Update all dependencies
pnpm update -r

# Check outdated packages
pnpm outdated -r

# Clean everything
pnpm clean
rm -rf node_modules
pnpm install

# Build shared types (do this first!)
pnpm --filter @virtual-dev/shared build

# Run with debugging
pnpm dev:backend --inspect
```

---

## Troubleshooting

### Issue: Types not found from @virtual-dev/shared
**Solution:**
```bash
# Build shared package first
cd packages/shared
pnpm build

# Or from root
pnpm --filter @virtual-dev/shared build
```

### Issue: pnpm: command not found
**Solution:**
```bash
npm install -g pnpm
```

### Issue: Port already in use
**Solution:**
```bash
# Find process using port
lsof -ti:3001
# Kill it
kill -9 <PID>
```

### Issue: Changes in shared not reflecting
**Solution:**
```bash
# Rebuild shared package
pnpm --filter @virtual-dev/shared build

# Or run in watch mode
pnpm --filter @virtual-dev/shared dev
```

---

## Migration from Separate Repos

If you already have separate backend/frontend repos:

```bash
# 1. Create monorepo structure
mkdir virtual-dev && cd virtual-dev
mkdir -p apps packages

# 2. Move existing repos
git clone <backend-repo-url> apps/backend
git clone <frontend-repo-url> apps/frontend

# 3. Remove .git folders from subprojects
rm -rf apps/backend/.git
rm -rf apps/frontend/.git

# 4. Set up workspace config (as shown above)

# 5. Extract shared types to packages/shared

# 6. Initialize new repo
git init
git add .
git commit -m "Initial monorepo setup"
```

---

## Next Steps

1. ✅ Set up monorepo structure (you just did this!)
2. Create `.env` files in backend and frontend
3. Set up Supabase (follow `supabase_setup_guide.md`)
4. Start implementing Sprint 1 (follow `sprint1_implementation_checklist.md`)

---

*Last Updated: November 12, 2025*
*Project: Virtual Dev*
*Setup: pnpm Workspaces Monorepo*
