# 企业组织架构权限集成方案

## 概述

本方案设计了企业管理员在组织架构管理模块中的权限控制体系，确保企业管理员能够在其权限范围内自主管理企业用户、组织部门、岗位和角色，同时保证系统安全性和数据隔离。

## 权限模型设计

### 1. 权限层级结构

```
企业权限 (Company Level)
├── 组织管理权限 (Organization Management)
│   ├── 部门管理 (Department Management)
│   │   ├── department.create    # 创建部门
│   │   ├── department.read      # 查看部门
│   │   ├── department.update    # 更新部门信息
│   │   ├── department.delete    # 删除部门
│   │   └── department.manage    # 管理部门（包含所有操作）
│   ├── 岗位管理 (Position Management)
│   │   ├── position.create      # 创建岗位
│   │   ├── position.read        # 查看岗位
│   │   ├── position.update      # 更新岗位信息
│   │   ├── position.delete      # 删除岗位
│   │   └── position.manage      # 管理岗位（包含所有操作）
│   └── 员工分配 (Employee Assignment)
│       ├── assignment.create    # 创建员工分配
│       ├── assignment.read      # 查看员工分配
│       ├── assignment.update    # 更新员工分配
│       ├── assignment.delete    # 删除员工分配
│       └── assignment.transfer  # 员工调动
└── 用户管理权限 (User Management)
    ├── company_user.create      # 创建企业用户
    ├── company_user.read        # 查看企业用户
    ├── company_user.update      # 更新企业用户
    ├── company_user.delete      # 删除企业用户
    ├── company_user.activate    # 激活/停用用户
    └── company_user.password    # 重置用户密码
```

### 2. 角色权限配置

#### 企业管理员 (company_admin) 权限
```json
{
  "role_code": "company_admin",
  "permissions": [
    "department.manage",
    "position.manage", 
    "assignment.manage",
    "company_user.create",
    "company_user.read",
    "company_user.update",
    "company_user.activate",
    "company_user.password"
  ],
  "restrictions": {
    "scope": "company_only",
    "data_isolation": true,
    "max_users": 100
  }
}
```

#### 企业普通用户 (company_user) 权限
```json
{
  "role_code": "company_user",
  "permissions": [
    "department.read",
    "position.read",
    "assignment.read",
    "company_user.read"
  ],
  "restrictions": {
    "scope": "assigned_departments_only",
    "data_isolation": true
  }
}
```

## 数据隔离机制

### 1. 企业级数据隔离

所有组织架构相关操作都必须在企业范围内进行：

```go
// 中间件：企业数据隔离
func CompanyDataIsolationMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        userCompanyID := getUserCompanyID(c)
        requestedCompanyID := getRequestedCompanyID(c)
        
        // 系统用户可以访问任何企业数据
        if isSystemUser(c) {
            c.Next()
            return
        }
        
        // 企业用户只能访问自己企业的数据
        if userCompanyID != requestedCompanyID {
            c.JSON(403, gin.H{"error": "Access denied: Cross-company access not allowed"})
            c.Abort()
            return
        }
        
        c.Next()
    }
}
```

### 2. 部门级权限控制

企业用户可以被分配特定部门的管理权限：

```sql
-- 部门权限表
CREATE TABLE department_permissions (
    id SERIAL PRIMARY KEY,
    company_user_id INTEGER NOT NULL REFERENCES company_users(id),
    department_id INTEGER NOT NULL REFERENCES company_departments(id),
    permissions TEXT[] NOT NULL, -- ['read', 'update', 'manage_employees']
    granted_by INTEGER REFERENCES company_users(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

### 3. 权限验证函数

```go
// 检查用户是否有特定权限
func HasOrganizationPermission(userID int, companyID int, permission string, resourceID *int) bool {
    // 1. 检查用户角色权限
    if hasRolePermission(userID, permission) {
        return true
    }
    
    // 2. 检查部门级权限
    if resourceID != nil {
        return hasDepartmentPermission(userID, *resourceID, permission)
    }
    
    // 3. 检查企业级权限
    return hasCompanyPermission(userID, companyID, permission)
}
```

## API权限控制

### 1. 权限验证中间件

```go
// 组织架构权限中间件
func OrganizationPermissionMiddleware(requiredPermission string) gin.HandlerFunc {
    return func(c *gin.Context) {
        userID := getUserID(c)
        companyID := getCompanyIDFromPath(c)
        resourceID := getResourceIDFromPath(c)
        
        if !HasOrganizationPermission(userID, companyID, requiredPermission, resourceID) {
            c.JSON(403, gin.H{
                "error": "Insufficient permissions",
                "required_permission": requiredPermission
            })
            c.Abort()
            return
        }
        
        c.Next()
    }
}
```

### 2. API路由权限配置

```go
// 部门管理路由
companyGroup := router.Group("/api/v1/companies/:companyId")
companyGroup.Use(CompanyDataIsolationMiddleware())
{
    // 部门管理
    deptGroup := companyGroup.Group("/departments")
    {
        deptGroup.GET("", OrganizationPermissionMiddleware("department.read"), handler.GetDepartments)
        deptGroup.POST("", OrganizationPermissionMiddleware("department.create"), handler.CreateDepartment)
        deptGroup.PUT("/:id", OrganizationPermissionMiddleware("department.update"), handler.UpdateDepartment)
        deptGroup.DELETE("/:id", OrganizationPermissionMiddleware("department.delete"), handler.DeleteDepartment)
    }
    
    // 岗位管理
    posGroup := companyGroup.Group("/positions")
    {
        posGroup.GET("", OrganizationPermissionMiddleware("position.read"), handler.GetPositions)
        posGroup.POST("", OrganizationPermissionMiddleware("position.create"), handler.CreatePosition)
        posGroup.PUT("/:id", OrganizationPermissionMiddleware("position.update"), handler.UpdatePosition)
        posGroup.DELETE("/:id", OrganizationPermissionMiddleware("position.delete"), handler.DeletePosition)
    }
    
    // 用户管理
    userGroup := companyGroup.Group("/users")
    {
        userGroup.GET("", OrganizationPermissionMiddleware("company_user.read"), handler.GetCompanyUsers)
        userGroup.POST("", OrganizationPermissionMiddleware("company_user.create"), handler.CreateCompanyUser)
        userGroup.PUT("/:id", OrganizationPermissionMiddleware("company_user.update"), handler.UpdateCompanyUser)
    }
}
```

## 前端权限控制

### 1. 权限上下文

```typescript
// 权限上下文
interface OrganizationPermissions {
  canManageDepartments: boolean;
  canCreateDepartments: boolean;
  canManagePositions: boolean;
  canCreatePositions: boolean;
  canManageUsers: boolean;
  canCreateUsers: boolean;
  departmentPermissions: Record<number, string[]>; // 部门ID -> 权限列表
}

const OrganizationPermissionContext = React.createContext<OrganizationPermissions>({
  canManageDepartments: false,
  canCreateDepartments: false,
  canManagePositions: false,
  canCreatePositions: false,
  canManageUsers: false,
  canCreateUsers: false,
  departmentPermissions: {}
});
```

### 2. 权限钩子

```typescript
// 权限检查钩子
const useOrganizationPermissions = () => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<OrganizationPermissions>();
  
  useEffect(() => {
    if (user && user.user_type === 'company') {
      loadUserPermissions(user.id).then(setPermissions);
    }
  }, [user]);
  
  const hasPermission = (permission: string, resourceId?: number) => {
    if (!permissions) return false;
    
    // 检查全局权限
    if (permissions[`can${permission}` as keyof OrganizationPermissions]) {
      return true;
    }
    
    // 检查资源特定权限
    if (resourceId && permissions.departmentPermissions[resourceId]) {
      return permissions.departmentPermissions[resourceId].includes(permission);
    }
    
    return false;
  };
  
  return { permissions, hasPermission };
};
```

### 3. 权限控制组件

```typescript
// 权限控制组件
const PermissionGuard: React.FC<{
  permission: string;
  resourceId?: number;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}> = ({ permission, resourceId, fallback = null, children }) => {
  const { hasPermission } = useOrganizationPermissions();
  
  if (!hasPermission(permission, resourceId)) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
};

// 使用示例
<PermissionGuard permission="createDepartments">
  <Button type="primary" icon={<PlusOutlined />}>
    新建部门
  </Button>
</PermissionGuard>
```

## 企业用户创建流程

### 1. 权限验证

企业管理员创建用户前需要验证：
- 是否有 `company_user.create` 权限
- 是否在用户数量限制内
- 是否只能创建企业用户角色

### 2. 创建流程

```typescript
const createCompanyUser = async (userData: CompanyUserCreateData) => {
  // 1. 权限检查
  if (!hasPermission('company_user.create')) {
    throw new Error('权限不足');
  }
  
  // 2. 数据验证
  const validatedData = {
    ...userData,
    company_id: currentUser.company_id, // 强制设置为当前企业
    user_type: 'company', // 强制设置为企业用户
    role: validateCompanyRole(userData.role) // 验证角色有效性
  };
  
  // 3. API调用
  const response = await api.post('/api/v1/companies/current/users', validatedData);
  
  // 4. 处理响应
  if (response.data.success) {
    message.success('用户创建成功');
    // 显示临时密码
    showTemporaryPassword(response.data.temporary_password);
  }
};
```

### 3. 角色分配限制

```go
// 验证企业用户角色
func ValidateCompanyUserRole(userType, role string, creatorRole string) error {
    // 企业用户只能创建企业角色
    if userType == "company" {
        validRoles := []string{"company_admin", "company_user"}
        if !contains(validRoles, role) {
            return fmt.Errorf("invalid role for company user: %s", role)
        }
        
        // 普通企业用户不能创建企业管理员
        if creatorRole == "company_user" && role == "company_admin" {
            return fmt.Errorf("insufficient privileges to create admin user")
        }
    }
    
    return nil
}
```

## 安全措施

### 1. 审计日志

所有组织架构变更都需要记录审计日志：

```go
func LogOrganizationChange(ctx context.Context, userID int, changeType string, entityType string, entityID int, oldData, newData interface{}, reason string) {
    logEntry := OrganizationChangeHistory{
        CompanyID:         getCompanyID(ctx),
        ChangeType:        changeType,
        EntityType:        entityType,
        EntityID:          entityID,
        OldData:           toJSON(oldData),
        NewData:           toJSON(newData),
        ChangeDescription: generateChangeDescription(changeType, entityType, oldData, newData),
        ChangedBy:         userID,
        ChangeReason:      reason,
        EffectiveDate:     time.Now(),
    }
    
    db.Create(&logEntry)
}
```

### 2. 数据验证

```go
// 企业数据验证中间件
func ValidateCompanyData() gin.HandlerFunc {
    return func(c *gin.Context) {
        companyID := getCompanyIDFromPath(c)
        userCompanyID := getUserCompanyID(c)
        
        // 确保企业用户只能操作自己企业的数据
        if !isSystemUser(c) && companyID != userCompanyID {
            c.JSON(400, gin.H{"error": "Invalid company ID"})
            c.Abort()
            return
        }
        
        c.Next()
    }
}
```

### 3. 操作限制

```go
// 操作频率限制
var organizationOpLimiter = rate.NewLimiter(rate.Every(time.Minute), 10)

func OrganizationRateLimitMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        if !organizationOpLimiter.Allow() {
            c.JSON(429, gin.H{"error": "Too many requests"})
            c.Abort()
            return
        }
        c.Next()
    }
}
```

## 部署配置

### 1. 权限初始化脚本

```sql
-- 企业组织架构权限初始化
INSERT INTO permissions (permission_code, permission_name, module, resource, action) VALUES
-- 部门管理权限
('org.department.create', '创建部门', 'organization', 'department', 'create'),
('org.department.read', '查看部门', 'organization', 'department', 'read'),
('org.department.update', '更新部门', 'organization', 'department', 'update'),
('org.department.delete', '删除部门', 'organization', 'department', 'delete'),
('org.department.manage', '管理部门', 'organization', 'department', 'manage'),

-- 岗位管理权限
('org.position.create', '创建岗位', 'organization', 'position', 'create'),
('org.position.read', '查看岗位', 'organization', 'position', 'read'),
('org.position.update', '更新岗位', 'organization', 'position', 'update'),
('org.position.delete', '删除岗位', 'organization', 'position', 'delete'),
('org.position.manage', '管理岗位', 'organization', 'position', 'manage'),

-- 员工分配权限
('org.assignment.create', '创建员工分配', 'organization', 'assignment', 'create'),
('org.assignment.read', '查看员工分配', 'organization', 'assignment', 'read'),
('org.assignment.update', '更新员工分配', 'organization', 'assignment', 'update'),
('org.assignment.delete', '删除员工分配', 'organization', 'assignment', 'delete'),
('org.assignment.transfer', '员工调动', 'organization', 'assignment', 'transfer'),

-- 企业用户管理权限
('company.user.create', '创建企业用户', 'company', 'user', 'create'),
('company.user.read', '查看企业用户', 'company', 'user', 'read'),
('company.user.update', '更新企业用户', 'company', 'user', 'update'),
('company.user.activate', '激活/停用用户', 'company', 'user', 'activate'),
('company.user.password', '重置用户密码', 'company', 'user', 'password');

-- 为企业管理员角色分配权限
INSERT INTO role_permissions (role_id, permission_id, is_granted)
SELECT r.id, p.id, true
FROM company_roles r, permissions p
WHERE r.role_code = 'company_admin'
AND p.permission_code IN (
    'org.department.manage',
    'org.position.manage',
    'org.assignment.manage',
    'company.user.create',
    'company.user.read',
    'company.user.update',
    'company.user.activate',
    'company.user.password'
);
```

### 2. 环境变量配置

```bash
# 企业用户限制
COMPANY_MAX_USERS_PER_ADMIN=100
COMPANY_MAX_DEPARTMENTS=20
COMPANY_MAX_POSITIONS=50

# 权限缓存设置
PERMISSION_CACHE_TTL=3600
ORGANIZATION_PERMISSION_CACHE_SIZE=1000

# 安全设置
ORGANIZATION_RATE_LIMIT=10
AUDIT_LOG_RETENTION_DAYS=365
```

## 总结

本权限集成方案确保了：

1. **数据安全**：企业级数据完全隔离，企业管理员只能管理自己企业的数据
2. **权限精确**：细粒度的权限控制，支持资源级权限分配
3. **操作审计**：完整的操作日志记录，确保所有变更可追溯
4. **用户体验**：前端权限控制确保用户只看到有权限的功能
5. **扩展性强**：权限模型支持未来功能扩展和权限细化

该方案既满足了企业管理员自主管理的需求，又保证了系统的安全性和数据隔离要求。