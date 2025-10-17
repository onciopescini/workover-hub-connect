/**
 * Optimistic Slot Locking System
 * 
 * Prevents race conditions when multiple users try to book the same slot.
 * Uses client-side tracking with timestamps to show "in selection" status.
 */

export interface SlotLockInfo {
  spaceId: string;
  date: string;
  startTime: string;
  endTime: string;
  lockedAt: number;
  userId: string;
  expiresAt: number;
}

const LOCK_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const LOCK_STORAGE_KEY = 'booking_slot_locks';

/**
 * Get all active slot locks from localStorage
 */
function getActiveLocks(): SlotLockInfo[] {
  try {
    const stored = localStorage.getItem(LOCK_STORAGE_KEY);
    if (!stored) return [];
    
    const locks: SlotLockInfo[] = JSON.parse(stored);
    const now = Date.now();
    
    // Filter out expired locks
    const activeLocks = locks.filter(lock => lock.expiresAt > now);
    
    // Update storage if we removed expired locks
    if (activeLocks.length !== locks.length) {
      localStorage.setItem(LOCK_STORAGE_KEY, JSON.stringify(activeLocks));
    }
    
    return activeLocks;
  } catch (error) {
    console.error('Error reading slot locks:', error);
    return [];
  }
}

/**
 * Create a unique key for a slot
 */
function getSlotKey(spaceId: string, date: string, startTime: string, endTime: string): string {
  return `${spaceId}_${date}_${startTime}_${endTime}`;
}

/**
 * Check if a slot is currently locked by another user
 */
export function isSlotLocked(
  spaceId: string, 
  date: string, 
  startTime: string, 
  endTime: string,
  currentUserId: string
): { isLocked: boolean; lockedBy?: string; expiresIn?: number } {
  const locks = getActiveLocks();
  const slotKey = getSlotKey(spaceId, date, startTime, endTime);
  
  const lock = locks.find(l => 
    getSlotKey(l.spaceId, l.date, l.startTime, l.endTime) === slotKey
  );
  
  if (!lock) {
    return { isLocked: false };
  }
  
  // If locked by current user, not considered locked
  if (lock.userId === currentUserId) {
    return { isLocked: false };
  }
  
  const now = Date.now();
  const expiresIn = lock.expiresAt - now;
  
  return {
    isLocked: true,
    lockedBy: lock.userId,
    expiresIn: Math.max(0, Math.ceil(expiresIn / 1000)) // seconds
  };
}

/**
 * Acquire a lock on a slot
 */
export function acquireSlotLock(
  spaceId: string,
  date: string,
  startTime: string,
  endTime: string,
  userId: string
): boolean {
  try {
    const locks = getActiveLocks();
    const now = Date.now();
    const slotKey = getSlotKey(spaceId, date, startTime, endTime);
    
    // Check if already locked by someone else
    const existingLock = locks.find(l => 
      getSlotKey(l.spaceId, l.date, l.startTime, l.endTime) === slotKey &&
      l.userId !== userId
    );
    
    if (existingLock) {
      return false; // Already locked by another user
    }
    
    // Remove any existing lock by this user on this slot
    const filteredLocks = locks.filter(l => 
      !(getSlotKey(l.spaceId, l.date, l.startTime, l.endTime) === slotKey &&
        l.userId === userId)
    );
    
    // Add new lock
    const newLock: SlotLockInfo = {
      spaceId,
      date,
      startTime,
      endTime,
      lockedAt: now,
      userId,
      expiresAt: now + LOCK_DURATION_MS
    };
    
    filteredLocks.push(newLock);
    localStorage.setItem(LOCK_STORAGE_KEY, JSON.stringify(filteredLocks));
    
    return true;
  } catch (error) {
    console.error('Error acquiring slot lock:', error);
    return false;
  }
}

/**
 * Release a lock on a slot
 */
export function releaseSlotLock(
  spaceId: string,
  date: string,
  startTime: string,
  endTime: string,
  userId: string
): void {
  try {
    const locks = getActiveLocks();
    const slotKey = getSlotKey(spaceId, date, startTime, endTime);
    
    const filteredLocks = locks.filter(l => 
      !(getSlotKey(l.spaceId, l.date, l.startTime, l.endTime) === slotKey &&
        l.userId === userId)
    );
    
    localStorage.setItem(LOCK_STORAGE_KEY, JSON.stringify(filteredLocks));
  } catch (error) {
    console.error('Error releasing slot lock:', error);
  }
}

/**
 * Refresh/extend a lock on a slot
 */
export function refreshSlotLock(
  spaceId: string,
  date: string,
  startTime: string,
  endTime: string,
  userId: string
): boolean {
  try {
    const locks = getActiveLocks();
    const now = Date.now();
    const slotKey = getSlotKey(spaceId, date, startTime, endTime);
    
    const lockIndex = locks.findIndex(l => 
      getSlotKey(l.spaceId, l.date, l.startTime, l.endTime) === slotKey &&
      l.userId === userId
    );
    
    if (lockIndex === -1) {
      return false; // Lock not found
    }
    
    // Extend expiration
    const lock = locks[lockIndex];
    if (lock) {
      lock.expiresAt = now + LOCK_DURATION_MS;
      localStorage.setItem(LOCK_STORAGE_KEY, JSON.stringify(locks));
    }
    
    return true;
  } catch (error) {
    console.error('Error refreshing slot lock:', error);
    return false;
  }
}

/**
 * Release all locks held by a user
 */
export function releaseAllUserLocks(userId: string): void {
  try {
    const locks = getActiveLocks();
    const filteredLocks = locks.filter(l => l.userId !== userId);
    localStorage.setItem(LOCK_STORAGE_KEY, JSON.stringify(filteredLocks));
  } catch (error) {
    console.error('Error releasing user locks:', error);
  }
}

/**
 * Cleanup expired locks (utility function)
 */
export function cleanupExpiredLocks(): void {
  getActiveLocks(); // This function already cleans up expired locks
}
