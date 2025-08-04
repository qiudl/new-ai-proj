package services

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// TaskDocument represents a document attached to a task
type TaskDocument struct {
	ID           uint      `json:"id" gorm:"primaryKey"`
	TaskID       uint      `json:"task_id" gorm:"not null"`
	FileName     string    `json:"file_name" gorm:"not null"`
	OriginalName string    `json:"original_name" gorm:"not null"`
	FilePath     string    `json:"file_path" gorm:"not null;unique"`
	FileSize     int64     `json:"file_size" gorm:"not null"`
	MimeType     string    `json:"mime_type" gorm:"not null"`
	UploadType   string    `json:"upload_type" gorm:"not null"` // manual, api
	UploadedBy   uint      `json:"uploaded_by" gorm:"not null"`
	UploadedAt   time.Time `json:"uploaded_at" gorm:"default:now()"`
	UpdatedAt    time.Time `json:"updated_at" gorm:"default:now()"`
	Version      int       `json:"version" gorm:"default:1"`
	IsActive     bool      `json:"is_active" gorm:"default:true"`
	Checksum     string    `json:"checksum"`
	Metadata     string    `json:"metadata" gorm:"type:jsonb;default:'{}'"`
}

// DocumentVersion represents a version of a document
type DocumentVersion struct {
	ID            uint      `json:"id" gorm:"primaryKey"`
	DocumentID    uint      `json:"document_id" gorm:"not null"`
	VersionNumber int       `json:"version_number" gorm:"not null"`
	FilePath      string    `json:"file_path" gorm:"not null"`
	FileSize      int64     `json:"file_size" gorm:"not null"`
	Checksum      string    `json:"checksum"`
	CreatedBy     uint      `json:"created_by" gorm:"not null"`
	CreatedAt     time.Time `json:"created_at" gorm:"default:now()"`
	ChangeNotes   string    `json:"change_notes"`
	Metadata      string    `json:"metadata" gorm:"type:jsonb;default:'{}'"`
}

// DocumentLog represents an operation log entry
type DocumentLog struct {
	ID               uint      `json:"id" gorm:"primaryKey"`
	DocumentID       uint      `json:"document_id" gorm:"not null"`
	Operation        string    `json:"operation" gorm:"not null"`
	OperationBy      uint      `json:"operation_by" gorm:"not null"`
	OperationAt      time.Time `json:"operation_at" gorm:"default:now()"`
	IPAddress        string    `json:"ip_address"`
	UserAgent        string    `json:"user_agent"`
	OperationDetails string    `json:"operation_details" gorm:"type:jsonb;default:'{}'"`
	Success          bool      `json:"success" gorm:"default:true"`
	ErrorMessage     string    `json:"error_message"`
}

// DocumentService handles document operations
type DocumentService struct {
	db          *gorm.DB
	storagePath string
}

// NewDocumentService creates a new document service
func NewDocumentService(db *gorm.DB, storagePath string) *DocumentService {
	return &DocumentService{
		db:          db,
		storagePath: storagePath,
	}
}

// UploadConfig defines upload configuration
type UploadConfig struct {
	MaxFileSize      int64    // Maximum file size in bytes
	AllowedMimeTypes []string // Allowed MIME types
	AllowedExtensions []string // Allowed file extensions
}

// DefaultUploadConfig returns default upload configuration
func DefaultUploadConfig() UploadConfig {
	return UploadConfig{
		MaxFileSize: 10 * 1024 * 1024, // 10MB
		AllowedMimeTypes: []string{
			"text/markdown",
			"application/pdf",
			"text/plain",
		},
		AllowedExtensions: []string{".md", ".pdf", ".txt"},
	}
}

// ValidateFile validates uploaded file against configuration
func (ds *DocumentService) ValidateFile(header *multipart.FileHeader, config UploadConfig) error {
	// Check file size
	if header.Size > config.MaxFileSize {
		return fmt.Errorf("file size %d exceeds maximum allowed size %d", header.Size, config.MaxFileSize)
	}

	// Check file extension
	ext := strings.ToLower(filepath.Ext(header.Filename))
	validExt := false
	for _, allowedExt := range config.AllowedExtensions {
		if ext == allowedExt {
			validExt = true
			break
		}
	}
	if !validExt {
		return fmt.Errorf("file extension %s is not allowed", ext)
	}

	return nil
}

// GenerateFilePath generates a unique file path for storage
func (ds *DocumentService) GenerateFilePath(taskID uint, originalName string) string {
	ext := filepath.Ext(originalName)
	timestamp := time.Now().Format("20060102_150405")
	uniqueID := fmt.Sprintf("%d_%s_%d", taskID, timestamp, time.Now().UnixNano()%10000)
	fileName := fmt.Sprintf("task_%d_%s%s", taskID, uniqueID, ext)
	
	// Create directory structure: storage/documents/tasks/YYYY/MM/DD/
	now := time.Now()
	datePath := filepath.Join(
		"documents", "tasks",
		strconv.Itoa(now.Year()),
		fmt.Sprintf("%02d", now.Month()),
		fmt.Sprintf("%02d", now.Day()),
	)
	
	return filepath.Join(datePath, fileName)
}

// CalculateChecksum calculates SHA-256 checksum of a file
func (ds *DocumentService) CalculateChecksum(file multipart.File) (string, error) {
	hash := sha256.New()
	if _, err := io.Copy(hash, file); err != nil {
		return "", err
	}
	
	// Reset file pointer to beginning
	if _, err := file.Seek(0, 0); err != nil {
		return "", err
	}
	
	return hex.EncodeToString(hash.Sum(nil)), nil
}

// SaveFile saves uploaded file to storage
func (ds *DocumentService) SaveFile(file multipart.File, filePath string) error {
	fullPath := filepath.Join(ds.storagePath, filePath)
	
	// Create directory if it doesn't exist
	dir := filepath.Dir(fullPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create directory: %w", err)
	}
	
	// Create destination file
	dst, err := os.Create(fullPath)
	if err != nil {
		return fmt.Errorf("failed to create file: %w", err)
	}
	defer dst.Close()
	
	// Copy file content
	if _, err := io.Copy(dst, file); err != nil {
		return fmt.Errorf("failed to save file: %w", err)
	}
	
	return nil
}

// UploadDocument handles document upload
func (ds *DocumentService) UploadDocument(c *gin.Context, taskID uint, userID uint, uploadType string) (*TaskDocument, error) {
	// Get uploaded file
	fileHeader, err := c.FormFile("document")
	if err != nil {
		return nil, fmt.Errorf("failed to get uploaded file: %w", err)
	}
	
	// Open file
	file, err := fileHeader.Open()
	if err != nil {
		return nil, fmt.Errorf("failed to open file: %w", err)
	}
	defer file.Close()
	
	// Validate file
	config := DefaultUploadConfig()
	if err := ds.ValidateFile(fileHeader, config); err != nil {
		return nil, err
	}
	
	// Calculate checksum
	checksum, err := ds.CalculateChecksum(file)
	if err != nil {
		return nil, fmt.Errorf("failed to calculate checksum: %w", err)
	}
	
	// Generate file path
	filePath := ds.GenerateFilePath(taskID, fileHeader.Filename)
	
	// Save file to storage
	if err := ds.SaveFile(file, filePath); err != nil {
		return nil, fmt.Errorf("failed to save file: %w", err)
	}
	
	// Determine MIME type
	mimeType := fileHeader.Header.Get("Content-Type")
	if mimeType == "" {
		// Fallback MIME type detection based on extension
		ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
		switch ext {
		case ".md":
			mimeType = "text/markdown"
		case ".pdf":
			mimeType = "application/pdf"
		case ".txt":
			mimeType = "text/plain"
		default:
			mimeType = "application/octet-stream"
		}
	}
	
	// Create database record
	document := &TaskDocument{
		TaskID:       taskID,
		FileName:     filepath.Base(filePath),
		OriginalName: fileHeader.Filename,
		FilePath:     filePath,
		FileSize:     fileHeader.Size,
		MimeType:     mimeType,
		UploadType:   uploadType,
		UploadedBy:   userID,
		Checksum:     checksum,
		Version:      1,
		IsActive:     true,
	}
	
	// Save to database
	if err := ds.db.Create(document).Error; err != nil {
		// If database save fails, try to remove the file
		os.Remove(filepath.Join(ds.storagePath, filePath))
		return nil, fmt.Errorf("failed to save document record: %w", err)
	}
	
	// Log the operation
	ds.LogOperation(document.ID, "upload", userID, c.ClientIP(), c.GetHeader("User-Agent"), true, "")
	
	return document, nil
}

// GetTaskDocuments retrieves all documents for a task
func (ds *DocumentService) GetTaskDocuments(taskID uint) ([]TaskDocument, error) {
	var documents []TaskDocument
	err := ds.db.Where("task_id = ? AND is_active = ?", taskID, true).
		Order("uploaded_at DESC").
		Find(&documents).Error
	return documents, err
}

// GetDocument retrieves a single document by ID
func (ds *DocumentService) GetDocument(documentID uint) (*TaskDocument, error) {
	var document TaskDocument
	err := ds.db.Where("id = ? AND is_active = ?", documentID, true).First(&document).Error
	if err != nil {
		return nil, err
	}
	return &document, nil
}

// DeleteDocument soft-deletes a document
func (ds *DocumentService) DeleteDocument(documentID uint, userID uint) error {
	// Update document to inactive
	err := ds.db.Model(&TaskDocument{}).
		Where("id = ?", documentID).
		Update("is_active", false).Error
	
	if err != nil {
		ds.LogOperation(documentID, "delete", userID, "", "", false, err.Error())
		return err
	}
	
	ds.LogOperation(documentID, "delete", userID, "", "", true, "")
	return nil
}

// GetDocumentVersions retrieves version history for a document
func (ds *DocumentService) GetDocumentVersions(documentID uint) ([]DocumentVersion, error) {
	var versions []DocumentVersion
	err := ds.db.Where("document_id = ?", documentID).
		Order("version_number DESC").
		Find(&versions).Error
	return versions, err
}

// LogOperation logs a document operation
func (ds *DocumentService) LogOperation(documentID uint, operation string, userID uint, ipAddress, userAgent string, success bool, errorMessage string) {
	log := DocumentLog{
		DocumentID:   documentID,
		Operation:    operation,
		OperationBy:  userID,
		IPAddress:    ipAddress,
		UserAgent:    userAgent,
		Success:      success,
		ErrorMessage: errorMessage,
	}
	
	// Don't fail the main operation if logging fails
	ds.db.Create(&log)
}

// GetFileContent reads file content from storage
func (ds *DocumentService) GetFileContent(filePath string) ([]byte, error) {
	fullPath := filepath.Join(ds.storagePath, filePath)
	return os.ReadFile(fullPath)
}

// FileExists checks if a file exists in storage
func (ds *DocumentService) FileExists(filePath string) bool {
	fullPath := filepath.Join(ds.storagePath, filePath)
	_, err := os.Stat(fullPath)
	return !os.IsNotExist(err)
}