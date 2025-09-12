import { test, expect } from '@playwright/test';
import { TestHelpers, ImpersonationTestHelpers } from './utils/test-helpers';

/**
 * 企业用户模拟功能 E2E 测试
 * 测试完整的模拟流程和用户交互
 */

test.describe('企业用户模拟功能', () => {
  let helpers: TestHelpers;
  let impersonationHelpers: ImpersonationTestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    impersonationHelpers = new ImpersonationTestHelpers(page);
    
    // 使用管理员身份认证
    await page.goto('/');
    
    // 如果需要登录，执行登录流程
    const loginForm = page.locator('[data-testid="login-form"]');
    if (await loginForm.isVisible()) {
      await helpers.safeFill('[data-testid="username-input"]', 'admin');
      await helpers.safeFill('[data-testid="password-input"]', 'admin123');
      await helpers.safeClick('[data-testid="login-button"]');
      await helpers.verifyUrlContains('/dashboard');
    }
  });

  test('管理员可以开始企业模拟', async ({ page }) => {
    // 导航到企业管理页面
    await page.goto('/admin/enterprises');
    await helpers.waitForNetworkIdle();

    // 验证页面加载
    await helpers.verifyPageTitle('企业管理');
    await helpers.verifyElementExists('[data-testid="enterprise-list"]');

    // 选择第一个企业进行模拟
    const firstEnterprise = page.locator('[data-testid^="enterprise-row-"]:first-child');
    await expect(firstEnterprise).toBeVisible();

    // 点击模拟按钮
    await firstEnterprise.locator('[data-testid="impersonate-button"]').click();

    // 填写模拟原因
    await helpers.verifyElementExists('[data-testid="impersonation-modal"]');
    await helpers.safeFill('[data-testid="impersonation-reason"]', 'E2E测试模拟操作');
    
    // 确认开始模拟
    await helpers.safeClick('[data-testid="confirm-impersonation"]');

    // 验证模拟开始成功
    await helpers.verifyElementExists('[data-testid="impersonation-warning-banner"]');
    await helpers.verifyTextContent('[data-testid="impersonation-banner-text"]', '正在模拟企业');
    
    // 验证URL重定向到企业视图
    await helpers.verifyUrlContains('/dashboard');
  });

  test('模拟状态横幅显示正确信息', async ({ page }) => {
    // 开始模拟
    await impersonationHelpers.startImpersonation(1, 'E2E测试模拟状态显示');

    // 验证横幅显示
    const banner = page.locator('[data-testid="impersonation-warning-banner"]');
    await expect(banner).toBeVisible();

    // 验证横幅包含关键信息
    await expect(banner).toContainText('正在模拟企业');
    await expect(banner).toContainText('E2E测试模拟状态显示');
    
    // 验证倒计时显示
    const timer = banner.locator('[data-testid="impersonation-timer"]');
    await expect(timer).toBeVisible();
    
    // 验证进度条
    const progressBar = banner.locator('[data-testid="impersonation-progress"]');
    await expect(progressBar).toBeVisible();

    // 验证退出按钮
    const exitButton = banner.locator('[data-testid="exit-impersonation-button"]');
    await expect(exitButton).toBeVisible();
    await expect(exitButton).toBeEnabled();
  });

  test('可以成功退出模拟状态', async ({ page }) => {
    // 先开始模拟
    await impersonationHelpers.startImpersonation(1, 'E2E测试退出模拟');
    
    // 验证模拟状态
    await helpers.verifyElementExists('[data-testid="impersonation-warning-banner"]');

    // 点击退出按钮
    await helpers.safeClick('[data-testid="exit-impersonation-button"]');

    // 确认退出
    await helpers.verifyElementExists('[data-testid="exit-confirmation-modal"]');
    await helpers.safeClick('[data-testid="confirm-exit-impersonation"]');

    // 验证退出成功
    await helpers.verifyElementNotExists('[data-testid="impersonation-warning-banner"]');
    
    // 验证重定向到管理员视图
    await helpers.verifyUrlContains('/admin');
  });

  test('模拟期间权限受到正确限制', async ({ page }) => {
    // 开始模拟
    await impersonationHelpers.startImpersonation(1, 'E2E测试权限限制');

    // 验证权限限制
    await impersonationHelpers.verifyPermissionRestrictions();

    // 尝试访问受限功能
    await page.goto('/admin/users');
    
    // 验证敏感操作按钮被禁用或隐藏
    const deleteButtons = page.locator('[data-testid="delete-user-button"]');
    const count = await deleteButtons.count();
    
    for (let i = 0; i < count; i++) {
      const button = deleteButtons.nth(i);
      if (await button.isVisible()) {
        await expect(button).toBeDisabled();
      }
    }
  });

  test('企业切换器正常工作', async ({ page }) => {
    // 开始模拟
    await impersonationHelpers.startImpersonation(1, 'E2E测试企业切换');

    // 打开企业切换器
    await helpers.safeClick('[data-testid="enterprise-switcher-trigger"]');
    await helpers.verifyElementExists('[data-testid="enterprise-switcher-dropdown"]');

    // 验证当前企业高亮显示
    const currentEnterprise = page.locator('[data-testid="current-enterprise-item"]');
    await expect(currentEnterprise).toHaveClass(/highlighted|active|current/);

    // 搜索其他企业
    await helpers.safeFill('[data-testid="enterprise-search-input"]', '测试企业');
    await helpers.waitForNetworkIdle();

    // 验证搜索结果
    const searchResults = page.locator('[data-testid^="enterprise-option-"]');
    await expect(searchResults.first()).toBeVisible();

    // 选择其他企业（如果有的话）
    const otherEnterprise = searchResults.nth(1);
    if (await otherEnterprise.isVisible()) {
      await otherEnterprise.click();
      
      // 验证切换成功
      await helpers.verifyTextContent('[data-testid="impersonation-banner-text"]', '正在模拟企业');
    }
  });

  test('模拟会话自动过期', async ({ page }) => {
    // 开始模拟
    await impersonationHelpers.startImpersonation(1, 'E2E测试会话过期');

    // 验证模拟状态
    await helpers.verifyElementExists('[data-testid="impersonation-warning-banner"]');

    // 模拟会话过期（修改localStorage中的过期时间）
    await page.evaluate(() => {
      const pastTime = Date.now() - 1000; // 设置为已过期
      localStorage.setItem('impersonation_session_expires', pastTime.toString());
    });

    // 刷新页面触发会话检查
    await page.reload();
    await helpers.waitForNetworkIdle();

    // 验证自动退出模拟
    await helpers.verifyElementNotExists('[data-testid="impersonation-warning-banner"]');
  });

  test('模拟历史记录正确显示', async ({ page }) => {
    // 执行几次模拟操作
    await impersonationHelpers.startImpersonation(1, 'E2E测试历史记录1');
    await impersonationHelpers.exitImpersonation();
    
    await impersonationHelpers.startImpersonation(2, 'E2E测试历史记录2');  
    await impersonationHelpers.exitImpersonation();

    // 导航到模拟历史页面
    await page.goto('/admin/impersonation/history');
    await helpers.waitForNetworkIdle();

    // 验证历史记录列表
    await helpers.verifyElementExists('[data-testid="impersonation-history-table"]');
    
    // 验证记录包含我们刚才的操作
    await helpers.verifyTextContent('[data-testid="history-reason-0"]', 'E2E测试历史记录2');
    await helpers.verifyTextContent('[data-testid="history-action-0"]', 'start');

    // 测试分页功能
    const nextPageButton = page.locator('[data-testid="history-pagination-next"]');
    if (await nextPageButton.isEnabled()) {
      await nextPageButton.click();
      await helpers.waitForNetworkIdle();
    }

    // 测试筛选功能
    await helpers.safeFill('[data-testid="history-search-input"]', 'E2E测试');
    await helpers.waitForNetworkIdle();
    
    // 验证搜索结果
    const filteredResults = page.locator('[data-testid^="history-row-"]');
    const count = await filteredResults.count();
    expect(count).toBeGreaterThan(0);
  });

  test('错误状态正确处理', async ({ page }) => {
    // 模拟网络错误
    await page.route('**/api/v1/admin/impersonate/**', route => {
      route.fulfill({ status: 500, body: '服务器错误' });
    });

    // 尝试开始模拟
    await page.goto('/admin/enterprises');
    await helpers.waitForNetworkIdle();

    const firstEnterprise = page.locator('[data-testid^="enterprise-row-"]:first-child');
    await firstEnterprise.locator('[data-testid="impersonate-button"]').click();

    await helpers.safeFill('[data-testid="impersonation-reason"]', 'E2E测试错误处理');
    await helpers.safeClick('[data-testid="confirm-impersonation"]');

    // 验证错误信息显示
    await helpers.verifyElementExists('[data-testid="error-notification"]');
    await helpers.verifyTextContent('[data-testid="error-message"]', '服务器错误');

    // 验证模拟状态未改变
    await helpers.verifyElementNotExists('[data-testid="impersonation-warning-banner"]');
  });

  test('响应式设计在移动端正常工作', async ({ page, isMobile }) => {
    test.skip(!isMobile, '此测试仅在移动设备上运行');

    // 开始模拟
    await impersonationHelpers.startImpersonation(1, 'E2E测试移动端响应');

    // 验证移动端横幅显示
    const banner = page.locator('[data-testid="impersonation-warning-banner"]');
    await expect(banner).toBeVisible();

    // 验证移动端布局调整
    const mobileLayout = banner.locator('[data-testid="mobile-impersonation-layout"]');
    await expect(mobileLayout).toBeVisible();

    // 验证企业切换器在移动端的表现
    await helpers.safeClick('[data-testid="enterprise-switcher-trigger"]');
    const dropdown = page.locator('[data-testid="enterprise-switcher-dropdown"]');
    await expect(dropdown).toBeVisible();

    // 验证移动端特定的交互方式
    await page.touchscreen.tap(100, 100); // 点击空白区域关闭下拉菜单
    await expect(dropdown).not.toBeVisible();
  });
});

test.describe('模拟功能可访问性测试', () => {
  test('键盘导航正常工作', async ({ page }) => {
    const helpers = new TestHelpers(page);
    
    await page.goto('/admin/enterprises');
    await helpers.waitForNetworkIdle();

    // 测试Tab键导航
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // 验证焦点在模拟按钮上
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toHaveAttribute('data-testid', 'impersonate-button');

    // 使用Enter键激活
    await page.keyboard.press('Enter');
    
    // 验证模拟对话框打开
    await helpers.verifyElementExists('[data-testid="impersonation-modal"]');

    // 测试Escape键关闭
    await page.keyboard.press('Escape');
    await helpers.verifyElementNotExists('[data-testid="impersonation-modal"]');
  });

  test('屏幕阅读器支持', async ({ page }) => {
    const helpers = new TestHelpers(page);
    const impersonationHelpers = new ImpersonationTestHelpers(page);

    // 开始模拟
    await impersonationHelpers.startImpersonation(1, 'E2E测试可访问性');

    // 验证ARIA标签
    const banner = page.locator('[data-testid="impersonation-warning-banner"]');
    await expect(banner).toHaveAttribute('role', 'banner');
    await expect(banner).toHaveAttribute('aria-live', 'polite');
    
    // 验证按钮有正确的aria-label
    const exitButton = page.locator('[data-testid="exit-impersonation-button"]');
    await expect(exitButton).toHaveAttribute('aria-label', /退出.*模拟/);

    // 验证表单字段有正确的标签
    await helpers.safeClick('[data-testid="enterprise-switcher-trigger"]');
    const searchInput = page.locator('[data-testid="enterprise-search-input"]');
    await expect(searchInput).toHaveAttribute('aria-label', /搜索.*企业/);
  });
});