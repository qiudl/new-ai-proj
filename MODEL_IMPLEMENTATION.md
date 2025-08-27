# Model层实现说明

## 概述

已完成角色权限管理系统的Model层实现，包含完整的数据访问层和业务逻辑封装。

## 文件结构

```
src/models/
├── BaseModel.js           # 基础模型类 - 提供通用CRUD操作
├── User.js               # 用户模型 - 用户管理和认证
├── Role.js               # 角色模型 - 角色和权限管理  
├── Permission.js         # 权限模型 - 权限定义和操作
├── Enterprise.js         # 企业模型 - 企业信息管理
├── PermissionAuditLog.js # 审计日志模型 - 权限使用记录
└── index.js              # 统一导出和助手函数
```

## 核心特性

### 1. BaseModel 基础功能
- **完整CRUD操作**: create, read, update, delete, findAll, paginate
- **连接池管理**: MySQL连接池自动管理
- **事务支持**: beginTransaction, commit, rollback
- **软删除支持**: 可配置的软删除机制
- **类型转换**: 自动进行数据类型转换
- **字段过滤**: fillable字段控制和hidden字段隐藏
- **错误处理**: 统一的数据库错误处理和转换

### 2. User 用户模型
- **密码安全**: BCrypt + 盐值加密
- **登录认证**: 用户名/邮箱登录支持
- **账户保护**: 失败次数限制和账户锁定
- **角色管理**: 用户角色分配和撤销
- **权限查询**: 获取用户所有权限和权限检查
- **搜索功能**: 用户搜索和统计

### 3. Role 角色模型  
- **层级结构**: 支持角色继承和层级关系
- **权限分配**: 角色权限的分配和撤销
- **缓存机制**: 权限缓存提升查询性能
- **用户限制**: 角色用户数量限制检查
- **批量操作**: 批量权限分配支持

### 4. Permission 权限模型
- **权限验证**: 权限代码格式验证
- **层级支持**: 父子权限关系管理
- **分类管理**: 权限分类和风险级别
- **使用统计**: 权限使用情况分析
- **依赖检查**: 权限删除前的依赖关系检查

### 5. Enterprise 企业模型
- **企业管理**: 企业信息的CRUD操作
- **设置管理**: 企业级配置的存储和管理
- **用户统计**: 企业用户数量和分布统计
- **角色查询**: 获取企业可用角色列表

### 6. PermissionAuditLog 审计日志
- **操作记录**: 所有权限操作的完整记录
- **异常检测**: 异常访问模式识别
- **统计分析**: 权限使用统计和热力图
- **数据清理**: 历史数据自动清理

## 技术实现

### 数据库连接
```javascript
// 初始化数据库连接池
const { initializeDatabase } = require('./models');
initializeDatabase({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'password',
    database: 'ai_proj_db'
});
```

### 用户认证示例
```javascript
const { authenticateUser } = require('./models');

const result = await authenticateUser('admin', 'admin123', {
    ip_address: '127.0.0.1',
    user_agent: 'Mozilla/5.0...'
});

if (result.success) {
    console.log('登录成功:', result.user);
} else {
    console.log('登录失败:', result.message);
}
```

### 权限检查示例
```javascript
const { checkUserPermission } = require('./models');

const hasPermission = await checkUserPermission(1, 'USER', 'CREATE');
if (hasPermission) {
    // 允许创建用户
} else {
    // 拒绝访问
}
```

### 角色分配示例
```javascript
const { assignRoleToUser } = require('./models');

await assignRoleToUser(userId, roleId, assignedBy, {
    scopeType: 'ENTERPRISE',
    scopeId: enterpriseId,
    expiresAt: new Date('2025-12-31')
});
```

## 性能优化

### 1. 连接池管理
- 自动连接复用
- 连接数量限制
- 连接超时处理

### 2. 查询优化
- 索引友好的查询设计
- 分页查询支持  
- 条件查询优化

### 3. 缓存策略
- 权限结果缓存
- 角色权限缓存
- 查询结果缓存

### 4. 批量操作
- 批量插入支持
- 事务保护
- 批量权限分配

## 安全特性

### 1. SQL注入防护
- 参数化查询
- 输入验证
- 类型检查

### 2. 密码安全
- BCrypt加密
- 随机盐值
- 密码强度要求

### 3. 审计追踪
- 操作日志记录
- 权限变更追踪
- 异常行为检测

### 4. 访问控制
- 字段级权限控制
- 隐藏敏感字段
- 软删除保护

## 错误处理

### 1. 数据库错误转换
- 友好错误消息
- 错误类型识别
- 异常堆栈记录

### 2. 业务逻辑验证
- 输入参数验证
- 业务规则检查
- 依赖关系验证

### 3. 事务回滚
- 自动事务管理
- 错误时回滚
- 资源释放

## 扩展性设计

### 1. 模型继承
- BaseModel提供通用功能
- 子类扩展特定逻辑
- 接口一致性

### 2. 配置灵活性
- 可配置的软删除
- 可配置的时间戳
- 可配置的字段过滤

### 3. 插件机制
- 中间件支持
- 钩子函数
- 事件系统

Model层的实现为整个角色权限管理系统提供了坚实的数据访问基础，具备完整的功能、良好的性能和强大的安全性。
