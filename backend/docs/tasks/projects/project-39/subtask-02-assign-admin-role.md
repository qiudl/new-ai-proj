# 子任务2：企业管理员角色配置

**父任务**: 手工配置huangcong账号为企业管理员并测试全部权限
**阶段**: 第二阶段 - 企业管理员角色配置
**预估时间**: 20分钟
**难度**: ⭐⭐ 中等

---

## 🎯 任务目标

为 `huangcong` 账号分配企业管理员角色，清除旧角色分配，并验证配置成功。

---

## ⚠️ 重要提醒

**本阶段包含写操作，执行前请**:
1. 确认已完成子任务1的信息收集
2. 连接到主库（可写）：`localhost:5433`（通过SSH隧道）
3. 建议先备份相关数据
4. 逐条执行SQL，不要批量执行

---

## 📋 执行步骤

### 步骤 1: 查询企业管理员角色

```sql
-- 查询企业管理员角色信息
SELECT
  id,
  name,
  role_type,
  description,
  is_system_role,
  is_active,
  created_at,
  CASE
    WHEN is_active = true THEN '✅ 可用'
    ELSE '❌ 已禁用'
  END as status
FROM roles
WHERE role_type = 'enterprise_admin'
  AND deleted_at IS NULL
ORDER BY created_at DESC;
```

**预期结果**:
- 找到企业管理员角色
- 角色状态为 active
- 通常只有一个企业管理员角色

**请记录**:
```
角色ID: __________
角色名称: __________
角色描述: __________
```

**如果没有企业管理员角色**:
```sql
-- 需要先创建企业管理员角色
INSERT INTO roles (
  name,
  role_type,
  description,
  is_system_role,
  is_active,
  created_at,
  updated_at
) VALUES (
  '企业管理员',
  'enterprise_admin',
  '企业级管理员，拥有企业内所有权限',
  true,
  true,
  NOW(),
  NOW()
)
RETURNING id, name, role_type;
```

---

### 步骤 2: 备份当前角色分配（可选但推荐）

```sql
-- 查看将要修改的记录
SELECT
  uer.id,
  u.username,
  e.name as enterprise,
  r.name as role,
  uer.created_at
FROM user_enterprise_roles uer
JOIN users u ON u.id = uer.user_id
LEFT JOIN enterprises e ON e.id = uer.enterprise_id
LEFT JOIN roles r ON r.id = uer.role_id
WHERE u.username = 'huangcong'
  AND uer.deleted_at IS NULL;
```

**请将结果复制保存**，以便出问题时可以恢复。

---

### 步骤 3: 清除 huangcong 的旧角色分配

```sql
-- 软删除 huangcong 的所有现有角色分配
-- 注意：这里使用软删除（设置 deleted_at），不会真正删除数据
UPDATE user_enterprise_roles
SET
  deleted_at = NOW(),
  updated_at = NOW()
WHERE user_id = (SELECT id FROM users WHERE username = 'huangcong')
  AND deleted_at IS NULL
RETURNING id, role_id, enterprise_id;
```

**预期结果**:
- 返回被软删除的记录
- 如果没有旧角色，则返回空（这是正常的）

**请记录被删除的记录数**: __________

**验证清除结果**:
```sql
-- 确认旧角色已清除
SELECT COUNT(*) as remaining_roles
FROM user_enterprise_roles
WHERE user_id = (SELECT id FROM users WHERE username = 'huangcong')
  AND deleted_at IS NULL;
```

预期 `remaining_roles` 应该为 0。

---

### 步骤 4: 分配企业管理员角色

**方式A: 使用子查询（推荐，一步到位）**

```sql
-- 为 huangcong 分配企业管理员角色
INSERT INTO user_enterprise_roles (
  user_id,
  enterprise_id,
  role_id,
  created_at,
  updated_at
)
SELECT
  u.id as user_id,
  ue.enterprise_id,
  r.id as role_id,
  NOW(),
  NOW()
FROM users u
CROSS JOIN user_enterprises ue
CROSS JOIN roles r
WHERE u.username = 'huangcong'
  AND ue.user_id = u.id
  AND ue.deleted_at IS NULL
  AND r.role_type = 'enterprise_admin'
  AND r.is_active = true
  AND r.deleted_at IS NULL
LIMIT 1
RETURNING id, user_id, enterprise_id, role_id;
```

**方式B: 使用具体值（如果方式A失败）**

```sql
-- 替换下面的值为子任务1中记录的实际值
INSERT INTO user_enterprises_roles (
  user_id,
  enterprise_id,
  role_id,
  created_at,
  updated_at
) VALUES (
  123,    -- 替换为 huangcong 的实际用户ID
  4,      -- 替换为实际的企业ID
  17,     -- 替换为企业管理员角色的实际ID
  NOW(),
  NOW()
)
RETURNING id, user_id, enterprise_id, role_id;
```

**预期结果**:
- 返回新创建的记录ID
- user_id, enterprise_id, role_id 都应该有值

**请记录新分配的记录ID**: __________

---

### 步骤 5: 验证角色分配

```sql
-- 综合验证：查询 huangcong 的最新角色信息
SELECT
  uer.id as assignment_id,
  u.id as user_id,
  u.username,
  u.email,
  ue.enterprise_id,
  e.name as enterprise_name,
  e.code as enterprise_code,
  r.id as role_id,
  r.name as role_name,
  r.role_type,
  r.description,
  uer.created_at as assigned_at,
  CASE
    WHEN r.role_type = 'enterprise_admin' THEN '✅ 企业管理员'
    ELSE '⚠️ 其他角色'
  END as role_status
FROM user_enterprise_roles uer
JOIN users u ON u.id = uer.user_id
LEFT JOIN user_enterprises ue ON ue.user_id = u.id AND ue.enterprise_id = uer.enterprise_id AND ue.deleted_at IS NULL
LEFT JOIN enterprises e ON e.id = uer.enterprise_id
JOIN roles r ON r.id = uer.role_id
WHERE u.username = 'huangcong'
  AND uer.deleted_at IS NULL
ORDER BY uer.created_at DESC;
```

**验证检查点**:
- [ ] 只有一条有效的角色分配记录
- [ ] role_type 为 'enterprise_admin'
- [ ] role_status 显示为 '✅ 企业管理员'
- [ ] enterprise_id 正确
- [ ] created_at 是刚才的时间

---

### 步骤 6: 跨表验证数据一致性

```sql
-- 完整性检查：确认用户、企业、角色三者关联正确
SELECT
  '用户信息' as check_type,
  u.id,
  u.username,
  u.deleted_at,
  CASE WHEN u.deleted_at IS NULL THEN '✅ 正常' ELSE '❌ 已删除' END as status
FROM users u
WHERE u.username = 'huangcong'

UNION ALL

SELECT
  '企业关联' as check_type,
  ue.enterprise_id as id,
  e.name as username,
  ue.deleted_at,
  CASE WHEN ue.deleted_at IS NULL THEN '✅ 正常' ELSE '❌ 已删除' END as status
FROM user_enterprises ue
JOIN users u ON u.id = ue.user_id
LEFT JOIN enterprises e ON e.id = ue.enterprise_id
WHERE u.username = 'huangcong'

UNION ALL

SELECT
  '角色分配' as check_type,
  uer.id,
  r.name as username,
  uer.deleted_at,
  CASE WHEN uer.deleted_at IS NULL THEN '✅ 正常' ELSE '❌ 已删除' END as status
FROM user_enterprise_roles uer
JOIN users u ON u.id = uer.user_id
LEFT JOIN roles r ON r.id = uer.role_id
WHERE u.username = 'huangcong';
```

**预期结果**: 所有记录的 status 都应该是 '✅ 正常'

---

## ✅ 完成检查清单

- [ ] 企业管理员角色已确认存在
- [ ] 角色ID已记录
- [ ] 旧角色分配已清除（如果有）
- [ ] 新角色已成功分配
- [ ] 新分配记录ID已记录
- [ ] 角色类型确认为 'enterprise_admin'
- [ ] 企业关联正确
- [ ] 数据一致性验证通过

---

## 📊 配置结果汇总

| 项目 | 值 | 状态 |
|-----|---|------|
| 角色ID | __________ | [ ] |
| 角色名称 | __________ | [ ] |
| 角色类型 | enterprise_admin | [ ] |
| 分配记录ID | __________ | [ ] |
| 用户ID | __________ | [ ] |
| 企业ID | __________ | [ ] |
| 分配时间 | __________ | [ ] |
| 旧角色清除数 | __________ | [ ] |

---

## 🔄 下一步

角色配置完成后，请继续执行：
**子任务3: 权限配置验证**

---

## ⚠️ 注意事项

1. **数据库连接**: 必须连接到主库（可写）
   ```bash
   # 通过SSH隧道连接主库
   PGPASSWORD='SecureAI2024!@#$%^' psql -h localhost -p 5433 -U ai_prod_user -d ai_project_prod
   ```

2. **软删除**: 所有删除操作都使用软删除，数据可恢复

3. **事务建议**: 如果担心出错，可以使用事务
   ```sql
   BEGIN;
   -- 执行步骤3和步骤4的SQL
   -- 检查结果
   COMMIT;  -- 或者 ROLLBACK; 如果发现问题
   ```

4. **权限验证**: 配置完成后，权限会在下一个子任务中验证

---

## 🔙 回滚操作（如果需要）

如果配置出现问题需要回滚：

```sql
-- 1. 软删除新分配的角色
UPDATE user_enterprise_roles
SET
  deleted_at = NOW(),
  updated_at = NOW()
WHERE id = ________;  -- 填入步骤4返回的记录ID

-- 2. 恢复旧角色（如果有备份）
UPDATE user_enterprise_roles
SET
  deleted_at = NULL,
  updated_at = NOW()
WHERE id IN (
  ________  -- 填入步骤2备份的记录ID
);
```

---

## 📝 执行记录

**执行时间**: __________
**执行人**: __________
**数据库**: localhost:5433
**执行结果**: [ ] 成功 [ ] 失败
**备注**:

---

**创建时间**: 2025-11-02
**文档版本**: v1.0
