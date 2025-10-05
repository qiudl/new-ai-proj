package handlers

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"ai-project-backend/database"
	"ai-project-backend/models"
	"ai-project-backend/services"
	"ai-project-backend/utils"
	"github.com/gin-gonic/gin"
)

// AIConfigHandler AI配置处理器
type AIConfigHandler struct {
	repo               database.AIConfigRepository
	aiClient           services.AIClient
	keyRotationService *services.KeyRotationService
}

// NewAIConfigHandler 创建AI配置处理器
func NewAIConfigHandler(repo database.AIConfigRepository, keyRotationService *services.KeyRotationService) *AIConfigHandler {
	return &AIConfigHandler{
		repo:               repo,
		aiClient:           services.NewHTTPAIClient(),
		keyRotationService: keyRotationService,
	}
}

// GetAllConfigs 获取所有AI配置
func (h *AIConfigHandler) GetAllConfigs(c *gin.Context) {
	configs, err := h.repo.GetAllConfigs()
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to get AI configurations", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// 转换为响应格式
	var responses []*models.AIConfigResponse
	for _, config := range configs {
		responses = append(responses, config.ToResponse(nil))
	}

	response := models.NewSuccessResponse(responses, "AI configurations retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// GetConfig 获取指定提供商的配置
func (h *AIConfigHandler) GetConfig(c *gin.Context) {
	provider := models.AIProvider(c.Param("provider"))

	// 验证provider参数
	if provider != models.ProviderOpenAI && provider != models.ProviderClaude && provider != models.ProviderDeepSeek {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid provider", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	config, err := h.repo.GetConfig(provider)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to get AI configuration", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	if config == nil {
		response := models.NewErrorResponse(models.ErrCodeNotFound, "AI configuration not found", nil)
		c.JSON(http.StatusNotFound, response)
		return
	}

	response := models.NewSuccessResponse(config.ToResponse(nil), "AI configuration retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// CreateConfig 创建AI配置
func (h *AIConfigHandler) CreateConfig(c *gin.Context) {
	var req models.AIConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body: "+err.Error(), nil)
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

	// 检查是否已存在配置
	existingConfig, err := h.repo.GetConfig(req.Provider)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to check existing configuration", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	if existingConfig != nil {
		response := models.NewErrorResponse(models.ErrCodeConflict, "AI configuration already exists for this provider", nil)
		c.JSON(http.StatusConflict, response)
		return
	}

	// 创建配置
	config, err := h.repo.CreateConfig(&req, userIDInt)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to create AI configuration: "+err.Error(), nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(config.ToResponse(nil), "AI configuration created successfully")
	c.JSON(http.StatusCreated, response)
}

// UpdateConfig 更新AI配置
func (h *AIConfigHandler) UpdateConfig(c *gin.Context) {
	provider := models.AIProvider(c.Param("provider"))

	// 验证provider参数
	if provider != models.ProviderOpenAI && provider != models.ProviderClaude && provider != models.ProviderDeepSeek {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid provider", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	var updateReq models.AIConfigUpdateRequest
	if err := c.ShouldBindJSON(&updateReq); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body: "+err.Error(), nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// 转换为标准请求，使用URL中的provider
	req := updateReq.ToAIConfigRequest(provider)

	// 添加调试日志
	log.Printf("[AI_CONFIG] Updating config for provider: %s, apiKey empty: %v", provider, req.APIKey == "")

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

	// 更新配置
	config, err := h.repo.UpdateConfig(provider, req, userIDInt)
	if err != nil {
		log.Printf("[AI_CONFIG] Update failed for provider %s: %v", provider, err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to update AI configuration: "+err.Error(), nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(config.ToResponse(nil), "AI configuration updated successfully")
	c.JSON(http.StatusOK, response)
}

// DeleteConfig 删除AI配置
func (h *AIConfigHandler) DeleteConfig(c *gin.Context) {
	provider := models.AIProvider(c.Param("provider"))

	// 验证provider参数
	if provider != models.ProviderOpenAI && provider != models.ProviderClaude && provider != models.ProviderDeepSeek {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid provider", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	err := h.repo.DeleteConfig(provider)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to delete AI configuration: "+err.Error(), nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(nil, "AI configuration deleted successfully")
	c.JSON(http.StatusOK, response)
}

// ToggleConfig 切换配置启用状态
func (h *AIConfigHandler) ToggleConfig(c *gin.Context) {
	provider := models.AIProvider(c.Param("provider"))

	// 验证provider参数
	if provider != models.ProviderOpenAI && provider != models.ProviderClaude && provider != models.ProviderDeepSeek {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid provider", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	var req struct {
		Enabled bool `json:"enabled"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body", nil)
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

	err := h.repo.ToggleConfig(provider, req.Enabled, userIDInt)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to toggle AI configuration: "+err.Error(), nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(map[string]interface{}{
		"provider": provider,
		"enabled":  req.Enabled,
	}, "AI configuration toggled successfully")
	c.JSON(http.StatusOK, response)
}

// GetEnabledConfig 获取单个启用的配置（优先级：deepseek > claude > openai）
func (h *AIConfigHandler) GetEnabledConfig(c *gin.Context) {
	config, err := h.repo.GetEnabledConfig()
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to get enabled AI configuration", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	if config == nil {
		response := models.NewSuccessResponse(nil, "No enabled AI configuration found")
		c.JSON(http.StatusOK, response)
		return
	}

	response := models.NewSuccessResponse(config.ToResponse(nil), "Enabled AI configuration retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// GetEnabledConfigs 获取所有启用的AI配置列表（用于前端下拉框）
func (h *AIConfigHandler) GetEnabledConfigs(c *gin.Context) {
	configs, err := h.repo.GetEnabledConfigs()
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to get enabled AI configurations", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	if len(configs) == 0 {
		response := models.NewSuccessResponse([]interface{}{}, "No enabled AI configurations found")
		c.JSON(http.StatusOK, response)
		return
	}

	// 转换为响应格式
	configResponses := make([]interface{}, len(configs))
	for i, config := range configs {
		configResponses[i] = config.ToResponse(nil)
	}

	response := models.NewSuccessResponse(configResponses, "Enabled AI configurations retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// GetConfigStats 获取配置统计
func (h *AIConfigHandler) GetConfigStats(c *gin.Context) {
	stats, err := h.repo.GetConfigStats()
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to get AI configuration stats", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(stats, "AI configuration stats retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// TestConnection 测试AI连接
func (h *AIConfigHandler) TestConnection(c *gin.Context) {
	var req models.AITestRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body: "+err.Error(), nil)
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

	// 执行连接测试（使用现有的testAIConnectionHandler逻辑）
	testResult := h.performConnectionTest(&req)

	// 如果测试成功，记录测试结果
	if config, err := h.repo.GetConfig(req.Provider); err == nil && config != nil {
		h.repo.RecordTestResult(config.ID, testResult.Success, testResult.ResponseTime, testResult.Error, userIDInt)
	}

	response := models.NewSuccessResponse(testResult, "AI connection test completed")
	c.JSON(http.StatusOK, response)
}

// performConnectionTest 执行连接测试（支持真实API调用和模拟测试）
func (h *AIConfigHandler) performConnectionTest(req *models.AITestRequest) *models.AITestResponse {
	startTime := time.Now()

	// 基本格式验证
	var validationError string
	switch req.Provider {
	case models.ProviderDeepSeek:
		if req.APIKey != "" && (!utils.HasPrefix(req.APIKey, "sk-") || len(req.APIKey) < 20) {
			validationError = "DeepSeek API密钥格式错误，应以sk-开头且长度至少20位"
		}
	case models.ProviderOpenAI:
		if req.APIKey != "" && (!utils.HasPrefix(req.APIKey, "sk-") || len(req.APIKey) < 20) {
			validationError = "OpenAI API密钥格式错误，应以sk-开头且长度至少20位"
		}
	case models.ProviderClaude:
		if req.APIKey != "" && (!utils.HasPrefix(req.APIKey, "sk-ant-") || len(req.APIKey) < 30) {
			validationError = "Claude API密钥格式错误，应以sk-ant-开头且长度至少30位"
		}
	default:
		validationError = "不支持的AI提供商"
	}

	if validationError != "" {
		return &models.AITestResponse{
			Success:      false,
			Message:      validationError,
			ResponseTime: int(time.Since(startTime).Milliseconds()),
			Error:        validationError,
		}
	}

	// 获取API密钥
	apiKey := req.APIKey
	var config *models.AIConfig
	var err error

	if apiKey == "" {
		// 如果没有提供API密钥，从数据库获取配置
		config, err = h.repo.GetConfig(req.Provider)
		if err != nil {
			return &models.AITestResponse{
				Success:      false,
				Message:      "无法获取保存的配置",
				ResponseTime: int(time.Since(startTime).Milliseconds()),
				Error:        err.Error(),
			}
		}
		if config == nil {
			return &models.AITestResponse{
				Success:      false,
				Message:      "未找到该提供商的配置，请先保存配置",
				ResponseTime: int(time.Since(startTime).Milliseconds()),
				Error:        "config not found",
			}
		}

		// 从数据库获取解密的API密钥
		decryptedKey, err := h.repo.DecryptAPIKey(req.Provider)
		if err != nil {
			return &models.AITestResponse{
				Success:      false,
				Message:      "无法获取保存的API密钥",
				ResponseTime: int(time.Since(startTime).Milliseconds()),
				Error:        err.Error(),
			}
		}
		apiKey = decryptedKey
	} else {
		// 如果提供了API密钥，创建临时配置用于测试
		config = &models.AIConfig{
			Provider:    req.Provider,
			Model:       req.Model,
			BaseURL:     req.BaseURL,
			Temperature: 0.3,  // 默认值
			MaxTokens:   2000, // 默认值
		}
		// 如果有现有配置，合并设置
		if existingConfig, _ := h.repo.GetConfig(req.Provider); existingConfig != nil {
			config.Temperature = existingConfig.Temperature
			config.MaxTokens = existingConfig.MaxTokens
			if req.BaseURL == nil {
				config.BaseURL = existingConfig.BaseURL
			}
		}
	}

	// 为测试设置临时的API密钥
	config.APIKeyEncrypted = apiKey // 临时存储明文密钥用于测试

	// 检查是否为测试密钥
	isTestKey := utils.ContainsAny(apiKey, []string{"test", "demo", "mock"})
	maskedKey := apiKey
	if len(apiKey) > 8 {
		maskedKey = apiKey[:4] + "••••••••••••" + apiKey[len(apiKey)-4:]
	}
	log.Printf("[AI_CONFIG] Testing API key: %s, isTestKey: %v", maskedKey, isTestKey)

	// 生成测试问题
	testQuestion := h.getTestQuestion(req.Provider)
	if req.TestText != "" {
		testQuestion = req.TestText
	}

	// 如果是测试密钥，返回模拟响应
	if isTestKey {
		return &models.AITestResponse{
			Success:      true,
			Message:      utils.GetProviderName(string(req.Provider)) + "连接测试成功（模拟模式）",
			ResponseTime: int(time.Since(startTime).Milliseconds()) + 100,
			ModelInfo: &models.AIModelInfo{
				Name:    config.Model,
				Version: "1.0.0",
			},
			Conversation: &models.AITestConversation{
				Question: testQuestion,
				Answer:   h.getTestAnswer(req.Provider, testQuestion),
				Model:    config.Model,
				Usage: &models.AIUsageStatistics{
					PromptTokens:     10,
					CompletionTokens: 25,
					TotalTokens:      35,
				},
			},
		}
	}

	// 尝试真实的API调用
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// 设置临时解密的API密钥用于测试
	config.APIKeyEncrypted = apiKey // 临时直接存储明文密钥

	// 使用真实的AI客户端进行测试
	testResult, err := h.aiClient.TestConnection(ctx, config, testQuestion)
	if err != nil {
		return &models.AITestResponse{
			Success:      false,
			Message:      "连接测试失败: " + err.Error(),
			ResponseTime: int(time.Since(startTime).Milliseconds()),
			Error:        err.Error(),
		}
	}

	return testResult
}

// validateAPIKeyFormat 验证API密钥格式
func (h *AIConfigHandler) validateAPIKeyFormat(apiKey string, provider models.AIProvider) bool {
	switch provider {
	case models.ProviderOpenAI:
		return utils.HasPrefix(apiKey, "sk-") && len(apiKey) >= 20 // 放宽长度要求
	case models.ProviderClaude:
		return utils.HasPrefix(apiKey, "sk-ant-") && len(apiKey) >= 30 // 放宽长度要求
	case models.ProviderDeepSeek:
		return utils.HasPrefix(apiKey, "sk-") && len(apiKey) >= 20 // 放宽长度要求
	default:
		return false
	}
}

// generateEnhancedAnswer 基于问题内容生成更智能的回答
func (h *AIConfigHandler) generateEnhancedAnswer(provider models.AIProvider, question string) string {
	providerName := utils.GetProviderName(string(provider))
	lowerQuestion := strings.ToLower(question)

	// 基于问题关键词生成相关回答
	if strings.Contains(lowerQuestion, "介绍") || strings.Contains(lowerQuestion, "introduce") {
		return fmt.Sprintf("你好！我是%s开发的AI助手。我能够理解和生成自然语言，帮助您解决各种问题，包括回答问题、写作、编程、分析等任务。连接测试成功！", providerName)
	}

	if strings.Contains(lowerQuestion, "优势") || strings.Contains(lowerQuestion, "特点") || strings.Contains(lowerQuestion, "advantage") {
		advantages := map[models.AIProvider]string{
			models.ProviderOpenAI:   "OpenAI以其强大的GPT系列模型著称，在自然语言理解、创意写作和代码生成方面表现出色，具有广泛的应用场景和良好的API生态。",
			models.ProviderClaude:   "Claude专注于安全性和有用性，在长文本处理、逻辑推理和道德判断方面表现优异，特别适合需要深度分析的任务。",
			models.ProviderDeepSeek: "DeepSeek在代码理解和数学推理方面具有独特优势，特别擅长编程相关任务，同时在中文处理上有很好的表现。",
		}
		if advantage, exists := advantages[provider]; exists {
			return advantage
		}
	}

	if strings.Contains(lowerQuestion, "发展") || strings.Contains(lowerQuestion, "历史") || strings.Contains(lowerQuestion, "history") || strings.Contains(lowerQuestion, "development") {
		return "人工智能的发展经历了多个重要阶段：从1950年代的符号主义AI，到1980年代的专家系统，再到2010年代深度学习的突破，最终发展到今天的大语言模型时代。每个阶段都标志着AI能力的重大提升。"
	}

	if strings.Contains(lowerQuestion, "编程") || strings.Contains(lowerQuestion, "代码") || strings.Contains(lowerQuestion, "programming") || strings.Contains(lowerQuestion, "code") {
		return fmt.Sprintf("作为%s的AI助手，我在编程方面有很强的能力。我可以帮您编写代码、调试程序、解释算法、设计架构，支持多种编程语言包括Python、JavaScript、Go、Java等。", providerName)
	}

	// 默认回答
	return fmt.Sprintf("感谢您的提问！作为%s的AI助手，我很高兴为您提供帮助。我会尽力根据您的问题提供准确和有用的回答。连接测试成功！", providerName)
}

// getTestQuestion 获取针对不同提供商的测试问题
func (h *AIConfigHandler) getTestQuestion(provider models.AIProvider) string {
	questions := map[models.AIProvider]string{
		models.ProviderOpenAI:   "Hello! Please introduce yourself and mention your latest capabilities.",
		models.ProviderClaude:   "Hello! Please introduce yourself and mention your capabilities.",
		models.ProviderDeepSeek: "你好，请用一句话介绍DeepSeek的特点。",
	}

	if question, exists := questions[provider]; exists {
		return question
	}
	return "你好，这是一个连接测试。"
}

// getTestAnswer 获取针对不同提供商的测试答案
func (h *AIConfigHandler) getTestAnswer(provider models.AIProvider, question string) string {
	answers := map[models.AIProvider]string{
		models.ProviderOpenAI:   "Hello! I'm an AI assistant created by OpenAI. I excel at reasoning, analysis, creative tasks, coding, and complex problem-solving. My latest models like GPT-4.1 and O3 offer enhanced capabilities in logic and deep thinking. Connection test successful!",
		models.ProviderClaude:   "Hello! I'm Claude, an AI assistant created by Anthropic. I excel at analysis, reasoning, writing, coding, and creative tasks. I'm designed to be helpful, harmless, and honest. Connection test successful!",
		models.ProviderDeepSeek: "你好！我是DeepSeek开发的AI助手。DeepSeek专注于推理和编程能力，提供高质量的AI服务。连接测试成功！",
	}

	if answer, exists := answers[provider]; exists {
		return answer
	}
	return "你好！连接测试成功，AI服务运行正常。"
}

// GenerateCompletion 生成AI完成响应（专门用于任务生成）
func (h *AIConfigHandler) GenerateCompletion(c *gin.Context) {
	var req models.AICompletionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body: "+err.Error(), nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// 验证请求
	if req.Provider == "" {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Provider is required", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	if req.Prompt == "" {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Prompt is required", nil)
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

	// 获取AI配置
	config, err := h.repo.GetConfig(req.Provider)
	if err != nil || config == nil {
		response := models.NewErrorResponse(models.ErrCodeNotFound, "AI configuration not found for provider", nil)
		c.JSON(http.StatusNotFound, response)
		return
	}

	if !config.Enabled {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "AI provider is not enabled", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// 解密API密钥
	decryptedAPIKey, err := h.repo.DecryptAPIKey(req.Provider)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to decrypt API key", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// 准备AI配置用于生成
	tempConfig := *config
	tempConfig.APIKeyEncrypted = decryptedAPIKey

	// 应用请求中的覆盖参数（如果有）
	if req.Temperature != nil {
		tempConfig.Temperature = *req.Temperature
	}
	if req.MaxTokens != nil {
		tempConfig.MaxTokens = *req.MaxTokens
	}
	if req.Model != "" {
		tempConfig.Model = req.Model
	}

	// 调用AI服务生成响应
	startTime := time.Now()
	completionResult, err := h.aiClient.GenerateCompletion(c.Request.Context(), &tempConfig, req.Prompt)
	if err != nil {
		log.Printf("[AI_CONFIG] GenerateCompletion error: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to generate AI completion: "+err.Error(), nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	if !completionResult.Success {
		response := models.NewErrorResponse(models.ErrCodeInternal, "AI service returned error: "+completionResult.Error, nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// 记录使用情况
	if completionResult.Usage != nil {
		h.recordUsage(userIDInt, req.Provider, completionResult.Usage, time.Since(startTime))
	}

	// 构建响应
	responseData := models.AICompletionResponse{
		Success:      true,
		Content:      completionResult.Content,
		Model:        completionResult.Model,
		Usage:        completionResult.Usage,
		ResponseTime: int(time.Since(startTime).Milliseconds()),
		Provider:     string(req.Provider),
	}

	response := models.NewSuccessResponse(responseData, "AI completion generated successfully")
	c.JSON(http.StatusOK, response)
}

// recordUsage 记录AI使用情况
func (h *AIConfigHandler) recordUsage(userID int, provider models.AIProvider, usage *models.AIUsageStatistics, duration time.Duration) {
	// 这里可以实现使用情况记录逻辑
	// 例如：保存到数据库，更新配额等
	log.Printf("[AI_CONFIG] Usage recorded - User: %d, Provider: %s, Tokens: %d, Duration: %v",
		userID, provider, usage.TotalTokens, duration)
}

// ==================================================
// API密钥轮换相关Handler方法
// ==================================================

// RotateAPIKey 轮换API密钥
func (h *AIConfigHandler) RotateAPIKey(c *gin.Context) {
	configID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid config ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	var req models.RotateKeyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body: "+err.Error(), nil)
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

	// 执行密钥轮换
	config, err := h.keyRotationService.RotateAPIKey(configID, &req, userIDInt)
	if err != nil {
		log.Printf("[AI_CONFIG] Failed to rotate API key for config %d: %v", configID, err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to rotate API key: "+err.Error(), nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	log.Printf("[AI_CONFIG] API key rotated successfully for config %d by user %d", configID, userIDInt)
	response := models.NewSuccessResponse(config.ToResponse(nil), "API key rotated successfully")
	c.JSON(http.StatusOK, response)
}

// CheckExpiredKeys 检查过期的密钥
func (h *AIConfigHandler) CheckExpiredKeys(c *gin.Context) {
	statuses, err := h.keyRotationService.CheckExpiredKeys()
	if err != nil {
		log.Printf("[AI_CONFIG] Failed to check expired keys: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to check expired keys", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(statuses, "Expiry status retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// AutoDisableExpiredKeys 自动禁用过期的密钥
func (h *AIConfigHandler) AutoDisableExpiredKeys(c *gin.Context) {
	count, err := h.keyRotationService.AutoDisableExpiredKeys()
	if err != nil {
		log.Printf("[AI_CONFIG] Failed to auto-disable expired keys: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to disable expired keys", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	responseData := gin.H{
		"disabled_count": count,
		"message":        fmt.Sprintf("Disabled %d expired API keys", count),
	}

	log.Printf("[AI_CONFIG] Auto-disabled %d expired API keys", count)
	response := models.NewSuccessResponse(responseData, "Expired keys processed successfully")
	c.JSON(http.StatusOK, response)
}

// SendExpiryWarnings 发送过期警告
func (h *AIConfigHandler) SendExpiryWarnings(c *gin.Context) {
	count, err := h.keyRotationService.SendExpiryWarnings()
	if err != nil {
		log.Printf("[AI_CONFIG] Failed to send expiry warnings: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to send warnings", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	responseData := gin.H{
		"warning_count": count,
		"message":       fmt.Sprintf("Sent %d expiry warnings", count),
	}

	log.Printf("[AI_CONFIG] Sent %d expiry warnings", count)
	response := models.NewSuccessResponse(responseData, "Warnings sent successfully")
	c.JSON(http.StatusOK, response)
}

// GetRotationHistory 获取密钥轮换历史
func (h *AIConfigHandler) GetRotationHistory(c *gin.Context) {
	configID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid config ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	limit := 20
	if limitParam := c.Query("limit"); limitParam != "" {
		if parsedLimit, err := strconv.Atoi(limitParam); err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}

	history, err := h.keyRotationService.GetRotationHistory(configID, limit)
	if err != nil {
		log.Printf("[AI_CONFIG] Failed to get rotation history for config %d: %v", configID, err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to get rotation history", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(history, "Rotation history retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// GetExpiryNotifications 获取过期通知记录
func (h *AIConfigHandler) GetExpiryNotifications(c *gin.Context) {
	configID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid config ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	limit := 20
	if limitParam := c.Query("limit"); limitParam != "" {
		if parsedLimit, err := strconv.Atoi(limitParam); err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}

	notifications, err := h.keyRotationService.GetExpiryNotifications(configID, limit)
	if err != nil {
		log.Printf("[AI_CONFIG] Failed to get expiry notifications for config %d: %v", configID, err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to get notifications", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(notifications, "Notifications retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// SetAPIKeyExpiry 设置API密钥过期时间
func (h *AIConfigHandler) SetAPIKeyExpiry(c *gin.Context) {
	configID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid config ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	var req struct {
		ExpiryDays int `json:"expiry_days" binding:"required,min=1"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body: "+err.Error(), nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	userID, _ := c.Get("user_id")
	userIDInt, _ := userID.(int)

	err = h.keyRotationService.SetAPIKeyExpiry(configID, req.ExpiryDays, userIDInt)
	if err != nil {
		log.Printf("[AI_CONFIG] Failed to set expiry for config %d: %v", configID, err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to set expiry: "+err.Error(), nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	responseData := gin.H{
		"config_id":   configID,
		"expiry_days": req.ExpiryDays,
		"message":     fmt.Sprintf("API key will expire in %d days", req.ExpiryDays),
	}

	log.Printf("[AI_CONFIG] Set expiry for config %d to %d days", configID, req.ExpiryDays)
	response := models.NewSuccessResponse(responseData, "Expiry set successfully")
	c.JSON(http.StatusOK, response)
}

// EnableAutoRotation 启用自动轮换
func (h *AIConfigHandler) EnableAutoRotation(c *gin.Context) {
	configID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid config ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	var req struct {
		IntervalDays int `json:"interval_days" binding:"required,min=1"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body: "+err.Error(), nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	userID, _ := c.Get("user_id")
	userIDInt, _ := userID.(int)

	err = h.keyRotationService.EnableAutoRotation(configID, req.IntervalDays, userIDInt)
	if err != nil {
		log.Printf("[AI_CONFIG] Failed to enable auto rotation for config %d: %v", configID, err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to enable auto rotation: "+err.Error(), nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	responseData := gin.H{
		"config_id":     configID,
		"interval_days": req.IntervalDays,
		"message":       fmt.Sprintf("Auto rotation enabled with %d days interval", req.IntervalDays),
	}

	log.Printf("[AI_CONFIG] Enabled auto rotation for config %d with %d days interval", configID, req.IntervalDays)
	response := models.NewSuccessResponse(responseData, "Auto rotation enabled successfully")
	c.JSON(http.StatusOK, response)
}

// DisableAutoRotation 禁用自动轮换
func (h *AIConfigHandler) DisableAutoRotation(c *gin.Context) {
	configID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid config ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	userID, _ := c.Get("user_id")
	userIDInt, _ := userID.(int)

	err = h.keyRotationService.DisableAutoRotation(configID, userIDInt)
	if err != nil {
		log.Printf("[AI_CONFIG] Failed to disable auto rotation for config %d: %v", configID, err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to disable auto rotation: "+err.Error(), nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	responseData := gin.H{
		"config_id": configID,
		"message":   "Auto rotation disabled",
	}

	log.Printf("[AI_CONFIG] Disabled auto rotation for config %d", configID)
	response := models.NewSuccessResponse(responseData, "Auto rotation disabled successfully")
	c.JSON(http.StatusOK, response)
}
