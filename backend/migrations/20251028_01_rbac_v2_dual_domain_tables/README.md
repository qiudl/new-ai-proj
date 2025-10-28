# RBAC v2.0 双域架构表结构 Migration

## 📋 Migration 信息

- **Migration ID**: 20251028_01_rbac_v2_dual_domain_tables
- **创建日期**: 2025-10-28
- **作者**: AI Backend Team
- **任务**: Task 2898 - Week 1: 创建系统域和企业域表结构
- **执行时长**: 预计 5-10 分钟

## 🎯 目标

创建RBAC v2.0双域架构的所有基础表结构，包括：

### 系统域 (System Domain)
1. `system_roles` - 系统角色表（4个内置角色）
2. `system_permissions` - 系统权限表（14个系统权限）
3. `system_role_permissions` - 系统角色权限关联表
4. `users.system_role_id` - 扩展users表添加系统角色字段

### 企业域 (Enterprise Domain)
1. `enterprise_roles` - 企业角色表（预设+自定义角色）
2. `enterprise_permissions` - 企业权限表（18个企业权限）
3. `enterprise_role_permissions` - 企业角色权限关联表
4. `enterprise_user_roles` - 企业用户角色表（支持多角色）
5. `enterprise_user_custom_permissions` - 企业用户自定义权限表

## 📊 数据统计

### 初始化数据

| 类型 | 数量 | 说明 |
|-----|------|------|
| 系统角色 | 4 | super_admin, admin, enterprise_manager, system_user |
| 系统权限 | 14 | 企业管理、用户管理、配置、审计 |
| 企业权限 | 18 | 项目、任务、文档、成员、配置 |
| 系统角色权限映射 | ~30 | 根据角色等级分配 |

### 表结构统计

| 表名 | 列数 | 索引数 | 外键数 |
|-----|------|--------|--------|
| system_roles | 10 | 3 | 0 |
| system_permissions | 10 | 3 | 0 |
| system_role_permissions | 4 | 3 | 2 |
| enterprise_roles | 11 | 4 | 1 |
| enterprise_permissions | 9 | 3 | 0 |
| enterprise_role_permissions | 4 | 3 | 2 |
| enterprise_user_roles | 10 | 4 | 3 |
| enterprise_user_custom_permissions | 11 | 4 | 3 |

## 🔑 关键设计决策

### 1. 双域分离

```
┌─────────────────────────────────────┐
│         Permission System           │
├─────────────────┬───────────────────┤
│  System Domain  │  Enterprise Domain│
│                 │                   │
│ - 系统管理      │ - 企业业务         │
│ - 企业组织管理  │ - 项目任务管理     │
│ - 系统用户      │ - 企业成员         │
└─────────────────┴───────────────────┘
```

### 2. 权限代码标准化

- **系统域**: `system.{resource}.{action}`
  - 例: `system.enterprise.create`, `system.user.delete`

- **企业域**: `enterprise.{resource}.{action}`
  - 例: `enterprise.project.create`, `enterprise.task.update`

### 3. 多角色支持

- 旧系统: 用户在企业中只能有1个角色
- 新系统: 用户在企业中可以有多个角色（通过`enterprise_user_roles`表）

### 4. 自定义权限覆盖

通过`enterprise_user_custom_permissions`表支持：
- **grant**: 为用户额外授予某个权限（即使角色没有）
- **revoke**: 撤销用户某个权限（即使角色拥有）

### 5. 高危权限标记

系统权限中的`is_dangerous`字段标记高危权限：
- `system.enterprise.access_data` - 访问企业数据
- `system.config.update` - 修改系统配置

这些权限需要额外审计和监控。

## 🔍 核心索引说明

### 性能关键索引

```sql
-- 权限检查核心索引
CREATE INDEX idx_eur_user_enterprise
ON enterprise_user_roles(user_id, enterprise_id)
WHERE deleted_at IS NULL AND is_active = TRUE;
```

**用途**: 根据用户ID和企业ID快速查询用户的所有角色，这是权限检查的核心查询。

**性能目标**: 查询时间 < 3ms

### 其他重要索引

1. `idx_system_roles_code` - 系统角色代码唯一索引
2. `idx_system_permissions_resource_action` - 系统权限唯一索引
3. `idx_enterprise_permissions_resource_action` - 企业权限唯一索引
4. `idx_eucp_expires` - 自定义权限过期时间索引（用于定期清理）

## ⚠️ 注意事项

### 执行前检查

1. **数据库备份**:
   ```bash
   pg_dump -h localhost -U postgres -d ai_project_db > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **检查现有表**: 确保以下表不存在，否则会冲突
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_name IN (
       'system_roles', 'system_permissions',
       'enterprise_roles', 'enterprise_permissions'
   );
   ```

3. **检查users表**: 确保users表存在且没有system_role_id列

### 执行后验证

运行验证SQL查询：

```sql
-- 验证表创建
SELECT COUNT(*) as table_count
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE '%role%' OR table_name LIKE '%permission%';

-- 验证系统角色和权限
SELECT
    (SELECT COUNT(*) FROM system_roles) as system_roles,
    (SELECT COUNT(*) FROM system_permissions) as system_permissions,
    (SELECT COUNT(*) FROM system_role_permissions) as role_perm_mappings,
    (SELECT COUNT(*) FROM enterprise_permissions) as enterprise_permissions;

-- 预期结果: 4, 14, ~30, 18
```

## 🚀 执行步骤

### 方式1: 自动执行（推荐）

如果项目配置了自动migration，重启服务即可：

```bash
# 开发环境
cd backend
go run main.go

# 生产环境
systemctl restart ai-project-backend
```

### 方式2: 手动执行

```bash
# 连接数据库
psql -h localhost -U ai_prod_user -d ai_project_prod

# 执行migration
\i /path/to/migrations/20251028_01_rbac_v2_dual_domain_tables/up.sql

# 验证
SELECT * FROM system_roles;
SELECT * FROM system_permissions LIMIT 5;
```

### 方式3: 使用脚本

```bash
cd backend/migrations/20251028_01_rbac_v2_dual_domain_tables

# 执行
PGPASSWORD='password' psql -h localhost -U ai_prod_user -d ai_project_prod -f up.sql

# 查看输出
# 应该看到:
# ✅ RBAC v2 双域架构表创建成功: 8 个表
# ✅ 系统角色数量: 4, 系统权限数量: 14, 角色权限映射: XX
# ✅ 企业权限数量: 18
```

## 🔄 回滚步骤

如果需要回滚，执行down.sql：

```bash
# ⚠️ 警告: 这将删除所有RBAC v2数据！
PGPASSWORD='password' psql -h localhost -U ai_prod_user -d ai_project_prod -f down.sql
```

回滚后验证：

```sql
SELECT COUNT(*) FROM information_schema.tables
WHERE table_name IN ('system_roles', 'enterprise_roles');
-- 预期结果: 0
```

## 📝 系统角色说明

### super_admin (超级管理员, Level 100)
- 拥有所有系统权限
- 可以访问企业数据（高危权限）
- 可以修改系统配置
- **用户**: admin, guoym, weier, fuxing

### admin (系统管理员, Level 80)
- 管理企业组织
- 管理系统用户
- 查看审计日志
- **不能**访问企业业务数据
- **不能**修改系统核心配置

### enterprise_manager (企业管理员, Level 60)
- 查看企业列表
- 更新企业基本信息
- **不能**创建/删除企业
- **不能**访问企业业务数据

### system_user (系统用户, Level 40)
- 只读权限
- 查看企业列表
- 查看系统用户
- 查看系统配置

## 📈 下一步

完成本migration后，需要执行：

1. **Task 2899**: 数据迁移
   - Migration: `20251028_02_rbac_v2_data_migration`
   - 将旧系统的用户角色数据迁移到新表

2. **Task 2900**: 性能优化
   - 添加更多索引
   - 优化查询性能
   - 分区表设计（audit_logs）

3. **Task 2901**: 实现核心服务层
   - `PermissionServiceV2`
   - `UserIdentity` interface

## 🐛 已知问题

无

## 📞 联系方式

如有问题，请联系:
- Backend Team: backend-team@company.com
- DBA: dba@company.com

---

**Migration Status**: ✅ Ready for execution
**Last Updated**: 2025-10-28
**Version**: 1.0
