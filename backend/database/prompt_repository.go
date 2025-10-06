package database

import (
	"database/sql"
	"fmt"
	"time"

	"ai-project-backend/models"
)

// PromptRepository 提示词相关的数据库操作
type PromptRepository struct {
	db *sql.DB
}

// NewPromptRepository 创建提示词仓库实例
func NewPromptRepository(db *sql.DB) *PromptRepository {
	return &PromptRepository{db: db}
}

// GetActiveTemplates 获取所有启用的提示词模板
func (r *PromptRepository) GetActiveTemplates() ([]models.PromptTemplate, error) {
	query := `
		SELECT id, name, description, content, category, prompt_type, tags, usage_count,
		       success_rate, recommended_models, is_system, is_active,
		       created_by, created_at, updated_at
		FROM prompt_templates
		WHERE is_active = true
		ORDER BY usage_count DESC, success_rate DESC
	`

	rows, err := r.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("查询提示词模板失败: %w", err)
	}
	defer rows.Close()

	var templates []models.PromptTemplate
	for rows.Next() {
		var t models.PromptTemplate
		var tags models.StringArray
		var recommendedModels models.StringArray

		err := rows.Scan(
			&t.ID, &t.Name, &t.Description, &t.Content, &t.Category, &t.PromptType,
			&tags, &t.UsageCount, &t.SuccessRate, &recommendedModels,
			&t.IsSystem, &t.IsActive, &t.CreatedBy, &t.CreatedAt, &t.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("扫描提示词模板失败: %w", err)
		}

		t.Tags = tags
		t.RecommendedModels = recommendedModels
		templates = append(templates, t)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("遍历提示词模板失败: %w", err)
	}

	return templates, nil
}

// GetTemplatesByCategory 按分类获取提示词模板
func (r *PromptRepository) GetTemplatesByCategory(category string) ([]models.PromptTemplate, error) {
	query := `
		SELECT id, name, description, content, category, prompt_type, tags, usage_count,
		       success_rate, recommended_models, is_system, is_active,
		       created_by, created_at, updated_at
		FROM prompt_templates
		WHERE is_active = true AND category = $1
		ORDER BY usage_count DESC, success_rate DESC
	`

	rows, err := r.db.Query(query, category)
	if err != nil {
		return nil, fmt.Errorf("查询分类提示词模板失败: %w", err)
	}
	defer rows.Close()

	var templates []models.PromptTemplate
	for rows.Next() {
		var t models.PromptTemplate
		var tags models.StringArray
		var recommendedModels models.StringArray

		err := rows.Scan(
			&t.ID, &t.Name, &t.Description, &t.Content, &t.Category, &t.PromptType,
			&tags, &t.UsageCount, &t.SuccessRate, &recommendedModels,
			&t.IsSystem, &t.IsActive, &t.CreatedBy, &t.CreatedAt, &t.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("扫描分类提示词模板失败: %w", err)
		}

		t.Tags = tags
		t.RecommendedModels = recommendedModels
		templates = append(templates, t)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("遍历分类提示词模板失败: %w", err)
	}

	return templates, nil
}

// GetTemplateByID 根据ID获取提示词模板
func (r *PromptRepository) GetTemplateByID(id int) (*models.PromptTemplate, error) {
	query := `
		SELECT id, name, description, content, category, prompt_type, tags, usage_count,
		       success_rate, recommended_models, is_system, is_active,
		       created_by, created_at, updated_at
		FROM prompt_templates
		WHERE id = $1
	`

	var t models.PromptTemplate
	var tags models.StringArray
	var recommendedModels models.StringArray

	err := r.db.QueryRow(query, id).Scan(
		&t.ID, &t.Name, &t.Description, &t.Content, &t.Category, &t.PromptType,
		&tags, &t.UsageCount, &t.SuccessRate, &recommendedModels,
		&t.IsSystem, &t.IsActive, &t.CreatedBy, &t.CreatedAt, &t.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("提示词模板不存在: ID=%d", id)
	}
	if err != nil {
		return nil, fmt.Errorf("查询提示词模板失败: %w", err)
	}

	t.Tags = tags
	t.RecommendedModels = recommendedModels
	return &t, nil
}

// IncrementTemplateUsage 增加模板使用次数
func (r *PromptRepository) IncrementTemplateUsage(templateID int) error {
	query := `
		UPDATE prompt_templates
		SET usage_count = usage_count + 1,
		    updated_at = $1
		WHERE id = $2
	`

	result, err := r.db.Exec(query, time.Now(), templateID)
	if err != nil {
		return fmt.Errorf("更新模板使用次数失败: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("获取影响行数失败: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("模板不存在: ID=%d", templateID)
	}

	return nil
}

// CreatePromptHistory 保存用户提示词历史记录
func (r *PromptRepository) CreatePromptHistory(history *models.UserPromptHistory) error {
	query := `
		INSERT INTO user_prompt_history (
			user_id, parent_task_id, prompt_text, template_id,
			ai_provider, ai_model, prompt_type, document_type,
			subtasks_generated, subtasks_accepted,
			total_estimated_hours, is_successful, user_rating, user_feedback
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
		RETURNING id, created_at
	`

	err := r.db.QueryRow(
		query,
		history.UserID,
		history.ParentTaskID,
		history.PromptText,
		history.TemplateID,
		history.AIProvider,
		history.AIModel,
		history.PromptType,
		history.DocumentType,
		history.SubtasksGenerated,
		history.SubtasksAccepted,
		history.TotalEstimatedHours,
		history.IsSuccessful,
		history.UserRating,
		history.UserFeedback,
	).Scan(&history.ID, &history.CreatedAt)

	if err != nil {
		return fmt.Errorf("创建提示词历史失败: %w", err)
	}

	return nil
}

// GetUserPromptHistory 获取用户的提示词历史记录
func (r *PromptRepository) GetUserPromptHistory(userID int, limit int) ([]models.UserPromptHistory, error) {
	if limit <= 0 {
		limit = 20 // 默认返回最近20条
	}

	query := `
		SELECT id, user_id, parent_task_id, prompt_text, template_id,
		       ai_provider, ai_model, prompt_type, document_type,
		       subtasks_generated, subtasks_accepted,
		       total_estimated_hours, is_successful, user_rating, user_feedback, created_at
		FROM user_prompt_history
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2
	`

	rows, err := r.db.Query(query, userID, limit)
	if err != nil {
		return nil, fmt.Errorf("查询用户提示词历史失败: %w", err)
	}
	defer rows.Close()

	var histories []models.UserPromptHistory
	for rows.Next() {
		var h models.UserPromptHistory
		err := rows.Scan(
			&h.ID, &h.UserID, &h.ParentTaskID, &h.PromptText, &h.TemplateID,
			&h.AIProvider, &h.AIModel, &h.PromptType, &h.DocumentType,
			&h.SubtasksGenerated, &h.SubtasksAccepted,
			&h.TotalEstimatedHours, &h.IsSuccessful, &h.UserRating, &h.UserFeedback, &h.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("扫描用户提示词历史失败: %w", err)
		}
		histories = append(histories, h)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("遍历用户提示词历史失败: %w", err)
	}

	return histories, nil
}

// UpdatePromptHistoryResult 更新提示词历史的结果（用户接受子任务后更新）
func (r *PromptRepository) UpdatePromptHistoryResult(historyID int, subtasksAccepted int, isSuccessful bool) error {
	query := `
		UPDATE user_prompt_history
		SET subtasks_accepted = $1,
		    is_successful = $2
		WHERE id = $3
	`

	result, err := r.db.Exec(query, subtasksAccepted, isSuccessful, historyID)
	if err != nil {
		return fmt.Errorf("更新提示词历史结果失败: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("获取影响行数失败: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("提示词历史不存在: ID=%d", historyID)
	}

	return nil
}

// UpdatePromptHistoryFeedback 更新用户反馈（用户评分和评论）
func (r *PromptRepository) UpdatePromptHistoryFeedback(historyID int, rating int, feedback string) error {
	if rating < 1 || rating > 5 {
		return fmt.Errorf("评分必须在1-5之间")
	}

	query := `
		UPDATE user_prompt_history
		SET user_rating = $1,
		    user_feedback = $2
		WHERE id = $3
	`

	result, err := r.db.Exec(query, rating, feedback, historyID)
	if err != nil {
		return fmt.Errorf("更新用户反馈失败: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("获取影响行数失败: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("提示词历史不存在: ID=%d", historyID)
	}

	return nil
}

// UpdateTemplateSuccessRate 更新模板成功率（根据历史记录统计）
func (r *PromptRepository) UpdateTemplateSuccessRate(templateID int) error {
	query := `
		WITH stats AS (
			SELECT
				COUNT(*) as total,
				COUNT(*) FILTER (WHERE is_successful = true) as successful
			FROM user_prompt_history
			WHERE template_id = $1 AND is_successful IS NOT NULL
		)
		UPDATE prompt_templates
		SET success_rate = CASE
			WHEN (SELECT total FROM stats) > 0
			THEN (SELECT successful::decimal / total * 100 FROM stats)
			ELSE 0
		END,
		updated_at = $2
		WHERE id = $1
	`

	result, err := r.db.Exec(query, templateID, time.Now())
	if err != nil {
		return fmt.Errorf("更新模板成功率失败: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("获取影响行数失败: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("模板不存在: ID=%d", templateID)
	}

	return nil
}

// GetSuccessfulHistoryForUser 获取用户成功的历史记录（用于推荐算法）
func (r *PromptRepository) GetSuccessfulHistoryForUser(userID int, limit int) ([]models.UserPromptHistory, error) {
	if limit <= 0 {
		limit = 50 // 默认返回最近50条成功记录
	}

	query := `
		SELECT id, user_id, parent_task_id, prompt_text, template_id,
		       ai_provider, ai_model, prompt_type, document_type,
		       subtasks_generated, subtasks_accepted,
		       total_estimated_hours, is_successful, user_rating, user_feedback, created_at
		FROM user_prompt_history
		WHERE user_id = $1 AND is_successful = true
		ORDER BY created_at DESC
		LIMIT $2
	`

	rows, err := r.db.Query(query, userID, limit)
	if err != nil {
		return nil, fmt.Errorf("查询成功历史记录失败: %w", err)
	}
	defer rows.Close()

	var histories []models.UserPromptHistory
	for rows.Next() {
		var h models.UserPromptHistory
		err := rows.Scan(
			&h.ID, &h.UserID, &h.ParentTaskID, &h.PromptText, &h.TemplateID,
			&h.AIProvider, &h.AIModel, &h.PromptType, &h.DocumentType,
			&h.SubtasksGenerated, &h.SubtasksAccepted,
			&h.TotalEstimatedHours, &h.IsSuccessful, &h.UserRating, &h.UserFeedback, &h.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("扫描成功历史记录失败: %w", err)
		}
		histories = append(histories, h)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("遍历成功历史记录失败: %w", err)
	}

	return histories, nil
}

// GetTemplatesByType 按提示词类型获取模板
func (r *PromptRepository) GetTemplatesByType(promptType string) ([]models.PromptTemplate, error) {
	query := `
		SELECT id, name, description, content, category, prompt_type, tags, usage_count,
		       success_rate, recommended_models, is_system, is_active,
		       created_by, created_at, updated_at
		FROM prompt_templates
		WHERE is_active = true AND prompt_type = $1
		ORDER BY usage_count DESC, success_rate DESC
	`

	rows, err := r.db.Query(query, promptType)
	if err != nil {
		return nil, fmt.Errorf("查询类型提示词模板失败: %w", err)
	}
	defer rows.Close()

	var templates []models.PromptTemplate
	for rows.Next() {
		var t models.PromptTemplate
		var tags models.StringArray
		var recommendedModels models.StringArray

		err := rows.Scan(
			&t.ID, &t.Name, &t.Description, &t.Content, &t.Category, &t.PromptType,
			&tags, &t.UsageCount, &t.SuccessRate, &recommendedModels,
			&t.IsSystem, &t.IsActive, &t.CreatedBy, &t.CreatedAt, &t.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("扫描类型提示词模板失败: %w", err)
		}

		t.Tags = tags
		t.RecommendedModels = recommendedModels
		templates = append(templates, t)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("遍历类型提示词模板失败: %w", err)
	}

	return templates, nil
}
