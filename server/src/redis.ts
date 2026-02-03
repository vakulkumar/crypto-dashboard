import { Redis } from 'ioredis';
import type { RedisOptions } from 'ioredis';

const redisConfig: RedisOptions = {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    retryStrategy: (times: number) => {
        // Only retry 3 times, then give up
        if (times > 3) {
            console.warn('⚠️  Redis unavailable - using memory cache fallback');
            return null;
        }
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: true, // Don't auto-connect
};

// Main Redis client for caching
export const redisClient = new Redis(redisConfig);

// Pub client for Socket.io adapter
export const redisPub = new Redis(redisConfig);

// Sub client for Socket.io adapter
export const redisSub = new Redis(redisConfig);

let redisAvailable = false;

// Try to connect to Redis
redisClient.connect().then(() => {
    redisAvailable = true;
    console.log('✅ Redis client connected');
}).catch((err: Error) => {
    redisAvailable = false;
    console.warn('⚠️  Redis connection failed - running without Redis');
    console.warn('   Install Redis for production use:');
    console.warn('   - macOS: brew install redis && brew services start redis');
    console.warn('   - Docker: docker run -d -p 6379:6379 redis:latest');
});

redisPub.connect().catch(() => { });
redisSub.connect().catch(() => { });

// Error handling
redisClient.on('error', (err: Error) => {
    if (redisAvailable) {
        console.error('Redis Client Error:', err.message);
    }
});

redisPub.on('error', () => { }); // Silent
redisSub.on('error', () => { }); // Silent

// Cache helper functions
export const cache = {
    async get(key: string): Promise<any | null> {
        if (!redisAvailable) return null;
        try {
            const data = await redisClient.get(key);
            return data ? JSON.parse(data) : null;
        } catch (err) {
            return null;
        }
    },

    async set(key: string, value: any, ttlSeconds = 2): Promise<boolean> {
        if (!redisAvailable) return false;
        try {
            await redisClient.set(key, JSON.stringify(value), 'EX', ttlSeconds);
            return true;
        } catch (err) {
            return false;
        }
    },

    async del(key: string): Promise<boolean> {
        if (!redisAvailable) return false;
        try {
            await redisClient.del(key);
            return true;
        } catch (err) {
            return false;
        }
    },

    async mget(keys: string[]): Promise<(any | null)[]> {
        if (!redisAvailable) return keys.map(() => null);
        try {
            const values = await redisClient.mget(keys);
            return values.map((v: string | null) => v ? JSON.parse(v) : null);
        } catch (err) {
            return keys.map(() => null);
        }
    },

    async mset(keyValuePairs: Record<string, any>, ttlSeconds = 2): Promise<boolean> {
        if (!redisAvailable) return false;
        try {
            const pipeline = redisClient.pipeline();
            for (const [key, value] of Object.entries(keyValuePairs)) {
                pipeline.set(key, JSON.stringify(value), 'EX', ttlSeconds);
            }
            await pipeline.exec();
            return true;
        } catch (err) {
            return false;
        }
    }
};

export { redisAvailable };
export default redisClient;
