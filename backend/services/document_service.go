package services

import (
	"context"
	"database/sql"
	"fmt"
	// "strings"
	// "time"

	"github.com/lib/pq"
	"ai-project-backend/models" // 替换为你的项目路径
)

// DocumentService 文档管理服务
type DocumentService struct {
	db *sql.DB
}

// NewDocumentService 创建文档服务实例
func NewDocumentService(db *sql.DB) *DocumentService {
	return &DocumentService{
		db: db,
	}
}

// ====================
// 文件夹管理
// ====================

// CreateFolder 创建文件夹
func (s *DocumentService) CreateFolder(ctx context.Context, req models.DocumentFolderRequest, userID int) (*models.DocumentFolderResponse, error) {
	// 检查父文件夹权限
	if req.ParentFolderID != nil {
		hasPermission, err := s.CheckFolderPermission(ctx, *req.ParentFolderID, userID, "edit")
		if err != nil {
			return nil, err
		}
		if !hasPermission {
			return nil, fmt.Errorf("permission denied: cannot create folder in parent folder")
		}
	}

	// 检查同级别文件夹名称重复
	var existingCount int
	err := s.db.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM document_folders 
		WHERE parent_folder_id = $1 AND name = $2 AND owner_id = $3 AND deleted_at IS NULL
	`, req.ParentFolderID, req.Name, userID).Scan(&existingCount)
	if err != nil {
		return nil, err
	}
	if existingCount > 0 {
		return nil, fmt.Errorf("folder with same name already exists in this location")
	}

	// 创建文件夹
	var folder models.DocumentFolder
	err = s.db.QueryRowContext(ctx, `
		INSERT INTO document_folders 
		(name, description, parent_folder_id, owner_id, visibility, color, icon, sort_order, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, name, description, parent_folder_id, owner_id, visibility, color, icon, sort_order, 
				  created_by, created_at, updated_at
	`, req.Name, req.Description, req.ParentFolderID, userID, req.Visibility, 
	   req.Color, req.Icon, req.SortOrder, userID).Scan(
		&folder.ID, &folder.Name, &folder.Description, &folder.ParentFolderID,
		&folder.OwnerID, &folder.Visibility, &folder.Color, &folder.Icon,
		&folder.SortOrder, &folder.CreatedBy, &folder.CreatedAt, &folder.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	return s.GetFolderByID(ctx, folder.ID, userID)
}

// GetFolderByID 根据ID获取文件夹
func (s *DocumentService) GetFolderByID(ctx context.Context, folderID int, userID int) (*models.DocumentFolderResponse, error) {
	// 检查权限
	hasPermission, err := s.CheckFolderPermission(ctx, folderID, userID, "read")
	if err != nil {
		return nil, err
	}
	if !hasPermission {
		return nil, fmt.Errorf("permission denied: cannot access folder")
	}

	var folder models.DocumentFolderResponse
	err = s.db.QueryRowContext(ctx, `
		SELECT f.id, f.name, f.description, f.parent_folder_id, f.owner_id, f.visibility,
			   f.color, f.icon, f.sort_order, f.created_by, f.created_at, f.updated_at,
			   u1.username as owner_name, u2.username as creator_name,
			   COALESCE(pf.name, '') as parent_name,
			   (SELECT COUNT(*) FROM document_folders cf WHERE cf.parent_folder_id = f.id AND cf.deleted_at IS NULL) as children_count,
			   (SELECT COUNT(*) FROM documents d WHERE d.folder_id = f.id AND d.deleted_at IS NULL) as documents_count
		FROM document_folders f
		LEFT JOIN users u1 ON f.owner_id = u1.id
		LEFT JOIN users u2 ON f.created_by = u2.id
		LEFT JOIN document_folders pf ON f.parent_folder_id = pf.id
		WHERE f.id = $1 AND f.deleted_at IS NULL
	`, folderID).Scan(
		&folder.ID, &folder.Name, &folder.Description, &folder.ParentFolderID,
		&folder.OwnerID, &folder.Visibility, &folder.Color, &folder.Icon,
		&folder.SortOrder, &folder.CreatedBy, &folder.CreatedAt, &folder.UpdatedAt,
		&folder.OwnerName, &folder.CreatorName, &folder.ParentName,
		&folder.ChildrenCount, &folder.DocumentsCount,
	)
	if err != nil {
		return nil, err
	}

	// 设置权限标识
	folder.CanEdit = folder.OwnerID == userID || folder.CreatedBy == userID
	folder.CanDelete = folder.CanEdit && folder.ChildrenCount == 0 && folder.DocumentsCount == 0

	return &folder, nil
}

// GetFolderTree 获取文件夹树结构
func (s *DocumentService) GetFolderTree(ctx context.Context, userID int) ([]models.FolderTreeNode, error) {
	// 获取用户可访问的所有文件夹
	rows, err := s.db.QueryContext(ctx, `
		SELECT f.id, f.name, f.parent_folder_id, f.color, f.icon,
			   (SELECT COUNT(*) FROM documents d WHERE d.folder_id = f.id AND d.deleted_at IS NULL) as documents_count,
			   (f.owner_id = $1 OR f.created_by = $1 OR f.visibility != 'private' OR 
				EXISTS(SELECT 1 FROM folder_collaborators fc WHERE fc.folder_id = f.id AND fc.user_id = $1)) as can_edit
		FROM document_folders f
		WHERE f.deleted_at IS NULL
		  AND (f.owner_id = $1 OR f.created_by = $1 OR f.visibility != 'private' OR 
			   EXISTS(SELECT 1 FROM folder_collaborators fc WHERE fc.folder_id = f.id AND fc.user_id = $1))
		ORDER BY f.parent_folder_id NULLS FIRST, f.sort_order, f.name
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var folders []models.FolderTreeNode
	folderMap := make(map[int]*models.FolderTreeNode)

	for rows.Next() {
		var folder models.FolderTreeNode
		var parentID *int
		err := rows.Scan(&folder.ID, &folder.Name, &parentID, &folder.Color, 
						 &folder.Icon, &folder.DocumentsCount, &folder.CanEdit)
		if err != nil {
			return nil, err
		}

		folder.ParentFolderID = parentID
		folder.Children = []models.FolderTreeNode{}
		folderMap[folder.ID] = &folder

		if parentID == nil {
			// 根级文件夹
			folders = append(folders, folder)
		} else {
			// 子文件夹
			if parent, exists := folderMap[*parentID]; exists {
				parent.Children = append(parent.Children, folder)
			}
		}
	}

	return folders, nil
}

// MoveFolder 移动文件夹
func (s *DocumentService) MoveFolder(ctx context.Context, folderID int, targetParentID *int, userID int) error {
	// 检查源文件夹权限
	hasPermission, err := s.CheckFolderPermission(ctx, folderID, userID, "edit")
	if err != nil {
		return err
	}
	if !hasPermission {
		return fmt.Errorf("permission denied: cannot move folder")
	}

	// 检查目标文件夹权限
	if targetParentID != nil {
		hasPermission, err := s.CheckFolderPermission(ctx, *targetParentID, userID, "edit")
		if err != nil {
			return err
		}
		if !hasPermission {
			return fmt.Errorf("permission denied: cannot move to target folder")
		}

		// 检查是否会造成循环引用
		isDescendant, err := s.IsFolderDescendant(ctx, *targetParentID, folderID)
		if err != nil {
			return err
		}
		if isDescendant {
			return fmt.Errorf("cannot move folder to its descendant")
		}
	}

	// 更新文件夹
	_, err = s.db.ExecContext(ctx, `
		UPDATE document_folders 
		SET parent_folder_id = $1, updated_at = CURRENT_TIMESTAMP
		WHERE id = $2
	`, targetParentID, folderID)
	
	return err
}

// DeleteFolder 删除文件夹（软删除）
func (s *DocumentService) DeleteFolder(ctx context.Context, folderID int, userID int) error {
	// 检查权限
	hasPermission, err := s.CheckFolderPermission(ctx, folderID, userID, "admin")
	if err != nil {
		return err
	}
	if !hasPermission {
		return fmt.Errorf("permission denied: cannot delete folder")
	}

	// 检查是否有子文件夹或文档
	var childCount int
	err = s.db.QueryRowContext(ctx, `
		SELECT 
			(SELECT COUNT(*) FROM document_folders WHERE parent_folder_id = $1 AND deleted_at IS NULL) +
			(SELECT COUNT(*) FROM documents WHERE folder_id = $1 AND deleted_at IS NULL)
	`, folderID).Scan(&childCount)
	if err != nil {
		return err
	}
	if childCount > 0 {
		return fmt.Errorf("cannot delete folder: contains subfolders or documents")
	}

	// 软删除
	_, err = s.db.ExecContext(ctx, `
		UPDATE document_folders 
		SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1
	`, folderID)
	
	return err
}

// ====================
// 文档管理
// ====================

// CreateDocument 创建文档
func (s *DocumentService) CreateDocument(ctx context.Context, req models.DocumentRequest, userID int) (*models.DocumentResponse, error) {
	// 检查文件夹权限
	if req.FolderID != nil {
		hasPermission, err := s.CheckFolderPermission(ctx, *req.FolderID, userID, "edit")
		if err != nil {
			return nil, err
		}
		if !hasPermission {
			return nil, fmt.Errorf("permission denied: cannot create document in folder")
		}
	}

	// 设置默认值
	if req.Status == "" {
		req.Status = models.DocumentStatusDraft
	}
	if req.Visibility == "" {
		req.Visibility = models.VisibilityPrivate
	}

	// 创建文档
	var doc models.Document
	err := s.db.QueryRowContext(ctx, `
		INSERT INTO documents 
		(folder_id, title, content, type, status, description, tags, metadata, 
		 owner_id, visibility, is_template, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING id, folder_id, title, content, type, status, description, tags, metadata,
				  owner_id, visibility, version, is_template, created_by, created_at, updated_at
	`, req.FolderID, req.Title, req.Content, req.Type, req.Status, req.Description,
	   pq.Array(req.Tags), req.Metadata, userID, req.Visibility, req.IsTemplate, userID).Scan(
		&doc.ID, &doc.FolderID, &doc.Title, &doc.Content, &doc.Type, &doc.Status,
		&doc.Description, &doc.Tags, &doc.Metadata, &doc.OwnerID, &doc.Visibility,
		&doc.Version, &doc.IsTemplate, &doc.CreatedBy, &doc.CreatedAt, &doc.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	return s.GetDocumentByID(ctx, doc.ID, userID)
}

// GetDocumentByID 根据ID获取文档
func (s *DocumentService) GetDocumentByID(ctx context.Context, documentID int, userID int) (*models.DocumentResponse, error) {
	// 检查权限
	hasPermission, err := s.CheckDocumentPermission(ctx, documentID, userID, "read")
	if err != nil {
		return nil, err
	}
	if !hasPermission {
		return nil, fmt.Errorf("permission denied: cannot access document")
	}

	var doc models.DocumentResponse
	err = s.db.QueryRowContext(ctx, `
		SELECT d.id, d.folder_id, d.title, d.content, d.type, d.status, d.file_url, d.file_size,
			   d.mime_type, d.description, d.tags, d.metadata, d.owner_id, d.visibility,
			   d.version, d.parent_document_id, d.is_template, d.created_by, d.created_at, d.updated_at,
			   COALESCE(f.name, '') as folder_name,
			   u1.username as owner_name, u2.username as creator_name
		FROM documents d
		LEFT JOIN document_folders f ON d.folder_id = f.id
		LEFT JOIN users u1 ON d.owner_id = u1.id
		LEFT JOIN users u2 ON d.created_by = u2.id
		WHERE d.id = $1 AND d.deleted_at IS NULL
	`, documentID).Scan(
		&doc.ID, &doc.FolderID, &doc.Title, &doc.Content, &doc.Type, &doc.Status,
		&doc.FileURL, &doc.FileSize, &doc.MimeType, &doc.Description, &doc.Tags,
		&doc.Metadata, &doc.OwnerID, &doc.Visibility, &doc.Version,
		&doc.ParentDocID, &doc.IsTemplate, &doc.CreatedBy, &doc.CreatedAt, &doc.UpdatedAt,
		&doc.FolderName, &doc.OwnerName, &doc.CreatorName,
	)
	if err != nil {
		return nil, err
	}

	// 获取关联关系
	// relations, err := s.GetDocumentRelations(ctx, documentID)
	// if err != nil {
	//     return nil, err
	// }
	// doc.Relations = relations

	// 获取协作者
	// collaborators, err := s.GetDocumentCollaborators(ctx, documentID)
	// if err != nil {
	//     return nil, err
	// }
	// doc.Collaborators = collaborators

	// 设置权限标识
	doc.CanEdit = s.canEditDocument(&doc.Document, userID)
	doc.CanDelete = s.canDeleteDocument(&doc.Document, userID)
	doc.CanShare = s.canShareDocument(&doc.Document, userID)

	// 记录访问历史
	// s.AddUserDocumentRelation(ctx, documentID, userID, models.UserRelationRecent)

	return &doc, nil
}

// GetDocumentsByFolder 获取文件夹下的文档
func (s *DocumentService) GetDocumentsByFolder(ctx context.Context, folderID *int, userID int, page, limit int) (*models.DocumentSearchResponse, error) {
	// 检查文件夹权限
	if folderID != nil {
		hasPermission, err := s.CheckFolderPermission(ctx, *folderID, userID, "read")
		if err != nil {
			return nil, err
		}
		if !hasPermission {
			return nil, fmt.Errorf("permission denied: cannot access folder")
		}
	}

	// 计算偏移量
	offset := (page - 1) * limit

	// 构建查询条件
	whereClause := "d.deleted_at IS NULL"
	args := []interface{}{userID}
	argCount := 1

	if folderID != nil {
		argCount++
		whereClause += fmt.Sprintf(" AND d.folder_id = $%d", argCount)
		args = append(args, *folderID)
	} else {
		whereClause += " AND d.folder_id IS NULL"
	}

	// 添加权限检查
	whereClause += fmt.Sprintf(` AND (
		d.owner_id = $1 OR d.created_by = $1 OR d.visibility = 'public' OR
		(d.visibility = 'team') OR
		EXISTS(SELECT 1 FROM document_collaborators dc WHERE dc.document_id = d.id AND dc.user_id = $1)
	)`)

	// 查询文档
	query := fmt.Sprintf(`
		SELECT d.id, d.folder_id, d.title, d.type, d.status, d.description, d.tags,
			   d.owner_id, d.visibility, d.version, d.is_template, d.created_by,
			   d.created_at, d.updated_at, LENGTH(d.content) as content_size, d.file_size,
			   COALESCE(f.name, '') as folder_name,
			   u1.username as owner_name, u2.username as creator_name
		FROM documents d
		LEFT JOIN document_folders f ON d.folder_id = f.id
		LEFT JOIN users u1 ON d.owner_id = u1.id
		LEFT JOIN users u2 ON d.created_by = u2.id
		WHERE %s
		ORDER BY d.updated_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argCount+1, argCount+2)

	args = append(args, limit, offset)

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var documents []models.Document
	for rows.Next() {
		var doc models.Document
		var contentSize *int64
		err := rows.Scan(
			&doc.ID, &doc.FolderID, &doc.Title, &doc.Type, &doc.Status,
			&doc.Description, &doc.Tags, &doc.OwnerID, &doc.Visibility,
			&doc.Version, &doc.IsTemplate, &doc.CreatedBy, &doc.CreatedAt,
			&doc.UpdatedAt, &contentSize, &doc.FileSize,
			&doc.FolderName, &doc.OwnerName, &doc.OwnerName,
		)
		if err != nil {
			return nil, err
		}

		documents = append(documents, doc)
	}

	// 查询总数
	countQuery := fmt.Sprintf(`
		SELECT COUNT(*) FROM documents d WHERE %s
	`, whereClause)
	var totalCount int
	err = s.db.QueryRowContext(ctx, countQuery, args[:len(args)-2]...).Scan(&totalCount)
	if err != nil {
		return nil, err
	}

	return &models.DocumentSearchResponse{
		Documents:   documents,
		TotalCount:  totalCount,
		Page:        page,
		Limit:       limit,
		HasNextPage: offset+limit < totalCount,
		HasPrevPage: page > 1,
	}, nil
}

// MoveDocument 移动文档到不同文件夹
func (s *DocumentService) MoveDocument(ctx context.Context, documentID int, targetFolderID *int, userID int) error {
	// 检查文档权限
	hasPermission, err := s.CheckDocumentPermission(ctx, documentID, userID, "edit")
	if err != nil {
		return err
	}
	if !hasPermission {
		return fmt.Errorf("permission denied: cannot move document")
	}

	// 检查目标文件夹权限
	if targetFolderID != nil {
		hasPermission, err := s.CheckFolderPermission(ctx, *targetFolderID, userID, "edit")
		if err != nil {
			return err
		}
		if !hasPermission {
			return fmt.Errorf("permission denied: cannot move to target folder")
		}
	}

	// 更新文档
	_, err = s.db.ExecContext(ctx, `
		UPDATE documents 
		SET folder_id = $1, updated_at = CURRENT_TIMESTAMP
		WHERE id = $2
	`, targetFolderID, documentID)
	
	return err
}

// ====================
// 权限检查
// ====================

// CheckFolderPermission 检查文件夹权限
func (s *DocumentService) CheckFolderPermission(ctx context.Context, folderID int, userID int, action string) (bool, error) {
	var folder models.DocumentFolder
	err := s.db.QueryRowContext(ctx, `
		SELECT owner_id, created_by, visibility FROM document_folders 
		WHERE id = $1 AND deleted_at IS NULL
	`, folderID).Scan(&folder.OwnerID, &folder.CreatedBy, &folder.Visibility)
	if err != nil {
		if err == sql.ErrNoRows {
			return false, fmt.Errorf("folder not found")
		}
		return false, err
	}

	// 所有者和创建者有所有权限
	if folder.OwnerID == userID || folder.CreatedBy == userID {
		return true, nil
	}

	// 检查协作者权限
	var permissionLevel string
	err = s.db.QueryRowContext(ctx, `
		SELECT permission_level FROM folder_collaborators 
		WHERE folder_id = $1 AND user_id = $2 
		  AND (expires_at IS NULL OR expires_at > NOW())
	`, folderID, userID).Scan(&permissionLevel)
	
	if err == nil {
		return true, nil // 简化权限检查
	}

	// 根据可见性检查
	switch folder.Visibility {
	case models.VisibilityPublic:
		return true, nil // 公开文件夹允许读取
	case models.VisibilityTeam:
		// 简化：认为同公司用户都是团队成员
		return true, nil
	case models.VisibilityPrivate:
		return false, nil
	}

	return false, nil
}

// CheckDocumentPermission 检查文档权限
func (s *DocumentService) CheckDocumentPermission(ctx context.Context, documentID int, userID int, action string) (bool, error) {
	var doc models.Document
	err := s.db.QueryRowContext(ctx, `
		SELECT owner_id, created_by, visibility, folder_id FROM documents 
		WHERE id = $1 AND deleted_at IS NULL
	`, documentID).Scan(&doc.OwnerID, &doc.CreatedBy, &doc.Visibility, &doc.FolderID)
	if err != nil {
		if err == sql.ErrNoRows {
			return false, fmt.Errorf("document not found")
		}
		return false, err
	}

	// 所有者和创建者有所有权限
	if doc.OwnerID == userID || doc.CreatedBy == userID {
		return true, nil
	}

	// 检查协作者权限
	var permissionLevel string
	err = s.db.QueryRowContext(ctx, `
		SELECT permission_level FROM document_collaborators 
		WHERE document_id = $1 AND user_id = $2 
		  AND (expires_at IS NULL OR expires_at > NOW())
	`, documentID, userID).Scan(&permissionLevel)
	
	if err == nil {
		return true, nil // 简化权限检查
	}

	// 检查文件夹权限
	if doc.FolderID != nil {
		hasFolderPermission, err := s.CheckFolderPermission(ctx, *doc.FolderID, userID, action)
		if err != nil {
			return false, err
		}
		if hasFolderPermission {
			return true, nil
		}
	}

	// 根据可见性检查
	switch doc.Visibility {
	case models.VisibilityPublic:
		return true, nil // 公开文档允许读取
	case models.VisibilityTeam:
		return true, nil // 团队文档允许读取
	case models.VisibilityPrivate:
		return false, nil
	}

	return false, nil
}

// 辅助方法：检查动作权限 (简化版本)
// func (s *DocumentService) checkFolderActionPermission(permissionLevel models.FolderPermissionLevel, action string) bool {
// 	// 简化权限检查
// 	return true
// }

// func (s *DocumentService) checkDocumentActionPermission(permissionLevel models.DocumentPermissionLevel, action string) bool {
// 	// 简化权限检查
// 	return true
// }

// 辅助方法：检查文档权限
func (s *DocumentService) canEditDocument(doc *models.Document, userID int) bool {
	return doc.OwnerID == userID || doc.CreatedBy == userID
}

func (s *DocumentService) canDeleteDocument(doc *models.Document, userID int) bool {
	return doc.OwnerID == userID || doc.CreatedBy == userID
}

func (s *DocumentService) canShareDocument(doc *models.Document, userID int) bool {
	return doc.OwnerID == userID || doc.CreatedBy == userID
}

// ====================
// 辅助方法
// ====================

// IsFolderDescendant 检查是否为子文件夹（防止循环引用）
func (s *DocumentService) IsFolderDescendant(ctx context.Context, parentID, childID int) (bool, error) {
	if parentID == childID {
		return true, nil
	}

	var currentParentID *int
	err := s.db.QueryRowContext(ctx, `
		SELECT parent_folder_id FROM document_folders WHERE id = $1
	`, parentID).Scan(&currentParentID)
	if err != nil {
		return false, err
	}

	if currentParentID == nil {
		return false, nil
	}

	return s.IsFolderDescendant(ctx, *currentParentID, childID)
}
