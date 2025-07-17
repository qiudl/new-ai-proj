# 开发环境指南

## 🚀 快速开始

### 前置要求
- Docker 20.0+
- Docker Compose 2.0+
- Git

### 一键启动

```bash
# 1. 克隆项目
git clone git@github.com:qiudl/new-ai-proj.git
cd new-ai-proj

# 2. 检查配置
./scripts/check-compose.sh

# 3. 启动所有服务
docker-compose up -d

# 4. 验证环境
./scripts/test-environment.sh
```

## 📊 服务架构

### 服务清单
- **数据库 (db)**: PostgreSQL 16 + 示例数据
- **后端 (backend)**: Go 1.22 + Gin + 热重载
- **前端 (frontend)**: React 18 + TypeScript + 热重载
- **代理 (nginx)**: Nginx 反向代理

### 端口映射
- 前端: http://localhost:3000
- 后端: http://localhost:8080  
- 数据库: localhost:5432
- Nginx: http://localhost:80

## 🛠️ 开发工作流

### 日常开发

```bash
# 启动开发环境
docker-compose up -d

# 查看日志
docker-compose logs -f

# 重启单个服务
docker-compose restart backend

# 停止所有服务
docker-compose down
```

### 代码热重载

- **Go后端**: 使用Air自动重载 (监听文件变更)
- **React前端**: 使用React热更新 (保存即刷新)

### 数据库管理

```bash
# 连接数据库
./scripts/db-manager.sh connect

# 查看统计
./scripts/db-manager.sh stats

# 备份数据库
./scripts/db-manager.sh backup

# 重置数据库
./scripts/db-manager.sh reset
```

## 🔧 故障排除

### 常见问题

1. **端口冲突**
   ```bash
   # 检查端口使用
   lsof -i :3000 -i :8080 -i :5432 -i :80
   
   # 修改端口 (编辑 .env 文件)
   FRONTEND_PORT=3001
   BACKEND_PORT=8081
   ```

2. **Docker镜像拉取失败**
   ```bash
   # 使用国内镜像源
   docker pull postgres:16
   docker pull node:22.15.0-alpine
   docker pull nginx:alpine
   ```

3. **服务启动失败**
   ```bash
   # 查看详细日志
   docker-compose logs [service_name]
   
   # 重建服务
   docker-compose up -d --build [service_name]
   ```

4. **前端热重载不工作**
   ```bash
   # 确保环境变量设置
   echo "CHOKIDAR_USEPOLLING=true" >> .env
   docker-compose restart frontend
   ```

### 性能调优

```bash
# 清理Docker缓存
docker system prune -f

# 检查资源使用
docker stats

# 优化构建缓存
docker-compose build --no-cache
```

## 📋 测试指南

### 自动化测试

```bash
# 完整环境测试
./scripts/test-environment.sh

# 配置检查
./scripts/check-compose.sh

# 数据库验证
./scripts/db-manager.sh validate
```

### 手动测试

1. **数据库连接**
   ```bash
   docker-compose exec db psql -U user -d main_db
   \dt  # 查看表
   SELECT * FROM users;  # 查看用户
   ```

2. **后端API**
   ```bash
   curl http://localhost:8080/health
   curl http://localhost:8080/version
   ```

3. **前端界面**
   - 访问 http://localhost:3000
   - 使用账号: admin / password123

## 🏗️ 构建和部署

### 开发构建

```bash
# 后端构建
./backend/scripts/build.sh dev

# 前端构建
cd frontend && npm run build
```

### 生产构建

```bash
# 后端生产镜像
./backend/scripts/build.sh prod

# 前端生产镜像
docker build --target production -t ai-project-frontend:prod ./frontend
```

### 部署准备

```bash
# 创建生产配置
cp .env.production .env

# 使用生产compose
docker-compose -f docker-compose.prod.yml up -d
```

## 📚 开发资源

### API文档
- 健康检查: GET /health
- 版本信息: GET /version
- 用户登录: POST /api/auth/login
- 项目列表: GET /api/projects
- 任务列表: GET /api/projects/{id}/tasks
- 批量导入: POST /api/projects/{id}/tasks/bulk-import

### 数据库架构
- **users**: 用户表 (id, username, password_hash, role)
- **projects**: 项目表 (id, name, description, owner_id)
- **tasks**: 任务表 (id, project_id, title, status, custom_fields)

### 技术栈文档
- [Go开发指南](./backend/README.md)
- [React开发指南](./frontend/README.md)
- [数据库指南](./scripts/validate-database.sql)

## 🤝 贡献指南

### 代码规范
- Go: 使用 `go fmt` 和 `go vet`
- React: 使用 ESLint 和 Prettier
- Git: 使用常规提交规范

### 开发流程
1. 创建功能分支
2. 本地开发和测试
3. 提交代码 (遵循提交规范)
4. 创建 Pull Request
5. 代码审查和合并

### 测试要求
- 后端: 单元测试覆盖率 > 80%
- 前端: 组件测试覆盖率 > 75%
- 集成测试: API端到端测试

## 📞 获取帮助

### 常用命令参考
```bash
./scripts/dev-setup.sh      # 环境初始化
./scripts/check-compose.sh  # 配置检查
./scripts/test-environment.sh  # 环境测试
./scripts/db-manager.sh status  # 数据库状态
```

### 问题反馈
- 查看日志: `docker-compose logs -f`
- 检查状态: `docker-compose ps`
- 重启服务: `docker-compose restart`

---

🎉 **Happy Coding!** 现在你可以开始开发AI项目管理平台了！