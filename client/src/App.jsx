import { Activity, Wifi, WifiOff, Zap } from 'lucide-react';
import { useWebSocket } from './hooks/useWebSocket';
import { PriceCard } from './components/PriceCard';
import './App.css';

function App() {
  const { connected, prices, latency } = useWebSocket();

  const priceArray = Object.values(prices).sort((a, b) =>
    a.symbol.localeCompare(b.symbol)
  );

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <Activity size={32} strokeWidth={2.5} />
            <h1>CryptoPulse</h1>
          </div>

          <div className="header-stats">
            <div className={`connection-status ${connected ? 'connected' : 'disconnected'}`}>
              {connected ? <Wifi size={18} /> : <WifiOff size={18} />}
              <span>{connected ? 'Live' : 'Disconnected'}</span>
            </div>

            {connected && latency !== null && (
              <div className="latency-badge">
                <Zap size={18} />
                <span>{latency}ms</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main">
        <div className="dashboard-header">
          <h2>Real-Time Market Data</h2>
          <p>Live cryptocurrency prices updated every second</p>
        </div>

        {!connected && (
          <div className="alert alert-warning">
            <WifiOff size={20} />
            <div>
              <strong>Connection Lost</strong>
              <p>Attempting to reconnect to the server...</p>
            </div>
          </div>
        )}

        <div className="price-grid">
          {priceArray.length === 0 ? (
            // Loading skeletons
            Array.from({ length: 8 }).map((_, i) => (
              <PriceCard key={i} data={null} />
            ))
          ) : (
            priceArray.map(data => (
              <PriceCard key={data.symbol} data={data} />
            ))
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="footer">
        <p>
          Powered by WebSockets & Redis •
          {connected && priceArray.length > 0 && (
            <> Tracking {priceArray.length} assets</>
          )}
        </p>
      </footer>
    </div>
  );
}

export default App;
