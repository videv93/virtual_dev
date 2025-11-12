import { create } from 'zustand';
import { User, ChatMessage } from '@virtual-dev/shared';

interface GameState {
  // Current user
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;

  // Other users in the map
  users: Map<string, User>;
  addUser: (user: User) => void;
  removeUser: (userId: string) => void;
  updateUserPosition: (userId: string, position: { x: number; y: number }) => void;
  setUsers: (users: User[]) => void;

  // Connection status
  isConnected: boolean;
  setIsConnected: (connected: boolean) => void;

  // Session ID for persistence
  sessionId: string | null;
  setSessionId: (id: string) => void;

  // Chat messages
  chatMessages: ChatMessage[];
  addChatMessage: (message: ChatMessage) => void;
  setChatMessages: (messages: ChatMessage[]) => void;

  // Proximity tracking
  nearbyUsers: Set<string>;
  addNearbyUser: (userId: string) => void;
  removeNearbyUser: (userId: string) => void;

  // Chat panel state
  isChatPanelOpen: boolean;
  toggleChatPanel: () => void;
  setChatPanelOpen: (open: boolean) => void;

  // Encounter popup state
  encounterUserId: string | null;
  setEncounterUserId: (userId: string | null) => void;
}

export const useGameStore = create<GameState>((set) => ({
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),

  users: new Map(),
  addUser: (user) =>
    set((state) => {
      const newUsers = new Map(state.users);
      newUsers.set(user.id, user);
      return { users: newUsers };
    }),
  removeUser: (userId) =>
    set((state) => {
      const newUsers = new Map(state.users);
      newUsers.delete(userId);
      return { users: newUsers };
    }),
  updateUserPosition: (userId, position) =>
    set((state) => {
      const newUsers = new Map(state.users);
      const user = newUsers.get(userId);
      if (user) {
        user.position = position;
        newUsers.set(userId, user);
      }
      return { users: newUsers };
    }),
  setUsers: (users) =>
    set(() => {
      const userMap = new Map<string, User>();
      users.forEach((user) => userMap.set(user.id, user));
      return { users: userMap };
    }),

  isConnected: false,
  setIsConnected: (connected) => set({ isConnected: connected }),

  sessionId: localStorage.getItem('virtual-dev-session-id'),
  setSessionId: (id) => {
    localStorage.setItem('virtual-dev-session-id', id);
    set({ sessionId: id });
  },

  chatMessages: [],
  addChatMessage: (message) =>
    set((state) => ({
      chatMessages: [...state.chatMessages, message],
    })),
  setChatMessages: (messages) => set({ chatMessages: messages }),

  nearbyUsers: new Set(),
  addNearbyUser: (userId) =>
    set((state) => {
      const newNearbyUsers = new Set(state.nearbyUsers);
      newNearbyUsers.add(userId);
      return { nearbyUsers: newNearbyUsers };
    }),
  removeNearbyUser: (userId) =>
    set((state) => {
      const newNearbyUsers = new Set(state.nearbyUsers);
      newNearbyUsers.delete(userId);
      return { nearbyUsers: newNearbyUsers };
    }),

  isChatPanelOpen: false,
  toggleChatPanel: () => set((state) => ({ isChatPanelOpen: !state.isChatPanelOpen })),
  setChatPanelOpen: (open) => set({ isChatPanelOpen: open }),

  encounterUserId: null,
  setEncounterUserId: (userId) => set({ encounterUserId: userId }),
}));
