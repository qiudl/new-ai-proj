package routes

import (
	"database/sql"
	"fmt"
	"log"
	
	"github.com/gin-gonic/gin"
	"ai-project-backend/handlers"
	"ai-project-backend/services"
)

// RegisterDataValidationRoutes registers data validation routes with application
func RegisterDataValidationRoutes(router *gin.RouterGroup, app ApplicationInterface) {
	log.Printf("Starting data validation routes registration...")

	// Get database interface directly from app
	dbInterface := app.GetDB()
	log.Printf("Got database interface: %T", dbInterface)

	// Try to get *sql.DB directly  
	db, ok := dbInterface.GetDB().(*sql.DB)
	if !ok {
		log.Printf("Warning: Failed to get *sql.DB, got %T", dbInterface.GetDB())
		return
	}

	log.Printf("Successfully got *sql.DB connection")

	// Create validator service
	validator := services.NewTimerDataValidator(db)

	// Create handler
	handler := handlers.NewDataValidationHandler(validator)

	// Data validation routes group
	dataValidation := router.Group("/data-validation")

	{
		// GET /api/v1/data-validation/report - Get comprehensive data validation report
		dataValidation.GET("/report", handler.GetDataValidationReport)

		// GET /api/v1/data-validation/status - Get quick validation status
		dataValidation.GET("/status", handler.GetValidationStatus)

		// POST /api/v1/data-validation/run - Run data validation manually
		dataValidation.POST("/run", handler.RunDataValidation)

		// GET /api/v1/data-validation/summary - Get validation summary
		dataValidation.GET("/summary", handler.GetValidationSummary)

		// GET /api/v1/data-validation/health - Get health metrics
		dataValidation.GET("/health", handler.GetHealthMetrics)
	}

	log.Printf("Data validation routes registered successfully with %d endpoints", 5)
}

// RegisterDataValidationHandler registers the data validation handler with database services
func RegisterDataValidationHandler(app ApplicationInterface) (*handlers.DataValidationHandler, error) {
	// Type assertion for database interface
	database, ok := app.(interface {
		GetDB() interface{}
	})
	if !ok {
		return nil, fmt.Errorf("invalid database interface")
	}

	// Get the actual database connection
	dbConn, ok := database.GetDB().(*sql.DB)
	if !ok {
		return nil, fmt.Errorf("failed to get database connection")
	}

	// Create validator service
	validator := services.NewTimerDataValidator(dbConn)

	// Create and return handler
	return handlers.NewDataValidationHandler(validator), nil
}