package services

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"ai-project-backend/models"
)

// DocumentCollaborationService 文档协作服务
type DocumentCollaborationService struct {
	db *sql.DB
}

// NewDocumentCollaborationService 创建文档协作服务实例
func NewDocumentCollaborationService(db *sql.DB) *DocumentCollaborationService {
	return &DocumentCollaborationService{
		db: db,
	}
}

// ====================
// 评论管理
// ====================

// AddComment 添加文档评论
func (s *DocumentCollaborationService) AddComment(ctx context.Context, documentID, userID int, request models.AddCommentRequest) (*models.DocumentCommentExt, error) {
	// 检查文档权限
	hasPermission, err := s.checkDocumentPermission(ctx, documentID, userID, "comment")
	if err != nil {
		return nil, err
	}
	if !hasPermission {
		return nil, fmt.Errorf("permission denied")
	}

	var comment models.DocumentCommentExt
	err = s.db.QueryRowContext(ctx, `
		INSERT INTO document_comments (document_id, user_id, content, comment_type, position_info, parent_comment_id)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, document_id, user_id, content, comment_type, position_info, 
				  parent_comment_id, is_resolved, created_at, updated_at
	`, documentID, userID, request.Content, request.CommentType, request.PositionInfo, request.ParentCommentID).Scan(
		&comment.ID, &comment.DocumentID, &comment.UserID, &comment.Content,
		&comment.CommentType, &comment.PositionInfo, &comment.ParentCommentID,
		&comment.IsResolved, &comment.CreatedAt, &comment.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	// 获取用户信息
	comment.UserName, _ = s.getUserName(ctx, userID)

	// 记录变更历史
	s.recordChange(ctx, documentID, userID, "comment_added", "", fmt.Sprintf("Added comment: %s", request.Content), "")

	return &comment, nil
}

// GetComments 获取文档评论列表
func (s *DocumentCollaborationService) GetComments(ctx context.Context, documentID, userID, page, limit int) (*models.CommentListResponse, error) {
	// 检查文档权限
	hasPermission, err := s.checkDocumentPermission(ctx, documentID, userID, "read")
	if err != nil {
		return nil, err
	}
	if !hasPermission {
		return nil, fmt.Errorf("permission denied")
	}

	offset := (page - 1) * limit

	// 获取评论列表
	rows, err := s.db.QueryContext(ctx, `
		SELECT c.id, c.document_id, c.user_id, c.content, c.comment_type, c.position_info,
			   c.parent_comment_id, c.is_resolved, c.resolved_by, c.resolved_at,
			   c.created_at, c.updated_at, u.username,
			   COALESCE(ru.username, '') as resolved_by_name
		FROM document_comments c
		JOIN users u ON c.user_id = u.id
		LEFT JOIN users ru ON c.resolved_by = ru.id
		WHERE c.document_id = $1 AND c.deleted_at IS NULL
		ORDER BY c.created_at DESC
		LIMIT $2 OFFSET $3
	`, documentID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var comments []models.DocumentCommentExt
	for rows.Next() {
		var comment models.DocumentCommentExt
		var resolvedByName sql.NullString
		
		err := rows.Scan(
			&comment.ID, &comment.DocumentID, &comment.UserID, &comment.Content,
			&comment.CommentType, &comment.PositionInfo, &comment.ParentCommentID,
			&comment.IsResolved, &comment.ResolvedBy, &comment.ResolvedAt,
			&comment.CreatedAt, &comment.UpdatedAt, &comment.UserName,
			&resolvedByName,
		)
		if err != nil {
			return nil, err
		}

		if resolvedByName.Valid {
			comment.ResolvedByName = &resolvedByName.String
		}

		comments = append(comments, comment)
	}

	// 获取总数
	var total int
	err = s.db.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM document_comments 
		WHERE document_id = $1 AND deleted_at IS NULL
	`, documentID).Scan(&total)
	if err != nil {
		return nil, err
	}

	return &models.CommentListResponse{
		Comments:    comments,
		Total:       total,
		Page:        page,
		Limit:       limit,
		HasNextPage: offset+limit < total,
		HasPrevPage: page > 1,
	}, nil
}

// UpdateComment 更新评论
func (s *DocumentCollaborationService) UpdateComment(ctx context.Context, commentID, userID int, request models.UpdateCommentRequest) (*models.DocumentCommentExt, error) {
	// 检查评论是否存在以及权限
	var comment models.DocumentCommentExt
	var documentID int
	err := s.db.QueryRowContext(ctx, `
		SELECT c.id, c.document_id, c.user_id, c.content, c.comment_type, c.position_info,
			   c.parent_comment_id, c.is_resolved, c.created_at, c.updated_at, u.username
		FROM document_comments c
		JOIN users u ON c.user_id = u.id
		WHERE c.id = $1 AND c.deleted_at IS NULL
	`, commentID).Scan(
		&comment.ID, &documentID, &comment.UserID, &comment.Content,
		&comment.CommentType, &comment.PositionInfo, &comment.ParentCommentID,
		&comment.IsResolved, &comment.CreatedAt, &comment.UpdatedAt, &comment.UserName,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("comment not found")
		}
		return nil, err
	}

	// 检查权限：只有评论作者或文档管理员可以编辑
	if comment.UserID != userID {
		hasAdminPermission, err := s.checkDocumentPermission(ctx, documentID, userID, "admin")
		if err != nil {
			return nil, err
		}
		if !hasAdminPermission {
			return nil, fmt.Errorf("permission denied")
		}
	}

	// 更新评论
	_, err = s.db.ExecContext(ctx, `
		UPDATE document_comments 
		SET content = $1, updated_at = CURRENT_TIMESTAMP
		WHERE id = $2
	`, request.Content, commentID)
	if err != nil {
		return nil, err
	}

	// 重新获取更新后的评论
	comment.Content = request.Content
	comment.UpdatedAt = time.Now()

	// 记录变更历史
	s.recordChange(ctx, documentID, userID, "comment_updated", "", fmt.Sprintf("Updated comment: %s", request.Content), "")

	return &comment, nil
}

// DeleteComment 删除评论（软删除）
func (s *DocumentCollaborationService) DeleteComment(ctx context.Context, commentID, userID int) error {
	// 检查评论是否存在以及权限
	var commentUserID, documentID int
	err := s.db.QueryRowContext(ctx, `
		SELECT user_id, document_id FROM document_comments 
		WHERE id = $1 AND deleted_at IS NULL
	`, commentID).Scan(&commentUserID, &documentID)
	if err != nil {
		if err == sql.ErrNoRows {
			return fmt.Errorf("comment not found")
		}
		return err
	}

	// 检查权限：只有评论作者或文档管理员可以删除
	if commentUserID != userID {
		hasAdminPermission, err := s.checkDocumentPermission(ctx, documentID, userID, "admin")
		if err != nil {
			return err
		}
		if !hasAdminPermission {
			return fmt.Errorf("permission denied")
		}
	}

	// 软删除评论
	_, err = s.db.ExecContext(ctx, `
		UPDATE document_comments 
		SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1
	`, commentID)
	if err != nil {
		return err
	}

	// 记录变更历史
	s.recordChange(ctx, documentID, userID, "comment_deleted", "", "Deleted comment", "")

	return nil
}

// ResolveComment 标记评论为已解决
func (s *DocumentCollaborationService) ResolveComment(ctx context.Context, commentID, userID int) (*models.DocumentCommentExt, error) {
	// 检查评论是否存在
	var documentID int
	err := s.db.QueryRowContext(ctx, `
		SELECT document_id FROM document_comments 
		WHERE id = $1 AND deleted_at IS NULL
	`, commentID).Scan(&documentID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("comment not found")
		}
		return nil, err
	}

	// 检查权限
	hasPermission, err := s.checkDocumentPermission(ctx, documentID, userID, "edit")
	if err != nil {
		return nil, err
	}
	if !hasPermission {
		return nil, fmt.Errorf("permission denied")
	}

	// 标记为已解决
	_, err = s.db.ExecContext(ctx, `
		UPDATE document_comments 
		SET is_resolved = true, resolved_by = $1, resolved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
		WHERE id = $2
	`, userID, commentID)
	if err != nil {
		return nil, err
	}

	// 重新获取评论信息
	var comment models.DocumentCommentExt
	err = s.db.QueryRowContext(ctx, `
		SELECT c.id, c.document_id, c.user_id, c.content, c.comment_type, c.position_info,
			   c.parent_comment_id, c.is_resolved, c.resolved_by, c.resolved_at,
			   c.created_at, c.updated_at, u.username, ru.username as resolved_by_name
		FROM document_comments c
		JOIN users u ON c.user_id = u.id
		LEFT JOIN users ru ON c.resolved_by = ru.id
		WHERE c.id = $1
	`, commentID).Scan(
		&comment.ID, &comment.DocumentID, &comment.UserID, &comment.Content,
		&comment.CommentType, &comment.PositionInfo, &comment.ParentCommentID,
		&comment.IsResolved, &comment.ResolvedBy, &comment.ResolvedAt,
		&comment.CreatedAt, &comment.UpdatedAt, &comment.UserName, &comment.ResolvedByName,
	)
	if err != nil {
		return nil, err
	}

	// 记录变更历史
	s.recordChange(ctx, documentID, userID, "comment_resolved", "", "Resolved comment", "")

	return &comment, nil
}

// ====================
// 协作者管理
// ====================

// AddCollaborator 添加文档协作者
func (s *DocumentCollaborationService) AddCollaborator(ctx context.Context, documentID, userID int, request models.AddCollaboratorExtRequest) (*models.DocumentCollaboratorExt, error) {
	// 检查文档权限
	hasPermission, err := s.checkDocumentPermission(ctx, documentID, userID, "admin")
	if err != nil {
		return nil, err
	}
	if !hasPermission {
		return nil, fmt.Errorf("permission denied")
	}

	// 检查目标用户是否存在
	var targetUsername string
	err = s.db.QueryRowContext(ctx, `SELECT username FROM users WHERE id = $1`, request.UserID).Scan(&targetUsername)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("target user not found")
		}
		return nil, err
	}

	var collaborator models.DocumentCollaboratorExt
	err = s.db.QueryRowContext(ctx, `
		INSERT INTO document_collaborators (document_id, user_id, permission_level, granted_by, expires_at)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, document_id, user_id, permission_level, granted_by, granted_at, expires_at
		ON CONFLICT (document_id, user_id) 
		DO UPDATE SET permission_level = $3, granted_by = $4, granted_at = CURRENT_TIMESTAMP, expires_at = $5
		RETURNING id, document_id, user_id, permission_level, granted_by, granted_at, expires_at
	`, documentID, request.UserID, request.PermissionLevel, userID, request.ExpiresAt).Scan(
		&collaborator.ID, &collaborator.DocumentID, &collaborator.UserID,
		&collaborator.PermissionLevel, &collaborator.GrantedBy, &collaborator.GrantedAt,
		&collaborator.ExpiresAt,
	)
	if err != nil {
		return nil, err
	}

	// 获取用户名信息
	collaborator.UserName = &targetUsername
	grantedByName, _ := s.getUserName(ctx, userID)
	collaborator.GrantedByName = &grantedByName

	// 记录变更历史
	s.recordChange(ctx, documentID, userID, "collaborator_added", "", fmt.Sprintf("Added collaborator: %s with permission: %s", targetUsername, request.PermissionLevel), "")

	return &collaborator, nil
}

// GetCollaborators 获取文档协作者列表
func (s *DocumentCollaborationService) GetCollaborators(ctx context.Context, documentID, userID int) ([]models.DocumentCollaboratorExt, error) {
	// 检查文档权限
	hasPermission, err := s.checkDocumentPermission(ctx, documentID, userID, "read")
	if err != nil {
		return nil, err
	}
	if !hasPermission {
		return nil, fmt.Errorf("permission denied")
	}

	rows, err := s.db.QueryContext(ctx, `
		SELECT dc.id, dc.document_id, dc.user_id, dc.permission_level, dc.granted_by,
			   dc.granted_at, dc.expires_at, dc.last_accessed_at,
			   u.username, gu.username as granted_by_name
		FROM document_collaborators dc
		JOIN users u ON dc.user_id = u.id
		LEFT JOIN users gu ON dc.granted_by = gu.id
		WHERE dc.document_id = $1
		ORDER BY dc.granted_at DESC
	`, documentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var collaborators []models.DocumentCollaboratorExt
	for rows.Next() {
		var collaborator models.DocumentCollaboratorExt
		var userName, grantedByName string
		
		err := rows.Scan(
			&collaborator.ID, &collaborator.DocumentID, &collaborator.UserID,
			&collaborator.PermissionLevel, &collaborator.GrantedBy,
			&collaborator.GrantedAt, &collaborator.ExpiresAt, &collaborator.LastAccessedAt,
			&userName, &grantedByName,
		)
		if err != nil {
			return nil, err
		}

		collaborator.UserName = &userName
		collaborator.GrantedByName = &grantedByName

		collaborators = append(collaborators, collaborator)
	}

	return collaborators, nil
}

// UpdateCollaborator 更新协作者权限
func (s *DocumentCollaborationService) UpdateCollaborator(ctx context.Context, documentID, collaboratorUserID, userID int, request models.UpdateCollaboratorExtRequest) (*models.DocumentCollaboratorExt, error) {
	// 检查文档权限
	hasPermission, err := s.checkDocumentPermission(ctx, documentID, userID, "admin")
	if err != nil {
		return nil, err
	}
	if !hasPermission {
		return nil, fmt.Errorf("permission denied")
	}

	// 更新协作者信息
	_, err = s.db.ExecContext(ctx, `
		UPDATE document_collaborators 
		SET permission_level = $1, expires_at = $2, granted_by = $3, granted_at = CURRENT_TIMESTAMP
		WHERE document_id = $4 AND user_id = $5
	`, request.PermissionLevel, request.ExpiresAt, userID, documentID, collaboratorUserID)
	if err != nil {
		return nil, err
	}

	// 重新获取协作者信息
	var collaborator models.DocumentCollaboratorExt
	var userName, grantedByName string
	err = s.db.QueryRowContext(ctx, `
		SELECT dc.id, dc.document_id, dc.user_id, dc.permission_level, dc.granted_by,
			   dc.granted_at, dc.expires_at, u.username, gu.username
		FROM document_collaborators dc
		JOIN users u ON dc.user_id = u.id
		LEFT JOIN users gu ON dc.granted_by = gu.id
		WHERE dc.document_id = $1 AND dc.user_id = $2
	`, documentID, collaboratorUserID).Scan(
		&collaborator.ID, &collaborator.DocumentID, &collaborator.UserID,
		&collaborator.PermissionLevel, &collaborator.GrantedBy,
		&collaborator.GrantedAt, &collaborator.ExpiresAt, &userName, &grantedByName,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("collaborator not found")
		}
		return nil, err
	}

	collaborator.UserName = &userName
	collaborator.GrantedByName = &grantedByName

	// 记录变更历史
	s.recordChange(ctx, documentID, userID, "collaborator_updated", "", fmt.Sprintf("Updated collaborator: %s permission to: %s", userName, *request.PermissionLevel), "")

	return &collaborator, nil
}

// RemoveCollaborator 移除协作者
func (s *DocumentCollaborationService) RemoveCollaborator(ctx context.Context, documentID, collaboratorUserID, userID int) error {
	// 检查文档权限
	hasPermission, err := s.checkDocumentPermission(ctx, documentID, userID, "admin")
	if err != nil {
		return err
	}
	if !hasPermission {
		return fmt.Errorf("permission denied")
	}

	// 获取协作者用户名用于记录
	userName, _ := s.getUserName(ctx, collaboratorUserID)

	// 删除协作者
	result, err := s.db.ExecContext(ctx, `
		DELETE FROM document_collaborators 
		WHERE document_id = $1 AND user_id = $2
	`, documentID, collaboratorUserID)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return fmt.Errorf("collaborator not found")
	}

	// 记录变更历史
	s.recordChange(ctx, documentID, userID, "collaborator_removed", "", fmt.Sprintf("Removed collaborator: %s", userName), "")

	return nil
}

// ====================
// 变更历史
// ====================

// GetChangeHistory 获取文档变更历史
func (s *DocumentCollaborationService) GetChangeHistory(ctx context.Context, documentID, userID, page, limit int) (*models.ChangeHistoryResponse, error) {
	// 检查文档权限
	hasPermission, err := s.checkDocumentPermission(ctx, documentID, userID, "read")
	if err != nil {
		return nil, err
	}
	if !hasPermission {
		return nil, fmt.Errorf("permission denied")
	}

	offset := (page - 1) * limit

	// 获取变更历史
	rows, err := s.db.QueryContext(ctx, `
		SELECT ch.id, ch.document_id, ch.user_id, ch.change_type, ch.field_name,
			   ch.old_value, ch.new_value, ch.change_summary, ch.created_at,
			   u.username
		FROM document_change_history ch
		JOIN users u ON ch.user_id = u.id
		WHERE ch.document_id = $1
		ORDER BY ch.created_at DESC
		LIMIT $2 OFFSET $3
	`, documentID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var changes []models.DocumentChangeRecord
	for rows.Next() {
		var change models.DocumentChangeRecord
		
		err := rows.Scan(
			&change.ID, &change.DocumentID, &change.UserID, &change.ChangeType,
			&change.FieldName, &change.OldValue, &change.NewValue, &change.ChangeSummary,
			&change.CreatedAt, &change.UserName,
		)
		if err != nil {
			return nil, err
		}

		changes = append(changes, change)
	}

	// 获取总数
	var total int
	err = s.db.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM document_change_history 
		WHERE document_id = $1
	`, documentID).Scan(&total)
	if err != nil {
		return nil, err
	}

	return &models.ChangeHistoryResponse{
		Changes:     changes,
		Total:       total,
		Page:        page,
		Limit:       limit,
		HasNextPage: offset+limit < total,
		HasPrevPage: page > 1,
	}, nil
}

// recordChange 记录变更历史
func (s *DocumentCollaborationService) recordChange(ctx context.Context, documentID, userID int, changeType, fieldName, changeSummary, oldValue string) {
	// 异步记录，不影响主流程
	go func() {
		_, _ = s.db.ExecContext(context.Background(), `
			INSERT INTO document_change_history 
			(document_id, user_id, change_type, field_name, old_value, new_value, change_summary)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
		`, documentID, userID, changeType, fieldName, oldValue, "", changeSummary)
	}()
}

// ====================
// 实时协作支持
// ====================

// StartCollaborationSession 开始协作会话
func (s *DocumentCollaborationService) StartCollaborationSession(ctx context.Context, documentID, userID int) (*models.CollaborationSession, error) {
	// 检查文档权限
	hasPermission, err := s.checkDocumentPermission(ctx, documentID, userID, "edit")
	if err != nil {
		return nil, err
	}
	if !hasPermission {
		return nil, fmt.Errorf("permission denied")
	}

	// 更新最后访问时间
	_, err = s.db.ExecContext(ctx, `
		UPDATE document_collaborators 
		SET last_accessed_at = CURRENT_TIMESTAMP
		WHERE document_id = $1 AND user_id = $2
	`, documentID, userID)

	// 创建协作会话
	session := &models.CollaborationSession{
		DocumentID: documentID,
		UserID:     userID,
		StartedAt:  time.Now(),
		IsActive:   true,
	}

	return session, nil
}

// GetActiveCollaborators 获取当前活跃的协作者
func (s *DocumentCollaborationService) GetActiveCollaborators(ctx context.Context, documentID, userID int) ([]models.ActiveCollaborator, error) {
	// 检查文档权限
	hasPermission, err := s.checkDocumentPermission(ctx, documentID, userID, "read")
	if err != nil {
		return nil, err
	}
	if !hasPermission {
		return nil, fmt.Errorf("permission denied")
	}

	// 获取最近5分钟内活跃的协作者
	rows, err := s.db.QueryContext(ctx, `
		SELECT dc.user_id, u.username, dc.permission_level, dc.last_accessed_at
		FROM document_collaborators dc
		JOIN users u ON dc.user_id = u.id
		WHERE dc.document_id = $1 
		  AND dc.last_accessed_at > CURRENT_TIMESTAMP - INTERVAL '5 minutes'
		ORDER BY dc.last_accessed_at DESC
	`, documentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var activeUsers []models.ActiveCollaborator
	for rows.Next() {
		var user models.ActiveCollaborator
		
		err := rows.Scan(
			&user.UserID, &user.Username, &user.PermissionLevel, &user.LastActiveAt,
		)
		if err != nil {
			return nil, err
		}

		activeUsers = append(activeUsers, user)
	}

	return activeUsers, nil
}

// ====================
// 统计信息
// ====================

// GetCollaborationStats 获取文档协作统计
func (s *DocumentCollaborationService) GetCollaborationStats(ctx context.Context, documentID, userID int) (*models.DocumentCollaborationStats, error) {
	// 检查文档权限
	hasPermission, err := s.checkDocumentPermission(ctx, documentID, userID, "read")
	if err != nil {
		return nil, err
	}
	if !hasPermission {
		return nil, fmt.Errorf("permission denied")
	}

	var stats models.DocumentCollaborationStats
	
	// 获取基础统计信息
	err = s.db.QueryRowContext(ctx, `
		SELECT 
			(SELECT COUNT(*) FROM document_collaborators WHERE document_id = $1) as collaborator_count,
			(SELECT COUNT(*) FROM document_comments WHERE document_id = $1 AND deleted_at IS NULL) as comment_count,
			(SELECT COUNT(*) FROM document_comments WHERE document_id = $1 AND deleted_at IS NULL AND is_resolved = false) as unresolved_comments,
			(SELECT COUNT(*) FROM document_change_history WHERE document_id = $1) as change_count
	`, documentID).Scan(
		&stats.CollaboratorCount, &stats.CommentCount, &stats.UnresolvedComments, &stats.ChangeCount,
	)
	if err != nil {
		return nil, err
	}

	stats.DocumentID = documentID

	return &stats, nil
}

// GetUserCollaborationDashboard 获取用户协作仪表板
func (s *DocumentCollaborationService) GetUserCollaborationDashboard(ctx context.Context, userID int) (*models.UserCollaborationDashboard, error) {
	var dashboard models.UserCollaborationDashboard
	
	// 获取用户参与的文档数量
	err := s.db.QueryRowContext(ctx, `
		SELECT 
			COUNT(DISTINCT dc.document_id) as collaborated_documents,
			COUNT(DISTINCT CASE WHEN c.user_id = $1 THEN c.id END) as comments_made,
			COUNT(DISTINCT CASE WHEN c.resolved_by = $1 THEN c.id END) as comments_resolved,
			COUNT(DISTINCT ch.document_id) as documents_edited
		FROM document_collaborators dc
		LEFT JOIN document_comments c ON dc.document_id = c.document_id
		LEFT JOIN document_change_history ch ON dc.document_id = ch.document_id AND ch.user_id = $1
		WHERE dc.user_id = $1
	`, userID).Scan(
		&dashboard.CollaboratedDocuments, &dashboard.CommentsMade, 
		&dashboard.CommentsResolved, &dashboard.DocumentsEdited,
	)
	if err != nil {
		return nil, err
	}

	dashboard.UserID = userID

	return &dashboard, nil
}

// ====================
// 辅助方法
// ====================

// checkDocumentPermission 检查文档权限
func (s *DocumentCollaborationService) checkDocumentPermission(ctx context.Context, documentID, userID int, action string) (bool, error) {
	// 检查文档所有者
	var ownerID, createdBy int
	var visibility string
	err := s.db.QueryRowContext(ctx, `
		SELECT owner_id, created_by, visibility FROM documents 
		WHERE id = $1 AND deleted_at IS NULL
	`, documentID).Scan(&ownerID, &createdBy, &visibility)
	if err != nil {
		return false, err
	}

	// 所有者和创建者有所有权限
	if ownerID == userID || createdBy == userID {
		return true, nil
	}

	// 检查协作者权限
	var permissionLevel string
	err = s.db.QueryRowContext(ctx, `
		SELECT permission_level FROM document_collaborators 
		WHERE document_id = $1 AND user_id = $2 
		  AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
	`, documentID, userID).Scan(&permissionLevel)
	
	if err == nil {
		return s.checkActionPermission(permissionLevel, action), nil
	}

	// 根据可见性检查
	switch visibility {
	case "public":
		return s.checkActionPermission("read", action), nil
	case "team":
		// 简化：团队成员有读权限
		return s.checkActionPermission("read", action), nil
	case "private":
		return false, nil
	}

	return false, nil
}

// checkActionPermission 检查动作权限
func (s *DocumentCollaborationService) checkActionPermission(permissionLevel, action string) bool {
	permissions := map[string][]string{
		"read":    {"read", "comment", "edit", "admin"},
		"comment": {"comment", "edit", "admin"},
		"edit":    {"edit", "admin"},
		"admin":   {"admin"},
	}

	allowedLevels, exists := permissions[action]
	if !exists {
		return false
	}

	for _, level := range allowedLevels {
		if level == permissionLevel {
			return true
		}
	}
	return false
}

// getUserName 获取用户名
func (s *DocumentCollaborationService) getUserName(ctx context.Context, userID int) (string, error) {
	var username string
	err := s.db.QueryRowContext(ctx, `SELECT username FROM users WHERE id = $1`, userID).Scan(&username)
	return username, err
}