# Pyodide Package Caching

This document explains how to use Anode's Pyodide package caching system to improve development experience by pre-loading Python packages.

## Overview

When running Python notebooks, Pyodide needs to download packages from the internet on first use. This can be slow, especially for large packages like numpy, pandas, or matplotlib. Anode's caching system solves this by:

1. **Local Package Caching**: Downloads packages once and stores them locally for reuse
2. **Pre-loading**: Automatically loads essential packages during kernel initialization  
3. **Cache Management**: Provides tools to manage and optimize your package cache

## How It Works

### Automatic Caching

When you start a kernel, Anode automatically:

- Sets up a package cache directory at `~/.anode/pyodide-cache/`
- Pre-loads essential packages: `ipython`, `matplotlib`, `numpy`, `pandas`, `requests`, `micropip`
- Downloads packages to the cache on first use
- Reuses cached packages for faster subsequent startups

### Cache Location

By default, packages are cached in:
```
~/
└── .anode/
    └── pyodide-cache/
        ├── numpy-1.24.3-cp311-cp311-emscripten_3_1_32_wasm32.whl
        ├── pandas-2.0.3-cp311-cp311-emscripten_3_1_32_wasm32.whl
        ├── matplotlib-3.7.2-cp311-cp311-emscripten_3_1_32_wasm32.whl
        └── ...
```

## Cache Management Commands

Anode provides several commands to manage your package cache:

### Warm Up Cache

Pre-download packages to avoid delays during development:

```bash
# Warm up with essential packages (recommended for most users)
pnpm cache:warm-up

# Warm up with extended package set (includes scipy, sympy, bokeh, plotly)
pnpm cache:warm-up:common

# Warm up specific packages
pnpm --filter @anode/dev-server-kernel-ls-client cache-cli warm-up numpy pandas matplotlib requests scipy
```

### View Cache Status

```bash
# Show cache statistics
pnpm cache:stats

# List all cached packages
pnpm cache:list
```

Example output:
```
📊 Pyodide Package Cache Statistics
=====================================
Cache Directory: /Users/username/.anode/pyodide-cache
Total Packages:  8
Total Size:      45.2 MB

Cached Packages:
---------------
  • ipython
  • matplotlib
  • micropip
  • numpy
  • pandas
  • requests
  • scipy
  • sympy
```

### Check Package Status

Check if specific packages are cached:

```bash
pnpm --filter @anode/dev-server-kernel-ls-client cache-cli check numpy pandas requests scipy
```

Output:
```
🔍 Checking cache status for packages...

  numpy                ✅ CACHED
  pandas               ✅ CACHED  
  requests             ✅ CACHED
  scipy                ❌ NOT CACHED
```

### Cache Cleanup

```bash
# Remove packages older than 30 days
pnpm cache:cleanup

# Remove packages older than 7 days
pnpm --filter @anode/dev-server-kernel-ls-client cache-cli cleanup --max-age 7

# Clear entire cache
pnpm cache:clear
```

## Package Sets

Anode defines two package sets for convenience:

### Essential Packages (Default)
Loaded automatically on kernel startup:
- `ipython` - Interactive Python shell
- `matplotlib` - Plotting library
- `numpy` - Numerical computing
- `pandas` - Data analysis
- `requests` - HTTP library
- `micropip` - Package installer

### Common Packages (Extended)
Includes essential packages plus:
- `scipy` - Scientific computing
- `sympy` - Symbolic mathematics  
- `bokeh` - Interactive visualization
- `plotly` - Plotting library

## Custom Cache Configuration

### Custom Cache Directory

Set a custom cache location:

```bash
pnpm --filter @anode/dev-server-kernel-ls-client cache-cli stats --cache-dir /custom/cache/path
```

### Environment Variables

You can also configure caching via environment variables:

```bash
export ANODE_CACHE_DIR="/custom/cache/path"
pnpm dev:runtime
```

## Development Workflow

### Recommended Setup

For the best development experience:

1. **Initial Setup**: Warm up the cache with essential packages
   ```bash
   pnpm cache:warm-up
   ```

2. **Regular Development**: Start kernels normally - they'll use cached packages
   ```bash
   NOTEBOOK_ID=your-notebook-id pnpm dev:runtime
   ```

3. **Add New Packages**: Install packages as needed in notebooks
   ```python
   import micropip
   await micropip.install("scikit-learn")
   ```

4. **Periodic Cleanup**: Clean old packages occasionally
   ```bash
   pnpm cache:cleanup
   ```

### CI/CD Integration

For continuous integration, pre-warm the cache:

```bash
# In your CI script
pnpm cache:warm-up:common  # Pre-load extended package set
pnpm test:kernel           # Run tests with warm cache
```

## Performance Benefits

### Cold Start (No Cache)
- First `import numpy`: ~3-5 seconds (download + setup)
- First `import pandas`: ~2-4 seconds  
- First `import matplotlib`: ~1-3 seconds

### Warm Start (With Cache)
- Any cached import: ~50-200ms (load from disk)
- **10-25x faster** startup times

### Storage Usage

Typical cache sizes:
- Essential packages: ~20-30 MB
- Common packages: ~40-60 MB
- Full scientific stack: ~100-200 MB

## Troubleshooting

### Cache Not Working

1. **Check cache directory permissions**:
   ```bash
   ls -la ~/.anode/pyodide-cache/
   ```

2. **Clear and rebuild cache**:
   ```bash
   pnpm cache:clear
   pnpm cache:warm-up
   ```

3. **Check disk space**:
   ```bash
   df -h ~/.anode/
   ```

### Slow Package Loading

1. **Verify packages are cached**:
   ```bash
   pnpm cache:list
   ```

2. **Check for network issues** (if downloading):
   ```bash
   pnpm --filter @anode/dev-server-kernel-ls-client cache-cli warm-up --verbose
   ```

### Cache Corruption

If you suspect cache corruption:

```bash
# Nuclear option: clear everything and start fresh
pnpm cache:clear
pnpm cache:warm-up:common
```

## Advanced Usage

### Custom Package Lists

Create custom warm-up scripts for specific use cases:

```bash
# Data science workflow
pnpm --filter @anode/dev-server-kernel-ls-client cache-cli warm-up numpy pandas matplotlib seaborn scikit-learn

# Scientific computing
pnpm --filter @anode/dev-server-kernel-ls-client cache-cli warm-up numpy scipy matplotlib sympy

# Web scraping  
pnpm --filter @anode/dev-server-kernel-ls-client cache-cli warm-up requests beautifulsoup4 lxml pandas
```

### Monitoring Cache Usage

```bash
# Check cache stats regularly
pnpm cache:stats

# Monitor cache size growth
watch -n 60 'pnpm cache:stats | grep "Total Size"'
```

### Sharing Cache Between Users

For team environments, you can use a shared cache directory:

```bash
# Set shared cache location
export ANODE_CACHE_DIR="/shared/anode-cache"

# Make sure permissions allow write access
chmod 775 /shared/anode-cache
```

## Integration with Development

The caching system is automatically integrated with:

- **Kernel Initialization**: Essential packages pre-loaded
- **Package Loading**: New packages cached automatically  
- **Development Server**: Cache statistics logged on startup
- **Testing**: Cache can be pre-warmed for faster test runs

## Testing

The cache system includes comprehensive tests at multiple levels:

### Unit Tests (Fast)
```bash
# Run fast unit tests only (excludes integration tests)
pnpm test:kernel

# Run specific cache tests
pnpm --filter @anode/dev-server-kernel-ls-client test cache.test.ts
pnpm --filter @anode/dev-server-kernel-ls-client test cache-cli.test.ts
```

### Integration Tests (Slow)
```bash
# Run full integration tests with actual Pyodide downloads
pnpm test:kernel:integration

# Run all tests including integration
pnpm test:kernel:all

# Run with environment variable
INTEGRATION_TESTS=true pnpm test:kernel
```

**Note**: Integration tests download actual packages and can take 2-5 minutes. They're automatically skipped in local development but run in CI.

### Test Coverage

The test suite covers:
- **Cache Management**: Directory creation, file operations, statistics
- **CLI Interface**: All cache commands and error handling
- **Package Detection**: Versioned filename handling
- **Cache Performance**: Speed improvements from caching
- **Error Scenarios**: Permission issues, missing packages
- **Real Usage**: Actual Python execution with cached packages

## Future Enhancements

Planned improvements:
- **Cache Compression**: Reduce storage usage
- **Network-Shared Cache**: Team cache synchronization
- **Smart Pre-loading**: ML-based package prediction
- **Version Management**: Handle package updates gracefully

---

For more information, see:
- [Pyodide Documentation](https://pyodide.org/en/stable/)
- [Anode Development Guide](./README.md)
- [Python Kernel Documentation](./PYTHON_KERNEL.md)