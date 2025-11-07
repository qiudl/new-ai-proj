# 需求管理系统生产环境数据库迁移指南

## 文档信息

**版本**: 1.0.0
**作者**: AI Project Team
**日期**: 2025-11-06
**状态**: 就绪

## 概述

本文档描述了需求管理系统在生产环境的数据库迁移流程，包括执行步骤、回滚方案、备份策略和风险控制措施。

##目录

1. [迁移概述](#迁移概述)
2. [系统要求](#系统要求)
3. [迁移前准备](#迁移前准备)
4. [迁移执行步骤](#迁移执行步骤)
5. [验证程序](#验证程序)
6. [回滚方案](#回滚方案)
7. [故障排查](#故障排查)
8. [附录](#附录)

---

## 迁移概述

### 迁移内容

本次迁移将在生产数据库中创建以下对象：

**表结构** (4个表):
- `requirements` - 需求主表
- `requirement_comments` - 需求评论表（含@用户提及功能）
- `requirement_history` - 需求历史记录表
- `requirement_tasks` - 需求-任务多对多关联表

**索引** (31个):
- 主键索引
- 外键索引
- 业务查询优化索引
- 全文搜索索引 (GIN)
- JSONB字段索引 (GIN)

**触发器** (4个):
- 自动更新时间戳触发器 (3个)
- mentioned_count同步触发器 (1个)

**函数** (4个):
- 时间戳更新函数
- 数据同步函数

### 迁移影响

**预计停机时间**: 无（可在线执行）
**预计执行时间**: 10-15秒
**数据丢失风险**: 无（仅创建新表）
**业务影响**: 无（不影响现有功能）

---

## 系统要求

### 软件要求

- PostgreSQL >= 12.0
- psql客户端工具
- pg_dump / pg_restore工具
- bash >= 4.0
- gzip压缩工具

### 权限要求

执行迁移的数据库用户需要以下权限：

```sql
-- 必需权限
GRANT CREATE ON SCHEMA public TO migration_user;
GRANT CREATE ON DATABASE ai_project_db TO migration_user;

-- 依赖表的SELECT权限
GRANT SELECT ON enterprises, users, projects, tasks TO migration_user;

-- 完整权限（生产环境）
GRANT ALL PRIVILEGES ON DATABASE ai_project_db TO migration_user;
```

### 依赖检查

迁移前必须确认以下表存在：

- `enterprises` - 企业/组织表
- `users` - 用户表
- `projects` - 项目表
- `tasks` - 任务表

验证命令：

```bash
psql -d ai_project_db -c "
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('enterprises', 'users', 'projects', 'tasks');
"
```

---

## 迁移前准备

### 1. 环境准备

#### 1.1 设置环境变量

```bash
# 生产环境配置
export DB_HOST="prod-db.example.com"
export DB_PORT="5432"
export DB_NAME="ai_project_db"
export DB_USER="prod_user"
export DB_PASSWORD="your_secure_password"

# 可选：自定义备份目录
export BACKUP_DIR="/var/backups/postgresql/requirements"
```

#### 1.2 检查磁盘空间

```bash
# 检查数据库大小
psql -d ai_project_db -c "
SELECT pg_size_pretty(pg_database_size('ai_project_db')) as db_size;
"

# 检查备份目录空间
df -h /var/backups
```

建议至少保留数据库大小的 2倍 磁盘空间用于备份。

#### 1.3 验证数据库连接

```bash
# 使用迁移脚本测试连接
cd /path/to/backend
./scripts/migrate_requirement_system.sh verify
```

### 2. 创建完整备份

⚠️ **极其重要**: 必须在迁移前创建完整的数据库备份！

```bash
# 方法1: 使用迁移脚本创建备份
./scripts/migrate_requirement_system.sh backup

# 方法2: 使用备份脚本
./scripts/backup_restore_requirements.sh backup full

# 方法3: 手动备份
pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME \
  --format=custom --compress=9 > backup_$(date +%Y%m%d_%H%M%S).dump
```

备份文件将保存在 `backend/backups/migrations/` 目录。

### 3. 通知相关人员

在执行迁移前，通知以下人员：

- [ ] 项目经理
- [ ] 技术负责人
- [ ] 运维团队
- [ ] 测试团队
- [ ] 产品团队（如有必要）

### 4. 准备回滚计划

确保回滚脚本就绪：

```bash
# 验证回滚脚本存在
ls -lh migrations/production/001_requirement_system_migration_down.sql
```

---

## 迁移执行步骤

### 步骤 1: 最终检查清单

在开始迁移前，完成以下检查：

- [ ] 已创建数据库完整备份
- [ ] 备份文件已验证可用
- [ ] 确认生产环境数据库连接正常
- [ ] 确认依赖表（enterprises, users, projects, tasks）存在
- [ ] 确认磁盘空间充足
- [ ] 已通知相关人员
- [ ] 已准备回滚方案
- [ ] 已确认维护时间窗口（如需要）

### 步骤 2: 执行迁移

#### 方式一：使用自动化脚本（推荐）

```bash
cd /path/to/backend

# 执行迁移
./scripts/migrate_requirement_system.sh up
```

脚本将自动执行：
1. 测试数据库连接
2. 创建安全备份
3. 确认用户同意
4. 执行SQL迁移
5. 验证迁移结果

#### 方式二：手动执行SQL

```bash
# 仅在自动化脚本不可用时使用
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME \
  -f migrations/production/001_requirement_system_migration_up.sql
```

### 步骤 3: 实时监控

在迁移执行过程中，监控以下内容：

**数据库连接数**:
```sql
SELECT count(*) FROM pg_stat_activity
WHERE datname = 'ai_project_db';
```

**锁等待**:
```sql
SELECT * FROM pg_stat_activity
WHERE wait_event_type = 'Lock';
```

**慢查询**:
```sql
SELECT pid, query_start, state, query
FROM pg_stat_activity
WHERE state != 'idle'
AND query_start < now() - interval '30 seconds';
```

---

## 验证程序

### 1. 自动验证

```bash
# 运行验证脚本
./scripts/verify_requirement_migration.sh
```

验证脚本将检查：
- ✓ 所有表是否创建
- ✓ 所有索引是否存在
- ✓ 所有触发器是否正常
- ✓ 所有函数是否可用
- ✓ 外键完整性
- ✓ 约束条件
- ✓ 数据一致性

### 2. 手动验证

#### 2.1 验证表结构

```sql
-- 检查所有表是否存在
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
    'requirements',
    'requirement_comments',
    'requirement_history',
    'requirement_tasks'
);

-- 应该返回 4 行
```

#### 2.2 验证索引

```sql
-- 检查索引数量
SELECT schemaname, tablename, COUNT(*) as index_count
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN (
    'requirements',
    'requirement_comments',
    'requirement_history',
    'requirement_tasks'
)
GROUP BY schemaname, tablename;

-- 预期结果:
-- requirements: 12个索引
-- requirement_comments: 8个索引
-- requirement_history: 5个索引
-- requirement_tasks: 6个索引
```

#### 2.3 验证触发器

```sql
-- 检查触发器
SELECT tgname, tgrelid::regclass as table_name
FROM pg_trigger
WHERE tgrelid IN (
    'requirements'::regclass,
    'requirement_comments'::regclass,
    'requirement_tasks'::regclass
)
AND tgisinternal = false;

-- 应该返回 4 个触发器
```

#### 2.4 测试功能

```sql
-- 测试插入需求
INSERT INTO requirements (
    display_id, title, enterprise_id, submitter_id, status
) VALUES (
    'REQ-TEST-0001', '测试需求', 1, 1, 'draft'
) RETURNING id, created_at, updated_at;

-- 测试触发器（updated_at应该自动更新）
UPDATE requirements
SET title = '更新后的测试需求'
WHERE display_id = 'REQ-TEST-0001'
RETURNING id, updated_at;

-- 清理测试数据
DELETE FROM requirements WHERE display_id = 'REQ-TEST-0001';
```

### 3. 性能测试

```sql
-- 测试全文搜索索引
EXPLAIN ANALYZE
SELECT * FROM requirements
WHERE to_tsvector('simple', title || ' ' || COALESCE(description, ''))
    @@ to_tsquery('simple', '测试');

-- 验证查询计划使用了GIN索引
```

---

## 回滚方案

### 回滚决策标准

在以下情况下执行回滚：

1. 迁移过程中发生错误
2. 验证测试失败
3. 发现数据不一致
4. 性能显著下降
5. 业务要求立即回滚

### 回滚执行步骤

⚠️ **警告**: 回滚将删除所有需求管理数据！

#### 步骤 1: 确认回滚决定

```bash
# 列出当前备份
./scripts/backup_restore_requirements.sh list

# 确认备份文件可用
ls -lh backups/migrations/
```

#### 步骤 2: 执行回滚

```bash
# 方式一：使用自动化脚本（推荐）
./scripts/migrate_requirement_system.sh down

# 方式二：手动执行
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME \
  -f migrations/production/001_requirement_system_migration_down.sql
```

#### 步骤 3: 验证回滚

```sql
-- 确认表已删除
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
    'requirements',
    'requirement_comments',
    'requirement_history',
    'requirement_tasks'
);

-- 应该返回 0 行
```

#### 步骤 4: 从备份恢复（如需要）

```bash
# 如果回滚后需要恢复之前的数据
./scripts/backup_restore_requirements.sh restore full \
  backups/migrations/pre_migration_backup_TIMESTAMP.sql.gz
```

---

## 故障排查

### 常见问题

#### 问题 1: 连接超时

**症状**:
```
psql: could not connect to server: Connection timed out
```

**解决方案**:
```bash
# 检查网络连接
ping $DB_HOST

# 检查防火墙规则
telnet $DB_HOST $DB_PORT

# 检查PostgreSQL服务状态
systemctl status postgresql
```

#### 问题 2: 权限不足

**症状**:
```
ERROR: permission denied for schema public
```

**解决方案**:
```sql
-- 授予必要权限
GRANT CREATE ON SCHEMA public TO your_user;
GRANT ALL PRIVILEGES ON DATABASE ai_project_db TO your_user;
```

#### 问题 3: 依赖表不存在

**症状**:
```
ERROR: relation "enterprises" does not exist
```

**解决方案**:
```bash
# 检查依赖表
psql -d ai_project_db -c "
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('enterprises', 'users', 'projects', 'tasks');
"

# 如果缺少依赖表，先执行相应的迁移脚本
```

#### 问题 4: 磁盘空间不足

**症状**:
```
ERROR: could not extend file: No space left on device
```

**解决方案**:
```bash
# 清理旧的日志和临时文件
find /var/log -type f -name "*.log" -mtime +30 -delete

# 清理PostgreSQL临时文件
# (需要DBA操作，谨慎执行)

# 扩展磁盘空间（联系运维）
```

#### 问题 5: 索引创建缓慢

**症状**: 迁移执行时间超过预期

**解决方案**:
```sql
-- 检查正在进行的索引创建
SELECT pid, query, state
FROM pg_stat_activity
WHERE query LIKE 'CREATE INDEX%';

-- 如果需要，可以在维护窗口重建索引
-- (不建议中断正在进行的索引创建)
```

### 紧急联系人

| 角色 | 姓名 | 联系方式 |
|------|------|----------|
| 技术负责人 | [填写] | [填写] |
| DBA | [填写] | [填写] |
| 运维负责人 | [填写] | [填写] |
| 项目经理 | [填写] | [填写] |

---

## 附录

### A. 脚本文件清单

| 文件路径 | 用途 | 可执行 |
|---------|------|--------|
| `migrations/production/001_requirement_system_migration_up.sql` | 迁移SQL脚本 | 否 |
| `migrations/production/001_requirement_system_migration_down.sql` | 回滚SQL脚本 | 否 |
| `scripts/migrate_requirement_system.sh` | 迁移执行脚本 | 是 |
| `scripts/verify_requirement_migration.sh` | 验证脚本 | 是 |
| `scripts/backup_restore_requirements.sh` | 备份恢复脚本 | 是 |

### B. 数据库对象清单

**表**:
- requirements (需求主表)
- requirement_comments (评论表)
- requirement_history (历史记录表)
- requirement_tasks (需求-任务关联表)

**索引**: 31个
**触发器**: 4个
**函数**: 4个

详细清单见迁移SQL脚本。

### C. 迁移日志示例

成功的迁移日志应该包含：

```
========================================
正在创建需求管理系统核心表...
========================================
创建 requirements 表...
✓ requirements 表创建完成
创建 requirement_comments 表...
✓ requirement_comments 表创建完成
...
========================================
✓ 需求管理系统迁移完成！
========================================
```

### D. 性能基准

| 指标 | 预期值 |
|------|--------|
| 迁移总时间 | 10-15秒 |
| 备份时间（完整数据库） | 30-60秒 |
| 验证时间 | 5-10秒 |
| 回滚时间 | 5-10秒 |

### E. 参考资料

- [PostgreSQL Official Documentation](https://www.postgresql.org/docs/)
- [PostgreSQL Backup and Restore](https://www.postgresql.org/docs/current/backup.html)
- [PostgreSQL Performance Tuning](https://www.postgresql.org/docs/current/performance-tips.html)
- 项目内部Wiki: [需求管理系统设计文档]
- 项目内部Wiki: [数据库架构文档]

### F. 变更记录

| 版本 | 日期 | 作者 | 变更内容 |
|------|------|------|----------|
| 1.0.0 | 2025-11-06 | AI Project Team | 初始版本 |

---

## 迁移检查清单

### 迁移前检查

- [ ] 已阅读并理解本文档
- [ ] 已创建完整数据库备份
- [ ] 已验证备份文件可用
- [ ] 已确认数据库连接
- [ ] 已确认依赖表存在
- [ ] 已确认磁盘空间充足（至少2倍数据库大小）
- [ ] 已设置环境变量
- [ ] 已通知相关人员
- [ ] 已准备回滚方案
- [ ] 已准备监控工具

### 迁移执行检查

- [ ] 迁移脚本执行无错误
- [ ] 表创建成功
- [ ] 索引创建成功
- [ ] 触发器创建成功
- [ ] 函数创建成功
- [ ] 迁移日志正常

### 迁移后验证

- [ ] 自动验证脚本通过
- [ ] 手动验证通过
- [ ] 功能测试通过
- [ ] 性能测试通过
- [ ] 无锁等待
- [ ] 无错误日志
- [ ] 备份已保存
- [ ] 已通知相关人员迁移完成
- [ ] 已更新文档

---

**结束**

如有任何疑问，请联系技术负责人或查阅项目Wiki。
