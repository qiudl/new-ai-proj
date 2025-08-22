# 409 回滚与本地验证（Docker Postgres）

状态：提供回滚策略/脚本与本地验证手册（遵循 Docker Postgres 偏好）

## 目标
- 在本地 Docker 化的 Postgres 上，安全地执行迁移并支持一键回滚。
- 提供验证脚本，确保数据字典（408）与后续依赖模型的可用性。

## 环境假设
- Docker & docker-compose 可用。
- Postgres 镜像：postgres:15（或组织标准版本）。

## docker-compose（示例）

```yaml
version: '3.8'
services:
  db:
    image: postgres:15
    container_name: ai_tasks_pg
    environment:
      - POSTGRES_USER=ai
      - POSTGRES_PASSWORD=ai
      - POSTGRES_DB=ai_tasks
    ports:
      - '5433:5432'
    volumes:
      - ./db/init:/docker-entrypoint-initdb.d:ro
      - db_data:/var/lib/postgresql/data
    healthcheck:
      test: [ 'CMD-SHELL', 'pg_isready -U ai -d ai_tasks' ]
      interval: 3s
      timeout: 5s
      retries: 10
volumes:
  db_data: {}
```

- 在 ./db/init 放置 001_init.sql（包含 408 的 DDL+seed），容器首次启动自动执行。

## 迁移与回滚策略
- 命名规范：V{timestamp}__{name}.sql（迁移），R{timestamp}__{name}.sql（回滚）。
- 每个迁移脚本必须具备幂等性，或提供明确回滚脚本。
- 示例：

```sql
-- V20250821_1500__create_dictionaries.sql
BEGIN;
  -- 字典表创建（参考 #408 DDL），IF NOT EXISTS 防重入
COMMIT;

-- R20250821_1500__drop_dictionaries.sql
BEGIN;
  DROP TABLE IF EXISTS task_attributes;
  DROP TABLE IF EXISTS task_risk_levels;
  DROP TABLE IF EXISTS task_categories;
COMMIT;
```

## 本地验证步骤（脚本化）

```bash
# 1) 启动数据库
docker compose up -d db

# 2) 等待健康检查通过
docker compose ps

# 3) 运行迁移（示例：psql 执行某个脚本目录）
psql postgresql://ai:ai@localhost:5433/ai_tasks -f db/migrations/V20250821_1500__create_dictionaries.sql

# 4) 校验字典是否入库
psql postgresql://ai:ai@localhost:5433/ai_tasks -c "SELECT key, name FROM task_categories;"

# 5) 回滚
psql postgresql://ai:ai@localhost:5433/ai_tasks -f db/migrations/R20250821_1500__drop_dictionaries.sql

# 6) 重新执行 init（如需）
docker compose down -v && docker compose up -d db
```

## 自动化建议
- 引入简单迁移工具（如 golang-migrate / Flyway / Sqitch），在 CI （Jenkins Docker agent）中执行：
  - 上线前：dry-run + 校验（只读连接，禁写入数据）。
  - 上线时：apply + smoke test（SELECT/INSERT/ROLLBACK）。

## 验收要点
- 在本地 Docker 上，迁移脚本可成功执行/回滚。
- 字典表与数据可成功创建并查询。
- 回滚后再次重新初始化可恢复到初始状态。

