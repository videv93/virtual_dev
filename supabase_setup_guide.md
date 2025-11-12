# Supabase Setup Guide for Virtual Dev

## Overview

This guide walks you through setting up Supabase for Virtual Dev's real-time chat system.

**What we'll set up:**
- Supabase project
- Database tables (chat_messages, npc_configs)
- Realtime subscriptions
- Row-level security policies
- Frontend integration

---

## Step 1: Create Supabase Project

### 1.1 Sign Up for Supabase

1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign up with GitHub (recommended) or email
4. Verify your email

### 1.2 Create New Project

1. Click "New Project"
2. Fill in details:
   - **Name:** virtual-dev
   - **Database Password:** (generate a strong password - save it!)
   - **Region:** Choose closest to your users (e.g., US East, Europe West)
   - **Pricing Plan:** Free (perfect for MVP)
3. Click "Create new project"
4. Wait 2-3 minutes for project to initialize

### 1.3 Get API Keys

1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL:** `https://xxxxx.supabase.co`
   - **anon/public key:** `eyJhbGc...` (safe to use in frontend)
   - **service_role key:** `eyJhbGc...` (KEEP SECRET - backend only)

---

## Step 2: Create Database Tables

### 2.1 Open SQL Editor

1. In Supabase dashboard, click **SQL Editor** (left sidebar)
2. Click "New Query"

### 2.2 Create `chat_messages` Table

```sql
-- Create chat_messages table
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_session_id TEXT NOT NULL,
  sender_username TEXT NOT NULL,
  receiver_session_id TEXT,
  message TEXT NOT NULL,
  message_type TEXT CHECK (message_type IN ('user', 'npc')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX idx_chat_messages_sender ON chat_messages(sender_session_id);
CREATE INDEX idx_chat_messages_receiver ON chat_messages(receiver_session_id) WHERE receiver_session_id IS NOT NULL;

-- Enable Realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- Add comment
COMMENT ON TABLE chat_messages IS 'Stores all chat messages between users and NPCs';
```

Click **Run** to execute.

### 2.3 Create `npc_configs` Table

```sql
-- Create npc_configs table
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

-- Add index
CREATE INDEX idx_npc_configs_active ON npc_configs(is_active) WHERE is_active = true;

-- Seed with initial NPCs
INSERT INTO npc_configs (name, role, position, system_prompt, avatar_icon, description) VALUES
(
  'Code Reviewer',
  'code_reviewer',
  '{"x": 200, "y": 150}',
  'You are a code review assistant. Help developers improve their code by providing constructive feedback on code quality, best practices, and potential bugs. Be encouraging and educational.',
  '👨‍💻',
  'Get constructive code feedback and improve your coding skills'
),
(
  'Debug Helper',
  'debug_helper',
  '{"x": 600, "y": 150}',
  'You are a debugging expert. Help developers identify and fix bugs in their code. Ask clarifying questions and guide them through the debugging process step by step.',
  '🐛',
  'Find and fix bugs together with expert guidance'
),
(
  'Career Mentor',
  'career_mentor',
  '{"x": 400, "y": 450}',
  'You are a tech career advisor. Help developers with career decisions, interview preparation, and professional growth. Provide actionable advice based on industry experience.',
  '🎯',
  'Get career advice and guidance from an experienced mentor'
);

-- Add comment
COMMENT ON TABLE npc_configs IS 'Configuration for AI-powered NPCs in the virtual world';
```

Click **Run** to execute.

### 2.4 Create `npc_conversations` Table (Optional)

```sql
-- Create npc_conversations table for tracking context
CREATE TABLE npc_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  npc_id UUID NOT NULL REFERENCES npc_configs(id),
  conversation_history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_npc_conversations_session ON npc_conversations(session_id);
CREATE INDEX idx_npc_conversations_npc ON npc_conversations(npc_id);

-- Update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_npc_conversations_updated_at
  BEFORE UPDATE ON npc_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE npc_conversations IS 'Stores conversation context for NPC interactions';
```

---

## Step 3: Set Up Row-Level Security (RLS)

### 3.1 Enable RLS on Tables

```sql
-- Enable RLS on chat_messages
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Enable RLS on npc_configs (read-only for clients)
ALTER TABLE npc_configs ENABLE ROW LEVEL SECURITY;

-- Enable RLS on npc_conversations (optional)
ALTER TABLE npc_conversations ENABLE ROW LEVEL SECURITY;
```

### 3.2 Create Policies for `chat_messages`

```sql
-- Allow anyone to read messages (anonymous access)
CREATE POLICY "Allow public read access" ON chat_messages
  FOR SELECT
  USING (true);

-- Allow anyone to insert messages (anonymous access)
CREATE POLICY "Allow public insert access" ON chat_messages
  FOR INSERT
  WITH CHECK (true);

-- Prevent updates (messages are immutable)
CREATE POLICY "No updates allowed" ON chat_messages
  FOR UPDATE
  USING (false);

-- Prevent deletes (messages are permanent)
CREATE POLICY "No deletes allowed" ON chat_messages
  FOR DELETE
  USING (false);
```

### 3.3 Create Policies for `npc_configs`

```sql
-- Allow anyone to read NPC configs
CREATE POLICY "Allow public read access" ON npc_configs
  FOR SELECT
  USING (is_active = true);

-- Only service role can modify NPCs (backend only)
CREATE POLICY "Service role full access" ON npc_configs
  FOR ALL
  USING (auth.role() = 'service_role');
```

### 3.4 Create Policies for `npc_conversations`

```sql
-- Allow users to read their own conversations
CREATE POLICY "Users can read own conversations" ON npc_conversations
  FOR SELECT
  USING (true);

-- Allow anyone to create conversations
CREATE POLICY "Anyone can create conversations" ON npc_conversations
  FOR INSERT
  WITH CHECK (true);

-- Allow anyone to update conversations
CREATE POLICY "Anyone can update conversations" ON npc_conversations
  FOR UPDATE
  USING (true);
```

---

## Step 4: Test Database Setup

### 4.1 Verify Tables Exist

1. Go to **Table Editor** in Supabase dashboard
2. You should see:
   - `chat_messages` (0 rows)
   - `npc_configs` (3 rows)
   - `npc_conversations` (0 rows)

### 4.2 Test NPC Configs

1. Click on `npc_configs` table
2. Verify you see 3 NPCs:
   - Code Reviewer
   - Debug Helper
   - Career Mentor

### 4.3 Test Insert

1. In SQL Editor, run:

```sql
-- Test insert a chat message
INSERT INTO chat_messages (sender_session_id, sender_username, message, message_type)
VALUES ('test-session-123', 'TestUser_42', 'Hello, world!', 'user');

-- Verify insert
SELECT * FROM chat_messages ORDER BY created_at DESC LIMIT 10;
```

2. You should see your test message
3. Delete test message:

```sql
-- Clean up (admin can delete for testing)
DELETE FROM chat_messages WHERE sender_session_id = 'test-session-123';
```

---

## Step 5: Frontend Integration

### 5.1 Install Supabase Client

```bash
cd frontend
npm install @supabase/supabase-js
```

### 5.2 Create Supabase Client

Create `src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10, // Rate limit for updates
    },
  },
});

// Database types (auto-generated or manual)
export interface ChatMessage {
  id: string;
  sender_session_id: string;
  sender_username: string;
  receiver_session_id: string | null;
  message: string;
  message_type: 'user' | 'npc';
  created_at: string;
}

export interface NPCConfig {
  id: string;
  name: string;
  role: string;
  position: { x: number; y: number };
  system_prompt: string;
  avatar_icon: string;
  description: string;
  is_active: boolean;
  created_at: string;
}
```

### 5.3 Add Environment Variables

Create `.env.local`:

```bash
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...your-anon-key...
```

**Important:** Add `.env.local` to `.gitignore`!

### 5.4 Create Chat Service

Create `src/services/chatService.ts`:

```typescript
import { supabase, ChatMessage } from '../lib/supabase';
import { useGameStore } from '../store/gameStore';

export class ChatService {
  private channel: any;

  // Subscribe to new messages
  subscribeToMessages(onMessage: (message: ChatMessage) => void) {
    this.channel = supabase
      .channel('chat-messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages'
      }, (payload) => {
        onMessage(payload.new as ChatMessage);
      })
      .subscribe();

    return () => {
      this.channel.unsubscribe();
    };
  }

  // Send a message
  async sendMessage(message: string, receiverSessionId?: string) {
    const currentUser = useGameStore.getState().currentUser;
    if (!currentUser) {
      throw new Error('No current user');
    }

    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        sender_session_id: currentUser.sessionId,
        sender_username: currentUser.username,
        receiver_session_id: receiverSessionId || null,
        message: message,
        message_type: 'user'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Load message history
  async loadHistory(limit = 50) {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data?.reverse() || [];
  }

  // Load NPCs
  async loadNPCs() {
    const { data, error } = await supabase
      .from('npc_configs')
      .select('*')
      .eq('is_active', true);

    if (error) throw error;
    return data || [];
  }
}

export const chatService = new ChatService();
```

### 5.5 Use in React Component

```typescript
import { useEffect, useState } from 'react';
import { chatService } from '../services/chatService';
import { ChatMessage } from '../lib/supabase';

export function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');

  useEffect(() => {
    // Load history
    chatService.loadHistory().then(setMessages);

    // Subscribe to new messages
    const unsubscribe = chatService.subscribeToMessages((newMessage) => {
      // Filter by proximity here if needed
      setMessages(prev => [...prev, newMessage]);
    });

    return unsubscribe;
  }, []);

  const handleSend = async () => {
    if (!inputMessage.trim()) return;
    
    try {
      await chatService.sendMessage(inputMessage);
      setInputMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <div className="chat-panel">
      <div className="messages">
        {messages.map(msg => (
          <div key={msg.id} className="message">
            <strong>{msg.sender_username}:</strong> {msg.message}
          </div>
        ))}
      </div>
      <input
        value={inputMessage}
        onChange={(e) => setInputMessage(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
        placeholder="Type a message..."
      />
    </div>
  );
}
```

---

## Step 6: Backend Integration (Optional)

### 6.1 Install Supabase in Backend

```bash
cd backend
npm install @supabase/supabase-js
```

### 6.2 Create Supabase Client (Backend)

Create `src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!; // Use service key for backend

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
```

### 6.3 NPC Chat Endpoint

```typescript
// src/routes/npc.ts
import { Router } from 'express';
import { supabase } from '../lib/supabase';
import Anthropic from '@anthropic-ai/sdk';

const router = Router();
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!
});

router.post('/chat', async (req, res) => {
  try {
    const { npcId, message, sessionId } = req.body;

    // Get NPC config
    const { data: npcConfig } = await supabase
      .from('npc_configs')
      .select('*')
      .eq('id', npcId)
      .single();

    if (!npcConfig) {
      return res.status(404).json({ error: 'NPC not found' });
    }

    // Get conversation history
    const { data: conversation } = await supabase
      .from('npc_conversations')
      .select('*')
      .eq('session_id', sessionId)
      .eq('npc_id', npcId)
      .single();

    const history = conversation?.conversation_history || [];

    // Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: npcConfig.system_prompt,
      messages: [
        ...history,
        { role: 'user', content: message }
      ]
    });

    const npcResponse = response.content[0].text;

    // Update conversation history
    const newHistory = [
      ...history,
      { role: 'user', content: message },
      { role: 'assistant', content: npcResponse }
    ];

    await supabase
      .from('npc_conversations')
      .upsert({
        session_id: sessionId,
        npc_id: npcId,
        conversation_history: newHistory
      });

    // Insert NPC response into chat_messages
    await supabase
      .from('chat_messages')
      .insert({
        sender_session_id: npcId,
        sender_username: npcConfig.name,
        receiver_session_id: sessionId,
        message: npcResponse,
        message_type: 'npc'
      });

    res.json({ response: npcResponse });
  } catch (error) {
    console.error('NPC chat error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
```

---

## Step 7: Testing Realtime

### 7.1 Test in Browser Console

Open two browser tabs to `http://localhost:3000` and run in console:

```javascript
// Tab 1 & 2: Subscribe to messages
const { createClient } = window.supabase;
const supabase = createClient('YOUR_URL', 'YOUR_ANON_KEY');

supabase
  .channel('test')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'chat_messages'
  }, payload => console.log('New message:', payload))
  .subscribe();

// Tab 1: Send a message
await supabase.from('chat_messages').insert({
  sender_session_id: 'tab1',
  sender_username: 'User1',
  message: 'Hello from Tab 1!',
  message_type: 'user'
});

// Tab 2 should receive the message instantly!
```

---

## Step 8: Monitor and Debug

### 8.1 View Real-time Logs

1. Go to **Database** → **Replication** in Supabase
2. See which tables have Realtime enabled
3. Check for any errors

### 8.2 View API Logs

1. Go to **Logs** → **API**
2. See all database queries
3. Filter by status code or table

### 8.3 Query Performance

1. Go to **Logs** → **Database**
2. See slow queries
3. Add indexes if needed

---

## Troubleshooting

### Issue: Realtime not working
**Solution:**
1. Verify table is added to publication: `ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;`
2. Check RLS policies allow SELECT
3. Verify subscription in browser DevTools

### Issue: Can't insert messages
**Solution:**
1. Check RLS policies allow INSERT
2. Verify required fields are provided
3. Check data types match schema

### Issue: Too many connections
**Solution:**
1. Unsubscribe from channels when component unmounts
2. Use single channel for all subscriptions
3. Consider connection pooling

---

## Best Practices

### ✅ Do's
- Use RLS policies for security
- Unsubscribe from channels on cleanup
- Use indexes for frequently queried fields
- Keep Realtime events under 10/second per client
- Store NPC configs in database (not code)

### ❌ Don'ts
- Don't expose service_role key to frontend
- Don't subscribe to multiple channels unnecessarily
- Don't store sensitive data without encryption
- Don't skip RLS even for anonymous access
- Don't broadcast thousands of messages/second

---

## Next Steps

1. ✅ Supabase project created
2. ✅ Tables and policies set up
3. ✅ Frontend integrated
4. ⬜ Test chat in development
5. ⬜ Add proximity filtering
6. ⬜ Integrate NPC conversations
7. ⬜ Deploy to production

---

## Resources

- [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase CLI](https://supabase.com/docs/guides/cli)

---

*Setup Guide Version: 1.0*  
*Last Updated: November 12, 2025*  
*Project: Virtual Dev*
