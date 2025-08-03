const { chromium } = require('@playwright/test');

/**
 * 全局测试设置
 * 在所有测试开始前执行一次
 */
async function globalSetup() {
  console.log('🚀 开始全局测试设置...');
  
  // 验证测试环境
  console.log('📋 验证测试环境:');
  console.log(`   - 基础URL: ${process.env.BASE_URL || 'http://localhost'}`);
  console.log(`   - 浏览器: Chromium`);
  console.log(`   - 测试模式: ${process.env.CI ? 'CI' : '本地开发'}`);
  
  // 可选: 预热应用或执行其他准备工作
  try {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    // 检查应用是否可访问
    console.log('🔍 检查应用可访问性...');
    await page.goto(process.env.BASE_URL || 'http://localhost', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    console.log('✅ 应用可访问性检查通过');
    
    await browser.close();
  } catch (error) {
    console.error('❌ 全局设置失败:', error);
    throw error;
  }
  
  console.log('✅ 全局测试设置完成');
}

module.exports = globalSetup;