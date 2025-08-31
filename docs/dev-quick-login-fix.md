# dev_quick_login 认证问题分析与解决方案

## 问题描述
调用 `ai-proj:dev_quick_login` 时返回 404 错误，提示"认证失败，请检查API令牌"。

## 问题原因
1. **API 路径错误**：MCP 配置中使用了错误的 API 路径
   - ❌ 错误路径：`/dev/quick-login`
   - ✅ 正确路径：`/auth/dev/quick-login`

2. **后端路由配置**：new-ai-proj 后端的快速登录接口位于 auth 路由组下
   - 完整路径：`/api/v1/auth/dev/quick-login`
   - 兼容路径：`/api/v1/auth/dev-quick-login`

## 解决步骤

### 1. 修复 MCP 配置
**文件**：`~/coding/www/projects/new-ai-proj/mcp-task-bridge/task-mcp.ts`
**行号**：约 262 行

```typescript
// 修改前
const response = await this.taskService.makeRequest('POST', '/dev/quick-login', {

// 修改后
const response = await this.taskService.makeRequest('POST', '/auth/dev/quick-login', {
```

### 2. 重新编译 MCP
```bash
cd ~/coding/www/projects/new-ai-proj/mcp-task-bridge
npm run build
```

### 3. 重启 MCP 服务
- 方法1：重启 Claude 应用程序（推荐）
- 方法2：手动终止并重启 MCP 进程

## 验证结果

### API 测试
```bash
curl -X POST http://localhost:8081/api/v1/auth/dev/quick-login \
    -H "Content-Type: application/json" \
    -d '{"username": "admin"}'
```

**响应**：✅ 成功
- 返回 access_token
- 返回用户信息（admin）
- HTTP 状态码：200

### 相关文件
1. **后端路由定义**
   - 文件：`~/coding/www/projects/new-ai-proj/backend/routes/auth_routes.go`
   - 路由：`auth.POST("/dev/quick-login", authHandler.DevQuickLogin)`

2. **MCP 配置**
   - 文件：`~/coding/www/projects/new-ai-proj/mcp-task-bridge/.env`
   - API基础：`TASK_API_BASE=http://localhost:8081/api/v1`

3. **MCP 实现**
   - 文件：`~/coding/www/projects/new-ai-proj/mcp-task-bridge/task-mcp.ts`
   - 方法：`devQuickLogin(username?: string)`

## 测试脚本
已创建测试脚本：`~/coding/www/projects/new-ai-proj/test-login.sh`

运行测试：
```bash
chmod +x ~/coding/www/projects/new-ai-proj/test-login.sh
./test-login.sh
```

## 注意事项
1. MCP 服务需要重启才能加载新的编译代码
2. Claude 应用可能缓存了 MCP 连接，需要重启应用
3. 确保后端服务正在运行（端口 8081）
4. Token 会保存到 `~/.new-ai-proj-token` 供后续使用

## 当前状态
✅ **问题已解决**
- API 路径已修正
- 后端接口正常工作
- 测试验证通过
- 等待 Claude/MCP 重新加载即可使用