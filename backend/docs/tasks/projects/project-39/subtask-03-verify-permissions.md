# 子任务3：权限配置验证

**父任务**: 手工配置huangcong账号为企业管理员并测试全部权限
**阶段**: 第三阶段 - 权限配置验证
**预估时间**: 15分钟
**难度**: ⭐ 简单

---

## 🎯 任务目标

验证企业管理员角色拥有完整的权限配置，确认所有必需权限已正确分配。

---

## 📋 执行步骤

### 步骤 1: 查询企业管理员角色的所有权限

```sql
-- 查询企业管理员角色拥有的所有权限
SELECT
  p.id as permission_id,
  p.name as permission_name,
  p.display_name,
  p.resource_type,
  p.action,
  p.scope,
  p.description,
  rp.created_at as assigned_at
FROM role_permissions rp
JOIN permissions p ON p.id = rp.permission_id
WHERE rp.role_id = (
  SELECT id FROM roles
  WHERE role_type = 'enterprise_admin'
    AND is_active = true
    AND deleted_at IS NULL
  LIMIT 1
)
AND rp.deleted_at IS NULL
AND p.deleted_at IS NULL
ORDER BY p.resource_type, p.action;
```

**预期结果**:
- 返回多条权限记录
- 覆盖企业、用户、角色、项目、任务、文档等资源类型

**请记录权限总数**: __________

---

### 步骤 2: 按资源类型统计权限

```sql
-- 按资源类型统计企业管理员的权限数量
SELECT
  p.resource_type,
  COUNT(*) as permission_count,
  STRING_AGG(p.action, ', ' ORDER BY p.action) as actions
FROM role_permissions rp
JOIN permissions p ON p.id = rp.permission_id
WHERE rp.role_id = (
  SELECT id FROM roles
  WHERE role_type = 'enterprise_admin'
    AND is_active = true
    AND deleted_at IS NULL
  LIMIT 1
)
AND rp.deleted_at IS NULL
AND p.deleted_at IS NULL
GROUP BY p.resource_type
ORDER BY p.resource_type;
```

**预期结果示例**:
| resource_type | permission_count | actions |
|--------------|------------------|---------|
| enterprise | 4 | view, edit, manage, delete |
| user | 5 | view, create, edit, delete, assign_role |
| role | 5 | view, create, edit, delete, assign_permission |
| project | 5 | view, create, edit, delete, archive |
| task | 5 | view, create, edit, delete, assign |
| document | 4 | view, create, edit, delete |
| permission | 2 | view, manage |
| audit | 1 | view |

---

### 步骤 3: 检查关键权限是否完整

```sql
-- 检查企业管理员必需的关键权限
WITH required_permissions AS (
  SELECT unnest(ARRAY[
    'enterprise:view', 'enterprise:edit', 'enterprise:manage',
    'user:view', 'user:create', 'user:edit', 'user:delete', 'user:assign_role',
    'role:view', 'role:create', 'role:edit', 'role:delete', 'role:assign_permission',
    'project:view', 'project:create', 'project:edit', 'project:delete',
    'task:view', 'task:create', 'task:edit', 'task:delete', 'task:assign',
    'document:view', 'document:create', 'document:edit', 'document:delete',
    'permission:view', 'permission:manage',
    'audit:view'
  ]) as required_perm
),
assigned_permissions AS (
  SELECT
    CONCAT(p.resource_type, ':', p.action) as permission_key
  FROM role_permissions rp
  JOIN permissions p ON p.id = rp.permission_id
  WHERE rp.role_id = (
    SELECT id FROM roles
    WHERE role_type = 'enterprise_admin'
      AND is_active = true
      AND deleted_at IS NULL
    LIMIT 1
  )
  AND rp.deleted_at IS NULL
  AND p.deleted_at IS NULL
)
SELECT
  rp.required_perm,
  CASE
    WHEN ap.permission_key IS NOT NULL THEN '✅ 已分配'
    ELSE '❌ 缺失'
  END as status,
  CASE
    WHEN ap.permission_key IS NULL THEN '⚠️ 需要添加此权限'
    ELSE ''
  END as action_needed
FROM required_permissions rp
LEFT JOIN assigned_permissions ap ON rp.required_perm = ap.permission_key
ORDER BY
  CASE WHEN ap.permission_key IS NULL THEN 0 ELSE 1 END,
  rp.required_perm;
```

**关键检查点**:
- [ ] 所有权限的 status 都是 '✅ 已分配'
- [ ] 没有 '❌ 缺失' 的权限

**如果有缺失的权限，请记录**: __________

---

### 步骤 4: 验证 huangcong 的权限继承

```sql
-- 通过角色继承验证 huangcong 拥有的权限
SELECT
  u.username,
  r.name as role_name,
  r.role_type,
  COUNT(DISTINCT p.id) as total_permissions,
  COUNT(DISTINCT CASE WHEN p.resource_type = 'enterprise' THEN p.id END) as enterprise_perms,
  COUNT(DISTINCT CASE WHEN p.resource_type = 'user' THEN p.id END) as user_perms,
  COUNT(DISTINCT CASE WHEN p.resource_type = 'role' THEN p.id END) as role_perms,
  COUNT(DISTINCT CASE WHEN p.resource_type = 'project' THEN p.id END) as project_perms,
  COUNT(DISTINCT CASE WHEN p.resource_type = 'task' THEN p.id END) as task_perms,
  COUNT(DISTINCT CASE WHEN p.resource_type = 'document' THEN p.id END) as document_perms
FROM users u
JOIN user_enterprise_roles uer ON uer.user_id = u.id
JOIN roles r ON r.id = uer.role_id
JOIN role_permissions rp ON rp.role_id = r.id
JOIN permissions p ON p.id = rp.permission_id
WHERE u.username = 'huangcong'
  AND uer.deleted_at IS NULL
  AND rp.deleted_at IS NULL
  AND p.deleted_at IS NULL
GROUP BY u.id, u.username, r.id, r.name, r.role_type;
```

**预期结果**:
- role_type 为 'enterprise_admin'
- total_permissions 应该 >= 25（根据系统配置）
- 各类资源都应该有对应的权限数

---

### 步骤 5: 详细权限清单

```sql
-- 生成 huangcong 的完整权限清单
SELECT
  p.resource_type,
  p.action,
  p.display_name,
  p.description,
  p.scope,
  CONCAT(p.resource_type, ':', p.action) as permission_key
FROM users u
JOIN user_enterprise_roles uer ON uer.user_id = u.id
JOIN roles r ON r.id = uer.role_id
JOIN role_permissions rp ON rp.role_id = r.id
JOIN permissions p ON p.id = rp.permission_id
WHERE u.username = 'huangcong'
  AND uer.deleted_at IS NULL
  AND rp.deleted_at IS NULL
  AND p.deleted_at IS NULL
ORDER BY p.resource_type, p.action;
```

**请将结果保存**，用于后续测试对比。

---

## ✅ 完成检查清单

- [ ] 企业管理员角色的权限已查询
- [ ] 权限总数已确认（记录: __________）
- [ ] 各资源类型的权限已统计
- [ ] 关键权限完整性已验证
- [ ] 没有缺失的必需权限
- [ ] huangcong 的权限继承已验证
- [ ] 完整权限清单已保存

---

## 📊 权限验证结果

### 资源类型权限统计

| 资源类型 | 权限数 | 操作列表 | 状态 |
|---------|--------|---------|------|
| enterprise | _____ | ______________ | [ ] |
| user | _____ | ______________ | [ ] |
| role | _____ | ______________ | [ ] |
| project | _____ | ______________ | [ ] |
| task | _____ | ______________ | [ ] |
| document | _____ | ______________ | [ ] |
| permission | _____ | ______________ | [ ] |
| audit | _____ | ______________ | [ ] |

### 权限完整性

- **总权限数**: __________
- **缺失权限数**: __________（应为 0）
- **验证状态**: [ ] ✅ 通过 [ ] ❌ 失败

---

## 🔧 问题修复

### 如果发现缺失权限

1. **查找缺失权限的ID**:
```sql
-- 查找特定权限
SELECT id, name, resource_type, action
FROM permissions
WHERE resource_type = '资源类型'
  AND action = '操作'
  AND deleted_at IS NULL;
```

2. **添加缺失权限到角色**:
```sql
-- 添加权限到企业管理员角色
INSERT INTO role_permissions (
  role_id,
  permission_id,
  created_at,
  updated_at
)
SELECT
  r.id as role_id,
  p.id as permission_id,
  NOW(),
  NOW()
FROM roles r
CROSS JOIN permissions p
WHERE r.role_type = 'enterprise_admin'
  AND r.is_active = true
  AND r.deleted_at IS NULL
  AND p.id = 权限ID  -- 替换为实际ID
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.id
      AND rp.permission_id = p.id
      AND rp.deleted_at IS NULL
  )
RETURNING id, role_id, permission_id;
```

3. **批量添加多个权限**:
```sql
-- 批量添加权限
INSERT INTO role_permissions (role_id, permission_id, created_at, updated_at)
SELECT
  (SELECT id FROM roles WHERE role_type = 'enterprise_admin' AND is_active = true LIMIT 1),
  p.id,
  NOW(),
  NOW()
FROM permissions p
WHERE p.id IN (权限ID1, 权限ID2, 权限ID3)  -- 替换为实际ID列表
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = (SELECT id FROM roles WHERE role_type = 'enterprise_admin' AND is_active = true LIMIT 1)
      AND rp.permission_id = p.id
      AND rp.deleted_at IS NULL
  )
RETURNING id, permission_id;
```

---

## 🔄 下一步

权限验证完成后，请继续执行：
**子任务4-7: 功能测试（合并文档）**

---

## ⚠️ 注意事项

1. **只读查询**: 本阶段主要是验证，大部分是只读查询
2. **权限修复**: 只有在发现缺失权限时才需要执行修复SQL
3. **数据库连接**: 查询可以使用从库（5432），修复需要使用主库（5433）
4. **权限缓存**: 如果系统有权限缓存，修改后可能需要清除缓存

---

## 📝 执行记录

**执行时间**: __________
**执行人**: __________
**数据库**: localhost:5432 (查询) / localhost:5433 (修复)
**权限总数**: __________
**缺失权限**: __________
**修复操作**: [ ] 无需修复 [ ] 已修复
**验证结果**: [ ] ✅ 通过 [ ] ❌ 失败
**备注**:

---

**创建时间**: 2025-11-02
**文档版本**: v1.0
