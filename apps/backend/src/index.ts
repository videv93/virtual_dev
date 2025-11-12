import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { redisService } from './services/redis.service';
import { socketService } from './services/socket.service';

// Load environment variables
dotenv.config();

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

// API routes will be added here in future sprints
app.get('/api/status', (req, res) => {
  res.json({
    message: 'Virtual Dev Backend API',
    version: '1.0.0',
  });
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
