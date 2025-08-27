// Model Version: v1.0.0-extended
// Work Note Folder Management Extensions
// Compatible with ARCHITECTURE-BLUEPRINT-V1.md

package models

import (
	"database/sql/driver"
	"encoding/json"
	"errors" 
	"fmt"
	"strings"
	"time"
)

// FolderType 文件夹类型枚举
type FolderType string

const (
	FolderTypeRegular  FolderType = "regular"
	FolderTypeSystem   FolderType = "system"
	FolderTypeTemplate FolderType = "template"
	FolderTypeArchive  FolderType = "archive"
	FolderTypeShared   FolderType = "shared"
)

// LTree PostgreSQL ltree类型
type LTree string

// Value implements driver.Valuer interface
func (l LTree) Value() (driver.Value, error) {
	if l == "" {
		return nil, nil
	}
	return string(l), nil
}

// Scan implements sql.Scanner interface
func (l *LTree) Scan(value interface{}) error {
	if value == nil {
		*l = ""
		return nil
	}
	
	switch v := value.(type) {
	case string:
		*l = LTree(v)
	case []byte:
		*l = LTree(string(v))
	default:
		return fmt.Errorf("cannot scan %T into LTree", value)
	}
	return nil
}

// String returns string representation of LTree
func (l LTree) String() string {
	return string(l)
}

// GetLabels returns path labels as slice
func (l LTree) GetLabels() []string {
	if l == "" {
		return []string{}
	}
	return strings.Split(string(l), ".")
}

// GetParentPath returns parent path
func (l LTree) GetParentPath() LTree {
	labels := l.GetLabels()
	if len(labels) <= 1 {
		return ""
	}
	return LTree(strings.Join(labels[:len(labels)-1], "."))
}

// GetDepth returns path depth
func (l LTree) GetDepth() int {
	if l == "" {
		return 0
	}
	return len(l.GetLabels())
}

// WorkNoteFolder 工作笔记文件夹扩展模型
type WorkNoteFolder struct {
	// 基础字段
	ID             int        `json:"id" db:"id"`
	Name           string     `json:"name" db:"name" validate:"required,min=1,max=255"`
	Description    *string    `json:"description,omitempty" db:"description"`
	ParentFolderID *int       `json:"parent_folder_id,omitempty" db:"parent_folder_id"`
	
	// 层级结构字段
	Path  LTree `json:"path" db:"path"`
	Depth int   `json:"depth" db:"depth"`
	
	// 权限和可见性
	OwnerID    int        `json:"owner_id" db:"owner_id" validate:"required"`
	Visibility Visibility `json:"visibility" db:"visibility" validate:"required"`
	
	// 显示属性
	Color     *string `json:"color,omitempty" db:"color"`
	Icon      *string `json:"icon,omitempty" db:"icon"`
	SortOrder int     `json:"sort_order" db:"sort_order"`
	
	// 类型和系统标识
	FolderType       FolderType `json:"folder_type" db:"folder_type"`
	IsSystemFolder   bool       `json:"is_system_folder" db:"is_system_folder"`
	
	// 统计和缓存字段
	NoteCountCached       int       `json:"note_count_cached" db:"note_count_cached"`
	NoteCountUpdatedAt    time.Time `json:"note_count_updated_at" db:"note_count_updated_at"`
	LastActivityAt        time.Time `json:"last_activity_at" db:"last_activity_at"`
	
	// 审计字段
	CreatedBy int       `json:"created_by" db:"created_by" validate:"required"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
	DeletedAt *time.Time `json:"deleted_at,omitempty" db:"deleted_at"`
}

// WorkNoteFolderWithStats 包含统计信息的工作笔记文件夹
type WorkNoteFolderWithStats struct {
	WorkNoteFolder
	// 实时统计字段（从视图或计算得出）
	ChildrenCount    int   `json:"children_count" db:"children_count"`
	TotalNotesCount  int   `json:"total_notes_count" db:"total_notes_count"`
	AncestorIDs      []int `json:"ancestor_ids,omitempty" db:"ancestor_ids"`
	
	// 权限字段
	CanEdit   bool `json:"can_edit"`
	CanDelete bool `json:"can_delete"`
	CanManage bool `json:"can_manage"`
}

// WorkNoteFolderTree 工作笔记文件夹树节点
type WorkNoteFolderTree struct {
	WorkNoteFolderWithStats
	Children []WorkNoteFolderTree `json:"children,omitempty"`
	Expanded bool                 `json:"expanded,omitempty"`
	Loading  bool                 `json:"loading,omitempty"`
}

// API请求/响应模型

// CreateWorkNoteFolderRequest 创建工作笔记文件夹请求
type CreateWorkNoteFolderRequest struct {
	Name           string     `json:"name" validate:"required,min=1,max=255"`
	Description    *string    `json:"description,omitempty"`
	ParentFolderID *int       `json:"parent_folder_id,omitempty"`
	Visibility     Visibility `json:"visibility" validate:"required"`
	Color          *string    `json:"color,omitempty"`
	Icon           *string    `json:"icon,omitempty"`
	SortOrder      *int       `json:"sort_order,omitempty"`
	FolderType     *FolderType `json:"folder_type,omitempty"`
}

// UpdateWorkNoteFolderRequest 更新工作笔记文件夹请求
type UpdateWorkNoteFolderRequest struct {
	Name           *string     `json:"name,omitempty" validate:"omitempty,min=1,max=255"`
	Description    *string     `json:"description,omitempty"`
	ParentFolderID *int        `json:"parent_folder_id,omitempty"`
	Visibility     *Visibility `json:"visibility,omitempty"`
	Color          *string     `json:"color,omitempty"`
	Icon           *string     `json:"icon,omitempty"`
	SortOrder      *int        `json:"sort_order,omitempty"`
	FolderType     *FolderType `json:"folder_type,omitempty"`
}

// MoveWorkNoteFolderRequest 移动工作笔记文件夹请求
type MoveWorkNoteFolderRequest struct {
	TargetParentID *int `json:"target_parent_id,omitempty"`
	Position       *int `json:"position,omitempty"`
}

// BatchMoveFoldersRequest 批量移动文件夹请求
type BatchMoveFoldersRequest struct {
	FolderIDs      []int `json:"folder_ids" validate:"required,min=1"`
	TargetParentID *int  `json:"target_parent_id,omitempty"`
}

// BatchSortFoldersRequest 批量排序文件夹请求
type BatchSortFoldersRequest struct {
	FolderOrders []FolderOrder `json:"folder_orders" validate:"required,min=1"`
}

type FolderOrder struct {
	ID        int `json:"id" validate:"required"`
	SortOrder int `json:"sort_order"`
}

// WorkNoteFolderFilter 工作笔记文件夹过滤器
type WorkNoteFolderFilter struct {
	OwnerID        *int        `json:"owner_id,omitempty"`
	ParentID       *int        `json:"parent_id,omitempty"`
	Visibility     *Visibility `json:"visibility,omitempty"`
	FolderType     *FolderType `json:"folder_type,omitempty"`
	IsSystemFolder *bool       `json:"is_system_folder,omitempty"`
	MinDepth       *int        `json:"min_depth,omitempty"`
	MaxDepth       *int        `json:"max_depth,omitempty"`
	HasNotes       *bool       `json:"has_notes,omitempty"`
	Search         string      `json:"search,omitempty"`
	SortBy         string      `json:"sort_by,omitempty"`
	Order          string      `json:"order,omitempty"`
	Page           int         `json:"page,omitempty"`
	Limit          int         `json:"limit,omitempty"`
}

// WorkNoteFolderListResponse 工作笔记文件夹列表响应
type WorkNoteFolderListResponse struct {
	Folders []WorkNoteFolderWithStats `json:"folders"`
	Total   int                       `json:"total"`
	Page    int                       `json:"page"`
	Limit   int                       `json:"limit"`
}

// WorkNoteFolderTreeResponse 工作笔记文件夹树响应
type WorkNoteFolderTreeResponse struct {
	Tree         []WorkNoteFolderTree `json:"tree"`
	ExpandedKeys []int                `json:"expanded_keys,omitempty"`
	TotalCount   int                  `json:"total_count"`
}

// BatchMoveNotesToFolderRequest 批量移动笔记到文件夹请求
type BatchMoveNotesToFolderRequest struct {
	NoteIDs        []int `json:"note_ids" validate:"required,min=1"`
	TargetFolderID *int  `json:"target_folder_id,omitempty"`
}

// FolderOperationResult 文件夹操作结果
type FolderOperationResult struct {
	Success         bool     `json:"success"`
	AffectedIDs     []int    `json:"affected_ids,omitempty"`
	WarningMessages []string `json:"warning_messages,omitempty"`
	ErrorMessage    *string  `json:"error_message,omitempty"`
}

// 辅助结构

// FolderPermission 文件夹权限信息
type FolderPermission struct {
	FolderID                int        `json:"folder_id" db:"folder_id"`
	FolderName              string     `json:"folder_name" db:"folder_name"`
	Path                    LTree      `json:"path" db:"path"`
	OwnerID                 int        `json:"owner_id" db:"owner_id"`
	Visibility              Visibility `json:"visibility" db:"visibility"`
	OwnerPermission         *string    `json:"owner_permission,omitempty" db:"owner_permission"`
	CollaboratorPermission  *string    `json:"collaborator_permission,omitempty" db:"collaborator_permission"`
	PermissionGrantedBy     *int       `json:"permission_granted_by,omitempty" db:"permission_granted_by"`
	PermissionGrantedAt     *time.Time `json:"permission_granted_at,omitempty" db:"permission_granted_at"`
	PermissionExpiresAt     *time.Time `json:"permission_expires_at,omitempty" db:"permission_expires_at"`
	InheritedPermission     *string    `json:"inherited_permission,omitempty" db:"inherited_permission"`
}

// FolderStatistics 文件夹统计信息
type FolderStatistics struct {
	FolderID              int        `json:"folder_id"`
	DirectNotesCount      int        `json:"direct_notes_count"`
	TotalNotesCount       int        `json:"total_notes_count"`
	DirectChildrenCount   int        `json:"direct_children_count"`
	TotalDescendantsCount int        `json:"total_descendants_count"`
	TotalSize             int64      `json:"total_size_bytes"`
	LastActivityAt        *time.Time `json:"last_activity_at"`
	AverageNoteSize       float64    `json:"average_note_size"`
}

// FolderIntegrityIssue 文件夹完整性问题
type FolderIntegrityIssue struct {
	IssueType   string `json:"issue_type" db:"issue_type"`
	FolderID    int    `json:"folder_id" db:"folder_id"`
	FolderName  string `json:"folder_name" db:"folder_name"`
	Description string `json:"description" db:"description"`
}

// FolderAncestor 文件夹祖先信息
type FolderAncestor struct {
	ID    int   `json:"id"`
	Name  string `json:"name"`
	Path  LTree `json:"path"`
	Level int   `json:"level"`
}

// FolderSearchResult 文件夹搜索结果
type FolderSearchResult struct {
	WorkNoteFolderWithStats
	MatchType       string  `json:"match_type"` // name, description, path
	MatchScore      float64 `json:"match_score"`
	HighlightedName string  `json:"highlighted_name,omitempty"`
}

// 实例方法

// GetAncestorPaths 获取祖先路径列表
func (f *WorkNoteFolder) GetAncestorPaths() []LTree {
	if f.Path == "" {
		return []LTree{}
	}
	
	labels := f.Path.GetLabels()
	ancestors := make([]LTree, 0, len(labels)-1)
	
	for i := 1; i < len(labels); i++ {
		path := strings.Join(labels[:i], ".")
		ancestors = append(ancestors, LTree(path))
	}
	
	return ancestors
}

// IsDescendantOf 检查是否为指定文件夹的后代
func (f *WorkNoteFolder) IsDescendantOf(ancestorPath LTree) bool {
	if ancestorPath == "" || f.Path == "" {
		return false
	}
	
	return strings.HasPrefix(string(f.Path), string(ancestorPath)+".")
}

// IsAncestorOf 检查是否为指定文件夹的祖先
func (f *WorkNoteFolder) IsAncestorOf(descendantPath LTree) bool {
	if f.Path == "" || descendantPath == "" {
		return false
	}
	
	return strings.HasPrefix(string(descendantPath), string(f.Path)+".")
}

// GetLevel 获取在树中的层级（相对于根节点）
func (f *WorkNoteFolder) GetLevel() int {
	return f.Path.GetDepth() - 1
}

// CanMoveTo 检查是否可以移动到指定父文件夹
func (f *WorkNoteFolder) CanMoveTo(targetParentPath LTree) bool {
	// 不能移动到自己或自己的后代
	if targetParentPath == f.Path || strings.HasPrefix(string(targetParentPath), string(f.Path)+".") {
		return false
	}
	return true
}

// Validate 验证文件夹数据
func (f *WorkNoteFolder) Validate() error {
	if f.Name == "" {
		return errors.New("folder name is required")
	}
	
	if len(f.Name) > 255 {
		return errors.New("folder name too long")
	}
	
	if f.Depth < 0 || f.Depth > 20 {
		return errors.New("folder depth must be between 0 and 20")
	}
	
	return nil
}

// ToDocumentFolder 转换为DocumentFolder兼容结构
func (f *WorkNoteFolder) ToDocumentFolder() DocumentFolder {
	return DocumentFolder{
		ID:             f.ID,
		Name:           f.Name,
		Description:    f.Description,
		ParentFolderID: f.ParentFolderID,
		OwnerID:        f.OwnerID,
		Visibility:     f.Visibility,
		Color:          f.Color,
		Icon:           f.Icon,
		SortOrder:      f.SortOrder,
		CreatedBy:      f.CreatedBy,
		CreatedAt:      f.CreatedAt,
		UpdatedAt:      f.UpdatedAt,
		DeletedAt:      f.DeletedAt,
		DocumentCount:  f.NoteCountCached,
	}
}

// FromDocumentFolder 从DocumentFolder转换
func (f *WorkNoteFolder) FromDocumentFolder(df DocumentFolder) {
	f.ID = df.ID
	f.Name = df.Name
	f.Description = df.Description
	f.ParentFolderID = df.ParentFolderID
	f.OwnerID = df.OwnerID
	f.Visibility = df.Visibility
	f.Color = df.Color
	f.Icon = df.Icon
	f.SortOrder = df.SortOrder
	f.CreatedBy = df.CreatedBy
	f.CreatedAt = df.CreatedAt
	f.UpdatedAt = df.UpdatedAt
	f.DeletedAt = df.DeletedAt
	f.NoteCountCached = df.DocumentCount
}

// JSON序列化支持

// MarshalJSON 自定义JSON序列化
func (f WorkNoteFolder) MarshalJSON() ([]byte, error) {
	type Alias WorkNoteFolder
	return json.Marshal(&struct {
		Path string `json:"path"`
		Alias
	}{
		Path:  f.Path.String(),
		Alias: (Alias)(f),
	})
}

// UnmarshalJSON 自定义JSON反序列化
func (f *WorkNoteFolder) UnmarshalJSON(data []byte) error {
	type Alias WorkNoteFolder
	aux := &struct {
		Path string `json:"path"`
		*Alias
	}{
		Alias: (*Alias)(f),
	}
	
	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}
	
	f.Path = LTree(aux.Path)
	return nil
}
