package handlers

import (
	"database/sql"
	"net/http"
	"strconv"
	"time"

	"ai-project-backend/database"
	"ai-project-backend/models"
	"github.com/gin-gonic/gin"
	"github.com/lib/pq"
)

// ArchiveHandler handles archive-related operations
type ArchiveHandler struct {
	db database.DB
}

// NewArchiveHandler creates a new archive handler
func NewArchiveHandler(db database.DB) *ArchiveHandler {
	return &ArchiveHandler{db: db}
}

// ArchiveRequest represents the request body for archiving tasks
type ArchiveRequest struct {
	TaskIDs []int  `json:"task_ids" binding:"required"`
	Reason  string `json:"reason"`
}

// ArchiveTaskRequest represents the request body for archiving a single task
type ArchiveTaskRequest struct {
	Reason string `json:"reason"`
}

// ArchivedTask represents an archived task with additional metadata
type ArchivedTask struct {
	models.Task
	ArchivedByUsername *string `json:"archived_by_username" db:"archived_by_username"`
	ProjectName        string  `json:"project_name" db:"project_name"`
}

// ArchiveTask archives a single task
// POST /api/v1/projects/:id/tasks/:taskId/archive
func (h *ArchiveHandler) ArchiveTask(c *gin.Context) {
	projectIDStr := c.Param("id")
	taskIDStr := c.Param("taskId")

	projectID, err := strconv.Atoi(projectIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid project ID",
		})
		return
	}

	taskID, err := strconv.Atoi(taskIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid task ID",
		})
		return
	}

	var req ArchiveTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid request body",
			"error":   err.Error(),
		})
		return
	}

	// Get user ID from context (set by auth middleware)
	_, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "User not authenticated",
		})
		return
	}

	// Verify task belongs to project
	var taskProjectID int
	query := `SELECT project_id FROM tasks WHERE id = $1 AND archived_at IS NULL`
	sqlDB := h.db.GetDB().(*sql.DB)
	err = sqlDB.QueryRow(query, taskID).Scan(&taskProjectID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Task not found or already archived",
		})
		return
	}

	if taskProjectID != projectID {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Task does not belong to this project",
		})
		return
	}

	// Get user ID from context for archived_by field
	userID, _ := c.Get("user_id")
	
	// Archive the task using simple UPDATE with metadata
	archiveQuery := `UPDATE tasks SET archived_at = NOW(), archived_by = $2, archive_reason = $3, status = 'archived' WHERE id = $1 AND archived_at IS NULL`
	result, err := sqlDB.Exec(archiveQuery, taskID, userID, req.Reason)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to archive task",
			"error":   err.Error(),
		})
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil || rowsAffected == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Task could not be archived or was already archived",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Task archived successfully",
		"data": gin.H{
			"task_id":     taskID,
			"project_id":  projectID,
			"archived_at": time.Now(),
		},
	})
}

// UnarchiveTask unarchives a single task
// POST /api/v1/projects/:id/tasks/:taskId/unarchive
func (h *ArchiveHandler) UnarchiveTask(c *gin.Context) {
	projectIDStr := c.Param("id")
	taskIDStr := c.Param("taskId")

	projectID, err := strconv.Atoi(projectIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid project ID",
		})
		return
	}

	taskID, err := strconv.Atoi(taskIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid task ID",
		})
		return
	}

	// Verify task belongs to project and is archived
	var taskProjectID int
	query := `SELECT project_id FROM tasks WHERE id = $1 AND archived_at IS NOT NULL`
	sqlDB := h.db.GetDB().(*sql.DB)
	err = sqlDB.QueryRow(query, taskID).Scan(&taskProjectID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Archived task not found",
		})
		return
	}

	if taskProjectID != projectID {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Task does not belong to this project",
		})
		return
	}

	// Unarchive the task using simple UPDATE - clear all archive metadata
	unarchiveQuery := `UPDATE tasks SET archived_at = NULL, archived_by = NULL, archive_reason = NULL, status = 'todo' WHERE id = $1 AND archived_at IS NOT NULL`
	result, err := sqlDB.Exec(unarchiveQuery, taskID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to unarchive task",
			"error":   err.Error(),
		})
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil || rowsAffected == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Task could not be unarchived or was not archived",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Task unarchived successfully",
		"data": gin.H{
			"task_id":    taskID,
			"project_id": projectID,
		},
	})
}

// BulkArchiveTasks archives multiple tasks
// POST /api/v1/projects/:id/tasks/archive/bulk
func (h *ArchiveHandler) BulkArchiveTasks(c *gin.Context) {
	projectIDStr := c.Param("id")
	projectID, err := strconv.Atoi(projectIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid project ID",
		})
		return
	}

	var req ArchiveRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid request body",
			"error":   err.Error(),
		})
		return
	}

	if len(req.TaskIDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "No task IDs provided",
		})
		return
	}

	// Get user ID from context
	_, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "User not authenticated",
		})
		return
	}

	// Verify all tasks belong to the project
	verifyQuery := `
		SELECT COUNT(*) FROM tasks 
		WHERE id = ANY($1) AND project_id = $2 AND archived_at IS NULL
	`
	var validTaskCount int
	sqlDB := h.db.GetDB().(*sql.DB)
	err = sqlDB.QueryRow(verifyQuery, pq.Array(req.TaskIDs), projectID).Scan(&validTaskCount)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to verify tasks",
			"error":   err.Error(),
		})
		return
	}

	if validTaskCount != len(req.TaskIDs) {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Some tasks are invalid or already archived",
		})
		return
	}

	// Get user ID from context for archived_by field
	userID, _ := c.Get("user_id")
	
	// Archive tasks using batch UPDATE with metadata
	batchArchiveQuery := `UPDATE tasks SET archived_at = NOW(), archived_by = $2, archive_reason = $3, status = 'archived' WHERE id = ANY($1) AND archived_at IS NULL`
	result, err := sqlDB.Exec(batchArchiveQuery, pq.Array(req.TaskIDs), userID, req.Reason)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to archive tasks",
			"error":   err.Error(),
		})
		return
	}

	archivedCountInt64, err := result.RowsAffected()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to get archived count",
			"error":   err.Error(),
		})
		return
	}

	archivedCount := int(archivedCountInt64)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Tasks archived successfully",
		"data": gin.H{
			"project_id":      projectID,
			"archived_count":  archivedCount,
			"requested_count": len(req.TaskIDs),
		},
	})
}

// GetArchivedTasks gets archived tasks for a project
// GET /api/v1/projects/:id/tasks/archived
func (h *ArchiveHandler) GetArchivedTasks(c *gin.Context) {
	projectIDStr := c.Param("id")
	projectID, err := strconv.Atoi(projectIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid project ID",
		})
		return
	}

	// Parse query parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "20"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	offset := (page - 1) * pageSize

	// Get archived tasks with all archive metadata
	query := `
		SELECT 
			t.id, t.project_id, t.title, t.description, t.status,
			t.assignee_id, t.due_date, t.custom_fields, t.created_at,
			t.archived_at, t.archived_by, t.archive_reason,
			u.username as archived_by_username,
			p.name as project_name
		FROM tasks t
		JOIN projects p ON t.project_id = p.id
		LEFT JOIN users u ON t.archived_by = u.id
		WHERE t.project_id = $1 AND t.archived_at IS NOT NULL
		ORDER BY t.archived_at DESC
		LIMIT $2 OFFSET $3
	`

	sqlDB := h.db.GetDB().(*sql.DB)
	rows, err := sqlDB.Query(query, projectID, pageSize, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to fetch archived tasks",
			"error":   err.Error(),
		})
		return
	}
	defer rows.Close()

	var tasks []ArchivedTask
	for rows.Next() {
		var task ArchivedTask
		err := rows.Scan(
			&task.ID, &task.ProjectID, &task.Title, &task.Description, &task.Status,
			&task.AssigneeID, &task.DueDate, &task.CustomFields, &task.CreatedAt,
			&task.ArchivedAt, &task.ArchivedBy, &task.ArchiveReason,
			&task.ArchivedByUsername, &task.ProjectName,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "Failed to scan archived task",
				"error":   err.Error(),
			})
			return
		}
		tasks = append(tasks, task)
	}

	// Get total count
	var totalCount int
	countQuery := `
		SELECT COUNT(*) FROM tasks 
		WHERE project_id = $1 AND archived_at IS NOT NULL
	`
	err = sqlDB.QueryRow(countQuery, projectID).Scan(&totalCount)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to count archived tasks",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"tasks":       tasks,
			"total":       totalCount,
			"page":        page,
			"page_size":   pageSize,
			"total_pages": (totalCount + pageSize - 1) / pageSize,
		},
	})
}

// GetArchiveStatistics gets archive statistics for a project
// GET /api/v1/projects/:id/archive/stats
func (h *ArchiveHandler) GetArchiveStatistics(c *gin.Context) {
	projectIDStr := c.Param("id")
	projectID, err := strconv.Atoi(projectIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid project ID",
		})
		return
	}

	// Calculate statistics directly from tasks and projects tables
	query := `
		SELECT 
			p.id as project_id,
			p.name as project_name,
			COUNT(CASE WHEN t.archived_at IS NULL AND t.deleted_at IS NULL THEN 1 END) as active_tasks,
			COUNT(CASE WHEN t.archived_at IS NOT NULL THEN 1 END) as archived_tasks,
			COUNT(CASE WHEN t.deleted_at IS NULL THEN 1 END) as total_tasks
		FROM projects p
		LEFT JOIN tasks t ON p.id = t.project_id
		WHERE p.id = $1
		GROUP BY p.id, p.name
	`

	var stats struct {
		ProjectID     int    `json:"project_id" db:"project_id"`
		ProjectName   string `json:"project_name" db:"project_name"`
		ActiveTasks   int    `json:"active_tasks" db:"active_tasks"`
		ArchivedTasks int    `json:"archived_tasks" db:"archived_tasks"`
		TotalTasks    int    `json:"total_tasks" db:"total_tasks"`
	}

	sqlDB := h.db.GetDB().(*sql.DB)
	err = sqlDB.QueryRow(query, projectID).Scan(
		&stats.ProjectID, &stats.ProjectName,
		&stats.ActiveTasks, &stats.ArchivedTasks, &stats.TotalTasks,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to fetch archive statistics",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    stats,
	})
}
