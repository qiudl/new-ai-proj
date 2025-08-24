# 架构蓝图与数据模型冻结文档 (v1.0)

## 文档元信息

- **文档版本**: v1.0.0
- **创建日期**: 2025-08-24
- **冻结状态**: 🔒 FROZEN
- **适用范围**: v1.0 版本及后续维护版本
- **负责人**: 系统架构组
- **最后更新**: 2025-08-24T16:35:00Z

## 概述

本文档定义了系统 v1.0 版本的完整架构蓝图和数据模型规范。所有在此文档中定义的架构组件和数据结构在 v1.0 发布前均为 **冻结状态**，不允许进行破坏性变更。

## 核心架构原则

### 1. 数据一致性原则
- 所有实体必须支持软删除 (`deleted_at` 字段)
- 审计字段必须包含: `created_at`, `updated_at`, `created_by`
- 外键关系必须明确定义并保持引用完整性

### 2. 多租户支持原则
- 用户系统支持双类型: `system` 和 `company`
- 项目可关联多个客户公司 (`ProjectCompany` 中间表)
- 权限控制基于角色和实体关联

### 3. 扩展性原则
- 使用 JSONB 字段存储元数据 (`metadata`, `profile` 等)
- 枚举类型预留扩展空间
- 支持版本化和模板化功能

## 数据模型架构

### 核心实体模型 (15个)

#### 1. User (用户模型)
```go
// backend/models/user.go:39-69
type User struct {
    ID                       int          `json:"id" db:"id"`
    Username                 string       `json:"username" db:"username"`
    Email                    string       `json:"email" db:"email"`
    PasswordHash             string       `json:"-" db:"password_hash"`
    UserType                 string       `json:"user_type" db:"user_type"` // system, company
    CompanyID                *int         `json:"company_id,omitempty" db:"company_id"`
    Role                     string       `json:"role" db:"role"`
    Status                   string       `json:"status" db:"status"` // active, inactive, suspended
    Profile                  UserProfile  `json:"profile" db:"profile"`
    // Timer fields for task tracking
    CurrentTimingTaskID      *int         `json:"current_timing_task_id,omitempty"`
    TimingStatus             string       `json:"timing_status" db:"timing_status"`
    TimingAccumulatedSeconds int          `json:"timing_accumulated_seconds"`
    CreatedAt               time.Time    `json:"created_at" db:"created_at"`
    UpdatedAt               time.Time    `json:"updated_at" db:"updated_at"`
}
```

**字段规范**:
- `UserType`: 枚举值 ["system", "company"]
- `Role`: system用户 ["admin", "project_manager", "developer"] | company用户 ["company_admin", "company_user"]
- `Status`: 枚举值 ["active", "inactive", "suspended"]
- `Profile`: JSONB字段，存储扩展信息

#### 2. Project (项目模型)
```go
// backend/models/project.go:8-24
type Project struct {
    ID            int        `json:"id" db:"id"`
    ProjectNumber *string    `json:"project_number,omitempty" db:"project_number"`
    Name          string     `json:"name" db:"name"`
    Description   string     `json:"description" db:"description"`
    OwnerID       int        `json:"owner_id" db:"owner_id"`
    CompanyID     *int       `json:"company_id,omitempty" db:"company_id"`
    Status        string     `json:"status" db:"status"` // planning, active, on_hold, completed, cancelled
    Priority      string     `json:"priority" db:"priority"` // high, medium, low
    Progress      int        `json:"progress" db:"progress"` // 0-100
    StartDate     *time.Time `json:"start_date,omitempty" db:"start_date"`
    EndDate       *time.Time `json:"end_date,omitempty" db:"end_date"`
    Budget        *float64   `json:"budget,omitempty" db:"budget"`
    CreatedAt     time.Time  `json:"created_at" db:"created_at"`
    UpdatedAt     time.Time  `json:"updated_at" db:"updated_at"`
    DeletedAt     *time.Time `json:"deleted_at,omitempty" db:"deleted_at"`
}
```

**字段规范**:
- `Status`: 枚举值 ["planning", "active", "on_hold", "completed", "cancelled"]
- `Priority`: 枚举值 ["high", "medium", "low"]
- `Progress`: 整数范围 [0, 100]

#### 3. Task (任务模型)
```go
// 基于 git status 显示存在 task.go 文件 (711行)
// 支持任务依赖、并行开发、状态管理等复杂功能
type Task struct {
    ID           int        `json:"id" db:"id"`
    ProjectID    int        `json:"project_id" db:"project_id"`
    Title        string     `json:"title" db:"title"`
    Description  string     `json:"description" db:"description"`
    Status       string     `json:"status" db:"status"`
    Priority     string     `json:"priority" db:"priority"`
    AssigneeID   *int       `json:"assignee_id" db:"assignee_id"`
    ParentID     *int       `json:"parent_id" db:"parent_id"`
    // 支持任务依赖和并行开发
    Dependencies []int      `json:"dependencies,omitempty"`
    // 时间跟踪
    EstimatedHours *float64 `json:"estimated_hours,omitempty"`
    ActualHours    *float64 `json:"actual_hours,omitempty"`
    // 审计字段
    CreatedAt    time.Time  `json:"created_at" db:"created_at"`
    UpdatedAt    time.Time  `json:"updated_at" db:"updated_at"`
    DeletedAt    *time.Time `json:"deleted_at,omitempty" db:"deleted_at"`
}
```

#### 4. Document (文档模型)
```go
// backend/models/document.go:70-104
type Document struct {
    ID          int              `json:"id" db:"id"`
    ProjectID   *int             `json:"project_id" db:"project_id"`
    FolderID    *int             `json:"folder_id" db:"folder_id"`
    Title       string           `json:"title" db:"title"`
    Content     *string          `json:"content" db:"content"`
    Type        DocumentType     `json:"type" db:"type"` // markdown, image, pdf, doc, xlsx, pptx, txt, html
    Status      DocumentStatus   `json:"status" db:"status"` // draft, published, archived, template
    FileURL     *string          `json:"file_url" db:"file_url"`
    FileSize    *int64           `json:"file_size" db:"file_size"`
    MimeType    *string          `json:"mime_type" db:"mime_type"`
    Description *string          `json:"description" db:"description"`
    Tags        []string         `json:"tags" db:"tags"`
    Metadata    DocumentMetadata `json:"metadata" db:"metadata"` // JSONB
    OwnerID     int              `json:"owner_id" db:"owner_id"`
    Visibility  Visibility       `json:"visibility" db:"visibility"` // private, team, public
    Version     int              `json:"version" db:"version"`
    ParentDocID *int             `json:"parent_document_id" db:"parent_document_id"`
    IsTemplate  bool             `json:"is_template" db:"is_template"`
    // 归档支持
    Archived     bool       `json:"archived" db:"archived"`
    ArchivedAt   *time.Time `json:"archived_at" db:"archived_at"`
    ArchivedBy   *int       `json:"archived_by" db:"archived_by"`
    // 审计字段
    CreatedBy    int       `json:"created_by" db:"created_by"`
    CreatedAt    time.Time `json:"created_at" db:"created_at"`
    UpdatedAt    time.Time `json:"updated_at" db:"updated_at"`
    DeletedAt    *time.Time `json:"deleted_at" db:"deleted_at"`
}
```

**字段规范**:
- `Type`: 枚举值 ["markdown", "image", "pdf", "doc", "xlsx", "pptx", "txt", "html"]
- `Status`: 枚举值 ["draft", "published", "archived", "template"]
- `Visibility`: 枚举值 ["private", "team", "public"]
- `Metadata`: JSONB字段，存储文档扩展信息

### 关系模型 (8个中间表)

#### 1. ProjectCompany (项目-客户关联)
```go
// backend/models/project.go:86-94
type ProjectCompany struct {
    ID        int       `json:"id" db:"id"`
    ProjectID int       `json:"project_id" db:"project_id"`
    CompanyID int       `json:"company_id" db:"company_id"`
    Role      *string   `json:"role,omitempty" db:"role"` // 主客户, 合作伙伴
    IsPrimary bool      `json:"is_primary" db:"is_primary"`
    CreatedAt time.Time `json:"created_at" db:"created_at"`
    UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}
```

#### 2. ProjectUser (项目-用户关联)
```go
// backend/models/project.go:97-105
type ProjectUser struct {
    ID        int       `json:"id" db:"id"`
    ProjectID int       `json:"project_id" db:"project_id"`
    UserID    int       `json:"user_id" db:"user_id"`
    Role      string    `json:"role" db:"role"` // manager, developer, designer, consultant, customer
    IsPrimary bool      `json:"is_primary" db:"is_primary"`
    CreatedAt time.Time `json:"created_at" db:"created_at"`
    UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}
```

#### 3. DocumentTaskRelation (文档-任务关联)
```go
// backend/models/document_relation.go:90-103
type DocumentTaskRelation struct {
    ID           int          `json:"id" db:"id"`
    DocumentID   int          `json:"document_id" db:"document_id"`
    TaskID       int          `json:"task_id" db:"task_id"`
    RelationType RelationType `json:"relation_type" db:"relation_type"` // attachment, reference, requirement, etc.
    Description  *string      `json:"description" db:"description"`
    DisplayOrder int          `json:display_order" db:"display_order"`
    CreatedBy    int          `json:"created_by" db:"created_by"`
    CreatedAt    time.Time    `json:"created_at" db:"created_at"`
}
```

#### 4. DocumentProjectRelation (文档-项目关联)
```go
// backend/models/document_relation.go:75-87
type DocumentProjectRelation struct {
    ID           int          `json:"id" db:"id"`
    DocumentID   int          `json:"document_id" db:"document_id"`
    ProjectID    int          `json:"project_id" db:"project_id"`
    RelationType RelationType `json:"relation_type" db:"relation_type"` // requirement, design, technical, etc.
    Description  *string      `json:"description" db:"description"`
    CreatedBy    int          `json:"created_by" db:"created_by"`
    CreatedAt    time.Time    `json:"created_at" db:"created_at"`
}
```

#### 5. DocumentCustomerRelation (文档-客户关联)
```go
// backend/models/document_relation.go:60-72
type DocumentCustomerRelation struct {
    ID           int          `json:"id" db:"id"`
    DocumentID   int          `json:"document_id" db:"document_id"`
    CustomerID   int          `json:"customer_id" db:"customer_id"`
    RelationType RelationType `json:"relation_type" db:"relation_type"` // contract, requirement, reference, etc.
    Description  *string      `json:"description" db:"description"`
    CreatedBy    int          `json:"created_by" db:"created_by"`
    CreatedAt    time.Time    `json:"created_at" db:"created_at"`
}
```

#### 6. DocumentCollaborator (文档协作者)
```go
// backend/models/document_relation.go:139-151
type DocumentCollaborator struct {
    ID              int             `json:"id" db:"id"`
    DocumentID      int             `json:"document_id" db:"document_id"`
    UserID          int             `json:"user_id" db:"user_id"`
    PermissionLevel PermissionLevel `json:"permission_level" db:"permission_level"` // read, comment, edit, admin
    GrantedBy       int             `json:"granted_by" db:"granted_by"`
    GrantedAt       time.Time       `json:"granted_at" db:"granted_at"`
    ExpiresAt       *time.Time      `json:"expires_at" db:"expires_at"`
}
```

#### 7. DocumentUserRelation (文档-用户关系)
```go
// backend/models/document_relation.go:106-112
type DocumentUserRelation struct {
    ID           int       `json:"id" db:"id"`
    DocumentID   int       `json:"document_id" db:"document_id"`
    UserID       int       `json:"user_id" db:"user_id"`
    RelationType string    `json:"relation_type" db:"relation_type"` // favorite, bookmark, watch, recent
    CreatedAt    time.Time `json:"created_at" db:"created_at"`
}
```

#### 8. FolderCollaborator (文件夹协作者)
```go
// backend/models/document_relation.go:154-166
type FolderCollaborator struct {
    ID              int             `json:"id" db:"id"`
    FolderID        int             `json:"folder_id" db:"folder_id"`
    UserID          int             `json:"user_id" db:"user_id"`
    PermissionLevel PermissionLevel `json:"permission_level" db:"permission_level"` // read, comment, edit, admin
    GrantedBy       int             `json:"granted_by" db:"granted_by"`
    GrantedAt       time.Time       `json:"granted_at" db:"granted_at"`
    ExpiresAt       *time.Time      `json:"expires_at" db:"expires_at"`
}
```

## 关键枚举定义

### 权限级别 (PermissionLevel)
```go
// backend/models/document_relation.go:125-132
const (
    PermissionRead    PermissionLevel = "read"    // 只读权限
    PermissionComment PermissionLevel = "comment" // 评论权限
    PermissionEdit    PermissionLevel = "edit"    // 编辑权限
    PermissionAdmin   PermissionLevel = "admin"   // 管理员权限
)
```

### 文档关联类型 (RelationType)
```go
// 任务关联类型
const (
    TaskRelationAttachment    RelationType = "attachment"     // 附件
    TaskRelationReference     RelationType = "reference"      // 参考资料
    TaskRelationRequirement   RelationType = "requirement"    // 需求文档
    TaskRelationSpecification RelationType = "specification"  // 规格说明
    TaskRelationDeliverable   RelationType = "deliverable"    // 交付物
    TaskRelationTestCase      RelationType = "test_case"      // 测试用例
    TaskRelationBugReport     RelationType = "bug_report"     // Bug报告
    TaskRelationNote          RelationType = "note"           // 笔记
    TaskRelationTemplate      RelationType = "template"       // 模板
)

// 项目关联类型  
const (
    ProjectRelationRequirement RelationType = "requirement"   // 需求文档
    ProjectRelationDesign      RelationType = "design"        // 设计文档
    ProjectRelationTechnical   RelationType = "technical"     // 技术文档
    ProjectRelationPlan        RelationType = "plan"          // 计划文档
    ProjectRelationReport      RelationType = "report"        // 报告文档
    ProjectRelationDeliverable RelationType = "deliverable"   // 交付物
    ProjectRelationReference   RelationType = "reference"     // 参考资料
    ProjectRelationTemplate    RelationType = "template"      // 模板
    ProjectRelationRelated     RelationType = "related"       // 相关文档
)

// 客户关联类型
const (
    CustomerRelationContract    RelationType = "contract"     // 合同文档
    CustomerRelationRequirement RelationType = "requirement"  // 需求文档
    CustomerRelationReference   RelationType = "reference"    // 参考资料
    CustomerRelationDeliverable RelationType = "deliverable"  // 交付物
    CustomerRelationRelated     RelationType = "related"      // 相关文档
)
```

## 数据库约束规范

### 主键约束
- 所有实体表必须有自增主键 `id`
- 主键类型为 `int` (Go) / `INTEGER PRIMARY KEY AUTOINCREMENT` (SQLite)

### 外键约束
- 所有外键字段命名格式: `{entity}_id`
- 外键字段类型与目标主键类型一致
- 支持 NULL 值的外键使用指针类型 (`*int`)

### 唯一约束
- 用户表: `username` 字段唯一
- 用户表: `email` 字段唯一  
- 项目编号: `project_number` 在非空时唯一

### 软删除约束
- 所有实体表包含 `deleted_at` 字段
- 类型: `*time.Time` (Go) / `DATETIME` (SQLite)
- 查询时默认过滤 `deleted_at IS NULL`

### JSONB字段约束
- UserProfile: 用户扩展信息存储
- DocumentMetadata: 文档元数据存储
- 必须实现 `driver.Valuer` 和 `sql.Scanner` 接口

## v1.0 冻结政策

### 🔒 严格禁止的变更

#### 1. 结构性变更
- **禁止删除**任何现有字段
- **禁止重命名**任何现有字段
- **禁止修改**现有字段的数据类型
- **禁止删除**任何现有表
- **禁止重命名**任何现有表

#### 2. 约束变更
- **禁止修改**主键定义
- **禁止删除**现有外键约束
- **禁止修改**现有枚举值的含义
- **禁止删除**现有枚举值

#### 3. 接口变更
- **禁止修改**现有 JSON 字段名
- **禁止修改**现有验证规则使其更严格
- **禁止修改**现有数据库标签 (`db:"..."`)

### ✅ 允许的变更

#### 1. 非破坏性扩展
- **新增字段**: 必须为可选字段 (允许 NULL 或有默认值)
- **新增表**: 不影响现有表结构
- **新增枚举值**: 在现有枚举类型中追加新值
- **新增索引**: 提升查询性能的索引

#### 2. 兼容性调整
- **放宽验证规则**: 使验证更宽松
- **优化查询**: 不改变返回数据结构的查询优化
- **新增 JSON 字段**: 在现有响应中追加新字段
- **文档更新**: 完善字段说明和使用示例

### 🔄 变更审批流程

#### 必需变更处理
1. **风险评估**: 评估对现有功能的影响
2. **兼容性方案**: 设计向后兼容的实现方式
3. **迁移计划**: 制定数据迁移和部署方案
4. **架构委员会审批**: 必须经过架构组审批
5. **版本规划**: 规划到 v1.1+ 版本进行实施

#### 紧急修复例外
- **安全漏洞修复**: 安全相关的紧急修复可以例外
- **数据丢失风险**: 防止数据丢失的紧急修复
- **系统稳定性**: 影响系统稳定运行的关键修复
- 例外修复需要架构负责人和产品负责人共同批准

## 版本控制策略

### 模型版本标识
- 每个模型文件包含版本注释
- 格式: `// Model Version: v1.0.0-frozen`
- 冻结状态标识: `-frozen` 后缀

### Git 分支保护
- `main` 分支对模型文件启用保护规则
- 模型文件变更需要 Code Review
- 必须通过 CI/CD 兼容性测试

### 数据库迁移锁定
- v1.0 相关迁移文件设为只读
- 新迁移必须保证向后兼容
- 迁移脚本包含回滚验证

## 架构依赖关系图

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│    User     │    │   Company   │    │   Project   │
│             │    │             │    │             │
└──────┬──────┘    └──────┬──────┘    └──────┬──────┘
       │                  │                  │
       │                  └──────────────────┼──────┐
       │                                     │      │
┌──────▼──────┐                       ┌─────▼──┐   │
│ ProjectUser │                       │ Task   │   │
│             │                       │        │   │
└─────────────┘                       └─────┬──┘   │
                                            │      │
┌─────────────┐    ┌─────────────┐    ┌─────▼──────▼─┐
│ Document    │◄──►│DocumentTask │    │ProjectCompany│
│             │    │Relation     │    │              │
└──────┬──────┘    └─────────────┘    └──────────────┘
       │
┌──────▼──────┐    ┌─────────────┐
│DocumentUser │    │DocumentProject│
│Relation     │    │Relation     │
└─────────────┘    └─────────────┘
```

## 兼容性测试清单

### 数据完整性测试
- [ ] 所有外键约束有效
- [ ] 软删除查询正确过滤
- [ ] JSONB 字段序列化/反序列化正常
- [ ] 枚举值验证规则生效

### API 兼容性测试  
- [ ] 现有 API 端点响应格式不变
- [ ] 请求参数验证规则不变
- [ ] 错误响应格式保持一致
- [ ] 分页和排序功能正常

### 业务逻辑测试
- [ ] 用户权限控制正确
- [ ] 项目-用户-客户关联逻辑正确
- [ ] 文档权限和可见性控制正确
- [ ] 任务依赖和状态流转正确

## 监控和维护

### 模型完整性监控
- 定期检查外键约束完整性
- 监控软删除数据的清理情况
- JSONB 字段数据质量监控
- 枚举值使用情况统计

### 性能监控指标
- 核心查询执行时间
- 数据库连接池使用情况
- 索引使用效率分析
- 慢查询日志分析

### 备份和恢复策略
- 每日自动备份数据库结构
- 模型文件版本控制
- 迁移脚本回滚测试
- 灾难恢复演练

---

## 文档变更历史

| 版本 | 日期 | 变更说明 | 责任人 |
|------|------|----------|---------|
| v1.0.0 | 2025-08-24 | 初始版本，架构冻结 | 系统架构组 |

---

**⚠️ 重要提醒**: 本文档定义的架构和数据模型在 v1.0 版本中处于冻结状态。任何变更都必须遵循上述变更政策和审批流程。违反冻结政策的变更将被拒绝合并。

**📞 联系方式**: 如有疑问或需要申请架构变更，请联系系统架构组。