import { jest } from '@jest/globals';

const mockRedisInstance = {
    connect: (jest.fn() as any).mockResolvedValue(undefined),
    on: jest.fn() as any,
    get: jest.fn() as any,
    set: jest.fn() as any,
    del: jest.fn() as any,
    mget: jest.fn() as any,
    mset: jest.fn() as any,
    pipeline: jest.fn().mockReturnValue({
        set: jest.fn(),
        exec: (jest.fn() as any).mockResolvedValue(undefined)
    }) as any
};

jest.unstable_mockModule('ioredis', () => ({
    Redis: jest.fn(() => mockRedisInstance),
    default: jest.fn(() => mockRedisInstance) // for default import
}));

jest.unstable_mockModule('../src/utils/logger.js', () => ({
    default: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    }
}));

// Dynamic import to apply mocks
const { cache } = await import('../src/redis.js');

describe('Redis Cache Wrapper', () => {
    beforeAll(async () => {
        // Allow time for initial connection promise to settle
        await new Promise(r => setTimeout(r, 50));
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('get returns parsed data on hit', async () => {
        mockRedisInstance.get.mockResolvedValue(JSON.stringify({ val: 123 }));
        const val = await cache.get('foo');
        expect(val).toEqual({ val: 123 });
        expect(mockRedisInstance.get).toHaveBeenCalledWith('foo');
    });

    test('get returns null on miss', async () => {
        mockRedisInstance.get.mockResolvedValue(null);
        const val = await cache.get('foo');
        expect(val).toBeNull();
    });

    test('get returns null on error (fallback safety)', async () => {
        mockRedisInstance.get.mockRejectedValue(new Error('Redis died'));
        const val = await cache.get('foo');
        expect(val).toBeNull();
    });

    test('set returns true on success', async () => {
        mockRedisInstance.set.mockResolvedValue('OK');
        const success = await cache.set('foo', { val: 1 }, 10);
        expect(success).toBe(true);
        expect(mockRedisInstance.set).toHaveBeenCalledWith('foo', JSON.stringify({ val: 1 }), 'EX', 10);
    });

    test('set returns false on error', async () => {
        mockRedisInstance.set.mockRejectedValue(new Error('Redis full'));
        const success = await cache.set('foo', { val: 1 });
        expect(success).toBe(false);
    });
});
