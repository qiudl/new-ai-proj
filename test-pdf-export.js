#!/usr/bin/env node

/**
 * PDF导出功能测试脚本
 * 用于检查PDF生成是否正常工作
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function testPDFExport() {
  console.log('🔍 开始测试PDF导出功能...');
  
  let browser;
  try {
    // 启动浏览器
    browser = await puppeteer.launch({
      headless: false,
      devtools: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // 监听控制台输出
    page.on('console', msg => {
      console.log(`📋 Console: ${msg.text()}`);
    });
    
    // 监听网络错误
    page.on('requestfailed', request => {
      console.log(`❌ Network Error: ${request.url()} - ${request.failure().errorText}`);
    });
    
    // 访问时间周报页面
    console.log('📱 访问时间周报页面...');
    await page.goto('http://localhost:3001/time-reports', { 
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    // 等待页面加载
    await page.waitForTimeout(3000);
    
    // 查找导出按钮
    console.log('🔍 查找导出按钮...');
    const exportButton = await page.$('button[icon="download"]');
    
    if (!exportButton) {
      console.log('❌ 找不到导出按钮，尝试查找其他可能的导出按钮...');
      const buttons = await page.$$eval('button', buttons => 
        buttons.map(btn => ({
          text: btn.textContent,
          className: btn.className
        })).filter(btn => 
          btn.text.includes('导出') || 
          btn.text.includes('Export') ||
          btn.className.includes('export')
        )
      );
      console.log('找到的相关按钮:', buttons);
      return;
    }
    
    // 点击导出按钮
    console.log('🖱️ 点击导出按钮...');
    await exportButton.click();
    
    // 等待模态框出现
    await page.waitForTimeout(2000);
    
    // 查找PDF格式选择
    console.log('🔍 选择PDF格式...');
    const pdfFormatCard = await page.$('div[data-format="pdf"], .pdf-format, [title*="PDF"], [title*="pdf"]');
    
    if (pdfFormatCard) {
      await pdfFormatCard.click();
      await page.waitForTimeout(1000);
    }
    
    // 查找确认导出按钮
    console.log('🔍 查找确认导出按钮...');
    const confirmExportButton = await page.$('button:has-text("导出"), button:has-text("Export")');
    
    if (confirmExportButton) {
      // 监听下载事件
      let downloadStarted = false;
      
      page.on('response', async response => {
        const url = response.url();
        if (url.includes('.pdf') || response.headers()['content-type']?.includes('application/pdf')) {
          console.log('📥 检测到PDF下载:', url);
          downloadStarted = true;
        }
      });
      
      console.log('🖱️ 点击确认导出...');
      await confirmExportButton.click();
      
      // 等待导出完成
      await page.waitForTimeout(5000);
      
      if (downloadStarted) {
        console.log('✅ PDF导出已开始');
      } else {
        console.log('❌ 未检测到PDF下载');
        
        // 检查是否有错误信息
        const errorMessages = await page.$$eval('.ant-message-error, .error-message, .ant-notification-notice-error', 
          elements => elements.map(el => el.textContent)
        );
        
        if (errorMessages.length > 0) {
          console.log('🚨 发现错误信息:', errorMessages);
        }
      }
    } else {
      console.log('❌ 找不到确认导出按钮');
    }
    
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// 检查依赖
if (require.main === module) {
  // 检查是否安装了puppeteer
  try {
    require('puppeteer');
    testPDFExport();
  } catch (error) {
    console.log('❌ 请先安装puppeteer: npm install puppeteer');
    console.log('或者手动测试PDF导出功能：');
    console.log('1. 访问 http://localhost:3001/time-reports');
    console.log('2. 点击导出按钮');
    console.log('3. 选择PDF格式');
    console.log('4. 确认导出');
    console.log('5. 检查下载的PDF文件是否有内容');
  }
}