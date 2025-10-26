# Migration 20251026_02: 系统管理员权限管理增强

## 📋 概述

**任务**: #2788 - Phase 1: 数据库层增强
**创建日期**: 2025-10-26
**作者**: Claude Code AI
**目的**: 将硬编码的系统管理员配置从环境变量迁移到数据库，实现灵活的RBAC权限管理

## 🎯 核心变更

### 1. 增强 `system_users` 表

新增7个字段用于系统管理员管理：

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `system_role_id` | INTEGER | 关联company_roles表的系统角色 |
| `is_system_admin` | BOOLEAN | 系统管理员标识 |
| `admin_level` | INTEGER | 管理员等级（1-10，1=超级管理员） |
| `admin_scopes` | JSONB | 权限范围限制 |
| `admin_activated_at` | TIMESTAMPTZ | 权限激活时间 |
| `admin_deactivated_at` | TIMESTAMPTZ | 权限停用时间 |
| `admin_notes` | TEXT | 权限备注说明 |

### 2. 新建 `system_admin_audit_logs` 表

完整的审计日志系统，记录所有管理员权限变更操作。

**核心字段**:
- 操作者信息（operator_user_id, operator_username等）
- 目标用户信息（target_user_id, target_username）
- 操作详情（action, action_type, change_summary）
- 变更内容（old_value, new_value - JSONB格式）
- 审计元数据（IP、User-Agent、request_id等）
- 审批流程字段（requires_approval, approved_by等）

### 3. 索引优化

创建13个索引提升查询性能：
- 5个system_users相关索引
- 7个system_admin_audit_logs相关索引
- 1个GIN索引支持admin_scopes的JSONB查询

### 4. 数据迁移

自动迁移现有的4个硬编码管理员：
- admin (ID=1) → Level 1 超级管理员
- guoym (ID=110) → Level 2 系统管理员
- weier (ID=43) → Level 2 系统管理员
- fuxing (ID=112) → Level 2 系统管理员

### 5. 辅助功能

- **触发器**: 自动记录system_users表管理员字段的变更
- **视图**:
  - `v_active_system_admins`: 当前活跃的系统管理员列表
  - `v_admin_audit_stats`: 管理员操作审计统计（最近30天）

## 🚀 执行迁移

### 前提条件

1. 备份生产数据库
2. 确保有足够的权限执行DDL和DML语句
3. 检查system_users表是否存在（如不存在会自动创建）

### 执行升级

```bash
# 方式1: 使用psql
psql -h 127.0.0.1 -p 5433 -U ai_prod_user -d ai_project_prod \
  -f migrations/20251026_02_enhance_system_admin_management/up.sql

# 方式2: 使用migrate工具
migrate -path migrations -database "postgresql://..." up

# 方式3: 在代码中自动执行（如使用golang-migrate）
```

### 验证迁移

```sql
-- 1. 检查新增字段
\d system_users

-- 2. 查看迁移的管理员
SELECT * FROM v_active_system_admins;

-- 3. 查看审计日志
SELECT * FROM system_admin_audit_logs
ORDER BY created_at DESC LIMIT 10;

-- 4. 检查索引
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename IN ('system_users', 'system_admin_audit_logs')
ORDER BY indexname;
```

### 执行回滚（如需要）

```bash
# 回滚迁移
psql -h 127.0.0.1 -p 5433 -U ai_prod_user -d ai_project_prod \
  -f migrations/20251026_02_enhance_system_admin_management/down.sql
```

**⚠️ 警告**: 回滚会删除所有审计日志和管理员配置数据！

## 📊 admin_scopes 字段格式

`admin_scopes` 使用JSONB存储权限范围配置：

### 全局权限示例
```json
{
  "scopes": [],
  "global_scope": true
}
```

### 限定项目权限示例
```json
{
  "scopes": [
    {
      "type": "project",
      "resource_ids": ["1", "5", "10"],
      "permissions": ["read", "write", "manage"]
    }
  ],
  "global_scope": false
}
```

### 多种资源类型示例
```json
{
  "scopes": [
    {
      "type": "project",
      "resource_ids": ["1", "5", "10"],
      "permissions": ["read", "write"]
    },
    {
      "type": "enterprise",
      "resource_ids": ["2"],
      "permissions": ["read"]
    }
  ],
  "global_scope": false
}
```

## 🔍 查询示例

### 查询所有系统管理员
```sql
SELECT
    id,
    username,
    email,
    admin_level,
    CASE
        WHEN (admin_scopes->>'global_scope')::boolean = true THEN '全局权限'
        ELSE '限定范围'
    END as scope_type
FROM system_users
WHERE is_system_admin = TRUE
  AND is_active = TRUE
  AND deleted_at IS NULL;
```

### 查询特定等级的管理员
```sql
SELECT * FROM v_active_system_admins
WHERE admin_level <= 2;  -- Level 1 和 Level 2
```

### 查询最近的管理员操作
```sql
SELECT
    operator_username,
    target_username,
    action,
    change_summary,
    created_at
FROM system_admin_audit_logs
ORDER BY created_at DESC
LIMIT 20;
```

### 查询特定用户的操作历史
```sql
SELECT * FROM system_admin_audit_logs
WHERE operator_user_id = 1
ORDER BY created_at DESC;
```

## 🧪 测试建议

### 1. 迁移前测试
```sql
-- 检查现有管理员数据
SELECT id, username, email, role
FROM system_users
WHERE id IN (1, 110, 43, 112);
```

### 2. 迁移后测试
```sql
-- 验证所有管理员都已迁移
SELECT
    id,
    username,
    is_system_admin,
    admin_level,
    admin_scopes->>'global_scope' as has_global_scope
FROM system_users
WHERE id IN (1, 110, 43, 112);

-- 验证审计日志记录
SELECT COUNT(*) FROM system_admin_audit_logs;
```

### 3. 性能测试
```sql
-- 测试索引效率
EXPLAIN ANALYZE
SELECT * FROM system_users
WHERE is_system_admin = TRUE AND admin_level <= 2;

-- 测试JSONB查询
EXPLAIN ANALYZE
SELECT * FROM system_users
WHERE admin_scopes->>'global_scope' = 'true';
```

## ⚠️ 注意事项

1. **数据备份**: 执行前务必备份数据库
2. **兼容性**: 迁移后仍保留环境变量检查机制（可通过配置关闭）
3. **审计日志**: 所有操作都会记录，定期清理旧日志避免表过大
4. **索引维护**: GIN索引需要定期VACUUM和ANALYZE
5. **权限检查**: 迁移后需更新应用代码使用新的数据库检查方式

## 🔗 相关文档

- 技术方案文档: 任务 #2787 的文档
- Phase 2 实施: 任务 #2789 - 后端服务层
- Phase 3 实施: 任务 #2790 - API接口层
- Phase 4 实施: 任务 #2791 - 前端界面（可选）

## 📝 变更历史

- 2025-10-26: 初始版本 - 完整的数据库层增强
