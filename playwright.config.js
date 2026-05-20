const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: 1,
  reporter: [['html', { open: 'never' }], ['list']],
  projects: [
    {
      name: 'ui',
      use: {
        baseURL: 'http://localhost:8080',
        headless: true,
        // Babel/React CDN scripts can be slow to compile on first load
        navigationTimeout: 20_000,
        actionTimeout: 10_000,
      },
      testMatch: /0[123]_.*\.spec\.js/,
    },
    {
      name: 'api',
      use: {
        baseURL: 'http://localhost:8501',
      },
      testMatch: /04_.*\.spec\.js/,
    },
  ],
});
