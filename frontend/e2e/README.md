# 企业用户模拟系统 E2E 测试

这是企业用户模拟系统的端到端测试套件，使用 Playwright 框架实现全面的功能、安全和性能测试。

## 📁 目录结构

```
e2e/
├── README.md                 # 本文档
├── global-setup.ts          # 全局测试环境设置
├── global-teardown.ts       # 全局测试环境清理
├── impersonation.spec.ts    # 模拟功能测试用例
├── security.spec.ts         # 安全验证测试用例
├── performance.spec.ts      # 性能测试用例
├── auth/                    # 认证状态存储
└── utils/
    └── test-helpers.ts      # 测试辅助工具类
```

## 🚀 快速开始

### 安装依赖

```bash
# 安装 Playwright
npm install --save-dev @playwright/test

# 安装浏览器
npx playwright install
```

### 运行测试

```bash
# 运行所有测试
npm run test:e2e

# 或使用脚本
./scripts/run-e2e-tests.sh

# 运行特定测试类型
./scripts/run-e2e-tests.sh impersonation  # 模拟功能测试
./scripts/run-e2e-tests.sh security       # 安全验证测试
./scripts/run-e2e-tests.sh performance    # 性能测试
```

## 📊 测试类型

### 1. 模拟功能测试 (impersonation.spec.ts)

测试企业用户模拟系统的核心功能：

- ✅ 管理员开始企业模拟
- ✅ 模拟状态横幅显示
- ✅ 退出模拟功能
- ✅ 权限限制验证
- ✅ 企业切换器功能
- ✅ 会话自动过期
- ✅ 模拟历史记录
- ✅ 错误状态处理
- ✅ 响应式设计
- ✅ 可访问性支持

### 2. 安全验证测试 (security.spec.ts)

验证系统的安全机制：

- 🔒 CSRF 保护机制
- 🔒 会话超时处理
- 🔒 权限边界验证
- 🔒 输入内容 Sanitization
- 🔒 SQL 注入防护
- 🔒 XSS 攻击防护
- 🔒 文件上传安全
- 🔒 暴力破解防护
- 🔒 敏感信息泄露防护
- 🔒 Content Security Policy
- 🔒 安全头配置
- 🔒 会话隔离验证

### 3. 性能测试 (performance.spec.ts)

测试系统性能表现：

- ⚡ 页面加载时间
- ⚡ 模拟操作响应时间
- ⚡ 大数据量处理
- ⚡ 搜索功能性能
- ⚡ 内存使用监控
- ⚡ 网络请求优化
- ⚡ 并发操作性能
- ⚡ 长时间运行稳定性
- ⚡ 资源泄漏检测

## 🛠️ 测试工具类

### TestHelpers
基础测试操作工具类：
- `waitAndGet()` - 等待元素出现并获取
- `safeFill()` - 安全填写表单
- `safeClick()` - 安全点击元素
- `verifyPageTitle()` - 验证页面标题
- `takeDebugScreenshot()` - 调试截图

### ImpersonationTestHelpers
模拟功能专用工具类：
- `startImpersonation()` - 开始企业模拟
- `exitImpersonation()` - 退出模拟
- `verifyImpersonationBanner()` - 验证模拟横幅
- `verifyPermissionRestrictions()` - 验证权限限制

### SecurityTestHelpers
安全验证工具类：
- `verifyCsrfProtection()` - CSRF 保护验证
- `verifySessionTimeout()` - 会话超时验证
- `verifyPermissionBoundaries()` - 权限边界验证
- `verifyInputSanitization()` - 输入清理验证

### PerformanceTestHelpers
性能测试工具类：
- `measurePageLoadTime()` - 页面加载时间测量
- `measureImpersonationResponseTime()` - 模拟响应时间测量
- `verifyMemoryUsage()` - 内存使用验证

## 🎯 测试命令

### 基本命令
```bash
# 所有测试
./scripts/run-e2e-tests.sh all

# 特定测试类型
./scripts/run-e2e-tests.sh impersonation
./scripts/run-e2e-tests.sh security
./scripts/run-e2e-tests.sh performance

# 冒烟测试
./scripts/run-e2e-tests.sh smoke
```

### 浏览器选择
```bash
# 特定浏览器
./scripts/run-e2e-tests.sh all chromium
./scripts/run-e2e-tests.sh all firefox
./scripts/run-e2e-tests.sh all webkit

# 移动端测试
./scripts/run-e2e-tests.sh all mobile

# 所有浏览器
./scripts/run-e2e-tests.sh all all
```

### 环境配置
```bash
# 开发环境（默认）
./scripts/run-e2e-tests.sh all chromium development

# 测试环境
./scripts/run-e2e-tests.sh all chromium staging

# 生产环境（需要确认）
./scripts/run-e2e-tests.sh all chromium production
```

### 显示选项
```bash
# 有头模式（显示浏览器窗口）
./scripts/run-e2e-tests.sh all chromium development false

# 无头模式（默认，后台运行）
./scripts/run-e2e-tests.sh all chromium development true
```

## 📈 测试报告

测试完成后会生成多种格式的报告：

### HTML 报告
```bash
# 查看详细的 HTML 报告
npx playwright show-report
```

### JUnit 报告
- 位置: `test-results/junit-results.xml`
- 用途: CI/CD 集成

### JSON 报告
- 位置: `test-results/results.json`
- 用途: 程序化分析

### 截图和录像
- 失败时自动截图: `test-results/`
- 失败时录制视频: `test-results/`
- 调试截图: `e2e/debug-screenshots/`

## 🔧 配置

### Playwright 配置
主要配置在 `playwright.config.ts` 中：
- 测试超时设置
- 重试策略
- 报告格式
- 浏览器项目配置

### 环境变量
```bash
E2E_BASE_URL=http://localhost:3000        # 前端服务地址
E2E_API_BASE_URL=http://localhost:8081    # 后端API地址
```

## 🐛 调试

### 调试模式
```bash
# 有头模式运行，便于观察
./scripts/run-e2e-tests.sh impersonation chromium development false

# Playwright Inspector
npx playwright test --debug

# 特定测试调试
npx playwright test e2e/impersonation.spec.ts --debug
```

### 调试工具
```typescript
// 在测试中添加断点
await page.pause();

// 截图用于调试
await helpers.takeDebugScreenshot('debug-point-1');

// 控制台输出
console.log('当前URL:', page.url());
```

## 📋 最佳实践

### 1. 数据隔离
- 每个测试使用独立的测试数据
- 测试完成后清理创建的数据
- 使用测试前缀标识测试数据

### 2. 等待策略
```typescript
// ✅ 正确：等待特定元素
await page.waitForSelector('[data-testid="element"]');

// ❌ 错误：硬编码延迟
await page.waitForTimeout(5000);
```

### 3. 元素选择
```typescript
// ✅ 推荐：使用 data-testid
await page.locator('[data-testid="submit-button"]').click();

// ❌ 不推荐：依赖文本或样式
await page.locator('text=提交').click();
```

### 4. 错误处理
```typescript
try {
  await page.locator('[data-testid="button"]').click();
} catch (error) {
  await helpers.takeDebugScreenshot('error-state');
  throw error;
}
```

## 🔄 CI/CD 集成

### GitHub Actions 示例
```yaml
- name: Run E2E tests
  run: |
    npm ci
    npx playwright install --with-deps
    ./scripts/run-e2e-tests.sh regression chromium development true

- name: Upload test results
  uses: actions/upload-artifact@v3
  if: always()
  with:
    name: playwright-report
    path: playwright-report/
```

### Jenkins Pipeline 示例
```groovy
stage('E2E Tests') {
  steps {
    sh 'npm ci'
    sh 'npx playwright install --with-deps'
    sh './scripts/run-e2e-tests.sh all chromium staging true'
  }
  post {
    always {
      publishTestResults testResultsPattern: 'test-results/junit-results.xml'
      archiveArtifacts artifacts: 'playwright-report/**/*'
    }
  }
}
```

## 📞 支持

如需帮助或有问题：
1. 查看测试报告中的错误信息
2. 检查调试截图
3. 查看控制台输出
4. 联系开发团队

## 📄 更新日志

- **v1.0.0** - 初始版本，包含基本的模拟功能测试
- **v1.1.0** - 添加安全验证测试套件
- **v1.2.0** - 添加性能测试和可访问性测试
- **v1.3.0** - 完善测试工具类和报告系统