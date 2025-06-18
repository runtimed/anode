import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PyodideCacheManager, getCacheConfig, getEssentialPackages, getCommonPackages } from '../src/cache-utils.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('PyodideCacheManager', () => {
  let tempCacheDir: string;
  let cacheManager: PyodideCacheManager;

  beforeEach(async () => {
    // Create a temporary cache directory for testing
    tempCacheDir = path.join(os.tmpdir(), 'anode-cache-test', Date.now().toString());
    cacheManager = new PyodideCacheManager(tempCacheDir);
    await cacheManager.ensureCacheDir();
  });

  afterEach(async () => {
    // Clean up test cache directory
    try {
      await fs.rm(tempCacheDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Cache Directory Management', () => {
    it('should create cache directory', async () => {
      const cacheDir = cacheManager.getCacheDir();
      expect(cacheDir).toBe(tempCacheDir);

      // Check that directory was created
      const stats = await fs.stat(cacheDir);
      expect(stats.isDirectory()).toBe(true);
    });

    it('should handle existing cache directory', async () => {
      // Call ensureCacheDir multiple times
      await cacheManager.ensureCacheDir();
      await cacheManager.ensureCacheDir();

      const cacheDir = cacheManager.getCacheDir();
      const stats = await fs.stat(cacheDir);
      expect(stats.isDirectory()).toBe(true);
    });
  });

  describe('Package Cache Operations', () => {
    it('should correctly detect uncached packages', async () => {
      const isCached = await cacheManager.isPackageCached('nonexistent-package');
      expect(isCached).toBe(false);
    });

    it('should list empty cache initially', async () => {
      const packages = await cacheManager.listCachedPackages();
      expect(packages).toEqual([]);
    });

    it('should simulate cached packages', async () => {
      // Create fake package files
      const fakePackages = ['numpy.whl', 'pandas.whl', 'requests.zip'];

      for (const pkg of fakePackages) {
        const filePath = path.join(tempCacheDir, pkg);
        await fs.writeFile(filePath, 'fake package content');
      }

      const packages = await cacheManager.listCachedPackages();
      expect(packages.sort()).toEqual(['numpy', 'pandas', 'requests']);

      // Test individual package detection
      expect(await cacheManager.isPackageCached('numpy')).toBe(true);
      expect(await cacheManager.isPackageCached('pandas')).toBe(true);
      expect(await cacheManager.isPackageCached('missing')).toBe(false);
    });
  });

  describe('Cache Statistics', () => {
    it('should calculate cache size correctly', async () => {
      const initialSize = await cacheManager.getCacheSize();
      expect(initialSize).toBe(0);

      // Create a file with known size
      const testContent = 'x'.repeat(1024 * 1024); // 1MB
      await fs.writeFile(path.join(tempCacheDir, 'test.whl'), testContent);

      const newSize = await cacheManager.getCacheSize();
      expect(newSize).toBe(1);
    });

    it('should provide comprehensive cache stats', async () => {
      // Create some fake packages with larger content to ensure meaningful size in MB
      const numpyContent = 'x'.repeat(1024 * 512); // 512KB
      const pandasContent = 'y'.repeat(1024 * 256); // 256KB

      const numpyPath = path.join(tempCacheDir, 'numpy.whl');
      const pandasPath = path.join(tempCacheDir, 'pandas.whl');

      await fs.writeFile(numpyPath, numpyContent);
      await fs.writeFile(pandasPath, pandasContent);

      const stats = await cacheManager.getCacheStats();

      expect(stats.cacheDir).toBe(tempCacheDir);
      expect(stats.packageCount).toBe(2);
      expect(stats.packages.sort()).toEqual(['numpy', 'pandas']);
      expect(stats.totalSizeMB).toBeCloseTo(0.75, 1); // ~768KB = 0.75MB
    });
  });

  describe('Cache Cleanup', () => {
    it('should clear entire cache', async () => {
      // Create some files
      await fs.writeFile(path.join(tempCacheDir, 'package1.whl'), 'content');
      await fs.writeFile(path.join(tempCacheDir, 'package2.whl'), 'content');

      let packages = await cacheManager.listCachedPackages();
      expect(packages).toHaveLength(2);

      await cacheManager.clearCache();

      packages = await cacheManager.listCachedPackages();
      expect(packages).toHaveLength(0);
    });

    it('should clear old cache files based on age', async () => {
      const oldFile = path.join(tempCacheDir, 'old.whl');
      const newFile = path.join(tempCacheDir, 'new.whl');

      // Create files
      await fs.writeFile(oldFile, 'old content');
      await fs.writeFile(newFile, 'new content');

      // Artificially age the old file
      const oldTime = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000); // 31 days ago
      await fs.utimes(oldFile, oldTime, oldTime);

      const removedCount = await cacheManager.clearOldCache(30);
      expect(removedCount).toBe(1);

      // Check that only the new file remains
      const packages = await cacheManager.listCachedPackages();
      expect(packages).toEqual(['new']);
    });
  });

  describe('Cache Locking', () => {
    it('should handle cache locks correctly', async () => {
      expect(await cacheManager.isLocked()).toBe(false);

      const acquired = await cacheManager.acquireLock();
      expect(acquired).toBe(true);
      expect(await cacheManager.isLocked()).toBe(true);

      // Try to acquire again
      const acquiredAgain = await cacheManager.acquireLock();
      expect(acquiredAgain).toBe(false);

      await cacheManager.releaseLock();
      expect(await cacheManager.isLocked()).toBe(false);
    });
  });
});

describe('Cache Configuration', () => {
  it('should provide cache config for Pyodide', () => {
    const config = getCacheConfig();
    expect(config).toHaveProperty('packageCacheDir');
    expect(typeof config.packageCacheDir).toBe('string');
    expect(config.packageCacheDir.length).toBeGreaterThan(0);
  });

  it('should support custom cache directory', () => {
    const customDir = '/custom/cache/path';
    const config = getCacheConfig(customDir);
    expect(config.packageCacheDir).toBe(customDir);
  });
});

describe('Package Lists', () => {
  it('should provide essential packages list', () => {
    const packages = getEssentialPackages();
    expect(packages).toBeInstanceOf(Array);
    expect(packages.length).toBeGreaterThan(0);
    expect(packages).toContain('numpy');
    expect(packages).toContain('pandas');
    expect(packages).toContain('requests');
    expect(packages).toContain('matplotlib');
    expect(packages).toContain('ipython');
    expect(packages).toContain('micropip');
  });

  it('should provide common packages list', () => {
    const essential = getEssentialPackages();
    const common = getCommonPackages();

    expect(common).toBeInstanceOf(Array);
    expect(common.length).toBeGreaterThan(essential.length);

    // Common should include all essential packages
    for (const pkg of essential) {
      expect(common).toContain(pkg);
    }

    // Common should include additional packages
    expect(common).toContain('scipy');
    expect(common).toContain('sympy');
  });

  it('should not have duplicate packages in lists', () => {
    const essential = getEssentialPackages();
    const common = getCommonPackages();

    expect(new Set(essential).size).toBe(essential.length);
    expect(new Set(common).size).toBe(common.length);
  });
});

describe('Integration', () => {
  it('should work with default cache manager', async () => {
    // Test that default cache manager can be imported and used
    const { defaultCacheManager } = await import('../src/cache-utils.js');

    expect(defaultCacheManager).toBeDefined();
    expect(typeof defaultCacheManager.getCacheDir).toBe('function');
    expect(typeof defaultCacheManager.getCacheDir()).toBe('string');
  });

  it('should handle errors gracefully', async () => {
    // Create cache manager with invalid path
    const invalidCacheManager = new PyodideCacheManager('/invalid/path/that/cannot/be/created');

    // These should not throw but return empty/false results
    expect(await invalidCacheManager.listCachedPackages()).toEqual([]);
    expect(await invalidCacheManager.getCacheSize()).toBe(0);
    expect(await invalidCacheManager.isPackageCached('any')).toBe(false);

    const stats = await invalidCacheManager.getCacheStats();
    expect(stats.packageCount).toBe(0);
    expect(stats.totalSizeMB).toBe(0);
    expect(stats.packages).toEqual([]);
  });
});
