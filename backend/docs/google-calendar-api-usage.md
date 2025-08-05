# Google Calendar Integration API 使用文档

## 概述

本文档描述了如何使用Google Calendar集成功能，包括OAuth 2.0认证流程、API调用方法、错误处理和最佳实践。

## 目录

1. [快速开始](#快速开始)
2. [环境配置](#环境配置)
3. [OAuth 2.0认证流程](#oauth-20认证流程)
4. [API端点文档](#api端点文档)
5. [错误处理](#错误处理)
6. [最佳实践](#最佳实践)
7. [故障排除](#故障排除)

## 快速开始

### 1. 环境配置

在开始使用Google Calendar集成之前，请确保设置了以下环境变量：

```bash
export GOOGLE_CLIENT_ID="your_google_client_id"
export GOOGLE_CLIENT_SECRET="your_google_client_secret"
export GOOGLE_REDIRECT_URL="http://localhost:8080/api/auth/google/callback"
export GOOGLE_CALENDAR_SCOPES="https://www.googleapis.com/auth/calendar"
export ENCRYPTION_KEY="your_32_byte_encryption_key_in_hex"
```

### 2. 获取Google凭据

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建新项目或选择现有项目
3. 启用Google Calendar API
4. 创建OAuth 2.0客户端ID
5. 配置授权重定向URI

### 3. 基本使用示例

```go
package main

import (
    "context"
    "log"
    
    "ai-project-backend/services"
)

func main() {
    // 创建Google Calendar服务
    service := services.NewEnhancedGoogleCalendarService(true) // 启用调试模式
    
    // 生成授权URL
    state := "secure_random_state"
    authURL := service.GetAuthURL(state)
    log.Printf("Authorization URL: %s", authURL)
    
    // 用户授权后，使用授权码交换访问令牌
    ctx := context.Background()
    token, err := service.ExchangeCodeForToken(ctx, "authorization_code")
    if err != nil {
        log.Fatalf("Failed to exchange token: %v", err)
    }
    
    log.Printf("Access token obtained, expires at: %v", token.ExpiresAt)
}
```

## 环境配置

### 必需的环境变量

| 变量名 | 描述 | 示例值 |
|--------|------|--------|
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0客户端ID | `123456789-abcdef.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0客户端密钥 | `GOCSPX-your_client_secret` |
| `GOOGLE_REDIRECT_URL` | 授权回调URL | `http://localhost:8080/api/auth/google/callback` |
| `GOOGLE_CALENDAR_SCOPES` | 请求的权限范围 | `https://www.googleapis.com/auth/calendar` |
| `ENCRYPTION_KEY` | 用于Token加密的32字节密钥 | `0123456789abcdef...` (64位十六进制) |

### 可选的环境变量

| 变量名 | 描述 | 默认值 |
|--------|------|--------|
| `GOOGLE_PROJECT_ID` | Google Cloud项目ID | (从Client ID推断) |

### 配置验证

使用以下代码验证配置是否正确：

```go
import "ai-project-backend/config"

func validateConfig() error {
    if !config.IsGoogleConfigured() {
        return fmt.Errorf("Google Calendar is not properly configured")
    }
    
    googleConfig, err := config.LoadGoogleConfig()
    if err != nil {
        return fmt.Errorf("failed to load Google config: %v", err)
    }
    
    return config.ValidateGoogleConfig(googleConfig)
}
```

## OAuth 2.0认证流程

### 1. 发起授权请求

```http
POST /api/auth/google/initiate
Authorization: Bearer <jwt_token>
Content-Type: application/json

{}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "auth_url": "https://accounts.google.com/o/oauth2/auth?...",
    "state": "random_state_string"
  }
}
```

### 2. 处理授权回调

当用户完成授权后，Google会重定向到配置的回调URL：

```
GET /api/auth/google/callback?code=<authorization_code>&state=<state>
```

系统会自动：
- 验证state参数防止CSRF攻击
- 交换授权码获取访问令牌
- 加密存储令牌到数据库
- 获取用户的日历列表
- 设置默认同步配置

### 3. 检查连接状态

```http
GET /api/auth/google/status
Authorization: Bearer <jwt_token>
```

**响应:**
```json
{
  "success": true,
  "data": {
    "is_connected": true,
    "calendar_count": 3,
    "last_sync_time": "2025-08-05T10:30:00Z",
    "user_email": "user@example.com"
  }
}
```

### 4. 断开连接

```http
DELETE /api/auth/google/disconnect
Authorization: Bearer <jwt_token>
```

## API端点文档

### 认证端点

#### 发起Google认证
- **URL:** `/api/auth/google/initiate`
- **方法:** `POST`
- **认证:** JWT Bearer Token
- **描述:** 生成Google OAuth授权URL

#### Google回调处理
- **URL:** `/api/auth/google/callback`
- **方法:** `GET`
- **参数:** `code`, `state`
- **描述:** 处理Google授权回调

#### 获取连接状态
- **URL:** `/api/auth/google/status`
- **方法:** `GET`
- **认证:** JWT Bearer Token
- **描述:** 获取用户的Google Calendar连接状态

#### 断开Google连接
- **URL:** `/api/auth/google/disconnect`
- **方法:** `DELETE`
- **认证:** JWT Bearer Token
- **描述:** 断开用户的Google Calendar连接

### 日历管理端点

#### 获取日历列表
```http
GET /api/google/calendars
Authorization: Bearer <jwt_token>
```

#### 创建日历事件
```http
POST /api/google/calendars/{calendar_id}/events
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "summary": "Meeting with client",
  "description": "Discuss project requirements",
  "start_time": "2025-08-05T14:00:00Z",
  "end_time": "2025-08-05T15:00:00Z",
  "is_all_day": false,
  "attendees": ["client@example.com"]
}
```

#### 更新日历事件
```http
PUT /api/google/calendars/{calendar_id}/events/{event_id}
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "summary": "Updated meeting title",
  "start_time": "2025-08-05T15:00:00Z",
  "end_time": "2025-08-05T16:00:00Z"
}
```

#### 删除日历事件
```http
DELETE /api/google/calendars/{calendar_id}/events/{event_id}
Authorization: Bearer <jwt_token>
```

#### 获取事件列表
```http
GET /api/google/calendars/{calendar_id}/events?time_min=2025-08-01T00:00:00Z&time_max=2025-08-31T23:59:59Z&max_results=50
Authorization: Bearer <jwt_token>
```

## 服务层使用

### GoogleCalendarService

```go
import "ai-project-backend/services"

// 创建服务实例
service := services.NewGoogleCalendarService()

// 或者使用增强版服务（带重试和日志）
enhancedService := services.NewEnhancedGoogleCalendarService(true)
```

### 常用操作示例

#### 创建事件
```go
event := &services.GoogleCalendarEvent{
    Summary:     "Project Meeting",
    Description: "Discuss Q4 roadmap",
    StartTime:   time.Now(),
    EndTime:     time.Now().Add(time.Hour),
    IsAllDay:    false,
    Attendees:   []string{"team@company.com"},
}

createdEvent, err := service.CreateEvent(ctx, accessToken, calendarID, event)
if err != nil {
    log.Printf("Failed to create event: %v", err)
    return
}

log.Printf("Event created with ID: %s", createdEvent.ID)
```

#### 获取事件列表
```go
timeMin := time.Now()
timeMax := time.Now().AddDate(0, 1, 0) // 一个月后
maxResults := int64(100)

events, err := service.ListEvents(ctx, accessToken, calendarID, timeMin, timeMax, maxResults)
if err != nil {
    log.Printf("Failed to list events: %v", err)
    return
}

for _, event := range events {
    log.Printf("Event: %s (%s - %s)", event.Summary, 
        event.StartTime.Format("2006-01-02 15:04"), 
        event.EndTime.Format("2006-01-02 15:04"))
}
```

### Token刷新服务

```go
import "ai-project-backend/services"

// 创建Token刷新服务
refreshService := services.NewTokenRefreshService(
    enhancedGoogleService,
    googleAuthRepo,
    10*time.Minute, // 检查间隔
)

// 启动自动刷新
ctx := context.Background()
err := refreshService.Start(ctx)
if err != nil {
    log.Fatalf("Failed to start token refresh service: %v", err)
}

// 手动刷新特定用户的Token
result, err := refreshService.RefreshGoogleToken(ctx, userID)
if err != nil {
    log.Printf("Failed to refresh token for user %d: %v", userID, err)
} else {
    log.Printf("Token refreshed successfully for user %d", userID)
}

// 获取刷新统计
stats := refreshService.GetRefreshStats()
log.Printf("Refresh success rate: %.2f%%", stats.RefreshSuccessRate)
```

## 错误处理

### 常见错误类型

#### 1. 认证错误

```json
{
  "error": "invalid_token",
  "description": "The access token is invalid or expired"
}
```

**处理方式:**
- 检查Token是否过期
- 尝试使用refresh token刷新
- 如果刷新失败，要求用户重新授权

#### 2. 权限错误

```json
{
  "error": "insufficient_scope",
  "description": "Request requires higher privileges than provided"
}
```

**处理方式:**
- 检查请求的权限范围
- 确保用户已授予必要的权限
- 考虑请求额外的权限范围

#### 3. 配额限制

```json
{
  "error": "quotaExceeded",
  "description": "Too many requests"
}
```

**处理方式:**
- 实施指数退避重试策略
- 减少API调用频率
- 考虑批量操作以减少请求数

#### 4. 网络错误

```json
{
  "error": "network_error",
  "description": "Unable to connect to Google servers"
}
```

**处理方式:**
- 实施重试机制
- 检查网络连接
- 使用备用策略（如离线队列）

### 错误处理最佳实践

```go
func handleGoogleAPIError(err error) error {
    if err == nil {
        return nil
    }
    
    errStr := err.Error()
    
    // Token过期错误
    if strings.Contains(errStr, "invalid_token") || 
       strings.Contains(errStr, "token_expired") {
        return &TokenExpiredError{
            Message: "Google access token has expired",
            Code: "TOKEN_EXPIRED",
        }
    }
    
    // 配额限制错误
    if strings.Contains(errStr, "quotaExceeded") ||
       strings.Contains(errStr, "429") {
        return &QuotaExceededError{
            Message: "Google API quota exceeded",
            Code: "QUOTA_EXCEEDED",
            RetryAfter: time.Minute * 5,
        }
    }
    
    // 权限错误
    if strings.Contains(errStr, "insufficient_scope") {
        return &InsufficientScopeError{
            Message: "Insufficient permissions for this operation",
            Code: "INSUFFICIENT_SCOPE",
            RequiredScopes: []string{"https://www.googleapis.com/auth/calendar"},
        }
    }
    
    // 默认错误
    return &APIError{
        Message: "Google API request failed",
        Code: "API_ERROR",
        Cause: err,
    }
}
```

## 最佳实践

### 1. 安全性

#### Token安全存储
- 使用AES-256-GCM加密存储访问令牌
- 定期轮换加密密钥
- 在内存中限制Token的生命周期

```go
// 加密Token示例
encryptedToken, err := utils.Encrypt(accessToken)
if err != nil {
    return fmt.Errorf("failed to encrypt token: %v", err)
}

// 解密Token示例
accessToken, err := utils.Decrypt(encryptedToken)
if err != nil {
    return fmt.Errorf("failed to decrypt token: %v", err)
}
```

#### CSRF保护
- 在OAuth流程中使用随机state参数
- 验证回调中的state参数

```go
state, err := utils.GenerateSecureRandomString(32)
if err != nil {
    return fmt.Errorf("failed to generate state: %v", err)
}

// 存储state以便后续验证
storeOAuthState(userID, state)
```

### 2. 性能优化

#### Token管理
- 实施Token预刷新机制
- 使用Token池减少刷新频率
- 缓存用户的日历信息

```go
// 检查Token是否需要刷新（提前10分钟）
func needsRefresh(token *models.GoogleToken) bool {
    return time.Until(token.ExpiresAt) < 10*time.Minute
}
```

#### API调用优化
- 使用批量操作减少API调用
- 实施请求合并和去重
- 设置合理的超时时间

```go
// 批量创建事件
events, err := service.BatchCreateEvents(ctx, accessToken, calendarID, eventList)
if err != nil {
    log.Printf("Batch create failed: %v", err)
}
```

### 3. 可靠性

#### 重试策略
- 对临时错误实施指数退避重试
- 设置最大重试次数和总超时时间
- 区分可重试和不可重试的错误

```go
// 使用重试执行器
retryExecutor := utils.NewRetryExecutor(utils.GoogleAPIRetryConfig())
err := retryExecutor.Execute(ctx, func() error {
    return service.CreateEvent(ctx, accessToken, calendarID, event)
})
```

#### 监控和日志
- 记录所有API调用和响应时间
- 监控错误率和成功率
- 设置告警阈值

```go
// 启用详细日志记录
service := services.NewEnhancedGoogleCalendarService(true)
```

### 4. 用户体验

#### 优雅降级
- 在Google服务不可用时提供本地功能
- 显示清晰的错误消息
- 提供重试和重新连接选项

#### 同步状态反馈
- 显示同步进度和状态
- 提供同步历史记录
- 允许用户控制同步频率

## 故障排除

### 常见问题

#### 1. "invalid_client" 错误
**原因:** Client ID或Client Secret配置错误
**解决方案:**
- 验证Google Cloud Console中的凭据
- 检查环境变量是否正确设置
- 确保项目启用了Calendar API

#### 2. "redirect_uri_mismatch" 错误
**原因:** 重定向URI不匹配
**解决方案:**
- 在Google Cloud Console中添加正确的重定向URI
- 确保URI完全匹配（包括协议、域名、端口、路径）

#### 3. Token刷新失败
**原因:** Refresh token无效或过期
**解决方案:**
- 检查refresh token是否正确存储
- 验证用户是否撤销了授权
- 要求用户重新授权

#### 4. API配额超限
**原因:** 超过了Google API的使用配额
**解决方案:**
- 检查Google Cloud Console中的配额使用情况
- 实施请求限制和缓存策略
- 考虑申请更高的配额

### 调试工具

#### 启用调试日志
```go
service := services.NewEnhancedGoogleCalendarService(true)
```

#### 检查Token状态
```go
refreshService := services.NewTokenRefreshService(...)
status, err := refreshService.GetUserTokenStatus(ctx, userID)
```

#### 验证配置
```go
func debugConfiguration() {
    fmt.Printf("Google Client ID: %s\n", os.Getenv("GOOGLE_CLIENT_ID"))
    fmt.Printf("Redirect URL: %s\n", os.Getenv("GOOGLE_REDIRECT_URL"))
    fmt.Printf("Is Configured: %v\n", config.IsGoogleConfigured())
}
```

### 健康检查

实施定期健康检查来监控系统状态：

```go
func healthCheck() map[string]interface{} {
    return map[string]interface{}{
        "google_configured": config.IsGoogleConfigured(),
        "token_refresh_service": refreshService.IsRunning(),
        "last_api_call": getLastSuccessfulAPICall(),
        "error_rate": calculateErrorRate(),
    }
}
```

## 支持和反馈

如果您在使用过程中遇到问题或有改进建议，请：

1. 查看本文档的故障排除部分
2. 检查应用程序日志获取详细错误信息
3. 验证Google Cloud Console中的配置
4. 联系开发团队获取技术支持

## 版本历史

- **v1.0.0** - 初始版本，支持基本的OAuth流程和事件CRUD操作
- **v1.1.0** - 添加Token自动刷新和重试机制
- **v1.2.0** - 增强日志记录和错误处理
- **v1.3.0** - 添加批量操作和性能优化

---

*最后更新: 2025-08-05*