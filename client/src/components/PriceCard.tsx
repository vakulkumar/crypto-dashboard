import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

export interface PriceData {
    symbol: string;
    price: number;
    change24h: number;
    timestamp: number;
    volume24h: number;
    marketCap: number;
}

interface PriceCardProps {
    data: PriceData | null;
}

/**
 * Price card component for individual crypto
 * @param {Object} props
 * @param {Object} props.data - Price data
 */
export function PriceCard({ data }: PriceCardProps) {
    const [previousPrice, setPreviousPrice] = useState<number | null>(null);
    const [priceDirection, setPriceDirection] = useState<'up' | 'down' | null>(null);
    const [sparklineData, setSparklineData] = useState<{ price: number }[]>([]);

    useEffect(() => {
        if (data && data.price !== undefined) {
            if (previousPrice !== null) {
                if (data.price > previousPrice) {
                    setPriceDirection('up');
                } else if (data.price < previousPrice) {
                    setPriceDirection('down');
                }

                // Reset direction after animation
                setTimeout(() => setPriceDirection(null), 500);
            }
            setPreviousPrice(data.price);

            // Update sparkline data (keep last 20 points)
            setSparklineData(prev => {
                const newData = [...prev, { price: data.price }];
                return newData.slice(-20);
            });
        }
    }, [data?.price]);

    if (!data) {
        return (
            <div className="price-card loading">
                <div className="card-header">
                    <div className="skeleton skeleton-text"></div>
                </div>
                <div className="card-body">
                    <div className="skeleton skeleton-price"></div>
                </div>
            </div>
        );
    }

    const isPositive = data.change24h >= 0;
    const priceClass = priceDirection ? `price-${priceDirection}` : '';

    return (
        <div className="price-card">
            <div className="card-header">
                <div className="symbol-badge">
                    <span className="symbol-text">{data.symbol}</span>
                </div>
                <div className={`change-badge ${isPositive ? 'positive' : 'negative'}`}>
                    {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    <span>{isPositive ? '+' : ''}{data.change24h.toFixed(2)}%</span>
                </div>
            </div>

            <div className="card-body">
                <div className={`price ${priceClass}`}>
                    ${data.price.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    })}
                </div>

                <div className="sparkline">
                    {sparklineData.length > 1 && (
                        <ResponsiveContainer width="100%" height={40}>
                            <LineChart data={sparklineData}>
                                <Line
                                    type="monotone"
                                    dataKey="price"
                                    stroke={isPositive ? '#10b981' : '#ef4444'}
                                    strokeWidth={2}
                                    dot={false}
                                    isAnimationActive={false}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>

                <div className="card-footer">
                    <div className="stat">
                        <span className="stat-label">Volume</span>
                        <span className="stat-value">
                            ${(data.volume24h / 1000000).toFixed(1)}M
                        </span>
                    </div>
                    <div className="stat">
                        <span className="stat-label">Market Cap</span>
                        <span className="stat-value">
                            ${(data.marketCap / 1000000000).toFixed(1)}B
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PriceCard;
