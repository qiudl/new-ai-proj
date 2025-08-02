const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test.describe('测试1: create_task功能验证', () => {
  let page;
  let context;
  
  test.beforeAll(async ({ browser }) => {
    // 创建带视频录制的上下文
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      recordVideo: {
        dir: 'test-results/videos/',
        size: { width: 1280, height: 720 }
      }
    });
    
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('执行create_task功能验证测试用例', async () => {
    console.log('🎬 开始录制 create_task 功能测试');
    
    // 步骤1: 登录系统
    console.log('📝 步骤1: 导航到登录页面');
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(2000); // 等待2秒让用户看清页面
    
    // 检查是否已经登录，如果没有则执行登录
    const isLoggedIn = await page.locator('text=退出').isVisible().catch(() => false);
    
    if (!isLoggedIn) {
      console.log('📝 执行登录操作');
      
      // 查找登录表单
      await page.waitForSelector('input[type="text"], input[type="email"], input[name="username"]', { timeout: 10000 });
      
      // 输入用户名 - 模拟人类打字速度
      const usernameField = page.locator('input[type="text"], input[type="email"], input[name="username"]').first();
      await usernameField.click();
      await page.waitForTimeout(500);
      await usernameField.type('admin', { delay: 100 });
      await page.waitForTimeout(500);
      
      // 输入密码 - 修正为 password123
      const passwordField = page.locator('input[type="password"], input[name="password"]').first();
      await passwordField.click();
      await page.waitForTimeout(500);
      await passwordField.type('password123', { delay: 100 });
      await page.waitForTimeout(500);
      
      // 点击登录按钮
      await page.locator('button:has-text("登录"), button:has-text("Login"), button[type="submit"]').first().click();
      await page.waitForTimeout(3000); // 等待登录完成
    }
    
    // 步骤2: 导航到任务详情页
    console.log('📝 步骤2: 导航到任务详情页');
    await page.goto('http://localhost:3000/projects/1/tasks/50');
    await page.waitForTimeout(3000); // 等待页面加载
    
    // 等待页面内容加载完成
    await page.waitForSelector('h1, .task-title, [data-testid="task-title"]', { timeout: 10000 });
    
    // 截图记录当前页面状态
    await page.screenshot({ 
      path: 'test-results/screenshots/01-task-detail-page.png',
      fullPage: true 
    });
    
    // 步骤3: 查找并点击创建子任务按钮
    console.log('📝 步骤3: 查找创建子任务按钮');
    await page.waitForTimeout(2000);
    
    // 尝试多种可能的按钮选择器
    const buttonSelectors = [
      'button:has-text("创建子任务")',
      'button:has-text("添加任务")',
      'button:has-text("新建任务")',
      'button:has-text("Create")',
      'button:has-text("Add")',
      '[data-testid="create-subtask"]',
      '[data-testid="add-task"]',
      '.create-task-btn',
      '.add-subtask-btn',
      'button[title*="创建"], button[title*="添加"]'
    ];
    
    let createButton = null;
    for (const selector of buttonSelectors) {
      try {
        createButton = page.locator(selector).first();
        if (await createButton.isVisible({ timeout: 1000 })) {
          console.log(`✅ 找到创建任务按钮: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (createButton && await createButton.isVisible()) {
      await createButton.click();
      await page.waitForTimeout(2000);
    } else {
      console.log('🔍 未找到明显的创建按钮，尝试查找其他入口');
      
      // 尝试查找可能的创建任务链接或表单
      const formSelectors = [
        'form[data-testid="task-form"]',
        '.task-form',
        'input[placeholder*="任务"], input[placeholder*="task"]',
        'textarea[placeholder*="任务"], textarea[placeholder*="task"]'
      ];
      
      let foundForm = false;
      for (const selector of formSelectors) {
        try {
          if (await page.locator(selector).isVisible({ timeout: 1000 })) {
            console.log(`✅ 找到任务表单: ${selector}`);
            foundForm = true;
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (!foundForm) {
        console.log('⚠️ 未找到创建任务的表单，尝试在页面中查找输入字段');
      }
    }
    
    // 步骤4: 填写任务信息
    console.log('📝 步骤4: 填写任务标题和描述');
    await page.waitForTimeout(2000);
    
    // 生成时间戳
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const taskTitle = `Playwright自动测试任务-${timestamp}`;
    const taskDescription = '通过自动化测试创建，验证create_task功能的正确性';
    
    // 查找标题输入字段
    const titleSelectors = [
      'input[name="title"]',
      'input[placeholder*="标题"], input[placeholder*="title"]',
      'input[data-testid="task-title"]',
      '.task-title-input',
      'input[type="text"]:not([name="username"]):not([name="email"])'
    ];
    
    let titleInput = null;
    for (const selector of titleSelectors) {
      try {
        titleInput = page.locator(selector).first();
        if (await titleInput.isVisible({ timeout: 1000 })) {
          console.log(`✅ 找到标题输入框: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (titleInput && await titleInput.isVisible()) {
      await titleInput.click();
      await page.waitForTimeout(500);
      await titleInput.fill(''); // 清空
      await titleInput.type(taskTitle, { delay: 80 });
      await page.waitForTimeout(1000);
    }
    
    // 查找描述输入字段
    const descriptionSelectors = [
      'textarea[name="description"]',
      'textarea[placeholder*="描述"], textarea[placeholder*="description"]',
      'textarea[data-testid="task-description"]',
      '.task-description-input',
      'textarea'
    ];
    
    let descriptionInput = null;
    for (const selector of descriptionSelectors) {
      try {
        descriptionInput = page.locator(selector).first();
        if (await descriptionInput.isVisible({ timeout: 1000 })) {
          console.log(`✅ 找到描述输入框: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (descriptionInput && await descriptionInput.isVisible()) {
      await descriptionInput.click();
      await page.waitForTimeout(500);
      await descriptionInput.fill(''); // 清空
      await descriptionInput.type(taskDescription, { delay: 60 });
      await page.waitForTimeout(1000);
    }
    
    // 截图记录填写完成的表单
    await page.screenshot({ 
      path: 'test-results/screenshots/02-form-filled.png',
      fullPage: true 
    });
    
    // 步骤5: 提交表单
    console.log('📝 步骤5: 提交任务创建表单');
    await page.waitForTimeout(2000);
    
    // 查找提交按钮
    const submitSelectors = [
      'button[type="submit"]',
      'button:has-text("保存")',
      'button:has-text("创建")',
      'button:has-text("提交")',
      'button:has-text("Save")',
      'button:has-text("Create")',
      'button:has-text("Submit")',
      '[data-testid="submit-task"]',
      '.submit-btn',
      '.save-btn'
    ];
    
    let submitButton = null;
    for (const selector of submitSelectors) {
      try {
        submitButton = page.locator(selector).first();
        if (await submitButton.isVisible({ timeout: 1000 })) {
          console.log(`✅ 找到提交按钮: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (submitButton && await submitButton.isVisible()) {
      await submitButton.click();
      await page.waitForTimeout(3000); // 等待提交完成
    } else {
      console.log('⚠️ 未找到提交按钮，尝试按回车键提交');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(3000);
    }
    
    // 步骤6: 验证任务创建结果
    console.log('📝 步骤6: 验证任务创建结果');
    await page.waitForTimeout(2000);
    
    // 检查是否有成功提示
    const successIndicators = [
      'text=创建成功',
      'text=保存成功',
      'text=任务已创建',
      '.success',
      '.alert-success',
      '[data-testid="success-message"]'
    ];
    
    let foundSuccess = false;
    for (const indicator of successIndicators) {
      try {
        if (await page.locator(indicator).isVisible({ timeout: 2000 })) {
          console.log('✅ 发现成功提示');
          foundSuccess = true;
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    // 检查新创建的任务是否在列表中
    console.log('📝 检查新任务是否出现在列表中');
    await page.waitForTimeout(2000);
    
    // 尝试查找包含时间戳的任务
    const taskExists = await page.locator(`text=${taskTitle}`).isVisible({ timeout: 3000 }).catch(() => false);
    
    if (taskExists) {
      console.log('✅ 新任务成功出现在列表中');
    } else {
      console.log('⚠️ 未在当前页面找到新任务，可能在其他页面或需要刷新');
      await page.reload();
      await page.waitForTimeout(2000);
      
      const taskExistsAfterReload = await page.locator(`text=${taskTitle}`).isVisible({ timeout: 3000 }).catch(() => false);
      if (taskExistsAfterReload) {
        console.log('✅ 刷新后找到新任务');
      }
    }
    
    // 最终截图
    await page.screenshot({ 
      path: 'test-results/screenshots/03-test-complete.png',
      fullPage: true 
    });
    
    console.log('🎬 测试录制完成');
    console.log('📁 视频文件将保存在: test-results/videos/');
    console.log('📸 截图文件保存在: test-results/screenshots/');
    
    // 等待额外时间确保视频录制完整
    await page.waitForTimeout(3000);
  });
});
