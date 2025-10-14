package database

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"ai-project-backend/models"
)

// RequirementHistoryRepository 需求历史记录数据访问接口
type RequirementHistoryRepository interface {
	// 基础操作
	Create(ctx context.Context, history *models.RequirementHistory) error
	GetByID(ctx context.Context, id int) (*models.RequirementHistory, error)

	// 查询操作
	ListByRequirement(ctx context.Context, requirementID int, filters *models.RequirementHistoryFilters) (*models.RequirementHistoryListResponse, error)
	ListByUser(ctx context.Context, userID int, filters *models.RequirementHistoryFilters) (*models.RequirementHistoryListResponse, error)
	List(ctx context.Context, filters *models.RequirementHistoryFilters) (*models.RequirementHistoryListResponse, error)

	// 统计信息
	GetStats(ctx context.Context, requirementID *int) (*models.RequirementHistoryStats, error)
}

// requirementHistoryRepositoryImpl 实现类
type requirementHistoryRepositoryImpl struct {
	db interface{} // Can be *sql.DB or *sql.Tx
}

// NewRequirementHistoryRepository 创建Repository实例
func NewRequirementHistoryRepository(db interface{}) RequirementHistoryRepository {
	return &requirementHistoryRepositoryImpl{db: db}
}

// getDB returns the database connection (supports both *sql.DB and *sql.Tx)
func (r *requirementHistoryRepositoryImpl) getDB() DBExecutor {
	if tx, ok := r.db.(*sql.Tx); ok {
		return tx
	}
	return r.db.(*sql.DB)
}

// Create 创建历史记录
func (r *requirementHistoryRepositoryImpl) Create(ctx context.Context, history *models.RequirementHistory) error {
	query := `
		INSERT INTO requirement_history (
			requirement_id, user_id, action,
			field_name, old_value, new_value, comment
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, created_at
	`

	err := r.getDB().QueryRowContext(
		ctx, query,
		history.RequirementID,
		history.UserID,
		history.Action,
		history.FieldName,
		history.OldValue,
		history.NewValue,
		history.Comment,
	).Scan(&history.ID, &history.CreatedAt)

	if err != nil {
		return fmt.Errorf("创建需求历史记录失败: %w", err)
	}

	return nil
}

// GetByID 根据ID获取历史记录（包含用户信息）
func (r *requirementHistoryRepositoryImpl) GetByID(ctx context.Context, id int) (*models.RequirementHistory, error) {
	query := `
		SELECT
			h.id, h.requirement_id, h.user_id,
			h.action, h.field_name, h.old_value, h.new_value, h.comment,
			h.created_at,
			u.username, u.email, u.user_type
		FROM requirement_history h
		LEFT JOIN users u ON h.user_id = u.id
		WHERE h.id = $1
	`

	history := &models.RequirementHistory{}

	var username, email, userType sql.NullString
	var fieldName, oldValue, newValue, comment sql.NullString

	err := r.getDB().QueryRowContext(ctx, query, id).Scan(
		&history.ID,
		&history.RequirementID,
		&history.UserID,
		&history.Action,
		&fieldName,
		&oldValue,
		&newValue,
		&comment,
		&history.CreatedAt,
		&username,
		&email,
		&userType,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("需求历史记录不存在 (ID: %d)", id)
	}
	if err != nil {
		return nil, fmt.Errorf("查询需求历史记录失败: %w", err)
	}

	// 填充可空字段
	if fieldName.Valid {
		history.FieldName = &fieldName.String
	}
	if oldValue.Valid {
		history.OldValue = &oldValue.String
	}
	if newValue.Valid {
		history.NewValue = &newValue.String
	}
	if comment.Valid {
		history.Comment = &comment.String
	}
	if username.Valid {
		history.Username = &username.String
	}
	if userType.Valid {
		history.UserType = &userType.String
	}

	return history, nil
}

// ListByRequirement 按需求ID获取历史记录列表
func (r *requirementHistoryRepositoryImpl) ListByRequirement(ctx context.Context, requirementID int, filters *models.RequirementHistoryFilters) (*models.RequirementHistoryListResponse, error) {
	filters.RequirementID = &requirementID
	return r.List(ctx, filters)
}

// ListByUser 按用户ID获取历史记录列表
func (r *requirementHistoryRepositoryImpl) ListByUser(ctx context.Context, userID int, filters *models.RequirementHistoryFilters) (*models.RequirementHistoryListResponse, error) {
	filters.UserID = &userID
	return r.List(ctx, filters)
}

// List 获取历史记录列表（带过滤和分页）
func (r *requirementHistoryRepositoryImpl) List(ctx context.Context, filters *models.RequirementHistoryFilters) (*models.RequirementHistoryListResponse, error) {
	// 构建WHERE子句
	whereClauses := []string{}
	args := []interface{}{}
	argIndex := 1

	// 需求ID过滤
	if filters.RequirementID != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("h.requirement_id = $%d", argIndex))
		args = append(args, *filters.RequirementID)
		argIndex++
	}

	// 用户ID过滤
	if filters.UserID != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("h.user_id = $%d", argIndex))
		args = append(args, *filters.UserID)
		argIndex++
	}

	// 操作类型过滤
	if len(filters.Actions) > 0 {
		placeholders := []string{}
		for _, action := range filters.Actions {
			placeholders = append(placeholders, fmt.Sprintf("$%d", argIndex))
			args = append(args, action)
			argIndex++
		}
		whereClauses = append(whereClauses, fmt.Sprintf("h.action IN (%s)", strings.Join(placeholders, ",")))
	}

	// 字段名过滤
	if filters.FieldName != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("h.field_name = $%d", argIndex))
		args = append(args, *filters.FieldName)
		argIndex++
	}

	// 日期范围过滤
	if filters.CreatedAfter != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("h.created_at >= $%d", argIndex))
		args = append(args, *filters.CreatedAfter)
		argIndex++
	}
	if filters.CreatedBefore != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("h.created_at <= $%d", argIndex))
		args = append(args, *filters.CreatedBefore)
		argIndex++
	}

	whereClause := ""
	if len(whereClauses) > 0 {
		whereClause = "WHERE " + strings.Join(whereClauses, " AND ")
	}

	// 查询总数
	countQuery := fmt.Sprintf(`SELECT COUNT(*) FROM requirement_history h %s`, whereClause)
	var total int
	err := r.getDB().QueryRowContext(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, fmt.Errorf("查询需求历史记录总数失败: %w", err)
	}

	// 排序
	sortOrder := "DESC"
	if filters.SortOrder != "" {
		sortOrder = filters.SortOrder
	}

	// 分页
	page := filters.Page
	if page < 1 {
		page = 1
	}
	pageSize := filters.PageSize
	if pageSize < 1 {
		pageSize = 20
	}
	if pageSize > 100 {
		pageSize = 100
	}
	offset := (page - 1) * pageSize

	// 查询数据
	listQuery := fmt.Sprintf(`
		SELECT
			h.id, h.requirement_id, h.user_id,
			h.action, h.field_name, h.old_value, h.new_value, h.comment,
			h.created_at,
			u.username, u.email, u.user_type
		FROM requirement_history h
		LEFT JOIN users u ON h.user_id = u.id
		%s
		ORDER BY h.created_at %s
		LIMIT $%d OFFSET $%d
	`, whereClause, sortOrder, argIndex, argIndex+1)

	args = append(args, pageSize, offset)

	rows, err := r.getDB().QueryContext(ctx, listQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("查询需求历史记录列表失败: %w", err)
	}
	defer rows.Close()

	histories := []models.RequirementHistoryResponse{}
	for rows.Next() {
		history := models.RequirementHistory{}

		var username, email, userType sql.NullString
		var fieldName, oldValue, newValue, comment sql.NullString

		err := rows.Scan(
			&history.ID,
			&history.RequirementID,
			&history.UserID,
			&history.Action,
			&fieldName,
			&oldValue,
			&newValue,
			&comment,
			&history.CreatedAt,
			&username,
			&email,
			&userType,
		)
		if err != nil {
			return nil, fmt.Errorf("扫描需求历史记录数据失败: %w", err)
		}

		// 填充可空字段
		if fieldName.Valid {
			history.FieldName = &fieldName.String
		}
		if oldValue.Valid {
			history.OldValue = &oldValue.String
		}
		if newValue.Valid {
			history.NewValue = &newValue.String
		}
		if comment.Valid {
			history.Comment = &comment.String
		}
		if username.Valid {
			history.Username = &username.String
		}
		if userType.Valid {
			history.UserType = &userType.String
		}

		histories = append(histories, history.ToResponse())
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("遍历需求历史记录数据失败: %w", err)
	}

	return &models.RequirementHistoryListResponse{
		Data:     histories,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}, nil
}

// GetStats 获取需求历史统计信息
func (r *requirementHistoryRepositoryImpl) GetStats(ctx context.Context, requirementID *int) (*models.RequirementHistoryStats, error) {
	whereClause := ""
	args := []interface{}{}

	if requirementID != nil {
		whereClause = "WHERE requirement_id = $1"
		args = append(args, *requirementID)
	}

	// 基础统计
	query := fmt.Sprintf(`
		SELECT
			COUNT(*) as total_actions,
			COUNT(CASE WHEN DATE_TRUNC('day', created_at) = DATE_TRUNC('day', CURRENT_TIMESTAMP) THEN 1 END) as todays_actions,
			COUNT(CASE WHEN created_at >= DATE_TRUNC('week', CURRENT_TIMESTAMP) THEN 1 END) as this_weeks_actions,
			COUNT(CASE WHEN action IN ('status_changed', 'approved', 'rejected') THEN 1 END) as recent_status_changes
		FROM requirement_history
		%s
	`, whereClause)

	stats := &models.RequirementHistoryStats{
		ByAction:        make(map[string]int),
		MostActiveUsers: []models.UserActivity{},
	}

	err := r.getDB().QueryRowContext(ctx, query, args...).Scan(
		&stats.TotalActions,
		&stats.TodaysActions,
		&stats.ThisWeeksActions,
		&stats.RecentStatusChanges,
	)
	if err != nil && err != sql.ErrNoRows {
		return nil, fmt.Errorf("查询需求历史统计失败: %w", err)
	}

	// 按操作类型统计
	actionQuery := fmt.Sprintf(`
		SELECT action, COUNT(*) as count
		FROM requirement_history
		%s
		GROUP BY action
		ORDER BY count DESC
	`, whereClause)

	rows, err := r.getDB().QueryContext(ctx, actionQuery, args...)
	if err != nil {
		return stats, nil // 返回部分统计
	}
	defer rows.Close()

	for rows.Next() {
		var action string
		var count int
		if err := rows.Scan(&action, &count); err != nil {
			continue
		}
		stats.ByAction[action] = count
	}

	// 最活跃用户
	userQuery := fmt.Sprintf(`
		SELECT
			h.user_id,
			u.username,
			COUNT(*) as action_count
		FROM requirement_history h
		LEFT JOIN users u ON h.user_id = u.id
		%s
		GROUP BY h.user_id, u.username
		ORDER BY action_count DESC
		LIMIT 10
	`, whereClause)

	rows, err = r.getDB().QueryContext(ctx, userQuery, args...)
	if err != nil {
		return stats, nil // 返回部分统计
	}
	defer rows.Close()

	for rows.Next() {
		var userActivity models.UserActivity
		var username sql.NullString
		if err := rows.Scan(&userActivity.UserID, &username, &userActivity.ActionCount); err != nil {
			continue
		}
		if username.Valid {
			userActivity.Username = username.String
		}
		stats.MostActiveUsers = append(stats.MostActiveUsers, userActivity)
	}

	// 计算平均操作数
	if requirementID != nil {
		stats.AverageActionsPerRequirement = float64(stats.TotalActions)
	} else {
		// 计算所有需求的平均操作数
		avgQuery := `
			SELECT
				COALESCE(AVG(action_count), 0) as avg_actions
			FROM (
				SELECT requirement_id, COUNT(*) as action_count
				FROM requirement_history
				GROUP BY requirement_id
			) subquery
		`
		r.getDB().QueryRowContext(ctx, avgQuery).Scan(&stats.AverageActionsPerRequirement)
	}

	return stats, nil
}
