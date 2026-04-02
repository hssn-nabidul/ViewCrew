import express, { Request, Response, NextFunction } from 'express';
import { createServer, Server as HttpServer } from 'http';
import { createServer as createHttpsServer, Server as HttpsServer } from 'https';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import rateLimit from 'express-rate-limit';
import { ExpressPeerServer } from 'peer';
import helmet from 'helmet';
import roomsRouter from './routes/rooms';
import { setupSocketHandlers } from './socket/handlers';

const app = express();

// HTTPS support for production (optional, controlled by env vars)
const useHttps = process.env.USE_HTTPS === 'true';
const httpsCertPath = process.env.HTTPS_CERT_PATH;
const httpsKeyPath = process.env.HTTPS_KEY_PATH;

let httpServer: HttpServer | HttpsServer;

if (useHttps && httpsCertPath && httpsKeyPath) {
  try {
    const httpsOptions = {
      cert: fs.readFileSync(httpsCertPath),
      key: fs.readFileSync(httpsKeyPath)
    };
    httpServer = createHttpsServer(httpsOptions, app);
    console.log('[Server] HTTPS mode enabled');
  } catch (err) {
    console.error('[Server] Failed to load HTTPS certs, falling back to HTTP:', err);
    httpServer = createServer(app);
  }
} else {
  httpServer = createServer(app);
}

const peerServer = ExpressPeerServer(httpServer, {
  path: '/'
});

// Socket.io server with CORS
const corsOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim()) 
  : ['http://localhost:5173', 'https://view-crew.vercel.app'];
  
const io = new Server(httpServer, {
  cors: {
    origin: corsOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://www.youtube.com", "https://s.ytimg.com"],
      frameSrc: ["'self'", "https://www.youtube.com", "https://www.youtube-nocookie.com"],
      connectSrc: ["'self'", "wss:", "ws:", "https:"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      mediaSrc: ["'self'", "blob:", "https://www.youtube.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

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

// Rate limiting for PeerJS signaling endpoint
const peerLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Too many signaling requests, please slow down.' }
});
app.use('/peerjs', peerLimiter, peerServer);

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
const protocol = useHttps ? 'https' : 'http';

httpServer.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🎬 CineSync Backend Server                              ║
║                                                           ║
║   ${protocol.toUpperCase()}:      ${protocol}://localhost:${PORT}                      ║
║   WebSocket: ${protocol === 'https' ? 'wss' : 'ws'}://localhost:${PORT}                        ║
║   Health:    ${protocol}://localhost:${PORT}/health               ║
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

// Global unhandled error handlers
process.on('unhandledRejection', (reason: unknown) => {
  console.error('[Server] Unhandled Promise Rejection:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error: Error) => {
  console.error('[Server] Uncaught Exception:', error);
  process.exit(1);
});

// Global Express error handler (must be after all routes)
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Server] Global error handler:', err);
  res.status(500).json({ error: 'INTERNAL_ERROR', message: 'An unexpected error occurred' });
});

export { app, io };
