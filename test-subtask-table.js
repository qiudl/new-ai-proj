#!/usr/bin/env node

/**
 * 测试子任务表格功能
 * 验证任务ID列和排序功能是否正常工作
 */

const puppeteer = require('puppeteer');

async function testSubTaskTable() {
  console.log('🚀 开始测试子任务表格功能...');
  
  let browser;
  try {
    browser = await puppeteer.launch({ 
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      slowMo: 500  // 减慢操作速度以便观察
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    // 1. 访问登录页面
    console.log('📝 访问登录页面...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
    
    // 2. 执行登录
    console.log('🔐 执行登录...');
    await page.type('#username', 'admin');
    await page.type('#password', 'admin123');
    await page.click('button[type="submit"]');
    
    // 等待登录完成并跳转
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    console.log('✅ 登录成功');
    
    // 3. 导航到一个有子任务的任务详情页
    console.log('📄 寻找有子任务的任务...');
    
    // 先去项目列表找项目
    await page.goto('http://localhost:3000/projects', { waitUntil: 'networkidle2' });
    
    // 点击第一个项目
    const firstProject = await page.$('.ant-card');
    if (firstProject) {
      await firstProject.click();
      await page.waitForNavigation({ waitUntil: 'networkidle2' });
      console.log('✅ 进入项目详情页');
      
      // 查找有子任务的任务
      const taskLinks = await page.$$('a[href*="/tasks/"]');
      if (taskLinks.length > 0) {
        console.log(`📋 找到 ${taskLinks.length} 个任务，尝试进入第一个任务详情页`);
        await taskLinks[0].click();
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        
        // 4. 检查子任务表格
        console.log('🔍 检查子任务表格...');
        
        // 等待表格加载
        await page.waitForSelector('.ant-table', { timeout: 10000 });
        
        // 检查是否有任务ID列
        const idColumnExists = await page.$('.ant-table-thead th:first-child');
        if (idColumnExists) {
          const columnText = await page.evaluate(el => el.textContent, idColumnExists);
          console.log(`📊 第一列标题: "${columnText}"`);
          
          if (columnText.includes('任务ID') || columnText.includes('ID')) {
            console.log('✅ 任务ID列已成功添加');
            
            // 检查排序功能
            const sortButton = await page.$('.ant-table-thead th:first-child .ant-table-column-sorter');
            if (sortButton) {
              console.log('✅ 任务ID列支持排序');
              
              // 测试点击排序
              await sortButton.click();
              await page.waitForTimeout(1000);
              console.log('🔄 执行了排序操作');
              
              // 检查其他列的排序
              const columns = await page.$$('.ant-table-thead th .ant-table-column-sorter');
              console.log(`📊 共找到 ${columns.length} 个可排序列`);
              
            } else {
              console.log('⚠️  任务ID列不支持排序');
            }
          } else {
            console.log('❌ 任务ID列未找到或标题不正确');
          }
        } else {
          console.log('❌ 表格列未找到');
        }
        
        // 5. 检查表格数据
        const tableRows = await page.$$('.ant-table-tbody tr');
        console.log(`📋 子任务表格有 ${tableRows.length} 行数据`);
        
        if (tableRows.length > 0) {
          // 获取第一行的数据
          const firstRowCells = await page.$$eval(
            '.ant-table-tbody tr:first-child td', 
            cells => cells.map(cell => cell.textContent.trim())
          );
          console.log('📊 第一行数据:', firstRowCells);
          
          // 检查第一列是否是ID格式
          if (firstRowCells[0] && firstRowCells[0].startsWith('#')) {
            console.log('✅ 第一列显示任务ID格式正确');
          } else {
            console.log('⚠️  第一列任务ID格式可能不正确:', firstRowCells[0]);
          }
        }
        
      } else {
        console.log('⚠️  项目中没有找到任务');
      }
    } else {
      console.log('⚠️  没有找到项目');
    }
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// 检查puppeteer是否安装
async function checkPuppeteer() {
  try {
    require('puppeteer');
    return true;
  } catch (e) {
    console.log('⚠️  Puppeteer未安装，将安装...');
    const { execSync } = require('child_process');
    try {
      execSync('npm install puppeteer', { stdio: 'inherit' });
      return true;
    } catch (installError) {
      console.error('❌ 安装Puppeteer失败:', installError.message);
      return false;
    }
  }
}

async function main() {
  console.log('🧪 子任务表格功能测试工具');
  console.log('===========================');
  
  const puppeteerAvailable = await checkPuppeteer();
  if (!puppeteerAvailable) {
    console.log('❌ 无法使用Puppeteer进行自动化测试');
    console.log('🔧 请手动验证以下内容：');
    console.log('   1. 访问 http://localhost:3000');
    console.log('   2. 登录后进入任何一个任务详情页');
    console.log('   3. 检查子任务表格第一列是否为"任务ID"');
    console.log('   4. 检查各列是否支持排序（列标题有排序图标）');
    return;
  }
  
  await testSubTaskTable();
  console.log('🎉 测试完成！');
}

if (require.main === module) {
  main().catch(console.error);
}
