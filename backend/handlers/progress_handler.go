package handlers

import (
	"ai-project-backend/database"
	"ai-project-backend/middleware"
	"ai-project-backend/services"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

// ProgressHandler handles progress calculation endpoints
type ProgressHandler struct {
	progressService *services.ProgressService
	db              database.DB
	logger          *log.Logger
	validator       *validator.Validate
}

// NewProgressHandler creates a new progress handler
func NewProgressHandler(db database.DB, logger *log.Logger, validator *validator.Validate) (*ProgressHandler, error) {
	progressService, err := services.NewProgressService(db)
	if err != nil {
		return nil, err
	}

	return &ProgressHandler{
		progressService: progressService,
		db:              db,
		logger:          logger,
		validator:       validator,
	}, nil
}

// GetProgress calculates and returns progress for an entity
// @Summary Get progress for an entity
// @Description Calculate progress for a task or project with optional breakdown and caching
// @Tags Progress
// @Accept json
// @Produce json
// @Param entityType path string true "Entity type (task, project)"
// @Param id path int true "Entity ID"
// @Param include query string false "Include additional data (children,formula,snapshots)"
// @Param useCache query bool false "Use cached result if available"
// @Success 200 {object} services.ProgressResult
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/progress/{entityType}/{id} [get]
func (h *ProgressHandler) GetProgress(c *gin.Context) {
	// Parse path parameters
	entityType := c.Param("entityType")
	idStr := c.Param("id")
	
	// Validate entity type
	if entityType != "task" && entityType != "project" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid entity type. Must be 'task' or 'project'",
		})
		return
	}
	
	// Parse entity ID
	entityID, err := strconv.Atoi(idStr)
	if err != nil || entityID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid entity ID",
		})
		return
	}
	
	// Parse query parameters
	includeStr := c.DefaultQuery("include", "")
	useCache := c.DefaultQuery("useCache", "true") == "true"
	
	// Get user context
	userContext := middleware.GetUserContext(c)
	if userContext == nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Unauthorized",
		})
		return
	}
	
	// Check permissions based on entity type
	if entityType == "task" {
		// Verify task exists and user has access
		var exists bool
		query := `
			SELECT EXISTS(
				SELECT 1 FROM tasks t
				JOIN projects p ON t.project_id = p.id
				WHERE t.id = $1 AND t.deleted_at IS NULL
			)`
		err = h.db.Get(&exists, query, entityID)
		if err != nil || !exists {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Task not found",
			})
			return
		}
	} else if entityType == "project" {
		// Verify project exists
		var exists bool
		query := `SELECT EXISTS(SELECT 1 FROM projects WHERE id = $1)`
		err = h.db.Get(&exists, query, entityID)
		if err != nil || !exists {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Project not found",
			})
			return
		}
	}
	
	// Calculate progress
	result, err := h.progressService.CalculateProgress(entityType, entityID, useCache)
	if err != nil {
		h.logger.Printf("Failed to calculate progress: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to calculate progress",
		})
		return
	}
	
	// Process include parameters
	includes := strings.Split(includeStr, ",")
	includeMap := make(map[string]bool)
	for _, inc := range includes {
		includeMap[strings.TrimSpace(inc)] = true
	}
	
	// Remove data based on include parameters
	if !includeMap["children"] && !includeMap["breakdown"] {
		result.Breakdown = nil
	}
	if !includeMap["formula"] && !includeMap["inputs"] {
		result.Inputs = nil
	}
	
	// Save snapshot if requested
	if includeMap["snapshots"] {
		_ = h.progressService.SaveSnapshot(result)
	}
	
	c.JSON(http.StatusOK, result)
}

// GetProgressSnapshots returns historical progress snapshots
// @Summary Get progress snapshots
// @Description Get historical progress snapshots for an entity within a time range
// @Tags Progress
// @Accept json
// @Produce json
// @Param entityType path string true "Entity type (task, project)"
// @Param id path int true "Entity ID"
// @Param from query string false "Start date (RFC3339)"
// @Param to query string false "End date (RFC3339)"
// @Param granularity query string false "Granularity (hourly, daily)"
// @Success 200 {array} services.ProgressResult
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/progress/{entityType}/{id}/snapshots [get]
func (h *ProgressHandler) GetProgressSnapshots(c *gin.Context) {
	// Parse path parameters
	entityType := c.Param("entityType")
	idStr := c.Param("id")
	
	// Validate entity type
	if entityType != "task" && entityType != "project" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid entity type. Must be 'task' or 'project'",
		})
		return
	}
	
	// Parse entity ID
	entityID, err := strconv.Atoi(idStr)
	if err != nil || entityID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid entity ID",
		})
		return
	}
	
	// Parse time range
	fromStr := c.DefaultQuery("from", "")
	toStr := c.DefaultQuery("to", "")
	
	var from, to time.Time
	
	// Default to last 7 days if not specified
	if fromStr == "" {
		from = time.Now().AddDate(0, 0, -7)
	} else {
		from, err = time.Parse(time.RFC3339, fromStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Invalid 'from' date format. Use RFC3339",
			})
			return
		}
	}
	
	if toStr == "" {
		to = time.Now()
	} else {
		to, err = time.Parse(time.RFC3339, toStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Invalid 'to' date format. Use RFC3339",
			})
			return
		}
	}
	
	// Validate time range
	if to.Before(from) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "'to' date must be after 'from' date",
		})
		return
	}
	
	// Get user context
	userContext := middleware.GetUserContext(c)
	if userContext == nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Unauthorized",
		})
		return
	}
	
	// Get snapshots
	snapshots, err := h.progressService.GetSnapshots(entityType, entityID, from, to)
	if err != nil {
		h.logger.Printf("Failed to get progress snapshots: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get progress snapshots",
		})
		return
	}
	
	// Return empty array if no snapshots
	if snapshots == nil {
		snapshots = []services.ProgressResult{}
	}
	
	c.JSON(http.StatusOK, snapshots)
}

// RecomputeProgress forces recalculation of progress
// @Summary Recompute progress
// @Description Force recalculation of progress for an entity and optionally its children
// @Tags Progress
// @Accept json
// @Produce json
// @Param body body RecomputeRequest true "Recompute request"
// @Success 200 {object} services.ProgressResult
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/progress/recompute [post]
func (h *ProgressHandler) RecomputeProgress(c *gin.Context) {
	var req RecomputeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request body",
		})
		return
	}
	
	// Validate request
	if err := h.validator.Struct(req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}
	
	// Get user context
	userContext := middleware.GetUserContext(c)
	if userContext == nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Unauthorized",
		})
		return
	}
	
	// Force recalculation (bypass cache)
	result, err := h.progressService.CalculateProgress(req.EntityType, req.EntityID, false)
	if err != nil {
		h.logger.Printf("Failed to recompute progress: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to recompute progress",
		})
		return
	}
	
	// Save snapshot if requested
	if req.PersistSnapshot {
		_ = h.progressService.SaveSnapshot(result)
	}
	
	// Invalidate cache for recursive updates
	if req.Recursive {
		h.invalidateProgressCache(req.EntityType, req.EntityID)
	}
	
	c.JSON(http.StatusOK, result)
}

// RecomputeRequest represents a progress recomputation request
type RecomputeRequest struct {
	EntityType      string `json:"entityType" validate:"required,oneof=task project"`
	EntityID        int    `json:"id" validate:"required,min=1"`
	Recursive       bool   `json:"recursive"`
	PersistSnapshot bool   `json:"persistSnapshot"`
}

// invalidateProgressCache invalidates cache for an entity and its parents
func (h *ProgressHandler) invalidateProgressCache(entityType string, entityID int) {
	query := `SELECT invalidate_progress_cache($1)`
	if entityType == "task" {
		_, _ = h.db.Exec(query, entityID)
	}
}

// GetProgressConfig returns the current progress configuration
// @Summary Get progress configuration
// @Description Get the current progress calculation configuration
// @Tags Progress
// @Accept json
// @Produce json
// @Success 200 {object} services.ProgressConfig
// @Failure 500 {object} map[string]string
// @Router /api/v1/progress/config [get]
func (h *ProgressHandler) GetProgressConfig(c *gin.Context) {
	query := `
		SELECT id, config_name, status_progress_map, include_cancelled, 
		       include_archived, blocked_policy, default_weight_field,
		       enable_caching, cache_ttl_seconds
		FROM progress_config
		WHERE config_name = 'default'`
	
	var config services.ProgressConfig
	var statusMapJSON []byte
	
	row := h.db.QueryRow(query)
	err := row.Scan(
		&config.ID,
		&config.ConfigName,
		&statusMapJSON,
		&config.IncludeCancelled,
		&config.IncludeArchived,
		&config.BlockedPolicy,
		&config.DefaultWeightField,
		&config.EnableCaching,
		&config.CacheTTLSeconds,
	)
	
	if err != nil {
		h.logger.Printf("Failed to get progress config: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get progress configuration",
		})
		return
	}
	
	c.JSON(http.StatusOK, config)
}
