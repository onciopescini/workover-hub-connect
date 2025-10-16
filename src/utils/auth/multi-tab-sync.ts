/**
 * Multi-tab session synchronization using BroadcastChannel
 * Ensures logout and session changes propagate across all open tabs
 */

import { logger } from '@/lib/logger';

const CHANNEL_NAME = 'workover-auth-sync';
const EVENTS = {
  LOGOUT: 'logout',
  SESSION_UPDATE: 'session_update',
  PROFILE_UPDATE: 'profile_update',
} as const;

type AuthSyncEvent = {
  type: typeof EVENTS[keyof typeof EVENTS];
  timestamp: number;
  payload?: any;
};

class MultiTabAuthSync {
  private channel: BroadcastChannel | null = null;
  private listeners: Map<string, Set<(payload?: any) => void>> = new Map();

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.channel = new BroadcastChannel(CHANNEL_NAME);
      this.setupMessageHandler();
      logger.info('Multi-tab auth sync initialized');
    } else {
      // Fallback to localStorage events for older browsers
      this.setupStorageFallback();
      logger.warn('BroadcastChannel not supported, using localStorage fallback');
    }
  }

  private setupMessageHandler() {
    if (!this.channel) return;

    this.channel.onmessage = (event: MessageEvent<AuthSyncEvent>) => {
      logger.debug('Received auth sync message');

      const handlers = this.listeners.get(event.data.type);
      if (handlers) {
        handlers.forEach(handler => handler(event.data.payload));
      }
    };
  }

  private setupStorageFallback() {
    if (typeof window === 'undefined') return;

    window.addEventListener('storage', (event) => {
      if (event.key === CHANNEL_NAME && event.newValue) {
        try {
          const data: AuthSyncEvent = JSON.parse(event.newValue);
          const handlers = this.listeners.get(data.type);
          if (handlers) {
            handlers.forEach(handler => handler(data.payload));
          }
        } catch (err) {
          logger.error('Failed to parse storage event', {}, err as Error);
        }
      }
    });
  }

  /**
   * Broadcast an event to all tabs
   */
  private broadcast(type: AuthSyncEvent['type'], payload?: any) {
    const message: AuthSyncEvent = {
      type,
      timestamp: Date.now(),
      payload,
    };

    if (this.channel) {
      this.channel.postMessage(message);
    } else {
      // Fallback to localStorage
      localStorage.setItem(CHANNEL_NAME, JSON.stringify(message));
      // Clear immediately to allow repeated events
      const clearTimer = window.setTimeout(() => localStorage.removeItem(CHANNEL_NAME), 100);
      window.clearTimeout(clearTimer);
    }

    logger.debug('Broadcasted auth sync event');
  }

  /**
   * Register a listener for a specific event type
   */
  on(eventType: AuthSyncEvent['type'], callback: (payload?: any) => void) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(eventType)?.delete(callback);
    };
  }

  /**
   * Notify all tabs that the user has logged out
   */
  broadcastLogout() {
    this.broadcast(EVENTS.LOGOUT);
  }

  /**
   * Notify all tabs that the session has been updated
   */
  broadcastSessionUpdate(sessionData?: any) {
    this.broadcast(EVENTS.SESSION_UPDATE, sessionData);
  }

  /**
   * Notify all tabs that the profile has been updated
   */
  broadcastProfileUpdate(profileData?: any) {
    this.broadcast(EVENTS.PROFILE_UPDATE, profileData);
  }

  /**
   * Clean up resources
   */
  destroy() {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    this.listeners.clear();
    logger.info('Multi-tab auth sync destroyed');
  }
}

// Singleton instance
let instance: MultiTabAuthSync | null = null;

export const getAuthSyncChannel = (): MultiTabAuthSync => {
  if (!instance) {
    instance = new MultiTabAuthSync();
  }
  return instance;
};

export const AUTH_SYNC_EVENTS = EVENTS;
