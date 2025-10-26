// Work Note Folder Tree Models
// 三棵文件夹树的数据模型和类型定义
// 用于Private/Team/Public三棵独立的文件夹树

package models

import (
	"errors"
	"time"
)

// FolderTreeType 文件夹树类型
type FolderTreeType string

const (
	TreeTypePrivate FolderTreeType = "private" // 私人笔记树
	TreeTypeTeam    FolderTreeType = "team"    // 团队笔记树
	TreeTypePublic  FolderTreeType = "public"  // 公开笔记树
)

// IsValid 验证树类型是否有效
func (t FolderTreeType) IsValid() bool {
	switch t {
	case TreeTypePrivate, TreeTypeTeam, TreeTypePublic:
		return true
	default:
		return false
	}
}

// String 返回树类型的字符串表示
func (t FolderTreeType) String() string {
	return string(t)
}

// FolderTreeRoot 文件夹树根节点信息（虚拟）
type FolderTreeRoot struct {
	Type        FolderTreeType `json:"type"`
	Name        string         `json:"name"`
	Description string         `json:"description"`
	Icon        string         `json:"icon"`
	Color       string         `json:"color"`
	FolderCount int            `json:"folder_count"` // 该树下的文件夹总数
	NoteCount   int            `json:"note_count"`   // 该树下的笔记总数
}

// GetAllTreeRoots 获取三棵树的根节点信息
func GetAllTreeRoots() []FolderTreeRoot {
	return []FolderTreeRoot{
		{
			Type:        TreeTypePrivate,
			Name:        "私人笔记",
			Description: "只有您可见的私人笔记",
			Icon:        "lock",
			Color:       "#1890ff",
		},
		{
			Type:        TreeTypeTeam,
			Name:        "团队笔记",
			Description: "团队成员共享的笔记",
			Icon:        "team",
			Color:       "#52c41a",
		},
		{
			Type:        TreeTypePublic,
			Name:        "公开笔记",
			Description: "所有人可见的公开笔记",
			Icon:        "global",
			Color:       "#faad14",
		},
	}
}

// GetTreeRootByType 根据类型获取树根节点信息
func GetTreeRootByType(treeType FolderTreeType) (*FolderTreeRoot, error) {
	roots := GetAllTreeRoots()
	for _, root := range roots {
		if root.Type == treeType {
			return &root, nil
		}
	}
	return nil, errors.New("invalid tree type")
}

// FolderTreeOverview 文件夹树概览信息
type FolderTreeOverview struct {
	Trees     []FolderTreeRoot `json:"trees"`
	TotalNotes int             `json:"total_notes"`
	TotalFolders int           `json:"total_folders"`
	UpdatedAt time.Time        `json:"updated_at"`
}

// FolderTreeQuery 文件夹树查询参数
type FolderTreeQuery struct {
	TreeType  FolderTreeType `json:"tree_type" binding:"required"`
	ParentID  *int           `json:"parent_id,omitempty"`
	MaxDepth  int            `json:"max_depth,omitempty"`
	UserID    int            `json:"user_id"`
	ProjectID *int           `json:"project_id,omitempty"`
}

// FolderTreeResponse 文件夹树响应
type FolderTreeResponse struct {
	TreeType    FolderTreeType    `json:"tree_type"`
	TreeName    string            `json:"tree_name"`
	TreeIcon    string            `json:"tree_icon"`
	TreeColor   string            `json:"tree_color"`
	Folders     []WorkNoteFolder  `json:"folders"`
	TotalCount  int               `json:"total_count"`
	IsLazyLoad  bool              `json:"is_lazy_load,omitempty"`
	ParentID    *int              `json:"parent_id,omitempty"`
	MaxDepth    int               `json:"max_depth,omitempty"`
}

// CreateFolderInTreeRequest 在指定树中创建文件夹请求
type CreateFolderInTreeRequest struct {
	TreeType    FolderTreeType `json:"tree_type" binding:"required"`
	Name        string         `json:"name" binding:"required,min=1,max=100"`
	Description *string        `json:"description,omitempty"`
	ParentID    *int           `json:"parent_id,omitempty"`
	ProjectID   *int           `json:"project_id,omitempty"`
	Color       *string        `json:"color,omitempty"`
	Icon        *string        `json:"icon,omitempty"`
}

// Validate 验证请求数据
func (r *CreateFolderInTreeRequest) Validate() error {
	if !r.TreeType.IsValid() {
		return errors.New("invalid tree type")
	}

	if len(r.Name) == 0 || len(r.Name) > 100 {
		return errors.New("folder name must be between 1 and 100 characters")
	}

	return nil
}

// ToCreateWorkNoteFolderRequest 转换为创建文件夹请求
func (r *CreateFolderInTreeRequest) ToCreateWorkNoteFolderRequest() CreateWorkNoteFolderRequest {
	return CreateWorkNoteFolderRequest{
		Name:        r.Name,
		Description: r.Description,
		ParentID:    r.ParentID,
		ProjectID:   r.ProjectID,
		Visibility:  Visibility(r.TreeType), // TreeType与Visibility一致
		Color:       r.Color,
		Icon:        r.Icon,
	}
}

// MoveFolderInTreeRequest 在树内移动文件夹请求
type MoveFolderInTreeRequest struct {
	TargetParentID *int `json:"target_parent_id"`
	SortOrder      *int `json:"sort_order,omitempty"`
}

// Validate 验证请求数据
func (r *MoveFolderInTreeRequest) Validate() error {
	// 允许移动到根节点（target_parent_id = null）
	return nil
}

// FolderTreeStats 文件夹树统计信息
type FolderTreeStats struct {
	TreeType     FolderTreeType `json:"tree_type"`
	FolderCount  int            `json:"folder_count"`
	NoteCount    int            `json:"note_count"`
	RootFolders  int            `json:"root_folders"`
	MaxDepth     int            `json:"max_depth"`
	LastModified time.Time      `json:"last_modified"`
}

// TreePermissionCheck 树权限检查结果
type TreePermissionCheck struct {
	TreeType    FolderTreeType `json:"tree_type"`
	CanView     bool           `json:"can_view"`
	CanCreate   bool           `json:"can_create"`
	CanEdit     bool           `json:"can_edit"`
	CanDelete   bool           `json:"can_delete"`
	Reason      string         `json:"reason,omitempty"`
}

// GetTreePermission 获取用户对指定树的权限
func GetTreePermission(userID int, treeType FolderTreeType) TreePermissionCheck {
	permission := TreePermissionCheck{
		TreeType: treeType,
	}

	switch treeType {
	case TreeTypePrivate:
		// 私人树：所有用户对自己的私人树有完全权限
		permission.CanView = true
		permission.CanCreate = true
		permission.CanEdit = true
		permission.CanDelete = true
		permission.Reason = "owner of private tree"

	case TreeTypeTeam:
		// 团队树：需要检查团队成员身份（这里简化处理）
		permission.CanView = true
		permission.CanCreate = true // TODO: 检查是否为团队管理员
		permission.CanEdit = true
		permission.CanDelete = true
		permission.Reason = "team member"

	case TreeTypePublic:
		// 公开树：所有人可查看，有权限的用户可创建
		permission.CanView = true
		permission.CanCreate = true // TODO: 检查创建权限
		permission.CanEdit = true
		permission.CanDelete = true
		permission.Reason = "public access"
	}

	return permission
}

// CrossTreeMoveError 跨树移动错误
type CrossTreeMoveError struct {
	SourceTreeType FolderTreeType
	TargetTreeType FolderTreeType
}

func (e *CrossTreeMoveError) Error() string {
	return "cannot move folder across different trees: from " +
		string(e.SourceTreeType) + " to " + string(e.TargetTreeType)
}

// NewCrossTreeMoveError 创建跨树移动错误
func NewCrossTreeMoveError(sourceType, targetType FolderTreeType) error {
	return &CrossTreeMoveError{
		SourceTreeType: sourceType,
		TargetTreeType: targetType,
	}
}
