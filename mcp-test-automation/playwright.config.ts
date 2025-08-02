import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // 串行执行，确保测试顺序
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1, // 单线程执行
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results.json' }]
  ],
  use: {
    baseURL: 'http://localhost:3000', // 前端界面地址
    trace: 'on-first-retry',
    video: 'retain-on-failure', // 每个测试都录制视频
    screenshot: 'only-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: 'mcp-tests',
      use: { 
        ...devices['Desktop Chrome'],
        // 为每个测试录制视频
        video: {
          mode: 'on',
          size: { width: 1280, height: 720 }
        }
      },
    },
  ],

  webServer: {
    command: 'echo "Please ensure frontend is running on localhost:3000"',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
