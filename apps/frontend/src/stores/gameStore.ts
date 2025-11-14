import { create } from 'zustand';
import { User, ChatMessage, NPCConfig, Toast, ToastType } from '@virtual-dev/shared';

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

  // Loading state
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;

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

  // NPCs
  npcs: NPCConfig[];
  setNPCs: (npcs: NPCConfig[]) => void;

  // NPC Chat state
  activeNPC: NPCConfig | null;
  setActiveNPC: (npc: NPCConfig | null) => void;
  npcConversationId: string | null;
  setNPCConversationId: (id: string | null) => void;

  // Nearby NPCs
  nearbyNPCs: Set<string>;
  addNearbyNPC: (npcId: string) => void;
  removeNearbyNPC: (npcId: string) => void;

  // Toast notifications
  toasts: Toast[];
  addToast: (type: ToastType, message: string, duration?: number) => void;
  removeToast: (id: string) => void;

  // Stars
  stars: Map<string, { id: string; position: { x: number; y: number }; createdAt: number }>;
  addStar: (star: { id: string; position: { x: number; y: number }; createdAt: number }) => void;
  removeStar: (starId: string) => void;
  collectedStarsCount: number;
  incrementCollectedStars: () => void;
  showStarPopup: boolean;
  setShowStarPopup: (show: boolean) => void;
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

  isLoading: true,
  setIsLoading: (loading) => set({ isLoading: loading }),

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

  npcs: [],
  setNPCs: (npcs) => set({ npcs }),

  activeNPC: null,
  setActiveNPC: (npc) => set({ activeNPC: npc }),
  npcConversationId: null,
  setNPCConversationId: (id) => set({ npcConversationId: id }),

  nearbyNPCs: new Set(),
  addNearbyNPC: (npcId) =>
    set((state) => {
      const newNearbyNPCs = new Set(state.nearbyNPCs);
      newNearbyNPCs.add(npcId);
      return { nearbyNPCs: newNearbyNPCs };
    }),
  removeNearbyNPC: (npcId) =>
    set((state) => {
      const newNearbyNPCs = new Set(state.nearbyNPCs);
      newNearbyNPCs.delete(npcId);
      return { nearbyNPCs: newNearbyNPCs };
    }),

  toasts: [],
  addToast: (type, message, duration = 3000) =>
    set((state) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newToast: Toast = { id, type, message, duration };
      return { toasts: [...state.toasts, newToast] };
    }),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),

  stars: new Map(),
  addStar: (star) =>
    set((state) => {
      const newStars = new Map(state.stars);
      newStars.set(star.id, star);
      return { stars: newStars };
    }),
  removeStar: (starId) =>
    set((state) => {
      const newStars = new Map(state.stars);
      newStars.delete(starId);
      return { stars: newStars };
    }),
  collectedStarsCount: 0,
  incrementCollectedStars: () =>
    set((state) => ({
      collectedStarsCount: state.collectedStarsCount + 1,
    })),
  showStarPopup: false,
  setShowStarPopup: (show) => set({ showStarPopup: show }),
}));
