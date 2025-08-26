# RBAC权限管理系统

## 概述

本项目实现了完整的基于角色的访问控制（RBAC）权限管理系统，支持：

- 分层权限管理
- 角色继承和权限覆盖
- 项目级别权限控制
- 用户自定义权限
- 完整的审计日志
- 权限缓存优化

## 数据库架构

### 核心表结构

| 表名 | 说明 | 主要字段 |
|------|------|----------|
| `permissions` | 权限表 | permission_code, module, resource, action |
| `company_roles` | 角色表 | role_code, role_name, is_system_role |
| `role_permissions` | 角色权限关联 | role_id, permission_id, is_granted |
| `company_users` | 公司用户表 | name, email, role_id, custom_permissions |
| `company_user_project_permissions` | 用户项目权限 | company_user_id, project_id, 各种权限字段 |
| `permission_audit_logs` | 权限审计日志 | action_type, old_value, new_value |
| `permission_cache` | 权限缓存表 | cache_key, has_permission, expires_at |

### 权限层次结构

```
权限验证优先级（由高到低）：
1. 用户自定义权限 (custom_permissions)
2. 项目特定权限 (project_permissions)  
3. 角色继承权限 (role_permissions)
```

## 安装部署

### 1. 执行数据库迁移

```bash
# 设置数据库连接信息
export DB_HOST=localhost
export DB_PORT=5432  
export DB_NAME=ai_project
export DB_USER=postgres
export DB_PASSWORD=your_password

# 进入迁移目录
cd backend/migrations/026_rbac_permission_system

# 执行迁移脚本
./execute_migration.sh
```

### 2. 验证安装

迁移完成后，系统会自动验证：
- 所有表结构是否正确创建
- 基础权限和角色数据是否插入成功
- 视图是否创建成功

## 权限系统使用

### 默认角色说明

| 角色代码 | 角色名称 | 权限范围 |
|----------|----------|----------|
| `super_admin` | 超级管理员 | 所有系统权限 |
| `admin` | 系统管理员 | 大部分管理权限（除超级管理） |
| `company_admin` | 公司管理员 | 公司内部事务管理 |
| `project_manager` | 项目经理 | 项目和任务管理 |
| `team_lead` | 团队负责人 | 团队任务管理 |
| `developer` | 开发人员 | 开发任务执行 |
| `designer` | 设计师 | 设计相关任务 |
| `tester` | 测试人员 | 测试相关权限 |
| `business_analyst` | 业务分析师 | 需求分析权限 |
| `finance_manager` | 财务经理 | 财务管理权限 |
| `hr_manager` | HR经理 | 人力资源管理 |
| `client_user` | 客户用户 | 外部客户有限权限 |
| `guest` | 访客 | 最基础查看权限 |

### 权限代码格式

权限代码采用 `{module}.{resource}.{action}` 格式：

```
示例：
- system.users.create     (系统模块-用户资源-创建操作)
- project.basic.read      (项目模块-基础资源-读取操作)  
- task.time.log          (任务模块-时间资源-记录操作)
```

### API使用示例

#### 检查用户权限

```go
// 检查基础权限
result, err := repo.CheckUserPermission(ctx, userID, "project.create", nil)

// 检查项目特定权限  
result, err := repo.CheckUserPermission(ctx, userID, "task.update", &projectID)
```

#### 获取用户完整权限信息

```go
permissions, err := repo.GetUserPermissions(ctx, userID)
// 返回用户的角色权限、自定义权限、项目权限等完整信息
```

#### 设置用户角色

```go
err := repo.UpdateUserRole(ctx, userID, &roleID)
```

#### 设置自定义权限覆盖

```go
err := repo.SetUserPermissionOverride(ctx, userID, "task.delete", true, "特殊授权")
```

### 中间件集成

```go
// 权限验证中间件示例
func RequirePermission(permission string) gin.HandlerFunc {
    return func(c *gin.Context) {
        userID := getUserID(c) // 从JWT等获取用户ID
        projectID := getProjectID(c) // 如需要项目上下文
        
        result, err := permissionRepo.CheckUserPermission(
            c.Request.Context(), 
            userID, 
            permission, 
            projectID,
        )
        
        if err != nil || !result.HasPermission {
            c.JSON(403, gin.H{"error": "权限不足"})
            c.Abort()
            return
        }
        
        c.Next()
    }
}

// 路由中使用
router.POST("/api/projects", RequirePermission("project.create"), createProject)
router.DELETE("/api/tasks/:id", RequirePermission("task.delete"), deleteTask)
```

## 性能优化

### 1. Redis缓存配置

```go
// 缓存用户权限信息（推荐1小时过期）
key := fmt.Sprintf("user:permissions:%d", userID)
// 缓存格式: Set[permission_codes]
```

### 2. 批量权限检查

```go
// 一次检查多个权限
permissions := []string{"task.read", "task.update", "task.delete"}
results, err := repo.CheckMultiplePermissions(ctx, userID, permissions, &projectID)
```

### 3. 数据库索引优化

系统已自动创建必要索引：
- 权限代码索引
- 用户角色索引  
- 项目权限索引
- 审计日志时间索引

## 监控和调试

### 1. 权限调试视图

```sql
-- 查看用户的所有有效权限
SELECT * FROM v_user_permissions WHERE user_id = 123;

-- 查看角色的权限配置
SELECT * FROM v_role_permissions WHERE role_code = 'developer';

-- 查看项目权限分配
SELECT * FROM v_project_user_permissions WHERE project_id = 456;
```

### 2. 权限继承追踪

```go
// 获取权限解析的详细过程
trace, err := repo.GetPermissionInheritanceTrace(ctx, userID, "task.delete", &projectID)
// 返回权限在各个层级的解析过程
```

### 3. 权限冲突分析

```go
// 分析用户的权限冲突和冗余
analysis, err := repo.AnalyzePermissionConflicts(ctx, userID)
// 返回角色权限和自定义权限之间的冲突分析
```

### 4. 审计日志查询

```sql
-- 查看权限变更历史
SELECT * FROM permission_audit_logs 
WHERE target_user_id = 123 
ORDER BY performed_at DESC;
```

## 安全注意事项

### 1. 权限最小化原则
- 默认拒绝所有访问
- 只授予必要的最小权限
- 定期审查权限分配

### 2. 敏感操作保护
- 重要权限需要额外验证
- 记录所有权限变更
- 监控异常权限使用

### 3. 缓存安全
- 权限缓存设置合理过期时间
- 权限变更时及时清除缓存
- 使用版本机制保证缓存一致性

## 故障排除

### 常见问题

1. **用户无法访问资源**
   - 检查用户状态是否为active
   - 验证角色是否分配正确
   - 查看是否有自定义权限覆盖

2. **权限检查性能问题**  
   - 启用Redis缓存
   - 检查数据库索引
   - 使用批量权限检查

3. **权限不一致**
   - 清除相关缓存
   - 检查权限继承逻辑
   - 查看审计日志定位变更

### 调试命令

```sql
-- 检查用户的完整权限链
SELECT * FROM v_user_permissions WHERE user_email = 'user@example.com';

-- 查看角色权限配置
SELECT r.role_name, p.permission_code, p.permission_name 
FROM company_roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE r.role_code = 'developer';

-- 检查权限缓存状态
SELECT * FROM permission_cache WHERE company_user_id = 123;
```

## 扩展开发

### 1. 添加新权限

```sql
INSERT INTO permissions (permission_code, permission_name, permission_description, module, resource, action) 
VALUES ('reports.export', '导出报表', '导出各类报表数据', 'reports', 'export', 'create');
```

### 2. 创建自定义角色

```sql  
INSERT INTO company_roles (role_code, role_name, role_description) 
VALUES ('custom_role', '自定义角色', '根据业务需要创建的角色');

-- 分配权限
INSERT INTO role_permissions (role_id, permission_id) 
SELECT r.id, p.id 
FROM company_roles r, permissions p 
WHERE r.role_code = 'custom_role' AND p.permission_code IN ('task.read', 'project.read');
```

### 3. 多租户支持

如需支持多租户，可考虑：
- 在权限表中添加tenant_id字段
- 扩展角色表支持租户级别角色
- 修改权限检查逻辑加入租户隔离

---

## 技术支持

如有问题或建议，请联系开发团队或查看项目文档。