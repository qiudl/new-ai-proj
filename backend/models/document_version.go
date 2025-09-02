package models

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
)

// TagsJSON represents a JSON array of strings for document tags
type TagsJSON []string

// Value implements the driver.Valuer interface for database storage
func (t TagsJSON) Value() (driver.Value, error) {
	return json.Marshal(t)
}

// Scan implements the sql.Scanner interface for database retrieval
func (t *TagsJSON) Scan(value interface{}) error {
	if value == nil {
		*t = TagsJSON{}
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("TagsJSON: cannot scan non-byte value")
	}

	return json.Unmarshal(bytes, t)
}

// MetadataJSON represents arbitrary JSON metadata for documents
type MetadataJSON map[string]interface{}

// Value implements the driver.Valuer interface for database storage
func (m MetadataJSON) Value() (driver.Value, error) {
	return json.Marshal(m)
}

// Scan implements the sql.Scanner interface for database retrieval
func (m *MetadataJSON) Scan(value interface{}) error {
	if value == nil {
		*m = MetadataJSON{}
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("MetadataJSON: cannot scan non-byte value")
	}

	return json.Unmarshal(bytes, m)
}

// DocumentVersion represents a version of a document
type DocumentVersion struct {
	ID             int          `json:"id" db:"id"`
	DocumentID     int          `json:"document_id" db:"document_id"`
	VersionNumber  int          `json:"version_number" db:"version_number"`
	Title          string       `json:"title" db:"title"`
	Content        *string      `json:"content,omitempty" db:"content"`
	FileURL        *string      `json:"file_url,omitempty" db:"file_url"`
	FileSize       int64        `json:"file_size" db:"file_size"`
	MimeType       *string      `json:"mime_type,omitempty" db:"mime_type"`
	ChangeSummary  *string      `json:"change_summary,omitempty" db:"change_summary"`
	CreatedBy      int          `json:"created_by" db:"created_by"`
	CreatedAt      time.Time    `json:"created_at" db:"created_at"`
	IsMajorVersion bool         `json:"is_major_version" db:"is_major_version"`
	Tags           TagsJSON     `json:"tags" db:"tags"`
	Metadata       MetadataJSON `json:"metadata" db:"metadata"`

	// Related fields
	DocumentTitle  *string `json:"document_title,omitempty" db:"document_title"`
	CreatedByName  *string `json:"created_by_name,omitempty" db:"created_by_name"`
	CreatedByEmail *string `json:"created_by_email,omitempty" db:"created_by_email"`
	LabelCount     int     `json:"label_count" db:"label_count"`
	CommentCount   int     `json:"comment_count" db:"comment_count"`
}

// DocumentVersionComparison represents a comparison between two document versions
type DocumentVersionComparison struct {
	ID              int       `json:"id" db:"id"`
	DocumentID      int       `json:"document_id" db:"document_id"`
	FromVersion     int       `json:"from_version" db:"from_version"`
	ToVersion       int       `json:"to_version" db:"to_version"`
	DiffContent     *string   `json:"diff_content,omitempty" db:"diff_content"`
	AddedLines      int       `json:"added_lines" db:"added_lines"`
	RemovedLines    int       `json:"removed_lines" db:"removed_lines"`
	ModifiedLines   int       `json:"modified_lines" db:"modified_lines"`
	SimilarityScore float64   `json:"similarity_score" db:"similarity_score"`
	CreatedAt       time.Time `json:"created_at" db:"created_at"`
}

// DocumentVersionBranch represents a branch for document version control
type DocumentVersionBranch struct {
	ID             int        `json:"id" db:"id"`
	DocumentID     int        `json:"document_id" db:"document_id"`
	BranchName     string     `json:"branch_name" db:"branch_name"`
	BaseVersion    int        `json:"base_version" db:"base_version"`
	CurrentVersion int        `json:"current_version" db:"current_version"`
	CreatedBy      int        `json:"created_by" db:"created_by"`
	CreatedAt      time.Time  `json:"created_at" db:"created_at"`
	MergedAt       *time.Time `json:"merged_at,omitempty" db:"merged_at"`
	MergedBy       *int       `json:"merged_by,omitempty" db:"merged_by"`
	IsActive       bool       `json:"is_active" db:"is_active"`
	Description    *string    `json:"description,omitempty" db:"description"`

	// Related fields
	CreatedByName *string `json:"created_by_name,omitempty" db:"created_by_name"`
	MergedByName  *string `json:"merged_by_name,omitempty" db:"merged_by_name"`
}

// DocumentVersionLabel represents a label/tag for a specific document version
type DocumentVersionLabel struct {
	ID            int       `json:"id" db:"id"`
	DocumentID    int       `json:"document_id" db:"document_id"`
	VersionNumber int       `json:"version_number" db:"version_number"`
	Label         string    `json:"label" db:"label"`
	Color         string    `json:"color" db:"color"`
	Description   *string   `json:"description,omitempty" db:"description"`
	CreatedBy     int       `json:"created_by" db:"created_by"`
	CreatedAt     time.Time `json:"created_at" db:"created_at"`

	// Related fields
	CreatedByName *string `json:"created_by_name,omitempty" db:"created_by_name"`
}

// DocumentVersionComment represents a comment on a specific document version
type DocumentVersionComment struct {
	ID            int       `json:"id" db:"id"`
	DocumentID    int       `json:"document_id" db:"document_id"`
	VersionNumber int       `json:"version_number" db:"version_number"`
	UserID        int       `json:"user_id" db:"user_id"`
	Content       string    `json:"content" db:"content"`
	LineNumber    *int      `json:"line_number,omitempty" db:"line_number"`
	CreatedAt     time.Time `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time `json:"updated_at" db:"updated_at"`
	IsResolved    bool      `json:"is_resolved" db:"is_resolved"`
	ParentID      *int      `json:"parent_id,omitempty" db:"parent_id"`

	// Related fields
	Username   *string                   `json:"username,omitempty" db:"username"`
	UserAvatar *string                   `json:"user_avatar,omitempty" db:"user_avatar"`
	Replies    []*DocumentVersionComment `json:"replies,omitempty"`
}

// DocumentVersionStats represents statistics about document versions
type DocumentVersionStats struct {
	DocumentID           int       `json:"document_id" db:"document_id"`
	DocumentTitle        string    `json:"document_title" db:"document_title"`
	TotalVersions        int       `json:"total_versions" db:"total_versions"`
	MajorVersions        int       `json:"major_versions" db:"major_versions"`
	FirstVersionDate     time.Time `json:"first_version_date" db:"first_version_date"`
	LatestVersionDate    time.Time `json:"latest_version_date" db:"latest_version_date"`
	CurrentVersion       int       `json:"current_version" db:"current_version"`
	TotalSizeAllVersions int64     `json:"total_size_all_versions" db:"total_size_all_versions"`
	ContributorsCount    int       `json:"contributors_count" db:"contributors_count"`
}

// Request/Response models for version management

// CreateDocumentVersionRequest represents the request to create a new document version
type CreateDocumentVersionRequest struct {
	DocumentID     int          `json:"document_id" validate:"required"`
	Title          string       `json:"title" validate:"required,max=255"`
	Content        *string      `json:"content,omitempty"`
	FileURL        *string      `json:"file_url,omitempty"`
	FileSize       int64        `json:"file_size"`
	MimeType       *string      `json:"mime_type,omitempty"`
	ChangeSummary  *string      `json:"change_summary,omitempty"`
	IsMajorVersion bool         `json:"is_major_version"`
	Tags           []string     `json:"tags"`
	Metadata       MetadataJSON `json:"metadata"`
}

// UpdateDocumentVersionRequest represents the request to update a document version
type UpdateDocumentVersionRequest struct {
	Title         *string      `json:"title,omitempty" validate:"omitempty,max=255"`
	ChangeSummary *string      `json:"change_summary,omitempty"`
	Tags          []string     `json:"tags"`
	Metadata      MetadataJSON `json:"metadata"`
}

// RestoreDocumentVersionRequest represents the request to restore a document to a specific version
type RestoreDocumentVersionRequest struct {
	TargetVersion int     `json:"target_version" validate:"required,min=1"`
	ChangeSummary *string `json:"change_summary,omitempty"`
}

// CompareVersionsRequest represents the request to compare two document versions
type CompareVersionsRequest struct {
	DocumentID  int `json:"document_id" validate:"required"`
	FromVersion int `json:"from_version" validate:"required,min=1"`
	ToVersion   int `json:"to_version" validate:"required,min=1"`
}

// CreateVersionLabelRequest represents the request to create a version label
type CreateVersionLabelRequest struct {
	DocumentID    int     `json:"document_id" validate:"required"`
	VersionNumber int     `json:"version_number" validate:"required,min=1"`
	Label         string  `json:"label" validate:"required,max=100"`
	Color         string  `json:"color" validate:"required,hexcolor"`
	Description   *string `json:"description,omitempty"`
}

// CreateVersionCommentRequest represents the request to create a version comment
type CreateVersionCommentRequest struct {
	DocumentID    int    `json:"document_id" validate:"required"`
	VersionNumber int    `json:"version_number" validate:"required,min=1"`
	Content       string `json:"content" validate:"required,max=1000"`
	LineNumber    *int   `json:"line_number,omitempty"`
	ParentID      *int   `json:"parent_id,omitempty"`
}

// CreateVersionBranchRequest represents the request to create a version branch
type CreateVersionBranchRequest struct {
	DocumentID  int     `json:"document_id" validate:"required"`
	BranchName  string  `json:"branch_name" validate:"required,max=100"`
	BaseVersion int     `json:"base_version" validate:"required,min=1"`
	Description *string `json:"description,omitempty"`
}

// Response models

// DocumentVersionResponse represents the API response for document versions
type DocumentVersionResponse struct {
	Versions    []*DocumentVersion `json:"versions"`
	TotalCount  int                `json:"total_count"`
	CurrentPage int                `json:"current_page"`
	PageSize    int                `json:"page_size"`
	HasMore     bool               `json:"has_more"`
}

// DocumentVersionHistoryResponse represents the API response for version history
type DocumentVersionHistoryResponse struct {
	DocumentID    int                      `json:"document_id"`
	DocumentTitle string                   `json:"document_title"`
	Versions      []*DocumentVersion       `json:"versions"`
	Stats         DocumentVersionStats     `json:"stats"`
	Labels        []*DocumentVersionLabel  `json:"labels"`
	Branches      []*DocumentVersionBranch `json:"branches"`
}

// VersionComparisonResponse represents the API response for version comparison
type VersionComparisonResponse struct {
	DocumentID      int     `json:"document_id"`
	FromVersion     int     `json:"from_version"`
	ToVersion       int     `json:"to_version"`
	DiffContent     *string `json:"diff_content,omitempty"`
	AddedLines      int     `json:"added_lines"`
	RemovedLines    int     `json:"removed_lines"`
	ModifiedLines   int     `json:"modified_lines"`
	SimilarityScore float64 `json:"similarity_score"`
	Summary         string  `json:"summary"`
}

// Helper methods

// GetVersionName returns a formatted version name
func (dv *DocumentVersion) GetVersionName() string {
	if dv.IsMajorVersion {
		return fmt.Sprintf("v%d.0", dv.VersionNumber)
	}
	return fmt.Sprintf("v%d", dv.VersionNumber)
}

// IsCurrentVersion checks if this is the current version of the document
func (dv *DocumentVersion) IsCurrentVersion(document *Document) bool {
	return dv.VersionNumber == document.Version
}

// GetSizeFormatted returns the file size in a human-readable format
func (dv *DocumentVersion) GetSizeFormatted() string {
	return formatFileSize(dv.FileSize)
}

// GetChangeType returns the type of change based on the change summary
func (dv *DocumentVersion) GetChangeType() string {
	if dv.ChangeSummary == nil {
		return "unknown"
	}

	summary := strings.ToLower(*dv.ChangeSummary)
	if strings.Contains(summary, "initial") || strings.Contains(summary, "created") {
		return "created"
	} else if strings.Contains(summary, "restored") {
		return "restored"
	} else if strings.Contains(summary, "merged") {
		return "merged"
	} else if dv.IsMajorVersion {
		return "major"
	}
	return "minor"
}

// Validation methods

// ValidateCreateRequest validates the create version request
func (r *CreateDocumentVersionRequest) Validate() error {
	if r.DocumentID <= 0 {
		return errors.New("document_id is required and must be positive")
	}
	if r.Title == "" {
		return errors.New("title is required")
	}
	if len(r.Title) > 255 {
		return errors.New("title must be less than 255 characters")
	}
	if r.Content == nil && r.FileURL == nil {
		return errors.New("either content or file_url must be provided")
	}
	return nil
}

// ValidateCompareRequest validates the compare versions request
func (r *CompareVersionsRequest) Validate() error {
	if r.DocumentID <= 0 {
		return errors.New("document_id is required and must be positive")
	}
	if r.FromVersion <= 0 || r.ToVersion <= 0 {
		return errors.New("version numbers must be positive")
	}
	if r.FromVersion == r.ToVersion {
		return errors.New("from_version and to_version must be different")
	}
	return nil
}

// Utility functions

func formatFileSize(bytes int64) string {
	if bytes == 0 {
		return "0 B"
	}

	const unit = 1024
	if bytes < unit {
		return fmt.Sprintf("%d B", bytes)
	}

	div, exp := int64(unit), 0
	for n := bytes / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}

	sizes := []string{"B", "KB", "MB", "GB", "TB"}
	return fmt.Sprintf("%.1f %s", float64(bytes)/float64(div), sizes[exp])
}
