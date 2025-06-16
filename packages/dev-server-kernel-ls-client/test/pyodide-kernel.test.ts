import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { PyodideKernel } from '../src/pyodide-kernel.js'

/**
 * Smoke tests for PyodideKernel
 *
 * Note: Comprehensive testing of the enhanced display system is done in:
 * - enhanced-display-system.ts (22 integration tests covering real functionality)
 * - kernel-adapter.test.ts (LiveStore integration tests)
 *
 * These smoke tests just verify basic kernel lifecycle without complex mocking.
 */

describe('PyodideKernel - Smoke Tests', () => {
  console.log('🧪 Starting Anode test suite...')

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

    it('should reject execution before initialization', async () => {
      await expect(kernel.execute('2 + 2')).rejects.toThrow()
    })

    it('should reject execution after termination', async () => {
      await kernel.terminate()
      await expect(kernel.execute('2 + 2')).rejects.toThrow()
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
 * 2. kernel-adapter.test.ts - Tests LiveStore integration and reactive
 *    execution patterns with the kernel.
 *
 * These smoke tests just ensure basic object construction and lifecycle
 * work without attempting to mock the complex PyodideKernel internals.
 */
