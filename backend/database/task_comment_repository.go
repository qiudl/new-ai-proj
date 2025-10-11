package database

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"ai-project-backend/models"
)

// TaskCommentRepository 任务评论数据访问接口
type TaskCommentRepository interface {
	// 创建评论
	Create(ctx context.Context, comment *models.TaskComment) error

	// 获取单条评论
	GetByID(ctx context.Context, id int) (*models.TaskComment, error)

	// 获取任务的评论列表（分页）
	ListByTask(ctx context.Context, taskID int, page, pageSize int) ([]*models.TaskComment, int, error)

	// 软删除评论
	SoftDelete(ctx context.Context, id int, deletedBy int) error

	// 获取任务评论统计
	GetStats(ctx context.Context, taskID int) (*models.TaskCommentStats, error)

	// 批量获取任务评论数
	GetCommentCounts(ctx context.Context, taskIDs []int) (map[int]int, error)
}

// taskCommentRepositoryImpl 实现类
type taskCommentRepositoryImpl struct {
	db *sql.DB
}

// NewTaskCommentRepository 创建Repository实例
func NewTaskCommentRepository(db *sql.DB) TaskCommentRepository {
	return &taskCommentRepositoryImpl{db: db}
}

// Create 创建新评论
func (r *taskCommentRepositoryImpl) Create(ctx context.Context, comment *models.TaskComment) error {
	query := `
		INSERT INTO task_comments (task_id, user_id, content, status)
		VALUES ($1, $2, $3, $4)
		RETURNING id, created_at, updated_at
	`

	err := r.db.QueryRowContext(
		ctx, query,
		comment.TaskID,
		comment.UserID,
		comment.Content,
		models.CommentStatusActive,
	).Scan(&comment.ID, &comment.CreatedAt, &comment.UpdatedAt)

	if err != nil {
		return fmt.Errorf("创建评论失败: %w", err)
	}

	comment.Status = models.CommentStatusActive
	return nil
}

// GetByID 根据ID获取评论（包含用户信息）
func (r *taskCommentRepositoryImpl) GetByID(ctx context.Context, id int) (*models.TaskComment, error) {
	query := `
		SELECT
			c.id, c.task_id, c.user_id, c.content, c.status,
			c.created_at, c.updated_at, c.deleted_at, c.deleted_by,
			u.id as user_id, u.username as user_name, '' as user_avatar
		FROM task_comments c
		LEFT JOIN users u ON c.user_id = u.id
		WHERE c.id = $1
	`

	comment := &models.TaskComment{
		User: &models.CommentUser{},
	}

	var userName, userAvatar sql.NullString
	var userID sql.NullInt64

	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&comment.ID,
		&comment.TaskID,
		&comment.UserID,
		&comment.Content,
		&comment.Status,
		&comment.CreatedAt,
		&comment.UpdatedAt,
		&comment.DeletedAt,
		&comment.DeletedBy,
		&userID,
		&userName,
		&userAvatar,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("评论不存在 (ID: %d)", id)
	}
	if err != nil {
		return nil, fmt.Errorf("查询评论失败: %w", err)
	}

	// 填充用户信息
	if userID.Valid {
		comment.User.ID = int(userID.Int64)
		comment.User.Name = userName.String
		comment.User.Avatar = userAvatar.String
	}

	return comment, nil
}

// ListByTask 获取任务的评论列表（分页，包含用户信息）
func (r *taskCommentRepositoryImpl) ListByTask(ctx context.Context, taskID int, page, pageSize int) ([]*models.TaskComment, int, error) {
	// 参数验证
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > models.MaxCommentsPerPage {
		pageSize = models.DefaultCommentsPerPage
	}

	offset := (page - 1) * pageSize

	// 查询总数
	var total int
	countQuery := `
		SELECT COUNT(*)
		FROM task_comments
		WHERE task_id = $1 AND status = $2
	`
	err := r.db.QueryRowContext(ctx, countQuery, taskID, models.CommentStatusActive).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("查询评论总数失败: %w", err)
	}

	// 查询评论列表
	listQuery := `
		SELECT
			c.id, c.task_id, c.user_id, c.content, c.status,
			c.created_at, c.updated_at,
			u.id as user_id, u.username as user_name, '' as user_avatar
		FROM task_comments c
		LEFT JOIN users u ON c.user_id = u.id
		WHERE c.task_id = $1 AND c.status = $2
		ORDER BY c.created_at DESC
		LIMIT $3 OFFSET $4
	`

	rows, err := r.db.QueryContext(ctx, listQuery, taskID, models.CommentStatusActive, pageSize, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("查询评论列表失败: %w", err)
	}
	defer rows.Close()

	comments := make([]*models.TaskComment, 0)
	for rows.Next() {
		comment := &models.TaskComment{
			User: &models.CommentUser{},
		}

		var userName, userAvatar sql.NullString
		var userID sql.NullInt64

		err := rows.Scan(
			&comment.ID,
			&comment.TaskID,
			&comment.UserID,
			&comment.Content,
			&comment.Status,
			&comment.CreatedAt,
			&comment.UpdatedAt,
			&userID,
			&userName,
			&userAvatar,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("扫描评论数据失败: %w", err)
		}

		// 填充用户信息
		if userID.Valid {
			comment.User.ID = int(userID.Int64)
			comment.User.Name = userName.String
			comment.User.Avatar = userAvatar.String
		}

		comments = append(comments, comment)
	}

	if err = rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("遍历评论数据失败: %w", err)
	}

	return comments, total, nil
}

// SoftDelete 软删除评论
func (r *taskCommentRepositoryImpl) SoftDelete(ctx context.Context, id int, deletedBy int) error {
	query := `
		UPDATE task_comments
		SET
			status = $1,
			deleted_at = $2,
			deleted_by = $3,
			updated_at = $2
		WHERE id = $4 AND status = $5
	`

	now := time.Now()
	result, err := r.db.ExecContext(
		ctx, query,
		models.CommentStatusDeleted,
		now,
		deletedBy,
		id,
		models.CommentStatusActive,
	)

	if err != nil {
		return fmt.Errorf("删除评论失败: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("获取影响行数失败: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("评论不存在或已被删除 (ID: %d)", id)
	}

	return nil
}

// GetStats 获取任务评论统计信息
func (r *taskCommentRepositoryImpl) GetStats(ctx context.Context, taskID int) (*models.TaskCommentStats, error) {
	query := `
		SELECT
			task_id,
			COUNT(*) as total_comments,
			COUNT(DISTINCT user_id) as participants,
			MAX(created_at) as last_comment_at
		FROM task_comments
		WHERE task_id = $1 AND status = $2
		GROUP BY task_id
	`

	stats := &models.TaskCommentStats{
		TaskID: taskID,
	}

	err := r.db.QueryRowContext(ctx, query, taskID, models.CommentStatusActive).Scan(
		&stats.TaskID,
		&stats.TotalComments,
		&stats.Participants,
		&stats.LastCommentAt,
	)

	if err == sql.ErrNoRows {
		// 任务没有评论，返回默认值
		return stats, nil
	}
	if err != nil {
		return nil, fmt.Errorf("查询评论统计失败: %w", err)
	}

	return stats, nil
}

// GetCommentCounts 批量获取多个任务的评论数
func (r *taskCommentRepositoryImpl) GetCommentCounts(ctx context.Context, taskIDs []int) (map[int]int, error) {
	if len(taskIDs) == 0 {
		return make(map[int]int), nil
	}

	// 构建占位符
	placeholders := ""
	args := make([]interface{}, len(taskIDs)+1)
	for i, taskID := range taskIDs {
		if i > 0 {
			placeholders += ","
		}
		placeholders += fmt.Sprintf("$%d", i+1)
		args[i] = taskID
	}
	args[len(taskIDs)] = models.CommentStatusActive

	query := fmt.Sprintf(`
		SELECT task_id, COUNT(*) as comment_count
		FROM task_comments
		WHERE task_id IN (%s) AND status = $%d
		GROUP BY task_id
	`, placeholders, len(taskIDs)+1)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("批量查询评论数失败: %w", err)
	}
	defer rows.Close()

	counts := make(map[int]int)
	for rows.Next() {
		var taskID, count int
		if err := rows.Scan(&taskID, &count); err != nil {
			return nil, fmt.Errorf("扫描评论统计失败: %w", err)
		}
		counts[taskID] = count
	}

	// 为没有评论的任务设置默认值0
	for _, taskID := range taskIDs {
		if _, exists := counts[taskID]; !exists {
			counts[taskID] = 0
		}
	}

	return counts, nil
}
