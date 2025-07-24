package models

import (
	"database/sql/driver"
	"fmt"
	"time"
)

// DocumentType represents the type of document
type DocumentType string

const (
	DocumentTypeMarkdown DocumentType = "markdown"
	DocumentTypeImage    DocumentType = "image"
	DocumentTypePDF      DocumentType = "pdf"
)

// DocumentStatus represents the status of document
type DocumentStatus string

const (
	DocumentStatusDraft     DocumentStatus = "draft"
	DocumentStatusPublished DocumentStatus = "published"
	DocumentStatusArchived  DocumentStatus = "archived"
)

// DocumentVisibility represents the visibility level of document
type DocumentVisibility string

const (
	DocumentVisibilityPrivate DocumentVisibility = "private"
	DocumentVisibilityTeam    DocumentVisibility = "team"
	DocumentVisibilityPublic  DocumentVisibility = "public"
)

// DocumentAssociationType represents the type of document association
type DocumentAssociationType string

const (
	DocumentAssociationProject  DocumentAssociationType = "project"
	DocumentAssociationCustomer DocumentAssociationType = "customer"
	DocumentAssociationPersonal DocumentAssociationType = "personal"
)

// IntArray handles PostgreSQL integer arrays
type IntArray []int

// Value implements the driver.Valuer interface for database storage
func (ia IntArray) Value() (driver.Value, error) {
	if ia == nil {
		return nil, nil
	}
	if len(ia) == 0 {
		return "{}", nil
	}
	return fmt.Sprintf("{%s}", intArrayToString(ia)), nil
}

// Scan implements the sql.Scanner interface for database retrieval
func (ia *IntArray) Scan(value interface{}) error {
	if value == nil {
		*ia = nil
		return nil
	}
	
	switch v := value.(type) {
	case []byte:
		return ia.parseArray(string(v))
	case string:
		return ia.parseArray(v)
	default:
		return fmt.Errorf("cannot scan %T into IntArray", value)
	}
}

func (ia *IntArray) parseArray(s string) error {
	// Simple PostgreSQL array parsing for integers
	if s == "{}" || s == "" {
		*ia = IntArray{}
		return nil
	}
	// This is a simplified parser - in production you might want a more robust one
	s = s[1 : len(s)-1] // Remove { and }
	if s == "" {
		*ia = IntArray{}
		return nil
	}
	
	var result []int
	// Split by comma and parse integers
	// This is simplified - production code should handle edge cases
	parts := splitByComma(s)
	for _, part := range parts {
		var num int
		if _, err := fmt.Sscanf(part, "%d", &num); err != nil {
			return err
		}
		result = append(result, num)
	}
	*ia = IntArray(result)
	return nil
}

func intArrayToString(ia []int) string {
	if len(ia) == 0 {
		return ""
	}
	result := fmt.Sprintf("%d", ia[0])
	for i := 1; i < len(ia); i++ {
		result += fmt.Sprintf(",%d", ia[i])
	}
	return result
}

func splitByComma(s string) []string {
	var result []string
	current := ""
	for _, r := range s {
		if r == ',' {
			result = append(result, current)
			current = ""
		} else {
			current += string(r)
		}
	}
	if current != "" {
		result = append(result, current)
	}
	return result
}

// StringArray is already defined in audit_log.go, reusing it here

// Document represents a document in the system with new association system
type Document struct {
	ID          int                  `json:"id" db:"id"`
	ProjectID   *int                 `json:"project_id" db:"project_id"`
	CustomerID  *int                 `json:"customer_id" db:"customer_id"`
	OwnerID     int                  `json:"owner_id" db:"owner_id" validate:"required"`
	Title       string               `json:"title" db:"title" validate:"required,min=1,max=255"`
	Content     string               `json:"content" db:"content"`
	Type        DocumentType         `json:"type" db:"type" validate:"required"`
	Status      DocumentStatus       `json:"status" db:"status" validate:"required"`
	Category    *string              `json:"category" db:"category"`
	Subcategory *string              `json:"subcategory" db:"subcategory"`
	Visibility  DocumentVisibility   `json:"visibility" db:"visibility"`
	SharedWith  IntArray             `json:"shared_with" db:"shared_with"`
	FileURL     *string              `json:"file_url" db:"file_url"`
	FileSize    *int64               `json:"file_size" db:"file_size"`
	MimeType    *string              `json:"mime_type" db:"mime_type"`
	Tags        StringArray          `json:"tags" db:"tags"`
	Description *string              `json:"description" db:"description"`
	Version     int                  `json:"version" db:"version"`
	CreatedBy   int                  `json:"created_by" db:"created_by" validate:"required"`
	CreatedAt   time.Time            `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time            `json:"updated_at" db:"updated_at"`
	DeletedAt   *time.Time           `json:"deleted_at,omitempty" db:"deleted_at"`
}

// DocumentRequest represents a document creation request
type DocumentRequest struct {
	Title       string               `json:"title" validate:"required,min=1,max=255"`
	Content     string               `json:"content"`
	Type        DocumentType         `json:"type" validate:"required"`
	Status      DocumentStatus       `json:"status"`
	ProjectID   *int                 `json:"project_id"`
	CustomerID  *int                 `json:"customer_id"`
	Category    *string              `json:"category"`
	Subcategory *string              `json:"subcategory"`
	Visibility  DocumentVisibility   `json:"visibility"`
	SharedWith  []int                `json:"shared_with"`
	Tags        []string             `json:"tags"`
	Description *string              `json:"description"`
}

// UpdateDocumentRequest represents a document update request (allows partial updates)
type UpdateDocumentRequest struct {
	Title       *string               `json:"title,omitempty" validate:"omitempty,min=1,max=255"`
	Content     *string               `json:"content,omitempty"`
	Type        *DocumentType         `json:"type,omitempty" validate:"omitempty"`
	Status      *DocumentStatus       `json:"status,omitempty" validate:"omitempty"`
	ProjectID   *int                  `json:"project_id,omitempty"`
	CustomerID  *int                  `json:"customer_id,omitempty"`
	Category    *string               `json:"category,omitempty"`
	Subcategory *string               `json:"subcategory,omitempty"`
	Visibility  *DocumentVisibility   `json:"visibility,omitempty" validate:"omitempty"`
	SharedWith  *[]int                `json:"shared_with,omitempty"`
	Tags        *[]string             `json:"tags,omitempty"`
	Description *string               `json:"description,omitempty"`
}

// DocumentResponse represents a document response with additional info
type DocumentResponse struct {
	ID               int                     `json:"id"`
	ProjectID        *int                    `json:"project_id"`
	CustomerID       *int                    `json:"customer_id"`
	OwnerID          int                     `json:"owner_id"`
	Title            string                  `json:"title"`
	Content          string                  `json:"content"`
	Type             DocumentType            `json:"type"`
	Status           DocumentStatus          `json:"status"`
	Category         *string                 `json:"category"`
	Subcategory      *string                 `json:"subcategory"`
	Visibility       DocumentVisibility      `json:"visibility"`
	SharedWith       []int                   `json:"shared_with"`
	FileURL          *string                 `json:"file_url"`
	FileSize         *int64                  `json:"file_size"`
	MimeType         *string                 `json:"mime_type"`
	Tags             []string                `json:"tags"`
	Description      *string                 `json:"description"`
	Version          int                     `json:"version"`
	CreatedBy        int                     `json:"created_by"`
	CreatedAt        time.Time               `json:"created_at"`
	UpdatedAt        time.Time               `json:"updated_at"`
	// Extended fields with relation info
	ProjectName      string                  `json:"project_name,omitempty"`
	CustomerName     string                  `json:"customer_name,omitempty"`
	OwnerName        string                  `json:"owner_name,omitempty"`
	CreatorName      string                  `json:"creator_name,omitempty"`
	AssociationType  DocumentAssociationType `json:"association_type"`
	CanEdit          bool                    `json:"can_edit"`
	CanDelete        bool                    `json:"can_delete"`
	CanShare         bool                    `json:"can_share"`
}

// DocumentListResponse represents a document in list view (without full content)
type DocumentListResponse struct {
	ID              int                     `json:"id"`
	ProjectID       *int                    `json:"project_id"`
	CustomerID      *int                    `json:"customer_id"`
	OwnerID         int                     `json:"owner_id"`
	Title           string                  `json:"title"`
	Type            DocumentType            `json:"type"`
	Status          DocumentStatus          `json:"status"`
	Category        *string                 `json:"category"`
	Subcategory     *string                 `json:"subcategory"`
	Visibility      DocumentVisibility      `json:"visibility"`
	Tags            []string                `json:"tags"`
	Description     *string                 `json:"description"`
	Version         int                     `json:"version"`
	CreatedBy       int                     `json:"created_by"`
	CreatedAt       time.Time               `json:"created_at"`
	UpdatedAt       time.Time               `json:"updated_at"`
	ContentSize     int                     `json:"content_size"`
	// Extended fields
	ProjectName     string                  `json:"project_name,omitempty"`
	CustomerName    string                  `json:"customer_name,omitempty"`
	OwnerName       string                  `json:"owner_name,omitempty"`
	CreatorName     string                  `json:"creator_name,omitempty"`
	AssociationType DocumentAssociationType `json:"association_type"`
	CanEdit         bool                    `json:"can_edit"`
	CanDelete       bool                    `json:"can_delete"`
	CanShare        bool                    `json:"can_share"`
}

// DocumentFilter represents document filtering options
type DocumentFilter struct {
	ProjectID       *int                 `form:"project_id"`
	CustomerID      *int                 `form:"customer_id"`
	OwnerID         *int                 `form:"owner_id"`
	Type            *DocumentType        `form:"type"`
	Status          *DocumentStatus      `form:"status"`
	Category        *string              `form:"category"`
	Visibility      *DocumentVisibility  `form:"visibility"`
	Search          string               `form:"search"`
	Tags            []string             `form:"tags"`
	SortBy          string               `form:"sort_by"`
	Order           string               `form:"order"` 
	Page            int                  `form:"page"`
	Limit           int                  `form:"limit"`
	IncludeDeleted  bool                 `form:"include_deleted"`
}

// DocumentStats represents document statistics
type DocumentStats struct {
	TotalDocuments    int                            `json:"total_documents"`
	ProjectDocuments  int                            `json:"project_documents"`
	CustomerDocuments int                            `json:"customer_documents"`
	PersonalDocuments int                            `json:"personal_documents"`
	ByType            map[DocumentType]int           `json:"by_type"`
	ByStatus          map[DocumentStatus]int         `json:"by_status"`
	ByVisibility      map[DocumentVisibility]int     `json:"by_visibility"`
	RecentDocuments   int                            `json:"recent_documents"`
}

// GetAssociationType returns the association type of the document
func (d *Document) GetAssociationType() DocumentAssociationType {
	if d.ProjectID != nil {
		return DocumentAssociationProject
	}
	if d.CustomerID != nil {
		return DocumentAssociationCustomer
	}
	return DocumentAssociationPersonal
}

// GetAssociationType returns the association type of the document list response
func (d *DocumentListResponse) GetAssociationType() DocumentAssociationType {
	if d.ProjectID != nil {
		return DocumentAssociationProject
	}
	if d.CustomerID != nil {
		return DocumentAssociationCustomer
	}
	return DocumentAssociationPersonal
}

// ToResponse converts Document to DocumentResponse
func (d *Document) ToResponse() DocumentResponse {
	return DocumentResponse{
		ID:              d.ID,
		ProjectID:       d.ProjectID,
		CustomerID:      d.CustomerID,
		OwnerID:         d.OwnerID,
		Title:           d.Title,
		Content:         d.Content,
		Type:            d.Type,
		Status:          d.Status,
		Category:        d.Category,
		Subcategory:     d.Subcategory,
		Visibility:      d.Visibility,
		SharedWith:      []int(d.SharedWith),
		FileURL:         d.FileURL,
		FileSize:        d.FileSize,
		MimeType:        d.MimeType,
		Tags:            []string(d.Tags),
		Description:     d.Description,
		Version:         d.Version,
		CreatedBy:       d.CreatedBy,
		CreatedAt:       d.CreatedAt,
		UpdatedAt:       d.UpdatedAt,
		AssociationType: d.GetAssociationType(),
	}
}

// ToListResponse converts Document to DocumentListResponse
func (d *Document) ToListResponse() DocumentListResponse {
	return DocumentListResponse{
		ID:              d.ID,
		ProjectID:       d.ProjectID,
		CustomerID:      d.CustomerID,
		OwnerID:         d.OwnerID,
		Title:           d.Title,
		Type:            d.Type,
		Status:          d.Status,
		Category:        d.Category,
		Subcategory:     d.Subcategory,
		Visibility:      d.Visibility,
		Tags:            []string(d.Tags),
		Description:     d.Description,
		Version:         d.Version,
		CreatedBy:       d.CreatedBy,
		CreatedAt:       d.CreatedAt,
		UpdatedAt:       d.UpdatedAt,
		ContentSize:     len(d.Content),
		AssociationType: d.GetAssociationType(),
	}
}

// ToResponseWithRelations converts Document to DocumentResponse with additional relation info
func (d *Document) ToResponseWithRelations(projectName, customerName, ownerName, creatorName string, permissions map[string]bool) DocumentResponse {
	response := d.ToResponse()
	response.ProjectName = projectName
	response.CustomerName = customerName
	response.OwnerName = ownerName
	response.CreatorName = creatorName
	response.CanEdit = permissions["can_edit"]
	response.CanDelete = permissions["can_delete"]
	response.CanShare = permissions["can_share"]
	return response
}

// ToListResponseWithRelations converts Document to DocumentListResponse with additional relation info
func (d *Document) ToListResponseWithRelations(projectName, customerName, ownerName, creatorName string, permissions map[string]bool) DocumentListResponse {
	response := d.ToListResponse()
	response.ProjectName = projectName
	response.CustomerName = customerName
	response.OwnerName = ownerName
	response.CreatorName = creatorName
	response.CanEdit = permissions["can_edit"]
	response.CanDelete = permissions["can_delete"]
	response.CanShare = permissions["can_share"]
	return response
}

// ValidateAssociation validates that only one association type is set
func (dr *DocumentRequest) ValidateAssociation() error {
	associations := 0
	if dr.ProjectID != nil {
		associations++
	}
	if dr.CustomerID != nil {
		associations++
	}
	
	if associations > 1 {
		return fmt.Errorf("document can only be associated with one entity (project, customer, or personal)")
	}
	
	return nil
}

// ValidateAssociation validates that only one association type is set for update requests
func (dr *UpdateDocumentRequest) ValidateAssociation() error {
	associations := 0
	if dr.ProjectID != nil {
		associations++
	}
	if dr.CustomerID != nil {
		associations++
	}
	
	if associations > 1 {
		return fmt.Errorf("document can only be associated with one entity (project, customer, or personal)")
	}
	
	return nil
}

// IsValidDocumentType checks if the document type is valid
func IsValidDocumentType(docType string) bool {
	validTypes := []DocumentType{
		DocumentTypeMarkdown,
		DocumentTypeImage,
		DocumentTypePDF,
	}
	
	for _, validType := range validTypes {
		if DocumentType(docType) == validType {
			return true
		}
	}
	return false
}

// IsValidDocumentStatus checks if the document status is valid
func IsValidDocumentStatus(status string) bool {
	validStatuses := []DocumentStatus{
		DocumentStatusDraft,
		DocumentStatusPublished,
		DocumentStatusArchived,
	}
	
	for _, validStatus := range validStatuses {
		if DocumentStatus(status) == validStatus {
			return true
		}
	}
	return false
}

// IsValidDocumentVisibility checks if the document visibility is valid
func IsValidDocumentVisibility(visibility string) bool {
	validVisibilities := []DocumentVisibility{
		DocumentVisibilityPrivate,
		DocumentVisibilityTeam,
		DocumentVisibilityPublic,
	}
	
	for _, validVisibility := range validVisibilities {
		if DocumentVisibility(visibility) == validVisibility {
			return true
		}
	}
	return false
}