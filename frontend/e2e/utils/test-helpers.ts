import { Page, Locator, expect } from '@playwright/test';

/**
 * E2E测试辅助工具类
 * 提供通用的测试操作和断言方法
 */

export class TestHelpers {
  constructor(protected page: Page) {}

  /**
   * 等待元素出现并获取
   */
  async waitAndGet(selector: string, timeout = 10000): Promise<Locator> {
    await this.page.waitForSelector(selector, { timeout });
    return this.page.locator(selector);
  }

  /**
   * 安全填写表单字段
   */
  async safeFill(selector: string, value: string): Promise<void> {
    const element = await this.waitAndGet(selector);
    await element.clear();
    await element.fill(value);
  }

  /**
   * 安全点击元素
   */
  async safeClick(selector: string, timeout = 10000): Promise<void> {
    const element = await this.waitAndGet(selector, timeout);
    await element.click();
  }

  /**
   * 等待网络请求完成
   */
  async waitForNetworkIdle(timeout = 5000): Promise<void> {
    await this.page.waitForLoadState('networkidle', { timeout });
  }

  /**
   * 验证页面标题
   */
  async verifyPageTitle(expectedTitle: string): Promise<void> {
    await expect(this.page).toHaveTitle(new RegExp(expectedTitle));
  }

  /**
   * 验证URL包含指定路径
   */
  async verifyUrlContains(path: string): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(path));
  }

  /**
   * 验证元素存在
   */
  async verifyElementExists(selector: string): Promise<void> {
    await expect(this.page.locator(selector)).toBeVisible();
  }

  /**
   * 验证元素不存在
   */
  async verifyElementNotExists(selector: string): Promise<void> {
    await expect(this.page.locator(selector)).not.toBeVisible();
  }

  /**
   * 验证文本内容
   */
  async verifyTextContent(selector: string, expectedText: string): Promise<void> {
    await expect(this.page.locator(selector)).toContainText(expectedText);
  }

  /**
   * 截图用于调试
   */
  async takeDebugScreenshot(name: string): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await this.page.screenshot({ 
      path: `e2e/debug-screenshots/${name}-${timestamp}.png`,
      fullPage: true 
    });
  }
}

/**
 * 模拟功能专用测试工具
 */
export class ImpersonationTestHelpers extends TestHelpers {
  
  /**
   * 开始企业模拟
   */
  async startImpersonation(enterpriseId: number, reason: string): Promise<void> {
    // 导航到企业管理页面
    await this.page.goto('/admin/enterprises');
    await this.waitForNetworkIdle();

    // 找到目标企业并开始模拟
    const enterpriseRow = this.page.locator(`[data-testid="enterprise-row-${enterpriseId}"]`);
    await enterpriseRow.locator('[data-testid="impersonate-button"]').click();

    // 填写模拟原因
    await this.safeFill('[data-testid="impersonation-reason"]', reason);
    await this.safeClick('[data-testid="confirm-impersonation"]');

    // 等待模拟开始
    await this.verifyElementExists('[data-testid="impersonation-warning-banner"]');
  }

  /**
   * 退出企业模拟
   */
  async exitImpersonation(): Promise<void> {
    // 点击退出模拟按钮
    await this.safeClick('[data-testid="exit-impersonation-button"]');
    
    // 确认退出
    await this.safeClick('[data-testid="confirm-exit-impersonation"]');

    // 验证已退出模拟状态
    await this.verifyElementNotExists('[data-testid="impersonation-warning-banner"]');
  }

  /**
   * 验证模拟状态横幅
   */
  async verifyImpersonationBanner(enterpriseName: string): Promise<void> {
    await this.verifyElementExists('[data-testid="impersonation-warning-banner"]');
    await this.verifyTextContent('[data-testid="impersonation-banner-text"]', `正在模拟企业: ${enterpriseName}`);
  }

  /**
   * 验证模拟权限限制
   */
  async verifyPermissionRestrictions(): Promise<void> {
    // 验证敏感操作被禁用
    const sensitiveButtons = [
      '[data-testid="delete-user-button"]',
      '[data-testid="modify-permissions-button"]',
      '[data-testid="financial-data-access"]'
    ];

    for (const buttonSelector of sensitiveButtons) {
      const button = this.page.locator(buttonSelector);
      if (await button.isVisible()) {
        await expect(button).toBeDisabled();
      }
    }
  }
}

/**
 * 安全验证测试工具
 */
export class SecurityTestHelpers extends TestHelpers {
  
  /**
   * 验证CSRF保护
   */
  async verifyCsrfProtection(): Promise<void> {
    const response = await this.page.request.post('/api/v1/admin/impersonate/enterprise/1', {
      data: { reason: 'test' },
      headers: {
        'Content-Type': 'application/json'
        // 故意不包含CSRF令牌
      }
    });
    
    expect(response.status()).toBe(403);
  }

  /**
   * 验证会话超时
   */
  async verifySessionTimeout(): Promise<void> {
    // 模拟会话超时
    await this.page.evaluate(() => {
      const expiredTime = Date.now() - 1000 * 60 * 60; // 1小时前
      localStorage.setItem('impersonation_session_expires', expiredTime.toString());
    });

    await this.page.reload();
    
    // 验证自动退出模拟
    await this.verifyElementNotExists('[data-testid="impersonation-warning-banner"]');
  }

  /**
   * 验证权限边界
   */
  async verifyPermissionBoundaries(): Promise<void> {
    // 尝试访问超出权限的API端点
    const restrictedEndpoints = [
      '/api/v1/admin/users/delete',
      '/api/v1/admin/system/config',
      '/api/v1/admin/audit/export'
    ];

    for (const endpoint of restrictedEndpoints) {
      const response = await this.page.request.get(endpoint);
      expect([403, 401]).toContain(response.status());
    }
  }

  /**
   * 验证输入sanitization
   */
  async verifyInputSanitization(): Promise<void> {
    const maliciousInputs = [
      '<script>alert("xss")</script>',
      '${7*7}',
      '../../../etc/passwd',
      'DROP TABLE users;'
    ];

    for (const input of maliciousInputs) {
      await this.safeFill('[data-testid="impersonation-reason"]', input);
      
      // 验证输入被正确转义或拒绝
      const sanitizedValue = await this.page.locator('[data-testid="impersonation-reason"]').inputValue();
      expect(sanitizedValue).not.toContain('<script>');
      expect(sanitizedValue).not.toContain('${');
      expect(sanitizedValue).not.toContain('../');
      expect(sanitizedValue).not.toContain('DROP');
    }
  }
}

/**
 * 性能测试工具
 */
export class PerformanceTestHelpers extends TestHelpers {

  /**
   * 测量页面加载时间
   */
  async measurePageLoadTime(url: string): Promise<number> {
    const startTime = Date.now();
    await this.page.goto(url);
    await this.waitForNetworkIdle();
    const endTime = Date.now();

    return endTime - startTime;
  }

  /**
   * 测量模拟操作响应时间
   */
  async measureImpersonationResponseTime(): Promise<number> {
    const startTime = Date.now();

    // 执行模拟操作
    await this.safeClick('[data-testid="impersonate-button"]');
    await this.verifyElementExists('[data-testid="impersonation-warning-banner"]');

    const endTime = Date.now();
    return endTime - startTime;
  }

  /**
   * 验证内存使用情况
   */
  async verifyMemoryUsage(): Promise<void> {
    const metrics = await this.page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory;
      }
      return null;
    });

    if (metrics) {
      console.log('内存使用情况:', {
        usedJSHeapSize: `${(metrics.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
        totalJSHeapSize: `${(metrics.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
        jsHeapSizeLimit: `${(metrics.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`
      });

      // 验证内存使用不超过合理限制 (50MB)
      expect(metrics.usedJSHeapSize).toBeLessThan(50 * 1024 * 1024);
    }
  }
}

/**
 * 需求管理测试工具
 */
export class RequirementTestHelpers extends TestHelpers {

  /**
   * 创建新需求
   */
  async createRequirement(title: string, description: string, priority: 'low' | 'medium' | 'high' = 'medium'): Promise<string> {
    // 导航到需求管理页面
    await this.page.goto('/requirements');
    await this.waitForNetworkIdle();

    // 点击创建需求按钮
    await this.safeClick('[data-testid="create-requirement-button"]');

    // 填写需求表单
    await this.safeFill('[data-testid="requirement-title-input"]', title);
    await this.safeFill('[data-testid="requirement-description-input"]', description);

    // 选择优先级
    await this.safeClick(`[data-testid="requirement-priority-${priority}"]`);

    // 提交创建
    await this.safeClick('[data-testid="submit-create-requirement"]');
    await this.waitForNetworkIdle();

    // 获取并返回新创建的需求ID
    const requirementId = await this.page.locator('[data-testid="requirement-id"]').textContent();
    return requirementId || '';
  }

  /**
   * 添加评论（支持@提及用户）
   */
  async addComment(requirementId: string, content: string, mentionUsers?: string[]): Promise<void> {
    // 导航到需求详情页
    await this.page.goto(`/requirements/${requirementId}`);
    await this.waitForNetworkIdle();

    // 找到评论输入框
    const commentInput = await this.waitAndGet('[data-testid="comment-input"]');

    // 如果需要@用户
    if (mentionUsers && mentionUsers.length > 0) {
      let commentText = content;
      for (const user of mentionUsers) {
        // 输入@触发提及功能
        await commentInput.fill('@');
        await this.page.waitForSelector('[data-testid="mention-dropdown"]');

        // 搜索并选择用户
        await this.page.locator(`[data-testid="mention-user-${user}"]`).click();

        // 继续输入评论内容
        await commentInput.fill(`@${user} ${commentText}`);
      }
    } else {
      await commentInput.fill(content);
    }

    // 提交评论
    await this.safeClick('[data-testid="submit-comment-button"]');
    await this.waitForNetworkIdle();

    // 验证评论已添加
    await this.verifyElementExists(`[data-testid="comment-content"]:has-text("${content}")`);
  }

  /**
   * 提交需求审批
   */
  async submitForReview(requirementId: string, reviewers: string[]): Promise<void> {
    // 导航到需求详情页
    await this.page.goto(`/requirements/${requirementId}`);
    await this.waitForNetworkIdle();

    // 点击提交审批按钮
    await this.safeClick('[data-testid="submit-for-review-button"]');

    // 选择审批人
    for (const reviewer of reviewers) {
      await this.safeClick(`[data-testid="reviewer-checkbox-${reviewer}"]`);
    }

    // 确认提交
    await this.safeClick('[data-testid="confirm-submit-review"]');
    await this.waitForNetworkIdle();

    // 验证状态变更为"审批中"
    await this.verifyTextContent('[data-testid="requirement-status"]', '审批中');
  }

  /**
   * 审批需求（通过）
   */
  async approveRequirement(requirementId: string, comment?: string): Promise<void> {
    // 导航到需求详情页
    await this.page.goto(`/requirements/${requirementId}`);
    await this.waitForNetworkIdle();

    // 点击审批按钮
    await this.safeClick('[data-testid="approve-requirement-button"]');

    // 添加审批意见（如果有）
    if (comment) {
      await this.safeFill('[data-testid="approval-comment-input"]', comment);
    }

    // 确认审批
    await this.safeClick('[data-testid="confirm-approve"]');
    await this.waitForNetworkIdle();

    // 验证状态变更为"已批准"
    await this.verifyTextContent('[data-testid="requirement-status"]', '已批准');
  }

  /**
   * 拒绝需求
   */
  async rejectRequirement(requirementId: string, reason: string): Promise<void> {
    // 导航到需求详情页
    await this.page.goto(`/requirements/${requirementId}`);
    await this.waitForNetworkIdle();

    // 点击拒绝按钮
    await this.safeClick('[data-testid="reject-requirement-button"]');

    // 填写拒绝原因
    await this.safeFill('[data-testid="rejection-reason-input"]', reason);

    // 确认拒绝
    await this.safeClick('[data-testid="confirm-reject"]');
    await this.waitForNetworkIdle();

    // 验证状态变更为"已拒绝"
    await this.verifyTextContent('[data-testid="requirement-status"]', '已拒绝');
  }

  /**
   * 将需求转换为任务
   */
  async convertToTask(requirementId: string, taskDetails: {
    projectId: string;
    title?: string;
    assignee?: string;
  }): Promise<string> {
    // 导航到需求详情页
    await this.page.goto(`/requirements/${requirementId}`);
    await this.waitForNetworkIdle();

    // 点击转换为任务按钮
    await this.safeClick('[data-testid="convert-to-task-button"]');

    // 选择项目
    await this.safeClick(`[data-testid="project-select"]`);
    await this.safeClick(`[data-testid="project-option-${taskDetails.projectId}"]`);

    // 修改任务标题（如果提供）
    if (taskDetails.title) {
      await this.safeFill('[data-testid="task-title-input"]', taskDetails.title);
    }

    // 分配任务（如果提供）
    if (taskDetails.assignee) {
      await this.safeClick(`[data-testid="assignee-select"]`);
      await this.safeClick(`[data-testid="assignee-option-${taskDetails.assignee}"]`);
    }

    // 确认转换
    await this.safeClick('[data-testid="confirm-convert-to-task"]');
    await this.waitForNetworkIdle();

    // 验证转换成功
    await this.verifyElementExists('[data-testid="conversion-success-message"]');

    // 获取并返回新创建的任务ID
    const taskId = await this.page.locator('[data-testid="created-task-id"]').textContent();
    return taskId || '';
  }

  /**
   * 关联需求到现有任务
   */
  async linkToTask(requirementId: string, taskId: string): Promise<void> {
    // 导航到需求详情页
    await this.page.goto(`/requirements/${requirementId}`);
    await this.waitForNetworkIdle();

    // 点击关联任务按钮
    await this.safeClick('[data-testid="link-to-task-button"]');

    // 搜索任务
    await this.safeFill('[data-testid="task-search-input"]', taskId);
    await this.waitForNetworkIdle();

    // 选择任务
    await this.safeClick(`[data-testid="task-option-${taskId}"]`);

    // 确认关联
    await this.safeClick('[data-testid="confirm-link-task"]');
    await this.waitForNetworkIdle();

    // 验证关联成功
    await this.verifyElementExists(`[data-testid="linked-task-${taskId}"]`);
  }

  /**
   * 验证需求状态
   */
  async verifyRequirementStatus(requirementId: string, expectedStatus: string): Promise<void> {
    await this.page.goto(`/requirements/${requirementId}`);
    await this.waitForNetworkIdle();
    await this.verifyTextContent('[data-testid="requirement-status"]', expectedStatus);
  }

  /**
   * 验证需求详情
   */
  async verifyRequirementDetails(requirementId: string, expectedDetails: {
    title?: string;
    description?: string;
    priority?: string;
    status?: string;
  }): Promise<void> {
    await this.page.goto(`/requirements/${requirementId}`);
    await this.waitForNetworkIdle();

    if (expectedDetails.title) {
      await this.verifyTextContent('[data-testid="requirement-title"]', expectedDetails.title);
    }

    if (expectedDetails.description) {
      await this.verifyTextContent('[data-testid="requirement-description"]', expectedDetails.description);
    }

    if (expectedDetails.priority) {
      await this.verifyTextContent('[data-testid="requirement-priority"]', expectedDetails.priority);
    }

    if (expectedDetails.status) {
      await this.verifyTextContent('[data-testid="requirement-status"]', expectedDetails.status);
    }
  }

  /**
   * 验证评论中的@提及
   */
  async verifyMentionInComment(requirementId: string, mentionedUser: string): Promise<void> {
    await this.page.goto(`/requirements/${requirementId}`);
    await this.waitForNetworkIdle();

    // 验证评论中包含@用户
    await this.verifyElementExists(`[data-testid="comment-mention-${mentionedUser}"]`);
  }

  /**
   * 获取需求列表
   */
  async getRequirementsList(filters?: {
    status?: string;
    priority?: string;
  }): Promise<void> {
    await this.page.goto('/requirements');
    await this.waitForNetworkIdle();

    if (filters?.status) {
      await this.safeClick('[data-testid="status-filter"]');
      await this.safeClick(`[data-testid="status-option-${filters.status}"]`);
      await this.waitForNetworkIdle();
    }

    if (filters?.priority) {
      await this.safeClick('[data-testid="priority-filter"]');
      await this.safeClick(`[data-testid="priority-option-${filters.priority}"]`);
      await this.waitForNetworkIdle();
    }
  }
}