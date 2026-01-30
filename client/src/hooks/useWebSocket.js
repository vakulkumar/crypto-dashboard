import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

/**
 * Custom hook for WebSocket connection management
 * @returns {Object} WebSocket state and methods
 */
export function useWebSocket() {
    const [connected, setConnected] = useState(false);
    const [prices, setPrices] = useState({});
    const [latency, setLatency] = useState(null);
    const socketRef = useRef(null);
    const pingIntervalRef = useRef(null);

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
        socket.on('price-update', (data) => {
            setPrices(prev => ({
                ...prev,
                [data.symbol]: data
            }));
        });

        socket.on('price-update-bulk', (dataArray) => {
            const newPrices = {};
            dataArray.forEach(data => {
                newPrices[data.symbol] = data;
            });
            setPrices(prev => ({ ...prev, ...newPrices }));
        });

        // Pong handler for latency
        socket.on('pong', (timestamp) => {
            const rtt = Date.now() - timestamp;
            setLatency(rtt);
        });

        // Error handler
        socket.on('error', (error) => {
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
    const subscribe = useCallback((symbols) => {
        if (socketRef.current && connected) {
            socketRef.current.emit('subscribe', symbols);
        }
    }, [connected]);

    // Unsubscribe from symbols
    const unsubscribe = useCallback((symbols) => {
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
