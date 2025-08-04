package handlers

import (
	"ai-project-backend/database"
	"database/sql"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// ProjectStatsHandler handles project statistics operations
type ProjectStatsHandler struct {
	db database.DB
}

// NewProjectStatsHandler creates a new project stats handler
func NewProjectStatsHandler(db database.DB) *ProjectStatsHandler {
	return &ProjectStatsHandler{db: db}
}

// ProjectStats represents the statistics for a single project
type ProjectStats struct {
	TaskCount          int     `json:"task_count"`
	CompletedTaskCount int     `json:"completed_task_count"`
	UserCount          int     `json:"user_count"`
	Progress           float64 `json:"progress"`
}

// GetProjectStats handles GET /api/v1/projects/:id/stats
func (h *ProjectStatsHandler) GetProjectStats(c *gin.Context) {
	// Parse project ID from URL parameter
	projectIDStr := c.Param("id")
	projectID, err := strconv.Atoi(projectIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid project ID",
		})
		return
	}

	// Get database connection
	dbConn := h.db.GetDB().(*sql.DB)

	// Check if project exists
	var projectExists bool
	checkProjectQuery := `SELECT EXISTS(SELECT 1 FROM projects WHERE id = $1 AND deleted_at IS NULL)`
	err = dbConn.QueryRow(checkProjectQuery, projectID).Scan(&projectExists)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to check project existence",
		})
		return
	}

	if !projectExists {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Project not found",
		})
		return
	}

	// Get project statistics
	stats, err := h.getProjectStatistics(dbConn, projectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to get project statistics",
		})
		return
	}

	c.JSON(http.StatusOK, stats)
}

// getProjectStatistics retrieves comprehensive statistics for a project
func (h *ProjectStatsHandler) getProjectStatistics(dbConn *sql.DB, projectID int) (*ProjectStats, error) {
	stats := &ProjectStats{}

	// Get task statistics
	taskStatsQuery := `
		SELECT 
			COUNT(*) as total_tasks,
			COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks
		FROM tasks 
		WHERE project_id = $1 AND deleted_at IS NULL`

	err := dbConn.QueryRow(taskStatsQuery, projectID).Scan(
		&stats.TaskCount,
		&stats.CompletedTaskCount,
	)
	if err != nil {
		return nil, err
	}

	// Calculate progress
	if stats.TaskCount > 0 {
		stats.Progress = float64(stats.CompletedTaskCount) / float64(stats.TaskCount) * 100
	} else {
		stats.Progress = 0
	}

	// Get user count (users assigned to tasks in this project)
	userCountQuery := `
		SELECT COUNT(DISTINCT t.assignee_id) 
		FROM tasks t 
		WHERE t.project_id = $1 
			AND t.assignee_id IS NOT NULL 
			AND t.deleted_at IS NULL`

	err = dbConn.QueryRow(userCountQuery, projectID).Scan(&stats.UserCount)
	if err != nil {
		return nil, err
	}

	return stats, nil
}