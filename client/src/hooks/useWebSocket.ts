import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { PriceData } from '../components/PriceCard';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

/**
 * Custom hook for WebSocket connection management
 * @returns {Object} WebSocket state and methods
 */
export function useWebSocket() {
    const [connected, setConnected] = useState(false);
    const [prices, setPrices] = useState<Record<string, PriceData>>({});
    const [latency, setLatency] = useState<number | null>(null);
    const socketRef = useRef<Socket | null>(null);
    const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        // Create socket connection
        const socket = io(SOCKET_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
        });

        socketRef.current = socket;

        // Connection event handlers
        socket.on('connect', () => {
            console.log('✅ Connected to server');
            setConnected(true);

            // Start ping interval for latency measurement
            pingIntervalRef.current = setInterval(() => {
                const timestamp = Date.now();
                socket.emit('ping', timestamp);
            }, 5000);
        });

        socket.on('disconnect', (reason) => {
            console.log('🔌 Disconnected:', reason);
            setConnected(false);
            if (pingIntervalRef.current) {
                clearInterval(pingIntervalRef.current);
            }
        });

        socket.on('connect_error', (error) => {
            console.error('❌ Connection error:', error);
            setConnected(false);
        });

        // Price update handlers
        socket.on('price-update', (data: PriceData) => {
            setPrices(prev => ({
                ...prev,
                [data.symbol]: data
            }));
        });

        socket.on('price-update-bulk', (dataArray: PriceData[]) => {
            const newPrices: Record<string, PriceData> = {};
            dataArray.forEach(data => {
                newPrices[data.symbol] = data;
            });
            setPrices(prev => ({ ...prev, ...newPrices }));
        });

        // Pong handler for latency
        socket.on('pong', (timestamp: number) => {
            const rtt = Date.now() - timestamp;
            setLatency(rtt);
        });

        // Error handler
        socket.on('error', (error: any) => {
            console.error('Socket error:', error);
        });

        // Cleanup on unmount
        return () => {
            if (pingIntervalRef.current) {
                clearInterval(pingIntervalRef.current);
            }
            socket.disconnect();
        };
    }, []);

    // Subscribe to specific symbols
    const subscribe = useCallback((symbols: string | string[]) => {
        if (socketRef.current && connected) {
            socketRef.current.emit('subscribe', symbols);
        }
    }, [connected]);

    // Unsubscribe from symbols
    const unsubscribe = useCallback((symbols: string | string[]) => {
        if (socketRef.current && connected) {
            socketRef.current.emit('unsubscribe', symbols);
        }
    }, [connected]);

    return {
        connected,
        prices,
        latency,
        subscribe,
        unsubscribe,
        socket: socketRef.current
    };
}
