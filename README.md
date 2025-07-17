# AI Project Management Platform - MVP

智能项目开发与管理平台，支持AI驱动的任务批量导入和管理。

## 🚀 快速开始

### 前置要求
- Docker 20.0+
- Docker Compose 2.0+
- Node.js 22.15.0 (本地开发)
- Go 1.22+ (本地开发)

### 一键启动开发环境

```bash
# 克隆项目
git clone git@github.com:qiudl/new-ai-proj.git
cd new-ai-proj

# 运行开发环境搭建脚本
./scripts/dev-setup.sh

# 或者手动启动
docker-compose up -d
```

### 环境配置

复制环境变量模板：
```bash
cp .env.development .env
```

### 服务访问

- **前端应用**: http://localhost:3000
- **后端API**: http://localhost:8080
- **数据库**: localhost:5432 (user/password/main_db)
- **Nginx代理**: http://localhost:80

## 🏗️ 项目架构

```
new-ai-proj/
├── backend/              # Go后端应用
├── frontend/             # React前端应用
├── nginx/                # Nginx配置
├── docker/               # Docker相关配置
├── scripts/              # 开发脚本
├── tests/                # 测试文件
├── docs/                 # 文档
├── docker-compose.yml    # 主要服务配置
├── docker-compose.override.yml  # 开发环境配置
├── init.sql              # 数据库初始化脚本
└── README.md
```

## 💻 开发流程

### 后端开发 (Go)

```bash
# 进入后端容器
docker-compose exec backend bash

# 初始化Go模块
go mod init ai-project-backend
go mod tidy

# 本地开发
go run main.go

# 运行测试
go test ./...
```

### 前端开发 (React)

```bash
# 进入前端容器
docker-compose exec frontend sh

# 创建React应用
npx create-react-app . --template typescript

# 开发模式
npm start

# 运行测试
npm test
```

### 数据库操作

```bash
# 连接数据库
docker-compose exec db psql -U user -d main_db

# 查看表结构
\d users
\d projects
\d tasks

# 重置数据库
docker-compose down -v
docker-compose up -d db
```

## 📊 数据库设计

### 核心表结构

- **users**: 用户表 (id, username, password_hash, role)
- **projects**: 项目表 (id, name, description, owner_id)
- **tasks**: 任务表 (id, project_id, title, description, status, custom_fields)

### 关键特性

- **JSONB支持**: tasks.custom_fields 支持灵活的自定义字段
- **GIN索引**: 为JSONB字段优化查询性能
- **外键约束**: 确保数据一致性
- **时间戳**: 自动记录创建时间

## 🔧 常用命令

### Docker 操作

```bash
# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f [service_name]

# 重启服务
docker-compose restart [service_name]

# 停止所有服务
docker-compose down

# 重建服务
docker-compose up -d --build
```

### 开发工具

```bash
# 代码格式化 (Go)
docker-compose exec backend go fmt ./...

# 代码检查 (Go)
docker-compose exec backend go vet ./...

# 依赖管理 (Go)
docker-compose exec backend go mod tidy

# 前端包管理
docker-compose exec frontend npm install
docker-compose exec frontend npm run build
```

## 🧪 测试

### 运行测试

```bash
# 后端测试
docker-compose exec backend go test ./...

# 前端测试
docker-compose exec frontend npm test

# 集成测试
docker-compose exec backend go test -tags=integration ./...
```

### API测试

```bash
# 健康检查
curl http://localhost:8080/health

# 用户登录
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'

# 获取项目列表
curl -X GET http://localhost:8080/api/projects \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📚 API文档

### 认证接口
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/logout` - 用户登出

### 项目管理
- `GET /api/projects` - 获取项目列表
- `POST /api/projects` - 创建项目
- `GET /api/projects/{id}` - 获取项目详情

### 任务管理
- `GET /api/projects/{id}/tasks` - 获取任务列表
- `POST /api/projects/{id}/tasks/bulk-import` - 批量导入任务
- `GET /api/projects/{id}/tasks/{taskId}` - 获取任务详情

## 🚀 部署

### 生产环境

```bash
# 使用生产配置
docker-compose -f docker-compose.prod.yml up -d

# 或者使用环境变量
cp .env.production .env
docker-compose up -d
```

### 环境变量

生产环境需要设置：
- `JWT_SECRET`: JWT密钥
- `DB_PASSWORD`: 数据库密码
- `GIN_MODE`: 设置为 "release"

## 🛠️ 故障排除

### 常见问题

1. **端口冲突**: 修改 `.env` 文件中的端口配置
2. **数据库连接失败**: 检查数据库是否正常启动
3. **前端热更新不工作**: 设置 `CHOKIDAR_USEPOLLING=true`
4. **Go模块下载失败**: 检查网络连接和代理设置

### 日志查看

```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db
```

## 📖 文档

- [MVP开发计划](docs/MVP_DEV_PLAN.md)
- [测试和验收标准](docs/TESTING_AND_ACCEPTANCE.md)
- [Claude代码助手指南](CLAUDE.md)

## 🤝 开发规范

### Git提交规范

```
feat: 新功能
fix: 修复bug
docs: 文档更新
style: 代码格式调整
refactor: 代码重构
test: 测试相关
chore: 构建过程或辅助工具变动
```

### 代码质量

- Go代码使用 `go fmt` 和 `go vet`
- React代码使用 TypeScript 和 ESLint
- 测试覆盖率 > 80%
- 所有API接口需要有文档

## 📞 技术支持

- 项目文档: [docs/](docs/)
- 问题反馈: GitHub Issues
- 技术讨论: 项目群组

---

**Happy Coding! 🎉**