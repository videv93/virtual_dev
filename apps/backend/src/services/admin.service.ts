import { redisService } from './redis.service';
import { socketService } from './socket.service';
import { User } from '@virtual-dev/shared';

interface SystemMetrics {
  activeUsers: number;
  totalConnections: number;
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
  averageLatency: number;
}

interface ActiveUserInfo {
  id: string;
  username: string;
  color: string;
  position: { x: number; y: number };
  connectedAt: number;
  lastActivity: number;
}

class AdminService {
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Get list of all active users
   */
  async getActiveUsers(): Promise<ActiveUserInfo[]> {
    try {
      const connectedUsers = socketService.getConnectedUsers();
      const activeUsers: ActiveUserInfo[] = [];

      for (const [userId, user] of connectedUsers.entries()) {
        const session = await redisService.getSession(userId);

        activeUsers.push({
          id: userId,
          username: user.username,
          color: user.color,
          position: user.position,
          connectedAt: session?.connectedAt || Date.now(),
          lastActivity: session?.lastActivity || Date.now(),
        });
      }

      return activeUsers;
    } catch (error) {
      console.error('Error getting active users:', error);
      return [];
    }
  }

  /**
   * Get system metrics
   */
  getSystemMetrics(): SystemMetrics {
    const connectedUsers = socketService.getConnectedUsers();

    return {
      activeUsers: connectedUsers.size,
      totalConnections: socketService.getTotalConnections(),
      uptime: Date.now() - this.startTime,
      memoryUsage: process.memoryUsage(),
      averageLatency: 0, // TODO: Calculate from WebSocket ping/pong
    };
  }

  /**
   * Kick a user by ID
   */
  async kickUser(userId: string, reason?: string): Promise<boolean> {
    try {
      const socket = socketService.getSocketByUserId(userId);
      if (socket) {
        socket.emit('kicked', { reason: reason || 'You have been removed by an administrator' });
        socket.disconnect(true);
        await redisService.deleteSession(userId);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error kicking user:', error);
      return false;
    }
  }

  /**
   * Broadcast admin message to all users
   */
  broadcastMessage(message: string): void {
    socketService.broadcastAdminMessage(message);
  }

  /**
   * Get server health status
   */
  async getHealthStatus() {
    const metrics = this.getSystemMetrics();
    const redisConnected = redisService.isConnected();

    return {
      status: redisConnected ? 'healthy' : 'degraded',
      uptime: metrics.uptime,
      activeUsers: metrics.activeUsers,
      redis: redisConnected ? 'connected' : 'disconnected',
      memory: {
        used: Math.round(metrics.memoryUsage.heapUsed / 1024 / 1024),
        total: Math.round(metrics.memoryUsage.heapTotal / 1024 / 1024),
        percentage: Math.round((metrics.memoryUsage.heapUsed / metrics.memoryUsage.heapTotal) * 100),
      },
    };
  }
}

export const adminService = new AdminService();
