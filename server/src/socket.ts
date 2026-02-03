import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { redisPub, redisSub, redisAvailable } from './redis.js';
import { getAllPrices, SYMBOLS } from './dataService.js';
import logger from './utils/logger.js';
import { isRateLimited, rateLimiters } from './utils/rateLimiter.js';
import type { IncomingMessage, ServerResponse } from 'http';
import type { Server as HttpServer } from 'http';
import type { Http2SecureServer } from 'http2';

/**
 * Initialize Socket.io server with Redis adapter (if available)
 * @param {HttpServer} httpServer - HTTP server instance
 * @returns {Server} Socket.io server
 */
export function initializeSocket(httpServer: HttpServer | Http2SecureServer): Server {
    const io = new Server(httpServer, {
        cors: {
            origin: process.env.NODE_ENV === 'production'
                ? ['https://yourdomain.com']
                : ['http://localhost:5173', 'http://localhost:3000'],
            methods: ['GET', 'POST'],
            credentials: true
        },
        transports: ['websocket', 'polling'],
        pingTimeout: 60000,
        pingInterval: 25000,
        // Connection limits
        maxHttpBufferSize: 1e6, // 1MB
        // Performance optimizations
        perMessageDeflate: {
            threshold: 1024 // Only compress messages > 1KB
        }
    });

    // Use Redis adapter for horizontal scaling (if Redis is available)
    if (redisAvailable) {
        try {
            io.adapter(createAdapter(redisPub, redisSub));
            logger.info('✅ Socket.io using Redis adapter');
        } catch (err) {
            logger.warn('⚠️  Redis adapter failed - using in-memory adapter');
        }
    } else {
        logger.warn('⚠️  Running without Redis adapter (in-memory only)');
    }

    // Connection stats
    let connectionCount = 0;
    let totalConnections = 0;

    io.on('connection', async (socket: Socket) => {
        connectionCount++;
        totalConnections++;

        logger.info(`🔌 Client connected: ${socket.id} (Total: ${connectionCount})`);

        // Send initial data immediately
        try {
            const allPrices = await getAllPrices();
            socket.emit('price-update-bulk', allPrices);
        } catch (err) {
            logger.error('Error sending initial data:', err);
        }

        // Join the 'all' room by default
        socket.join('crypto:all');

        // Handle symbol subscription
        socket.on('subscribe', (symbols: string | string[]) => {
            if (isRateLimited(socket.id)) {
                socket.emit('error', { message: 'Rate limit exceeded' });
                return;
            }

            if (!Array.isArray(symbols)) {
                symbols = [symbols];
            }

            symbols.forEach(symbol => {
                if (SYMBOLS.includes(symbol)) {
                    socket.join(`crypto:${symbol}`);
                    logger.info(`📈 ${socket.id} subscribed to ${symbol}`);
                }
            });

            socket.emit('subscribed', symbols);
        });

        // Handle unsubscribe
        socket.on('unsubscribe', (symbols: string | string[]) => {
            if (isRateLimited(socket.id)) {
                return;
            }

            if (!Array.isArray(symbols)) {
                symbols = [symbols];
            }

            symbols.forEach(symbol => {
                socket.leave(`crypto:${symbol}`);
                logger.info(`📉 ${socket.id} unsubscribed from ${symbol}`);
            });

            socket.emit('unsubscribed', symbols);
        });

        // Handle ping for latency measurement
        socket.on('ping', (timestamp: number) => {
            if (isRateLimited(socket.id)) {
                return;
            }
            socket.emit('pong', timestamp);
        });

        // Handle disconnect
        socket.on('disconnect', (reason: string) => {
            connectionCount--;
            rateLimiters.delete(socket.id);
            logger.info(`🔌 Client disconnected: ${socket.id} (Total: ${connectionCount}, Reason: ${reason})`);
        });

        // Error handling
        socket.on('error', (err: any) => {
            logger.error(`Socket error for ${socket.id}:`, err);
        });
    });

    // Log stats periodically
    setInterval(() => {
        logger.info(`📊 Stats - Active: ${connectionCount}, Total served: ${totalConnections}`);
    }, 30000);

    return io;
}

export default initializeSocket;
