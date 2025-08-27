package main

import (
	"ai-project-backend/application"
	"log"
	"os"
	"os/signal"
	"syscall"

	// _ "ai-project-backend/docs" // swagger docs
)

// @title           New AI Project API
// @version         1.0.0
// @description     RESTful API for New AI Project - Task Management System
// @description     Features:
// @description     - JWT Authentication with Google OAuth2 support
// @description     - Role-based access control (RBAC)
// @description     - Project and task management
// @description     - Real-time collaboration and commenting
// @description     - Document management with version control
// @description     - Advanced search and analytics
// @description     - Timer and progress tracking
// @termsOfService  http://example.com/terms/

// @contact.name    API Support
// @contact.url     http://example.com/support
// @contact.email   support@example.com

// @license.name    MIT
// @license.url     https://opensource.org/licenses/MIT

// @host      localhost:8080
// @BasePath  /api/v1

// @securityDefinitions.apikey  BearerAuth
// @in                          header
// @name                        Authorization
// @description                 JWT token for API authentication. Format: Bearer {token}

// @schemes   http https
// @accept    json
// @produce   json

// @tag.name Authentication
// @tag.description Authentication and authorization endpoints

// @tag.name Projects
// @tag.description Project management operations

// @tag.name Tasks  
// @tag.description Task management and tracking

// @tag.name Documents
// @tag.description Document management and collaboration

// @tag.name Timer
// @tag.description Time tracking for tasks

// @tag.name Search
// @tag.description Global search across projects and tasks

// @tag.name Users
// @tag.description User profile and management

// @tag.name Analytics
// @tag.description Analytics and reporting endpoints

func main() {
	// Create application instance
	app, err := application.NewApplication()
	if err != nil {
		log.Fatalf("Failed to create application: %v", err)
	}
	defer app.Close()

	// Setup graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	// Start server in a goroutine
	go func() {
		if err := app.Run(); err != nil {
			log.Fatalf("Server failed to start: %v", err)
		}
	}()

	// Wait for shutdown signal
	<-sigChan
	log.Println("Shutting down gracefully...")
	// Force rebuild Sun Aug 17 23:02:50 CST 2025
}
