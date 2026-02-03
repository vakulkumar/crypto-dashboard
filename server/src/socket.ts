import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { redisPub, redisSub, redisAvailable } from './redis.js';
import { getAllPrices, SYMBOLS } from './dataService.js';
import type { IncomingMessage, ServerResponse } from 'http';
import type { Server as HttpServer } from 'http';
import type { Http2SecureServer } from 'http2';

const MAX_MESSAGES_PER_SECOND = parseInt(process.env.MAX_MESSAGES_PER_SECOND || '100');

// Rate limiting per client
const rateLimiters = new Map<string, { count: number; resetAt: number }>();

/**
 * Check if client exceeds rate limit
 * @param {string} clientId 
 * @returns {boolean}
 */
function isRateLimited(clientId: string): boolean {
    const now = Date.now();
    const limiter = rateLimiters.get(clientId);

    if (!limiter) {
        rateLimiters.set(clientId, { count: 1, resetAt: now + 1000 });
        return false;
    }

    if (now > limiter.resetAt) {
        limiter.count = 1;
        limiter.resetAt = now + 1000;
        return false;
    }

    limiter.count++;
    return limiter.count > MAX_MESSAGES_PER_SECOND;
}

/**
 * Clean up old rate limiters
 */
setInterval(() => {
    const now = Date.now();
    for (const [clientId, limiter] of rateLimiters.entries()) {
        if (now > limiter.resetAt + 5000) {
            rateLimiters.delete(clientId);
        }
    }
}, 10000);

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
            console.log('✅ Socket.io using Redis adapter');
        } catch (err) {
            console.warn('⚠️  Redis adapter failed - using in-memory adapter');
        }
    } else {
        console.warn('⚠️  Running without Redis adapter (in-memory only)');
    }

    // Connection stats
    let connectionCount = 0;
    let totalConnections = 0;

    io.on('connection', async (socket: Socket) => {
        connectionCount++;
        totalConnections++;

        console.log(`🔌 Client connected: ${socket.id} (Total: ${connectionCount})`);

        // Send initial data immediately
        try {
            const allPrices = await getAllPrices();
            socket.emit('price-update-bulk', allPrices);
        } catch (err) {
            console.error('Error sending initial data:', err);
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
                    console.log(`📈 ${socket.id} subscribed to ${symbol}`);
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
                console.log(`📉 ${socket.id} unsubscribed from ${symbol}`);
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
            console.log(`🔌 Client disconnected: ${socket.id} (Total: ${connectionCount}, Reason: ${reason})`);
        });

        // Error handling
        socket.on('error', (err: any) => {
            console.error(`Socket error for ${socket.id}:`, err);
        });
    });

    // Log stats periodically
    setInterval(() => {
        console.log(`📊 Stats - Active: ${connectionCount}, Total served: ${totalConnections}`);
    }, 30000);

    return io;
}

export default initializeSocket;
