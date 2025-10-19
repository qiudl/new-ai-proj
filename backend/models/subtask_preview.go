package models

// SubtaskPreview AI生成的子任务预览
type SubtaskPreview struct {
	TempID         string   `json:"temp_id"`
	Title          string   `json:"title"`
	Description    string   `json:"description"`
	EstimatedHours float64  `json:"estimated_hours"`
	Priority       string   `json:"priority"` // high, medium, low
	Tags           []string `json:"tags"`
}

// AIGenerateRequest AI生成子任务请求
type AIGenerateRequest struct {
	Model        string            `json:"model" binding:"required"`
	CustomPrompt *string           `json:"custom_prompt"` // 用户自定义提示词（可选）
	Context      AIGenerateContext `json:"context"`
}

// AIGenerateContext AI生成上下文
type AIGenerateContext struct {
	IncludeDescription bool `json:"include_description"`
	IncludeSiblings    bool `json:"include_siblings"`
	MaxSubtasks        int  `json:"max_subtasks"`
}

// AIGenerateResponse AI生成子任务响应
type AIGenerateResponse struct {
	ParentTask Task               `json:"parent_task"`
	ModelUsed  string             `json:"model_used"`
	Subtasks   []SubtaskPreview   `json:"subtasks"`
	Statistics AIGenerateStats    `json:"statistics"`
}

// AIGenerateStats 统计信息
type AIGenerateStats struct {
	TotalCount           int            `json:"total_count"`
	TotalHours           float64        `json:"total_hours"`
	PriorityDistribution map[string]int `json:"priority_distribution"`
}

// BatchCreateSubtasksRequest 批量创建子任务请求
type BatchCreateSubtasksRequest struct {
	ParentID     int64 `json:"parent_id" binding:"required"`
	SkipTemplate *bool `json:"skip_template"` // Skip auto-template generation
	Subtasks     []struct {
		Title          string   `json:"title" binding:"required"`
		Description    string   `json:"description"`
		EstimatedHours float64  `json:"estimated_hours"`
		Priority       string   `json:"priority"`
		Tags           []string `json:"tags"`
	} `json:"subtasks" binding:"required,min=1"`
}

// BatchCreateSubtasksResponse 批量创建子任务响应
type BatchCreateSubtasksResponse struct {
	Success      bool        `json:"success"`
	CreatedCount int         `json:"created_count"`
	Tasks        []TaskBrief `json:"tasks"`
	Message      string      `json:"message,omitempty"`
}
