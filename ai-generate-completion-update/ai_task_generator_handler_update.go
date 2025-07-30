// 更新 generateTasksWithAI 方法，使用 GenerateCompletion 而不是 TestConnection

// generateTasksWithAI 使用AI生成任务（更新版本）
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
	
	// 准备AI配置用于生成
	genConfig := *aiConfig
	genConfig.APIKeyEncrypted = decryptedAPIKey // 使用解密的明文密钥

	// 调用AI服务生成内容
	log.Printf("[AI_TASK_GEN] 调用AI服务，提示词长度: %d", len(prompt))
	completionResp, err := h.aiClient.GenerateCompletion(ctx, &genConfig, prompt)
	if err != nil {
		log.Printf("[AI_TASK_GEN] AI服务调用错误: %v", err)
		return nil, fmt.Errorf("AI服务调用失败: %w", err)
	}

	if !completionResp.Success {
		log.Printf("[AI_TASK_GEN] AI服务返回失败: %s", completionResp.Error)
		return nil, fmt.Errorf("AI服务返回错误: %s", completionResp.Error)
	}
	
	// 检查AI响应内容
	if completionResp.Content == "" {
		log.Printf("[AI_TASK_GEN] AI响应为空")
		return nil, fmt.Errorf("AI服务返回空响应")
	}
	
	log.Printf("[AI_TASK_GEN] AI响应长度: %d", len(completionResp.Content))

	// 解析AI响应为任务列表
	log.Printf("[AI_TASK_GEN] 解析AI响应内容: %s", completionResp.Content)
	generatedTasks, err := h.parseAIResponseToTasks(completionResp.Content)
	if err != nil {
		log.Printf("[AI_TASK_GEN] 解析AI响应失败，原始响应: %s, 错误: %v", completionResp.Content, err)
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
		TokenUsage:     completionResp.Usage,
		QualityMetrics: qualityMetrics,
		ModelInfo: &models.AIModelInfo{
			Name:     completionResp.Model,
			Version:  "1.0.0",
			Provider: string(req.Provider),
		},
		Suggestions:    h.generateSuggestions(generatedTasks, qualityMetrics),
	}

	return response, nil
}

// validateTasksWithAI 使用AI验证任务（更新版本）
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
		log.Printf("[AI_TASK_GEN] 解密API密钥失败，使用规则验证: %v", err)
		return h.performRuleBasedValidation(req)
	}
	
	// 准备AI配置
	genConfig := *aiConfig
	genConfig.APIKeyEncrypted = decryptedAPIKey

	// 调用AI服务
	completionResp, err := h.aiClient.GenerateCompletion(ctx, &genConfig, prompt)
	if err != nil {
		// 如果AI服务失败，返回基于规则的验证结果
		log.Printf("[AI_TASK_GEN] AI验证失败，使用规则验证: %v", err)
		return h.performRuleBasedValidation(req)
	}

	if !completionResp.Success {
		// 如果AI服务失败，返回基于规则的验证结果
		log.Printf("[AI_TASK_GEN] AI服务返回错误，使用规则验证: %s", completionResp.Error)
		return h.performRuleBasedValidation(req)
	}

	// 解析验证结果
	validationResult := map[string]interface{}{
		"validation_passed": true,
		"issues":           []string{},
		"suggestions":      []string{},
		"ai_response":      completionResp.Content,
		"validation_type":  "ai",
		"model_used":       completionResp.Model,
		"provider":         completionResp.Provider,
	}

	// 尝试解析AI响应中的结构化数据
	var aiValidation struct {
		ValidationPassed bool     `json:"validation_passed"`
		Issues          []string `json:"issues"`
		Suggestions     []string `json:"suggestions"`
	}
	
	if err := json.Unmarshal([]byte(completionResp.Content), &aiValidation); err == nil {
		validationResult["validation_passed"] = aiValidation.ValidationPassed
		validationResult["issues"] = aiValidation.Issues
		validationResult["suggestions"] = aiValidation.Suggestions
	}

	return validationResult, nil
}

// optimizeTasksWithAI 使用AI优化任务（更新版本）
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
		log.Printf("[AI_TASK_GEN] 解密API密钥失败，使用规则优化: %v", err)
		return h.performRuleBasedOptimization(req)
	}
	
	// 准备AI配置
	genConfig := *aiConfig
	genConfig.APIKeyEncrypted = decryptedAPIKey

	// 调用AI服务
	completionResp, err := h.aiClient.GenerateCompletion(ctx, &genConfig, prompt)
	if err != nil {
		// 如果AI服务失败，使用规则优化
		log.Printf("[AI_TASK_GEN] AI优化失败，使用规则优化: %v", err)
		return h.performRuleBasedOptimization(req)
	}

	if !completionResp.Success {
		// 如果AI服务失败，使用规则优化
		log.Printf("[AI_TASK_GEN] AI服务返回错误，使用规则优化: %s", completionResp.Error)
		return h.performRuleBasedOptimization(req)
	}

	// 尝试解析优化后的任务
	optimizedTasks, err := h.parseAIResponseToTasks(completionResp.Content)
	if err != nil {
		// 如果解析失败，使用规则优化
		log.Printf("[AI_TASK_GEN] AI响应解析失败，使用规则优化: %v", err)
		return h.performRuleBasedOptimization(req)
	}

	optimizationResult := map[string]interface{}{
		"optimized_tasks": optimizedTasks,
		"suggestions":     h.generateSuggestions(optimizedTasks, h.calculateQualityMetrics(optimizedTasks, models.TaskGenerationOptions{})),
		"optimization_applied": true,
		"optimization_type": "ai",
		"ai_response": completionResp.Content,
		"model_used": completionResp.Model,
		"provider": completionResp.Provider,
		"token_usage": completionResp.Usage,
	}

	return optimizationResult, nil
}
