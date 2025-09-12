import { chromium, FullConfig } from '@playwright/test';

/**
 * 全局测试环境设置
 * 在所有测试运行前执行一次
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 开始E2E测试环境设置...');

  // 创建浏览器实例用于认证
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 获取基础URL
    const baseURL = config.projects[0].use.baseURL || 'http://localhost:3000';
    
    // 检查应用是否启动
    await page.goto(baseURL);
    await page.waitForSelector('body', { timeout: 30000 });
    
    console.log('✅ 应用服务已启动');

    // 执行管理员登录获取认证令牌
    try {
      await page.goto(`${baseURL}/login`);
      
      // 等待登录页面加载
      await page.waitForSelector('[data-testid="login-form"]', { timeout: 10000 });
      
      // 使用开发环境快速登录（如果可用）
      const quickLoginBtn = page.locator('[data-testid="dev-quick-login"]');
      if (await quickLoginBtn.isVisible()) {
        await quickLoginBtn.click();
        await page.waitForURL('**/dashboard', { timeout: 10000 });
        console.log('✅ 开发环境快速登录成功');
      } else {
        // 常规登录流程
        await page.fill('[data-testid="username-input"]', 'admin');
        await page.fill('[data-testid="password-input"]', 'admin123');
        await page.click('[data-testid="login-button"]');
        await page.waitForURL('**/dashboard', { timeout: 15000 });
        console.log('✅ 管理员登录成功');
      }

      // 保存认证状态
      const storageState = await context.storageState();
      await page.context().storageState({ 
        path: 'e2e/auth/admin-storage-state.json' 
      });
      
      console.log('✅ 认证状态已保存');

    } catch (loginError) {
      console.warn('⚠️ 登录失败，将使用匿名测试模式:', loginError);
    }

  } catch (setupError) {
    console.error('❌ 全局设置失败:', setupError);
    throw setupError;
  } finally {
    await context.close();
    await browser.close();
  }

  console.log('🎉 E2E测试环境设置完成');
}

export default globalSetup;