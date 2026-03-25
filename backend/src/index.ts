import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import roomsRouter from './routes/rooms';
import { setupSocketHandlers } from './socket/handlers';

const app = express();
const httpServer = createServer(app);

// Socket.io server with CORS
const io = new Server(httpServer, {
  cors: {
    origin: '*', // In production, restrict this to your frontend domain
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'cinesync-backend'
  });
});

// API Routes
app.use('/api/rooms', roomsRouter);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'NOT_FOUND', message: 'Endpoint not found' });
});

// Setup WebSocket handlers
setupSocketHandlers(io);

// Start server
const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🎬 CineSync Backend Server                              ║
║                                                           ║
║   HTTP:      http://localhost:${PORT}                      ║
║   WebSocket: ws://localhost:${PORT}                        ║
║   Health:    http://localhost:${PORT}/health               ║
║                                                           ║
║   Room API:                                              ║
║   - POST   /api/rooms         - Create room              ║
║   - GET    /api/rooms/:id     - Get room info            ║
║   - POST   /api/rooms/:id/join  - Join room              ║
║   - POST   /api/rooms/:id/leave - Leave room             ║
║   - DELETE /api/rooms/:id     - Close room              ║
║   - GET    /api/rooms/:id/participants - List participants║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received, shutting down...');
  io.close(() => {
    httpServer.close(() => {
      console.log('[Server] Server closed');
      process.exit(0);
    });
  });
});

export { app, io };
