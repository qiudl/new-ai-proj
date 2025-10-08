package services

import (
	"context"
	"database/sql"
	"fmt"
	"regexp"
	"strings"
	"time"

	"ai-project-backend/cache"
	"ai-project-backend/database"
	"ai-project-backend/models"
)

// AIDocumentGenerationService AI文档生成服务
type AIDocumentGenerationService struct {
	db                *sql.DB
	aiGenerateService *AIGenerateService
	promptRepo        *database.PromptRepository
	cacheService      *cache.AICacheService
}

// NewAIDocumentGenerationService 创建AI文档生成服务
func NewAIDocumentGenerationService(
	db *sql.DB,
	aiGenerateService *AIGenerateService,
	promptRepo *database.PromptRepository,
	cacheService *cache.AICacheService,
) *AIDocumentGenerationService {
	return &AIDocumentGenerationService{
		db:                db,
		aiGenerateService: aiGenerateService,
		promptRepo:        promptRepo,
		cacheService:      cacheService,
	}
}

// DocumentGenOptions 文档生成选项
type DocumentGenOptions struct {
	IncludeSubtasks     bool   `json:"include_subtasks"`
	IncludeCodeExamples bool   `json:"include_code_examples"`
	Language            string `json:"language"` // "zh" or "en"
}

// DocumentGenParams 文档生成参数
type DocumentGenParams struct {
	TaskID       int
	UserID       int
	Model        string
	CustomPrompt *string
	DocumentType string
	Options      *DocumentGenOptions
}

// DocumentData 文档数据结构
type DocumentData struct {
	Title    string           `json:"title"`
	Content  string           `json:"content"`
	Metadata DocumentMetadata `json:"metadata"`
}

// DocumentMetadata 文档元数据
type DocumentMetadata struct {
	WordCount            int      `json:"word_count"`
	EstimatedReadingTime int      `json:"estimated_reading_time"` // 分钟
	Sections             []string `json:"sections"`
}

// GenerateDocument 生成文档
func (s *AIDocumentGenerationService) GenerateDocument(ctx context.Context, params *DocumentGenParams) (*DocumentData, error) {
	// 1. 验证参数
	if err := s.validateParams(params); err != nil {
		return nil, fmt.Errorf("参数验证失败: %w", err)
	}

	// 2. 尝试从缓存获取
	if s.cacheService != nil {
		cacheKey := &cache.DocumentCacheKey{
			TaskID:       params.TaskID,
			Model:        params.Model,
			DocumentType: params.DocumentType,
			CustomPrompt: "",
		}
		if params.CustomPrompt != nil {
			cacheKey.CustomPrompt = *params.CustomPrompt
		}

		if cached, found := s.cacheService.GetDocument(ctx, cacheKey); found {
			return &DocumentData{
				Title:   cached.Title,
				Content: cached.Content,
				Metadata: DocumentMetadata{
					WordCount: len(cached.Content),
				},
			}, nil
		}
	}

	// 3. 获取任务信息
	task, err := s.getTaskInfo(ctx, params.TaskID)
	if err != nil {
		return nil, fmt.Errorf("获取任务信息失败: %w", err)
	}

	// 3. 获取子任务（如果需要）
	var subtasks []*models.Task
	if params.Options != nil && params.Options.IncludeSubtasks {
		subtasks, _ = s.getSubtasks(ctx, params.TaskID)
	}

	// 4. 构建Prompt
	prompt, err := s.buildDocumentPrompt(ctx, task, subtasks, params)
	if err != nil {
		return nil, fmt.Errorf("构建Prompt失败: %w", err)
	}

	// 5. 调用AI生成
	aiResponse, err := s.callAI(ctx, prompt, params.Model)
	if err != nil {
		return nil, fmt.Errorf("AI生成失败: %w", err)
	}

	// 6. 解析响应
	docData, err := s.parseDocumentResponse(aiResponse)
	if err != nil {
		return nil, fmt.Errorf("解析响应失败: %w", err)
	}

	// 7. 缓存生成结果
	if s.cacheService != nil {
		cacheKey := &cache.DocumentCacheKey{
			TaskID:       params.TaskID,
			Model:        params.Model,
			DocumentType: params.DocumentType,
			CustomPrompt: "",
		}
		if params.CustomPrompt != nil {
			cacheKey.CustomPrompt = *params.CustomPrompt
		}

		// 文档缓存较长时间（2小时）
		go func() {
			if err := s.cacheService.SetDocument(ctx, cacheKey, docData.Title, docData.Content, 2*time.Hour); err != nil {
				// Log error but don't fail the request
			}
		}()
	}

	// 8. 异步保存历史记录
	go s.savePromptHistory(params, docData, prompt)

	return docData, nil
}

// validateParams 验证参数
func (s *AIDocumentGenerationService) validateParams(params *DocumentGenParams) error {
	if params.TaskID <= 0 {
		return fmt.Errorf("task_id必须大于0")
	}

	if params.UserID <= 0 {
		return fmt.Errorf("user_id必须大于0")
	}

	if params.Model == "" {
		return fmt.Errorf("model不能为空")
	}

	validTypes := map[string]bool{
		"design": true, "requirements": true,
		"test_plan": true, "api_doc": true,
	}
	if !validTypes[params.DocumentType] {
		return fmt.Errorf("无效的document_type: %s", params.DocumentType)
	}

	return nil
}

// getTaskInfo 获取任务信息
func (s *AIDocumentGenerationService) getTaskInfo(ctx context.Context, taskID int) (*models.Task, error) {
	query := `
		SELECT id, title, description, status, priority,
		       parent_id, project_id, assignee_id,
		       created_at, updated_at
		FROM tasks
		WHERE id = $1
	`

	task := &models.Task{}
	err := s.db.QueryRowContext(ctx, query, taskID).Scan(
		&task.ID, &task.Title, &task.Description, &task.Status, &task.Priority,
		&task.ParentID, &task.ProjectID, &task.AssigneeID,
		&task.CreatedAt, &task.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("任务不存在: ID=%d", taskID)
	}

	if err != nil {
		return nil, err
	}

	return task, nil
}

// getSubtasks 获取子任务列表
func (s *AIDocumentGenerationService) getSubtasks(ctx context.Context, parentTaskID int) ([]*models.Task, error) {
	query := `
		SELECT id, title, description, status, priority
		FROM tasks
		WHERE parent_id = $1
		ORDER BY created_at ASC
	`

	rows, err := s.db.QueryContext(ctx, query, parentTaskID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var subtasks []*models.Task
	for rows.Next() {
		task := &models.Task{}
		err := rows.Scan(&task.ID, &task.Title, &task.Description, &task.Status, &task.Priority)
		if err != nil {
			return nil, err
		}
		subtasks = append(subtasks, task)
	}

	return subtasks, rows.Err()
}

// buildDocumentPrompt 构建文档生成Prompt
func (s *AIDocumentGenerationService) buildDocumentPrompt(
	ctx context.Context,
	task *models.Task,
	subtasks []*models.Task,
	params *DocumentGenParams,
) (string, error) {

	var builder strings.Builder

	// 1. 角色定义
	builder.WriteString("你是一个专业的技术文档撰写专家，擅长编写清晰、完整、专业的技术文档。\n\n")

	// 2. 任务信息
	builder.WriteString("【任务信息】\n")
	builder.WriteString(fmt.Sprintf("标题: %s\n", task.Title))

	if task.Description != nil && *task.Description != "" {
		builder.WriteString(fmt.Sprintf("描述: %s\n", *task.Description))
	}

	// 3. 子任务信息
	if len(subtasks) > 0 {
		builder.WriteString("\n【子任务列表】\n")
		for i, subtask := range subtasks {
			builder.WriteString(fmt.Sprintf("%d. %s\n", i+1, subtask.Title))
		}
	}

	// 4. 文档类型说明
	builder.WriteString(fmt.Sprintf("\n【文档类型】\n%s\n", s.getDocumentTypeDesc(params.DocumentType)))

	// 5. 用户自定义Prompt
	if params.CustomPrompt != nil && *params.CustomPrompt != "" {
		builder.WriteString(fmt.Sprintf("\n【特殊要求】\n%s\n", *params.CustomPrompt))
	}

	// 6. 输出要求
	builder.WriteString(s.getOutputRequirements(params))

	return builder.String(), nil
}

// getDocumentTypeDesc 获取文档类型说明
func (s *AIDocumentGenerationService) getDocumentTypeDesc(docType string) string {
	descriptions := map[string]string{
		"design": `技术设计文档
要求：详细描述系统架构、技术选型、接口设计、数据模型、核心算法等`,

		"requirements": `需求规格说明书
要求：明确功能需求、非功能需求、验收标准、约束条件等`,

		"test_plan": `测试计划文档
要求：测试策略、测试用例、覆盖率要求、测试环境、风险评估等`,

		"api_doc": `API接口文档
要求：端点定义、请求/响应格式、参数说明、错误码、使用示例等`,
	}

	if desc, ok := descriptions[docType]; ok {
		return desc
	}
	return "通用技术文档"
}

// getOutputRequirements 获取输出要求
func (s *AIDocumentGenerationService) getOutputRequirements(params *DocumentGenParams) string {
	language := "中文"
	if params.Options != nil && params.Options.Language == "en" {
		language = "English"
	}

	return fmt.Sprintf(`

【输出要求】
1. 使用标准Markdown格式
2. 语言: %s
3. 结构清晰，层次分明
4. 包含必要的代码示例（如果适用）
5. 字数: 800-2000字

【文档结构模板】
# 文档标题

## 1. 概述
简要说明项目背景和目标

## 2. 核心内容
（根据文档类型展开具体内容）

## 3. 实施建议
（如适用）

## 4. 附录
（如适用）

请直接返回Markdown格式的文档内容，无需额外解释。
`, language)
}

// callAI 调用AI生成
func (s *AIDocumentGenerationService) callAI(ctx context.Context, prompt string, model string) (string, error) {
	// 获取AI配置
	config, err := s.aiGenerateService.getAIConfig(ctx, model)
	if err != nil {
		return "", fmt.Errorf("获取AI配置失败: %w", err)
	}

	// 调用AI（使用现有的GenerateWithConfig方法）
	response, err := s.aiGenerateService.anthropicClient.GenerateWithConfig(ctx, prompt, config)
	if err != nil {
		return "", fmt.Errorf("调用AI失败: %w", err)
	}

	if response == "" {
		return "", fmt.Errorf("AI响应为空")
	}

	return response, nil
}

// parseDocumentResponse 解析AI响应
func (s *AIDocumentGenerationService) parseDocumentResponse(rawResponse string) (*DocumentData, error) {
	// 1. 提取Markdown内容
	content := s.extractMarkdown(rawResponse)
	if content == "" {
		return nil, fmt.Errorf("无法提取有效的Markdown内容")
	}

	// 2. 提取标题
	title := s.extractTitle(content)
	if title == "" {
		title = "生成的文档"
	}

	// 3. 提取章节
	sections := s.extractSections(content)

	// 4. 计算元数据
	wordCount := s.countWords(content)
	readingTime := s.estimateReadingTime(wordCount)

	// 5. 验证
	if len(content) < 100 {
		return nil, fmt.Errorf("文档内容过短（< 100字符）")
	}

	if len(content) > 50000 {
		return nil, fmt.Errorf("文档内容过长（> 50000字符）")
	}

	if wordCount < 50 {
		return nil, fmt.Errorf("文档字数过少（< 50字）")
	}

	return &DocumentData{
		Title:   title,
		Content: content,
		Metadata: DocumentMetadata{
			WordCount:            wordCount,
			EstimatedReadingTime: readingTime,
			Sections:             sections,
		},
	}, nil
}

// extractMarkdown 提取Markdown内容
func (s *AIDocumentGenerationService) extractMarkdown(text string) string {
	// 尝试1: 查找 ```markdown 代码块
	markdownBlockRegex := regexp.MustCompile(`(?s)` + "```markdown\\s*(.+?)\\s*```")
	if matches := markdownBlockRegex.FindStringSubmatch(text); len(matches) > 1 {
		return strings.TrimSpace(matches[1])
	}

	// 尝试2: 查找任意 ``` 代码块
	codeBlockRegex := regexp.MustCompile(`(?s)` + "```\\s*(.+?)\\s*```")
	if matches := codeBlockRegex.FindStringSubmatch(text); len(matches) > 1 {
		content := strings.TrimSpace(matches[1])
		// 检查是否像Markdown
		if strings.Contains(content, "# ") || strings.Contains(content, "## ") {
			return content
		}
	}

	// 尝试3: 整个文本就是Markdown
	trimmed := strings.TrimSpace(text)
	if strings.Contains(trimmed, "# ") || strings.Contains(trimmed, "## ") {
		return trimmed
	}

	return ""
}

// extractTitle 提取标题
func (s *AIDocumentGenerationService) extractTitle(content string) string {
	lines := strings.Split(content, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "# ") {
			return strings.TrimPrefix(line, "# ")
		}
	}
	return ""
}

// extractSections 提取章节标题
func (s *AIDocumentGenerationService) extractSections(content string) []string {
	var sections []string
	lines := strings.Split(content, "\n")

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "## ") {
			title := strings.TrimPrefix(line, "## ")
			sections = append(sections, title)
		}
	}

	return sections
}

// countWords 计算字数（中英文混合）
func (s *AIDocumentGenerationService) countWords(content string) int {
	// 统计中文字符
	chineseCount := 0
	for _, r := range content {
		if s.isChinese(r) {
			chineseCount++
		}
	}

	// 统计英文单词
	englishWords := 0
	words := strings.Fields(content)
	for _, word := range words {
		if !s.containsChinese(word) {
			englishWords++
		}
	}

	return chineseCount + englishWords
}

// estimateReadingTime 估算阅读时间（分钟）
func (s *AIDocumentGenerationService) estimateReadingTime(wordCount int) int {
	// 假设阅读速度：平均250字/分钟
	minutes := wordCount / 250
	if minutes < 1 {
		return 1
	}
	return minutes
}

// isChinese 判断是否为中文字符
func (s *AIDocumentGenerationService) isChinese(r rune) bool {
	return r >= 0x4e00 && r <= 0x9fa5
}

// containsChinese 判断字符串是否包含中文
func (s *AIDocumentGenerationService) containsChinese(str string) bool {
	for _, r := range str {
		if s.isChinese(r) {
			return true
		}
	}
	return false
}

// savePromptHistory 保存Prompt历史记录
func (s *AIDocumentGenerationService) savePromptHistory(params *DocumentGenParams, docData *DocumentData, prompt string) {
	history := &models.UserPromptHistory{
		UserID:            params.UserID,
		ParentTaskID:      params.TaskID,
		PromptText:        prompt,
		AIProvider:        params.Model,
		AIModel:           params.Model,
		PromptType:        "document",
		DocumentType:      &params.DocumentType,
		SubtasksGenerated: 0,
		SubtasksAccepted:  0,
	}

	err := s.promptRepo.CreatePromptHistory(history)
	if err != nil {
		fmt.Printf("[AIDocumentGenerationService] Failed to save prompt history: %v\n", err)
	}
}
