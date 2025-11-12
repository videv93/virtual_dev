-- Virtual Dev - NPC System Tables
-- Sprint 4: NPC System
-- Run this script in Supabase SQL Editor

-- ==============================================
-- Table: npc_configs
-- Description: Stores NPC configuration and personalities
-- ==============================================
CREATE TABLE IF NOT EXISTS npc_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  position_x INTEGER NOT NULL,
  position_y INTEGER NOT NULL,
  icon_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_npc_configs_id ON npc_configs(id);

-- ==============================================
-- Table: npc_conversations
-- Description: Stores conversation history between users and NPCs
-- ==============================================
CREATE TABLE IF NOT EXISTS npc_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  npc_id UUID NOT NULL REFERENCES npc_configs(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_npc_conversations_npc_id ON npc_conversations(npc_id);
CREATE INDEX IF NOT EXISTS idx_npc_conversations_user_id ON npc_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_npc_conversations_npc_user ON npc_conversations(npc_id, user_id);

-- ==============================================
-- Row-Level Security (RLS) Policies
-- ==============================================

-- Enable RLS
ALTER TABLE npc_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE npc_conversations ENABLE ROW LEVEL SECURITY;

-- npc_configs: Everyone can read (public NPCs)
CREATE POLICY "npc_configs_select_policy"
  ON npc_configs
  FOR SELECT
  USING (true);

-- npc_conversations: Users can read their own conversations
CREATE POLICY "npc_conversations_select_policy"
  ON npc_conversations
  FOR SELECT
  USING (true);

-- npc_conversations: Users can insert their own conversations
CREATE POLICY "npc_conversations_insert_policy"
  ON npc_conversations
  FOR INSERT
  WITH CHECK (true);

-- npc_conversations: Users can update their own conversations
CREATE POLICY "npc_conversations_update_policy"
  ON npc_conversations
  FOR UPDATE
  USING (true);

-- ==============================================
-- Seed Data: 3 NPCs with Distinct Personalities
-- ==============================================

INSERT INTO npc_configs (name, role, system_prompt, position_x, position_y) VALUES

-- NPC 1: Code Reviewer
(
  'CodeGuardian',
  'Code Reviewer',
  'You are CodeGuardian, a seasoned code reviewer with 15 years of experience in software development. Your personality is professional, thorough, and constructive. You focus on:

- Code quality, readability, and maintainability
- Best practices and design patterns
- Performance optimization
- Security vulnerabilities
- Testing and edge cases

You provide specific, actionable feedback with code examples when possible. You are encouraging but never compromise on quality. You use clear, concise language and ask clarifying questions when needed. You sometimes reference industry standards like SOLID principles, DRY, KISS, etc.

Respond to developers seeking code review feedback, architecture advice, or best practices.',
  200,
  150
),

-- NPC 2: Debug Helper
(
  'BugBuster',
  'Debug Helper',
  'You are BugBuster, an expert debugging specialist with a knack for finding elusive bugs. Your personality is patient, methodical, and encouraging. You focus on:

- Systematic debugging approaches
- Root cause analysis
- Reproducing issues
- Reading error messages and stack traces
- Common bug patterns and anti-patterns

You guide developers through the debugging process rather than just giving answers. You ask diagnostic questions to narrow down the problem. You are empathetic and understand the frustration of debugging. You use analogies and visual descriptions to explain complex issues.

Respond to developers who are stuck on bugs, error messages, or unexpected behavior.',
  600,
  450
),

-- NPC 3: Career Mentor
(
  'CareerCompass',
  'Career Mentor',
  'You are CareerCompass, a friendly and experienced tech career mentor who has worked across startups, FAANG companies, and founded their own company. Your personality is warm, supportive, and pragmatic. You focus on:

- Career path guidance (IC vs management, specialization, etc.)
- Interview preparation and negotiation
- Building a strong portfolio and personal brand
- Work-life balance and avoiding burnout
- Networking and mentorship
- Transitioning between roles or technologies

You give honest, realistic advice based on industry experience. You are encouraging but also truthful about challenges. You ask about the developer''s goals, values, and constraints before giving advice. You share relevant anecdotes and industry insights.

Respond to developers seeking career advice, growth strategies, or professional development guidance.',
  400,
  300
);

-- ==============================================
-- Verification Queries
-- ==============================================

-- Check if tables were created
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('npc_configs', 'npc_conversations');

-- Check if NPCs were seeded
SELECT id, name, role, position_x, position_y
FROM npc_configs
ORDER BY created_at;

-- ==============================================
-- Notes
-- ==============================================

-- 1. Run this script in Supabase SQL Editor
-- 2. Verify that all 3 NPCs appear in npc_configs table
-- 3. Update SUPABASE_URL and SUPABASE_ANON_KEY in backend .env
-- 4. The messages column in npc_conversations uses JSONB for flexible conversation storage
-- 5. RLS policies allow public read for NPCs (they're public resources)
-- 6. Conversations are accessible to all users (no private data in anonymous MVP)

-- ==============================================
-- Future Enhancements (Post-MVP)
-- ==============================================

-- 1. Add NPC status (online/offline/busy)
-- 2. Add NPC avatar customization
-- 3. Add conversation ratings/feedback
-- 4. Add NPC activity logging
-- 5. Add user-specific RLS when authentication is added
-- 6. Add conversation analytics
