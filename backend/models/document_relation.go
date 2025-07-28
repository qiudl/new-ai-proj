package models

import (
	"time"
)

// RelationType 关联关系类型枚举
type RelationType string

// 客户关联类型
const (
	CustomerRelationContract    RelationType = "contract"
	CustomerRelationRequirement RelationType = "requirement"
	CustomerRelationReference   RelationType = "reference"
	CustomerRelationDeliverable RelationType = "deliverable"
	CustomerRelationRelated     RelationType = "related"
)

// 项目关联类型
const (
	ProjectRelationRequirement RelationType = "requirement"
	ProjectRelationDesign      RelationType = "design"
	ProjectRelationTechnical   RelationType = "technical"
	ProjectRelationPlan        RelationType = "plan"
	ProjectRelationReport      RelationType = "report"
	ProjectRelationDeliverable RelationType = "deliverable"
	ProjectRelationReference   RelationType = "reference"
	ProjectRelationTemplate    RelationType = "template"
	ProjectRelationRelated     RelationType = "related"
)

// 任务关联类型
const (
	TaskRelationAttachment    RelationType = "attachment"
	TaskRelationReference     RelationType = "reference"
	TaskRelationRequirement   RelationType = "requirement"
	TaskRelationSpecification RelationType = "specification"
	TaskRelationDeliverable   RelationType = "deliverable"
	TaskRelationTestCase      RelationType = "test_case"
	TaskRelationBugReport     RelationType = "bug_report"
	TaskRelationNote          RelationType = "note"
	TaskRelationTemplate      RelationType = "template"
)

// DocumentRelation 文档关联关系统一模型（用于响应）
type DocumentRelation struct {
	ID           int       `json:"id"`
	DocumentID   int       `json:"document_id"`
	EntityType   string    `json:"entity_type"`   // customer, project, task
	EntityID     int       `json:"entity_id"`
	EntityName   string    `json:"entity_name"`
	RelationType string    `json:"relation_type"`
	Description  *string   `json:"description"`
	DisplayOrder int       `json:"display_order,omitempty"`
	CreatedBy    int       `json:"created_by"`
	CreatedAt    time.Time `json:"created_at"`
}

// DocumentCustomerRelation 文档-客户关联
type DocumentCustomerRelation struct {
	ID           int          `json:"id" db:"id"`
	DocumentID   int          `json:"document_id" db:"document_id"`
	CustomerID   int          `json:"customer_id" db:"customer_id"`
	RelationType RelationType `json:"relation_type" db:"relation_type"`
	Description  *string      `json:"description" db:"description"`
	CreatedBy    int          `json:"created_by" db:"created_by"`
	CreatedAt    time.Time    `json:"created_at" db:"created_at"`
	// Additional fields for JOIN queries
	DocumentTitle *string `json:"document_title,omitempty" db:"document_title"`
	CustomerName  *string `json:"customer_name,omitempty" db:"customer_name"`
	CreatorName   *string `json:"creator_name,omitempty" db:"creator_name"`
}

// DocumentProjectRelation 文档-项目关联
type DocumentProjectRelation struct {
	ID           int          `json:"id" db:"id"`
	DocumentID   int          `json:"document_id" db:"document_id"`
	ProjectID    int          `json:"project_id" db:"project_id"`
	RelationType RelationType `json:"relation_type" db:"relation_type"`
	Description  *string      `json:"description" db:"description"`
	CreatedBy    int          `json:"created_by" db:"created_by"`
	CreatedAt    time.Time    `json:"created_at" db:"created_at"`
	// Additional fields for JOIN queries
	DocumentTitle *string `json:"document_title,omitempty" db:"document_title"`
	ProjectName   *string `json:"project_name,omitempty" db:"project_name"`
	CreatorName   *string `json:"creator_name,omitempty" db:"creator_name"`
}

// DocumentTaskRelation 文档-任务关联
type DocumentTaskRelation struct {
	ID           int          `json:"id" db:"id"`
	DocumentID   int          `json:"document_id" db:"document_id"`
	TaskID       int          `json:"task_id" db:"task_id"`
	RelationType RelationType `json:"relation_type" db:"relation_type"`
	Description  *string      `json:"description" db:"description"`
	DisplayOrder int          `json:"display_order" db:"display_order"`
	CreatedBy    int          `json:"created_by" db:"created_by"`
	CreatedAt    time.Time    `json:"created_at" db:"created_at"`
	// Additional fields for JOIN queries
	DocumentTitle *string `json:"document_title,omitempty" db:"document_title"`
	TaskTitle     *string `json:"task_title,omitempty" db:"task_title"`
	CreatorName   *string `json:"creator_name,omitempty" db:"creator_name"`
}

// DocumentUserRelation 文档-用户关联（收藏等）
type DocumentUserRelation struct {
	ID           int       `json:"id" db:"id"`
	DocumentID   int       `json:"document_id" db:"document_id"`
	UserID       int       `json:"user_id" db:"user_id"`
	RelationType string    `json:"relation_type" db:"relation_type"` // favorite, bookmark, watch, recent
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
}

// UserRelationType 用户关联类型
type UserRelationType string

const (
	UserRelationFavorite UserRelationType = "favorite"
	UserRelationBookmark UserRelationType = "bookmark"
	UserRelationWatch    UserRelationType = "watch"
	UserRelationRecent   UserRelationType = "recent"
)

// PermissionLevel 权限级别枚举
type PermissionLevel string

const (
	PermissionRead    PermissionLevel = "read"
	PermissionComment PermissionLevel = "comment"
	PermissionEdit    PermissionLevel = "edit"
	PermissionAdmin   PermissionLevel = "admin"
)

// 类型别名以兼容现有代码
type FolderPermissionLevel = PermissionLevel
type DocumentPermissionLevel = PermissionLevel

// DocumentCollaborator 文档协作者
type DocumentCollaborator struct {
	ID              int             `json:"id" db:"id"`
	DocumentID      int             `json:"document_id" db:"document_id"`
	UserID          int             `json:"user_id" db:"user_id"`
	PermissionLevel PermissionLevel `json:"permission_level" db:"permission_level"`
	GrantedBy       int             `json:"granted_by" db:"granted_by"`
	GrantedAt       time.Time       `json:"granted_at" db:"granted_at"`
	ExpiresAt       *time.Time      `json:"expires_at" db:"expires_at"`
	
	// 关联字段
	UserName      *string `json:"user_name,omitempty" db:"user_name"`
	GrantedByName *string `json:"granted_by_name,omitempty" db:"granted_by_name"`
}

// FolderCollaborator 文件夹协作者
type FolderCollaborator struct {
	ID              int             `json:"id" db:"id"`
	FolderID        int             `json:"folder_id" db:"folder_id"`
	UserID          int             `json:"user_id" db:"user_id"`
	PermissionLevel PermissionLevel `json:"permission_level" db:"permission_level"`
	GrantedBy       int             `json:"granted_by" db:"granted_by"`
	GrantedAt       time.Time       `json:"granted_at" db:"granted_at"`
	ExpiresAt       *time.Time      `json:"expires_at" db:"expires_at"`
	
	// 关联字段
	UserName      *string `json:"user_name,omitempty" db:"user_name"`
	GrantedByName *string `json:"granted_by_name,omitempty" db:"granted_by_name"`
}

// AddDocumentRelationRequest 添加文档关联请求
type AddDocumentRelationRequest struct {
	DocumentID   int          `json:"document_id" validate:"required"`
	EntityType   string       `json:"entity_type" validate:"required,oneof=customer project task"`
	EntityID     int          `json:"entity_id" validate:"required"`
	RelationType RelationType `json:"relation_type" validate:"required"`
	Description  *string      `json:"description"`
	DisplayOrder *int         `json:"display_order"`
}

// UpdateDocumentRelationRequest 更新文档关联请求
type UpdateDocumentRelationRequest struct {
	RelationType *RelationType `json:"relation_type"`
	Description  *string       `json:"description"`
	DisplayOrder *int          `json:"display_order"`
}

// AddCollaboratorRequest 添加协作者请求
type AddCollaboratorRequest struct {
	UserID          int             `json:"user_id" validate:"required"`
	PermissionLevel PermissionLevel `json:"permission_level" validate:"required"`
	ExpiresAt       *time.Time      `json:"expires_at"`
}

// UpdateCollaboratorRequest 更新协作者请求
type UpdateCollaboratorRequest struct {
	PermissionLevel *PermissionLevel `json:"permission_level"`
	ExpiresAt       *time.Time       `json:"expires_at"`
}

// CollaboratorInfo 协作者信息
type CollaboratorInfo struct {
	UserID          int             `json:"user_id"`
	Username        string          `json:"username"`
	Email           string          `json:"email,omitempty"`
	PermissionLevel PermissionLevel `json:"permission_level"`
	GrantedBy       int             `json:"granted_by"`
	GrantedByName   string          `json:"granted_by_name"`
	GrantedAt       time.Time       `json:"granted_at"`
	ExpiresAt       *time.Time      `json:"expires_at"`
}

// 验证方法

// IsValidRelationType 检查关联类型是否有效
func IsValidRelationType(entityType, relationType string) bool {
	switch entityType {
	case "customer":
		validTypes := []RelationType{
			CustomerRelationContract, CustomerRelationRequirement,
			CustomerRelationReference, CustomerRelationDeliverable, CustomerRelationRelated,
		}
		for _, validType := range validTypes {
			if RelationType(relationType) == validType {
				return true
			}
		}
	case "project":
		validTypes := []RelationType{
			ProjectRelationRequirement, ProjectRelationDesign, ProjectRelationTechnical,
			ProjectRelationPlan, ProjectRelationReport, ProjectRelationDeliverable,
			ProjectRelationReference, ProjectRelationTemplate, ProjectRelationRelated,
		}
		for _, validType := range validTypes {
			if RelationType(relationType) == validType {
				return true
			}
		}
	case "task":
		validTypes := []RelationType{
			TaskRelationAttachment, TaskRelationReference, TaskRelationRequirement,
			TaskRelationSpecification, TaskRelationDeliverable, TaskRelationTestCase,
			TaskRelationBugReport, TaskRelationNote, TaskRelationTemplate,
		}
		for _, validType := range validTypes {
			if RelationType(relationType) == validType {
				return true
			}
		}
	}
	return false
}

// IsValidUserRelationType 检查用户关联类型是否有效
func IsValidUserRelationType(relationType string) bool {
	validTypes := []UserRelationType{
		UserRelationFavorite, UserRelationBookmark, UserRelationWatch, UserRelationRecent,
	}
	for _, validType := range validTypes {
		if UserRelationType(relationType) == validType {
			return true
		}
	}
	return false
}

// IsValidPermissionLevel 检查权限级别是否有效
func IsValidPermissionLevel(level string) bool {
	validLevels := []PermissionLevel{
		PermissionRead, PermissionComment, PermissionEdit, PermissionAdmin,
	}
	for _, validLevel := range validLevels {
		if PermissionLevel(level) == validLevel {
			return true
		}
	}
	return false
}

// ToDocumentRelation 转换为统一的关联关系响应格式
func (dcr *DocumentCustomerRelation) ToDocumentRelation(customerName string) DocumentRelation {
	return DocumentRelation{
		ID:           dcr.ID,
		DocumentID:   dcr.DocumentID,
		EntityType:   "customer",
		EntityID:     dcr.CustomerID,
		EntityName:   customerName,
		RelationType: string(dcr.RelationType),
		Description:  dcr.Description,
		CreatedBy:    dcr.CreatedBy,
		CreatedAt:    dcr.CreatedAt,
	}
}

func (dpr *DocumentProjectRelation) ToDocumentRelation(projectName string) DocumentRelation {
	return DocumentRelation{
		ID:           dpr.ID,
		DocumentID:   dpr.DocumentID,
		EntityType:   "project",
		EntityID:     dpr.ProjectID,
		EntityName:   projectName,
		RelationType: string(dpr.RelationType),
		Description:  dpr.Description,
		CreatedBy:    dpr.CreatedBy,
		CreatedAt:    dpr.CreatedAt,
	}
}

func (dtr *DocumentTaskRelation) ToDocumentRelation(taskName string) DocumentRelation {
	return DocumentRelation{
		ID:           dtr.ID,
		DocumentID:   dtr.DocumentID,
		EntityType:   "task",
		EntityID:     dtr.TaskID,
		EntityName:   taskName,
		RelationType: string(dtr.RelationType),
		Description:  dtr.Description,
		DisplayOrder: dtr.DisplayOrder,
		CreatedBy:    dtr.CreatedBy,
		CreatedAt:    dtr.CreatedAt,
	}
}

// Request/Response models for document relations

// AddDocumentCustomerRelationRequest 添加文档客户关联请求
type AddDocumentCustomerRelationRequest struct {
	DocumentID   int          `json:"document_id" validate:"required"`
	CustomerID   int          `json:"customer_id" validate:"required"`
	RelationType RelationType `json:"relation_type" validate:"required"`
	Description  *string      `json:"description,omitempty"`
	DisplayOrder int          `json:"display_order,omitempty"`
}

// AddDocumentProjectRelationRequest 添加文档项目关联请求
type AddDocumentProjectRelationRequest struct {
	DocumentID   int          `json:"document_id" validate:"required"`
	ProjectID    int          `json:"project_id" validate:"required"`
	RelationType RelationType `json:"relation_type" validate:"required"`
	Description  *string      `json:"description,omitempty"`
	DisplayOrder int          `json:"display_order,omitempty"`
}

// AddDocumentTaskRelationRequest 添加文档任务关联请求
type AddDocumentTaskRelationRequest struct {
	DocumentID   int          `json:"document_id" validate:"required"`
	TaskID       int          `json:"task_id" validate:"required"`
	RelationType RelationType `json:"relation_type" validate:"required"`
	Description  *string      `json:"description,omitempty"`
	DisplayOrder int          `json:"display_order,omitempty"`
}

// DocumentRelationsResponse 文档关联响应
type DocumentRelationsResponse struct {
	DocumentID      int                `json:"document_id"`
	CustomerRelations []DocumentRelation `json:"customer_relations"`
	ProjectRelations  []DocumentRelation `json:"project_relations"`
	TaskRelations     []DocumentRelation `json:"task_relations"`
	TotalCount        int                `json:"total_count"`
}

// ListDocumentRelationsRequest 列出文档关联请求
type ListDocumentRelationsRequest struct {
	DocumentID   *int   `json:"document_id,omitempty"`
	EntityType   string `json:"entity_type,omitempty"`
	EntityID     *int   `json:"entity_id,omitempty"`
	RelationType string `json:"relation_type,omitempty"`
	CreatedBy    *int   `json:"created_by,omitempty"`
	Page         int    `json:"page,omitempty"`
	Limit        int    `json:"limit,omitempty"`
	Offset       int    `json:"offset,omitempty"`
}

// Validation functions for relation types

// ValidateCustomerRelationType 验证客户关联类型
func ValidateCustomerRelationType(relationType RelationType) bool {
	switch relationType {
	case CustomerRelationContract, CustomerRelationRequirement, CustomerRelationReference,
		CustomerRelationDeliverable, CustomerRelationRelated:
		return true
	default:
		return false
	}
}

// ValidateProjectRelationType 验证项目关联类型
func ValidateProjectRelationType(relationType RelationType) bool {
	switch relationType {
	case ProjectRelationRequirement, ProjectRelationDesign, ProjectRelationTechnical,
		ProjectRelationPlan, ProjectRelationReport, ProjectRelationDeliverable,
		ProjectRelationReference, ProjectRelationTemplate, ProjectRelationRelated:
		return true
	default:
		return false
	}
}

// ValidateTaskRelationType 验证任务关联类型
func ValidateTaskRelationType(relationType RelationType) bool {
	switch relationType {
	case TaskRelationAttachment, TaskRelationReference, TaskRelationRequirement,
		TaskRelationSpecification, TaskRelationDeliverable, TaskRelationTestCase,
		TaskRelationBugReport, TaskRelationNote, TaskRelationTemplate:
		return true
	default:
		return false
	}
}

// Response types for API responses

// EntityRelationsResponse 实体关联响应
type EntityRelationsResponse struct {
	EntityType  string             `json:"entity_type"`
	EntityID    int                `json:"entity_id"`
	EntityName  string             `json:"entity_name"`
	Relations   []DocumentRelation `json:"relations"`
	TotalCount  int                `json:"total_count"`
}

// RelationStatsResponse 关联统计响应
type RelationStatsResponse struct {
	TotalRelations    int `json:"total_relations"`
	CustomerRelations int `json:"customer_relations"`
	ProjectRelations  int `json:"project_relations"`
	TaskRelations     int `json:"task_relations"`
}
