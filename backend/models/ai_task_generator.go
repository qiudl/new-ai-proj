package models

import (
	"encoding/json"
	"errors"
	"time"
)

// AITaskGenerationRequest AI任务生成请求
type AITaskGenerationRequest struct {
	Provider     AIProvider            `json:"provider" binding:"required" validate:"required"`
	InputText    string                `json:"input_text" binding:"required" validate:"required,min=10,max=10000"`
	ParseMode    string                `json:"parse_mode" validate:"oneof=structured free_text mixed"`
	ProjectID    *int                  `json:"project_id"`
	ParentTaskID *int                  `json:"parent_task_id"`
	Options      TaskGenerationOptions `json:"options"`
}

// TaskGenerationOptions 任务生成选项
type TaskGenerationOptions struct {
	MaxTasks                 int  `json:"max_tasks" validate:"min=1,max=50"`
	EnableDuplicateCheck     bool `json:"enable_duplicate_check"`
	EnableDependencyAnalysis bool `json:"enable_dependency_analysis"`
	EnablePriorityAssignment bool `json:"enable_priority_assignment"`
	EnableTimeEstimation     bool `json:"enable_time_estimation"`
	EnableSkillTagging       bool `json:"enable_skill_tagging"`
}

// GeneratedTask AI生成的任务
type GeneratedTask struct {
	Title          string   `json:"title"`
	Description    string   `json:"description"`
	Priority       string   `json:"priority" validate:"oneof=low medium high"`
	EstimatedHours float64  `json:"estimated_hours" validate:"min=0,max=1000"`
	Tags           []string `json:"tags"`
	Dependencies   []int    `json:"dependencies"`
	Confidence     float64  `json:"confidence" validate:"min=0,max=1"`
	AIGeneratedID  string   `json:"ai_generated_id"`
}

// AITaskGenerationResponse AI任务生成响应
type AITaskGenerationResponse struct {
	Success        bool            `json:"success"`
	Message        string          `json:"message"`
	GeneratedTasks []GeneratedTask `json:"generated_tasks"`
	TotalTasks     int             `json:"total_tasks"`
	ProcessingTime int             `json:"processing_time_ms"`
	TokenUsage     *TokenUsage     `json:"token_usage,omitempty"`
	QualityMetrics *QualityMetrics `json:"quality_metrics,omitempty"`
	Suggestions    []string        `json:"suggestions,omitempty"`
	ModelInfo      *AIModelInfo    `json:"model_info,omitempty"`
}

// TokenUsage Token使用统计
type TokenUsage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
	TotalTokens      int `json:"total_tokens"`
}

// QualityMetrics 质量指标
type QualityMetrics struct {
	OverallScore        float64 `json:"overall_score" validate:"min=0,max=1"`
	CompletenessScore   float64 `json:"completeness_score" validate:"min=0,max=1"`
	ClarityScore        float64 `json:"clarity_score" validate:"min=0,max=1"`
	FeasibilityScore    float64 `json:"feasibility_score" validate:"min=0,max=1"`
	DuplicateCount      int     `json:"duplicate_count"`
	MissingDependencies int     `json:"missing_dependencies"`
}

// AITaskValidationRequest AI任务验证请求
type AITaskValidationRequest struct {
	Provider       AIProvider      `json:"provider" binding:"required"`
	GeneratedTasks []GeneratedTask `json:"generated_tasks" binding:"required"`
	ProjectContext *ProjectContext `json:"project_context,omitempty"`
}

// ProjectContext 项目上下文
type ProjectContext struct {
	ProjectID     int           `json:"project_id"`
	ProjectName   string        `json:"project_name"`
	ProjectDesc   string        `json:"project_description"`
	ExistingTasks []TaskSummary `json:"existing_tasks,omitempty"`
}

// TaskSummary 任务摘要
type TaskSummary struct {
	ID          int      `json:"id"`
	Title       string   `json:"title"`
	Description string   `json:"description"`
	Priority    string   `json:"priority"`
	Status      string   `json:"status"`
	Tags        []string `json:"tags"`
}

// AITaskOptimizationRequest AI任务优化请求
type AITaskOptimizationRequest struct {
	Provider            AIProvider          `json:"provider" binding:"required"`
	GeneratedTasks      []GeneratedTask     `json:"generated_tasks" binding:"required"`
	OptimizationOptions OptimizationOptions `json:"optimization_options"`
}

// OptimizationOptions 优化选项
type OptimizationOptions struct {
	DeduplicateTasks     bool `json:"deduplicate_tasks"`
	OptimizeDependencies bool `json:"optimize_dependencies"`
	BalancePriorities    bool `json:"balance_priorities"`
	RefineEstimates      bool `json:"refine_estimates"`
	EnhanceTags          bool `json:"enhance_tags"`
}

// AITaskGenerationHistory AI任务生成历史
type AITaskGenerationHistory struct {
	ID              int             `json:"id" db:"id"`
	UserID          int             `json:"user_id" db:"user_id"`
	ProjectID       *int            `json:"project_id" db:"project_id"`
	Provider        AIProvider      `json:"provider" db:"provider"`
	InputText       string          `json:"input_text" db:"input_text"`
	GeneratedTasks  json.RawMessage `json:"generated_tasks" db:"generated_tasks"`
	TokenUsage      json.RawMessage `json:"token_usage" db:"token_usage"`
	QualityMetrics  json.RawMessage `json:"quality_metrics" db:"quality_metrics"`
	ProcessingTime  int             `json:"processing_time_ms" db:"processing_time_ms"`
	Success         bool            `json:"success" db:"success"`
	ErrorMessage    string          `json:"error_message" db:"error_message"`
	CreatedAt       time.Time       `json:"created_at" db:"created_at"`
	ImportedTaskIDs json.RawMessage `json:"imported_task_ids" db:"imported_task_ids"`
}

// AIBulkImportRequest AI智能批量导入请求
type AIBulkImportRequest struct {
	ProjectID         int                   `json:"project_id"`
	ParentTaskID      *int                  `json:"parent_task_id"`
	Provider          AIProvider            `json:"provider" binding:"required"`
	InputText         string                `json:"input_text" binding:"required"`
	GenerationOptions TaskGenerationOptions `json:"generation_options"`
	ImportOptions     ImportOptions         `json:"import_options"`
}

// ImportOptions 导入选项
type ImportOptions struct {
	AutoImport      bool `json:"auto_import"`
	ValidateFirst   bool `json:"validate_first"`
	CreateInBatches bool `json:"create_in_batches"`
	BatchSize       int  `json:"batch_size" validate:"min=1,max=20"`
}

// AIBulkImportResponse AI智能批量导入响应
type AIBulkImportResponse struct {
	Success          bool                      `json:"success"`
	Message          string                    `json:"message"`
	GenerationResult *AITaskGenerationResponse `json:"generation_result,omitempty"`
	ImportedTasks    []TaskResponse            `json:"imported_tasks,omitempty"`
	FailedTasks      []GeneratedTask           `json:"failed_tasks,omitempty"`
	TotalGenerated   int                       `json:"total_generated"`
	TotalImported    int                       `json:"total_imported"`
	TotalFailed      int                       `json:"total_failed"`
	ProcessingTime   int                       `json:"processing_time_ms"`
	HistoryID        int                       `json:"history_id"`
}

// AIModelStatus AI模型状态
type AIModelStatus struct {
	Provider     AIProvider       `json:"provider"`
	Available    bool             `json:"available"`
	LastTested   *time.Time       `json:"last_tested,omitempty"`
	ResponseTime int              `json:"response_time_ms"`
	ErrorCount   int              `json:"error_count"`
	Usage        *ModelUsageStats `json:"usage,omitempty"`
}

// ModelUsageStats 模型使用统计
type ModelUsageStats struct {
	TotalRequests   int     `json:"total_requests"`
	SuccessRequests int     `json:"success_requests"`
	SuccessRate     float64 `json:"success_rate"`
	AvgResponseTime int     `json:"avg_response_time_ms"`
	TotalTokens     int     `json:"total_tokens"`
	TotalCost       float64 `json:"total_cost"`
}

// Validate 验证AI任务生成请求
func (req *AITaskGenerationRequest) Validate() error {
	if req.InputText == "" {
		return errors.New("输入文本不能为空")
	}

	if len(req.InputText) < 10 {
		return errors.New("输入文本至少需要10个字符")
	}

	if len(req.InputText) > 10000 {
		return errors.New("输入文本不能超过10000个字符")
	}

	if req.ParseMode == "" {
		req.ParseMode = "structured"
	}

	if req.Options.MaxTasks == 0 {
		req.Options.MaxTasks = 10
	}

	if req.Options.MaxTasks > 50 {
		return errors.New("最多只能生成50个任务")
	}

	return nil
}

// ToAITestRequest 转换为AI测试请求（复用现有AI配置测试逻辑）
func (req *AITaskGenerationRequest) ToAITestRequest() *AITestRequest {
	return &AITestRequest{
		Provider: req.Provider,
		TestText: req.InputText,
	}
}

// UserAIStats 用户AI使用统计
type UserAIStats struct {
	UserID                int     `json:"user_id" db:"user_id"`
	TotalGenerations      int     `json:"total_generations" db:"total_generations"`
	SuccessfulGenerations int     `json:"successful_generations" db:"successful_generations"`
	TotalTokens           int     `json:"total_tokens" db:"total_tokens"`
	AvgProcessingTime     float64 `json:"avg_processing_time" db:"avg_processing_time"`
	ProvidersUsed         int     `json:"providers_used" db:"providers_used"`
	ProjectsUsed          int     `json:"projects_used" db:"projects_used"`
}

// ProjectAIStats 项目AI使用统计
type ProjectAIStats struct {
	ProjectID             int     `json:"project_id" db:"project_id"`
	TotalGenerations      int     `json:"total_generations" db:"total_generations"`
	SuccessfulGenerations int     `json:"successful_generations" db:"successful_generations"`
	TotalTokens           int     `json:"total_tokens" db:"total_tokens"`
	AvgProcessingTime     float64 `json:"avg_processing_time" db:"avg_processing_time"`
	ProvidersUsed         int     `json:"providers_used" db:"providers_used"`
	UsersCount            int     `json:"users_count" db:"users_count"`
}

// ProviderUsageStats 提供商使用统计
type ProviderUsageStats struct {
	Provider        AIProvider `json:"provider" db:"provider"`
	RequestCount    int        `json:"request_count" db:"request_count"`
	SuccessCount    int        `json:"success_count" db:"success_count"`
	TotalTokens     int        `json:"total_tokens" db:"total_tokens"`
	AvgResponseTime float64    `json:"avg_response_time" db:"avg_response_time"`
	LastUsedAt      time.Time  `json:"last_used_at" db:"last_used_at"`
}

// CostSummary 成本摘要
type CostSummary struct {
	Period             string  `json:"period"`
	TotalCost          float64 `json:"total_cost" db:"total_cost"`
	TotalTokens        int     `json:"total_tokens" db:"total_tokens"`
	TotalRequests      int     `json:"total_requests" db:"total_requests"`
	SuccessfulRequests int     `json:"successful_requests" db:"successful_requests"`
}

// BudgetStatus 预算状态
type BudgetStatus struct {
	Exceeded        bool    `json:"exceeded" db:"exceeded"`
	CurrentUsage    float64 `json:"current_usage" db:"current_usage"`
	BudgetAmount    float64 `json:"budget_amount" db:"budget_amount"`
	UsagePercentage float64 `json:"usage_percentage" db:"usage_percentage"`
}

// AITemplateUsage AI模板使用情况
type AITemplateUsage struct {
	TemplateText string     `json:"template_text" db:"template_text"`
	UsageCount   int        `json:"usage_count" db:"usage_count"`
	Provider     AIProvider `json:"provider" db:"provider"`
	AvgQuality   float64    `json:"avg_quality" db:"avg_quality"`
	LastUsedAt   time.Time  `json:"last_used_at" db:"last_used_at"`
}

// AIGenerationHistoryResponse AI生成历史响应
type AIGenerationHistoryResponse struct {
	ID             int         `json:"id"`
	ProjectID      *int        `json:"project_id"`
	ProjectName    string      `json:"project_name,omitempty"`
	Provider       AIProvider  `json:"provider"`
	InputText      string      `json:"input_text"`
	TaskCount      int         `json:"task_count"`
	TokenUsage     *TokenUsage `json:"token_usage,omitempty"`
	QualityScore   float64     `json:"quality_score"`
	ProcessingTime int         `json:"processing_time_ms"`
	Success        bool        `json:"success"`
	ImportedCount  int         `json:"imported_count"`
	CreatedAt      time.Time   `json:"created_at"`
	CanReuse       bool        `json:"can_reuse"`
}

// AIUsageStatsRequest AI使用统计请求
type AIUsageStatsRequest struct {
	ProjectID *int        `json:"project_id"`
	Days      int         `json:"days" validate:"min=1,max=365"`
	Provider  *AIProvider `json:"provider"`
	Period    string      `json:"period" validate:"omitempty,oneof=daily weekly monthly yearly"`
}

// AIUsageStatsResponse AI使用统计响应
type AIUsageStatsResponse struct {
	UserStats     *UserAIStats                   `json:"user_stats,omitempty"`
	ProjectStats  *ProjectAIStats                `json:"project_stats,omitempty"`
	CostSummary   *CostSummary                   `json:"cost_summary,omitempty"`
	BudgetStatus  *BudgetStatus                  `json:"budget_status,omitempty"`
	ProviderStats []ProviderUsageStats           `json:"provider_stats,omitempty"`
	RecentHistory []*AIGenerationHistoryResponse `json:"recent_history,omitempty"`
}

// BudgetLimitRequest 预算限制设置请求
type BudgetLimitRequest struct {
	ProjectID      *int        `json:"project_id"`
	Provider       *AIProvider `json:"provider"`
	BudgetType     string      `json:"budget_type" validate:"oneof=daily weekly monthly yearly"`
	BudgetAmount   float64     `json:"budget_amount" validate:"min=0"`
	AlertThreshold float64     `json:"alert_threshold" validate:"min=0,max=1"`
	IsEnabled      bool        `json:"is_enabled"`
}

// BudgetAlert 预算警告
type BudgetAlert struct {
	ID           int        `json:"id" db:"id"`
	UserID       int        `json:"user_id" db:"user_id"`
	ProjectID    *int       `json:"project_id" db:"project_id"`
	Provider     AIProvider `json:"provider" db:"provider"`
	AlertType    string     `json:"alert_type" db:"alert_type"`
	Message      string     `json:"message" db:"message"`
	Threshold    float64    `json:"threshold" db:"threshold"`
	CurrentUsage float64    `json:"current_usage" db:"current_usage"`
	BudgetLimit  float64    `json:"budget_limit" db:"budget_limit"`
	IsRead       bool       `json:"is_read" db:"is_read"`
	CreatedAt    time.Time  `json:"created_at" db:"created_at"`
}

// CostTrackingRequest 成本跟踪请求
type CostTrackingRequest struct {
	Provider      AIProvider `json:"provider" binding:"required"`
	TokenCount    int        `json:"token_count"`
	OperationType string     `json:"operation_type"`
	ProjectID     *int       `json:"project_id"`
	Success       bool       `json:"success"`
}

// AITaskTemplate AI任务模板
type AITaskTemplate struct {
	ID           int             `json:"id" db:"id"`
	Name         string          `json:"name" db:"name"`
	Description  string          `json:"description" db:"description"`
	Category     string          `json:"category" db:"category"`
	TemplateText string          `json:"template_text" db:"template_text"`
	TaskPattern  json.RawMessage `json:"task_pattern" db:"task_pattern"`
	Tags         []string        `json:"tags" db:"tags"`
	UsageCount   int             `json:"usage_count" db:"usage_count"`
	CreatedBy    int             `json:"created_by" db:"created_by"`
	IsPublic     bool            `json:"is_public" db:"is_public"`
	CreatedAt    time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time       `json:"updated_at" db:"updated_at"`
}

// AITaskTemplateRequest 创建/更新模板请求
type AITaskTemplateRequest struct {
	Name         string                 `json:"name" binding:"required" validate:"required,min=1,max=100"`
	Description  string                 `json:"description" validate:"max=500"`
	Category     string                 `json:"category" binding:"required" validate:"required,oneof=development design testing documentation marketing analysis"`
	TemplateText string                 `json:"template_text" binding:"required" validate:"required,min=10,max=10000"`
	TaskPattern  map[string]interface{} `json:"task_pattern"`
	Tags         []string               `json:"tags" validate:"max=10"`
	IsPublic     bool                   `json:"is_public"`
}

// AITaskTemplateResponse 模板响应
type AITaskTemplateResponse struct {
	ID           int                    `json:"id"`
	Name         string                 `json:"name"`
	Description  string                 `json:"description"`
	Category     string                 `json:"category"`
	TemplateText string                 `json:"template_text"`
	TaskPattern  map[string]interface{} `json:"task_pattern,omitempty"`
	Tags         []string               `json:"tags"`
	UsageCount   int                    `json:"usage_count"`
	CreatedBy    int                    `json:"created_by"`
	CreatorName  string                 `json:"creator_name,omitempty"`
	IsPublic     bool                   `json:"is_public"`
	CanEdit      bool                   `json:"can_edit"`
	CreatedAt    time.Time              `json:"created_at"`
	UpdatedAt    time.Time              `json:"updated_at"`
}

// TemplateGenerationRequest 基于模板生成任务请求
type TemplateGenerationRequest struct {
	TemplateID   int                    `json:"template_id" binding:"required"`
	Provider     AIProvider             `json:"provider" binding:"required"`
	Variables    map[string]interface{} `json:"variables"`
	ProjectID    *int                   `json:"project_id"`
	ParentTaskID *int                   `json:"parent_task_id"`
	Options      TaskGenerationOptions  `json:"options"`
}

// TemplateSearchRequest 模板搜索请求
type TemplateSearchRequest struct {
	Query     string   `json:"query"`
	Category  string   `json:"category" validate:"omitempty,oneof=development design testing documentation marketing analysis"`
	Tags      []string `json:"tags"`
	IsPublic  *bool    `json:"is_public"`
	CreatedBy *int     `json:"created_by"`
	Limit     int      `json:"limit" validate:"min=1,max=50"`
	Offset    int      `json:"offset" validate:"min=0"`
}

// BatchOptimizationRequest 批量任务优化请求
type BatchOptimizationRequest struct {
	Provider         AIProvider               `json:"provider" binding:"required"`
	TaskGroups       []TaskGroup              `json:"task_groups" binding:"required" validate:"required,min=1,max=5"`
	GlobalOptions    BatchOptimizationOptions `json:"global_options"`
	OptimizationMode string                   `json:"optimization_mode" validate:"oneof=balanced performance quality cost"`
}

// TaskGroup 任务组
type TaskGroup struct {
	GroupName      string              `json:"group_name" binding:"required"`
	Tasks          []GeneratedTask     `json:"tasks" binding:"required" validate:"required,min=1,max=20"`
	GroupOptions   OptimizationOptions `json:"group_options"`
	ProjectContext *ProjectContext     `json:"project_context,omitempty"`
}

// BatchOptimizationOptions 批量优化选项
type BatchOptimizationOptions struct {
	CrossGroupOptimization bool `json:"cross_group_optimization"`
	MergeSimilarTasks      bool `json:"merge_similar_tasks"`
	OptimizeWorkflow       bool `json:"optimize_workflow"`
	BalanceWorkload        bool `json:"balance_workload"`
	MinimizeHandoffs       bool `json:"minimize_handoffs"`
	MaxProcessingTime      int  `json:"max_processing_time_seconds" validate:"min=30,max=300"`
	ParallelProcessing     bool `json:"parallel_processing"`
}

// BatchOptimizationResponse 批量优化响应
type BatchOptimizationResponse struct {
	Success           bool                   `json:"success"`
	Message           string                 `json:"message"`
	OptimizedGroups   []OptimizedTaskGroup   `json:"optimized_groups"`
	GlobalSuggestions []string               `json:"global_suggestions"`
	ProcessingTime    int                    `json:"processing_time_ms"`
	OptimizationStats BatchOptimizationStats `json:"optimization_stats"`
	TokenUsage        *TokenUsage            `json:"token_usage,omitempty"`
	QualityMetrics    *BatchQualityMetrics   `json:"quality_metrics,omitempty"`
}

// OptimizedTaskGroup 优化后的任务组
type OptimizedTaskGroup struct {
	GroupName           string          `json:"group_name"`
	OriginalTaskCount   int             `json:"original_task_count"`
	OptimizedTasks      []GeneratedTask `json:"optimized_tasks"`
	GroupSuggestions    []string        `json:"group_suggestions"`
	OptimizationApplied []string        `json:"optimization_applied"`
	EstimatedSavings    float64         `json:"estimated_savings_hours"`
}

// BatchOptimizationStats 批量优化统计
type BatchOptimizationStats struct {
	TotalTasksProcessed int     `json:"total_tasks_processed"`
	TotalTasksOptimized int     `json:"total_tasks_optimized"`
	TasksMerged         int     `json:"tasks_merged"`
	TasksReordered      int     `json:"tasks_reordered"`
	EstimatedTimeSaved  float64 `json:"estimated_time_saved_hours"`
	OptimizationRatio   float64 `json:"optimization_ratio"`
}

// BatchQualityMetrics 批量质量指标
type BatchQualityMetrics struct {
	OverallScore         float64 `json:"overall_score"`
	ConsistencyScore     float64 `json:"consistency_score"`
	WorkflowEfficiency   float64 `json:"workflow_efficiency"`
	ResourceOptimization float64 `json:"resource_optimization"`
	DependencyQuality    float64 `json:"dependency_quality"`
}

// TaskOptimizationAnalysis 任务优化分析
type TaskOptimizationAnalysis struct {
	TaskID             string   `json:"task_id"`
	OriginalTitle      string   `json:"original_title"`
	OptimizationStatus string   `json:"optimization_status"`
	Changes            []string `json:"changes"`
	Confidence         float64  `json:"confidence"`
	Impact             string   `json:"impact"`
}
