import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright配置文件
 * 用于AI Project的E2E测试
 */
export default defineConfig({
  testDir: './e2e-tests',

  /* 测试超时时间 */
  timeout: 30 * 1000,
  expect: {
    timeout: 5000
  },

  /* 失败时重试 */
  retries: process.env.CI ? 2 : 0,

  /* 并行执行 */
  workers: process.env.CI ? 1 : undefined,

  /* 测试报告 */
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
    ['list']
  ],

  /* 全局配置 */
  use: {
    /* 基础URL */
    baseURL: 'http://localhost:3000',

    /* 后端API URL */
    // 可以在测试中使用 process.env.API_URL

    /* 截图设置 */
    screenshot: 'only-on-failure',

    /* 视频录制 */
    video: 'retain-on-failure',

    /* 追踪 */
    trace: 'on-first-retry',

    /* 浏览器上下文 */
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,

    /* 自动等待 */
    actionTimeout: 10000,
  },

  /* 配置项目 */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // 可选：添加更多浏览器
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    // 移动设备测试
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
  ],

  /* Web服务器配置 */
  webServer: [
    {
      command: 'cd backend && ./ai-project-backend',
      url: 'http://localhost:8080/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
    {
      command: 'cd frontend && npm start',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
  ],
});
