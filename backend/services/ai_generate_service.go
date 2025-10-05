package services

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"regexp"
	"strings"

	"ai-project-backend/models"
)

// AIGenerateService AI生成服务
type AIGenerateService struct {
	db              *sql.DB
	anthropicClient *AnthropicClient
}

// NewAIGenerateService 创建AI生成服务
func NewAIGenerateService(db *sql.DB) *AIGenerateService {
	return &AIGenerateService{
		db:              db,
		anthropicClient: NewAnthropicClient(),
	}
}

// GenerateSubtasksParams 生成子任务参数
type GenerateSubtasksParams struct {
	ParentTask         *models.Task
	Model              string
	IncludeDescription bool
	IncludeSiblings    bool
	MaxSubtasks        int
}

// getAIConfig 从数据库获取AI配置
func (s *AIGenerateService) getAIConfig(ctx context.Context, modelKey string) (*models.AIConfig, error) {
	query := `
		SELECT id, provider, model, api_key_encrypted, base_url, enabled,
		       max_tokens, temperature, created_at, updated_at
		FROM ai_configs
		WHERE provider = $1 AND enabled = true
		LIMIT 1
	`

	var config models.AIConfig
	var apiKeyEncrypted string
	err := s.db.QueryRowContext(ctx, query, modelKey).Scan(
		&config.ID,
		&config.Provider,
		&config.Model,
		&apiKeyEncrypted,
		&config.BaseURL,
		&config.Enabled,
		&config.MaxTokens,
		&config.Temperature,
		&config.CreatedAt,
		&config.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("AI配置不存在或未启用: %s", modelKey)
	}
	if err != nil {
		return nil, fmt.Errorf("查询AI配置失败: %w", err)
	}

	// 将加密的API密钥赋值(实际使用时需要解密,这里暂时直接使用)
	config.APIKeyEncrypted = apiKeyEncrypted

	return &config, nil
}

// GenerateSubtasks 生成子任务
func (s *AIGenerateService) GenerateSubtasks(ctx context.Context, params *GenerateSubtasksParams) (*models.AIGenerateResponse, error) {
	// 设置默认值
	if params.MaxSubtasks == 0 {
		params.MaxSubtasks = 10
	}

	// 1. 从数据库获取AI配置
	aiConfig, err := s.getAIConfig(ctx, params.Model)
	if err != nil {
		return nil, err
	}

	// 2. 构建Prompt
	prompt := s.buildPrompt(params)

	// 3. 调用AI模型（暂时只支持Anthropic兼容的API）
	response, err := s.anthropicClient.GenerateWithConfig(ctx, prompt, aiConfig)
	if err != nil {
		return nil, fmt.Errorf("AI调用失败: %w", err)
	}

	// 4. 解析AI响应
	subtasks, err := s.parseAIResponse(response, params.MaxSubtasks)
	if err != nil {
		return nil, fmt.Errorf("解析AI响应失败: %w", err)
	}

	// 5. 计算统计信息
	statistics := s.calculateStatistics(subtasks)

	return &models.AIGenerateResponse{
		ParentTask: *params.ParentTask,
		ModelUsed:  params.Model,
		Subtasks:   subtasks,
		Statistics: statistics,
	}, nil
}

// buildPrompt 构建AI提示词
func (s *AIGenerateService) buildPrompt(params *GenerateSubtasksParams) string {
	prompt := fmt.Sprintf(`你是一个专业的项目管理和任务分解专家。请根据以下父任务信息，生成合理的子任务列表。

父任务信息:
标题: %s
`, params.ParentTask.Title)

	if params.IncludeDescription && params.ParentTask.Description != nil && *params.ParentTask.Description != "" {
		prompt += fmt.Sprintf("描述: %s\n", *params.ParentTask.Description)
	}

	prompt += `
请生成 3-10 个子任务，每个子任务包含以下信息：
1. title: 子任务标题（简洁明确）
2. description: 子任务描述（详细说明要做什么）
3. estimated_hours: 预估工时（单位：小时，范围 0.5-20）
4. priority: 优先级（high/medium/low）
5. tags: 标签列表（如：["前端", "UI"]）

要求:
- 子任务应该符合SMART原则（具体、可衡量、可实现、相关性、有时限）
- 子任务之间应该有逻辑顺序
- 优先级应该根据重要性和紧急性合理分配
- 预估工时要符合实际情况

请以JSON格式返回，格式如下：
{
  "subtasks": [
    {
      "title": "...",
      "description": "...",
      "estimated_hours": 2,
      "priority": "high",
      "tags": ["..."]
    }
  ]
}

请确保返回的是有效的JSON格式，不要包含其他说明文字。`

	return prompt
}

// parseAIResponse 解析AI响应
func (s *AIGenerateService) parseAIResponse(response string, maxSubtasks int) ([]models.SubtaskPreview, error) {
	// 提取JSON部分
	jsonStr := s.extractJSON(response)

	var result struct {
		Subtasks []models.SubtaskPreview `json:"subtasks"`
	}

	if err := json.Unmarshal([]byte(jsonStr), &result); err != nil {
		return nil, fmt.Errorf("JSON解析失败: %w\n原始响应: %s", err, response)
	}

	// 限制数量
	if len(result.Subtasks) > maxSubtasks {
		result.Subtasks = result.Subtasks[:maxSubtasks]
	}

	// 生成临时ID
	for i := range result.Subtasks {
		result.Subtasks[i].TempID = fmt.Sprintf("temp_%d", i+1)

		// 确保必填字段有默认值
		if result.Subtasks[i].Priority == "" {
			result.Subtasks[i].Priority = "medium"
		}
		if result.Subtasks[i].EstimatedHours == 0 {
			result.Subtasks[i].EstimatedHours = 1
		}
	}

	return result.Subtasks, nil
}

// extractJSON 从响应中提取JSON
func (s *AIGenerateService) extractJSON(response string) string {
	// 移除markdown代码块标记
	response = strings.TrimPrefix(response, "```json")
	response = strings.TrimPrefix(response, "```")
	response = strings.TrimSuffix(response, "```")
	response = strings.TrimSpace(response)

	// 尝试提取JSON对象
	re := regexp.MustCompile(`\{[\s\S]*\}`)
	matches := re.FindString(response)
	if matches != "" {
		return matches
	}

	return response
}

// calculateStatistics 计算统计信息
func (s *AIGenerateService) calculateStatistics(subtasks []models.SubtaskPreview) models.AIGenerateStats {
	stats := models.AIGenerateStats{
		TotalCount:           len(subtasks),
		PriorityDistribution: make(map[string]int),
	}

	for _, task := range subtasks {
		stats.TotalHours += task.EstimatedHours
		stats.PriorityDistribution[task.Priority]++
	}

	return stats
}
