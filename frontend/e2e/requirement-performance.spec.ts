/**
 * 需求管理系统性能测试
 *
 * 测试范围:
 * 1. @用户搜索性能
 * 2. 评论加载性能
 * 3. 需求列表性能
 * 4. 大数据量处理
 */

import { test, expect, Page } from '@playwright/test';
import { TestHelpers, PerformanceTestHelpers, RequirementTestHelpers } from './utils/test-helpers';

test.describe('需求管理系统性能测试', () => {
  let helpers: TestHelpers;
  let performanceHelpers: PerformanceTestHelpers;
  let requirementHelpers: RequirementTestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    performanceHelpers = new PerformanceTestHelpers(page);
    requirementHelpers = new RequirementTestHelpers(page);

    // 登录
    await page.goto('/login');
    await helpers.safeFill('[data-testid="username-input"]', 'admin');
    await helpers.safeFill('[data-testid="password-input"]', 'admin123');
    await helpers.safeClick('[data-testid="login-button"]');
    await helpers.waitForNetworkIdle();
  });

  test.describe('@用户搜索性能测试', () => {

    test('1.1 @提及搜索响应速度测试', async ({ page }) => {
      // 创建一个需求用于测试
      const requirementId = await requirementHelpers.createRequirement(
        '性能测试需求',
        '用于测试@用户搜索性能',
        'high'
      );

      // 导航到需求详情页
      await page.goto(`/requirements/${requirementId}`);
      await helpers.waitForNetworkIdle();

      // 找到评论输入框
      const commentInput = await helpers.waitAndGet('[data-testid="comment-input"]');

      // 测试不同长度的搜索词
      const searchTerms = ['@a', '@ad', '@adm', '@admin'];
      const responseTimes: number[] = [];

      for (const term of searchTerms) {
        await commentInput.clear();

        const startTime = Date.now();

        // 输入@触发用户搜索
        await commentInput.fill(term);

        // 等待下拉列表出现
        await page.waitForSelector('[data-testid="mention-dropdown"]', { timeout: 3000 });

        const responseTime = Date.now() - startTime;
        responseTimes.push(responseTime);

        console.log(`搜索词 "${term}" 响应时间: ${responseTime}ms`);

        // 验证响应时间在可接受范围内 (<500ms)
        expect(responseTime).toBeLessThan(500);

        // 验证搜索结果已显示
        const userOptions = page.locator('[data-testid^="mention-user-"]');
        const count = await userOptions.count();
        expect(count).toBeGreaterThan(0);
      }

      // 验证平均响应时间
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      console.log(`平均响应时间: ${avgResponseTime.toFixed(2)}ms`);
      expect(avgResponseTime).toBeLessThan(300);
    });

    test('1.2 防抖(Debounce)机制验证', async ({ page }) => {
      const requirementId = await requirementHelpers.createRequirement(
        'Debounce测试',
        '验证防抖机制',
        'medium'
      );

      await page.goto(`/requirements/${requirementId}`);
      await helpers.waitForNetworkIdle();

      const commentInput = await helpers.waitAndGet('[data-testid="comment-input"]');

      // 监控API请求
      const apiCalls: number[] = [];
      page.on('request', request => {
        if (request.url().includes('/api/v1/users/search') ||
            request.url().includes('/api/v1/users/mention-search')) {
          apiCalls.push(Date.now());
        }
      });

      // 快速输入多个字符
      const characters = ['@', 'a', 'd', 'm', 'i', 'n'];
      for (const char of characters) {
        await commentInput.type(char);
        await page.waitForTimeout(50); // 快速输入，模拟用户快速打字
      }

      // 等待防抖完成
      await page.waitForTimeout(1000);

      console.log(`API调用次数: ${apiCalls.length}`);

      // 验证防抖效果：API调用次数应该远少于输入字符数
      // 正常防抖应该只调用1-2次API
      expect(apiCalls.length).toBeLessThan(4);
    });

    test('1.3 大量用户搜索性能', async ({ page }) => {
      const requirementId = await requirementHelpers.createRequirement(
        '大量用户搜索测试',
        '测试系统中有大量用户时的搜索性能',
        'high'
      );

      await page.goto(`/requirements/${requirementId}`);
      await helpers.waitForNetworkIdle();

      const commentInput = await helpers.waitAndGet('[data-testid="comment-input"]');

      // 测试搜索性能
      const startTime = Date.now();

      await commentInput.fill('@');
      await page.waitForSelector('[data-testid="mention-dropdown"]');

      const searchTime = Date.now() - startTime;
      console.log(`搜索全部用户响应时间: ${searchTime}ms`);

      // 即使有大量用户，响应时间也应该在1秒内
      expect(searchTime).toBeLessThan(1000);

      // 验证结果列表加载
      const userOptions = page.locator('[data-testid^="mention-user-"]');
      const count = await userOptions.count();
      console.log(`搜索结果数量: ${count}`);

      // 验证分页/限制生效（不应该一次加载所有用户）
      expect(count).toBeLessThanOrEqual(20); // 假设每页最多20个结果
    });

    test('1.4 键盘导航性能', async ({ page }) => {
      const requirementId = await requirementHelpers.createRequirement(
        '键盘导航测试',
        '测试下拉列表键盘导航的流畅性',
        'medium'
      );

      await page.goto(`/requirements/${requirementId}`);
      await helpers.waitForNetworkIdle();

      const commentInput = await helpers.waitAndGet('[data-testid="comment-input"]');

      // 触发用户搜索
      await commentInput.fill('@ad');
      await page.waitForSelector('[data-testid="mention-dropdown"]');

      // 测试键盘导航响应速度
      const navigationTimes: number[] = [];

      for (let i = 0; i < 5; i++) {
        const startTime = Date.now();

        // 按下箭头键
        await page.keyboard.press('ArrowDown');

        // 等待高亮状态更新
        await page.waitForTimeout(50);

        const navTime = Date.now() - startTime;
        navigationTimes.push(navTime);

        console.log(`键盘导航 ${i + 1} 响应时间: ${navTime}ms`);
      }

      // 验证键盘导航流畅度 (<100ms)
      const avgNavTime = navigationTimes.reduce((a, b) => a + b, 0) / navigationTimes.length;
      console.log(`平均键盘导航时间: ${avgNavTime.toFixed(2)}ms`);
      expect(avgNavTime).toBeLessThan(100);
    });

    test('1.5 @提及渲染性能', async ({ page }) => {
      const requirementId = await requirementHelpers.createRequirement(
        '@提及渲染测试',
        '测试包含多个@提及的评论渲染性能',
        'medium'
      );

      await page.goto(`/requirements/${requirementId}`);
      await helpers.waitForNetworkIdle();

      // 创建包含多个@提及的评论
      const mentionedUsers = ['user1', 'user2', 'user3', 'user4', 'user5'];

      const startTime = Date.now();

      await requirementHelpers.addComment(
        requirementId,
        '请大家协助审查这个需求',
        mentionedUsers
      );

      const renderTime = Date.now() - startTime;
      console.log(`包含5个@提及的评论渲染时间: ${renderTime}ms`);

      // 验证渲染时间合理
      expect(renderTime).toBeLessThan(2000);

      // 验证所有@提及都正确渲染
      for (const user of mentionedUsers) {
        await helpers.verifyElementExists(`[data-testid="comment-mention-${user}"]`);
      }
    });
  });

  test.describe('评论加载性能测试', () => {

    test('2.1 初始评论加载性能', async ({ page }) => {
      // 创建一个包含评论的需求
      const requirementId = await requirementHelpers.createRequirement(
        '评论加载测试',
        '测试评论列表加载性能',
        'high'
      );

      // 添加多条评论
      for (let i = 1; i <= 10; i++) {
        await requirementHelpers.addComment(requirementId, `测试评论 #${i}`);
      }

      // 测量加载时间
      const startTime = Date.now();

      await page.goto(`/requirements/${requirementId}`);
      await helpers.waitForNetworkIdle();

      // 等待评论区域显示
      await helpers.verifyElementExists('[data-testid="comment-section"]');

      const loadTime = Date.now() - startTime;
      console.log(`包含10条评论的页面加载时间: ${loadTime}ms`);

      // 验证加载时间
      expect(loadTime).toBeLessThan(3000);

      // 验证评论数量显示
      const comments = page.locator('[data-testid="comment-item"]');
      const count = await comments.count();
      expect(count).toBeGreaterThanOrEqual(10);
    });

    test('2.2 评论分页加载性能', async ({ page }) => {
      const requirementId = await requirementHelpers.createRequirement(
        '评论分页测试',
        '测试评论分页加载',
        'medium'
      );

      // 添加足够多的评论以触发分页
      for (let i = 1; i <= 25; i++) {
        await requirementHelpers.addComment(requirementId, `评论 #${i}`);
      }

      await page.goto(`/requirements/${requirementId}`);
      await helpers.waitForNetworkIdle();

      // 验证初始加载的评论数量（假设每页20条）
      let comments = page.locator('[data-testid="comment-item"]');
      const initialCount = await comments.count();
      console.log(`初始加载评论数: ${initialCount}`);
      expect(initialCount).toBeLessThanOrEqual(20);

      // 测试加载下一页
      const loadMoreButton = page.locator('[data-testid="load-more-comments"]');
      if (await loadMoreButton.isVisible()) {
        const startTime = Date.now();

        await loadMoreButton.click();
        await helpers.waitForNetworkIdle();

        const loadTime = Date.now() - startTime;
        console.log(`加载更多评论响应时间: ${loadTime}ms`);

        // 验证加载时间
        expect(loadTime).toBeLessThan(1500);

        // 验证评论数量增加
        comments = page.locator('[data-testid="comment-item"]');
        const newCount = await comments.count();
        expect(newCount).toBeGreaterThan(initialCount);
      }
    });

    test('2.3 评论滚动加载性能（无限滚动）', async ({ page }) => {
      const requirementId = await requirementHelpers.createRequirement(
        '无限滚动测试',
        '测试评论无限滚动加载性能',
        'high'
      );

      // 添加大量评论
      for (let i = 1; i <= 50; i++) {
        await requirementHelpers.addComment(requirementId, `滚动测试评论 #${i}`);
      }

      await page.goto(`/requirements/${requirementId}`);
      await helpers.waitForNetworkIdle();

      const commentSection = page.locator('[data-testid="comment-section"]');

      // 记录初始评论数
      let previousCount = await page.locator('[data-testid="comment-item"]').count();
      console.log(`初始评论数: ${previousCount}`);

      // 滚动3次，每次测量加载时间
      const scrollTimes: number[] = [];

      for (let i = 0; i < 3; i++) {
        const startTime = Date.now();

        // 滚动到底部
        await commentSection.evaluate(node => {
          node.scrollTop = node.scrollHeight;
        });

        // 等待新评论加载
        await page.waitForTimeout(500);
        await helpers.waitForNetworkIdle();

        const loadTime = Date.now() - startTime;
        scrollTimes.push(loadTime);

        const newCount = await page.locator('[data-testid="comment-item"]').count();
        console.log(`第${i + 1}次滚动加载时间: ${loadTime}ms, 新增评论: ${newCount - previousCount}`);

        previousCount = newCount;
      }

      // 验证平均滚动加载时间
      const avgScrollTime = scrollTimes.reduce((a, b) => a + b, 0) / scrollTimes.length;
      console.log(`平均滚动加载时间: ${avgScrollTime.toFixed(2)}ms`);
      expect(avgScrollTime).toBeLessThan(1000);
    });

    test('2.4 富文本评论渲染性能', async ({ page }) => {
      const requirementId = await requirementHelpers.createRequirement(
        '富文本渲染测试',
        '测试包含Markdown、代码块、链接的评论渲染',
        'medium'
      );

      // 创建包含复杂格式的评论
      const complexComment = `
# 测试标题

这是一段包含**粗体**、*斜体*和\`代码\`的文本。

## 代码块
\`\`\`javascript
function test() {
  console.log('性能测试');
  return true;
}
\`\`\`

- 列表项1
- 列表项2
- 列表项3

[链接示例](https://example.com)

> 引用文本
`;

      const startTime = Date.now();

      await requirementHelpers.addComment(requirementId, complexComment);

      const renderTime = Date.now() - startTime;
      console.log(`富文本评论渲染时间: ${renderTime}ms`);

      // 验证渲染时间
      expect(renderTime).toBeLessThan(2000);

      // 验证Markdown正确渲染
      await page.goto(`/requirements/${requirementId}`);
      await helpers.waitForNetworkIdle();

      // 验证关键元素渲染
      await helpers.verifyElementExists('[data-testid="comment-content"]');
    });

    test('2.5 评论编辑和更新性能', async ({ page }) => {
      const requirementId = await requirementHelpers.createRequirement(
        '评论编辑测试',
        '测试评论编辑更新的性能',
        'medium'
      );

      // 创建初始评论
      await requirementHelpers.addComment(requirementId, '原始评论内容');

      await page.goto(`/requirements/${requirementId}`);
      await helpers.waitForNetworkIdle();

      // 点击编辑按钮
      await helpers.safeClick('[data-testid="edit-comment-button"]');

      // 修改评论内容
      const editInput = await helpers.waitAndGet('[data-testid="edit-comment-input"]');

      const startTime = Date.now();

      await editInput.clear();
      await editInput.fill('更新后的评论内容，包含更多文字来测试性能。'.repeat(5));

      // 保存更新
      await helpers.safeClick('[data-testid="save-comment-button"]');
      await helpers.waitForNetworkIdle();

      const updateTime = Date.now() - startTime;
      console.log(`评论更新响应时间: ${updateTime}ms`);

      // 验证更新时间
      expect(updateTime).toBeLessThan(1500);

      // 验证更新成功
      await helpers.verifyTextContent('[data-testid="comment-content"]', '更新后的评论内容');
    });

    test('2.6 评论删除性能', async ({ page }) => {
      const requirementId = await requirementHelpers.createRequirement(
        '评论删除测试',
        '测试评论删除的响应速度',
        'low'
      );

      // 创建多条评论
      for (let i = 1; i <= 5; i++) {
        await requirementHelpers.addComment(requirementId, `待删除评论 #${i}`);
      }

      await page.goto(`/requirements/${requirementId}`);
      await helpers.waitForNetworkIdle();

      const initialCount = await page.locator('[data-testid="comment-item"]').count();

      // 删除第一条评论
      const startTime = Date.now();

      await helpers.safeClick('[data-testid="delete-comment-button"]:first-child');
      await helpers.safeClick('[data-testid="confirm-delete-comment"]');
      await helpers.waitForNetworkIdle();

      const deleteTime = Date.now() - startTime;
      console.log(`评论删除响应时间: ${deleteTime}ms`);

      // 验证删除时间
      expect(deleteTime).toBeLessThan(1000);

      // 验证评论数量减少
      const newCount = await page.locator('[data-testid="comment-item"]').count();
      expect(newCount).toBe(initialCount - 1);
    });
  });

  test.describe('需求列表性能测试', () => {

    test('3.1 需求列表初始加载性能', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('/requirements');
      await helpers.waitForNetworkIdle();

      const loadTime = Date.now() - startTime;
      console.log(`需求列表页面加载时间: ${loadTime}ms`);

      // 验证加载时间
      expect(loadTime).toBeLessThan(3000);

      // 验证列表渲染
      await helpers.verifyElementExists('[data-testid="requirement-list"]');
    });

    test('3.2 需求筛选性能', async ({ page }) => {
      await page.goto('/requirements');
      await helpers.waitForNetworkIdle();

      // 测试状态筛选
      const startTime = Date.now();

      await helpers.safeClick('[data-testid="status-filter"]');
      await helpers.safeClick('[data-testid="status-option-draft"]');
      await helpers.waitForNetworkIdle();

      const filterTime = Date.now() - startTime;
      console.log(`筛选响应时间: ${filterTime}ms`);

      // 验证筛选性能
      expect(filterTime).toBeLessThan(1500);
    });

    test('3.3 需求搜索性能', async ({ page }) => {
      await page.goto('/requirements');
      await helpers.waitForNetworkIdle();

      const searchInput = await helpers.waitAndGet('[data-testid="requirement-search-input"]');

      // 测试不同长度的搜索词
      const searchTerms = ['test', 'testing', 'test requirement'];

      for (const term of searchTerms) {
        const startTime = Date.now();

        await searchInput.clear();
        await searchInput.fill(term);
        await helpers.waitForNetworkIdle();

        const searchTime = Date.now() - startTime;
        console.log(`搜索词 "${term}" 响应时间: ${searchTime}ms`);

        expect(searchTime).toBeLessThan(1000);
      }
    });

    test('3.4 需求列表滚动性能', async ({ page }) => {
      await page.goto('/requirements');
      await helpers.waitForNetworkIdle();

      // 测试滚动流畅度
      const scrollStart = Date.now();

      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });

      await page.waitForTimeout(200);

      const scrollTime = Date.now() - scrollStart;
      console.log(`滚动响应时间: ${scrollTime}ms`);

      expect(scrollTime).toBeLessThan(300);
    });
  });

  test.describe('内存和资源使用测试', () => {

    test('4.1 评论系统内存使用监控', async ({ page }) => {
      // 记录初始内存
      await performanceHelpers.verifyMemoryUsage();

      const requirementId = await requirementHelpers.createRequirement(
        '内存测试需求',
        '测试评论系统内存使用',
        'high'
      );

      // 添加大量评论
      for (let i = 1; i <= 20; i++) {
        await requirementHelpers.addComment(requirementId, `内存测试评论 #${i}`);

        if (i % 5 === 0) {
          await performanceHelpers.verifyMemoryUsage();
        }
      }

      // 导航到需求详情页
      await page.goto(`/requirements/${requirementId}`);
      await helpers.waitForNetworkIdle();

      // 检查最终内存
      await performanceHelpers.verifyMemoryUsage();
    });

    test('4.2 @提及功能内存泄漏检测', async ({ page }) => {
      const initialMemory = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
      });

      const requirementId = await requirementHelpers.createRequirement(
        '内存泄漏测试',
        '检测@提及功能是否有内存泄漏',
        'high'
      );

      await page.goto(`/requirements/${requirementId}`);
      await helpers.waitForNetworkIdle();

      const commentInput = await helpers.waitAndGet('[data-testid="comment-input"]');

      // 重复打开和关闭@提及下拉列表
      for (let i = 0; i < 10; i++) {
        await commentInput.clear();
        await commentInput.fill('@test');
        await page.waitForSelector('[data-testid="mention-dropdown"]');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(100);
      }

      // 强制垃圾回收
      await page.evaluate(() => {
        if (window.gc) {
          window.gc();
        }
      });

      await page.waitForTimeout(2000);

      // 检查最终内存
      const finalMemory = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
      });

      if (initialMemory > 0 && finalMemory > 0) {
        const memoryIncrease = finalMemory - initialMemory;
        const increasePercentage = (memoryIncrease / initialMemory) * 100;

        console.log(`内存增长: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB (${increasePercentage.toFixed(1)}%)`);

        // 验证内存增长不超过30%
        expect(increasePercentage).toBeLessThan(30);
      }
    });
  });
});
