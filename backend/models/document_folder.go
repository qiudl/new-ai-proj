package models

import (
	"time"
)

// DocumentFolder 文档文件夹模型
type DocumentFolder struct {
	ID          uint              `json:"id" gorm:"primaryKey"`
	Name        string            `json:"name" gorm:"not null;size:255"`
	Description string            `json:"description" gorm:"type:text"`
	ParentID    *uint             `json:"parent_id" gorm:"index"`
	Parent      *DocumentFolder   `json:"parent,omitempty" gorm:"foreignKey:ParentID"`
	Children    []*DocumentFolder `json:"children,omitempty" gorm:"foreignKey:ParentID"`
	Color       string            `json:"color" gorm:"size:7"`
	Icon        string            `json:"icon" gorm:"size:50"`
	SortOrder   int               `json:"sort_order" gorm:"default:0"`
	CreatedBy   uint              `json:"created_by"`
	UpdatedBy   uint              `json:"updated_by"`
	CreatedAt   time.Time         `json:"created_at"`
	UpdatedAt   time.Time         `json:"updated_at"`
	DeletedAt   *time.Time        `json:"deleted_at,omitempty" gorm:"index"`
	Documents   []Document        `json:"documents,omitempty" gorm:"foreignKey:FolderID"`
}

// TableName 指定表名
func (DocumentFolder) TableName() string {
	return "document_folders"
}
