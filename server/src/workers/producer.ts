import { rabbitMQ } from '../services/rabbitmq.js';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

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

let currentPrices = { ...initialPrices };

function generatePriceChange(currentPrice: number, volatility = 0.2): number {
    // Random walk with slight upward bias
    const change = (Math.random() - 0.48) * volatility / 100;
    return currentPrice * (1 + change);
}

export async function startProducer() {
    logger.info('🏭 Starting Producer Worker (Ingestion Service)...');

    // Connect to RabbitMQ
    await rabbitMQ.connect();

    // Simulate high frequency updates (e.g. from Exchange Websocket)
    setInterval(async () => {
        // Update all symbols but with random variations
        for (const symbol of SYMBOLS) {
            // Only update some symbols each tick to simulate varying activity
            if (Math.random() > 0.7) continue;

            let volatility = 0.2;
            if (symbol === 'BTC' || symbol === 'ETH') volatility = 0.15;
            if (symbol === 'SOL' || symbol === 'AVAX') volatility = 0.3;

            currentPrices[symbol] = generatePriceChange(currentPrices[symbol], volatility);

            const data = {
                symbol,
                price: currentPrices[symbol],
                timestamp: Date.now(),
                volume24h: Math.floor(Math.random() * 10000000000),
                marketCap: Math.floor(currentPrices[symbol] * (Math.random() * 1000000000))
            };

            await rabbitMQ.publishToQueue('crypto_prices', data);
        }
    }, 100); // 100ms interval = high frequency ingestion
}

// Check if running directly
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
    startProducer();
}
