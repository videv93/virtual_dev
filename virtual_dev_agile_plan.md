# Virtual Dev - Agile Project Plan

## Project Overview
**Product Name:** Virtual Dev  
**Vision:** A web-based 2D interactive platform where developers can hang out, collaborate, and interact with AI-powered NPC agents  
**Release Goal:** Launch MVP with basic 2D movement, proximity chat, and NPC interactions

---

## Product Backlog

### Epic 1: Core Platform Infrastructure
- Anonymous user access with random username generation
- Lightweight session management (localStorage-based)
- Real-time WebSocket connection infrastructure
- 2D map rendering system
- Minimal API foundation (no user database required)

### Epic 2: User Movement & Interaction
- 2D avatar movement system
- Collision detection
- Proximity detection between users
- User presence indicators

### Epic 3: Chat System
- Real-time messaging infrastructure
- Side panel chat UI
- Center-bottom encounter popup
- Chat history persistence

### Epic 4: NPC Agent System
- NPC placement and configuration
- AI integration (Claude API)
- Contextual conversation system
- NPC personality and role system

### Epic 5: User Experience & Polish
- Onboarding flow
- User profile management
- Map navigation controls
- Performance optimization

---

## Sprint Plan (2-week sprints)

### Sprint 0: Project Setup & Planning (Week -1)
**Goal:** Establish development environment and team alignment

**Activities:**
- Set up repositories (frontend, backend)
- Configure CI/CD pipeline
- Create development, staging, production environments
- Define team roles and ceremonies
- Set up project management tools (Jira, Trello, or Linear)
- Architecture review and technical decisions

**Deliverables:**
- Development environment ready
- Architecture documentation
- Sprint schedule
- Definition of Done (DoD) established

---

### Sprint 1: Foundation & Anonymous Access (Weeks 1-2)
**Sprint Goal:** Users can instantly join the virtual space as anonymous users and see the basic map

**User Stories:**

1. **US-1.1: Anonymous User Entry**
   - **As a** visitor
   - **I want to** instantly access the platform without registration
   - **So that** I can quickly explore the virtual space
   - **Acceptance Criteria:**
     - User visits virtual-dev.com and immediately enters
     - Random username generated (e.g., "Dev_1234", "Coder_5678")
     - No login or signup required
     - Session ID stored in localStorage for reconnection
   - **Story Points:** 3
   - **Priority:** Must Have

2. **US-1.2: Random Username Generation**
   - **As a** user
   - **I want** an automatically generated username
   - **So that** I can be identified in the virtual space
   - **Acceptance Criteria:**
     - Username format: [Adjective]_[Noun]_[Number] (e.g., "Swift_Panda_42")
     - Username displayed above user's dot
     - Username persisted during session
     - Collision-free username generation
   - **Story Points:** 2
   - **Priority:** Must Have

3. **US-1.3: Basic 2D Map Display**
   - **As a** user
   - **I want to** see a 2D map environment immediately
   - **So that** I can visualize the virtual space
   - **Acceptance Criteria:**
     - Map renders instantly on page load
     - Map has boundaries and visual grid/texture
     - User's position shown as colored dot
     - Map is responsive to window size
   - **Story Points:** 8
   - **Priority:** Must Have

4. **US-1.4: WebSocket Connection**
   - **As a** user
   - **I want** real-time connection to the server
   - **So that** my actions sync instantly
   - **Acceptance Criteria:**
     - WebSocket establishes immediately on page load
     - Connection status indicator shown
     - Automatic reconnection on disconnect
     - Heartbeat mechanism implemented
   - **Story Points:** 5
   - **Priority:** Must Have

5. **US-1.5: Session Persistence**
   - **As a** user
   - **I want** to keep my username if I refresh
   - **So that** I don't lose my identity during the session
   - **Acceptance Criteria:**
     - Session ID stored in localStorage
     - Same username restored on refresh/reconnect
     - Session expires after 24 hours
     - New session generates new username
   - **Story Points:** 3
   - **Priority:** Should Have

**Sprint Velocity Target:** 21 points

**Technical Tasks:**
- Set up Express.js server with Socket.io
- Create random username generation algorithm
- Set up lightweight session management (no database for auth)
- Create React app with Phaser.js 3
- Implement WebSocket client connection
- Create basic map component
- Implement localStorage session handling

**Definition of Done:**
- Code reviewed and merged
- Unit tests written (>80% coverage)
- Integration tests pass
- Deployed to staging environment
- Product Owner accepts user stories

---

### Sprint 2: Movement System (Weeks 3-4)
**Sprint Goal:** Users can move their avatar around the map and see other users

**User Stories:**

1. **US-2.1: Avatar Movement Controls**
   - **As a** user
   - **I want to** move my avatar using keyboard/mouse
   - **So that** I can navigate the virtual space
   - **Acceptance Criteria:**
     - WASD or Arrow keys move avatar
     - Click-to-move with mouse works
     - Movement is smooth (interpolated)
     - Avatar cannot move outside boundaries
   - **Story Points:** 8
   - **Priority:** Must Have

2. **US-2.2: Real-time Position Sync**
   - **As a** user
   - **I want** my position to sync with other users
   - **So that** others can see where I am
   - **Acceptance Criteria:**
     - Position updates broadcast to all users
     - Updates throttled (max 10/second)
     - Smooth interpolation for remote users
     - Position persisted on disconnect
   - **Story Points:** 8
   - **Priority:** Must Have

3. **US-2.3: Multi-user Display**
   - **As a** user
   - **I want to** see other users on the map
   - **So that** I know who else is online
   - **Acceptance Criteria:**
     - Other users shown as colored dots
     - Username label appears on hover
     - Different colors for different users
     - Smooth animation when users move
   - **Story Points:** 5
   - **Priority:** Must Have

4. **US-2.4: Collision Detection**
   - **As a** user
   - **I want** collision detection with boundaries
   - **So that** I cannot move through walls
   - **Acceptance Criteria:**
     - Avatar stops at map boundaries
     - (Future: collision with objects)
     - Smooth collision response
   - **Story Points:** 3
   - **Priority:** Should Have

**Sprint Velocity Target:** 24 points

**Technical Tasks:**
- Implement movement input handlers
- Create position update WebSocket events
- Build movement interpolation system
- Implement collision detection algorithm
- Create user state management (Redux/Context)
- Optimize network message format
- Add user presence tracking

---

### Sprint 3: Proximity & Chat Infrastructure (Weeks 5-6)
**Sprint Goal:** Users can detect proximity and see basic chat interface

**User Stories:**

1. **US-3.1: Proximity Detection**
   - **As a** user
   - **I want** to know when I'm near another user/NPC
   - **So that** I can interact with them
   - **Acceptance Criteria:**
     - Proximity radius defined (e.g., 100px)
     - Visual indicator when in proximity
     - Proximity events triggered accurately
     - Performance optimized (spatial indexing)
   - **Story Points:** 8
   - **Priority:** Must Have

2. **US-3.2: Side Panel Chat UI**
   - **As a** user
   - **I want** a persistent chat panel
   - **So that** I can see conversation history
   - **Acceptance Criteria:**
     - Chat panel on right side (collapsible)
     - Shows active conversations
     - Scrollable message history
     - Shows online user list
   - **Story Points:** 5
   - **Priority:** Must Have

3. **US-3.3: User-to-User Messaging (Supabase Realtime)**
   - **As a** user
   - **I want to** send messages to nearby users
   - **So that** I can communicate
   - **Acceptance Criteria:**
     - Can send text messages via Supabase
     - Messages appear in real-time using Supabase Realtime
     - Shows sender username and timestamp
     - Messages persist in Supabase database
     - Supabase Realtime subscriptions for live updates
   - **Story Points:** 5
   - **Priority:** Must Have

4. **US-3.4: Encounter Popup UI**
   - **As a** user
   - **I want** a popup when encountering someone
   - **So that** I'm notified of interactions
   - **Acceptance Criteria:**
     - Popup appears at center-bottom
     - Shows who you encountered
     - Dismissable with X button
     - Auto-dismiss after 5 seconds
   - **Story Points:** 3
   - **Priority:** Should Have

**Sprint Velocity Target:** 21 points

**Technical Tasks:**
- Implement spatial indexing for proximity (quadtree or grid)
- Set up Supabase project and database
- Create chat messages table in Supabase
- Configure Supabase Realtime subscriptions
- Build chat UI components (React)
- Integrate Supabase client in frontend
- Add notification system for encounters

---

### Sprint 4: NPC Agent Integration (Weeks 7-8)
**Sprint Goal:** Users can interact with AI-powered NPC agents

**User Stories:**

1. **US-4.1: NPC Placement System**
   - **As an** admin
   - **I want to** place NPCs on the map
   - **So that** users can find and interact with them
   - **Acceptance Criteria:**
     - NPCs displayed with unique icons/colors
     - NPCs have fixed positions
     - NPCs show name label
     - NPCs visible to all users
   - **Story Points:** 5
   - **Priority:** Must Have

2. **US-4.2: NPC Conversation Trigger**
   - **As a** user
   - **I want to** start conversation when near NPC
   - **So that** I can get AI assistance
   - **Acceptance Criteria:**
     - Popup appears when entering NPC proximity
     - Shows NPC name and role description
     - "Start Conversation" button available
     - Opens dedicated chat interface
   - **Story Points:** 5
   - **Priority:** Must Have

3. **US-4.3: Claude API Integration with Supabase**
   - **As a** user
   - **I want** NPCs to respond intelligently
   - **So that** I get helpful developer assistance
   - **Acceptance Criteria:**
     - NPC responses generated via Claude API
     - Context maintained during conversation
     - Response time < 3 seconds
     - Error handling for API failures
     - Conversation history stored in Supabase
   - **Story Points:** 13
   - **Priority:** Must Have

4. **US-4.4: NPC Personality System**
   - **As a** user
   - **I want** NPCs to have distinct personalities
   - **So that** different NPCs serve different purposes
   - **Acceptance Criteria:**
     - Each NPC has system prompt defining role
     - Roles: Code Reviewer, Debug Helper, Career Mentor
     - Consistent personality in responses
     - Role visible in NPC description
   - **Story Points:** 5
   - **Priority:** Should Have

**Sprint Velocity Target:** 28 points

**Technical Tasks:**
- Create NPC configuration table in Supabase
- Build NPC management API endpoints
- Integrate Anthropic Claude API
- Implement conversation context management
- Store NPC conversations in Supabase
- Create NPC chat UI (different from user chat)
- Add streaming responses for better UX
- Implement rate limiting for API calls

---

### Sprint 5: User Experience & Polish (Weeks 9-10)
**Sprint Goal:** Platform is polished, performant, and ready for beta users

**User Stories:**

1. **US-5.1: User Onboarding**
   - **As a** new user
   - **I want** guided onboarding
   - **So that** I understand how to use the platform
   - **Acceptance Criteria:**
     - Tutorial overlay on first login
     - Shows movement controls
     - Explains NPC interactions
     - Skippable with checkbox
   - **Story Points:** 5
   - **Priority:** Should Have

2. **US-5.2: Optional Username Customization**
   - **As a** user
   - **I want to** optionally customize my username
   - **So that** I can have a more personal identity
   - **Acceptance Criteria:**
     - Can change username in settings (stored in localStorage)
     - Username must be unique in current session
     - Avatar color customization available
     - Changes persist for current session only
   - **Story Points:** 5
   - **Priority:** Should Have

3. **US-5.3: Map Navigation Controls**
   - **As a** user
   - **I want** intuitive map controls
   - **So that** I can navigate easily
   - **Acceptance Criteria:**
     - Zoom in/out functionality
     - Pan/drag map with mouse
     - Mini-map overview
     - Reset view button
   - **Story Points:** 5
   - **Priority:** Should Have

4. **US-5.4: Performance Optimization**
   - **As a** user
   - **I want** smooth performance
   - **So that** the experience is enjoyable
   - **Acceptance Criteria:**
     - 60fps rendering maintained
     - Network payload optimized
     - Lazy loading for distant entities
     - Memory leaks fixed
   - **Story Points:** 8
   - **Priority:** Must Have

5. **US-5.5: Error Handling & Feedback**
   - **As a** user
   - **I want** clear error messages
   - **So that** I understand what went wrong
   - **Acceptance Criteria:**
     - Toast notifications for errors
     - Graceful handling of disconnections
     - Loading states for async operations
     - Helpful error messages
   - **Story Points:** 3
   - **Priority:** Must Have

**Sprint Velocity Target:** 26 points

**Technical Tasks:**
- Implement username customization with localStorage
- Add avatar color picker
- Optimize WebSocket message batching
- Add error tracking (Sentry)
- Implement analytics (Mixpanel/Amplitude)
- Create monitoring dashboards
- Load testing and optimization

---

### Sprint 6: Testing & Launch Prep (Weeks 11-12)
**Sprint Goal:** Platform is fully tested and ready for production launch

**User Stories:**

1. **US-6.1: Security & Rate Limiting**
   - **As a** product owner
   - **I want** security measures in place
   - **So that** the platform is protected from abuse
   - **Acceptance Criteria:**
     - XSS protection implemented
     - Rate limiting on WebSocket and API endpoints
     - HTTPS enforced
     - Input sanitization for usernames and chat
   - **Story Points:** 5
   - **Priority:** Must Have

2. **US-6.2: Mobile Responsiveness**
   - **As a** mobile user
   - **I want** the platform to work on mobile
   - **So that** I can access it anywhere
   - **Acceptance Criteria:**
     - Responsive layout for mobile screens
     - Touch controls for movement
     - Mobile-optimized chat UI
     - Tested on iOS and Android
   - **Story Points:** 13
   - **Priority:** Should Have

3. **US-6.3: Admin Dashboard**
   - **As an** admin
   - **I want** a dashboard to manage the platform
   - **So that** I can monitor and configure
   - **Acceptance Criteria:**
     - View active users
     - Manage NPC configurations
     - View system metrics
     - Moderate chat content
   - **Story Points:** 8
   - **Priority:** Should Have

**Sprint Velocity Target:** 26 points

**Activities:**
- End-to-end testing
- User acceptance testing (UAT)
- Load testing (simulate 100+ concurrent users)
- Bug fixing sprint
- Documentation completion
- Deployment runbook creation
- Production environment setup

---

## Agile Ceremonies

### Daily Standup (15 minutes)
**Time:** 9:30 AM daily  
**Format:**
- What did I complete yesterday?
- What will I work on today?
- Any blockers or impediments?

### Sprint Planning (4 hours at sprint start)
**Agenda:**
1. Review sprint goal
2. Product owner presents prioritized backlog
3. Team estimates story points (Planning Poker)
4. Team commits to sprint scope
5. Break stories into technical tasks

### Sprint Review/Demo (2 hours at sprint end)
**Agenda:**
1. Demo completed user stories
2. Gather stakeholder feedback
3. Review sprint metrics
4. Update product backlog

### Sprint Retrospective (1.5 hours after review)
**Format:** Start-Stop-Continue
- What went well?
- What could be improved?
- What should we start/stop/continue doing?
- Action items for next sprint

### Backlog Refinement (1 hour mid-sprint)
**Agenda:**
- Review upcoming user stories
- Add acceptance criteria
- Estimate story points
- Identify dependencies

---

## Team Structure

### Recommended Team
- **Product Owner:** Defines vision, prioritizes backlog (You/Vi)
- **Scrum Master:** Facilitates ceremonies, removes blockers
- **Frontend Developer(s):** React, Phaser.js 3, WebSocket client
- **Backend Developer(s):** Node.js, Socket.io, PostgreSQL, Redis
- **Full-stack Developer:** Works across frontend/backend
- **AI/ML Engineer:** Claude API integration, NPC system (could be you)
- **UX/UI Designer:** (Optional) Design map interface and chat UI

### For Solo/Small Team
If working solo or with 1-2 people:
- Combine roles (you as Product Owner + Developer)
- Extend sprint length to 3 weeks if needed
- Reduce ceremony time
- Focus on MVP features only

---

## Definition of Done (DoD)

A user story is "Done" when:
- ✅ Code is written and follows style guidelines
- ✅ Unit tests written (min 80% coverage)
- ✅ Code reviewed and approved by peer
- ✅ Integration tests pass
- ✅ Deployed to staging environment
- ✅ Product Owner has accepted the story
- ✅ Documentation updated
- ✅ No critical bugs remaining

---

## Definition of Ready (DoR)

A user story is "Ready" for sprint when:
- ✅ Acceptance criteria defined
- ✅ Dependencies identified
- ✅ Estimated with story points
- ✅ Testable
- ✅ Small enough to complete in one sprint
- ✅ UI mockups available (if UI work)

---

## Technical Stack Summary

### Frontend
- **Framework:** React 18+ with TypeScript
- **State Management:** Redux Toolkit or Zustand
- **2D Rendering:** Phaser.js 3
- **Real-time:** Socket.io-client
- **Styling:** Tailwind CSS
- **Build Tool:** Vite

### Backend
- **Runtime:** Node.js 20+
- **Framework:** Express.js
- **WebSocket:** Socket.io (for user positions and movement only)
- **Database & Realtime:** Supabase (PostgreSQL + Realtime for chat)
- **Cache:** Redis 7 (for active sessions and real-time state)
- **Session:** localStorage-based (client-side)
- **API:** RESTful + WebSocket + Supabase Realtime

### Infrastructure
- **Hosting:** AWS (EC2) or DigitalOcean (for Node.js server)
- **Database:** Supabase (managed PostgreSQL + Realtime)
- **Cache:** Redis (Upstash or Redis Cloud)
- **CI/CD:** GitHub Actions
- **Monitoring:** Sentry, CloudWatch
- **CDN:** CloudFlare

### AI Integration
- **NPC AI:** Anthropic Claude API (Claude Sonnet 4.5)
- **Context Management:** Custom conversation store

---

## Sprint Metrics to Track

1. **Velocity:** Story points completed per sprint
2. **Burndown Chart:** Work remaining vs. time
3. **Cycle Time:** Time from start to done
4. **Bug Count:** New bugs vs. resolved bugs
5. **Code Coverage:** % of code with tests
6. **Deployment Frequency:** Releases per week
7. **User Metrics:** Active users, session length

---

## Risk Register

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Real-time sync performance issues | High | Medium | Implement spatial indexing, optimize network messages |
| Claude API rate limits | Medium | High | Implement request queuing, add caching |
| Team velocity lower than expected | Medium | Medium | Add buffer time, reduce scope if needed |
| Security vulnerabilities | High | Low | Regular security audits, follow OWASP guidelines |
| Scope creep | Medium | High | Strict backlog prioritization, PO discipline |

---

## Success Metrics for MVP

**Launch Criteria:**
- ✅ 20+ beta users successfully onboard
- ✅ <100ms average latency for movement
- ✅ 99% WebSocket connection uptime
- ✅ NPC conversations respond in <3 seconds
- ✅ No critical or high-severity bugs
- ✅ Mobile-friendly (responsive design)

**Post-Launch KPIs (first 30 days):**
- 100+ registered users
- 10+ daily active users
- Average session length >10 minutes
- 50+ NPC conversations initiated
- <5% error rate
- NPS score >40

---

## Future Roadmap (Post-MVP)

### Phase 2: Enhanced Interaction (Months 4-6)
- Voice chat integration (WebRTC)
- Screen sharing for pair programming
- Code snippet sharing in chat
- User-to-user friend requests
- Private chat rooms

### Phase 3: 3D World (Months 7-12)
- Three.js 3D environment
- Character customization and avatars
- Animated character models
- Environmental interactions (doors, furniture)
- Better spatial audio

### Phase 4: Community Features (Months 13+)
- Dev events and meetups in-platform
- Hackathon organization tools
- Leaderboards and achievements
- Custom user-created spaces
- Integration with GitHub, Discord, etc.

---

## Getting Started Checklist

- [ ] Assemble team and assign roles
- [ ] Set up project management tool (Jira/Linear/Trello)
- [ ] Create Git repositories (monorepo or separate repos)
- [ ] Set up development environments
- [ ] Schedule recurring ceremonies
- [ ] Complete Sprint 0 setup tasks
- [ ] Conduct first Sprint Planning
- [ ] Start Sprint 1!

---

## Notes

- Story point scale: Fibonacci (1, 2, 3, 5, 8, 13, 21)
- Sprint length: 2 weeks (adjustable based on team)
- Velocity will stabilize after 2-3 sprints
- Re-prioritize backlog weekly with Product Owner
- Keep sprints focused and achievable
- Celebrate small wins!

**Remember:** Agile is about adaptability. Adjust this plan based on what you learn each sprint!

---

*Document Version: 1.0*  
*Last Updated: November 12, 2025*  
*Project: Virtual Dev MVP*
