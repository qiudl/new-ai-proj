package models

import (
	"time"
)

// Document represents a document in the system
type Document struct {
	ID        int       `json:"id" db:"id"`
	ProjectID int       `json:"project_id" db:"project_id" validate:"required"`
	Title     string    `json:"title" db:"title" validate:"required,min=1,max=255"`
	Content   string    `json:"content" db:"content"`
	CreatedBy int       `json:"created_by" db:"created_by" validate:"required"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

// DocumentRequest represents a document creation/update request
type DocumentRequest struct {
	Title   string `json:"title" validate:"required,min=1,max=255"`
	Content string `json:"content"`
}

// DocumentResponse represents a document response with additional info
type DocumentResponse struct {
	ID          int       `json:"id"`
	ProjectID   int       `json:"project_id"`
	ProjectName string    `json:"project_name,omitempty"`
	Title       string    `json:"title"`
	Content     string    `json:"content"`
	CreatedBy   int       `json:"created_by"`
	CreatorName string    `json:"creator_name,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// DocumentListResponse represents a document in list view (without full content)
type DocumentListResponse struct {
	ID          int       `json:"id"`
	ProjectID   int       `json:"project_id"`
	ProjectName string    `json:"project_name,omitempty"`
	Title       string    `json:"title"`
	CreatedBy   int       `json:"created_by"`
	CreatorName string    `json:"creator_name,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	ContentSize int       `json:"content_size"` // 内容字符数
}

// DocumentFilter represents document filtering options
type DocumentFilter struct {
	ProjectID int    `form:"project_id"`
	Search    string `form:"search"`    // 搜索标题
	SortBy    string `form:"sort_by"`   // created_at, updated_at, title
	Order     string `form:"order"`     // asc, desc
	Page      int    `form:"page"`      // 分页页码
	Limit     int    `form:"limit"`     // 每页数量
}

// ToResponse converts Document to DocumentResponse
func (d *Document) ToResponse() DocumentResponse {
	return DocumentResponse{
		ID:        d.ID,
		ProjectID: d.ProjectID,
		Title:     d.Title,
		Content:   d.Content,
		CreatedBy: d.CreatedBy,
		CreatedAt: d.CreatedAt,
		UpdatedAt: d.UpdatedAt,
	}
}

// ToListResponse converts Document to DocumentListResponse
func (d *Document) ToListResponse() DocumentListResponse {
	return DocumentListResponse{
		ID:          d.ID,
		ProjectID:   d.ProjectID,
		Title:       d.Title,
		CreatedBy:   d.CreatedBy,
		CreatedAt:   d.CreatedAt,
		UpdatedAt:   d.UpdatedAt,
		ContentSize: len(d.Content),
	}
}

// ToResponseWithRelations converts Document to DocumentResponse with additional relation info
func (d *Document) ToResponseWithRelations(projectName, creatorName string) DocumentResponse {
	response := d.ToResponse()
	response.ProjectName = projectName
	response.CreatorName = creatorName
	return response
}

// ToListResponseWithRelations converts Document to DocumentListResponse with additional relation info
func (d *Document) ToListResponseWithRelations(projectName, creatorName string) DocumentListResponse {
	response := d.ToListResponse()
	response.ProjectName = projectName
	response.CreatorName = creatorName
	return response
}