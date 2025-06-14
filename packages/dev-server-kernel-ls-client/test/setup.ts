import { vi } from 'vitest'
import type { Store } from '@livestore/livestore'

// Test utilities for kernel adapter tests
export function createTestStoreId(): string {
  return `test-store-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function createTestSessionId(): string {
  return `test-session-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100
): Promise<void> {
  const start = Date.now()

  while (Date.now() - start < timeout) {
    const result = await condition()
    if (result) {
      return
    }
    await new Promise(resolve => setTimeout(resolve, interval))
  }

  throw new Error(`Timeout waiting for condition after ${timeout}ms`)
}

export async function cleanupResources(...stores: (Store | undefined)[]): Promise<void> {
  const cleanupPromises = stores
    .filter((store): store is Store => store !== undefined)
    .map(store => store.shutdown?.())
    .filter((promise): promise is Promise<any> => promise !== undefined)

  await Promise.allSettled(cleanupPromises)
}

// Mock implementations for testing
export const createMockAdapter = () => ({
  storage: { type: 'in-memory' as const },
  sync: undefined
})

export const createMockKernel = () => ({
  initialize: vi.fn().mockResolvedValue(undefined),
  execute: vi.fn().mockResolvedValue([
    {
      type: 'execute_result',
      data: { 'text/plain': 'test result' }
    }
  ]),
  terminate: vi.fn().mockResolvedValue(undefined),
  isReady: vi.fn().mockReturnValue(true)
})
