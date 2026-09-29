import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['{admin,server}/src/**/*.test.{ts,tsx}'],
    environment: 'node',
  },
});
