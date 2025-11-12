import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import {
  User,
  SocketEvents,
  JoinPayload,
  JoinResponse,
  MovePayload,
  PositionUpdatePayload,
  MAP_WIDTH,
  MAP_HEIGHT,
} from '@virtual-dev/shared';
import { redisService } from './redis.service';
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
  }

  private async handleDisconnect(socket: Socket): Promise<void> {
    const userId = socket.data.userId;
    if (!userId) return;

    // Get user info before deleting
    const user = await redisService.getUser(userId);

    // Remove user from Redis
    await redisService.deleteUser(userId);

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
