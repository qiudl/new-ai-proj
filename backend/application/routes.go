package application

import (
	"ai-project-backend/routes"

	"github.com/gin-gonic/gin"
)

// setupRoutes initializes all application routes
func (app *Application) setupRoutes(router *gin.Engine) error {
	// Setup middleware including CORS
	routes.SetupMiddleware(router, app.config, app)
	
	// Use the existing routes setup from the routes package
	// The routes package will handle all route registration including health/version
	routes.RegisterAllRoutes(router, app)
	return nil
}