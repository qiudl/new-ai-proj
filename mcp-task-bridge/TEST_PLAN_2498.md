# MCP远端连接和Token管理功能测试方案

## 任务信息
- **任务ID**: 2498
- **任务标题**: 测试MCP远端连接和服务账号Token生成
- **测试重点**: 使用新开发的Token持久化、加密和监控功能

## 测试目标

1. 验证MCP Bridge与远端服务器（152.136.104.251）的连接性
2. 测试使用`dev_quick_login`生成Token的完整流程
3. 验证Token持久化和加密存储功能
4. 测试Token自动刷新机制
5. 验证Token监控和健康检查功能
6. 确保所有新功能在生产环境正常工作

## 测试环境

### 远端服务器
- **地址**: 152.136.104.251
- **后端API**: http://localhost:8080/api/v1（Docker内部）
- **后端容器**: ai_backend_prod (new-ai-proj-backend)
- **状态**: 运行中 (healthy)

### 本地环境
- **MCP Bridge**: mcp-task-bridge
- **配置文件**: .env.production
- **API地址**: http://new-ai-proj-backend:8080/api/v1

## 测试用例设计

### 测试组1: 基础连接测试

#### TC-001: 远端服务器连接性测试
**目的**: 验证能够连接到远端服务器并访问后端服务

**测试步骤**:
1. SSH连接到远端服务器
2. 检查Docker容器状态
3. 测试健康检查接口
4. 验证数据库连接

**预期结果**:
- SSH连接成功
- 后端容器状态为healthy
- 健康检查返回200
- 数据库连接正常

#### TC-002: API基础接口测试
**目的**: 验证基础API接口可访问

**测试步骤**:
1. 调用dev_quick_login接口（未认证）
2. 获取JWT Token
3. 使用Token调用用户信息接口

**预期结果**:
- dev_quick_login成功返回Token
- Token格式正确（JWT）
- 可使用Token访问受保护接口

### 测试组2: Token生成和持久化测试

#### TC-003: dev_quick_login Token生成测试
**目的**: 测试使用dev_quick_login生成Token，并验证新的Token管理功能

**测试步骤**:
1. 清空现有的持久化Token
2. 调用`devQuickLogin('admin')`
3. 检查返回的Token结构
4. 验证Token包含refresh_token
5. 检查TokenState是否正确初始化

**预期结果**:
```javascript
{
  success: true,
  data: {
    context: {
      userId: 1,
      username: 'admin',
      userRole: 'admin',
      userType: 'system',
      isSuperAdmin: true
    },
    tokenState: {
      expiresAt: '2025-10-04T...',
      hasRefreshToken: true
    }
  },
  message: '用户 admin 登录成功',
  token: 'eyJhbGc...'
}
```

#### TC-004: Token持久化存储测试
**目的**: 验证Token自动持久化到加密文件

**测试步骤**:
1. 生成Token后立即检查持久化文件
2. 验证文件位置：`~/.mcp-task-bridge/token-storage.enc`
3. 验证文件权限为600
4. 尝试读取文件内容（应该是加密的）
5. 验证加密密钥文件：`~/.mcp-task-bridge/.encryption-key`

**预期结果**:
- 文件自动创建在正确位置
- 文件权限为600（仅用户可读写）
- 文件内容为Base64编码的加密数据
- 加密密钥文件存在且权限为600

#### TC-005: Token加载和解密测试
**目的**: 验证重启后能正确加载和解密Token

**测试步骤**:
1. 生成Token并持久化
2. 模拟进程重启（创建新的BaseClient实例）
3. 等待异步加载完成
4. 检查Token是否正确加载
5. 使用加载的Token调用API

**预期结果**:
- Token正确从持久化存储加载
- 解密成功，数据完整
- 可使用加载的Token正常调用API
- 监控日志记录TOKEN_LOADED事件

### 测试组3: Token自动刷新测试

#### TC-006: Token过期检测测试
**目的**: 验证能正确检测Token即将过期

**测试步骤**:
1. 生成一个即将过期的Token（修改expiresAt）
2. 调用ensureValidToken()
3. 检查是否触发刷新逻辑

**预期结果**:
- 检测到Token即将过期（距离过期 < 60秒）
- 自动触发refreshAccessToken()
- 监控日志记录REFRESH_STARTED事件

#### TC-007: Token自动刷新成功测试
**目的**: 验证Token自动刷新流程

**测试步骤**:
1. 设置一个即将过期的Token
2. 发起任意API请求
3. 观察Token刷新过程
4. 检查新Token是否持久化
5. 验证监控统计数据

**预期结果**:
- 请求前自动刷新Token
- 刷新成功获得新的access_token和refresh_token
- 新Token自动持久化
- 监控日志记录：
  - REFRESH_STARTED
  - REFRESH_SUCCESS
  - TOKEN_PERSISTED
- 统计数据正确更新

#### TC-008: Token刷新失败处理测试
**目的**: 验证刷新失败时的错误处理

**测试步骤**:
1. 使用一个无效的refresh_token
2. 触发刷新流程
3. 观察错误处理
4. 检查监控告警

**预期结果**:
- 刷新失败，记录REFRESH_FAILED或REFRESH_EXPIRED事件
- 清除持久化Token
- 监控统计更新失败次数
- 可能触发告警（连续失败）

### 测试组4: 监控和健康检查测试

#### TC-009: 事件记录测试
**目的**: 验证所有Token事件都被正确记录

**测试步骤**:
1. 执行完整的Token生命周期
2. 检查监控日志文件
3. 验证所有事件都被记录

**预期结果**:
日志文件 `~/.mcp-task-bridge/token-refresh.log` 包含：
- TOKEN_LOADED事件
- REFRESH_STARTED事件
- REFRESH_SUCCESS事件
- TOKEN_PERSISTED事件
- 每个事件包含时间戳、状态、元数据

#### TC-010: 统计信息测试
**目的**: 验证Token刷新统计功能

**测试步骤**:
1. 执行多次Token刷新（成功和失败）
2. 调用`getTokenRefreshStats()`
3. 验证统计数据准确性

**预期结果**:
```javascript
{
  totalRefreshes: N,
  successfulRefreshes: M,
  failedRefreshes: K,
  lastSuccessTime: '2025-10-03T...',
  lastFailureTime: '2025-10-03T...',
  consecutiveFailures: 0,
  averageRefreshDuration: XXX,  // 毫秒
  uptime: XXX  // 秒
}
```

#### TC-011: 健康检查测试
**目的**: 验证Token健康检查功能

**测试步骤**:
1. 在正常状态下执行健康检查
2. 模拟连续失败场景
3. 执行健康检查
4. 验证状态和建议

**预期结果**:
- 正常状态: status = 'healthy'
- 连续失败1次: status = 'warning'
- 连续失败≥3次: status = 'critical'
- 提供问题诊断和解决建议

#### TC-012: 告警机制测试
**目的**: 验证告警触发机制

**测试步骤**:
1. 模拟连续失败3次
2. 检查告警日志
3. 模拟高失败率场景
4. 检查告警日志

**预期结果**:
- 连续失败3次触发告警：`[ALERT] [consecutive_failures]`
- 失败率≥50%触发告警：`[ALERT] [high_failure_rate]`
- 告警信息记录到日志文件

### 测试组5: 集成测试

#### TC-013: 完整流程端到端测试
**目的**: 验证从连接到Token管理的完整流程

**测试步骤**:
1. 清空所有缓存和持久化数据
2. 创建新的Client实例
3. 调用dev_quick_login
4. 执行一系列API操作
5. 模拟进程重启
6. 继续执行API操作
7. 等待Token接近过期
8. 验证自动刷新
9. 检查所有监控数据

**预期结果**:
- 整个流程无错误
- Token正确持久化和恢复
- 自动刷新正常工作
- 监控数据完整准确

#### TC-014: 并发刷新测试
**目的**: 验证并发请求时不会重复刷新

**测试步骤**:
1. 设置Token即将过期
2. 同时发起多个API请求
3. 观察刷新行为
4. 检查监控统计

**预期结果**:
- 只执行一次刷新
- 其他请求等待刷新完成
- 监控统计只记录一次刷新
- 所有请求最终成功

## 测试脚本结构

### test-remote-connection.ts
```typescript
// 测试远端连接和基础API
- 连接测试
- 健康检查
- 基础API调用
```

### test-token-management.ts
```typescript
// 测试Token生成、持久化、刷新
- dev_quick_login测试
- 持久化测试
- 加密测试
- 自动刷新测试
```

### test-token-monitoring.ts
```typescript
// 测试监控功能（已有）
- 事件记录
- 统计信息
- 健康检查
- 告警机制
```

### test-e2e-integration.ts
```typescript
// 端到端集成测试
- 完整流程测试
- 并发测试
- 压力测试
```

## 测试执行计划

### 阶段1: 准备工作
1. 确认远端服务器可访问
2. 检查后端服务状态
3. 清理测试环境

### 阶段2: 基础测试
1. 执行测试组1（连接测试）
2. 执行测试组2（Token生成和持久化）

### 阶段3: 功能测试
1. 执行测试组3（Token自动刷新）
2. 执行测试组4（监控和健康检查）

### 阶段4: 集成测试
1. 执行测试组5（集成测试）

### 阶段5: 测试报告
1. 收集测试结果
2. 分析监控日志
3. 生成测试报告
4. 记录问题和改进建议

## 成功标准

### 必须通过
- ✅ 远端连接成功
- ✅ Token生成成功
- ✅ Token持久化和加密正常
- ✅ Token自动加载正常
- ✅ Token自动刷新正常
- ✅ 监控事件正确记录
- ✅ 统计数据准确

### 建议通过
- ✅ 健康检查功能正常
- ✅ 告警机制正常
- ✅ 并发处理正常
- ✅ 错误处理正常

## 测试数据

### 测试账号
- **用户名**: admin
- **角色**: admin
- **类型**: system

### 测试环境
- **远端服务器**: 152.136.104.251
- **API端点**: http://new-ai-proj-backend:8080/api/v1
- **数据库**: PostgreSQL (ai_project_db)

## 风险和注意事项

1. **网络稳定性**: 远端连接依赖网络，可能存在超时
2. **Token过期时间**: refresh_token默认30天，需要足够的测试时间
3. **并发问题**: 需要确保并发刷新不会产生竞态条件
4. **文件权限**: 确保持久化文件的权限设置正确
5. **加密密钥**: 密钥丢失将导致无法解密Token

## 测试输出

### 日志文件
- `~/.mcp-task-bridge/token-refresh.log` - 监控日志
- `~/.mcp-task-bridge/token-storage.enc` - 持久化Token
- `~/.mcp-task-bridge/.encryption-key` - 加密密钥

### 测试报告
- 测试执行总结
- 各测试用例结果
- 监控数据分析
- 问题和建议

## 后续工作

根据测试结果：
1. 修复发现的问题
2. 优化性能瓶颈
3. 完善错误处理
4. 更新文档
5. 部署到生产环境
