# 权限系统增强迁移

> **任务**: #625 - 开发数据库迁移脚本和种子数据  
> **创建时间**: 2025-08-27  
> **作者**: Claude AI  

## 概述

本迁移包对现有的RBAC权限系统进行了全面增强，添加了层级权限、上下文权限、动态权限规则等高级功能，并提供了完整的种子数据用于测试和演示。

## 迁移内容

### 1. 数据库结构增强 (`001_permission_system_enhancements.sql`)

#### 新增表结构

| 表名 | 描述 | 主要功能 |
|------|------|----------|
| `permission_hierarchy` | 权限层级关系表 | 支持权限继承和层级控制 |
| `dynamic_permission_rules` | 动态权限规则表 | 基于条件的权限分配 |
| `permission_contexts` | 权限上下文表 | 项目、部门、环境等上下文管理 |
| `user_context_permissions` | 用户上下文权限表 | 用户在特定上下文中的权限 |

#### 表结构增强

- **permissions表**: 添加分组、层级、过期时间等字段
- **role_permissions表**: 添加时间限制、条件、授权记录等字段
- **索引优化**: 新增多个性能优化索引

#### 视图和函数

- `user_effective_permissions`: 增强的用户权限视图（支持继承和上下文）
- `check_user_permission_enhanced()`: 高级权限检查函数
- `analyze_permission_coverage()`: 权限覆盖率分析函数

### 2. 权限系统种子数据 (`002_seed_enhanced_permissions.sql`)

#### 权限数据增强

- 为所有权限添加分组和元数据
- 创建权限层级关系
- 设置权限上下文环境
- 配置动态权限规则

#### 演示数据

- 10个权限上下文（项目、环境、部门等）
- 50+个权限层级关系
- 3个动态权限规则示例
- 增强的权限缓存数据

### 3. 用户和测试数据 (`003_seed_user_roles_and_test_data.sql`)

#### 测试用户账户

| 邮箱 | 角色 | 部门 | 描述 |
|------|------|------|------|
| admin@aiproj.com | 系统管理员 | IT | 系统管理员账户 |
| pm.zhang@aiproj.com | 项目经理 | 项目管理 | 项目管理职责 |
| dev.li@aiproj.com | 开发工程师 | 开发部 | 技术开发工作 |
| designer.wang@aiproj.com | UI设计师 | 设计部 | 界面设计工作 |
| tester.zhao@aiproj.com | 测试工程师 | QA部 | 质量保证测试 |
| finance.sun@aiproj.com | 财务专员 | 财务部 | 财务管理工作 |
| guest@aiproj.com | 访客用户 | 外部 | 有限访问权限 |
| temp.zhou@aiproj.com | 临时用户 | 外部 | 临时访问账户 |

#### 演示数据

- 3个演示项目（如果projects表存在）
- 4个演示任务（如果tasks表存在）
- 时间日志记录（如果时间跟踪表存在）
- 权限审计日志示例

## 安装指南

### 环境要求

- PostgreSQL 12+
- 已有的RBAC权限系统基础表
- psql命令行工具

### 数据库连接配置

设置以下环境变量（可选，有默认值）：

```bash
export DB_HOST=postgres-master        # 默认: postgres-master
export DB_PORT=5432                   # 默认: 5432
export DB_NAME=ai_project_db         # 默认: ai_project_db  
export DB_USER=dev_user              # 默认: dev_user
export DB_PASSWORD=dev_password_2024 # 默认: dev_password_2024
```

### 执行迁移

1. **进入迁移目录**
   ```bash
   cd backend/migrations/034_role_permission_enhancements
   ```

2. **执行迁移脚本**
   ```bash
   chmod +x execute_migration.sh
   ./execute_migration.sh
   ```

3. **查看执行结果**
   ```bash
   # 查看验证报告
   cat verification_report.txt
   
   # 查看迁移报告
   ls migration_report_*.md
   ```

### Docker环境执行

如果使用Docker开发环境：

```bash
# 确保数据库服务运行
docker-compose -f docker-compose.dev.yml up postgres-master -d

# 进入后端容器执行
docker exec -it ai_backend bash
cd /app/migrations/034_role_permission_enhancements
./execute_migration.sh
```

## 新功能详解

### 1. 层级权限控制

权限可以建立父子关系，父权限自动包含子权限：

```sql
-- 示例：项目管理员自动拥有项目相关的所有子权限
SELECT * FROM permission_hierarchy 
WHERE parent_permission_id = (
    SELECT id FROM permissions WHERE permission_code = 'project.admin'
);
```

### 2. 上下文权限管理

用户可以在特定上下文中获得额外权限：

```sql
-- 检查用户在特定项目中的权限
SELECT * FROM check_user_permission_enhanced(
    user_id := 123,
    permission_code := 'task.delete',
    context_id := 456  -- 项目上下文ID
);
```

### 3. 动态权限规则

基于条件的权限控制：

```sql
-- 示例：工作时间内才能修改任务
SELECT * FROM dynamic_permission_rules 
WHERE rule_name = 'Business Hours Task Access';
```

### 4. 增强的权限视图

新的权限视图包含所有权限来源：

```sql
-- 查看用户的所有有效权限
SELECT * FROM user_effective_permissions 
WHERE user_id = 123 
ORDER BY permission_source, permission_code;
```

## API集成示例

### Go后端集成

```go
// 使用增强的权限检查函数
func (r *PermissionRepository) CheckUserPermissionEnhanced(
    ctx context.Context, 
    userID int, 
    permissionCode string, 
    contextID *int,
) (*PermissionResult, error) {
    query := `
        SELECT has_permission, permission_source, granted_at, expires_at, conditions
        FROM check_user_permission_enhanced($1, $2, $3)
    `
    
    var result PermissionResult
    err := r.db.QueryRowContext(ctx, query, userID, permissionCode, contextID).Scan(
        &result.HasPermission,
        &result.Source,
        &result.GrantedAt,
        &result.ExpiresAt,
        &result.Conditions,
    )
    
    return &result, err
}
```

### 中间件使用

```go
// 权限验证中间件（支持上下文）
func RequirePermissionWithContext(permission string) gin.HandlerFunc {
    return func(c *gin.Context) {
        userID := getUserID(c)
        contextID := getContextID(c) // 从URL或header获取上下文ID
        
        result, err := permissionRepo.CheckUserPermissionEnhanced(
            c.Request.Context(), userID, permission, contextID,
        )
        
        if err != nil || !result.HasPermission {
            c.JSON(403, gin.H{"error": "权限不足"})
            c.Abort()
            return
        }
        
        // 将权限信息存入上下文
        c.Set("permission_result", result)
        c.Next()
    }
}
```

## 性能优化

### 索引优化

迁移自动创建了以下性能优化索引：

- 权限分组和层级索引
- 权限时效性索引  
- 上下文权限查询索引
- 动态规则优先级索引

### 缓存增强

权限缓存现在支持：

- 上下文相关的缓存键
- 权限来源标识
- 智能过期时间管理

### 查询优化建议

```sql
-- 高效的权限检查查询
SELECT has_permission FROM check_user_permission_enhanced(?, ?, ?);

-- 批量权限检查
SELECT permission_code, has_permission 
FROM user_effective_permissions 
WHERE user_id = ? AND permission_code = ANY(?);
```

## 监控和调试

### 权限分析工具

```sql
-- 权限覆盖率分析
SELECT * FROM analyze_permission_coverage() 
WHERE coverage_percentage < 10;

-- 权限使用统计
SELECT * FROM seed_data_verification;
SELECT * FROM user_role_seed_verification;
```

### 审计日志查询

```sql
-- 查看权限变更历史
SELECT * FROM permission_audit_logs 
WHERE action_type IN ('role_assigned', 'permission_granted')
ORDER BY performed_at DESC;
```

### 故障排除

1. **权限检查失败**
   - 检查用户状态和角色分配
   - 验证权限是否在有效期内
   - 查看权限继承关系

2. **性能问题**
   - 检查索引使用情况
   - 验证缓存命中率
   - 分析权限查询计划

## 回滚方案

如需回滚迁移：

```sql
-- 删除新增的表（注意顺序）
DROP TABLE IF EXISTS user_context_permissions CASCADE;
DROP TABLE IF EXISTS permission_contexts CASCADE;
DROP TABLE IF EXISTS dynamic_permission_rules CASCADE;
DROP TABLE IF EXISTS permission_hierarchy CASCADE;

-- 移除新增的列
ALTER TABLE permissions 
    DROP COLUMN IF EXISTS permission_group,
    DROP COLUMN IF EXISTS parent_permission_id,
    DROP COLUMN IF EXISTS level_order,
    DROP COLUMN IF EXISTS expires_at,
    DROP COLUMN IF EXISTS context_data,
    DROP COLUMN IF EXISTS metadata;

ALTER TABLE role_permissions
    DROP COLUMN IF EXISTS granted_at,
    DROP COLUMN IF EXISTS expires_at,
    DROP COLUMN IF EXISTS conditions,
    DROP COLUMN IF EXISTS granted_by,
    DROP COLUMN IF EXISTS revoked_at,
    DROP COLUMN IF EXISTS revoked_by,
    DROP COLUMN IF EXISTS revocation_reason;

-- 恢复原始视图
-- (根据备份恢复原始的user_effective_permissions视图)
```

## 安全注意事项

1. **测试用户安全**
   - 所有测试用户使用演示密码hash
   - 生产环境使用前必须重置密码
   - 建议删除不必要的测试用户

2. **权限规则验证**
   - 仔细审查动态权限规则
   - 测试权限继承逻辑
   - 验证上下文权限隔离

3. **数据保护**
   - 敏感权限操作需要额外审批
   - 重要操作自动记录审计日志
   - 定期检查权限分配合理性

## 支持和维护

### 日常维护

1. **权限数据清理**
   ```bash
   # 清理过期的权限缓存
   DELETE FROM permission_cache WHERE expires_at < CURRENT_TIMESTAMP;
   
   # 清理旧的审计日志
   DELETE FROM permission_audit_logs 
   WHERE performed_at < CURRENT_TIMESTAMP - INTERVAL '1 year';
   ```

2. **性能监控**
   - 定期检查权限查询性能
   - 监控缓存命中率
   - 分析权限使用模式

### 故障支持

如遇问题，请检查：

1. 迁移执行日志文件
2. 数据库错误日志
3. 权限验证报告
4. 种子数据加载结果

联系开发团队时请提供以上信息。

---

*文档最后更新: 2025-08-27*  
*相关任务: #625 - 开发数据库迁移脚本和种子数据*