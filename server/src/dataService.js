import { cache } from './redis.js';

// Supported crypto symbols
const SYMBOLS = ['BTC', 'ETH', 'SOL', 'ADA', 'DOT', 'AVAX', 'MATIC', 'LINK'];

// Initial prices (USD)
const initialPrices = {
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
let currentPrices = { ...initialPrices };

// Price history for 24h change calculation
const priceHistory = {};

// In-memory cache fallback (when Redis is unavailable)
const memoryCache = new Map();

// Initialize price history
SYMBOLS.forEach(symbol => {
    priceHistory[symbol] = {
        price24hAgo: initialPrices[symbol],
        lastUpdate: Date.now()
    };
});

/**
 * Generate realistic price fluctuation
 * @param {number} currentPrice 
 * @param {number} volatility - Percentage volatility (e.g., 0.2 for 0.2%)
 * @returns {number} New price
 */
function generatePriceChange(currentPrice, volatility = 0.2) {
    // Random walk with slight upward bias
    const change = (Math.random() - 0.48) * volatility / 100;
    return currentPrice * (1 + change);
}

/**
 * Get current price data for all symbols
 * @returns {Object} Price data
 */
export function getCurrentPrices() {
    const timestamp = Date.now();

    return SYMBOLS.map(symbol => {
        const currentPrice = currentPrices[symbol];
        const price24hAgo = priceHistory[symbol].price24hAgo;
        const change24h = ((currentPrice - price24hAgo) / price24hAgo) * 100;

        return {
            symbol,
            price: currentPrice,
            change24h: parseFloat(change24h.toFixed(2)),
            timestamp,
            volume24h: Math.floor(Math.random() * 10000000000), // Mock volume
            marketCap: Math.floor(currentPrice * (Math.random() * 1000000000)) // Mock market cap
        };
    });
}

/**
 * Update prices with realistic fluctuations
 */
export function updatePrices() {
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
 * @param {Object} io - Socket.io server instance
 * @param {number} interval - Update interval in ms (default: 1500ms)
 */
export function startPriceUpdates(io, interval = 1500) {
    console.log('📊 Starting price update service...');

    setInterval(async () => {
        // Update prices
        updatePrices();
        const priceData = getCurrentPrices();

        // Try to cache in Redis, fallback to memory
        try {
            const cacheData = {};
            priceData.forEach(data => {
                cacheData[`price:${data.symbol}`] = data;
                // Also store in memory cache
                memoryCache.set(`price:${data.symbol}`, { data, timestamp: Date.now() });
            });
            await cache.mset(cacheData, 3).catch(() => {
                // Silent fail - using memory cache
            });
        } catch (err) {
            // Redis unavailable - using memory cache only
        }

        // Broadcast to all connected clients
        // Using rooms for efficient targeted broadcasting
        SYMBOLS.forEach(symbol => {
            const data = priceData.find(p => p.symbol === symbol);
            io.to(`crypto:${symbol}`).emit('price-update', data);
        });

        // Also broadcast all prices to 'all' room
        io.to('crypto:all').emit('price-update-bulk', priceData);

    }, interval);

    console.log(`✅ Price updates running every ${interval}ms`);
}

/**
 * Get price from cache or generate fresh
 * @param {string} symbol 
 * @returns {Object} Price data
 */
export async function getPrice(symbol) {
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
export async function getAllPrices() {
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
