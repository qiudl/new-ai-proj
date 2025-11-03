import { test, expect } from '@playwright/test';

/**
 * 企业模拟功能 E2E 测试
 * 测试系统管理员的企业模拟和退出功能
 */

test.describe('企业模拟功能测试', () => {
  let page;

  test.beforeEach(async ({ browser }) => {
    // 创建新的浏览器上下文和页面
    const context = await browser.newContext();
    page = await context.newPage();

    // 导航到登录页
    await page.goto('/');

    // 等待页面加载
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async () => {
    await page?.close();
  });

  test('完整流程：登录 → 企业模拟 → 退出模拟', async () => {
    console.log('📝 步骤1: 系统管理员登录');

    // 填写登录表单
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123'); // 请替换为实际密码

    // 点击登录按钮
    await page.click('button[type="submit"]');

    // 等待登录成功跳转
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // 截图：登录成功
    await page.screenshot({ path: 'playwright-report/01-login-success.png', fullPage: true });
    console.log('✅ 步骤1完成：登录成功');

    console.log('📝 步骤2: 开始企业模拟');

    // 查找企业模拟按钮
    const impersonateButton = page.locator('button:has-text("企业模拟")');
    await expect(impersonateButton).toBeVisible({ timeout: 5000 });

    // 点击企业模拟按钮
    await impersonateButton.click();

    // 等待模态框出现
    await page.waitForSelector('.ant-modal', { state: 'visible' });

    // 截图：企业模拟模态框
    await page.screenshot({ path: 'playwright-report/02-impersonate-modal.png', fullPage: true });

    // 选择企业（选择第一个企业）
    await page.click('.ant-select-selector');
    await page.waitForSelector('.ant-select-dropdown', { state: 'visible' });
    await page.click('.ant-select-item:first-child');

    // 填写模拟原因
    await page.fill('textarea[placeholder*="模拟原因"]', 'E2E自动化测试：验证企业模拟和退出功能是否正常工作');

    // 截图：填写完成
    await page.screenshot({ path: 'playwright-report/03-form-filled.png', fullPage: true });

    // 点击开始模拟按钮
    await page.click('button:has-text("开始模拟")');

    // 等待模拟成功
    await page.waitForTimeout(2000); // 等待API响应

    console.log('✅ 步骤2完成：企业模拟已启动');

    console.log('📝 步骤3: 验证模拟状态');

    // 验证警告横幅显示
    const warningBanner = page.locator('.impersonation-banner, .impersonation-warning');
    await expect(warningBanner).toBeVisible({ timeout: 5000 });

    // 验证横幅包含企业名称
    await expect(warningBanner).toContainText(/正在模拟|模拟中/);

    // 截图：模拟状态
    await page.screenshot({ path: 'playwright-report/04-impersonation-active.png', fullPage: true });
    console.log('✅ 步骤3完成：模拟状态已验证');

    console.log('📝 步骤4: 退出企业模拟');

    // 查找退出模拟按钮（可能在横幅或者卡片中）
    const exitButton = page.locator('button:has-text("退出模拟")');
    await expect(exitButton).toBeVisible({ timeout: 5000 });

    // 点击退出模拟按钮
    await exitButton.click();

    // 处理确认弹窗（如果有）
    try {
      await page.click('.ant-popconfirm button:has-text("确定"), .ant-modal button:has-text("确定"), .ant-modal button:has-text("退出")', { timeout: 2000 });
    } catch (e) {
      console.log('没有确认弹窗，或已自动确认');
    }

    // 等待退出完成
    await page.waitForTimeout(2000);

    console.log('✅ 步骤4完成：退出模拟命令已发送');

    console.log('📝 步骤5: 验证已退出模拟');

    // 验证警告横幅消失
    await expect(warningBanner).not.toBeVisible({ timeout: 5000 });

    // 验证企业模拟按钮重新出现
    await expect(impersonateButton).toBeVisible();

    // 截图：退出成功
    await page.screenshot({ path: 'playwright-report/05-exit-success.png', fullPage: true });

    console.log('✅ 步骤5完成：已成功退出模拟状态');
    console.log('🎉 所有测试步骤完成！');
  });

  test('测试：直接API验证退出模拟功能', async ({ request }) => {
    console.log('📝 API测试：验证退出模拟接口');

    // 1. 登录获取token
    const loginResponse = await request.post('http://localhost:8080/api/v1/auth/login', {
      data: {
        username: 'admin',
        password: 'admin123' // 请替换为实际密码
      }
    });

    expect(loginResponse.ok()).toBeTruthy();
    const loginData = await loginResponse.json();
    const token = loginData.data?.token;

    console.log('✅ 登录成功，获取到token');

    // 2. 获取企业列表 - 使用正确的API endpoint
    const enterprisesResponse = await request.get('http://localhost:8080/api/v1/system/enterprises?page=1&page_size=10', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    // 如果企业列表API失败，尝试使用已知的企业ID
    let firstEnterprise = null;
    if (enterprisesResponse.ok()) {
      const enterprisesData = await enterprisesResponse.json();
      firstEnterprise = enterprisesData.data?.data?.[0];
    }

    // 如果无法获取企业列表，使用已知的企业ID（通常有ID为3的测试企业）
    if (!firstEnterprise) {
      console.log('⚠️ 无法获取企业列表，使用已知企业ID: 3');
      firstEnterprise = { id: 3, name: '测试企业' };
    } else {
      console.log(`✅ 找到企业: ${firstEnterprise.name} (ID: ${firstEnterprise.id})`);
    }

    // 3. 开始模拟
    const startImpersonateResponse = await request.post(
      `http://localhost:8080/api/v1/admin/impersonate/enterprise/${firstEnterprise.id}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        data: {
          reason: 'API E2E自动化测试：验证退出模拟功能'
        }
      }
    );

    expect(startImpersonateResponse.ok()).toBeTruthy();
    const impersonateData = await startImpersonateResponse.json();
    const impersonateToken = impersonateData.data?.token;

    console.log('✅ 企业模拟已启动');

    // 4. 验证模拟状态
    const statusResponse = await request.get('http://localhost:8080/api/v1/admin/impersonate/status', {
      headers: {
        'Authorization': `Bearer ${impersonateToken}`
      }
    });

    expect(statusResponse.ok()).toBeTruthy();
    const statusData = await statusResponse.json();
    expect(statusData.data?.is_impersonating).toBe(true);

    console.log('✅ 模拟状态已验证：is_impersonating = true');

    // 5. 退出模拟（核心测试）
    const exitResponse = await request.post('http://localhost:8080/api/v1/admin/impersonate/exit', {
      headers: {
        'Authorization': `Bearer ${impersonateToken}`,
        'Content-Type': 'application/json'
      }
    });

    // 验证退出成功
    expect(exitResponse.ok()).toBeTruthy();
    const exitData = await exitResponse.json();
    expect(exitData.success).toBe(true);

    const originalToken = exitData.data?.token;
    expect(originalToken).toBeTruthy();

    console.log('✅ 退出模拟成功');

    // 6. 验证已退出模拟状态
    const finalStatusResponse = await request.get('http://localhost:8080/api/v1/admin/impersonate/status', {
      headers: {
        'Authorization': `Bearer ${originalToken}`
      }
    });

    expect(finalStatusResponse.ok()).toBeTruthy();
    const finalStatusData = await finalStatusResponse.json();
    expect(finalStatusData.data?.is_impersonating).toBe(false);

    console.log('✅ 验证完成：已退出模拟状态');
    console.log('🎉 API测试全部通过！');
  });
});
