// Work Note Permission Service
// 工作笔记权限检查服务，封装数据库中的权限检查SQL函数

package services

import (
	"ai-project-backend/database"
	"fmt"
	"log"
)

// WorkNotePermissionService 工作笔记权限服务
type WorkNotePermissionService struct {
	db database.DB
}

// NewWorkNotePermissionService 创建工作笔记权限服务
func NewWorkNotePermissionService(db database.DB) *WorkNotePermissionService {
	return &WorkNotePermissionService{
		db: db,
	}
}

// IsEnterpriseAdmin 检查用户是否是企业管理员
// 调用数据库函数 is_enterprise_admin(user_id)
func (s *WorkNotePermissionService) IsEnterpriseAdmin(userID int) (bool, error) {
	query := `SELECT is_enterprise_admin($1)`

	var isAdmin bool
	err := s.db.QueryRow(query, userID).Scan(&isAdmin)
	if err != nil {
		log.Printf("[WorkNotePermissionService] IsEnterpriseAdmin error for user %d: %v", userID, err)
		return false, fmt.Errorf("failed to check enterprise admin status: %w", err)
	}

	return isAdmin, nil
}

// CanManageTeamFolder 检查用户是否可以管理团队文件夹
// 调用数据库函数 can_manage_team_folder(user_id, folder_id, operation)
// operation: 'create', 'read', 'update', 'delete'
func (s *WorkNotePermissionService) CanManageTeamFolder(userID int, folderID *int, operation string) (bool, error) {
	query := `SELECT can_manage_team_folder($1, $2, $3)`

	var canManage bool
	err := s.db.QueryRow(query, userID, folderID, operation).Scan(&canManage)
	if err != nil {
		log.Printf("[WorkNotePermissionService] CanManageTeamFolder error for user %d, folder %v, operation %s: %v",
			userID, folderID, operation, err)
		return false, fmt.Errorf("failed to check team folder permission: %w", err)
	}

	return canManage, nil
}

// CanCreateTeamNote 检查用户是否可以发布团队笔记
// 调用数据库函数 can_create_team_note(user_id)
func (s *WorkNotePermissionService) CanCreateTeamNote(userID int) (bool, error) {
	query := `SELECT can_create_team_note($1)`

	var canCreate bool
	err := s.db.QueryRow(query, userID).Scan(&canCreate)
	if err != nil {
		log.Printf("[WorkNotePermissionService] CanCreateTeamNote error for user %d: %v", userID, err)
		return false, fmt.Errorf("failed to check team note creation permission: %w", err)
	}

	return canCreate, nil
}

// GetFolderVisibility 获取文件夹的visibility类型
func (s *WorkNotePermissionService) GetFolderVisibility(folderID int) (string, error) {
	query := `
		SELECT visibility
		FROM work_note_folders
		WHERE id = $1 AND deleted_at IS NULL
	`

	var visibility string
	err := s.db.QueryRow(query, folderID).Scan(&visibility)
	if err != nil {
		log.Printf("[WorkNotePermissionService] GetFolderVisibility error for folder %d: %v", folderID, err)
		return "", fmt.Errorf("failed to get folder visibility: %w", err)
	}

	return visibility, nil
}

// CheckFolderPermission 综合检查文件夹操作权限
// 根据文件夹类型（private/team/public）和操作类型进行权限检查
func (s *WorkNotePermissionService) CheckFolderPermission(userID int, folderID *int, operation string) (bool, error) {
	// Super admin 总是有权限
	if userID == 1 {
		return true, nil
	}

	// 如果是新建操作且folderID为nil，则检查parent folder的权限
	if folderID == nil {
		// 创建根级文件夹或者创建笔记，使用team folder管理权限检查
		return s.CanManageTeamFolder(userID, nil, operation)
	}

	// 获取文件夹类型
	visibility, err := s.GetFolderVisibility(*folderID)
	if err != nil {
		return false, err
	}

	switch visibility {
	case "private":
		// Private树：只有owner可以操作
		return s.checkPrivateFolderPermission(userID, *folderID, operation)

	case "team":
		// Team树：使用新的权限检查函数
		return s.CanManageTeamFolder(userID, folderID, operation)

	case "public":
		// Public树：只有super admin可以操作
		return userID == 1, nil

	default:
		log.Printf("[WorkNotePermissionService] Unknown visibility type: %s for folder %d", visibility, *folderID)
		return false, fmt.Errorf("unknown folder visibility type: %s", visibility)
	}
}

// checkPrivateFolderPermission 检查private文件夹权限（owner only）
func (s *WorkNotePermissionService) checkPrivateFolderPermission(userID int, folderID int, operation string) (bool, error) {
	query := `
		SELECT owner_id
		FROM work_note_folders
		WHERE id = $1 AND deleted_at IS NULL
	`

	var ownerID int
	err := s.db.QueryRow(query, folderID).Scan(&ownerID)
	if err != nil {
		log.Printf("[WorkNotePermissionService] checkPrivateFolderPermission error for folder %d: %v", folderID, err)
		return false, fmt.Errorf("failed to check folder ownership: %w", err)
	}

	return ownerID == userID, nil
}

// CheckParentFolderPermission 检查父文件夹的创建权限
// 用于创建子文件夹时的权限检查
func (s *WorkNotePermissionService) CheckParentFolderPermission(userID int, parentID int) (bool, error) {
	// 获取父文件夹类型
	visibility, err := s.GetFolderVisibility(parentID)
	if err != nil {
		return false, err
	}

	switch visibility {
	case "private":
		// Private树：需要是owner
		return s.checkPrivateFolderPermission(userID, parentID, "create")

	case "team":
		// Team树：需要是企业管理员
		return s.CanManageTeamFolder(userID, &parentID, "create")

	case "public":
		// Public树：只有super admin
		return userID == 1, nil

	default:
		return false, fmt.Errorf("unknown folder visibility type: %s", visibility)
	}
}
