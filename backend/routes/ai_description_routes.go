package routes

import (
	"ai-project-backend/middleware"
	"ai-project-backend/security"
	"fmt"
	"log"

	"github.com/gin-gonic/gin"
)

// RegisterAIDescriptionRoutes 注册AI描述生成路由
//
//go:noinline
func RegisterAIDescriptionRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	fmt.Println(">>> RegisterAIDescriptionRoutes CALLED <<<")
	log.Println("[ROUTES] 📝 Starting AI description routes registration...")

	// 获取AI描述处理器
	aiDescHandler := app.GetAIDescriptionHandler()
	if aiDescHandler == nil {
		log.Println("[ROUTES] ❌ ERROR: GetAIDescriptionHandler returned nil!")
		return
	}
	log.Printf("[ROUTES] ✅ AIDescriptionHandler created successfully: %T\n", aiDescHandler)

	// 创建AI限流中间件
	var aiRateLimitMW *middleware.AIRateLimitMiddleware
	rateLimiter := app.GetAIRateLimiter()
	if rateLimiter != nil {
		aiRateLimitMW = middleware.NewAIRateLimitMiddleware(
			rateLimiter.(*security.RedisRateLimiter),
			middleware.DefaultAIRateLimitConfig(),
			app.GetJWTManager(),
		)
		log.Println("[ROUTES] ✅ AI Rate Limit Middleware initialized")
	} else {
		log.Println("[ROUTES] ⚠️  AI Rate Limiting disabled (Redis not available)")
	}

	// 任务级别的描述生成路由
	tasks := authorized.Group("/tasks")
	{
		// 单个任务描述生成（限流：5次/分钟）
		handlers := []gin.HandlerFunc{aiDescHandler.GenerateDescription}
		if aiRateLimitMW != nil {
			handlers = append([]gin.HandlerFunc{aiRateLimitMW.LimitDescriptionGeneration()}, handlers...)
		}
		tasks.POST("/:id/ai/generate-description", handlers...)
		log.Println("[ROUTES] ✅ Registered POST /api/v1/tasks/:id/ai/generate-description (with rate limit)")

		// 更新任务描述（保存AI生成的描述 - 不限流）
		tasks.POST("/:id/ai/update-description", aiDescHandler.UpdateTaskDescription)
		log.Println("[ROUTES] ✅ Registered POST /api/v1/tasks/:id/ai/update-description")

		// 获取任务描述建议（限流：2次/分钟 - 生成3个建议）
		suggestionHandlers := []gin.HandlerFunc{aiDescHandler.GetDescriptionSuggestions}
		if aiRateLimitMW != nil {
			suggestionHandlers = append([]gin.HandlerFunc{aiRateLimitMW.LimitSuggestionGeneration()}, suggestionHandlers...)
		}
		tasks.GET("/:id/ai/description-suggestions", suggestionHandlers...)
		log.Println("[ROUTES] ✅ Registered GET /api/v1/tasks/:id/ai/description-suggestions (with rate limit)")

		// 批量生成任务描述（限流：2次/分钟）
		batchHandlers := []gin.HandlerFunc{aiDescHandler.BatchGenerateDescriptions}
		if aiRateLimitMW != nil {
			batchHandlers = append([]gin.HandlerFunc{aiRateLimitMW.LimitDescriptionBatch()}, batchHandlers...)
		}
		tasks.POST("/ai/batch-generate-descriptions", batchHandlers...)
		log.Println("[ROUTES] ✅ Registered POST /api/v1/tasks/ai/batch-generate-descriptions (with rate limit)")
	}

	log.Println("[ROUTES] 🎉 AI description routes registration completed!")
}
