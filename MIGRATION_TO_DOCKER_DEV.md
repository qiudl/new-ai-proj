# Docker主导开发环境迁移指南

## 概述

本指南帮助您从混合开发环境迁移到纯Docker开发环境，配置PostgreSQL主从备份。

## 新架构特点

### ✅ 优势
- **环境一致性**: 所有开发都在Docker容器内进行
- **数据安全**: PostgreSQL主从备份，Docker主库+本机从库
- **简化部署**: 一键启动完整开发环境
- **隔离性**: 避免本机环境污染和冲突
- **可复现性**: 团队成员环境完全一致

### 🔄 端口变更
| 服务 | 原端口 | 新端口 | 说明 |
|------|--------|--------|------|
| 前端 | 3000 | **3001** | React开发服务器 |
| 后端API | 8080 | **8081** | Go API服务器 |
| PostgreSQL主库 | 5432 | **5433** | Docker内主库 |
| PostgreSQL从库 | - | **5432** | 本机从库(备份) |
| Redis | 6379 | 6379 | 保持不变 |
| MCP服务器 | 3001 | **3100** | Claude Code集成 |

### 🗄️ 数据库架构
```
┌─────────────────┐    流复制    ┌─────────────────┐
│ Docker主库      │ --------→   │ 本机从库        │
│ localhost:5433  │             │ localhost:5432  │
│ (读写)          │             │ (只读备份)      │
└─────────────────┘             └─────────────────┘
```

## 迁移步骤

### 1. 停止现有服务

```bash
# 停止现有Docker环境（如果有）
docker-compose down

# 停止本机服务（如果有）
brew services stop postgresql  # macOS
# 或
sudo systemctl stop postgresql  # Linux
```

### 2. 备份现有数据

```bash
# 备份本机PostgreSQL数据（如果需要）
pg_dump -U your_user -d your_database > backup_$(date +%Y%m%d).sql
```

### 3. 启动Docker开发环境

```bash
# 给脚本执行权限
chmod +x scripts/dev-env.sh scripts/setup-replica-database.sh

# 启动开发环境
./scripts/dev-env.sh start
```

### 4. 设置PostgreSQL从库（可选）

```bash
# 设置本机PostgreSQL作为从库
./scripts/dev-env.sh replica
```

### 5. 验证环境

```bash
# 检查服务状态
./scripts/dev-env.sh status

# 查看环境信息
./scripts/dev-env.sh info
```

## 访问地址更新

### 开发访问地址
- **前端应用**: http://localhost:3001
- **后端API**: http://localhost:8081
- **API文档**: http://localhost:8081/docs
- **MCP服务器**: http://localhost:3100

### 数据库连接
```bash
# 主库连接（读写）
psql -h localhost -p 5433 -U dev_user -d ai_project_db

# 从库连接（只读）
psql -h localhost -p 5432 -U dev_user -d ai_project_db
```

## 开发工作流

### 日常开发命令

```bash
# 启动环境
./scripts/dev-env.sh start

# 查看状态
./scripts/dev-env.sh status

# 查看服务日志
./scripts/dev-env.sh logs backend
./scripts/dev-env.sh logs frontend

# 进入容器调试
./scripts/dev-env.sh shell backend
./scripts/dev-env.sh shell frontend

# 重启服务
./scripts/dev-env.sh restart

# 停止环境
./scripts/dev-env.sh stop
```

### 代码开发
- **前端代码**: `frontend/src/` - 支持热重载
- **后端代码**: `backend/` - 使用Air热重载
- **数据库迁移**: `migrations/` - 自动应用到主库

### 调试说明
- 前端调试: Chrome DevTools，访问 http://localhost:3001
- 后端调试: 日志查看 `./scripts/dev-env.sh logs backend`
- 数据库调试: 直连主库进行操作

## 环境变量配置

### 前端环境变量
```env
REACT_APP_API_URL=http://localhost:8081/api/v1
REACT_APP_ENV=development
```

### 后端环境变量
```env
DB_HOST=postgres-master
DB_PORT=5432
DB_USER=dev_user
DB_PASSWORD=dev_password_2024
DB_NAME=ai_project_db
JWT_SECRET=dev_jwt_secret_key_2024
```

## 故障排除

### 常见问题

1. **端口冲突**
   ```bash
   # 检查端口占用
   lsof -i :3001
   lsof -i :8081
   lsof -i :5433
   ```

2. **Docker资源不足**
   ```bash
   # 清理Docker资源
   docker system prune -f
   docker volume prune -f
   ```

3. **数据同步问题**
   ```bash
   # 检查复制状态
   docker exec ai_postgres_master psql -U dev_user -d ai_project_db \
     -c "SELECT * FROM pg_stat_replication;"
   ```

4. **热重载不工作**
   ```bash
   # 重启相关服务
   ./scripts/dev-env.sh restart frontend
   ./scripts/dev-env.sh restart backend
   ```

### 性能优化

1. **Docker优化**
   - 增加Docker内存限制到至少4GB
   - 启用Docker的文件共享优化
   - 使用缓存卷避免重复下载

2. **开发优化**
   - 使用 `:cached` 挂载提升文件系统性能
   - 启用增量编译和热重载
   - 分离node_modules和Go模块缓存

## 回滚方案

如果需要回到原有环境：

```bash
# 停止Docker环境
./scripts/dev-env.sh stop

# 恢复本机环境配置
# (根据之前的配置进行恢复)
```

## 支持与帮助

- 查看完整命令: `./scripts/dev-env.sh help`
- 查看服务日志: `./scripts/dev-env.sh logs [service]`
- 环境信息: `./scripts/dev-env.sh info`

## 注意事项

1. **数据持久化**: Docker卷确保数据不会丢失
2. **权限问题**: 所有容器使用非root用户运行
3. **网络隔离**: 服务间通过Docker网络通信
4. **备份策略**: 从库提供数据备份保护
5. **安全考虑**: 开发环境配置，不适用于生产环境