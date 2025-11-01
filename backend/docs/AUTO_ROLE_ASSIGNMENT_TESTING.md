# 自动角色分配功能测试指南

## 📋 概述

本文档描述如何测试企业用户邀请时的自动角色分配功能。

**功能描述**: 当通过API邀请用户加入企业时，系统自动查询并分配企业的默认 `member` 角色。

**实现位置**: `backend/handlers/enterprise_user_handler.go` - `InviteUserToEnterprise` 方法

## 🎯 测试目标

验证以下场景:
1. ✅ **正常场景**: member角色存在时,成功自动分配
2. ✅ **边缘场景**: member角色不存在时,graceful degradation (role_id = NULL)
3. ✅ **性能场景**: 角色查询性能 < 50ms
4. ✅ **数据完整性**: 验证enterprise_users表中的role_id字段正确

## 🧪 测试方法

### 方法1: 自动化脚本测试

使用提供的测试脚本:

```bash
cd backend/scripts
chmod +x test-auto-role-assignment.sh

# 基础测试 (数据库查询 + 性能测试)
./test-auto-role-assignment.sh

# 完整测试 (包含API测试)
TOKEN="your-jwt-token" ./test-auto-role-assignment.sh

# 指定企业和用户
TOKEN="your-jwt-token" ./test-auto-role-assignment.sh 1 2
```

**脚本功能**:
- 验证member角色是否存在
- 测试角色查询性能 (EXPLAIN ANALYZE)
- 调用邀请用户API并验证结果
- 统计企业用户角色分配情况

### 方法2: 手动SQL测试

#### 测试1: 验证角色配置

```sql
-- 检查企业是否有member角色
SELECT id, code, name, description, is_active
FROM enterprise_roles
WHERE enterprise_id = 1
  AND code = 'member'
  AND is_active = TRUE
  AND deleted_at IS NULL;
```

**期望结果**: 至少返回1行

**如果不存在,创建member角色**:
```sql
INSERT INTO enterprise_roles (
    enterprise_id, code, name, description,
    is_active, created_at, updated_at
) VALUES (
    1, 'member', '成员',
    '企业普通成员,具有基础权限',
    TRUE, NOW(), NOW()
);
```

#### 测试2: 验证自动分配逻辑

```sql
-- 查看最近添加的企业用户及其角色
SELECT
    eu.id as enterprise_user_id,
    eu.user_id,
    eu.username,
    eu.email,
    eu.role_id,
    er.code as role_code,
    er.name as role_name,
    eu.created_at
FROM enterprise_users eu
LEFT JOIN enterprise_roles er ON eu.role_id = er.id
WHERE eu.enterprise_id = 1
  AND eu.deleted_at IS NULL
ORDER BY eu.created_at DESC
LIMIT 10;
```

**期望结果**:
- `role_id` 字段不为 NULL
- `role_code` 为 `member`
- `role_name` 为 `成员`

#### 测试3: 性能测试

```sql
-- 使用EXPLAIN ANALYZE查看查询计划
EXPLAIN ANALYZE
SELECT id
FROM enterprise_roles
WHERE enterprise_id = 1
  AND code = 'member'
  AND is_active = TRUE
  AND deleted_at IS NULL
LIMIT 1;
```

**期望结果**:
- 执行时间 < 1ms
- 使用索引扫描 (Index Scan)
- 如果是Seq Scan,需要创建索引

**优化建议** (如果性能不佳):
```sql
-- 创建复合索引
CREATE INDEX CONCURRENTLY idx_enterprise_roles_lookup
ON enterprise_roles (enterprise_id, code, is_active)
WHERE deleted_at IS NULL;
```

### 方法3: API测试

#### 使用cURL测试

```bash
# 获取JWT Token
TOKEN=$(cat /tmp/token.txt)

# 调用邀请用户API
curl -X POST "http://localhost:8080/api/enterprises/1/users/invite" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"user_id": 2}' | jq '.'
```

**期望响应**:
```json
{
  "success": true,
  "message": "用户已成功添加到企业并分配默认角色",
  "data": {
    "enterprise_user_id": 123,
    "user_id": 2,
    "username": "testuser",
    "email": "test@example.com",
    "role_id": 5,
    "status": "active"
  }
}
```

**验证点**:
1. `success` 为 `true`
2. `message` 包含 "默认角色"
3. `data.role_id` 不为 null
4. `data.status` 为 "active"

#### 使用Postman测试

1. **请求类型**: POST
2. **URL**: `http://localhost:8080/api/enterprises/{enterprise_id}/users/invite`
3. **Headers**:
   - `Authorization: Bearer {your-jwt-token}`
   - `Content-Type: application/json`
4. **Body** (JSON):
   ```json
   {
     "user_id": 2
   }
   ```

### 方法4: 集成测试

创建Go集成测试 (需要测试数据库):

```go
func TestInviteUserWithAutoRole_Integration(t *testing.T) {
    // 此测试需要实际数据库连接
    if testing.Short() {
        t.Skip("Skipping integration test")
    }

    // 1. Setup: 确保member角色存在
    // 2. Execute: 调用InviteUserToEnterprise
    // 3. Verify: 查询enterprise_users表验证role_id
    // 4. Cleanup: 删除测试数据
}
```

## 📊 测试场景覆盖

### 场景1: 正常流程 (Happy Path)

**前置条件**:
- 企业存在且active
- 用户存在且未在企业中
- 企业配置了member角色

**测试步骤**:
1. 调用 `/api/enterprises/1/users/invite`
2. 传入 `user_id: 2`

**预期结果**:
- HTTP 200 OK
- `role_id` 自动分配为member角色的ID
- 响应message包含"默认角色"

**实际SQL执行** (日志验证):
```sql
-- 查询默认角色
SELECT id FROM enterprise_roles
WHERE enterprise_id = 1 AND code = 'member'
AND is_active = TRUE AND deleted_at IS NULL
LIMIT 1;

-- 插入用户记录
INSERT INTO enterprise_users (
    enterprise_id, user_id, username, email,
    role_id,  -- 自动填充
    status, created_by, created_at, updated_at
) VALUES (1, 2, 'testuser', 'test@example.com', 5, 'active', 1, NOW(), NOW());
```

### 场景2: Member角色不存在

**前置条件**:
- 企业存在
- 企业**没有**配置member角色

**测试步骤**:
```sql
-- 临时删除member角色
UPDATE enterprise_roles
SET deleted_at = NOW()
WHERE enterprise_id = 1 AND code = 'member';

-- 然后调用API邀请用户
```

**预期结果**:
- SQL查询返回 `sql.ErrNoRows`
- `defaultRoleID.Valid` = `false`
- `role_id` 字段插入时为 `NULL`
- API仍然返回成功 (graceful degradation)

### 场景3: 数据库错误

**模拟方法**: 临时关闭数据库或使用mock

**预期结果**:
- HTTP 500 Internal Server Error
- 响应包含错误信息: "查询默认角色失败"
- 不会创建enterprise_users记录 (事务回滚)

### 场景4: 性能测试

**测试数据量**:
- 企业角色: 10个
- 企业用户: 1000个

**测试方法**:
```bash
# 循环邀请100个用户,测试平均响应时间
for i in {1..100}; do
    time curl -X POST "http://localhost:8080/api/enterprises/1/users/invite" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"user_id\": $i}"
done
```

**性能基准**:
- 单次邀请 < 100ms
- 角色查询 < 1ms
- 用户插入 < 10ms

## ✅ 测试检查清单

使用以下清单验证测试完整性:

- [ ] **功能测试**
  - [ ] member角色存在时,成功分配
  - [ ] member角色不存在时,graceful degradation
  - [ ] 用户信息 (username, email) 正确保存
  - [ ] status字段为 'active'

- [ ] **边缘情况**
  - [ ] 用户已在企业中 (重复邀请)
  - [ ] 用户不存在
  - [ ] 企业不存在
  - [ ] 多个member角色存在 (应使用第一个)

- [ ] **错误处理**
  - [ ] 数据库连接失败
  - [ ] SQL查询超时
  - [ ] 事务回滚验证

- [ ] **性能测试**
  - [ ] 角色查询使用索引
  - [ ] 查询时间 < 50ms
  - [ ] 无全表扫描

- [ ] **数据完整性**
  - [ ] enterprise_users.role_id 外键约束有效
  - [ ] 软删除逻辑正确 (deleted_at)
  - [ ] created_at/updated_at 自动填充

## 🐛 常见问题排查

### 问题1: role_id 总是 NULL

**可能原因**:
1. 企业没有配置member角色
2. member角色被软删除 (deleted_at != NULL)
3. member角色is_active = FALSE

**排查SQL**:
```sql
SELECT *
FROM enterprise_roles
WHERE enterprise_id = 1 AND code = 'member';
-- 检查 deleted_at 和 is_active 字段
```

**解决方法**:
```sql
-- 恢复或创建member角色
INSERT INTO enterprise_roles (
    enterprise_id, code, name, is_active,
    created_at, updated_at
) VALUES (1, 'member', '成员', TRUE, NOW(), NOW())
ON CONFLICT (enterprise_id, code) DO UPDATE
SET is_active = TRUE, deleted_at = NULL;
```

### 问题2: 查询性能慢

**排查方法**:
```sql
EXPLAIN ANALYZE
SELECT id FROM enterprise_roles
WHERE enterprise_id = 1 AND code = 'member'
AND is_active = TRUE AND deleted_at IS NULL;
```

**如果显示 Seq Scan**:
```sql
-- 创建索引
CREATE INDEX CONCURRENTLY idx_enterprise_roles_active_lookup
ON enterprise_roles (enterprise_id, code)
WHERE is_active = TRUE AND deleted_at IS NULL;
```

### 问题3: API返回500错误

**检查后端日志**:
```bash
docker logs ai-project-backend-dev | grep "默认角色"
```

**常见错误信息**:
- "查询默认角色失败" → 数据库连接问题
- "用户不存在" → user_id无效
- "用户已在企业中" → 重复邀请

## 📈 测试报告模板

```markdown
## 自动角色分配功能测试报告

**测试日期**: 2025-10-29
**测试环境**: Development
**测试人员**: AI Assistant

### 测试结果摘要

| 测试场景 | 状态 | 备注 |
|---------|------|------|
| 正常角色分配 | ✅ PASS | role_id正确分配 |
| Member角色缺失 | ✅ PASS | Graceful degradation |
| 数据库错误处理 | ✅ PASS | 返回适当错误 |
| 性能测试 | ✅ PASS | 平均1ms查询时间 |

### 详细测试数据

**企业ID**: 1
**测试用户**: user_id 2-100
**总测试次数**: 50
**成功次数**: 50
**失败次数**: 0
**平均响应时间**: 45ms

### 发现的问题

无

### 建议

1. 为所有新企业自动创建member角色
2. 添加监控告警,当member角色缺失时通知管理员
3. 考虑在角色配置UI中标记"默认角色"
```

## 🔗 相关文档

- [自动角色分配实现文档](./AUTO_ROLE_ASSIGNMENT_IMPLEMENTATION.md)
- [RBAC v2操作手册](./RBAC_V2_OPERATIONS_MANUAL.md)
- [企业角色权限设计](../design/enterprise_role_permission_system.md)

## 📝 更新日志

| 日期 | 版本 | 变更内容 |
|-----|------|---------|
| 2025-10-29 | 1.0 | 初始版本,完整测试指南 |
