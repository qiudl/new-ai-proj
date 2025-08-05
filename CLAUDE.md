# AI项目管理平台 - Claude开发指南

## 项目概述
这是一个基于React + TypeScript (前端) + Go + PostgreSQL (后端) 的全栈项目管理平台，支持任务管理、时间跟踪、文档协作等功能。

## MCP任务管理规范
- **强制要求**: 只能用MCP工具去创建、查询、编辑、删除任务
- **任务层级**: 分析任务性质，在项目ID=1中找到本周根任务，然后创建子任务
- **问题处理**: 子任务执行中发现新问题时创建孙任务
- **API限制**: 禁止用直接API调用操作任务系统，必须使用MCP接口

### MCP工具使用示例
```bash
# 查找根任务
node mcp-task-bridge/find-root-tasks.js

# 创建子任务 
mcp create_task --title "任务标题" --description "详细描述" --parent_id 397
```

## 技术架构

### 前端技术栈
- **框架**: React 18 + TypeScript
- **UI库**: Ant Design 5.x
- **状态管理**: React Query + Context API
- **路由**: React Router v6
- **构建工具**: Create React App
- **样式**: CSS Modules + Ant Design主题

### 后端技术栈
- **语言**: Go 1.21+
- **框架**: Gin Web Framework
- **数据库**: PostgreSQL 15+
- **ORM**: 直接SQL + sqlx
- **认证**: JWT Bearer Token
- **容器**: Docker + Docker Compose

### 关键组件和服务

#### 前端核心组件
- `TaskDetailPageNew.tsx` - 任务详情页
- `UnifiedTimerProvider.tsx` - 统一计时器上下文
- `archiveService.ts` - 任务归档服务
- `api.ts` - 统一API客户端

#### 后端核心服务
- `UnifiedTimerHandler` - 统一计时器处理器
- `ArchiveHandler` - 任务归档处理器
- `UnifiedDocumentHandler` - 文档统一处理器

## 常用开发命令

### 启动服务
```bash
# 完整启动 (推荐)
docker-compose up -d

# 单独启动前端开发服务器
cd frontend && npm start

# 单独启动后端
cd backend && go run main.go
```

### 测试和调试
```bash
# 前端类型检查
cd frontend && npm run type-check

# 后端测试特定功能
node test-archive-functionality.js

# 健康检查
curl http://localhost:8080/health
```

### 数据库操作
```bash
# 连接数据库
docker-compose exec db psql -U user -d main_db

# 查看任务表结构
\d tasks

# 查看归档任务
SELECT * FROM tasks WHERE deleted_at IS NOT NULL;
```

## API端点说明

### 认证相关
- `POST /api/v1/auth/login` - 用户登录
- `POST /api/v1/auth/logout` - 用户登出

### 任务管理
- `GET /api/v1/projects/{id}/tasks` - 获取项目任务
- `POST /api/v1/projects/{id}/tasks` - 创建任务
- `PUT /api/v1/projects/{id}/tasks/{taskId}` - 更新任务
- `DELETE /api/v1/projects/{id}/tasks/{taskId}` - 删除任务(软删除)

### 任务归档
- `POST /api/v1/projects/{id}/tasks/{taskId}/archive` - 归档任务
- `POST /api/v1/projects/{id}/tasks/{taskId}/unarchive` - 取消归档
- `GET /api/v1/projects/{id}/tasks/archived` - 获取归档任务列表

### 计时器功能
- `GET /api/v1/user/timer/current` - 获取当前计时状态
- `POST /api/v1/user/timer/start` - 启动计时器
- `POST /api/v1/user/timer/stop` - 停止计时器
- `POST /api/v1/user/timer/pause` - 暂停计时器
- `POST /api/v1/user/timer/resume` - 恢复计时器

### 文档管理
- `GET /api/v1/projects/{id}/tasks/{taskId}/documents` - 获取任务文档
- `POST /api/v1/projects/{id}/tasks/{taskId}/documents` - 创建任务文档
- `PUT /api/v1/projects/{id}/tasks/{taskId}/documents` - 更新任务文档

## 已知技术债务和Bug修复记录

### 已修复问题
1. **计时器系统Bug修复** (任务#165)
   - Bug#1: task_time_logs表缺少created_by字段 ✅
   - Bug#2: 任务类型验证过于严格 ✅
   - Bug#3: 历史任务API忽略个人任务 ✅

2. **Mermaid图表渲染问题** (任务#400+)
   - 统一初始化配置 ✅
   - 解决重复初始化冲突 ✅
   - 创建mermaidUtils.ts统一工具 ✅

3. **任务文档上传功能修复**
   - title字段支持 ✅
   - API端点路径修正 ✅
   - 统一文档处理器 ✅

### 当前已知问题
1. **归档统计功能** - archive_statistics表不存在，导致500错误
2. **任务详情页响应式布局** - 小屏幕下右侧浮层遮盖问题 (任务#408)

## Google Calendar集成规划

### 技术可行性 ✅
- 现有Google API基础设施完整
- 时间管理系统架构成熟
- 移动端响应式设计良好

### 集成要点
- 需要添加Google Calendar API依赖
- OAuth2认证流程集成
- 双向同步机制设计
- 移动端手势支持 (已有useMobileGestures.ts)

### 预估开发周期
- **基础集成**: 2-3周
- **高级功能**: 4-6周
- **移动端优化**: 1-2周

## 调试和故障排除

### 常见错误处理
1. **401认证错误**
   - 检查localStorage中的token
   - 确认token未过期
   - 验证Authorization header格式

2. **404路由错误**
   - 确认API端点存在
   - 检查路由参数格式
   - 验证nginx代理配置

3. **500服务器错误**
   - 查看backend日志: `docker-compose logs backend`
   - 检查数据库连接状态
   - 确认相关数据表存在

### Debug日志记录
- API Interceptor encountered 500 Internal Server Error at GET http://localhost:8080/api/v1/analysis/tags/statistics
- Low priority preload strategy initiated in useSmartPreload.ts
- Console error: Query data cannot be undefined for query key ["dashboard","weekly",34,"2025-08-03","2025-08-09",null]

## 开发环境配置

### 必要的环境变量
```bash
# frontend/.env.local
REACT_APP_API_BASE_URL=http://localhost:8080/api/v1
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id
REACT_APP_GOOGLE_API_KEY=your_google_api_key

# backend/.env
DATABASE_URL=postgres://user:password@localhost:5432/main_db
JWT_SECRET=your_jwt_secret
```

### 开发工具
- **API测试**: test-archive-functionality.js
- **MCP工具**: mcp-task-bridge/
- **数据库迁移**: backend/migrations/

## 贡献指南
- 使用MCP工具管理任务
- 遵循现有代码风格
- 添加适当的错误处理
- 编写清晰的提交信息
- 总结请用中文