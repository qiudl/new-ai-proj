package application

import (
	"ai-project-backend/routes"

	"github.com/gin-gonic/gin"
)

// setupRoutes initializes all application routes
func (app *Application) setupRoutes(router *gin.Engine) error {
	// 直接使用SetupRouter来创建路由配置
	// 这样可以避免接口不匹配的问题
	*router = *routes.SetupRouter(app)
	return nil
}
