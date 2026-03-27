import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import rateLimit from 'express-rate-limit';
import { ExpressPeerServer } from 'peer';
import roomsRouter from './routes/rooms';
import { setupSocketHandlers } from './socket/handlers';

const app = express();
const httpServer = createServer(app);

const peerServer = ExpressPeerServer(httpServer, {
  path: '/'
});

// Socket.io server with CORS
const corsOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',') 
  : ['http://localhost:5173', 'https://view-crew.vercel.app'];
  
const io = new Server(httpServer, {
  cors: {
    origin: corsOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: corsOrigins,
  credentials: true
}));
app.use(express.json());

// Rate limiting for API endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' }
});

// Strict rate limit for room creation/joining
const roomLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 room operations per minute
  message: { error: 'Too many room operations, please slow down.' }
});

app.use('/api/', apiLimiter);
app.use('/api/rooms', roomLimiter);
app.use('/peerjs', peerServer);

// API Routes
app.use('/api/rooms', roomsRouter);

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'cinesync-backend'
  });
});

// API-only mode - frontend served separately on Netlify

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
const shutdown = () => {
  console.log('[Server] Shutting down...');
  io.close(() => {
    httpServer.close(() => {
      console.log('[Server] Server closed');
      process.exit(0);
    });
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export { app, io };
