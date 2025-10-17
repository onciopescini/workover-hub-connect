/**
 * Client-side rate limiting for authentication attempts
 * Prevents excessive login/signup attempts before hitting the server
 * 
 * Rate limits:
 * - Max 5 attempts per email per 15 minutes
 * - Stored in localStorage for persistence across page reloads
 */

interface RateLimitEntry {
  count: number;
  resetAt: number; // Unix timestamp in milliseconds
}

interface RateLimitStorage {
  [email: string]: RateLimitEntry;
}

const RATE_LIMIT_KEY = 'auth_rate_limit';
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Get rate limit storage from localStorage
 */
const getStorage = (): RateLimitStorage => {
  try {
    const stored = localStorage.getItem(RATE_LIMIT_KEY);
    if (!stored) return {};
    
    const parsed = JSON.parse(stored) as RateLimitStorage;
    
    // Clean up expired entries
    const now = Date.now();
    const cleaned: RateLimitStorage = {};
    Object.entries(parsed).forEach(([email, entry]) => {
      if (entry.resetAt > now) {
        cleaned[email] = entry;
      }
    });
    
    // Save cleaned storage if any entries were removed
    if (Object.keys(cleaned).length !== Object.keys(parsed).length) {
      localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(cleaned));
    }
    
    return cleaned;
  } catch (error) {
    console.error('Error reading rate limit storage:', error);
    return {};
  }
};

/**
 * Save rate limit storage to localStorage
 */
const saveStorage = (storage: RateLimitStorage): void => {
  try {
    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(storage));
  } catch (error) {
    console.error('Error saving rate limit storage:', error);
  }
};

/**
 * Check if an authentication attempt is allowed for the given email
 * Returns object with allowed flag and remaining time if blocked
 */
export const checkAuthRateLimit = (email: string): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  message?: string;
} => {
  const normalized = email.toLowerCase().trim();
  const storage = getStorage();
  const now = Date.now();
  
  const entry = storage[normalized];
  
  // No entry or expired - allow and create new entry
  if (!entry || entry.resetAt <= now) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetAt: now + WINDOW_MS
    };
    storage[normalized] = newEntry;
    saveStorage(storage);
    
    return {
      allowed: true,
      remaining: MAX_ATTEMPTS - 1,
      resetAt: newEntry.resetAt
    };
  }
  
  // Entry exists and not expired
  if (entry.count < MAX_ATTEMPTS) {
    // Increment count
    entry.count += 1;
    storage[normalized] = entry;
    saveStorage(storage);
    
    return {
      allowed: true,
      remaining: MAX_ATTEMPTS - entry.count,
      resetAt: entry.resetAt
    };
  }
  
  // Rate limit exceeded
  const remainingMs = entry.resetAt - now;
  const remainingMinutes = Math.ceil(remainingMs / 60000);
  
  return {
    allowed: false,
    remaining: 0,
    resetAt: entry.resetAt,
    message: `Troppi tentativi. Riprova tra ${remainingMinutes} ${remainingMinutes === 1 ? 'minuto' : 'minuti'}.`
  };
};

/**
 * Reset rate limit for a specific email (useful after successful auth)
 */
export const resetAuthRateLimit = (email: string): void => {
  const normalized = email.toLowerCase().trim();
  const storage = getStorage();
  
  if (storage[normalized]) {
    delete storage[normalized];
    saveStorage(storage);
  }
};

/**
 * Get remaining attempts for an email
 */
export const getRemainingAttempts = (email: string): number => {
  const normalized = email.toLowerCase().trim();
  const storage = getStorage();
  const now = Date.now();
  
  const entry = storage[normalized];
  
  if (!entry || entry.resetAt <= now) {
    return MAX_ATTEMPTS;
  }
  
  return Math.max(0, MAX_ATTEMPTS - entry.count);
};

/**
 * Clear all rate limit data (admin/debug use only)
 */
export const clearAllRateLimits = (): void => {
  try {
    localStorage.removeItem(RATE_LIMIT_KEY);
  } catch (error) {
    console.error('Error clearing rate limits:', error);
  }
};
