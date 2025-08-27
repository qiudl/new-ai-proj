// Work Note Folder Management Utilities
// Helper functions for folder tree operations

package models

import (
	"fmt"
)

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

// FolderTreeToJSON 将文件夹树转换为JSON字符串（用于调试）
func FolderTreeToJSON(tree []WorkNoteFolderTree) (string, error) {
	data, err := json.Marshal(tree)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// FindFolderInTree 在文件夹树中查找指定ID的文件夹
func FindFolderInTree(tree []WorkNoteFolderTree, folderID int) *WorkNoteFolderTree {
	var find func([]WorkNoteFolderTree, int) *WorkNoteFolderTree
	find = func(nodes []WorkNoteFolderTree, id int) *WorkNoteFolderTree {
		for i := range nodes {
			if nodes[i].ID == id {
				return &nodes[i]
			}
			if len(nodes[i].Children) > 0 {
				if result := find(nodes[i].Children, id); result != nil {
					return result
				}
			}
		}
		return nil
	}
	
	return find(tree, folderID)
}

// GetFolderPath 获取文件夹在树中的完整路径名称
func GetFolderPath(tree []WorkNoteFolderTree, folderID int) []string {
	var path []string
	
	var findPath func([]WorkNoteFolderTree, int, []string) []string
	findPath = func(nodes []WorkNoteFolderTree, id int, currentPath []string) []string {
		for _, node := range nodes {
			newPath := append(currentPath, node.Name)
			if node.ID == id {
				return newPath
			}
			if len(node.Children) > 0 {
				if result := findPath(node.Children, id, newPath); len(result) > 0 {
					return result
				}
			}
		}
		return []string{}
	}
	
	return findPath(tree, folderID, path)
}

// CountTotalNodes 计算文件夹树中的总节点数
func CountTotalNodes(tree []WorkNoteFolderTree) int {
	count := 0
	
	var countNodes func([]WorkNoteFolderTree)
	countNodes = func(nodes []WorkNoteFolderTree) {
		count += len(nodes)
		for _, node := range nodes {
			if len(node.Children) > 0 {
				countNodes(node.Children)
			}
		}
	}
	
	countNodes(tree)
	return count
}

// GetMaxDepth 获取文件夹树的最大深度
func GetMaxDepth(tree []WorkNoteFolderTree) int {
	maxDepth := 0
	
	var getDepth func([]WorkNoteFolderTree, int) int
	getDepth = func(nodes []WorkNoteFolderTree, currentDepth int) int {
		if len(nodes) == 0 {
			return currentDepth
		}
		
		max := currentDepth + 1
		for _, node := range nodes {
			if len(node.Children) > 0 {
				depth := getDepth(node.Children, currentDepth+1)
				if depth > max {
					max = depth
				}
			}
		}
		return max
	}
	
	return getDepth(tree, 0)
}

// CompactFolderTree 紧凑化文件夹树（移除空的children数组）
func CompactFolderTree(tree []WorkNoteFolderTree) []WorkNoteFolderTree {
	result := make([]WorkNoteFolderTree, len(tree))
	
	for i, node := range tree {
		result[i] = node
		if len(node.Children) == 0 {
			result[i].Children = nil
		} else {
			result[i].Children = CompactFolderTree(node.Children)
		}
	}
	
	return result
}

// ExpandFolderTree 展开文件夹树到指定深度
func ExpandFolderTree(tree []WorkNoteFolderTree, maxDepth int) []WorkNoteFolderTree {
	if maxDepth <= 0 {
		return tree
	}
	
	result := make([]WorkNoteFolderTree, len(tree))
	
	for i, node := range tree {
		result[i] = node
		result[i].Expanded = maxDepth > 1
		
		if len(node.Children) > 0 && maxDepth > 1 {
			result[i].Children = ExpandFolderTree(node.Children, maxDepth-1)
		}
	}
	
	return result
}
