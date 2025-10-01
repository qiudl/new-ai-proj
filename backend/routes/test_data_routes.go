package routes

import (
	"github.com/gin-gonic/gin"
	"ai-project-backend/handlers"
	"ai-project-backend/services"
)

// RegisterTestDataRoutes registers test data generation routes
func RegisterTestDataRoutes(router *gin.RouterGroup, app ApplicationInterface) {
	// Test data routes - only available in development
	testData := router.Group("/test-data")
	
	// Initialize test data handler
	testDataGeneratorService, ok := app.GetTestDataGeneratorService().(*services.TestDataGeneratorService)
	if !ok || testDataGeneratorService == nil {
		// Skip registration if service is not available
		return
	}
	testDataHandler := handlers.NewTestDataHandler(testDataGeneratorService)
	
	{
		// Generation endpoints
		testData.POST("/", testDataHandler.GenerateTimerData)
		testData.POST("/quick-generate", testDataHandler.QuickGenerate)
		
		// Information endpoints
		testData.GET("/work-patterns", testDataHandler.GetWorkPatterns)
		testData.GET("/task-templates", testDataHandler.GetTaskTemplates)
		testData.GET("/status", testDataHandler.GetGenerationStatus)
		
		// Cleanup endpoint
		testData.POST("/cleanup", testDataHandler.CleanupTestData)
	}
}

