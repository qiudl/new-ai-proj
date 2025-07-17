# Go Backend - AI Project Management Platform

基于Go和Gin框架开发的后端API服务，支持项目管理、任务管理和批量导入功能。

## 🚀 快速开始

### 本地开发

```bash
# 进入后端目录
cd backend

# 安装依赖
go mod tidy

# 运行开发服务器
go run main.go

# 或使用热重载
air
```

### Docker开发

```bash
# 构建开发镜像
docker build --target development -t ai-project-backend:dev .

# 运行开发容器
docker run -p 8080:8080 ai-project-backend:dev
```

### 使用Docker Compose

```bash
# 从项目根目录运行
docker-compose up -d backend
```

## 🏗️ 多阶段构建

### 构建目标

1. **base** - 基础依赖层
2. **development** - 开发环境 (带热重载)
3. **builder** - 构建阶段
4. **production** - 生产环境 (最小化镜像)
5. **testing** - 测试环境

### 构建命令

```bash
# 开发环境
docker build --target development -t ai-project-backend:dev .

# 生产环境
docker build --target production -t ai-project-backend:prod .

# 测试环境
docker build --target testing -t ai-project-backend:test .

# 使用构建脚本
./scripts/build.sh dev     # 开发镜像
./scripts/build.sh prod    # 生产镜像
./scripts/build.sh local   # 本地二进制
./scripts/build.sh test    # 运行测试
./scripts/build.sh all     # 构建所有
```

## 📁 项目结构

```
backend/
├── main.go              # 主程序入口
├── go.mod               # Go模块定义
├── go.sum               # 依赖校验
├── Dockerfile           # 多阶段Docker文件
├── .air.toml            # Air热重载配置
├── .dockerignore        # Docker忽略文件
├── config/              # 配置文件
│   └── config.yaml      # 默认配置
├── scripts/             # 构建脚本
│   └── build.sh         # 构建脚本
├── handlers/            # HTTP处理器 (待创建)
├── models/              # 数据模型 (待创建)
├── middleware/          # 中间件 (待创建)
├── utils/               # 工具函数 (待创建)
└── tests/               # 测试文件 (待创建)
```

## 🔧 环境变量

| 变量名 | 默认值 | 描述 |
|--------|--------|------|
| `DB_SOURCE` | `postgresql://user:password@localhost:5432/main_db?sslmode=disable` | 数据库连接字符串 |
| `PORT` | `8080` | 服务器端口 |
| `JWT_SECRET` | `dev-secret-key` | JWT密钥 |
| `GIN_MODE` | `debug` | Gin运行模式 |
| `LOG_LEVEL` | `debug` | 日志级别 |

## 📊 API端点

### 系统端点

- `GET /health` - 健康检查
- `GET /version` - 版本信息

### 认证端点

- `POST /api/auth/login` - 用户登录
- `POST /api/auth/logout` - 用户登出

### 项目管理

- `GET /api/projects` - 获取项目列表
- `POST /api/projects` - 创建项目
- `GET /api/projects/:id` - 获取项目详情
- `PUT /api/projects/:id` - 更新项目
- `DELETE /api/projects/:id` - 删除项目

### 任务管理

- `GET /api/projects/:id/tasks` - 获取任务列表
- `POST /api/projects/:id/tasks` - 创建任务
- `POST /api/projects/:id/tasks/bulk-import` - 批量导入任务
- `GET /api/projects/:id/tasks/:taskId` - 获取任务详情
- `PUT /api/projects/:id/tasks/:taskId` - 更新任务
- `DELETE /api/projects/:id/tasks/:taskId` - 删除任务

## 🧪 测试

```bash
# 运行所有测试
go test ./...

# 运行测试并生成覆盖率报告
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out -o coverage.html

# 使用构建脚本运行测试
./scripts/build.sh test
```

## 🔍 开发工具

### 代码格式化

```bash
# 格式化代码
go fmt ./...

# 导入优化
goimports -w .

# 代码检查
go vet ./...

# 使用golangci-lint
golangci-lint run
```

### 热重载

使用Air进行热重载开发：

```bash
# 安装Air
go install github.com/cosmtrek/air@latest

# 运行热重载
air
```

## 🐳 Docker最佳实践

### 镜像优化

1. **多阶段构建**：分离构建和运行环境
2. **最小化镜像**：使用Alpine Linux
3. **非root用户**：提高安全性
4. **健康检查**：监控容器状态
5. **版本标签**：支持版本管理

### 安全特性

- 使用非root用户运行
- 最小化软件包安装
- 构建时注入版本信息
- 支持SSL/TLS连接

## 🚀 部署

### 生产环境构建

```bash
# 构建生产镜像
docker build --target production -t ai-project-backend:v1.0.0 .

# 运行生产容器
docker run -d \
  -p 8080:8080 \
  -e DB_SOURCE="postgresql://user:password@db:5432/main_db?sslmode=disable" \
  -e JWT_SECRET="your-production-secret" \
  -e GIN_MODE="release" \
  ai-project-backend:v1.0.0
```

### 容器编排

```bash
# 使用Docker Compose
docker-compose -f docker-compose.prod.yml up -d

# 使用Kubernetes
kubectl apply -f k8s/
```

## 📚 依赖管理

### 主要依赖

- **gin-gonic/gin** - HTTP Web框架
- **golang-jwt/jwt** - JWT认证
- **lib/pq** - PostgreSQL驱动
- **golang.org/x/crypto** - 加密库

### 开发依赖

- **cosmtrek/air** - 热重载工具
- **golangci/golangci-lint** - 代码检查
- **onsi/ginkgo** - 测试框架

## 🔍 监控和日志

### 健康检查

```bash
# 检查服务状态
curl http://localhost:8080/health

# 检查版本信息
curl http://localhost:8080/version
```

### 日志格式

支持结构化JSON日志输出，便于日志聚合和分析。

## 🛠️ 故障排除

### 常见问题

1. **数据库连接失败**
   - 检查数据库服务是否运行
   - 验证连接字符串格式
   - 确认网络连接

2. **端口冲突**
   - 修改PORT环境变量
   - 检查端口使用情况

3. **内存不足**
   - 调整Docker内存限制
   - 优化数据库连接池

### 调试命令

```bash
# 查看容器日志
docker logs -f go_backend

# 进入容器调试
docker exec -it go_backend sh

# 检查数据库连接
docker exec -it go_backend /app/main -check-db
```

## 🤝 贡献指南

1. Fork项目
2. 创建功能分支
3. 编写测试
4. 提交代码
5. 创建Pull Request

## 📄 许可证

本项目采用MIT许可证。