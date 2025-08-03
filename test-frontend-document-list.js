const puppeteer = require('puppeteer');

(async () => {
  console.log('🚀 启动前端任务文档列表页面测试...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // 设置认证token
    await page.evaluateOnNewDocument(() => {
      localStorage.setItem('token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwidXNlcl90eXBlIjoic3lzdGVtIiwic3ViIjoiYWRtaW4iLCJleHAiOjE3NTQ3NTAyMzAsIm5iZiI6MTc1NDE0NTQzMCwiaWF0IjoxNzU0MTQ1NDMwfQ.CyLdl6bzk4adghg_Yg5yAYZE_MV-O3zF8vsp9OaFQ5Y');
    });
    
    // 监听控制台日志
    page.on('console', (msg) => {
      console.log('📝 Console:', msg.text());
    });
    
    // 监听网络请求
    page.on('response', (response) => {
      if (response.url().includes('documents')) {
        console.log(`🌐 API调用: ${response.status()} ${response.url()}`);
      }
    });
    
    // 访问任务文档列表页面
    console.log('📱 访问 /task-documents 页面...');
    await page.goto('http://localhost/task-documents', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // 等待页面加载
    await page.waitForTimeout(5000);
    
    // 检查页面标题
    const title = await page.title();
    console.log(`📄 页面标题: ${title}`);
    
    // 检查是否有任务文档管理标题
    const hasTitle = await page.evaluate(() => {
      return document.body.innerText.includes('任务文档管理');
    });
    console.log(`📋 任务文档管理标题: ${hasTitle ? '✅ 存在' : '❌ 不存在'}`);
    
    // 检查是否有统计卡片
    const hasStats = await page.evaluate(() => {
      return document.body.innerText.includes('总任务数') && 
             document.body.innerText.includes('有文档任务') && 
             document.body.innerText.includes('无文档任务');
    });
    console.log(`📊 统计卡片: ${hasStats ? '✅ 存在' : '❌ 不存在'}`);
    
    // 检查是否有任务表格
    const hasTable = await page.evaluate(() => {
      return document.querySelectorAll('table').length > 0;
    });
    console.log(`📋 任务表格: ${hasTable ? '✅ 存在' : '❌ 不存在'}`);
    
    // 检查是否有文档状态列
    const hasDocumentStatus = await page.evaluate(() => {
      return document.body.innerText.includes('文档状态');
    });
    console.log(`📄 文档状态列: ${hasDocumentStatus ? '✅ 存在' : '❌ 不存在'}`);
    
    // 获取页面错误
    const errors = await page.evaluate(() => {
      const errors = window.console && window.console.errors ? window.console.errors : [];
      return errors;
    });
    
    if (errors.length > 0) {
      console.log('❌ JavaScript错误:');
      errors.forEach(error => console.log('  -', error));
    } else {
      console.log('✅ 无JavaScript错误');
    }
    
    console.log('🎉 测试完成');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  } finally {
    await browser.close();
  }
})();