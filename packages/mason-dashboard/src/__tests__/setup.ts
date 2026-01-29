import '@testing-library/jest-dom/vitest';
import { vi, beforeEach } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
});

// Mock crypto.subtle for PKCE tests
Object.defineProperty(globalThis, 'crypto', {
  value: {
    getRandomValues: (array: Uint8Array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    },
    subtle: {
      digest: async (algorithm: string, data: ArrayBuffer) => {
        // Simple mock - in real tests we'd use a proper implementation
        // This creates a deterministic hash for testing
        const view = new Uint8Array(data);
        const hash = new Uint8Array(32);
        for (let i = 0; i < view.length; i++) {
          hash[i % 32] = (hash[i % 32] + view[i]) % 256;
        }
        return hash.buffer;
      },
    },
  },
});

// Mock fetch
globalThis.fetch = vi.fn();

// Reset mocks before each test
beforeEach(() => {
  localStorageMock.clear();
  vi.clearAllMocks();
});
