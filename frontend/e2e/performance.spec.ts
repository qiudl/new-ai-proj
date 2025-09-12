import { test, expect } from '@playwright/test';
import { TestHelpers, PerformanceTestHelpers } from './utils/test-helpers';

/**
 * 性能测试 E2E
 * 测试应用的性能表现和响应时间
 */

test.describe('性能测试', () => {
  let helpers: TestHelpers;
  let performanceHelpers: PerformanceTestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    performanceHelpers = new PerformanceTestHelpers(page);
    
    // 管理员登录
    await page.goto('/login');
    await helpers.safeFill('[data-testid="username-input"]', 'admin');
    await helpers.safeFill('[data-testid="password-input"]', 'admin123');
    await helpers.safeClick('[data-testid="login-button"]');
    await helpers.verifyUrlContains('/dashboard');
  });

  test('页面加载时间性能测试', async ({ page }) => {
    const pages = [
      { url: '/dashboard', name: '仪表盘', maxTime: 2000 },
      { url: '/admin/enterprises', name: '企业管理', maxTime: 3000 },
      { url: '/admin/users', name: '用户管理', maxTime: 3000 },
      { url: '/admin/impersonation/history', name: '模拟历史', maxTime: 4000 }
    ];

    for (const testPage of pages) {
      console.log(`测试 ${testPage.name} 页面加载性能...`);
      
      const loadTime = await performanceHelpers.measurePageLoadTime(testPage.url);
      
      console.log(`${testPage.name} 加载时间: ${loadTime}ms`);
      expect(loadTime).toBeLessThan(testPage.maxTime);
      
      // 验证页面完全可交互
      await helpers.verifyElementExists('body');
      
      // 验证关键元素已渲染
      const mainContent = page.locator('main, [data-testid="main-content"]');
      await expect(mainContent).toBeVisible();
    }
  });

  test('模拟操作响应时间测试', async ({ page }) => {
    await page.goto('/admin/enterprises');
    await helpers.waitForNetworkIdle();

    // 测量开始模拟的响应时间
    const startTime = Date.now();
    
    const firstEnterprise = page.locator('[data-testid^="enterprise-row-"]:first-child');
    await firstEnterprise.locator('[data-testid="impersonate-button"]').click();
    await helpers.safeFill('[data-testid="impersonation-reason"]', '性能测试');
    await helpers.safeClick('[data-testid="confirm-impersonation"]');
    
    // 等待模拟横幅出现
    await helpers.verifyElementExists('[data-testid="impersonation-warning-banner"]');
    
    const responseTime = Date.now() - startTime;
    console.log(`模拟开始响应时间: ${responseTime}ms`);
    
    // 验证响应时间在可接受范围内（3秒内）
    expect(responseTime).toBeLessThan(3000);

    // 测量退出模拟的响应时间
    const exitStartTime = Date.now();
    
    await helpers.safeClick('[data-testid="exit-impersonation-button"]');
    await helpers.safeClick('[data-testid="confirm-exit-impersonation"]');
    await helpers.verifyElementNotExists('[data-testid="impersonation-warning-banner"]');
    
    const exitResponseTime = Date.now() - exitStartTime;
    console.log(`模拟退出响应时间: ${exitResponseTime}ms`);
    
    expect(exitResponseTime).toBeLessThan(2000);
  });

  test('大数据量性能测试', async ({ page }) => {
    // 测试企业列表在大数据量下的性能
    await page.goto('/admin/enterprises');
    
    // 等待初始加载
    await helpers.waitForNetworkIdle();
    
    // 测量渲染时间
    const renderStart = Date.now();
    
    // 触发加载更多数据（如果有分页）
    const loadMoreButton = page.locator('[data-testid="load-more-enterprises"]');
    if (await loadMoreButton.isVisible()) {
      await loadMoreButton.click();
      await helpers.waitForNetworkIdle();
    }
    
    const renderTime = Date.now() - renderStart;
    console.log(`大数据量渲染时间: ${renderTime}ms`);
    
    // 验证渲染时间合理
    expect(renderTime).toBeLessThan(5000);
    
    // 验证滚动性能
    const scrollStart = Date.now();
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(100);
    const scrollTime = Date.now() - scrollStart;
    
    console.log(`滚动响应时间: ${scrollTime}ms`);
    expect(scrollTime).toBeLessThan(200);
  });

  test('搜索功能性能测试', async ({ page }) => {
    await page.goto('/admin/enterprises');
    await helpers.waitForNetworkIdle();

    // 打开企业选择器
    await helpers.safeClick('[data-testid="enterprise-switcher-trigger"]');
    
    const searchInput = page.locator('[data-testid="enterprise-search-input"]');
    await expect(searchInput).toBeVisible();

    // 测试不同长度的搜索词性能
    const searchTerms = ['a', 'te', 'test', 'test company', 'test company with long name'];
    
    for (const term of searchTerms) {
      const searchStart = Date.now();
      
      // 清空输入框并输入搜索词
      await searchInput.clear();
      await searchInput.fill(term);
      
      // 等待搜索结果
      await helpers.waitForNetworkIdle();
      
      const searchTime = Date.now() - searchStart;
      console.log(`搜索词 "${term}" 响应时间: ${searchTime}ms`);
      
      // 验证搜索响应时间
      expect(searchTime).toBeLessThan(1000);
      
      // 验证搜索结果显示
      const searchResults = page.locator('[data-testid^="enterprise-option-"]');
      if (await searchResults.count() > 0) {
        await expect(searchResults.first()).toBeVisible();
      }
    }
  });

  test('内存使用情况监控', async ({ page }) => {
    await performanceHelpers.verifyMemoryUsage();

    // 执行一系列操作增加内存使用
    const operations = [
      () => page.goto('/admin/enterprises'),
      () => page.goto('/admin/users'),
      () => page.goto('/admin/impersonation/history'),
      () => page.goto('/dashboard')
    ];

    for (const operation of operations) {
      await operation();
      await helpers.waitForNetworkIdle();
      
      // 每次操作后检查内存
      await performanceHelpers.verifyMemoryUsage();
    }

    // 执行模拟操作
    await page.goto('/admin/enterprises');
    const firstEnterprise = page.locator('[data-testid^="enterprise-row-"]:first-child');
    await firstEnterprise.locator('[data-testid="impersonate-button"]').click();
    await helpers.safeFill('[data-testid="impersonation-reason"]', '内存测试');
    await helpers.safeClick('[data-testid="confirm-impersonation"]');
    
    await performanceHelpers.verifyMemoryUsage();

    // 退出模拟
    await helpers.safeClick('[data-testid="exit-impersonation-button"]');
    await helpers.safeClick('[data-testid="confirm-exit-impersonation"]');
    
    // 最终内存检查
    await performanceHelpers.verifyMemoryUsage();
  });

  test('网络请求优化测试', async ({ page }) => {
    // 监控网络请求
    const requests = [];
    page.on('request', request => {
      requests.push({
        url: request.url(),
        method: request.method(),
        timestamp: Date.now()
      });
    });

    const responses = [];
    page.on('response', response => {
      responses.push({
        url: response.url(),
        status: response.status(),
        size: response.headers()['content-length'] || 0,
        timestamp: Date.now()
      });
    });

    // 执行页面导航
    await page.goto('/admin/enterprises');
    await helpers.waitForNetworkIdle();

    // 分析请求效率
    console.log(`总请求数: ${requests.length}`);
    console.log(`总响应数: ${responses.length}`);

    // 验证没有过多的重复请求
    const apiRequests = requests.filter(req => req.url.includes('/api/'));
    const uniqueUrls = new Set(apiRequests.map(req => req.url));
    
    // 验证API请求去重效果
    expect(apiRequests.length / uniqueUrls.size).toBeLessThan(2); // 平均每个API最多调用2次

    // 验证没有失败的请求
    const failedResponses = responses.filter(resp => resp.status >= 400);
    expect(failedResponses.length).toBe(0);

    // 验证响应大小合理
    const largeResponses = responses.filter(resp => parseInt(resp.size) > 1024 * 1024); // >1MB
    expect(largeResponses.length).toBe(0);
  });

  test('并发操作性能测试', async ({ browser }) => {
    // 创建多个并发浏览器上下文
    const contexts = [];
    const pages = [];

    try {
      // 创建3个并发会话
      for (let i = 0; i < 3; i++) {
        const context = await browser.newContext();
        const page = await context.newPage();
        contexts.push(context);
        pages.push(page);

        // 登录
        await page.goto('/login');
        await page.fill('[data-testid="username-input"]', 'admin');
        await page.fill('[data-testid="password-input"]', 'admin123');
        await page.click('[data-testid="login-button"]');
        await page.waitForURL('**/dashboard');
      }

      // 并发执行相同操作
      const startTime = Date.now();
      
      const operations = pages.map(async (page, index) => {
        await page.goto('/admin/enterprises');
        await page.waitForSelector('[data-testid^="enterprise-row-"]');
        
        const firstEnterprise = page.locator('[data-testid^="enterprise-row-"]:first-child');
        await firstEnterprise.locator('[data-testid="impersonate-button"]').click();
        await page.fill('[data-testid="impersonation-reason"]', `并发测试 ${index + 1}`);
        await page.click('[data-testid="confirm-impersonation"]');
        await page.waitForSelector('[data-testid="impersonation-warning-banner"]');
        
        return Date.now();
      });

      const completionTimes = await Promise.all(operations);
      const totalTime = Math.max(...completionTimes) - startTime;
      
      console.log(`3个并发模拟操作总耗时: ${totalTime}ms`);
      
      // 验证并发操作性能
      expect(totalTime).toBeLessThan(10000); // 10秒内完成所有并发操作

      // 验证所有操作都成功
      for (const page of pages) {
        await expect(page.locator('[data-testid="impersonation-warning-banner"]')).toBeVisible();
      }

    } finally {
      // 清理资源
      for (const context of contexts) {
        await context.close();
      }
    }
  });

  test('长时间运行稳定性测试', async ({ page }) => {
    const duration = 2 * 60 * 1000; // 2分钟
    const interval = 10 * 1000; // 每10秒执行一次操作
    const startTime = Date.now();

    let operationCount = 0;
    let errors = [];

    while (Date.now() - startTime < duration) {
      try {
        operationCount++;
        console.log(`执行第${operationCount}次操作...`);

        // 执行一组标准操作
        await page.goto('/admin/enterprises');
        await helpers.waitForNetworkIdle();

        // 开始模拟
        const firstEnterprise = page.locator('[data-testid^="enterprise-row-"]:first-child');
        await firstEnterprise.locator('[data-testid="impersonate-button"]').click();
        await helpers.safeFill('[data-testid="impersonation-reason"]', `稳定性测试 #${operationCount}`);
        await helpers.safeClick('[data-testid="confirm-impersonation"]');
        await helpers.verifyElementExists('[data-testid="impersonation-warning-banner"]');

        // 退出模拟
        await helpers.safeClick('[data-testid="exit-impersonation-button"]');
        await helpers.safeClick('[data-testid="confirm-exit-impersonation"]');
        await helpers.verifyElementNotExists('[data-testid="impersonation-warning-banner"]');

        // 检查内存使用
        await performanceHelpers.verifyMemoryUsage();

        // 等待间隔
        await page.waitForTimeout(interval);

      } catch (error) {
        errors.push({
          operationNumber: operationCount,
          error: error.message,
          timestamp: new Date().toISOString()
        });
        
        console.error(`第${operationCount}次操作失败:`, error.message);
      }
    }

    const totalTime = Date.now() - startTime;
    console.log(`稳定性测试完成:`);
    console.log(`- 总运行时间: ${totalTime}ms`);
    console.log(`- 执行操作次数: ${operationCount}`);
    console.log(`- 错误次数: ${errors.length}`);

    // 验证错误率低于5%
    const errorRate = errors.length / operationCount;
    expect(errorRate).toBeLessThan(0.05);

    // 记录错误详情
    if (errors.length > 0) {
      console.log('错误详情:', JSON.stringify(errors, null, 2));
    }
  });

  test('资源泄漏检测', async ({ page }) => {
    // 记录初始状态
    const initialMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });

    // 执行大量操作
    for (let i = 0; i < 5; i++) {
      await page.goto('/admin/enterprises');
      await helpers.waitForNetworkIdle();

      // 打开和关闭模态框多次
      const firstEnterprise = page.locator('[data-testid^="enterprise-row-"]:first-child');
      
      for (let j = 0; j < 3; j++) {
        await firstEnterprise.locator('[data-testid="impersonate-button"]').click();
        await page.waitForSelector('[data-testid="impersonation-modal"]');
        await page.keyboard.press('Escape'); // 关闭模态框
        await page.waitForTimeout(100);
      }
    }

    // 强制垃圾回收（如果可能）
    await page.evaluate(() => {
      if (window.gc) {
        window.gc();
      }
    });

    await page.waitForTimeout(2000); // 等待垃圾回收

    // 检查最终内存使用
    const finalMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });

    if (initialMemory > 0 && finalMemory > 0) {
      const memoryIncrease = finalMemory - initialMemory;
      const increasePercentage = (memoryIncrease / initialMemory) * 100;
      
      console.log(`内存变化: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB (${increasePercentage.toFixed(1)}%)`);
      
      // 验证内存增长不超过50%
      expect(increasePercentage).toBeLessThan(50);
    }
  });
});