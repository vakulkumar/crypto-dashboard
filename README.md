# 🚀 CryptoPulse - Real-Time Crypto Dashboard

A high-performance, real-time cryptocurrency dashboard built with **TypeScript**, WebSockets, Redis, RabbitMQ, and React. Designed to handle **1,000+ concurrent users** with sub-100ms latency.

![Dashboard Preview](https://img.shields.io/badge/Status-Production%20Ready-success)
![Concurrent Users](https://img.shields.io/badge/Concurrent%20Users-1000%2B-blue)
![WebSocket](https://img.shields.io/badge/WebSocket-Socket.io-black)
![Redis](https://img.shields.io/badge/Cache-Redis-red)
![TypeScript](https://img.shields.io/badge/Language-TypeScript-blue)

## 🌟 Features

- ⚡ **Real-time price updates** - Live crypto prices updated every 1.5 seconds
- 🔄 **WebSocket communication** - Bi-directional, low-latency data streaming
- 💾 **Redis caching** - Fast data access with 2-3 second TTL
- 🐰 **RabbitMQ integration** - Message queue for decoupled data ingestion
- 📊 **Live charts** - Sparkline visualizations for price trends
- 🎨 **Premium UI** - Modern dark theme with glassmorphism effects
- 🔧 **Clustering support** - Multi-core utilization for horizontal scaling
- ⚡ **Rate limiting** - Per-client message throttling
- 📈 **Connection monitoring** - Real-time latency and connection status
- 📝 **Structured logging** - Winston-based logging with JSON format
- ✅ **Unit tests** - Jest test suite for critical components

## 🏗️ Architecture

### Tech Stack

**Backend:**
- Node.js with **TypeScript**
- Socket.io 4.x (WebSocket server)
- ioredis (Redis client)
- amqplib (RabbitMQ client)
- Express (HTTP server)
- Winston (Structured logging)
- @socket.io/redis-adapter (Horizontal scaling)

**Frontend:**
- React 18 with **TypeScript**
- Vite 7.x
- Socket.io-client
- Recharts (Data visualization)
- Lucide React (Icons)

**Testing:**
- Jest 30.x
- ts-jest for TypeScript support

**Load Testing:**
- Artillery.io
- Custom Node.js script

### Key Optimizations

1. **Redis Adapter** - Synchronize Socket.io across multiple server instances
2. **RabbitMQ Consumer** - Decoupled data ingestion from broadcasting
3. **Node.js Clustering** - Utilize all CPU cores with worker processes
4. **Connection Pooling** - Reuse Redis connections efficiently
5. **Rate Limiting** - Prevent client abuse (100 msgs/sec/client)
6. **Room-based Broadcasting** - Send updates only to subscribed clients
7. **Message Batching** - Reduce serialization overhead
8. **Compression** - Gzip compression for HTTP responses

## 📦 Project Structure

```
crypto-dashboard/
├── server/                     # Node.js backend (TypeScript)
│   ├── src/
│   │   ├── index.ts           # Main server entry
│   │   ├── socket.ts          # Socket.io handlers
│   │   ├── redis.ts           # Redis client & caching
│   │   ├── dataService.ts     # Price data service
│   │   ├── cluster.ts         # Cluster management
│   │   ├── services/
│   │   │   └── rabbitmq.ts    # RabbitMQ service
│   │   ├── utils/
│   │   │   ├── logger.ts      # Winston logger
│   │   │   └── rateLimiter.ts # Rate limiting utility
│   │   └── workers/
│   │       └── producer.ts    # Mock data producer
│   ├── tests/
│   │   ├── rateLimiter.test.ts
│   │   └── redis.test.ts
│   ├── tsconfig.json
│   └── package.json
│
├── client/                    # React frontend (TypeScript)
│   ├── src/
│   │   ├── App.tsx            # Main app
│   │   ├── App.css            # Premium styles
│   │   ├── components/
│   │   │   └── PriceCard.tsx  # Price card component
│   │   └── hooks/
│   │       └── useWebSocket.ts # WebSocket hook
│   ├── tsconfig.json
│   └── package.json
│
└── load-test/                 # Load testing
    ├── artillery.yml          # Artillery config
    ├── custom-test.js         # Custom load test
    └── package.json
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20.16+ (v20.19+ or v22.12+ recommended)
- Redis server (for caching)
- RabbitMQ (optional - for message queue)
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

### 2. Install RabbitMQ (Optional)

**Docker (Recommended):**
```bash
docker run -d -p 5672:5672 -p 15672:15672 rabbitmq:3-management
```

**macOS:**
```bash
brew install rabbitmq
brew services start rabbitmq
```

> **Note:** RabbitMQ is optional. The system will fall back to an internal price generator if RabbitMQ is unavailable.

### 3. Setup Backend

```bash
cd server
npm install

# Copy environment file
cp .env.example .env

# Start development server (with hot reload)
npm run dev

# OR build and start production
npm run build
npm start
```

The server will start on `http://localhost:3000`

### 4. Start Price Producer (Optional)

If using RabbitMQ, start the mock data producer:

```bash
cd server
npm run producer
```

### 5. Setup Frontend

```bash
cd client
npm install

# Start development server
npm run dev
```

The dashboard will open at `http://localhost:5173`

### 6. Run Tests

```bash
cd server
npm test
```

### 7. Setup Load Testing

```bash
cd load-test
npm install
```

## 🧪 Testing

### Unit Tests

Run the Jest test suite:

```bash
cd server
npm test
```

Tests include:
- Rate limiter functionality
- Redis caching behavior

### Load Testing

**Custom Load Test (Recommended):**

```bash
cd load-test
SERVER_URL=http://localhost:3000 NUM_CLIENTS=1000 TEST_DURATION=120 node custom-test.js
```

**Artillery Load Test:**

```bash
cd load-test
npm run artillery
```

**Success criteria:**
- ✅ >99% connection success rate
- ✅ <100ms average latency
- ✅ <1% error rate

## 📊 Performance Metrics

Expected performance with proper setup:

| Metric | Target | Typical |
|--------|--------|---------|
| Concurrent Connections | 1,000+ | ✅ |
| Average Latency | <100ms | ~11ms |
| Connection Success Rate | >99% | 100% |
| Messages/sec | 5,000+ | ~2,600 (single process) |
| Memory (1K clients) | <500MB | ~200-300MB |

## 🔧 Configuration

### Environment Variables

**Server** (`.env`):
```env
PORT=3000
NODE_ENV=development
LOG_LEVEL=info

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# RabbitMQ
RABBITMQ_URL=amqp://localhost

# Clustering
CLUSTER_ENABLED=false
WORKERS=4

# Rate Limiting
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
npm run build
CLUSTER_ENABLED=true WORKERS=4 npm start
```

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

## 🐰 RabbitMQ Integration

The system supports a producer-consumer pattern for price data:

1. **Producer** (`npm run producer`) - Generates mock price data and publishes to `crypto_prices` queue
2. **Consumer** (built into server) - Consumes messages and broadcasts via WebSocket

This decouples data ingestion from broadcasting, enabling:
- Independent scaling of data sources
- Real API integration (replace producer with real feeds)
- Message buffering during high load

## 🔐 Production Deployment

### 1. Build TypeScript

```bash
cd server
npm run build
```

### 2. Update CORS Origins

Edit `server/src/index.ts` and `server/src/socket.ts`:

```typescript
cors: {
  origin: ['https://yourdomain.com'],
  credentials: true
}
```

### 3. Enable Clustering

```bash
CLUSTER_ENABLED=true WORKERS=8 NODE_ENV=production npm start
```

### 4. Use Redis Cluster

For high availability, use Redis Cluster or Redis Sentinel.

### 5. Load Balancer

Use Nginx or HAProxy with sticky sessions:

```nginx
upstream socketio {
  ip_hash;  # Sticky sessions
  server localhost:3000;
  server localhost:3001;
  server localhost:3002;
}
```

### 6. Docker Deployment

```dockerfile
FROM node:20-slim
WORKDIR /app
COPY server/package*.json ./
RUN npm ci --production
COPY server/dist ./dist
EXPOSE 3000
CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t crypto-dashboard .
docker run -p 3000:3000 \
  -e REDIS_HOST=redis \
  -e RABBITMQ_URL=amqp://rabbitmq \
  crypto-dashboard
```

## 🐛 Troubleshooting

### Redis Connection Error

**Issue:** `Error: connect ECONNREFUSED 127.0.0.1:6379`

**Solution:** Make sure Redis is running:
```bash
redis-cli ping  # Should return "PONG"
brew services start redis  # macOS
```

### RabbitMQ Connection Error

**Issue:** `Failed to connect to RabbitMQ`

**Solution:** This is a warning, not an error. The system will use the internal price generator instead.

### TypeScript Compilation Errors

**Solution:**
```bash
cd server
npm run build
```

### Socket.io Connection Refused

**Solutions:**
1. Check CORS configuration
2. Verify `VITE_SOCKET_URL` in client `.env`
3. Ensure server is running on correct port

## 📈 Scaling Strategies

### Horizontal Scaling

1. **Multiple Server Instances** - Use Redis adapter to sync
2. **Load Balancer** - Distribute connections with sticky sessions
3. **Redis Cluster** - Distribute cache across nodes
4. **RabbitMQ Cluster** - High-availability message queue

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
- RabbitMQ for reliable message queuing
- React team for awesome UI framework
- Artillery.io for professional load testing
- Winston for structured logging

---

**Built with ❤️ to demonstrate high-performance real-time systems**

For questions or improvements, feel free to open an issue!
