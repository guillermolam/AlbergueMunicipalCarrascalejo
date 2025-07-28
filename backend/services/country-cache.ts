import Redis from 'ioredis';
import { countryService } from '@services/country';
import { getWithExpiry, setWithExpiry } from './redis-client';

const CACHE_DURATION = 1000 * 60 * 60 * 24; // 24 hours

export class CountryCache {
  private static instance: CountryCache;
  private redis: Redis;

  private constructor(redis: Redis) {
    this.redis = redis;
  }

  public static getInstance(redis: Redis): CountryCache {
    if (!CountryCache.instance) {
      CountryCache.instance = new CountryCache(redis);
    }
    return CountryCache.instance;
  }

  private getCacheKey(countryCode: string): string {
    return `country:${countryCode}`;
  }

  public async getCountryInfo(countryCode: string): Promise<any | null> {
    const cacheKey = this.getCacheKey(countryCode);
    
    // Try to get from cache first
    const cachedData = await getWithExpiry(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    // If not in cache, fetch from RESTCountries API
    try {
      const countryData = await countryService.getCountryInfo(countryCode);
      if (countryData) {
        // Cache the result
        await setWithExpiry(cacheKey, countryData, CACHE_DURATION);
        return countryData;
      }
      return null;
    } catch (error) {
      console.error(`Error fetching country data for ${countryCode}:`, error);
      return null;
    }
  }

  public async clearCache(countryCode: string): Promise<void> {
    const cacheKey = this.getCacheKey(countryCode);
    await deleteKey(cacheKey);
  }

  public async clearAllCache(): Promise<void> {
    const keys = await this.redis.keys('country:*');
    if (keys.length > 0) {
      await this.redis.del(keys);
    }
  }

  public async warmCache(countryCodes: string[]): Promise<void> {
    for (const countryCode of countryCodes) {
      await this.getCountryInfo(countryCode);
    }
  }
}

// Initialize with Redis client
import redis from './redis-client';
export const countryCache = CountryCache.getInstance(redis);
