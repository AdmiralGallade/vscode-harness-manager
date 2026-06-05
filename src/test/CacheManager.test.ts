import { CacheManager } from '../services/CacheManager';

describe('CacheManager', () => {
  let cacheManager: CacheManager;
  let mockExtensionContext: any;

  beforeEach(() => {
    // Create mock extension context
    mockExtensionContext = {
      globalState: {
        get: jest.fn(),
        update: jest.fn().mockResolvedValue(undefined),
        keys: jest.fn().mockReturnValue([]),
      },
    };

    cacheManager = new CacheManager(mockExtensionContext);
  });

  describe('setCacheData and getCachedData', () => {
    it('should set and retrieve cache data', async () => {
      const testData = { test: 'data', value: 123 };
      const key = 'test-key';

      // Mock the get function to return our cached data
      mockExtensionContext.globalState.get.mockImplementation((k: string) => {
        if (k === `harnessManager.cache.${key}`) {
          return JSON.stringify(testData);
        }
        if (k === `harnessManager.metadata.${key}`) {
          return {
            timestamp: Date.now(),
            expiresAt: Date.now() + 86400000,
            source: 'github',
            version: '1.0',
          };
        }
        return undefined;
      });

      await cacheManager.setCacheData(key, testData);

      const result = cacheManager.getCachedData(key);
      expect(result).toEqual(testData);
    });

    it('should return null for expired cache', async () => {
      const testData = { test: 'data' };
      const key = 'test-key';

      // Mock expired cache
      mockExtensionContext.globalState.get.mockImplementation((k: string) => {
        if (k === `harnessManager.cache.${key}`) {
          return JSON.stringify(testData);
        }
        if (k === `harnessManager.metadata.${key}`) {
          return {
            timestamp: Date.now() - 100000,
            expiresAt: Date.now() - 10000, // Already expired
            source: 'github',
            version: '1.0',
          };
        }
        return undefined;
      });

      const result = cacheManager.getCachedData(key);
      expect(result).toBeNull();
    });
  });

  describe('clearCache', () => {
    it('should clear specific cache entry', async () => {
      const key = 'test-key';
      await cacheManager.clearCache(key);

      expect(mockExtensionContext.globalState.update).toHaveBeenCalledWith(
        `harnessManager.cache.${key}`,
        undefined
      );
      expect(mockExtensionContext.globalState.update).toHaveBeenCalledWith(
        `harnessManager.metadata.${key}`,
        undefined
      );
    });
  });

  describe('isCacheValid', () => {
    it('should return true for valid cache', () => {
      mockExtensionContext.globalState.get.mockImplementation((k: string) => {
        if (k.includes('metadata')) {
          return {
            timestamp: Date.now(),
            expiresAt: Date.now() + 86400000,
            source: 'github',
            version: '1.0',
          };
        }
        return undefined;
      });

      const result = cacheManager.isCacheValid('test-key');
      expect(result).toBe(true);
    });

    it('should return false for missing metadata', () => {
      mockExtensionContext.globalState.get.mockReturnValue(undefined);
      const result = cacheManager.isCacheValid('test-key');
      expect(result).toBe(false);
    });
  });

  describe('getCacheAge', () => {
    it('should return cache age in milliseconds', () => {
      const now = Date.now();
      mockExtensionContext.globalState.get.mockImplementation((k: string) => {
        if (k.includes('metadata')) {
          return {
            timestamp: now - 5000, // 5 seconds ago
            expiresAt: now + 86400000,
            source: 'github',
            version: '1.0',
          };
        }
        return undefined;
      });

      const age = cacheManager.getCacheAge('test-key');
      expect(age).toBeGreaterThan(4999);
      expect(age).toBeLessThan(6000);
    });

    it('should return null for missing metadata', () => {
      mockExtensionContext.globalState.get.mockReturnValue(undefined);
      const age = cacheManager.getCacheAge('test-key');
      expect(age).toBeNull();
    });
  });
});
