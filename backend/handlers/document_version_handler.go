package handlers

import (
	"io"
	"net/http"
	"strconv"
	"time"

	"ai-project-backend/models"
	"ai-project-backend/services"
	"github.com/gin-gonic/gin"
)

// DocumentVersionHandler handles document version control operations
type DocumentVersionHandler struct {
	versionService *services.DocumentVersionService
}

// NewDocumentVersionHandler creates a new document version handler
func NewDocumentVersionHandler(versionService *services.DocumentVersionService) *DocumentVersionHandler {
	return &DocumentVersionHandler{
		versionService: versionService,
	}
}

// GetVersionHistory godoc
// @Summary Get document version history
// @Description Retrieve the version history of a document
// @Tags Document Versions
// @Accept json
// @Produce json
// @Param document_id path int true "Document ID"
// @Success 200 {object} models.DocumentVersionHistoryResponse
// @Failure 400 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/documents/{document_id}/versions [get]
func (h *DocumentVersionHandler) GetVersionHistory(c *gin.Context) {
	// Support both "id" (global routes) and "documentId" (task routes) parameters
	// Prioritize documentId (task routes) over id (global routes)
	documentIDStr := c.Param("documentId")
	if documentIDStr == "" {
		documentIDStr = c.Param("id")
	}
	documentID, err := strconv.ParseUint(documentIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的文档ID",
			"error":   err.Error(),
		})
		return
	}

	// Get user ID from context (from auth middleware)
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "未授权",
		})
		return
	}

	// Convert userID to uint64
	var userIDUint64 uint64
	switch v := userID.(type) {
	case int:
		userIDUint64 = uint64(v)
	case int64:
		userIDUint64 = uint64(v)
	case uint64:
		userIDUint64 = v
	default:
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "无效的用户ID类型",
		})
		return
	}

	versions, err := h.versionService.GetVersionHistory(c.Request.Context(), documentID, userIDUint64)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "获取版本历史失败",
			"error":   err.Error(),
		})
		return
	}

	// Convert to response format
	// Initialize as empty slice to avoid null in JSON response when no versions exist
	versionPtrs := make([]*models.DocumentVersion, 0, len(versions))
	for _, v := range versions {
		version := &models.DocumentVersion{
			ID:            int(v.ID),
			DocumentID:    int(v.DocumentID),
			VersionNumber: v.VersionNumber,
			Title:         v.Title,
			FileSize:      v.FileSize,
			CreatedBy:     int(v.CreatedBy),
			CreatedAt:     v.CreatedAt,
			Metadata:      models.MetadataJSON(v.Metadata),
		}
		if v.ChangesSummary != "" {
			version.ChangeSummary = &v.ChangesSummary
		}
		// Add content from service response
		if v.Content != "" {
			version.Content = &v.Content
		}
		versionPtrs = append(versionPtrs, version)
	}

	response := models.DocumentVersionHistoryResponse{
		DocumentID: int(documentID),
		Versions:   versionPtrs,
		Stats: models.DocumentVersionStats{
			DocumentID:    int(documentID),
			TotalVersions: len(versions),
			CurrentVersion: func() int {
				for _, v := range versions {
					if v.IsCurrent {
						return v.VersionNumber
					}
				}
				return 1
			}(),
		},
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "获取版本历史成功",
		"data":    response,
	})
}

// GetVersion godoc
// @Summary Get specific document version
// @Description Retrieve a specific version of a document
// @Tags Document Versions
// @Accept json
// @Produce json
// @Param document_id path int true "Document ID"
// @Param version_number path int true "Version Number"
// @Success 200 {object} services.DocumentVersionInfo
// @Failure 400 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/documents/{document_id}/versions/{version_number} [get]
func (h *DocumentVersionHandler) GetVersion(c *gin.Context) {
	// Support both "id" (global routes) and "documentId" (task routes) parameters
	// Prioritize documentId (task routes) over id (global routes)
	documentIDStr := c.Param("documentId")
	if documentIDStr == "" {
		documentIDStr = c.Param("id")
	}
	documentID, err := strconv.ParseUint(documentIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的文档ID",
			"error":   err.Error(),
		})
		return
	}

	versionNumberStr := c.Param("version_number")
	versionNumber, err := strconv.Atoi(versionNumberStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的版本号",
			"error":   err.Error(),
		})
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "未授权",
		})
		return
	}

	// Convert userID to uint64
	var userIDUint64 uint64
	switch v := userID.(type) {
	case int:
		userIDUint64 = uint64(v)
	case int64:
		userIDUint64 = uint64(v)
	case uint64:
		userIDUint64 = v
	default:
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "无效的用户ID类型",
		})
		return
	}

	version, err := h.versionService.GetVersion(c.Request.Context(), documentID, versionNumber, userIDUint64)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "版本不存在",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "获取版本信息成功",
		"data":    version,
	})
}

// CreateVersion godoc
// @Summary Create new document version
// @Description Create a new version of an existing document
// @Tags Document Versions
// @Accept multipart/form-data
// @Produce json
// @Param document_id path int true "Document ID"
// @Param file formData file true "Document file"
// @Param title formData string false "Version title"
// @Param description formData string false "Version description"
// @Param changes_summary formData string true "Summary of changes"
// @Success 201 {object} services.DocumentVersionInfo
// @Failure 400 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/documents/{document_id}/versions [post]
func (h *DocumentVersionHandler) CreateVersion(c *gin.Context) {
	// Support both "id" (global routes) and "documentId" (task routes) parameters
	// Prioritize documentId (task routes) over id (global routes)
	documentIDStr := c.Param("documentId")
	if documentIDStr == "" {
		documentIDStr = c.Param("id")
	}
	documentID, err := strconv.ParseUint(documentIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的文档ID",
			"error":   err.Error(),
		})
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "未授权",
		})
		return
	}

	// Parse multipart form
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "文件上传失败",
			"error":   err.Error(),
		})
		return
	}

	req := &services.VersionUploadRequest{
		File:           file,
		Title:          c.PostForm("title"),
		Description:    c.PostForm("description"),
		ChangesSummary: c.PostForm("changes_summary"),
		Metadata:       make(map[string]interface{}),
	}

	if req.ChangesSummary == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "变更摘要为必填项",
		})
		return
	}

	version, err := h.versionService.CreateVersion(c.Request.Context(), documentID, req, userID.(uint64), c)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "创建版本失败",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "版本创建成功",
		"data":    version,
	})
}

// RestoreVersion godoc
// @Summary Restore document to specific version
// @Description Restore a document to a specific version
// @Tags Document Versions
// @Accept json
// @Produce json
// @Param document_id path int true "Document ID"
// @Param version_number path int true "Version Number"
// @Param body body models.RestoreDocumentVersionRequest true "Restore request"
// @Success 200 {object} services.DocumentVersionInfo
// @Failure 400 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/documents/{document_id}/versions/{version_number}/restore [post]
func (h *DocumentVersionHandler) RestoreVersion(c *gin.Context) {
	// Support both "id" (global routes) and "documentId" (task routes) parameters
	// Prioritize documentId (task routes) over id (global routes)
	documentIDStr := c.Param("documentId")
	if documentIDStr == "" {
		documentIDStr = c.Param("id")
	}
	documentID, err := strconv.ParseUint(documentIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的文档ID",
			"error":   err.Error(),
		})
		return
	}

	versionNumberStr := c.Param("version_number")
	versionNumber, err := strconv.Atoi(versionNumberStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的版本号",
			"error":   err.Error(),
		})
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "未授权",
		})
		return
	}

	version, err := h.versionService.RestoreVersion(c.Request.Context(), documentID, versionNumber, userID.(uint64), c)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "恢复版本失败",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "版本恢复成功",
		"data":    version,
	})
}

// CompareVersions godoc
// @Summary Compare document versions
// @Description Compare two versions of a document
// @Tags Document Versions
// @Accept json
// @Produce json
// @Param document_id path int true "Document ID"
// @Param from_version query int true "From version number"
// @Param to_version query int true "To version number"
// @Success 200 {object} services.VersionComparisonResult
// @Failure 400 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/documents/{document_id}/versions/compare [get]
func (h *DocumentVersionHandler) CompareVersions(c *gin.Context) {
	// Support both "id" (global routes) and "documentId" (task routes) parameters
	// Prioritize documentId (task routes) over id (global routes)
	documentIDStr := c.Param("documentId")
	if documentIDStr == "" {
		documentIDStr = c.Param("id")
	}
	documentID, err := strconv.ParseUint(documentIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的文档ID",
			"error":   err.Error(),
		})
		return
	}

	fromVersionStr := c.Query("from_version")
	fromVersion, err := strconv.Atoi(fromVersionStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的源版本号",
			"error":   err.Error(),
		})
		return
	}

	toVersionStr := c.Query("to_version")
	toVersion, err := strconv.Atoi(toVersionStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的目标版本号",
			"error":   err.Error(),
		})
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "未授权",
		})
		return
	}

	comparison, err := h.versionService.CompareVersions(c.Request.Context(), documentID, fromVersion, toVersion, userID.(uint64))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "版本比较失败",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "版本比较成功",
		"data":    comparison,
	})
}

// DownloadVersion godoc
// @Summary Download specific document version
// @Description Download a specific version of a document
// @Tags Document Versions
// @Produce application/octet-stream
// @Param document_id path int true "Document ID"
// @Param version_number path int true "Version Number"
// @Success 200 {file} file
// @Failure 400 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/documents/{document_id}/versions/{version_number}/download [get]
func (h *DocumentVersionHandler) DownloadVersion(c *gin.Context) {
	// Support both "id" (global routes) and "documentId" (task routes) parameters
	// Prioritize documentId (task routes) over id (global routes)
	documentIDStr := c.Param("documentId")
	if documentIDStr == "" {
		documentIDStr = c.Param("id")
	}
	documentID, err := strconv.ParseUint(documentIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的文档ID",
			"error":   err.Error(),
		})
		return
	}

	versionNumberStr := c.Param("version_number")
	versionNumber, err := strconv.Atoi(versionNumberStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的版本号",
			"error":   err.Error(),
		})
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "未授权",
		})
		return
	}

	reader, version, err := h.versionService.DownloadVersion(c.Request.Context(), documentID, versionNumber, userID.(uint64), c)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "下载版本失败",
			"error":   err.Error(),
		})
		return
	}
	defer reader.Close()

	// Set response headers
	filename := version.FileName
	if filename == "" {
		filename = version.Title
	}
	c.Header("Content-Disposition", "attachment; filename="+filename)
	c.Header("Content-Type", "application/octet-stream")
	c.Header("Content-Length", strconv.FormatInt(version.FileSize, 10))

	// Stream file content
	_, err = io.Copy(c.Writer, reader)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "下载失败",
			"error":   err.Error(),
		})
		return
	}
}

// DeleteVersion godoc
// @Summary Delete document version
// @Description Delete a specific version of a document (cannot delete current version)
// @Tags Document Versions
// @Accept json
// @Produce json
// @Param document_id path int true "Document ID"
// @Param version_number path int true "Version Number"
// @Success 200 {object} models.APIResponse
// @Failure 400 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/documents/{document_id}/versions/{version_number} [delete]
func (h *DocumentVersionHandler) DeleteVersion(c *gin.Context) {
	// Support both "id" (global routes) and "documentId" (task routes) parameters
	// Prioritize documentId (task routes) over id (global routes)
	documentIDStr := c.Param("documentId")
	if documentIDStr == "" {
		documentIDStr = c.Param("id")
	}
	documentID, err := strconv.ParseUint(documentIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的文档ID",
			"error":   err.Error(),
		})
		return
	}

	versionNumberStr := c.Param("version_number")
	versionNumber, err := strconv.Atoi(versionNumberStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的版本号",
			"error":   err.Error(),
		})
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "未授权",
		})
		return
	}

	err = h.versionService.DeleteVersion(c.Request.Context(), documentID, versionNumber, userID.(uint64), c)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "删除版本失败",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "版本删除成功",
		"data": gin.H{
			"deleted_version": versionNumber,
			"timestamp":       time.Now(),
		},
	})
}
