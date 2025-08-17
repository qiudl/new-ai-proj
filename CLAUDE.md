# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an AI-powered project management system with task management, timer functionality, document management, and company management features. The system consists of a Go backend API, React frontend, PostgreSQL database, and various supporting tools including an MCP (Model Context Protocol) server for Claude Code integration.

## Architecture

### Backend (Go)
- **Framework**: Gin (HTTP web framework)
- **Database**: PostgreSQL with GORM/SQL
- **Authentication**: JWT-based auth system
- **Architecture**: Clean architecture with handlers, services, repositories
- **Key modules**: Tasks, Projects, Timers, Documents, Companies, Users, AI Integration

### Frontend (React)
- **Framework**: React 18 with TypeScript
- **UI Library**: Ant Design
- **State Management**: React Query (@tanstack/react-query)
- **Routing**: React Router v6
- **Styling**: CSS modules + Ant Design theming
- **Key features**: Task management, timer widgets, document editing, dashboard

### Infrastructure
- **Database**: PostgreSQL 16
- **Deployment**: Docker Compose
- **Reverse Proxy**: Nginx
- **MCP Server**: Custom task bridge for Claude Code integration

## Development Commands

### 🐳 Docker开发环境 (推荐)
```bash
# 启动完整开发环境
./scripts/dev-env.sh start

# 查看服务状态
./scripts/dev-env.sh status

# 查看日志
./scripts/dev-env.sh logs [service]

# 进入容器调试
./scripts/dev-env.sh shell backend
./scripts/dev-env.sh shell frontend

# 重启服务
./scripts/dev-env.sh restart

# 停止环境
./scripts/dev-env.sh stop

# 设置PostgreSQL从库
./scripts/dev-env.sh replica
```

### 访问地址
- **前端**: http://localhost:3001
- **后端API**: http://localhost:8081
- **MCP服务器**: http://localhost:3100
- **PostgreSQL主库**: localhost:5433
- **PostgreSQL从库**: localhost:5432 (本机备份)

### 传统开发方式 (不推荐)
```bash
# 后端
cd backend
go run main.go

# 前端
cd frontend  
npm start

# Docker服务
docker-compose up db           # 仅启动数据库
```

### MCP Server
```bash
cd ai-proj-mcp
npm start                      # Start MCP server
npm run dev                    # Start with tsx watch
```

## Key File Locations

### Backend Structure
- `main.go` - Application entry point and dependency injection
- `handlers/` - HTTP request handlers organized by module
- `models/` - Data models and domain entities
- `database/` - Repository implementations and DB interfaces
- `services/` - Business logic and validation services
- `middleware/` - Authentication, audit, and other middleware
- `routes/` - Route definitions and setup
- `config/` - Configuration management
- `migrations/` - Database migration files

### Frontend Structure
- `src/App.tsx` - Main application component with routing
- `src/pages/` - Page components organized by feature
- `src/components/` - Reusable UI components
- `src/services/` - API service layers
- `src/hooks/` - Custom React hooks
- `src/contexts/` - React context providers
- `src/types/` - TypeScript type definitions
- `src/utils/` - Utility functions and helpers

## Database Schema

Key tables include:
- `users` - User accounts and authentication
- `projects` - Project management
- `tasks` - Task management with hierarchical support
- `companies` - Enterprise customer management
- `timers` - Time tracking functionality
- `documents` - Document management system
- `audit_logs` - System audit trail

## API Architecture

The backend follows RESTful API conventions:
- `/api/v1/auth/*` - Authentication endpoints
- `/api/v1/projects/*` - Project management
- `/api/v1/projects/{id}/tasks/*` - Task management (project-scoped)
- `/api/v1/timers/*` - Timer functionality
- `/api/v1/companies/*` - Company management
- `/api/v1/documents/*` - Document management
- `/api/v1/system/*` - System administration

## Authentication

The system uses JWT tokens for authentication:
- Login endpoint: `POST /api/v1/auth/login`
- Token validation through middleware
- Role-based access control
- Development quick login for `admin` and `qiudl` users

## Environment Setup

### Docker开发环境配置

Docker环境使用预配置的环境变量，无需手动设置：

#### 数据库配置 (自动)
- **主库(Docker)**: 
  - 容器内访问: `postgres-master:5432`
  - 主机访问: `localhost:5433`
- **从库(本机)**: `localhost:5432` (可选备份)
- **用户**: `dev_user`
- **密码**: `dev_password_2024`
- **数据库**: `ai_project_db`

#### API配置 (自动)
- **后端**: `http://localhost:8081`
- **前端**: `http://localhost:3001`
- **MCP服务器**: `http://localhost:3100`

### 手动环境变量 (如需自定义)

#### Backend (.env)
**容器内运行时 (推荐)**:
- `DB_HOST=postgres-master` - 数据库主机
- `DB_PORT=5432` - 数据库端口

**主机运行时**:
- `DB_HOST=localhost` - 数据库主机
- `DB_PORT=5433` - 数据库端口

**通用配置**:
- `DB_USER=dev_user` - 数据库用户
- `DB_PASSWORD=dev_password_2024` - 数据库密码
- `DB_NAME=ai_project_db` - 数据库名
- `JWT_SECRET=dev_jwt_secret_key_2024` - JWT密钥
- `PORT=8081` - 服务器端口

#### Frontend (.env)
- `REACT_APP_API_URL=http://localhost:8081/api/v1` - API地址
- `REACT_APP_ENV=development` - 环境标识

## Testing

### Backend Testing
- Unit tests for services and utilities
- Integration tests for database operations
- Handler tests for API endpoints

### Frontend Testing
- Jest + React Testing Library
- Component unit tests
- Integration tests for key user flows
- E2E tests for critical paths

## Development Guidelines

### Code Organization
- Follow existing directory structure and naming conventions
- Keep components focused and reusable
- Use TypeScript for type safety
- Implement proper error handling and validation

### Database Migrations
- New migrations go in `backend/migrations/`
- Use sequential numbering for migration files
- Always provide both up and down migrations

### API Development
- Follow RESTful conventions
- Use appropriate HTTP status codes
- Implement consistent error response format
- Add proper request validation

### Frontend Development
- Use Ant Design components consistently
- Implement responsive design patterns
- Follow React best practices (hooks, context)
- Use React Query for server state management

## Common Development Tasks

### Adding New API Endpoints
1. Create handler in `backend/handlers/`
2. Add route in `backend/routes/`
3. Update service layer if needed
4. Add database methods if required
5. Update frontend service files

### Adding New Frontend Pages
1. Create page component in `src/pages/`
2. Add route in `src/App.tsx`
3. Create corresponding service functions
4. Add to navigation if needed

### Database Changes
1. Create migration file in `backend/migrations/`
2. Update model structs in `backend/models/`
3. Update repository interfaces and implementations
4. Update frontend types if needed

## Deployment

The system is containerized with Docker:
- `docker-compose.yml` for development/staging
- Nginx reverse proxy configuration
- PostgreSQL data persistence
- Environment-specific configurations

## MCP Integration

The `ai-proj-mcp` directory contains an MCP server that enables Claude Code to interact with the task management system. This provides enhanced productivity features when using Claude Code for development.

## 🚀 快速开始

### 首次设置
```bash
# 1. 给脚本执行权限
chmod +x scripts/dev-env.sh scripts/setup-replica-database.sh

# 2. 启动开发环境
./scripts/dev-env.sh start

# 3. 设置PostgreSQL从库备份 (可选)
./scripts/dev-env.sh replica

# 4. 验证环境
./scripts/dev-env.sh status
```

### 日常开发
```bash
# 启动环境
./scripts/dev-env.sh start

# 查看服务状态
./scripts/dev-env.sh status

# 查看日志
./scripts/dev-env.sh logs frontend
./scripts/dev-env.sh logs backend

# 停止环境
./scripts/dev-env.sh stop
```

### 重要说明
- 开发环境完全基于Docker，避免本机环境污染
- PostgreSQL主从架构保证数据安全
- 支持热重载，代码修改即时生效
- 端口映射：前端3001，后端8081，MCP3100
- 详细迁移指南请参考 `MIGRATION_TO_DOCKER_DEV.md`