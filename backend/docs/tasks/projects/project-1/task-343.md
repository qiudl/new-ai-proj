# 任务 #343：接口详细设计文档

## 验收标准

### 功能性要求

#### ✅ 基础功能
- [ ] 用户认证接口正常工作（登录/注册/退出）
- [ ] 用户信息管理接口完整（查询/更新个人资料）
- [ ] 权限控制机制有效（基于角色的访问控制）
- [ ] 数据验证完整（输入参数校验、格式验证）
- [ ] 错误处理规范（统一错误码、友好错误信息）

#### ✅ 高级功能
- [ ] 支持多种认证方式（JWT Token、OAuth2）
- [ ] 实现接口版本管理（v1、v2 兼容性）
- [ ] 支持批量操作接口
- [ ] 实现数据分页与排序
- [ ] 提供接口文档（Swagger/OpenAPI）

### 性能要求
- [ ] 接口响应时间 < 200ms（P95）
- [ ] 并发支持 ≥ 1000 QPS
- [ ] 数据库查询优化（索引覆盖率 ≥ 90%）
- [ ] 缓存策略实施（Redis 缓存热点数据）

### 安全要求
- [ ] API 密钥管理（定期轮换、加密存储）
- [ ] 输入参数过滤（XSS、SQL注入防护）
- [ ] HTTPS 强制传输
- [ ] 敏感信息脱敏（日志、响应数据）
- [ ] 接口访问频率限制（Rate Limiting）

### 可靠性要求
- [ ] 接口可用性 ≥ 99.9%
- [ ] 优雅降级机制（依赖服务异常时）
- [ ] 健康检查接口
- [ ] 完整的监控与告警

---

## 接口设计草案

### 1. 用户认证接口

#### 1.1 用户登录

**请求**
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123",
  "remember_me": false,
  "captcha": {
    "token": "captcha-token-123",
    "value": "ABCD"
  }
}
```

**响应**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2g...",
    "expires_in": 3600,
    "token_type": "Bearer",
    "user": {
      "id": 12345,
      "email": "user@example.com",
      "username": "john_doe",
      "avatar": "https://cdn.example.com/avatars/user123.jpg",
      "roles": ["user"],
      "permissions": ["read:profile", "write:profile"]
    }
  },
  "message": "登录成功",
  "timestamp": "2025-08-21T02:48:20Z"
}
```

**字段定义**
- `email`: 用户邮箱（必填，格式验证）
- `password`: 用户密码（必填，最小长度8位）
- `remember_me`: 是否记住登录状态（可选，默认false）
- `captcha`: 验证码信息（可选，连续失败后必填）
  - `token`: 验证码令牌
  - `value`: 验证码值

#### 1.2 用户注册

**请求**
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "username": "new_user",
  "email": "newuser@example.com",
  "password": "securePassword123",
  "password_confirmation": "securePassword123",
  "phone": "+86-13800138000",
  "agree_terms": true,
  "verification_code": "123456"
}
```

**响应**
```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "success": true,
  "data": {
    "user_id": 12346,
    "email": "newuser@example.com",
    "username": "new_user",
    "status": "pending_verification",
    "created_at": "2025-08-21T02:48:20Z"
  },
  "message": "注册成功，请查收邮件验证",
  "timestamp": "2025-08-21T02:48:20Z"
}
```

#### 1.3 刷新令牌

**请求**
```http
POST /api/v1/auth/refresh
Content-Type: application/json
Authorization: Bearer refresh-token-here

{
  "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2g..."
}
```

**响应**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_in": 3600,
    "token_type": "Bearer"
  },
  "message": "令牌刷新成功",
  "timestamp": "2025-08-21T02:48:20Z"
}
```

### 2. 用户信息管理接口

#### 2.1 获取用户信息

**请求**
```http
GET /api/v1/users/profile
Authorization: Bearer access-token-here
```

**响应**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": {
    "id": 12345,
    "username": "john_doe",
    "email": "user@example.com",
    "phone": "+86-138****8000",
    "avatar": "https://cdn.example.com/avatars/user123.jpg",
    "full_name": "John Doe",
    "bio": "软件开发工程师",
    "location": "北京市",
    "website": "https://johndoe.com",
    "social_links": {
      "github": "https://github.com/johndoe",
      "linkedin": "https://linkedin.com/in/johndoe"
    },
    "preferences": {
      "language": "zh-CN",
      "timezone": "Asia/Shanghai",
      "theme": "light"
    },
    "created_at": "2023-01-15T10:30:00Z",
    "last_login_at": "2025-08-21T01:30:00Z",
    "email_verified": true,
    "phone_verified": true
  },
  "message": "获取成功",
  "timestamp": "2025-08-21T02:48:20Z"
}
```

#### 2.2 更新用户信息

**请求**
```http
PUT /api/v1/users/profile
Content-Type: application/json
Authorization: Bearer access-token-here

{
  "full_name": "John Smith",
  "bio": "全栈开发工程师，专注于AI应用开发",
  "location": "上海市",
  "website": "https://johnsmith.dev",
  "preferences": {
    "language": "en-US",
    "theme": "dark"
  }
}
```

**响应**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": {
    "updated_fields": ["full_name", "bio", "location", "website", "preferences"],
    "updated_at": "2025-08-21T02:48:20Z"
  },
  "message": "信息更新成功",
  "timestamp": "2025-08-21T02:48:20Z"
}
```

### 3. 权限管理接口

#### 3.1 获取用户权限

**请求**
```http
GET /api/v1/users/permissions
Authorization: Bearer access-token-here
```

**响应**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": {
    "roles": [
      {
        "id": 2,
        "name": "premium_user",
        "display_name": "高级用户",
        "description": "拥有高级功能访问权限"
      }
    ],
    "permissions": [
      {
        "id": 10,
        "name": "read:profile",
        "resource": "profile",
        "action": "read",
        "description": "查看个人资料"
      },
      {
        "id": 11,
        "name": "write:profile",
        "resource": "profile",
        "action": "write",
        "description": "修改个人资料"
      }
    ],
    "capabilities": {
      "api_rate_limit": 1000,
      "storage_quota_mb": 5120,
      "max_projects": 50
    }
  },
  "message": "获取权限成功",
  "timestamp": "2025-08-21T02:48:20Z"
}
```

---

## 权限校验机制

### 权限模型

#### RBAC（基于角色的访问控制）
- **用户（User）**: 系统的使用者
- **角色（Role）**: 权限的集合，如 `admin`, `premium_user`, `basic_user`
- **权限（Permission）**: 具体的操作权限，格式为 `action:resource`

#### 权限格式规范
```
{action}:{resource}[:{scope}]
```

**示例**:
- `read:profile` - 读取个人资料
- `write:profile` - 修改个人资料  
- `delete:user:own` - 删除自己的用户账户
- `manage:user:all` - 管理所有用户账户

### 权限校验流程

#### 1. Token 验证
```http
Authorization: Bearer {access_token}
```

#### 2. 权限检查中间件
```javascript
// 伪代码示例
function requirePermission(permission) {
  return async (req, res, next) => {
    try {
      // 1. 验证 Token
      const token = extractToken(req.headers.authorization);
      const payload = jwt.verify(token, JWT_SECRET);
      
      // 2. 获取用户权限
      const user = await User.findById(payload.userId);
      const userPermissions = await getUserPermissions(user.id);
      
      // 3. 权限匹配检查
      if (!hasPermission(userPermissions, permission)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: '权限不足',
            required_permission: permission
          }
        });
      }
      
      // 4. 将用户信息注入请求
      req.user = user;
      req.permissions = userPermissions;
      next();
      
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_FAILED',
          message: '认证失败'
        }
      });
    }
  };
}
```

#### 3. 接口权限注解
```javascript
// 路由定义示例
router.get('/profile', 
  requirePermission('read:profile'), 
  getUserProfile
);

router.put('/profile', 
  requirePermission('write:profile'), 
  updateUserProfile
);

router.delete('/users/:id', 
  requirePermission('delete:user:all'), 
  deleteUser
);
```

### 安全最佳实践

#### Token 安全
- **Access Token**: 短期有效（15-60分钟），用于API访问
- **Refresh Token**: 长期有效（7-30天），仅用于刷新Access Token
- **Token 轮换**: Refresh Token使用后立即失效并颁发新的
- **Token 撤销**: 支持主动注销所有会话

#### 数据安全
- **敏感信息脱敏**: 手机号中间位用*替代
- **密码安全**: BCrypt加密存储，永不返回明文
- **SQL注入防护**: 使用参数化查询
- **XSS防护**: 输入输出转义处理

#### 访问控制
- **Rate Limiting**: 基于用户/IP的访问频率限制
- **CORS 配置**: 严格的跨域资源共享策略
- **HTTPS 强制**: 生产环境禁用HTTP
- **API版本管理**: 通过Header或URL路径区分版本

---

## 错误处理规范

### 统一错误响应格式

```http
HTTP/1.1 {status_code}
Content-Type: application/json

{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "人类可读的错误信息",
    "details": {},
    "trace_id": "req-123abc-456def"
  },
  "timestamp": "2025-08-21T02:48:20Z"
}
```

### 常见错误码定义

| HTTP状态码 | 错误码 | 说明 |
|-----------|--------|------|
| 400 | INVALID_REQUEST | 请求参数错误 |
| 400 | VALIDATION_FAILED | 数据验证失败 |
| 401 | AUTHENTICATION_FAILED | 认证失败 |
| 401 | TOKEN_EXPIRED | Token已过期 |
| 403 | INSUFFICIENT_PERMISSIONS | 权限不足 |
| 404 | RESOURCE_NOT_FOUND | 资源不存在 |
| 409 | RESOURCE_CONFLICT | 资源冲突 |
| 429 | RATE_LIMIT_EXCEEDED | 访问频率超限 |
| 500 | INTERNAL_SERVER_ERROR | 服务器内部错误 |
| 503 | SERVICE_UNAVAILABLE | 服务暂不可用 |

### 字段验证错误示例

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "数据验证失败",
    "details": {
      "field_errors": {
        "email": ["邮箱格式不正确"],
        "password": ["密码长度至少8位", "密码必须包含数字和字母"]
      }
    },
    "trace_id": "req-123abc-456def"
  },
  "timestamp": "2025-08-21T02:48:20Z"
}
```

---

## 测试验收清单

### 单元测试
- [ ] 所有业务逻辑函数覆盖率 ≥ 80%
- [ ] 权限验证逻辑测试完整
- [ ] 数据验证逻辑测试覆盖各种边界情况
- [ ] 错误处理流程测试

### 集成测试
- [ ] 完整的认证流程测试
- [ ] 权限控制端到端测试
- [ ] 数据库交互测试
- [ ] 第三方服务集成测试

### 安全测试
- [ ] SQL注入攻击测试
- [ ] XSS攻击防护测试
- [ ] 暴力破解防护测试
- [ ] Token安全性测试
- [ ] 敏感信息泄露检查

### 性能测试
- [ ] 接口响应时间压测
- [ ] 并发用户访问测试
- [ ] 数据库查询性能测试
- [ ] 缓存效果验证测试

### 兼容性测试
- [ ] 多版本API兼容性测试
- [ ] 不同客户端兼容性测试
- [ ] 数据格式向后兼容测试

---

## 部署验收要求

### 环境配置
- [ ] 生产环境PostgreSQL数据库配置正确
- [ ] Redis缓存服务正常运行
- [ ] HTTPS证书配置有效
- [ ] 环境变量配置完整且安全

### 监控告警
- [ ] API响应时间监控
- [ ] 错误率监控告警
- [ ] 系统资源使用监控
- [ ] 安全事件监控告警

### 文档交付
- [ ] API文档（Swagger/OpenAPI）
- [ ] 部署运维文档
- [ ] 安全配置指南
- [ ] 故障排查手册