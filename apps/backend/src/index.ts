import dotenv from 'dotenv';

// Load environment variables FIRST before importing services
dotenv.config();

import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import { redisService } from './services/redis.service';
import { socketService } from './services/socket.service';
import { npcService } from './services/npc.service';
import { adminService } from './services/admin.service';
import type { NPCChatRequest } from '@virtual-dev/shared';
import {
  apiLimiter,
  npcChatLimiter,
  sanitizeInput,
  xssProtection,
  validateChatMessage,
  validateNpcId,
} from './middleware/security.middleware';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.CORS_ORIGIN || 'http://localhost:5173'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS Configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

// Body Parser & Input Sanitization
app.use(express.json({ limit: '10mb' }));
app.use(sanitizeInput);
app.use(xssProtection);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// API routes (with rate limiting)
app.get('/api/status', apiLimiter, (req, res) => {
  res.json({
    message: 'Virtual Dev Backend API',
    version: '1.0.0',
  });
});

// NPC Chat endpoint (non-streaming)
app.post('/api/npc/chat', npcChatLimiter, validateNpcId, validateChatMessage, async (req, res) => {
  try {
    const { npcId, message, conversationId, userId } = req.body as NPCChatRequest & { userId: string };

    // Validate request
    if (!npcId || !message || !userId) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: npcId, message, userId',
      });
      return;
    }

    // Call NPC service
    const result = await npcService.chat(npcId, userId, message, conversationId);

    if (result.success) {
      res.json({
        success: true,
        conversationId: result.conversationId,
        message: result.message,
        npcName: result.npcName,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error('Error in /api/npc/chat:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// NPC Chat endpoint (streaming)
app.post('/api/npc/chat/stream', npcChatLimiter, validateNpcId, validateChatMessage, async (req, res) => {
  try {
    const { npcId, message, conversationId, userId } = req.body as NPCChatRequest & { userId: string };

    // Validate request
    if (!npcId || !message || !userId) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: npcId, message, userId',
      });
      return;
    }

    // Set up SSE (Server-Sent Events)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Stream response
    const result = await npcService.streamChat(
      npcId,
      userId,
      message,
      conversationId,
      (chunk) => {
        // Send chunk as SSE
        res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
      }
    );

    // Send final result
    if (result.success) {
      res.write(
        `data: ${JSON.stringify({
          type: 'done',
          conversationId: result.conversationId,
          npcName: result.npcName,
        })}\n\n`
      );
    } else {
      res.write(
        `data: ${JSON.stringify({
          type: 'error',
          error: result.error,
        })}\n\n`
      );
    }

    res.end();
  } catch (error) {
    console.error('Error in /api/npc/chat/stream:', error);
    res.write(
      `data: ${JSON.stringify({
        type: 'error',
        error: 'Internal server error',
      })}\n\n`
    );
    res.end();
  }
});

// Admin routes (simple auth with password for demo purposes)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

const checkAdminAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }

  const token = authHeader.substring(7);
  if (token !== ADMIN_PASSWORD) {
    res.status(403).json({ success: false, error: 'Forbidden' });
    return;
  }

  next();
};

// Admin endpoints
app.get('/api/admin/users', apiLimiter, checkAdminAuth, async (req, res) => {
  try {
    const users = await adminService.getActiveUsers();
    res.json({ success: true, users });
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.get('/api/admin/metrics', apiLimiter, checkAdminAuth, (req, res) => {
  try {
    const metrics = adminService.getSystemMetrics();
    res.json({ success: true, metrics });
  } catch (error) {
    console.error('Error getting metrics:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.get('/api/admin/health', apiLimiter, checkAdminAuth, async (req, res) => {
  try {
    const health = await adminService.getHealthStatus();
    res.json({ success: true, health });
  } catch (error) {
    console.error('Error getting health:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.post('/api/admin/kick', apiLimiter, checkAdminAuth, async (req, res) => {
  try {
    const { userId, reason } = req.body;

    if (!userId) {
      res.status(400).json({ success: false, error: 'userId is required' });
      return;
    }

    const result = await adminService.kickUser(userId, reason);

    if (result) {
      res.json({ success: true, message: 'User kicked successfully' });
    } else {
      res.status(404).json({ success: false, error: 'User not found' });
    }
  } catch (error) {
    console.error('Error kicking user:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.post('/api/admin/broadcast', apiLimiter, checkAdminAuth, (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      res.status(400).json({ success: false, error: 'message is required' });
      return;
    }

    adminService.broadcastMessage(message);
    res.json({ success: true, message: 'Broadcast sent successfully' });
  } catch (error) {
    console.error('Error broadcasting message:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Initialize services and start server
async function startServer() {
  try {
    // Connect to Redis
    await redisService.connect();

    // Initialize Socket.io
    socketService.initialize(httpServer);

    // Start HTTP server
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📡 WebSocket server ready`);
      console.log(`🌍 CORS enabled for: ${process.env.CORS_ORIGIN || 'http://localhost:5173'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n⏳ Shutting down gracefully...');
  await redisService.disconnect();
  httpServer.close(() => {
    console.log('✅ Server shut down');
    process.exit(0);
  });
});

process.on('SIGTERM', async () => {
  console.log('\n⏳ Shutting down gracefully...');
  await redisService.disconnect();
  httpServer.close(() => {
    console.log('✅ Server shut down');
    process.exit(0);
  });
});

startServer();
