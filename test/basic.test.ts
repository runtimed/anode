import { describe, it, expect } from 'vitest'

describe('Basic Setup Test', () => {
  it('should pass a simple test', () => {
    expect(1 + 1).toBe(2)
  })

  it('should have access to test environment', () => {
    expect(process.env.NODE_ENV).toBe('test')
  })
})
