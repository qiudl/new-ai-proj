# 本地数据库 + 按需同步方案

> 任务ID: 4428
> 创建时间: 2025-12-15
> 预计工时: 4小时

## 1. 背景与问题

### 当前架构问题
- 开发环境通过**多跳SSH隧道**访问远程数据库
- 隧道路径: `本地 → 堡垒机(123.56.89.187) → 目标服务器(152.136.104.251)`
- **稳定性差**: 网络抖动、SSH超时等导致频繁断连
- **无自动重连**: 断开后需手动重启
- **影响开发**: 数据库断连导致整个开发环境不可用

### 解决思路
采用**本地数据库 + 按需同步**方案，将开发完全离线化：
- 日常开发使用本地 PostgreSQL
- 仅在需要时同步数据到/从生产环境
- 同步失败可重试，不影响开发流程

---

## 2. 目标架构

```
┌─────────────────────────────────────────────────────────────┐
│                      开发环境 (本地)                         │
│  ┌─────────┐      ┌─────────┐      ┌─────────────────┐     │
│  │ Frontend │ ──── │ Backend │ ──── │ PostgreSQL 本地  │     │
│  │ :3000   │      │ :8080   │      │ :5432           │     │
│  └─────────┘      └─────────┘      └─────────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                          │
                    需要时执行同步
                    ./scripts/sync-db.sh
                          │
                          ↓
              ┌─────────────────────┐
              │   生产 PostgreSQL    │
              │ 152.136.104.251:5432│
              └─────────────────────┘
```

---

## 3. 实现计划

### 阶段一: 本地数据库配置 (1小时)

#### 3.1.1 Docker Compose 配置
在 `docker-compose.dev.yml` 中添加本地 PostgreSQL:

```yaml
services:
  postgres-local:
    image: postgres:16-alpine
    container_name: ai-proj-postgres-local
    environment:
      POSTGRES_USER: ai_dev_user
      POSTGRES_PASSWORD: ai_dev_password
      POSTGRES_DB: ai_project_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_local_data:/var/lib/postgresql/data
      - ./database/init:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ai_dev_user -d ai_project_dev"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_local_data:
```

#### 3.1.2 本地环境变量
创建 `backend/.env.local`:

```bash
# 本地数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_USER=ai_dev_user
DB_PASSWORD=ai_dev_password
DB_NAME=ai_project_dev
DB_SSL_MODE=disable

# 其他配置保持不变
APP_ENV=development
```

#### 3.1.3 初始化脚本
创建 `database/init/00_init.sql`:

```sql
-- 创建开发用户和数据库
CREATE USER ai_dev_user WITH PASSWORD 'ai_dev_password';
CREATE DATABASE ai_project_dev OWNER ai_dev_user;
GRANT ALL PRIVILEGES ON DATABASE ai_project_dev TO ai_dev_user;
```

---

### 阶段二: 数据同步脚本 (2小时)

#### 3.2.1 同步脚本设计
创建 `scripts/sync-db.sh`:

```bash
#!/bin/bash
# 数据库同步脚本
# 用法: ./scripts/sync-db.sh [push|pull|schema|init]

# 功能:
# - init:   初始化本地数据库（从生产同步schema和基础数据）
# - pull:   从生产拉取最新数据到本地
# - push:   将本地数据推送到生产（谨慎使用）
# - schema: 仅同步表结构（不含数据）
```

#### 3.2.2 核心同步逻辑

**Pull (从生产拉取)**:
```bash
sync_pull() {
    # 1. 建立临时隧道
    start_temp_tunnel

    # 2. 导出生产数据
    pg_dump -h localhost -p 5433 -U $PROD_USER -d $PROD_DB \
        --no-owner --no-privileges \
        -F c -f /tmp/prod_backup.dump

    # 3. 恢复到本地
    pg_restore -h localhost -p 5432 -U $DEV_USER -d $DEV_DB \
        --clean --if-exists \
        /tmp/prod_backup.dump

    # 4. 关闭隧道
    stop_temp_tunnel
}
```

**Push (推送到生产)** - 需要确认:
```bash
sync_push() {
    # 安全检查
    confirm_production_push

    # 仅推送指定表的增量数据
    # 默认只推送: tasks, documents, work_notes
}
```

#### 3.2.3 支持的同步模式

| 模式 | 命令 | 说明 | 风险 |
|------|------|------|------|
| 完整初始化 | `sync-db.sh init` | 首次设置，同步全部 | 低 |
| 拉取数据 | `sync-db.sh pull` | 从生产更新本地 | 低 |
| 仅结构 | `sync-db.sh schema` | 同步表结构，不含数据 | 低 |
| 推送数据 | `sync-db.sh push` | 推送到生产 | **高** |
| 推送任务 | `sync-db.sh push-tasks` | 仅推送任务相关表 | 中 |

---

### 阶段三: dev.sh 集成 (0.5小时)

#### 3.3.1 修改 dev.sh
```bash
# 新增 local 模式
case "$command" in
    local)
        # 使用本地数据库启动
        start_local_postgres
        start_backend_local
        start_frontend
        ;;

    remote)
        # 使用远程数据库（原有逻辑）
        ensure_tunnel
        start_backend
        start_frontend
        ;;
esac
```

#### 3.3.2 新命令
```bash
./scripts/dev.sh local     # 使用本地数据库启动（推荐）
./scripts/dev.sh remote    # 使用远程数据库启动
./scripts/dev.sh sync      # 同步数据（等同于 sync-db.sh pull）
```

---

### 阶段四: 文档和测试 (0.5小时)

#### 3.4.1 更新 README
- 新开发者入门流程
- 数据同步最佳实践
- 常见问题解答

#### 3.4.2 测试清单
- [ ] 本地 PostgreSQL 启动正常
- [ ] 后端连接本地数据库成功
- [ ] `sync-db.sh init` 初始化成功
- [ ] `sync-db.sh pull` 拉取数据成功
- [ ] `sync-db.sh push-tasks` 推送成功
- [ ] 前后端功能正常

---

## 4. 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `docker-compose.dev.yml` | 修改 | 添加本地 PostgreSQL 服务 |
| `backend/.env.local` | 新建 | 本地数据库配置 |
| `database/init/00_init.sql` | 新建 | 数据库初始化脚本 |
| `scripts/sync-db.sh` | 新建 | 数据同步脚本 |
| `scripts/dev.sh` | 修改 | 添加 local/remote 模式 |
| `docs/LOCAL_DEVELOPMENT.md` | 新建 | 本地开发指南 |

---

## 5. 风险与注意事项

### 5.1 数据一致性
- 本地数据库与生产可能存在差异
- 建议每周执行一次 `sync-db.sh pull` 更新本地数据
- 推送前务必确认变更内容

### 5.2 敏感数据
- 同步时脱敏处理用户密码、邮箱等
- 考虑添加 `--sanitize` 选项

### 5.3 迁移脚本
- 确保所有迁移脚本都能在本地执行
- 新迁移需同时在本地和生产测试

---

## 6. 后续优化

1. **增量同步**: 基于时间戳的增量数据同步
2. **冲突处理**: 多人开发时的数据冲突解决
3. **自动化**: CI/CD 集成数据同步检查
4. **备份**: 本地数据定期备份

---

## 7. 快速开始（实现后）

```bash
# 1. 首次设置
docker-compose -f docker-compose.dev.yml up -d postgres-local
./scripts/sync-db.sh init

# 2. 日常开发
./scripts/dev.sh local

# 3. 需要最新数据时
./scripts/sync-db.sh pull

# 4. 需要推送时（谨慎）
./scripts/sync-db.sh push-tasks
```
