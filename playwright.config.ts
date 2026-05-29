import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testIgnore: ['**/*.test.ts'],
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  timeout: 30000
});
