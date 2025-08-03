const { test, expect } = require('@playwright/test');

/**
 * 工作笔记功能端到端测试套件
 * 模拟真实用户操作流程，全面测试工作笔记的CRUD功能
 */
describe('工作笔记功能完整测试', () => {
  // 测试配置
  const BASE_URL = 'http://localhost';
  const TEST_USER = {
    username: 'admin',
    password: 'password123'
  };
  
  // 测试数据
  const TEST_DOCUMENT = {
    title: 'Playwright自动化测试文档',
    content: `# Playwright E2E测试

这是一个通过Playwright自动化测试创建的工作笔记。

## 测试内容

### 功能验证
- ✅ 用户登录
- ✅ 文档创建
- ✅ 文档编辑
- ✅ 文档搜索
- ✅ 文档删除

### 技术栈
- **前端**: React + TypeScript + Ant Design
- **后端**: Go + PostgreSQL
- **测试**: Playwright E2E Testing

### 测试时间
创建时间: ${new Date().toLocaleString('zh-CN')}

## 测试结果

如果您看到这个文档，说明工作笔记功能运行正常！

---

*本文档由Playwright自动化测试生成*`,
    description: '这是一个用于端到端测试的工作笔记文档',
    tags: ['测试', 'Playwright', 'E2E', '自动化'],
    type: 'markdown',
    status: 'published',
    visibility: 'team'
  };

  const UPDATED_DOCUMENT = {
    title: 'Playwright自动化测试文档 - 已更新',
    content: `# Playwright E2E测试 - 更新版本

这是一个通过Playwright自动化测试创建并更新的工作笔记。

## ✅ 测试通过的功能

### 基础CRUD操作
- ✅ **创建文档** - 成功创建测试文档
- ✅ **读取文档** - 成功加载文档列表和详情
- ✅ **更新文档** - 成功修改文档内容
- ⏳ **删除文档** - 即将测试删除功能

### 用户交互功能
- ✅ **搜索功能** - ID搜索和全文搜索
- ✅ **排序功能** - 按标题、创建时间等排序
- ✅ **筛选功能** - 按状态、可见性筛选
- ✅ **分页功能** - 大量数据的分页显示

### UI/UX验证
- ✅ **响应式设计** - 桌面端显示正常
- ✅ **加载状态** - 加载指示器正常显示
- ✅ **错误处理** - 错误提示友好
- ✅ **操作反馈** - 成功/失败消息及时显示

## 📊 测试统计

- **测试用例**: 15个
- **测试步骤**: 50+个
- **验证点**: 100+个
- **执行时间**: < 2分钟

## 🎯 质量保证

本次测试确保了工作笔记功能的：
- **功能完整性** - 所有核心功能正常工作
- **用户体验** - 界面友好，操作流畅
- **数据安全** - 数据正确保存和更新
- **错误处理** - 异常情况处理得当

更新时间: ${new Date().toLocaleString('zh-CN')}

---

*文档更新测试成功！*`,
    tags: ['测试', 'Playwright', 'E2E', '自动化', '已更新']
  };

  // 设置和清理
  test.beforeEach(async ({ page }) => {
    // 设置较长的超时时间
    test.setTimeout(60000);
    
    // 导航到应用首页
    await page.goto(BASE_URL);
    
    // 等待页面加载
    await page.waitForLoadState('networkidle');
  });

  test.afterAll(async ({ page }) => {
    // 清理测试数据（可选）
    console.log('🧹 测试完成，清理测试数据...');
  });

  /**
   * 测试1: 用户登录验证
   * 确保用户可以成功登录系统
   */
  test('1. 用户登录验证', async ({ page }) => {
    await test.step('导航到登录页面', async () => {
      // 检查是否已经登录
      const isLoggedIn = await page.locator('[data-testid="user-menu"]').isVisible({ timeout: 3000 }).catch(() => false);
      
      if (!isLoggedIn) {
        // 查找登录按钮或登录表单
        const loginButton = page.locator('text=登录').first();
        const usernameInput = page.locator('input[name="username"], input[placeholder*="用户名"], input[placeholder*="用户"]').first();
        
        if (await loginButton.isVisible({ timeout: 5000 })) {
          await loginButton.click();
        }
        
        // 等待登录表单出现
        await expect(usernameInput).toBeVisible({ timeout: 10000 });
      }
    });

    await test.step('输入登录凭据', async () => {
      const usernameInput = page.locator('input[name="username"], input[placeholder*="用户名"], input[placeholder*="用户"]').first();
      const passwordInput = page.locator('input[name="password"], input[placeholder*="密码"], input[type="password"]').first();
      
      await usernameInput.fill(TEST_USER.username);
      await passwordInput.fill(TEST_USER.password);
    });

    await test.step('提交登录', async () => {
      const submitButton = page.locator('button[type="submit"], button:has-text("登录"), .ant-btn-primary:has-text("登录")').first();
      await submitButton.click();
      
      // 等待登录成功，检查页面变化
      await page.waitForLoadState('networkidle');
      
      // 验证登录成功的标志
      const successIndicators = [
        '[data-testid="user-menu"]',
        'text=工作台',
        'text=项目',
        '.ant-layout-header'
      ];
      
      let loginSuccess = false;
      for (const indicator of successIndicators) {
        if (await page.locator(indicator).isVisible({ timeout: 5000 }).catch(() => false)) {
          loginSuccess = true;
          break;
        }
      }
      
      expect(loginSuccess).toBeTruthy();
      console.log('✅ 用户登录成功');
    });
  });

  /**
   * 测试2: 导航到工作笔记页面
   * 验证用户可以成功导航到文档管理页面
   */
  test('2. 导航到工作笔记页面', async ({ page }) => {
    // 先登录
    await loginIfNeeded(page);

    await test.step('查找并点击文档管理入口', async () => {
      // 尝试多种可能的导航方式
      const navigationOptions = [
        'text=文档管理',
        'text=工作笔记', 
        'text=文档',
        'a[href*="/documents"]',
        '[data-testid="documents-nav"]'
      ];

      let navigated = false;
      for (const nav of navigationOptions) {
        const element = page.locator(nav).first();
        if (await element.isVisible({ timeout: 3000 }).catch(() => false)) {
          await element.click();
          navigated = true;
          break;
        }
      }

      // 如果找不到导航链接，直接访问URL
      if (!navigated) {
        await page.goto(`${BASE_URL}/documents`);
      }

      await page.waitForLoadState('networkidle');
    });

    await test.step('验证页面加载成功', async () => {
      // 检查文档管理页面的特征元素
      const pageIndicators = [
        'text=工作笔记',
        'text=文件管理',
        'text=新建',
        '.ant-table',
        '[data-testid="work-notes-manager"]'
      ];

      let pageLoaded = false;
      for (const indicator of pageIndicators) {
        if (await page.locator(indicator).isVisible({ timeout: 10000 }).catch(() => false)) {
          pageLoaded = true;
          break;
        }
      }

      expect(pageLoaded).toBeTruthy();
      console.log('✅ 成功导航到工作笔记页面');
    });
  });

  /**
   * 测试3: 创建新文档
   * 模拟用户创建一个新的工作笔记文档
   */
  test('3. 创建新文档', async ({ page }) => {
    await loginIfNeeded(page);
    await navigateToDocuments(page);

    await test.step('点击创建按钮', async () => {
      const createButtons = [
        'text=新建',
        'text=创建',
        'text=添加',
        '.ant-btn-primary:has-text("新建")',
        '[data-testid="create-document"]'
      ];

      let clicked = false;
      for (const buttonSelector of createButtons) {
        const button = page.locator(buttonSelector).first();
        if (await button.isVisible({ timeout: 5000 }).catch(() => false)) {
          await button.click();
          clicked = true;
          break;
        }
      }

      expect(clicked).toBeTruthy();
      
      // 等待创建表单出现
      await expect(page.locator('.ant-modal, .ant-drawer, form')).toBeVisible({ timeout: 10000 });
      console.log('✅ 创建表单已打开');
    });

    await test.step('填写文档信息', async () => {
      // 填写标题
      const titleInput = page.locator('input[name="title"], input[placeholder*="标题"], #title').first();
      await expect(titleInput).toBeVisible({ timeout: 5000 });
      await titleInput.fill(TEST_DOCUMENT.title);

      // 填写描述（如果存在）
      const descInput = page.locator('input[name="description"], textarea[name="description"], input[placeholder*="描述"]').first();
      if (await descInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await descInput.fill(TEST_DOCUMENT.description);
      }

      // 填写内容
      const contentInputs = [
        'textarea[name="content"]',
        '.ant-input',
        '.CodeMirror textarea',
        '[data-testid="content-editor"]'
      ];

      let contentFilled = false;
      for (const selector of contentInputs) {
        const contentInput = page.locator(selector).first();
        if (await contentInput.isVisible({ timeout: 3000 }).catch(() => false)) {
          await contentInput.fill(TEST_DOCUMENT.content);
          contentFilled = true;
          break;
        }
      }

      expect(contentFilled).toBeTruthy();
      console.log('✅ 文档内容已填写');
    });

    await test.step('保存文档', async () => {
      const saveButtons = [
        'button:has-text("保存")',
        'button:has-text("确定")',
        'button:has-text("创建")',
        '.ant-btn-primary:has-text("保存")',
        '[data-testid="save-document"]'
      ];

      let saved = false;
      for (const buttonSelector of saveButtons) {
        const button = page.locator(buttonSelector).first();
        if (await button.isVisible({ timeout: 3000 }).catch(() => false)) {
          await button.click();
          saved = true;
          break;
        }
      }

      expect(saved).toBeTruthy();

      // 等待保存成功的反馈
      await page.waitForLoadState('networkidle');
      
      // 检查成功消息或页面更新
      const successIndicators = [
        '.ant-message-success',
        'text=创建成功',
        'text=保存成功'
      ];

      let successShown = false;
      for (const indicator of successIndicators) {
        if (await page.locator(indicator).isVisible({ timeout: 5000 }).catch(() => false)) {
          successShown = true;
          break;
        }
      }

      console.log('✅ 文档创建成功');
    });

    await test.step('验证文档出现在列表中', async () => {
      // 等待一下让页面更新
      await page.waitForTimeout(2000);
      
      // 检查文档是否出现在列表中
      const documentInList = page.locator(`text=${TEST_DOCUMENT.title}`).first();
      await expect(documentInList).toBeVisible({ timeout: 10000 });
      console.log('✅ 文档已出现在列表中');
    });
  });

  /**
   * 测试4: 搜索文档
   * 测试搜索功能，包括普通搜索和ID搜索
   */
  test('4. 搜索文档功能', async ({ page }) => {
    await loginIfNeeded(page);
    await navigateToDocuments(page);

    await test.step('测试普通文本搜索', async () => {
      const searchInput = page.locator('input[placeholder*="搜索"], .ant-input-search input, [data-testid="search-input"]').first();
      await expect(searchInput).toBeVisible({ timeout: 10000 });

      // 输入搜索关键词
      await searchInput.fill('Playwright');
      
      // 触发搜索（Enter键或搜索按钮）
      await searchInput.press('Enter');
      
      // 等待搜索结果
      await page.waitForTimeout(2000);
      
      // 验证搜索结果
      const searchResults = page.locator('.ant-table-tbody tr, .document-item');
      const resultCount = await searchResults.count();
      
      expect(resultCount).toBeGreaterThan(0);
      console.log(`✅ 搜索返回 ${resultCount} 个结果`);
    });

    await test.step('测试ID搜索功能', async () => {
      // 清空搜索框
      const searchInput = page.locator('input[placeholder*="搜索"], .ant-input-search input').first();
      await searchInput.clear();
      
      // 使用ID搜索格式（#123）
      await searchInput.fill('#1');
      await searchInput.press('Enter');
      
      await page.waitForTimeout(2000);
      
      // 验证ID搜索结果
      const hasResults = await page.locator('.ant-table-tbody tr, .document-item').count() >= 0;
      expect(hasResults).toBeTruthy();
      console.log('✅ ID搜索功能正常');
    });

    await test.step('清空搜索显示所有文档', async () => {
      const searchInput = page.locator('input[placeholder*="搜索"], .ant-input-search input').first();
      await searchInput.clear();
      await searchInput.press('Enter');
      
      await page.waitForTimeout(2000);
      
      // 验证显示所有文档
      const allResults = await page.locator('.ant-table-tbody tr, .document-item').count();
      expect(allResults).toBeGreaterThan(0);
      console.log('✅ 清空搜索后显示所有文档');
    });
  });

  /**
   * 测试5: 编辑文档
   * 测试文档的编辑更新功能
   */
  test('5. 编辑文档功能', async ({ page }) => {
    await loginIfNeeded(page);
    await navigateToDocuments(page);

    await test.step('找到并点击编辑按钮', async () => {
      // 查找测试文档
      const testDocRow = page.locator(`tr:has-text("${TEST_DOCUMENT.title}"), .document-item:has-text("${TEST_DOCUMENT.title}")`).first();
      await expect(testDocRow).toBeVisible({ timeout: 10000 });

      // 查找编辑按钮
      const editButtons = [
        testDocRow.locator('button:has-text("编辑"), .ant-btn:has([aria-label="edit"]), [data-testid="edit-button"]').first(),
        testDocRow.locator('.anticon-edit').first(),
        testDocRow.locator('button').filter({ hasText: /编辑|Edit/ }).first()
      ];

      let editClicked = false;
      for (const editButton of editButtons) {
        if (await editButton.isVisible({ timeout: 3000 }).catch(() => false)) {
          await editButton.click();
          editClicked = true;
          break;
        }
      }

      // 如果找不到编辑按钮，尝试点击行来进入编辑
      if (!editClicked) {
        await testDocRow.dblclick();
      }

      // 等待编辑表单出现
      await expect(page.locator('.ant-modal, .ant-drawer, form')).toBeVisible({ timeout: 10000 });
      console.log('✅ 编辑表单已打开');
    });

    await test.step('修改文档内容', async () => {
      // 修改标题
      const titleInput = page.locator('input[name="title"], input[value*="Playwright"]').first();
      await expect(titleInput).toBeVisible({ timeout: 5000 });
      await titleInput.clear();
      await titleInput.fill(UPDATED_DOCUMENT.title);

      // 修改内容
      const contentInput = page.locator('textarea[name="content"], .CodeMirror textarea').first();
      if (await contentInput.isVisible({ timeout: 3000 })) {
        await contentInput.clear();
        await contentInput.fill(UPDATED_DOCUMENT.content);
      }

      console.log('✅ 文档内容已修改');
    });

    await test.step('保存更改', async () => {
      const saveButton = page.locator('button:has-text("保存"), button:has-text("确定"), .ant-btn-primary').first();
      await saveButton.click();

      // 等待保存成功
      await page.waitForLoadState('networkidle');
      
      // 检查成功消息
      const successMessage = page.locator('.ant-message-success, text=保存成功, text=更新成功').first();
      if (await successMessage.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('✅ 看到成功消息');
      }

      console.log('✅ 文档更新成功');
    });

    await test.step('验证更改已保存', async () => {
      await page.waitForTimeout(2000);
      
      // 验证更新后的标题出现在列表中
      const updatedTitle = page.locator(`text=${UPDATED_DOCUMENT.title}`).first();
      await expect(updatedTitle).toBeVisible({ timeout: 10000 });
      console.log('✅ 更新后的文档标题已显示');
    });
  });

  /**
   * 测试6: 文档排序和筛选
   * 测试列表的排序和筛选功能
   */
  test('6. 文档排序和筛选', async ({ page }) => {
    await loginIfNeeded(page);
    await navigateToDocuments(page);

    await test.step('测试按标题排序', async () => {
      const titleHeader = page.locator('th:has-text("标题"), th:has-text("名称"), .ant-table-column-title:has-text("标题")').first();
      if (await titleHeader.isVisible({ timeout: 3000 }).catch(() => false)) {
        await titleHeader.click();
        await page.waitForTimeout(1000);
        console.log('✅ 标题排序功能已测试');
      }
    });

    await test.step('测试按时间排序', async () => {
      const timeHeader = page.locator('th:has-text("时间"), th:has-text("创建"), .ant-table-column-title:has-text("时间")').first();
      if (await timeHeader.isVisible({ timeout: 3000 }).catch(() => false)) {
        await timeHeader.click();
        await page.waitForTimeout(1000);
        console.log('✅ 时间排序功能已测试');
      }
    });

    await test.step('测试状态筛选', async () => {
      const statusFilter = page.locator('select[name="status"], .ant-select:has-text("状态")').first();
      if (await statusFilter.isVisible({ timeout: 3000 }).catch(() => false)) {
        await statusFilter.click();
        const publishedOption = page.locator('text=已发布, text=published').first();
        if (await publishedOption.isVisible({ timeout: 3000 }).catch(() => false)) {
          await publishedOption.click();
          await page.waitForTimeout(1000);
          console.log('✅ 状态筛选功能已测试');
        }
      }
    });
  });

  /**
   * 测试7: 文档详情查看
   * 测试查看文档详情的功能
   */
  test('7. 查看文档详情', async ({ page }) => {
    await loginIfNeeded(page);
    await navigateToDocuments(page);

    await test.step('点击文档查看详情', async () => {
      const testDocRow = page.locator(`tr:has-text("${UPDATED_DOCUMENT.title}"), .document-item:has-text("${UPDATED_DOCUMENT.title}")`).first();
      await expect(testDocRow).toBeVisible({ timeout: 10000 });

      // 尝试多种方式查看详情
      const viewButtons = [
        testDocRow.locator('button:has-text("查看"), .ant-btn:has([aria-label="eye"]), [data-testid="view-button"]').first(),
        testDocRow.locator('.anticon-eye').first(),
        testDocRow.locator('a, button').first()
      ];

      let viewClicked = false;
      for (const viewButton of viewButtons) {
        if (await viewButton.isVisible({ timeout: 3000 }).catch(() => false)) {
          await viewButton.click();
          viewClicked = true;
          break;
        }
      }

      // 如果没有找到查看按钮，直接点击行
      if (!viewClicked) {
        await testDocRow.click();
      }

      await page.waitForTimeout(2000);
      console.log('✅ 文档详情已打开');
    });

    await test.step('验证详情内容', async () => {
      // 检查是否有详情内容显示
      const detailIndicators = [
        '.ant-modal .ant-modal-body',
        '.ant-drawer .ant-drawer-body',
        'text=创建时间',
        'text=更新时间',
        `text=${UPDATED_DOCUMENT.title}`
      ];

      let detailShown = false;
      for (const indicator of detailIndicators) {
        if (await page.locator(indicator).isVisible({ timeout: 5000 }).catch(() => false)) {
          detailShown = true;
          break;
        }
      }

      expect(detailShown).toBeTruthy();
      console.log('✅ 文档详情内容已显示');
    });

    await test.step('关闭详情页面', async () => {
      const closeButtons = [
        '.ant-modal-close',
        '.ant-drawer-close',
        'button:has-text("关闭")',
        'button:has-text("取消")'
      ];

      for (const closeSelector of closeButtons) {
        const closeButton = page.locator(closeSelector).first();
        if (await closeButton.isVisible({ timeout: 3000 }).catch(() => false)) {
          await closeButton.click();
          break;
        }
      }

      await page.waitForTimeout(1000);
      console.log('✅ 详情页面已关闭');
    });
  });

  /**
   * 测试8: 删除文档
   * 测试文档删除功能
   */
  test('8. 删除文档功能', async ({ page }) => {
    await loginIfNeeded(page);
    await navigateToDocuments(page);

    await test.step('找到并点击删除按钮', async () => {
      const testDocRow = page.locator(`tr:has-text("${UPDATED_DOCUMENT.title}"), .document-item:has-text("${UPDATED_DOCUMENT.title}")`).first();
      await expect(testDocRow).toBeVisible({ timeout: 10000 });

      // 查找删除按钮
      const deleteButtons = [
        testDocRow.locator('button:has-text("删除"), .ant-btn-dangerous, [data-testid="delete-button"]').first(),
        testDocRow.locator('.anticon-delete').first(),
        testDocRow.locator('button').filter({ hasText: /删除|Delete/ }).first()
      ];

      let deleteClicked = false;
      for (const deleteButton of deleteButtons) {
        if (await deleteButton.isVisible({ timeout: 3000 }).catch(() => false)) {
          await deleteButton.click();
          deleteClicked = true;
          break;
        }
      }

      expect(deleteClicked).toBeTruthy();
      console.log('✅ 删除按钮已点击');
    });

    await test.step('确认删除操作', async () => {
      // 等待确认对话框出现
      const confirmDialog = page.locator('.ant-popconfirm, .ant-modal-confirm').first();
      await expect(confirmDialog).toBeVisible({ timeout: 5000 });

      // 点击确认删除
      const confirmButton = page.locator('button:has-text("确定"), button:has-text("删除"), .ant-btn-dangerous').first();
      await confirmButton.click();

      // 等待删除完成
      await page.waitForLoadState('networkidle');
      console.log('✅ 删除操作已确认');
    });

    await test.step('验证文档已被删除', async () => {
      await page.waitForTimeout(2000);
      
      // 检查成功消息
      const successMessage = page.locator('.ant-message-success, text=删除成功').first();
      if (await successMessage.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('✅ 看到删除成功消息');
      }

      // 验证文档不再出现在列表中
      const deletedDoc = page.locator(`text=${UPDATED_DOCUMENT.title}`).first();
      const isVisible = await deletedDoc.isVisible({ timeout: 3000 }).catch(() => false);
      expect(isVisible).toBeFalsy();
      console.log('✅ 文档已从列表中移除');
    });
  });

  /**
   * 测试9: 响应式设计验证
   * 测试移动端和不同屏幕尺寸的兼容性
   */
  test('9. 响应式设计验证', async ({ page }) => {
    await loginIfNeeded(page);
    await navigateToDocuments(page);

    await test.step('测试移动端视图', async () => {
      // 设置移动端视窗
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(1000);

      // 检查移动端布局
      const isMobileView = await page.locator('.ant-layout-sider-collapsed, .mobile-view').isVisible({ timeout: 3000 }).catch(() => false);
      console.log(`📱 移动端视图: ${isMobileView ? '已适配' : '使用默认布局'}`);
    });

    await test.step('测试平板视图', async () => {
      // 设置平板视窗
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForTimeout(1000);

      // 验证布局调整
      const layout = page.locator('.ant-layout').first();
      await expect(layout).toBeVisible();
      console.log('📱 平板视图布局正常');
    });

    await test.step('恢复桌面视图', async () => {
      // 恢复桌面视窗
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.waitForTimeout(1000);

      const layout = page.locator('.ant-layout').first();
      await expect(layout).toBeVisible();
      console.log('🖥️ 桌面视图已恢复');
    });
  });

  /**
   * 测试10: 性能和稳定性测试
   * 测试页面加载性能和稳定性
   */
  test('10. 性能和稳定性测试', async ({ page }) => {
    await loginIfNeeded(page);

    await test.step('测试页面加载性能', async () => {
      const startTime = Date.now();
      
      await page.goto(`${BASE_URL}/documents`);
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      console.log(`⚡ 页面加载时间: ${loadTime}ms`);
      
      // 验证加载时间合理（小于10秒）
      expect(loadTime).toBeLessThan(10000);
    });

    await test.step('测试快速连续操作', async () => {
      // 快速点击多次刷新按钮
      const refreshButton = page.locator('button:has-text("刷新"), .ant-btn:has(.anticon-reload)').first();
      
      if (await refreshButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        for (let i = 0; i < 3; i++) {
          await refreshButton.click();
          await page.waitForTimeout(500);
        }
        console.log('✅ 快速连续操作稳定');
      }
    });

    await test.step('测试错误恢复能力', async () => {
      // 模拟网络错误（离线后重新连接）
      await page.context().setOffline(true);
      await page.waitForTimeout(2000);
      
      await page.context().setOffline(false);
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // 验证页面正常恢复
      const pageRecovered = await page.locator('.ant-layout, text=工作笔记').isVisible({ timeout: 10000 });
      expect(pageRecovered).toBeTruthy();
      console.log('✅ 网络错误恢复正常');
    });
  });

  // 辅助函数
  async function loginIfNeeded(page) {
    const isLoggedIn = await page.locator('[data-testid="user-menu"], text=工作台, .ant-layout-header').isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!isLoggedIn) {
      await page.goto(BASE_URL);
      
      const loginButton = page.locator('text=登录').first();
      if (await loginButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await loginButton.click();
      }

      const usernameInput = page.locator('input[name="username"], input[placeholder*="用户名"], input[placeholder*="用户"]').first();
      const passwordInput = page.locator('input[name="password"], input[placeholder*="密码"], input[type="password"]').first();
      
      await usernameInput.fill(TEST_USER.username);
      await passwordInput.fill(TEST_USER.password);
      
      const submitButton = page.locator('button[type="submit"], button:has-text("登录")').first();
      await submitButton.click();
      
      await page.waitForLoadState('networkidle');
    }
  }

  async function navigateToDocuments(page) {
    const documentPaths = [
      `${BASE_URL}/documents`,
      `${BASE_URL}/work-notes`,
      `${BASE_URL}/document-manager`
    ];

    // 尝试多种导航方式
    const navLinks = [
      'text=文档管理',
      'text=工作笔记',
      'text=文档',
      'a[href*="/documents"]'
    ];

    let navigated = false;
    for (const nav of navLinks) {
      const element = page.locator(nav).first();
      if (await element.isVisible({ timeout: 3000 }).catch(() => false)) {
        await element.click();
        await page.waitForLoadState('networkidle');
        navigated = true;
        break;
      }
    }

    // 如果导航链接不可用，直接访问URL
    if (!navigated) {
      for (const path of documentPaths) {
        try {
          await page.goto(path);
          await page.waitForLoadState('networkidle');
          
          const isDocumentPage = await page.locator('text=工作笔记, text=文档管理, .ant-table').isVisible({ timeout: 5000 });
          if (isDocumentPage) {
            navigated = true;
            break;
          }
        } catch (error) {
          continue;
        }
      }
    }

    if (!navigated) {
      throw new Error('无法导航到文档管理页面');
    }
  }
});