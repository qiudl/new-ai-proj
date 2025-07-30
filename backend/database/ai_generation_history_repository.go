package database

import (
	"context"

	"github.com/jmoiron/sqlx"
	"ai-project-backend/models"
)

// AIGenerationHistoryRepository AI生成历史记录仓库接口
type AIGenerationHistoryRepository interface {
	// 基本CRUD操作
	Create(ctx context.Context, history *models.AITaskGenerationHistory) (*models.AITaskGenerationHistory, error)
	GetByID(ctx context.Context, id int) (*models.AITaskGenerationHistory, error)
	GetByUserID(ctx context.Context, userID int, limit, offset int) ([]*models.AITaskGenerationHistory, int, error)
	GetByProjectID(ctx context.Context, projectID int, limit, offset int) ([]*models.AITaskGenerationHistory, int, error)
	
	// 统计查询
	GetUserStats(ctx context.Context, userID int, days int) (*models.UserAIStats, error)
	GetProjectStats(ctx context.Context, projectID int, days int) (*models.ProjectAIStats, error)
	GetProviderUsage(ctx context.Context, userID int, provider models.AIProvider, days int) (*models.ProviderUsageStats, error)
	
	// 成本跟踪
	RecordUsage(ctx context.Context, userID int, projectID *int, provider models.AIProvider, tokenCount int, cost float64, success bool) error
	GetCostSummary(ctx context.Context, userID int, projectID *int, period string) (*models.CostSummary, error)
	CheckBudgetLimit(ctx context.Context, userID int, projectID *int, provider *models.AIProvider) (*models.BudgetStatus, error)
	
	// 历史记录查询
	GetRecentGenerations(ctx context.Context, userID int, limit int) ([]*models.AITaskGenerationHistory, error)
	GetPopularTemplates(ctx context.Context, userID int, limit int) ([]*models.AITemplateUsage, error)
}

// aiGenerationHistoryRepository AI生成历史记录仓库实现
type aiGenerationHistoryRepository struct {
	db *sqlx.DB
}

// NewAIGenerationHistoryRepository 创建AI生成历史记录仓库
func NewAIGenerationHistoryRepository(db *sqlx.DB) AIGenerationHistoryRepository {
	return &aiGenerationHistoryRepository{db: db}
}

// Create 创建历史记录
func (r *aiGenerationHistoryRepository) Create(ctx context.Context, history *models.AITaskGenerationHistory) (*models.AITaskGenerationHistory, error) {
	query := `
		INSERT INTO ai_task_generation_history (
			user_id, project_id, provider, input_text, generated_tasks,
			token_usage, quality_metrics, processing_time_ms, success, error_message,
			imported_task_ids
		) VALUES (
			:user_id, :project_id, :provider, :input_text, :generated_tasks,
			:token_usage, :quality_metrics, :processing_time_ms, :success, :error_message,
			:imported_task_ids
		) RETURNING id, created_at, updated_at`
	
	rows, err := r.db.NamedQueryContext(ctx, query, history)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	if rows.Next() {
		err = rows.StructScan(history)
		if err != nil {
			return nil, err
		}
	}
	
	return history, nil
}

// GetByID 根据ID获取历史记录
func (r *aiGenerationHistoryRepository) GetByID(ctx context.Context, id int) (*models.AITaskGenerationHistory, error) {
	history := &models.AITaskGenerationHistory{}
	query := `
		SELECT id, user_id, project_id, provider, input_text, generated_tasks,
			   token_usage, quality_metrics, processing_time_ms, success, error_message,
			   imported_task_ids, created_at, updated_at
		FROM ai_task_generation_history
		WHERE id = $1`
	
	err := r.db.GetContext(ctx, history, query, id)
	if err != nil {
		return nil, err
	}
	
	return history, nil
}

// GetByUserID 根据用户ID获取历史记录
func (r *aiGenerationHistoryRepository) GetByUserID(ctx context.Context, userID int, limit, offset int) ([]*models.AITaskGenerationHistory, int, error) {
	var histories []*models.AITaskGenerationHistory
	var total int
	
	// 获取总数
	countQuery := `SELECT COUNT(*) FROM ai_task_generation_history WHERE user_id = $1`
	err := r.db.GetContext(ctx, &total, countQuery, userID)
	if err != nil {
		return nil, 0, err
	}
	
	// 获取数据
	query := `
		SELECT id, user_id, project_id, provider, input_text, generated_tasks,
			   token_usage, quality_metrics, processing_time_ms, success, error_message,
			   imported_task_ids, created_at, updated_at
		FROM ai_task_generation_history
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3`
	
	err = r.db.SelectContext(ctx, &histories, query, userID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	
	return histories, total, nil
}

// GetByProjectID 根据项目ID获取历史记录
func (r *aiGenerationHistoryRepository) GetByProjectID(ctx context.Context, projectID int, limit, offset int) ([]*models.AITaskGenerationHistory, int, error) {
	var histories []*models.AITaskGenerationHistory
	var total int
	
	// 获取总数
	countQuery := `SELECT COUNT(*) FROM ai_task_generation_history WHERE project_id = $1`
	err := r.db.GetContext(ctx, &total, countQuery, projectID)
	if err != nil {
		return nil, 0, err
	}
	
	// 获取数据
	query := `
		SELECT id, user_id, project_id, provider, input_text, generated_tasks,
			   token_usage, quality_metrics, processing_time_ms, success, error_message,
			   imported_task_ids, created_at, updated_at
		FROM ai_task_generation_history
		WHERE project_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3`
	
	err = r.db.SelectContext(ctx, &histories, query, projectID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	
	return histories, total, nil
}

// GetUserStats 获取用户AI使用统计
func (r *aiGenerationHistoryRepository) GetUserStats(ctx context.Context, userID int, days int) (*models.UserAIStats, error) {
	stats := &models.UserAIStats{}
	query := `
		SELECT 
			COUNT(*) as total_generations,
			COUNT(CASE WHEN success = true THEN 1 END) as successful_generations,
			COALESCE(SUM((token_usage->>'total_tokens')::integer), 0) as total_tokens,
			COALESCE(AVG(processing_time_ms), 0) as avg_processing_time,
			COUNT(DISTINCT provider) as providers_used,
			COUNT(DISTINCT project_id) as projects_used
		FROM ai_task_generation_history
		WHERE user_id = $1 
		  AND created_at >= CURRENT_DATE - INTERVAL '%d days'`
	
	err := r.db.GetContext(ctx, stats, query, userID, days)
	if err != nil {
		return nil, err
	}
	
	stats.UserID = userID
	return stats, nil
}

// GetProjectStats 获取项目AI使用统计
func (r *aiGenerationHistoryRepository) GetProjectStats(ctx context.Context, projectID int, days int) (*models.ProjectAIStats, error) {
	stats := &models.ProjectAIStats{}
	query := `
		SELECT 
			COUNT(*) as total_generations,
			COUNT(CASE WHEN success = true THEN 1 END) as successful_generations,
			COALESCE(SUM((token_usage->>'total_tokens')::integer), 0) as total_tokens,
			COALESCE(AVG(processing_time_ms), 0) as avg_processing_time,
			COUNT(DISTINCT provider) as providers_used,
			COUNT(DISTINCT user_id) as users_count
		FROM ai_task_generation_history
		WHERE project_id = $1 
		  AND created_at >= CURRENT_DATE - INTERVAL '%d days'`
	
	err := r.db.GetContext(ctx, stats, query, projectID, days)
	if err != nil {
		return nil, err
	}
	
	stats.ProjectID = projectID
	return stats, nil
}

// GetProviderUsage 获取提供商使用统计
func (r *aiGenerationHistoryRepository) GetProviderUsage(ctx context.Context, userID int, provider models.AIProvider, days int) (*models.ProviderUsageStats, error) {
	stats := &models.ProviderUsageStats{}
	query := `
		SELECT 
			COUNT(*) as request_count,
			COUNT(CASE WHEN success = true THEN 1 END) as success_count,
			COALESCE(SUM((token_usage->>'total_tokens')::integer), 0) as total_tokens,
			COALESCE(AVG(processing_time_ms), 0) as avg_response_time,
			COALESCE(MAX(created_at), CURRENT_TIMESTAMP) as last_used_at
		FROM ai_task_generation_history
		WHERE user_id = $1 
		  AND provider = $2
		  AND created_at >= CURRENT_DATE - INTERVAL '%d days'`
	
	err := r.db.GetContext(ctx, stats, query, userID, provider, days)
	if err != nil {
		return nil, err
	}
	
	stats.Provider = provider
	return stats, nil
}

// RecordUsage 记录AI使用情况
func (r *aiGenerationHistoryRepository) RecordUsage(ctx context.Context, userID int, projectID *int, provider models.AIProvider, tokenCount int, cost float64, success bool) error {
	query := `SELECT record_ai_usage($1, $2, $3, $4, $5, $6, $7)`
	
	_, err := r.db.ExecContext(ctx, query, userID, projectID, provider, "generate", tokenCount, cost, success)
	return err
}

// GetCostSummary 获取成本摘要
func (r *aiGenerationHistoryRepository) GetCostSummary(ctx context.Context, userID int, projectID *int, period string) (*models.CostSummary, error) {
	summary := &models.CostSummary{}
	
	var projectFilter string
	var args []interface{}
	args = append(args, userID)
	
	if projectID != nil {
		projectFilter = "AND project_id = $2"
		args = append(args, *projectID)
	}
	
	var dateFilter string
	switch period {
	case "daily":
		dateFilter = "AND usage_date = CURRENT_DATE"
	case "weekly":
		dateFilter = "AND usage_date >= CURRENT_DATE - INTERVAL '7 days'"
	case "monthly":
		dateFilter = "AND usage_date >= CURRENT_DATE - INTERVAL '1 month'"
	default:
		dateFilter = "AND usage_date >= CURRENT_DATE - INTERVAL '1 month'"
	}
	
	query := `
		SELECT 
			COALESCE(SUM(cost_amount), 0) as total_cost,
			COALESCE(SUM(token_count), 0) as total_tokens,
			COALESCE(SUM(request_count), 0) as total_requests,
			COALESCE(SUM(success_count), 0) as successful_requests
		FROM ai_usage_stats
		WHERE user_id = $1 ` + projectFilter + ` ` + dateFilter
	
	err := r.db.GetContext(ctx, summary, query, args...)
	if err != nil {
		return nil, err
	}
	
	summary.Period = period
	return summary, nil
}

// CheckBudgetLimit 检查预算限制
func (r *aiGenerationHistoryRepository) CheckBudgetLimit(ctx context.Context, userID int, projectID *int, provider *models.AIProvider) (*models.BudgetStatus, error) {
	status := &models.BudgetStatus{}
	
	providerParam := ""
	if provider != nil {
		providerParam = string(*provider)
	}
	
	query := `SELECT * FROM check_budget_limit($1, $2, $3, 'monthly')`
	
	err := r.db.GetContext(ctx, status, query, userID, projectID, providerParam)
	if err != nil {
		return nil, err
	}
	
	return status, nil
}

// GetRecentGenerations 获取最近的生成记录
func (r *aiGenerationHistoryRepository) GetRecentGenerations(ctx context.Context, userID int, limit int) ([]*models.AITaskGenerationHistory, error) {
	var histories []*models.AITaskGenerationHistory
	
	query := `
		SELECT id, user_id, project_id, provider, input_text, generated_tasks,
			   token_usage, quality_metrics, processing_time_ms, success, error_message,
			   imported_task_ids, created_at, updated_at
		FROM ai_task_generation_history
		WHERE user_id = $1 AND success = true
		ORDER BY created_at DESC
		LIMIT $2`
	
	err := r.db.SelectContext(ctx, &histories, query, userID, limit)
	if err != nil {
		return nil, err
	}
	
	return histories, nil
}

// GetPopularTemplates 获取流行的模板使用情况
func (r *aiGenerationHistoryRepository) GetPopularTemplates(ctx context.Context, userID int, limit int) ([]*models.AITemplateUsage, error) {
	var templates []*models.AITemplateUsage
	
	query := `
		SELECT 
			input_text as template_text,
			COUNT(*) as usage_count,
			provider,
			AVG((quality_metrics->>'overall_score')::numeric) as avg_quality,
			MAX(created_at) as last_used_at
		FROM ai_task_generation_history
		WHERE user_id = $1 AND success = true
		GROUP BY input_text, provider
		HAVING COUNT(*) > 1
		ORDER BY usage_count DESC, avg_quality DESC
		LIMIT $2`
	
	err := r.db.SelectContext(ctx, &templates, query, userID, limit)
	if err != nil {
		return nil, err
	}
	
	return templates, nil
}