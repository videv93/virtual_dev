# Virtual Dev - Setup Guide

This guide will help you get Virtual Dev running locally.

## Prerequisites

Make sure you have the following installed:
- **Node.js** v20 or higher
- **pnpm** v8 or higher (Install: `npm install -g pnpm`)
- **Redis** (for session management)
- **Git**

## Quick Start

### 1. Install Dependencies

```bash
# Install all dependencies for the monorepo
pnpm install
```

### 2. Build Shared Types

The shared types package needs to be built first:

```bash
# Build the shared types package
pnpm --filter @virtual-dev/shared build
```

### 3. Set Up Environment Variables

#### Backend (.env)
Create `apps/backend/.env` from the example:

```bash
cp apps/backend/.env.example apps/backend/.env
```

Edit `apps/backend/.env`:
```env
PORT=3001
NODE_ENV=development
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
ANTHROPIC_API_KEY=your_api_key_here
CORS_ORIGIN=http://localhost:5173
SESSION_EXPIRY_HOURS=24
```

#### Frontend (.env.local)
Create `apps/frontend/.env.local` from the example:

```bash
cp apps/frontend/.env.example apps/frontend/.env.local
```

Edit `apps/frontend/.env.local`:
```env
VITE_BACKEND_URL=http://localhost:3001
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 4. Start Redis

Make sure Redis is running:

```bash
# On macOS with Homebrew
brew services start redis

# On Linux
sudo systemctl start redis

# Or run Redis directly
redis-server
```

### 5. Run the Development Servers

You have two options:

#### Option A: Run Both Servers Together (Recommended)
```bash
pnpm dev
```

This runs both frontend and backend in parallel.

#### Option B: Run Servers Separately
In separate terminal windows:

```bash
# Terminal 1 - Backend
pnpm backend:dev

# Terminal 2 - Frontend
pnpm frontend:dev
```

### 6. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

## Testing the Setup

1. Open http://localhost:5173 in your browser
2. You should see a 2D map with a colored dot (you)
3. Your randomly generated username should appear above your dot
4. Use WASD or Arrow keys to move around
5. Open another browser tab or incognito window to test multi-user functionality
6. Both users should be able to see each other move in real-time

## Troubleshooting

### Redis Connection Error
**Error**: `Redis Client Error: connect ECONNREFUSED`

**Solution**: Make sure Redis is running:
```bash
redis-cli ping
# Should return: PONG
```

### Port Already in Use
**Error**: `EADDRINUSE: address already in use`

**Solution**: Kill the process using the port:
```bash
# Find and kill process on port 3001 (backend)
lsof -ti:3001 | xargs kill -9

# Find and kill process on port 5173 (frontend)
lsof -ti:5173 | xargs kill -9
```

### Module Not Found Error
**Error**: `Cannot find module '@virtual-dev/shared'`

**Solution**: Build the shared package:
```bash
pnpm --filter @virtual-dev/shared build
```

### WebSocket Connection Failed
**Error**: Frontend can't connect to backend

**Solution**:
1. Check that backend is running on port 3001
2. Check `VITE_BACKEND_URL` in `apps/frontend/.env.local`
3. Check CORS settings in `apps/backend/.env`

## Project Structure

```
virtual-dev/
├── apps/
│   ├── backend/          # Node.js + Express + Socket.io server
│   │   ├── src/
│   │   │   ├── services/ # Redis, Socket.io services
│   │   │   ├── utils/    # Username generator, helpers
│   │   │   └── index.ts  # Main server file
│   │   └── package.json
│   └── frontend/         # React + Vite + Phaser.js app
│       ├── src/
│       │   ├── components/  # React components
│       │   ├── scenes/      # Phaser game scenes
│       │   ├── services/    # Socket.io client
│       │   ├── stores/      # Zustand state management
│       │   └── App.tsx
│       └── package.json
├── packages/
│   └── shared/           # Shared TypeScript types
│       ├── src/
│       │   └── types.ts  # Common types for frontend & backend
│       └── package.json
├── docs/                 # All documentation
├── package.json          # Root package.json
└── pnpm-workspace.yaml   # pnpm workspace config
```

## Available Scripts

### Root Level
- `pnpm dev` - Run both frontend and backend in parallel
- `pnpm build` - Build all packages and apps
- `pnpm clean` - Clean all node_modules and build artifacts
- `pnpm lint` - Lint all packages

### Backend
- `pnpm backend:dev` - Run backend in dev mode with hot reload
- `pnpm --filter backend build` - Build backend
- `pnpm --filter backend start` - Start production backend

### Frontend
- `pnpm frontend:dev` - Run frontend in dev mode
- `pnpm --filter frontend build` - Build frontend for production
- `pnpm --filter frontend preview` - Preview production build

### Shared Types
- `pnpm shared:dev` - Watch mode for shared types
- `pnpm --filter @virtual-dev/shared build` - Build shared types

## Next Steps

Now that you have the basic setup working:

1. **Sprint 1 Complete** ✅ - You have basic anonymous access and movement!
2. **Sprint 2** - Enhanced movement and collision detection (already implemented)
3. **Sprint 3** - Add proximity-based chat with Supabase Realtime
4. **Sprint 4** - Add AI-powered NPCs with Claude API
5. **Sprint 5** - Polish and UX improvements
6. **Sprint 6** - Testing and deployment

## Development Workflow

1. Keep Redis running in the background
2. Run `pnpm dev` to start both servers
3. Make changes to code (hot reload is enabled)
4. Test in browser
5. Open multiple tabs to test multi-user features

## Need Help?

- Check the [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) for detailed sprint plans
- Read the [docs/](docs/) directory for architecture and guides
- Check the console logs for detailed error messages

---

**Happy coding! 🚀**
