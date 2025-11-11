package handlers

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"ai-project-backend/services"
	"context"
	"fmt"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
)

// MCPDevPlansHandler handles MCP-specific dev-plans document operations
// Provides simplified, Claude Code-friendly interfaces for task document sync
type MCPDevPlansHandler struct {
	db                    database.DB
	logger                *log.Logger
	devPlansExportService *services.DevPlansExportService
}

// NewMCPDevPlansHandler creates a new MCP dev-plans handler
func NewMCPDevPlansHandler(
	db database.DB,
	logger *log.Logger,
	devPlansExportService *services.DevPlansExportService,
) *MCPDevPlansHandler {
	return &MCPDevPlansHandler{
		db:                    db,
		logger:                logger,
		devPlansExportService: devPlansExportService,
	}
}

// ============================================================================
// Response Helpers
// ============================================================================

type mcpSuccessResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Message string      `json:"message,omitempty"`
}

type mcpErrorResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
}

func (h *MCPDevPlansHandler) sendMCPSuccess(c *gin.Context, data interface{}, message string) {
	c.JSON(http.StatusOK, mcpSuccessResponse{
		Success: true,
		Data:    data,
		Message: message,
	})
}

func (h *MCPDevPlansHandler) sendMCPError(c *gin.Context, statusCode int, errMsg string) {
	c.JSON(statusCode, mcpErrorResponse{
		Success: false,
		Error:   errMsg,
	})
}

// ============================================================================
// API Handlers
// ============================================================================

// ExportTaskDocumentToFile godoc
// @Summary Export task document to dev-plans file
// @Description Export a task document to a markdown file in the dev-plans directory
// @Tags MCP
// @Accept json
// @Produce json
// @Param request body ExportToFileRequest true "Export request"
// @Success 200 {object} mcpSuccessResponse
// @Failure 400 {object} mcpErrorResponse
// @Failure 500 {object} mcpErrorResponse
// @Router /mcp/documents/export-to-file [post]
func (h *MCPDevPlansHandler) ExportTaskDocumentToFile(c *gin.Context) {
	var req ExportToFileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.sendMCPError(c, http.StatusBadRequest, fmt.Sprintf("Invalid request: %v", err))
		return
	}

	// Default project_id to 1 if not provided
	if req.ProjectID == 0 {
		req.ProjectID = 1
	}

	ctx := context.Background()

	// Get task
	task, err := h.db.Tasks().GetByID(ctx, req.TaskID)
	if err != nil {
		h.sendMCPError(c, http.StatusNotFound, fmt.Sprintf("Task not found: %v", err))
		return
	}

	// Get task document via task_documents -> documents join
	var doc struct {
		Content string `db:"content"`
		Version int    `db:"version"`
	}
	query := `
		SELECT d.content, d.version
		FROM task_documents td
		JOIN documents d ON td.document_id = d.id
		WHERE td.task_id = $1 AND td.deleted_at IS NULL AND d.deleted_at IS NULL
		LIMIT 1
	`
	err = h.db.Get(&doc, query, req.TaskID)
	if err != nil {
		h.sendMCPError(c, http.StatusNotFound, fmt.Sprintf("Task document not found: %v", err))
		return
	}

	// Build TaskDocument for export service
	taskDoc := &models.TaskDocument{
		TaskID:  req.TaskID,
		Content: &doc.Content,
		Version: doc.Version,
	}

	// Export options
	exportOptions := &services.ExportOptions{
		OverwriteExisting: req.Overwrite,
	}

	// Call export service
	result, err := h.devPlansExportService.ExportTaskDocument(ctx, task, taskDoc, exportOptions)
	if err != nil {
		h.sendMCPError(c, http.StatusInternalServerError, fmt.Sprintf("Export failed: %v", err))
		return
	}

	if !result.Success {
		h.sendMCPError(c, http.StatusInternalServerError, result.Error)
		return
	}

	h.sendMCPSuccess(c, result, fmt.Sprintf("Task #%d document exported successfully", req.TaskID))
}

// ImportTaskDocumentFromFile godoc
// @Summary Import task document from dev-plans file
// @Description Import a task document from a markdown file in the dev-plans directory
// @Tags MCP
// @Accept json
// @Produce json
// @Param request body ImportFromFileRequest true "Import request"
// @Success 200 {object} mcpSuccessResponse
// @Failure 400 {object} mcpErrorResponse
// @Failure 500 {object} mcpErrorResponse
// @Router /mcp/documents/import-from-file [post]
func (h *MCPDevPlansHandler) ImportTaskDocumentFromFile(c *gin.Context) {
	var req ImportFromFileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.sendMCPError(c, http.StatusBadRequest, fmt.Sprintf("Invalid request: %v", err))
		return
	}

	// Default project_id to 1 if not provided
	if req.ProjectID == 0 {
		req.ProjectID = 1
	}

	ctx := context.Background()

	// Get task to get the title
	task, err := h.db.Tasks().GetByID(ctx, req.TaskID)
	if err != nil {
		h.sendMCPError(c, http.StatusNotFound, fmt.Sprintf("Task not found: %v", err))
		return
	}

	// Import options
	importOptions := &services.ImportOptions{
		ForceOverwrite: req.ForceOverwrite,
		UpdateIfNewer:  req.UpdateIfNewer,
	}

	// Call import service
	var result *services.ImportResult
	var parsed *services.ParsedDocument

	if req.FileName != "" {
		// Import by file name
		result, parsed, err = h.devPlansExportService.ImportTaskDocumentByFileName(ctx, req.FileName, importOptions)
	} else {
		// Import by task ID and title
		result, parsed, err = h.devPlansExportService.ImportTaskDocument(ctx, req.TaskID, task.Title, importOptions)
	}

	if err != nil {
		h.sendMCPError(c, http.StatusInternalServerError, fmt.Sprintf("Import failed: %v", err))
		return
	}

	if !result.Success {
		h.sendMCPError(c, http.StatusInternalServerError, result.Error)
		return
	}

	// Now we need to update the task document in database with the imported content
	if parsed != nil && parsed.Content != "" {
		// Check if task has a document
		var documentID int
		query := `
			SELECT d.id
			FROM task_documents td
			JOIN documents d ON td.document_id = d.id
			WHERE td.task_id = $1 AND td.deleted_at IS NULL AND d.deleted_at IS NULL
			LIMIT 1
		`
		err := h.db.Get(&documentID, query, req.TaskID)

		if err != nil {
			// No document exists, create one
			title := parsed.Title
			if title == "" {
				title = task.Title + " - Imported Document"
			}

			// Create document
			insertDocQuery := `
				INSERT INTO documents (title, content, version, project_id, created_by, created_at, updated_at)
				VALUES ($1, $2, $3, $4, 1, NOW(), NOW())
				RETURNING id
			`
			var newDocID int
			err = h.db.Get(&newDocID, insertDocQuery, title, parsed.Content, parsed.Version, req.ProjectID)
			if err != nil {
				h.logger.Printf("Warning: Failed to create document: %v", err)
			} else {
				// Link document to task
				linkQuery := `
					INSERT INTO task_documents (task_id, document_id, relationship_type, created_by)
					VALUES ($1, $2, 'main', 1)
				`
				_, err = h.db.Exec(linkQuery, req.TaskID, newDocID)
				if err != nil {
					h.logger.Printf("Warning: Failed to link document to task: %v", err)
				}
			}
		} else {
			// Update existing document
			updateQuery := `
				UPDATE documents
				SET content = $1, version = $2, updated_at = NOW()
				WHERE id = $3
			`
			_, err = h.db.Exec(updateQuery, parsed.Content, parsed.Version, documentID)
			if err != nil {
				h.logger.Printf("Warning: Failed to update document: %v", err)
			}
		}
	}

	// Prepare response data
	responseData := map[string]interface{}{
		"import_result": result,
		"parsed_data":   parsed,
	}

	h.sendMCPSuccess(c, responseData, fmt.Sprintf("Task #%d document imported successfully", req.TaskID))
}

// SyncTaskDocuments godoc
// @Summary Batch sync task documents
// @Description Synchronize task documents between database and dev-plans files (bidirectional)
// @Tags MCP
// @Accept json
// @Produce json
// @Param request body SyncDocumentsRequest true "Sync request"
// @Success 200 {object} mcpSuccessResponse
// @Failure 400 {object} mcpErrorResponse
// @Failure 500 {object} mcpErrorResponse
// @Router /mcp/documents/sync [post]
func (h *MCPDevPlansHandler) SyncTaskDocuments(c *gin.Context) {
	var req SyncDocumentsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.sendMCPError(c, http.StatusBadRequest, fmt.Sprintf("Invalid request: %v", err))
		return
	}

	// Default project_id to 1 if not provided
	if req.ProjectID == 0 {
		req.ProjectID = 1
	}

	// Default direction to 'both' if not provided
	if req.Direction == "" {
		req.Direction = "both"
	}

	ctx := context.Background()

	// Determine which tasks to sync
	var taskIDs []int
	if len(req.TaskIDs) > 0 {
		taskIDs = req.TaskIDs
	} else {
		// Get all tasks for the project
		tasks, _, err := h.db.Tasks().GetByProjectID(ctx, req.ProjectID, 1000, 0)
		if err != nil {
			h.sendMCPError(c, http.StatusInternalServerError, fmt.Sprintf("Failed to get tasks: %v", err))
			return
		}
		for _, task := range tasks {
			taskIDs = append(taskIDs, task.ID)
		}
	}

	// Statistics
	stats := struct {
		Exported int      `json:"exported"`
		Imported int      `json:"imported"`
		Failed   int      `json:"failed"`
		Errors   []string `json:"errors,omitempty"`
	}{}

	exportOptions := &services.ExportOptions{
		OverwriteExisting: req.ForceOverwrite,
	}

	importOptions := &services.ImportOptions{
		ForceOverwrite: req.ForceOverwrite,
		UpdateIfNewer:  true,
	}

	// Process each task
	for _, taskID := range taskIDs {
		// Get task
		task, err := h.db.Tasks().GetByID(ctx, taskID)
		if err != nil {
			stats.Failed++
			stats.Errors = append(stats.Errors, fmt.Sprintf("Task #%d: failed to get task: %v", taskID, err))
			continue
		}

		// Export phase
		if req.Direction == "export" || req.Direction == "both" {
			var doc struct {
				Content string `db:"content"`
				Version int    `db:"version"`
			}
			query := `
				SELECT d.content, d.version
				FROM task_documents td
				JOIN documents d ON td.document_id = d.id
				WHERE td.task_id = $1 AND td.deleted_at IS NULL AND d.deleted_at IS NULL
				LIMIT 1
			`
			err := h.db.Get(&doc, query, taskID)
			if err == nil {
				taskDoc := &models.TaskDocument{
					TaskID:  taskID,
					Content: &doc.Content,
					Version: doc.Version,
				}
				result, err := h.devPlansExportService.ExportTaskDocument(ctx, task, taskDoc, exportOptions)
				if err == nil && result.Success {
					stats.Exported++
				} else {
					stats.Failed++
					if err != nil {
						stats.Errors = append(stats.Errors, fmt.Sprintf("Task #%d: export failed: %v", taskID, err))
					} else {
						stats.Errors = append(stats.Errors, fmt.Sprintf("Task #%d: export failed: %s", taskID, result.Error))
					}
				}
			}
		}

		// Import phase
		if req.Direction == "import" || req.Direction == "both" {
			result, parsed, err := h.devPlansExportService.ImportTaskDocument(ctx, taskID, task.Title, importOptions)
			if err == nil && result.Success && parsed != nil {
				// Check if task has a document
				var documentID int
				query := `
					SELECT d.id
					FROM task_documents td
					JOIN documents d ON td.document_id = d.id
					WHERE td.task_id = $1 AND td.deleted_at IS NULL AND d.deleted_at IS NULL
					LIMIT 1
				`
				err := h.db.Get(&documentID, query, taskID)

				if err != nil {
					// No document exists, create one
					title := parsed.Title
					if title == "" {
						title = task.Title + " - Imported"
					}

					// Create document
					insertDocQuery := `
						INSERT INTO documents (title, content, version, project_id, created_by, created_at, updated_at)
						VALUES ($1, $2, $3, $4, 1, NOW(), NOW())
						RETURNING id
					`
					var newDocID int
					err = h.db.Get(&newDocID, insertDocQuery, title, parsed.Content, parsed.Version, req.ProjectID)
					if err == nil {
						// Link document to task
						linkQuery := `
							INSERT INTO task_documents (task_id, document_id, relationship_type, created_by)
							VALUES ($1, $2, 'main', 1)
						`
						_, err = h.db.Exec(linkQuery, taskID, newDocID)
						if err == nil {
							stats.Imported++
						} else {
							stats.Failed++
							stats.Errors = append(stats.Errors, fmt.Sprintf("Task #%d: failed to link document: %v", taskID, err))
						}
					} else {
						stats.Failed++
						stats.Errors = append(stats.Errors, fmt.Sprintf("Task #%d: failed to create document: %v", taskID, err))
					}
				} else {
					// Update existing document
					updateQuery := `
						UPDATE documents
						SET content = $1, version = $2, updated_at = NOW()
						WHERE id = $3
					`
					_, err = h.db.Exec(updateQuery, parsed.Content, parsed.Version, documentID)
					if err == nil {
						stats.Imported++
					} else {
						stats.Failed++
						stats.Errors = append(stats.Errors, fmt.Sprintf("Task #%d: failed to update document: %v", taskID, err))
					}
				}
			}
		}
	}

	// Prepare response data
	responseData := map[string]interface{}{
		"direction":  req.Direction,
		"total":      len(taskIDs),
		"statistics": stats,
	}

	message := fmt.Sprintf("Sync completed: %d exported, %d imported, %d failed", stats.Exported, stats.Imported, stats.Failed)
	h.sendMCPSuccess(c, responseData, message)
}

// ============================================================================
// Request/Response Types
// ============================================================================

type ExportToFileRequest struct {
	TaskID    int  `json:"task_id" binding:"required"`
	ProjectID int  `json:"project_id"`
	Overwrite bool `json:"overwrite"`
}

type ImportFromFileRequest struct {
	TaskID         int    `json:"task_id" binding:"required"`
	FileName       string `json:"file_name"`
	ProjectID      int    `json:"project_id"`
	ForceOverwrite bool   `json:"force_overwrite"`
	UpdateIfNewer  bool   `json:"update_if_newer"`
}

type SyncDocumentsRequest struct {
	Direction      string `json:"direction"`       // "export", "import", or "both"
	TaskIDs        []int  `json:"task_ids"`        // Optional: specific task IDs to sync
	ProjectID      int    `json:"project_id"`      // Optional: sync all tasks in project
	ForceOverwrite bool   `json:"force_overwrite"` // Force overwrite without version check
}
