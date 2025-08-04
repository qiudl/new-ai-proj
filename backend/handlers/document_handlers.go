package handlers

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// DocumentHandlers handles HTTP requests for document management
type DocumentHandlers struct {
	db                     *gorm.DB
	documentService        *DocumentService
	documentVersionService *DocumentVersionService
	storageAdapter         StorageAdapter
}

// NewDocumentHandlers creates a new document handlers instance
func NewDocumentHandlers(db *gorm.DB, documentService *DocumentService, documentVersionService *DocumentVersionService, storageAdapter StorageAdapter) *DocumentHandlers {
	return &DocumentHandlers{
		db:                     db,
		documentService:        documentService,
		documentVersionService: documentVersionService,
		storageAdapter:         storageAdapter,
	}
}

// Document represents the API document structure
type Document struct {
	ID              uint64                 `json:"id"`
	Title           string                 `json:"title"`
	Description     string                 `json:"description"`
	FileName        string                 `json:"file_name"`
	FileType        string                 `json:"file_type"`
	FileSize        int64                  `json:"file_size"`
	ProjectID       uint64                 `json:"project_id"`
	TaskID          uint64                 `json:"task_id"`
	CurrentVersion  int                    `json:"current_version"`
	TotalVersions   int                    `json:"total_versions"`
	Status          string                 `json:"status"`
	Visibility      string                 `json:"visibility"`
	Tags            []string               `json:"tags"`
	StoragePath     string                 `json:"storage_path"`
	StorageBackend  string                 `json:"storage_backend"`
	Checksum        string                 `json:"checksum"`
	UploadedBy      uint64                 `json:"uploaded_by"`
	UploadedByName  string                 `json:"uploaded_by_name"`
	UpdatedBy       *uint64                `json:"updated_by"`
	UpdatedByName   *string                `json:"updated_by_name"`
	CreatedAt       time.Time              `json:"created_at"`
	UpdatedAt       time.Time              `json:"updated_at"`
	PublishedAt     *time.Time             `json:"published_at"`
	DownloadURL     string                 `json:"download_url"`
	Metadata        map[string]interface{} `json:"metadata"`
}

// DocumentVersion represents the API document version structure
type DocumentVersion struct {
	ID              uint64                 `json:"id"`
	DocumentID      uint64                 `json:"document_id"`
	VersionNumber   int                    `json:"version_number"`
	Title           string                 `json:"title"`
	Description     string                 `json:"description"`
	ChangesSummary  string                 `json:"changes_summary"`
	FileName        string                 `json:"file_name"`
	FileSize        int64                  `json:"file_size"`
	Checksum        string                 `json:"checksum"`
	StoragePath     string                 `json:"storage_path"`
	ParentVersion   *int                   `json:"parent_version"`
	CreatedBy       uint64                 `json:"created_by"`
	CreatedByName   string                 `json:"created_by_name"`
	CreatedAt       time.Time              `json:"created_at"`
	Metadata        map[string]interface{} `json:"metadata"`
	IsCurrent       bool                   `json:"is_current"`
	DownloadURL     string                 `json:"download_url"`
}

// APIResponse represents the standard API response format
type APIResponse struct {
	Success   bool        `json:"success"`
	Code      int         `json:"code"`
	Message   string      `json:"message"`
	Data      interface{} `json:"data,omitempty"`
	Timestamp time.Time   `json:"timestamp"`
	RequestID string      `json:"request_id"`
}

// ErrorResponse represents the error response format
type ErrorResponse struct {
	Success     bool      `json:"success"`
	Code        int       `json:"code"`
	Message     string    `json:"message"`
	Error       string    `json:"error"`
	Details     string    `json:"details,omitempty"`
	Timestamp   time.Time `json:"timestamp"`
	RequestID   string    `json:"request_id"`
	Suggestion  string    `json:"suggestion,omitempty"`
}

// DocumentUploadRequest represents manual upload request
type DocumentUploadRequest struct {
	Title       string                 `form:"title" json:"title" binding:"required"`
	Description string                 `form:"description" json:"description"`
	Status      string                 `form:"status" json:"status"`
	Visibility  string                 `form:"visibility" json:"visibility"`
	Tags        string                 `form:"tags" json:"tags"` // Comma-separated
	Metadata    map[string]interface{} `form:"metadata" json:"metadata"`
}

// generateRequestID generates a unique request ID
func (h *DocumentHandlers) generateRequestID() string {
	return fmt.Sprintf("req_%d_%d", time.Now().Unix(), time.Now().UnixNano()%1000000)
}

// respondWithSuccess sends a successful response
func (h *DocumentHandlers) respondWithSuccess(c *gin.Context, code int, message string, data interface{}) {
	c.JSON(code, APIResponse{
		Success:   true,
		Code:      code,
		Message:   message,
		Data:      data,
		Timestamp: time.Now(),
		RequestID: h.generateRequestID(),
	})
}

// respondWithError sends an error response
func (h *DocumentHandlers) respondWithError(c *gin.Context, code int, message string, err error, suggestion string) {
	errorMsg := ""
	if err != nil {
		errorMsg = err.Error()
	}

	c.JSON(code, ErrorResponse{
		Success:     false,
		Code:        code,
		Message:     message,
		Error:       errorMsg,
		Timestamp:   time.Now(),
		RequestID:   h.generateRequestID(),
		Suggestion:  suggestion,
	})
}

// getUserID extracts user ID from JWT token context
func (h *DocumentHandlers) getUserID(c *gin.Context) (uint64, error) {
	userIDInterface, exists := c.Get("user_id")
	if !exists {
		return 0, fmt.Errorf("user not authenticated")
	}

	switch userID := userIDInterface.(type) {
	case uint64:
		return userID, nil
	case uint:
		return uint64(userID), nil
	case int:
		return uint64(userID), nil
	case float64:
		return uint64(userID), nil
	case string:
		id, err := strconv.ParseUint(userID, 10, 64)
		if err != nil {
			return 0, fmt.Errorf("invalid user ID format")
		}
		return id, nil
	default:
		return 0, fmt.Errorf("invalid user ID type")
	}
}

// getProjectAndTaskIDs extracts project ID and task ID from URL parameters
func (h *DocumentHandlers) getProjectAndTaskIDs(c *gin.Context) (uint64, uint64, error) {
	projectIDStr := c.Param("project_id")
	taskIDStr := c.Param("task_id")

	projectID, err := strconv.ParseUint(projectIDStr, 10, 64)
	if err != nil {
		return 0, 0, fmt.Errorf("invalid project ID: %s", projectIDStr)
	}

	taskID, err := strconv.ParseUint(taskIDStr, 10, 64)
	if err != nil {
		return 0, 0, fmt.Errorf("invalid task ID: %s", taskIDStr)
	}

	return projectID, taskID, nil
}

// parseTags parses comma-separated tags string into slice
func (h *DocumentHandlers) parseTags(tagsStr string) []string {
	if tagsStr == "" {
		return []string{}
	}

	tags := strings.Split(tagsStr, ",")
	var result []string
	for _, tag := range tags {
		tag = strings.TrimSpace(tag)
		if tag != "" {
			result = append(result, tag)
		}
	}
	return result
}

// ManualUpload handles manual document upload
// POST /api/v1/projects/:project_id/tasks/:task_id/documents/upload
func (h *DocumentHandlers) ManualUpload(c *gin.Context) {
	// Extract project ID and task ID
	projectID, taskID, err := h.getProjectAndTaskIDs(c)
	if err != nil {
		h.respondWithError(c, http.StatusBadRequest, "Invalid request parameters", err, "Please provide valid project_id and task_id")
		return
	}

	// Get user ID from JWT
	userID, err := h.getUserID(c)
	if err != nil {
		h.respondWithError(c, http.StatusUnauthorized, "Authentication required", err, "Please provide a valid authentication token")
		return
	}

	// Parse form data
	var req DocumentUploadRequest
	if err := c.ShouldBind(&req); err != nil {
		h.respondWithError(c, http.StatusBadRequest, "Invalid request data", err, "Please check your form data and try again")
		return
	}

	// Get uploaded file
	fileHeader, err := c.FormFile("file")
	if err != nil {
		h.respondWithError(c, http.StatusBadRequest, "File is required", err, "Please select a file to upload")
		return
	}

	// Validate file size (max 50MB)
	maxFileSize := int64(50 * 1024 * 1024)
	if fileHeader.Size > maxFileSize {
		h.respondWithError(c, http.StatusBadRequest, "File too large", 
			fmt.Errorf("file size %d exceeds maximum allowed size %d", fileHeader.Size, maxFileSize),
			"Please select a file smaller than 50MB")
		return
	}

	// Open file
	file, err := fileHeader.Open()
	if err != nil {
		h.respondWithError(c, http.StatusInternalServerError, "Failed to process file", err, "Please try uploading the file again")
		return
	}
	defer file.Close()

	// Set default values
	if req.Status == "" {
		req.Status = "draft"
	}
	if req.Visibility == "" {
		req.Visibility = "team"
	}

	// Parse tags
	tags := h.parseTags(req.Tags)

	// Create document using service
	ctx := context.Background()
	document, err := h.documentService.CreateDocument(ctx, &CreateDocumentRequest{
		Title:       req.Title,
		Description: req.Description,
		ProjectID:   projectID,
		TaskID:      taskID,
		File:        fileHeader,
		Status:      req.Status,
		Visibility:  req.Visibility,
		Tags:        tags,
		Metadata:    req.Metadata,
	}, userID, c)

	if err != nil {
		h.respondWithError(c, http.StatusInternalServerError, "Failed to upload document", err, "Please check your file and try again")
		return
	}

	// Convert to API response format
	response := Document{
		ID:             document.ID,
		Title:          document.Title,
		Description:    document.Description,
		FileName:       document.FileName,
		FileType:       document.FileType,
		FileSize:       document.FileSize,
		ProjectID:      document.ProjectID,
		TaskID:         document.TaskID,
		CurrentVersion: document.CurrentVersion,
		TotalVersions:  document.TotalVersions,
		Status:         document.Status,
		Visibility:     document.Visibility,
		Tags:           tags,
		StoragePath:    document.StoragePath,
		StorageBackend: document.StorageBackend,
		Checksum:       document.Checksum,
		UploadedBy:     document.UploadedBy,
		CreatedAt:      document.CreatedAt,
		UpdatedAt:      document.UpdatedAt,
		PublishedAt:    document.PublishedAt,
		Metadata:       req.Metadata,
	}

	h.respondWithSuccess(c, http.StatusCreated, "Document uploaded successfully", response)
}

// APIUpload handles API-based document upload
// POST /api/v1/documents
func (h *DocumentHandlers) APIUpload(c *gin.Context) {
	// Get user ID from JWT
	userID, err := h.getUserID(c)
	if err != nil {
		h.respondWithError(c, http.StatusUnauthorized, "Authentication required", err, "Please provide a valid authentication token")
		return
	}

	// Parse JSON request
	var req struct {
		Title       string                 `json:"title" binding:"required"`
		Description string                 `json:"description"`
		Content     string                 `json:"content" binding:"required"`
		FileType    string                 `json:"file_type" binding:"required"`
		ProjectID   uint64                 `json:"project_id" binding:"required"`
		TaskID      uint64                 `json:"task_id" binding:"required"`
		Status      string                 `json:"status"`
		Visibility  string                 `json:"visibility"`
		Tags        []string               `json:"tags"`
		Metadata    map[string]interface{} `json:"metadata"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		h.respondWithError(c, http.StatusBadRequest, "Invalid request data", err, "Please check your JSON data and try again")
		return
	}

	// Set default values
	if req.Status == "" {
		req.Status = "draft"
	}
	if req.Visibility == "" {
		req.Visibility = "team"
	}

	// Create document using service
	ctx := context.Background()
	document, err := h.documentService.CreateDocumentFromContent(ctx, &CreateDocumentFromContentRequest{
		Title:       req.Title,
		Description: req.Description,
		Content:     req.Content,
		FileType:    req.FileType,
		ProjectID:   req.ProjectID,
		TaskID:      req.TaskID,
		Status:      req.Status,
		Visibility:  req.Visibility,
		Tags:        req.Tags,
		Metadata:    req.Metadata,
	}, userID, c)

	if err != nil {
		h.respondWithError(c, http.StatusInternalServerError, "Failed to create document", err, "Please check your data and try again")
		return
	}

	// Convert to API response format
	response := Document{
		ID:             document.ID,
		Title:          document.Title,
		Description:    document.Description,
		FileName:       document.FileName,
		FileType:       document.FileType,
		FileSize:       document.FileSize,
		ProjectID:      document.ProjectID,
		TaskID:         document.TaskID,
		CurrentVersion: document.CurrentVersion,
		TotalVersions:  document.TotalVersions,
		Status:         document.Status,
		Visibility:     document.Visibility,
		Tags:           req.Tags,
		StoragePath:    document.StoragePath,
		StorageBackend: document.StorageBackend,
		Checksum:       document.Checksum,
		UploadedBy:     document.UploadedBy,
		CreatedAt:      document.CreatedAt,
		UpdatedAt:      document.UpdatedAt,
		PublishedAt:    document.PublishedAt,
		Metadata:       req.Metadata,
	}

	h.respondWithSuccess(c, http.StatusCreated, "Document created successfully", response)
}

// GetDocument retrieves a specific document
// GET /api/v1/projects/:project_id/tasks/:task_id/documents/:document_id
func (h *DocumentHandlers) GetDocument(c *gin.Context) {
	// Extract document ID
	documentIDStr := c.Param("document_id")
	documentID, err := strconv.ParseUint(documentIDStr, 10, 64)
	if err != nil {
		h.respondWithError(c, http.StatusBadRequest, "Invalid document ID", err, "Please provide a valid document ID")
		return
	}

	// Get user ID from JWT
	userID, err := h.getUserID(c)
	if err != nil {
		h.respondWithError(c, http.StatusUnauthorized, "Authentication required", err, "Please provide a valid authentication token")
		return
	}

	// Get document using service
	ctx := context.Background()
	document, err := h.documentService.GetDocument(ctx, documentID, userID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			h.respondWithError(c, http.StatusNotFound, "Document not found", err, "Please check the document ID and try again")
		} else {
			h.respondWithError(c, http.StatusInternalServerError, "Failed to retrieve document", err, "Please try again later")
		}
		return
	}

	// Generate download URL
	downloadURL, _ := h.storageAdapter.GetURL(ctx, document.StoragePath)

	// Convert to API response format
	response := Document{
		ID:             document.ID,
		Title:          document.Title,
		Description:    document.Description,
		FileName:       document.FileName,
		FileType:       document.FileType,
		FileSize:       document.FileSize,
		ProjectID:      document.ProjectID,
		TaskID:         document.TaskID,
		CurrentVersion: document.CurrentVersion,
		TotalVersions:  document.TotalVersions,
		Status:         document.Status,
		Visibility:     document.Visibility,
		StoragePath:    document.StoragePath,
		StorageBackend: document.StorageBackend,
		Checksum:       document.Checksum,
		UploadedBy:     document.UploadedBy,
		UpdatedBy:      document.UpdatedBy,
		CreatedAt:      document.CreatedAt,
		UpdatedAt:      document.UpdatedAt,
		PublishedAt:    document.PublishedAt,
		DownloadURL:    downloadURL,
		Metadata:       document.Metadata,
	}

	h.respondWithSuccess(c, http.StatusOK, "Document retrieved successfully", response)
}

// DownloadDocument handles document download
// GET /api/v1/projects/:project_id/tasks/:task_id/documents/:document_id/download
func (h *DocumentHandlers) DownloadDocument(c *gin.Context) {
	// Extract document ID
	documentIDStr := c.Param("document_id")
	documentID, err := strconv.ParseUint(documentIDStr, 10, 64)
	if err != nil {
		h.respondWithError(c, http.StatusBadRequest, "Invalid document ID", err, "Please provide a valid document ID")
		return
	}

	// Get user ID from JWT
	userID, err := h.getUserID(c)
	if err != nil {
		h.respondWithError(c, http.StatusUnauthorized, "Authentication required", err, "Please provide a valid authentication token")
		return
	}

	// Download document using service
	ctx := context.Background()
	reader, document, err := h.documentService.DownloadDocument(ctx, documentID, userID, c)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			h.respondWithError(c, http.StatusNotFound, "Document not found", err, "Please check the document ID and try again")
		} else {
			h.respondWithError(c, http.StatusInternalServerError, "Failed to download document", err, "Please try again later")
		}
		return
	}
	defer reader.Close()

	// Set response headers
	c.Header("Content-Type", h.getContentType(document.FileType))
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", document.FileName))
	c.Header("Content-Length", fmt.Sprintf("%d", document.FileSize))

	// Stream file content
	c.DataFromReader(http.StatusOK, document.FileSize, h.getContentType(document.FileType), reader, nil)
}

// getContentType returns the content type for a file type
func (h *DocumentHandlers) getContentType(fileType string) string {
	switch strings.ToLower(fileType) {
	case "markdown", "md":
		return "text/markdown"
	case "pdf":
		return "application/pdf"
	case "text", "txt":
		return "text/plain"
	case "html":
		return "text/html"
	case "json":
		return "application/json"
	case "xml":
		return "application/xml"
	case "csv":
		return "text/csv"
	default:
		return "application/octet-stream"
	}
}

// ListDocuments retrieves documents for a task
// GET /api/v1/projects/:project_id/tasks/:task_id/documents
func (h *DocumentHandlers) ListDocuments(c *gin.Context) {
	// Extract project ID and task ID
	projectID, taskID, err := h.getProjectAndTaskIDs(c)
	if err != nil {
		h.respondWithError(c, http.StatusBadRequest, "Invalid request parameters", err, "Please provide valid project_id and task_id")
		return
	}

	// Get user ID from JWT
	userID, err := h.getUserID(c)
	if err != nil {
		h.respondWithError(c, http.StatusUnauthorized, "Authentication required", err, "Please provide a valid authentication token")
		return
	}

	// Parse query parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	status := c.Query("status")
	visibility := c.Query("visibility")
	sortBy := c.DefaultQuery("sort_by", "created_at")
	sortOrder := c.DefaultQuery("sort_order", "desc")

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	// List documents using service
	ctx := context.Background()
	result, err := h.documentService.ListDocuments(ctx, &ListDocumentsRequest{
		ProjectID:  &projectID,
		TaskID:     &taskID,
		Status:     status,
		Visibility: visibility,
		Page:       page,
		PageSize:   pageSize,
		SortBy:     sortBy,
		SortOrder:  sortOrder,
	}, userID)

	if err != nil {
		h.respondWithError(c, http.StatusInternalServerError, "Failed to list documents", err, "Please try again later")
		return
	}

	// Convert to API response format
	var documents []Document
	for _, doc := range result.Documents {
		downloadURL, _ := h.storageAdapter.GetURL(ctx, doc.StoragePath)
		
		documents = append(documents, Document{
			ID:             doc.ID,
			Title:          doc.Title,
			Description:    doc.Description,
			FileName:       doc.FileName,
			FileType:       doc.FileType,
			FileSize:       doc.FileSize,
			ProjectID:      doc.ProjectID,
			TaskID:         doc.TaskID,
			CurrentVersion: doc.CurrentVersion,
			TotalVersions:  doc.TotalVersions,
			Status:         doc.Status,
			Visibility:     doc.Visibility,
			StorageBackend: doc.StorageBackend,
			Checksum:       doc.Checksum,
			UploadedBy:     doc.UploadedBy,
			UpdatedBy:      doc.UpdatedBy,
			CreatedAt:      doc.CreatedAt,
			UpdatedAt:      doc.UpdatedAt,
			PublishedAt:    doc.PublishedAt,
			DownloadURL:    downloadURL,
			Metadata:       doc.Metadata,
		})
	}

	response := map[string]interface{}{
		"documents": documents,
		"pagination": map[string]interface{}{
			"page":       page,
			"page_size":  pageSize,
			"total":      result.Total,
			"total_pages": (result.Total + int64(pageSize) - 1) / int64(pageSize),
		},
	}

	h.respondWithSuccess(c, http.StatusOK, "Documents retrieved successfully", response)
}