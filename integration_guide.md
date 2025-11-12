# Integrating Phaser.js, Socket.io, and Supabase Realtime

## Overview

This guide shows how to integrate three key technologies in Virtual Dev:
- **Phaser.js 3**: 2D game rendering and player movement
- **Socket.io**: Real-time position updates and multiplayer synchronization
- **Supabase Realtime**: Chat messaging system

---

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                React App                        │
│                                                 │
│  ┌──────────────┐  ┌──────────────────────┐   │
│  │   Phaser.js  │  │   Zustand Store      │   │
│  │   GameScene  │◄─┤   (Global State)     │   │
│  │              │  │                       │   │
│  │  - Render    │  │  - currentUser       │   │
│  │  - Input     │  │  - otherUsers        │   │
│  │  - Physics   │  │  - messages          │   │
│  └──────┬───────┘  └─────────┬────────────┘   │
│         │                    │                 │
│         │                    │                 │
│  ┌──────▼────────────────────▼──────────────┐ │
│  │        Integration Layer                 │ │
│  │                                           │ │
│  │  ┌──────────────┐  ┌──────────────────┐ │ │
│  │  │  Socket.io   │  │  Supabase Client │ │ │
│  │  │  Client      │  │                  │ │ │
│  │  └──────┬───────┘  └─────┬────────────┘ │ │
│  └─────────┼──────────────────┼──────────────┘ │
└────────────┼──────────────────┼────────────────┘
             │                  │
             ▼                  ▼
      ┌──────────────┐   ┌──────────────┐
      │   Node.js    │   │   Supabase   │
      │   Backend    │   │   Realtime   │
      │              │   │              │
      │ - Positions  │   │ - Chat msgs  │
      │ - Proximity  │   │ - Presence   │
      └──────────────┘   └──────────────┘
```

---

## Part 1: State Management with Zustand

### Global Store Setup

```typescript
// src/store/gameStore.ts
import create from 'zustand';

interface Position {
  x: number;
  y: number;
}

interface User {
  sessionId: string;
  username: string;
  position: Position;
  avatarColor: string;
}

interface ChatMessage {
  id: string;
  sender_session_id: string;
  sender_username: string;
  message: string;
  message_type: 'user' | 'npc';
  created_at: string;
}

interface GameState {
  // Current user
  currentUser: User | null;
  setCurrentUser: (user: User) => void;
  
  // Other users (multiplayer)
  otherUsers: Map<string, User>;
  addUser: (user: User) => void;
  updateUserPosition: (sessionId: string, position: Position) => void;
  removeUser: (sessionId: string) => void;
  
  // Chat messages
  messages: ChatMessage[];
  addMessage: (message: ChatMessage) => void;
  
  // Connection status
  socketConnected: boolean;
  supabaseConnected: boolean;
  setSocketConnected: (connected: boolean) => void;
  setSupabaseConnected: (connected: boolean) => void;
  
  // Proximity tracking
  nearbyUsers: Set<string>;
  setNearbyUsers: (users: Set<string>) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  // Initial state
  currentUser: null,
  otherUsers: new Map(),
  messages: [],
  socketConnected: false,
  supabaseConnected: false,
  nearbyUsers: new Set(),
  
  // Actions
  setCurrentUser: (user) => set({ currentUser: user }),
  
  addUser: (user) => set((state) => {
    const newUsers = new Map(state.otherUsers);
    newUsers.set(user.sessionId, user);
    return { otherUsers: newUsers };
  }),
  
  updateUserPosition: (sessionId, position) => set((state) => {
    const user = state.otherUsers.get(sessionId);
    if (!user) return state;
    
    const newUsers = new Map(state.otherUsers);
    newUsers.set(sessionId, { ...user, position });
    return { otherUsers: newUsers };
  }),
  
  removeUser: (sessionId) => set((state) => {
    const newUsers = new Map(state.otherUsers);
    newUsers.delete(sessionId);
    return { otherUsers: newUsers };
  }),
  
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message]
  })),
  
  setSocketConnected: (connected) => set({ socketConnected: connected }),
  setSupabaseConnected: (connected) => set({ supabaseConnected: connected }),
  setNearbyUsers: (users) => set({ nearbyUsers: users }),
}));
```

---

## Part 2: Socket.io Integration for Movement

### 2.1 Socket Service

```typescript
// src/services/socketService.ts
import { io, Socket } from 'socket.io-client';
import { useGameStore } from '../store/gameStore';

class SocketService {
  private socket: Socket | null = null;
  private positionUpdateInterval = 100; // ms
  private lastPositionUpdate = 0;

  connect() {
    const url = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
    
    this.socket = io(url, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('✅ Socket.io connected:', this.socket?.id);
      useGameStore.getState().setSocketConnected(true);
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Socket.io disconnected');
      useGameStore.getState().setSocketConnected(false);
    });

    // User joined confirmation
    this.socket.on('joined', (data) => {
      console.log('👤 Joined as:', data.username);
      useGameStore.getState().setCurrentUser(data);
      
      // Store session for reconnection
      localStorage.setItem('virtual-dev-session', data.sessionId);
    });

    // All users update (initial state)
    this.socket.on('users:update', (users: any[]) => {
      const currentUser = useGameStore.getState().currentUser;
      
      users.forEach(user => {
        // Skip self
        if (user.sessionId === currentUser?.sessionId) return;
        
        useGameStore.getState().addUser(user);
      });
    });

    // User moved
    this.socket.on('user:moved', (data: { sessionId: string; position: { x: number; y: number } }) => {
      useGameStore.getState().updateUserPosition(data.sessionId, data.position);
    });

    // User disconnected
    this.socket.on('user:disconnected', (data: { sessionId: string }) => {
      useGameStore.getState().removeUser(data.sessionId);
    });

    // Proximity events
    this.socket.on('proximity:nearby', (data: { users: string[] }) => {
      useGameStore.getState().setNearbyUsers(new Set(data.users));
    });
  }

  // Join the game
  join() {
    if (!this.socket) return;
    
    const sessionId = localStorage.getItem('virtual-dev-session');
    this.socket.emit('join', { sessionId });
  }

  // Send position update (throttled)
  sendPosition(x: number, y: number) {
    if (!this.socket?.connected) return;
    
    const now = Date.now();
    if (now - this.lastPositionUpdate < this.positionUpdateInterval) {
      return; // Too soon
    }
    
    this.lastPositionUpdate = now;
    
    this.socket.emit('move', {
      position: {
        x: Math.round(x),
        y: Math.round(y),
      },
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const socketService = new SocketService();
```

### 2.2 Initialize Socket.io in React

```typescript
// src/App.tsx
import { useEffect } from 'react';
import { socketService } from './services/socketService';
import { PhaserGame } from './game/PhaserGame';

export default function App() {
  useEffect(() => {
    // Connect to Socket.io
    socketService.connect();
    
    // Join game after connection
    socketService.join();
    
    // Cleanup on unmount
    return () => {
      socketService.disconnect();
    };
  }, []);

  return (
    <div className="flex h-screen bg-gray-900">
      <PhaserGame />
      {/* Other components */}
    </div>
  );
}
```

---

## Part 3: Supabase Realtime Integration for Chat

### 3.1 Supabase Service

```typescript
// src/services/chatService.ts
import { supabase } from '../lib/supabase';
import { useGameStore } from '../store/gameStore';

class ChatService {
  private channel: any = null;

  // Subscribe to chat messages
  subscribeToMessages() {
    console.log('📡 Subscribing to Supabase Realtime...');
    
    this.channel = supabase
      .channel('chat-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        (payload) => {
          const message = payload.new;
          console.log('💬 New message:', message);
          
          // Add to store
          useGameStore.getState().addMessage(message);
          
          // Check if sender is nearby (optional proximity filtering)
          this.handleProximityMessage(message);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Supabase Realtime subscribed');
          useGameStore.getState().setSupabaseConnected(true);
        } else if (status === 'CLOSED') {
          console.log('❌ Supabase Realtime closed');
          useGameStore.getState().setSupabaseConnected(false);
        }
      });
  }

  // Send a message
  async sendMessage(message: string) {
    const currentUser = useGameStore.getState().currentUser;
    if (!currentUser) {
      throw new Error('No current user');
    }

    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        sender_session_id: currentUser.sessionId,
        sender_username: currentUser.username,
        message: message,
        message_type: 'user',
      })
      .select()
      .single();

    if (error) {
      console.error('Error sending message:', error);
      throw error;
    }

    return data;
  }

  // Load message history
  async loadHistory(limit = 50) {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error loading history:', error);
      throw error;
    }

    // Reverse to show oldest first
    const messages = data?.reverse() || [];
    
    // Add all to store
    messages.forEach(msg => {
      useGameStore.getState().addMessage(msg);
    });

    return messages;
  }

  // Handle proximity-based message filtering
  private handleProximityMessage(message: any) {
    const nearbyUsers = useGameStore.getState().nearbyUsers;
    const currentUser = useGameStore.getState().currentUser;
    
    // Skip own messages
    if (message.sender_session_id === currentUser?.sessionId) {
      return;
    }
    
    // Check if sender is nearby
    if (nearbyUsers.has(message.sender_session_id)) {
      // Show notification or highlight message
      this.showProximityNotification(message);
    }
  }

  private showProximityNotification(message: any) {
    // Dispatch custom event for UI to handle
    window.dispatchEvent(
      new CustomEvent('proximity:message', {
        detail: message,
      })
    );
  }

  // Unsubscribe from channel
  unsubscribe() {
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }
}

export const chatService = new ChatService();
```

### 3.2 Initialize Supabase in React

```typescript
// src/App.tsx (add to existing useEffect)
import { chatService } from './services/chatService';

export default function App() {
  useEffect(() => {
    // Socket.io setup (from before)
    socketService.connect();
    socketService.join();
    
    // Supabase setup
    chatService.subscribeToMessages();
    chatService.loadHistory();
    
    // Cleanup
    return () => {
      socketService.disconnect();
      chatService.unsubscribe();
    };
  }, []);

  // ... rest of component
}
```

---

## Part 4: Phaser.js Integration

### 4.1 GameScene with Socket.io Integration

```typescript
// src/game/GameScene.ts
import Phaser from 'phaser';
import { useGameStore } from '../store/gameStore';
import { socketService } from '../services/socketService';

export class GameScene extends Phaser.Scene {
  private playerDot?: Phaser.GameObjects.Arc;
  private playerLabel?: Phaser.GameObjects.Text;
  private otherPlayers: Map<string, {
    dot: Phaser.GameObjects.Arc;
    label: Phaser.GameObjects.Text;
  }> = new Map();
  
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd?: any;

  constructor() {
    super('GameScene');
  }

  create() {
    this.createMap();
    this.setupInput();
    this.createPlayer();
    this.setupStoreSubscription();
  }

  private createPlayer() {
    const currentUser = useGameStore.getState().currentUser;
    if (!currentUser) return;

    const { position, avatarColor, username } = currentUser;

    // Create player dot
    this.playerDot = this.add.circle(
      position.x,
      position.y,
      10,
      parseInt(avatarColor.replace('#', ''), 16)
    );

    // Add physics
    this.physics.add.existing(this.playerDot);
    const body = this.playerDot.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);

    // Create label
    this.playerLabel = this.add.text(
      position.x,
      position.y - 20,
      username,
      {
        fontSize: '12px',
        color: '#ffffff',
        backgroundColor: '#00000088',
        padding: { x: 4, y: 2 },
      }
    );
    this.playerLabel.setOrigin(0.5, 1);
  }

  private setupInput() {
    this.cursors = this.input.keyboard?.createCursorKeys();
    
    if (this.input.keyboard) {
      this.wasd = {
        W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      };
    }
  }

  update() {
    this.handlePlayerMovement();
    this.updateOtherPlayers();
  }

  private handlePlayerMovement() {
    if (!this.playerDot || !this.cursors) return;

    const speed = 200;
    const velocity = { x: 0, y: 0 };

    // Check input
    if (this.cursors.left.isDown || this.wasd?.A.isDown) velocity.x = -speed;
    if (this.cursors.right.isDown || this.wasd?.D.isDown) velocity.x = speed;
    if (this.cursors.up.isDown || this.wasd?.W.isDown) velocity.y = -speed;
    if (this.cursors.down.isDown || this.wasd?.S.isDown) velocity.y = speed;

    // Normalize diagonal
    if (velocity.x !== 0 && velocity.y !== 0) {
      velocity.x *= 0.707;
      velocity.y *= 0.707;
    }

    // Apply velocity
    const body = this.playerDot.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(velocity.x, velocity.y);

    // Update label
    if (this.playerLabel) {
      this.playerLabel.setPosition(this.playerDot.x, this.playerDot.y - 20);
    }

    // Send to server via Socket.io (throttled in socketService)
    if (velocity.x !== 0 || velocity.y !== 0) {
      socketService.sendPosition(this.playerDot.x, this.playerDot.y);
    }
  }

  // Subscribe to Zustand store changes
  private setupStoreSubscription() {
    // Subscribe to other users changes
    useGameStore.subscribe(
      (state) => state.otherUsers,
      (otherUsers) => {
        // Update rendered players
        this.syncOtherPlayers(otherUsers);
      }
    );
  }

  private syncOtherPlayers(otherUsers: Map<string, any>) {
    // Remove players that left
    this.otherPlayers.forEach((player, sessionId) => {
      if (!otherUsers.has(sessionId)) {
        player.dot.destroy();
        player.label.destroy();
        this.otherPlayers.delete(sessionId);
      }
    });

    // Add or update players
    otherUsers.forEach((user, sessionId) => {
      this.createOrUpdateOtherPlayer(user);
    });
  }

  private createOrUpdateOtherPlayer(user: any) {
    const existing = this.otherPlayers.get(user.sessionId);

    if (existing) {
      // Update position with smooth interpolation
      this.tweens.add({
        targets: existing.dot,
        x: user.position.x,
        y: user.position.y,
        duration: 100,
        ease: 'Linear',
      });

      this.tweens.add({
        targets: existing.label,
        x: user.position.x,
        y: user.position.y - 20,
        duration: 100,
        ease: 'Linear',
      });
      return;
    }

    // Create new player
    const dot = this.add.circle(
      user.position.x,
      user.position.y,
      10,
      parseInt(user.avatarColor.replace('#', ''), 16)
    );

    const label = this.add.text(
      user.position.x,
      user.position.y - 20,
      user.username,
      {
        fontSize: '12px',
        color: '#ffffff',
        backgroundColor: '#00000088',
        padding: { x: 4, y: 2 },
      }
    );
    label.setOrigin(0.5, 1);

    this.otherPlayers.set(user.sessionId, { dot, label });
  }

  private createMap() {
    // Background
    this.add.rectangle(400, 300, 800, 600, 0x1a1a1a);

    // Grid
    const graphics = this.add.graphics();
    graphics.lineStyle(1, 0x333333, 0.5);

    for (let x = 0; x <= 800; x += 50) {
      graphics.lineBetween(x, 0, x, 600);
    }

    for (let y = 0; y <= 600; y += 50) {
      graphics.lineBetween(0, y, 800, y);
    }
  }
}
```

---

## Part 5: React Components with Chat UI

### 5.1 Chat Panel Component

```typescript
// src/components/ChatPanel.tsx
import { useEffect, useState, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { chatService } from '../services/chatService';

export function ChatPanel() {
  const messages = useGameStore((state) => state.messages);
  const currentUser = useGameStore((state) => state.currentUser);
  const supabaseConnected = useGameStore((state) => state.supabaseConnected);
  const nearbyUsers = useGameStore((state) => state.nearbyUsers);
  
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Listen for proximity messages
  useEffect(() => {
    const handleProximityMessage = (e: CustomEvent) => {
      // Show notification or highlight
      console.log('Nearby user sent message:', e.detail);
    };

    window.addEventListener('proximity:message', handleProximityMessage as EventListener);
    return () => {
      window.removeEventListener('proximity:message', handleProximityMessage as EventListener);
    };
  }, []);

  const handleSend = async () => {
    if (!inputMessage.trim() || isLoading) return;

    setIsLoading(true);
    try {
      await chatService.sendMessage(inputMessage);
      setInputMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Check if message sender is nearby
  const isNearby = (sessionId: string) => {
    return nearbyUsers.has(sessionId);
  };

  return (
    <div className="w-80 bg-gray-800 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <h2 className="font-bold text-white">Chat</h2>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            supabaseConnected ? 'bg-green-500' : 'bg-red-500'
          }`} />
          <span className="text-xs text-gray-400">
            {supabaseConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((msg) => {
          const isOwn = msg.sender_session_id === currentUser?.sessionId;
          const nearby = isNearby(msg.sender_session_id);

          return (
            <div
              key={msg.id}
              className={`text-sm ${isOwn ? 'text-blue-300' : 'text-gray-300'}`}
            >
              <div className="flex items-center gap-2">
                <span className={`font-bold ${
                  nearby ? 'text-green-400' : ''
                }`}>
                  {msg.sender_username}
                  {nearby && ' 📍'}
                </span>
                {msg.message_type === 'npc' && (
                  <span className="text-xs bg-purple-600 px-2 py-0.5 rounded">
                    NPC
                  </span>
                )}
              </div>
              <div className="ml-2">{msg.message}</div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex gap-2">
          <input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            disabled={!supabaseConnected || isLoading}
            className="flex-1 px-3 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!inputMessage.trim() || !supabaseConnected || isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 5.2 Connection Status Component

```typescript
// src/components/ConnectionStatus.tsx
import { useGameStore } from '../store/gameStore';

export function ConnectionStatus() {
  const socketConnected = useGameStore((state) => state.socketConnected);
  const supabaseConnected = useGameStore((state) => state.supabaseConnected);
  const currentUser = useGameStore((state) => state.currentUser);
  const otherUsers = useGameStore((state) => state.otherUsers);

  return (
    <div className="absolute top-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg">
      <div className="space-y-1">
        {/* User info */}
        {currentUser && (
          <div className="text-sm">
            👤 <span className="font-bold">{currentUser.username}</span>
          </div>
        )}

        {/* Connection status */}
        <div className="flex items-center gap-2 text-xs">
          <div className={`w-2 h-2 rounded-full ${
            socketConnected ? 'bg-green-500' : 'bg-red-500'
          }`} />
          <span>Movement: {socketConnected ? 'Connected' : 'Disconnected'}</span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div className={`w-2 h-2 rounded-full ${
            supabaseConnected ? 'bg-green-500' : 'bg-red-500'
          }`} />
          <span>Chat: {supabaseConnected ? 'Connected' : 'Disconnected'}</span>
        </div>

        {/* Online users */}
        <div className="text-xs text-gray-400 pt-1 border-t border-gray-700">
          👥 {otherUsers.size + 1} online
        </div>
      </div>
    </div>
  );
}
```

---

## Part 6: Complete App Integration

### 6.1 Main App Component

```typescript
// src/App.tsx
import { useEffect } from 'react';
import { socketService } from './services/socketService';
import { chatService } from './services/chatService';
import { useGameStore } from './store/gameStore';
import { PhaserGame } from './game/PhaserGame';
import { ChatPanel } from './components/ChatPanel';
import { ConnectionStatus } from './components/ConnectionStatus';

export default function App() {
  const currentUser = useGameStore((state) => state.currentUser);

  useEffect(() => {
    // Initialize Socket.io (for movement)
    socketService.connect();
    socketService.join();

    // Initialize Supabase (for chat)
    chatService.subscribeToMessages();
    chatService.loadHistory();

    // Cleanup
    return () => {
      socketService.disconnect();
      chatService.unsubscribe();
    };
  }, []);

  // Show loading while connecting
  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <div className="text-center">
          <div className="text-2xl mb-4">🎮 Connecting to Virtual Dev...</div>
          <div className="text-gray-400">Initializing systems...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Game Area */}
      <div className="flex-1 relative">
        <PhaserGame />
        <ConnectionStatus />
      </div>

      {/* Chat Panel */}
      <ChatPanel />
    </div>
  );
}
```

---

## Part 7: Proximity Detection Integration

### 7.1 Add Proximity Checking to GameScene

```typescript
// Add to GameScene.ts
export class GameScene extends Phaser.Scene {
  // ... existing code ...

  private proximityRadius = 150;
  private nearbyPlayers = new Set<string>();

  update() {
    this.handlePlayerMovement();
    this.updateOtherPlayers();
    this.checkProximity(); // Add this
  }

  private checkProximity() {
    if (!this.playerDot) return;

    const currentNearby = new Set<string>();

    // Check each other player
    this.otherPlayers.forEach((player, sessionId) => {
      const distance = Phaser.Math.Distance.Between(
        this.playerDot!.x,
        this.playerDot!.y,
        player.dot.x,
        player.dot.y
      );

      if (distance < this.proximityRadius) {
        currentNearby.add(sessionId);

        // Player entered proximity
        if (!this.nearbyPlayers.has(sessionId)) {
          this.onPlayerEnterProximity(sessionId, player);
        }
      } else {
        // Player left proximity
        if (this.nearbyPlayers.has(sessionId)) {
          this.onPlayerLeaveProximity(sessionId, player);
        }
      }
    });

    // Update store
    useGameStore.getState().setNearbyUsers(currentNearby);
    this.nearbyPlayers = currentNearby;
  }

  private onPlayerEnterProximity(sessionId: string, player: any) {
    console.log('👋 Player entered proximity:', sessionId);

    // Visual feedback - add glow effect
    player.dot.setStrokeStyle(2, 0x00ff00);

    // Dispatch event to React
    window.dispatchEvent(
      new CustomEvent('proximity:enter', {
        detail: { sessionId },
      })
    );
  }

  private onPlayerLeaveProximity(sessionId: string, player: any) {
    console.log('👋 Player left proximity:', sessionId);

    // Remove glow effect
    player.dot.setStrokeStyle(0);

    // Dispatch event to React
    window.dispatchEvent(
      new CustomEvent('proximity:exit', {
        detail: { sessionId },
      })
    );
  }
}
```

### 7.2 Proximity Popup Component

```typescript
// src/components/ProximityPopup.tsx
import { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';

export function ProximityPopup() {
  const [show, setShow] = useState(false);
  const [nearbyUser, setNearbyUser] = useState<string | null>(null);
  const otherUsers = useGameStore((state) => state.otherUsers);

  useEffect(() => {
    const handleEnter = (e: CustomEvent) => {
      const { sessionId } = e.detail;
      const user = otherUsers.get(sessionId);
      
      if (user) {
        setNearbyUser(user.username);
        setShow(true);

        // Auto-hide after 5 seconds
        setTimeout(() => setShow(false), 5000);
      }
    };

    window.addEventListener('proximity:enter', handleEnter as EventListener);
    return () => {
      window.removeEventListener('proximity:enter', handleEnter as EventListener);
    };
  }, [otherUsers]);

  if (!show || !nearbyUser) return null;

  return (
    <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg animate-bounce">
      <div className="flex items-center gap-2">
        <span className="text-2xl">👋</span>
        <div>
          <div className="font-bold">User Nearby!</div>
          <div className="text-sm">{nearbyUser} is in range</div>
        </div>
        <button
          onClick={() => setShow(false)}
          className="ml-4 text-white hover:text-gray-200"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
```

---

## Part 8: Error Handling & Reconnection

### 8.1 Enhanced Socket Service with Reconnection

```typescript
// Add to socketService.ts
class SocketService {
  // ... existing code ...

  private setupEventListeners() {
    if (!this.socket) return;

    // Reconnection handling
    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Reconnection attempt ${attemptNumber}...`);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`✅ Reconnected after ${attemptNumber} attempts`);
      
      // Rejoin the game
      this.join();
    });

    this.socket.on('reconnect_failed', () => {
      console.error('❌ Failed to reconnect');
      
      // Show error to user
      window.dispatchEvent(new CustomEvent('connection:error', {
        detail: { type: 'socket', message: 'Failed to reconnect to server' }
      }));
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error);
    });

    // ... rest of existing listeners ...
  }
}
```

### 8.2 Enhanced Chat Service with Error Handling

```typescript
// Add to chatService.ts
class ChatService {
  // ... existing code ...

  subscribeToMessages() {
    this.channel = supabase
      .channel('chat-messages')
      .on('postgres_changes', /* ... */)
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Supabase Realtime subscribed');
          useGameStore.getState().setSupabaseConnected(true);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Supabase channel error:', err);
          useGameStore.getState().setSupabaseConnected(false);
          
          // Attempt to resubscribe after delay
          setTimeout(() => this.subscribeToMessages(), 5000);
        } else if (status === 'TIMED_OUT') {
          console.error('❌ Supabase connection timed out');
          
          // Attempt to resubscribe
          setTimeout(() => this.subscribeToMessages(), 2000);
        }
      });
  }

  async sendMessage(message: string) {
    try {
      const currentUser = useGameStore.getState().currentUser;
      if (!currentUser) throw new Error('No current user');

      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          sender_session_id: currentUser.sessionId,
          sender_username: currentUser.username,
          message: message,
          message_type: 'user',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Dispatch error event
      window.dispatchEvent(new CustomEvent('chat:error', {
        detail: { message: 'Failed to send message. Please try again.' }
      }));
      
      throw error;
    }
  }
}
```

---

## Part 9: Testing the Integration

### 9.1 Testing Checklist

```typescript
// src/utils/testIntegration.ts

export async function testIntegration() {
  console.log('🧪 Testing Virtual Dev Integration...\n');

  // Test 1: Socket.io Connection
  console.log('Test 1: Socket.io Connection');
  const socketConnected = useGameStore.getState().socketConnected;
  console.log(socketConnected ? '✅ PASS' : '❌ FAIL', '\n');

  // Test 2: Supabase Connection
  console.log('Test 2: Supabase Realtime Connection');
  const supabaseConnected = useGameStore.getState().supabaseConnected;
  console.log(supabaseConnected ? '✅ PASS' : '❌ FAIL', '\n');

  // Test 3: User Joined
  console.log('Test 3: User Joined with Random Username');
  const currentUser = useGameStore.getState().currentUser;
  console.log(currentUser ? '✅ PASS' : '❌ FAIL');
  if (currentUser) console.log(`   Username: ${currentUser.username}\n`);

  // Test 4: Send Position
  console.log('Test 4: Send Position Update');
  try {
    socketService.sendPosition(100, 100);
    console.log('✅ PASS\n');
  } catch (error) {
    console.log('❌ FAIL:', error, '\n');
  }

  // Test 5: Send Chat Message
  console.log('Test 5: Send Chat Message');
  try {
    await chatService.sendMessage('Test message from integration test');
    console.log('✅ PASS\n');
  } catch (error) {
    console.log('❌ FAIL:', error, '\n');
  }

  // Test 6: Load Chat History
  console.log('Test 6: Load Chat History');
  try {
    const messages = await chatService.loadHistory(10);
    console.log('✅ PASS');
    console.log(`   Loaded ${messages.length} messages\n`);
  } catch (error) {
    console.log('❌ FAIL:', error, '\n');
  }

  console.log('🏁 Integration tests complete!');
}

// Run in browser console:
// import { testIntegration } from './utils/testIntegration';
// testIntegration();
```

---

## Part 10: Performance Optimization

### 10.1 Throttling and Debouncing

```typescript
// src/utils/performance.ts

// Throttle function
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall < delay) return;
    lastCall = now;
    func(...args);
  };
}

// Debounce function
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

// Usage in GameScene:
import { throttle } from '../utils/performance';

export class GameScene extends Phaser.Scene {
  private throttledSendPosition = throttle(
    (x: number, y: number) => socketService.sendPosition(x, y),
    100 // 100ms throttle = max 10 updates/second
  );

  private handlePlayerMovement() {
    // ... movement code ...
    
    if (velocity.x !== 0 || velocity.y !== 0) {
      this.throttledSendPosition(this.playerDot!.x, this.playerDot!.y);
    }
  }
}
```

### 10.2 Message Batching (Optional)

```typescript
// For high-frequency scenarios, batch messages
class MessageBatcher {
  private queue: any[] = [];
  private batchSize = 10;
  private batchInterval = 100; // ms
  private timer: NodeJS.Timeout | null = null;

  add(message: any) {
    this.queue.push(message);

    if (this.queue.length >= this.batchSize) {
      this.flush();
    } else if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), this.batchInterval);
    }
  }

  flush() {
    if (this.queue.length === 0) return;

    // Send batch
    console.log('Sending batch of', this.queue.length, 'messages');
    // socketService.sendBatch(this.queue);

    this.queue = [];
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
```

---

## Troubleshooting Guide

### Common Issues

#### Issue 1: Socket.io not connecting
**Symptoms:** `socketConnected` stays false  
**Solutions:**
- Check backend URL in `.env.local`
- Verify backend server is running
- Check CORS configuration
- Look for errors in browser console

#### Issue 2: Supabase messages not appearing
**Symptoms:** Messages sent but not received  
**Solutions:**
- Verify Supabase URL and anon key
- Check if table has Realtime enabled: `ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;`
- Check RLS policies allow SELECT
- Look in Supabase dashboard logs

#### Issue 3: Players not rendering in Phaser
**Symptoms:** Can't see other players moving  
**Solutions:**
- Check Zustand store has `otherUsers` data
- Verify `setupStoreSubscription()` is called in `create()`
- Check browser console for errors
- Verify Socket.io is receiving `user:moved` events

#### Issue 4: Position updates laggy
**Symptoms:** Movement feels delayed  
**Solutions:**
- Reduce `positionUpdateInterval` in socketService
- Check network latency
- Ensure tweens duration is not too long (100ms recommended)
- Verify throttling is working correctly

#### Issue 5: Messages sent twice
**Symptoms:** Duplicate messages appear  
**Solutions:**
- Check if Supabase subscription is set up twice
- Verify component cleanup (unsubscribe on unmount)
- Check if `addMessage` is called multiple times

---

## Next Steps

1. ✅ Complete basic integration
2. ⬜ Add NPC conversations (Claude API)
3. ⬜ Implement proximity-based chat filtering
4. ⬜ Add visual effects for proximity
5. ⬜ Optimize performance for 100+ users
6. ⬜ Add reconnection UI feedback
7. ⬜ Implement message read receipts
8. ⬜ Add typing indicators

---

## Resources

- [Socket.io Client API](https://socket.io/docs/v4/client-api/)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Phaser 3 Events](https://photonstorm.github.io/phaser3-docs/Phaser.Events.html)
- [Zustand Documentation](https://github.com/pmndrs/zustand)

---

*Integration Guide Version: 1.0*  
*Last Updated: November 12, 2025*  
*Project: Virtual Dev*
