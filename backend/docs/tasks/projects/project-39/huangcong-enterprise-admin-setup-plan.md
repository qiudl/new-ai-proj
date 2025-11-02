# 手工配置 huangcong 账号为企业管理员并测试全部权限 - 实施方案

**任务类型**: 权限配置与测试
**优先级**: High
**预估工时**: 1.5 小时
**标签**: 权限管理, RBAC, 企业管理员, 手工配置, 测试验证
**创建时间**: 2025-11-02

---

## 📋 目标概述

通过手工 SQL 配置的方式将 `huangcong` 账号设置为企业管理员角色，并全面测试该账号是否拥有企业的全部权限。

### 核心目标
1. ✅ 确认 huangcong 账号基本信息
2. ✅ 为 huangcong 分配企业管理员角色
3. ✅ 验证角色权限配置正确
4. ✅ 全面测试企业管理员权限
5. ✅ 记录测试结果并优化权限配置

---

## 🔍 第一阶段：账号信息确认

### 1.1 查询 huangcong 账号信息

```sql
-- 查询用户基本信息
SELECT
  id,
  username,
  email,
  user_type,
  created_at,
  deleted_at
FROM users
WHERE username = 'huangcong';
```

**预期结果**:
- 确认用户存在
- 获取用户 ID
- 确认账号状态正常（deleted_at 为 NULL）

### 1.2 查询用户当前企业关联

```sql
-- 查询用户的企业关联
SELECT
  ue.id,
  ue.user_id,
  ue.enterprise_id,
  e.name as enterprise_name,
  e.code as enterprise_code,
  ue.created_at
FROM user_enterprises ue
LEFT JOIN enterprises e ON e.id = ue.enterprise_id
WHERE ue.user_id = (SELECT id FROM users WHERE username = 'huangcong')
  AND ue.deleted_at IS NULL;
```

**预期结果**:
- 确认用户已关联企业
- 获取企业 ID
- 确认企业信息

### 1.3 查询用户当前角色

```sql
-- 查询用户在企业中的当前角色
SELECT
  uer.id,
  uer.user_id,
  uer.enterprise_id,
  uer.role_id,
  r.name as role_name,
  r.role_type,
  r.description,
  uer.created_at
FROM user_enterprise_roles uer
LEFT JOIN roles r ON r.id = uer.role_id
WHERE uer.user_id = (SELECT id FROM users WHERE username = 'huangcong')
  AND uer.deleted_at IS NULL;
```

**预期结果**:
- 查看当前角色分配情况
- 确认是否已有管理员角色

---

## 🎯 第二阶段：企业管理员角色配置

### 2.1 查询企业管理员角色 ID

```sql
-- 查询企业管理员角色（RBAC v2）
SELECT
  id,
  name,
  role_type,
  description,
  is_system_role,
  is_active
FROM roles
WHERE role_type = 'enterprise_admin'
  AND is_active = true
  AND deleted_at IS NULL
ORDER BY created_at DESC;
```

**预期结果**:
- 找到企业管理员角色
- 获取角色 ID
- 确认角色状态为 active

### 2.2 清除 huangcong 的旧角色（如果存在）

```sql
-- 软删除用户的旧角色分配
UPDATE user_enterprise_roles
SET
  deleted_at = NOW(),
  updated_at = NOW()
WHERE user_id = (SELECT id FROM users WHERE username = 'huangcong')
  AND deleted_at IS NULL;
```

**说明**:
- 使用软删除保留历史记录
- 避免角色冲突

### 2.3 为 huangcong 分配企业管理员角色

```sql
-- 分配企业管理员角色
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

**说明**:
- 自动关联用户、企业、角色
- 返回新创建的记录 ID
- 确保数据一致性

### 2.4 验证角色分配

```sql
-- 验证角色分配结果
SELECT
  uer.id,
  u.username,
  e.name as enterprise_name,
  r.name as role_name,
  r.role_type,
  uer.created_at
FROM user_enterprise_roles uer
JOIN users u ON u.id = uer.user_id
JOIN enterprises e ON e.id = uer.enterprise_id
JOIN roles r ON r.id = uer.role_id
WHERE u.username = 'huangcong'
  AND uer.deleted_at IS NULL;
```

**预期结果**:
- 确认角色分配成功
- 角色类型为 `enterprise_admin`
- 所有关联正确

---

## 🔐 第三阶段：权限配置验证

### 3.1 查询企业管理员角色的权限

```sql
-- 查询角色拥有的所有权限
SELECT
  p.id,
  p.name as permission_name,
  p.display_name,
  p.resource_type,
  p.action,
  p.scope,
  rp.created_at
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
ORDER BY p.resource_type, p.action;
```

**预期结果**:
- 列出所有企业管理员权限
- 确认权限覆盖范围
- 验证关键权限存在

### 3.2 检查关键权限是否完整

需要确认的关键权限类别：

| 资源类型 | 必需权限 | 说明 |
|---------|---------|------|
| enterprise | view, edit, manage | 企业管理 |
| user | view, create, edit, delete, assign_role | 用户管理 |
| role | view, create, edit, delete, assign_permission | 角色管理 |
| project | view, create, edit, delete, archive | 项目管理 |
| task | view, create, edit, delete, assign | 任务管理 |
| document | view, create, edit, delete | 文档管理 |
| permission | view, manage | 权限管理 |
| audit | view | 审计日志查看 |

```sql
-- 检查特定权限是否存在
SELECT
  p.resource_type,
  p.action,
  p.display_name,
  CASE
    WHEN rp.id IS NOT NULL THEN '✅ 已分配'
    ELSE '❌ 缺失'
  END as status
FROM permissions p
LEFT JOIN role_permissions rp ON rp.permission_id = p.id
  AND rp.role_id = (SELECT id FROM roles WHERE role_type = 'enterprise_admin' AND is_active = true LIMIT 1)
  AND rp.deleted_at IS NULL
WHERE p.resource_type IN ('enterprise', 'user', 'role', 'project', 'task', 'document', 'permission', 'audit')
  AND p.deleted_at IS NULL
ORDER BY p.resource_type, p.action;
```

---

## 🧪 第四阶段：功能测试计划

### 4.1 登录测试

```bash
# 1. 使用 huangcong 账号登录
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "huangcong",
    "password": "实际密码"
  }'

# 预期结果：
# - 登录成功
# - 返回 JWT token
# - token 中包含 enterprise_admin 角色
```

### 4.2 企业管理权限测试

```bash
# 2. 查看企业列表
curl -X GET http://localhost:8080/api/v1/enterprises \
  -H "Authorization: Bearer {huangcong_token}"

# 预期：返回企业列表

# 3. 查看企业详情
curl -X GET http://localhost:8080/api/v1/enterprises/{enterprise_id} \
  -H "Authorization: Bearer {huangcong_token}"

# 预期：返回企业详细信息

# 4. 修改企业信息
curl -X PUT http://localhost:8080/api/v1/enterprises/{enterprise_id} \
  -H "Authorization: Bearer {huangcong_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "测试修改",
    "description": "权限测试"
  }'

# 预期：修改成功
```

### 4.3 用户管理权限测试

```bash
# 5. 查看企业用户列表
curl -X GET http://localhost:8080/api/v1/enterprises/{enterprise_id}/users \
  -H "Authorization: Bearer {huangcong_token}"

# 预期：返回用户列表

# 6. 创建新用户（如果API支持）
curl -X POST http://localhost:8080/api/v1/enterprises/{enterprise_id}/users \
  -H "Authorization: Bearer {huangcong_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test_user_permissions",
    "email": "test@example.com"
  }'

# 预期：创建成功或返回合理错误

# 7. 为用户分配角色
curl -X POST http://localhost:8080/api/v1/enterprises/{enterprise_id}/users/{user_id}/roles \
  -H "Authorization: Bearer {huangcong_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "role_id": {role_id}
  }'

# 预期：分配成功
```

### 4.4 角色管理权限测试

```bash
# 8. 查看企业角色列表
curl -X GET http://localhost:8080/api/v1/enterprises/{enterprise_id}/roles \
  -H "Authorization: Bearer {huangcong_token}"

# 预期：返回角色列表

# 9. 创建新角色
curl -X POST http://localhost:8080/api/v1/enterprises/{enterprise_id}/roles \
  -H "Authorization: Bearer {huangcong_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "测试角色",
    "description": "权限测试用角色",
    "role_type": "custom"
  }'

# 预期：创建成功

# 10. 为角色分配权限
curl -X POST http://localhost:8080/api/v1/enterprises/{enterprise_id}/roles/{role_id}/permissions \
  -H "Authorization: Bearer {huangcong_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "permission_ids": [1, 2, 3]
  }'

# 预期：分配成功
```

### 4.5 项目管理权限测试

```bash
# 11. 查看项目列表
curl -X GET http://localhost:8080/api/v1/enterprises/{enterprise_id}/projects \
  -H "Authorization: Bearer {huangcong_token}"

# 预期：返回项目列表

# 12. 创建项目
curl -X POST http://localhost:8080/api/v1/enterprises/{enterprise_id}/projects \
  -H "Authorization: Bearer {huangcong_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "权限测试项目",
    "description": "测试企业管理员权限"
  }'

# 预期：创建成功

# 13. 编辑项目
curl -X PUT http://localhost:8080/api/v1/projects/{project_id} \
  -H "Authorization: Bearer {huangcong_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "修改后的项目名称"
  }'

# 预期：修改成功
```

### 4.6 任务管理权限测试

```bash
# 14. 查看任务列表
curl -X GET "http://localhost:8080/api/v1/enterprises/{enterprise_id}/projects/{project_id}/tasks" \
  -H "Authorization: Bearer {huangcong_token}"

# 预期：返回任务列表

# 15. 创建任务
curl -X POST http://localhost:8080/api/v1/enterprises/{enterprise_id}/projects/{project_id}/tasks \
  -H "Authorization: Bearer {huangcong_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "权限测试任务",
    "description": "测试企业管理员创建任务",
    "status": "todo"
  }'

# 预期：创建成功

# 16. 分配任务
curl -X PUT http://localhost:8080/api/v1/tasks/{task_id} \
  -H "Authorization: Bearer {huangcong_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "assignee_id": {user_id}
  }'

# 预期：分配成功
```

### 4.7 文档管理权限测试

```bash
# 17. 查看文档列表
curl -X GET http://localhost:8080/api/v1/enterprises/{enterprise_id}/documents \
  -H "Authorization: Bearer {huangcong_token}"

# 预期：返回文档列表

# 18. 创建文档
curl -X POST http://localhost:8080/api/v1/enterprises/{enterprise_id}/documents \
  -H "Authorization: Bearer {huangcong_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "权限测试文档",
    "content": "测试企业管理员权限"
  }'

# 预期：创建成功
```

### 4.8 权限管理权限测试

```bash
# 19. 查看所有权限列表
curl -X GET http://localhost:8080/api/v1/enterprises/{enterprise_id}/permissions \
  -H "Authorization: Bearer {huangcong_token}"

# 预期：返回权限列表

# 20. 查看权限矩阵
curl -X GET http://localhost:8080/api/v1/system/roles/permissions/matrix \
  -H "Authorization: Bearer {huangcong_token}"

# 预期：返回权限矩阵
```

### 4.9 审计日志权限测试

```bash
# 21. 查看审计日志
curl -X GET "http://localhost:8080/api/v1/system/audit/logs?page=1&page_size=20" \
  -H "Authorization: Bearer {huangcong_token}"

# 预期：返回审计日志列表
```

---

## 📊 第五阶段：测试结果记录

### 5.1 测试记录表格

| 测试项 | API 端点 | 预期结果 | 实际结果 | 状态 | 备注 |
|-------|---------|---------|---------|------|------|
| 登录 | POST /api/v1/auth/login | 成功获取 token | | ⏳ | |
| 查看企业列表 | GET /api/v1/enterprises | 返回企业列表 | | ⏳ | |
| 查看企业详情 | GET /api/v1/enterprises/{id} | 返回企业信息 | | ⏳ | |
| 修改企业信息 | PUT /api/v1/enterprises/{id} | 修改成功 | | ⏳ | |
| 查看用户列表 | GET /api/v1/enterprises/{id}/users | 返回用户列表 | | ⏳ | |
| 分配用户角色 | POST /api/v1/enterprises/{id}/users/{uid}/roles | 分配成功 | | ⏳ | |
| 查看角色列表 | GET /api/v1/enterprises/{id}/roles | 返回角色列表 | | ⏳ | |
| 创建角色 | POST /api/v1/enterprises/{id}/roles | 创建成功 | | ⏳ | |
| 分配角色权限 | POST /api/v1/enterprises/{id}/roles/{rid}/permissions | 分配成功 | | ⏳ | |
| 查看项目列表 | GET /api/v1/enterprises/{id}/projects | 返回项目列表 | | ⏳ | |
| 创建项目 | POST /api/v1/enterprises/{id}/projects | 创建成功 | | ⏳ | |
| 编辑项目 | PUT /api/v1/projects/{id} | 修改成功 | | ⏳ | |
| 查看任务列表 | GET /api/v1/enterprises/{id}/projects/{pid}/tasks | 返回任务列表 | | ⏳ | |
| 创建任务 | POST /api/v1/enterprises/{id}/projects/{pid}/tasks | 创建成功 | | ⏳ | |
| 分配任务 | PUT /api/v1/tasks/{id} | 分配成功 | | ⏳ | |
| 查看文档列表 | GET /api/v1/enterprises/{id}/documents | 返回文档列表 | | ⏳ | |
| 创建文档 | POST /api/v1/enterprises/{id}/documents | 创建成功 | | ⏳ | |
| 查看权限列表 | GET /api/v1/enterprises/{id}/permissions | 返回权限列表 | | ⏳ | |
| 查看权限矩阵 | GET /api/v1/system/roles/permissions/matrix | 返回权限矩阵 | | ⏳ | |
| 查看审计日志 | GET /api/v1/system/audit/logs | 返回审计日志 | | ⏳ | |

**状态说明**:
- ⏳ 待测试
- ✅ 测试通过
- ❌ 测试失败
- ⚠️ 部分通过

### 5.2 问题跟踪

**发现的问题**:
1. [问题描述]
   - **影响**: [影响范围]
   - **原因**: [根本原因]
   - **解决方案**: [修复方案]
   - **状态**: [待修复/已修复]

---

## 🔧 第六阶段：优化建议

### 6.1 权限配置优化

根据测试结果，可能需要优化的权限配置：

1. **权限粒度优化**
   - 确认是否需要更细粒度的权限控制
   - 评估权限分离的必要性

2. **角色继承优化**
   - 检查角色继承关系
   - 优化权限重复配置

3. **默认权限设置**
   - 确认企业管理员的默认权限是否合理
   - 调整权限范围

### 6.2 安全性检查

1. **越权检查**
   - 确认不会访问其他企业的数据
   - 验证数据隔离有效性

2. **审计日志**
   - 确认所有关键操作都有审计记录
   - 验证日志完整性

---

## 📝 执行清单

### 准备阶段
- [ ] 确认数据库连接正常
- [ ] 备份相关数据表
- [ ] 准备测试环境

### 配置阶段
- [ ] 查询 huangcong 账号信息
- [ ] 查询企业管理员角色 ID
- [ ] 清除旧角色分配
- [ ] 分配新角色
- [ ] 验证角色分配成功
- [ ] 验证权限配置完整

### 测试阶段
- [ ] 登录测试
- [ ] 企业管理权限测试（4项）
- [ ] 用户管理权限测试（3项）
- [ ] 角色管理权限测试（3项）
- [ ] 项目管理权限测试（3项）
- [ ] 任务管理权限测试（3项）
- [ ] 文档管理权限测试（2项）
- [ ] 权限管理权限测试（2项）
- [ ] 审计日志权限测试（1项）

### 验证阶段
- [ ] 记录测试结果
- [ ] 分析问题原因
- [ ] 提出优化建议
- [ ] 完成文档更新

### 清理阶段
- [ ] 删除测试数据（如果需要）
- [ ] 恢复环境状态
- [ ] 归档测试记录

---

## ⚠️ 注意事项

1. **数据库操作**
   - 所有 SQL 操作前先在测试环境验证
   - 关键操作前备份相关数据
   - 使用软删除，保留历史记录

2. **权限测试**
   - 使用实际的 API 端点进行测试
   - 记录所有测试请求和响应
   - 注意区分成功和失败的场景

3. **安全考虑**
   - 不要在测试中使用真实敏感数据
   - 测试完成后清理测试数据
   - 确保不影响生产环境

4. **问题处理**
   - 遇到问题立即记录
   - 重要问题及时上报
   - 保留完整的错误日志

---

## 📚 参考资料

- RBAC v2 权限系统设计文档
- 企业管理员角色定义
- API 文档: http://localhost:8080/docs
- 数据库 Schema 文档

---

## 🎯 预期成果

1. **配置成果**
   - huangcong 账号成功配置为企业管理员
   - 权限配置完整且正确
   - 数据库记录一致

2. **测试成果**
   - 完整的测试报告
   - 所有权限测试通过
   - 问题清单和修复建议

3. **文档成果**
   - 详细的操作记录
   - 测试结果分析
   - 优化建议文档

---

**文档版本**: v1.0
**最后更新**: 2025-11-02
**负责人**: Claude AI
**审核人**: 待定
