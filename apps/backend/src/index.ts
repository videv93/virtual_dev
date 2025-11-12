import dotenv from 'dotenv';

// Load environment variables FIRST before importing services
dotenv.config();

import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import { redisService } from './services/redis.service';
import { socketService } from './services/socket.service';
import { npcService } from './services/npc.service';
import type { NPCChatRequest } from '@virtual-dev/shared';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.get('/api/status', (req, res) => {
  res.json({
    message: 'Virtual Dev Backend API',
    version: '1.0.0',
  });
});

// NPC Chat endpoint (non-streaming)
app.post('/api/npc/chat', async (req, res) => {
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
app.post('/api/npc/chat/stream', async (req, res) => {
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
