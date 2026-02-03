import { cache } from './redis.js';
import type { Server } from 'socket.io';
import { rabbitMQ } from './services/rabbitmq.js';
import logger from './utils/logger.js';

// Supported crypto symbols
const SYMBOLS = ['BTC', 'ETH', 'SOL', 'ADA', 'DOT', 'AVAX', 'MATIC', 'LINK'];

// Initial prices (USD)
const initialPrices: Record<string, number> = {
    'BTC': 45000,
    'ETH': 2500,
    'SOL': 100,
    'ADA': 0.5,
    'DOT': 7.5,
    'AVAX': 35,
    'MATIC': 0.85,
    'LINK': 15
};

// Current prices in memory
let currentPrices: Record<string, number> = { ...initialPrices };

// Price history for 24h change calculation
const priceHistory: Record<string, { price24hAgo: number; lastUpdate: number }> = {};

// In-memory cache fallback (when Redis is unavailable)
const memoryCache = new Map<string, { data: any; timestamp: number }>();

// Initialize price history
SYMBOLS.forEach(symbol => {
    priceHistory[symbol] = {
        price24hAgo: initialPrices[symbol],
        lastUpdate: Date.now()
    };
});

interface PriceData {
    symbol: string;
    price: number;
    change24h: number;
    timestamp: number;
    volume24h: number;
    marketCap: number;
}

/**
 * Generate realistic price fluctuation
 * @param {number} currentPrice
 * @param {number} volatility - Percentage volatility (e.g., 0.2 for 0.2%)
 * @returns {number} New price
 */
function generatePriceChange(currentPrice: number, volatility = 0.2): number {
    // Random walk with slight upward bias
    const change = (Math.random() - 0.48) * volatility / 100;
    return currentPrice * (1 + change);
}

function getPriceData(symbol: string): PriceData {
    const currentPrice = currentPrices[symbol];
    const price24hAgo = priceHistory[symbol].price24hAgo;
    const change24h = ((currentPrice - price24hAgo) / price24hAgo) * 100;

    return {
        symbol,
        price: currentPrice,
        change24h: parseFloat(change24h.toFixed(2)),
        timestamp: Date.now(),
        // Mock volume/cap if not provided externally (will be overridden if consumer gets it)
        volume24h: Math.floor(Math.random() * 10000000000),
        marketCap: Math.floor(currentPrice * (Math.random() * 1000000000))
    };
}

/**
 * Get current price data for all symbols
 * @returns {Array} Price data
 */
export function getCurrentPrices(): PriceData[] {
    return SYMBOLS.map(symbol => getPriceData(symbol));
}

/**
 * Update prices with realistic fluctuations (Internal Generator)
 */
export function updatePrices(): void {
    SYMBOLS.forEach(symbol => {
        // Different volatility for different assets
        let volatility = 0.2; // Default 0.2%
        if (symbol === 'BTC' || symbol === 'ETH') volatility = 0.15; // Less volatile
        if (symbol === 'SOL' || symbol === 'AVAX') volatility = 0.3; // More volatile

        currentPrices[symbol] = generatePriceChange(currentPrices[symbol], volatility);

        // Update 24h history every hour (simulated)
        const now = Date.now();
        if (now - priceHistory[symbol].lastUpdate > 3600000) {
            priceHistory[symbol].price24hAgo = currentPrices[symbol];
            priceHistory[symbol].lastUpdate = now;
        }
    });
}

/**
 * Start the price update service
 * @param {Server} io - Socket.io server instance
 * @param {number} interval - Update interval in ms (default: 1500ms)
 */
export async function startPriceUpdates(io: Server, interval = 1500) {
    logger.info('📊 Starting price update service...');

    // Try to connect to RabbitMQ
    const channel = await rabbitMQ.connect();

    if (channel) {
        logger.info('✅ Using RabbitMQ Consumer for ingestion');
        startConsumer(io, interval);
    } else {
        logger.warn('⚠️  RabbitMQ unavailable - using internal generator');
        startInternalGenerator(io, interval);
    }
}

function startInternalGenerator(io: Server, interval: number) {
    logger.info(`✅ Internal Generator running every ${interval}ms`);
    setInterval(async () => {
        updatePrices();
        const priceData = getCurrentPrices();
        await broadcastUpdates(io, priceData);
    }, interval);
}

async function startConsumer(io: Server, broadcastInterval: number) {
    const updateBuffer = new Map<string, PriceData>();

    // Subscribe to RabbitMQ
    await rabbitMQ.consume('crypto_prices', async (data: any) => {
        if (data && data.symbol && data.price) {
            // Update internal state
            currentPrices[data.symbol] = data.price;

            // Check 24h history update
            const now = Date.now();
            if (now - priceHistory[data.symbol].lastUpdate > 3600000) {
                priceHistory[data.symbol].price24hAgo = data.price;
                priceHistory[data.symbol].lastUpdate = now;
            }

            // Prepare full data object
            const fullData = getPriceData(data.symbol);
            if (data.volume24h) fullData.volume24h = data.volume24h;
            if (data.marketCap) fullData.marketCap = data.marketCap;

            // Add to buffer (debouncing/batching)
            // This decouples ingestion speed from broadcast speed
            updateBuffer.set(data.symbol, fullData);
        }
    });

    logger.info(`✅ Consumer Broadcast running every ${broadcastInterval}ms`);
    // Decoupled Broadcast Loop
    setInterval(async () => {
        if (updateBuffer.size === 0) return;

        const updates = Array.from(updateBuffer.values());
        updateBuffer.clear(); // Clear buffer after taking snapshot

        await broadcastUpdates(io, updates);
    }, broadcastInterval);
}

async function broadcastUpdates(io: Server, priceData: PriceData[]) {
    // Cache in Redis/Memory
    try {
        const cacheData: Record<string, any> = {};
        priceData.forEach(data => {
            cacheData[`price:${data.symbol}`] = data;
            // Also store in memory cache
            memoryCache.set(`price:${data.symbol}`, { data, timestamp: Date.now() });
        });
        await cache.mset(cacheData, 3).catch(() => {
            // Silent fail
        });
    } catch (err) {
        // Redis unavailable
    }

    // Broadcast targeted updates
    priceData.forEach(data => {
        io.to(`crypto:${data.symbol}`).emit('price-update', data);
    });

    // Broadcast bulk updates
    io.to('crypto:all').emit('price-update-bulk', priceData);
}

/**
 * Get price from cache or generate fresh
 * @param {string} symbol
 * @returns {Object} Price data
 */
export async function getPrice(symbol: string): Promise<any> {
    // Try Redis cache first
    try {
        const cached = await cache.get(`price:${symbol}`);
        if (cached) {
            return cached;
        }
    } catch (err) {
        // Redis unavailable, try memory cache
    }

    // Try memory cache
    const memoryCached = memoryCache.get(`price:${symbol}`);
    if (memoryCached && (Date.now() - memoryCached.timestamp) < 3000) {
        return memoryCached.data;
    }

    // Generate fresh data
    const allPrices = getCurrentPrices();
    return allPrices.find(p => p.symbol === symbol) || null;
}

/**
 * Get all prices from cache or generate fresh
 * @returns {Array} All price data
 */
export async function getAllPrices(): Promise<any[]> {
    // Try Redis first
    try {
        const keys = SYMBOLS.map(s => `price:${s}`);
        const cached = await cache.mget(keys);

        // If all cached, return
        if (cached.every(c => c !== null)) {
            return cached;
        }
    } catch (err) {
        // Redis unavailable, try memory cache
    }

    // Try memory cache
    const memoryCached = SYMBOLS.map(s => {
        const cached = memoryCache.get(`price:${s}`);
        if (cached && (Date.now() - cached.timestamp) < 3000) {
            return cached.data;
        }
        return null;
    });

    if (memoryCached.every(c => c !== null)) {
        return memoryCached;
    }

    // Otherwise generate fresh
    return getCurrentPrices();
}

export { SYMBOLS };
