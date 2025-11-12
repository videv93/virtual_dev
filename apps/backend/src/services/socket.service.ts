import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import {
  User,
  SocketEvents,
  JoinPayload,
  JoinResponse,
  MovePayload,
  PositionUpdatePayload,
  ProximityPayload,
  MAP_WIDTH,
  MAP_HEIGHT,
} from '@virtual-dev/shared';
import { redisService } from './redis.service';
import { proximityService } from './proximity.service';
import { generateUsername, generateColor } from '../utils/username-generator';
import { v4 as uuidv4 } from 'uuid';

export class SocketService {
  private io: SocketIOServer | null = null;

  initialize(httpServer: HTTPServer): void {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
        methods: ['GET', 'POST'],
      },
    });

    this.io.on(SocketEvents.CONNECTION, (socket: Socket) => {
      console.log(`🔌 User connected: ${socket.id}`);
      this.handleConnection(socket);
    });

    console.log('✅ Socket.io initialized');
  }

  private handleConnection(socket: Socket): void {
    // Handle user join
    socket.on(SocketEvents.JOIN, async (payload: JoinPayload) => {
      try {
        const user = await this.handleJoin(socket, payload);
        const allUsers = await redisService.getAllUsers();

        const response: JoinResponse = {
          user,
          users: allUsers.filter((u) => u.id !== user.id),
          npcs: [], // Will be loaded from Supabase in Sprint 4
        };

        // Send user their info
        socket.emit(SocketEvents.JOIN, response);

        // Broadcast to others that a new user joined
        socket.broadcast.emit(SocketEvents.USER_JOINED, user);

        console.log(`👤 User joined: ${user.username} (${user.id})`);
      } catch (error) {
        console.error('Error handling join:', error);
        socket.emit(SocketEvents.ERROR, {
          message: 'Failed to join',
          code: 'JOIN_ERROR',
        });
      }
    });

    // Handle movement
    socket.on(SocketEvents.MOVE, async (payload: MovePayload) => {
      try {
        await this.handleMove(socket, payload);
      } catch (error) {
        console.error('Error handling move:', error);
      }
    });

    // Handle disconnect
    socket.on(SocketEvents.DISCONNECT, async () => {
      try {
        await this.handleDisconnect(socket);
      } catch (error) {
        console.error('Error handling disconnect:', error);
      }
    });
  }

  private async handleJoin(socket: Socket, payload: JoinPayload): Promise<User> {
    let user: User;

    // Check if user has existing session
    if (payload.sessionId) {
      const existingUser = await redisService.getUser(payload.sessionId);
      if (existingUser) {
        user = existingUser;
        await redisService.extendSession(user.id);
      } else {
        user = this.createNewUser(payload.username);
      }
    } else {
      user = this.createNewUser(payload.username);
    }

    // Save user to Redis
    await redisService.saveUser(user);

    // Store user ID in socket data
    socket.data.userId = user.id;

    return user;
  }

  private createNewUser(username?: string): User {
    return {
      id: uuidv4(),
      username: username || generateUsername(),
      color: generateColor(),
      position: {
        x: Math.floor(Math.random() * MAP_WIDTH),
        y: Math.floor(Math.random() * MAP_HEIGHT),
      },
    };
  }

  private async handleMove(socket: Socket, payload: MovePayload): Promise<void> {
    const userId = socket.data.userId;
    if (!userId) return;

    // Get user from Redis
    const user = await redisService.getUser(userId);
    if (!user) return;

    // Update user position
    user.position = payload.position;
    await redisService.saveUser(user);

    // Broadcast position update to all other users
    const positionUpdate: PositionUpdatePayload = {
      userId: user.id,
      position: payload.position,
    };

    socket.broadcast.emit(SocketEvents.POSITION_UPDATE, positionUpdate);

    // Check proximity changes
    const allUsers = await redisService.getAllUsers();
    const { entered, exited } = proximityService.updateProximity(user, allUsers);

    // Emit proximity enter events
    entered.forEach((nearUser) => {
      const distance = this.calculateDistance(user.position, nearUser.position);

      // Notify the moving user about entering proximity
      const enterPayload: ProximityPayload = {
        userId: user.id,
        targetId: nearUser.id,
        distance,
      };
      socket.emit(SocketEvents.PROXIMITY_ENTER, enterPayload);

      // Notify the other user about being entered
      const reverseEnterPayload: ProximityPayload = {
        userId: nearUser.id,
        targetId: user.id,
        distance,
      };
      this.io?.to(this.getUserSocketId(nearUser.id)).emit(SocketEvents.PROXIMITY_ENTER, reverseEnterPayload);
    });

    // Emit proximity exit events
    exited.forEach((exitedUserId) => {
      // Notify the moving user about exiting proximity
      const exitPayload: ProximityPayload = {
        userId: user.id,
        targetId: exitedUserId,
        distance: -1, // Distance not relevant for exit
      };
      socket.emit(SocketEvents.PROXIMITY_EXIT, exitPayload);

      // Notify the other user about being exited
      const reverseExitPayload: ProximityPayload = {
        userId: exitedUserId,
        targetId: user.id,
        distance: -1,
      };
      this.io?.to(this.getUserSocketId(exitedUserId)).emit(SocketEvents.PROXIMITY_EXIT, reverseExitPayload);
    });
  }

  private calculateDistance(pos1: { x: number; y: number }, pos2: { x: number; y: number }): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private getUserSocketId(userId: string): string {
    // Find socket ID for a given user ID
    // This is a simplified version - in production, you'd maintain a userId -> socketId mapping
    const sockets = Array.from(this.io?.sockets.sockets.values() || []);
    const socket = sockets.find((s) => s.data.userId === userId);
    return socket?.id || '';
  }

  private async handleDisconnect(socket: Socket): Promise<void> {
    const userId = socket.data.userId;
    if (!userId) return;

    // Get user info before deleting
    const user = await redisService.getUser(userId);

    // Remove user from Redis
    await redisService.deleteUser(userId);

    // Remove user from proximity tracking
    proximityService.removeUser(userId);

    // Broadcast to others that user left
    socket.broadcast.emit(SocketEvents.USER_LEFT, { userId });

    console.log(`👋 User left: ${user?.username || userId}`);
  }

  getIO(): SocketIOServer {
    if (!this.io) {
      throw new Error('Socket.io not initialized');
    }
    return this.io;
  }
}

export const socketService = new SocketService();
