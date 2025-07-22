# 企业权限管理系统文档

## 概述

本文档描述了AI项目管理平台的企业级权限管理系统，该系统提供基于角色的权限控制（RBAC）和权限继承覆盖机制，支持细粒度的权限管理和审计追踪。

## 核心特性

### 1. 分层权限架构
- **角色权限**：基础权限，通过用户角色继承
- **项目权限**：项目级别的特定权限覆盖
- **自定义权限**：用户级别的权限覆盖，优先级最高

### 2. 权限继承和覆盖
- **三层权限解析**：自定义覆盖 → 项目权限 → 角色权限
- **权限追踪**：完整的权限解析路径记录
- **冲突分析**：识别权限冲突和冗余配置

### 3. 审计和合规
- **权限变更审计**：所有权限操作的完整日志
- **权限继承追踪**：详细的权限来源和解析过程
- **时间线追踪**：权限变更的历史记录

## 数据模型

### 核心实体

#### CompanyRole（企业角色）
```go
type CompanyRole struct {
    ID              int       `json:"id"`
    RoleCode        string    `json:"role_code"`        // 角色代码
    RoleName        string    `json:"role_name"`        // 角色名称  
    RoleDescription *string   `json:"role_description"` // 角色描述
    IsSystemRole    bool      `json:"is_system_role"`   // 是否系统角色
    IsActive        bool      `json:"is_active"`        // 是否激活
    CreatedAt       time.Time `json:"created_at"`
    UpdatedAt       time.Time `json:"updated_at"`
}
```

#### Permission（权限）
```go
type Permission struct {
    ID                   int       `json:"id"`
    PermissionCode       string    `json:"permission_code"`       // 权限代码
    PermissionName       string    `json:"permission_name"`       // 权限名称
    PermissionDescription *string   `json:"permission_description"` // 权限描述
    Module               string    `json:"module"`                // 模块
    Resource             string    `json:"resource"`              // 资源
    Action               string    `json:"action"`                // 操作
    IsActive             bool      `json:"is_active"`             // 是否激活
}
```

#### CompanyUserProjectPermission（用户项目权限）
```go
type CompanyUserProjectPermission struct {
    ID                    int        `json:"id"`
    CompanyUserID         int        `json:"company_user_id"`
    ProjectID             int        `json:"project_id"`
    CanViewProject        bool       `json:"can_view_project"`
    CanEditProject        bool       `json:"can_edit_project"`
    CanDeleteProject      bool       `json:"can_delete_project"`
    CanManageTasks        bool       `json:"can_manage_tasks"`
    CanViewFinancials     bool       `json:"can_view_financials"`
    CanManageMembers      bool       `json:"can_manage_members"`
    PermissionStartDate   time.Time  `json:"permission_start_date"`
    PermissionEndDate     *time.Time `json:"permission_end_date"`
    CreatedBy             *int       `json:"created_by"`
    CreatedAt             time.Time  `json:"created_at"`
    UpdatedAt             time.Time  `json:"updated_at"`
}
```

### 权限继承模型

#### PermissionInheritanceTrace（权限继承追踪）
```go
type PermissionInheritanceTrace struct {
    CompanyUserID  int               `json:"company_user_id"`
    PermissionCode string            `json:"permission_code"`
    ResourceID     *int              `json:"resource_id,omitempty"`
    Steps          []PermissionStep  `json:"steps"`
    FinalResult    bool              `json:"final_result"`
    FinalSource    string            `json:"final_source"`
}

type PermissionStep struct {
    Level         string `json:"level"`         // "custom", "project", "role"
    Source        string `json:"source"`        // 详细来源描述
    HasPermission bool   `json:"has_permission"`
    Reason        string `json:"reason"`
    IsOverride    bool   `json:"is_override"`   // 是否为覆盖
}
```

#### PermissionAnalysis（权限分析）
```go
type PermissionAnalysis struct {
    CompanyUserID int                      `json:"company_user_id"`
    Conflicts     []PermissionConflict     `json:"conflicts"`     // 权限冲突
    Redundancies  []PermissionRedundancy   `json:"redundancies"`  // 冗余权限
    Gaps          []PermissionGap          `json:"gaps"`          // 权限缺口
}
```

## API 接口

### 角色管理

#### 获取角色列表
```http
GET /api/v1/permissions/roles
```

#### 创建角色
```http
POST /api/v1/permissions/roles
Content-Type: application/json

{
    "role_code": "project_manager",
    "role_name": "项目经理",
    "role_description": "负责项目管理和协调",
    "permission_codes": ["project.read", "project.write", "task.manage"]
}
```

#### 更新角色
```http
PUT /api/v1/permissions/roles/{roleId}
Content-Type: application/json

{
    "role_name": "高级项目经理",
    "role_description": "负责多个项目的管理和协调",
    "permission_codes": ["project.read", "project.write", "project.delete", "task.manage"]
}
```

#### 获取角色权限
```http
GET /api/v1/permissions/roles/{roleId}/permissions
```

#### 设置角色权限
```http
POST /api/v1/permissions/roles/{roleId}/permissions
Content-Type: application/json

{
    "permission_ids": [1, 2, 3, 4, 5]
}
```

### 用户权限管理

#### 获取用户权限
```http
GET /api/v1/permissions/users/{userId}
```

#### 更新用户权限
```http
PUT /api/v1/permissions/users/{userId}
Content-Type: application/json

{
    "role_id": 2,
    "custom_permissions": {
        "finance.read": true,
        "system.admin": false
    },
    "project_permissions": [
        {
            "project_id": 1,
            "can_view_project": true,
            "can_edit_project": true,
            "can_delete_project": false,
            "can_manage_tasks": true,
            "can_view_financials": false,
            "can_manage_members": false,
            "permission_start_date": "2024-01-01T00:00:00Z",
            "permission_end_date": "2024-12-31T23:59:59Z"
        }
    ]
}
```

### 权限检查

#### 检查单个权限
```http
POST /api/v1/permissions/check
Content-Type: application/json

{
    "permission_code": "project.read",
    "resource_id": 1
}
```

#### 权限继承追踪
```http
GET /api/v1/permissions/users/{userId}/trace?permission_code=project.read&resource_id=1
```

响应示例：
```json
{
    "trace": {
        "company_user_id": 1,
        "permission_code": "project.read",
        "resource_id": 1,
        "steps": [
            {
                "level": "custom",
                "source": "用户自定义权限覆盖",
                "has_permission": true,
                "reason": "用户被显式授予该权限",
                "is_override": true
            }
        ],
        "final_result": true,
        "final_source": "custom"
    }
}
```

### 权限覆盖管理

#### 设置权限覆盖
```http
POST /api/v1/permissions/users/{userId}/overrides
Content-Type: application/json

{
    "permission_code": "finance.read",
    "is_granted": true,
    "reason": "临时财务查看权限"
}
```

#### 获取权限覆盖
```http
GET /api/v1/permissions/users/{userId}/overrides
```

#### 删除权限覆盖
```http
DELETE /api/v1/permissions/users/{userId}/overrides/{permissionCode}
```

### 权限分析

#### 权限冲突分析
```http
GET /api/v1/permissions/users/{userId}/conflicts
```

响应示例：
```json
{
    "analysis": {
        "company_user_id": 1,
        "conflicts": [
            {
                "permission_code": "project.delete",
                "role_grants": false,
                "custom_override": true,
                "project_grants": false,
                "description": "角色禁止删除项目，但自定义权限允许"
            }
        ],
        "redundancies": [
            {
                "permission_code": "project.read",
                "granted_by": ["role", "project"],
                "description": "该权限同时被角色和项目权限授予"
            }
        ],
        "gaps": []
    }
}
```

### 审计日志

#### 获取权限审计日志
```http
GET /api/v1/permissions/audit-logs?user_id={userId}&limit=50&offset=0
```

## 权限代码规范

### 命名规则
权限代码采用 `{module}.{action}` 格式：

#### 模块 (Module)
- `company` - 企业管理
- `project` - 项目管理  
- `task` - 任务管理
- `finance` - 财务管理
- `system` - 系统管理

#### 操作 (Action)
- `read` - 查看
- `create` - 创建
- `update` - 编辑
- `delete` - 删除
- `manage` - 管理
- `assign` - 分配

### 常用权限代码

#### 项目权限
- `project.read` - 查看项目
- `project.create` - 创建项目
- `project.update` - 编辑项目
- `project.delete` - 删除项目
- `project.manage` - 管理项目

#### 任务权限
- `task.read` - 查看任务
- `task.create` - 创建任务
- `task.update` - 编辑任务
- `task.delete` - 删除任务
- `task.assign` - 分配任务

#### 财务权限
- `finance.read` - 查看财务信息
- `finance.manage` - 管理财务

#### 系统权限
- `system.admin` - 系统管理员
- `system.user_manage` - 用户管理
- `system.audit` - 审计查看

## 权限继承逻辑

### 权限解析优先级

1. **自定义权限覆盖** (最高优先级)
   - 用户级别的显式权限设置
   - 可以授予（grant）或拒绝（deny）权限
   - 覆盖所有其他权限来源

2. **项目特定权限** (中等优先级)
   - 针对特定项目的权限设置
   - 只能授予额外权限，不能拒绝角色权限
   - 适用于临时或特殊项目访问需求

3. **角色继承权限** (基础优先级)
   - 从用户所属角色继承的权限
   - 提供基础的权限框架
   - 角色权限变更影响所有该角色用户

### 权限解析流程

```
输入：用户ID，权限代码，资源ID（可选）

1. 检查自定义权限覆盖
   └─ 如果存在显式覆盖 → 返回覆盖结果
   
2. 检查项目特定权限  
   └─ 如果有资源ID且存在项目权限 → 返回项目权限结果
   
3. 检查角色继承权限
   └─ 检查用户角色权限 → 返回角色权限结果
   
4. 默认拒绝
   └─ 如果以上都没有授权 → 返回拒绝
```

### 权限继承示例

假设用户张三（ID: 1）是项目经理角色，需要访问项目A（ID: 1）：

1. **角色权限**：项目经理角色有 `project.read` 权限
2. **项目权限**：张三被额外授予项目A的 `project.delete` 权限  
3. **自定义覆盖**：张三被显式拒绝 `finance.read` 权限

权限检查结果：
- `project.read` → ✅ (来源：角色)
- `project.delete` → ✅ (来源：项目权限)  
- `finance.read` → ❌ (来源：自定义覆盖)

## 最佳实践

### 1. 角色设计原则
- **最小权限原则**：角色只包含必需的基础权限
- **职责分离**：不同角色承担不同的业务职责
- **层次化设计**：建立清晰的角色层次结构

### 2. 权限覆盖使用
- **临时权限**：使用项目权限或自定义覆盖
- **例外处理**：使用自定义覆盖处理特殊情况
- **定期审查**：定期检查和清理不必要的权限覆盖

### 3. 审计和监控
- **权限变更记录**：记录所有权限变更操作
- **异常权限监控**：监控可能的权限滥用
- **定期权限审计**：定期审查用户权限配置

### 4. 安全考虑
- **权限最小化**：只授予必要的权限
- **及时回收**：及时回收离职或转岗人员权限
- **权限继承追踪**：保持权限来源的透明度

## 故障排除

### 常见问题

#### 1. 权限检查失败
**症状**：用户无法访问预期资源
**排查步骤**：
1. 使用权限追踪API检查权限解析过程
2. 确认用户角色和权限配置
3. 检查是否有拒绝性的自定义覆盖

#### 2. 权限冲突
**症状**：权限配置矛盾或冗余
**解决方案**：
1. 使用权限冲突分析API识别问题
2. 清理冗余的权限配置
3. 解决权限覆盖冲突

#### 3. 性能问题
**症状**：权限检查响应缓慢
**优化方案**：
1. 使用数据库索引优化查询
2. 实现权限结果缓存
3. 减少不必要的权限检查调用

### 调试工具

#### 权限追踪
```bash
# 检查用户权限解析过程
curl "http://localhost:8080/api/v1/permissions/users/1/trace?permission_code=project.read&resource_id=1"
```

#### 权限分析
```bash
# 分析用户权限冲突
curl "http://localhost:8080/api/v1/permissions/users/1/conflicts"
```

#### 审计日志
```bash
# 查看权限变更历史
curl "http://localhost:8080/api/v1/permissions/audit-logs?user_id=1&limit=10"
```

## 技术实现细节

### 数据库设计
- 使用PostgreSQL的JSONB字段存储灵活权限配置
- 建立适当的数据库索引优化查询性能
- 实现软删除支持权限历史追踪

### 缓存策略
- 角色权限缓存，减少数据库查询
- 用户权限结果缓存，提高响应速度
- 权限变更时及时清理相关缓存

### 安全措施
- 所有权限操作记录审计日志
- 实现权限API的认证和授权
- 防止权限提升攻击

---

*本文档版本：v1.0 | 最后更新：2024-01-20*