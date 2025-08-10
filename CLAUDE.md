# Claude Code AI上下文任务系统开发指南

**本文档专为Claude Code实例提供项目操作指导，包含完整的技术架构、开发命令和最佳实践。**

## 项目概述

这是一个企业级全栈上下文任务系统，采用现代化技术栈：
- **前端**: React 18 + TypeScript + Ant Design 5.x
- **后端**: Go 1.24 + Gin + PostgreSQL 16  
- **容器化**: Docker Compose 多服务架构
- **特色功能**: MCP任务智能管理、统一计时器、文档协作、性能监控

## 核心开发命令

### 构建和启动
```bash
# 完整系统启动 (推荐)
docker-compose up -d

# 仅构建前端
cd frontend && npm run build

# 仅构建后端
cd backend && go build -o main main.go

# 开发模式启动
cd frontend && npm start          # 前端开发服务器
cd backend && go run main.go      # 后端开发模式
```

### 代码质量检查
```bash
# 前端代码检查
cd frontend && npm run lint
cd frontend && npm run lint:fix
cd frontend && npm run type-check
cd frontend && npm run type-check:strict

# 格式化代码
cd frontend && npm run format

# TypeScript版本信息
cd frontend && npm run ts:version
cd frontend && npm run ts:info
```

### 测试执行
```bash
# 前端单元测试
cd frontend && npm test

# 后端测试 (Go)
cd backend && go test ./...

# MCP任务管理测试
cd mcp-task-bridge && npm test

# 系统健康检查 (本机开发环境)
curl http://localhost:8081/health
```

### 单一测试执行
```bash
# 前端特定测试文件
cd frontend && npm test -- --testNamePattern="TaskManager"

# 后端特定包测试
cd backend && go test ./handlers -v

# MCP特定功能测试
cd mcp-task-bridge && node test-mcp.js
```

## 高层架构和结构

### 本机开发环境架构图
```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Frontend      │  │   Backend       │  │   Database      │
│   React 18      │◄─┤   Go 1.24       │◄─┤   PostgreSQL    │
│   Port 3000     │  │   Port 8081     │  │   Port 5433     │
│   TypeScript    │  │   Gin Framework │  │   本机数据库    │
│   Ant Design    │  │   JWT Auth      │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
         ▲                      
         │                      
┌─────────────────┐  
│   MCP Bridge    │  
│   Task Mgmt     │  
│   Port 3001     │  
└─────────────────┘  

注意: 本机开发环境无nginx代理，前端直连后端API
```

### Docker测试环境架构图
```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Nginx Proxy   │  │   Frontend      │  │   Backend       │
│   Port 80       │◄─┤   React 18      │◄─┤   Go 1.24       │
│   反向代理      │  │   Port 3000     │  │   Port 8080     │
│   SSL/TLS       │  │   Docker容器    │  │   Gin Framework │
└─────────────────┘  └─────────────────┘  │   JWT Auth      │
         ▲                                └─────────────────┘
         │                                         ▲
         │                                         │
    用户访问入口                        ┌─────────────────┐
    http://localhost/                    │   Database      │
                                        │   PostgreSQL    │
         ▲                              │   Port 5432     │
         │                              │   Docker容器    │
┌─────────────────┐                     └─────────────────┘
│   MCP Bridge    │  
│   Task Mgmt     │  
│   Port 3001     │  
└─────────────────┘  

注意: Docker测试环境使用完整的nginx反向代理架构
```

### 关键技术特性

#### MCP任务管理规范 (核心约束)
- **强制要求**: 必须通过MCP工具操作任务系统
- **任务层级**: 项目ID=1为主项目，严格的父子任务关系
- **API限制**: 禁止直接API调用任务CRUD操作

```bash
# MCP工具命令示例
mcp create_task --title "功能开发" --description "详细描述" --parent_id 397
mcp list_tasks --limit 20
mcp update_task --id 123 --status "completed"
mcp delete_task --id 456
```

#### 前端架构模式
- **组件化**: 基于Ant Design的企业级组件库
- **状态管理**: React Query + Context API混合模式
- **性能优化**: 
  - 虚拟化长列表 (`react-window`)
  - 智能预加载 (`useSmartPreload.ts`)
  - 性能监控 (`documentManagerPerformance.ts`)
- **路由管理**: React Router v6 with lazy loading

#### 后端架构模式
- **模块化设计**: handlers → services → repositories
- **数据层**: 直接SQL + sqlx (无ORM)  
- **认证机制**: JWT Bearer Token + 中间件
- **文档处理**: 统一文档处理器 (`UnifiedDocumentHandler`)
- **计时系统**: 统一计时器架构 (`UnifiedTimerHandler`)

### 核心服务组件

#### 前端关键文件
- `frontend/src/components/TaskDetailPageNew.tsx` - 任务详情页主组件
- `frontend/src/contexts/UnifiedTimerProvider.tsx` - 全局计时器状态
- `frontend/src/services/archiveService.ts` - 任务归档业务逻辑
- `frontend/src/utils/documentManagerPerformance.ts` - 性能监控工具
- `frontend/src/utils/intelligentSearch.ts` - 智能搜索引擎

#### 后端关键文件  
- `backend/handlers/unified_timer_handler.go` - 计时器API处理器
- `backend/handlers/archive_handler.go` - 任务归档处理器
- `backend/handlers/unified_document_handler.go` - 文档统一处理器
- `backend/services/timer_service.go` - 计时器业务逻辑
- `backend/database/timer_repository.go` - 计时器数据访问层

#### MCP任务桥接
- `mcp-task-bridge/index.js` - MCP服务主入口
- `mcp-task-bridge/task-mcp.js` - 任务操作MCP实现

## 数据库管理

### 数据库连接和查询
```bash
# 连接本机PostgreSQL数据库 (端口5433)
psql -h localhost -p 5433 -U user -d main_db

# 查看核心表结构
\d tasks                    # 任务表结构
\d task_time_logs          # 计时记录表
\d users                   # 用户表
\d projects                # 项目表

# 常用查询
SELECT * FROM tasks WHERE deleted_at IS NOT NULL;          # 查看归档任务
SELECT * FROM task_time_logs ORDER BY created_at DESC;     # 最新计时记录  
SELECT COUNT(*) FROM tasks GROUP BY status;                # 任务状态统计
```

### 数据库迁移
```bash
# 查看迁移文件
ls backend/migrations/

# 手动应用迁移 (如需要)
psql -h localhost -p 5433 -U user -d main_db -f backend/migrations/xxx.sql
```

## API端点参考

### 系统健康检查 (本机开发端口8081)
- `GET http://localhost:8081/health` - 系统健康状态
- `GET http://localhost:8081/api/v1/health` - API服务健康状态

### 认证和授权
- `POST /api/v1/auth/login` - 用户登录
- `POST /api/v1/auth/logout` - 用户登出  
- `POST /api/v1/auth/refresh` - Token刷新

### 任务管理 (注意：仅供参考，实际操作请使用MCP工具)
- `GET /api/v1/projects/{id}/tasks` - 获取项目任务列表
- `GET /api/v1/projects/{id}/tasks/{taskId}` - 获取单个任务详情
- `POST /api/v1/projects/{id}/tasks` - 创建新任务
- `PUT /api/v1/projects/{id}/tasks/{taskId}` - 更新任务
- `DELETE /api/v1/projects/{id}/tasks/{taskId}` - 软删除任务

### 统一计时器系统
- `GET /api/v1/user/timer/current` - 获取当前计时状态
- `GET /api/v1/user/timer/health` - 计时器服务健康检查
- `POST /api/v1/user/timer/start` - 启动计时器 (支持项目/个人任务)
- `POST /api/v1/user/timer/pause` - 暂停当前计时
- `POST /api/v1/user/timer/resume` - 恢复计时
- `POST /api/v1/user/timer/stop` - 停止计时器
- `GET /api/v1/timer/recent-tasks` - 获取最近计时任务

### 文档协作系统
- `GET /api/v1/projects/{id}/tasks/{taskId}/documents` - 获取任务关联文档
- `POST /api/v1/projects/{id}/tasks/{taskId}/documents` - 创建任务文档
- `PUT /api/v1/projects/{id}/tasks/{taskId}/documents` - 更新文档内容
- `GET /api/v1/work-notes` - 获取工作笔记列表
- `POST /api/v1/work-notes` - 创建工作笔记
- `GET /api/v1/work-notes/search` - 搜索文档内容

### 任务归档管理
- `DELETE /api/v1/projects/{id}/tasks/{taskId}` - 归档任务 (软删除)
- `POST /api/v1/projects/{id}/tasks/{taskId}/restore` - 恢复归档任务
- `GET /api/v1/projects/{id}/tasks/archived` - 查看归档任务列表

## 环境配置和部署

### 本机开发环境配置 (重要)
**当前开发环境使用本机PostgreSQL，非Docker容器化数据库**

```yaml
# 本机开发服务配置
services:
  - db: PostgreSQL 16 本机数据库 (端口5433)
  - backend: Go 1.24 API服务 (端口8081)
  - frontend: React 18 前端应用 (端口3000)
  - 无nginx代理: 前端直连后端API
```

### 本机开发环境变量
```bash
# 关键端口配置
DB_PORT=5433                    # 本机PostgreSQL端口
BACKEND_PORT=8081              # 后端API端口  
DB_NAME=main_db                # 数据库名称

# frontend/.env.local
REACT_APP_API_BASE_URL=http://localhost:8081/api/v1
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id
GENERATE_SOURCEMAP=false
TSC_COMPILE_ON_ERROR=true

# backend/.env  
DATABASE_URL=postgres://user:password@localhost:5433/main_db
DB_SOURCE=postgresql://user:password@localhost:5433/main_db?sslmode=disable
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRATION=168h
```

### 本机开发启动命令
```bash
# 确保PostgreSQL本机服务运行在5433端口
pg_ctl -D /usr/local/var/postgres start

# 启动后端 (端口8081)
cd backend && go run main.go

# 启动前端 (端口3000，API指向8081)
cd frontend && npm start

# 健康检查
curl http://localhost:8081/health
```

### Docker测试环境配置 (重要)
**测试环境使用完整Docker Compose架构，包含nginx反向代理**

```yaml
# Docker测试环境服务配置
services:
  - db: PostgreSQL 16 Docker容器 (端口5432)
  - backend: Go 1.24 API服务 (端口8080)
  - frontend: React 18 前端应用 (端口3000)
  - nginx: 反向代理 (端口80，对外访问入口)
```

### 测试环境变量
```bash
# 关键端口配置 (Docker测试环境)
DB_PORT=5432                    # Docker PostgreSQL端口
BACKEND_PORT=8080              # 后端API内部端口
NGINX_PORT=80                  # nginx对外访问端口
DB_NAME=main_db                # 数据库名称

# frontend/.env (测试环境)
REACT_APP_API_BASE_URL=/api/v1
REACT_APP_ENV=staging
REACT_APP_ENVIRONMENT=staging

# backend/.env (测试环境)  
DATABASE_URL=postgres://user:password@db:5432/main_db
DB_SOURCE=postgresql://user:password@db:5432/main_db?sslmode=disable
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRATION=168h
```

### Docker测试环境启动命令

```bash
# 启动完整Docker测试环境
docker-compose up -d

# 验证所有服务状态
docker-compose ps

# 查看服务日志
docker-compose logs -f backend
docker-compose logs -f frontend  
docker-compose logs -f nginx

# 健康检查 (通过nginx代理)
curl http://localhost/health
curl http://localhost/api/v1/health

# 直接访问后端 (内部调试)
curl http://localhost:8080/health
```

### Docker测试环境数据库连接

```bash
# 连接Docker PostgreSQL数据库 (端口5432)
docker-compose exec db psql -U user -d main_db

# 数据库迁移 (Docker环境)
docker-compose exec backend go run migrations/migrate.go

# 查看Docker数据库状态
docker-compose exec db pg_isready -U user -d main_db
```

### 测试环境nginx配置

```nginx
# nginx/default.conf (测试环境反向代理配置)
upstream backend {
    server backend:8080;
}

upstream frontend {
    server frontend:3000;
}

server {
    listen 80;
    server_name localhost;

    # 前端静态文件
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 后端API请求
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket支持 (前端热重载)
    location /ws {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

### Docker测试环境API端点

```bash
# 系统健康检查 (通过nginx代理，端口80)
curl http://localhost/health                    # nginx代理健康检查
curl http://localhost/api/v1/health            # API服务健康检查

# 直接访问内部服务 (调试用)
curl http://localhost:8080/health              # 直接访问后端
curl http://localhost:3000                     # 直接访问前端

# 数据库连接测试
docker-compose exec backend psql $DATABASE_URL -c "SELECT version();"
```

### 测试环境资源监控

```bash
# Docker容器资源使用情况
docker-compose top
docker stats

# 服务重启 (测试环境)
docker-compose restart nginx
docker-compose restart backend  
docker-compose restart frontend

# 服务扩缩容 (负载测试)
docker-compose up --scale backend=2
docker-compose up --scale frontend=2

# 清理和重建
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### 环境切换指南

#### 从本机开发环境切换到Docker测试环境

```bash
# 1. 停止本机开发服务
# 停止前端 (Ctrl+C)
# 停止后端 (Ctrl+C)

# 2. 确保PostgreSQL本机服务正常运行 (端口5433)
pg_ctl -D /usr/local/var/postgres status

# 3. 启动Docker测试环境
docker-compose up -d

# 4. 验证切换成功
curl http://localhost/health              # 通过nginx代理
curl http://localhost:8080/health         # 直接后端
```

#### 从Docker测试环境切换回本机开发环境

```bash
# 1. 停止Docker测试环境
docker-compose down

# 2. 启动本机PostgreSQL (如未运行)
pg_ctl -D /usr/local/var/postgres start

# 3. 启动本机开发服务
cd backend && go run main.go              # 后端端口8081
cd frontend && npm start                  # 前端端口3000

# 4. 验证切换成功
curl http://localhost:8081/health         # 本机后端
curl http://localhost:3000                # 本机前端
```

#### 环境配置对照表

| 配置项 | 本机开发环境 | Docker测试环境 |
|-------|-------------|---------------|
| 数据库端口 | 5433 | 5432 |
| 后端API端口 | 8081 | 8080 |
| 前端端口 | 3000 | 3000 |
| nginx代理 | 无 | 80端口 |
| API访问方式 | 直连 | nginx代理 |
| 数据库连接 | 本机PostgreSQL | Docker容器 |
| 热重载 | 原生 | Docker Volume |

### 性能监控和调试

#### 前端性能监控
- 使用 `documentManagerPerformance.ts` 进行组件性能追踪
- React Query DevTools 用于API状态调试
- 浏览器开发者工具性能分析

#### 后端日志调试

**Docker测试环境日志:**
```bash
# 查看实时日志
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f nginx

# 查看特定时间段日志
docker-compose logs --since="1h" backend

# 查看容器状态和资源使用
docker-compose ps
docker stats
```

**本机开发环境日志:**
```bash
# 后端控制台日志 (go run main.go输出)
cd backend && go run main.go

# 前端控制台日志 (npm start输出)  
cd frontend && npm start

# PostgreSQL本机日志
tail -f /usr/local/var/log/postgres.log

# 系统日志 (macOS)
log show --predicate 'process == "main"' --info
```

## 技术债务和已知问题

### ✅ 已修复的关键问题
1. **统一计时器系统重构** (任务#165)
   - 数据表字段完整性修复 
   - 任务类型自动推断功能
   - 个人任务与项目任务统一管理

2. **Mermaid图表渲染优化** (任务#631)  
   - 重复初始化冲突解决
   - 统一工具函数封装 (`mermaidUtils.ts`)
   - PDF导出兼容性修复

3. **文档系统统一架构**
   - 任务文档与工作笔记统一处理
   - Markdown编辑器功能增强
   - 批量操作和搜索优化

### ⚠️ 当前技术债务
1. **响应式布局问题** - 任务详情页小屏幕适配 
2. **归档统计缺失** - 统计功能数据表不完整
3. **Google Calendar集成** - OAuth2流程待实现

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

## 项目访问地址

### 开发环境访问 (docker-compose up -d 启动后)
- **主入口 (推荐)**: http://localhost - nginx统一代理入口
- **前端开发服务器**: http://localhost:3000 - React开发服务器 (仅开发时)
- **后端API**: http://localhost:8081 - Go后端API服务 (Docker环境)
- **数据库**: localhost:5433 - PostgreSQL数据库 (Docker环境)

### 本地开发环境 (直接运行服务)
- **前端**: http://localhost:3001 - React开发服务器
- **后端API**: http://localhost:8080 - Go后端API服务
- **数据库**: localhost:5432 - PostgreSQL数据库

### 服务端口说明
```
80   -> nginx反向代理 (Docker环境统一入口)
3000 -> React开发服务器 (Docker环境热重载)
3001 -> React开发服务器 (本地环境)
8080 -> Go后端API (本地环境)
8081 -> Go后端API (Docker环境)
5432 -> PostgreSQL数据库 (本地环境)
5433 -> PostgreSQL数据库 (Docker环境)
```

**🔧 端口分配策略 (支持同时运行):**
- **PostgreSQL**: 本地5432 vs Docker5433 (端口分离)
- **前端**: 本地3001 vs Docker3000 (nginx代理到80)  
- **后端**: 本地8080 vs Docker8081 (完全分离)
- **nginx**: Docker独有80端口

## 开发环境配置

### 环境变量完整配置

#### 本机开发环境变量
```bash
# frontend/.env.local  
REACT_APP_API_BASE_URL=http://localhost:8081/api/v1
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id
REACT_APP_GOOGLE_API_KEY=your_google_api_key

# backend/.env (本机开发)
DATABASE_URL=postgres://user:password@localhost:5433/main_db
DB_SOURCE=postgresql://user:password@localhost:5433/main_db?sslmode=disable
JWT_SECRET=your_jwt_secret
BACKEND_PORT=8081
DB_PORT=5433
```

#### Docker测试环境变量
```bash
# .env (Docker Compose环境变量)
DB_USER=user
DB_PASSWORD=password  
DB_NAME=main_db
DB_PORT=5432
BACKEND_PORT=8080
FRONTEND_PORT=3000
JWT_SECRET=your_jwt_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# frontend/.env (Docker测试环境)
REACT_APP_API_BASE_URL=/api/v1
REACT_APP_ENV=staging
REACT_APP_ENVIRONMENT=staging
CHOKIDAR_USEPOLLING=true

# backend/.env (Docker测试环境，容器内部)  
DATABASE_URL=postgres://user:password@db:5432/main_db
DB_SOURCE=postgresql://user:password@db:5432/main_db?sslmode=disable
JWT_SECRET=your_jwt_secret
JWT_EXPIRATION=168h
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