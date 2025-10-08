package routes

import (
	"ai-project-backend/middleware"
	"ai-project-backend/security"
	"fmt"
	"log"

	"github.com/gin-gonic/gin"
)

// RegisterAIDocumentRoutes 注册AI文档生成路由
//
//go:noinline
func RegisterAIDocumentRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	fmt.Println(">>> RegisterAIDocumentRoutes CALLED <<<")
	log.Println("[ROUTES] 📝 Starting AI document routes registration...")

	// 添加测试路由
	authorized.GET("/ai-test", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "AI routes are working!"})
	})
	log.Println("[ROUTES] ✅ Test route registered: GET /api/v1/ai-test")

	// 获取AI文档处理器
	aiDocHandler := app.GetAIDocumentHandler()
	if aiDocHandler == nil {
		log.Println("[ROUTES] ❌ ERROR: GetAIDocumentHandler returned nil!")
		return
	}
	log.Printf("[ROUTES] ✅ AIDocumentHandler created successfully: %T\n", aiDocHandler)

	// 创建AI限流中间件
	var aiRateLimitMW *middleware.AIRateLimitMiddleware
	rateLimiter := app.GetAIRateLimiter()
	if rateLimiter != nil {
		aiRateLimitMW = middleware.NewAIRateLimitMiddleware(
			rateLimiter.(*security.RedisRateLimiter),
			middleware.DefaultAIRateLimitConfig(),
			app.GetJWTManager(),
		)
		log.Println("[ROUTES] ✅ AI Rate Limit Middleware initialized for documents")
	} else {
		log.Println("[ROUTES] ⚠️  AI Rate Limiting disabled (Redis not available)")
	}

	// 创建AI路由组
	ai := authorized.Group("/ai")
	log.Printf("[ROUTES] ✅ Created /ai route group under %s\n", authorized.BasePath())

	{
		// 文档类型和模板信息（不限流 - 只是查询）
		ai.GET("/document-types", aiDocHandler.GetDocumentTypeInfo)
		log.Println("[ROUTES] ✅ Registered GET /api/v1/ai/document-types")

		ai.GET("/document-templates", aiDocHandler.GetDocumentTemplates)
		log.Println("[ROUTES] ✅ Registered GET /api/v1/ai/document-templates")

		// 文档生成（限流：3次/分钟）
		docHandlers := []gin.HandlerFunc{aiDocHandler.GenerateDocument}
		if aiRateLimitMW != nil {
			docHandlers = append([]gin.HandlerFunc{aiRateLimitMW.LimitDocumentGeneration()}, docHandlers...)
		}
		ai.POST("/generate-document", docHandlers...)
		log.Println("[ROUTES] ✅ Registered POST /api/v1/ai/generate-document (with rate limit)")

		// 文档保存（不限流 - 只是保存操作）
		ai.POST("/save-document", aiDocHandler.SaveDocumentToTask)
		log.Println("[ROUTES] ✅ Registered POST /api/v1/ai/save-document")
	}

	log.Println("[ROUTES] 🎉 AI document routes registration completed!")
}
