package application

import (
	"ai-project-backend/config"
	"ai-project-backend/database"
	"ai-project-backend/factories"
	"ai-project-backend/utils"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

// Application holds the application dependencies
type Application struct {
	config         *config.Config
	db             database.DB
	logger         *log.Logger
	validator      *validator.Validate
	jwtManager     *utils.JWTManager
	handlers       *factories.AllHandlers
	mirrorWritable bool
}

// NewApplication creates a new application instance
func NewApplication() (*Application, error) {
	// Load configuration
	cfg, err := config.LoadConfig()
	if err != nil {
		return nil, fmt.Errorf("failed to load config: %v", err)
	}

	// Log effective DB config in development for debugging
	if cfg.IsDevelopment() {
		log.Printf("Effective DB config: host=%s port=%s db=%s user=%s sslmode=%s",
			cfg.Database.Host, cfg.Database.Port, cfg.Database.Name, cfg.Database.User, cfg.Database.SSLMode,
		)
	}

	// Initialize database
	db, err := initDB(cfg)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize database: %v", err)
	}

	// Initialize validator
	validate := validator.New()

	// Initialize JWT manager
	jwtManager := utils.NewJWTManager(
		cfg.JWT.Secret,
		cfg.JWT.Expiration,
	)

	// Initialize logger
	logger := log.New(log.Writer(), "[API] ", log.LstdFlags)

	// Initialize handlers using factory
handlerFactory := factories.NewHandlerFactory(db, logger, validate, cfg)
	allHandlers, err := handlerFactory.CreateAllHandlers()
	if err != nil {
		return nil, fmt.Errorf("failed to create handlers: %v", err)
	}

	app := &Application{
		config:     cfg,
		db:         db,
		logger:     logger,
		validator:  validate,
		jwtManager: jwtManager,
		handlers:   allHandlers,
	}

	// Perform startup permission/volume checks
	app.mirrorWritable = app.checkMirrorWritable()
	if cfg.App.MirrorEnabled && !app.mirrorWritable {
		logger.Printf("Warning: DOCS mirror is enabled but not writable at path: %s", cfg.App.MirrorBasePath)
	}

	return app, nil
}

// initDB initializes database connection
func initDB(cfg *config.Config) (database.DB, error) {
	db, err := database.NewPostgresDBWithConfig(
		cfg.GetDatabaseDSN(),
		cfg.Database.MaxOpenConns,
		cfg.Database.MaxIdleConns,
		cfg.Database.ConnMaxLifetime,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %v", err)
	}

	// Test connection
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %v", err)
	}

	log.Println("Database connected successfully")
	return db, nil
}

// Run starts the HTTP server
func (app *Application) Run() error {
	router := gin.Default()
	
	// Setup routes
	if err := app.setupRoutes(router); err != nil {
		return fmt.Errorf("failed to setup routes: %v", err)
	}

	port := "8080" // Default port
	if app.config.Server.Port != "" {
		port = app.config.Server.Port
	}
	app.logger.Printf("Server starting on port %s", port)
	
	return http.ListenAndServe(":"+port, router)
}

// Close closes database connections
func (app *Application) Close() error {
	if app.db != nil {
		return app.db.Close()
	}
	return nil
}

// GetConfig returns the application config
func (app *Application) GetConfig() *config.Config {
	return app.config
}

// GetDB returns the database instance
func (app *Application) GetDB() database.DB {
	return app.db
}

// GetJWTManager returns the JWT manager
func (app *Application) GetJWTManager() *utils.JWTManager {
	return app.jwtManager
}

// checkMirrorWritable verifies if the optional mirror base path is writable
func (app *Application) checkMirrorWritable() bool {
	cfg := app.config
	if !cfg.App.MirrorEnabled || cfg.App.MirrorBasePath == "" {
		return false
	}
	// Try to create the base directory and a temp file
	if err := os.MkdirAll(cfg.App.MirrorBasePath, 0o755); err != nil {
		app.logger.Printf("Mirror path mkdir failed: %v", err)
		return false
	}
	tmpFile := filepath.Join(cfg.App.MirrorBasePath, ".health_write_test")
	data := []byte(time.Now().UTC().Format(time.RFC3339))
	if err := os.WriteFile(tmpFile, data, 0o644); err != nil {
		app.logger.Printf("Mirror path write test failed: %v", err)
		return false
	}
	_ = os.Remove(tmpFile)
	return true
}
