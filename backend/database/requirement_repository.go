package database

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"ai-project-backend/models"
)

// RequirementRepository 需求数据访问接口
type RequirementRepository interface {
	// 基础CRUD操作
	Create(ctx context.Context, requirement *models.Requirement) (*models.Requirement, error)
	GetByID(ctx context.Context, id int) (*models.Requirement, error)
	GetByDisplayID(ctx context.Context, displayID string) (*models.Requirement, error)
	Update(ctx context.Context, requirement *models.Requirement) (*models.Requirement, error)
	Delete(ctx context.Context, id int) error

	// 列表和查询
	List(ctx context.Context, filters *models.RequirementFilters) (*models.RequirementListResponse, error)
	ListByEnterpriseID(ctx context.Context, enterpriseID int, filters *models.RequirementFilters) (*models.RequirementListResponse, error)
	ListByProjectID(ctx context.Context, projectID int, filters *models.RequirementFilters) (*models.RequirementListResponse, error)
	ListBySubmitterID(ctx context.Context, submitterID int, filters *models.RequirementFilters) (*models.RequirementListResponse, error)
	ListByReviewerID(ctx context.Context, reviewerID int, filters *models.RequirementFilters) (*models.RequirementListResponse, error)
	Search(ctx context.Context, searchTerm string, filters *models.RequirementFilters) (*models.RequirementListResponse, error)

	// 状态和评审操作
	UpdateStatus(ctx context.Context, id int, status string, userID int) error
	UpdateReviewInfo(ctx context.Context, id int, reviewerID int, reviewStatus, reviewComment *string, reviewScore *int) error
	SetConvertedTask(ctx context.Context, requirementID int, taskID int, convertedBy int) error

	// 统计信息
	GetStats(ctx context.Context, enterpriseID *int) (*models.RequirementStats, error)
	GetCountByStatus(ctx context.Context, enterpriseID *int, status string) (int, error)

	// 权限相关
	CheckAccess(ctx context.Context, requirementID int, userID int) (bool, error)
}

// requirementRepositoryImpl 实现类
type requirementRepositoryImpl struct {
	db interface{} // Can be *sql.DB or *sql.Tx
}

// NewRequirementRepository 创建Repository实例
func NewRequirementRepository(db interface{}) RequirementRepository {
	return &requirementRepositoryImpl{db: db}
}

// getDB returns the database connection (supports both *sql.DB and *sql.Tx)
func (r *requirementRepositoryImpl) getDB() DBExecutor {
	if tx, ok := r.db.(*sql.Tx); ok {
		return tx
	}
	return r.db.(*sql.DB)
}

// Create 创建新需求
func (r *requirementRepositoryImpl) Create(ctx context.Context, requirement *models.Requirement) (*models.Requirement, error) {
	// 生成 display_id (格式: REQ-YYYY-NNNN)
	displayID, err := r.generateDisplayID(ctx)
	if err != nil {
		return nil, fmt.Errorf("生成需求编号失败: %w", err)
	}

	query := `
		INSERT INTO requirements (
			display_id, title, description, project_id, enterprise_id,
			submitter_id, status, priority, category,
			business_value, expected_outcome, acceptance_criteria,
			attachments, due_date, submitted_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
		)
		RETURNING id, created_at, updated_at
	`

	err = r.getDB().QueryRowContext(
		ctx, query,
		displayID,
		requirement.Title,
		requirement.Description,
		requirement.ProjectID,
		requirement.EnterpriseID,
		requirement.SubmitterID,
		requirement.Status,
		requirement.Priority,
		requirement.Category,
		requirement.BusinessValue,
		requirement.ExpectedOutcome,
		requirement.AcceptanceCriteria,
		requirement.Attachments,
		requirement.DueDate,
		requirement.SubmittedAt,
	).Scan(&requirement.ID, &requirement.CreatedAt, &requirement.UpdatedAt)

	if err != nil {
		return nil, fmt.Errorf("创建需求失败: %w", err)
	}

	requirement.DisplayID = displayID
	return requirement, nil
}

// GetByID 根据ID获取需求（包含关联信息）
func (r *requirementRepositoryImpl) GetByID(ctx context.Context, id int) (*models.Requirement, error) {
	query := `
		SELECT
			r.id, r.display_id, r.title, r.description,
			r.project_id, r.enterprise_id, r.submitter_id, r.reviewer_id,
			r.status, r.priority, r.category,
			r.business_value, r.expected_outcome, r.acceptance_criteria,
			r.attachments,
			r.review_status, r.review_comment, r.review_score, r.reviewed_at,
			r.estimated_hours, r.estimated_cost, r.complexity,
			r.converted_task_id, r.converted_at, r.converted_by,
			r.submitted_at, r.due_date, r.created_at, r.updated_at,
			p.name as project_name,
			e.name as enterprise_name,
			s.username as submitter_name,
			rv.username as reviewer_name
		FROM requirements r
		LEFT JOIN projects p ON r.project_id = p.id
		LEFT JOIN enterprises e ON r.enterprise_id = e.id
		LEFT JOIN users s ON r.submitter_id = s.id
		LEFT JOIN users rv ON r.reviewer_id = rv.id
		WHERE r.id = $1
	`

	requirement := &models.Requirement{}

	var projectName, enterpriseName, submitterName, reviewerName sql.NullString
	var projectID, reviewerID, convertedTaskID, convertedBy sql.NullInt64
	var reviewStatus, reviewComment, complexity, category sql.NullString
	var reviewScore sql.NullInt64
	var reviewedAt, convertedAt, submittedAt, dueDate sql.NullTime
	var description, businessValue, expectedOutcome, acceptanceCriteria sql.NullString
	var estimatedHours, estimatedCost sql.NullFloat64

	err := r.getDB().QueryRowContext(ctx, query, id).Scan(
		&requirement.ID,
		&requirement.DisplayID,
		&requirement.Title,
		&description,
		&projectID,
		&requirement.EnterpriseID,
		&requirement.SubmitterID,
		&reviewerID,
		&requirement.Status,
		&requirement.Priority,
		&category,
		&businessValue,
		&expectedOutcome,
		&acceptanceCriteria,
		&requirement.Attachments,
		&reviewStatus,
		&reviewComment,
		&reviewScore,
		&reviewedAt,
		&estimatedHours,
		&estimatedCost,
		&complexity,
		&convertedTaskID,
		&convertedAt,
		&convertedBy,
		&submittedAt,
		&dueDate,
		&requirement.CreatedAt,
		&requirement.UpdatedAt,
		&projectName,
		&enterpriseName,
		&submitterName,
		&reviewerName,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("需求不存在 (ID: %d)", id)
	}
	if err != nil {
		return nil, fmt.Errorf("查询需求失败: %w", err)
	}

	// 填充可空字段
	if description.Valid {
		requirement.Description = &description.String
	}
	if projectID.Valid {
		pid := int(projectID.Int64)
		requirement.ProjectID = &pid
	}
	if reviewerID.Valid {
		rid := int(reviewerID.Int64)
		requirement.ReviewerID = &rid
	}
	if category.Valid {
		requirement.Category = &category.String
	}
	if businessValue.Valid {
		requirement.BusinessValue = &businessValue.String
	}
	if expectedOutcome.Valid {
		requirement.ExpectedOutcome = &expectedOutcome.String
	}
	if acceptanceCriteria.Valid {
		requirement.AcceptanceCriteria = &acceptanceCriteria.String
	}
	if reviewStatus.Valid {
		requirement.ReviewStatus = &reviewStatus.String
	}
	if reviewComment.Valid {
		requirement.ReviewComment = &reviewComment.String
	}
	if reviewScore.Valid {
		rs := int(reviewScore.Int64)
		requirement.ReviewScore = &rs
	}
	if reviewedAt.Valid {
		requirement.ReviewedAt = &reviewedAt.Time
	}
	if estimatedHours.Valid {
		requirement.EstimatedHours = &estimatedHours.Float64
	}
	if estimatedCost.Valid {
		requirement.EstimatedCost = &estimatedCost.Float64
	}
	if complexity.Valid {
		requirement.Complexity = &complexity.String
	}
	if convertedTaskID.Valid {
		ctid := int(convertedTaskID.Int64)
		requirement.ConvertedTaskID = &ctid
	}
	if convertedAt.Valid {
		requirement.ConvertedAt = &convertedAt.Time
	}
	if convertedBy.Valid {
		cb := int(convertedBy.Int64)
		requirement.ConvertedBy = &cb
	}
	if submittedAt.Valid {
		requirement.SubmittedAt = &submittedAt.Time
	}
	if dueDate.Valid {
		requirement.DueDate = &dueDate.Time
	}

	// 填充关联对象名称
	if projectName.Valid {
		requirement.ProjectName = &projectName.String
	}
	if enterpriseName.Valid {
		requirement.EnterpriseName = &enterpriseName.String
	}
	if submitterName.Valid {
		requirement.SubmitterName = &submitterName.String
	}
	if reviewerName.Valid {
		requirement.ReviewerName = &reviewerName.String
	}

	return requirement, nil
}

// GetByDisplayID 根据编号获取需求
func (r *requirementRepositoryImpl) GetByDisplayID(ctx context.Context, displayID string) (*models.Requirement, error) {
	query := `SELECT id FROM requirements WHERE display_id = $1`
	var id int
	err := r.getDB().QueryRowContext(ctx, query, displayID).Scan(&id)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("需求不存在 (DisplayID: %s)", displayID)
	}
	if err != nil {
		return nil, fmt.Errorf("查询需求失败: %w", err)
	}
	return r.GetByID(ctx, id)
}

// Update 更新需求
func (r *requirementRepositoryImpl) Update(ctx context.Context, requirement *models.Requirement) (*models.Requirement, error) {
	query := `
		UPDATE requirements SET
			title = $1, description = $2, project_id = $3,
			priority = $4, category = $5,
			business_value = $6, expected_outcome = $7, acceptance_criteria = $8,
			attachments = $9, due_date = $10,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $11
		RETURNING updated_at
	`

	err := r.getDB().QueryRowContext(
		ctx, query,
		requirement.Title,
		requirement.Description,
		requirement.ProjectID,
		requirement.Priority,
		requirement.Category,
		requirement.BusinessValue,
		requirement.ExpectedOutcome,
		requirement.AcceptanceCriteria,
		requirement.Attachments,
		requirement.DueDate,
		requirement.ID,
	).Scan(&requirement.UpdatedAt)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("需求不存在 (ID: %d)", requirement.ID)
	}
	if err != nil {
		return nil, fmt.Errorf("更新需求失败: %w", err)
	}

	return r.GetByID(ctx, requirement.ID)
}

// Delete 删除需求（硬删除，考虑改为软删除）
func (r *requirementRepositoryImpl) Delete(ctx context.Context, id int) error {
	query := `DELETE FROM requirements WHERE id = $1`
	result, err := r.getDB().ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("删除需求失败: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("获取影响行数失败: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("需求不存在 (ID: %d)", id)
	}

	return nil
}

// List 获取需求列表（带过滤和分页）
func (r *requirementRepositoryImpl) List(ctx context.Context, filters *models.RequirementFilters) (*models.RequirementListResponse, error) {
	// 构建WHERE子句
	whereClauses := []string{}
	args := []interface{}{}
	argIndex := 1

	// 状态过滤
	if len(filters.Status) > 0 {
		placeholders := []string{}
		for _, status := range filters.Status {
			placeholders = append(placeholders, fmt.Sprintf("$%d", argIndex))
			args = append(args, status)
			argIndex++
		}
		whereClauses = append(whereClauses, fmt.Sprintf("r.status IN (%s)", strings.Join(placeholders, ",")))
	}

	// 优先级过滤
	if len(filters.Priority) > 0 {
		placeholders := []string{}
		for _, priority := range filters.Priority {
			placeholders = append(placeholders, fmt.Sprintf("$%d", argIndex))
			args = append(args, priority)
			argIndex++
		}
		whereClauses = append(whereClauses, fmt.Sprintf("r.priority IN (%s)", strings.Join(placeholders, ",")))
	}

	// 分类过滤
	if len(filters.Category) > 0 {
		placeholders := []string{}
		for _, category := range filters.Category {
			placeholders = append(placeholders, fmt.Sprintf("$%d", argIndex))
			args = append(args, category)
			argIndex++
		}
		whereClauses = append(whereClauses, fmt.Sprintf("r.category IN (%s)", strings.Join(placeholders, ",")))
	}

	// 提交人过滤
	if filters.SubmitterID != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("r.submitter_id = $%d", argIndex))
		args = append(args, *filters.SubmitterID)
		argIndex++
	}

	// 评审人过滤
	if filters.ReviewerID != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("r.reviewer_id = $%d", argIndex))
		args = append(args, *filters.ReviewerID)
		argIndex++
	}

	// 企业过滤
	if filters.EnterpriseID != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("r.enterprise_id = $%d", argIndex))
		args = append(args, *filters.EnterpriseID)
		argIndex++
	}

	// 项目过滤
	if filters.ProjectID != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("r.project_id = $%d", argIndex))
		args = append(args, *filters.ProjectID)
		argIndex++
	}

	// 全文搜索
	if filters.Search != "" {
		whereClauses = append(whereClauses, fmt.Sprintf(
			"(r.title ILIKE $%d OR r.description ILIKE $%d)",
			argIndex, argIndex,
		))
		args = append(args, "%"+filters.Search+"%")
		argIndex++
	}

	// 日期范围过滤
	if filters.DueAfter != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("r.due_date >= $%d", argIndex))
		args = append(args, *filters.DueAfter)
		argIndex++
	}
	if filters.DueBefore != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("r.due_date <= $%d", argIndex))
		args = append(args, *filters.DueBefore)
		argIndex++
	}

	whereClause := ""
	if len(whereClauses) > 0 {
		whereClause = "WHERE " + strings.Join(whereClauses, " AND ")
	}

	// 查询总数
	countQuery := fmt.Sprintf(`SELECT COUNT(*) FROM requirements r %s`, whereClause)
	var total int
	err := r.getDB().QueryRowContext(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, fmt.Errorf("查询需求总数失败: %w", err)
	}

	// 排序
	sortBy := "created_at"
	if filters.SortBy != "" {
		sortBy = filters.SortBy
	}
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
			r.id, r.display_id, r.title, r.description,
			r.project_id, r.enterprise_id, r.submitter_id, r.reviewer_id,
			r.status, r.priority, r.category,
			r.business_value, r.expected_outcome, r.acceptance_criteria,
			r.attachments,
			r.review_status, r.review_comment, r.review_score, r.reviewed_at,
			r.estimated_hours, r.estimated_cost, r.complexity,
			r.converted_task_id, r.converted_at, r.converted_by,
			r.submitted_at, r.due_date, r.created_at, r.updated_at,
			p.name as project_name,
			e.name as enterprise_name,
			s.username as submitter_name,
			rv.username as reviewer_name
		FROM requirements r
		LEFT JOIN projects p ON r.project_id = p.id
		LEFT JOIN enterprises e ON r.enterprise_id = e.id
		LEFT JOIN users s ON r.submitter_id = s.id
		LEFT JOIN users rv ON r.reviewer_id = rv.id
		%s
		ORDER BY r.%s %s
		LIMIT $%d OFFSET $%d
	`, whereClause, sortBy, sortOrder, argIndex, argIndex+1)

	args = append(args, pageSize, offset)

	rows, err := r.getDB().QueryContext(ctx, listQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("查询需求列表失败: %w", err)
	}
	defer rows.Close()

	requirements := []models.RequirementResponse{}
	for rows.Next() {
		req := models.Requirement{}

		var projectName, enterpriseName, submitterName, reviewerName sql.NullString
		var projectID, reviewerID, convertedTaskID, convertedBy sql.NullInt64
		var reviewStatus, reviewComment, complexity, category sql.NullString
		var reviewScore sql.NullInt64
		var reviewedAt, convertedAt, submittedAt, dueDate sql.NullTime
		var description, businessValue, expectedOutcome, acceptanceCriteria sql.NullString
		var estimatedHours, estimatedCost sql.NullFloat64

		err := rows.Scan(
			&req.ID,
			&req.DisplayID,
			&req.Title,
			&description,
			&projectID,
			&req.EnterpriseID,
			&req.SubmitterID,
			&reviewerID,
			&req.Status,
			&req.Priority,
			&category,
			&businessValue,
			&expectedOutcome,
			&acceptanceCriteria,
			&req.Attachments,
			&reviewStatus,
			&reviewComment,
			&reviewScore,
			&reviewedAt,
			&estimatedHours,
			&estimatedCost,
			&complexity,
			&convertedTaskID,
			&convertedAt,
			&convertedBy,
			&submittedAt,
			&dueDate,
			&req.CreatedAt,
			&req.UpdatedAt,
			&projectName,
			&enterpriseName,
			&submitterName,
			&reviewerName,
		)
		if err != nil {
			return nil, fmt.Errorf("扫描需求数据失败: %w", err)
		}

		// 填充可空字段（简化版，只填充关键字段）
		if description.Valid {
			req.Description = &description.String
		}
		if projectID.Valid {
			pid := int(projectID.Int64)
			req.ProjectID = &pid
		}
		if projectName.Valid {
			req.ProjectName = &projectName.String
		}
		if enterpriseName.Valid {
			req.EnterpriseName = &enterpriseName.String
		}
		if submitterName.Valid {
			req.SubmitterName = &submitterName.String
		}
		if reviewerID.Valid {
			rid := int(reviewerID.Int64)
			req.ReviewerID = &rid
		}
		if reviewerName.Valid {
			req.ReviewerName = &reviewerName.String
		}

		requirements = append(requirements, req.ToResponse())
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("遍历需求数据失败: %w", err)
	}

	return &models.RequirementListResponse{
		Data:     requirements,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}, nil
}

// ListByEnterpriseID 按企业ID获取需求列表
func (r *requirementRepositoryImpl) ListByEnterpriseID(ctx context.Context, enterpriseID int, filters *models.RequirementFilters) (*models.RequirementListResponse, error) {
	filters.EnterpriseID = &enterpriseID
	return r.List(ctx, filters)
}

// ListByProjectID 按项目ID获取需求列表
func (r *requirementRepositoryImpl) ListByProjectID(ctx context.Context, projectID int, filters *models.RequirementFilters) (*models.RequirementListResponse, error) {
	filters.ProjectID = &projectID
	return r.List(ctx, filters)
}

// ListBySubmitterID 按提交人ID获取需求列表
func (r *requirementRepositoryImpl) ListBySubmitterID(ctx context.Context, submitterID int, filters *models.RequirementFilters) (*models.RequirementListResponse, error) {
	filters.SubmitterID = &submitterID
	return r.List(ctx, filters)
}

// ListByReviewerID 按评审人ID获取需求列表
func (r *requirementRepositoryImpl) ListByReviewerID(ctx context.Context, reviewerID int, filters *models.RequirementFilters) (*models.RequirementListResponse, error) {
	filters.ReviewerID = &reviewerID
	return r.List(ctx, filters)
}

// Search 全文搜索需求
func (r *requirementRepositoryImpl) Search(ctx context.Context, searchTerm string, filters *models.RequirementFilters) (*models.RequirementListResponse, error) {
	filters.Search = searchTerm
	return r.List(ctx, filters)
}

// UpdateStatus 更新需求状态
func (r *requirementRepositoryImpl) UpdateStatus(ctx context.Context, id int, status string, userID int) error {
	query := `
		UPDATE requirements
		SET status = $1, updated_at = CURRENT_TIMESTAMP
		WHERE id = $2
	`

	result, err := r.getDB().ExecContext(ctx, query, status, id)
	if err != nil {
		return fmt.Errorf("更新需求状态失败: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("获取影响行数失败: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("需求不存在 (ID: %d)", id)
	}

	return nil
}

// UpdateReviewInfo 更新评审信息
func (r *requirementRepositoryImpl) UpdateReviewInfo(ctx context.Context, id int, reviewerID int, reviewStatus, reviewComment *string, reviewScore *int) error {
	query := `
		UPDATE requirements SET
			reviewer_id = $1,
			review_status = $2,
			review_comment = $3,
			review_score = $4,
			reviewed_at = CURRENT_TIMESTAMP,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $5
	`

	result, err := r.getDB().ExecContext(ctx, query, reviewerID, reviewStatus, reviewComment, reviewScore, id)
	if err != nil {
		return fmt.Errorf("更新评审信息失败: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("获取影响行数失败: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("需求不存在 (ID: %d)", id)
	}

	return nil
}

// SetConvertedTask 设置已转化的任务
func (r *requirementRepositoryImpl) SetConvertedTask(ctx context.Context, requirementID int, taskID int, convertedBy int) error {
	query := `
		UPDATE requirements SET
			converted_task_id = $1,
			converted_at = CURRENT_TIMESTAMP,
			converted_by = $2,
			status = $3,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $4
	`

	result, err := r.getDB().ExecContext(ctx, query, taskID, convertedBy, string(models.RequirementStatusConverted), requirementID)
	if err != nil {
		return fmt.Errorf("设置转化任务失败: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("获取影响行数失败: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("需求不存在 (ID: %d)", requirementID)
	}

	return nil
}

// GetStats 获取需求统计信息
func (r *requirementRepositoryImpl) GetStats(ctx context.Context, enterpriseID *int) (*models.RequirementStats, error) {
	whereClause := ""
	args := []interface{}{}

	if enterpriseID != nil {
		whereClause = "WHERE enterprise_id = $1"
		args = append(args, *enterpriseID)
	}

	query := fmt.Sprintf(`
		WITH stats AS (
			SELECT
				COUNT(*) as total_requirements,
				COUNT(CASE WHEN status = 'pending' OR status = 'reviewing' THEN 1 END) as pending_review,
				COUNT(CASE WHEN status = 'approved' AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_TIMESTAMP) THEN 1 END) as approved_this_month,
				COUNT(CASE WHEN status = 'converted' AND DATE_TRUNC('month', converted_at) = DATE_TRUNC('month', CURRENT_TIMESTAMP) THEN 1 END) as converted_this_month,
				AVG(EXTRACT(EPOCH FROM (reviewed_at - submitted_at)) / 3600.0) as avg_review_time
			FROM requirements
			%s
		),
		by_status AS (
			SELECT status, COUNT(*) as count
			FROM requirements
			%s
			GROUP BY status
		),
		by_priority AS (
			SELECT priority, COUNT(*) as count
			FROM requirements
			%s
			GROUP BY priority
		)
		SELECT
			s.total_requirements,
			s.pending_review,
			s.approved_this_month,
			s.converted_this_month,
			COALESCE(s.avg_review_time, 0) as avg_review_time
		FROM stats s
	`, whereClause, whereClause, whereClause)

	stats := &models.RequirementStats{
		ByStatus:   make(map[string]int),
		ByPriority: make(map[string]int),
	}

	err := r.getDB().QueryRowContext(ctx, query, args...).Scan(
		&stats.TotalRequirements,
		&stats.PendingReview,
		&stats.ApprovedThisMonth,
		&stats.ConvertedThisMonth,
		&stats.AverageReviewTime,
	)
	if err != nil {
		return nil, fmt.Errorf("查询需求统计失败: %w", err)
	}

	// 计算转化率
	if stats.TotalRequirements > 0 {
		stats.ConversionRate = float64(stats.ConvertedThisMonth) / float64(stats.TotalRequirements) * 100
	}

	// 查询按状态统计
	statusQuery := fmt.Sprintf(`
		SELECT status, COUNT(*) as count
		FROM requirements
		%s
		GROUP BY status
	`, whereClause)

	rows, err := r.getDB().QueryContext(ctx, statusQuery, args...)
	if err != nil {
		return stats, nil // 返回部分统计
	}
	defer rows.Close()

	for rows.Next() {
		var status string
		var count int
		if err := rows.Scan(&status, &count); err != nil {
			continue
		}
		stats.ByStatus[status] = count
	}

	// 查询按优先级统计
	priorityQuery := fmt.Sprintf(`
		SELECT priority, COUNT(*) as count
		FROM requirements
		%s
		GROUP BY priority
	`, whereClause)

	rows, err = r.getDB().QueryContext(ctx, priorityQuery, args...)
	if err != nil {
		return stats, nil // 返回部分统计
	}
	defer rows.Close()

	for rows.Next() {
		var priority string
		var count int
		if err := rows.Scan(&priority, &count); err != nil {
			continue
		}
		stats.ByPriority[priority] = count
	}

	return stats, nil
}

// GetCountByStatus 获取指定状态的需求数量
func (r *requirementRepositoryImpl) GetCountByStatus(ctx context.Context, enterpriseID *int, status string) (int, error) {
	whereClause := "WHERE status = $1"
	args := []interface{}{status}

	if enterpriseID != nil {
		whereClause += " AND enterprise_id = $2"
		args = append(args, *enterpriseID)
	}

	query := fmt.Sprintf(`SELECT COUNT(*) FROM requirements %s`, whereClause)

	var count int
	err := r.getDB().QueryRowContext(ctx, query, args...).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("查询需求数量失败: %w", err)
	}

	return count, nil
}

// CheckAccess 检查用户是否有权限访问需求
func (r *requirementRepositoryImpl) CheckAccess(ctx context.Context, requirementID int, userID int) (bool, error) {
	query := `
		SELECT COUNT(*) FROM requirements r
		LEFT JOIN users u ON u.id = $2
		WHERE r.id = $1 AND (
			r.submitter_id = $2  -- 提交人
			OR r.reviewer_id = $2  -- 评审人
			OR (u.user_type = 'system')  -- 系统用户（项目经理）
			OR r.enterprise_id = u.company_id  -- 同企业用户
		)
	`

	var count int
	err := r.getDB().QueryRowContext(ctx, query, requirementID, userID).Scan(&count)
	if err != nil {
		return false, fmt.Errorf("检查访问权限失败: %w", err)
	}

	return count > 0, nil
}

// generateDisplayID 生成需求编号 REQ-YYYY-NNNN
func (r *requirementRepositoryImpl) generateDisplayID(ctx context.Context) (string, error) {
	year := time.Now().Year()
	prefix := fmt.Sprintf("REQ-%d-", year)

	// 查询当年最大编号
	query := `
		SELECT MAX(CAST(SUBSTRING(display_id FROM 10) AS INTEGER))
		FROM requirements
		WHERE display_id LIKE $1
	`

	var maxNum sql.NullInt64
	err := r.getDB().QueryRowContext(ctx, query, prefix+"%").Scan(&maxNum)
	if err != nil && err != sql.ErrNoRows {
		return "", fmt.Errorf("查询最大编号失败: %w", err)
	}

	nextNum := 1
	if maxNum.Valid {
		nextNum = int(maxNum.Int64) + 1
	}

	return fmt.Sprintf("%s%04d", prefix, nextNum), nil
}
