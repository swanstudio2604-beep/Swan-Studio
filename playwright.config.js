const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  testMatch: /.*\.spec\.js/,
  timeout: 120000,
  retries: 0,
  workers: 1, // run sequentially to prevent concurrent state collision on single store
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:4000',
    trace: 'off',
    video: 'off',
  },
  projects: [
    {
      name: 'Mobile-360x800',
      use: {
        viewport: { width: 360, height: 800 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'Mobile-390x844',
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
