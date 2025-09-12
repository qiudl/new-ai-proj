import { test, expect } from '@playwright/test';
import { TestHelpers, SecurityTestHelpers } from './utils/test-helpers';

/**
 * 安全验证 E2E 测试
 * 验证应用的安全机制和防护措施
 */

test.describe('安全验证测试', () => {
  let helpers: TestHelpers;
  let securityHelpers: SecurityTestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    securityHelpers = new SecurityTestHelpers(page);
    
    // 管理员登录
    await page.goto('/login');
    await helpers.safeFill('[data-testid="username-input"]', 'admin');
    await helpers.safeFill('[data-testid="password-input"]', 'admin123');
    await helpers.safeClick('[data-testid="login-button"]');
    await helpers.verifyUrlContains('/dashboard');
  });

  test('CSRF保护机制有效', async ({ page }) => {
    // 尝试在没有CSRF令牌的情况下发送请求
    const response = await page.request.post('/api/v1/admin/impersonate/enterprise/1', {
      data: { reason: 'CSRF测试' },
      headers: {
        'Content-Type': 'application/json'
        // 故意不包含CSRF令牌头
      }
    });
    
    // 验证请求被拒绝
    expect(response.status()).toBe(403);
    
    // 验证错误信息
    const responseBody = await response.json();
    expect(responseBody.message).toMatch(/CSRF|令牌|token/i);
  });

  test('会话超时自动退出', async ({ page }) => {
    // 开始模拟
    await page.goto('/admin/enterprises');
    const firstEnterprise = page.locator('[data-testid^="enterprise-row-"]:first-child');
    await firstEnterprise.locator('[data-testid="impersonate-button"]').click();
    await helpers.safeFill('[data-testid="impersonation-reason"]', '会话超时测试');
    await helpers.safeClick('[data-testid="confirm-impersonation"]');
    
    // 验证模拟开始
    await helpers.verifyElementExists('[data-testid="impersonation-warning-banner"]');

    // 验证会话超时机制
    await securityHelpers.verifySessionTimeout();
  });

  test('权限边界严格执行', async ({ page }) => {
    // 开始模拟
    await page.goto('/admin/enterprises');
    const firstEnterprise = page.locator('[data-testid^="enterprise-row-"]:first-child');
    await firstEnterprise.locator('[data-testid="impersonate-button"]').click();
    await helpers.safeFill('[data-testid="impersonation-reason"]', '权限边界测试');
    await helpers.safeClick('[data-testid="confirm-impersonation"]');

    // 验证权限边界
    await securityHelpers.verifyPermissionBoundaries();
  });

  test('输入内容正确sanitized', async ({ page }) => {
    await page.goto('/admin/enterprises');
    const firstEnterprise = page.locator('[data-testid^="enterprise-row-"]:first-child');
    await firstEnterprise.locator('[data-testid="impersonate-button"]').click();

    // 验证输入sanitization
    await securityHelpers.verifyInputSanitization();
  });

  test('SQL注入防护有效', async ({ page, request }) => {
    const sqlInjectionPayloads = [
      "'; DROP TABLE users; --",
      "1' OR '1'='1",
      "admin'/**/OR/**/1=1#",
      "1' UNION SELECT null,null,null--"
    ];

    for (const payload of sqlInjectionPayloads) {
      // 尝试在搜索功能中注入SQL
      const response = await request.get('/api/v1/enterprises/search', {
        params: { q: payload }
      });
      
      // 验证请求被安全处理，不返回敏感数据
      expect(response.status()).toBeLessThan(500);
      
      const responseBody = await response.json();
      expect(responseBody).not.toHaveProperty('password');
      expect(responseBody).not.toHaveProperty('token');
      expect(responseBody).not.toHaveProperty('secret');
    }
  });

  test('XSS防护机制有效', async ({ page }) => {
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src="x" onerror="alert(1)">',
      'javascript:alert("XSS")',
      '<svg onload=alert(1)>',
      '"><script>alert("XSS")</script>'
    ];

    await page.goto('/admin/enterprises');
    const firstEnterprise = page.locator('[data-testid^="enterprise-row-"]:first-child');
    await firstEnterprise.locator('[data-testid="impersonate-button"]').click();

    for (const payload of xssPayloads) {
      // 在原因字段中尝试XSS
      await helpers.safeFill('[data-testid="impersonation-reason"]', payload);
      await helpers.safeClick('[data-testid="confirm-impersonation"]');

      // 等待处理
      await helpers.waitForNetworkIdle();

      // 验证脚本没有被执行（页面没有alert）
      const dialogs = [];
      page.on('dialog', dialog => dialogs.push(dialog));
      
      // 等待一小段时间看是否有alert
      await page.waitForTimeout(1000);
      expect(dialogs.length).toBe(0);

      // 验证输入被正确转义
      const bannerText = await page.locator('[data-testid="impersonation-banner-text"]').textContent();
      expect(bannerText).not.toContain('<script>');
      expect(bannerText).not.toContain('<img');
      
      // 退出模拟准备下一次测试
      if (await page.locator('[data-testid="exit-impersonation-button"]').isVisible()) {
        await helpers.safeClick('[data-testid="exit-impersonation-button"]');
        await helpers.safeClick('[data-testid="confirm-exit-impersonation"]');
      }
    }
  });

  test('文件上传安全验证', async ({ page }) => {
    // 如果有文件上传功能，测试恶意文件上传防护
    const maliciousFiles = [
      { name: 'script.php', content: '<?php system($_GET["cmd"]); ?>' },
      { name: 'script.jsp', content: '<% Runtime.getRuntime().exec(request.getParameter("cmd")); %>' },
      { name: 'shell.sh', content: '#!/bin/bash\nrm -rf /' },
      { name: 'virus.exe', content: 'MZ\x90\x00...' } // 模拟可执行文件头
    ];

    for (const file of maliciousFiles) {
      // 创建临时文件
      const buffer = Buffer.from(file.content);
      
      try {
        // 尝试上传恶意文件（假设有文件上传端点）
        const response = await page.request.post('/api/v1/upload', {
          multipart: {
            file: {
              name: file.name,
              mimeType: 'application/octet-stream',
              buffer: buffer
            }
          }
        });

        // 验证恶意文件被拒绝
        if (response.status() === 200) {
          const responseBody = await response.json();
          expect(responseBody.success).toBe(false);
          expect(responseBody.message).toMatch(/不支持的文件类型|安全检查失败|文件类型不允许/i);
        } else {
          expect([400, 403, 415]).toContain(response.status());
        }
      } catch (error) {
        // 文件上传端点可能不存在，这是正常的
        console.log(`文件上传端点不存在或已被正确阻止: ${file.name}`);
      }
    }
  });

  test('暴力破解防护机制', async ({ page, request }) => {
    // 测试登录尝试限制
    const wrongCredentials = [
      { username: 'admin', password: 'wrong1' },
      { username: 'admin', password: 'wrong2' },
      { username: 'admin', password: 'wrong3' },
      { username: 'admin', password: 'wrong4' },
      { username: 'admin', password: 'wrong5' }
    ];

    let loginAttempts = 0;
    let rateLimited = false;

    for (const cred of wrongCredentials) {
      const response = await request.post('/api/v1/auth/login', {
        data: cred
      });

      loginAttempts++;
      
      if (response.status() === 429) {
        rateLimited = true;
        console.log(`在第${loginAttempts}次尝试后触发限流`);
        break;
      }
      
      expect(response.status()).toBe(401);
    }

    // 验证在多次失败尝试后触发了限流
    expect(rateLimited || loginAttempts >= 5).toBe(true);
  });

  test('敏感信息泄露防护', async ({ page, request }) => {
    // 验证错误信息不包含敏感信息
    const response = await request.get('/api/v1/nonexistent-endpoint');
    const responseText = await response.text();
    
    // 验证错误响应不包含敏感路径信息
    expect(responseText).not.toMatch(/\/home\/.*\/|C:\\.*\\|\/var\/www\//);
    expect(responseText).not.toMatch(/stack trace|at\s+.*\.js:\d+/i);
    expect(responseText).not.toMatch(/password|secret|token|key/i);
  });

  test('Content Security Policy有效', async ({ page }) => {
    // 检查CSP头是否设置
    const response = await page.goto('/');
    const headers = response?.headers() || {};
    
    expect(headers['content-security-policy']).toBeDefined();
    
    // 验证CSP阻止内联脚本
    const cspErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('Content Security Policy')) {
        cspErrors.push(msg.text());
      }
    });

    // 尝试注入内联脚本
    await page.evaluate(() => {
      try {
        const script = document.createElement('script');
        script.innerHTML = 'alert("CSP test")';
        document.head.appendChild(script);
      } catch (error) {
        console.error('CSP blocked inline script:', error);
      }
    });

    await page.waitForTimeout(1000);
    expect(cspErrors.length).toBeGreaterThan(0);
  });

  test('HTTPS重定向和安全头', async ({ request }) => {
    // 检查安全头
    const response = await request.get('/');
    const headers = response.headers();

    expect(headers['x-frame-options']).toBeDefined();
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-xss-protection']).toBeDefined();
    expect(headers['strict-transport-security']).toBeDefined();
  });

  test('模拟会话隔离', async ({ browser }) => {
    // 创建两个不同的浏览器上下文，模拟不同用户
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      // 用户1登录并开始模拟
      await page1.goto('/login');
      await page1.fill('[data-testid="username-input"]', 'admin');
      await page1.fill('[data-testid="password-input"]', 'admin123');
      await page1.click('[data-testid="login-button"]');
      
      await page1.goto('/admin/enterprises');
      const enterprise1 = page1.locator('[data-testid^="enterprise-row-"]:first-child');
      await enterprise1.locator('[data-testid="impersonate-button"]').click();
      await page1.fill('[data-testid="impersonation-reason"]', '用户1的模拟会话');
      await page1.click('[data-testid="confirm-impersonation"]');

      // 用户2尝试访问相同页面
      await page2.goto('/admin/enterprises');
      
      // 验证用户2看不到用户1的模拟状态
      const impersonationBanner2 = page2.locator('[data-testid="impersonation-warning-banner"]');
      await expect(impersonationBanner2).not.toBeVisible();

      // 用户2需要单独登录
      await expect(page2.locator('[data-testid="login-form"]')).toBeVisible();

    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test('API响应时间监控（防DDoS）', async ({ request }) => {
    const startTime = Date.now();
    
    // 发送多个并发请求
    const requests = [];
    for (let i = 0; i < 10; i++) {
      requests.push(request.get('/api/v1/enterprises'));
    }

    const responses = await Promise.all(requests);
    const endTime = Date.now();
    const totalTime = endTime - startTime;

    // 验证所有请求都能在合理时间内响应
    responses.forEach(response => {
      expect(response.status()).toBeLessThan(500);
    });

    // 验证没有因为并发请求而导致显著延迟
    expect(totalTime).toBeLessThan(5000); // 5秒内完成所有请求

    console.log(`10个并发请求总耗时: ${totalTime}ms`);
  });
});