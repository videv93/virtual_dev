# Sprint 4 Setup Guide: NPC System

## 🎯 Overview

Sprint 4 implements AI-powered NPCs using the Claude API. You'll set up 3 NPCs with distinct personalities:
- **CodeGuardian** - Code Reviewer
- **BugBuster** - Debug Helper
- **CareerCompass** - Career Mentor

---

## 📋 Prerequisites

Before starting, ensure you have completed:
- ✅ Sprint 1-3 (Environment Setup, Movement, Chat System)
- ✅ Supabase account created
- ✅ Redis running

---

## 🚀 Setup Steps

### Step 1: Get Anthropic API Key

1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Sign up or log in
3. Navigate to **API Keys**
4. Create a new API key
5. Copy the key (starts with `sk-ant-...`)

### Step 2: Configure Backend Environment

Edit `apps/backend/.env`:

```bash
# Add your Anthropic API key
ANTHROPIC_API_KEY=sk-ant-your-actual-api-key-here

# Ensure Supabase credentials are set (from Sprint 3)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
```

**⚠️ Important:**
- Never commit your `.env` file
- Replace `your-actual-api-key-here` with your real API key
- If you don't have Supabase credentials yet, see Sprint 3 setup

### Step 3: Set Up Supabase Tables

1. Go to your Supabase project dashboard
2. Click **SQL Editor** in the left sidebar
3. Copy the contents of `docs/sql/npc_tables.sql`
4. Paste into the SQL Editor
5. Click **Run**

This will:
- Create `npc_configs` table
- Create `npc_conversations` table
- Set up Row-Level Security policies
- Seed 3 NPCs with personalities

### Step 4: Verify Database Setup

In Supabase SQL Editor, run:

```sql
SELECT id, name, role, position_x, position_y FROM npc_configs;
```

You should see 3 NPCs:
- **CodeGuardian** at position (200, 150)
- **BugBuster** at position (600, 450)
- **CareerCompass** at position (400, 300)

### Step 5: Build Shared Package

If you haven't already, build the shared types package:

```bash
cd virtual-dev
pnpm --filter @virtual-dev/shared build
```

### Step 6: Start the Application

Start both backend and frontend:

```bash
# Terminal 1: Start Redis (if not running)
redis-server

# Terminal 2: Start backend
pnpm --filter backend dev

# Terminal 3: Start frontend
pnpm --filter frontend dev
```

Or use the root workspace script:

```bash
pnpm dev
```

---

## ✅ Verification Checklist

### Backend Verification

1. Check backend console for success messages:
   ```
   ✅ Supabase client initialized
   ✅ Anthropic Claude API client initialized
   🚀 Server running on http://localhost:3001
   ```

2. Test health endpoint:
   ```bash
   curl http://localhost:3001/health
   ```

3. Verify NPC endpoint exists:
   ```bash
   curl -X POST http://localhost:3001/api/npc/chat \
     -H "Content-Type: application/json" \
     -d '{"npcId":"test","userId":"test","message":"hi"}'
   ```

   Should return an error (expected), but endpoint should exist.

### Frontend Verification

1. Open http://localhost:5173
2. You should see 3 robot icons on the map:
   - Light blue robot icons
   - Name labels above each NPC
   - Role labels below each NPC
3. Move your character close to an NPC (within 150px)
4. A popup should appear: "🤖 NPCs Nearby"
5. Click on an NPC name
6. A chat modal should open

### NPC Chat Testing

Test each NPC with personality-specific questions:

**CodeGuardian (Code Reviewer):**
```
You: "Can you review this function?
function add(a,b){return a+b;}"

Expected: Professional code review with suggestions
```

**BugBuster (Debug Helper):**
```
You: "I'm getting 'undefined is not a function' error.
What should I check?"

Expected: Systematic debugging guidance
```

**CareerCompass (Career Mentor):**
```
You: "Should I specialize in frontend or backend development?"

Expected: Career advice considering your goals
```

---

## 🎮 Using the NPCs

### How to Interact with NPCs:

1. **Find NPCs:**
   - Look for light blue robot icons on the map
   - NPCs have fixed positions (they don't move)
   - Name and role labels appear above/below each NPC

2. **Start a Conversation:**
   - Move your character close to an NPC (within 150px)
   - A "NPCs Nearby" popup will appear at the bottom center
   - Click on the NPC you want to talk to
   - A chat modal will open

3. **Chat:**
   - Type your message in the input field
   - Press Enter or click Send
   - Wait for the NPC to respond (usually < 3 seconds)
   - Conversation history is maintained

4. **Close:**
   - Click the X button in the top right
   - Or press Escape (if implemented)

### NPC Personalities:

**🛡️ CodeGuardian (Code Reviewer)**
- Best for: Code reviews, architecture advice, best practices
- Personality: Professional, thorough, constructive
- Example questions:
  - "Can you review my React component?"
  - "What's the best way to structure a Node.js API?"
  - "Is this code following SOLID principles?"

**🐛 BugBuster (Debug Helper)**
- Best for: Debugging, error messages, troubleshooting
- Personality: Patient, methodical, encouraging
- Example questions:
  - "I'm getting a CORS error. How do I fix it?"
  - "My API call returns undefined. What could be wrong?"
  - "How do I debug a memory leak?"

**🧭 CareerCompass (Career Mentor)**
- Best for: Career advice, learning paths, work-life balance
- Personality: Warm, supportive, pragmatic
- Example questions:
  - "Should I learn React or Vue?"
  - "How do I prepare for a senior developer interview?"
  - "Is it worth getting a CS degree?"

---

## 🔧 Troubleshooting

### NPCs Not Appearing

**Problem:** No robot icons on the map

**Solutions:**
1. Check backend console for Supabase errors
2. Verify Supabase credentials in `.env`
3. Ensure SQL script ran successfully
4. Check browser console for errors
5. Refresh the page

### Chat Not Working

**Problem:** Can't send messages or no response

**Solutions:**

1. **Check API Key:**
   ```bash
   # In backend console, you should see:
   ✅ Anthropic Claude API client initialized

   # If you see:
   ⚠️ Anthropic API key not found

   # Then add ANTHROPIC_API_KEY to apps/backend/.env
   ```

2. **Check API Quota:**
   - Go to Anthropic Console
   - Check your usage and limits
   - Ensure you have credits

3. **Check Network:**
   - Open browser DevTools > Network tab
   - Look for `/api/npc/chat` request
   - Check status code (should be 200)
   - Check response payload

4. **Check CORS:**
   - Ensure backend CORS is configured for frontend URL
   - Default: `http://localhost:5173`

### Slow Responses

**Problem:** NPCs take too long to respond

**Solutions:**
- Normal response time: 1-3 seconds
- If > 5 seconds:
  1. Check internet connection
  2. Check Anthropic API status
  3. Try a shorter message
  4. Restart backend

### Conversation Not Persisting

**Problem:** Conversation resets on page refresh

**Expected Behavior:**
- Conversations are stored in Supabase
- However, the current implementation starts fresh each time
- This is by design for the MVP
- To implement persistence, you'd need to:
  1. Load conversation history on NPC open
  2. Match by `npc_id` and `user_id`
  3. Display old messages in the modal

---

## 📊 Sprint 4 Deliverables

### Completed Features ✅

1. ✅ **NPC Placement System**
   - 3 NPCs with unique positions
   - Robot icon rendering in Phaser
   - Name and role labels

2. ✅ **NPC Conversation Trigger**
   - Proximity detection (150px radius)
   - "NPCs Nearby" popup
   - Click to open chat modal

3. ✅ **Claude API Integration**
   - Backend NPC service
   - `/api/npc/chat` endpoint
   - Conversation context management
   - Error handling
   - Supabase conversation storage

4. ✅ **NPC Personality System**
   - 3 NPCs with distinct roles
   - Custom system prompts
   - Consistent personalities
   - Role-specific responses

### Success Criteria

| Criteria | Status | Notes |
|----------|--------|-------|
| NPCs appear on map | ✅ | 3 robots with labels |
| Proximity triggers popup | ✅ | Within 150px |
| Chat modal opens on click | ✅ | Clean UI |
| Claude API responds | ✅ | Usually < 3s |
| Responses match personality | ✅ | Test each NPC |
| Conversation context maintained | ✅ | Within session |
| Error handling works | ✅ | Graceful failures |

---

## 💰 Cost Considerations

### Anthropic API Pricing

- **Claude 3.5 Sonnet:**
  - Input: $3.00 / million tokens
  - Output: $15.00 / million tokens

- **Estimated Costs:**
  - Average conversation: ~500 input + 200 output tokens
  - Cost per message: ~$0.004 (less than half a cent)
  - 1000 messages: ~$4
  - Monthly (100 users, 10 msgs each): ~$4-8

- **Free Tier:**
  - $5 free credits when you sign up
  - Good for ~1000+ messages

### Optimization Tips

1. **Limit message length:**
   - Keep user messages concise
   - Truncate long system prompts if needed

2. **Cache conversations:**
   - Load from Supabase instead of resending history

3. **Set max_tokens:**
   - Already set to 1024 in backend
   - Prevents excessive output

4. **Rate limiting:**
   - Add user rate limits if needed
   - E.g., 10 messages per user per hour

---

## 🎓 Learning Resources

### Anthropic Claude API

- [Official Docs](https://docs.anthropic.com/)
- [Claude API Cookbook](https://github.com/anthropics/anthropic-cookbook)
- [Best Practices](https://docs.anthropic.com/claude/docs/prompt-engineering)

### Prompt Engineering

- [Prompt Engineering Guide](https://www.promptingguide.ai/)
- [Claude Prompt Examples](https://docs.anthropic.com/claude/docs/prompt-examples)

---

## 🚀 Next Steps: Sprint 5

After completing Sprint 4, you're ready for **Sprint 5: Polish & UX**:

- [ ] User onboarding tutorial
- [ ] Username customization
- [ ] Zoom and pan controls
- [ ] Performance optimization
- [ ] Error handling improvements

See `docs/SPRINT5_SETUP.md` (to be created) for details.

---

## 🎉 Congratulations!

You've successfully implemented AI-powered NPCs! 🤖

Your Virtual Dev platform now has:
- ✅ Anonymous user access
- ✅ Real-time movement
- ✅ Proximity-based chat (user-to-user)
- ✅ AI-powered NPCs (user-to-AI)

**Test it out:**
1. Move close to each NPC
2. Ask them different questions
3. Notice their unique personalities
4. Check conversation history in Supabase

---

*Last Updated: November 12, 2025*
*Sprint: 4 - NPC System*
*Status: Complete ✅*
