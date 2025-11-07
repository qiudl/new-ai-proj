package services

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"context"
	"fmt"
	"time"
)

// CommentModerationService 评论审核服务接口
type CommentModerationService interface {
	// NeedsModeration 检查评论是否需要审核
	NeedsModeration(ctx context.Context, content string, userID int) (bool, string, error)

	// ApproveComment 批准评论
	ApproveComment(ctx context.Context, commentID int, reviewerID int) error

	// RejectComment 拒绝评论
	RejectComment(ctx context.Context, commentID int, reviewerID int, reason string, flag string) error

	// GetPendingComments 获取待审核评论列表
	GetPendingComments(ctx context.Context, page int, pageSize int) ([]*models.RequirementComment, int, error)

	// AutoModerate 自动审核（基于内容安全检查）
	AutoModerate(ctx context.Context, comment *models.RequirementComment) (*ModerationResult, error)
}

// ModerationResult 审核结果
type ModerationResult struct {
	NeedsReview    bool   `json:"needs_review"`    // 是否需要人工审核
	AutoApproved   bool   `json:"auto_approved"`   // 是否自动批准
	AutoRejected   bool   `json:"auto_rejected"`   // 是否自动拒绝
	RejectionNote  string `json:"rejection_note"`  // 拒绝原因
	ModerationFlag string `json:"moderation_flag"` // 审核标记
}

// commentModerationServiceImpl 评论审核服务实现
type commentModerationServiceImpl struct {
	db                     database.DB
	contentSecurityService ContentSecurityService
}

// NewCommentModerationService 创建评论审核服务
func NewCommentModerationService(db database.DB, contentSecurityService ContentSecurityService) CommentModerationService {
	return &commentModerationServiceImpl{
		db:                     db,
		contentSecurityService: contentSecurityService,
	}
}

// NeedsModeration 检查评论是否需要审核
func (s *commentModerationServiceImpl) NeedsModeration(ctx context.Context, content string, userID int) (bool, string, error) {
	// 1. 检查内容安全性
	sanitized, err := s.contentSecurityService.SanitizeContent(ctx, content)
	if err != nil {
		return false, "", err
	}

	// 2. 如果检测到XSS攻击尝试，需要审核
	if sanitized.HasXSSAttempt {
		return true, "xss_attempt", nil
	}

	// 3. 如果包含敏感词，需要审核
	if sanitized.HasSensitiveWord {
		return true, "sensitive_word", nil
	}

	// 4. 检查用户历史行为（可选）
	// 如果用户曾有被拒绝的评论，可以加强审核
	// TODO: 实现用户行为检查

	// 5. 新用户的评论可能需要审核（可选）
	// TODO: 实现新用户检查

	return false, "", nil
}

// ApproveComment 批准评论
func (s *commentModerationServiceImpl) ApproveComment(ctx context.Context, commentID int, reviewerID int) error {
	now := time.Now()
	status := string(models.RequirementCommentStatusActive)

	query := `
		UPDATE requirement_comments
		SET
			status = $1,
			reviewed_at = $2,
			reviewed_by = $3,
			updated_at = $4
		WHERE id = $5 AND status = $6
	`

	// 获取底层数据库连接
	executor, ok := s.db.GetDB().(database.DBExecutor)
	if !ok {
		return fmt.Errorf("无法获取数据库执行器")
	}

	result, err := executor.ExecContext(
		ctx,
		query,
		status,
		now,
		reviewerID,
		now,
		commentID,
		models.RequirementCommentStatusPendingReview,
	)

	if err != nil {
		return fmt.Errorf("批准评论失败: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("获取影响行数失败: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("评论不存在或不在待审核状态")
	}

	return nil
}

// RejectComment 拒绝评论
func (s *commentModerationServiceImpl) RejectComment(ctx context.Context, commentID int, reviewerID int, reason string, flag string) error {
	now := time.Now()
	status := string(models.RequirementCommentStatusRejected)

	query := `
		UPDATE requirement_comments
		SET
			status = $1,
			reviewed_at = $2,
			reviewed_by = $3,
			rejection_note = $4,
			moderation_flag = $5,
			updated_at = $6
		WHERE id = $7 AND status = $8
	`

	// 获取底层数据库连接
	executor, ok := s.db.GetDB().(database.DBExecutor)
	if !ok {
		return fmt.Errorf("无法获取数据库执行器")
	}

	result, err := executor.ExecContext(
		ctx,
		query,
		status,
		now,
		reviewerID,
		reason,
		flag,
		now,
		commentID,
		models.RequirementCommentStatusPendingReview,
	)

	if err != nil {
		return fmt.Errorf("拒绝评论失败: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("获取影响行数失败: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("评论不存在或不在待审核状态")
	}

	return nil
}

// GetPendingComments 获取待审核评论列表
func (s *commentModerationServiceImpl) GetPendingComments(ctx context.Context, page int, pageSize int) ([]*models.RequirementComment, int, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	offset := (page - 1) * pageSize

	// 获取底层数据库连接
	executor, ok := s.db.GetDB().(database.DBExecutor)
	if !ok {
		return nil, 0, fmt.Errorf("无法获取数据库执行器")
	}

	// 获取总数
	countQuery := `
		SELECT COUNT(*)
		FROM requirement_comments
		WHERE status = $1
	`

	var total int
	err := executor.QueryRowContext(ctx, countQuery, models.RequirementCommentStatusPendingReview).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("获取待审核评论总数失败: %w", err)
	}

	// 获取评论列表
	query := `
		SELECT
			c.id, c.requirement_id, c.user_id, c.parent_comment_id,
			c.content, c.comment_type, c.attachments,
			c.is_internal, c.is_pinned, c.status,
			c.created_at, c.updated_at, c.moderation_flag,
			u.username, u.email, u.user_type
		FROM requirement_comments c
		LEFT JOIN users u ON c.user_id = u.id
		WHERE c.status = $1
		ORDER BY c.created_at DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := executor.QueryContext(ctx, query, models.RequirementCommentStatusPendingReview, pageSize, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("查询待审核评论失败: %w", err)
	}
	defer rows.Close()

	comments := make([]*models.RequirementComment, 0)

	for rows.Next() {
		comment := &models.RequirementComment{}
		var username, email, userType *string
		var parentCommentID *int
		var moderationFlag *string

		err := rows.Scan(
			&comment.ID,
			&comment.RequirementID,
			&comment.UserID,
			&parentCommentID,
			&comment.Content,
			&comment.CommentType,
			&comment.Attachments,
			&comment.IsInternal,
			&comment.IsPinned,
			&comment.Status,
			&comment.CreatedAt,
			&comment.UpdatedAt,
			&moderationFlag,
			&username,
			&email,
			&userType,
		)

		if err != nil {
			return nil, 0, fmt.Errorf("扫描评论数据失败: %w", err)
		}

		comment.ParentCommentID = parentCommentID
		comment.ModerationFlag = moderationFlag
		comment.Username = username
		comment.UserType = userType

		comments = append(comments, comment)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("遍历评论失败: %w", err)
	}

	return comments, total, nil
}

// AutoModerate 自动审核（基于内容安全检查）
func (s *commentModerationServiceImpl) AutoModerate(ctx context.Context, comment *models.RequirementComment) (*ModerationResult, error) {
	result := &ModerationResult{
		NeedsReview:  false,
		AutoApproved: false,
		AutoRejected: false,
	}

	// 1. 进行内容安全检查
	sanitized, err := s.contentSecurityService.SanitizeContent(ctx, comment.Content)
	if err != nil {
		return nil, err
	}

	// 2. 检查是否有严重的安全问题（自动拒绝）
	if sanitized.HasXSSAttempt {
		result.AutoRejected = true
		result.RejectionNote = "检测到潜在的XSS攻击尝试"
		result.ModerationFlag = "xss_attempt"
		comment.Status = string(models.RequirementCommentStatusRejected)
		return result, nil
	}

	// 3. 检查是否有敏感词（需要人工审核）
	if sanitized.HasSensitiveWord {
		result.NeedsReview = true
		result.ModerationFlag = "sensitive_word"
		comment.Status = string(models.RequirementCommentStatusPendingReview)
		return result, nil
	}

	// 4. 如果没有问题，自动批准
	result.AutoApproved = true
	comment.Status = string(models.RequirementCommentStatusActive)

	return result, nil
}
