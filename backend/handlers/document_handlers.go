package handlers

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

// DocumentHandler handles document-related HTTP requests
type DocumentHandler struct {
	db       database.DB
	logger   *log.Logger
	validate *validator.Validate
}

// NewDocumentHandler creates a new document handler instance
func NewDocumentHandler(db database.DB, logger *log.Logger, validate *validator.Validate) *DocumentHandler {
	return &DocumentHandler{
		db:       db,
		logger:   logger,
		validate: validate,
	}
}

// CreateDocument creates a new document
// @Summary Create document
// @Description Create a new document for a project
// @Tags documents
// @Accept json
// @Produce json
// @Param project_id path int true "Project ID"
// @Param document body models.DocumentRequest true "Document data"
// @Success 201 {object} models.DocumentResponse
// @Failure 400 {object} models.ErrorResponse
// @Failure 401 {object} models.ErrorResponse
// @Failure 403 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/projects/{project_id}/documents [post]
func (h *DocumentHandler) CreateDocument(c *gin.Context) {
	projectIDStr := c.Param("id")
	projectID, err := strconv.Atoi(projectIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid project ID",
			"message": "Project ID must be a valid integer",
		})
		return
	}

	// Get user ID from context (set by auth middleware)
	userIDInterface, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "Unauthorized",
			"message": "User ID not found in context",
		})
		return
	}
	
	userID, ok := userIDInterface.(int)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "Unauthorized",
			"message": "Invalid user ID format",
		})
		return
	}

	// Parse request body
	var req models.DocumentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request body",
			"message": err.Error(),
		})
		return
	}

	// Validate request
	if err := h.validate.Struct(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Validation failed",
			"message": err.Error(),
		})
		return
	}

	// Verify project exists and user has access
	project, err := h.db.Projects().GetByID(c.Request.Context(), projectID)
	if err != nil {
		if err.Error() == "project not found" {
			c.JSON(http.StatusNotFound, gin.H{
				"error":   "Project not found",
				"message": "The specified project does not exist",
			})
			return
		}
		h.logger.Printf("Failed to get project: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Internal server error",
			"message": "Failed to verify project access",
		})
		return
	}

	// Check if user has permission to create documents in this project
	// For now, we'll allow project owner and any authenticated user
	// TODO: Implement proper permission checking
	if project.OwnerID != userID {
		// For MVP, we'll allow any authenticated user to create documents
		// In production, you might want stricter permission checks
	}

	// Create document
	document := &models.Document{
		ProjectID: &projectID,
		Title:     req.Title,
		Content:   req.Content,
		CreatedBy: userID,
	}

	createdDocument, err := h.db.Documents().Create(c.Request.Context(), document)
	if err != nil {
		h.logger.Printf("Failed to create document: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Internal server error",
			"message": "Failed to create document",
		})
		return
	}

	// Get document with relations for response
	response, err := h.db.Documents().GetWithRelations(c.Request.Context(), createdDocument.ID)
	if err != nil {
		// If we can't get relations, return basic response
		basicResponse := createdDocument.ToResponse()
		response = &basicResponse
	}

	c.JSON(http.StatusCreated, response)
}

// CreateGlobalDocument creates a new global document (not project-specific)
// @Summary Create global document
// @Description Create a new global document (project_id = 0)
// @Tags documents
// @Accept json
// @Produce json
// @Param document body models.DocumentRequest true "Document data"
// @Success 201 {object} models.DocumentResponse
// @Failure 400 {object} models.ErrorResponse
// @Failure 401 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/documents [post]
func (h *DocumentHandler) CreateGlobalDocument(c *gin.Context) {
	// Get user ID from context (set by auth middleware)
	userIDInterface, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "Unauthorized",
			"message": "User ID not found in context",
		})
		return
	}
	
	userID, ok := userIDInterface.(int)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "Unauthorized",
			"message": "Invalid user ID format",
		})
		return
	}

	// Parse request body
	var req models.DocumentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request body",
			"message": err.Error(),
		})
		return
	}

	// Validate request
	if err := h.validate.Struct(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Validation failed",
			"message": err.Error(),
		})
		return
	}

	// Create global document (project_id = nil)
	document := &models.Document{
		ProjectID: nil, // Global document
		Title:     req.Title,
		Content:   req.Content,
		CreatedBy: userID,
	}

	createdDocument, err := h.db.Documents().Create(c.Request.Context(), document)
	if err != nil {
		h.logger.Printf("Failed to create global document: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Internal server error",
			"message": "Failed to create document",
		})
		return
	}

	// Get document with relations for response
	response, err := h.db.Documents().GetWithRelations(c.Request.Context(), createdDocument.ID)
	if err != nil {
		// If we can't get relations, return basic response
		basicResponse := createdDocument.ToResponse()
		response = &basicResponse
	}

	c.JSON(http.StatusCreated, response)
}

// GetProjectDocuments gets all documents for a project
// @Summary Get project documents
// @Description Get all documents for a specific project with optional filtering
// @Tags documents
// @Produce json
// @Param project_id path int true "Project ID"
// @Param search query string false "Search term for document titles"
// @Param sort_by query string false "Sort field (created_at, updated_at, title)" Enums(created_at, updated_at, title)
// @Param order query string false "Sort order (asc, desc)" Enums(asc, desc)
// @Param page query int false "Page number for pagination" minimum(1)
// @Param limit query int false "Number of items per page" minimum(1) maximum(100)
// @Success 200 {object} models.PaginatedResponse{data=[]models.DocumentListResponse}
// @Failure 400 {object} models.ErrorResponse
// @Failure 401 {object} models.ErrorResponse
// @Failure 403 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/projects/{project_id}/documents [get]
func (h *DocumentHandler) GetProjectDocuments(c *gin.Context) {
	projectIDStr := c.Param("id")
	projectID, err := strconv.Atoi(projectIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid project ID",
			"message": "Project ID must be a valid integer",
		})
		return
	}

	// Parse filter parameters
	filter := &models.DocumentFilter{
		ProjectID: &projectID,
		Search:    c.Query("search"),
		SortBy:    c.DefaultQuery("sort_by", "updated_at"),
		Order:     c.DefaultQuery("order", "desc"),
	}

	if pageStr := c.Query("page"); pageStr != "" {
		if page, err := strconv.Atoi(pageStr); err == nil && page > 0 {
			filter.Page = page
		}
	}

	if limitStr := c.Query("limit"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil && limit > 0 && limit <= 100 {
			filter.Limit = limit
		}
	}

	// Verify project exists and user has access
	_, err = h.db.Projects().GetByID(c.Request.Context(), projectID)
	if err != nil {
		if err.Error() == "project not found" {
			c.JSON(http.StatusNotFound, gin.H{
				"error":   "Project not found",
				"message": "The specified project does not exist",
			})
			return
		}
		h.logger.Printf("Failed to get project: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Internal server error",
			"message": "Failed to verify project access",
		})
		return
	}

	// Get documents with relations
	documents, total, err := h.db.Documents().GetListWithRelations(c.Request.Context(), projectID, filter)
	if err != nil {
		h.logger.Printf("Failed to get project documents: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Internal server error",
			"message": "Failed to retrieve documents",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  documents,
		"total": total,
		"page":  filter.Page,
		"limit": filter.Limit,
	})
}

// GetAllDocuments gets all documents across projects with pagination and search
// @Summary Get all documents
// @Description Get all documents across all projects with pagination and search
// @Tags documents
// @Produce json
// @Param search query string false "Search term"
// @Param sort_by query string false "Sort field (title, created_at, updated_at)"
// @Param order query string false "Sort order (asc, desc)"
// @Param page query int false "Page number"
// @Param limit query int false "Page size"
// @Success 200 {object} models.DocumentListPaginatedResponse
// @Failure 400 {object} models.ErrorResponse
// @Failure 401 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/documents [get]
func (h *DocumentHandler) GetAllDocuments(c *gin.Context) {
	// Parse filter parameters
	filter := &models.DocumentFilter{
		Search: c.Query("search"),
		SortBy: c.DefaultQuery("sort_by", "updated_at"),
		Order:  c.DefaultQuery("order", "desc"),
	}

	if pageStr := c.Query("page"); pageStr != "" {
		if page, err := strconv.Atoi(pageStr); err == nil && page > 0 {
			filter.Page = page
		}
	}

	if limitStr := c.Query("limit"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil && limit > 0 && limit <= 100 {
			filter.Limit = limit
		}
	}

	// Get all documents with relations
	documents, total, err := h.db.Documents().GetAllDocumentsWithRelations(c.Request.Context(), filter)
	if err != nil {
		h.logger.Printf("Failed to get all documents: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Internal server error",
			"message": "Failed to retrieve documents",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  documents,
		"total": total,
		"page":  filter.Page,
		"limit": filter.Limit,
	})
}

// GetDocument gets a specific document by ID
// @Summary Get document
// @Description Get a specific document by its ID
// @Tags documents
// @Produce json
// @Param id path int true "Document ID"
// @Success 200 {object} models.DocumentResponse
// @Failure 400 {object} models.ErrorResponse
// @Failure 401 {object} models.ErrorResponse
// @Failure 403 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/documents/{id} [get]
func (h *DocumentHandler) GetDocument(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid document ID",
			"message": "Document ID must be a valid integer",
		})
		return
	}

	// Get document with relations
	document, err := h.db.Documents().GetWithRelations(c.Request.Context(), id)
	if err != nil {
		if err.Error() == "document not found" {
			c.JSON(http.StatusNotFound, gin.H{
				"error":   "Document not found",
				"message": "The specified document does not exist",
			})
			return
		}
		h.logger.Printf("Failed to get document: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Internal server error",
			"message": "Failed to retrieve document",
		})
		return
	}

	c.JSON(http.StatusOK, document)
}

// UpdateDocument updates a document
// @Summary Update document
// @Description Update an existing document
// @Tags documents
// @Accept json
// @Produce json
// @Param id path int true "Document ID"
// @Param document body models.DocumentRequest true "Updated document data"
// @Success 200 {object} models.DocumentResponse
// @Failure 400 {object} models.ErrorResponse
// @Failure 401 {object} models.ErrorResponse
// @Failure 403 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/documents/{id} [put]
func (h *DocumentHandler) UpdateDocument(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid document ID",
			"message": "Document ID must be a valid integer",
		})
		return
	}

	// Get user ID from context
	userIDInterface, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "Unauthorized",
			"message": "User ID not found in context",
		})
		return
	}
	
	userID, ok := userIDInterface.(int)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "Unauthorized",
			"message": "Invalid user ID format",
		})
		return
	}

	// Parse request body
	var req models.UpdateDocumentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request body",
			"message": err.Error(),
		})
		return
	}

	// Validate request
	if err := h.validate.Struct(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Validation failed",
			"message": err.Error(),
		})
		return
	}

	// Validate association
	if err := req.ValidateAssociation(); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Association validation failed",
			"message": err.Error(),
		})
		return
	}

	// Get existing document to verify permissions
	existingDocument, err := h.db.Documents().GetByID(c.Request.Context(), id)
	if err != nil {
		if err.Error() == "document not found" {
			c.JSON(http.StatusNotFound, gin.H{
				"error":   "Document not found",
				"message": "The specified document does not exist",
			})
			return
		}
		h.logger.Printf("Failed to get document: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Internal server error",
			"message": "Failed to retrieve document",
		})
		return
	}

	// Check permissions - only creator or project owner can edit
	// For global documents (ProjectID = nil), skip project permission check
	var project *models.Project
	if existingDocument.ProjectID != nil {
		var err error
		project, err = h.db.Projects().GetByID(c.Request.Context(), *existingDocument.ProjectID)
		if err != nil {
			h.logger.Printf("Failed to get project: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Internal server error",
				"message": "Failed to verify permissions",
			})
			return
		}
	}

	// Permission check: for global documents, only creator can edit
	// For project documents, creator or project owner can edit
	if existingDocument.ProjectID == nil {
		// Global document - only creator can edit
		if existingDocument.CreatedBy != userID {
			c.JSON(http.StatusForbidden, gin.H{
				"error":   "Forbidden",
				"message": "You don't have permission to edit this global document",
			})
			return
		}
	} else if existingDocument.CreatedBy != userID && project.OwnerID != userID {
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "Forbidden",
			"message": "You don't have permission to edit this document",
		})
		return
	}

	// Update document fields (only update non-nil fields)
	if req.Title != nil {
		existingDocument.Title = *req.Title
	}
	if req.Content != nil {
		existingDocument.Content = *req.Content
	}
	if req.Type != nil {
		existingDocument.Type = *req.Type
	}
	if req.Status != nil {
		existingDocument.Status = *req.Status
	}
	if req.ProjectID != nil {
		existingDocument.ProjectID = req.ProjectID
	}
	if req.CustomerID != nil {
		existingDocument.CustomerID = req.CustomerID
	}
	if req.Category != nil {
		existingDocument.Category = req.Category
	}
	if req.Subcategory != nil {
		existingDocument.Subcategory = req.Subcategory
	}
	if req.Visibility != nil {
		existingDocument.Visibility = *req.Visibility
	}
	if req.SharedWith != nil {
		existingDocument.SharedWith = *req.SharedWith
	}
	if req.Tags != nil {
		existingDocument.Tags = *req.Tags
	}
	if req.Description != nil {
		existingDocument.Description = req.Description
	}

	updatedDocument, err := h.db.Documents().Update(c.Request.Context(), existingDocument)
	if err != nil {
		h.logger.Printf("Failed to update document: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Internal server error",
			"message": "Failed to update document",
		})
		return
	}

	// Get document with relations for response
	response, err := h.db.Documents().GetWithRelations(c.Request.Context(), updatedDocument.ID)
	if err != nil {
		// If we can't get relations, return basic response
		basicResponse := updatedDocument.ToResponse()
		response = &basicResponse
	}

	c.JSON(http.StatusOK, response)
}

// DeleteDocument deletes a document
// @Summary Delete document
// @Description Delete a specific document
// @Tags documents
// @Produce json
// @Param id path int true "Document ID"
// @Success 204 "No Content"
// @Failure 400 {object} models.ErrorResponse
// @Failure 401 {object} models.ErrorResponse
// @Failure 403 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/documents/{id} [delete]
func (h *DocumentHandler) DeleteDocument(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid document ID",
			"message": "Document ID must be a valid integer",
		})
		return
	}

	// Get user ID from context
	userIDInterface, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "Unauthorized",
			"message": "User ID not found in context",
		})
		return
	}
	
	userID, ok := userIDInterface.(int)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "Unauthorized",
			"message": "Invalid user ID format",
		})
		return
	}

	// Get existing document to verify permissions
	existingDocument, err := h.db.Documents().GetByID(c.Request.Context(), id)
	if err != nil {
		if err.Error() == "document not found" {
			c.JSON(http.StatusNotFound, gin.H{
				"error":   "Document not found",
				"message": "The specified document does not exist",
			})
			return
		}
		h.logger.Printf("Failed to get document: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Internal server error",
			"message": "Failed to retrieve document",
		})
		return
	}

	// Check permissions - only creator or project owner can delete
	// For global documents (ProjectID = nil), skip project permission check
	var project *models.Project
	if existingDocument.ProjectID != nil {
		var err error
		project, err = h.db.Projects().GetByID(c.Request.Context(), *existingDocument.ProjectID)
		if err != nil {
			h.logger.Printf("Failed to get project: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Internal server error",
				"message": "Failed to verify permissions",
			})
			return
		}
	}

	// Permission check: for global documents, only creator can delete
	// For project documents, creator or project owner can delete
	if existingDocument.ProjectID == nil {
		// Global document - only creator can delete
		if existingDocument.CreatedBy != userID {
			c.JSON(http.StatusForbidden, gin.H{
				"error":   "Forbidden",
				"message": "You don't have permission to delete this global document",
			})
			return
		}
	} else if existingDocument.CreatedBy != userID && project.OwnerID != userID {
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "Forbidden",
			"message": "You don't have permission to delete this document",
		})
		return
	}

	// Delete document
	err = h.db.Documents().Delete(c.Request.Context(), id)
	if err != nil {
		h.logger.Printf("Failed to delete document: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Internal server error",
			"message": "Failed to delete document",
		})
		return
	}

	c.Status(http.StatusNoContent)
}

// GetDocumentStats gets document statistics
// @Summary Get document statistics
// @Description Get global document statistics (total, by type, by status, recent count)
// @Tags documents
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/documents/stats [get]
func (h *DocumentHandler) GetDocumentStats(c *gin.Context) {
	// Get user ID from context (set by auth middleware)
	userIDInterface, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "Unauthorized",
			"message": "User ID not found in context",
		})
		return
	}
	
	_, ok := userIDInterface.(int)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "Unauthorized",
			"message": "Invalid user ID format",
		})
		return
	}

	// Get document statistics from database
	// For now, we'll implement basic stats. In a real implementation,
	// you might want to cache these or use database views
	
	// Get total count of global documents (project_id IS NULL)
	totalDocuments, err := h.db.Documents().GetGlobalDocumentCount(c.Request.Context())
	if err != nil {
		h.logger.Printf("Failed to get total document count: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Internal server error",
			"message": "Failed to get document statistics",
		})
		return
	}

	// Get documents by type (simplified - just return mock data for now)
	byType := map[string]int{
		"markdown": totalDocuments, // Assuming all are markdown for now
		"image":    0,
		"pdf":      0,
	}

	// Get documents by status (simplified - assuming all are draft for now)
	byStatus := map[string]int{
		"draft":     totalDocuments,
		"published": 0,
		"archived":  0,
	}

	// Get recent count (last 7 days) - simplified for now
	recentCount := 0 // TODO: Implement proper recent count query

	stats := map[string]interface{}{
		"total":        totalDocuments,
		"by_type":      byType,
		"by_status":    byStatus,
		"recent_count": recentCount,
	}

	c.JSON(http.StatusOK, stats)
}