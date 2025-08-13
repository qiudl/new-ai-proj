---
task_id: 216
title: "管道A：API Key数据库基础设施设计与实现"
status: "completed"
created_date: "2025-08-13 01:09:15"
updated_date: "2025-08-13 09:30:00"
---

# 管道A：API Key数据库基础设施设计与实现

## 任务描述
设计并实现API密钥管理系统的完整数据库基础设施，包括表结构、索引、触发器、视图和函数。

## 实施完成情况

### ✅ 已完成的数据库组件

#### 1. 核心数据表
- **`api_keys`** - API密钥主表，存储所有密钥信息
- **`api_usage_logs`** - API使用日志表，记录所有API请求详情
- **`api_quota_stats`** - API配额统计表，预聚合统计数据

#### 2. 枚举类型定义
- **`api_permission_type`** - API权限类型枚举 (12种权限类型)
- **`rate_limit_type`** - 速率限制窗口类型枚举 (4种时间窗口)

#### 3. 性能优化索引 (25个)
- **api_keys表索引** - 密钥哈希、前缀、活跃状态、过期时间等
- **api_usage_logs表索引** - 时间戳、端点、状态码、IP地址等
- **api_quota_stats表索引** - 密钥ID、日期、小时等
- **复合索引** - 常见查询模式优化

#### 4. 数据库函数
- **`update_updated_at_column()`** - 自动更新时间戳
- **`cleanup_old_api_logs()`** - 定期清理旧日志
- **`generate_api_key_prefix()`** - 生成密钥前缀
- **`check_api_quota()`** - 检查API配额限制

#### 5. 触发器
- **`update_api_keys_updated_at`** - API密钥表更新时间自动触发
- **`update_api_quota_stats_updated_at`** - 统计表更新时间自动触发

#### 6. 视图
- **`active_api_keys`** - 活跃API密钥视图
- **`api_usage_summary`** - API使用统计视图 (最近30天)
- **`high_error_endpoints`** - 高错误率端点视图

## 数据库架构特点

### 表结构设计
```sql
api_keys (主表)
├── 基本信息: id, name, description
├── 密钥数据: key_hash, key_prefix, secret_hash (安全哈希存储)
├── 权限控制: permissions[], scope_projects[], scope_users[]
├── 速率限制: rate_limit_count, rate_limit_window, daily_quota, monthly_quota
├── 状态管理: is_active, expires_at, last_used_at, usage_count
├── 安全信息: allowed_ips[], allowed_domains[], user_agent_pattern
├── 审计信息: created_by, created_at, updated_by, updated_at, deleted_at
└── 扩展数据: metadata (JSONB), tags[]

api_usage_logs (日志表)
├── 关联信息: api_key_id, user_id
├── 请求信息: endpoint, method, request_size, response_size
├── 网络信息: ip_address, user_agent, referer, x_forwarded_for[]
├── 时间信息: request_timestamp, response_timestamp, response_time_ms
├── 响应信息: response_status, response_type, error_message, error_code
├── 业务信息: action_type, resource_type, resource_id, project_id
├── 安全信息: rate_limited, blocked_reason, security_flags[]
├── 统计信息: quota_remaining, request_sequence
└── 元数据: request_headers (JSONB), request_params (JSONB), response_metadata (JSONB)

api_quota_stats (统计表)
├── 维度信息: api_key_id, stat_date, stat_hour
├── 计数统计: request_count, success_count, error_count, rate_limit_count
├── 性能统计: total_response_time_ms, avg_response_time_ms
├── 数据量统计: total_request_size, total_response_size
└── 时间信息: created_at, updated_at
```

### 权限系统设计
```sql
api_permission_type ENUM:
├── 'api.read'           -- 只读API访问
├── 'api.write'          -- 读写API访问
├── 'api.admin'          -- 管理员API访问
├── 'tasks.read'         -- 任务只读
├── 'tasks.write'        -- 任务读写
├── 'projects.read'      -- 项目只读
├── 'projects.write'     -- 项目读写
├── 'users.read'         -- 用户只读
├── 'users.write'        -- 用户读写
├── 'analytics.read'     -- 分析数据只读
├── 'analytics.write'    -- 分析数据读写
└── 'system.monitor'     -- 系统监控
```

### 速率限制系统
```sql
rate_limit_type ENUM:
├── 'per_minute'         -- 每分钟限制
├── 'per_hour'           -- 每小时限制
├── 'per_day'            -- 每日限制
└── 'per_month'          -- 每月限制
```

## 安全特性

### 数据安全
- **密钥哈希存储** - 不存储明文API密钥
- **软删除模式** - 保留审计记录
- **IP白名单支持** - inet[]数组类型
- **域名限制** - varchar[]数组类型
- **用户代理模式匹配** - 正则表达式支持

### 审计追踪
- **完整操作日志** - 所有API调用记录
- **用户关联** - 操作用户追踪
- **时间戳记录** - 创建/更新时间自动维护
- **关联ID追踪** - correlation_id和trace_id支持

## 性能优化

### 索引策略
- **单字段索引** - 常用查询字段 (key_hash, is_active等)
- **复合索引** - 多字段组合查询优化
- **条件索引** - 筛选条件优化 (WHERE子句)
- **GIN索引** - 数组和JSONB字段优化

### 分区支持
- **预留分区设计** - api_usage_logs表支持未来按时间分区
- **转换脚本示例** - 数据量增长后的分区迁移指导

### 查询优化
- **视图封装** - 常用查询模式预定义
- **统计预聚合** - api_quota_stats表减少实时计算
- **缓存友好** - 设计支持应用层缓存

## 权限集成

### 现有系统集成
- **permissions表集成** - 新增API相关权限
- **role_permissions表更新** - 管理员和管理者角色权限分配
- **向后兼容** - 不影响现有权限系统

### 权限分配
```sql
-- 管理员角色 (admin) - 完整API管理权限
api.keys.read, api.keys.create, api.keys.update, api.keys.delete
api.logs.read, api.quota.read, api.admin

-- 管理者角色 (manager) - 基础API权限
api.keys.read, api.logs.read, api.quota.read
```

## 数据清理和维护

### 自动清理功能
- **`cleanup_old_api_logs()`函数** - 可配置保留期 (默认90天)
- **审计日志记录** - 清理操作自动记录到audit_logs表
- **批量删除优化** - 高效的旧数据清理

### 监控和统计
- **预聚合统计** - api_quota_stats表支持快速查询
- **错误率监控** - high_error_endpoints视图
- **使用量分析** - api_usage_summary视图

## 扩展性设计

### 元数据支持
- **JSONB字段** - metadata, request_headers等灵活扩展
- **标签系统** - tags[]数组支持分类和搜索
- **自定义字段** - 未来功能扩展预留

### 国际化支持
- **注释文档** - 完整的中文注释说明
- **字段命名** - 英文标准命名规范
- **枚举值** - 标准化的权限和类型定义

## 完成交付物

### 数据库迁移文件
- **`020_api_management_system.sql`** - 完整的数据库迁移脚本 (415行)

### 关键组件清单
1. **3个核心数据表** - 完整的表结构定义
2. **2个枚举类型** - 权限和速率限制类型
3. **25个性能索引** - 查询优化索引
4. **4个数据库函数** - 业务逻辑和维护功能
5. **2个自动触发器** - 时间戳自动更新
6. **3个查询视图** - 常用查询封装
7. **完整的权限集成** - 与现有系统兼容

## 部署和测试

### 部署要求
- **PostgreSQL 16+** - 支持数组类型和JSONB
- **现有数据库权限** - CREATE TABLE, CREATE INDEX, CREATE FUNCTION权限
- **向后兼容性** - 不影响现有表结构

### 测试验证
- [x] 表结构创建成功
- [x] 索引优化验证
- [x] 函数逻辑测试
- [x] 触发器自动执行
- [x] 权限集成验证
- [x] 性能基准测试

## 完成状态

✅ **任务216已完成** - API Key数据库基础设施设计与实现

**完成时间**: 2025-08-13 09:30:00  
**数据库版本**: PostgreSQL 16+  
**迁移脚本**: `020_api_management_system.sql`  

**质量保证**:
- 符合PostgreSQL最佳实践
- 完整的性能优化设计
- 安全的数据存储模式
- 可扩展的架构设计
- 完善的文档和注释

---
*最后更新: 2025-08-13 09:30:00*