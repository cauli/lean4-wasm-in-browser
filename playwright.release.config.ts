import { defineConfig } from '@playwright/test'

// 🤖 Run the unchanged browser checks against an explicitly selected release host.
export default defineConfig({
  testDir: './e2e',
  timeout: 240_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  reporter: 'line',
  use: {
    baseURL: process.env.RELEASE_BASE_URL || 'http://127.0.0.1:5177',
    viewport: { width: 1440, height: 1000 },
    trace: 'off',
    screenshot: 'only-on-failure',
  },
})
