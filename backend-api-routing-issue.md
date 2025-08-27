# 后端 API 路由问题分析和解决方案

## 问题发现

### 1. 用户登录身份显示问题
- 用户 `guoym` 能正常登录，但前端显示用户名为 `admin`
- 权限访问存在问题

### 2. MCP 服务器连接问题  
- `ai-proj:dev_quick_login` 失败：未从响应中获取到 token
- `ai-proj:list_tasks` 失败：404 错误

### 3. API 路由结构问题
通过排查发现，后端 API 路由结构与 MCP 服务器期望不匹配：

**MCP 服务器期望的路由：**
- `/api/v1/tasks` - 获取任务列表
- `/api/v1/tasks/:id` - 单个任务操作
- `/api/v1/auth/dev-quick-login` - 开发登录

**后端实际的路由：**
- `/api/v1/projects/:id/tasks` - 任务操作嵌套在项目下
- `/api/v1/auth/dev-quick-login` - 开发登录（存在）

## 根本原因

### 1. API 架构设计差异
- 后端采用 RESTful 嵌套设计：任务属于项目，需要项目ID
- MCP 服务器假设任务是独立资源，不需要项目上下文

### 2. token 字段映射问题  
- 后端返回：`access_token`
- MCP 期望：`token` 
- 已修复：`const token = payload.access_token || payload.token;`

### 3. 用户身份配置不一致
- Docker 环境：`DEV_LOGIN_USERNAME=admin`
- 本地 MCP：`DEV_LOGIN_USERNAME=guoym`（已修复）

## 解决方案

### 方案1：修改 MCP 服务器适配嵌套路由（推荐）
1. 更新 MCP 服务器以支持项目上下文
2. 修改所有任务相关 API 调用包含项目ID
3. 添加默认项目 ID 配置（如项目ID=1）

### 方案2：后端添加平铺任务路由
1. 在 `/api/v1/tasks` 添加直接任务访问路由  
2. 保留现有嵌套路由不变
3. 需要修改后端路由和处理器

### 方案3：统一配置管理
1. 创建统一的环境配置文件
2. 确保所有服务使用相同的用户配置
3. 简化部署和维护

## 实施步骤

### 立即修复
1. ✅ 修复 MCP token 提取逻辑
2. ✅ 统一用户名配置为 `guoym`
3. ⏳ 实现方案1：MCP 支持项目上下文

### 后续优化
1. 添加更好的错误处理和调试日志
2. 实现配置验证机制
3. 文档化 API 路由结构

## 测试验证

### 后端 API 测试
```bash
# 开发登录测试（✅ 通过）
curl -X POST http://localhost:8081/api/v1/auth/dev-quick-login \
  -H "Content-Type: application/json" \
  -d '{"username":"guoym"}'

# 项目任务列表测试  
curl -X GET http://localhost:8081/api/v1/projects/1/tasks \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

### MCP 服务器测试
```bash
# 需要实现项目上下文支持后测试
ai-proj:dev_quick_login guoym
ai-proj:list_tasks projectId=1
```
