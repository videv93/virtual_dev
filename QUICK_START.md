# Virtual Dev - Quick Start Guide

## 🚀 Start Building in 30 Minutes

This guide gets you from zero to running Virtual Dev locally.

---

## Prerequisites

✅ Node.js 20+ installed  
✅ Git installed  
✅ Code editor (VS Code recommended)  
✅ Supabase account (free)  

---

## Step 1: Set Up Supabase (10 minutes)

### 1.1 Create Project
1. Go to [supabase.com](https://supabase.com) and sign up
2. Click "New Project"
3. Name: **virtual-dev**
4. Choose region closest to you
5. Generate database password (save it!)
6. Click "Create project" and wait 2 mins

### 1.2 Create Tables
1. Go to **SQL Editor** in Supabase dashboard
2. Copy and paste this:

```sql
-- Chat messages table
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_session_id TEXT NOT NULL,
  sender_username TEXT NOT NULL,
  message TEXT NOT NULL,
  message_type TEXT CHECK (message_type IN ('user', 'npc')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_created ON chat_messages(created_at DESC);
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- Enable RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON chat_messages FOR SELECT USING (true);
CREATE POLICY "Public insert" ON chat_messages FOR INSERT WITH CHECK (true);

-- NPC configs table
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

-- Seed NPCs
INSERT INTO npc_configs (name, role, position, system_prompt, avatar_icon, description) VALUES
('Code Reviewer', 'code_reviewer', '{"x": 200, "y": 150}', 
  'You are a helpful code review assistant.', '👨‍💻', 'Get code feedback'),
('Debug Helper', 'debug_helper', '{"x": 600, "y": 150}',
  'You are a debugging expert.', '🐛', 'Fix bugs together'),
('Career Mentor', 'career_mentor', '{"x": 400, "y": 450}',
  'You are a tech career advisor.', '🎯', 'Career guidance');

ALTER TABLE npc_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read NPCs" ON npc_configs FOR SELECT USING (is_active = true);
```

3. Click **Run**
4. Go to **Table Editor** and verify tables exist

### 1.3 Get API Keys
1. Go to **Settings** → **API**
2. Copy:
   - Project URL
   - anon public key

---

## Step 2: Backend Setup (5 minutes)

### 2.1 Create Project
```bash
# Create backend directory
mkdir virtual-dev && cd virtual-dev
mkdir backend && cd backend

# Initialize Node.js project
npm init -y

# Install dependencies
npm install express socket.io cors dotenv uuid redis
npm install --save-dev typescript @types/node @types/express @types/uuid ts-node nodemon
```

### 2.2 Create Files

**`package.json`** - Add scripts:
```json
{
  "scripts": {
    "dev": "nodemon --exec ts-node src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js"
  }
}
```

**`tsconfig.json`:**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true
  }
}
```

**`.env`:**
```
PORT=3001
FRONTEND_URL=http://localhost:3000
REDIS_URL=redis://localhost:6379
```

**`src/server.ts`:**
```typescript
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:3000' }
});

app.use(cors());
app.use(express.json());

// Simple username generator
const adjectives = ['Swift', 'Clever', 'Brave', 'Cool', 'Epic'];
const nouns = ['Panda', 'Tiger', 'Dragon', 'Coder', 'Dev'];
const generateUsername = () => {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 1000);
  return `${adj}_${noun}_${num}`;
};

// Active users
const activeUsers = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join', (data) => {
    const username = generateUsername();
    const user = {
      sessionId: socket.id,
      username,
      position: { x: 400, y: 300 },
      avatarColor: '#' + Math.floor(Math.random()*16777215).toString(16)
    };
    
    activeUsers.set(socket.id, user);
    socket.emit('joined', user);
    io.emit('users:update', Array.from(activeUsers.values()));
  });

  socket.on('move', (data) => {
    const user = activeUsers.get(socket.id);
    if (user) {
      user.position = data.position;
      io.emit('user:moved', { sessionId: socket.id, position: data.position });
    }
  });

  socket.on('disconnect', () => {
    activeUsers.delete(socket.id);
    io.emit('user:disconnected', { sessionId: socket.id });
  });
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => console.log(`Server on port ${PORT}`));
```

### 2.3 Start Backend
```bash
npm run dev
```

You should see: `Server on port 3001`

---

## Step 3: Frontend Setup (10 minutes)

### 3.1 Create React App
```bash
# In a new terminal, from virtual-dev directory
npm create vite@latest frontend -- --template react-ts
cd frontend

# Install dependencies
npm install
npm install socket.io-client phaser @supabase/supabase-js zustand

# Install Tailwind
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### 3.2 Configure Tailwind

**`tailwind.config.js`:**
```javascript
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: {} },
  plugins: [],
}
```

**`src/index.css`:**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### 3.3 Environment Variables

**`.env.local`:**
```
VITE_BACKEND_URL=http://localhost:3001
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3.4 Create Minimal App

**`src/lib/supabase.ts`:**
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

**`src/services/socket.ts`:**
```typescript
import { io } from 'socket.io-client';

export const socket = io(import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001');
```

**`src/App.tsx`:**
```typescript
import { useEffect, useState } from 'react';
import { socket } from './services/socket';
import { supabase } from './lib/supabase';

interface User {
  sessionId: string;
  username: string;
  position: { x: number; y: number };
  avatarColor: string;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    // Connect to Socket.io
    socket.emit('join', {});
    
    socket.on('joined', (user) => {
      setCurrentUser(user);
      console.log('Joined as:', user.username);
    });

    socket.on('users:update', (allUsers) => {
      setUsers(allUsers);
    });

    // Subscribe to Supabase chat
    const channel = supabase
      .channel('chat')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages'
      }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
      socket.disconnect();
    };
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || !currentUser) return;
    
    await supabase.from('chat_messages').insert({
      sender_session_id: currentUser.sessionId,
      sender_username: currentUser.username,
      message: input,
      message_type: 'user'
    });
    
    setInput('');
  };

  if (!currentUser) {
    return <div className="flex items-center justify-center h-screen">
      <div className="text-xl">Connecting...</div>
    </div>;
  }

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Map Area */}
      <div className="flex-1 relative">
        <div className="absolute top-4 left-4 bg-gray-800 px-4 py-2 rounded">
          👋 {currentUser.username}
        </div>
        
        <div className="absolute top-4 right-4 bg-gray-800 px-4 py-2 rounded">
          👥 {users.length} online
        </div>

        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Virtual Dev</h1>
            <p className="text-gray-400">2D map with Phaser.js coming in Sprint 1...</p>
            <div className="mt-8">
              {users.map(user => (
                <div key={user.sessionId} className="mb-2">
                  <span style={{ color: user.avatarColor }}>●</span> {user.username}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Chat Panel */}
      <div className="w-80 bg-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h2 className="font-bold">Chat</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {messages.map((msg, i) => (
            <div key={i} className="text-sm">
              <span className="font-bold text-blue-400">{msg.sender_username}:</span>
              {' '}{msg.message}
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-gray-700">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type a message..."
            className="w-full px-3 py-2 bg-gray-700 rounded"
          />
        </div>
      </div>
    </div>
  );
}
```

### 3.5 Start Frontend
```bash
npm run dev
```

---

## Step 4: Test It! (5 minutes)

### 4.1 Open Browser
1. Go to `http://localhost:3000`
2. You should see:
   - Your random username (e.g., "Swift_Panda_42")
   - Number of users online
   - Chat panel on right

### 4.2 Test Chat
1. Type a message and press Enter
2. Message should appear instantly
3. Open another browser tab
4. Both tabs should see messages in real-time! 🎉

### 4.3 Test Multi-User
1. Open incognito window at `http://localhost:3000`
2. You should see:
   - Different username
   - "2 online" in both windows
   - Chat works between windows

---

## ✅ Success!

You now have:
- ✅ Backend server running (Socket.io for movement)
- ✅ Frontend React app running
- ✅ Supabase Realtime chat working
- ✅ Anonymous user access working
- ✅ Multi-user support

---

## Next Steps

### Immediate (Today)
1. Read `sprint1_implementation_checklist.md`
2. Add Phaser.js 2D map
3. Implement movement controls

### This Week
1. Complete Sprint 1 (all 5 user stories)
2. Deploy to staging environment
3. Share with friends for feedback

### This Month
1. Complete Sprints 2-3 (movement + proximity chat)
2. Integrate Claude API for NPCs
3. Launch MVP! 🚀

---

## Common Issues

### Backend won't start
- Check if port 3001 is available
- Verify Node.js version (20+)
- Check `.env` file exists

### Frontend can't connect
- Verify backend is running on port 3001
- Check VITE_BACKEND_URL in `.env.local`
- Look for CORS errors in console

### Supabase errors
- Verify API keys are correct
- Check if tables were created
- Ensure RLS policies are set up

### Chat not working
- Check Supabase Realtime is enabled
- Verify subscription in browser DevTools
- Look for errors in console

---

## Pro Tips

💡 **Use Browser DevTools:** Network tab shows Socket.io and Supabase connections

💡 **Check Supabase Logs:** Real-time logs in Supabase dashboard show all queries

💡 **Test with Multiple Tabs:** Best way to test real-time features

💡 **Use git from Day 1:** Commit early, commit often

💡 **Deploy Early:** Get feedback from real users ASAP

---

## Resources

- 📚 Full Agile Plan: `virtual_dev_agile_plan.md`
- 🏗️ Architecture: `virtual_dev_architecture.md`
- 🗄️ Supabase Guide: `supabase_setup_guide.md`
- ✅ Sprint 1 Checklist: `sprint1_implementation_checklist.md`
- 💬 Why Supabase: `why_supabase_realtime.md`

---

## Need Help?

1. Check documentation files
2. Review error messages carefully
3. Test each component individually
4. Ask in developer communities

---

**You're now ready to build Virtual Dev! 🎉**

*Quick Start Time: ~30 minutes*  
*Difficulty: Beginner-Friendly*  
*Next: Complete Sprint 1*

---

*Last Updated: November 12, 2025*  
*Version: 1.0*
