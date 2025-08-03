# 工作笔记功能 E2E 测试

这是一个使用 Playwright 构建的端到端测试套件，用于全面测试AI项目管理平台的工作笔记功能。

## 🎯 测试覆盖范围

### 核心功能测试
- ✅ 用户登录验证
- ✅ 文档管理页面导航
- ✅ 工作笔记创建
- ✅ 文档搜索功能（文本搜索和ID搜索）
- ✅ 文档编辑更新
- ✅ 文档排序和筛选
- ✅ 文档详情查看
- ✅ 文档删除功能

### UI/UX 测试
- ✅ 响应式设计验证（桌面/平板/移动端）
- ✅ 加载状态和错误处理
- ✅ 用户操作反馈

### 性能和稳定性测试
- ✅ 页面加载性能测试
- ✅ 快速连续操作稳定性
- ✅ 网络错误恢复能力

## 🚀 快速开始

### 1. 安装依赖

```bash
# 安装 Playwright
npm install @playwright/test --save-dev

# 安装浏览器
npx playwright install

# 或者使用项目配置的脚本
npm run install:browsers
npm run install:deps
```

### 2. 运行测试

```bash
# 运行所有测试（无头模式）
npm run test:e2e

# 运行测试并显示浏览器窗口
npm run test:e2e:headed

# 调试模式运行测试
npm run test:e2e:debug

# 使用 UI 模式运行测试
npm run test:e2e:ui

# 查看测试报告
npm run test:e2e:report
```

### 3. 直接使用 Playwright 命令

```bash
# 运行所有测试
npx playwright test

# 运行特定测试文件
npx playwright test work-notes-e2e.spec.js

# 运行特定测试用例
npx playwright test --grep "用户登录验证"

# 显示浏览器窗口
npx playwright test --headed

# 调试模式
npx playwright test --debug

# 生成代码
npx playwright codegen http://localhost
```

## 📁 文件结构

```
tests/
├── work-notes-e2e.spec.js     # 主要测试用例
├── global-setup.js            # 全局测试设置
├── global-teardown.js         # 全局测试清理
├── README.md                  # 这个文件
└── playwright.config.js       # Playwright 配置文件
```

## ⚙️ 配置说明

### 测试配置
- **基础URL**: `http://localhost`
- **浏览器**: Chromium（可扩展到 Firefox, Safari）
- **视窗大小**: 1280x720
- **超时时间**: 30秒（操作）/ 60秒（导航）
- **重试次数**: CI环境2次，本地0次

### 测试用户
- **用户名**: admin
- **密码**: password123

### 测试数据
测试会创建以下文档：
- 标题：`Playwright自动化测试文档`
- 更新后标题：`Playwright自动化测试文档 - 已更新`

测试完成后会自动删除创建的测试数据。

## 🎬 视频和截图

测试运行时会自动记录：
- ✅ **视频记录**: 每个测试的完整操作视频
- ✅ **失败截图**: 测试失败时的完整页面截图
- ✅ **trace跟踪**: 失败时的详细操作跟踪

文件保存在 `test-results/` 目录中。

## 📊 测试报告

测试完成后会生成以下报告：
- **HTML报告**: `playwright-report/index.html`
- **JSON报告**: `test-results/test-results.json`
- **控制台输出**: 实时测试进度和结果

## 🔧 自定义配置

### 修改测试用户
在 `work-notes-e2e.spec.js` 中修改 `TEST_USER` 对象：

```javascript
const TEST_USER = {
  username: 'your-username',
  password: 'your-password'
};
```

### 修改基础URL
在 `playwright.config.js` 中修改 `baseURL`：

```javascript
use: {
  baseURL: 'http://your-app-url',
  // ...
}
```

### 添加更多浏览器
在 `playwright.config.js` 中添加项目配置：

```javascript
projects: [
  {
    name: 'chromium',
    use: { ...devices['Desktop Chrome'] },
  },
  {
    name: 'firefox',
    use: { ...devices['Desktop Firefox'] },
  },
  {
    name: 'webkit',
    use: { ...devices['Desktop Safari'] },
  },
],
```

## 🐛 故障排除

### 常见问题

1. **登录失败**
   - 检查用户名和密码是否正确
   - 确认应用程序正在运行
   - 检查登录页面的元素选择器

2. **元素未找到**
   - 检查页面是否完全加载
   - 确认元素选择器是否正确
   - 增加等待时间或使用不同的定位策略

3. **网络超时**
   - 增加 `navigationTimeout` 设置
   - 检查应用程序响应时间
   - 考虑使用 `waitForLoadState('networkidle')`

4. **测试不稳定**
   - 添加适当的等待条件
   - 使用更具体的元素选择器
   - 考虑增加重试次数

### 调试技巧

1. **使用调试模式**
   ```bash
   npx playwright test --debug
   ```

2. **查看浏览器操作**
   ```bash
   npx playwright test --headed --slowMo=1000
   ```

3. **查看详细日志**
   ```bash
   DEBUG=pw:api npx playwright test
   ```

4. **生成测试代码**
   ```bash
   npx playwright codegen http://localhost/documents
   ```

## 🤝 贡献指南

### 添加新测试用例

1. 在 `work-notes-e2e.spec.js` 中添加新的 `test()` 块
2. 使用描述性的测试名称
3. 遵循现有的测试结构和命名约定
4. 添加适当的断言和错误处理

### 测试最佳实践

1. **使用稳定的选择器**
   - 优先使用 `data-testid`
   - 避免使用易变的CSS类名
   - 使用语义化的文本选择器

2. **添加有意义的等待**
   - 使用 `waitForSelector()` 等待元素出现
   - 使用 `waitForLoadState()` 等待页面加载
   - 避免使用固定的 `waitForTimeout()`

3. **良好的错误处理**
   - 使用描述性的错误消息
   - 添加调试信息
   - 提供故障排除建议

## 📝 更新日志

### v1.0.0 (当前版本)
- ✅ 初始版本发布
- ✅ 包含10个核心测试用例
- ✅ 支持Chromium浏览器
- ✅ 完整的视频录制和截图功能
- ✅ 响应式设计测试
- ✅ 性能和稳定性测试

---

## 🎉 开始测试

现在你可以运行测试来验证工作笔记功能：

```bash
npm run test:e2e:headed
```

测试将自动打开浏览器，模拟真实用户操作，全面验证工作笔记的所有功能！