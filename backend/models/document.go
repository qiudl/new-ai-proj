package models

import (
	"time"
	"database/sql/driver"
	"encoding/json"
	"errors"
)

// DocumentType 文档类型枚举
type DocumentType string

const (
	DocumentTypeMarkdown DocumentType = "markdown"
	DocumentTypeImage    DocumentType = "image" 
	DocumentTypePDF      DocumentType = "pdf"
	DocumentTypeDoc      DocumentType = "doc"
	DocumentTypeXLSX     DocumentType = "xlsx"
	DocumentTypePPTX     DocumentType = "pptx"
	DocumentTypeTXT      DocumentType = "txt"
	DocumentTypeHTML     DocumentType = "html"
)

// DocumentStatus 文档状态枚举
type DocumentStatus string

const (
	DocumentStatusDraft     DocumentStatus = "draft"
	DocumentStatusPublished DocumentStatus = "published"
	DocumentStatusArchived  DocumentStatus = "archived"
	DocumentStatusTemplate  DocumentStatus = "template"
)

// Visibility 可见性枚举
type Visibility string

const (
	VisibilityPrivate Visibility = "private"
	VisibilityTeam    Visibility = "team"
	VisibilityPublic  Visibility = "public"
)

// DocumentMetadata JSONB metadata field
type DocumentMetadata map[string]interface{}

// Value implements driver.Valuer interface
func (dm DocumentMetadata) Value() (driver.Value, error) {
	if dm == nil {
		return nil, nil
	}
	return json.Marshal(dm)
}

// Scan implements sql.Scanner interface
func (dm *DocumentMetadata) Scan(value interface{}) error {
	if value == nil {
		*dm = make(DocumentMetadata)
		return nil
	}
	
	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("type assertion to []byte failed")
	}
	
	return json.Unmarshal(bytes, dm)
}

// Document 文档模型
type Document struct {
	ID          int              `json:"id" db:"id"`
	ProjectID   *int             `json:"project_id" db:"project_id"`
	FolderID    *int             `json:"folder_id" db:"folder_id"`
	Title       string           `json:"title" db:"title" validate:"required,min=1,max=255"`
	Content     *string          `json:"content" db:"content"`
	Type        DocumentType     `json:"type" db:"type" validate:"required"`
	Status      DocumentStatus   `json:"status" db:"status" validate:"required"`
	FileURL     *string          `json:"file_url" db:"file_url"`
	FileSize    *int64           `json:"file_size" db:"file_size"`
	MimeType    *string          `json:"mime_type" db:"mime_type"`
	Description *string          `json:"description" db:"description"`
	Tags        []string         `json:"tags" db:"tags"`
	Metadata    DocumentMetadata `json:"metadata" db:"metadata"`
	OwnerID     int              `json:"owner_id" db:"owner_id" validate:"required"`
	Visibility  Visibility       `json:"visibility" db:"visibility" validate:"required"`
	Version     int              `json:"version" db:"version"`
	ParentDocID *int             `json:"parent_document_id" db:"parent_document_id"`
	IsTemplate  bool             `json:"is_template" db:"is_template"`
	CreatedBy   int              `json:"created_by" db:"created_by" validate:"required"`
	CreatedAt   time.Time        `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time        `json:"updated_at" db:"updated_at"`
	DeletedAt   *time.Time       `json:"deleted_at" db:"deleted_at"`

	Archived    bool       `json:"archived" db:"archived"`
	ArchivedAt  *time.Time `json:"archived_at" db:"archived_at"`
	ArchivedBy  *int       `json:"archived_by" db:"archived_by"`
	UnarchivedAt *time.Time `json:"unarchived_at" db:"unarchived_at"`
	UnarchivedBy *int       `json:"unarchived_by" db:"unarchived_by"`
	
	// 关联字段
	OwnerName   *string `json:"owner_name,omitempty" db:"owner_name"`
	FolderName  *string `json:"folder_name,omitempty" db:"folder_name"`
	// Relations   []DocumentRelation `json:"relations,omitempty"` // Moved to document_relation.go
}

// CreateDocumentRequest 创建文档请求
type CreateDocumentRequest struct {
	ProjectID   *int             `json:"project_id"`
	FolderID    *int             `json:"folder_id"`
	Title       string           `json:"title" validate:"required,min=1,max=255"`
	Content     *string          `json:"content"`
	Type        DocumentType     `json:"type" validate:"required"`
	Status      DocumentStatus   `json:"status"`
	FileURL     *string          `json:"file_url"`
	FileSize    *int64           `json:"file_size"`
	MimeType    *string          `json:"mime_type"`
	Description *string          `json:"description"`
	Tags        []string         `json:"tags"`
	Metadata    DocumentMetadata `json:"metadata"`
	Visibility  Visibility       `json:"visibility"`
	IsTemplate  bool             `json:"is_template"`
}

// CreateBatchDocumentsRequest 批量创建文档请求
type CreateBatchDocumentsRequest struct {
	Documents []BatchDocumentItem   `json:"documents" validate:"required,min=1,max=50,dive"`
	Options   BatchCreateOptions    `json:"options"`
	Templates TemplateConfiguration `json:"templates,omitempty"`
}

// BatchDocumentItem 批量文档项
type BatchDocumentItem struct {
	ProjectID       *int             `json:"project_id"`
	TaskID          *int             `json:"task_id"`
	Title           string           `json:"title" validate:"required,min=1,max=255"`
	Content         *string          `json:"content"`
	Type            DocumentType     `json:"type" validate:"required"`
	Status          DocumentStatus   `json:"status"`
	Description     *string          `json:"description"`
	Tags            []string         `json:"tags"`
	Metadata        DocumentMetadata `json:"metadata"`
	Visibility      Visibility       `json:"visibility"`
	IsTemplate      bool             `json:"is_template"`
	AttachToTask    bool             `json:"attach_to_task"`     // 是否自动关联到任务
	RelationType    string           `json:"relation_type"`      // 关联类型 (attachment, main, reference)
	TemplateType    string           `json:"template_type"`      // 模板类型 (auto, bug_fix, feature, project_phase)
	Variables       map[string]interface{} `json:"variables,omitempty"` // 模板变量
}

// BatchDocumentResult 批量创建结果
type BatchDocumentResult struct {
	CreatedDocuments []Document        `json:"created_documents"`
	Errors          []BatchCreateError `json:"errors,omitempty"`
	SuccessCount    int               `json:"success_count"`
	ErrorCount      int               `json:"error_count"`
}

// BatchCreateError 批量创建错误
type BatchCreateError struct {
	Index   int    `json:"index"`   // 文档在批量请求中的索引
	Title   string `json:"title"`   // 文档标题
	Error   string `json:"error"`   // 错误信息
	Code    string `json:"code"`    // 错误代码
}

// BatchCreateOptions 批量创建选项
type BatchCreateOptions struct {
	AutoAttach       bool   `json:"auto_attach"`        // 自动关联到任务
	SkipExisting     bool   `json:"skip_existing"`      // 跳过已存在文档的任务
	TransactionMode  bool   `json:"transaction_mode"`   // 事务模式：全部成功或全部失败
	DefaultStatus    string `json:"default_status"`     // 默认状态
	DefaultVisibility string `json:"default_visibility"` // 默认可见性
	ProgressCallback bool   `json:"progress_callback"`  // 是否需要进度回调
}

// TemplateConfiguration 模板配置
type TemplateConfiguration struct {
	EnableSmartTemplate bool                        `json:"enable_smart_template"` // 启用智能模板选择
	DefaultTemplate     string                      `json:"default_template"`      // 默认模板类型
	CustomTemplates     map[string]TemplateDefinition `json:"custom_templates"`      // 自定义模板定义
	GlobalVariables     map[string]interface{}      `json:"global_variables"`      // 全局模板变量
}

// TemplateDefinition 模板定义
type TemplateDefinition struct {
	Name            string                 `json:"name"`
	TitleTemplate   string                 `json:"title_template"`   // 标题模板
	ContentTemplate string                 `json:"content_template"` // 内容模板
	Variables       map[string]interface{} `json:"variables"`        // 默认变量
	Conditions      []TemplateCondition    `json:"conditions"`       // 应用条件
}

// TemplateCondition 模板应用条件
type TemplateCondition struct {
	Field    string      `json:"field"`    // 字段名 (title, description, status, priority)
	Operator string      `json:"operator"` // 操作符 (contains, equals, regex)
	Value    interface{} `json:"value"`    // 匹配值
}

// 类型别名以兼容现有代码
type DocumentRequest = CreateDocumentRequest

// UpdateDocumentRequest 更新文档请求 - 增强版
type UpdateDocumentRequest struct {
	FolderID    *int             `json:"folder_id"`
	Title       *string          `json:"title" validate:"omitempty,min=1,max=255"`
	Content     *string          `json:"content"`
	Type        *DocumentType    `json:"type"`
	Status      *DocumentStatus  `json:"status"`
	FileURL     *string          `json:"file_url"`
	FileSize    *int64           `json:"file_size"`
	MimeType    *string          `json:"mime_type"`
	Description *string          `json:"description"`
	Tags        *[]string        `json:"tags"`
	Metadata    *DocumentMetadata `json:"metadata"`
	Visibility  *Visibility      `json:"visibility"`
	ProjectID   *int             `json:"project_id"`
	CustomerID  *int             `json:"customer_id"`
	SharedWith  *[]string        `json:"shared_with"`
	IsTemplate  *bool            `json:"is_template"`
	Category    *string          `json:"category"`
	DueDate     *string          `json:"due_date"`
	Priority    *string          `json:"priority"`
}

// MoveDocumentRequest 移动文档请求
type MoveDocumentRequest struct {
	FolderID *int `json:"folder_id"`
}

// DocumentListResponse 文档列表响应
type DocumentListResponse struct {
	Documents []Document `json:"documents"`
	Total     int        `json:"total"`
	Page      int        `json:"page"`
	PageSize  int        `json:"page_size"`
}

// DocumentTreeResponse 文档树响应
type DocumentTreeResponse struct {
	Folders   []DocumentFolder `json:"folders"`
	Documents []Document       `json:"documents"`
}

// DocumentResponse 文档详情响应
type DocumentResponse struct {
	Document
	FolderName    *string              `json:"folder_name,omitempty"`
	OwnerName     *string              `json:"owner_name,omitempty"`
	CreatorName   *string              `json:"creator_name,omitempty"`
	// Relations and Collaborators are imported from document_relation.go
	// Relations     []DocumentRelation   `json:"relations,omitempty"`
	// Collaborators []CollaboratorInfo   `json:"collaborators,omitempty"`
	CanEdit       bool                 `json:"can_edit"`
	CanDelete     bool                 `json:"can_delete"`
	CanShare      bool                 `json:"can_share"`
}

// DocumentStats 文档统计
type DocumentStats struct {
	TotalDocuments     int                            `json:"total_documents"`
	FolderDocuments    int                            `json:"folder_documents"`
	UnorganizedDocs    int                            `json:"unorganized_documents"`
	TemplateDocuments  int                            `json:"template_documents"`
	ByType             map[DocumentType]int           `json:"by_type"`
	ByStatus           map[DocumentStatus]int         `json:"by_status"`
	ByVisibility       map[Visibility]int             `json:"by_visibility"`
	RecentDocuments    int                            `json:"recent_documents"`
	MyDocuments        int                            `json:"my_documents"`
	SharedWithMe       int                            `json:"shared_with_me"`
	FavoriteDocuments  int                            `json:"favorite_documents"`
}

// DocumentSearchRequest 文档搜索请求
type DocumentSearchRequest struct {
	Query         string             `json:"query" form:"query"`
	FolderID      *int               `json:"folder_id" form:"folder_id"`
	Type          *DocumentType      `json:"type" form:"type"`
	Status        *DocumentStatus    `json:"status" form:"status"`
	Tags          []string           `json:"tags" form:"tags"`
	OwnerID       *int               `json:"owner_id" form:"owner_id"`
	CreatedAfter  *time.Time         `json:"created_after" form:"created_after"`
	CreatedBefore *time.Time         `json:"created_before" form:"created_before"`
	UpdatedAfter  *time.Time         `json:"updated_after" form:"updated_after"`
	UpdatedBefore *time.Time         `json:"updated_before" form:"updated_before"`
	SortBy        string             `json:"sort_by" form:"sort_by"` // title, created_at, updated_at, relevance
	Order         string             `json:"order" form:"order"`     // asc, desc
	Page          int                `json:"page" form:"page"`
	Limit         int                `json:"limit" form:"limit"`
	IncludeContent bool              `json:"include_content" form:"include_content"`
}

// DocumentSearchResponse 文档搜索响应
type DocumentSearchResponse struct {
	Documents    []Document `json:"documents"`
	TotalCount   int        `json:"total_count"`
	Page         int        `json:"page"`
	Limit        int        `json:"limit"`
	HasNextPage  bool       `json:"has_next_page"`
	HasPrevPage  bool       `json:"has_prev_page"`
}

// 验证方法

// IsValidDocumentType 检查文档类型是否有效
func IsValidDocumentType(docType string) bool {
	validTypes := []DocumentType{
		DocumentTypeMarkdown, DocumentTypeImage, DocumentTypePDF,
		DocumentTypeDoc, DocumentTypeXLSX, DocumentTypePPTX,
		DocumentTypeTXT, DocumentTypeHTML,
	}
	
	for _, validType := range validTypes {
		if DocumentType(docType) == validType {
			return true
		}
	}
	return false
}

// IsValidDocumentStatus 检查文档状态是否有效
func IsValidDocumentStatus(status string) bool {
	validStatuses := []DocumentStatus{
		DocumentStatusDraft, DocumentStatusPublished,
		DocumentStatusArchived, DocumentStatusTemplate,
	}
	
	for _, validStatus := range validStatuses {
		if DocumentStatus(status) == validStatus {
			return true
		}
	}
	return false
}

// IsValidVisibility 检查可见性是否有效
func IsValidVisibility(visibility string) bool {
	validVisibilities := []Visibility{
		VisibilityPrivate, VisibilityTeam, VisibilityPublic,
	}
	
	for _, validVisibility := range validVisibilities {
		if Visibility(visibility) == validVisibility {
			return true
		}
	}
	return false
}

// ToResponse 转换为响应格式
func (d *Document) ToResponse() DocumentResponse {
	return DocumentResponse{
		Document:      *d,
		// Relations and Collaborators will be populated separately
		// Relations:     []DocumentRelation{},
		// Collaborators: []CollaboratorInfo{},
	}
}

// DocumentFilter 文档过滤器
type DocumentFilter struct {
	ProjectID  *int    `json:"project_id,omitempty"`
	Search     string  `json:"search,omitempty"`
	Type       string  `json:"type,omitempty"`
	Status     string  `json:"status,omitempty"`
	Visibility string  `json:"visibility,omitempty"`
	FolderID   *int    `json:"folder_id,omitempty"`
	OwnerID    *int    `json:"owner_id,omitempty"`
	Archived   *bool   `json:"archived,omitempty"`
	SortBy     string  `json:"sort_by,omitempty"`
	Order      string  `json:"order,omitempty"`
	Page       int     `json:"page,omitempty"`
	Limit      int     `json:"limit,omitempty"`
}

// Note: DocumentRelation and CollaboratorInfo are now defined in document_relation.go
// to avoid duplication and provide more comprehensive implementations

// DocumentOperation represents a document operation log entry
type DocumentOperation struct {
	ID            int64     `json:"id" db:"id"`
	DocumentID    uint64    `json:"document_id" db:"document_id"`
	OperationType string    `json:"operation_type" db:"operation_type"`
	Description   string    `json:"description" db:"description"`
	UserID        uint64    `json:"user_id" db:"user_id"`
	Success       bool      `json:"success" db:"success"`
	IPAddress     string    `json:"ip_address" db:"ip_address"`
	UserAgent     string    `json:"user_agent" db:"user_agent"`
	Details       map[string]interface{} `json:"details" db:"details"`
	CreatedAt     time.Time `json:"created_at" db:"created_at"`
}

