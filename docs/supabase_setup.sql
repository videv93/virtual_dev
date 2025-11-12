-- Virtual Dev - Supabase Database Setup
-- Run this script in your Supabase SQL Editor

-- ============================================
-- 1. Create chat_messages table
-- ============================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  message TEXT NOT NULL,
  position_x NUMERIC NOT NULL,
  position_y NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);

-- ============================================
-- 2. Enable Row Level Security (RLS)
-- ============================================
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Allow all users to read messages (no authentication required)
CREATE POLICY "Allow public read access" ON chat_messages
  FOR SELECT
  USING (true);

-- Allow all users to insert messages (no authentication required)
CREATE POLICY "Allow public insert access" ON chat_messages
  FOR INSERT
  WITH CHECK (true);

-- ============================================
-- 3. Enable Realtime
-- ============================================
-- Enable realtime for chat_messages table
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- ============================================
-- 4. Create npc_configs table (for Sprint 4)
-- ============================================
CREATE TABLE IF NOT EXISTS npc_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  position_x NUMERIC NOT NULL,
  position_y NUMERIC NOT NULL,
  icon_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for npc_configs
ALTER TABLE npc_configs ENABLE ROW LEVEL SECURITY;

-- Allow public read access for NPCs
CREATE POLICY "Allow public read access" ON npc_configs
  FOR SELECT
  USING (true);

-- ============================================
-- 5. Seed initial NPCs (optional - for Sprint 4)
-- ============================================
INSERT INTO npc_configs (name, role, system_prompt, position_x, position_y, icon_url)
VALUES
  (
    'Code Reviewer',
    'Senior Developer',
    'You are a helpful senior developer who reviews code and provides constructive feedback. You are friendly, encouraging, and focus on best practices, code quality, and maintainability. Keep responses concise and actionable.',
    200,
    200,
    null
  ),
  (
    'Debug Helper',
    'Debugging Expert',
    'You are an expert at debugging code. You help developers find and fix bugs by asking clarifying questions and suggesting debugging strategies. You are patient and methodical in your approach.',
    400,
    200,
    null
  ),
  (
    'Career Mentor',
    'Tech Career Advisor',
    'You are a career mentor who helps developers with career advice, interview preparation, and professional development. You are supportive and provide practical guidance based on industry experience.',
    600,
    200,
    null
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 6. Create npc_conversations table (for Sprint 4)
-- ============================================
CREATE TABLE IF NOT EXISTS npc_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  npc_id UUID NOT NULL REFERENCES npc_configs(id),
  user_id TEXT NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_npc_conversations_user_id ON npc_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_npc_conversations_npc_id ON npc_conversations(npc_id);

-- Enable RLS for npc_conversations
ALTER TABLE npc_conversations ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own conversations
CREATE POLICY "Users can read own conversations" ON npc_conversations
  FOR SELECT
  USING (true);

-- Allow users to insert conversations
CREATE POLICY "Users can insert conversations" ON npc_conversations
  FOR INSERT
  WITH CHECK (true);

-- Allow users to update their own conversations
CREATE POLICY "Users can update own conversations" ON npc_conversations
  FOR UPDATE
  USING (true);

-- ============================================
-- 7. Verification queries
-- ============================================
-- Run these to verify your setup:

-- Check if tables exist
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
-- AND table_name IN ('chat_messages', 'npc_configs', 'npc_conversations');

-- Check if RLS is enabled
-- SELECT tablename, rowsecurity FROM pg_tables
-- WHERE schemaname = 'public'
-- AND tablename IN ('chat_messages', 'npc_configs', 'npc_conversations');

-- Check realtime publication
-- SELECT schemaname, tablename FROM pg_publication_tables
-- WHERE pubname = 'supabase_realtime';

-- Test insert a message
-- INSERT INTO chat_messages (user_id, username, message, position_x, position_y)
-- VALUES ('test-user-1', 'TestUser', 'Hello, World!', 100, 100);

-- Test query messages
-- SELECT * FROM chat_messages ORDER BY created_at DESC LIMIT 10;
