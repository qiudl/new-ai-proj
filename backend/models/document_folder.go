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
	OwnerName       *string           `json:"owner_name,omitempty" db:"owner_name"`
	CreatorName     *string           `json:"creator_name,omitempty" db:"creator_name"`
	ParentName      *string           `json:"parent_name,omitempty" db:"parent_name"`
	Children        []DocumentFolder  `json:"children,omitempty"`
	DocumentCount   int               `json:"document_count,omitempty" db:"document_count"`
	ChildrenCount   int               `json:"children_count,omitempty" db:"children_count"`
	DocumentsCount  int               `json:"documents_count,omitempty" db:"documents_count"`
	CanEdit         bool              `json:"can_edit,omitempty"`
	CanDelete       bool              `json:"can_delete,omitempty"`
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

// 类型别名以兼容现有代码
type DocumentFolderRequest = CreateDocumentFolderRequest
type DocumentFolderResponse = DocumentFolder

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
	Tree []DocumentFolderTree `json:"tree"`
}

// DocumentFolderTree 文档文件夹树结构
type DocumentFolderTree struct {
	DocumentFolder
	Children []DocumentFolderTree `json:"children,omitempty"`
}

// 基于DocumentFolder结构创建的树节点类型，包含所有必需字段
type FolderTreeNode struct {
	ID             int                `json:"id"`
	Name           string             `json:"name"`
	ParentFolderID *int               `json:"parent_folder_id"`
	Color          *string            `json:"color"`
	Icon           *string            `json:"icon"`
	DocumentsCount int                `json:"documents_count"`
	CanEdit        bool               `json:"can_edit"`
	Children       []FolderTreeNode   `json:"children,omitempty"`
}

// DocumentFolderStats 文档文件夹统计
type DocumentFolderStats struct {
	FolderID      int `json:"folder_id"`
	DocumentCount int `json:"document_count"`
	SubfolderCount int `json:"subfolder_count"`
	TotalSize     int64 `json:"total_size"`
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

// 工具函数

// BuildFolderTree 构建文件夹树
func BuildFolderTree(folders []WorkNoteFolderWithStats) []WorkNoteFolderTree {
	// 创建ID到节点的映射
	nodeMap := make(map[int]*WorkNoteFolderTree)
	var roots []WorkNoteFolderTree
	
	// 初始化所有节点
	for _, folder := range folders {
		node := WorkNoteFolderTree{
			WorkNoteFolderWithStats: folder,
			Children:                make([]WorkNoteFolderTree, 0),
		}
		nodeMap[folder.ID] = &node
	}
	
	// 构建树结构
	for _, folder := range folders {
		node := nodeMap[folder.ID]
		if folder.ParentFolderID == nil {
			// 根节点
			roots = append(roots, *node)
		} else if parent, exists := nodeMap[*folder.ParentFolderID]; exists {
			// 添加到父节点的children中
			parent.Children = append(parent.Children, *node)
		}
	}
	
	return roots
}

// SortFolderTree 递归排序文件夹树
func SortFolderTree(tree []WorkNoteFolderTree) {
	for i := range tree {
		// 按sort_order排序children
		for j := 0; j < len(tree[i].Children); j++ {
			for k := j + 1; k < len(tree[i].Children); k++ {
				if tree[i].Children[j].SortOrder > tree[i].Children[k].SortOrder {
					tree[i].Children[j], tree[i].Children[k] = tree[i].Children[k], tree[i].Children[j]
				}
			}
		}
		
		// 递归排序子树
		if len(tree[i].Children) > 0 {
			SortFolderTree(tree[i].Children)
		}
	}
}

// FlattenFolderTree 将文件夹树展开为列表
func FlattenFolderTree(tree []WorkNoteFolderTree) []WorkNoteFolderWithStats {
	var result []WorkNoteFolderWithStats
	
	var flatten func([]WorkNoteFolderTree)
	flatten = func(nodes []WorkNoteFolderTree) {
		for _, node := range nodes {
			result = append(result, node.WorkNoteFolderWithStats)
			if len(node.Children) > 0 {
				flatten(node.Children)
			}
		}
	}
	
	flatten(tree)
	return result
}

// FilterFoldersByPermission 根据权限过滤文件夹
func FilterFoldersByPermission(folders []WorkNoteFolderWithStats, userID int, requiredPermission string) []WorkNoteFolderWithStats {
	var result []WorkNoteFolderWithStats
	
	for _, folder := range folders {
		// 简化权限检查逻辑（实际应该调用权限服务）
		hasPermission := false
		
		switch requiredPermission {
		case "read":
			hasPermission = folder.OwnerID == userID || folder.Visibility != VisibilityPrivate
		case "edit":
			hasPermission = folder.OwnerID == userID || folder.CanEdit
		case "delete":
			hasPermission = folder.OwnerID == userID || folder.CanDelete
		case "manage":
			hasPermission = folder.OwnerID == userID || folder.CanManage
		default:
			hasPermission = folder.OwnerID == userID
		}
		
		if hasPermission {
			result = append(result, folder)
		}
	}
	
	return result
}

// GenerateFolderPath 生成文件夹路径
func GenerateFolderPath(folderID int, parentPath LTree) LTree {
	if parentPath == "" {
		return LTree(fmt.Sprintf("%d", folderID))
	}
	return LTree(fmt.Sprintf("%s.%d", parentPath.String(), folderID))
}

// ParseFolderPath 解析文件夹路径
func ParseFolderPath(path LTree) ([]int, error) {
	if path == "" {
		return []int{}, nil
	}
	
	labels := path.GetLabels()
	ids := make([]int, len(labels))
	
	for i, label := range labels {
		id := 0
		if _, err := fmt.Sscanf(label, "%d", &id); err != nil {
			return nil, fmt.Errorf("invalid path component: %s", label)
		}
		ids[i] = id
	}
	
	return ids, nil
}

// ValidateFolderHierarchy 验证文件夹层级关系的有效性
func ValidateFolderHierarchy(folders []WorkNoteFolder) error {
	folderMap := make(map[int]*WorkNoteFolder)
	
	// 构建文件夹映射
	for i := range folders {
		folderMap[folders[i].ID] = &folders[i]
	}
	
	// 检查每个文件夹
	for _, folder := range folders {
		// 检查父文件夹是否存在
		if folder.ParentFolderID != nil {
			parent, exists := folderMap[*folder.ParentFolderID]
			if !exists {
				return fmt.Errorf("folder %d has non-existent parent %d", folder.ID, *folder.ParentFolderID)
			}
			
			// 检查路径一致性
			expectedPath := GenerateFolderPath(folder.ID, parent.Path)
			if folder.Path != expectedPath {
				return fmt.Errorf("folder %d path inconsistent: expected %s, got %s", 
					folder.ID, expectedPath, folder.Path)
			}
			
			// 检查深度一致性
			if folder.Depth != parent.Depth+1 {
				return fmt.Errorf("folder %d depth inconsistent: expected %d, got %d",
					folder.ID, parent.Depth+1, folder.Depth)
			}
		}
		
		// 检查循环引用
		if err := checkCircularReference(folder.ID, folder.ParentFolderID, folderMap, make(map[int]bool)); err != nil {
			return err
		}
	}
	
	return nil
}

// checkCircularReference 检查循环引用
func checkCircularReference(currentID int, parentID *int, folderMap map[int]*WorkNoteFolder, visited map[int]bool) error {
	if parentID == nil {
		return nil
	}
	
	if visited[*parentID] {
		return fmt.Errorf("circular reference detected for folder %d", currentID)
	}
	
	parent, exists := folderMap[*parentID]
	if !exists {
		return nil
	}
	
	visited[*parentID] = true
	return checkCircularReference(*parentID, parent.ParentFolderID, folderMap, visited)
}

// CalculateFolderStatistics 计算文件夹统计信息
func CalculateFolderStatistics(folder WorkNoteFolder, allFolders []WorkNoteFolder, allNotes []Document) FolderStatistics {
	stats := FolderStatistics{
		FolderID: folder.ID,
	}
	
	// 计算直接笔记数量
	for _, note := range allNotes {
		if note.FolderID != nil && *note.FolderID == folder.ID && note.DeletedAt == nil {
			stats.DirectNotesCount++
			if note.FileSize != nil {
				stats.TotalSize += *note.FileSize
			}
		}
	}
	
	// 计算直接子文件夹数量
	for _, f := range allFolders {
		if f.ParentFolderID != nil && *f.ParentFolderID == folder.ID && f.DeletedAt == nil {
			stats.DirectChildrenCount++
		}
	}
	
	// 计算总笔记数量（包括子文件夹）
	for _, note := range allNotes {
		if note.FolderID != nil && note.DeletedAt == nil {
			if noteFolder, exists := findFolderByID(*note.FolderID, allFolders); exists {
				if noteFolder.IsDescendantOf(folder.Path) || noteFolder.ID == folder.ID {
					stats.TotalNotesCount++
					if note.FileSize != nil {
						stats.TotalSize += *note.FileSize
					}
				}
			}
		}
	}
	
	// 计算总后代数量
	for _, f := range allFolders {
		if f.DeletedAt == nil && f.IsDescendantOf(folder.Path) {
			stats.TotalDescendantsCount++
		}
	}
	
	// 计算平均笔记大小
	if stats.TotalNotesCount > 0 {
		stats.AverageNoteSize = float64(stats.TotalSize) / float64(stats.TotalNotesCount)
	}
	
	return stats
}

// findFolderByID 根据ID查找文件夹
func findFolderByID(id int, folders []WorkNoteFolder) (*WorkNoteFolder, bool) {
	for i := range folders {
		if folders[i].ID == id {
			return &folders[i], true
		}
	}
	return nil, false
}
