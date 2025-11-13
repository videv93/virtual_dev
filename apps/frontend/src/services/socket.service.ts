import { io, Socket } from 'socket.io-client';
import {
  SocketEvents,
  JoinPayload,
  JoinResponse,
  MovePayload,
  PositionUpdatePayload,
  ProximityPayload,
} from '@virtual-dev/shared';
import { useGameStore } from '../stores/gameStore';

class SocketService {
  private socket: Socket | null = null;
  private backendUrl: string;

  constructor() {
    this.backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
  }

  connect(): void {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return;
    }

    this.socket = io(this.backendUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('✅ Connected to server');
      const { setIsConnected, addToast } = useGameStore.getState();
      setIsConnected(true);
      addToast('success', 'Connected to server');
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Disconnected from server');
      const { setIsConnected, addToast } = useGameStore.getState();
      setIsConnected(false);
      addToast('warning', 'Disconnected from server. Attempting to reconnect...');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      const { setIsConnected, addToast } = useGameStore.getState();
      setIsConnected(false);
      addToast('error', 'Connection error. Please check your network.');
    });

    // Join response
    this.socket.on(SocketEvents.JOIN, (response: JoinResponse) => {
      console.log('Joined successfully:', response);
      const { setCurrentUser, setUsers, setSessionId, setNPCs, setIsLoading } = useGameStore.getState();

      // Apply custom color from localStorage if available
      const customColor = localStorage.getItem('virtual-dev-custom-color');
      const user = customColor ? { ...response.user, color: customColor } : response.user;

      // Set current user and save session ID
      setCurrentUser(user);
      setSessionId(response.user.id);

      // Set other users
      setUsers(response.users);

      // Set NPCs
      console.log(`🤖 Received NPCs from server:`, response.npcs);
      setNPCs(response.npcs);
      console.log(`🤖 Loaded ${response.npcs.length} NPCs`);

      // Set loading to false - we're ready!
      setIsLoading(false);

      // Debug: Log store state after setting NPCs
      setTimeout(() => {
        const { npcs } = useGameStore.getState();
        console.log(`🤖 NPCs in store after setState:`, npcs);
      }, 100);
    });

    // User joined
    this.socket.on(SocketEvents.USER_JOINED, (user) => {
      console.log('User joined:', user);
      useGameStore.getState().addUser(user);
    });

    // User left
    this.socket.on(SocketEvents.USER_LEFT, ({ userId }) => {
      console.log('User left:', userId);
      useGameStore.getState().removeUser(userId);
    });

    // Position update
    this.socket.on(SocketEvents.POSITION_UPDATE, (payload: PositionUpdatePayload) => {
      useGameStore.getState().updateUserPosition(payload.userId, payload.position);
    });

    // Proximity enter
    this.socket.on(SocketEvents.PROXIMITY_ENTER, (payload: ProximityPayload) => {
      console.log('Proximity enter:', payload);
      const { addNearbyUser, setEncounterUserId, currentUser } = useGameStore.getState();

      // Add to nearby users
      addNearbyUser(payload.targetId);

      // Show encounter popup (only for the user who is being approached)
      if (payload.userId === currentUser?.id) {
        setEncounterUserId(payload.targetId);
      }
    });

    // Proximity exit
    this.socket.on(SocketEvents.PROXIMITY_EXIT, (payload: ProximityPayload) => {
      console.log('Proximity exit:', payload);
      const { removeNearbyUser } = useGameStore.getState();
      removeNearbyUser(payload.targetId);
    });

    // Error handling
    this.socket.on(SocketEvents.ERROR, (error) => {
      console.error('Server error:', error);
      useGameStore.getState().addToast('error', error.message || 'An error occurred');
    });
  }

  join(username?: string): void {
    if (!this.socket) {
      console.error('Socket not connected');
      useGameStore.getState().addToast('error', 'Cannot connect to server');
      return;
    }

    const sessionId = useGameStore.getState().sessionId;
    const payload: JoinPayload = {
      username,
      sessionId: sessionId || undefined,
    };

    this.socket.emit(SocketEvents.JOIN, payload);
  }

  move(position: { x: number; y: number }): void {
    if (!this.socket?.connected) return;

    const payload: MovePayload = { position };
    this.socket.emit(SocketEvents.MOVE, payload);
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const socketService = new SocketService();
