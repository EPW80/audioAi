import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000, // mongodb-memory-server needs time to spin up
    hookTimeout: 30000,
    setupFiles: ['./src/test/setup.ts'],
  },
});
