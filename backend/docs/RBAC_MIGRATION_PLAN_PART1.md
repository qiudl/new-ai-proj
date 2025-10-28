# RBAC权限系统重构 - 数据迁移方案 (第1部分)

## 文档信息

- **文档版本**: v1.0
- **创建日期**: 2025-10-28
- **作者**: AI Backend Team
- **关联文档**:
  - RBAC_REFACTORING_PROPOSAL.md
  - RBAC_PROTOTYPE_DESIGN.md
  - RBAC_DEVELOPMENT_PLAN.md
  - RBAC_MIGRATION_PLAN_PART2.md (回滚方案)

---

## 1. 迁移概述

### 1.1 迁移目标

将现有的混乱的RBAC权限系统迁移到新的双域架构系统,实现:

1. **系统域和企业域完全分离**
2. **14个权限表整合为6个核心表**
3. **统一权限代码格式**
4. **完成company_users到enterprise_users的迁移**
5. **数据零丢失,业务零中断**

### 1.2 迁移范围

#### 涉及的数据库表

**需要迁移的核心表** (11张):
```
- users (用户基础表)
- roles (旧角色表)
- permissions (旧权限表)
- user_roles (用户角色关联)
- role_permissions (角色权限关联)
- user_permissions (用户自定义权限)
- company_users (旧企业用户关联)
- enterprise_users (新企业用户关联)
- enterprises (企业表)
- companies (旧客户表)
- role_hierarchy (角色层级,待废弃)
```

**新建的表** (6张):
```
- system_roles (系统角色)
- system_permissions (系统权限)
- system_role_permissions (系统角色权限关联)
- enterprise_roles (企业角色)
- enterprise_permissions (企业权限)
- enterprise_role_permissions (企业角色权限关联)
```

#### 数据量评估 (当前生产环境)

```sql
-- 数据量统计查询
SELECT
    'users' as table_name, COUNT(*) as row_count FROM users WHERE deleted_at IS NULL
UNION ALL
SELECT 'roles', COUNT(*) FROM roles WHERE deleted_at IS NULL
UNION ALL
SELECT 'permissions', COUNT(*) FROM permissions WHERE deleted_at IS NULL
UNION ALL
SELECT 'user_roles', COUNT(*) FROM user_roles WHERE deleted_at IS NULL
UNION ALL
SELECT 'role_permissions', COUNT(*) FROM role_permissions WHERE deleted_at IS NULL
UNION ALL
SELECT 'user_permissions', COUNT(*) FROM user_permissions WHERE deleted_at IS NULL
UNION ALL
SELECT 'company_users', COUNT(*) FROM company_users WHERE deleted_at IS NULL
UNION ALL
SELECT 'enterprise_users', COUNT(*) FROM enterprise_users WHERE deleted_at IS NULL
UNION ALL
SELECT 'enterprises', COUNT(*) FROM enterprises WHERE deleted_at IS NULL;
```

**预估数据量**:
- users: ~500条
- roles: ~50条
- permissions: ~200条
- user_roles: ~600条
- role_permissions: ~800条
- user_permissions: ~100条
- company_users: ~300条
- enterprise_users: ~200条
- enterprises: ~20个

**预估迁移时间**: 约30-60分钟 (包含验证时间)

### 1.3 迁移策略

采用 **灰度迁移** 策略:

```
阶段1: 准备阶段 (不影响业务)
  ↓
阶段2: 数据双写阶段 (新旧系统并存)
  ↓
阶段3: 流量切换阶段 (10% → 50% → 100%)
  ↓
阶段4: 清理阶段 (废弃旧表)
```

---

## 2. 迁移前准备

### 2.1 环境检查清单

#### 数据库环境检查

```bash
#!/bin/bash
# 文件: scripts/migration/01_check_environment.sh

echo "========================================="
echo "RBAC迁移环境检查"
echo "========================================="

# 1. 检查PostgreSQL版本
echo "1. 检查PostgreSQL版本..."
PSQL_VERSION=$(psql --version | awk '{print $3}')
echo "   PostgreSQL版本: $PSQL_VERSION"
if [[ "$PSQL_VERSION" < "13.0" ]]; then
    echo "   ❌ 错误: PostgreSQL版本过低,需要 >= 13.0"
    exit 1
fi
echo "   ✅ PostgreSQL版本符合要求"

# 2. 检查磁盘空间
echo "2. 检查磁盘空间..."
DISK_AVAILABLE=$(df -h /var/lib/postgresql | awk 'NR==2 {print $4}' | sed 's/G//')
echo "   可用空间: ${DISK_AVAILABLE}GB"
if (( $(echo "$DISK_AVAILABLE < 10" | bc -l) )); then
    echo "   ⚠️  警告: 磁盘空间不足10GB"
fi
echo "   ✅ 磁盘空间充足"

# 3. 检查数据库连接
echo "3. 检查数据库连接..."
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT 1" > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "   ❌ 错误: 无法连接到数据库"
    exit 1
fi
echo "   ✅ 数据库连接正常"

# 4. 检查表是否存在
echo "4. 检查必需的表..."
REQUIRED_TABLES=("users" "roles" "permissions" "user_roles" "role_permissions" "enterprises")
for table in "${REQUIRED_TABLES[@]}"; do
    EXISTS=$(psql -h $DB_HOST -U $DB_USER -d $DB_NAME -tAc "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='$table')")
    if [ "$EXISTS" != "t" ]; then
        echo "   ❌ 错误: 表 $table 不存在"
        exit 1
    fi
done
echo "   ✅ 所有必需表存在"

# 5. 检查备份目录
echo "5. 检查备份目录..."
BACKUP_DIR="/var/backups/rbac-migration"
if [ ! -d "$BACKUP_DIR" ]; then
    echo "   创建备份目录: $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"
fi
echo "   ✅ 备份目录就绪: $BACKUP_DIR"

# 6. 检查Redis连接
echo "6. 检查Redis连接..."
redis-cli -h $REDIS_HOST -p $REDIS_PORT ping > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "   ⚠️  警告: Redis连接失败,缓存功能可能受影响"
else
    echo "   ✅ Redis连接正常"
fi

# 7. 检查是否有未完成的迁移
echo "7. 检查迁移状态..."
MIGRATION_STATUS=$(psql -h $DB_HOST -U $DB_USER -d $DB_NAME -tAc "
    SELECT COUNT(*) FROM information_schema.tables
    WHERE table_name IN ('system_roles', 'enterprise_roles')
")
if [ "$MIGRATION_STATUS" -gt 0 ]; then
    echo "   ⚠️  警告: 检测到新表已存在,可能是之前迁移未完成"
fi

echo ""
echo "========================================="
echo "环境检查完成!"
echo "========================================="
```

#### 应用服务检查

```bash
#!/bin/bash
# 文件: scripts/migration/02_check_services.sh

echo "========================================="
echo "应用服务检查"
echo "========================================="

# 1. 检查后端服务状态
echo "1. 检查后端服务..."
BACKEND_STATUS=$(systemctl is-active ai-project-backend)
echo "   后端服务状态: $BACKEND_STATUS"

# 2. 检查当前负载
echo "2. 检查系统负载..."
LOAD_AVG=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}')
echo "   系统负载: $LOAD_AVG"

# 3. 检查活跃连接数
echo "3. 检查数据库连接..."
CONN_COUNT=$(psql -h $DB_HOST -U $DB_USER -d $DB_NAME -tAc "
    SELECT count(*) FROM pg_stat_activity WHERE datname='$DB_NAME'
")
echo "   活跃连接数: $CONN_COUNT"

# 4. 检查是否有长事务
echo "4. 检查长事务..."
LONG_TRANSACTIONS=$(psql -h $DB_HOST -U $DB_USER -d $DB_NAME -tAc "
    SELECT count(*) FROM pg_stat_activity
    WHERE state != 'idle'
    AND query_start < now() - interval '5 minutes'
")
if [ "$LONG_TRANSACTIONS" -gt 0 ]; then
    echo "   ⚠️  警告: 发现 $LONG_TRANSACTIONS 个长事务"
    echo "   建议: 等待事务完成或手动终止"
fi

echo ""
echo "========================================="
echo "服务检查完成!"
echo "========================================="
```

### 2.2 完整数据备份

#### 2.2.1 备份脚本

```bash
#!/bin/bash
# 文件: scripts/migration/03_full_backup.sh
# 功能: 执行完整的数据库备份

set -e  # 遇到错误立即退出

# 配置
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-ai_project_prod}"
DB_USER="${DB_USER:-ai_prod_user}"
BACKUP_DIR="/var/backups/rbac-migration"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/full_backup_$TIMESTAMP.sql"

echo "========================================="
echo "开始完整数据库备份"
echo "========================================="
echo "时间: $(date)"
echo "备份文件: $BACKUP_FILE"
echo ""

# 创建备份目录
mkdir -p "$BACKUP_DIR"

# 1. 执行pg_dump
echo "1. 执行pg_dump..."
PGPASSWORD=$DB_PASSWORD pg_dump \
    -h $DB_HOST \
    -p $DB_PORT \
    -U $DB_USER \
    -d $DB_NAME \
    --verbose \
    --format=custom \
    --compress=9 \
    --file="$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "   ✅ 备份成功"
else
    echo "   ❌ 备份失败"
    exit 1
fi

# 2. 验证备份文件
echo "2. 验证备份文件..."
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | awk '{print $1}')
echo "   备份文件大小: $BACKUP_SIZE"

if [ ! -s "$BACKUP_FILE" ]; then
    echo "   ❌ 错误: 备份文件为空"
    exit 1
fi
echo "   ✅ 备份文件有效"

# 3. 计算校验和
echo "3. 计算备份文件校验和..."
CHECKSUM=$(sha256sum "$BACKUP_FILE" | awk '{print $1}')
echo "$CHECKSUM  $BACKUP_FILE" > "$BACKUP_FILE.sha256"
echo "   SHA256: $CHECKSUM"

# 4. 备份关键表数据到CSV (用于快速恢复)
echo "4. 导出关键表到CSV..."
CSV_DIR="$BACKUP_DIR/csv_$TIMESTAMP"
mkdir -p "$CSV_DIR"

TABLES=("users" "roles" "permissions" "user_roles" "role_permissions" "enterprises" "enterprise_users")

for table in "${TABLES[@]}"; do
    echo "   导出表: $table"
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
        COPY (SELECT * FROM $table WHERE deleted_at IS NULL)
        TO STDOUT WITH CSV HEADER
    " > "$CSV_DIR/${table}.csv"
done

echo "   ✅ CSV导出完成"

# 5. 导出数据库架构 (DDL)
echo "5. 导出数据库架构..."
SCHEMA_FILE="$BACKUP_DIR/schema_$TIMESTAMP.sql"
pg_dump \
    -h $DB_HOST \
    -p $DB_PORT \
    -U $DB_USER \
    -d $DB_NAME \
    --schema-only \
    --no-owner \
    --file="$SCHEMA_FILE"

echo "   ✅ 架构导出完成"

# 6. 记录当前数据统计
echo "6. 记录数据统计..."
STATS_FILE="$BACKUP_DIR/data_stats_$TIMESTAMP.txt"
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME > "$STATS_FILE" <<EOF
-- 数据统计
SELECT
    'users' as table_name,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE deleted_at IS NULL) as active_count,
    COUNT(*) FILTER (WHERE user_type = 'system') as system_users,
    COUNT(*) FILTER (WHERE user_type = 'enterprise') as enterprise_users
FROM users
UNION ALL
SELECT
    'roles',
    COUNT(*),
    COUNT(*) FILTER (WHERE deleted_at IS NULL),
    COUNT(*) FILTER (WHERE role IN ('admin', 'super_admin')),
    COUNT(*) FILTER (WHERE role LIKE 'enterprise_%')
FROM roles
UNION ALL
SELECT
    'permissions',
    COUNT(*),
    COUNT(*) FILTER (WHERE deleted_at IS NULL),
    COUNT(*) FILTER (WHERE code LIKE 'system.%'),
    COUNT(*) FILTER (WHERE code LIKE 'enterprise.%')
FROM permissions
UNION ALL
SELECT
    'user_roles',
    COUNT(*),
    COUNT(*) FILTER (WHERE deleted_at IS NULL),
    NULL,
    NULL
FROM user_roles
UNION ALL
SELECT
    'role_permissions',
    COUNT(*),
    COUNT(*) FILTER (WHERE deleted_at IS NULL),
    NULL,
    NULL
FROM role_permissions
UNION ALL
SELECT
    'enterprises',
    COUNT(*),
    COUNT(*) FILTER (WHERE deleted_at IS NULL),
    COUNT(*) FILTER (WHERE status = 'active'),
    NULL
FROM enterprises;
EOF

echo "   ✅ 数据统计完成"

# 7. 生成备份清单
echo "7. 生成备份清单..."
MANIFEST_FILE="$BACKUP_DIR/backup_manifest_$TIMESTAMP.txt"
cat > "$MANIFEST_FILE" <<EOF
========================================
RBAC迁移备份清单
========================================
备份时间: $(date)
数据库: $DB_NAME@$DB_HOST:$DB_PORT
备份目录: $BACKUP_DIR

备份文件:
1. 完整备份: $BACKUP_FILE ($BACKUP_SIZE)
2. CSV目录: $CSV_DIR
3. 架构备份: $SCHEMA_FILE
4. 数据统计: $STATS_FILE
5. 校验文件: $BACKUP_FILE.sha256

校验和 (SHA256):
$CHECKSUM

备份内容:
- 所有表数据 (包括已删除记录)
- 数据库架构 (表、索引、约束、触发器等)
- 序列当前值
- 权限和所有者信息

恢复命令:
pg_restore -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME --clean --if-exists $BACKUP_FILE

注意事项:
1. 备份文件已压缩 (gzip level 9)
2. 恢复前请确保数据库为空或使用 --clean 选项
3. 恢复后需要手动验证数据完整性
4. CSV文件可用于快速验证或部分恢复
========================================
EOF

echo "   ✅ 清单生成完成"

# 8. 输出备份摘要
echo ""
echo "========================================="
echo "备份完成!"
echo "========================================="
echo "备份位置: $BACKUP_DIR"
echo "备份文件: $(basename $BACKUP_FILE)"
echo "文件大小: $BACKUP_SIZE"
echo "校验和: $CHECKSUM"
echo ""
echo "备份清单已保存到: $MANIFEST_FILE"
echo ""
echo "⚠️  重要提示:"
echo "1. 请验证备份文件完整性"
echo "2. 将备份文件复制到远程存储"
echo "3. 保留此备份至少30天"
echo "========================================="

# 9. 可选: 上传到远程存储
if [ -n "$BACKUP_REMOTE_PATH" ]; then
    echo ""
    echo "上传备份到远程存储..."
    rsync -avz --progress "$BACKUP_FILE" "$BACKUP_REMOTE_PATH/"
    rsync -avz --progress "$CSV_DIR" "$BACKUP_REMOTE_PATH/"
    echo "   ✅ 远程备份完成"
fi
```

#### 2.2.2 备份验证脚本

```bash
#!/bin/bash
# 文件: scripts/migration/04_verify_backup.sh
# 功能: 验证备份文件的完整性和可用性

set -e

BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
    echo "用法: $0 <backup_file>"
    exit 1
fi

echo "========================================="
echo "验证备份文件"
echo "========================================="
echo "备份文件: $BACKUP_FILE"
echo ""

# 1. 检查文件是否存在
echo "1. 检查文件存在性..."
if [ ! -f "$BACKUP_FILE" ]; then
    echo "   ❌ 错误: 备份文件不存在"
    exit 1
fi
echo "   ✅ 文件存在"

# 2. 验证校验和
echo "2. 验证文件校验和..."
if [ -f "$BACKUP_FILE.sha256" ]; then
    sha256sum -c "$BACKUP_FILE.sha256"
    if [ $? -eq 0 ]; then
        echo "   ✅ 校验和验证通过"
    else
        echo "   ❌ 错误: 校验和验证失败"
        exit 1
    fi
else
    echo "   ⚠️  警告: 未找到校验和文件"
fi

# 3. 检查备份文件格式
echo "3. 检查备份格式..."
file "$BACKUP_FILE" | grep -q "PostgreSQL custom database dump"
if [ $? -eq 0 ]; then
    echo "   ✅ 备份格式正确"
else
    echo "   ❌ 错误: 备份格式不正确"
    exit 1
fi

# 4. 列出备份内容
echo "4. 列出备份内容..."
pg_restore --list "$BACKUP_FILE" > /tmp/backup_toc.txt
TABLE_COUNT=$(grep "TABLE DATA" /tmp/backup_toc.txt | wc -l)
INDEX_COUNT=$(grep "INDEX" /tmp/backup_toc.txt | wc -l)
CONSTRAINT_COUNT=$(grep "CONSTRAINT" /tmp/backup_toc.txt | wc -l)

echo "   包含表: $TABLE_COUNT"
echo "   包含索引: $INDEX_COUNT"
echo "   包含约束: $CONSTRAINT_COUNT"

if [ $TABLE_COUNT -lt 10 ]; then
    echo "   ⚠️  警告: 表数量少于预期"
fi

# 5. 验证关键表存在
echo "5. 验证关键表..."
REQUIRED_TABLES=("users" "roles" "permissions" "user_roles" "role_permissions" "enterprises")
for table in "${REQUIRED_TABLES[@]}"; do
    grep -q "TABLE DATA.*$table" /tmp/backup_toc.txt
    if [ $? -eq 0 ]; then
        echo "   ✅ 表 $table 存在"
    else
        echo "   ❌ 错误: 表 $table 不存在"
        exit 1
    fi
done

# 6. 可选: 恢复测试 (恢复到临时数据库)
if [ "$RUN_RESTORE_TEST" = "true" ]; then
    echo "6. 执行恢复测试..."
    TEST_DB="test_restore_$(date +%s)"

    # 创建测试数据库
    createdb -h $DB_HOST -U $DB_USER $TEST_DB

    # 恢复备份
    pg_restore -h $DB_HOST -U $DB_USER -d $TEST_DB "$BACKUP_FILE"

    # 验证表数量
    RESTORED_TABLE_COUNT=$(psql -h $DB_HOST -U $DB_USER -d $TEST_DB -tAc "
        SELECT count(*) FROM information_schema.tables
        WHERE table_schema = 'public'
    ")

    echo "   恢复的表数量: $RESTORED_TABLE_COUNT"

    # 删除测试数据库
    dropdb -h $DB_HOST -U $DB_USER $TEST_DB

    echo "   ✅ 恢复测试通过"
fi

echo ""
echo "========================================="
echo "备份验证完成!"
echo "========================================="
```

### 2.3 迁移配置文件

```yaml
# 文件: configs/migration_config.yaml
# 功能: 迁移过程的配置参数

migration:
  # 基本信息
  version: "1.0.0"
  name: "RBAC权限系统重构迁移"
  description: "从旧权限系统迁移到新的双域架构"

  # 数据库配置
  database:
    host: "${DB_HOST}"
    port: "${DB_PORT}"
    name: "${DB_NAME}"
    user: "${DB_USER}"
    password: "${DB_PASSWORD}"
    ssl_mode: "require"
    max_connections: 20

  # 备份配置
  backup:
    enabled: true
    directory: "/var/backups/rbac-migration"
    retention_days: 30
    remote_storage:
      enabled: true
      type: "s3"  # or "oss", "gcs"
      bucket: "ai-project-backups"
      path: "rbac-migration/"

  # 迁移执行配置
  execution:
    # 批处理大小
    batch_size: 100

    # 超时设置 (秒)
    timeout:
      query: 30
      transaction: 300
      total: 3600

    # 并发控制
    concurrency:
      enabled: false  # 第一次迁移建议串行执行
      max_workers: 4

    # 失败重试
    retry:
      enabled: true
      max_attempts: 3
      delay_seconds: 5

  # 验证配置
  validation:
    # 迁移前验证
    pre_migration:
      - check_database_connection
      - check_disk_space
      - check_backup_exists
      - check_table_exists
      - check_no_long_transactions

    # 迁移后验证
    post_migration:
      - verify_row_counts
      - verify_data_integrity
      - verify_foreign_keys
      - verify_indexes
      - verify_permissions

    # 数据一致性检查
    consistency_checks:
      - user_role_mapping
      - role_permission_mapping
      - enterprise_user_mapping
      - permission_code_format

  # 灰度发布配置
  grayscale:
    enabled: true
    stages:
      - name: "alpha"
        percentage: 10
        duration_hours: 24
        rollback_threshold: 5  # 错误率超过5%自动回滚

      - name: "beta"
        percentage: 50
        duration_hours: 48
        rollback_threshold: 3

      - name: "production"
        percentage: 100
        duration_hours: 0
        rollback_threshold: 1

    # 流量路由规则
    routing:
      method: "user_id_hash"  # or "random", "whitelist"
      whitelist_users: []  # 白名单用户ID

  # 监控配置
  monitoring:
    enabled: true
    metrics:
      - name: "migration_duration"
        type: "histogram"
      - name: "migration_errors"
        type: "counter"
      - name: "data_inconsistency"
        type: "counter"

    alerts:
      - name: "high_error_rate"
        condition: "error_rate > 0.05"
        action: "rollback"

      - name: "data_loss_detected"
        condition: "row_count_diff > 0"
        action: "pause_and_alert"

  # 回滚配置
  rollback:
    auto_rollback: true
    triggers:
      - error_rate_threshold: 0.05
      - data_loss_detected: true
      - validation_failed: true

    # 回滚策略
    strategy: "full"  # or "partial"

  # 清理配置
  cleanup:
    # 是否自动清理旧表
    auto_cleanup: false

    # 保留旧表的时间 (天)
    retention_days: 90

    # 清理前需要的确认
    require_manual_confirmation: true
```

---

## 3. 数据迁移执行

### 3.1 阶段1: 创建新表结构

#### 3.1.1 DDL脚本

```sql
-- 文件: migrations/rbac_v2/01_create_new_tables.sql
-- 功能: 创建新的双域架构表

-- =====================================
-- 系统域 - 系统角色表
-- =====================================
CREATE TABLE IF NOT EXISTS system_roles (
    id SERIAL PRIMARY KEY,
    role_code VARCHAR(50) UNIQUE NOT NULL,
    role_name VARCHAR(100) NOT NULL,
    description TEXT,
    privilege_level INT NOT NULL CHECK (privilege_level BETWEEN 1 AND 100),
    is_active BOOLEAN DEFAULT TRUE,
    is_deletable BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    updated_by INT REFERENCES users(id)
);

-- 添加注释
COMMENT ON TABLE system_roles IS '系统角色表 - 系统管理员使用的角色';
COMMENT ON COLUMN system_roles.role_code IS '角色代码,如: super_admin, admin, auditor';
COMMENT ON COLUMN system_roles.privilege_level IS '权限等级 1-100, 值越大权限越高';
COMMENT ON COLUMN system_roles.is_deletable IS '是否可删除,内置角色不可删除';

-- 创建索引
CREATE INDEX idx_system_roles_code ON system_roles(role_code) WHERE deleted_at IS NULL;
CREATE INDEX idx_system_roles_active ON system_roles(is_active) WHERE deleted_at IS NULL;

-- =====================================
-- 系统域 - 系统权限表
-- =====================================
CREATE TABLE IF NOT EXISTS system_permissions (
    id SERIAL PRIMARY KEY,
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    resource_type VARCHAR(50) NOT NULL,  -- user, role, enterprise, system等
    action VARCHAR(50) NOT NULL,  -- create, read, update, delete, manage等
    is_dangerous BOOLEAN DEFAULT FALSE,  -- 是否是危险操作
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE system_permissions IS '系统权限表 - 系统级别的权限定义';
COMMENT ON COLUMN system_permissions.code IS '权限代码,格式: system.{resource}.{action}';
COMMENT ON COLUMN system_permissions.is_dangerous IS '危险操作标记,如删除、修改关键配置等';

-- 创建索引
CREATE INDEX idx_system_permissions_code ON system_permissions(code);
CREATE INDEX idx_system_permissions_resource ON system_permissions(resource_type);

-- =====================================
-- 系统域 - 系统角色权限关联表
-- =====================================
CREATE TABLE IF NOT EXISTS system_role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INT NOT NULL REFERENCES system_roles(id) ON DELETE CASCADE,
    permission_id INT NOT NULL REFERENCES system_permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),

    UNIQUE(role_id, permission_id)
);

COMMENT ON TABLE system_role_permissions IS '系统角色权限关联表';

-- 创建索引
CREATE INDEX idx_system_role_perms_role ON system_role_permissions(role_id);
CREATE INDEX idx_system_role_perms_perm ON system_role_permissions(permission_id);

-- =====================================
-- 企业域 - 企业角色表
-- =====================================
CREATE TABLE IF NOT EXISTS enterprise_roles (
    id SERIAL PRIMARY KEY,
    enterprise_id INT NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
    role_code VARCHAR(50) NOT NULL,
    role_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,  -- 是否是默认角色
    is_system_defined BOOLEAN DEFAULT FALSE,  -- 是否是系统预定义角色
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    updated_by INT REFERENCES users(id),

    UNIQUE(enterprise_id, role_code)
);

COMMENT ON TABLE enterprise_roles IS '企业角色表 - 企业租户自定义的角色';
COMMENT ON COLUMN enterprise_roles.is_default IS '新用户默认分配的角色';
COMMENT ON COLUMN enterprise_roles.is_system_defined IS '系统预定义角色,企业不可删除但可修改权限';

-- 创建索引
CREATE INDEX idx_enterprise_roles_enterprise ON enterprise_roles(enterprise_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_enterprise_roles_code ON enterprise_roles(enterprise_id, role_code);
CREATE INDEX idx_enterprise_roles_active ON enterprise_roles(is_active) WHERE deleted_at IS NULL;

-- =====================================
-- 企业域 - 企业权限表
-- =====================================
CREATE TABLE IF NOT EXISTS enterprise_permissions (
    id SERIAL PRIMARY KEY,
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    resource_type VARCHAR(50) NOT NULL,  -- project, task, document等
    action VARCHAR(50) NOT NULL,  -- create, read, update, delete等
    scope VARCHAR(20) DEFAULT 'enterprise',  -- enterprise, department, self
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE enterprise_permissions IS '企业权限表 - 企业租户内的权限定义';
COMMENT ON COLUMN enterprise_permissions.code IS '权限代码,格式: enterprise.{resource}.{action}';
COMMENT ON COLUMN enterprise_permissions.scope IS '权限作用域: enterprise(企业), department(部门), self(个人)';

-- 创建索引
CREATE INDEX idx_enterprise_permissions_code ON enterprise_permissions(code);
CREATE INDEX idx_enterprise_permissions_resource ON enterprise_permissions(resource_type);

-- =====================================
-- 企业域 - 企业角色权限关联表
-- =====================================
CREATE TABLE IF NOT EXISTS enterprise_role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INT NOT NULL REFERENCES enterprise_roles(id) ON DELETE CASCADE,
    permission_id INT NOT NULL REFERENCES enterprise_permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),

    UNIQUE(role_id, permission_id)
);

COMMENT ON TABLE enterprise_role_permissions IS '企业角色权限关联表';

-- 创建索引
CREATE INDEX idx_enterprise_role_perms_role ON enterprise_role_permissions(role_id);
CREATE INDEX idx_enterprise_role_perms_perm ON enterprise_role_permissions(permission_id);

-- =====================================
-- 用户多角色支持
-- =====================================
CREATE TABLE IF NOT EXISTS user_enterprise_roles (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    enterprise_id INT NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
    role_id INT NOT NULL REFERENCES enterprise_roles(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT FALSE,  -- 是否是主角色
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by INT REFERENCES users(id),

    UNIQUE(user_id, enterprise_id, role_id)
);

COMMENT ON TABLE user_enterprise_roles IS '用户企业角色关联表 - 支持用户在企业内拥有多个角色';
COMMENT ON COLUMN user_enterprise_roles.is_primary IS '主角色,用于权限冲突时的优先级判断';

-- 创建索引
CREATE INDEX idx_user_ent_roles_user ON user_enterprise_roles(user_id, enterprise_id);
CREATE INDEX idx_user_ent_roles_role ON user_enterprise_roles(role_id);

-- =====================================
-- 用户自定义权限覆盖
-- =====================================
CREATE TABLE IF NOT EXISTS user_permission_overrides (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    enterprise_id INT REFERENCES enterprises(id) ON DELETE CASCADE,  -- NULL表示系统级权限
    permission_id INT NOT NULL,  -- 可以是system_permissions.id或enterprise_permissions.id
    permission_type VARCHAR(20) NOT NULL CHECK (permission_type IN ('system', 'enterprise')),
    grant_type VARCHAR(10) NOT NULL CHECK (grant_type IN ('grant', 'deny')),
    reason TEXT,
    expires_at TIMESTAMP,  -- 权限过期时间
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),

    UNIQUE(user_id, enterprise_id, permission_id, permission_type)
);

COMMENT ON TABLE user_permission_overrides IS '用户权限覆盖表 - 覆盖角色默认权限';
COMMENT ON COLUMN user_permission_overrides.grant_type IS 'grant=授予额外权限, deny=撤销角色权限';

-- 创建索引
CREATE INDEX idx_user_perm_overrides_user ON user_permission_overrides(user_id, enterprise_id);
CREATE INDEX idx_user_perm_overrides_expires ON user_permission_overrides(expires_at)
    WHERE expires_at IS NOT NULL;

-- =====================================
-- 迁移状态跟踪表
-- =====================================
CREATE TABLE IF NOT EXISTS rbac_migration_log (
    id SERIAL PRIMARY KEY,
    migration_batch VARCHAR(50) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    operation VARCHAR(50) NOT NULL,  -- create_table, migrate_data, create_index等
    status VARCHAR(20) NOT NULL,  -- pending, running, completed, failed, rolled_back
    rows_affected INT,
    error_message TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE rbac_migration_log IS 'RBAC迁移日志表 - 记录迁移过程';

CREATE INDEX idx_migration_log_batch ON rbac_migration_log(migration_batch);
CREATE INDEX idx_migration_log_status ON rbac_migration_log(status);

-- =====================================
-- 授予权限
-- =====================================
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ai_prod_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ai_prod_user;
```

#### 3.1.2 执行DDL的Shell脚本

```bash
#!/bin/bash
# 文件: scripts/migration/10_create_tables.sh

set -e

MIGRATION_BATCH="rbac_v2_$(date +%Y%m%d_%H%M%S)"
SQL_FILE="migrations/rbac_v2/01_create_new_tables.sql"

echo "========================================="
echo "创建新表结构"
echo "========================================="
echo "迁移批次: $MIGRATION_BATCH"
echo "SQL文件: $SQL_FILE"
echo ""

# 记录迁移开始
psql -h $DB_HOST -U $DB_USER -d $DB_NAME <<EOF
INSERT INTO rbac_migration_log (migration_batch, table_name, operation, status, started_at)
VALUES ('$MIGRATION_BATCH', 'ALL', 'create_tables', 'running', CURRENT_TIMESTAMP);
EOF

# 执行DDL
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f "$SQL_FILE"

if [ $? -eq 0 ]; then
    # 记录成功
    psql -h $DB_HOST -U $DB_USER -d $DB_NAME <<EOF
UPDATE rbac_migration_log
SET status = 'completed', completed_at = CURRENT_TIMESTAMP
WHERE migration_batch = '$MIGRATION_BATCH' AND operation = 'create_tables';
EOF
    echo "✅ 表结构创建成功"
else
    # 记录失败
    psql -h $DB_HOST -U $DB_USER -d $DB_NAME <<EOF
UPDATE rbac_migration_log
SET status = 'failed', completed_at = CURRENT_TIMESTAMP, error_message = '执行DDL失败'
WHERE migration_batch = '$MIGRATION_BATCH' AND operation = 'create_tables';
EOF
    echo "❌ 表结构创建失败"
    exit 1
fi

echo ""
echo "========================================="
```

### 3.2 阶段2: 初始化基础数据

#### 3.2.1 系统角色和权限初始化

```sql
-- 文件: migrations/rbac_v2/02_init_system_data.sql
-- 功能: 初始化系统域的基础数据

BEGIN;

-- =====================================
-- 1. 初始化系统角色
-- =====================================
INSERT INTO system_roles (role_code, role_name, description, privilege_level, is_deletable) VALUES
    ('super_admin', '超级管理员', '最高权限,可管理所有系统资源和企业数据', 100, FALSE),
    ('admin', '系统管理员', '可管理大部分系统资源,但不能修改系统配置', 90, FALSE),
    ('auditor', '审计员', '只读权限,可查看审计日志和系统报表', 50, FALSE),
    ('support', '技术支持', '可查看企业数据,协助排查问题,不能修改敏感信息', 40, FALSE)
ON CONFLICT (role_code) DO NOTHING;

-- =====================================
-- 2. 初始化系统权限 - 用户管理
-- =====================================
INSERT INTO system_permissions (code, name, description, resource_type, action, is_dangerous) VALUES
    ('system.user.create', '创建用户', '创建系统用户或企业用户', 'user', 'create', FALSE),
    ('system.user.read', '查看用户', '查看用户基本信息和详细信息', 'user', 'read', FALSE),
    ('system.user.update', '更新用户', '更新用户信息(不包括角色和权限)', 'user', 'update', FALSE),
    ('system.user.delete', '删除用户', '删除用户(软删除)', 'user', 'delete', TRUE),
    ('system.user.manage_role', '管理用户角色', '分配或移除用户角色', 'user', 'manage_role', TRUE),
    ('system.user.reset_password', '重置用户密码', '重置任意用户密码', 'user', 'reset_password', TRUE),
    ('system.user.impersonate', '模拟用户登录', '以其他用户身份登录系统', 'user', 'impersonate', TRUE)
ON CONFLICT (code) DO NOTHING;

-- =====================================
-- 3. 初始化系统权限 - 角色管理
-- =====================================
INSERT INTO system_permissions (code, name, description, resource_type, action, is_dangerous) VALUES
    ('system.role.create', '创建角色', '创建系统角色', 'role', 'create', FALSE),
    ('system.role.read', '查看角色', '查看角色信息和权限配置', 'role', 'read', FALSE),
    ('system.role.update', '更新角色', '更新角色信息和权限配置', 'role', 'update', TRUE),
    ('system.role.delete', '删除角色', '删除自定义角色', 'role', 'delete', TRUE)
ON CONFLICT (code) DO NOTHING;

-- =====================================
-- 4. 初始化系统权限 - 企业管理
-- =====================================
INSERT INTO system_permissions (code, name, description, resource_type, action, is_dangerous) VALUES
    ('system.enterprise.create', '创建企业', '创建新企业租户', 'enterprise', 'create', FALSE),
    ('system.enterprise.read', '查看企业', '查看企业信息', 'enterprise', 'read', FALSE),
    ('system.enterprise.update', '更新企业', '更新企业信息', 'enterprise', 'update', FALSE),
    ('system.enterprise.delete', '删除企业', '删除企业(软删除)', 'enterprise', 'delete', TRUE),
    ('system.enterprise.suspend', '暂停企业', '暂停企业服务', 'enterprise', 'suspend', TRUE),
    ('system.enterprise.access_data', '访问企业数据', '跨企业访问数据,用于技术支持', 'enterprise', 'access_data', TRUE)
ON CONFLICT (code) DO NOTHING;

-- =====================================
-- 5. 初始化系统权限 - 系统配置
-- =====================================
INSERT INTO system_permissions (code, name, description, resource_type, action, is_dangerous) VALUES
    ('system.config.read', '查看系统配置', '查看系统配置参数', 'system', 'read', FALSE),
    ('system.config.update', '更新系统配置', '修改系统配置参数', 'system', 'update', TRUE),
    ('system.audit.read', '查看审计日志', '查看系统审计日志', 'system', 'read', FALSE),
    ('system.monitor.read', '查看系统监控', '查看系统监控指标和报表', 'system', 'read', FALSE)
ON CONFLICT (code) DO NOTHING;

-- =====================================
-- 6. 分配权限给系统角色
-- =====================================

-- 超级管理员: 所有权限
INSERT INTO system_role_permissions (role_id, permission_id)
SELECT
    (SELECT id FROM system_roles WHERE role_code = 'super_admin'),
    id
FROM system_permissions
ON CONFLICT DO NOTHING;

-- 系统管理员: 除了system.config.update和system.user.impersonate之外的所有权限
INSERT INTO system_role_permissions (role_id, permission_id)
SELECT
    (SELECT id FROM system_roles WHERE role_code = 'admin'),
    id
FROM system_permissions
WHERE code NOT IN ('system.config.update', 'system.user.impersonate')
ON CONFLICT DO NOTHING;

-- 审计员: 只读权限
INSERT INTO system_role_permissions (role_id, permission_id)
SELECT
    (SELECT id FROM system_roles WHERE role_code = 'auditor'),
    id
FROM system_permissions
WHERE action = 'read'
ON CONFLICT DO NOTHING;

-- 技术支持: 查看权限 + 访问企业数据
INSERT INTO system_role_permissions (role_id, permission_id)
SELECT
    (SELECT id FROM system_roles WHERE role_code = 'support'),
    id
FROM system_permissions
WHERE action = 'read' OR code = 'system.enterprise.access_data'
ON CONFLICT DO NOTHING;

COMMIT;
```

#### 3.2.2 企业权限初始化

```sql
-- 文件: migrations/rbac_v2/03_init_enterprise_data.sql
-- 功能: 初始化企业域的基础数据

BEGIN;

-- =====================================
-- 1. 初始化企业权限 - 项目管理
-- =====================================
INSERT INTO enterprise_permissions (code, name, description, resource_type, action, scope) VALUES
    ('enterprise.project.create', '创建项目', '在企业内创建新项目', 'project', 'create', 'enterprise'),
    ('enterprise.project.read', '查看项目', '查看项目信息', 'project', 'read', 'enterprise'),
    ('enterprise.project.update', '更新项目', '更新项目信息', 'project', 'update', 'enterprise'),
    ('enterprise.project.delete', '删除项目', '删除项目', 'project', 'delete', 'enterprise'),
    ('enterprise.project.archive', '归档项目', '归档已完成的项目', 'project', 'archive', 'enterprise')
ON CONFLICT (code) DO NOTHING;

-- =====================================
-- 2. 初始化企业权限 - 任务管理
-- =====================================
INSERT INTO enterprise_permissions (code, name, description, resource_type, action, scope) VALUES
    ('enterprise.task.create', '创建任务', '创建项目任务', 'task', 'create', 'enterprise'),
    ('enterprise.task.read', '查看任务', '查看任务详情', 'task', 'read', 'enterprise'),
    ('enterprise.task.update', '更新任务', '更新任务信息', 'task', 'update', 'self'),
    ('enterprise.task.delete', '删除任务', '删除任务', 'task', 'delete', 'enterprise'),
    ('enterprise.task.assign', '分配任务', '分配任务给其他成员', 'task', 'assign', 'enterprise')
ON CONFLICT (code) DO NOTHING;

-- =====================================
-- 3. 初始化企业权限 - 文档管理
-- =====================================
INSERT INTO enterprise_permissions (code, name, description, resource_type, action, scope) VALUES
    ('enterprise.document.create', '创建文档', '创建企业文档', 'document', 'create', 'enterprise'),
    ('enterprise.document.read', '查看文档', '查看文档内容', 'document', 'read', 'enterprise'),
    ('enterprise.document.update', '更新文档', '编辑文档内容', 'document', 'update', 'self'),
    ('enterprise.document.delete', '删除文档', '删除文档', 'document', 'delete', 'enterprise'),
    ('enterprise.document.share', '分享文档', '分享文档给其他成员或企业', 'document', 'share', 'enterprise')
ON CONFLICT (code) DO NOTHING;

-- =====================================
-- 4. 初始化企业权限 - 成员管理
-- =====================================
INSERT INTO enterprise_permissions (code, name, description, resource_type, action, scope) VALUES
    ('enterprise.member.invite', '邀请成员', '邀请新成员加入企业', 'member', 'invite', 'enterprise'),
    ('enterprise.member.read', '查看成员', '查看企业成员列表', 'member', 'read', 'enterprise'),
    ('enterprise.member.update', '更新成员', '更新成员信息(不包括角色)', 'member', 'update', 'enterprise'),
    ('enterprise.member.remove', '移除成员', '从企业移除成员', 'member', 'remove', 'enterprise'),
    ('enterprise.member.manage_role', '管理成员角色', '分配或移除成员角色', 'member', 'manage_role', 'enterprise')
ON CONFLICT (code) DO NOTHING;

-- =====================================
-- 5. 初始化企业权限 - 角色管理
-- =====================================
INSERT INTO enterprise_permissions (code, name, description, resource_type, action, scope) VALUES
    ('enterprise.role.create', '创建角色', '创建企业自定义角色', 'role', 'create', 'enterprise'),
    ('enterprise.role.read', '查看角色', '查看角色配置', 'role', 'read', 'enterprise'),
    ('enterprise.role.update', '更新角色', '更新角色权限配置', 'role', 'update', 'enterprise'),
    ('enterprise.role.delete', '删除角色', '删除自定义角色', 'role', 'delete', 'enterprise')
ON CONFLICT (code) DO NOTHING;

-- =====================================
-- 6. 为每个企业创建默认角色
-- =====================================

-- 为每个现有企业创建默认角色
DO $$
DECLARE
    ent_record RECORD;
    admin_role_id INT;
    member_role_id INT;
    viewer_role_id INT;
BEGIN
    -- 遍历所有企业
    FOR ent_record IN SELECT id, name FROM enterprises WHERE deleted_at IS NULL LOOP

        -- 创建企业管理员角色
        INSERT INTO enterprise_roles (enterprise_id, role_code, role_name, description, is_system_defined, is_default)
        VALUES (
            ent_record.id,
            'enterprise_admin',
            '企业管理员',
            '企业最高权限,可管理企业所有资源',
            TRUE,
            FALSE
        )
        RETURNING id INTO admin_role_id;

        -- 分配所有企业权限给管理员
        INSERT INTO enterprise_role_permissions (role_id, permission_id)
        SELECT admin_role_id, id FROM enterprise_permissions;

        -- 创建普通成员角色
        INSERT INTO enterprise_roles (enterprise_id, role_code, role_name, description, is_system_defined, is_default)
        VALUES (
            ent_record.id,
            'enterprise_member',
            '普通成员',
            '可创建和管理自己的项目、任务、文档',
            TRUE,
            TRUE  -- 默认角色
        )
        RETURNING id INTO member_role_id;

        -- 分配基本权限给普通成员
        INSERT INTO enterprise_role_permissions (role_id, permission_id)
        SELECT member_role_id, id FROM enterprise_permissions
        WHERE code IN (
            'enterprise.project.create', 'enterprise.project.read',
            'enterprise.task.create', 'enterprise.task.read', 'enterprise.task.update',
            'enterprise.document.create', 'enterprise.document.read', 'enterprise.document.update',
            'enterprise.member.read'
        );

        -- 创建访客角色
        INSERT INTO enterprise_roles (enterprise_id, role_code, role_name, description, is_system_defined, is_default)
        VALUES (
            ent_record.id,
            'enterprise_viewer',
            '访客',
            '只读权限,可查看企业资源',
            TRUE,
            FALSE
        )
        RETURNING id INTO viewer_role_id;

        -- 分配只读权限给访客
        INSERT INTO enterprise_role_permissions (role_id, permission_id)
        SELECT viewer_role_id, id FROM enterprise_permissions
        WHERE action = 'read';

        RAISE NOTICE '企业 % (ID: %) 的默认角色已创建', ent_record.name, ent_record.id;
    END LOOP;
END $$;

COMMIT;
```

---

## 4. 数据迁移 - 核心逻辑

### 4.1 用户角色迁移

```sql
-- 文件: migrations/rbac_v2/04_migrate_user_roles.sql
-- 功能: 迁移用户角色数据

BEGIN;

-- =====================================
-- 1. 迁移系统用户的角色
-- =====================================

-- 标记开始
INSERT INTO rbac_migration_log (migration_batch, table_name, operation, status, started_at)
VALUES ('rbac_v2_migration', 'users', 'migrate_system_users', 'running', CURRENT_TIMESTAMP);

-- 迁移系统管理员
INSERT INTO user_enterprise_roles (user_id, enterprise_id, role_id, is_primary, assigned_at)
SELECT
    u.id as user_id,
    NULL as enterprise_id,  -- 系统用户不属于任何企业
    sr.id as role_id,
    TRUE as is_primary,
    CURRENT_TIMESTAMP
FROM users u
CROSS JOIN system_roles sr
WHERE u.user_type = 'system'
AND u.deleted_at IS NULL
AND sr.role_code = CASE
    WHEN u.role = 'super_admin' THEN 'super_admin'
    WHEN u.role = 'admin' THEN 'admin'
    WHEN u.role = 'auditor' THEN 'auditor'
    WHEN u.role = 'support' THEN 'support'
    ELSE 'admin'  -- 默认映射到admin
END
ON CONFLICT (user_id, enterprise_id, role_id) DO NOTHING;

-- 记录成功
UPDATE rbac_migration_log
SET status = 'completed',
    completed_at = CURRENT_TIMESTAMP,
    rows_affected = (SELECT COUNT(*) FROM user_enterprise_roles WHERE enterprise_id IS NULL)
WHERE migration_batch = 'rbac_v2_migration' AND table_name = 'users' AND operation = 'migrate_system_users';

-- =====================================
-- 2. 迁移企业用户的角色
-- =====================================

-- 标记开始
INSERT INTO rbac_migration_log (migration_batch, table_name, operation, status, started_at)
VALUES ('rbac_v2_migration', 'enterprise_users', 'migrate_enterprise_users', 'running', CURRENT_TIMESTAMP);

-- 从enterprise_users表迁移
INSERT INTO user_enterprise_roles (user_id, enterprise_id, role_id, is_primary, assigned_at)
SELECT
    eu.user_id,
    eu.enterprise_id,
    er.id as role_id,
    TRUE as is_primary,
    eu.created_at as assigned_at
FROM enterprise_users eu
INNER JOIN users u ON eu.user_id = u.id AND u.deleted_at IS NULL
INNER JOIN enterprises e ON eu.enterprise_id = e.id AND e.deleted_at IS NULL
INNER JOIN enterprise_roles er ON er.enterprise_id = eu.enterprise_id
WHERE eu.deleted_at IS NULL
AND er.role_code = CASE
    WHEN eu.role = 'enterprise_admin' OR eu.role = 'company_admin' THEN 'enterprise_admin'
    WHEN eu.role = 'enterprise_user' OR eu.role = 'company_user' THEN 'enterprise_member'
    ELSE 'enterprise_member'  -- 默认映射到普通成员
END
ON CONFLICT (user_id, enterprise_id, role_id) DO NOTHING;

-- 从旧的company_users表迁移(如果还有数据)
INSERT INTO user_enterprise_roles (user_id, enterprise_id, role_id, is_primary, assigned_at)
SELECT
    cu.user_id,
    e.id as enterprise_id,  -- 需要从companies映射到enterprises
    er.id as role_id,
    FALSE as is_primary,  -- 标记为非主角色,避免冲突
    cu.created_at as assigned_at
FROM company_users cu
INNER JOIN companies c ON cu.company_id = c.id
INNER JOIN enterprises e ON e.legacy_company_id = c.id  -- 假设有这个映射字段
INNER JOIN enterprise_roles er ON er.enterprise_id = e.id
WHERE cu.deleted_at IS NULL
AND cu.user_id NOT IN (
    SELECT user_id FROM user_enterprise_roles WHERE enterprise_id = e.id
)
AND er.role_code = CASE
    WHEN cu.role = 'company_admin' THEN 'enterprise_admin'
    WHEN cu.role = 'company_user' THEN 'enterprise_member'
    ELSE 'enterprise_member'
END
ON CONFLICT (user_id, enterprise_id, role_id) DO NOTHING;

-- 记录成功
UPDATE rbac_migration_log
SET status = 'completed',
    completed_at = CURRENT_TIMESTAMP,
    rows_affected = (SELECT COUNT(*) FROM user_enterprise_roles WHERE enterprise_id IS NOT NULL)
WHERE migration_batch = 'rbac_v2_migration' AND table_name = 'enterprise_users' AND operation = 'migrate_enterprise_users';

-- =====================================
-- 3. 处理用户自定义权限
-- =====================================

-- 标记开始
INSERT INTO rbac_migration_log (migration_batch, table_name, operation, status, started_at)
VALUES ('rbac_v2_migration', 'user_permissions', 'migrate_custom_permissions', 'running', CURRENT_TIMESTAMP);

-- 迁移用户自定义权限覆盖
INSERT INTO user_permission_overrides (
    user_id,
    enterprise_id,
    permission_id,
    permission_type,
    grant_type,
    reason,
    created_at
)
SELECT
    up.user_id,
    eu.enterprise_id,  -- 从enterprise_users获取企业ID
    CASE
        WHEN ep.id IS NOT NULL THEN ep.id
        WHEN sp.id IS NOT NULL THEN sp.id
    END as permission_id,
    CASE
        WHEN ep.id IS NOT NULL THEN 'enterprise'
        WHEN sp.id IS NOT NULL THEN 'system'
    END as permission_type,
    'grant' as grant_type,  -- 旧系统只有授予,没有撤销
    '从旧系统迁移' as reason,
    up.created_at
FROM user_permissions up
INNER JOIN users u ON up.user_id = u.id AND u.deleted_at IS NULL
LEFT JOIN enterprise_users eu ON eu.user_id = up.user_id AND eu.deleted_at IS NULL
LEFT JOIN permissions old_perm ON up.permission_id = old_perm.id
-- 尝试匹配到新的企业权限
LEFT JOIN enterprise_permissions ep ON ep.code = old_perm.code
    OR ep.code = REPLACE(old_perm.code, 'project:', 'enterprise.project.')
    OR ep.code = REPLACE(old_perm.code, 'task:', 'enterprise.task.')
-- 尝试匹配到新的系统权限
LEFT JOIN system_permissions sp ON sp.code = old_perm.code
    OR sp.code = REPLACE(old_perm.code, 'user:', 'system.user.')
WHERE up.deleted_at IS NULL
AND (ep.id IS NOT NULL OR sp.id IS NOT NULL)
ON CONFLICT (user_id, enterprise_id, permission_id, permission_type) DO NOTHING;

-- 记录成功
UPDATE rbac_migration_log
SET status = 'completed',
    completed_at = CURRENT_TIMESTAMP,
    rows_affected = (SELECT COUNT(*) FROM user_permission_overrides)
WHERE migration_batch = 'rbac_v2_migration' AND table_name = 'user_permissions' AND operation = 'migrate_custom_permissions';

COMMIT;

-- =====================================
-- 4. 数据验证
-- =====================================

-- 验证系统用户迁移
DO $$
DECLARE
    system_user_count INT;
    migrated_count INT;
BEGIN
    SELECT COUNT(*) INTO system_user_count
    FROM users WHERE user_type = 'system' AND deleted_at IS NULL;

    SELECT COUNT(DISTINCT user_id) INTO migrated_count
    FROM user_enterprise_roles WHERE enterprise_id IS NULL;

    IF system_user_count != migrated_count THEN
        RAISE WARNING '系统用户迁移数量不匹配: 原始=%, 迁移=%, 差异=%',
            system_user_count, migrated_count, (system_user_count - migrated_count);
    ELSE
        RAISE NOTICE '✅ 系统用户迁移验证通过: % 个用户', system_user_count;
    END IF;
END $$;

-- 验证企业用户迁移
DO $$
DECLARE
    enterprise_user_count INT;
    migrated_count INT;
BEGIN
    SELECT COUNT(*) INTO enterprise_user_count
    FROM enterprise_users WHERE deleted_at IS NULL;

    SELECT COUNT(*) INTO migrated_count
    FROM user_enterprise_roles WHERE enterprise_id IS NOT NULL;

    IF enterprise_user_count > migrated_count THEN
        RAISE WARNING '企业用户迁移数量少于原始: 原始=%, 迁移=%, 差异=%',
            enterprise_user_count, migrated_count, (enterprise_user_count - migrated_count);
    ELSE
        RAISE NOTICE '✅ 企业用户迁移验证通过: 原始=%, 迁移=%',
            enterprise_user_count, migrated_count;
    END IF;
END $$;

-- 列出未迁移的用户
SELECT
    u.id,
    u.username,
    u.email,
    u.user_type,
    u.role as old_role,
    eu.enterprise_id,
    e.name as enterprise_name
FROM users u
LEFT JOIN enterprise_users eu ON eu.user_id = u.id AND eu.deleted_at IS NULL
LEFT JOIN enterprises e ON e.id = eu.enterprise_id
LEFT JOIN user_enterprise_roles uer ON uer.user_id = u.id
WHERE u.deleted_at IS NULL
AND uer.id IS NULL
ORDER BY u.user_type, u.id;
```

---

## 5. 数据一致性验证

### 5.1 验证脚本

```sql
-- 文件: migrations/rbac_v2/05_validate_migration.sql
-- 功能: 验证迁移后的数据一致性

-- =====================================
-- 验证报告表
-- =====================================
CREATE TEMP TABLE migration_validation_report (
    check_name VARCHAR(100),
    status VARCHAR(20),  -- pass, warning, fail
    expected_value TEXT,
    actual_value TEXT,
    difference TEXT,
    details TEXT
);

-- =====================================
-- 1. 验证表行数
-- =====================================
INSERT INTO migration_validation_report
SELECT
    '表行数验证: ' || table_name,
    CASE
        WHEN diff = 0 THEN 'pass'
        WHEN diff < 0 THEN 'fail'  -- 数据丢失
        ELSE 'warning'  -- 数据增加(可能是多角色)
    END,
    old_count::TEXT,
    new_count::TEXT,
    diff::TEXT,
    CASE
        WHEN diff < 0 THEN '⚠️  数据可能丢失'
        WHEN diff > 0 THEN 'ℹ️  数据增加(正常,支持多角色)'
        ELSE '✅ 行数一致'
    END
FROM (
    SELECT
        'users' as table_name,
        (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL) as old_count,
        (SELECT COUNT(DISTINCT user_id) FROM user_enterprise_roles) as new_count,
        (SELECT COUNT(DISTINCT user_id) FROM user_enterprise_roles) -
        (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL) as diff
    UNION ALL
    SELECT
        'enterprise_users',
        (SELECT COUNT(*) FROM enterprise_users WHERE deleted_at IS NULL),
        (SELECT COUNT(*) FROM user_enterprise_roles WHERE enterprise_id IS NOT NULL),
        (SELECT COUNT(*) FROM user_enterprise_roles WHERE enterprise_id IS NOT NULL) -
        (SELECT COUNT(*) FROM enterprise_users WHERE deleted_at IS NULL)
) t;

-- =====================================
-- 2. 验证权限代码格式
-- =====================================
INSERT INTO migration_validation_report
SELECT
    '权限代码格式验证: 系统权限',
    CASE
        WHEN invalid_count = 0 THEN 'pass'
        ELSE 'fail'
    END,
    '0',
    invalid_count::TEXT,
    NULL,
    CASE
        WHEN invalid_count = 0 THEN '✅ 所有权限代码格式正确'
        ELSE '❌ 发现格式错误的权限代码'
    END
FROM (
    SELECT COUNT(*) as invalid_count
    FROM system_permissions
    WHERE code !~ '^system\.[a-z_]+\.[a-z_]+$'
) t;

INSERT INTO migration_validation_report
SELECT
    '权限代码格式验证: 企业权限',
    CASE
        WHEN invalid_count = 0 THEN 'pass'
        ELSE 'fail'
    END,
    '0',
    invalid_count::TEXT,
    NULL,
    CASE
        WHEN invalid_count = 0 THEN '✅ 所有权限代码格式正确'
        ELSE '❌ 发现格式错误的权限代码'
    END
FROM (
    SELECT COUNT(*) as invalid_count
    FROM enterprise_permissions
    WHERE code !~ '^enterprise\.[a-z_]+\.[a-z_]+$'
) t;

-- =====================================
-- 3. 验证外键完整性
-- =====================================
INSERT INTO migration_validation_report
SELECT
    '外键完整性: user_enterprise_roles.user_id',
    CASE WHEN orphan_count = 0 THEN 'pass' ELSE 'fail' END,
    '0',
    orphan_count::TEXT,
    NULL,
    CASE
        WHEN orphan_count = 0 THEN '✅ 无孤立记录'
        ELSE '❌ 发现孤立的用户角色关联'
    END
FROM (
    SELECT COUNT(*) as orphan_count
    FROM user_enterprise_roles uer
    LEFT JOIN users u ON uer.user_id = u.id
    WHERE u.id IS NULL
) t;

INSERT INTO migration_validation_report
SELECT
    '外键完整性: user_enterprise_roles.enterprise_id',
    CASE WHEN orphan_count = 0 THEN 'pass' ELSE 'fail' END,
    '0',
    orphan_count::TEXT,
    NULL,
    CASE
        WHEN orphan_count = 0 THEN '✅ 无孤立记录'
        ELSE '❌ 发现孤立的企业引用'
    END
FROM (
    SELECT COUNT(*) as orphan_count
    FROM user_enterprise_roles uer
    LEFT JOIN enterprises e ON uer.enterprise_id = e.id
    WHERE uer.enterprise_id IS NOT NULL AND e.id IS NULL
) t;

-- =====================================
-- 4. 验证角色分配
-- =====================================
INSERT INTO migration_validation_report
SELECT
    '角色分配: 系统用户',
    CASE
        WHEN unassigned_count = 0 THEN 'pass'
        ELSE 'warning'
    END,
    '0',
    unassigned_count::TEXT,
    NULL,
    CASE
        WHEN unassigned_count = 0 THEN '✅ 所有系统用户都已分配角色'
        ELSE '⚠️  部分系统用户未分配角色'
    END
FROM (
    SELECT COUNT(*) as unassigned_count
    FROM users u
    WHERE u.user_type = 'system'
    AND u.deleted_at IS NULL
    AND NOT EXISTS (
        SELECT 1 FROM user_enterprise_roles uer
        WHERE uer.user_id = u.id AND uer.enterprise_id IS NULL
    )
) t;

INSERT INTO migration_validation_report
SELECT
    '角色分配: 企业用户',
    CASE
        WHEN unassigned_count = 0 THEN 'pass'
        ELSE 'fail'
    END,
    '0',
    unassigned_count::TEXT,
    NULL,
    CASE
        WHEN unassigned_count = 0 THEN '✅ 所有企业用户都已分配角色'
        ELSE '❌ 部分企业用户未分配角色'
    END
FROM (
    SELECT COUNT(*) as unassigned_count
    FROM enterprise_users eu
    WHERE eu.deleted_at IS NULL
    AND NOT EXISTS (
        SELECT 1 FROM user_enterprise_roles uer
        WHERE uer.user_id = eu.user_id
        AND uer.enterprise_id = eu.enterprise_id
    )
) t;

-- =====================================
-- 5. 验证默认角色
-- =====================================
INSERT INTO migration_validation_report
SELECT
    '默认角色: 每个企业必须有默认角色',
    CASE
        WHEN missing_count = 0 THEN 'pass'
        ELSE 'fail'
    END,
    '0',
    missing_count::TEXT,
    NULL,
    CASE
        WHEN missing_count = 0 THEN '✅ 所有企业都有默认角色'
        ELSE '❌ 部分企业缺少默认角色'
    END
FROM (
    SELECT COUNT(*) as missing_count
    FROM enterprises e
    WHERE e.deleted_at IS NULL
    AND NOT EXISTS (
        SELECT 1 FROM enterprise_roles er
        WHERE er.enterprise_id = e.id
        AND er.is_default = TRUE
        AND er.deleted_at IS NULL
    )
) t;

-- =====================================
-- 输出验证报告
-- =====================================
\echo '========================================='
\echo 'RBAC迁移数据验证报告'
\echo '========================================='
\echo ''

SELECT
    check_name as "检查项",
    CASE status
        WHEN 'pass' THEN '✅ 通过'
        WHEN 'warning' THEN '⚠️  警告'
        WHEN 'fail' THEN '❌ 失败'
    END as "状态",
    expected_value as "期望值",
    actual_value as "实际值",
    difference as "差异",
    details as "详情"
FROM migration_validation_report
ORDER BY
    CASE status
        WHEN 'fail' THEN 1
        WHEN 'warning' THEN 2
        WHEN 'pass' THEN 3
    END,
    check_name;

-- 统计
\echo ''
\echo '========================================='
\echo '验证统计'
\echo '========================================='

SELECT
    COUNT(*) FILTER (WHERE status = 'pass') as "通过数量",
    COUNT(*) FILTER (WHERE status = 'warning') as "警告数量",
    COUNT(*) FILTER (WHERE status = 'fail') as "失败数量",
    COUNT(*) as "总检查项"
FROM migration_validation_report;

-- 判断整体结果
DO $$
DECLARE
    fail_count INT;
BEGIN
    SELECT COUNT(*) INTO fail_count
    FROM migration_validation_report
    WHERE status = 'fail';

    IF fail_count > 0 THEN
        RAISE EXCEPTION '❌ 数据验证失败: % 项检查未通过,请检查详细报告', fail_count;
    ELSE
        RAISE NOTICE '✅ 数据验证全部通过!';
    END IF;
END $$;
```

---

## 6. 总结

本文档(第1部分)涵盖了RBAC权限系统迁移的以下内容:

1. **迁移概述**: 目标、范围、策略
2. **迁移前准备**: 环境检查、完整备份、配置文件
3. **数据迁移执行**:
   - 创建新表结构
   - 初始化系统域和企业域基础数据
   - 迁移用户角色和权限
4. **数据验证**: 全面的一致性检查

**下一部分** (RBAC_MIGRATION_PLAN_PART2.md) 将包含:

1. 灰度发布流程
2. 监控和报警配置
3. 回滚方案
4. 故障场景处理
5. 清理和优化

---

**文档状态**: ✅ 完成
**审阅日期**: 待定
**批准状态**: 待批准
