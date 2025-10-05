package services

import (
	"context"
	"encoding/json"
	"fmt"
	"regexp"
	"strings"

	"ai-project-backend/models"
)

// AIGenerateService AI生成服务
type AIGenerateService struct {
	anthropicClient *AnthropicClient
}

// NewAIGenerateService 创建AI生成服务
func NewAIGenerateService() *AIGenerateService {
	return &AIGenerateService{
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

// GenerateSubtasks 生成子任务
func (s *AIGenerateService) GenerateSubtasks(ctx context.Context, params *GenerateSubtasksParams) (*models.AIGenerateResponse, error) {
	// 设置默认值
	if params.MaxSubtasks == 0 {
		params.MaxSubtasks = 10
	}

	// 1. 构建Prompt
	prompt := s.buildPrompt(params)

	// 2. 调用AI模型
	var response string
	var err error

	switch params.Model {
	case "claude", "anthropic":
		response, err = s.anthropicClient.Generate(ctx, prompt)
	default:
		return nil, fmt.Errorf("不支持的AI模型: %s", params.Model)
	}

	if err != nil {
		return nil, fmt.Errorf("AI调用失败: %w", err)
	}

	// 3. 解析AI响应
	subtasks, err := s.parseAIResponse(response, params.MaxSubtasks)
	if err != nil {
		return nil, fmt.Errorf("解析AI响应失败: %w", err)
	}

	// 4. 计算统计信息
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
