import { io } from 'socket.io-client';
import os from 'os';

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';
const NUM_CLIENTS = parseInt(process.env.NUM_CLIENTS) || 1000;
const TEST_DURATION = parseInt(process.env.TEST_DURATION) || 120; // seconds

// Statistics
const stats = {
    connected: 0,
    failed: 0,
    messagesReceived: 0,
    latencies: [],
    startTime: null,
    endTime: null,
    errors: []
};

// Memory tracking
const memorySnapshots = [];

/**
 * Create a single client connection
 * @param {number} clientId 
 * @returns {Promise}
 */
function createClient(clientId) {
    return new Promise((resolve, reject) => {
        const socket = io(SERVER_URL, {
            transports: ['websocket'],
            reconnection: false,
            timeout: 10000
        });

        const clientStats = {
            id: clientId,
            connected: false,
            messagesReceived: 0,
            latencies: []
        };

        // Connection timeout
        const connectionTimeout = setTimeout(() => {
            if (!clientStats.connected) {
                socket.disconnect();
                stats.failed++;
                reject(new Error(`Client ${clientId} connection timeout`));
            }
        }, 10000);

        socket.on('connect', () => {
            clearTimeout(connectionTimeout);
            clientStats.connected = true;
            stats.connected++;

            // Subscribe to crypto channels
            socket.emit('subscribe', ['BTC', 'ETH', 'SOL']);

            // Start ping interval for latency measurement
            const pingInterval = setInterval(() => {
                const timestamp = Date.now();
                socket.emit('ping', timestamp);
            }, 5000);

            // Store interval for cleanup
            clientStats.pingInterval = pingInterval;

            if (stats.connected % 100 === 0) {
                console.log(`✅ ${stats.connected} clients connected`);
            }

            resolve({ socket, clientStats });
        });

        socket.on('price-update', (data) => {
            clientStats.messagesReceived++;
            stats.messagesReceived++;
        });

        socket.on('price-update-bulk', (data) => {
            clientStats.messagesReceived++;
            stats.messagesReceived++;
        });

        socket.on('pong', (timestamp) => {
            const latency = Date.now() - timestamp;
            clientStats.latencies.push(latency);
            stats.latencies.push(latency);
        });

        socket.on('connect_error', (err) => {
            clearTimeout(connectionTimeout);
            stats.failed++;
            stats.errors.push({ clientId, error: err.message });
            reject(err);
        });

        socket.on('error', (err) => {
            stats.errors.push({ clientId, error: err.message });
        });
    });
}

/**
 * Track memory usage
 */
function trackMemory() {
    const usage = process.memoryUsage();
    memorySnapshots.push({
        timestamp: Date.now(),
        heapUsed: usage.heapUsed / 1024 / 1024, // MB
        heapTotal: usage.heapTotal / 1024 / 1024,
        rss: usage.rss / 1024 / 1024
    });
}

/**
 * Calculate statistics
 */
function calculateStats() {
    const duration = (stats.endTime - stats.startTime) / 1000; // seconds

    // Latency statistics
    const sortedLatencies = stats.latencies.sort((a, b) => a - b);
    const avgLatency = stats.latencies.reduce((a, b) => a + b, 0) / stats.latencies.length;
    const p50 = sortedLatencies[Math.floor(sortedLatencies.length * 0.5)];
    const p95 = sortedLatencies[Math.floor(sortedLatencies.length * 0.95)];
    const p99 = sortedLatencies[Math.floor(sortedLatencies.length * 0.99)];
    const maxLatency = sortedLatencies[sortedLatencies.length - 1];

    // Memory statistics
    const maxHeapUsed = Math.max(...memorySnapshots.map(s => s.heapUsed));
    const avgHeapUsed = memorySnapshots.reduce((a, b) => a + b.heapUsed, 0) / memorySnapshots.length;

    // Message rate
    const messagesPerSecond = stats.messagesReceived / duration;

    return {
        duration,
        connections: {
            total: NUM_CLIENTS,
            successful: stats.connected,
            failed: stats.failed,
            successRate: ((stats.connected / NUM_CLIENTS) * 100).toFixed(2) + '%'
        },
        messages: {
            total: stats.messagesReceived,
            perSecond: messagesPerSecond.toFixed(2)
        },
        latency: {
            avg: avgLatency.toFixed(2) + 'ms',
            p50: p50 + 'ms',
            p95: p95 + 'ms',
            p99: p99 + 'ms',
            max: maxLatency + 'ms',
            samples: stats.latencies.length
        },
        memory: {
            maxHeapUsed: maxHeapUsed.toFixed(2) + ' MB',
            avgHeapUsed: avgHeapUsed.toFixed(2) + ' MB'
        },
        errors: stats.errors.length
    };
}

/**
 * Main test function
 */
async function runLoadTest() {
    console.log('🚀 Starting Load Test');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📡 Server: ${SERVER_URL}`);
    console.log(`👥 Clients: ${NUM_CLIENTS}`);
    console.log(`⏱️  Duration: ${TEST_DURATION}s`);
    console.log(`💻 System: ${os.platform()} ${os.arch()}`);
    console.log(`🧠 Memory: ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB`);
    console.log(`🔧 CPUs: ${os.cpus().length}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    stats.startTime = Date.now();

    // Start memory tracking
    const memoryInterval = setInterval(trackMemory, 1000);

    try {
        // Create all clients in batches to avoid overwhelming the system
        const BATCH_SIZE = 50;
        const clients = [];

        console.log('📊 Creating connections...\n');

        for (let i = 0; i < NUM_CLIENTS; i += BATCH_SIZE) {
            const batch = [];
            const batchEnd = Math.min(i + BATCH_SIZE, NUM_CLIENTS);

            for (let j = i; j < batchEnd; j++) {
                batch.push(createClient(j).catch(err => {
                    // Silent catch - errors are tracked in stats
                    return null;
                }));
            }

            const results = await Promise.all(batch);
            clients.push(...results.filter(r => r !== null));

            // Small delay between batches
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.log(`\n✅ Connection phase complete`);
        console.log(`   Connected: ${stats.connected}/${NUM_CLIENTS}`);
        console.log(`   Failed: ${stats.failed}\n`);

        // Hold connections for test duration
        console.log(`⏳ Holding connections for ${TEST_DURATION}s...\n`);

        // Progress indicator
        const progressInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - stats.startTime) / 1000);
            const remaining = TEST_DURATION - elapsed;
            const progress = ((elapsed / TEST_DURATION) * 100).toFixed(0);
            process.stdout.write(`\r   Progress: ${progress}% | Messages: ${stats.messagesReceived} | Elapsed: ${elapsed}s | Remaining: ${remaining}s   `);
        }, 1000);

        await new Promise(resolve => setTimeout(resolve, TEST_DURATION * 1000));

        clearInterval(progressInterval);
        console.log('\n');

        // Cleanup
        console.log('🧹 Cleaning up connections...\n');
        for (const client of clients) {
            if (client && client.socket) {
                if (client.clientStats.pingInterval) {
                    clearInterval(client.clientStats.pingInterval);
                }
                client.socket.disconnect();
            }
        }

        stats.endTime = Date.now();
        clearInterval(memoryInterval);

        // Wait a bit for cleanup
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Print results
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📊 LOAD TEST RESULTS');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        const results = calculateStats();

        console.log('🔌 Connections:');
        console.log(`   Total Attempted: ${results.connections.total}`);
        console.log(`   Successful: ${results.connections.successful}`);
        console.log(`   Failed: ${results.connections.failed}`);
        console.log(`   Success Rate: ${results.connections.successRate}\n`);

        console.log('📨 Messages:');
        console.log(`   Total Received: ${results.messages.total}`);
        console.log(`   Messages/sec: ${results.messages.perSecond}\n`);

        console.log('⚡ Latency:');
        console.log(`   Average: ${results.latency.avg}`);
        console.log(`   P50: ${results.latency.p50}`);
        console.log(`   P95: ${results.latency.p95}`);
        console.log(`   P99: ${results.latency.p99}`);
        console.log(`   Max: ${results.latency.max}`);
        console.log(`   Samples: ${results.latency.samples}\n`);

        console.log('💾 Memory (Client Process):');
        console.log(`   Max Heap Used: ${results.memory.maxHeapUsed}`);
        console.log(`   Avg Heap Used: ${results.memory.avgHeapUsed}\n`);

        if (results.errors > 0) {
            console.log(`⚠️  Errors: ${results.errors}`);
            console.log(`   First 5 errors:`);
            stats.errors.slice(0, 5).forEach(e => {
                console.log(`   - Client ${e.clientId}: ${e.error}`);
            });
            console.log('');
        }

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        // Success criteria
        const successRate = parseFloat(results.connections.successRate);
        const avgLatency = parseFloat(results.latency.avg);

        console.log('\n✨ VERDICT:');
        if (successRate >= 99 && avgLatency < 100 && results.errors < 10) {
            console.log('   ✅ PASS - Server handles load successfully!');
        } else if (successRate >= 95) {
            console.log('   ⚠️  PARTIAL - Server handles most load but has issues');
        } else {
            console.log('   ❌ FAIL - Server cannot handle the load');
        }
        console.log('');

    } catch (err) {
        console.error('❌ Load test failed:', err);
        process.exit(1);
    }
}

// Run the test
runLoadTest().then(() => {
    console.log('✅ Load test complete\n');
    process.exit(0);
}).catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
});
