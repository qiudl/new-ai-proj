# 用户重置密码功能优化方案

**任务ID**: 3767
**创建时间**: 2025-11-15
**预计工时**: 13小时

## 一、问题分析

### 1.1 当前实现分析

**后端实现** (`backend/handlers/user_management_handlers.go:309-355`):
- 路由: `POST /api/v1/admin/users/:id/reset-password`
- 实现: `ResetUserPassword` 方法
- 功能: 管理员重置任意用户密码
- 验证:
  - 密码长度最少6个字符
  - 使用bcrypt加密存储

**前端实现** (`frontend/src/pages/UserManagementPage.tsx`):
- 模态框: 重置密码表单
- 表单字段:
  - `new_password`: 新密码（必填，最少6个字符）
  - `confirm_password`: 确认密码（必须与新密码一致）
- API调用: `userManagementService.resetUserPassword()`

### 1.2 存在的问题

根据代码分析，发现以下潜在问题：

1. **安全性问题**
   - ❌ 密码强度要求过低（仅要求6个字符）
   - ❌ 缺少密码复杂度验证（大小写、数字、特殊字符）
   - ❌ 没有密码历史记录，可重复使用旧密码
   - ❌ 缺少重置密码的审计日志
   - ❌ 没有强制用户首次登录时修改密码的机制

2. **功能缺失**
   - ❌ 用户自主修改密码功能缺失
   - ❌ 用户忘记密码找回功能缺失
   - ❌ 没有密码过期策略
   - ❌ 缺少重置密码通知机制

3. **用户体验问题**
   - ❌ 前端确认密码字段未同步到后端验证
   - ❌ 错误提示不够详细
   - ❌ 没有密码强度指示器

## 二、技术方案

### 2.1 增强型密码安全策略

#### 2.1.1 密码复杂度要求
```go
// 新增密码验证规则
type PasswordPolicy struct {
    MinLength       int  // 最小长度：8
    RequireUppercase bool // 需要大写字母
    RequireLowercase bool // 需要小写字母
    RequireNumber    bool // 需要数字
    RequireSpecial   bool // 需要特殊字符
    MaxRepeating     int  // 最大重复字符数：3
}
```

#### 2.1.2 密码历史记录
```go
// 新增表: password_history
CREATE TABLE password_history (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

// 保留最近5个密码，防止重复使用
```

#### 2.1.3 密码过期策略
```sql
ALTER TABLE users ADD COLUMN password_expires_at TIMESTAMP;
ALTER TABLE users ADD COLUMN must_change_password BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN password_changed_at TIMESTAMP;
```

### 2.2 用户自主修改密码

#### 2.2.1 后端API
```go
// POST /api/v1/users/me/change-password
type ChangePasswordRequest struct {
    OldPassword     string `json:"old_password" binding:"required"`
    NewPassword     string `json:"new_password" binding:"required,min=8"`
    ConfirmPassword string `json:"confirm_password" binding:"required,eqfield=NewPassword"`
}

func (h *UserHandler) ChangePassword(c *gin.Context) {
    // 1. 验证旧密码
    // 2. 验证新密码复杂度
    // 3. 检查密码历史
    // 4. 更新密码
    // 5. 记录审计日志
    // 6. 发送通知
}
```

#### 2.2.2 前端页面
- 新增"个人中心 - 修改密码"页面
- 密码强度实时指示器
- 密码复杂度要求提示

### 2.3 忘记密码找回

#### 2.3.1 邮箱验证找回
```go
// 流程：
// 1. POST /api/v1/auth/forgot-password - 发送重置邮件
// 2. 用户点击邮件链接
// 3. POST /api/v1/auth/reset-password-with-token - 验证token并重置
```

#### 2.3.2 安全令牌设计
```go
type PasswordResetToken struct {
    ID        int
    UserID    int
    Token     string    // 随机生成的安全token
    ExpiresAt time.Time // 15分钟有效期
    Used      bool
    CreatedAt time.Time
}
```

### 2.4 审计日志增强

```go
// 记录所有密码相关操作
type PasswordAuditLog struct {
    Action      string // change_password, reset_password, failed_attempt
    UserID      int
    PerformedBy int    // 操作者ID（自己或管理员）
    IPAddress   string
    Success     bool
    Reason      string // 失败原因
    Timestamp   time.Time
}
```

## 三、实现步骤

### 阶段一：基础安全增强（2小时）

#### 3.1 后端密码验证增强
- [ ] 新建 `backend/utils/password_validator.go`
  - 密码复杂度验证函数
  - 密码强度评分函数
- [ ] 修改 `ResetUserPassword` 方法
  - 添加密码复杂度验证
  - 添加审计日志记录
- [ ] 新增密码相关常量配置
  - `backend/config/password_config.go`

#### 3.2 前端表单验证增强
- [ ] 新增密码强度组件 `frontend/src/components/PasswordStrengthIndicator.tsx`
- [ ] 修改重置密码模态框
  - 添加密码强度指示器
  - 添加复杂度要求提示
- [ ] 更新表单验证规则

### 阶段二：用户自主修改密码（3小时）

#### 3.3 后端API开发
- [ ] 新建 `backend/handlers/password_handlers.go`
  - `ChangePassword` - 用户修改密码
  - `ValidatePasswordPolicy` - 密码策略验证
- [ ] 新增路由 `backend/routes/user_routes.go`
  - `POST /api/v1/users/me/change-password`
- [ ] Swagger文档更新

#### 3.4 前端页面开发
- [ ] 新建 `frontend/src/pages/ChangePasswordPage.tsx`
  - 修改密码表单
  - 密码强度实时验证
- [ ] 新增服务 `frontend/src/services/passwordService.ts`
- [ ] 添加导航菜单项

### 阶段三：密码历史与过期策略（2小时）

#### 3.5 数据库迁移
- [ ] 创建迁移文件 `backend/migrations/202511_15_01_password_policy/`
  - `up.sql`: 创建password_history表，添加users表字段
  - `down.sql`: 回滚脚本
- [ ] 新建Repository `backend/database/password_history_repository.go`

#### 3.6 密码历史检查
- [ ] 修改 `ChangePassword` 方法
  - 检查最近5个密码
  - 保存密码历史记录
- [ ] 新增定时任务检查密码过期

### 阶段四：忘记密码找回（3小时）

#### 3.7 邮件服务集成
- [ ] 新建 `backend/services/email_service.go`
  - 发送重置密码邮件
  - 邮件模板管理
- [ ] 配置SMTP设置
  - 环境变量配置

#### 3.8 重置令牌管理
- [ ] 数据库迁移：password_reset_tokens表
- [ ] 新建 `backend/database/password_reset_token_repository.go`
- [ ] Handler实现：
  - `RequestPasswordReset` - 请求重置
  - `ResetPasswordWithToken` - 使用token重置
- [ ] 前端页面：
  - `ForgotPasswordPage.tsx`
  - `ResetPasswordPage.tsx`

### 阶段五：审计与通知（1小时）

#### 3.9 审计日志
- [ ] 扩展 `audit_logs` 表或新建专用表
- [ ] 所有密码操作添加审计记录

#### 3.10 密码修改通知
- [ ] 邮件通知
- [ ] 系统内通知

## 四、测试计划

### 4.1 单元测试
- [ ] 密码验证器测试 (`password_validator_test.go`)
  - 复杂度验证
  - 强度评分
- [ ] Handler测试
  - 修改密码场景
  - 重置密码场景
  - 忘记密码场景

### 4.2 集成测试
- [ ] API测试
  - 正常流程测试
  - 异常场景测试（旧密码错误、密码重复等）
- [ ] 前后端联调测试

### 4.3 安全测试
- [ ] 暴力破解防护测试
- [ ] Token过期测试
- [ ] 权限验证测试

## 五、API设计

### 5.1 用户修改密码
```
POST /api/v1/users/me/change-password
Content-Type: application/json

Request:
{
  "old_password": "OldPass123!",
  "new_password": "NewPass456!",
  "confirm_password": "NewPass456!"
}

Response:
{
  "success": true,
  "message": "密码修改成功",
  "data": null
}
```

### 5.2 请求重置密码
```
POST /api/v1/auth/forgot-password
Content-Type: application/json

Request:
{
  "email": "user@example.com"
}

Response:
{
  "success": true,
  "message": "重置密码邮件已发送，请查收",
  "data": null
}
```

### 5.3 使用Token重置密码
```
POST /api/v1/auth/reset-password-with-token
Content-Type: application/json

Request:
{
  "token": "random-secure-token",
  "new_password": "NewPass789!",
  "confirm_password": "NewPass789!"
}

Response:
{
  "success": true,
  "message": "密码重置成功，请使用新密码登录",
  "data": null
}
```

### 5.4 验证密码强度（前端调用）
```
POST /api/v1/auth/validate-password
Content-Type: application/json

Request:
{
  "password": "TestPass123!"
}

Response:
{
  "success": true,
  "data": {
    "valid": true,
    "strength": "strong",
    "score": 85,
    "suggestions": []
  }
}
```

## 六、安全措施

### 6.1 防暴力破解
- 限制密码重置频率（5分钟内最多3次）
- 错误次数限制（连续5次错误锁定30分钟）
- IP地址黑名单

### 6.2 Token安全
- 使用crypto/rand生成随机token
- Token长度：32字节（256位）
- 15分钟有效期
- 一次性使用（用后即焚）

### 6.3 通信安全
- 强制HTTPS传输
- 密码字段不记录日志
- 敏感信息加密存储

## 七、配置项

### 7.1 环境变量
```bash
# 密码策略
PASSWORD_MIN_LENGTH=8
PASSWORD_REQUIRE_UPPERCASE=true
PASSWORD_REQUIRE_NUMBER=true
PASSWORD_REQUIRE_SPECIAL=true
PASSWORD_MAX_REPEATING=3
PASSWORD_HISTORY_COUNT=5
PASSWORD_EXPIRY_DAYS=90

# 邮件服务
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USERNAME=noreply@example.com
SMTP_PASSWORD=***
SMTP_FROM=AI Project <noreply@example.com>

# 重置令牌
RESET_TOKEN_EXPIRY_MINUTES=15
RESET_MAX_ATTEMPTS=3
RESET_COOLDOWN_MINUTES=5
```

## 八、时间估算

| 阶段 | 工作内容 | 预计工时 |
|------|---------|----------|
| 阶段一 | 基础安全增强 | 2小时 |
| 阶段二 | 用户自主修改密码 | 3小时 |
| 阶段三 | 密码历史与过期策略 | 2小时 |
| 阶段四 | 忘记密码找回 | 3小时 |
| 阶段五 | 审计与通知 | 1小时 |
| 测试与修复 | 单元测试、集成测试、安全测试 | 2小时 |
| **总计** | | **13小时** |

## 九、风险评估

### 9.1 技术风险
- **邮件服务依赖**: 需要SMTP服务器配置
  - 缓解：提供备用方案（管理员手动重置）
- **密码策略过严**: 可能影响用户体验
  - 缓解：可配置的策略参数

### 9.2 数据风险
- **密码历史存储**: 增加数据库存储
  - 缓解：定期清理过期记录
- **迁移风险**: 现有用户密码兼容
  - 缓解：渐进式策略，首次登录时提示修改

## 十、后续优化建议

1. **双因素认证（2FA）**: 提供更高级别的安全保护
2. **密码管理器集成**: 支持浏览器密码管理器
3. **生物识别**: 支持指纹、面部识别登录
4. **单点登录（SSO）**: 与企业AD/LDAP集成
5. **密码泄露检查**: 集成Have I Been Pwned API

## 十一、参考资料

- OWASP密码安全指南
- NIST数字身份指南
- CWE-521: 弱密码要求
- RFC 7519: JWT Best Practices
