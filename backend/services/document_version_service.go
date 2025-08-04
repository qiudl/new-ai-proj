package services

import (
	"context"
	"crypto/sha256"
	"fmt"
	"io"
	"mime/multipart"
	"time"

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
	// Get the existing document
	document, err := dvs.baseService.GetDocument(ctx, documentID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get document: %w", err)
	}

	// Check if user can create versions (same as edit permission)
	if !dvs.baseService.canEditDocument(document, userID) {
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

	// Check if content has actually changed
	if checksum == document.Checksum {
		return nil, fmt.Errorf("file content is identical to current version")
	}

	// Reset file reader
	src, err = req.File.Open()
	if err != nil {
		return nil, fmt.Errorf("failed to reopen file: %w", err)
	}
	defer src.Close()

	// Generate new version number
	nextVersion := document.TotalVersions + 1

	// Generate storage path for new version
	fileName := dvs.baseService.generateFileName(req.File.Filename)
	storagePath := dvs.generateVersionStoragePath(document.ProjectID, document.TaskID, documentID, nextVersion, fileName)

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

	version := &DocumentVersion{
		DocumentID:     documentID,
		VersionNumber:  nextVersion,
		Title:          title,
		Description:    req.Description,
		ChangesSummary: req.ChangesSummary,
		FileName:       fileName,
		FileSize:       req.File.Size,
		Checksum:       checksum,
		StoragePath:    storagePath,
		ParentVersion:  &document.CurrentVersion,
		CreatedBy:      userID,
		Metadata:       req.Metadata,
	}

	if err := tx.Create(version).Error; err != nil {
		tx.Rollback()
		dvs.storageAdapter.Delete(ctx, storagePath)
		return nil, fmt.Errorf("failed to create version record: %w", err)
	}

	// Update document with new version info
	updates := map[string]interface{}{
		"current_version":  nextVersion,
		"total_versions":   nextVersion,
		"file_size":        req.File.Size,
		"checksum":         checksum,
		"storage_path":     storagePath,
		"file_name":        fileName,
		"updated_by":       userID,
		"updated_at":       time.Now(),
	}

	if title != document.Title {
		updates["title"] = title
	}
	if req.Description != "" && req.Description != document.Description {
		updates["description"] = req.Description
	}

	if err := tx.Model(document).Updates(updates).Error; err != nil {
		tx.Rollback()
		dvs.storageAdapter.Delete(ctx, storagePath)
		return nil, fmt.Errorf("failed to update document: %w", err)
	}

	// Log the version creation operation
	if err := dvs.logVersionOperation(tx, documentID, "version_create", fmt.Sprintf("Version %d created: %s", nextVersion, req.ChangesSummary), userID, c); err != nil {
		tx.Rollback()
		dvs.storageAdapter.Delete(ctx, storagePath)
		return nil, fmt.Errorf("failed to log operation: %w", err)
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		dvs.storageAdapter.Delete(ctx, storagePath)
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	// Return version info
	return &DocumentVersionInfo{
		ID:             version.ID,
		DocumentID:     documentID,
		VersionNumber:  nextVersion,
		Title:          title,
		Description:    req.Description,
		ChangesSummary: req.ChangesSummary,
		FileName:       fileName,
		FileSize:       req.File.Size,
		Checksum:       checksum,
		StoragePath:    storagePath,
		ParentVersion:  &document.CurrentVersion,
		CreatedBy:      userID,
		CreatedAt:      time.Now(),
		Metadata:       req.Metadata,
		IsCurrent:      true,
	}, nil
}

// GetVersionHistory retrieves the version history of a document
func (dvs *DocumentVersionService) GetVersionHistory(ctx context.Context, documentID uint64, userID uint64) ([]DocumentVersionInfo, error) {
	// Check if user can access the document
	document, err := dvs.baseService.GetDocument(ctx, documentID, userID)
	if err != nil {
		return nil, err
	}

	// Query versions with user information
	var versions []struct {
		DocumentVersion
		CreatedByName string `json:"created_by_name"`
	}

	query := `
		SELECT v.*, u.username as created_by_name
		FROM document_versions v
		LEFT JOIN users u ON v.created_by = u.id
		WHERE v.document_id = ?
		ORDER BY v.version_number DESC
	`

	if err := dvs.db.Raw(query, documentID).Scan(&versions).Error; err != nil {
		return nil, fmt.Errorf("failed to retrieve version history: %w", err)
	}

	// Convert to response format
	var versionInfos []DocumentVersionInfo
	for _, v := range versions {
		versionInfos = append(versionInfos, DocumentVersionInfo{
			ID:              v.ID,
			DocumentID:      v.DocumentID,
			VersionNumber:   v.VersionNumber,
			Title:           v.Title,
			Description:     v.Description,
			ChangesSummary:  v.ChangesSummary,
			FileName:        v.FileName,
			FileSize:        v.FileSize,
			Checksum:        v.Checksum,
			StoragePath:     v.StoragePath,
			ParentVersion:   v.ParentVersion,
			CreatedBy:       v.CreatedBy,
			CreatedByName:   v.CreatedByName,
			CreatedAt:       v.CreatedAt,
			Metadata:        v.Metadata,
			IsCurrent:       v.VersionNumber == document.CurrentVersion,
		})
	}

	return versionInfos, nil
}

// GetVersion retrieves a specific version of a document
func (dvs *DocumentVersionService) GetVersion(ctx context.Context, documentID uint64, versionNumber int, userID uint64) (*DocumentVersionInfo, error) {
	// Check if user can access the document
	_, err := dvs.baseService.GetDocument(ctx, documentID, userID)
	if err != nil {
		return nil, err
	}

	// Query the specific version
	var versionData struct {
		DocumentVersion
		CreatedByName string `json:"created_by_name"`
		IsCurrent     bool   `json:"is_current"`
	}

	query := `
		SELECT v.*, u.username as created_by_name,
		       (v.version_number = d.current_version) as is_current
		FROM document_versions v
		LEFT JOIN users u ON v.created_by = u.id
		LEFT JOIN documents d ON v.document_id = d.id
		WHERE v.document_id = ? AND v.version_number = ?
	`

	if err := dvs.db.Raw(query, documentID, versionNumber).Scan(&versionData).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("version %d not found for document %d", versionNumber, documentID)
		}
		return nil, fmt.Errorf("failed to retrieve version: %w", err)
	}

	return &DocumentVersionInfo{
		ID:              versionData.ID,
		DocumentID:      versionData.DocumentID,
		VersionNumber:   versionData.VersionNumber,
		Title:           versionData.Title,
		Description:     versionData.Description,
		ChangesSummary:  versionData.ChangesSummary,
		FileName:        versionData.FileName,
		FileSize:        versionData.FileSize,
		Checksum:        versionData.Checksum,
		StoragePath:     versionData.StoragePath,
		ParentVersion:   versionData.ParentVersion,
		CreatedBy:       versionData.CreatedBy,
		CreatedByName:   versionData.CreatedByName,
		CreatedAt:       versionData.CreatedAt,
		Metadata:        versionData.Metadata,
		IsCurrent:       versionData.IsCurrent,
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

	// Log download operation (in background)
	go func() {
		if err := dvs.logVersionOperation(dvs.db, documentID, "download", fmt.Sprintf("Version %d downloaded", versionNumber), userID, c); err != nil {
			// Log error but don't fail the download
			fmt.Printf("Failed to log version download operation: %v\n", err)
		}
	}()

	return reader, version, nil
}

// RestoreVersion restores a document to a specific version
func (dvs *DocumentVersionService) RestoreVersion(ctx context.Context, documentID uint64, versionNumber int, userID uint64, c *gin.Context) (*DocumentVersionInfo, error) {
	// Check if user can edit the document
	document, err := dvs.baseService.GetDocument(ctx, documentID, userID)
	if err != nil {
		return nil, err
	}

	if !dvs.baseService.canEditDocument(document, userID) {
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
		"current_version": versionNumber,
		"file_size":       version.FileSize,
		"checksum":        version.Checksum,
		"storage_path":    version.StoragePath,
		"file_name":       version.FileName,
		"title":           version.Title,
		"description":     version.Description,
		"updated_by":      userID,
		"updated_at":      time.Now(),
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
	// Check if user can access the document
	_, err := dvs.baseService.GetDocument(ctx, documentID, userID)
	if err != nil {
		return nil, err
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
	// Check if user can edit the document
	document, err := dvs.baseService.GetDocument(ctx, documentID, userID)
	if err != nil {
		return err
	}

	if !dvs.baseService.canEditDocument(document, userID) {
		return fmt.Errorf("permission denied: cannot delete version")
	}

	// Cannot delete the current version
	if document.CurrentVersion == versionNumber {
		return fmt.Errorf("cannot delete the current version")
	}

	// Cannot delete if it's the only version
	if document.TotalVersions <= 1 {
		return fmt.Errorf("cannot delete the only version")
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
	if err := tx.Where("document_id = ? AND version_number = ?", documentID, versionNumber).Delete(&DocumentVersion{}).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to delete version record: %w", err)
	}

	// Update document total versions count
	if err := tx.Model(document).Update("total_versions", document.TotalVersions-1).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to update version count: %w", err)
	}

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
	operation := &DocumentOperation{
		DocumentID:    documentID,
		OperationType: operationType,
		Description:   description,
		UserID:        userID,
		Success:       true,
		Details: map[string]interface{}{
			"timestamp": time.Now(),
			"operation": operationType,
		},
	}

	if c != nil {
		operation.IPAddress = c.ClientIP()
		operation.UserAgent = c.GetHeader("User-Agent")
	}

	return db.Create(operation).Error
}