import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

export interface CacheConfig {
  cacheDir: string;
  packages: string[];
  maxCacheSize?: number; // MB
  maxCacheAge?: number; // days
}

export class PyodideCacheManager {
  private cacheDir: string;
  private lockFile: string;

  constructor(cacheDir?: string) {
    this.cacheDir = cacheDir || path.join(os.homedir(), '.anode', 'pyodide-cache');
    this.lockFile = path.join(this.cacheDir, '.cache-lock');
  }

  /**
   * Ensure cache directory exists
   */
  async ensureCacheDir(): Promise<void> {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
    } catch (error) {
      console.warn(`Failed to create cache directory ${this.cacheDir}:`, error);
    }
  }

  /**
   * Get cache directory path
   */
  getCacheDir(): string {
    return this.cacheDir;
  }

  /**
   * Check if package is cached
   */
  async isPackageCached(packageName: string): Promise<boolean> {
    try {
      const files = await fs.readdir(this.cacheDir);
      // Check if any cached file starts with the package name followed by a hyphen or dot
      // This handles versioned filenames like "numpy-2.0.2-cp312-cp312-pyodide_2024_0_wasm32.whl"
      return files.some(file => {
        const nameWithoutExt = path.basename(file, path.extname(file));
        return nameWithoutExt.startsWith(`${packageName}-`) ||
               nameWithoutExt === packageName ||
               nameWithoutExt.startsWith(`${packageName}_`);
      });
    } catch {
      return false;
    }
  }

  /**
   * List all cached packages
   */
  async listCachedPackages(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.cacheDir);
      return files
        .filter(file => file.endsWith('.whl') || file.endsWith('.zip'))
        .map(file => {
          const nameWithoutExt = path.basename(file, path.extname(file));
          // Extract base package name by taking everything before the first hyphen
          // e.g., "numpy-2.0.2-cp312..." -> "numpy"
          const packageName = nameWithoutExt.split('-')[0];
          return packageName;
        })
        // Remove duplicates since multiple versions might exist
        .filter((name, index, array) => array.indexOf(name) === index)
        .sort();
    } catch {
      return [];
    }
  }

  /**
   * Get cache size in MB - optimized with parallel file stats
   */
  async getCacheSize(): Promise<number> {
    try {
      const files = await fs.readdir(this.cacheDir);

      // Get file stats in parallel for better performance
      const statResults = await Promise.allSettled(
        files.map(file =>
          fs.stat(path.join(this.cacheDir, file))
        )
      );

      let totalSize = 0;
      statResults.forEach(result => {
        if (result.status === 'fulfilled') {
          totalSize += result.value.size;
        }
      });

      // Convert to MB with better precision for small files
      const sizeMB = totalSize / (1024 * 1024);
      return Math.round(sizeMB * 100) / 100; // Round to 2 decimals, but keep precision for small files
    } catch {
      return 0;
    }
  }

  /**
   * Clear old cache files based on age
   */
  async clearOldCache(maxAgeInDays: number = 30): Promise<number> {
    try {
      const files = await fs.readdir(this.cacheDir);
      const now = Date.now();
      const maxAge = maxAgeInDays * 24 * 60 * 60 * 1000; // Convert to milliseconds
      let removedCount = 0;

      for (const file of files) {
        if (file === '.cache-lock') continue; // Skip lock file

        const filePath = path.join(this.cacheDir, file);
        const stats = await fs.stat(filePath);
        const fileAge = now - stats.mtime.getTime();

        if (fileAge > maxAge) {
          await fs.unlink(filePath);
          removedCount++;
          console.log(`Removed old cached file: ${file}`);
        }
      }

      return removedCount;
    } catch (error) {
      console.warn("Failed to clear old cache:", error);
      return 0;
    }
  }

  /**
   * Clear entire cache
   */
  async clearCache(): Promise<void> {
    try {
      const files = await fs.readdir(this.cacheDir);

      for (const file of files) {
        if (file === '.cache-lock') continue; // Skip lock file

        const filePath = path.join(this.cacheDir, file);
        await fs.unlink(filePath);
      }

      console.log(`Cache cleared: ${this.cacheDir}`);
    } catch (error) {
      console.warn("Failed to clear cache:", error);
    }
  }

  /**
   * Get cache statistics - optimized with parallel operations
   */
  async getCacheStats(): Promise<{
    cacheDir: string;
    packageCount: number;
    totalSizeMB: number;
    packages: string[];
  }> {
    // Run package listing and size calculation in parallel
    const [packages, totalSizeMB] = await Promise.all([
      this.listCachedPackages(),
      this.getCacheSize()
    ]);

    return {
      cacheDir: this.cacheDir,
      packageCount: packages.length,
      totalSizeMB,
      packages,
    };
  }

  /**
   * Warm up cache by pre-loading common packages
   * This is useful for CI/CD or development environment setup
   */
  async warmUpCache(packages: string[] = getCommonPackages()): Promise<void> {
    console.log(`🔥 Warming up package cache with ${packages.length} packages...`);

    // Ensure cache directory exists and get current stats in parallel
    const [_, currentStats] = await Promise.all([
      this.ensureCacheDir(),
      this.getCacheStats()
    ]);

    console.log(`📁 Cache directory ready: ${this.cacheDir}`);
    console.log(`📊 Current cache: ${currentStats.packageCount} packages, ${currentStats.totalSizeMB}MB`);
    console.log(`📦 Packages to cache: ${packages.join(', ')}`);
    console.log(`💡 Packages will be cached on first use by Pyodide`);
  }

  /**
   * Create a cache lock to prevent concurrent access issues
   */
  async acquireLock(): Promise<boolean> {
    try {
      await fs.writeFile(this.lockFile, Date.now().toString(), { flag: 'wx' });
      return true;
    } catch {
      return false; // Lock already exists
    }
  }

  /**
   * Release cache lock
   */
  async releaseLock(): Promise<void> {
    try {
      await fs.unlink(this.lockFile);
    } catch {
      // Lock file might not exist, ignore
    }
  }

  /**
   * Check if cache is locked
   */
  async isLocked(): Promise<boolean> {
    try {
      await fs.access(this.lockFile);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Default cache manager instance
 */
export const defaultCacheManager = new PyodideCacheManager();

// Pre-warm cache setup during module load for faster subsequent calls
const cachePreWarmPromise = defaultCacheManager.ensureCacheDir()
  .then(() => defaultCacheManager.getCacheStats())
  .then(stats => {
    console.log(`📦 Cache pre-warmed: ${stats.packageCount} packages, ${stats.totalSizeMB}MB ready`);
    return stats;
  })
  .catch(error => {
    console.warn("⚠️ Cache pre-warm failed:", error);
    return null;
  });

/**
 * Get the pre-warmed cache stats (non-blocking)
 */
export async function getPreWarmedCacheStats() {
  return await cachePreWarmPromise;
}

/**
 * Get cache configuration for Pyodide loadPyodide() options
 * Uses pre-warmed cache when available
 */
export function getCacheConfig(customCacheDir?: string): { packageCacheDir: string } {
  const cacheManager = customCacheDir
    ? new PyodideCacheManager(customCacheDir)
    : defaultCacheManager;

  return {
    packageCacheDir: cacheManager.getCacheDir(),
  };
}

/**
 * Get cache configuration with pre-warmed setup
 */
export async function getCacheConfigWithPreWarm(customCacheDir?: string): Promise<{ packageCacheDir: string; stats: any }> {
  const cacheManager = customCacheDir
    ? new PyodideCacheManager(customCacheDir)
    : defaultCacheManager;

  const [stats] = await Promise.all([
    customCacheDir ? cacheManager.getCacheStats() : getPreWarmedCacheStats(),
    customCacheDir ? cacheManager.ensureCacheDir() : Promise.resolve()
  ]);

  return {
    packageCacheDir: cacheManager.getCacheDir(),
    stats
  };
}

/**
 * Helper function to get common packages list
 */
export function getCommonPackages(): string[] {
  return [
    "ipython",
    "matplotlib",
    "numpy",
    "pandas",
    "polars",     // Fast DataFrames
    "requests",
    "micropip",
    "scipy",      // Scientific computing
    "sympy",      // Symbolic mathematics
    "bokeh",      // Interactive visualization
    "plotly",     // Plotting library
  ];
}

/**
 * Get essential packages (minimal set for basic functionality)
 */
export function getEssentialPackages(): string[] {
  return [
    "ipython",
    "matplotlib",
    "numpy",
    "pandas",
    "polars",     // Fast DataFrames
    "requests",
    "micropip",
  ];
}
