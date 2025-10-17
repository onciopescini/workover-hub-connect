import { useEffect, useCallback, useState } from 'react';
import { useAuth } from '@/hooks/auth/useAuth';
import {
  acquireSlotLock,
  releaseSlotLock,
  refreshSlotLock,
  isSlotLocked,
  releaseAllUserLocks
} from '@/lib/optimistic-slot-lock';

export interface UseOptimisticSlotLockParams {
  spaceId: string;
  date: string;
  startTime: string;
  endTime: string;
  enabled?: boolean;
}

export interface UseOptimisticSlotLockResult {
  isLocked: boolean;
  lockedBy: string | undefined;
  expiresIn: number | undefined;
  acquireLock: () => boolean;
  releaseLock: () => void;
  refreshLock: () => boolean;
}

const REFRESH_INTERVAL_MS = 30 * 1000; // Refresh every 30 seconds
const CHECK_INTERVAL_MS = 2 * 1000; // Check for changes every 2 seconds

/**
 * Hook to manage optimistic slot locks
 * 
 * Automatically acquires, refreshes, and releases locks based on component lifecycle.
 */
export function useOptimisticSlotLock({
  spaceId,
  date,
  startTime,
  endTime,
  enabled = true
}: UseOptimisticSlotLockParams): UseOptimisticSlotLockResult {
  const auth = useAuth();
  const userId = auth.authState.user?.id || 'anonymous';
  
  const [lockState, setLockState] = useState<{
    isLocked: boolean;
    lockedBy?: string;
    expiresIn?: number;
  }>({ isLocked: false });

  // Check lock status
  const checkLockStatus = useCallback(() => {
    const status = isSlotLocked(spaceId, date, startTime, endTime, userId);
    setLockState(status);
    return status;
  }, [spaceId, date, startTime, endTime, userId]);

  // Acquire lock
  const acquireLock = useCallback(() => {
    if (!enabled) return false;
    const success = acquireSlotLock(spaceId, date, startTime, endTime, userId);
    if (success) {
      checkLockStatus();
    }
    return success;
  }, [spaceId, date, startTime, endTime, userId, enabled, checkLockStatus]);

  // Release lock
  const releaseLock = useCallback(() => {
    releaseSlotLock(spaceId, date, startTime, endTime, userId);
    checkLockStatus();
  }, [spaceId, date, startTime, endTime, userId, checkLockStatus]);

  // Refresh lock
  const refreshLock = useCallback(() => {
    if (!enabled) return false;
    const success = refreshSlotLock(spaceId, date, startTime, endTime, userId);
    if (success) {
      checkLockStatus();
    }
    return success;
  }, [spaceId, date, startTime, endTime, userId, enabled, checkLockStatus]);

  // Periodic lock status check
  useEffect(() => {
    if (!enabled) return;

    checkLockStatus();
    
    const interval = setInterval(() => {
      checkLockStatus();
    }, CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [enabled, checkLockStatus]);

  // Auto-refresh active lock
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      // Only refresh if we're not seeing it as locked by someone else
      if (!lockState.isLocked) {
        refreshLock();
      }
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [enabled, lockState.isLocked, refreshLock]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      releaseLock();
    };
  }, [releaseLock]);

  return {
    isLocked: lockState.isLocked,
    lockedBy: lockState.lockedBy,
    expiresIn: lockState.expiresIn,
    acquireLock,
    releaseLock,
    refreshLock
  };
}

/**
 * Hook to release all locks when user navigates away
 */
export function useCleanupLocksOnUnmount() {
  const auth = useAuth();
  const userId = auth.authState.user?.id || 'anonymous';

  useEffect(() => {
    return () => {
      releaseAllUserLocks(userId);
    };
  }, [userId]);
}
