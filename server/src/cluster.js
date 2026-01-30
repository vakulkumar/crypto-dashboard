import cluster from 'cluster';
import os from 'os';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CLUSTER_ENABLED = process.env.CLUSTER_ENABLED === 'true';
const WORKERS = parseInt(process.env.WORKERS) || os.cpus().length;

if (CLUSTER_ENABLED && cluster.isPrimary) {
    console.log('🔧 Cluster mode enabled');
    console.log(`👷 Master process ${process.pid} is running`);
    console.log(`🚀 Spawning ${WORKERS} workers...`);

    // Fork workers
    for (let i = 0; i < WORKERS; i++) {
        cluster.fork();
    }

    // Handle worker exit
    cluster.on('exit', (worker, code, signal) => {
        console.log(`⚠️  Worker ${worker.process.pid} died (${signal || code}). Restarting...`);
        cluster.fork();
    });

    // Log when workers come online
    cluster.on('online', (worker) => {
        console.log(`✅ Worker ${worker.process.pid} is online`);
    });

} else {
    // Worker process or single-process mode
    import('./index.js');

    if (CLUSTER_ENABLED) {
        console.log(`👷 Worker ${process.pid} started`);
    }
}
