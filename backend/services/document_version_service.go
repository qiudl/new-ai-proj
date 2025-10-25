package services

import (
	"context"
	"crypto/sha256"
	"fmt"
	"io"
	"mime/multipart"
	"time"

	"ai-project-backend/models"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// DocumentVersionService handles document version management
type DocumentVersionService struct {
	db             *gorm.DB
	storageAdapter StorageAdapter
	baseService    *DocumentService
}

// NewDocumentVersionService creates a new document version service
func NewDocumentVersionService(db *gorm.DB, storageAdapter StorageAdapter, baseService *DocumentService) *DocumentVersionService {
	return &DocumentVersionService{
		db:             db,
		storageAdapter: storageAdapter,
		baseService:    baseService,
	}
}

// DocumentVersionInfo represents version information
type DocumentVersionInfo struct {
	ID             uint64                 `json:"id"`
	DocumentID     uint64                 `json:"document_id"`
	VersionNumber  int                    `json:"version_number"`
	Title          string                 `json:"title"`
	Content        string                 `json:"content,omitempty"` // 版本内容（可选，根据include_content参数）
	Description    string                 `json:"description"`
	ChangesSummary string                 `json:"changes_summary"`
	FileName       string                 `json:"file_name"`
	FileSize       int64                  `json:"file_size"`
	Checksum       string                 `json:"checksum"`
	StoragePath    string                 `json:"storage_path"`
	ParentVersion  *int                   `json:"parent_version"`
	CreatedBy      uint64                 `json:"created_by"`
	CreatedByName  string                 `json:"created_by_name"`
	CreatedAt      time.Time              `json:"created_at"`
	Metadata       map[string]interface{} `json:"metadata"`
	IsCurrent      bool                   `json:"is_current"`
}

// VersionUploadRequest represents a request to create a new version
type VersionUploadRequest struct {
	File           *multipart.FileHeader  `json:"file" binding:"required"`
	Title          string                 `json:"title"`
	Description    string                 `json:"description"`
	ChangesSummary string                 `json:"changes_summary" binding:"required"`
	Metadata       map[string]interface{} `json:"metadata"`
}

// VersionComparisonResult represents the result of comparing two versions
type VersionComparisonResult struct {
	Version1       *DocumentVersionInfo `json:"version1"`
	Version2       *DocumentVersionInfo `json:"version2"`
	SizeDiff       int64                `json:"size_diff"`
	ContentChanged bool                 `json:"content_changed"`
	Summary        string               `json:"summary"`
}

// CreateVersion creates a new version of an existing document
func (dvs *DocumentVersionService) CreateVersion(ctx context.Context, documentID uint64, req *VersionUploadRequest, userID uint64, c *gin.Context) (*DocumentVersionInfo, error) {
	// Get the existing document (simplified for now)
	var document models.TaskDocument
	if err := dvs.db.Where("id = ?", documentID).First(&document).Error; err != nil {
		return nil, fmt.Errorf("failed to get document: %w", err)
	}

	// Basic permission check - owner or creator can create versions
	if document.OwnerID != int(userID) && document.CreatedBy != int(userID) {
		return nil, fmt.Errorf("permission denied: cannot create version")
	}

	// Validate uploaded file
	if req.File == nil {
		return nil, fmt.Errorf("file is required")
	}

	// Open uploaded file
	src, err := req.File.Open()
	if err != nil {
		return nil, fmt.Errorf("failed to open uploaded file: %w", err)
	}
	defer src.Close()

	// Calculate file checksum
	hash := sha256.New()
	fileContent := make([]byte, req.File.Size)
	if _, err := io.ReadFull(src, fileContent); err != nil {
		return nil, fmt.Errorf("failed to read file content: %w", err)
	}
	hash.Write(fileContent)
	checksum := fmt.Sprintf("%x", hash.Sum(nil))

	// Skip checksum comparison for now since TaskDocument doesn't have Checksum field
	// TODO: Add checksum field to TaskDocument or implement checksum checking

	// Reset file reader
	src, err = req.File.Open()
	if err != nil {
		return nil, fmt.Errorf("failed to reopen file: %w", err)
	}
	defer src.Close()

	// Generate new version number
	nextVersion := document.Version + 1

	// Generate storage path for new version
	fileName := req.File.Filename // Use original filename for now
	storagePath := dvs.generateVersionStoragePath(uint64(document.ProjectID), uint64(document.TaskID), documentID, nextVersion, fileName)

	// Store the new version file
	if err := dvs.storageAdapter.Store(ctx, storagePath, src); err != nil {
		return nil, fmt.Errorf("failed to store file: %w", err)
	}

	// Begin transaction
	tx := dvs.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Create version record
	title := req.Title
	if title == "" {
		title = document.Title
	}

	version := &models.DocumentVersion{
		DocumentID:     int(documentID),
		VersionNumber:  nextVersion,
		Title:          title,
		Content:        nil, // File-based version, no inline content
		FileSize:       req.File.Size,
		ChangeSummary:  &req.ChangesSummary,
		CreatedBy:      int(userID),
		CreatedAt:      time.Now(),
		IsMajorVersion: false, // Default to minor version
		Metadata:       models.MetadataJSON(req.Metadata),
	}

	if err := tx.Create(version).Error; err != nil {
		tx.Rollback()
		dvs.storageAdapter.Delete(ctx, storagePath)
		return nil, fmt.Errorf("failed to create version record: %w", err)
	}

	// Update document with new version info
	updates := map[string]interface{}{
		"version":    nextVersion,
		"updated_at": time.Now(),
	}

	if title != document.Title {
		updates["title"] = title
	}

	if err := tx.Model(document).Updates(updates).Error; err != nil {
		tx.Rollback()
		dvs.storageAdapter.Delete(ctx, storagePath)
		return nil, fmt.Errorf("failed to update document: %w", err)
	}

	// TODO: Add logging functionality when DocumentOperation model is available

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		dvs.storageAdapter.Delete(ctx, storagePath)
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	// Return version info
	return &DocumentVersionInfo{
		ID:             uint64(version.ID),
		DocumentID:     documentID,
		VersionNumber:  nextVersion,
		Title:          title,
		Description:    req.Description,
		ChangesSummary: req.ChangesSummary,
		FileName:       fileName,
		FileSize:       req.File.Size,
		Checksum:       checksum,
		StoragePath:    storagePath,
		ParentVersion:  &document.Version,
		CreatedBy:      userID,
		CreatedAt:      time.Now(),
		Metadata:       req.Metadata,
		IsCurrent:      true,
	}, nil
}

// GetVersionHistory retrieves the version history of a document
// includeContent: if true, includes full content in response; if false, omits content
func (dvs *DocumentVersionService) GetVersionHistory(ctx context.Context, documentID uint64, userID uint64, includeContent bool) ([]DocumentVersionInfo, error) {
	// Check if user can access the document (simplified permission check)
	// Use raw SQL to avoid CustomFields parsing issues
	var documentExists bool
	var documentVersion int
	err := dvs.db.Raw("SELECT EXISTS(SELECT 1 FROM documents WHERE id = ?), COALESCE((SELECT version FROM documents WHERE id = ?), 1)", documentID, documentID).Row().Scan(&documentExists, &documentVersion)
	if err != nil {
		return nil, fmt.Errorf("failed to check document: %w", err)
	}
	if !documentExists {
		return nil, fmt.Errorf("document not found")
	}

	// Query versions with user information
	var versions []struct {
		models.DocumentVersion
		CreatedByName string `json:"created_by_name"`
	}

	// Build query based on includeContent parameter
	var query string
	if includeContent {
		query = `
			SELECT v.id, v.document_id, v.version_number, v.title, v.content,
			       v.changes_summary as change_summary, v.metadata, v.created_by, v.created_at,
			       false as is_major_version, null as tags, 0 as label_count, 0 as comment_count,
			       u.username as created_by_name
			FROM document_versions v
			LEFT JOIN users u ON v.created_by = u.id
			WHERE v.document_id = ?
			ORDER BY v.version_number DESC
		`
	} else {
		// Omit content field when not needed
		query = `
			SELECT v.id, v.document_id, v.version_number, v.title, NULL as content,
			       v.changes_summary as change_summary, v.metadata, v.created_by, v.created_at,
			       false as is_major_version, null as tags, 0 as label_count, 0 as comment_count,
			       u.username as created_by_name
			FROM document_versions v
			LEFT JOIN users u ON v.created_by = u.id
			WHERE v.document_id = ?
			ORDER BY v.version_number DESC
		`
	}

	if err := dvs.db.Raw(query, documentID).Scan(&versions).Error; err != nil {
		return nil, fmt.Errorf("failed to retrieve version history: %w", err)
	}

	// Convert to response format
	var versionInfos []DocumentVersionInfo
	for _, v := range versions {
		changeSummary := func() string {
			if v.ChangeSummary != nil {
				return *v.ChangeSummary
			}
			return ""
		}()

		versionInfos = append(versionInfos, DocumentVersionInfo{
			ID:            uint64(v.ID),
			DocumentID:    uint64(v.DocumentID),
			VersionNumber: v.VersionNumber,
			Title:         v.Title,
			Content: func() string {
				if v.Content != nil {
					return *v.Content
				}
				return ""
			}(),
			Description:    changeSummary, // Use smart change summary for description
			ChangesSummary: changeSummary,
			FileName:      "", // Not available in DocumentVersion model
			FileSize:      v.FileSize,
			Checksum:      "",  // Not available in DocumentVersion model
			StoragePath:   "",  // Not available in DocumentVersion model
			ParentVersion: nil, // Not available in DocumentVersion model
			CreatedBy:     uint64(v.CreatedBy),
			CreatedByName: v.CreatedByName,
			CreatedAt:     v.CreatedAt,
			Metadata:      map[string]interface{}(v.Metadata),
			IsCurrent:     v.VersionNumber == documentVersion,
		})
	}

	return versionInfos, nil
}

// GetVersion retrieves a specific version of a document
// versionNumber: can be either version_number (1,2,3...) or version_id (373,374...)
// The method will try version_number first, then fall back to version_id
func (dvs *DocumentVersionService) GetVersion(ctx context.Context, documentID uint64, versionNumber int, userID uint64) (*DocumentVersionInfo, error) {
	// Check if user can access the document (simplified permission check)
	// Use raw SQL to avoid CustomFields parsing issues
	var documentExists bool
	err := dvs.db.Raw("SELECT EXISTS(SELECT 1 FROM documents WHERE id = ?)", documentID).Row().Scan(&documentExists)
	if err != nil {
		return nil, fmt.Errorf("failed to check document: %w", err)
	}
	if !documentExists {
		return nil, fmt.Errorf("document not found")
	}

	// Query the specific version
	var versionData struct {
		models.DocumentVersion
		CreatedByName string `json:"created_by_name"`
		IsCurrent     bool   `json:"is_current"`
	}

	// First try to query by version_number
	query := `
		SELECT v.id, v.document_id, v.version_number, v.title, v.content,
		       v.changes_summary as change_summary, v.metadata, v.created_by, v.created_at,
		       false as is_major_version, null as tags, 0 as label_count, 0 as comment_count,
		       u.username as created_by_name,
		       (v.version_number = d.version) as is_current
		FROM document_versions v
		LEFT JOIN users u ON v.created_by = u.id
		LEFT JOIN documents d ON v.document_id = d.id
		WHERE v.document_id = ? AND v.version_number = ?
	`

	err = dvs.db.Raw(query, documentID, versionNumber).Scan(&versionData).Error

	// If not found by version_number, try by version_id
	if err == gorm.ErrRecordNotFound || versionData.ID == 0 {
		queryByID := `
			SELECT v.id, v.document_id, v.version_number, v.title, v.content,
			       v.changes_summary as change_summary, v.metadata, v.created_by, v.created_at,
			       false as is_major_version, null as tags, 0 as label_count, 0 as comment_count,
			       u.username as created_by_name,
			       (v.version_number = d.version) as is_current
			FROM document_versions v
			LEFT JOIN users u ON v.created_by = u.id
			LEFT JOIN documents d ON v.document_id = d.id
			WHERE v.document_id = ? AND v.id = ?
		`
		err = dvs.db.Raw(queryByID, documentID, versionNumber).Scan(&versionData).Error
	}

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("version %d not found for document %d", versionNumber, documentID)
		}
		return nil, fmt.Errorf("failed to retrieve version: %w", err)
	}

	// Check if we actually got data
	if versionData.ID == 0 {
		return nil, fmt.Errorf("version %d not found for document %d", versionNumber, documentID)
	}

	changeSummary := func() string {
		if versionData.ChangeSummary != nil {
			return *versionData.ChangeSummary
		}
		return ""
	}()

	return &DocumentVersionInfo{
		ID:            uint64(versionData.ID),
		DocumentID:    uint64(versionData.DocumentID),
		VersionNumber: versionData.VersionNumber,
		Title:         versionData.Title,
		Content: func() string {
			if versionData.Content != nil {
				return *versionData.Content
			}
			return ""
		}(),
		Description:    changeSummary, // Use smart change summary for description
		ChangesSummary: changeSummary,
		FileName:      "", // Not available in DocumentVersion model
		FileSize:      versionData.FileSize,
		Checksum:      "",  // Not available in DocumentVersion model
		StoragePath:   "",  // Not available in DocumentVersion model
		ParentVersion: nil, // Not available in DocumentVersion model
		CreatedBy:     uint64(versionData.CreatedBy),
		CreatedByName: versionData.CreatedByName,
		CreatedAt:     versionData.CreatedAt,
		Metadata:      map[string]interface{}(versionData.Metadata),
		IsCurrent:     versionData.IsCurrent,
	}, nil
}

// DownloadVersion retrieves content for a specific version
func (dvs *DocumentVersionService) DownloadVersion(ctx context.Context, documentID uint64, versionNumber int, userID uint64, c *gin.Context) (io.ReadCloser, *DocumentVersionInfo, error) {
	// Get version info
	version, err := dvs.GetVersion(ctx, documentID, versionNumber, userID)
	if err != nil {
		return nil, nil, err
	}

	// Retrieve file content
	reader, err := dvs.storageAdapter.Retrieve(ctx, version.StoragePath)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to retrieve version content: %w", err)
	}

	// TODO: Add download logging when DocumentOperation model is available

	return reader, version, nil
}

// RestoreVersion restores a document to a specific version
func (dvs *DocumentVersionService) RestoreVersion(ctx context.Context, documentID uint64, versionNumber int, userID uint64, c *gin.Context) (*DocumentVersionInfo, error) {
	// Check if user can edit the document (simplified permission check)
	var document models.TaskDocument
	if err := dvs.db.Where("id = ?", documentID).First(&document).Error; err != nil {
		return nil, fmt.Errorf("failed to get document: %w", err)
	}

	// Basic permission check - owner or creator can restore versions
	if document.OwnerID != int(userID) && document.CreatedBy != int(userID) {
		return nil, fmt.Errorf("permission denied: cannot restore version")
	}

	// Get the version to restore to
	version, err := dvs.GetVersion(ctx, documentID, versionNumber, userID)
	if err != nil {
		return nil, err
	}

	if version.IsCurrent {
		return nil, fmt.Errorf("version %d is already the current version", versionNumber)
	}

	// Begin transaction
	tx := dvs.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Update document to use the restored version's content
	updates := map[string]interface{}{
		"version":    versionNumber,
		"title":      version.Title,
		"updated_at": time.Now(),
	}

	if err := tx.Model(document).Updates(updates).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("failed to restore version: %w", err)
	}

	// Log the restore operation
	if err := dvs.logVersionOperation(tx, documentID, "restore", fmt.Sprintf("Document restored to version %d", versionNumber), userID, c); err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("failed to log operation: %w", err)
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	// Mark version as current and return
	version.IsCurrent = true
	return version, nil
}

// CompareVersions compares two versions of a document
func (dvs *DocumentVersionService) CompareVersions(ctx context.Context, documentID uint64, version1, version2 int, userID uint64) (*VersionComparisonResult, error) {
	// Check if user can access the document (simplified permission check)
	var document models.TaskDocument
	if err := dvs.db.Where("id = ?", documentID).First(&document).Error; err != nil {
		return nil, fmt.Errorf("failed to get document: %w", err)
	}

	// Get both versions
	v1, err := dvs.GetVersion(ctx, documentID, version1, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get version %d: %w", version1, err)
	}

	v2, err := dvs.GetVersion(ctx, documentID, version2, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get version %d: %w", version2, err)
	}

	// Calculate differences
	sizeDiff := v2.FileSize - v1.FileSize
	contentChanged := v1.Checksum != v2.Checksum

	// Generate comparison summary
	summary := dvs.generateComparisonSummary(v1, v2, sizeDiff, contentChanged)

	return &VersionComparisonResult{
		Version1:       v1,
		Version2:       v2,
		SizeDiff:       sizeDiff,
		ContentChanged: contentChanged,
		Summary:        summary,
	}, nil
}

// DeleteVersion soft-deletes a version (only if it's not the current version)
func (dvs *DocumentVersionService) DeleteVersion(ctx context.Context, documentID uint64, versionNumber int, userID uint64, c *gin.Context) error {
	// Check if user can edit the document (simplified permission check)
	var document models.TaskDocument
	if err := dvs.db.Where("id = ?", documentID).First(&document).Error; err != nil {
		return fmt.Errorf("failed to get document: %w", err)
	}

	// Basic permission check - owner or creator can delete versions
	if document.OwnerID != int(userID) && document.CreatedBy != int(userID) {
		return fmt.Errorf("permission denied: cannot delete version")
	}

	// Cannot delete the current version
	if document.Version == versionNumber {
		return fmt.Errorf("cannot delete the current version")
	}

	// Get version to verify it exists
	version, err := dvs.GetVersion(ctx, documentID, versionNumber, userID)
	if err != nil {
		return err
	}

	// Begin transaction
	tx := dvs.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Delete version record (hard delete since it's not the current version)
	if err := tx.Where("document_id = ? AND version_number = ?", documentID, versionNumber).Delete(&models.DocumentVersion{}).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to delete version record: %w", err)
	}

	// Note: We're not tracking total versions count in TaskDocument model
	// This could be added later if needed

	// Log the deletion operation
	if err := dvs.logVersionOperation(tx, documentID, "version_delete", fmt.Sprintf("Version %d deleted", versionNumber), userID, c); err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to log operation: %w", err)
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	// Delete the physical file (best effort, don't fail if it doesn't exist)
	go func() {
		if err := dvs.storageAdapter.Delete(ctx, version.StoragePath); err != nil {
			fmt.Printf("Warning: failed to delete version file %s: %v\n", version.StoragePath, err)
		}
	}()

	return nil
}

// Helper methods

func (dvs *DocumentVersionService) generateVersionStoragePath(projectID, taskID, documentID uint64, versionNumber int, fileName string) string {
	return fmt.Sprintf("projects/%d/tasks/%d/documents/%d/versions/v%d/%s", projectID, taskID, documentID, versionNumber, fileName)
}

func (dvs *DocumentVersionService) generateComparisonSummary(v1, v2 *DocumentVersionInfo, sizeDiff int64, contentChanged bool) string {
	if !contentChanged {
		return "No content changes detected"
	}

	summary := fmt.Sprintf("Content changed from version %d to %d", v1.VersionNumber, v2.VersionNumber)

	if sizeDiff > 0 {
		summary += fmt.Sprintf(", file size increased by %d bytes", sizeDiff)
	} else if sizeDiff < 0 {
		summary += fmt.Sprintf(", file size decreased by %d bytes", -sizeDiff)
	} else {
		summary += ", file size unchanged"
	}

	if v2.ChangesSummary != "" {
		summary += fmt.Sprintf(". Changes: %s", v2.ChangesSummary)
	}

	return summary
}

func (dvs *DocumentVersionService) logVersionOperation(db *gorm.DB, documentID uint64, operationType, description string, userID uint64, c *gin.Context) error {
	operation := &models.DocumentOperation{
		DocumentID:    documentID,
		OperationType: operationType,
		Description:   description,
		UserID:        userID,
		Success:       true,
		Details: map[string]interface{}{
			"timestamp": time.Now(),
			"operation": operationType,
		},
		CreatedAt: time.Now(),
	}

	if c != nil {
		operation.IPAddress = c.ClientIP()
		operation.UserAgent = c.GetHeader("User-Agent")
	}

	return db.Create(operation).Error
}

// GetDocumentInfo retrieves basic document information
func (dvs *DocumentVersionService) GetDocumentInfo(ctx context.Context, documentID uint64) (*models.TaskDocument, error) {
	var document models.TaskDocument
	if err := dvs.db.WithContext(ctx).Where("id = ? AND deleted_at IS NULL", documentID).First(&document).Error; err != nil {
		return nil, fmt.Errorf("failed to get document: %w", err)
	}
	return &document, nil
}
