// 在 AIConfigHandler 中添加新方法

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
func (h *AIConfigHandler) recordUsage(userID int, provider AIProvider, usage *models.AIUsageStatistics, duration time.Duration) {
	// 这里可以实现使用情况记录逻辑
	// 例如：保存到数据库，更新配额等
	log.Printf("[AI_CONFIG] Usage recorded - User: %d, Provider: %s, Tokens: %d, Duration: %v",
		userID, provider, usage.TotalTokens, duration)
}
