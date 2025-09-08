# AI项目管理系统

一个面向生产环境的企业级AI项目管理系统，提供完整的项目管理、任务追踪、权限管理和组织架构管理功能。

## 🚀 快速开始

### 环境要求
- Node.js >= 16
- Go >= 1.19
- PostgreSQL >= 13
- Docker & Docker Compose

### 本地开发启动

1. **启动数据库和服务**
   ```bash
   docker compose -f docker-compose.dev.yml up -d
   ```

2. **启动后端服务**
   ```bash
   cd backend
   ./ai-project-backend
   ```

3. **启动前端应用**
   ```bash
   cd frontend
   npm start
   ```

### 开发环境认证
开发环境支持快速登录：
- 访问 `POST /api/v1/auth/dev/quick-login`
- 或使用前端开发工具自动登录

## 📖 文档导航

### API 文档与测试
- **OpenAPI 3.0 规范**: `docs/api/openapi.yaml`
- **Swagger UI**: 访问 `http://localhost:8081/docs`
- **REST Client 示例**: `docs/api/examples.http`
- **健康检查脚本**: `scripts/smoke.sh`

### 权限管理文档
- **权限系统迁移指南**: [PERMISSION_MIGRATION_GUIDE.md](./PERMISSION_MIGRATION_GUIDE.md)
- **权限演示页面**: 访问 `/permission-demo` 查看权限功能

## 🏗️ 系统架构

### 权限管理架构
现代化的三层权限管理系统：

1. **系统级权限** - 系统管理、配置管理
2. **企业级权限** - 企业管理、用户管理
3. **组织级权限** - 部门管理、职位管理、角色管理

### 核心功能模块
- 📋 **项目管理** - 项目创建、编辑、任务管理
- 👥 **企业管理** - 企业信息、用户管理
- 🏢 **组织架构** - 部门结构、职位管理
- 🔐 **权限管理** - 角色权限、权限模板
- ⏱️ **时间追踪** - 任务计时、工时统计
- 📊 **数据分析** - 项目洞察、时间分析

## 🛠️ 开发指南

### 环境配置
```bash
# 设置环境变量
export BASE_URL=http://localhost:8081/api/v1
export TASK_API_TOKEN={{YOUR_ACCESS_TOKEN}}

# 运行健康检查
chmod +x scripts/smoke.sh
./scripts/smoke.sh
```

### 权限系统使用

#### 前端权限组件
```typescript
import { ENTERPRISE_PERMISSIONS } from '../constants/permissions';

// 权限路由
<PermissionRoute permission={ENTERPRISE_PERMISSIONS.READ}>
  <EnterpriseManagementPage />
</PermissionRoute>

// 权限按钮
<PermissionButton permission={ENTERPRISE_PERMISSIONS.CREATE}>
  创建企业
</PermissionButton>
```

#### 新的权限常量
- `ENTERPRISE_PERMISSIONS` - 企业管理权限
- `ORGANIZATION_PERMISSIONS` - 组织架构权限
- `PROJECT_PERMISSIONS` - 项目管理权限
- `USER_PERMISSIONS` - 用户管理权限

### 主要路由
- `/enterprises` - 企业管理
- `/organization-structure` - 组织架构
- `/position-management` - 职位管理
- `/admin/permissions` - 权限概览
- `/admin/roles` - 角色管理
- `/admin/role-templates` - 角色模板

## 🔒 安全与合规

### 安全最佳实践
- ✅ 环境变量管理敏感信息
- ✅ JWT令牌认证
- ✅ 权限粒度控制
- ✅ 审计日志记录
- ✅ CORS配置
- ✅ SQL注入防护

### 数据库要求
- **生产环境**: 必须使用 PostgreSQL
- **开发环境**: 推荐使用 Docker Compose 启动数据库
- **数据迁移**: 支持自动数据库迁移和种子数据

## 🚨 重要变更说明

### v2.0 权限系统重构
- ❌ 移除了传统的 `company` 相关权限和路由
- ✅ 引入现代化的 `enterprise/organization` 权限架构
- ✅ 新增组织架构管理功能
- ✅ 重构权限管理页面

详细迁移指南请查看：[权限管理系统迁移指南](./PERMISSION_MIGRATION_GUIDE.md)

## 🧪 测试与部署

### 测试命令
```bash
# 后端测试
cd backend && go test ./...

# 前端测试
cd frontend && npm test

# API集成测试
./scripts/smoke.sh
```

### CI/CD 集成
- 支持 Docker 容器化部署
- Jenkins 流水线集成
- 自动化测试和部署
- 环境变量配置管理

## 📚 扩展开发

### SDK生成
```bash
# 基于OpenAPI规范生成客户端SDK
openapi-generator generate -i docs/api/openapi.yaml -g typescript-axios -o ./generated-sdk/
```

### Mock服务
```bash
# 生成Mock服务器
openapi-generator generate -i docs/api/openapi.yaml -g nodejs-express-server -o ./mock-server/
```

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 📞 支持与联系

- 权限问题：查看权限演示页面 `/permission-demo`
- API问题：查看Swagger文档 `/docs`
- 系统问题：查看健康检查页面 `/health`

---

*最后更新时间: 2025-09-08*

