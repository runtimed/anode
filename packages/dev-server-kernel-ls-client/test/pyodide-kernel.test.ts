import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { PyodideKernel } from '../src/pyodide-kernel.js'

// Mock pyodide to prevent unhandled errors in CI
vi.mock('pyodide', () => ({
  loadPyodide: vi.fn().mockResolvedValue({
    loadPackage: vi.fn().mockResolvedValue(undefined),
    runPython: vi.fn().mockReturnValue(undefined),
    runPythonAsync: vi.fn().mockResolvedValue(undefined),
    globals: {
      get: vi.fn(),
      set: vi.fn(),
    }
  })
}))

/**
 * Smoke tests for PyodideKernel
 *
 * Note: Comprehensive testing of the enhanced display system is done in:
 * - enhanced-display-system.ts (22 integration tests covering real functionality)
 * - runtime-orchestrator.test.ts (LiveStore integration tests)
 *
 * These smoke tests just verify basic kernel lifecycle with proper mocking.
 */

describe('PyodideKernel - Smoke Tests', () => {
  console.log('🧪 Starting Anode test suite...')

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Construction', () => {
    it('should create a kernel instance', () => {
      const kernel = new PyodideKernel('test-notebook')
      expect(kernel).toBeDefined()
      expect(kernel.isInitialized()).toBe(false)
    })

    it('should have expected methods', () => {
      const kernel = new PyodideKernel('test-notebook')
      expect(typeof kernel.initialize).toBe('function')
      expect(typeof kernel.execute).toBe('function')
      expect(typeof kernel.terminate).toBe('function')
      expect(typeof kernel.isInitialized).toBe('function')
    })
  })

  describe('Basic Lifecycle', () => {
    let kernel: PyodideKernel

    beforeEach(() => {
      kernel = new PyodideKernel('test-kernel-lifecycle')
    })

    afterEach(async () => {
      if (kernel) {
        await kernel.terminate()
      }
    })

    it('should handle termination before initialization', async () => {
      expect(kernel.isInitialized()).toBe(false)
      await kernel.terminate() // Should not throw
      expect(kernel.isInitialized()).toBe(false)
    })

    it('should handle execution before initialization', async () => {
      const result = await kernel.execute('2 + 2')
      expect(result).toBeInstanceOf(Array)
      expect(result.length).toBeGreaterThan(0)
      expect(result[0].type).toBe('error')
    })

    it('should handle execution after termination', async () => {
      await kernel.terminate()
      const result = await kernel.execute('2 + 2')
      expect(result).toBeInstanceOf(Array)
      expect(result.length).toBeGreaterThan(0)
      expect(result[0].type).toBe('error')
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid notebook ID gracefully', () => {
      expect(() => new PyodideKernel('')).not.toThrow()
      expect(() => new PyodideKernel(null as any)).not.toThrow()
      expect(() => new PyodideKernel(undefined as any)).not.toThrow()
    })
  })
})

/**
 * For comprehensive functionality testing, see:
 *
 * 1. enhanced-display-system.ts - Tests the complete enhanced display system
 *    including IPython integration, rich outputs, stream consolidation, etc.
 *    This is where the real kernel functionality is validated.
 *
 * 2. runtime-orchestrator.test.ts - Tests LiveStore integration and reactive
 *    execution patterns with the kernel.
 *
 * These smoke tests just ensure basic object construction and lifecycle
 * work without attempting to mock the complex PyodideKernel internals.
 */
