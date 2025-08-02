# Playwright E2E 测试 - Create Task 功能验证

## 测试概述

这个测试用例专门用于验证任务管理系统的 `create_task` 功能，通过 Playwright 自动化测试工具模拟真实用户操作，并录制整个测试过程。

## 测试目标

验证用户能够：
1. 成功登录系统（用户名：admin，密码：password）
2. 导航到指定任务详情页 (http://localhost/projects/1/tasks/50)
3. 找到并点击创建子任务按钮
4. 填写任务标题和描述
5. 提交任务并验证创建成功
6. 查看任务列表变化

## 测试特点

- 🎥 **全程录制视频** - 记录每个操作步骤
- 🐌 **慢速执行** - 每个操作延迟1秒，页面切换停留2秒
- 🎯 **模拟真实用户** - 使用自然的点击、滚动、输入操作
- 📸 **自动截图** - 测试完成时保存全页面截图
- 🔍 **智能元素定位** - 支持多种选择器策略，适应不同的UI设计

## 快速开始

### 前置条件

1. 确保任务管理系统正在运行：
   ```bash
   docker-compose up -d
   ```

2. 验证系统可访问：
   ```bash
   curl http://localhost
   ```

### 运行测试

```bash
# 方法1: 使用便捷脚本（推荐）
./run-test.sh

# 方法2: 直接使用 npm
npm install
npm run test:create-task

# 方法3: 使用 Playwright 命令
npx playwright test tests/create-task.spec.js --headed
```

## 文件结构

```
/Users/johnqiu/coding/www/projects/new-ai-proj/
├── tests/
│   └── create-task.spec.js      # 主测试文件
├── test-results/                # 测试结果目录
│   ├── videos/                  # 测试视频
│   ├── screenshots/             # 截图文件
│   └── html-report/             # HTML测试报告
├── playwright.config.js         # Playwright配置
├── package.json                 # 项目依赖
├── run-test.sh                  # 测试运行脚本
└── README.md                    # 本文档
```

## 测试流程详解

### 第1步: 登录验证
- 访问 http://localhost
- 自动识别用户名和密码输入框
- 输入凭据：admin / password
- 点击登录按钮并等待页面加载

### 第2步: 导航到任务页面
- 直接跳转到 http://localhost/projects/1/tasks/50
- 验证URL正确性
- 等待页面完全加载

### 第3步: 任务信息查看
- 获取当前任务标题
- 显示任务基本信息
- 为后续操作做准备

### 第4步: 寻找创建按钮
- 智能搜索多种可能的按钮选择器：
  - 专门的子任务创建按钮
  - 通用创建/添加按钮
  - 右键菜单选项
- 支持中英文按钮文本

### 第5步: 填写任务内容
- 自动识别标题输入框
- 输入测试任务标题
- 查找描述输入框
- 填写详细的任务描述

### 第6步: 提交和验证
- 查找提交/保存按钮
- 点击提交
- 检测成功消息
- 验证任务列表变化

## 测试结果

### 视频录制
- 格式：WebM
- 分辨率：1280x720
- 位置：`test-results/videos/`

### 截图
- 格式：PNG
- 类型：全页面截图
- 位置：`test-results/screenshots/`

### HTML报告
- 详细的测试执行报告
- 查看命令：`npx playwright show-report`

## 自定义配置

### 修改测试速度
在 `tests/create-task.spec.js` 中调整：
```javascript
const SLOW_DELAY = 1000;           // 操作间延迟
const PAGE_TRANSITION_DELAY = 2000; // 页面切换延迟
```

### 修改登录信息
在测试文件中更新：
```javascript
await usernameField.fill('your-username');
await passwordField.fill('your-password');
```

### 修改目标任务
更改测试的任务ID：
```javascript
await page.goto('http://localhost/projects/1/tasks/YOUR_TASK_ID');
```

## 故障排除

### 常见问题

1. **系统未启动**
   ```bash
   # 启动系统
   docker-compose up -d
   ```

2. **端口冲突**
   - 检查 http://localhost 是否可访问
   - 确认没有其他服务占用80端口

3. **浏览器未安装**
   ```bash
   npx playwright install chromium
   ```

4. **元素未找到**
   - 检查页面是否正确加载
   - 验证元素选择器是否匹配实际HTML结构

### 调试模式

启用调试模式逐步执行：
```bash
npx playwright test tests/create-task.spec.js --debug
```

## 扩展测试

基于此测试用例，可以扩展更多功能：

1. **编辑任务测试**
2. **删除任务测试**
3. **任务状态变更测试**
4. **批量操作测试**
5. **权限验证测试**

## 技术栈

- **Playwright**: 端到端测试框架
- **Node.js**: 运行环境
- **Chromium**: 测试浏览器
- **JavaScript**: 测试脚本语言

## 联系信息

如有问题，请查看：
- Playwright官方文档：https://playwright.dev/
- 项目技术文档：./docs/
- 测试报告：`npx playwright show-report`
