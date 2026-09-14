import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // The API suite talks to the real Supabase project; give it room on a
    // slow link rather than producing flaky failures.
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // Reference data is cached in-process, so sharing one worker keeps the
    // suite honest about cache behaviour instead of hiding it behind isolation.
    fileParallelism: false,
  },
});
