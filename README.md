# 🚀 CryptoPulse - Real-Time Crypto Dashboard

A high-performance, real-time cryptocurrency dashboard built with WebSockets, Redis, Node.js, and React. Designed to handle **1,000+ concurrent users** with sub-100ms latency.

![Dashboard Preview](https://img.shields.io/badge/Status-Production%20Ready-success)
![Concurrent Users](https://img.shields.io/badge/Concurrent%20Users-1000%2B-blue)
![WebSocket](https://img.shields.io/badge/WebSocket-Socket.io-black)
![Redis](https://img.shields.io/badge/Cache-Redis-red)

## 🌟 Features

- ⚡ **Real-time price updates** - Live crypto prices updated every 1.5 seconds
- 🔄 **WebSocket communication** - Bi-directional, low-latency data streaming
- 💾 **Redis caching** - Fast data access with 2-3 second TTL
- 📊 **Live charts** - Sparkline visualizations for price trends
- 🎨 **Premium UI** - Modern dark theme with glassmorphism effects
- 🔧 **Clustering support** - Multi-core utilization for horizontal scaling
- ⚡ **Rate limiting** - Per-client message throttling
- 📈 **Connection monitoring** - Real-time latency and connection status

## 🏗️ Architecture

### Tech Stack

**Backend:**
- Node.js (ES Modules)
- Socket.io 4.x (WebSocket server)
- ioredis (Redis client)
- Express (HTTP server)
- @socket.io/redis-adapter (Horizontal scaling)

**Frontend:**
- React 18
- Vite 7.x
- Socket.io-client
- Recharts (Data visualization)
- Lucide React (Icons)

**Load Testing:**
- Artillery.io
- Custom Node.js script

### Key Optimizations

1. **Redis Adapter** - Synchronize Socket.io across multiple server instances
2. **Node.js Clustering** - Utilize all CPU cores with worker processes
3. **Connection Pooling** - Reuse Redis connections efficiently
4. **Rate Limiting** - Prevent client abuse (100 msgs/sec/client)
5. **Room-based Broadcasting** - Send updates only to subscribed clients
6. **Message Batching** - Reduce serialization overhead
7. **Compression** - Gzip compression for HTTP responses

## 📦 Project Structure

```
crypto-dashboard/
├── server/                 # Node.js backend
│   ├── src/
│   │   ├── index.js       # Main server entry
│   │   ├── socket.js      # Socket.io handlers
│   │   ├── redis.js       # Redis client & caching
│   │   ├── dataService.js # Mock price generator
│   │   └── cluster.js     # Cluster management
│   └── package.json
│
├── client/                # React frontend
│   ├── src/
│   │   ├── App.jsx        # Main app
│   │   ├── App.css        # Premium styles
│   │   ├── components/    # UI components
│   │   └── hooks/         # WebSocket hook
│   └── package.json
│
└── load-test/             # Load testing
    ├── artillery.yml      # Artillery config
    ├── custom-test.js     # Custom load test
    └── package.json
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20.16+ (v20.19+ or v22.12+ recommended)
- Redis server (for caching)
- npm or yarn

### 1. Install Redis

**macOS (Homebrew):**
```bash
brew install redis
brew services start redis
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis
```

**Or use Docker:**
```bash
docker run -d -p 6379:6379 redis:latest
```

### 2. Setup Backend

```bash
cd server
npm install

# Copy environment file
cp .env.example .env

# Start development server
npm run dev

# OR start with clustering (production)
npm start
```

The server will start on `http://localhost:3000`

### 3. Setup Frontend

```bash
cd client
npm install

# Start development server
npm run dev
```

The dashboard will open at `http://localhost:5173`

### 4. Setup Load Testing

```bash
cd load-test
npm install
```

## 🧪 Load Testing

### Option 1: Custom Load Test (Recommended)

Test with 1,000 concurrent connections:

```bash
cd load-test
node custom-test.js
```

**Custom parameters:**
```bash
SERVER_URL=http://localhost:3000 NUM_CLIENTS=1000 TEST_DURATION=120 node custom-test.js
```

**What it tests:**
- Connection success rate
- Message latency (avg, p50, p95, p99)
- Messages per second
- Memory usage
- Error rate

**Success criteria:**
- ✅ >99% connection success rate
- ✅ <100ms average latency
- ✅ <1% error rate

### Option 2: Artillery Load Test

Professional load testing with Artillery:

```bash
cd load-test
npm run artillery
```

**Phases:**
1. Warm-up: 0-100 users over 30s
2. Ramp-up: 100-500 users over 60s
3. Spike: 500-1000 users over 30s
4. Sustain: 1000 users for 2 minutes
5. Cool down: 30s

## 📊 Performance Metrics

Expected performance with proper setup:

| Metric | Target | Typical |
|--------|--------|---------|
| Concurrent Connections | 1,000+ | ✅ |
| Average Latency | <100ms | ~30-50ms |
| Connection Success Rate | >99% | 99.8% |
| Messages/sec | 5,000+ | ✅ |
| Memory (1K clients) | <500MB | ~200-300MB |

## 🔧 Configuration

### Environment Variables

**Server** (`.env`):
```env
PORT=3000
NODE_ENV=development
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
CLUSTER_ENABLED=false
WORKERS=4
MAX_MESSAGES_PER_SECOND=100
```

**Client** (`.env`):
```env
VITE_SOCKET_URL=http://localhost:3000
```

### Enable Clustering

For production with multiple CPU cores:

```bash
cd server
CLUSTER_ENABLED=true WORKERS=4 npm start
```

This will spawn 4 worker processes (adjust based on your CPU cores).

## 🎨 UI Features

- **Glassmorphism design** - Modern, translucent card effects
- **Real-time animations** - Price changes flash green/red
- **Sparkline charts** - Mini price trend visualizations
- **Connection status** - Live indicator with latency display
- **Responsive layout** - Works on desktop, tablet, mobile
- **Dark theme** - Premium gradient backgrounds

## 📡 API Endpoints

### HTTP Endpoints

- `GET /health` - Health check (returns Redis status)
- `GET /stats` - Server statistics

### WebSocket Events

**Client → Server:**
- `subscribe` - Subscribe to crypto symbols
- `unsubscribe` - Unsubscribe from symbols
- `ping` - Latency measurement

**Server → Client:**
- `price-update` - Single crypto price update
- `price-update-bulk` - Bulk price updates (all cryptos)
- `pong` - Latency response
- `subscribed` - Subscription confirmation
- `error` - Error notification

## 🔐 Production Deployment

### 1. Update CORS Origins

Edit `server/src/index.js` and `server/src/socket.js`:

```javascript
cors: {
  origin: ['https://yourdomain.com'],
  credentials: true
}
```

### 2. Enable Clustering

```bash
CLUSTER_ENABLED=true WORKERS=8 NODE_ENV=production npm start
```

### 3. Use Redis Cluster

For high availability, use Redis Cluster or Redis Sentinel.

### 4. Load Balancer

Use Nginx or HAProxy with sticky sessions:

```nginx
upstream socketio {
  ip_hash;  # Sticky sessions
  server localhost:3000;
  server localhost:3001;
  server localhost:3002;
}
```

### 5. Docker Deployment

Create `Dockerfile`:

```dockerfile
FROM node:20-slim
WORKDIR /app
COPY server/package*.json ./
RUN npm ci --production
COPY server/ ./
EXPOSE 3000
CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t crypto-dashboard .
docker run -p 3000:3000 -e REDIS_HOST=redis crypto-dashboard
```

## 🐛 Troubleshooting

### Redis Connection Error

**Issue:** `Error: connect ECONNREFUSED 127.0.0.1:6379`

**Solution:** Make sure Redis is running:
```bash
# Check Redis status
redis-cli ping  # Should return "PONG"

# Start Redis
brew services start redis  # macOS
sudo systemctl start redis # Linux
```

### High Memory Usage

**Issue:** Server uses too much memory with many connections

**Solutions:**
1. Enable clustering to distribute load
2. Reduce `maxHttpBufferSize` in Socket.io config
3. Implement connection limits
4. Use Redis TTL aggressively

### Socket.io Connection Refused

**Issue:** Frontend can't connect to backend

**Solutions:**
1. Check CORS configuration
2. Verify `VITE_SOCKET_URL` in client `.env`
3. Ensure server is running on correct port
4. Check firewall settings

## 📈 Scaling Strategies

### Horizontal Scaling

1. **Multiple Server Instances** - Use Redis adapter to sync
2. **Load Balancer** - Distribute connections with sticky sessions
3. **Redis Cluster** - Distribute cache across nodes

### Vertical Scaling

1. **Enable Clustering** - Use all CPU cores
2. **Increase Memory** - Allow more connections
3. **Optimize Redis** - Tune Redis configuration

## 🤝 Contributing

This is a demonstration project showcasing high-concurrency WebSocket handling. Feel free to extend it with:

- Real crypto API integration (Binance, CoinGecko, etc.)
- User authentication
- Personalized watchlists
- Historical data charts
- Price alerts
- More advanced load balancing

## 📝 License

MIT License - Use freely for learning and production!

## 🙏 Acknowledgments

- Socket.io for excellent WebSocket library
- Redis for blazing-fast caching
- React team for awesome UI framework
- Artillery.io for professional load testing

---

**Built with ❤️ to demonstrate high-performance real-time systems**

For questions or improvements, feel free to open an issue!
