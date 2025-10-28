# RBAC v2.0 数据迁移 Migration

## 📋 Migration 信息

- **Migration ID**: 20251028_02_rbac_v2_data_migration
- **创建日期**: 2025-10-28
- **作者**: AI Backend Team
- **任务**: Task 2899 - Week 2: 执行数据迁移和验证
- **依赖**: 20251028_01_rbac_v2_dual_domain_tables
- **执行时长**: 预计 3-5 分钟

## 🎯 目标

将旧系统的用户角色数据迁移到新的RBAC v2双域架构表中：

### 系统域迁移
- 为system类型用户分配系统角色（super_admin, admin, system_user）
- 更新users表的system_role_id字段

### 企业域迁移
- 为每个企业创建3个预设角色（enterprise_admin, project_manager, member）
- 为企业角色分配对应的权限
- 迁移企业用户的角色分配（支持多角色）

## 📊 迁移数据量

### 预期数据量

| 数据类型 | 预期数量 | 说明 |
|---------|---------|------|
| 系统用户角色分配 | ~10个 | system类型用户 |
| 企业预设角色 | 60个 | 20个企业 × 3个角色 |
| 企业角色权限映射 | ~1,000个 | 60个角色 × ~18个权限 |
| 企业用户角色分配 | ~100个 | enterprise类型用户 |

## 🔑 迁移规则

### 系统用户角色分配

| 条件 | 分配角色 | 备注 |
|-----|---------|------|
| username IN ('admin', 'guoym', 'weier', 'fuxing') | super_admin | 超级管理员 |
| role = 'admin' AND NOT super_admin | admin | 系统管理员 |
| 其他system类型用户 | system_user | 普通系统用户 |

### 企业用户角色分配

| 原role | 新角色 | 权限范围 |
|-------|-------|---------|
| admin, enterprise_admin | enterprise_admin | 所有企业权限（18个） |
| project_manager | project_manager | 项目、任务、文档权限（12个） |
| 其他 | member | 基础读权限（5个） |

## 🔍 关键SQL逻辑

### 1. 系统用户迁移

```sql
-- Super Admin用户
UPDATE users
SET system_role_id = (SELECT id FROM system_roles WHERE code = 'super_admin')
WHERE username IN ('admin', 'guoym', 'weier', 'fuxing')
  AND user_type = 'system';
```

### 2. 创建企业预设角色

```sql
-- 为每个企业创建3个预设角色
FOR EACH enterprise DO
    INSERT INTO enterprise_roles (enterprise_id, code, name, is_preset)
    VALUES
        (enterprise.id, 'enterprise_admin', '企业管理员', TRUE),
        (enterprise.id, 'project_manager', '项目经理', TRUE),
        (enterprise.id, 'member', '普通成员', TRUE);
END FOR;
```

### 3. 企业用户角色迁移

```sql
-- 从enterprise_users表迁移
INSERT INTO enterprise_user_roles (user_id, enterprise_id, role_id)
SELECT
    eu.user_id,
    eu.enterprise_id,
    er.id  -- 根据用户原role匹配对应的enterprise_role
FROM enterprise_users eu
JOIN enterprise_roles er ON ...
```

## ⚠️ 注意事项

### 执行前检查

1. **确认表结构已创建**: 运行migration 20251028_01前置检查
   ```sql
   SELECT COUNT(*) FROM information_schema.tables
   WHERE table_name IN ('system_roles', 'enterprise_roles', 'enterprise_user_roles');
   -- 预期结果: 3
   ```

2. **备份现有数据**:
   ```bash
   pg_dump -h localhost -U postgres -d ai_project_db \
       -t users -t enterprise_users \
       > backup_user_data_$(date +%Y%m%d).sql
   ```

3. **检查用户数量**:
   ```sql
   SELECT user_type, COUNT(*) FROM users WHERE deleted_at IS NULL GROUP BY user_type;
   ```

### 潜在问题

1. **enterprise_users表不存在**
   - 解决: migration脚本会检查表是否存在，不存在则跳过

2. **用户没有user_type字段**
   - 影响: 无法区分系统用户和企业用户
   - 解决: 需要先运行数据修复脚本

3. **企业ID不存在**
   - 影响: 无法创建企业角色
   - 解决: 确保enterprises表有有效数据

## 🚀 执行步骤

### 方式1: 自动执行（推荐）

```bash
# 重启服务自动运行migration
systemctl restart ai-project-backend
```

### 方式2: 手动执行

```bash
export PGPASSWORD='password'
psql -h localhost -U ai_prod_user -d ai_project_prod \
    -f migrations/20251028_02_rbac_v2_data_migration/up.sql
```

### 执行后验证

```sql
-- 1. 验证系统用户角色分配
SELECT sr.code, COUNT(*) as user_count
FROM users u
JOIN system_roles sr ON u.system_role_id = sr.id
WHERE u.deleted_at IS NULL
GROUP BY sr.code;

-- 预期结果:
-- super_admin: 4
-- admin: X
-- system_user: X

-- 2. 验证企业角色创建
SELECT COUNT(*) as role_count
FROM enterprise_roles
WHERE is_preset = TRUE;

-- 预期结果: 企业数量 × 3

-- 3. 验证企业用户角色分配
SELECT er.code, COUNT(*) as user_count
FROM enterprise_user_roles eur
JOIN enterprise_roles er ON eur.role_id = er.id
WHERE eur.deleted_at IS NULL
GROUP BY er.code;

-- 4. 验证权限映射
SELECT er.code, COUNT(erp.id) as perm_count
FROM enterprise_roles er
LEFT JOIN enterprise_role_permissions erp ON er.id = erp.role_id
WHERE er.is_preset = TRUE
GROUP BY er.code;

-- 预期结果:
-- enterprise_admin: 18
-- project_manager: 12
-- member: 5
```

## 🔄 回滚步骤

如果迁移出现问题，可以回滚：

```bash
export PGPASSWORD='password'
psql -h localhost -U ai_prod_user -d ai_project_prod \
    -f migrations/20251028_02_rbac_v2_data_migration/down.sql
```

回滚将：
- 清空enterprise_user_roles表
- 清空enterprise_role_permissions表
- 删除所有企业预设角色
- 清除users表的system_role_id

## 📈 性能考虑

### 预估执行时间

| 数据量 | 预估时间 |
|-------|---------|
| 10个系统用户 | 1秒 |
| 20个企业 | 2秒 |
| 100个企业用户 | 5秒 |
| **总计** | **~10秒** |

### 优化建议

1. 在非高峰期执行
2. 如果数据量大（>1000个企业用户），考虑分批迁移
3. 监控数据库CPU和内存使用

## 📝 迁移报告

执行完成后，migration会输出如下报告：

```
=== 开始系统域数据迁移 ===
✅ 已迁移 4 个super_admin用户
✅ 已迁移 2 个admin用户
✅ 已迁移 5 个system_user用户
✅ 系统域迁移完成，总计 11 个系统用户已分配角色

=== 开始为企业创建预设角色 ===
✅ 已为 20 个企业创建 60 个预设角色

=== 开始为企业角色分配权限 ===
✅ enterprise_admin: 已分配 360 个权限映射
✅ project_manager: 已分配 240 个权限映射
✅ member: 已分配 100 个权限映射

=== 开始迁移企业用户角色 ===
✅ 从enterprise_users迁移了 95 个用户角色

=== 开始数据验证 ===
✅ 系统用户角色分配: 11 个用户
✅ 企业角色总数: 60 个角色
✅ 企业用户角色分配: 95 个分配
✅ 企业角色权限映射: 700 个映射
=== 数据验证完成 ===
```

## 🐛 故障排查

### 问题1: "没有系统用户被分配角色"

**原因**: 可能没有user_type='system'的用户

**解决**:
```sql
SELECT COUNT(*), user_type FROM users WHERE deleted_at IS NULL GROUP BY user_type;
```

### 问题2: "企业角色创建失败"

**原因**: enterprises表可能为空

**解决**:
```sql
SELECT COUNT(*) FROM enterprises WHERE deleted_at IS NULL;
```

### 问题3: "角色权限映射失败"

**原因**: enterprise_permissions表可能为空

**解决**: 确保前置migration 20251028_01已成功运行

## 📞 联系方式

如有问题，请联系:
- Backend Team: backend-team@company.com
- DBA: dba@company.com

---

**Migration Status**: ✅ Ready for execution
**Last Updated**: 2025-10-28
**Version**: 1.0
