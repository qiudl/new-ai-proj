# Migration 20251027_01: 添加基础权限

## 概述

本次迁移实现了基础权限系统，为所有认证用户提供核心功能访问权限，无需显式配置。

**关联任务**: #2862 - 实现任何用户拥有的基本权限

## 问题背景

### 当前痛点
1. **新用户体验差**: 新创建的用户默认没有任何权限，无法使用基本功能
2. **配置繁琐**: 管理员需要为每个用户手动分配基础权限
3. **权限混乱**: 不同角色的基础权限配置不一致
4. **数据库压力**: 大量重复的权限记录占用存储空间

### 设计目标
1. **简化用户体验** - 新用户无需配置即可使用基本功能
2. **数据隔离** - 虽然开放功能权限，但严格限制只能访问自己的数据
3. **向后兼容** - 不影响现有的权限系统和角色配置
4. **性能优化** - 使用白名单机制，减少数据库查询

## 迁移内容

### 1. 基础权限定义

共12个基础权限，覆盖5个核心模块：

#### Dashboard (1个权限)
- `dashboard.read` - 查看Dashboard首页

#### Profile - 个人中心 (3个权限)
- `profile.read` - 查看个人信息
- `profile.update` - 更新个人资料
- `password.change` - 修改密码

#### Work Note - 工作笔记 (4个权限)
- `work_note.create` - 创建工作笔记
- `work_note.read` - 查看自己的笔记
- `work_note.update` - 编辑自己的笔记
- `work_note.delete` - 删除自己的笔记

#### Timer - 计时器 (3个权限)
- `timer.start` - 启动计时器
- `timer.stop` - 停止计时器
- `timer.view` - 查看自己的计时记录

#### Statistics - 个人统计 (1个权限)
- `stats.view.own` - 查看个人统计信息

### 2. 数据库变更

#### 新增表
1. **base_permission_categories** - 基础权限分类表
   - 用于管理界面分组显示基础权限
   - 包含5个分类：dashboard, profile, work_note, timer, statistics

2. **permission_category_mappings** - 权限分类映射表
   - 关联权限和分类的多对多关系
   - 用于快速查询某分类下的所有权限

#### 表结构修改
- **permissions** 表新增字段：
  - `is_base_permission` - 标识是否为基础权限

#### 索引优化
- `idx_permissions_is_base_permission` - 基础权限查询索引
- `idx_permissions_module_name` - 模块名称索引
- `idx_permission_category_mappings_category_id` - 分类映射索引

### 3. 数据初始化
- 插入12个基础权限记录
- 插入5个权限分类记录
- 建立权限与分类的映射关系
- 标记现有权限的基础权限属性

## 技术实现

### 中间件层实现

修改 `middleware/role_permission_middleware.go`：

```go
// 1. 在getRoleContext中自动添加基础权限
basePerms := constants.GetBasePermissions()
for _, basePerm := range basePerms {
    if !contains(roleCtx.Permissions, basePerm) {
        roleCtx.Permissions = append(roleCtx.Permissions, basePerm)
    }
}

// 2. 在validateAdditionalRequirements中优先检查基础权限
if constants.IsBasePermission(requiredPerm) {
    hasPermission = true // 直接放行
}
```

### 常量层实现

创建 `constants/permissions.go`：

```go
// 定义12个基础权限常量
var BasePermissions = []string{
    "dashboard.read",
    "profile.read",
    "profile.update",
    "password.change",
    "work_note.create",
    "work_note.read",
    "work_note.update",
    "work_note.delete",
    "timer.start",
    "timer.stop",
    "timer.view",
    "stats.view.own",
}

// O(1)查询优化
var BasePermissionSet map[string]bool

// 判断是否为基础权限
func IsBasePermission(permission string) bool {
    return BasePermissionSet[permission]
}
```

## 执行方式

### 1. 自动执行（推荐）

如果项目使用自动迁移工具，将自动执行：

```bash
# Go migrate
migrate -path ./migrations -database "postgres://..." up

# 或使用项目自带的迁移脚本
./scripts/migrate.sh up
```

### 2. 手动执行

```bash
# 应用迁移
psql -h localhost -U ai_prod_user -d ai_project_prod -f up.sql

# 回滚迁移（如果需要）
psql -h localhost -U ai_prod_user -d ai_project_prod -f down.sql
```

### 3. 通过SSH隧道执行（远程数据库）

```bash
# 启动隧道
./scripts/tunnel.sh start

# 执行迁移
PGPASSWORD='SecureAI2024!@#$%^' psql -h 127.0.0.1 -p 5433 -U ai_prod_user -d ai_project_prod -f up.sql

# 停止隧道
./scripts/tunnel.sh stop
```

## 验证步骤

### 1. 验证权限创建

```sql
-- 查询基础权限数量（应该是12）
SELECT COUNT(*) FROM permissions WHERE is_base_permission = TRUE;

-- 查看基础权限列表
SELECT permission_code, permission_name, module_name, description
FROM permissions
WHERE is_base_permission = TRUE
ORDER BY module_name, permission_code;
```

### 2. 验证分类创建

```sql
-- 查询权限分类数量（应该是5）
SELECT COUNT(*) FROM base_permission_categories;

-- 查看分类及其权限数量
SELECT c.category_name, COUNT(m.permission_id) as permission_count
FROM base_permission_categories c
LEFT JOIN permission_category_mappings m ON c.id = m.category_id
GROUP BY c.id, c.category_name
ORDER BY c.display_order;
```

### 3. 验证中间件集成

创建测试用户并测试基础权限：

```sql
-- 创建测试用户（没有任何角色权限）
INSERT INTO users (username, email, password_hash, user_type, role)
VALUES ('test_base_user', 'test@example.com', 'hash', 'enterprise', 'enterprise_user')
RETURNING id;
```

然后通过API测试基础权限是否生效：

```bash
# 获取token
TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test_base_user","password":"..."}' \
  | jq -r '.data.token')

# 测试dashboard访问（应该成功）
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/dashboard

# 测试工作笔记创建（应该成功）
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"测试笔记","content":"测试内容"}' \
  http://localhost:8080/api/v1/work-notes
```

### 4. 性能测试

```bash
# 测试权限检查性能
go test -bench=BenchmarkIsBasePermission ./constants
```

## 回滚策略

### 安全回滚（推荐）

执行 `down.sql` 脚本，只删除元数据，保留权限记录：

```bash
psql -h localhost -U ai_prod_user -d ai_project_prod -f down.sql
```

回滚后：
- ✅ 删除权限分类和映射关系
- ✅ 移除基础权限标识
- ✅ 删除相关索引
- ⚠️ 保留权限记录（可能被角色使用）
- ⚠️ 保留 `is_base_permission` 字段

### 完全回滚（谨慎）

如果确认基础权限未被使用，可以完全删除：

1. 编辑 `down.sql`，取消注释删除语句
2. 执行回滚脚本

## 影响范围

### ✅ 积极影响
1. **用户体验提升** - 新用户可立即使用核心功能
2. **管理成本降低** - 减少权限配置工作量
3. **数据一致性** - 统一的基础权限配置
4. **性能优化** - 减少不必要的数据库查询

### ⚠️ 需要注意
1. **数据隔离** - 必须确保Repository层实现了正确的数据隔离逻辑
2. **API鉴权** - 需要在API层验证用户只能访问自己的数据
3. **审计日志** - 基础权限的使用也应该记录审计日志

### 🔍 后续验证
1. 测试新用户能否正常使用基础功能
2. 验证数据隔离是否生效（用户不能访问他人数据）
3. 检查审计日志是否正常记录
4. 性能测试，确保没有引入新的性能瓶颈

## 相关文档

- **设计文档**: `/backend/docs/base-permissions-design.md`
- **测试计划**: `/backend/docs/base-permissions-test-plan.md`
- **常量定义**: `/backend/constants/permissions.go`
- **中间件实现**: `/backend/middleware/role_permission_middleware.go`
- **前端常量**: `/frontend/src/constants/permissions.ts`

## 问题排查

### Q1: 迁移执行失败，提示权限已存在

**原因**: 部分权限可能在之前的迁移中已创建

**解决**: 使用 `ON CONFLICT` 子句自动处理冲突（已在up.sql中实现）

### Q2: 用户仍然无法访问基础功能

**检查清单**:
1. 确认迁移已成功执行
2. 检查中间件是否已重启（加载新代码）
3. 验证缓存是否已清空
4. 检查用户token是否过期

**排查命令**:
```bash
# 检查权限是否创建
psql -c "SELECT COUNT(*) FROM permissions WHERE is_base_permission = TRUE;"

# 检查中间件版本
curl http://localhost:8080/api/v1/health

# 清空权限缓存
curl -X POST http://localhost:8080/api/v1/admin/clear-cache
```

### Q3: 性能下降

**原因**: 每次请求都会添加基础权限到用户权限列表

**优化**:
1. 已使用map进行O(1)查询
2. 已启用权限缓存（15分钟TTL）
3. 可考虑使用Redis缓存进一步优化

## 作者与维护

- **作者**: Claude Code AI
- **创建日期**: 2025-10-27
- **维护团队**: 后端开发团队
- **问题反馈**: 提交issue到项目仓库

## 版本历史

- **v1.0.0** (2025-10-27) - 初始版本，实现基础权限系统
  - 添加12个基础权限
  - 创建权限分类系统
  - 集成中间件自动添加逻辑
