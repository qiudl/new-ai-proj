package services

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"strings"
	"time"

	"ai-project-backend/cache"
	"ai-project-backend/database"
	"ai-project-backend/models"
)

// DescriptionGenerator AI任务描述生成服务
type DescriptionGenerator struct {
	db                *sql.DB
	aiGenerateService *AIGenerateService
	promptRepo        *database.PromptRepository
	cacheService      *cache.AICacheService
}

// NewDescriptionGenerator 创建描述生成器
func NewDescriptionGenerator(db *sql.DB, cacheService *cache.AICacheService) *DescriptionGenerator {
	return &DescriptionGenerator{
		db:                db,
		aiGenerateService: NewAIGenerateService(db),
		promptRepo:        database.NewPromptRepository(db),
		cacheService:      cacheService,
	}
}

// GenerateDescriptionOptions 生成描述选项
type GenerateDescriptionOptions struct {
	Mode           string `json:"mode"`            // replace | append | suggest
	Style          string `json:"style"`           // brief | detailed | technical
	Length         string `json:"length"`          // short | medium | long
	IncludeContext bool   `json:"include_context"` // 是否包含上下文（父任务、子任务等）
	Stream         bool   `json:"stream"`          // 是否流式返回
	MaxTokens      int    `json:"max_tokens"`      // 最大token数
	CustomPrompt   string `json:"custom_prompt"`   // 用户自定义Prompt
}

// TaskContext 任务上下文信息
type TaskContext struct {
	Task         *models.Task
	ParentTask   *models.Task
	SiblingTasks []*models.Task
	ChildTasks   []*models.Task
	ProjectName  string
	Tags         []string
}

// DescriptionGenerationResult 描述生成结果
type DescriptionGenerationResult struct {
	TaskID         int      `json:"task_id"`
	OriginalDesc   *string  `json:"original_desc"`
	GeneratedDesc  string   `json:"generated_desc"`
	Suggestions    []string `json:"suggestions,omitempty"`
	Mode           string   `json:"mode"`
	Model          string   `json:"model"`
	TokensUsed     int      `json:"tokens_used,omitempty"`
}

// GenerateDescription 为单个任务生成描述
func (g *DescriptionGenerator) GenerateDescription(
	ctx context.Context,
	taskID int,
	model string,
	options *GenerateDescriptionOptions,
) (*DescriptionGenerationResult, error) {

	// 1. 设置默认选项
	if options == nil {
		options = &GenerateDescriptionOptions{
			Mode:           "replace",
			Style:          "detailed",
			Length:         "medium",
			IncludeContext: true,
			Stream:         false,
			MaxTokens:      800,
		}
	}

	// 2. 尝试从缓存获取（仅对replace和suggest模式，append模式不缓存）
	if g.cacheService != nil && (options.Mode == "replace" || options.Mode == "suggest") {
		cacheKey := &cache.DescriptionCacheKey{
			TaskID:         taskID,
			Model:          model,
			Style:          options.Style,
			Length:         options.Length,
			IncludeContext: options.IncludeContext,
			CustomPrompt:   options.CustomPrompt,
		}

		if cached, found := g.cacheService.GetDescription(ctx, cacheKey); found {
			log.Printf("[DescriptionGenerator] Task %d - Cache hit! Returning cached description", taskID)
			return &DescriptionGenerationResult{
				TaskID:        cached.TaskID,
				GeneratedDesc: cached.GeneratedDesc,
				Model:         cached.Model,
				Mode:          options.Mode,
			}, nil
		}
	}

	// 3. 收集任务上下文
	taskContext, err := g.collectTaskContext(ctx, taskID, options.IncludeContext)
	if err != nil {
		return nil, fmt.Errorf("收集任务上下文失败: %w", err)
	}

	// 3. 构建Prompt
	prompt, err := g.buildDescriptionPrompt(taskContext, options)
	if err != nil {
		return nil, fmt.Errorf("构建Prompt失败: %w", err)
	}

	log.Printf("[DescriptionGenerator] Task %d - Prompt constructed (length: %d chars)", taskID, len(prompt))

	// 4. 调用AI生成
	aiConfig, err := g.aiGenerateService.getAIConfig(ctx, model)
	if err != nil {
		return nil, fmt.Errorf("获取AI配置失败: %w", err)
	}

	// 解密API密钥
	decryptedKey, err := g.aiGenerateService.decryptAPIKey(aiConfig.APIKeyEncrypted)
	if err != nil {
		return nil, fmt.Errorf("解密API密钥失败: %w", err)
	}
	aiConfig.APIKeyEncrypted = decryptedKey

	// 确保max_tokens在有效范围内 (DeepSeek限制: 1-8192)
	if options.MaxTokens > 0 && options.MaxTokens <= 8192 {
		aiConfig.MaxTokens = options.MaxTokens
	} else if aiConfig.MaxTokens == 0 || aiConfig.MaxTokens > 8192 {
		aiConfig.MaxTokens = 800 // 默认值
	}

	// 调用AI
	response, err := g.aiGenerateService.anthropicClient.GenerateWithConfig(ctx, prompt, aiConfig)
	if err != nil {
		return nil, fmt.Errorf("AI生成失败: %w", err)
	}

	// 5. 解析响应
	generatedDesc := g.parseDescriptionResponse(response, options)

	log.Printf("[DescriptionGenerator] Task %d - Description generated (length: %d chars)", taskID, len(generatedDesc))

	// 6. 构建结果
	result := &DescriptionGenerationResult{
		TaskID:        taskID,
		OriginalDesc:  taskContext.Task.Description,
		GeneratedDesc: generatedDesc,
		Mode:          options.Mode,
		Model:         model,
	}

	// 7. 缓存生成结果（仅对replace和suggest模式）
	if g.cacheService != nil && (options.Mode == "replace" || options.Mode == "suggest") {
		cacheKey := &cache.DescriptionCacheKey{
			TaskID:         taskID,
			Model:          model,
			Style:          options.Style,
			Length:         options.Length,
			IncludeContext: options.IncludeContext,
			CustomPrompt:   options.CustomPrompt,
		}

		// 根据长度设置不同的TTL
		ttl := 1 * time.Hour // 默认1小时
		if options.Length == "short" {
			ttl = 2 * time.Hour // 短描述缓存2小时
		} else if options.Length == "long" {
			ttl = 30 * time.Minute // 长描述缓存30分钟（因为更可能被修改）
		}

		go func() {
			if err := g.cacheService.SetDescription(ctx, cacheKey, generatedDesc, ttl); err != nil {
				log.Printf("[DescriptionGenerator] Failed to cache description: %v", err)
			}
		}()
	}

	// 8. 异步保存历史记录
	go g.saveGenerationHistory(taskID, prompt, generatedDesc, model)

	return result, nil
}

// collectTaskContext 收集任务上下文信息
func (g *DescriptionGenerator) collectTaskContext(ctx context.Context, taskID int, includeContext bool) (*TaskContext, error) {
	taskContext := &TaskContext{}

	// 1. 获取主任务信息
	query := `
		SELECT id, title, description, status, priority, parent_id, project_id,
		       assignee_id, created_at, updated_at
		FROM tasks
		WHERE id = $1
	`

	task := &models.Task{}
	err := g.db.QueryRowContext(ctx, query, taskID).Scan(
		&task.ID, &task.Title, &task.Description, &task.Status, &task.Priority,
		&task.ParentID, &task.ProjectID, &task.AssigneeID,
		&task.CreatedAt, &task.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("任务不存在: ID=%d", taskID)
	}
	if err != nil {
		return nil, fmt.Errorf("查询任务失败: %w", err)
	}

	taskContext.Task = task

	// 如果不需要上下文，直接返回
	if !includeContext {
		return taskContext, nil
	}

	// 2. 获取父任务（如果有）
	if task.ParentID != nil && *task.ParentID > 0 {
		parentTask, _ := g.getTaskByID(ctx, *task.ParentID)
		taskContext.ParentTask = parentTask
	}

	// 3. 获取同级任务（兄弟任务）
	if task.ParentID != nil && *task.ParentID > 0 {
		siblings, _ := g.getSiblingTasks(ctx, taskID, *task.ParentID)
		taskContext.SiblingTasks = siblings
	}

	// 4. 获取子任务
	children, _ := g.getChildTasks(ctx, taskID)
	taskContext.ChildTasks = children

	// 5. 获取项目名称
	projectName, _ := g.getProjectName(ctx, task.ProjectID)
	taskContext.ProjectName = projectName

	return taskContext, nil
}

// getTaskByID 根据ID获取任务（简化版）
func (g *DescriptionGenerator) getTaskByID(ctx context.Context, taskID int) (*models.Task, error) {
	query := `SELECT id, title, description FROM tasks WHERE id = $1`

	task := &models.Task{}
	err := g.db.QueryRowContext(ctx, query, taskID).Scan(&task.ID, &task.Title, &task.Description)
	if err != nil {
		return nil, err
	}

	return task, nil
}

// getSiblingTasks 获取同级任务
func (g *DescriptionGenerator) getSiblingTasks(ctx context.Context, taskID int, parentID int) ([]*models.Task, error) {
	query := `
		SELECT id, title, description
		FROM tasks
		WHERE parent_id = $1 AND id != $2
		ORDER BY created_at ASC
		LIMIT 5
	`

	rows, err := g.db.QueryContext(ctx, query, parentID, taskID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var siblings []*models.Task
	for rows.Next() {
		task := &models.Task{}
		if err := rows.Scan(&task.ID, &task.Title, &task.Description); err != nil {
			continue
		}
		siblings = append(siblings, task)
	}

	return siblings, nil
}

// getChildTasks 获取子任务
func (g *DescriptionGenerator) getChildTasks(ctx context.Context, taskID int) ([]*models.Task, error) {
	query := `
		SELECT id, title, description
		FROM tasks
		WHERE parent_id = $1
		ORDER BY created_at ASC
		LIMIT 10
	`

	rows, err := g.db.QueryContext(ctx, query, taskID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var children []*models.Task
	for rows.Next() {
		task := &models.Task{}
		if err := rows.Scan(&task.ID, &task.Title, &task.Description); err != nil {
			continue
		}
		children = append(children, task)
	}

	return children, nil
}

// getProjectName 获取项目名称
func (g *DescriptionGenerator) getProjectName(ctx context.Context, projectID int) (string, error) {
	var name string
	query := `SELECT name FROM projects WHERE id = $1`
	err := g.db.QueryRowContext(ctx, query, projectID).Scan(&name)
	if err != nil {
		return "", err
	}
	return name, nil
}

// buildDescriptionPrompt 构建描述生成Prompt
func (g *DescriptionGenerator) buildDescriptionPrompt(
	taskContext *TaskContext,
	options *GenerateDescriptionOptions,
) (string, error) {

	var builder strings.Builder

	// 1. 系统角色定义
	builder.WriteString("你是一个专业的项目管理和技术文档专家，擅长为任务编写清晰、完整、可执行的描述。\n\n")

	// 2. 用户自定义Prompt（如果有）
	if options.CustomPrompt != "" {
		builder.WriteString("【用户特殊要求】\n")
		builder.WriteString(options.CustomPrompt)
		builder.WriteString("\n\n")
	}

	// 3. 任务基本信息
	builder.WriteString("【任务信息】\n")
	builder.WriteString(fmt.Sprintf("任务标题: %s\n", taskContext.Task.Title))

	// 当前描述
	if taskContext.Task.Description != nil && *taskContext.Task.Description != "" {
		builder.WriteString(fmt.Sprintf("当前描述: %s\n", *taskContext.Task.Description))
	} else {
		builder.WriteString("当前描述: (无)\n")
	}

	// 项目名称
	if taskContext.ProjectName != "" {
		builder.WriteString(fmt.Sprintf("所属项目: %s\n", taskContext.ProjectName))
	}

	// 4. 上下文信息（如果有）
	if options.IncludeContext {
		// 父任务
		if taskContext.ParentTask != nil {
			builder.WriteString("\n【父任务】\n")
			builder.WriteString(fmt.Sprintf("标题: %s\n", taskContext.ParentTask.Title))
			if taskContext.ParentTask.Description != nil && *taskContext.ParentTask.Description != "" {
				builder.WriteString(fmt.Sprintf("描述: %s\n", *taskContext.ParentTask.Description))
			}
		}

		// 兄弟任务
		if len(taskContext.SiblingTasks) > 0 {
			builder.WriteString("\n【同级任务】\n")
			for i, sibling := range taskContext.SiblingTasks {
				builder.WriteString(fmt.Sprintf("%d. %s\n", i+1, sibling.Title))
			}
		}

		// 子任务
		if len(taskContext.ChildTasks) > 0 {
			builder.WriteString("\n【子任务列表】\n")
			for i, child := range taskContext.ChildTasks {
				builder.WriteString(fmt.Sprintf("%d. %s\n", i+1, child.Title))
			}
		}
	}

	// 5. 生成要求
	builder.WriteString("\n【生成要求】\n")
	builder.WriteString(g.getStyleDescription(options))

	// 6. 输出格式
	builder.WriteString("\n【输出格式】\n")
	builder.WriteString("请直接返回任务描述内容，不要包含其他说明或标记。\n")
	builder.WriteString("描述应该清晰、具体、可执行，包含必要的背景、目标、步骤、验收标准等。\n")

	return builder.String(), nil
}

// getStyleDescription 获取风格描述
func (g *DescriptionGenerator) getStyleDescription(options *GenerateDescriptionOptions) string {
	var requirements []string

	// 风格要求
	switch options.Style {
	case "brief":
		requirements = append(requirements, "风格: 简洁明了，突出重点")
	case "technical":
		requirements = append(requirements, "风格: 技术性强，包含技术细节和实现要点")
	default: // detailed
		requirements = append(requirements, "风格: 详细完整，包含背景、目标、步骤、验收标准")
	}

	// 长度要求
	switch options.Length {
	case "short":
		requirements = append(requirements, "长度: 50-150字")
	case "long":
		requirements = append(requirements, "长度: 300-600字")
	default: // medium
		requirements = append(requirements, "长度: 150-300字")
	}

	// 模式要求
	switch options.Mode {
	case "append":
		requirements = append(requirements, "模式: 在现有描述基础上补充和扩展")
	case "suggest":
		requirements = append(requirements, "模式: 提供多个描述建议供选择")
	default: // replace
		requirements = append(requirements, "模式: 生成全新的完整描述")
	}

	return strings.Join(requirements, "\n")
}

// parseDescriptionResponse 解析AI响应
func (g *DescriptionGenerator) parseDescriptionResponse(response string, options *GenerateDescriptionOptions) string {
	// 去除可能的markdown代码块标记
	response = strings.TrimPrefix(response, "```")
	response = strings.TrimPrefix(response, "```markdown")
	response = strings.TrimSuffix(response, "```")
	response = strings.TrimSpace(response)

	return response
}

// saveGenerationHistory 保存生成历史记录
func (g *DescriptionGenerator) saveGenerationHistory(taskID int, prompt string, generatedDesc string, model string) {
	history := &models.UserPromptHistory{
		ParentTaskID:      taskID,
		PromptText:        prompt,
		AIProvider:        model,
		AIModel:           model,
		PromptType:        "description",
		SubtasksGenerated: 0,
		SubtasksAccepted:  0,
	}

	err := g.promptRepo.CreatePromptHistory(history)
	if err != nil {
		log.Printf("[DescriptionGenerator] Failed to save history: %v", err)
	}
}
