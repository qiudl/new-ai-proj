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
	
	// 关联字段
	OwnerName   *string `json:"owner_name,omitempty" db:"owner_name"`
	FolderName  *string `json:"folder_name,omitempty" db:"folder_name"`
	Relations   []DocumentRelation `json:"relations,omitempty"`
}

// CreateDocumentRequest 创建文档请求
type CreateDocumentRequest struct {
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
	Relations     []DocumentRelation   `json:"relations,omitempty"`
	Collaborators []CollaboratorInfo   `json:"collaborators,omitempty"`
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
		Relations:     []DocumentRelation{},
		Collaborators: []CollaboratorInfo{},
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
	SortBy     string  `json:"sort_by,omitempty"`
	Order      string  `json:"order,omitempty"`
	Page       int     `json:"page,omitempty"`
	Limit      int     `json:"limit,omitempty"`
}