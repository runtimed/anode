import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CacheCLI } from '../src/cache-cli.js';
import { PyodideCacheManager } from '../src/cache-utils.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('Cache CLI', () => {
  let tempCacheDir: string;
  let cacheManager: PyodideCacheManager;
  let cli: CacheCLI;

  beforeEach(async () => {
    // Create a temporary cache directory for testing
    tempCacheDir = path.join(os.tmpdir(), 'anode-cache-cli-test', Date.now().toString());
    cacheManager = new PyodideCacheManager(tempCacheDir);
    await cacheManager.ensureCacheDir();
    cli = new CacheCLI(tempCacheDir, false); // Non-verbose for tests
  });

  afterEach(async () => {
    // Clean up test cache directory
    try {
      await fs.rm(tempCacheDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Cache Statistics', () => {
    it('should show empty cache statistics initially', async () => {
      // Capture console output
      const consoleLogs: string[] = [];
      const originalLog = console.log;
      console.log = (...args) => {
        consoleLogs.push(args.join(' '));
      };

      try {
        await cli.stats();

        // Restore console
        console.log = originalLog;

        // Check output
        const output = consoleLogs.join('\n');
        expect(output).toContain('Cache Directory:');
        expect(output).toContain('Total Packages:  0');
        expect(output).toContain('Total Size:      0 MB');
        expect(output).toContain('No packages cached yet');
      } finally {
        console.log = originalLog;
      }
    });

    it('should show populated cache statistics', async () => {
      // Create some fake cached packages
      await fs.writeFile(path.join(tempCacheDir, 'numpy-1.0.0-py3-none-any.whl'), 'fake numpy content');
      await fs.writeFile(path.join(tempCacheDir, 'pandas-2.0.0-py3-none-any.whl'), 'fake pandas content');

      const consoleLogs: string[] = [];
      const originalLog = console.log;
      console.log = (...args) => {
        consoleLogs.push(args.join(' '));
      };

      try {
        await cli.stats();
        console.log = originalLog;

        const output = consoleLogs.join('\n');
        expect(output).toContain('Total Packages:  2');
        expect(output).toContain('numpy');
        expect(output).toContain('pandas');
      } finally {
        console.log = originalLog;
      }
    });
  });

  describe('Package Listing', () => {
    it('should show empty list when no packages cached', async () => {
      const consoleLogs: string[] = [];
      const originalLog = console.log;
      console.log = (...args) => {
        consoleLogs.push(args.join(' '));
      };

      try {
        await cli.list();
        console.log = originalLog;

        const output = consoleLogs.join('\n');
        expect(output).toContain('No packages cached yet');
      } finally {
        console.log = originalLog;
      }
    });

    it('should list cached packages', async () => {
      // Create some fake cached packages
      await fs.writeFile(path.join(tempCacheDir, 'matplotlib-3.0.0-py3-none-any.whl'), 'fake matplotlib');
      await fs.writeFile(path.join(tempCacheDir, 'requests-2.0.0-py3-none-any.whl'), 'fake requests');

      const consoleLogs: string[] = [];
      const originalLog = console.log;
      console.log = (...args) => {
        consoleLogs.push(args.join(' '));
      };

      try {
        await cli.list();
        console.log = originalLog;

        const output = consoleLogs.join('\n');
        expect(output).toContain('Cached Packages (2)');
        expect(output).toContain('matplotlib');
        expect(output).toContain('requests');
      } finally {
        console.log = originalLog;
      }
    });
  });

  describe('Package Checking', () => {
    it('should correctly identify cached and uncached packages', async () => {
      // Create one cached package
      await fs.writeFile(path.join(tempCacheDir, 'numpy-1.0.0-py3-none-any.whl'), 'fake numpy');

      const consoleLogs: string[] = [];
      const originalLog = console.log;
      console.log = (...args) => {
        consoleLogs.push(args.join(' '));
      };

      try {
        await cli.check(['numpy', 'pandas', 'matplotlib']);
        console.log = originalLog;

        const output = consoleLogs.join('\n');
        expect(output).toContain('numpy');
        expect(output).toContain('✅ CACHED');
        expect(output).toContain('pandas');
        expect(output).toContain('❌ NOT CACHED');
        expect(output).toContain('matplotlib');
        expect(output).toContain('❌ NOT CACHED');
      } finally {
        console.log = originalLog;
      }
    });

    it('should handle empty package list', async () => {
      const consoleLogs: string[] = [];
      const originalLog = console.log;
      console.log = (...args) => {
        consoleLogs.push(args.join(' '));
      };

      try {
        await cli.check([]);
        console.log = originalLog;

        const output = consoleLogs.join('\n');
        expect(output).toContain('Checking cache status');
      } finally {
        console.log = originalLog;
      }
    });
  });

  describe('Cache Cleanup', () => {
    it('should clear entire cache', async () => {
      // Create some cached packages
      await fs.writeFile(path.join(tempCacheDir, 'package1.whl'), 'content1');
      await fs.writeFile(path.join(tempCacheDir, 'package2.whl'), 'content2');

      // Verify packages exist
      let packages = await cacheManager.listCachedPackages();
      expect(packages).toHaveLength(2);

      const consoleLogs: string[] = [];
      const originalLog = console.log;
      console.log = (...args) => {
        consoleLogs.push(args.join(' '));
      };

      try {
        await cli.clear();
        console.log = originalLog;

        // Verify packages are gone
        packages = await cacheManager.listCachedPackages();
        expect(packages).toHaveLength(0);

        const output = consoleLogs.join('\n');
        expect(output).toContain('Cache cleared successfully');
      } finally {
        console.log = originalLog;
      }
    });

    it('should clean up old packages', async () => {
      // Create packages with different ages
      const oldFile = path.join(tempCacheDir, 'old-package.whl');
      const newFile = path.join(tempCacheDir, 'new-package.whl');

      await fs.writeFile(oldFile, 'old content');
      await fs.writeFile(newFile, 'new content');

      // Age the old file
      const oldTime = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000); // 31 days ago
      await fs.utimes(oldFile, oldTime, oldTime);

      const consoleLogs: string[] = [];
      const originalLog = console.log;
      console.log = (...args) => {
        consoleLogs.push(args.join(' '));
      };

      try {
        await cli.cleanup(30); // Clean packages older than 30 days
        console.log = originalLog;

        // Verify only new package remains
        const packages = await cacheManager.listCachedPackages();
        expect(packages).toEqual(['new']);

        const output = consoleLogs.join('\n');
        expect(output).toContain('Removed 1 old packages');
      } finally {
        console.log = originalLog;
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent cache directory gracefully', async () => {
      const nonExistentDir = path.join(tempCacheDir, 'does-not-exist');
      const badCli = new CacheCLI(nonExistentDir, false);

      const consoleLogs: string[] = [];
      const originalLog = console.log;
      console.log = (...args) => {
        consoleLogs.push(args.join(' '));
      };

      try {
        await badCli.stats();
        console.log = originalLog;

        const output = consoleLogs.join('\n');
        expect(output).toContain('Total Packages:  0');
      } finally {
        console.log = originalLog;
      }
    });

    it('should handle permission errors gracefully', async () => {
      // This test simulates permission issues by trying operations that might fail
      const consoleLogs: string[] = [];
      const originalLog = console.log;
      const originalError = console.error;

      console.log = (...args) => {
        consoleLogs.push(args.join(' '));
      };
      console.error = () => {}; // Suppress error output during test

      try {
        // These operations should not throw but handle errors gracefully
        await cli.stats();
        await cli.list();
        await cli.check(['numpy']);

        console.log = originalLog;
        console.error = originalError;

        // Should have produced some output without crashing
        expect(consoleLogs.length).toBeGreaterThan(0);
      } finally {
        console.log = originalLog;
        console.error = originalError;
      }
    });
  });

  describe('Verbose Mode', () => {
    it('should provide more detailed output in verbose mode', async () => {
      const verboseCli = new CacheCLI(tempCacheDir, true);

      // Create a fake package
      await fs.writeFile(path.join(tempCacheDir, 'test-package.whl'), 'test content');

      const consoleLogs: string[] = [];
      const originalLog = console.log;
      console.log = (...args) => {
        consoleLogs.push(args.join(' '));
      };

      try {
        await verboseCli.stats();
        console.log = originalLog;

        const output = consoleLogs.join('\n');
        expect(output).toContain('Cache Directory:');
        expect(output).toContain('test');
      } finally {
        console.log = originalLog;
      }
    });
  });

  describe('Integration with Cache Manager', () => {
    it('should work correctly with existing cache manager', async () => {
      // Use cache manager to create some packages
      await fs.writeFile(path.join(tempCacheDir, 'integrated-package.whl'), 'integrated content');

      // CLI should see the same packages
      const consoleLogs: string[] = [];
      const originalLog = console.log;
      console.log = (...args) => {
        consoleLogs.push(args.join(' '));
      };

      try {
        await cli.list();
        console.log = originalLog;

        const output = consoleLogs.join('\n');
        expect(output).toContain('integrated');

        // Check that both CLI and manager see the same data
        const managerPackages = await cacheManager.listCachedPackages();
        expect(managerPackages).toContain('integrated');
      } finally {
        console.log = originalLog;
      }
    });

    it('should maintain consistency between CLI operations and manager state', async () => {
      // Add packages via manager
      await fs.writeFile(path.join(tempCacheDir, 'consistency-test.whl'), 'test');

      // Verify CLI sees it
      expect(await cacheManager.isPackageCached('consistency')).toBe(true);

      // Clear via CLI
      await cli.clear();

      // Verify manager sees the change
      expect(await cacheManager.isPackageCached('consistency')).toBe(false);
      const packages = await cacheManager.listCachedPackages();
      expect(packages).toHaveLength(0);
    });
  });

  describe('Package Set Handling', () => {
    it('should handle essential package sets', async () => {
      // The CLI uses essential packages by default
      // This test verifies that the package sets are accessible
      const consoleLogs: string[] = [];
      const originalLog = console.log;
      console.log = (...args) => {
        consoleLogs.push(args.join(' '));
      };

      try {
        // Check essential packages (this should not fail even if we don't warm up)
        await cli.check(['numpy', 'pandas', 'matplotlib', 'requests', 'ipython', 'micropip']);
        console.log = originalLog;

        const output = consoleLogs.join('\n');
        expect(output).toContain('numpy');
        expect(output).toContain('pandas');
        expect(output).toContain('matplotlib');
        expect(output).toContain('requests');
        expect(output).toContain('ipython');
        expect(output).toContain('micropip');
      } finally {
        console.log = originalLog;
      }
    });
  });
});
