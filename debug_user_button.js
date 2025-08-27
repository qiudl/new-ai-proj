// 调试用户管理页面按钮问题的脚本
const puppeteer = require('puppeteer');

async function debugUserButton() {
  console.log('启动浏览器...');
  const browser = await puppeteer.launch({ 
    headless: false,
    slowMo: 1000,
    devtools: true
  });
  
  try {
    const page = await browser.newPage();
    
    // 监听控制台错误
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('🚨 前端错误:', msg.text());
      }
    });
    
    page.on('pageerror', error => {
      console.log('🚨 页面错误:', error.message);
    });
    
    // 访问登录页面
    console.log('访问登录页面...');
    await page.goto('http://localhost:3001/login');
    await page.waitForSelector('input[name="username"]');
    
    // 登录
    console.log('尝试登录...');
    await page.type('input[name="username"]', 'admin');
    await page.type('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // 等待登录成功
    await page.waitForNavigation();
    console.log('登录成功，当前URL:', page.url());
    
    // 访问用户管理页面
    console.log('访问用户管理页面...');
    await page.goto('http://localhost:3001/user-management');
    await page.waitForSelector('.page-container', { timeout: 10000 });
    
    // 检查新建用户按钮
    console.log('检查新建用户按钮...');
    const createButton = await page.$('button:contains("新建用户")') || 
                        await page.$('[aria-label*="新建"]') ||
                        await page.$('.ant-btn:contains("新建")');
                        
    if (createButton) {
      console.log('✅ 找到新建用户按钮');
      
      // 检查按钮是否被禁用
      const isDisabled = await page.evaluate((btn) => {
        return btn.disabled || btn.hasAttribute('disabled');
      }, createButton);
      
      console.log('按钮状态 - 禁用:', isDisabled);
      
      // 检查按钮的点击事件
      console.log('点击新建用户按钮...');
      await createButton.click();
      
      // 等待模态框出现
      await page.waitForTimeout(2000);
      
      const modal = await page.$('.ant-modal');
      if (modal) {
        console.log('✅ 模态框已出现');
      } else {
        console.log('❌ 模态框未出现');
      }
      
    } else {
      console.log('❌ 未找到新建用户按钮');
      
      // 列出所有按钮
      const buttons = await page.$$eval('button', buttons => 
        buttons.map(btn => ({
          text: btn.textContent?.trim(),
          disabled: btn.disabled,
          className: btn.className
        }))
      );
      
      console.log('页面中的所有按钮:', buttons);
    }
    
  } catch (error) {
    console.error('调试过程中出错:', error);
  } finally {
    console.log('等待10秒后关闭浏览器...');
    await page.waitForTimeout(10000);
    await browser.close();
  }
}

// 检查是否安装了puppeteer
try {
  require.resolve('puppeteer');
  debugUserButton();
} catch (e) {
  console.log('请先安装puppeteer: npm install puppeteer');
  console.log('然后运行: node debug_user_button.js');
}
