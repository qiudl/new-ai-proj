# 开发环境工作流程指南

## 概述

本项目支持双环境开发配置：
- **本机开发环境** (Native Development): 快速开发，热重载，端口 8081/3001
- **Docker测试环境** (Docker Testing): 完整集成测试，端口 8080/3000，nginx代理

## 当前开发环境状态

### 本机开发环境已启动 ✅

#### 服务状态验证
- **PostgreSQL数据库**: 运行正常 (端口 5432, 数据库: local_dev_db)
- **Go后端API**: 运行正常 (端口 8081)
- **React前端**: 运行正常 (端口 3001)

#### 验证命令
```bash
# 数据库连接验证
psql -U johnqiu -h localhost -p 5432 -d local_dev_db -c "SELECT version();"
# 结果: PostgreSQL 16.9 (Homebrew) ✅

# 后端API健康检查
curl http://localhost:8081/health
# 结果: {"success":true,"message":"Service is healthy"} ✅

# 前端服务检查
curl http://localhost:3001/
# 结果: HTTP 200 OK ✅
```

### 环境配置对比

| 配置项 | 本机开发环境 | Docker测试环境 |
|-------|-------------|---------------|
| **数据库** | 本机PostgreSQL (端口5432) | Docker容器 (端口5432) |
| **数据库名** | `local_dev_db` | `main_db` |
| **后端端口** | 8081 | 8080 |
| **前端端口** | 3001 | 3000 |
| **代理** | 无需代理，直连 | nginx (端口80) |
| **启动方式** | 原生命令 | docker-compose |
| **热重载** | 原生支持 | Volume挂载 |

## 开发工作流程

### 步骤1: 开发环境准备

```bash
# 1. 确保本机PostgreSQL运行
brew services start postgresql@16

# 2. 启动后端 (新终端)
cd backend && ENV=development go run main.go

# 3. 启动前端 (新终端)  
cd frontend && FRONTEND_PORT=3001 npm start

# 4. 验证服务
curl http://localhost:8081/health  # 后端健康检查
curl http://localhost:3001/        # 前端访问检查
```

### 步骤2: 功能开发

```bash
# 创建功能分支
git checkout -b feature/your-feature-name

# 开发过程中实时查看变更
# - 前端: 自动热重载 (localhost:3001)
# - 后端: go run自动重启
# - 数据库: 实时持久化

# 代码质量检查
cd frontend && npm run lint
cd frontend && npm run type-check
cd backend && go fmt ./...
```

### 步骤3: Docker环境测试

```bash
# 切换到Docker测试环境进行集成测试
docker-compose up -d

# 验证完整系统
curl http://localhost/health        # 通过nginx代理
curl http://localhost/api/v1/health # API服务检查

# 测试完毕关闭Docker环境
docker-compose down
```

### 步骤4: 提交和PR

```bash
# 添加所有修改
git add .

# 提交变更
git commit -m "feat: 新功能实现

- 功能描述
- 修改内容
- 测试验证

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# 推送分支
git push origin feature/your-feature-name

# 创建Pull Request (通过GitHub CLI或Web界面)
gh pr create --title "新功能实现" --body "详细描述"
```

## 技术架构说明

### 本机开发架构 (当前运行中)
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   React:3001    │◄──►│   Go:8081       │◄──►│   PG:5432       │
│   热重载        │    │   实时重启      │    │   本机实例      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         ▲                       ▲                       ▲
         │                       │                       │
    开发者直接访问         API直连无代理           本机数据持久化
```

### Docker测试架构 (用于集成测试)
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Nginx:80      │    │   Frontend      │    │   Backend       │
│   反向代理      │◄──►│   React:3000    │◄──►│   Go:8080       │
│   统一入口      │    │   容器化部署    │    │   容器化API     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         ▲                                             ▲
         │                                             │
    用户统一访问                              ┌─────────────────┐
    http://localhost                          │   Database      │
                                             │   PG:5432       │
                                             │   Docker容器    │
                                             └─────────────────┘
```

## 环境变量配置

### 开发环境 (.env.development)
```bash
# 数据库配置
DB_SOURCE=postgresql://johnqiu@localhost:5432/local_dev_db
BACKEND_PORT=8081
FRONTEND_PORT=3001

# API配置
REACT_APP_API_URL=http://localhost:8081/api/v1
REACT_APP_LOCAL_DEV=true

# 开发工具
CHOKIDAR_USEPOLLING=true
HOT_RELOAD=true
DEBUG_MODE=true
```

### 测试环境 (docker-compose.yml)
```yaml
# 通过Docker Compose环境变量配置
services:
  backend:
    ports: ["8080:8080"]
  frontend: 
    ports: ["3000:3000"]
  nginx:
    ports: ["80:80"]
```

## 常见问题解决

### Q1: 端口冲突
```bash
# 检查端口占用
lsof -i :3001  # 前端端口
lsof -i :8081  # 后端端口
lsof -i :5432  # 数据库端口

# 强制杀死进程
kill -9 <PID>
```

### Q2: 数据库连接问题
```bash
# 重启PostgreSQL
brew services restart postgresql@16

# 检查数据库状态
brew services list | grep postgresql

# 创建开发数据库（如果不存在）
createdb -U johnqiu local_dev_db
```

### Q3: 前端编译错误
```bash
# 清理依赖重装
cd frontend && rm -rf node_modules package-lock.json
npm install

# TypeScript检查
npm run type-check

# ESLint检查
npm run lint
```

## 性能优化建议

### 开发环境优化
1. **使用本机环境**进行日常开发（更快的热重载）
2. **使用Docker环境**进行集成测试（完整环境验证）
3. **合理使用缓存**（Go mod cache、npm cache）
4. **定期清理**无用的Docker镜像和容器

### 代码质量保证
1. **提交前检查**: ESLint、TypeScript、Go fmt
2. **功能测试**: 单元测试、集成测试
3. **性能监控**: API响应时间、前端渲染性能
4. **安全审计**: 依赖漏洞检查、代码安全扫描

## 部署流程

### 开发 → 测试 → 生产
1. **本机开发**: feature分支开发
2. **Docker测试**: 集成测试验证
3. **PR审核**: 代码review和CI/CD检查
4. **合并主分支**: 自动部署到生产环境

---

**更新时间**: $(date)
**当前状态**: 开发环境已完全配置并运行
**下一步**: 创建功能分支并开始开发工作