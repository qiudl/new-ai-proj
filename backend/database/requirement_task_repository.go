package database

import (
	"context"
	"database/sql"
	"fmt"

	"ai-project-backend/models"
)

// RequirementTaskRepository 需求-任务关联数据访问接口
type RequirementTaskRepository interface {
	// 基础CRUD操作
	Create(ctx context.Context, link *models.RequirementTask) (*models.RequirementTask, error)
	GetByID(ctx context.Context, id int) (*models.RequirementTask, error)
	Delete(ctx context.Context, id int) error
	DeleteByRequirementAndTask(ctx context.Context, requirementID, taskID int) error

	// 查询操作
	GetByRequirementID(ctx context.Context, requirementID int) ([]*models.RequirementTask, error)
	GetByTaskID(ctx context.Context, taskID int) ([]*models.RequirementTask, error)
	GetByRequirementAndTask(ctx context.Context, requirementID, taskID int) (*models.RequirementTask, error)
	List(ctx context.Context, filters *models.RequirementTaskFilters) (*models.RequirementTaskListResponse, error)

	// 检查操作
	Exists(ctx context.Context, requirementID, taskID int) (bool, error)
	CountByRequirement(ctx context.Context, requirementID int) (int, error)
	CountByTask(ctx context.Context, taskID int) (int, error)
}

// requirementTaskRepositoryImpl 实现类
type requirementTaskRepositoryImpl struct {
	db interface{} // Can be *sql.DB or *sql.Tx
}

// NewRequirementTaskRepository 创建Repository实例
func NewRequirementTaskRepository(db interface{}) RequirementTaskRepository {
	return &requirementTaskRepositoryImpl{db: db}
}

// getDB returns the database connection (supports both *sql.DB and *sql.Tx)
func (r *requirementTaskRepositoryImpl) getDB() DBExecutor {
	if tx, ok := r.db.(*sql.Tx); ok {
		return tx
	}
	return r.db.(*sql.DB)
}

// Create 创建需求-任务关联
func (r *requirementTaskRepositoryImpl) Create(ctx context.Context, link *models.RequirementTask) (*models.RequirementTask, error) {
	// 检查是否已存在
	exists, err := r.Exists(ctx, link.RequirementID, link.TaskID)
	if err != nil {
		return nil, fmt.Errorf("检查关联是否存在失败: %w", err)
	}
	if exists {
		return nil, fmt.Errorf("该需求和任务已存在关联关系")
	}

	query := `
		INSERT INTO requirement_tasks (
			requirement_id, task_id, link_type, linked_by, link_comment
		) VALUES (
			$1, $2, $3, $4, $5
		)
		RETURNING id, created_at, updated_at
	`

	err = r.getDB().QueryRowContext(
		ctx, query,
		link.RequirementID,
		link.TaskID,
		link.LinkType,
		link.LinkedBy,
		link.LinkComment,
	).Scan(&link.ID, &link.CreatedAt, &link.UpdatedAt)

	if err != nil {
		return nil, fmt.Errorf("创建需求-任务关联失败: %w", err)
	}

	return link, nil
}

// GetByID 根据ID获取关联
func (r *requirementTaskRepositoryImpl) GetByID(ctx context.Context, id int) (*models.RequirementTask, error) {
	query := `
		SELECT
			rt.id, rt.requirement_id, rt.task_id, rt.link_type,
			rt.linked_by, rt.link_comment, rt.created_at, rt.updated_at,
			r.title as requirement_title,
			r.display_id as requirement_display_id,
			r.status as requirement_status,
			t.title as task_title,
			t.status as task_status,
			u.username as linker_username
		FROM requirement_tasks rt
		LEFT JOIN requirements r ON rt.requirement_id = r.id
		LEFT JOIN tasks t ON rt.task_id = t.id
		LEFT JOIN users u ON rt.linked_by = u.id
		WHERE rt.id = $1
	`

	link := &models.RequirementTask{}
	var linkComment sql.NullString

	err := r.getDB().QueryRowContext(ctx, query, id).Scan(
		&link.ID,
		&link.RequirementID,
		&link.TaskID,
		&link.LinkType,
		&link.LinkedBy,
		&linkComment,
		&link.CreatedAt,
		&link.UpdatedAt,
		&link.RequirementTitle,
		&link.RequirementDisplayID,
		&link.RequirementStatus,
		&link.TaskTitle,
		&link.TaskStatus,
		&link.LinkerUsername,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("关联不存在 (ID: %d)", id)
	}
	if err != nil {
		return nil, fmt.Errorf("查询关联失败: %w", err)
	}

	if linkComment.Valid {
		link.LinkComment = &linkComment.String
	}

	return link, nil
}

// Delete 删除关联
func (r *requirementTaskRepositoryImpl) Delete(ctx context.Context, id int) error {
	query := `DELETE FROM requirement_tasks WHERE id = $1`

	result, err := r.getDB().ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("删除关联失败: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("获取影响行数失败: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("关联不存在 (ID: %d)", id)
	}

	return nil
}

// DeleteByRequirementAndTask 根据需求ID和任务ID删除关联
func (r *requirementTaskRepositoryImpl) DeleteByRequirementAndTask(ctx context.Context, requirementID, taskID int) error {
	query := `DELETE FROM requirement_tasks WHERE requirement_id = $1 AND task_id = $2`

	result, err := r.getDB().ExecContext(ctx, query, requirementID, taskID)
	if err != nil {
		return fmt.Errorf("删除关联失败: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("获取影响行数失败: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("关联不存在 (需求ID: %d, 任务ID: %d)", requirementID, taskID)
	}

	return nil
}

// GetByRequirementID 获取需求的所有关联任务
func (r *requirementTaskRepositoryImpl) GetByRequirementID(ctx context.Context, requirementID int) ([]*models.RequirementTask, error) {
	query := `
		SELECT
			rt.id, rt.requirement_id, rt.task_id, rt.link_type,
			rt.linked_by, rt.link_comment, rt.created_at, rt.updated_at,
			r.title as requirement_title,
			r.display_id as requirement_display_id,
			r.status as requirement_status,
			t.title as task_title,
			t.status as task_status,
			u.username as linker_username
		FROM requirement_tasks rt
		LEFT JOIN requirements r ON rt.requirement_id = r.id
		LEFT JOIN tasks t ON rt.task_id = t.id
		LEFT JOIN users u ON rt.linked_by = u.id
		WHERE rt.requirement_id = $1
		ORDER BY rt.created_at DESC
	`

	rows, err := r.getDB().QueryContext(ctx, query, requirementID)
	if err != nil {
		return nil, fmt.Errorf("查询需求关联任务失败: %w", err)
	}
	defer rows.Close()

	links := make([]*models.RequirementTask, 0)

	for rows.Next() {
		link := &models.RequirementTask{}
		var linkComment sql.NullString

		err := rows.Scan(
			&link.ID,
			&link.RequirementID,
			&link.TaskID,
			&link.LinkType,
			&link.LinkedBy,
			&linkComment,
			&link.CreatedAt,
			&link.UpdatedAt,
			&link.RequirementTitle,
			&link.RequirementDisplayID,
			&link.RequirementStatus,
			&link.TaskTitle,
			&link.TaskStatus,
			&link.LinkerUsername,
		)

		if err != nil {
			return nil, fmt.Errorf("扫描关联数据失败: %w", err)
		}

		if linkComment.Valid {
			link.LinkComment = &linkComment.String
		}

		links = append(links, link)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("遍历关联失败: %w", err)
	}

	return links, nil
}

// GetByTaskID 获取任务的所有关联需求
func (r *requirementTaskRepositoryImpl) GetByTaskID(ctx context.Context, taskID int) ([]*models.RequirementTask, error) {
	query := `
		SELECT
			rt.id, rt.requirement_id, rt.task_id, rt.link_type,
			rt.linked_by, rt.link_comment, rt.created_at, rt.updated_at,
			r.title as requirement_title,
			r.display_id as requirement_display_id,
			r.status as requirement_status,
			t.title as task_title,
			t.status as task_status,
			u.username as linker_username
		FROM requirement_tasks rt
		LEFT JOIN requirements r ON rt.requirement_id = r.id
		LEFT JOIN tasks t ON rt.task_id = t.id
		LEFT JOIN users u ON rt.linked_by = u.id
		WHERE rt.task_id = $1
		ORDER BY rt.created_at DESC
	`

	rows, err := r.getDB().QueryContext(ctx, query, taskID)
	if err != nil {
		return nil, fmt.Errorf("查询任务关联需求失败: %w", err)
	}
	defer rows.Close()

	links := make([]*models.RequirementTask, 0)

	for rows.Next() {
		link := &models.RequirementTask{}
		var linkComment sql.NullString

		err := rows.Scan(
			&link.ID,
			&link.RequirementID,
			&link.TaskID,
			&link.LinkType,
			&link.LinkedBy,
			&linkComment,
			&link.CreatedAt,
			&link.UpdatedAt,
			&link.RequirementTitle,
			&link.RequirementDisplayID,
			&link.RequirementStatus,
			&link.TaskTitle,
			&link.TaskStatus,
			&link.LinkerUsername,
		)

		if err != nil {
			return nil, fmt.Errorf("扫描关联数据失败: %w", err)
		}

		if linkComment.Valid {
			link.LinkComment = &linkComment.String
		}

		links = append(links, link)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("遍历关联失败: %w", err)
	}

	return links, nil
}

// GetByRequirementAndTask 获取特定需求和任务的关联
func (r *requirementTaskRepositoryImpl) GetByRequirementAndTask(ctx context.Context, requirementID, taskID int) (*models.RequirementTask, error) {
	query := `
		SELECT
			rt.id, rt.requirement_id, rt.task_id, rt.link_type,
			rt.linked_by, rt.link_comment, rt.created_at, rt.updated_at,
			r.title as requirement_title,
			r.display_id as requirement_display_id,
			r.status as requirement_status,
			t.title as task_title,
			t.status as task_status,
			u.username as linker_username
		FROM requirement_tasks rt
		LEFT JOIN requirements r ON rt.requirement_id = r.id
		LEFT JOIN tasks t ON rt.task_id = t.id
		LEFT JOIN users u ON rt.linked_by = u.id
		WHERE rt.requirement_id = $1 AND rt.task_id = $2
	`

	link := &models.RequirementTask{}
	var linkComment sql.NullString

	err := r.getDB().QueryRowContext(ctx, query, requirementID, taskID).Scan(
		&link.ID,
		&link.RequirementID,
		&link.TaskID,
		&link.LinkType,
		&link.LinkedBy,
		&linkComment,
		&link.CreatedAt,
		&link.UpdatedAt,
		&link.RequirementTitle,
		&link.RequirementDisplayID,
		&link.RequirementStatus,
		&link.TaskTitle,
		&link.TaskStatus,
		&link.LinkerUsername,
	)

	if err == sql.ErrNoRows {
		return nil, nil // 不存在不算错误
	}
	if err != nil {
		return nil, fmt.Errorf("查询关联失败: %w", err)
	}

	if linkComment.Valid {
		link.LinkComment = &linkComment.String
	}

	return link, nil
}

// List 查询关联列表（带过滤和分页）
func (r *requirementTaskRepositoryImpl) List(ctx context.Context, filters *models.RequirementTaskFilters) (*models.RequirementTaskListResponse, error) {
	// 默认值
	if filters.Page < 1 {
		filters.Page = 1
	}
	if filters.PageSize < 1 || filters.PageSize > 100 {
		filters.PageSize = 20
	}
	if filters.SortBy == "" {
		filters.SortBy = "created_at"
	}
	if filters.SortOrder == "" {
		filters.SortOrder = "desc"
	}

	// 构建WHERE条件
	whereClause := "WHERE 1=1"
	args := make([]interface{}, 0)
	argCount := 0

	if filters.RequirementID != nil {
		argCount++
		whereClause += fmt.Sprintf(" AND rt.requirement_id = $%d", argCount)
		args = append(args, *filters.RequirementID)
	}

	if filters.TaskID != nil {
		argCount++
		whereClause += fmt.Sprintf(" AND rt.task_id = $%d", argCount)
		args = append(args, *filters.TaskID)
	}

	if filters.LinkedBy != nil {
		argCount++
		whereClause += fmt.Sprintf(" AND rt.linked_by = $%d", argCount)
		args = append(args, *filters.LinkedBy)
	}

	if len(filters.LinkType) > 0 {
		argCount++
		whereClause += fmt.Sprintf(" AND rt.link_type = ANY($%d)", argCount)
		args = append(args, filters.LinkType)
	}

	// 查询总数
	countQuery := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM requirement_tasks rt
		%s
	`, whereClause)

	var total int
	err := r.getDB().QueryRowContext(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, fmt.Errorf("查询总数失败: %w", err)
	}

	// 查询数据
	offset := (filters.Page - 1) * filters.PageSize
	argCount++
	limitClause := fmt.Sprintf("LIMIT $%d", argCount)
	args = append(args, filters.PageSize)

	argCount++
	limitClause += fmt.Sprintf(" OFFSET $%d", argCount)
	args = append(args, offset)

	query := fmt.Sprintf(`
		SELECT
			rt.id, rt.requirement_id, rt.task_id, rt.link_type,
			rt.linked_by, rt.link_comment, rt.created_at, rt.updated_at,
			r.title as requirement_title,
			r.display_id as requirement_display_id,
			r.status as requirement_status,
			t.title as task_title,
			t.status as task_status,
			u.username as linker_username
		FROM requirement_tasks rt
		LEFT JOIN requirements r ON rt.requirement_id = r.id
		LEFT JOIN tasks t ON rt.task_id = t.id
		LEFT JOIN users u ON rt.linked_by = u.id
		%s
		ORDER BY rt.%s %s
		%s
	`, whereClause, filters.SortBy, filters.SortOrder, limitClause)

	rows, err := r.getDB().QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("查询关联列表失败: %w", err)
	}
	defer rows.Close()

	links := make([]models.RequirementTaskResponse, 0)

	for rows.Next() {
		link := &models.RequirementTask{}
		var linkComment sql.NullString

		err := rows.Scan(
			&link.ID,
			&link.RequirementID,
			&link.TaskID,
			&link.LinkType,
			&link.LinkedBy,
			&linkComment,
			&link.CreatedAt,
			&link.UpdatedAt,
			&link.RequirementTitle,
			&link.RequirementDisplayID,
			&link.RequirementStatus,
			&link.TaskTitle,
			&link.TaskStatus,
			&link.LinkerUsername,
		)

		if err != nil {
			return nil, fmt.Errorf("扫描关联数据失败: %w", err)
		}

		if linkComment.Valid {
			link.LinkComment = &linkComment.String
		}

		links = append(links, link.ToResponse())
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("遍历关联失败: %w", err)
	}

	return &models.RequirementTaskListResponse{
		Data:     links,
		Total:    total,
		Page:     filters.Page,
		PageSize: filters.PageSize,
	}, nil
}

// Exists 检查关联是否存在
func (r *requirementTaskRepositoryImpl) Exists(ctx context.Context, requirementID, taskID int) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM requirement_tasks WHERE requirement_id = $1 AND task_id = $2)`

	var exists bool
	err := r.getDB().QueryRowContext(ctx, query, requirementID, taskID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("检查关联是否存在失败: %w", err)
	}

	return exists, nil
}

// CountByRequirement 统计需求的关联任务数
func (r *requirementTaskRepositoryImpl) CountByRequirement(ctx context.Context, requirementID int) (int, error) {
	query := `SELECT COUNT(*) FROM requirement_tasks WHERE requirement_id = $1`

	var count int
	err := r.getDB().QueryRowContext(ctx, query, requirementID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("统计需求关联任务数失败: %w", err)
	}

	return count, nil
}

// CountByTask 统计任务的关联需求数
func (r *requirementTaskRepositoryImpl) CountByTask(ctx context.Context, taskID int) (int, error) {
	query := `SELECT COUNT(*) FROM requirement_tasks WHERE task_id = $1`

	var count int
	err := r.getDB().QueryRowContext(ctx, query, taskID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("统计任务关联需求数失败: %w", err)
	}

	return count, nil
}
