import express from 'express';
import { createServer } from 'http';
import compression from 'compression';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeSocket } from './socket.js';
import { startPriceUpdates } from './dataService.js';
import { redisClient, redisAvailable } from './redis.js';
import logger from './utils/logger.js';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);

// Middleware
app.use(compression()); // Compress responses
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? ['https://yourdomain.com']
        : ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get('/health', async (req, res) => {
    let redisStatus = 'not configured';

    if (redisAvailable) {
        try {
            await redisClient.ping();
            redisStatus = 'connected';
        } catch (err) {
            redisStatus = 'disconnected';
        }
    }

    res.json({
        status: 'healthy',
        redis: redisStatus,
        timestamp: Date.now()
    });
});

// Stats endpoint
app.get('/stats', (req, res) => {
    res.json({
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        pid: process.pid,
        redis: redisAvailable ? 'enabled' : 'disabled',
        timestamp: Date.now()
    });
});

// Initialize Socket.io
const io = initializeSocket(httpServer);

// Start price update service
startPriceUpdates(io, 1500); // Update every 1.5 seconds

// Start server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    logger.info('🚀 Crypto Dashboard Server');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info(`📡 Server running on port ${PORT}`);
    logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`💾 Redis: ${redisAvailable ? 'Enabled' : 'Disabled (using memory cache)'}`);
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully...');
    httpServer.close(() => {
        logger.info('Server closed');
        if (redisAvailable) {
            redisClient.quit();
        }
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    logger.info('\nSIGINT received, shutting down gracefully...');
    httpServer.close(() => {
        logger.info('Server closed');
        if (redisAvailable) {
            redisClient.quit();
        }
        process.exit(0);
    });
});

export default app;
