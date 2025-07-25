# 定时器功能测试方案

## 问题描述
用户报告：工作台定时器的弹窗完成选择任务后，点击"开始计时任务"按钮，计时并没有开始。

## 测试架构

### Phase 1: 前端流程测试 🎯

#### Test 1.1: 任务选择流程验证
**目标**: 验证任务选择弹窗的完整流程

**步骤**:
1. 打开浏览器开发者工具 (F12)
2. 访问工作台页面 `http://localhost:3000/dashboard`
3. 观察定时器卡片状态
4. 点击"选择要计时的任务"按钮
5. 在弹窗中选择项目
6. 选择具体任务
7. 点击"开始计时任务"按钮
8. 观察控制台输出和页面变化

**预期结果**:
- 弹窗正常打开和关闭
- 任务选择状态正确更新
- 无JavaScript错误

#### Test 1.2: 状态管理验证
**目标**: 验证选中任务的状态是否正确传递

**步骤**:
1. 在控制台中执行以下代码检查状态:
```javascript
// 检查定时器组件的状态
console.log('Selected Task ID:', window.selectedTaskId);
console.log('Selected Task Title:', window.selectedTaskTitle);
```

### Phase 2: API调用测试 🌐

#### Test 2.1: 定时器API端点验证
**目标**: 确保定时器相关API能正常访问

**手动API测试**:
```bash
# 1. 获取当前登录token
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjozNCwidXNlcm5hbWUiOiJxaXVkbCIsInJvbGUiOiJhZG1pbiIsInVzZXJfdHlwZSI6InN5c3RlbSIsInN1YiI6InFpdWRsIiwiZXhwIjoxNzUzNTE5NTU0LCJuYmYiOjE3NTM0MzMxNTQsImlhdCI6MTc1MzQzMzE1NH0.3N8HAyyXecfxX0Qd28IttKA_HThTxmMu21Sp0cfsvjA"

# 2. 测试获取当前定时器状态
NO_PROXY=localhost,127.0.0.1 curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/timer/current | jq

# 3. 测试获取可用任务列表
NO_PROXY=localhost,127.0.0.1 curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/tasks?status=todo,in_progress&limit=10 | jq

# 4. 测试启动定时器 (需要真实任务ID)
NO_PROXY=localhost,127.0.0.1 curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"task_id": 48}' \
  http://localhost:8080/api/v1/timer/start | jq
```

#### Test 2.2: 前端代理测试
**目标**: 验证前端通过代理访问API是否正常

```bash
# 通过前端代理测试API
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/timer/current | jq
```

### Phase 3: 错误调试测试 🐛

#### Test 3.1: 浏览器控制台监控
**目标**: 捕获JavaScript错误和API调用失败

**执行步骤**:
1. 打开开发者工具 -> Network标签
2. 勾选"Preserve log"
3. 执行完整的定时器启动流程
4. 观察以下内容：
   - HTTP请求状态码
   - 请求/响应内容
   - JavaScript控制台错误
   - React组件状态变化

#### Test 3.2: 前端日志增强
**目标**: 增加调试日志来追踪问题

**实施**: 在关键函数中添加调试日志

### Phase 4: 集成测试 🔧

#### Test 4.1: 端到端流程测试
**目标**: 模拟完整用户操作流程

**测试场景**:
1. 用户登录
2. 进入工作台
3. 选择任务
4. 启动定时器
5. 验证定时器运行
6. 停止定时器

#### Test 4.2: 边界条件测试
**目标**: 测试异常情况处理

**测试场景**:
- 网络连接中断
- 无效的任务ID
- 已经有正在运行的定时器
- token过期

## 测试执行计划

### 立即执行 (Priority 1)
- [ ] Phase 1: 前端流程测试
- [ ] Phase 2.1: API端点验证

### 后续执行 (Priority 2)  
- [ ] Phase 2.2: 前端代理测试
- [ ] Phase 3: 错误调试测试

### 深度测试 (Priority 3)
- [ ] Phase 4: 集成测试

## 预期问题点

基于代码分析，可能的问题包括：
1. **API路径错误**: 定时器服务的API路径配置
2. **代理配置问题**: 前端setupProxy.js的配置
3. **状态同步问题**: 任务选择后状态未正确更新
4. **异步处理问题**: API调用的错误处理
5. **认证问题**: JWT Token过期或无效

## 测试工具准备

```bash
# 1. 安装测试工具
npm install -g json-server  # API模拟工具
pip install httpie          # HTTP客户端工具

# 2. 浏览器插件
# - React Developer Tools
# - Redux DevTools (如果使用Redux)

# 3. 监控工具  
# - 浏览器开发者工具
# - Network监控
# - Console日志监控
```

## 问题报告模板

```markdown
### 发现的问题
- **问题描述**: 
- **重现步骤**: 
- **预期行为**: 
- **实际行为**: 
- **错误日志**: 
- **浏览器信息**: 
- **时间戳**: 

### 解决方案
- **根本原因**: 
- **修复方法**: 
- **测试验证**: 
```