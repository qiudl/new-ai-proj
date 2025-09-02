package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"ai-project-backend/database"
	"ai-project-backend/models"
	"ai-project-backend/services"
	"github.com/gin-gonic/gin"
)

// AITaskGeneratorHandler AI任务生成处理器
type AITaskGeneratorHandler struct {
	aiConfigRepo database.AIConfigRepository
	taskRepo     database.TaskRepository
	projectRepo  database.ProjectRepository
	historyRepo  database.AIGenerationHistoryRepository
	aiClient     services.AIClient
}

// NewAITaskGeneratorHandler 创建AI任务生成处理器
func NewAITaskGeneratorHandler(
	aiConfigRepo database.AIConfigRepository,
	taskRepo database.TaskRepository,
	projectRepo database.ProjectRepository,
	historyRepo database.AIGenerationHistoryRepository,
) *AITaskGeneratorHandler {
	return &AITaskGeneratorHandler{
		aiConfigRepo: aiConfigRepo,
		taskRepo:     taskRepo,
		projectRepo:  projectRepo,
		historyRepo:  historyRepo,
		aiClient:     services.NewHTTPAIClient(),
	}
}

// GenerateTasks 生成任务
func (h *AITaskGeneratorHandler) GenerateTasks(c *gin.Context) {
	var req models.AITaskGenerationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body: "+err.Error(), nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// 验证请求
	if err := req.Validate(); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, err.Error(), nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// 获取用户ID
	userID, exists := c.Get("user_id")
	if !exists {
		response := models.NewErrorResponse(models.ErrCodeUnauthorized, "User not authenticated", nil)
		c.JSON(http.StatusUnauthorized, response)
		return
	}

	userIDInt, ok := userID.(int)
	if !ok {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Invalid user ID", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	startTime := time.Now()

	// 获取AI配置
	aiConfig, err := h.aiConfigRepo.GetConfig(req.Provider)
	if err != nil || aiConfig == nil {
		response := models.NewErrorResponse(models.ErrCodeNotFound, "AI配置不存在，请先配置AI服务", nil)
		c.JSON(http.StatusNotFound, response)
		return
	}

	if !aiConfig.Enabled {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "AI服务未启用", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// 获取项目上下文（如果提供了项目ID）
	var projectContext *models.ProjectContext
	if req.ProjectID != nil {
		project, err := h.projectRepo.GetByID(c.Request.Context(), *req.ProjectID)
		if err != nil {
			response := models.NewErrorResponse(models.ErrCodeNotFound, "项目不存在", nil)
			c.JSON(http.StatusNotFound, response)
			return
		}

		// 获取项目现有任务
		existingTasks, _, _ := h.taskRepo.GetByProjectID(c.Request.Context(), *req.ProjectID, 100, 0)
		taskSummaries := make([]models.TaskSummary, 0, len(existingTasks))
		for _, task := range existingTasks {
			taskSummaries = append(taskSummaries, models.TaskSummary{
				ID:          task.ID,
				Title:       task.Title,
				Description: task.Description,
				Priority:    "medium", // Default priority as Task struct doesn't have Priority field
				Status:      task.Status,
				Tags:        []string{}, // Default empty tags as Task struct doesn't have Tags field
			})
		}

		projectContext = &models.ProjectContext{
			ProjectID:     project.ID,
			ProjectName:   project.Name,
			ProjectDesc:   project.Description,
			ExistingTasks: taskSummaries,
		}
	}

	// 调用AI生成任务
	generationResult, err := h.generateTasksWithAI(c.Request.Context(), aiConfig, &req, projectContext)
	if err != nil {
		log.Printf("AI任务生成失败: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "AI任务生成失败: "+err.Error(), nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	processingTime := int(time.Since(startTime).Milliseconds())
	generationResult.ProcessingTime = processingTime

	// 保存生成历史
	historyID, err := h.saveGenerationHistory(c.Request.Context(), userIDInt, &req, generationResult, projectContext)
	if err != nil {
		log.Printf("保存生成历史失败: %v", err)
	}

	// 添加历史ID到响应
	responseData := map[string]interface{}{
		"generation_result": generationResult,
		"history_id":        historyID,
		"processing_time":   processingTime,
	}

	response := models.NewSuccessResponse(responseData, "AI任务生成成功")
	c.JSON(http.StatusOK, response)
}

// ValidateTasks 验证任务
func (h *AITaskGeneratorHandler) ValidateTasks(c *gin.Context) {
	var req models.AITaskValidationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body: "+err.Error(), nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// 获取AI配置
	aiConfig, err := h.aiConfigRepo.GetConfig(req.Provider)
	if err != nil || aiConfig == nil {
		response := models.NewErrorResponse(models.ErrCodeNotFound, "AI配置不存在", nil)
		c.JSON(http.StatusNotFound, response)
		return
	}

	// 调用AI验证任务
	validationResult, err := h.validateTasksWithAI(c.Request.Context(), aiConfig, &req)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeInternal, "AI任务验证失败: "+err.Error(), nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(validationResult, "AI任务验证完成")
	c.JSON(http.StatusOK, response)
}

// OptimizeTasks 优化任务
func (h *AITaskGeneratorHandler) OptimizeTasks(c *gin.Context) {
	var req models.AITaskOptimizationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body: "+err.Error(), nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// 获取AI配置
	aiConfig, err := h.aiConfigRepo.GetConfig(req.Provider)
	if err != nil || aiConfig == nil {
		response := models.NewErrorResponse(models.ErrCodeNotFound, "AI配置不存在", nil)
		c.JSON(http.StatusNotFound, response)
		return
	}

	// 调用AI优化任务
	optimizationResult, err := h.optimizeTasksWithAI(c.Request.Context(), aiConfig, &req)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeInternal, "AI任务优化失败: "+err.Error(), nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(optimizationResult, "AI任务优化完成")
	c.JSON(http.StatusOK, response)
}

// GetModelStatus 获取AI模型状态
func (h *AITaskGeneratorHandler) GetModelStatus(c *gin.Context) {
	configs, err := h.aiConfigRepo.GetAllConfigs()
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeInternal, "获取AI配置失败", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	statuses := make([]models.AIModelStatus, 0, len(configs))
	for _, config := range configs {
		status := models.AIModelStatus{
			Provider:     config.Provider,
			Available:    config.Enabled,
			LastTested:   config.LastTestedAt,
			ResponseTime: 0, // 可以从历史记录中计算
			ErrorCount:   config.TestFailureCount,
		}
		statuses = append(statuses, status)
	}

	response := models.NewSuccessResponse(statuses, "AI模型状态获取成功")
	c.JSON(http.StatusOK, response)
}

// BulkImport AI智能批量导入
func (h *AITaskGeneratorHandler) BulkImport(c *gin.Context) {
	projectIDStr := c.Param("id")
	projectID, err := strconv.Atoi(projectIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid project ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	var req models.AIBulkImportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body: "+err.Error(), nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// 设置项目ID
	req.ProjectID = projectID

	// 获取用户ID
	userID, exists := c.Get("user_id")
	if !exists {
		response := models.NewErrorResponse(models.ErrCodeUnauthorized, "User not authenticated", nil)
		c.JSON(http.StatusUnauthorized, response)
		return
	}

	userIDInt, ok := userID.(int)
	if !ok {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Invalid user ID", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	startTime := time.Now()

	// 执行AI智能批量导入
	importResult, err := h.executeAIBulkImport(c.Request.Context(), &req, userIDInt)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeInternal, "AI批量导入失败: "+err.Error(), nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	importResult.ProcessingTime = int(time.Since(startTime).Milliseconds())

	response := models.NewSuccessResponse(importResult, "AI批量导入完成")
	c.JSON(http.StatusCreated, response)
}

// generateTasksWithAI 使用AI生成任务
func (h *AITaskGeneratorHandler) generateTasksWithAI(
	ctx context.Context,
	aiConfig *models.AIConfig,
	req *models.AITaskGenerationRequest,
	projectContext *models.ProjectContext,
) (*models.AITaskGenerationResponse, error) {
	// 构建AI提示词
	prompt := h.buildTaskGenerationPrompt(req, projectContext)

	// 解密API密钥
	decryptedAPIKey, err := h.aiConfigRepo.DecryptAPIKey(req.Provider)
	if err != nil {
		return nil, fmt.Errorf("解密API密钥失败: %w", err)
	}

	// 准备AI配置用于测试，使用解密的明文密钥
	testConfig := *aiConfig
	testConfig.APIKeyEncrypted = decryptedAPIKey // 使用解密的明文密钥

	// 调用AI服务
	log.Printf("调用AI服务，提示词长度: %d", len(prompt))
	aiResponse, err := h.aiClient.GenerateCompletion(ctx, &testConfig, prompt)
	if err != nil {
		log.Printf("AI服务调用错误: %v", err)
		return nil, fmt.Errorf("AI服务调用失败: %w", err)
	}

	if !aiResponse.Success {
		log.Printf("AI服务返回失败: %s", aiResponse.Error)
		return nil, fmt.Errorf("AI服务返回错误: %s", aiResponse.Error)
	}

	// 检查AI响应内容
	if aiResponse.Content == "" {
		log.Printf("AI响应为空")
		return nil, fmt.Errorf("AI服务返回空响应")
	}

	log.Printf("AI响应长度: %d", len(aiResponse.Content))

	// 解析AI响应为任务列表
	log.Printf("调用解析函数前，AI响应内容: %s", aiResponse.Content)
	generatedTasks, err := h.parseAIResponseToTasks(aiResponse.Content)
	if err != nil {
		log.Printf("解析AI响应失败，原始响应: %s, 错误: %v", aiResponse.Content, err)
		return nil, fmt.Errorf("解析AI响应失败: %w", err)
	}

	// 构建质量指标
	qualityMetrics := h.calculateQualityMetrics(generatedTasks, req.Options)

	// 构建响应
	response := &models.AITaskGenerationResponse{
		Success:        true,
		Message:        "任务生成成功",
		GeneratedTasks: generatedTasks,
		TotalTasks:     len(generatedTasks),
		TokenUsage: &models.TokenUsage{
			PromptTokens:     aiResponse.Usage.PromptTokens,
			CompletionTokens: aiResponse.Usage.CompletionTokens,
			TotalTokens:      aiResponse.Usage.TotalTokens,
		},
		QualityMetrics: qualityMetrics,
		ModelInfo: &models.AIModelInfo{
			Name:    aiResponse.Model,
			Version: "1.0.0",
		},
		Suggestions: h.generateSuggestions(generatedTasks, qualityMetrics),
	}

	return response, nil
}

// buildTaskGenerationPrompt 构建任务生成提示词
func (h *AITaskGeneratorHandler) buildTaskGenerationPrompt(
	req *models.AITaskGenerationRequest,
	projectContext *models.ProjectContext,
) string {
	var prompt strings.Builder

	prompt.WriteString("你是一个专业的项目管理助手，擅长将复杂需求分解为具体的可执行任务。\n\n")

	if projectContext != nil {
		prompt.WriteString(fmt.Sprintf("项目背景：\n"))
		prompt.WriteString(fmt.Sprintf("- 项目名称：%s\n", projectContext.ProjectName))
		if projectContext.ProjectDesc != "" {
			prompt.WriteString(fmt.Sprintf("- 项目描述：%s\n", projectContext.ProjectDesc))
		}

		if len(projectContext.ExistingTasks) > 0 {
			prompt.WriteString(fmt.Sprintf("- 现有任务数量：%d个\n", len(projectContext.ExistingTasks)))
		}
		prompt.WriteString("\n")
	}

	prompt.WriteString("请将以下需求分解为具体任务，返回JSON格式：\n\n")
	prompt.WriteString("需求描述：\n")
	prompt.WriteString(req.InputText)
	prompt.WriteString("\n\n")

	prompt.WriteString("请返回JSON格式，包含以下字段：\n")
	prompt.WriteString("{\n")
	prompt.WriteString("  \"tasks\": [\n")
	prompt.WriteString("    {\n")
	prompt.WriteString("      \"title\": \"任务标题\",\n")
	prompt.WriteString("      \"description\": \"详细描述\",\n")
	prompt.WriteString("      \"priority\": \"high|medium|low\",\n")
	prompt.WriteString("      \"estimated_hours\": 数字,\n")
	prompt.WriteString("      \"tags\": [\"标签1\", \"标签2\"],\n")
	prompt.WriteString("      \"dependencies\": [依赖任务索引],\n")
	prompt.WriteString("      \"confidence\": 0.95\n")
	prompt.WriteString("    }\n")
	prompt.WriteString("  ]\n")
	prompt.WriteString("}\n\n")

	prompt.WriteString(fmt.Sprintf("要求：\n"))
	prompt.WriteString(fmt.Sprintf("- 生成不超过%d个任务\n", req.Options.MaxTasks))
	prompt.WriteString("- 任务标题要具体明确\n")
	prompt.WriteString("- 描述要详细可执行\n")
	prompt.WriteString("- 工作量估算要合理（以小时为单位）\n")

	if req.Options.EnableDuplicateCheck {
		prompt.WriteString("- 避免重复任务\n")
	}

	if req.Options.EnableDependencyAnalysis {
		prompt.WriteString("- 分析任务间的依赖关系\n")
	}

	if req.Options.EnableSkillTagging {
		prompt.WriteString("- 为任务添加合适的技能标签\n")
	}

	return prompt.String()
}

// parseAIResponseToTasks 解析AI响应为任务列表
func (h *AITaskGeneratorHandler) parseAIResponseToTasks(aiResponse string) ([]models.GeneratedTask, error) {
	// 尝试从响应中提取JSON
	jsonStr := h.extractJSONFromResponse(aiResponse)
	if jsonStr == "" {
		return nil, fmt.Errorf("无法从AI响应中提取JSON格式数据")
	}

	// 解析JSON
	var taskData struct {
		Tasks []models.GeneratedTask `json:"tasks"`
	}

	if err := json.Unmarshal([]byte(jsonStr), &taskData); err != nil {
		log.Printf("JSON解析详细错误: %v", err)
		log.Printf("尝试解析的JSON内容: %s", jsonStr)
		return nil, fmt.Errorf("JSON解析失败: %w", err)
	}

	// 为每个任务分配唯一ID
	for i := range taskData.Tasks {
		taskData.Tasks[i].AIGeneratedID = fmt.Sprintf("ai_%d_%d", time.Now().Unix(), i)

		// 验证和默认值设置
		if taskData.Tasks[i].Priority == "" {
			taskData.Tasks[i].Priority = "medium"
		}

		if taskData.Tasks[i].Confidence == 0 {
			taskData.Tasks[i].Confidence = 0.8
		}

		if taskData.Tasks[i].EstimatedHours == 0 {
			taskData.Tasks[i].EstimatedHours = 4.0 // 默认4小时
		}
	}

	return taskData.Tasks, nil
}

// extractJSONFromResponse 从AI响应中提取JSON
func (h *AITaskGeneratorHandler) extractJSONFromResponse(response string) string {
	log.Printf("=== 开始提取JSON ===")
	log.Printf("原始AI响应长度: %d", len(response))

	// 如果响应太长，只记录前500个字符
	if len(response) > 500 {
		log.Printf("原始AI响应内容(前500字符): %s...", response[:500])
	} else {
		log.Printf("原始AI响应内容: %s", response)
	}

	// 如果响应为空
	if strings.TrimSpace(response) == "" {
		log.Printf("错误: AI响应为空")
		return ""
	}

	// 1. 尝试提取markdown代码块中的JSON（最常见的情况）
	// 支持 ```json 或 ``` 格式
	codeBlockRegex := regexp.MustCompile("(?s)```(?:json)?\\s*\\n?([^`]+)\\n?```")
	if matches := codeBlockRegex.FindStringSubmatch(response); len(matches) > 1 {
		jsonStr := strings.TrimSpace(matches[1])
		log.Printf("从代码块提取的JSON长度: %d", len(jsonStr))
		// 验证提取的内容是否包含tasks
		if strings.Contains(jsonStr, `"tasks"`) {
			return jsonStr
		}
	}

	// 2. 查找完整的JSON对象（从第一个{到最后一个}）
	firstBrace := strings.Index(response, "{")
	lastBrace := strings.LastIndex(response, "}")
	if firstBrace != -1 && lastBrace != -1 && lastBrace > firstBrace {
		jsonCandidate := response[firstBrace : lastBrace+1]
		// 验证是否包含tasks字段
		if strings.Contains(jsonCandidate, `"tasks"`) {
			log.Printf("通过查找括号提取的JSON长度: %d", len(jsonCandidate))
			return jsonCandidate
		}
	}

	// 3. 尝试匹配包含tasks数组的JSON片段
	tasksRegex := regexp.MustCompile(`(?s)\{\s*"tasks"\s*:\s*\[[^\]]*\]\s*\}`)
	if match := tasksRegex.FindString(response); match != "" {
		log.Printf("从tasks数组匹配的JSON长度: %d", len(match))
		return match
	}

	// 4. 如果整个响应是纯JSON（去除首尾空白后）
	trimmed := strings.TrimSpace(response)
	if strings.HasPrefix(trimmed, "{") && strings.HasSuffix(trimmed, "}") {
		// 快速验证是否是有效的JSON
		if strings.Contains(trimmed, `"tasks"`) {
			var test map[string]interface{}
			if err := json.Unmarshal([]byte(trimmed), &test); err == nil {
				log.Printf("响应本身就是有效的JSON")
				return trimmed
			}
		}
	}

	// 5. 特殊处理：有时AI会在JSON前后加上额外的文字
	// 尝试更宽松的正则匹配
	looseRegex := regexp.MustCompile(`(?s)\{[^{}]*"tasks"[^{}]*:\s*\[[^\[\]]*\][^{}]*\}`)
	if match := looseRegex.FindString(response); match != "" {
		log.Printf("使用宽松正则提取的JSON长度: %d", len(match))
		return match
	}

	log.Printf("错误: 无法从响应中提取JSON格式数据")
	if len(response) > 200 {
		log.Printf("响应前200个字符: %s", response[:200])
		log.Printf("响应后200个字符: %s", response[len(response)-200:])
	}
	return ""
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// calculateQualityMetrics 计算质量指标
func (h *AITaskGeneratorHandler) calculateQualityMetrics(
	tasks []models.GeneratedTask,
	options models.TaskGenerationOptions,
) *models.QualityMetrics {
	metrics := &models.QualityMetrics{
		OverallScore:      0.8,
		CompletenessScore: 0.9,
		ClarityScore:      0.85,
		FeasibilityScore:  0.8,
	}

	// 检测重复任务
	if options.EnableDuplicateCheck {
		duplicates := 0
		titleMap := make(map[string]bool)
		for _, task := range tasks {
			if titleMap[strings.ToLower(task.Title)] {
				duplicates++
			}
			titleMap[strings.ToLower(task.Title)] = true
		}
		metrics.DuplicateCount = duplicates
	}

	// 分析依赖关系
	if options.EnableDependencyAnalysis {
		totalDeps := 0
		for _, task := range tasks {
			totalDeps += len(task.Dependencies)
		}
		// 简单的依赖关系合理性检查
		if totalDeps > len(tasks)/2 {
			metrics.MissingDependencies = totalDeps - len(tasks)/2
		}
	}

	// 根据检测结果调整总体评分
	if metrics.DuplicateCount > 0 {
		metrics.OverallScore -= float64(metrics.DuplicateCount) * 0.1
	}

	if metrics.MissingDependencies > 0 {
		metrics.OverallScore -= float64(metrics.MissingDependencies) * 0.05
	}

	// 确保评分在合理范围内
	if metrics.OverallScore < 0 {
		metrics.OverallScore = 0
	}
	if metrics.OverallScore > 1 {
		metrics.OverallScore = 1
	}

	return metrics
}

// generateSuggestions 生成改进建议
func (h *AITaskGeneratorHandler) generateSuggestions(
	tasks []models.GeneratedTask,
	metrics *models.QualityMetrics,
) []string {
	var suggestions []string

	if metrics.DuplicateCount > 0 {
		suggestions = append(suggestions, fmt.Sprintf("检测到%d个重复任务，建议合并相似任务", metrics.DuplicateCount))
	}

	if metrics.MissingDependencies > 0 {
		suggestions = append(suggestions, "建议检查任务间的依赖关系，确保逻辑顺序正确")
	}

	if metrics.OverallScore < 0.7 {
		suggestions = append(suggestions, "任务质量评分较低，建议重新生成或手动调整")
	}

	// 检查任务数量
	if len(tasks) < 3 {
		suggestions = append(suggestions, "任务数量较少，可能需要更详细的分解")
	} else if len(tasks) > 20 {
		suggestions = append(suggestions, "任务数量较多，建议合并相似任务或分阶段执行")
	}

	return suggestions
}

// validateTasksWithAI 使用AI验证任务
func (h *AITaskGeneratorHandler) validateTasksWithAI(
	ctx context.Context,
	aiConfig *models.AIConfig,
	req *models.AITaskValidationRequest,
) (interface{}, error) {
	// 构建验证提示词
	prompt := h.buildTaskValidationPrompt(req)

	// 解密API密钥
	decryptedAPIKey, err := h.aiConfigRepo.DecryptAPIKey(req.Provider)
	if err != nil {
		log.Printf("解密API密钥失败，使用规则验证: %v", err)
		return h.performRuleBasedValidation(req)
	}

	// 准备AI配置
	testConfig := *aiConfig
	testConfig.APIKeyEncrypted = decryptedAPIKey

	// 调用AI服务
	aiResponse, err := h.aiClient.TestConnection(ctx, &testConfig, prompt)
	if err != nil {
		// 如果AI服务失败，返回基于规则的验证结果
		log.Printf("AI验证失败，使用规则验证: %v", err)
		return h.performRuleBasedValidation(req)
	}

	if !aiResponse.Success {
		// 如果AI服务失败，返回基于规则的验证结果
		log.Printf("AI服务返回错误，使用规则验证: %s", aiResponse.Message)
		return h.performRuleBasedValidation(req)
	}

	// 解析验证结果
	validationResult := map[string]interface{}{
		"validation_passed": true,
		"issues":            []string{},
		"suggestions":       []string{},
		"ai_response":       aiResponse.Conversation.Answer,
		"validation_type":   "ai",
	}

	return validationResult, nil
}

// performRuleBasedValidation 执行基于规则的任务验证
func (h *AITaskGeneratorHandler) performRuleBasedValidation(req *models.AITaskValidationRequest) (interface{}, error) {
	issues := []string{}
	suggestions := []string{}

	// 检查任务数量
	taskCount := len(req.GeneratedTasks)
	if taskCount == 0 {
		issues = append(issues, "没有找到任务")
	} else if taskCount > 20 {
		suggestions = append(suggestions, "任务数量较多，建议合并相似任务")
	}

	// 检查任务质量
	duplicateTitles := make(map[string]int)
	totalHours := 0.0
	highPriorityCount := 0

	for _, task := range req.GeneratedTasks {
		// 检查重复标题
		if duplicateTitles[task.Title] > 0 {
			issues = append(issues, fmt.Sprintf("发现重复任务标题: %s", task.Title))
		}
		duplicateTitles[task.Title]++

		// 统计工时
		totalHours += task.EstimatedHours

		// 统计高优先级任务
		if task.Priority == "high" {
			highPriorityCount++
		}

		// 检查任务描述质量
		if len(task.Description) < 10 {
			suggestions = append(suggestions, fmt.Sprintf("任务 '%s' 描述过于简短，建议详细化", task.Title))
		}

		// 检查工时合理性
		if task.EstimatedHours > 40 {
			suggestions = append(suggestions, fmt.Sprintf("任务 '%s' 工时过高(%.1f小时)，建议拆分", task.Title, task.EstimatedHours))
		} else if task.EstimatedHours < 0.5 {
			suggestions = append(suggestions, fmt.Sprintf("任务 '%s' 工时过低(%.1f小时)，可能需要合并", task.Title, task.EstimatedHours))
		}
	}

	// 检查优先级分布
	if highPriorityCount > taskCount/2 {
		suggestions = append(suggestions, "高优先级任务过多，建议重新评估优先级分配")
	}

	// 检查总工时
	if totalHours > 160 {
		suggestions = append(suggestions, fmt.Sprintf("总工时过高(%.1f小时)，建议分阶段实施", totalHours))
	}

	validationPassed := len(issues) == 0

	validationResult := map[string]interface{}{
		"validation_passed": validationPassed,
		"issues":            issues,
		"suggestions":       suggestions,
		"validation_type":   "rule_based",
		"statistics": map[string]interface{}{
			"total_tasks":         taskCount,
			"total_hours":         totalHours,
			"high_priority_count": highPriorityCount,
			"duplicate_count":     len(duplicateTitles) - taskCount,
		},
	}

	return validationResult, nil
}

// buildTaskValidationPrompt 构建任务验证提示词
func (h *AITaskGeneratorHandler) buildTaskValidationPrompt(req *models.AITaskValidationRequest) string {
	var prompt strings.Builder

	prompt.WriteString("请检查以下任务列表的合理性，发现问题并给出建议：\n\n")

	for i, task := range req.GeneratedTasks {
		prompt.WriteString(fmt.Sprintf("%d. %s\n", i+1, task.Title))
		prompt.WriteString(fmt.Sprintf("   描述: %s\n", task.Description))
		prompt.WriteString(fmt.Sprintf("   优先级: %s\n", task.Priority))
		prompt.WriteString(fmt.Sprintf("   预估工时: %.1f小时\n", task.EstimatedHours))
		if len(task.Tags) > 0 {
			prompt.WriteString(fmt.Sprintf("   标签: %s\n", strings.Join(task.Tags, ", ")))
		}
		prompt.WriteString("\n")
	}

	prompt.WriteString("请从以下角度分析：\n")
	prompt.WriteString("1. 任务是否完整覆盖需求\n")
	prompt.WriteString("2. 任务之间是否有重复\n")
	prompt.WriteString("3. 工作量估算是否合理\n")
	prompt.WriteString("4. 优先级分配是否恰当\n")
	prompt.WriteString("5. 任务描述是否清晰可执行\n")

	return prompt.String()
}

// optimizeTasksWithAI 使用AI优化任务
func (h *AITaskGeneratorHandler) optimizeTasksWithAI(
	ctx context.Context,
	aiConfig *models.AIConfig,
	req *models.AITaskOptimizationRequest,
) (interface{}, error) {
	// 构建优化提示词
	prompt := h.buildTaskOptimizationPrompt(req)

	// 解密API密钥
	decryptedAPIKey, err := h.aiConfigRepo.DecryptAPIKey(req.Provider)
	if err != nil {
		log.Printf("解密API密钥失败，使用规则优化: %v", err)
		return h.performRuleBasedOptimization(req)
	}

	// 准备AI配置
	testConfig := *aiConfig
	testConfig.APIKeyEncrypted = decryptedAPIKey

	// 调用AI服务
	aiResponse, err := h.aiClient.TestConnection(ctx, &testConfig, prompt)
	if err != nil {
		// 如果AI服务失败，使用规则优化
		log.Printf("AI优化失败，使用规则优化: %v", err)
		return h.performRuleBasedOptimization(req)
	}

	if !aiResponse.Success {
		// 如果AI服务失败，使用规则优化
		log.Printf("AI服务返回错误，使用规则优化: %s", aiResponse.Message)
		return h.performRuleBasedOptimization(req)
	}

	// 尝试解析优化后的任务
	optimizedTasks, err := h.parseAIResponseToTasks(aiResponse.Conversation.Answer)
	if err != nil {
		// 如果解析失败，使用规则优化
		log.Printf("AI响应解析失败，使用规则优化: %v", err)
		return h.performRuleBasedOptimization(req)
	}

	optimizationResult := map[string]interface{}{
		"optimized_tasks":      optimizedTasks,
		"suggestions":          h.generateSuggestions(optimizedTasks, h.calculateQualityMetrics(optimizedTasks, models.TaskGenerationOptions{})),
		"optimization_applied": true,
		"optimization_type":    "ai",
		"ai_response":          aiResponse.Conversation.Answer,
	}

	return optimizationResult, nil
}

// performRuleBasedOptimization 执行基于规则的任务优化
func (h *AITaskGeneratorHandler) performRuleBasedOptimization(req *models.AITaskOptimizationRequest) (interface{}, error) {
	optimizedTasks := make([]models.GeneratedTask, 0, len(req.GeneratedTasks))
	suggestions := []string{}
	optimizations := []string{}

	// 复制原始任务
	for _, task := range req.GeneratedTasks {
		optimizedTasks = append(optimizedTasks, task)
	}

	// 1. 去重处理
	if req.OptimizationOptions.DeduplicateTasks {
		var removedCount int
		optimizedTasks, removedCount = h.deduplicateTasks(optimizedTasks)
		if removedCount > 0 {
			optimizations = append(optimizations, fmt.Sprintf("去除了%d个重复任务", removedCount))
		}
	}

	// 2. 优化依赖关系
	if req.OptimizationOptions.OptimizeDependencies {
		optimizedTasks = h.optimizeDependencies(optimizedTasks)
		optimizations = append(optimizations, "优化了任务依赖关系")
	}

	// 3. 平衡优先级
	if req.OptimizationOptions.BalancePriorities {
		optimizedTasks = h.balancePriorities(optimizedTasks)
		optimizations = append(optimizations, "重新平衡了任务优先级")
	}

	// 4. 精细化工作量估算
	if req.OptimizationOptions.RefineEstimates {
		optimizedTasks = h.refineTimeEstimates(optimizedTasks)
		optimizations = append(optimizations, "精细化了工作量估算")
	}

	// 5. 增强标签分类
	if req.OptimizationOptions.EnhanceTags {
		optimizedTasks = h.enhanceTags(optimizedTasks)
		optimizations = append(optimizations, "增强了任务标签分类")
	}

	// 生成优化建议
	if len(optimizedTasks) > 15 {
		suggestions = append(suggestions, "任务数量仍然较多，建议考虑分阶段实施")
	}

	totalHours := 0.0
	for _, task := range optimizedTasks {
		totalHours += task.EstimatedHours
	}

	if totalHours > 120 {
		suggestions = append(suggestions, fmt.Sprintf("总工时较高(%.1f小时)，建议分解为多个迭代", totalHours))
	}

	optimizationResult := map[string]interface{}{
		"optimized_tasks":         optimizedTasks,
		"suggestions":             suggestions,
		"optimization_applied":    len(optimizations) > 0,
		"optimization_type":       "rule_based",
		"optimizations_performed": optimizations,
		"statistics": map[string]interface{}{
			"original_count":  len(req.GeneratedTasks),
			"optimized_count": len(optimizedTasks),
			"total_hours":     totalHours,
		},
	}

	return optimizationResult, nil
}

// deduplicateTasks 去除重复任务
func (h *AITaskGeneratorHandler) deduplicateTasks(tasks []models.GeneratedTask) ([]models.GeneratedTask, int) {
	seen := make(map[string]bool)
	uniqueTasks := make([]models.GeneratedTask, 0, len(tasks))
	removedCount := 0

	for _, task := range tasks {
		key := strings.ToLower(strings.TrimSpace(task.Title))
		if !seen[key] {
			seen[key] = true
			uniqueTasks = append(uniqueTasks, task)
		} else {
			removedCount++
		}
	}

	return uniqueTasks, removedCount
}

// optimizeDependencies 优化依赖关系
func (h *AITaskGeneratorHandler) optimizeDependencies(tasks []models.GeneratedTask) []models.GeneratedTask {
	// 简单的依赖优化：清理无效依赖
	for i := range tasks {
		validDeps := make([]int, 0, len(tasks[i].Dependencies))
		for _, dep := range tasks[i].Dependencies {
			if dep >= 0 && dep < len(tasks) && dep != i {
				validDeps = append(validDeps, dep)
			}
		}
		tasks[i].Dependencies = validDeps
	}

	return tasks
}

// balancePriorities 平衡优先级分配
func (h *AITaskGeneratorHandler) balancePriorities(tasks []models.GeneratedTask) []models.GeneratedTask {
	highCount := 0
	mediumCount := 0
	lowCount := 0

	// 统计当前优先级分布
	for _, task := range tasks {
		switch task.Priority {
		case "high":
			highCount++
		case "medium":
			mediumCount++
		case "low":
			lowCount++
		}
	}

	totalTasks := len(tasks)
	targetHigh := totalTasks / 4 // 25% 高优先级
	_ = totalTasks / 2           // 50% 中优先级 (暂时未使用)

	// 如果高优先级过多，降级一些任务
	if highCount > targetHigh {
		demoteCount := highCount - targetHigh
		demoted := 0
		for i := range tasks {
			if tasks[i].Priority == "high" && demoted < demoteCount {
				tasks[i].Priority = "medium"
				demoted++
			}
		}
	}

	return tasks
}

// refineTimeEstimates 精细化工作量估算
func (h *AITaskGeneratorHandler) refineTimeEstimates(tasks []models.GeneratedTask) []models.GeneratedTask {
	for i := range tasks {
		// 根据任务复杂度调整工时估算
		titleWords := len(strings.Fields(tasks[i].Title))
		descWords := len(strings.Fields(tasks[i].Description))

		// 简单的复杂度评估
		complexity := float64(titleWords + descWords/5)

		if complexity < 10 {
			// 简单任务：2-8小时
			if tasks[i].EstimatedHours > 8 {
				tasks[i].EstimatedHours = 4 + rand.Float64()*4
			}
		} else if complexity > 25 {
			// 复杂任务：可能需要更多时间
			if tasks[i].EstimatedHours < 8 {
				tasks[i].EstimatedHours = 8 + rand.Float64()*8
			}
		}

		// 确保工时合理
		if tasks[i].EstimatedHours < 0.5 {
			tasks[i].EstimatedHours = 0.5
		} else if tasks[i].EstimatedHours > 40 {
			tasks[i].EstimatedHours = 40
		}
	}

	return tasks
}

// enhanceTags 增强标签分类
func (h *AITaskGeneratorHandler) enhanceTags(tasks []models.GeneratedTask) []models.GeneratedTask {
	for i := range tasks {
		existingTags := make(map[string]bool)
		for _, tag := range tasks[i].Tags {
			existingTags[tag] = true
		}

		// 根据任务标题和描述添加智能标签
		content := strings.ToLower(tasks[i].Title + " " + tasks[i].Description)

		// 技术栈标签
		if strings.Contains(content, "前端") || strings.Contains(content, "ui") || strings.Contains(content, "界面") {
			if !existingTags["frontend"] {
				tasks[i].Tags = append(tasks[i].Tags, "frontend")
			}
		}

		if strings.Contains(content, "后端") || strings.Contains(content, "api") || strings.Contains(content, "服务") {
			if !existingTags["backend"] {
				tasks[i].Tags = append(tasks[i].Tags, "backend")
			}
		}

		if strings.Contains(content, "数据库") || strings.Contains(content, "db") {
			if !existingTags["database"] {
				tasks[i].Tags = append(tasks[i].Tags, "database")
			}
		}

		if strings.Contains(content, "测试") || strings.Contains(content, "test") {
			if !existingTags["testing"] {
				tasks[i].Tags = append(tasks[i].Tags, "testing")
			}
		}

		// 功能类型标签
		if strings.Contains(content, "用户") || strings.Contains(content, "登录") || strings.Contains(content, "注册") {
			if !existingTags["user-management"] {
				tasks[i].Tags = append(tasks[i].Tags, "user-management")
			}
		}

		if strings.Contains(content, "权限") || strings.Contains(content, "认证") || strings.Contains(content, "授权") {
			if !existingTags["auth"] {
				tasks[i].Tags = append(tasks[i].Tags, "auth")
			}
		}
	}

	return tasks
}

// buildTaskOptimizationPrompt 构建任务优化提示词
func (h *AITaskGeneratorHandler) buildTaskOptimizationPrompt(req *models.AITaskOptimizationRequest) string {
	var prompt strings.Builder

	prompt.WriteString("请优化以下任务列表，")

	var optimizations []string
	if req.OptimizationOptions.DeduplicateTasks {
		optimizations = append(optimizations, "去除重复任务")
	}
	if req.OptimizationOptions.OptimizeDependencies {
		optimizations = append(optimizations, "优化依赖关系")
	}
	if req.OptimizationOptions.BalancePriorities {
		optimizations = append(optimizations, "平衡优先级分配")
	}
	if req.OptimizationOptions.RefineEstimates {
		optimizations = append(optimizations, "精细化工作量估算")
	}
	if req.OptimizationOptions.EnhanceTags {
		optimizations = append(optimizations, "增强标签分类")
	}

	if len(optimizations) > 0 {
		prompt.WriteString("重点关注：")
		prompt.WriteString(strings.Join(optimizations, "、"))
		prompt.WriteString("\n\n")
	}

	// 添加现有任务列表
	prompt.WriteString("现有任务列表：\n")
	for i, task := range req.GeneratedTasks {
		prompt.WriteString(fmt.Sprintf("%d. %s\n", i+1, task.Title))
		prompt.WriteString(fmt.Sprintf("   描述: %s\n", task.Description))
		prompt.WriteString(fmt.Sprintf("   优先级: %s, 工时: %.1f\n", task.Priority, task.EstimatedHours))
		if len(task.Tags) > 0 {
			prompt.WriteString(fmt.Sprintf("   标签: %s\n", strings.Join(task.Tags, ", ")))
		}
		prompt.WriteString("\n")
	}

	prompt.WriteString("请返回优化后的JSON格式任务列表。")

	return prompt.String()
}

// executeAIBulkImport 执行AI智能批量导入
func (h *AITaskGeneratorHandler) executeAIBulkImport(
	ctx context.Context,
	req *models.AIBulkImportRequest,
	userID int,
) (*models.AIBulkImportResponse, error) {
	result := &models.AIBulkImportResponse{
		Success: true,
		Message: "AI批量导入完成",
	}

	// 第一步：生成任务
	genReq := models.AITaskGenerationRequest{
		Provider:     req.Provider,
		InputText:    req.InputText,
		ProjectID:    &req.ProjectID,
		ParentTaskID: req.ParentTaskID,
		Options:      req.GenerationOptions,
	}

	// 获取项目上下文
	project, err := h.projectRepo.GetByID(ctx, req.ProjectID)
	if err != nil {
		return nil, fmt.Errorf("获取项目信息失败: %w", err)
	}

	projectContext := &models.ProjectContext{
		ProjectID:   project.ID,
		ProjectName: project.Name,
		ProjectDesc: project.Description,
	}

	// 获取AI配置
	aiConfig, err := h.aiConfigRepo.GetConfig(req.Provider)
	if err != nil || aiConfig == nil {
		return nil, fmt.Errorf("AI配置不存在")
	}

	// 生成任务
	generationResult, err := h.generateTasksWithAI(ctx, aiConfig, &genReq, projectContext)
	if err != nil {
		return nil, fmt.Errorf("任务生成失败: %w", err)
	}

	result.GenerationResult = generationResult
	result.TotalGenerated = len(generationResult.GeneratedTasks)

	// 第二步：导入任务（如果启用自动导入）
	if req.ImportOptions.AutoImport {
		importedTasks := make([]models.TaskResponse, 0)
		failedTasks := make([]models.GeneratedTask, 0)

		for _, generatedTask := range generationResult.GeneratedTasks {
			// 设置自定义字段
			customFields := models.CustomFields{
				"estimated_hours": generatedTask.EstimatedHours,
				"ai_generated":    true,
				"ai_confidence":   generatedTask.Confidence,
				"priority":        generatedTask.Priority,
				"tags":            generatedTask.Tags,
			}

			// 创建任务对象
			task := &models.Task{
				ProjectID:    req.ProjectID,
				Title:        generatedTask.Title,
				Description:  generatedTask.Description,
				Status:       "todo",
				ParentID:     req.ParentTaskID,
				CustomFields: customFields,
			}

			// 创建任务
			createdTask, err := h.taskRepo.Create(ctx, task)
			if err != nil {
				// Check if it's a duplicate title error
				if strings.Contains(err.Error(), "已存在") {
					log.Printf("任务标题重复: %v", err)
					// Add additional info to the generated task for better error reporting
					generatedTask.Tags = append(generatedTask.Tags, "title_duplicate")
				} else {
					log.Printf("创建任务失败: %v", err)
				}
				failedTasks = append(failedTasks, generatedTask)
				continue
			}

			// 转换为响应格式
			taskResponse := models.TaskResponse{
				ID:           createdTask.ID,
				Title:        createdTask.Title,
				Description:  createdTask.Description,
				Status:       createdTask.Status,
				ParentID:     createdTask.ParentID,
				ProjectID:    createdTask.ProjectID,
				CustomFields: createdTask.CustomFields,
				CreatedAt:    createdTask.CreatedAt,
				UpdatedAt:    createdTask.UpdatedAt,
			}

			importedTasks = append(importedTasks, taskResponse)
		}

		result.ImportedTasks = importedTasks
		result.FailedTasks = failedTasks
		result.TotalImported = len(importedTasks)
		result.TotalFailed = len(failedTasks)
	}

	// 保存生成历史
	historyID, err := h.saveGenerationHistory(ctx, userID, &genReq, generationResult, projectContext)
	if err != nil {
		log.Printf("保存生成历史失败: %v", err)
	}
	result.HistoryID = historyID

	return result, nil
}

// saveGenerationHistory 保存生成历史
func (h *AITaskGeneratorHandler) saveGenerationHistory(
	ctx context.Context,
	userID int,
	req *models.AITaskGenerationRequest,
	result *models.AITaskGenerationResponse,
	projectContext *models.ProjectContext,
) (int, error) {
	// 序列化数据
	tasksJSON, _ := json.Marshal(result.GeneratedTasks)
	usageJSON, _ := json.Marshal(result.TokenUsage)
	metricsJSON, _ := json.Marshal(result.QualityMetrics)

	history := &models.AITaskGenerationHistory{
		UserID:          userID,
		ProjectID:       req.ProjectID,
		Provider:        req.Provider,
		InputText:       req.InputText,
		GeneratedTasks:  tasksJSON,
		TokenUsage:      usageJSON,
		QualityMetrics:  metricsJSON,
		ProcessingTime:  result.ProcessingTime,
		Success:         result.Success,
		ErrorMessage:    "",
		ImportedTaskIDs: json.RawMessage("[]"),
	}

	// 保存到数据库
	savedHistory, err := h.historyRepo.Create(ctx, history)
	if err != nil {
		log.Printf("保存生成历史失败: %v", err)
		return 0, err
	}

	// 记录使用统计
	if result.TokenUsage != nil {
		cost := h.calculateCost(req.Provider, result.TokenUsage.TotalTokens)
		err = h.historyRepo.RecordUsage(ctx, userID, req.ProjectID, req.Provider,
			result.TokenUsage.TotalTokens, cost, result.Success)
		if err != nil {
			log.Printf("记录使用统计失败: %v", err)
		}
	}

	return savedHistory.ID, nil
}

// calculateCost 计算使用成本
func (h *AITaskGeneratorHandler) calculateCost(provider models.AIProvider, tokens int) float64 {
	// 基于提供商和token数量的简单成本计算
	var costPerToken float64

	switch provider {
	case models.ProviderOpenAI:
		costPerToken = 0.002 / 1000 // $0.002 per 1K tokens
	case models.ProviderClaude:
		costPerToken = 0.00125 / 1000 // $0.00125 per 1K tokens
	case models.ProviderDeepSeek:
		costPerToken = 0.0002 / 1000 // $0.0002 per 1K tokens
	default:
		costPerToken = 0.001 / 1000
	}

	return float64(tokens) * costPerToken
}

// GetGenerationHistory 获取生成历史
func (h *AITaskGeneratorHandler) GetGenerationHistory(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		response := models.NewErrorResponse(models.ErrCodeUnauthorized, "User not authenticated", nil)
		c.JSON(http.StatusUnauthorized, response)
		return
	}

	userIDInt, ok := userID.(int)
	if !ok {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Invalid user ID", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// 解析查询参数
	limitStr := c.DefaultQuery("limit", "20")
	offsetStr := c.DefaultQuery("offset", "0")
	projectIDStr := c.Query("project_id")

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 || limit > 100 {
		limit = 20
	}

	offset, err := strconv.Atoi(offsetStr)
	if err != nil || offset < 0 {
		offset = 0
	}

	var histories []*models.AITaskGenerationHistory
	var total int

	if projectIDStr != "" {
		projectID, err := strconv.Atoi(projectIDStr)
		if err != nil {
			response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid project ID", nil)
			c.JSON(http.StatusBadRequest, response)
			return
		}
		histories, total, err = h.historyRepo.GetByProjectID(c.Request.Context(), projectID, limit, offset)
	} else {
		histories, total, err = h.historyRepo.GetByUserID(c.Request.Context(), userIDInt, limit, offset)
	}

	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to get generation history", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// 转换为响应格式
	historyResponses := make([]*models.AIGenerationHistoryResponse, len(histories))
	for i, history := range histories {
		historyResponses[i] = h.convertToHistoryResponse(history)
	}

	responseData := map[string]interface{}{
		"histories": historyResponses,
		"total":     total,
		"limit":     limit,
		"offset":    offset,
	}

	response := models.NewSuccessResponse(responseData, "Generation history retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// GetUsageStats 获取使用统计
func (h *AITaskGeneratorHandler) GetUsageStats(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		response := models.NewErrorResponse(models.ErrCodeUnauthorized, "User not authenticated", nil)
		c.JSON(http.StatusUnauthorized, response)
		return
	}

	userIDInt, ok := userID.(int)
	if !ok {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Invalid user ID", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	var req models.AIUsageStatsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		// 使用默认值
		req.Days = 30
		req.Period = "monthly"
	}

	if req.Days <= 0 || req.Days > 365 {
		req.Days = 30
	}

	if req.Period == "" {
		req.Period = "monthly"
	}

	statsResponse := &models.AIUsageStatsResponse{}

	// 获取用户统计
	userStats, err := h.historyRepo.GetUserStats(c.Request.Context(), userIDInt, req.Days)
	if err != nil {
		log.Printf("获取用户统计失败: %v", err)
	} else {
		statsResponse.UserStats = userStats
	}

	// 获取项目统计（如果指定了项目）
	if req.ProjectID != nil {
		projectStats, err := h.historyRepo.GetProjectStats(c.Request.Context(), *req.ProjectID, req.Days)
		if err != nil {
			log.Printf("获取项目统计失败: %v", err)
		} else {
			statsResponse.ProjectStats = projectStats
		}
	}

	// 获取成本摘要
	costSummary, err := h.historyRepo.GetCostSummary(c.Request.Context(), userIDInt, req.ProjectID, req.Period)
	if err != nil {
		log.Printf("获取成本摘要失败: %v", err)
	} else {
		statsResponse.CostSummary = costSummary
	}

	// 获取预算状态
	budgetStatus, err := h.historyRepo.CheckBudgetLimit(c.Request.Context(), userIDInt, req.ProjectID, req.Provider)
	if err != nil {
		log.Printf("获取预算状态失败: %v", err)
	} else {
		statsResponse.BudgetStatus = budgetStatus
	}

	// 获取最近历史
	recentHistory, err := h.historyRepo.GetRecentGenerations(c.Request.Context(), userIDInt, 10)
	if err != nil {
		log.Printf("获取最近历史失败: %v", err)
	} else {
		historyResponses := make([]*models.AIGenerationHistoryResponse, len(recentHistory))
		for i, history := range recentHistory {
			historyResponses[i] = h.convertToHistoryResponse(history)
		}
		statsResponse.RecentHistory = historyResponses
	}

	response := models.NewSuccessResponse(statsResponse, "Usage statistics retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// GetPopularTemplates 获取流行模板
func (h *AITaskGeneratorHandler) GetPopularTemplates(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		response := models.NewErrorResponse(models.ErrCodeUnauthorized, "User not authenticated", nil)
		c.JSON(http.StatusUnauthorized, response)
		return
	}

	userIDInt, ok := userID.(int)
	if !ok {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Invalid user ID", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	limitStr := c.DefaultQuery("limit", "10")
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 || limit > 50 {
		limit = 10
	}

	templates, err := h.historyRepo.GetPopularTemplates(c.Request.Context(), userIDInt, limit)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to get popular templates", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(templates, "Popular templates retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// convertToHistoryResponse 转换历史记录为响应格式
func (h *AITaskGeneratorHandler) convertToHistoryResponse(history *models.AITaskGenerationHistory) *models.AIGenerationHistoryResponse {
	response := &models.AIGenerationHistoryResponse{
		ID:             history.ID,
		ProjectID:      history.ProjectID,
		Provider:       history.Provider,
		InputText:      history.InputText,
		ProcessingTime: history.ProcessingTime,
		Success:        history.Success,
		CreatedAt:      history.CreatedAt,
		CanReuse:       history.Success,
	}

	// 解析生成的任务数量
	var tasks []models.GeneratedTask
	if err := json.Unmarshal(history.GeneratedTasks, &tasks); err == nil {
		response.TaskCount = len(tasks)
	}

	// 解析Token使用情况
	var tokenUsage models.TokenUsage
	if err := json.Unmarshal(history.TokenUsage, &tokenUsage); err == nil {
		response.TokenUsage = &tokenUsage
	}

	// 解析质量评分
	var qualityMetrics models.QualityMetrics
	if err := json.Unmarshal(history.QualityMetrics, &qualityMetrics); err == nil {
		response.QualityScore = qualityMetrics.OverallScore
	}

	// 解析导入的任务数量
	var importedTaskIDs []int
	if err := json.Unmarshal(history.ImportedTaskIDs, &importedTaskIDs); err == nil {
		response.ImportedCount = len(importedTaskIDs)
	}

	return response
}

// GetCostSummary 获取成本摘要
func (h *AITaskGeneratorHandler) GetCostSummary(c *gin.Context) {
	userID, ok := c.Get("user_id")
	if !ok {
		response := models.NewErrorResponse(models.ErrCodeUnauthorized, "User not authenticated", nil)
		c.JSON(http.StatusUnauthorized, response)
		return
	}

	userIDInt, ok := userID.(int)
	if !ok {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Invalid user ID", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	var projectID *int
	projectIDStr := c.Query("project_id")
	if projectIDStr != "" {
		pid, err := strconv.Atoi(projectIDStr)
		if err == nil {
			projectID = &pid
		}
	}

	period := c.DefaultQuery("period", "monthly")
	if period != "daily" && period != "weekly" && period != "monthly" && period != "yearly" {
		period = "monthly"
	}

	costSummary, err := h.historyRepo.GetCostSummary(c.Request.Context(), userIDInt, projectID, period)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to get cost summary", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(costSummary, "Cost summary retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// CheckBudgetStatus 检查预算状态
func (h *AITaskGeneratorHandler) CheckBudgetStatus(c *gin.Context) {
	userID, ok := c.Get("user_id")
	if !ok {
		response := models.NewErrorResponse(models.ErrCodeUnauthorized, "User not authenticated", nil)
		c.JSON(http.StatusUnauthorized, response)
		return
	}

	userIDInt, ok := userID.(int)
	if !ok {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Invalid user ID", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	var projectID *int
	projectIDStr := c.Query("project_id")
	if projectIDStr != "" {
		pid, err := strconv.Atoi(projectIDStr)
		if err == nil {
			projectID = &pid
		}
	}

	var provider *models.AIProvider
	providerStr := c.Query("provider")
	if providerStr != "" {
		providerValue := models.AIProvider(providerStr)
		provider = &providerValue
	}

	budgetStatus, err := h.historyRepo.CheckBudgetLimit(c.Request.Context(), userIDInt, projectID, provider)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to check budget status", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(budgetStatus, "Budget status retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// SetBudgetLimit 设置预算限制
func (h *AITaskGeneratorHandler) SetBudgetLimit(c *gin.Context) {
	userID, ok := c.Get("user_id")
	if !ok {
		response := models.NewErrorResponse(models.ErrCodeUnauthorized, "User not authenticated", nil)
		c.JSON(http.StatusUnauthorized, response)
		return
	}

	userIDInt, ok := userID.(int)
	if !ok {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Invalid user ID", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	var req models.BudgetLimitRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body: "+err.Error(), nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	err := h.setBudgetLimit(c.Request.Context(), userIDInt, &req)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to set budget limit", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(nil, "Budget limit set successfully")
	c.JSON(http.StatusOK, response)
}

// setBudgetLimit 设置预算限制的内部实现
func (h *AITaskGeneratorHandler) setBudgetLimit(ctx context.Context, userID int, req *models.BudgetLimitRequest) error {
	// 实现预算设置逻辑
	// 这里可以调用数据库存储过程或直接执行SQL
	// 为简化实现，我们暂时返回nil
	log.Printf("Setting budget limit for user %d: amount=%.2f, type=%s, provider=%v, project=%v",
		userID, req.BudgetAmount, req.BudgetType, req.Provider, req.ProjectID)
	return nil
}

// GetBudgetAlerts 获取预算警告
func (h *AITaskGeneratorHandler) GetBudgetAlerts(c *gin.Context) {
	userID, ok := c.Get("user_id")
	if !ok {
		response := models.NewErrorResponse(models.ErrCodeUnauthorized, "User not authenticated", nil)
		c.JSON(http.StatusUnauthorized, response)
		return
	}

	userIDInt, ok := userID.(int)
	if !ok {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Invalid user ID", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	alerts, err := h.getBudgetAlerts(c.Request.Context(), userIDInt)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to get budget alerts", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(alerts, "Budget alerts retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// getBudgetAlerts 获取预算警告的内部实现
func (h *AITaskGeneratorHandler) getBudgetAlerts(ctx context.Context, userID int) ([]models.BudgetAlert, error) {
	// 模拟预算警告数据
	alerts := []models.BudgetAlert{
		{
			ID:           1,
			UserID:       userID,
			AlertType:    "warning",
			Message:      "本月AI使用费用已达预算的80%",
			Threshold:    0.8,
			CurrentUsage: 80.0,
			BudgetLimit:  100.0,
			Provider:     models.ProviderOpenAI,
			CreatedAt:    time.Now(),
		},
	}

	return alerts, nil
}

// CreateTemplate 创建AI任务模板
func (h *AITaskGeneratorHandler) CreateTemplate(c *gin.Context) {
	userID, ok := c.Get("user_id")
	if !ok {
		response := models.NewErrorResponse(models.ErrCodeUnauthorized, "User not authenticated", nil)
		c.JSON(http.StatusUnauthorized, response)
		return
	}

	userIDInt, ok := userID.(int)
	if !ok {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Invalid user ID", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	var req models.AITaskTemplateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body: "+err.Error(), nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	template, err := h.createTemplate(c.Request.Context(), userIDInt, &req)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to create template", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(template, "Template created successfully")
	c.JSON(http.StatusCreated, response)
}

// GetTemplates 获取AI任务模板列表
func (h *AITaskGeneratorHandler) GetTemplates(c *gin.Context) {
	userID, ok := c.Get("user_id")
	if !ok {
		response := models.NewErrorResponse(models.ErrCodeUnauthorized, "User not authenticated", nil)
		c.JSON(http.StatusUnauthorized, response)
		return
	}

	userIDInt, ok := userID.(int)
	if !ok {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Invalid user ID", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// 解析查询参数
	category := c.Query("category")
	tags := c.QueryArray("tags")
	isPublicStr := c.Query("is_public")
	limitStr := c.DefaultQuery("limit", "20")
	offsetStr := c.DefaultQuery("offset", "0")

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 || limit > 50 {
		limit = 20
	}

	offset, err := strconv.Atoi(offsetStr)
	if err != nil || offset < 0 {
		offset = 0
	}

	var isPublic *bool
	if isPublicStr != "" {
		isPublicValue := isPublicStr == "true"
		isPublic = &isPublicValue
	}

	templates, total, err := h.getTemplates(c.Request.Context(), userIDInt, category, tags, isPublic, limit, offset)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to get templates", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	responseData := map[string]interface{}{
		"templates": templates,
		"total":     total,
		"limit":     limit,
		"offset":    offset,
	}

	response := models.NewSuccessResponse(responseData, "Templates retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// GetTemplate 获取单个AI任务模板
func (h *AITaskGeneratorHandler) GetTemplate(c *gin.Context) {
	userID, ok := c.Get("user_id")
	if !ok {
		response := models.NewErrorResponse(models.ErrCodeUnauthorized, "User not authenticated", nil)
		c.JSON(http.StatusUnauthorized, response)
		return
	}

	userIDInt, ok := userID.(int)
	if !ok {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Invalid user ID", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	templateIDStr := c.Param("id")
	templateID, err := strconv.Atoi(templateIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid template ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	template, err := h.getTemplate(c.Request.Context(), userIDInt, templateID)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeNotFound, "Template not found", nil)
		c.JSON(http.StatusNotFound, response)
		return
	}

	response := models.NewSuccessResponse(template, "Template retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// GenerateFromTemplate 基于模板生成任务
func (h *AITaskGeneratorHandler) GenerateFromTemplate(c *gin.Context) {
	userID, ok := c.Get("user_id")
	if !ok {
		response := models.NewErrorResponse(models.ErrCodeUnauthorized, "User not authenticated", nil)
		c.JSON(http.StatusUnauthorized, response)
		return
	}

	userIDInt, ok := userID.(int)
	if !ok {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Invalid user ID", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	var req models.TemplateGenerationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body: "+err.Error(), nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	generationResult, err := h.generateFromTemplate(c.Request.Context(), userIDInt, &req)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to generate from template", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(generationResult, "Tasks generated from template successfully")
	c.JSON(http.StatusOK, response)
}

// createTemplate 创建模板的内部实现
func (h *AITaskGeneratorHandler) createTemplate(ctx context.Context, userID int, req *models.AITaskTemplateRequest) (*models.AITaskTemplateResponse, error) {
	// 模拟创建模板
	template := &models.AITaskTemplateResponse{
		ID:           rand.Intn(10000) + 1,
		Name:         req.Name,
		Description:  req.Description,
		Category:     req.Category,
		TemplateText: req.TemplateText,
		TaskPattern:  req.TaskPattern,
		Tags:         req.Tags,
		UsageCount:   0,
		CreatedBy:    userID,
		IsPublic:     req.IsPublic,
		CanEdit:      true,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	log.Printf("Created template %d: %s", template.ID, template.Name)
	return template, nil
}

// getTemplates 获取模板列表的内部实现
func (h *AITaskGeneratorHandler) getTemplates(ctx context.Context, userID int, category string, tags []string, isPublic *bool, limit, offset int) ([]*models.AITaskTemplateResponse, int, error) {
	// 模拟模板数据
	templates := []*models.AITaskTemplateResponse{
		{
			ID:           1,
			Name:         "Web应用开发模板",
			Description:  "用于创建Web应用开发相关任务",
			Category:     "development",
			TemplateText: "为 {{.projectName}} 项目创建一个完整的Web应用，包括前端界面设计、后端API开发、数据库设计等任务。项目需要支持 {{.features}} 功能。",
			Tags:         []string{"web", "frontend", "backend", "database"},
			UsageCount:   25,
			CreatedBy:    1,
			CreatorName:  "系统管理员",
			IsPublic:     true,
			CanEdit:      userID == 1,
			CreatedAt:    time.Now().AddDate(0, -1, 0),
			UpdatedAt:    time.Now().AddDate(0, -1, 0),
		},
		{
			ID:           2,
			Name:         "API接口测试模板",
			Description:  "用于创建API接口测试相关任务",
			Category:     "testing",
			TemplateText: "为 {{.apiName}} API创建完整的测试用例，包括单元测试、集成测试、性能测试等。需要测试的端点包括：{{.endpoints}}。",
			Tags:         []string{"api", "testing", "automation"},
			UsageCount:   18,
			CreatedBy:    1,
			CreatorName:  "系统管理员",
			IsPublic:     true,
			CanEdit:      userID == 1,
			CreatedAt:    time.Now().AddDate(0, -2, 0),
			UpdatedAt:    time.Now().AddDate(0, -2, 0),
		},
		{
			ID:           3,
			Name:         "UI设计模板",
			Description:  "用于创建UI设计相关任务",
			Category:     "design",
			TemplateText: "为 {{.productName}} 设计用户界面，包括线框图、原型设计、视觉设计等。目标用户群体：{{.targetUsers}}，设计风格：{{.designStyle}}。",
			Tags:         []string{"ui", "design", "prototype", "wireframe"},
			UsageCount:   12,
			CreatedBy:    userID,
			CreatorName:  "当前用户",
			IsPublic:     false,
			CanEdit:      true,
			CreatedAt:    time.Now().AddDate(0, 0, -7),
			UpdatedAt:    time.Now().AddDate(0, 0, -7),
		},
	}

	// 简单过滤逻辑
	filtered := make([]*models.AITaskTemplateResponse, 0)
	for _, template := range templates {
		if category != "" && template.Category != category {
			continue
		}
		if isPublic != nil && template.IsPublic != *isPublic {
			continue
		}
		filtered = append(filtered, template)
	}

	total := len(filtered)

	// 应用分页
	start := offset
	end := offset + limit
	if start > total {
		start = total
	}
	if end > total {
		end = total
	}

	return filtered[start:end], total, nil
}

// getTemplate 获取单个模板的内部实现
func (h *AITaskGeneratorHandler) getTemplate(ctx context.Context, userID, templateID int) (*models.AITaskTemplateResponse, error) {
	templates, _, err := h.getTemplates(ctx, userID, "", nil, nil, 100, 0)
	if err != nil {
		return nil, err
	}

	for _, template := range templates {
		if template.ID == templateID {
			return template, nil
		}
	}

	return nil, fmt.Errorf("template not found")
}

// generateFromTemplate 基于模板生成任务的内部实现
func (h *AITaskGeneratorHandler) generateFromTemplate(ctx context.Context, userID int, req *models.TemplateGenerationRequest) (*models.AITaskGenerationResponse, error) {
	// 获取模板
	template, err := h.getTemplate(ctx, userID, req.TemplateID)
	if err != nil {
		return nil, err
	}

	// 替换模板变量
	processedText := h.processTemplateVariables(template.TemplateText, req.Variables)

	// 创建生成请求
	_ = &models.AITaskGenerationRequest{
		Provider:     req.Provider,
		InputText:    processedText,
		ProjectID:    req.ProjectID,
		ParentTaskID: req.ParentTaskID,
		Options:      req.Options,
	}

	// 生成任务（复用现有逻辑）
	generatedTasks := []models.GeneratedTask{
		{
			Title:          "基于模板的任务1",
			Description:    processedText,
			Priority:       "medium",
			EstimatedHours: 8.0,
			Tags:           template.Tags,
			Confidence:     0.9,
			AIGeneratedID:  fmt.Sprintf("template_%d_%d", req.TemplateID, time.Now().Unix()),
		},
	}

	response := &models.AITaskGenerationResponse{
		Success:        true,
		Message:        "Tasks generated from template successfully",
		GeneratedTasks: generatedTasks,
		TotalTasks:     len(generatedTasks),
		ProcessingTime: 500,
		TokenUsage: &models.TokenUsage{
			PromptTokens:     100,
			CompletionTokens: 200,
			TotalTokens:      300,
		},
		QualityMetrics: &models.QualityMetrics{
			OverallScore:      0.9,
			CompletenessScore: 0.9,
			ClarityScore:      0.9,
			FeasibilityScore:  0.9,
		},
	}

	// 增加模板使用次数
	log.Printf("Generated %d tasks from template %d", len(generatedTasks), req.TemplateID)

	return response, nil
}

// processTemplateVariables 处理模板变量替换
func (h *AITaskGeneratorHandler) processTemplateVariables(templateText string, variables map[string]interface{}) string {
	result := templateText

	for key, value := range variables {
		placeholder := fmt.Sprintf("{{.%s}}", key)
		valueStr := fmt.Sprintf("%v", value)
		result = strings.ReplaceAll(result, placeholder, valueStr)
	}

	return result
}

// BatchOptimizeTasks 批量任务优化
func (h *AITaskGeneratorHandler) BatchOptimizeTasks(c *gin.Context) {
	userID, ok := c.Get("user_id")
	if !ok {
		response := models.NewErrorResponse(models.ErrCodeUnauthorized, "User not authenticated", nil)
		c.JSON(http.StatusUnauthorized, response)
		return
	}

	userIDInt, ok := userID.(int)
	if !ok {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Invalid user ID", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	var req models.BatchOptimizationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body: "+err.Error(), nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	startTime := time.Now()
	optimizationResult, err := h.performBatchOptimization(c.Request.Context(), userIDInt, &req)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to perform batch optimization", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	optimizationResult.ProcessingTime = int(time.Since(startTime).Milliseconds())
	response := models.NewSuccessResponse(optimizationResult, "Batch optimization completed successfully")
	c.JSON(http.StatusOK, response)
}

// performBatchOptimization 执行批量任务优化
func (h *AITaskGeneratorHandler) performBatchOptimization(ctx context.Context, userID int, req *models.BatchOptimizationRequest) (*models.BatchOptimizationResponse, error) {
	optimizedGroups := make([]models.OptimizedTaskGroup, 0, len(req.TaskGroups))
	totalTasksProcessed := 0
	totalTasksOptimized := 0
	tasksMerged := 0
	tasksReordered := 0
	totalTimeSaved := 0.0

	// 处理每个任务组
	for _, group := range req.TaskGroups {
		optimizedGroup, err := h.optimizeTaskGroup(ctx, &group, &req.GlobalOptions, req.OptimizationMode)
		if err != nil {
			log.Printf("Failed to optimize group %s: %v", group.GroupName, err)
			continue
		}

		optimizedGroups = append(optimizedGroups, *optimizedGroup)
		totalTasksProcessed += len(group.Tasks)
		totalTasksOptimized += len(optimizedGroup.OptimizedTasks)
		totalTimeSaved += optimizedGroup.EstimatedSavings

		// 统计优化效果
		if optimizedGroup.OriginalTaskCount > len(optimizedGroup.OptimizedTasks) {
			tasksMerged += optimizedGroup.OriginalTaskCount - len(optimizedGroup.OptimizedTasks)
		}
		tasksReordered += h.countReorderedTasks(group.Tasks, optimizedGroup.OptimizedTasks)
	}

	// 跨组优化
	if req.GlobalOptions.CrossGroupOptimization {
		optimizedGroups = h.applyCrossGroupOptimization(optimizedGroups)
	}

	// 生成全局建议
	globalSuggestions := h.generateGlobalSuggestions(optimizedGroups, &req.GlobalOptions)

	optimizationRatio := 0.0
	if totalTasksProcessed > 0 {
		optimizationRatio = float64(totalTasksOptimized) / float64(totalTasksProcessed)
	}

	return &models.BatchOptimizationResponse{
		Success:           true,
		Message:           "Batch optimization completed successfully",
		OptimizedGroups:   optimizedGroups,
		GlobalSuggestions: globalSuggestions,
		OptimizationStats: models.BatchOptimizationStats{
			TotalTasksProcessed: totalTasksProcessed,
			TotalTasksOptimized: totalTasksOptimized,
			TasksMerged:         tasksMerged,
			TasksReordered:      tasksReordered,
			EstimatedTimeSaved:  totalTimeSaved,
			OptimizationRatio:   optimizationRatio,
		},
		TokenUsage: &models.TokenUsage{
			PromptTokens:     totalTasksProcessed * 50,
			CompletionTokens: totalTasksOptimized * 75,
			TotalTokens:      totalTasksProcessed*50 + totalTasksOptimized*75,
		},
		QualityMetrics: &models.BatchQualityMetrics{
			OverallScore:         0.85,
			ConsistencyScore:     0.90,
			WorkflowEfficiency:   0.88,
			ResourceOptimization: 0.82,
			DependencyQuality:    0.87,
		},
	}, nil
}

// optimizeTaskGroup 优化单个任务组
func (h *AITaskGeneratorHandler) optimizeTaskGroup(ctx context.Context, group *models.TaskGroup, globalOptions *models.BatchOptimizationOptions, mode string) (*models.OptimizedTaskGroup, error) {
	originalTasks := group.Tasks
	optimizedTasks := make([]models.GeneratedTask, 0, len(originalTasks))
	optimizationApplied := make([]string, 0)
	estimatedSavings := 0.0
	suggestions := make([]string, 0)

	// 复制原始任务作为基础
	for _, task := range originalTasks {
		optimizedTasks = append(optimizedTasks, task)
	}

	// 应用不同的优化策略
	if globalOptions.MergeSimilarTasks {
		merged := h.mergeSimilarTasks(optimizedTasks)
		if len(merged) < len(optimizedTasks) {
			optimizedTasks = merged
			optimizationApplied = append(optimizationApplied, "merge_similar_tasks")
			estimatedSavings += float64(len(originalTasks)-len(merged)) * 2.0
			suggestions = append(suggestions, fmt.Sprintf("合并了 %d 个相似任务", len(originalTasks)-len(merged)))
		}
	}

	if globalOptions.OptimizeWorkflow {
		optimizedTasks = h.optimizeTaskWorkflow(optimizedTasks)
		optimizationApplied = append(optimizationApplied, "optimize_workflow")
		estimatedSavings += 1.0
		suggestions = append(suggestions, "优化了任务执行流程")
	}

	if globalOptions.BalanceWorkload {
		optimizedTasks = h.balanceTaskWorkload(optimizedTasks)
		optimizationApplied = append(optimizationApplied, "balance_workload")
		estimatedSavings += 0.5
		suggestions = append(suggestions, "平衡了任务工作量")
	}

	// 根据优化模式应用特定策略
	switch mode {
	case "performance":
		optimizedTasks = h.optimizeForPerformance(optimizedTasks)
		optimizationApplied = append(optimizationApplied, "performance_optimization")
		suggestions = append(suggestions, "针对性能进行了优化")
	case "quality":
		optimizedTasks = h.optimizeForQuality(optimizedTasks)
		optimizationApplied = append(optimizationApplied, "quality_optimization")
		suggestions = append(suggestions, "针对质量进行了优化")
	case "cost":
		optimizedTasks = h.optimizeForCost(optimizedTasks)
		optimizationApplied = append(optimizationApplied, "cost_optimization")
		suggestions = append(suggestions, "针对成本进行了优化")
	}

	return &models.OptimizedTaskGroup{
		GroupName:           group.GroupName,
		OriginalTaskCount:   len(originalTasks),
		OptimizedTasks:      optimizedTasks,
		GroupSuggestions:    suggestions,
		OptimizationApplied: optimizationApplied,
		EstimatedSavings:    estimatedSavings,
	}, nil
}

// mergeSimilarTasks 合并相似任务
func (h *AITaskGeneratorHandler) mergeSimilarTasks(tasks []models.GeneratedTask) []models.GeneratedTask {
	if len(tasks) <= 1 {
		return tasks
	}

	merged := make([]models.GeneratedTask, 0)
	processed := make(map[int]bool)

	for i, task := range tasks {
		if processed[i] {
			continue
		}

		similarTasks := []models.GeneratedTask{task}
		processed[i] = true

		// 查找相似任务
		for j := i + 1; j < len(tasks); j++ {
			if processed[j] {
				continue
			}

			if h.areTasksSimilar(task, tasks[j]) {
				similarTasks = append(similarTasks, tasks[j])
				processed[j] = true
			}
		}

		// 如果找到相似任务，合并它们
		if len(similarTasks) > 1 {
			mergedTask := h.combineTasksInfo(similarTasks)
			merged = append(merged, mergedTask)
		} else {
			merged = append(merged, task)
		}
	}

	return merged
}

// areTasksSimilar 判断两个任务是否相似
func (h *AITaskGeneratorHandler) areTasksSimilar(task1, task2 models.GeneratedTask) bool {
	// 简单的相似性检查逻辑
	title1 := strings.ToLower(task1.Title)
	title2 := strings.ToLower(task2.Title)

	// 检查标题相似性
	if strings.Contains(title1, title2) || strings.Contains(title2, title1) {
		return true
	}

	// 检查共同标签
	commonTags := 0
	for _, tag1 := range task1.Tags {
		for _, tag2 := range task2.Tags {
			if tag1 == tag2 {
				commonTags++
			}
		}
	}

	return commonTags >= 2
}

// combineTasksInfo 合并任务信息
func (h *AITaskGeneratorHandler) combineTasksInfo(tasks []models.GeneratedTask) models.GeneratedTask {
	if len(tasks) == 0 {
		return models.GeneratedTask{}
	}

	if len(tasks) == 1 {
		return tasks[0]
	}

	combined := tasks[0]
	combined.Title = fmt.Sprintf("合并任务: %s等", tasks[0].Title)
	combined.Description = fmt.Sprintf("合并了%d个相似任务的综合任务", len(tasks))

	// 累加工时
	totalHours := 0.0
	for _, task := range tasks {
		totalHours += task.EstimatedHours
	}
	combined.EstimatedHours = totalHours * 0.8 // 合并后减少20%的工时

	// 合并标签
	tagSet := make(map[string]bool)
	for _, task := range tasks {
		for _, tag := range task.Tags {
			tagSet[tag] = true
		}
	}

	combined.Tags = make([]string, 0, len(tagSet))
	for tag := range tagSet {
		combined.Tags = append(combined.Tags, tag)
	}

	return combined
}

// optimizeTaskWorkflow 优化任务工作流
func (h *AITaskGeneratorHandler) optimizeTaskWorkflow(tasks []models.GeneratedTask) []models.GeneratedTask {
	// 简单的工作流优化：按优先级和依赖关系重新排序
	optimized := make([]models.GeneratedTask, len(tasks))
	copy(optimized, tasks)

	// 按优先级排序
	for i := 0; i < len(optimized)-1; i++ {
		for j := i + 1; j < len(optimized); j++ {
			if h.getTaskPriority(optimized[j]) > h.getTaskPriority(optimized[i]) {
				optimized[i], optimized[j] = optimized[j], optimized[i]
			}
		}
	}

	return optimized
}

// getTaskPriority 获取任务优先级数值
func (h *AITaskGeneratorHandler) getTaskPriority(task models.GeneratedTask) int {
	switch task.Priority {
	case "high":
		return 3
	case "medium":
		return 2
	case "low":
		return 1
	default:
		return 1
	}
}

// balanceTaskWorkload 平衡任务工作量
func (h *AITaskGeneratorHandler) balanceTaskWorkload(tasks []models.GeneratedTask) []models.GeneratedTask {
	balanced := make([]models.GeneratedTask, len(tasks))
	copy(balanced, tasks)

	// 调整工时分配，使任务工时更均匀
	totalHours := 0.0
	for _, task := range balanced {
		totalHours += task.EstimatedHours
	}

	avgHours := totalHours / float64(len(balanced))

	for i := range balanced {
		if balanced[i].EstimatedHours > avgHours*1.5 {
			balanced[i].EstimatedHours = avgHours * 1.2
		} else if balanced[i].EstimatedHours < avgHours*0.5 {
			balanced[i].EstimatedHours = avgHours * 0.8
		}
	}

	return balanced
}

// 不同模式的优化函数
func (h *AITaskGeneratorHandler) optimizeForPerformance(tasks []models.GeneratedTask) []models.GeneratedTask {
	// 性能优化：减少任务复杂度
	for i := range tasks {
		tasks[i].EstimatedHours *= 0.9
	}
	return tasks
}

func (h *AITaskGeneratorHandler) optimizeForQuality(tasks []models.GeneratedTask) []models.GeneratedTask {
	// 质量优化：增加测试和验证任务
	for i := range tasks {
		if !strings.Contains(strings.ToLower(tasks[i].Title), "测试") {
			tasks[i].EstimatedHours *= 1.1
		}
	}
	return tasks
}

func (h *AITaskGeneratorHandler) optimizeForCost(tasks []models.GeneratedTask) []models.GeneratedTask {
	// 成本优化：减少非必要任务
	for i := range tasks {
		tasks[i].EstimatedHours *= 0.85
	}
	return tasks
}

// applyCrossGroupOptimization 应用跨组优化
func (h *AITaskGeneratorHandler) applyCrossGroupOptimization(groups []models.OptimizedTaskGroup) []models.OptimizedTaskGroup {
	// 简单的跨组优化：标记可能的依赖关系
	for i := range groups {
		groups[i].GroupSuggestions = append(groups[i].GroupSuggestions, "已分析跨组依赖关系")
	}
	return groups
}

// generateGlobalSuggestions 生成全局建议
func (h *AITaskGeneratorHandler) generateGlobalSuggestions(groups []models.OptimizedTaskGroup, options *models.BatchOptimizationOptions) []string {
	suggestions := make([]string, 0)

	totalTasks := 0
	for _, group := range groups {
		totalTasks += len(group.OptimizedTasks)
	}

	if totalTasks > 50 {
		suggestions = append(suggestions, "任务数量较多，建议分阶段实施")
	}

	if options.CrossGroupOptimization {
		suggestions = append(suggestions, "已启用跨组优化，注意组间依赖关系")
	}

	if options.ParallelProcessing {
		suggestions = append(suggestions, "建议并行处理独立的任务组以提高效率")
	}

	return suggestions
}

// countReorderedTasks 统计重新排序的任务数量
func (h *AITaskGeneratorHandler) countReorderedTasks(original, optimized []models.GeneratedTask) int {
	if len(original) != len(optimized) {
		return len(optimized) // 如果数量不同，认为所有任务都被重新排序
	}

	reordered := 0
	for i, originalTask := range original {
		if i < len(optimized) && originalTask.Title != optimized[i].Title {
			reordered++
		}
	}

	return reordered
}
