#!/usr/bin/env node

const puppeteer = require('puppeteer');

async function debugTimeManagement() {
  let browser;
  try {
    console.log('启动浏览器...');
    browser = await puppeteer.launch({ 
      headless: false,
      defaultViewport: null,
      args: ['--disable-web-security', '--no-sandbox']
    });
    
    const page = await browser.newPage();
    
    // 监听控制台消息
    page.on('console', (msg) => {
      console.log(`CONSOLE ${msg.type().toUpperCase()}: ${msg.text()}`);
    });
    
    // 监听错误
    page.on('error', (err) => {
      console.log('PAGE ERROR:', err.message);
    });
    
    // 监听网络请求
    page.on('response', (response) => {
      if (response.status() >= 400) {
        console.log(`NETWORK ERROR: ${response.status()} ${response.url()}`);
      }
    });
    
    console.log('导航到时间管理页面...');
    await page.goto('http://localhost/time-management', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // 等待页面加载
    console.log('等待页面完全加载...');
    await page.waitForTimeout(5000);
    
    // 检查页面内容
    const title = await page.title();
    console.log('页面标题:', title);
    
    // 检查是否有错误消息
    const errorElements = await page.$$('[class*="error"], [class*="alert-error"]');
    console.log('错误元素数量:', errorElements.length);
    
    // 检查是否有空白内容
    const bodyText = await page.evaluate(() => document.body.textContent.trim());
    console.log('页面内容长度:', bodyText.length);
    console.log('页面内容前100字符:', bodyText.substring(0, 100));
    
    // 检查React根元素
    const rootElement = await page.$('#root');
    if (rootElement) {
      const rootContent = await page.evaluate((el) => el.innerHTML, rootElement);
      console.log('React根元素内容长度:', rootContent.length);
      if (rootContent.length < 100) {
        console.log('React根元素内容:', rootContent);
      }
    }
    
    // 检查是否有React错误边界
    const errorBoundary = await page.$('[class*="error-boundary"], [data-testid="error-boundary"]');
    if (errorBoundary) {
      console.log('发现错误边界元素');
      const errorText = await page.evaluate((el) => el.textContent, errorBoundary);
      console.log('错误边界内容:', errorText);
    }
    
    // 检查网络请求状态
    console.log('页面加载完成，检查可能的问题...');
    
    await page.waitForTimeout(3000);
    
  } catch (error) {
    console.error('调试过程中出错:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// 检查是否安装了puppeteer
try {
  require('puppeteer');
  debugTimeManagement();
} catch (error) {
  console.log('Puppeteer未安装，使用基础curl测试...');
  
  const { exec } = require('child_process');
  
  // 简单的curl测试
  exec('curl -s http://localhost/time-management | grep -o "title[^>]*>[^<]*" | head -5', (error, stdout, stderr) => {
    if (error) {
      console.error('Curl测试失败:', error);
      return;
    }
    console.log('页面标题信息:', stdout);
  });
  
  // 检查JavaScript bundle
  exec('curl -s http://localhost/static/js/bundle.js | head -c 100', (error, stdout, stderr) => {
    if (error) {
      console.error('JS Bundle检查失败:', error);
      return;
    }
    console.log('JavaScript Bundle前100字符:', stdout);
  });
}