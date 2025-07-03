import type { Profile } from '@/types/auth';

export class ProfileCacheManager {
  private static instance: ProfileCacheManager;
  private cache = new Map<string, Profile>();
  private lastFetchTimes = new Map<string, number>();
  private readonly CACHE_DURATION = 5000; // 5 seconds

  public static getInstance(): ProfileCacheManager {
    if (!ProfileCacheManager.instance) {
      ProfileCacheManager.instance = new ProfileCacheManager();
    }
    return ProfileCacheManager.instance;
  }

  public get(userId: string): Profile | null {
    return this.cache.get(userId) || null;
  }

  public set(userId: string, profile: Profile): void {
    this.cache.set(userId, profile);
    this.lastFetchTimes.set(userId, Date.now());
  }

  public shouldFetch(userId: string): boolean {
    const lastFetch = this.lastFetchTimes.get(userId) || 0;
    return Date.now() - lastFetch > this.CACHE_DURATION;
  }

  public invalidate(userId: string): void {
    this.cache.delete(userId);
    this.lastFetchTimes.delete(userId);
  }

  public clear(): void {
    this.cache.clear();
    this.lastFetchTimes.clear();
  }

  public has(userId: string): boolean {
    return this.cache.has(userId);
  }
}