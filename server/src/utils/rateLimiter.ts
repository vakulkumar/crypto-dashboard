const MAX_MESSAGES_PER_SECOND = parseInt(process.env.MAX_MESSAGES_PER_SECOND || '100');

// Rate limiting per client
export const rateLimiters = new Map<string, { count: number; resetAt: number }>();

/**
 * Check if client exceeds rate limit
 * @param {string} clientId
 * @returns {boolean}
 */
export function isRateLimited(clientId: string): boolean {
    const now = Date.now();
    const limiter = rateLimiters.get(clientId);

    if (!limiter) {
        rateLimiters.set(clientId, { count: 1, resetAt: now + 1000 });
        return false;
    }

    if (now > limiter.resetAt) {
        limiter.count = 1;
        limiter.resetAt = now + 1000;
        return false;
    }

    limiter.count++;
    return limiter.count > MAX_MESSAGES_PER_SECOND;
}

/**
 * Clean up old rate limiters
 */
export function cleanupRateLimiters() {
    const now = Date.now();
    for (const [clientId, limiter] of rateLimiters.entries()) {
        if (now > limiter.resetAt + 5000) {
            rateLimiters.delete(clientId);
        }
    }
}

// Start cleanup interval
const cleanupInterval = setInterval(cleanupRateLimiters, 10000);
if (cleanupInterval.unref) {
    cleanupInterval.unref();
}
