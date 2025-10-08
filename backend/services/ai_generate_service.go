package services

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"regexp"
	"strings"

	"ai-project-backend/models"
	"ai-project-backend/utils"
)

// AIGenerateService AI生成服务
type AIGenerateService struct {
	db                *sql.DB
	anthropicClient   *AnthropicClient
	encryptionService *utils.EncryptionService
}

// NewAIGenerateService 创建AI生成服务
func NewAIGenerateService(db *sql.DB) *AIGenerateService {
	service := &AIGenerateService{
		db:              db,
		anthropicClient: NewAnthropicClient(),
	}

	// 初始化加密服务
	if err := service.initEncryptionService(); err != nil {
		fmt.Printf("[AIGenerateService] Warning: Failed to initialize encryption service: %v\n", err)
	}

	return service
}

// initEncryptionService 初始化加密服务
func (s *AIGenerateService) initEncryptionService() error {
	// 获取活跃的加密密钥
	var keyName, keyValue string
	query := `SELECT key_name, key_value FROM encryption_keys WHERE is_active = true ORDER BY created_at DESC LIMIT 1`

	err := s.db.QueryRow(query).Scan(&keyName, &keyValue)
	if err != nil {
		return fmt.Errorf("failed to get encryption key: %w", err)
	}

	// 解码密钥
	key, err := utils.DecodeKey(keyValue)
	if err != nil {
		return fmt.Errorf("failed to decode encryption key: %w", err)
	}

	// 创建加密服务
	encryptionService, err := utils.NewEncryptionService(key, keyName)
	if err != nil {
		return fmt.Errorf("failed to create encryption service: %w", err)
	}

	s.encryptionService = encryptionService
	return nil
}

// decryptAPIKey 解密API密钥
func (s *AIGenerateService) decryptAPIKey(encrypted string) (string, error) {
	if s.encryptionService == nil {
		return "", fmt.Errorf("encryption service not initialized")
	}

	decrypted, err := s.encryptionService.DecryptAPIKey(encrypted)
	if err != nil {
		return "", fmt.Errorf("failed to decrypt API key: %w", err)
	}

	return decrypted, nil
}

// GenerateSubtasksParams 生成子任务参数
type GenerateSubtasksParams struct {
	ParentTask         *models.Task
	Model              string
	CustomPrompt       *string // 用户自定义提示词（可选）
	IncludeDescription bool
	IncludeSiblings    bool
	MaxSubtasks        int
}

// getAIConfig 从数据库获取AI配置
func (s *AIGenerateService) getAIConfig(ctx context.Context, modelKey string) (*models.AIConfig, error) {
	fmt.Printf("[AIGenerateService] Querying AI config for provider: %s\n", modelKey)

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
		fmt.Printf("[AIGenerateService] AI config not found for provider: %s\n", modelKey)
		return nil, fmt.Errorf("AI配置不存在或未启用: %s", modelKey)
	}
	if err != nil {
		fmt.Printf("[AIGenerateService] Database query error: %v\n", err)
		return nil, fmt.Errorf("查询AI配置失败: %w", err)
	}

	fmt.Printf("[AIGenerateService] Found AI config: provider=%s, model=%s\n", config.Provider, config.Model)

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

	// 2. 解密API密钥
	decryptedKey, err := s.decryptAPIKey(aiConfig.APIKeyEncrypted)
	if err != nil {
		return nil, fmt.Errorf("解密API密钥失败: %w", err)
	}
	// 将解密后的密钥放回config (临时使用)
	aiConfig.APIKeyEncrypted = decryptedKey

	// 3. 构建Prompt
	prompt := s.buildPrompt(params)

	// 4. 调用AI模型（暂时只支持Anthropic兼容的API）
	response, err := s.anthropicClient.GenerateWithConfig(ctx, prompt, aiConfig)
	if err != nil {
		return nil, fmt.Errorf("AI调用失败: %w", err)
	}

	// 5. 解析AI响应
	subtasks, err := s.parseAIResponse(response, params.MaxSubtasks)
	if err != nil {
		return nil, fmt.Errorf("解析AI响应失败: %w", err)
	}

	// 6. 计算统计信息
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
	// 如果用户提供了自定义提示词，优先使用
	if params.CustomPrompt != nil && strings.TrimSpace(*params.CustomPrompt) != "" {
		return s.buildCustomPrompt(params)
	}

	// 否则使用系统默认Prompt
	return s.buildSystemPrompt(params)
}

// buildCustomPrompt 基于用户自定义提示词构建完整Prompt
func (s *AIGenerateService) buildCustomPrompt(params *GenerateSubtasksParams) string {
	var prompt strings.Builder

	// 1. 用户的自定义指令
	prompt.WriteString("=== 用户指令 ===\n")
	prompt.WriteString(strings.TrimSpace(*params.CustomPrompt))
	prompt.WriteString("\n\n")

	// 2. 父任务信息
	prompt.WriteString("=== 父任务信息 ===\n")
	prompt.WriteString(fmt.Sprintf("标题: %s\n", params.ParentTask.Title))

	if params.IncludeDescription && params.ParentTask.Description != nil && *params.ParentTask.Description != "" {
		prompt.WriteString(fmt.Sprintf("描述: %s\n", *params.ParentTask.Description))
	}

	prompt.WriteString("\n")

	// 3. 输出格式约束（确保JSON格式一致）
	prompt.WriteString(s.getOutputFormatConstraint(params.MaxSubtasks))

	return prompt.String()
}

// buildSystemPrompt 构建系统默认Prompt
func (s *AIGenerateService) buildSystemPrompt(params *GenerateSubtasksParams) string {
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

// getOutputFormatConstraint 获取输出格式约束
func (s *AIGenerateService) getOutputFormatConstraint(maxSubtasks int) string {
	return fmt.Sprintf(`=== 输出格式要求 ===
请生成 3-%d 个子任务，严格按照以下JSON格式返回（不要包含其他文字）：

{
  "subtasks": [
    {
      "title": "子任务标题（简洁明确，动宾结构）",
      "description": "子任务描述（详细说明要做什么、怎么做、验收标准）",
      "estimated_hours": 2.5,
      "priority": "high",
      "tags": ["标签1", "标签2"]
    }
  ]
}

字段说明：
- title: 必填，子任务标题，10-100字符
- description: 必填，子任务详细描述，包含具体步骤和验收标准
- estimated_hours: 必填，预估工时，范围0.5-20小时，按AI开发效率评估
- priority: 必填，优先级，只能是 "high" | "medium" | "low"
- tags: 可选，标签数组，如 ["前端", "UI", "紧急"]

重要提醒：
1. 只返回JSON，不要包含任何其他说明文字
2. 确保JSON格式正确，可以被解析
3. 任务数量控制在3-%d个之间
4. 预估时长要合理，考虑AI的开发效率
`, maxSubtasks, maxSubtasks)
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
