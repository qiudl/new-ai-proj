package examples

// 这是一个示例文件，展示如何在main.go中集成统一文档系统
// 这些代码片段应该集成到实际的main.go文件中

import (
	"ai-project-backend/handlers"
	"ai-project-backend/services"
)

// 在Application结构中添加新的处理器（已完成）
/*
type Application struct {
	// ... 现有字段 ...
	taskDocumentHandler        *handlers.TaskDocumentHandler
	unifiedTaskDocumentHandler *handlers.UnifiedTaskDocumentHandler
	upgradedTaskDocumentHandler *handlers.UpgradedTaskDocumentHandler
	// ... 其他字段 ...
}
*/

// 在NewApplication函数中初始化处理器
func exampleNewApplicationIntegration() {
	/*
	// 在现有的NewApplication函数中添加以下代码：
	
	// 获取数据库连接（假设已有）
	db := // ... 现有数据库连接
	
	// 创建文档服务
	documentService := services.NewDocumentService(db)
	taskDocumentService := services.NewTaskDocumentService(db, documentService)
	
	// 创建统一文档处理器
	unifiedTaskDocumentHandler := handlers.NewUnifiedTaskDocumentHandler(taskDocumentService)
	
	// 创建升级版处理器（向后兼容）
	docsBasePath := "./docs/tasks" // 或从配置文件读取
	taskDocumentHandler := handlers.NewTaskDocumentHandler(docsBasePath) // 现有的
	upgradedTaskDocumentHandler := handlers.NewUpgradedTaskDocumentHandler(
		docsBasePath,
		taskDocumentService,
		unifiedTaskDocumentHandler,
		true,  // useUnifiedSystem - 是否默认使用统一系统
		true,  // enableAutoMigration - 是否启用自动迁移
	)
	
	return &Application{
		// ... 现有字段 ...
		taskDocumentHandler:        taskDocumentHandler,        // 保持现有兼容性
		unifiedTaskDocumentHandler: unifiedTaskDocumentHandler, // 新的统一系统
		upgradedTaskDocumentHandler: upgradedTaskDocumentHandler, // 升级版处理器
		// ... 其他字段 ...
	}, nil
	*/
}

// 在路由设置中的更改
func exampleRouteIntegration() {
	/*
	// Phase 1: 替换现有路由（向后兼容）
	projects.GET("/:id/tasks/:taskId/document", app.upgradedTaskDocumentHandler.GetTaskDocument)
	projects.PUT("/:id/tasks/:taskId/document", app.upgradedTaskDocumentHandler.SaveTaskDocument)
	projects.HEAD("/:id/tasks/:taskId/document", app.upgradedTaskDocumentHandler.CheckTaskDocument)
	
	// Phase 2: 添加新的增强API路由
	projects.GET("/:id/tasks/:taskId/document/advanced", app.unifiedTaskDocumentHandler.GetTaskDocumentAdvanced)
	projects.PATCH("/:id/tasks/:taskId/document/advanced", app.unifiedTaskDocumentHandler.UpdateTaskDocumentAdvanced)
	projects.DELETE("/:id/tasks/:taskId/document", app.unifiedTaskDocumentHandler.DeleteTaskDocument)
	
	// Phase 3: 添加任务文档管理API
	authorized.GET("/task-documents", app.unifiedTaskDocumentHandler.GetTaskDocumentList)
	authorized.GET("/task-documents/stats", app.unifiedTaskDocumentHandler.GetTaskDocumentStats)
	
	// Phase 4: 添加迁移管理API
	authorized.GET("/task-documents/migration/status", app.upgradedTaskDocumentHandler.GetMigrationStatus)
	authorized.POST("/task-documents/migration/switch", app.upgradedTaskDocumentHandler.SwitchToUnifiedSystem)
	*/
}

// 配置选项示例
type UnifiedDocumentConfig struct {
	// 是否启用统一文档系统
	EnableUnifiedSystem bool `yaml:"enable_unified_system" env:"ENABLE_UNIFIED_SYSTEM" default:"true"`
	
	// 是否启用自动迁移
	EnableAutoMigration bool `yaml:"enable_auto_migration" env:"ENABLE_AUTO_MIGRATION" default:"true"`
	
	// 文档存储路径（文件系统兼容）
	DocsBasePath string `yaml:"docs_base_path" env:"DOCS_BASE_PATH" default:"./docs/tasks"`
	
	// 批量迁移时的批次大小
	MigrationBatchSize int `yaml:"migration_batch_size" env:"MIGRATION_BATCH_SIZE" default:"50"`
	
	// 是否在启动时自动执行迁移
	AutoMigrateOnStartup bool `yaml:"auto_migrate_on_startup" env:"AUTO_MIGRATE_ON_STARTUP" default:"false"`
}

// 启动时的迁移检查示例
func exampleStartupMigrationCheck() {
	/*
	// 在main函数或应用启动时添加：
	
	if config.AutoMigrateOnStartup {
		log.Println("检查任务文档迁移状态...")
		
		// 这里可以调用迁移脚本或API
		// 例如：./scripts/migrate-task-documents.sh -v
		
		migrationStatus := checkMigrationStatus()
		if migrationStatus.NeedsMigration {
			log.Println("检测到需要迁移的文档，开始自动迁移...")
			runAutoMigration()
		}
	}
	*/
}

// 健康检查中的文档系统状态
func exampleHealthCheckIntegration() {
	/*
	// 在健康检查API中添加文档系统状态：
	
	func (app *Application) healthCheckHandler(c *gin.Context) {
		health := gin.H{
			"status": "healthy",
			"version": Version,
			"build_time": BuildTime,
			"database": "connected",
			"document_system": gin.H{
				"unified_system_enabled": app.upgradedTaskDocumentHandler != nil,
				"auto_migration_enabled": true, // 从配置读取
				"migration_status": getMigrationStatus(),
			},
		}
		
		c.JSON(http.StatusOK, health)
	}
	*/
}

// 中间件示例：文档系统路由选择
func exampleDocumentSystemMiddleware() {
	/*
	// 可选的中间件：根据请求头或查询参数选择文档系统
	
	func DocumentSystemMiddleware() gin.HandlerFunc {
		return func(c *gin.Context) {
			// 检查是否明确要求使用旧系统
			if c.GetHeader("X-Use-Legacy-System") == "true" || c.Query("legacy") == "true" {
				c.Set("use_legacy_system", true)
			}
			
			// 检查是否明确要求使用新系统
			if c.GetHeader("X-Use-Unified-System") == "true" || c.Query("unified") == "true" {
				c.Set("use_unified_system", true)
			}
			
			c.Next()
		}
	}
	
	// 在路由中使用：
	projects.Use(DocumentSystemMiddleware())
	*/
}