package database

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"ai-project-backend/models"
)

// RequirementCommentRepository 需求评论数据访问接口
type RequirementCommentRepository interface {
	// 基础CRUD操作
	Create(ctx context.Context, comment *models.RequirementComment) error
	GetByID(ctx context.Context, id int) (*models.RequirementComment, error)
	Update(ctx context.Context, comment *models.RequirementComment) error
	SoftDelete(ctx context.Context, id int, deletedBy int) error

	// 列表和查询
	ListByRequirement(ctx context.Context, requirementID int, page, pageSize int) ([]*models.RequirementComment, int, error)
	ListByUser(ctx context.Context, userID int, filters *models.RequirementCommentFilters) (*models.RequirementCommentListResponse, error)
	GetReplies(ctx context.Context, parentCommentID int) ([]*models.RequirementComment, error)

	// @用户提及相关
	GetByMentionedUser(ctx context.Context, userID int, filters *models.RequirementCommentFilters) (*models.RequirementCommentListResponse, error)
	PopulateMentionedUsers(ctx context.Context, comments []*models.RequirementComment) error

	// 统计信息
	GetStats(ctx context.Context, requirementID int) (*models.RequirementCommentStats, error)
	GetCommentCounts(ctx context.Context, requirementIDs []int) (map[int]int, error)

	// 特殊操作
	TogglePin(ctx context.Context, id int, isPinned bool) error
	UpdateInternal(ctx context.Context, id int, isInternal bool) error
}

// requirementCommentRepositoryImpl 实现类
type requirementCommentRepositoryImpl struct {
	db interface{} // Can be *sql.DB or *sql.Tx
}

// NewRequirementCommentRepository 创建Repository实例
func NewRequirementCommentRepository(db interface{}) RequirementCommentRepository {
	return &requirementCommentRepositoryImpl{db: db}
}

// getDB returns the database connection (supports both *sql.DB and *sql.Tx)
func (r *requirementCommentRepositoryImpl) getDB() DBExecutor {
	if tx, ok := r.db.(*sql.Tx); ok {
		return tx
	}
	return r.db.(*sql.DB)
}

// Create 创建新评论
func (r *requirementCommentRepositoryImpl) Create(ctx context.Context, comment *models.RequirementComment) error {
	query := `
		INSERT INTO requirement_comments (
			requirement_id, user_id, parent_comment_id, content,
			comment_type, attachments, is_internal, mentioned_user_ids, status
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, created_at, updated_at, mentioned_count
	`

	err := r.getDB().QueryRowContext(
		ctx, query,
		comment.RequirementID,
		comment.UserID,
		comment.ParentCommentID,
		comment.Content,
		comment.CommentType,
		comment.Attachments,
		comment.IsInternal,
		comment.MentionedUserIDs,
		models.RequirementCommentStatusActive,
	).Scan(&comment.ID, &comment.CreatedAt, &comment.UpdatedAt, &comment.MentionedCount)

	if err != nil {
		return fmt.Errorf("创建需求评论失败: %w", err)
	}

	comment.Status = string(models.RequirementCommentStatusActive)
	return nil
}

// GetByID 根据ID获取评论（包含用户信息）
func (r *requirementCommentRepositoryImpl) GetByID(ctx context.Context, id int) (*models.RequirementComment, error) {
	query := `
		SELECT
			c.id, c.requirement_id, c.user_id, c.parent_comment_id,
			c.content, c.comment_type, c.attachments,
			c.is_internal, c.is_pinned, c.status,
			c.created_at, c.updated_at, c.deleted_at, c.deleted_by,
			u.username, u.email, u.user_type
		FROM requirement_comments c
		LEFT JOIN users u ON c.user_id = u.id
		WHERE c.id = $1
	`

	comment := &models.RequirementComment{}

	var username, email, userType sql.NullString
	var parentCommentID sql.NullInt64
	var deletedAt sql.NullTime
	var deletedBy sql.NullInt64

	err := r.getDB().QueryRowContext(ctx, query, id).Scan(
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
		&deletedAt,
		&deletedBy,
		&username,
		&email,
		&userType,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("需求评论不存在 (ID: %d)", id)
	}
	if err != nil {
		return nil, fmt.Errorf("查询需求评论失败: %w", err)
	}

	// 填充可空字段
	if parentCommentID.Valid {
		pid := int(parentCommentID.Int64)
		comment.ParentCommentID = &pid
	}
	if deletedAt.Valid {
		comment.DeletedAt = &deletedAt.Time
	}
	if deletedBy.Valid {
		db := int(deletedBy.Int64)
		comment.DeletedBy = &db
	}
	if username.Valid {
		comment.Username = &username.String
	}
	if userType.Valid {
		comment.UserType = &userType.String
	}

	return comment, nil
}

// Update 更新评论
func (r *requirementCommentRepositoryImpl) Update(ctx context.Context, comment *models.RequirementComment) error {
	query := `
		UPDATE requirement_comments SET
			content = $1,
			comment_type = $2,
			attachments = $3,
			is_internal = $4,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $5 AND status = $6
	`

	result, err := r.getDB().ExecContext(
		ctx, query,
		comment.Content,
		comment.CommentType,
		comment.Attachments,
		comment.IsInternal,
		comment.ID,
		models.RequirementCommentStatusActive,
	)

	if err != nil {
		return fmt.Errorf("更新需求评论失败: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("获取影响行数失败: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("需求评论不存在或已被删除 (ID: %d)", comment.ID)
	}

	return nil
}

// SoftDelete 软删除评论
func (r *requirementCommentRepositoryImpl) SoftDelete(ctx context.Context, id int, deletedBy int) error {
	query := `
		UPDATE requirement_comments
		SET
			status = $1,
			deleted_at = $2,
			deleted_by = $3,
			updated_at = $2
		WHERE id = $4 AND status = $5
	`

	now := time.Now()
	result, err := r.getDB().ExecContext(
		ctx, query,
		models.RequirementCommentStatusDeleted,
		now,
		deletedBy,
		id,
		models.RequirementCommentStatusActive,
	)

	if err != nil {
		return fmt.Errorf("删除需求评论失败: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("获取影响行数失败: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("需求评论不存在或已被删除 (ID: %d)", id)
	}

	return nil
}

// ListByRequirement 获取需求的评论列表（分页，包含用户信息）
func (r *requirementCommentRepositoryImpl) ListByRequirement(ctx context.Context, requirementID int, page, pageSize int) ([]*models.RequirementComment, int, error) {
	// 参数验证
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	offset := (page - 1) * pageSize

	// 查询总数
	var total int
	countQuery := `
		SELECT COUNT(*)
		FROM requirement_comments
		WHERE requirement_id = $1 AND status = $2
	`
	err := r.getDB().QueryRowContext(ctx, countQuery, requirementID, models.RequirementCommentStatusActive).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("查询需求评论总数失败: %w", err)
	}

	// 查询评论列表
	listQuery := `
		SELECT
			c.id, c.requirement_id, c.user_id, c.parent_comment_id,
			c.content, c.comment_type, c.attachments,
			c.is_internal, c.is_pinned, c.status,
			c.created_at, c.updated_at,
			u.username, u.email, u.user_type,
			(SELECT COUNT(*) FROM requirement_comments WHERE parent_comment_id = c.id AND status = $3) as replies_count
		FROM requirement_comments c
		LEFT JOIN users u ON c.user_id = u.id
		WHERE c.requirement_id = $1 AND c.status = $2 AND c.parent_comment_id IS NULL
		ORDER BY c.is_pinned DESC, c.created_at DESC
		LIMIT $4 OFFSET $5
	`

	rows, err := r.getDB().QueryContext(ctx, listQuery, requirementID, models.RequirementCommentStatusActive, models.RequirementCommentStatusActive, pageSize, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("查询需求评论列表失败: %w", err)
	}
	defer rows.Close()

	comments := make([]*models.RequirementComment, 0)
	for rows.Next() {
		comment := &models.RequirementComment{}

		var username, email, userType sql.NullString
		var parentCommentID sql.NullInt64
		var repliesCount int

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
			&username,
			&email,
			&userType,
			&repliesCount,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("扫描需求评论数据失败: %w", err)
		}

		// 填充可空字段
		if parentCommentID.Valid {
			pid := int(parentCommentID.Int64)
			comment.ParentCommentID = &pid
		}
		if username.Valid {
			comment.Username = &username.String
		}
		if userType.Valid {
			comment.UserType = &userType.String
		}
		comment.RepliesCount = &repliesCount

		comments = append(comments, comment)
	}

	if err = rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("遍历需求评论数据失败: %w", err)
	}

	return comments, total, nil
}

// ListByUser 按用户ID获取评论列表
func (r *requirementCommentRepositoryImpl) ListByUser(ctx context.Context, userID int, filters *models.RequirementCommentFilters) (*models.RequirementCommentListResponse, error) {
	// 分页参数
	page := filters.Page
	if page < 1 {
		page = 1
	}
	pageSize := filters.PageSize
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	offset := (page - 1) * pageSize

	// 构建WHERE子句
	whereClause := "WHERE user_id = $1"
	args := []interface{}{userID}
	argIndex := 2

	// 状态过滤
	if filters.Status != "" {
		whereClause += fmt.Sprintf(" AND status = $%d", argIndex)
		args = append(args, filters.Status)
		argIndex++
	} else {
		whereClause += fmt.Sprintf(" AND status = $%d", argIndex)
		args = append(args, models.RequirementCommentStatusActive)
		argIndex++
	}

	// 查询总数
	countQuery := fmt.Sprintf(`SELECT COUNT(*) FROM requirement_comments %s`, whereClause)
	var total int
	err := r.getDB().QueryRowContext(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, fmt.Errorf("查询需求评论总数失败: %w", err)
	}

	// 查询数据
	listQuery := fmt.Sprintf(`
		SELECT
			c.id, c.requirement_id, c.user_id, c.parent_comment_id,
			c.content, c.comment_type, c.attachments,
			c.is_internal, c.is_pinned, c.status,
			c.created_at, c.updated_at
		FROM requirement_comments c
		%s
		ORDER BY c.created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argIndex, argIndex+1)

	args = append(args, pageSize, offset)

	rows, err := r.getDB().QueryContext(ctx, listQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("查询需求评论列表失败: %w", err)
	}
	defer rows.Close()

	comments := []models.RequirementCommentResponse{}
	for rows.Next() {
		comment := models.RequirementComment{}

		var parentCommentID sql.NullInt64

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
		)
		if err != nil {
			return nil, fmt.Errorf("扫描需求评论数据失败: %w", err)
		}

		// 填充可空字段
		if parentCommentID.Valid {
			pid := int(parentCommentID.Int64)
			comment.ParentCommentID = &pid
		}

		comments = append(comments, comment.ToResponse())
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("遍历需求评论数据失败: %w", err)
	}

	return &models.RequirementCommentListResponse{
		Data:     comments,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}, nil
}

// GetReplies 获取评论的回复列表
func (r *requirementCommentRepositoryImpl) GetReplies(ctx context.Context, parentCommentID int) ([]*models.RequirementComment, error) {
	query := `
		SELECT
			c.id, c.requirement_id, c.user_id, c.parent_comment_id,
			c.content, c.comment_type, c.attachments,
			c.is_internal, c.is_pinned, c.status,
			c.created_at, c.updated_at,
			u.username, u.email, u.user_type
		FROM requirement_comments c
		LEFT JOIN users u ON c.user_id = u.id
		WHERE c.parent_comment_id = $1 AND c.status = $2
		ORDER BY c.created_at ASC
	`

	rows, err := r.getDB().QueryContext(ctx, query, parentCommentID, models.RequirementCommentStatusActive)
	if err != nil {
		return nil, fmt.Errorf("查询评论回复失败: %w", err)
	}
	defer rows.Close()

	replies := make([]*models.RequirementComment, 0)
	for rows.Next() {
		comment := &models.RequirementComment{}

		var username, email, userType sql.NullString
		var parentID sql.NullInt64

		err := rows.Scan(
			&comment.ID,
			&comment.RequirementID,
			&comment.UserID,
			&parentID,
			&comment.Content,
			&comment.CommentType,
			&comment.Attachments,
			&comment.IsInternal,
			&comment.IsPinned,
			&comment.Status,
			&comment.CreatedAt,
			&comment.UpdatedAt,
			&username,
			&email,
			&userType,
		)
		if err != nil {
			return nil, fmt.Errorf("扫描评论回复数据失败: %w", err)
		}

		if parentID.Valid {
			pid := int(parentID.Int64)
			comment.ParentCommentID = &pid
		}
		if username.Valid {
			comment.Username = &username.String
		}
		if userType.Valid {
			comment.UserType = &userType.String
		}

		replies = append(replies, comment)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("遍历评论回复数据失败: %w", err)
	}

	return replies, nil
}

// GetStats 获取需求评论统计信息
func (r *requirementCommentRepositoryImpl) GetStats(ctx context.Context, requirementID int) (*models.RequirementCommentStats, error) {
	query := `
		SELECT
			COUNT(*) as total_comments,
			COUNT(DISTINCT user_id) as active_participants,
			COUNT(CASE WHEN status = 'active' THEN 1 END) as active_comments,
			COUNT(CASE WHEN status = 'deleted' THEN 1 END) as deleted_comments,
			COUNT(CASE WHEN is_internal = true THEN 1 END) as internal_comments,
			COUNT(CASE WHEN is_pinned = true THEN 1 END) as pinned_comments,
			COUNT(CASE WHEN parent_comment_id IS NULL THEN 1 END) as top_level_comments,
			COUNT(CASE WHEN parent_comment_id IS NOT NULL THEN 1 END) as reply_comments,
			COUNT(CASE WHEN DATE_TRUNC('day', created_at) = DATE_TRUNC('day', CURRENT_TIMESTAMP) THEN 1 END) as todays_comments,
			COUNT(CASE WHEN created_at >= DATE_TRUNC('week', CURRENT_TIMESTAMP) THEN 1 END) as this_weeks_comments
		FROM requirement_comments
		WHERE requirement_id = $1
	`

	stats := &models.RequirementCommentStats{
		ByCommentType: make(map[string]int),
	}

	var activeParticipants int // Temporary variable for active_participants count
	err := r.getDB().QueryRowContext(ctx, query, requirementID).Scan(
		&stats.TotalComments,
		&activeParticipants, // Count of unique users (not used in model yet)
		&stats.ActiveComments,
		&stats.DeletedComments,
		&stats.InternalComments,
		&stats.PinnedComments,
		&stats.TopLevelComments,
		&stats.ReplyComments,
		&stats.TodaysComments,
		&stats.ThisWeeksComments,
	)

	if err == sql.ErrNoRows {
		return stats, nil
	}
	if err != nil {
		return nil, fmt.Errorf("查询需求评论统计失败: %w", err)
	}

	// 查询按评论类型统计
	typeQuery := `
		SELECT comment_type, COUNT(*) as count
		FROM requirement_comments
		WHERE requirement_id = $1 AND status = $2
		GROUP BY comment_type
	`

	rows, err := r.getDB().QueryContext(ctx, typeQuery, requirementID, models.RequirementCommentStatusActive)
	if err != nil {
		return stats, nil // 返回部分统计
	}
	defer rows.Close()

	for rows.Next() {
		var commentType string
		var count int
		if err := rows.Scan(&commentType, &count); err != nil {
			continue
		}
		stats.ByCommentType[commentType] = count
	}

	return stats, nil
}

// GetCommentCounts 批量获取多个需求的评论数
func (r *requirementCommentRepositoryImpl) GetCommentCounts(ctx context.Context, requirementIDs []int) (map[int]int, error) {
	if len(requirementIDs) == 0 {
		return make(map[int]int), nil
	}

	// 构建占位符
	placeholders := ""
	args := make([]interface{}, len(requirementIDs)+1)
	for i, reqID := range requirementIDs {
		if i > 0 {
			placeholders += ","
		}
		placeholders += fmt.Sprintf("$%d", i+1)
		args[i] = reqID
	}
	args[len(requirementIDs)] = models.RequirementCommentStatusActive

	query := fmt.Sprintf(`
		SELECT requirement_id, COUNT(*) as comment_count
		FROM requirement_comments
		WHERE requirement_id IN (%s) AND status = $%d
		GROUP BY requirement_id
	`, placeholders, len(requirementIDs)+1)

	rows, err := r.getDB().QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("批量查询需求评论数失败: %w", err)
	}
	defer rows.Close()

	counts := make(map[int]int)
	for rows.Next() {
		var reqID, count int
		if err := rows.Scan(&reqID, &count); err != nil {
			return nil, fmt.Errorf("扫描评论统计失败: %w", err)
		}
		counts[reqID] = count
	}

	// 为没有评论的需求设置默认值0
	for _, reqID := range requirementIDs {
		if _, exists := counts[reqID]; !exists {
			counts[reqID] = 0
		}
	}

	return counts, nil
}

// TogglePin 切换评论置顶状态
func (r *requirementCommentRepositoryImpl) TogglePin(ctx context.Context, id int, isPinned bool) error {
	query := `
		UPDATE requirement_comments
		SET is_pinned = $1, updated_at = CURRENT_TIMESTAMP
		WHERE id = $2 AND status = $3
	`

	result, err := r.getDB().ExecContext(ctx, query, isPinned, id, models.RequirementCommentStatusActive)
	if err != nil {
		return fmt.Errorf("切换评论置顶状态失败: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("获取影响行数失败: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("需求评论不存在或已被删除 (ID: %d)", id)
	}

	return nil
}

// UpdateInternal 更新评论内部标记
func (r *requirementCommentRepositoryImpl) UpdateInternal(ctx context.Context, id int, isInternal bool) error {
	query := `
		UPDATE requirement_comments
		SET is_internal = $1, updated_at = CURRENT_TIMESTAMP
		WHERE id = $2 AND status = $3
	`

	result, err := r.getDB().ExecContext(ctx, query, isInternal, id, models.RequirementCommentStatusActive)
	if err != nil {
		return fmt.Errorf("更新评论内部标记失败: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("获取影响行数失败: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("需求评论不存在或已被删除 (ID: %d)", id)
	}

	return nil
}

// GetByMentionedUser 获取@提及了某用户的评论列表
func (r *requirementCommentRepositoryImpl) GetByMentionedUser(ctx context.Context, userID int, filters *models.RequirementCommentFilters) (*models.RequirementCommentListResponse, error) {
	// 分页参数
	page := filters.Page
	if page < 1 {
		page = 1
	}
	pageSize := filters.PageSize
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	offset := (page - 1) * pageSize

	// 查询总数 - 使用JSONB contains操作符
	countQuery := `
		SELECT COUNT(*)
		FROM requirement_comments
		WHERE mentioned_user_ids @> $1::jsonb AND status = $2
	`
	var total int
	userIDJSON := fmt.Sprintf("[%d]", userID)
	err := r.getDB().QueryRowContext(ctx, countQuery, userIDJSON, models.RequirementCommentStatusActive).Scan(&total)
	if err != nil {
		return nil, fmt.Errorf("查询@提及评论总数失败: %w", err)
	}

	// 查询评论列表
	listQuery := `
		SELECT
			c.id, c.requirement_id, c.user_id, c.parent_comment_id,
			c.content, c.comment_type, c.attachments,
			c.mentioned_user_ids, c.mentioned_count,
			c.is_internal, c.is_pinned, c.status,
			c.created_at, c.updated_at,
			u.username, u.user_type
		FROM requirement_comments c
		LEFT JOIN users u ON c.user_id = u.id
		WHERE c.mentioned_user_ids @> $1::jsonb AND c.status = $2
		ORDER BY c.created_at DESC
		LIMIT $3 OFFSET $4
	`

	rows, err := r.getDB().QueryContext(ctx, listQuery, userIDJSON, models.RequirementCommentStatusActive, pageSize, offset)
	if err != nil {
		return nil, fmt.Errorf("查询@提及评论列表失败: %w", err)
	}
	defer rows.Close()

	comments := []models.RequirementCommentResponse{}
	for rows.Next() {
		comment := models.RequirementComment{}

		var username, userType sql.NullString
		var parentCommentID sql.NullInt64

		err := rows.Scan(
			&comment.ID,
			&comment.RequirementID,
			&comment.UserID,
			&parentCommentID,
			&comment.Content,
			&comment.CommentType,
			&comment.Attachments,
			&comment.MentionedUserIDs,
			&comment.MentionedCount,
			&comment.IsInternal,
			&comment.IsPinned,
			&comment.Status,
			&comment.CreatedAt,
			&comment.UpdatedAt,
			&username,
			&userType,
		)
		if err != nil {
			return nil, fmt.Errorf("扫描@提及评论数据失败: %w", err)
		}

		if parentCommentID.Valid {
			pid := int(parentCommentID.Int64)
			comment.ParentCommentID = &pid
		}
		if username.Valid {
			comment.Username = &username.String
		}
		if userType.Valid {
			comment.UserType = &userType.String
		}

		comments = append(comments, comment.ToResponse())
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("遍历@提及评论数据失败: %w", err)
	}

	return &models.RequirementCommentListResponse{
		Data:     comments,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}, nil
}

// PopulateMentionedUsers 填充评论中@提及用户的详细信息
func (r *requirementCommentRepositoryImpl) PopulateMentionedUsers(ctx context.Context, comments []*models.RequirementComment) error {
	if len(comments) == 0 {
		return nil
	}

	// 收集所有提及的用户ID（去重）
	userIDMap := make(map[int]bool)
	for _, comment := range comments {
		if comment.MentionedUserIDs != nil && len(comment.MentionedUserIDs) > 0 {
			for _, userID := range comment.MentionedUserIDs {
				userIDMap[userID] = true
			}
		}
	}

	if len(userIDMap) == 0 {
		return nil
	}

	// 构建用户ID列表
	userIDs := make([]int, 0, len(userIDMap))
	for userID := range userIDMap {
		userIDs = append(userIDs, userID)
	}

	// 批量查询用户信息
	placeholders := ""
	args := make([]interface{}, len(userIDs))
	for i, userID := range userIDs {
		if i > 0 {
			placeholders += ","
		}
		placeholders += fmt.Sprintf("$%d", i+1)
		args[i] = userID
	}

	query := fmt.Sprintf(`
		SELECT id, username, email
		FROM users
		WHERE id IN (%s)
	`, placeholders)

	rows, err := r.getDB().QueryContext(ctx, query, args...)
	if err != nil {
		return fmt.Errorf("查询@提及用户信息失败: %w", err)
	}
	defer rows.Close()

	// 构建用户信息映射
	userInfoMap := make(map[int]models.MentionedUser)
	for rows.Next() {
		var userID int
		var username string
		var email sql.NullString

		if err := rows.Scan(&userID, &username, &email); err != nil {
			return fmt.Errorf("扫描@提及用户数据失败: %w", err)
		}

		user := models.MentionedUser{
			UserID:   userID,
			Username: username,
		}
		if email.Valid {
			user.Avatar = &email.String // 可以改为头像URL字段
		}
		userInfoMap[userID] = user
	}

	if err = rows.Err(); err != nil {
		return fmt.Errorf("遍历@提及用户数据失败: %w", err)
	}

	// 填充评论的MentionedUsers字段
	for _, comment := range comments {
		if comment.MentionedUserIDs != nil && len(comment.MentionedUserIDs) > 0 {
			mentionedUsers := make([]models.MentionedUser, 0, len(comment.MentionedUserIDs))
			for _, userID := range comment.MentionedUserIDs {
				if userInfo, exists := userInfoMap[userID]; exists {
					mentionedUsers = append(mentionedUsers, userInfo)
				}
			}
			comment.MentionedUsers = mentionedUsers
		}
	}

	return nil
}
