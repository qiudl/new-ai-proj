// 简单的前端测试脚本
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // 监听控制台错误
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('❌ Console Error:', msg.text());
    }
  });
  
  // 监听页面错误
  page.on('pageerror', error => {
    console.log('❌ Page Error:', error.message);
  });
  
  try {
    console.log('🔍 Testing frontend at http://localhost:3001...');
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle2' });
    
    // 等待页面加载完成
    await page.waitForSelector('#root', { timeout: 10000 });
    
    console.log('✅ Frontend loaded successfully');
    
    // 检查是否有React组件加载
    const hasReactContent = await page.evaluate(() => {
      return document.querySelector('#root').children.length > 0;
    });
    
    if (hasReactContent) {
      console.log('✅ React components loaded');
    } else {
      console.log('❌ React components not loaded');
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
})();