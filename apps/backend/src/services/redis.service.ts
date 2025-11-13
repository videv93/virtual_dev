import { createClient, RedisClientType } from 'redis';
import { User } from '@virtual-dev/shared';

export class RedisService {
  private client: RedisClientType | null = null;
  private sessionExpirySeconds: number;

  constructor(sessionExpiryHours = 24) {
    this.sessionExpirySeconds = sessionExpiryHours * 60 * 60;
  }

  async connect(): Promise<void> {
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
    const redisPassword = process.env.REDIS_PASSWORD || undefined;

    this.client = createClient({
      socket: {
        host: redisHost,
        port: redisPort,
      },
      password: redisPassword,
    });

    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    await this.client.connect();
    console.log('✅ Connected to Redis');
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.disconnect();
      console.log('✅ Disconnected from Redis');
    }
  }

  async saveUser(user: User): Promise<void> {
    if (!this.client) throw new Error('Redis client not connected');

    const key = `user:${user.id}`;
    await this.client.setEx(key, this.sessionExpirySeconds, JSON.stringify(user));
  }

  async getUser(userId: string): Promise<User | null> {
    if (!this.client) throw new Error('Redis client not connected');

    const key = `user:${userId}`;
    const data = await this.client.get(key);

    return data ? JSON.parse(data) : null;
  }

  async deleteUser(userId: string): Promise<void> {
    if (!this.client) throw new Error('Redis client not connected');

    const key = `user:${userId}`;
    await this.client.del(key);
  }

  async getAllUsers(): Promise<User[]> {
    if (!this.client) throw new Error('Redis client not connected');

    const keys = await this.client.keys('user:*');
    if (keys.length === 0) return [];

    const users: User[] = [];
    for (const key of keys) {
      const data = await this.client.get(key);
      if (data) {
        users.push(JSON.parse(data));
      }
    }

    return users;
  }

  async extendSession(userId: string): Promise<void> {
    if (!this.client) throw new Error('Redis client not connected');

    const key = `user:${userId}`;
    await this.client.expire(key, this.sessionExpirySeconds);
  }

  async getSession(userId: string): Promise<{ connectedAt: number; lastActivity: number } | null> {
    if (!this.client) throw new Error('Redis client not connected');

    const key = `session:${userId}`;
    const data = await this.client.get(key);

    return data ? JSON.parse(data) : null;
  }

  async deleteSession(userId: string): Promise<void> {
    if (!this.client) throw new Error('Redis client not connected');

    const key = `session:${userId}`;
    await this.client.del(key);
  }

  isConnected(): boolean {
    return this.client !== null && this.client.isOpen;
  }
}

export const redisService = new RedisService(
  parseInt(process.env.SESSION_EXPIRY_HOURS || '24', 10)
);
