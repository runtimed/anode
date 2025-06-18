import { describe, it, expect } from 'vitest';
import { getEssentialPackages, getCacheConfig, getCacheDir } from '../src/cache-utils.js';
import * as path from 'path';
import * as os from 'os';

describe('Cache Utils', () => {
  describe('getEssentialPackages', () => {
    it('should return array of essential packages', () => {
      const packages = getEssentialPackages();

      expect(packages).toBeInstanceOf(Array);
      expect(packages.length).toBeGreaterThan(0);

      // Check that core packages are included
      expect(packages).toContain('ipython');
      expect(packages).toContain('matplotlib');
      expect(packages).toContain('numpy');
      expect(packages).toContain('pandas');
      expect(packages).toContain('requests');
      expect(packages).toContain('micropip');
    });

    it('should include demo packages', () => {
      const packages = getEssentialPackages();

      // Check that demo-ready packages are included
      expect(packages).toContain('polars');
      expect(packages).toContain('duckdb');
      expect(packages).toContain('pyarrow');
      expect(packages).toContain('scikit-learn');
      expect(packages).toContain('altair');
      expect(packages).toContain('geopandas');
      expect(packages).toContain('bokeh');
    });

    it('should not contain plotly (not available in Pyodide)', () => {
      const packages = getEssentialPackages();
      expect(packages).not.toContain('plotly');
    });

    it('should not have duplicate packages', () => {
      const packages = getEssentialPackages();
      const uniquePackages = [...new Set(packages)];
      expect(packages.length).toBe(uniquePackages.length);
    });

    it('should return consistent results across calls', () => {
      const packages1 = getEssentialPackages();
      const packages2 = getEssentialPackages();
      expect(packages1).toEqual(packages2);
    });
  });

  describe('getCacheDir', () => {
    it('should return cache directory path', () => {
      const cacheDir = getCacheDir();

      expect(typeof cacheDir).toBe('string');
      expect(cacheDir.length).toBeGreaterThan(0);
      expect(cacheDir).toContain('.anode');
      expect(cacheDir).toContain('pyodide-cache');
    });

    it('should be in user home directory', () => {
      const cacheDir = getCacheDir();
      const homeDir = os.homedir();

      expect(cacheDir.startsWith(homeDir)).toBe(true);
    });

    it('should return consistent results', () => {
      const dir1 = getCacheDir();
      const dir2 = getCacheDir();
      expect(dir1).toBe(dir2);
    });
  });

  describe('getCacheConfig', () => {
    it('should return cache configuration object', () => {
      const config = getCacheConfig();

      expect(config).toBeInstanceOf(Object);
      expect(config).toHaveProperty('packageCacheDir');
      expect(typeof config.packageCacheDir).toBe('string');
    });

    it('should use getCacheDir for packageCacheDir', () => {
      const config = getCacheConfig();
      const expectedDir = getCacheDir();

      expect(config.packageCacheDir).toBe(expectedDir);
    });

    it('should be compatible with Pyodide loadPyodide options', () => {
      const config = getCacheConfig();

      // Should have the expected shape for Pyodide configuration
      expect(config.packageCacheDir).toBeDefined();
      expect(path.isAbsolute(config.packageCacheDir)).toBe(true);
    });
  });

  describe('Integration', () => {
    it('should work together for Pyodide setup', () => {
      const packages = getEssentialPackages();
      const config = getCacheConfig();

      // Should be able to use both together
      expect(packages.length).toBeGreaterThan(0);
      expect(config.packageCacheDir).toBeDefined();

      // Packages should be valid strings
      packages.forEach(pkg => {
        expect(typeof pkg).toBe('string');
        expect(pkg.length).toBeGreaterThan(0);
        expect(pkg).not.toContain(' '); // No spaces in package names
      });
    });
  });
});
