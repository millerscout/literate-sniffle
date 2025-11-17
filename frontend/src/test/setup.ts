// test setup file
import { beforeAll } from 'vitest'

// Mock fetch globally
global.fetch = vi.fn()

// Setup global test utilities
beforeAll(() => {
  // Add any global test setup here
})