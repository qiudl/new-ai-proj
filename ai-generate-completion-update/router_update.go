// 在路由配置中添加新的端点

// AI配置相关路由
aiGroup := api.Group("/ai-config")
{
    // 现有路由
    aiGroup.GET("", aiConfigHandler.GetAllConfigs)
    aiGroup.GET("/:provider", aiConfigHandler.GetConfig)
    aiGroup.POST("", aiConfigHandler.CreateConfig)
    aiGroup.PUT("/:provider", aiConfigHandler.UpdateConfig)
    aiGroup.DELETE("/:provider", aiConfigHandler.DeleteConfig)
    aiGroup.POST("/:provider/toggle", aiConfigHandler.ToggleConfig)
    aiGroup.GET("/enabled", aiConfigHandler.GetEnabledConfig)
    aiGroup.GET("/stats", aiConfigHandler.GetConfigStats)
    aiGroup.POST("/test", aiConfigHandler.TestConnection)
    
    // 新增：通用AI生成端点
    aiGroup.POST("/generate", aiConfigHandler.GenerateCompletion)
}

// AI任务生成相关路由
aiTaskGroup := api.Group("/ai-tasks")
{
    // 现有路由
    aiTaskGroup.POST("/generate", aiTaskGeneratorHandler.GenerateTasks)
    aiTaskGroup.POST("/validate", aiTaskGeneratorHandler.ValidateTasks)
    aiTaskGroup.POST("/optimize", aiTaskGeneratorHandler.OptimizeTasks)
    aiTaskGroup.GET("/model-status", aiTaskGeneratorHandler.GetModelStatus)
    aiTaskGroup.POST("/projects/:id/bulk-import", aiTaskGeneratorHandler.BulkImport)
    
    // 历史和统计
    aiTaskGroup.GET("/history", aiTaskGeneratorHandler.GetGenerationHistory)
    aiTaskGroup.GET("/usage-stats", aiTaskGeneratorHandler.GetUsageStats)
    aiTaskGroup.GET("/cost-summary", aiTaskGeneratorHandler.GetCostSummary)
    aiTaskGroup.GET("/budget-status", aiTaskGeneratorHandler.CheckBudgetStatus)
    aiTaskGroup.POST("/budget-limit", aiTaskGeneratorHandler.SetBudgetLimit)
    aiTaskGroup.GET("/budget-alerts", aiTaskGeneratorHandler.GetBudgetAlerts)
    
    // 模板管理
    aiTaskGroup.POST("/templates", aiTaskGeneratorHandler.CreateTemplate)
    aiTaskGroup.GET("/templates", aiTaskGeneratorHandler.GetTemplates)
    aiTaskGroup.GET("/templates/:id", aiTaskGeneratorHandler.GetTemplate)
    aiTaskGroup.POST("/templates/generate", aiTaskGeneratorHandler.GenerateFromTemplate)
    aiTaskGroup.GET("/templates/popular", aiTaskGeneratorHandler.GetPopularTemplates)
    
    // 批量优化
    aiTaskGroup.POST("/batch-optimize", aiTaskGeneratorHandler.BatchOptimizeTasks)
}
