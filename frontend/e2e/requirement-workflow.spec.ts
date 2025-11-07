/**
 * 需求管理完整工作流 E2E 测试
 *
 * 测试范围：
 * 1. 需求创建
 * 2. 评论和@用户提及
 * 3. 需求审批流程
 * 4. 需求转任务
 * 5. 需求关联现有任务
 */

import { test, expect } from '@playwright/test';
import { TestHelpers, RequirementTestHelpers } from './utils/test-helpers';

test.describe('需求管理完整工作流', () => {
  let helpers: TestHelpers;
  let requirementHelpers: RequirementTestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    requirementHelpers = new RequirementTestHelpers(page);

    // 访问应用首页
    await page.goto('/');

    // 登录（如果需要）
    const loginForm = page.locator('[data-testid="login-form"]');
    if (await loginForm.isVisible({ timeout: 3000 })) {
      await helpers.safeFill('[data-testid="username-input"]', 'admin');
      await helpers.safeFill('[data-testid="password-input"]', 'admin123');
      await helpers.safeClick('[data-testid="login-button"]');
      await helpers.waitForNetworkIdle();
      await helpers.verifyUrlContains('/dashboard');
    }
  });

  test.describe('1. 需求创建功能', () => {

    test('1.1 应该能够成功创建新需求', async ({ page }) => {
      // 创建需求
      const requirementId = await requirementHelpers.createRequirement(
        '用户认证系统优化',
        '优化现有的用户认证流程，提高安全性和用户体验',
        'high'
      );

      // 验证需求已创建
      expect(requirementId).toBeTruthy();

      // 验证需求详情
      await requirementHelpers.verifyRequirementDetails(requirementId, {
        title: '用户认证系统优化',
        description: '优化现有的用户认证流程，提高安全性和用户体验',
        priority: 'high',
        status: '草稿'
      });
    });

    test('1.2 应该能够创建不同优先级的需求', async ({ page }) => {
      // 创建低优先级需求
      const lowPriorityId = await requirementHelpers.createRequirement(
        '文档更新',
        '更新API文档',
        'low'
      );

      await requirementHelpers.verifyRequirementDetails(lowPriorityId, {
        priority: 'low'
      });

      // 创建中优先级需求
      const mediumPriorityId = await requirementHelpers.createRequirement(
        '性能优化',
        '优化数据库查询性能',
        'medium'
      );

      await requirementHelpers.verifyRequirementDetails(mediumPriorityId, {
        priority: 'medium'
      });
    });

    test('1.3 应该能够在需求列表中查看创建的需求', async ({ page }) => {
      // 创建需求
      const requirementId = await requirementHelpers.createRequirement(
        '测试需求列表显示',
        '验证需求是否在列表中显示',
        'medium'
      );

      // 访问需求列表页面
      await requirementHelpers.getRequirementsList();

      // 验证需求在列表中
      await helpers.verifyElementExists(`[data-testid="requirement-item-${requirementId}"]`);
    });

    test('1.4 应该支持按状态和优先级筛选需求', async ({ page }) => {
      // 创建多个不同状态和优先级的需求
      await requirementHelpers.createRequirement('高优先级需求1', '描述1', 'high');
      await requirementHelpers.createRequirement('低优先级需求2', '描述2', 'low');

      // 筛选高优先级需求
      await requirementHelpers.getRequirementsList({ priority: 'high' });
      await helpers.waitForNetworkIdle();

      // 验证只显示高优先级需求
      await helpers.verifyTextContent('[data-testid="requirement-list"]', '高优先级需求1');
    });
  });

  test.describe('2. 评论和@用户提及功能', () => {

    let requirementId: string;

    test.beforeEach(async ({ page }) => {
      // 创建一个测试需求
      requirementId = await requirementHelpers.createRequirement(
        '测试评论功能的需求',
        '用于测试评论和@提及功能',
        'medium'
      );
    });

    test('2.1 应该能够添加普通评论', async ({ page }) => {
      // 添加评论
      await requirementHelpers.addComment(
        requirementId,
        '这是一个测试评论，验证基本评论功能'
      );

      // 验证评论已添加
      await helpers.verifyElementExists('[data-testid="comment-content"]');
      await helpers.verifyTextContent(
        '[data-testid="comment-content"]',
        '这是一个测试评论，验证基本评论功能'
      );
    });

    test('2.2 应该能够@提及用户', async ({ page }) => {
      // 添加带@提及的评论
      await requirementHelpers.addComment(
        requirementId,
        '请协助审批此需求',
        ['zhangsan', 'lisi']
      );

      // 验证@提及已添加
      await requirementHelpers.verifyMentionInComment(requirementId, 'zhangsan');
      await requirementHelpers.verifyMentionInComment(requirementId, 'lisi');
    });

    test('2.3 应该显示被@用户收到通知', async ({ page }) => {
      // 添加@提及评论
      await requirementHelpers.addComment(
        requirementId,
        '需要你的意见',
        ['zhangsan']
      );

      // 切换到被@用户的视角（需要先登出再登录）
      await page.goto('/logout');
      await helpers.safeFill('[data-testid="username-input"]', 'zhangsan');
      await helpers.safeFill('[data-testid="password-input"]', 'password123');
      await helpers.safeClick('[data-testid="login-button"]');
      await helpers.waitForNetworkIdle();

      // 验证通知中心有新通知
      await helpers.safeClick('[data-testid="notification-bell"]');
      await helpers.verifyElementExists('[data-testid="mention-notification"]');
    });

    test('2.4 应该支持多次评论', async ({ page }) => {
      // 添加第一条评论
      await requirementHelpers.addComment(requirementId, '第一条评论');

      // 添加第二条评论
      await requirementHelpers.addComment(requirementId, '第二条评论');

      // 添加第三条评论
      await requirementHelpers.addComment(requirementId, '第三条评论');

      // 验证所有评论都显示
      await helpers.verifyTextContent('[data-testid="comment-count"]', '3');
    });
  });

  test.describe('3. 需求审批流程', () => {

    let requirementId: string;

    test.beforeEach(async ({ page }) => {
      // 创建一个测试需求
      requirementId = await requirementHelpers.createRequirement(
        '需要审批的需求',
        '测试审批流程',
        'high'
      );
    });

    test('3.1 应该能够提交需求审批', async ({ page }) => {
      // 提交审批
      await requirementHelpers.submitForReview(requirementId, ['reviewer1', 'reviewer2']);

      // 验证状态已更新
      await requirementHelpers.verifyRequirementStatus(requirementId, '审批中');
    });

    test('3.2 审批人应该能够批准需求', async ({ page }) => {
      // 提交审批
      await requirementHelpers.submitForReview(requirementId, ['reviewer1']);

      // 切换到审批人身份
      await page.goto('/logout');
      await helpers.safeFill('[data-testid="username-input"]', 'reviewer1');
      await helpers.safeFill('[data-testid="password-input"]', 'password123');
      await helpers.safeClick('[data-testid="login-button"]');
      await helpers.waitForNetworkIdle();

      // 批准需求
      await requirementHelpers.approveRequirement(
        requirementId,
        '需求合理，同意实施'
      );

      // 验证状态已更新
      await requirementHelpers.verifyRequirementStatus(requirementId, '已批准');
    });

    test('3.3 审批人应该能够拒绝需求', async ({ page }) => {
      // 提交审批
      await requirementHelpers.submitForReview(requirementId, ['reviewer1']);

      // 切换到审批人身份
      await page.goto('/logout');
      await helpers.safeFill('[data-testid="username-input"]', 'reviewer1');
      await helpers.safeFill('[data-testid="password-input"]', 'password123');
      await helpers.safeClick('[data-testid="login-button"]');
      await helpers.waitForNetworkIdle();

      // 拒绝需求
      await requirementHelpers.rejectRequirement(
        requirementId,
        '需求不够明确，需要补充更多细节'
      );

      // 验证状态已更新
      await requirementHelpers.verifyRequirementStatus(requirementId, '已拒绝');
    });

    test('3.4 被拒绝的需求应该能够重新提交', async ({ page }) => {
      // 提交审批
      await requirementHelpers.submitForReview(requirementId, ['reviewer1']);

      // 切换到审批人拒绝需求
      await page.goto('/logout');
      await helpers.safeFill('[data-testid="username-input"]', 'reviewer1');
      await helpers.safeFill('[data-testid="password-input"]', 'password123');
      await helpers.safeClick('[data-testid="login-button"]');
      await helpers.waitForNetworkIdle();
      await requirementHelpers.rejectRequirement(requirementId, '需要修改');

      // 切换回原用户
      await page.goto('/logout');
      await helpers.safeFill('[data-testid="username-input"]', 'admin');
      await helpers.safeFill('[data-testid="password-input"]', 'admin123');
      await helpers.safeClick('[data-testid="login-button"]');
      await helpers.waitForNetworkIdle();

      // 修改需求后重新提交
      await page.goto(`/requirements/${requirementId}`);
      await helpers.safeClick('[data-testid="edit-requirement-button"]');
      await helpers.safeFill('[data-testid="requirement-description-input"]', '已根据反馈修改，补充了更多细节');
      await helpers.safeClick('[data-testid="save-requirement"]');

      // 重新提交审批
      await requirementHelpers.submitForReview(requirementId, ['reviewer1']);
      await requirementHelpers.verifyRequirementStatus(requirementId, '审批中');
    });

    test('3.5 应该支持多级审批流程', async ({ page }) => {
      // 提交给第一级审批人
      await requirementHelpers.submitForReview(requirementId, ['reviewer1']);

      // 第一级审批人批准
      await page.goto('/logout');
      await helpers.safeFill('[data-testid="username-input"]', 'reviewer1');
      await helpers.safeFill('[data-testid="password-input"]', 'password123');
      await helpers.safeClick('[data-testid="login-button"]');
      await helpers.waitForNetworkIdle();
      await requirementHelpers.approveRequirement(requirementId, '初审通过');

      // 验证进入下一级审批
      await requirementHelpers.verifyRequirementStatus(requirementId, '二级审批中');

      // 第二级审批人批准
      await page.goto('/logout');
      await helpers.safeFill('[data-testid="username-input"]', 'reviewer2');
      await helpers.safeFill('[data-testid="password-input"]', 'password123');
      await helpers.safeClick('[data-testid="login-button"]');
      await helpers.waitForNetworkIdle();
      await requirementHelpers.approveRequirement(requirementId, '终审通过');

      // 验证最终批准
      await requirementHelpers.verifyRequirementStatus(requirementId, '已批准');
    });
  });

  test.describe('4. 需求转任务功能', () => {

    let requirementId: string;

    test.beforeEach(async ({ page }) => {
      // 创建并批准一个需求
      requirementId = await requirementHelpers.createRequirement(
        '需要转换为任务的需求',
        '测试需求转任务功能',
        'high'
      );

      // 提交并批准（简化流程）
      await requirementHelpers.submitForReview(requirementId, ['reviewer1']);

      await page.goto('/logout');
      await helpers.safeFill('[data-testid="username-input"]', 'reviewer1');
      await helpers.safeFill('[data-testid="password-input"]', 'password123');
      await helpers.safeClick('[data-testid="login-button"]');
      await helpers.waitForNetworkIdle();
      await requirementHelpers.approveRequirement(requirementId);

      await page.goto('/logout');
      await helpers.safeFill('[data-testid="username-input"]', 'admin');
      await helpers.safeFill('[data-testid="password-input"]', 'admin123');
      await helpers.safeClick('[data-testid="login-button"]');
      await helpers.waitForNetworkIdle();
    });

    test('4.1 应该能够将需求转换为任务', async ({ page }) => {
      // 转换为任务
      const taskId = await requirementHelpers.convertToTask(requirementId, {
        projectId: '39',
        title: '实现用户认证优化',
        assignee: 'developer1'
      });

      // 验证任务已创建
      expect(taskId).toBeTruthy();

      // 导航到任务页面验证
      await page.goto(`/tasks/${taskId}`);
      await helpers.waitForNetworkIdle();
      await helpers.verifyTextContent('[data-testid="task-title"]', '实现用户认证优化');
    });

    test('4.2 转换后的任务应该继承需求的基本信息', async ({ page }) => {
      // 转换为任务
      const taskId = await requirementHelpers.convertToTask(requirementId, {
        projectId: '39'
      });

      // 验证任务继承了需求信息
      await page.goto(`/tasks/${taskId}`);
      await helpers.waitForNetworkIdle();

      // 验证关联的需求ID
      await helpers.verifyElementExists(`[data-testid="linked-requirement-${requirementId}"]`);

      // 验证优先级继承
      await helpers.verifyTextContent('[data-testid="task-priority"]', 'high');
    });

    test('4.3 转换后需求状态应该更新为"已转任务"', async ({ page }) => {
      // 转换为任务
      await requirementHelpers.convertToTask(requirementId, {
        projectId: '39'
      });

      // 验证需求状态已更新
      await requirementHelpers.verifyRequirementStatus(requirementId, '已转任务');
    });

    test('4.4 应该能够为转换的任务指定负责人', async ({ page }) => {
      // 转换为任务并指定负责人
      const taskId = await requirementHelpers.convertToTask(requirementId, {
        projectId: '39',
        assignee: 'developer2'
      });

      // 验证任务负责人
      await page.goto(`/tasks/${taskId}`);
      await helpers.waitForNetworkIdle();
      await helpers.verifyTextContent('[data-testid="task-assignee"]', 'developer2');
    });

    test('4.5 已转换的需求不应该能够再次转换', async ({ page }) => {
      // 第一次转换
      await requirementHelpers.convertToTask(requirementId, {
        projectId: '39'
      });

      // 尝试再次转换
      await page.goto(`/requirements/${requirementId}`);
      await helpers.waitForNetworkIdle();

      // 验证转换按钮已禁用或不可见
      const convertButton = page.locator('[data-testid="convert-to-task-button"]');
      await expect(convertButton).toBeDisabled();
    });
  });

  test.describe('5. 需求关联现有任务功能', () => {

    let requirementId: string;
    let existingTaskId: string;

    test.beforeEach(async ({ page }) => {
      // 创建测试需求
      requirementId = await requirementHelpers.createRequirement(
        '需要关联任务的需求',
        '测试需求关联现有任务功能',
        'medium'
      );

      // 创建一个现有任务（模拟）
      await page.goto('/projects/39/tasks');
      await helpers.safeClick('[data-testid="create-task-button"]');
      await helpers.safeFill('[data-testid="task-title-input"]', '已存在的任务');
      await helpers.safeFill('[data-testid="task-description-input"]', '用于测试关联');
      await helpers.safeClick('[data-testid="submit-create-task"]');
      await helpers.waitForNetworkIdle();

      existingTaskId = await page.locator('[data-testid="task-id"]').textContent() || '';
    });

    test('5.1 应该能够将需求关联到现有任务', async ({ page }) => {
      // 关联需求到任务
      await requirementHelpers.linkToTask(requirementId, existingTaskId);

      // 验证关联成功
      await helpers.verifyElementExists(`[data-testid="linked-task-${existingTaskId}"]`);
    });

    test('5.2 关联后应该能够在任务页面看到关联的需求', async ({ page }) => {
      // 关联需求到任务
      await requirementHelpers.linkToTask(requirementId, existingTaskId);

      // 导航到任务页面
      await page.goto(`/tasks/${existingTaskId}`);
      await helpers.waitForNetworkIdle();

      // 验证关联的需求
      await helpers.verifyElementExists(`[data-testid="linked-requirement-${requirementId}"]`);
    });

    test('5.3 应该能够取消需求和任务的关联', async ({ page }) => {
      // 先建立关联
      await requirementHelpers.linkToTask(requirementId, existingTaskId);

      // 取消关联
      await page.goto(`/requirements/${requirementId}`);
      await helpers.waitForNetworkIdle();
      await helpers.safeClick(`[data-testid="unlink-task-${existingTaskId}"]`);
      await helpers.safeClick('[data-testid="confirm-unlink"]');
      await helpers.waitForNetworkIdle();

      // 验证关联已取消
      await helpers.verifyElementNotExists(`[data-testid="linked-task-${existingTaskId}"]`);
    });

    test('5.4 应该支持一个需求关联多个任务', async ({ page }) => {
      // 创建第二个任务
      await page.goto('/projects/39/tasks');
      await helpers.safeClick('[data-testid="create-task-button"]');
      await helpers.safeFill('[data-testid="task-title-input"]', '第二个任务');
      await helpers.safeClick('[data-testid="submit-create-task"]');
      await helpers.waitForNetworkIdle();
      const secondTaskId = await page.locator('[data-testid="task-id"]').textContent() || '';

      // 关联第一个任务
      await requirementHelpers.linkToTask(requirementId, existingTaskId);

      // 关联第二个任务
      await requirementHelpers.linkToTask(requirementId, secondTaskId);

      // 验证两个任务都已关联
      await page.goto(`/requirements/${requirementId}`);
      await helpers.waitForNetworkIdle();
      await helpers.verifyElementExists(`[data-testid="linked-task-${existingTaskId}"]`);
      await helpers.verifyElementExists(`[data-testid="linked-task-${secondTaskId}"]`);
    });

    test('5.5 关联的任务完成后需求状态应该自动更新', async ({ page }) => {
      // 关联需求到任务
      await requirementHelpers.linkToTask(requirementId, existingTaskId);

      // 完成关联的任务
      await page.goto(`/tasks/${existingTaskId}`);
      await helpers.waitForNetworkIdle();
      await helpers.safeClick('[data-testid="complete-task-button"]');
      await helpers.safeClick('[data-testid="confirm-complete"]');
      await helpers.waitForNetworkIdle();

      // 验证需求状态已更新
      await requirementHelpers.verifyRequirementStatus(requirementId, '已完成');
    });
  });

  test.describe('6. 完整工作流集成测试', () => {

    test('6.1 完整流程：创建→评论→审批→转任务', async ({ page }) => {
      // 第1步：创建需求
      const requirementId = await requirementHelpers.createRequirement(
        '集成测试需求',
        '测试完整工作流',
        'high'
      );

      // 第2步：添加评论和@提及
      await requirementHelpers.addComment(
        requirementId,
        '请审批此需求',
        ['reviewer1']
      );

      // 第3步：提交审批
      await requirementHelpers.submitForReview(requirementId, ['reviewer1']);

      // 第4步：审批人批准
      await page.goto('/logout');
      await helpers.safeFill('[data-testid="username-input"]', 'reviewer1');
      await helpers.safeFill('[data-testid="password-input"]', 'password123');
      await helpers.safeClick('[data-testid="login-button"]');
      await helpers.waitForNetworkIdle();
      await requirementHelpers.approveRequirement(requirementId, '批准实施');

      // 第5步：切换回原用户并转换为任务
      await page.goto('/logout');
      await helpers.safeFill('[data-testid="username-input"]', 'admin');
      await helpers.safeFill('[data-testid="password-input"]', 'admin123');
      await helpers.safeClick('[data-testid="login-button"]');
      await helpers.waitForNetworkIdle();

      const taskId = await requirementHelpers.convertToTask(requirementId, {
        projectId: '39',
        assignee: 'developer1'
      });

      // 验证整个流程
      expect(taskId).toBeTruthy();
      await requirementHelpers.verifyRequirementStatus(requirementId, '已转任务');
    });

    test('6.2 完整流程：创建→拒绝→修改→重新审批→批准→转任务', async ({ page }) => {
      // 创建需求
      const requirementId = await requirementHelpers.createRequirement(
        '需要修改的需求',
        '初始描述不够详细',
        'medium'
      );

      // 提交审批
      await requirementHelpers.submitForReview(requirementId, ['reviewer1']);

      // 审批人拒绝
      await page.goto('/logout');
      await helpers.safeFill('[data-testid="username-input"]', 'reviewer1');
      await helpers.safeFill('[data-testid="password-input"]', 'password123');
      await helpers.safeClick('[data-testid="login-button"]');
      await helpers.waitForNetworkIdle();
      await requirementHelpers.rejectRequirement(requirementId, '描述需要更详细');

      // 切换回原用户修改需求
      await page.goto('/logout');
      await helpers.safeFill('[data-testid="username-input"]', 'admin');
      await helpers.safeFill('[data-testid="password-input"]', 'admin123');
      await helpers.safeClick('[data-testid="login-button"]');
      await helpers.waitForNetworkIdle();

      await page.goto(`/requirements/${requirementId}`);
      await helpers.safeClick('[data-testid="edit-requirement-button"]');
      await helpers.safeFill('[data-testid="requirement-description-input"]', '已补充详细的需求说明和实施方案');
      await helpers.safeClick('[data-testid="save-requirement"]');
      await helpers.waitForNetworkIdle();

      // 重新提交审批
      await requirementHelpers.submitForReview(requirementId, ['reviewer1']);

      // 审批人批准
      await page.goto('/logout');
      await helpers.safeFill('[data-testid="username-input"]', 'reviewer1');
      await helpers.safeFill('[data-testid="password-input"]', 'password123');
      await helpers.safeClick('[data-testid="login-button"]');
      await helpers.waitForNetworkIdle();
      await requirementHelpers.approveRequirement(requirementId, '修改后符合要求');

      // 转换为任务
      await page.goto('/logout');
      await helpers.safeFill('[data-testid="username-input"]', 'admin');
      await helpers.safeFill('[data-testid="password-input"]', 'admin123');
      await helpers.safeClick('[data-testid="login-button"]');
      await helpers.waitForNetworkIdle();

      const taskId = await requirementHelpers.convertToTask(requirementId, {
        projectId: '39'
      });

      // 验证最终状态
      expect(taskId).toBeTruthy();
      await requirementHelpers.verifyRequirementStatus(requirementId, '已转任务');
    });
  });
});
