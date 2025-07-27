#!/usr/bin/env node

const puppeteer = require('puppeteer');

async function testDashboard() {
  console.log('🔍 测试 Dashboard 页面 react-grid-layout 修复...');
  
  let browser;
  try {
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // 监听控制台消息
    const consoleMessages = [];
    page.on('console', (msg) => {
      const text = msg.text();
      consoleMessages.push(text);
      if (text.includes('react-grid-layout')) {
        console.log('📝 控制台消息:', text);
      }
    });
    
    // 监听错误
    const errors = [];
    page.on('error', (error) => {
      errors.push(error.message);
      console.log('❌ 页面错误:', error.message);
    });
    
    page.on('pageerror', (error) => {
      errors.push(error.message);
      console.log('❌ 页面错误:', error.message);
    });
    
    console.log('📡 导航到仪表板页面...');
    await page.goto('http://localhost:3000', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // 等待一点时间让 React 应用加载
    await page.waitForTimeout(3000);
    
    // 检查是否有 react-grid-layout 错误
    const hasGridLayoutError = consoleMessages.some(msg => 
      msg.includes('Failed to load react-grid-layout') || 
      msg.includes('Cannot find module \'react-grid-layout\'')
    );
    
    // 检查页面是否成功渲染
    const dashboardElements = await page.$$('.dashboard-grid-layout, .dashboard-fallback-layout');
    
    console.log('\n📊 测试结果:');
    console.log(`✅ 页面加载成功: ${errors.length === 0 ? '是' : '否'}`);
    console.log(`✅ 网格布局组件存在: ${dashboardElements.length > 0 ? '是' : '否'}`);
    console.log(`✅ 无 react-grid-layout 错误: ${!hasGridLayoutError ? '是' : '否'}`);
    
    if (errors.length > 0) {
      console.log('\n❌ 发现的错误:');
      errors.forEach(error => console.log(`   - ${error}`));
    }
    
    if (hasGridLayoutError) {
      console.log('\n❌ react-grid-layout 相关错误:');
      consoleMessages
        .filter(msg => msg.includes('react-grid-layout'))
        .forEach(msg => console.log(`   - ${msg}`));
    }
    
    const success = errors.length === 0 && dashboardElements.length > 0 && !hasGridLayoutError;
    
    console.log(`\n${success ? '🎉' : '💥'} 总体结果: ${success ? '修复成功' : '仍有问题'}`);
    
    return success;
    
  } catch (error) {
    console.error('❌ 测试过程中出错:', error.message);
    return false;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// 运行测试
testDashboard().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ 测试失败:', error);
  process.exit(1);
});
