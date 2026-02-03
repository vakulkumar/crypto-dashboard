import { jest } from '@jest/globals';
import { isRateLimited, rateLimiters } from '../src/utils/rateLimiter.js';

describe('Rate Limiter', () => {
    beforeEach(() => {
        rateLimiters.clear();
    });

    test('should allow first request', () => {
        expect(isRateLimited('client1')).toBe(false);
    });

    test('should allow up to limit', () => {
        // Default limit is 100
        for (let i = 0; i < 100; i++) {
            expect(isRateLimited('client1')).toBe(false);
        }
    });

    test('should block after limit', () => {
        for (let i = 0; i < 100; i++) {
            isRateLimited('client1');
        }
        expect(isRateLimited('client1')).toBe(true);
    });

    test('should reset after time', () => {
        jest.useFakeTimers();
        isRateLimited('client1'); // count 1

        // Fast forward 1001ms
        jest.advanceTimersByTime(1001);

        // Should be reset (returns false for "is limited", and starts new count)
        expect(isRateLimited('client1')).toBe(false);

        const limiter = rateLimiters.get('client1');
        expect(limiter?.count).toBe(1); // Should be 1 after new call

        jest.useRealTimers();
    });
});
