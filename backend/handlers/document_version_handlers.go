package handlers

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// CreateVersion creates a new version of an existing document
// POST /api/v1/projects/:project_id/tasks/:task_id/documents/:document_id/versions
func (h *DocumentHandlers) CreateVersion(c *gin.Context) {
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

	// Parse form data
	var req struct {
		Title          string                 `form:"title" json:"title"`
		Description    string                 `form:"description" json:"description"`
		ChangesSummary string                 `form:"changes_summary" json:"changes_summary" binding:"required"`
		Metadata       map[string]interface{} `form:"metadata" json:"metadata"`
	}

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

	// Create version using service
	ctx := context.Background()
	version, err := h.documentVersionService.CreateVersion(ctx, documentID, &VersionUploadRequest{
		File:           fileHeader,
		Title:          req.Title,
		Description:    req.Description,
		ChangesSummary: req.ChangesSummary,
		Metadata:       req.Metadata,
	}, userID, c)

	if err != nil {
		h.respondWithError(c, http.StatusInternalServerError, "Failed to create version", err, "Please check your file and try again")
		return
	}

	// Generate download URL
	downloadURL, _ := h.storageAdapter.GetURL(ctx, version.StoragePath)

	// Convert to API response format
	response := DocumentVersion{
		ID:              version.ID,
		DocumentID:      version.DocumentID,
		VersionNumber:   version.VersionNumber,
		Title:           version.Title,
		Description:     version.Description,
		ChangesSummary:  version.ChangesSummary,
		FileName:        version.FileName,
		FileSize:        version.FileSize,
		Checksum:        version.Checksum,
		StoragePath:     version.StoragePath,
		ParentVersion:   version.ParentVersion,
		CreatedBy:       version.CreatedBy,
		CreatedByName:   version.CreatedByName,
		CreatedAt:       version.CreatedAt,
		Metadata:        version.Metadata,
		IsCurrent:       version.IsCurrent,
		DownloadURL:     downloadURL,
	}

	h.respondWithSuccess(c, http.StatusCreated, "Document version created successfully", response)
}

// GetVersionHistory retrieves the version history of a document
// GET /api/v1/projects/:project_id/tasks/:task_id/documents/:document_id/versions
func (h *DocumentHandlers) GetVersionHistory(c *gin.Context) {
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

	// Get version history using service
	ctx := context.Background()
	versions, err := h.documentVersionService.GetVersionHistory(ctx, documentID, userID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			h.respondWithError(c, http.StatusNotFound, "Document not found", err, "Please check the document ID and try again")
		} else {
			h.respondWithError(c, http.StatusInternalServerError, "Failed to retrieve version history", err, "Please try again later")
		}
		return
	}

	// Convert to API response format
	var response []DocumentVersion
	for _, version := range versions {
		downloadURL, _ := h.storageAdapter.GetURL(ctx, version.StoragePath)
		
		response = append(response, DocumentVersion{
			ID:              version.ID,
			DocumentID:      version.DocumentID,
			VersionNumber:   version.VersionNumber,
			Title:           version.Title,
			Description:     version.Description,
			ChangesSummary:  version.ChangesSummary,
			FileName:        version.FileName,
			FileSize:        version.FileSize,
			Checksum:        version.Checksum,
			StoragePath:     version.StoragePath,
			ParentVersion:   version.ParentVersion,
			CreatedBy:       version.CreatedBy,
			CreatedByName:   version.CreatedByName,
			CreatedAt:       version.CreatedAt,
			Metadata:        version.Metadata,
			IsCurrent:       version.IsCurrent,
			DownloadURL:     downloadURL,
		})
	}

	h.respondWithSuccess(c, http.StatusOK, "Version history retrieved successfully", response)
}

// GetVersion retrieves a specific version of a document
// GET /api/v1/projects/:project_id/tasks/:task_id/documents/:document_id/versions/:version_number
func (h *DocumentHandlers) GetVersion(c *gin.Context) {
	// Extract document ID and version number
	documentIDStr := c.Param("document_id")
	versionNumberStr := c.Param("version_number")

	documentID, err := strconv.ParseUint(documentIDStr, 10, 64)
	if err != nil {
		h.respondWithError(c, http.StatusBadRequest, "Invalid document ID", err, "Please provide a valid document ID")
		return
	}

	versionNumber, err := strconv.Atoi(versionNumberStr)
	if err != nil {
		h.respondWithError(c, http.StatusBadRequest, "Invalid version number", err, "Please provide a valid version number")
		return
	}

	// Get user ID from JWT
	userID, err := h.getUserID(c)
	if err != nil {
		h.respondWithError(c, http.StatusUnauthorized, "Authentication required", err, "Please provide a valid authentication token")
		return
	}

	// Get version using service
	ctx := context.Background()
	version, err := h.documentVersionService.GetVersion(ctx, documentID, versionNumber, userID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			h.respondWithError(c, http.StatusNotFound, "Version not found", err, "Please check the document ID and version number")
		} else {
			h.respondWithError(c, http.StatusInternalServerError, "Failed to retrieve version", err, "Please try again later")
		}
		return
	}

	// Generate download URL
	downloadURL, _ := h.storageAdapter.GetURL(ctx, version.StoragePath)

	// Convert to API response format
	response := DocumentVersion{
		ID:              version.ID,
		DocumentID:      version.DocumentID,
		VersionNumber:   version.VersionNumber,
		Title:           version.Title,
		Description:     version.Description,
		ChangesSummary:  version.ChangesSummary,
		FileName:        version.FileName,
		FileSize:        version.FileSize,
		Checksum:        version.Checksum,
		StoragePath:     version.StoragePath,
		ParentVersion:   version.ParentVersion,
		CreatedBy:       version.CreatedBy,
		CreatedByName:   version.CreatedByName,
		CreatedAt:       version.CreatedAt,
		Metadata:        version.Metadata,
		IsCurrent:       version.IsCurrent,
		DownloadURL:     downloadURL,
	}

	h.respondWithSuccess(c, http.StatusOK, "Version retrieved successfully", response)
}

// DownloadVersion downloads a specific version of a document
// GET /api/v1/projects/:project_id/tasks/:task_id/documents/:document_id/versions/:version_number/download
func (h *DocumentHandlers) DownloadVersion(c *gin.Context) {
	// Extract document ID and version number
	documentIDStr := c.Param("document_id")
	versionNumberStr := c.Param("version_number")

	documentID, err := strconv.ParseUint(documentIDStr, 10, 64)
	if err != nil {
		h.respondWithError(c, http.StatusBadRequest, "Invalid document ID", err, "Please provide a valid document ID")
		return
	}

	versionNumber, err := strconv.Atoi(versionNumberStr)
	if err != nil {
		h.respondWithError(c, http.StatusBadRequest, "Invalid version number", err, "Please provide a valid version number")
		return
	}

	// Get user ID from JWT
	userID, err := h.getUserID(c)
	if err != nil {
		h.respondWithError(c, http.StatusUnauthorized, "Authentication required", err, "Please provide a valid authentication token")
		return
	}

	// Download version using service
	ctx := context.Background()
	reader, version, err := h.documentVersionService.DownloadVersion(ctx, documentID, versionNumber, userID, c)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			h.respondWithError(c, http.StatusNotFound, "Version not found", err, "Please check the document ID and version number")
		} else {
			h.respondWithError(c, http.StatusInternalServerError, "Failed to download version", err, "Please try again later")
		}
		return
	}
	defer reader.Close()

	// Set response headers
	c.Header("Content-Type", h.getContentType(version.FileName))
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", version.FileName))
	c.Header("Content-Length", fmt.Sprintf("%d", version.FileSize))

	// Stream file content
	c.DataFromReader(http.StatusOK, version.FileSize, h.getContentType(version.FileName), reader, nil)
}

// RestoreVersion restores a document to a specific version
// POST /api/v1/projects/:project_id/tasks/:task_id/documents/:document_id/versions/:version_number/restore
func (h *DocumentHandlers) RestoreVersion(c *gin.Context) {
	// Extract document ID and version number
	documentIDStr := c.Param("document_id")
	versionNumberStr := c.Param("version_number")

	documentID, err := strconv.ParseUint(documentIDStr, 10, 64)
	if err != nil {
		h.respondWithError(c, http.StatusBadRequest, "Invalid document ID", err, "Please provide a valid document ID")
		return
	}

	versionNumber, err := strconv.Atoi(versionNumberStr)
	if err != nil {
		h.respondWithError(c, http.StatusBadRequest, "Invalid version number", err, "Please provide a valid version number")
		return
	}

	// Get user ID from JWT
	userID, err := h.getUserID(c)
	if err != nil {
		h.respondWithError(c, http.StatusUnauthorized, "Authentication required", err, "Please provide a valid authentication token")
		return
	}

	// Restore version using service
	ctx := context.Background()
	version, err := h.documentVersionService.RestoreVersion(ctx, documentID, versionNumber, userID, c)
	if err != nil {
		statusCode := http.StatusInternalServerError
		if err == gorm.ErrRecordNotFound {
			statusCode = http.StatusNotFound
		} else if err.Error() == "permission denied: cannot restore version" {
			statusCode = http.StatusForbidden
		}
		
		h.respondWithError(c, statusCode, "Failed to restore version", err, "Please check your permissions and try again")
		return
	}

	// Generate download URL
	downloadURL, _ := h.storageAdapter.GetURL(ctx, version.StoragePath)

	// Convert to API response format
	response := DocumentVersion{
		ID:              version.ID,
		DocumentID:      version.DocumentID,
		VersionNumber:   version.VersionNumber,
		Title:           version.Title,
		Description:     version.Description,
		ChangesSummary:  version.ChangesSummary,
		FileName:        version.FileName,
		FileSize:        version.FileSize,
		Checksum:        version.Checksum,
		StoragePath:     version.StoragePath,
		ParentVersion:   version.ParentVersion,
		CreatedBy:       version.CreatedBy,
		CreatedByName:   version.CreatedByName,
		CreatedAt:       version.CreatedAt,
		Metadata:        version.Metadata,
		IsCurrent:       version.IsCurrent,
		DownloadURL:     downloadURL,
	}

	h.respondWithSuccess(c, http.StatusOK, "Version restored successfully", response)
}

// CompareVersions compares two versions of a document
// GET /api/v1/projects/:project_id/tasks/:task_id/documents/:document_id/versions/compare?version1=1&version2=2
func (h *DocumentHandlers) CompareVersions(c *gin.Context) {
	// Extract document ID
	documentIDStr := c.Param("document_id")
	documentID, err := strconv.ParseUint(documentIDStr, 10, 64)
	if err != nil {
		h.respondWithError(c, http.StatusBadRequest, "Invalid document ID", err, "Please provide a valid document ID")
		return
	}

	// Extract version numbers from query parameters
	version1Str := c.Query("version1")
	version2Str := c.Query("version2")

	if version1Str == "" || version2Str == "" {
		h.respondWithError(c, http.StatusBadRequest, "Version numbers required", 
			fmt.Errorf("both version1 and version2 query parameters are required"),
			"Please provide both version1 and version2 parameters")
		return
	}

	version1, err := strconv.Atoi(version1Str)
	if err != nil {
		h.respondWithError(c, http.StatusBadRequest, "Invalid version1", err, "Please provide a valid version1 number")
		return
	}

	version2, err := strconv.Atoi(version2Str)
	if err != nil {
		h.respondWithError(c, http.StatusBadRequest, "Invalid version2", err, "Please provide a valid version2 number")
		return
	}

	// Get user ID from JWT
	userID, err := h.getUserID(c)
	if err != nil {
		h.respondWithError(c, http.StatusUnauthorized, "Authentication required", err, "Please provide a valid authentication token")
		return
	}

	// Compare versions using service
	ctx := context.Background()
	comparison, err := h.documentVersionService.CompareVersions(ctx, documentID, version1, version2, userID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			h.respondWithError(c, http.StatusNotFound, "Document or version not found", err, "Please check the document ID and version numbers")
		} else {
			h.respondWithError(c, http.StatusInternalServerError, "Failed to compare versions", err, "Please try again later")
		}
		return
	}

	// Generate download URLs
	downloadURL1, _ := h.storageAdapter.GetURL(ctx, comparison.Version1.StoragePath)
	downloadURL2, _ := h.storageAdapter.GetURL(ctx, comparison.Version2.StoragePath)

	// Convert to API response format
	response := map[string]interface{}{
		"version1": DocumentVersion{
			ID:              comparison.Version1.ID,
			DocumentID:      comparison.Version1.DocumentID,
			VersionNumber:   comparison.Version1.VersionNumber,
			Title:           comparison.Version1.Title,
			Description:     comparison.Version1.Description,
			ChangesSummary:  comparison.Version1.ChangesSummary,
			FileName:        comparison.Version1.FileName,
			FileSize:        comparison.Version1.FileSize,
			Checksum:        comparison.Version1.Checksum,
			StoragePath:     comparison.Version1.StoragePath,
			ParentVersion:   comparison.Version1.ParentVersion,
			CreatedBy:       comparison.Version1.CreatedBy,
			CreatedByName:   comparison.Version1.CreatedByName,
			CreatedAt:       comparison.Version1.CreatedAt,
			Metadata:        comparison.Version1.Metadata,
			IsCurrent:       comparison.Version1.IsCurrent,
			DownloadURL:     downloadURL1,
		},
		"version2": DocumentVersion{
			ID:              comparison.Version2.ID,
			DocumentID:      comparison.Version2.DocumentID,
			VersionNumber:   comparison.Version2.VersionNumber,
			Title:           comparison.Version2.Title,
			Description:     comparison.Version2.Description,
			ChangesSummary:  comparison.Version2.ChangesSummary,
			FileName:        comparison.Version2.FileName,
			FileSize:        comparison.Version2.FileSize,
			Checksum:        comparison.Version2.Checksum,
			StoragePath:     comparison.Version2.StoragePath,
			ParentVersion:   comparison.Version2.ParentVersion,
			CreatedBy:       comparison.Version2.CreatedBy,
			CreatedByName:   comparison.Version2.CreatedByName,
			CreatedAt:       comparison.Version2.CreatedAt,
			Metadata:        comparison.Version2.Metadata,
			IsCurrent:       comparison.Version2.IsCurrent,
			DownloadURL:     downloadURL2,
		},
		"comparison": map[string]interface{}{
			"size_diff":       comparison.SizeDiff,
			"content_changed": comparison.ContentChanged,
			"summary":         comparison.Summary,
		},
	}

	h.respondWithSuccess(c, http.StatusOK, "Version comparison completed successfully", response)
}

// DeleteVersion deletes a specific version (only if it's not the current version)
// DELETE /api/v1/projects/:project_id/tasks/:task_id/documents/:document_id/versions/:version_number
func (h *DocumentHandlers) DeleteVersion(c *gin.Context) {
	// Extract document ID and version number
	documentIDStr := c.Param("document_id")
	versionNumberStr := c.Param("version_number")

	documentID, err := strconv.ParseUint(documentIDStr, 10, 64)
	if err != nil {
		h.respondWithError(c, http.StatusBadRequest, "Invalid document ID", err, "Please provide a valid document ID")
		return
	}

	versionNumber, err := strconv.Atoi(versionNumberStr)
	if err != nil {
		h.respondWithError(c, http.StatusBadRequest, "Invalid version number", err, "Please provide a valid version number")
		return
	}

	// Get user ID from JWT
	userID, err := h.getUserID(c)
	if err != nil {
		h.respondWithError(c, http.StatusUnauthorized, "Authentication required", err, "Please provide a valid authentication token")
		return
	}

	// Delete version using service
	ctx := context.Background()
	err = h.documentVersionService.DeleteVersion(ctx, documentID, versionNumber, userID, c)
	if err != nil {
		statusCode := http.StatusInternalServerError
		if err == gorm.ErrRecordNotFound {
			statusCode = http.StatusNotFound
		} else if err.Error() == "permission denied: cannot delete version" {
			statusCode = http.StatusForbidden
		} else if err.Error() == "cannot delete the current version" || err.Error() == "cannot delete the only version" {
			statusCode = http.StatusBadRequest
		}
		
		h.respondWithError(c, statusCode, "Failed to delete version", err, "Please check your permissions and try again")
		return
	}

	h.respondWithSuccess(c, http.StatusOK, "Version deleted successfully", nil)
}

// UpdateDocument updates a document's metadata
// PUT /api/v1/projects/:project_id/tasks/:task_id/documents/:document_id
func (h *DocumentHandlers) UpdateDocument(c *gin.Context) {
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

	// Parse JSON request
	var req struct {
		Title       *string                `json:"title"`
		Description *string                `json:"description"`
		Status      *string                `json:"status"`
		Visibility  *string                `json:"visibility"`
		Tags        []string               `json:"tags"`
		Metadata    map[string]interface{} `json:"metadata"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		h.respondWithError(c, http.StatusBadRequest, "Invalid request data", err, "Please check your JSON data and try again")
		return
	}

	// Update document using service
	ctx := context.Background()
	document, err := h.documentService.UpdateDocument(ctx, documentID, &UpdateDocumentRequest{
		Title:       req.Title,
		Description: req.Description,
		Status:      req.Status,
		Visibility:  req.Visibility,
		Tags:        req.Tags,
		Metadata:    req.Metadata,
	}, userID, c)

	if err != nil {
		statusCode := http.StatusInternalServerError
		if err == gorm.ErrRecordNotFound {
			statusCode = http.StatusNotFound
		} else if err.Error() == "permission denied: cannot update document" {
			statusCode = http.StatusForbidden
		}
		
		h.respondWithError(c, statusCode, "Failed to update document", err, "Please check your permissions and try again")
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

	h.respondWithSuccess(c, http.StatusOK, "Document updated successfully", response)
}

// DeleteDocument soft-deletes a document
// DELETE /api/v1/projects/:project_id/tasks/:task_id/documents/:document_id
func (h *DocumentHandlers) DeleteDocument(c *gin.Context) {
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

	// Delete document using service
	ctx := context.Background()
	err = h.documentService.DeleteDocument(ctx, documentID, userID, c)
	if err != nil {
		statusCode := http.StatusInternalServerError
		if err == gorm.ErrRecordNotFound {
			statusCode = http.StatusNotFound
		} else if err.Error() == "permission denied: cannot delete document" {
			statusCode = http.StatusForbidden
		}
		
		h.respondWithError(c, statusCode, "Failed to delete document", err, "Please check your permissions and try again")
		return
	}

	h.respondWithSuccess(c, http.StatusOK, "Document deleted successfully", nil)
}