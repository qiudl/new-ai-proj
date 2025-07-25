package models

import (
	"time"
)

// DocumentFolder 文档文件夹模型
type DocumentFolder struct {
	ID             int        `json:"id" db:"id"`
	Name           string     `json:"name" db:"name" validate:"required,min=1,max=255"`
	Description    *string    `json:"description" db:"description"`
	ParentFolderID *int       `json:"parent_folder_id" db:"parent_folder_id"`
	OwnerID        int        `json:"owner_id" db:"owner_id" validate:"required"`
	Visibility     Visibility `json:"visibility" db:"visibility" validate:"required"`
	Color          *string    `json:"color" db:"color"`
	Icon           *string    `json:"icon" db:"icon"`
	SortOrder      int        `json:"sort_order" db:"sort_order"`
	CreatedBy      int        `json:"created_by" db:"created_by" validate:"required"`
	CreatedAt      time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at" db:"updated_at"`
	DeletedAt      *time.Time `json:"deleted_at" db:"deleted_at"`
	
	// 关联字段
	OwnerName     *string           `json:"owner_name,omitempty" db:"owner_name"`
	Children      []DocumentFolder  `json:"children,omitempty"`
	DocumentCount int               `json:"document_count,omitempty" db:"document_count"`
}

// CreateFolderRequest 创建文件夹请求
type CreateFolderRequest struct {
	Name           string     `json:"name" validate:"required,min=1,max=255"`
	Description    *string    `json:"description"`
	ParentFolderID *int       `json:"parent_folder_id"`
	Visibility     Visibility `json:"visibility"`
	Color          *string    `json:"color"`
	Icon           *string    `json:"icon"`
}

// UpdateFolderRequest 更新文件夹请求
type UpdateFolderRequest struct {
	Name           *string    `json:"name" validate:"omitempty,min=1,max=255"`
	Description    *string    `json:"description"`
	ParentFolderID *int       `json:"parent_folder_id"`
	Visibility     *Visibility `json:"visibility"`
	Color          *string    `json:"color"`
	Icon           *string    `json:"icon"`
	SortOrder      *int       `json:"sort_order"`
}

// MoveFolderRequest 移动文件夹请求
type MoveFolderRequest struct {
	ParentFolderID *int `json:"parent_folder_id"`
}

// FolderListResponse 文件夹列表响应
type FolderListResponse struct {
	Folders []DocumentFolder `json:"folders"`
	Total   int              `json:"total"`
}

// CreateDocumentFolderRequest 创建文档文件夹请求
type CreateDocumentFolderRequest struct {
	Name           string     `json:"name" validate:"required,min=1,max=255"`
	Description    *string    `json:"description"`
	ParentFolderID *int       `json:"parent_folder_id"`
	Visibility     Visibility `json:"visibility" validate:"required"`
	Color          *string    `json:"color"`
	Icon           *string    `json:"icon"`
	SortOrder      int        `json:"sort_order"`
}

// UpdateDocumentFolderRequest 更新文档文件夹请求
type UpdateDocumentFolderRequest struct {
	Name           *string     `json:"name,omitempty" validate:"omitempty,min=1,max=255"`
	Description    **string    `json:"description,omitempty"`
	ParentFolderID **int       `json:"parent_folder_id,omitempty"`
	Visibility     *Visibility `json:"visibility,omitempty"`
	Color          **string    `json:"color,omitempty"`
	Icon           **string    `json:"icon,omitempty"`
	SortOrder      *int        `json:"sort_order,omitempty"`
}

// ListFoldersRequest 列出文件夹请求
type ListFoldersRequest struct {
	OwnerID    *int   `json:"owner_id,omitempty"`
	ParentID   *int   `json:"parent_id,omitempty"`
	Visibility string `json:"visibility,omitempty"`
	Page       int    `json:"page,omitempty"`
	Limit      int    `json:"limit,omitempty"`
}

// ListFoldersResponse 列出文件夹响应
type ListFoldersResponse struct {
	Folders    []DocumentFolder `json:"folders"`
	TotalCount int              `json:"total_count"`
	Page       int              `json:"page"`
	Limit      int              `json:"limit"`
}

// FolderTreeResponse 文件夹树响应
type FolderTreeResponse struct {
	Folders []DocumentFolderTree `json:"folders"`
}

// DocumentFolderTree 文档文件夹树结构
type DocumentFolderTree struct {
	DocumentFolder
	Children []DocumentFolderTree `json:"children,omitempty"`
}

// DocumentFolderStats 文档文件夹统计
type DocumentFolderStats struct {
	FolderID      int `json:"folder_id"`
	DocumentCount int `json:"document_count"`
	SubfolderCount int `json:"subfolder_count"`
	TotalSize     int64 `json:"total_size"`
}


