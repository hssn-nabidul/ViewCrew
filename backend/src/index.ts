import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { ExpressPeerServer } from 'peer';
import roomsRouter from './routes/rooms';
import { setupSocketHandlers } from './socket/handlers';

const app = express();
const httpServer = createServer(app);

const peerServer = ExpressPeerServer(httpServer, {
  path: '/'
});

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

// Serve static frontend in production
const clientPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientPath));

// Fallback to index.html for SPA routing
app.get('*', (req: Request, res: Response) => {
  if (req.path.startsWith('/api')) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Endpoint not found' });
  } else {
    res.sendFile(path.join(clientPath, 'index.html'));
  }
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
