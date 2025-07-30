// 添加到 models 包中的新结构体定义

// AICompletionRequest AI完成请求
type AICompletionRequest struct {
	Provider    AIProvider `json:"provider" binding:"required" validate:"required,oneof=openai claude deepseek"`
	Prompt      string     `json:"prompt" binding:"required" validate:"required"`
	Model       string     `json:"model,omitempty"`       // 可选，覆盖默认模型
	Temperature *float64   `json:"temperature,omitempty"` // 可选，覆盖默认温度
	MaxTokens   *int       `json:"max_tokens,omitempty"`  // 可选，覆盖默认最大token
	SystemPrompt string    `json:"system_prompt,omitempty"` // 可选，系统提示词
	Context     map[string]interface{} `json:"context,omitempty"` // 可选，上下文信息
}

// AICompletionResponse AI完成响应
type AICompletionResponse struct {
	Success      bool                  `json:"success"`
	Content      string                `json:"content,omitempty"`      // AI生成的内容
	Error        string                `json:"error,omitempty"`        // 错误信息（如果有）
	Model        string                `json:"model,omitempty"`        // 使用的模型
	Provider     string                `json:"provider,omitempty"`     // 使用的提供商
	Usage        *AIUsageStatistics    `json:"usage,omitempty"`        // Token使用统计
	ResponseTime int                   `json:"response_time,omitempty"` // 响应时间（毫秒）
	Metadata     map[string]interface{} `json:"metadata,omitempty"`     // 额外的元数据
}

// AIGenerationRequest 通用AI生成请求（用于任务生成等场景）
type AIGenerationRequest struct {
	Provider     AIProvider             `json:"provider" binding:"required"`
	Purpose      string                 `json:"purpose" binding:"required"` // 生成目的：task_generation, optimization, validation
	InputData    interface{}            `json:"input_data" binding:"required"`
	Options      map[string]interface{} `json:"options,omitempty"`
	SystemPrompt string                 `json:"system_prompt,omitempty"`
	OutputFormat string                 `json:"output_format,omitempty"` // json, text, markdown
}

// AIGenerationResponse 通用AI生成响应
type AIGenerationResponse struct {
	Success      bool                   `json:"success"`
	Purpose      string                 `json:"purpose"`
	OutputData   interface{}            `json:"output_data,omitempty"`
	Error        string                 `json:"error,omitempty"`
	Usage        *AIUsageStatistics     `json:"usage,omitempty"`
	ResponseTime int                    `json:"response_time,omitempty"`
	Metadata     map[string]interface{} `json:"metadata,omitempty"`
}
