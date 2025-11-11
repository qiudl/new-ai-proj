# Enterprise ID Migration Guide (v1.5)

## 概述

本文档记录了从 `company_id` 到 `enterprise_id` 的渐进式迁移策略（v1.5-v2.0）。

### 迁移动机

1. **语义清晰性**: `enterprise_id` 比 `company_id` 更准确地描述多租户企业系统
2. **架构一致性**: 与 `enterprises` 表名保持一致
3. **国际化友好**: enterprise 比 company 更通用

### 迁移时间线

| 版本 | 状态 | 说明 |
|------|------|------|
| v1.5 | **当前版本** | 双字段共存期，双写双读，标记废弃 |
| v1.6-v1.9 | 计划中 | 持续监控，逐步迁移客户端 |
| v2.0 | 未来版本 | 删除 company_id 字段 |

---

## v1.5 技术实现

### 1. 数据库层

#### Schema 变更

```sql
-- 已完成的迁移 (20251111_01)
ALTER TABLE users ADD COLUMN enterprise_id INTEGER REFERENCES enterprises(id);
UPDATE users SET enterprise_id = company_id WHERE company_id IS NOT NULL;

-- company_id 保留但标记为废弃
-- 触发器确保双写同步
```

#### 触发器机制

```sql
CREATE OR REPLACE FUNCTION sync_enterprise_company_id()
RETURNS TRIGGER AS $$
BEGIN
  -- 双向同步
  IF NEW.enterprise_id IS NOT NULL THEN
    NEW.company_id := NEW.enterprise_id;
  ELSIF NEW.company_id IS NOT NULL THEN
    NEW.enterprise_id := NEW.company_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_user_enterprise_id
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION sync_enterprise_company_id();
```

### 2. 后端 (Go)

#### Models (backend/models/user.go)

```go
// User model with dual field support
type User struct {
    ID            int    `json:"id" db:"id"`
    Username      string `json:"username" db:"username"`

    // v1.5: New enterprise system field with clear semantics
    EnterpriseID  *int   `json:"enterprise_id,omitempty" db:"enterprise_id"`

    // DEPRECATED: Use EnterpriseID instead. Will be removed in v2.0
    CompanyID     *int   `json:"company_id,omitempty" db:"company_id"`

    // ... other fields
}

// Helper methods for backward compatibility
func (u *User) GetEnterpriseID() *int {
    if u.EnterpriseID != nil {
        return u.EnterpriseID
    }
    return u.CompanyID // Fallback
}

func (u *User) SetEnterpriseID(id *int) {
    u.EnterpriseID = id
    u.CompanyID = id // Keep in sync
}

func (u *User) BelongsToEnterprise(enterpriseID int) bool {
    eid := u.GetEnterpriseID()
    return eid != nil && *eid == enterpriseID
}
```

#### Validation (backend/models/user.go)

```go
// v1.5: Updated validation to accept either field
func ValidateEnterpriseUserFields(userType string, enterpriseID *int, companyID *int) error {
    if userType == "company" {
        // Accept either field during transition period
        if enterpriseID == nil && companyID == nil {
            return fmt.Errorf("enterprise_id or company_id is required for company users")
        }
    }
    if userType == "system" {
        if enterpriseID != nil || companyID != nil {
            return fmt.Errorf("enterprise_id/company_id should not be set for system users")
        }
    }
    return nil
}
```

#### Handlers (backend/handlers/user_management_handlers.go)

```go
// CreateUser - Updated validation call
if err := models.ValidateEnterpriseUserFields(req.UserType, req.EnterpriseID, req.CompanyID); err != nil {
    response := models.NewErrorResponse(models.ErrCodeValidation, "Invalid company fields", err.Error())
    c.JSON(models.GetStatusCode(models.ErrCodeValidation), response)
    return
}

// Dual-write logic
if req.EnterpriseID != nil {
    user.SetEnterpriseID(req.EnterpriseID)
} else if req.CompanyID != nil {
    // Backward compatibility
    user.SetEnterpriseID(req.CompanyID)
}
```

### 3. 前端 (TypeScript/React)

#### Types (frontend/src/types/user.ts)

```typescript
export interface User {
  id: number;
  username: string;
  email: string;
  user_type: UserType;

  // v1.5: New enterprise system field with clear semantics
  enterprise_id?: number;

  /** @deprecated Use enterprise_id instead. Will be removed in v2.0 */
  company_id?: number; // Legacy field, kept for compatibility during v1.5-v1.9

  // ... other fields
}

export interface UserCreateRequest {
  username: string;
  email: string;
  password: string;
  user_type: UserType;
  enterprise_id?: number; // v1.5: Prefer this field

  /** @deprecated Use enterprise_id instead. Will be removed in v2.0 */
  company_id?: number; // Legacy field for backward compatibility

  role: UserRole;
  profile?: UserProfile;
}
```

#### Utility Functions (frontend/src/types/user.ts)

```typescript
/**
 * v1.5: Get enterprise ID with backward compatibility
 * Priority: enterprise_id > company_id
 */
export const getEnterpriseId = (user: User | null | undefined): number | undefined => {
  if (!user) return undefined;
  return user.enterprise_id ?? user.company_id;
};

/**
 * v1.5: Check if user belongs to specific enterprise
 */
export const belongsToEnterprise = (
  user: User | null | undefined,
  enterpriseId: number | undefined
): boolean => {
  if (!user || enterpriseId === undefined) return false;
  const userEnterpriseId = getEnterpriseId(user);
  return userEnterpriseId === enterpriseId;
};

/**
 * v1.5: Check if user has enterprise access
 */
export const hasEnterpriseAccess = (user: User | null | undefined): boolean => {
  return getEnterpriseId(user) !== undefined;
};
```

#### Component Usage Example

```typescript
import { User, getEnterpriseId, belongsToEnterprise } from '../types/user';

// 旧代码 (v1.4)
const enterpriseId = user.company_id;  // ❌ 直接访问

// 新代码 (v1.5+)
const enterpriseId = getEnterpriseId(user);  // ✅ 使用工具函数

// 权限检查
if (belongsToEnterprise(user, targetEnterpriseId)) {
  // 用户属于该企业
}
```

---

## API 变更

### 创建用户 (POST /api/v1/admin/users)

#### v1.5: 支持两种方式

**方式1: 使用 enterprise_id (推荐)**
```json
{
  "username": "newuser",
  "email": "user@example.com",
  "password": "password123",
  "user_type": "company",
  "enterprise_id": 3,
  "role": "company_user"
}
```

**方式2: 使用 company_id (向后兼容)**
```json
{
  "username": "newuser",
  "email": "user@example.com",
  "password": "password123",
  "user_type": "company",
  "company_id": 3,
  "role": "company_user"
}
```

#### 响应 (双字段返回)

```json
{
  "success": true,
  "user": {
    "id": 123,
    "username": "newuser",
    "enterprise_id": 3,
    "company_id": 3,  // 自动同步
    // ... other fields
  }
}
```

### 更新用户 (PUT /api/v1/admin/users/:id)

同样支持两种字段，后端自动同步。

---

## 客户端迁移指南

### 步骤1: 更新类型定义

```typescript
// 导入新的工具函数
import { getEnterpriseId, belongsToEnterprise, hasEnterpriseAccess } from '@/types/user';
```

### 步骤2: 替换直接访问

```typescript
// 旧代码
const eid = user.company_id;

// 新代码
const eid = getEnterpriseId(user);
```

### 步骤3: 更新创建/更新请求

```typescript
// 旧代码
const createUserRequest = {
  username: 'test',
  email: 'test@example.com',
  password: 'password',
  user_type: 'company',
  company_id: 3,  // ⚠️ 废弃字段
  role: 'company_user'
};

// 新代码
const createUserRequest = {
  username: 'test',
  email: 'test@example.com',
  password: 'password',
  user_type: 'company',
  enterprise_id: 3,  // ✅ 推荐字段
  role: 'company_user'
};
```

### 步骤4: IDE 警告处理

TypeScript 会在使用 `company_id` 时显示 `@deprecated` 警告：

```
Property 'company_id' is deprecated. Use enterprise_id instead. Will be removed in v2.0
```

逐步修复这些警告，但不强制（v1.5-v1.9 期间）。

---

## 测试验证

### 自动化测试脚本

提供了两个测试脚本：

1. **完整测试**: `/tmp/test-enterprise-id-v2.sh`
   - 验证双字段返回
   - 测试 enterprise_id 创建用户
   - 测试 company_id 向后兼容
   - 验证数据库同步

2. **简单测试**: `/tmp/simple-test.sh`
   - 快速验证两种创建方式

### 手动测试步骤

```bash
# 1. 使用 enterprise_id 创建用户
curl -X POST http://localhost:8080/api/v1/admin/users \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test_ent",
    "email": "test_ent@example.com",
    "password": "Test123456",
    "user_type": "company",
    "enterprise_id": 3,
    "role": "company_user"
  }'

# 2. 验证响应包含两个字段且值相同
# Expected: enterprise_id: 3, company_id: 3

# 3. 使用 company_id 创建用户（向后兼容）
curl -X POST http://localhost:8080/api/v1/admin/users \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test_com",
    "email": "test_com@example.com",
    "password": "Test123456",
    "user_type": "company",
    "company_id": 3,
    "role": "company_user"
  }'

# 4. 验证后端自动同步
# Expected: enterprise_id: 3, company_id: 3
```

---

## 监控和回滚

### 监控指标

1. **API 使用统计**
   - 监控使用 `enterprise_id` vs `company_id` 的请求比例
   - 目标: v1.9 时 95%+ 使用 enterprise_id

2. **错误率监控**
   - 监控验证错误率是否异常
   - 关注 "enterprise_id or company_id is required" 错误

3. **数据库一致性**
   - 定期检查 `enterprise_id = company_id` 的一致性
   - SQL: `SELECT COUNT(*) FROM users WHERE enterprise_id != company_id AND enterprise_id IS NOT NULL;`

### 回滚计划

如果发现严重问题，可以快速回滚到仅使用 company_id：

```sql
-- 回滚步骤1: 禁用触发器
DROP TRIGGER IF EXISTS sync_user_enterprise_id ON users;

-- 回滚步骤2: 恢复数据
UPDATE users SET company_id = enterprise_id WHERE company_id IS NULL;

-- 回滚步骤3: 更新代码回退到 v1.4
git revert <commit-hash>
```

---

## FAQ

### Q1: 为什么不直接重命名字段？

**A**: 直接重命名会破坏现有客户端和API契约。渐进式迁移允许：
- 客户端按自己的节奏迁移
- 避免 "big bang" 部署风险
- 充分的测试和验证时间

### Q2: v1.5 期间两个字段必须同时存在吗？

**A**: 不需要。API 接受任意一个字段即可。后端会自动同步另一个字段。

### Q3: 前端必须立即迁移吗？

**A**: 不需要。v1.5-v1.9 期间两个字段都支持。但建议尽早迁移以：
- 利用 TypeScript `@deprecated` 警告
- 避免 v2.0 时的大规模修改

### Q4: 如何处理第三方集成？

**A**:
1. 通知第三方迁移计划和时间线
2. v1.5-v1.9 期间保持向后兼容
3. v1.9 时发出最后警告
4. v2.0 时才完全移除 company_id

### Q5: 数据库触发器会影响性能吗？

**A**: 影响极小。触发器只做简单的字段赋值，性能开销可忽略不计（< 0.1ms）。

---

## 时间线和检查点

| 日期 | 里程碑 | 检查点 |
|------|--------|--------|
| 2025-11-11 | v1.5 发布 | ✅ 双字段支持上线 |
| 2025-12-01 | 监控 1 个月 | 检查错误率、使用率 |
| 2026-01-01 | v1.6 计划 | 开始推动客户端迁移 |
| 2026-06-01 | v1.9 发布 | 最后警告，标记强制迁移 |
| 2026-09-01 | v2.0 计划 | 删除 company_id 字段 |

---

## 相关文档

- [数据库迁移记录](../backend/migrations/20251111_01_add_enterprise_id_to_users/)
- [API 文档](http://localhost:8080/docs)
- [前端 Types 定义](../frontend/src/types/user.ts)
- [后端 Models 定义](../backend/models/user.go)

---

## 更新日志

| 日期 | 版本 | 变更 |
|------|------|------|
| 2025-11-11 | v1.5.0 | 初始发布，双字段支持 |

---

**文档维护者**: AI Development Team
**最后更新**: 2025-11-11
**状态**: 生效中
