# Virtual Dev - Simplified Architecture (Anonymous Access)

## System Overview

Virtual Dev uses a **fully anonymous, instant-access model** with no user accounts or authentication required.

---

## User Flow

```
1. User visits virtual-dev.com
   ↓
2. React app loads instantly
   ↓
3. Random username generated (e.g., "Swift_Panda_42")
   ↓
4. WebSocket connection established
   ↓
5. User spawns on 2D map as colored dot
   ↓
6. User can immediately move and interact
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser                              │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           React App (Vite + TypeScript)              │   │
│  │                                                       │   │
│  │  ├─ Phaser.js 3 (2D Map Rendering)                │   │
│  │  ├─ Socket.io Client (Movement & Position)          │   │
│  │  ├─ Supabase Client (Chat & NPC Messages)           │   │
│  │  ├─ State Management (Zustand/Redux)                │   │
│  │  └─ localStorage (Session Persistence)              │   │
│  │                                                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                            │                                 │
│                   ┌────────┼────────┐                        │
│                   │                 │                        │
│           WebSocket (Socket.io)    Supabase Realtime        │
│           HTTPS                    WebSocket                │
└────────────────────┼─────────────────┼───────────────────────┘
                     │                 │
                     ▼                 ▼
┌──────────────────────────┐   ┌──────────────────────────────┐
│  Node.js Backend         │   │      Supabase                │
│                          │   │                              │
│  ┌────────────────────┐ │   │  ┌────────────────────────┐ │
│  │  Express.js +      │ │   │  │  PostgreSQL Database   │ │
│  │  Socket.io Server  │ │   │  │                        │ │
│  │                    │ │   │  │  ├─ chat_messages      │ │
│  │  ├─ Position sync │ │   │  │  ├─ npc_conversations  │ │
│  │  ├─ Movement       │ │   │  │  └─ npc_configs       │ │
│  │  ├─ Proximity      │ │   │  │                        │ │
│  │  └─ User session   │ │   │  └────────────────────────┘ │
│  │                    │ │   │                              │
│  ├─ Username Gen      │ │   │  ┌────────────────────────┐ │
│  ├─ Session Manager   │ │   │  │  Realtime Engine       │ │
│  └─ NPC Controller    │ │   │  │                        │ │
│       (Claude API)    │ │   │  │  Broadcasts:           │ │
│                       │ │   │  │  - New messages        │ │
│  └────────────────────┘ │   │  │  - NPC responses       │ │
│             │            │   │  │  - Presence updates    │ │
└─────────────┼────────────┘   │  └────────────────────────┘ │
              │                └──────────────────────────────┘
              │
              ▼
       ┌──────────┐      ┌─────────────┐
       │  Redis   │      │   Claude    │
       │  Cache   │      │     API     │
       │          │      │             │
       │ Active   │      │ NPC         │
       │ Sessions │      │ Responses   │
       │ User     │      │             │
       │ Positions│      │             │
       └──────────┘      └─────────────┘
```

---

## Key Components

### Frontend (React)

**Technologies:**
- React 18+ with TypeScript
- Vite (build tool)
- **Phaser.js 3** (2D rendering and game engine)
  - Scene management for different game states
  - Physics engine (Arcade Physics) for collision detection
  - Input handling (keyboard, mouse, touch)
  - Graphics API for drawing shapes and sprites
  - Built-in camera and viewport management
- Socket.io-client (WebSocket for movement)
- Supabase Client (for chat and realtime)
- Zustand or Redux Toolkit (state management)
- Tailwind CSS (styling)

**Responsibilities:**
- Render 2D map and entities
- Handle user input (keyboard/mouse)
- Manage WebSocket connection for movement
- Subscribe to Supabase Realtime for chat
- Display chat interface
- Store session in localStorage

### Phaser.js 3 Implementation Details

**Why Phaser.js?**
- Mature game framework (10+ years)
- Excellent performance for 2D games
- Built-in scene management
- Robust physics engine
- Great documentation and community
- Easy React integration

**Phaser Architecture for Virtual Dev:**

```typescript
// Main Game Configuration
const config = {
  type: Phaser.AUTO,              // WebGL with Canvas fallback
  width: 800,
  height: 600,
  parent: 'game-container',
  scene: [GameScene],
  physics: {
    default: 'arcade',            // Simple physics for collision
    arcade: {
      debug: false
    }
  }
};
```

**GameScene Structure:**
- `preload()`: Load assets (sprites, textures)
- `create()`: Initialize game objects, map, players
- `update()`: Game loop (60fps) - handle movement, animations
- Event handlers: Input, collisions, proximity

**Rendering Strategy:**
- Static map background (single render)
- Player dots as circles (Phaser.GameObjects.Arc)
- Username labels (Phaser.GameObjects.Text)
- Grid overlay (Phaser.Graphics)
- Camera follows player (optional zoom)

**Performance Considerations:**
- Object pooling for player dots
- Cull off-screen entities
- Limit particles and effects
- Optimize draw calls
- Use texture atlases for sprites

### Backend (Node.js)

**Technologies:**
- Node.js 20+
- Express.js
- Socket.io (WebSocket server)
- TypeScript

**Responsibilities:**
- Accept WebSocket connections for movement
- Generate random usernames
- Broadcast position updates
- Manage proximity detection
- Manage NPC interactions
- Coordinate with Claude API
- Route movement data between users

**Note:** Chat messages are handled by Supabase Realtime, not the Node.js backend

### Data Storage

**Redis (In-Memory Cache):**
- Active user sessions
- Real-time position data
- User presence status
- Session IDs
- Fast read/write for real-time data

**Supabase (PostgreSQL + Realtime):**
- Chat message history (with real-time subscriptions)
- NPC configurations
- NPC conversation history
- Map data (optional)
- Analytics/metrics

**Benefits of Supabase:**
- Built-in real-time subscriptions (no custom WebSocket needed)
- Row-level security (RLS) for data protection
- Auto-generated REST API
- Real-time presence tracking
- Easy scaling and backups

**No User Database Needed:**
- No user accounts
- No passwords
- No email storage
- No authentication tables

### External Services

**Anthropic Claude API:**
- Powers NPC conversations
- Maintains conversation context
- Different system prompts per NPC role
- Streaming responses for better UX

---

## Data Models

### Active Session (Redis)

```typescript
interface ActiveSession {
  sessionId: string;          // UUID
  username: string;           // e.g., "Swift_Panda_42"
  position: {
    x: number;
    y: number;
  };
  avatarColor: string;        // hex color
  connectedAt: number;        // timestamp
  lastActive: number;         // timestamp
}
```

### Chat Message (Supabase - `chat_messages` table)

```typescript
interface ChatMessage {
  id: string;                 // UUID (auto-generated by Supabase)
  sender_session_id: string;  // ephemeral session ID
  sender_username: string;    // username at time of message
  receiver_session_id?: string; // for direct messages (null for proximity chat)
  message: string;
  created_at: timestamp;      // auto-generated by Supabase
  message_type: 'user' | 'npc';
}

// Supabase SQL Schema:
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_session_id TEXT NOT NULL,
  sender_username TEXT NOT NULL,
  receiver_session_id TEXT,
  message TEXT NOT NULL,
  message_type TEXT CHECK (message_type IN ('user', 'npc')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- Add index for performance
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at DESC);
```

### NPC Configuration (Supabase - `npc_configs` table)

```typescript
interface NPCConfig {
  id: string;                 // UUID
  name: string;               // "Code Reviewer Bot"
  role: string;               // "code_reviewer"
  position: {
    x: number;
    y: number;
  };
  system_prompt: string;      // Claude API system prompt
  avatar_icon: string;        // emoji or icon identifier
  description: string;        // shown to users
  is_active: boolean;
  created_at: timestamp;
}

// Supabase SQL Schema:
CREATE TABLE npc_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT NOT NULL UNIQUE,
  position JSONB NOT NULL,
  system_prompt TEXT NOT NULL,
  avatar_icon TEXT NOT NULL,
  description TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed with initial NPCs
INSERT INTO npc_configs (name, role, position, system_prompt, avatar_icon, description) VALUES
('Code Reviewer', 'code_reviewer', '{"x": 200, "y": 150}', 'You are a code review assistant...', '👨‍💻', 'Get constructive code feedback'),
('Debug Helper', 'debug_helper', '{"x": 600, "y": 150}', 'You are a debugging expert...', '🐛', 'Find and fix bugs together'),
('Career Mentor', 'career_mentor', '{"x": 400, "y": 450}', 'You are a tech career advisor...', '🎯', 'Career advice and guidance');
```

---

## Supabase Realtime for Chat

### Why Supabase Realtime?

**Benefits:**
- ✅ Built-in WebSocket infrastructure (no custom server needed)
- ✅ Automatic message broadcasting to all subscribed clients
- ✅ PostgreSQL database included
- ✅ Row-level security for data protection
- ✅ Easy to scale
- ✅ Free tier includes 500MB database + 2GB bandwidth

**vs. Custom WebSocket Chat:**
- Less code to maintain
- No need to handle message persistence separately
- Built-in presence system
- Automatic reconnection handling

### Chat Flow with Supabase

```
1. User sends message
   ↓
2. Frontend inserts into Supabase (chat_messages table)
   ↓
3. Supabase broadcasts INSERT event to all subscribers
   ↓
4. All connected clients receive new message instantly
   ↓
5. Frontend updates chat UI
```

### Frontend Integration

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

// Subscribe to new chat messages
const channel = supabase
  .channel('chat-messages')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'chat_messages'
  }, (payload) => {
    console.log('New message:', payload.new);
    // Update UI with new message
  })
  .subscribe();

// Send a message
async function sendMessage(message: string) {
  const currentUser = useGameStore.getState().currentUser;
  
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      sender_session_id: currentUser.sessionId,
      sender_username: currentUser.username,
      message: message,
      message_type: 'user'
    });
    
  if (error) console.error('Error sending message:', error);
}

// Load message history
async function loadChatHistory(limit = 50) {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
    
  if (error) console.error('Error loading history:', error);
  return data;
}
```

### NPC Conversations with Supabase

```typescript
// Store NPC conversation
async function sendToNPC(npcId: string, message: string) {
  const currentUser = useGameStore.getState().currentUser;
  
  // 1. Store user's message
  await supabase.from('chat_messages').insert({
    sender_session_id: currentUser.sessionId,
    sender_username: currentUser.username,
    message: message,
    message_type: 'user'
  });
  
  // 2. Get NPC response from Claude API (via backend)
  const response = await fetch('/api/npc/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ npcId, message })
  });
  
  const { npcResponse } = await response.json();
  
  // 3. Store NPC's response in Supabase
  await supabase.from('chat_messages').insert({
    sender_session_id: npcId,
    sender_username: 'NPC',
    message: npcResponse,
    message_type: 'npc'
  });
  
  // Supabase Realtime will broadcast both messages automatically!
}
```

### Proximity-based Chat Filtering

Since Supabase broadcasts ALL messages, we filter client-side:

```typescript
// In your chat component
const channel = supabase
  .channel('chat-messages')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'chat_messages'
  }, (payload) => {
    const message = payload.new;
    const currentUser = useGameStore.getState().currentUser;
    const otherUsers = useGameStore.getState().otherUsers;
    
    // Check if sender is nearby
    const sender = otherUsers.get(message.sender_session_id);
    if (sender && isNearby(currentUser.position, sender.position)) {
      // Display message
      displayMessage(message);
    }
  })
  .subscribe();

function isNearby(pos1: Position, pos2: Position): boolean {
  const distance = Math.sqrt(
    Math.pow(pos1.x - pos2.x, 2) + 
    Math.pow(pos1.y - pos2.y, 2)
  );
  return distance < 150; // proximity radius
}
```

### Supabase Row-Level Security (RLS)

Enable RLS for security:

```sql
-- Enable RLS on chat_messages
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read messages (anonymous access)
CREATE POLICY "Allow public read access" ON chat_messages
  FOR SELECT
  USING (true);

-- Allow anyone to insert messages (anonymous access)
CREATE POLICY "Allow public insert access" ON chat_messages
  FOR INSERT
  WITH CHECK (true);

-- Prevent updates and deletes (messages are immutable)
CREATE POLICY "No updates allowed" ON chat_messages
  FOR UPDATE
  USING (false);

CREATE POLICY "No deletes allowed" ON chat_messages
  FOR DELETE
  USING (false);
```

### Supabase Presence (Optional Enhancement)

Track who's online in real-time:

```typescript
const channel = supabase.channel('online-users', {
  config: {
    presence: {
      key: currentUser.sessionId,
    },
  },
});

// Track presence
channel
  .on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState();
    console.log('Online users:', state);
  })
  .on('presence', { event: 'join' }, ({ key, newPresences }) => {
    console.log('User joined:', key);
  })
  .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
    console.log('User left:', key);
  })
  .subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await channel.track({
        username: currentUser.username,
        position: currentUser.position,
        online_at: new Date().toISOString(),
      });
    }
  });
```

---

## WebSocket Events

### Client → Server

```typescript
// User joins
{
  event: 'join',
  data: {
    sessionId?: string,  // from localStorage (if exists)
  }
}

// User moves
{
  event: 'move',
  data: {
    position: { x: number, y: number }
  }
}

// User sends chat
// NOTE: Chat is handled by Supabase Realtime, not WebSocket
// See Supabase Realtime section above

// User interacts with NPC
{
  event: 'npc:interact',
  data: {
    npcId: string,
    message: string
  }
}
```

### Server → Client

```typescript
// User joined confirmation
{
  event: 'joined',
  data: {
    sessionId: string,
    username: string,
    position: { x: number, y: number },
    avatarColor: string
  }
}

// Other users' positions
{
  event: 'users:update',
  data: {
    users: Array<{
      sessionId: string,
      username: string,
      position: { x: number, y: number },
      avatarColor: string
    }>
  }
}

// Position update broadcast
{
  event: 'user:moved',
  data: {
    sessionId: string,
    position: { x: number, y: number }
  }
}

// Chat messages
// NOTE: Handled by Supabase Realtime subscriptions
// No WebSocket events needed for chat

// NPC response
{
  event: 'npc:response',
  data: {
    npcId: string,
    message: string,
    streaming: boolean
  }
}

// User disconnected
{
  event: 'user:disconnected',
  data: {
    sessionId: string
  }
}
```

---

## Session Management Flow

### First Visit

```
1. User loads virtual-dev.com
   ↓
2. Frontend generates session ID (UUID)
   ↓
3. Frontend sends 'join' event to server
   ↓
4. Server generates random username
   ↓
5. Server stores session in Redis
   ↓
6. Server responds with username, position, color
   ↓
7. Frontend stores session data in localStorage
   ↓
8. User spawns on map
```

### Returning Visit (within 24 hours)

```
1. User loads virtual-dev.com
   ↓
2. Frontend reads session ID from localStorage
   ↓
3. Frontend sends 'join' event with session ID
   ↓
4. Server checks Redis for existing session
   ↓
5. If found: restore username and position
   If not found: create new session
   ↓
6. User spawns with same username
```

### Session Expiration

- Sessions expire after 24 hours of inactivity
- Expired sessions are automatically cleaned up by Redis TTL
- Next visit creates new session with new username

---

## Random Username Generation Algorithm

```typescript
const adjectives = [
  'Swift', 'Brave', 'Clever', 'Mighty', 'Silent',
  'Happy', 'Zen', 'Turbo', 'Epic', 'Cool'
];

const nouns = [
  'Panda', 'Tiger', 'Dragon', 'Wizard', 'Ninja',
  'Coder', 'Hacker', 'Builder', 'Maker', 'Dev'
];

function generateUsername(): string {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 1000);
  
  return `${adj}_${noun}_${num}`;
}

// Example outputs:
// "Swift_Panda_42"
// "Zen_Coder_789"
// "Epic_Dragon_123"
```

---

## Proximity Detection System

### Spatial Indexing (Quadtree)

For efficient proximity detection with many users:

```
1. Divide map into grid cells or quadtree
   ↓
2. Store users in spatial structure
   ↓
3. Query only nearby cells for proximity checks
   ↓
4. Trigger events when users enter/exit proximity radius
```

**Proximity Radius:** 100-150 pixels (configurable)

### Proximity Events

```typescript
// User enters proximity of another user
{
  event: 'proximity:enter',
  data: {
    targetSessionId: string,
    targetUsername: string,
    targetType: 'user' | 'npc'
  }
}

// User exits proximity
{
  event: 'proximity:exit',
  data: {
    targetSessionId: string
  }
}
```

---

## NPC Interaction Flow

```
1. User moves within proximity of NPC
   ↓
2. Proximity event triggers
   ↓
3. Frontend shows "Talk to [NPC Name]" popup
   ↓
4. User clicks "Start Conversation"
   ↓
5. Frontend opens NPC chat interface
   ↓
6. User types message
   ↓
7. Backend sends message to Claude API with:
   - NPC's system prompt
   - Conversation history
   - User's message
   ↓
8. Claude API streams response
   ↓
9. Backend streams response to frontend
   ↓
10. Frontend displays response in chat
```

### NPC Roles & System Prompts

**Code Reviewer:**
```
You are a code review assistant. Help developers improve their code
by providing constructive feedback on code quality, best practices,
and potential bugs. Be encouraging and educational.
```

**Debug Helper:**
```
You are a debugging expert. Help developers identify and fix bugs
in their code. Ask clarifying questions and guide them through
the debugging process step by step.
```

**Career Mentor:**
```
You are a tech career advisor. Help developers with career decisions,
interview preparation, and professional growth. Provide actionable
advice based on industry experience.
```

---

## Performance Optimizations

### Network Optimization

1. **Throttle Position Updates:**
   - Maximum 10 updates/second per user
   - Use client-side interpolation for smooth movement

2. **Message Compression:**
   - Use binary format for position data
   - Compress text messages over threshold size

3. **Delta Updates:**
   - Only send changed data, not full state

### Rendering Optimization

1. **Entity Culling:**
   - Only render entities visible on screen
   - Lazy load entities entering viewport

2. **Object Pooling:**
   - Reuse sprite/entity objects
   - Avoid creating/destroying entities frequently

### Backend Optimization

1. **Redis Caching:**
   - Cache frequently accessed data
   - Reduce database queries

2. **Connection Pooling:**
   - Reuse database connections
   - Configure optimal pool size

3. **Rate Limiting:**
   - Limit messages per user per second
   - Prevent spam and abuse

---

## Security Considerations

### Input Sanitization

- Sanitize all usernames and chat messages
- Prevent XSS attacks
- Filter profanity (optional)

### Rate Limiting

- Max 10 position updates/second
- Max 5 chat messages/second
- Max 1 NPC request/5 seconds

### WebSocket Security

- Validate all incoming messages
- Implement message schema validation
- Disconnect abusive clients

### HTTPS Only

- Enforce HTTPS in production
- Use secure WebSocket (wss://)

---

## Monitoring & Analytics

### Key Metrics

1. **Real-time Metrics:**
   - Active users count
   - WebSocket connections
   - Messages per second
   - Average latency

2. **User Engagement:**
   - Session duration
   - Messages sent
   - NPCs interacted with
   - Return rate

3. **Performance:**
   - Server CPU/Memory usage
   - Redis hit rate
   - Database query time
   - Claude API latency

### Tools

- **Sentry:** Error tracking
- **Mixpanel/Amplitude:** User analytics
- **CloudWatch/Grafana:** Infrastructure monitoring

---

## Deployment Strategy

### Development Environment
```
- localhost:3000 (React)
- localhost:3001 (Node.js)
- localhost:6379 (Redis)
- localhost:5432 (PostgreSQL)
```

### Staging Environment
```
- staging.virtual-dev.com
- AWS/DigitalOcean
- Automated deployment via GitHub Actions
```

### Production Environment
```
- virtual-dev.com
- Load balancer (for multiple servers)
- CDN for static assets (CloudFlare)
- Auto-scaling enabled
- Backup & disaster recovery
```

---

## Cost Estimation (MVP)

### Infrastructure (monthly)
- **DigitalOcean Droplet (2GB RAM):** $18/month (smaller since chat is offloaded to Supabase)
- **Supabase (Free Tier):** $0/month
  - 500MB database
  - 2GB bandwidth
  - 50,000 monthly active users
  - Unlimited API requests
  - Realtime included
- **Redis Cloud (Free Tier):** $0/month (30MB)
- **Domain + SSL:** $12/year
- **Total Infrastructure:** ~$18-20/month

### API Costs
- **Claude API:** Pay per token
- **Estimated:** $50-200/month (depends on NPC usage)

### Total MVP Cost: ~$70-220/month

### When to Upgrade Supabase
Supabase Pro ($25/month) needed when you exceed:
- 500MB database storage
- 2GB bandwidth per month
- Need more than 50k MAU

**Cost Savings vs. Custom Setup:**
- No PostgreSQL hosting needed (saves $15-50/month)
- No WebSocket server scaling needed
- Built-in backups and monitoring
- Easier to scale

---

## Next Steps After MVP

1. **Phase 2: Enhanced Features**
   - Voice chat (WebRTC)
   - Screen sharing
   - Private rooms

2. **Phase 3: 3D World**
   - Three.js 3D environment
   - Character avatars
   - Spatial audio

3. **Phase 4: Optional Accounts**
   - Add optional account creation
   - Save progress and settings
   - Friend system

---

*Architecture Version: 2.0 (Anonymous Access)*  
*Last Updated: November 12, 2025*  
*Project: Virtual Dev*
