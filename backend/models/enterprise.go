package models

import (
	"time"

	"github.com/google/uuid"
)

// Enterprise represents an enterprise/organization in the new system
type Enterprise struct {
	ID           int        `json:"id" db:"id"`
	// UUID and sync fields for cross-database synchronization
	UUID         uuid.UUID  `json:"uuid" db:"uuid"`
	SyncSource   *string    `json:"sync_source,omitempty" db:"sync_source"`
	SyncRemoteID *int       `json:"sync_remote_id,omitempty" db:"sync_remote_id"`
	SyncedAt     *time.Time `json:"synced_at,omitempty" db:"synced_at"`
	SyncVersion  int        `json:"sync_version" db:"sync_version"`
	// Core fields
	Name         string     `json:"name" db:"name" validate:"required,min=1,max=255"`
	Code        string `json:"code" db:"code" validate:"required,min=1,max=100"`
	Description *string `json:"description" db:"description"`
	
	// Industry and business information
	IndustryType *string `json:"industry_type" db:"industry_type"`
	BusinessType string  `json:"business_type" db:"business_type" validate:"oneof=individual partnership corporation llc"`
	
	// Legal and registration information
	RegistrationNumber  *string `json:"registration_number" db:"registration_number"`
	TaxID              *string `json:"tax_id" db:"tax_id"`
	LegalRepresentative *string `json:"legal_representative" db:"legal_representative"`
	
	// Contact information
	ContactEmail *string `json:"contact_email" db:"contact_email" validate:"omitempty,email"`
	ContactPhone *string `json:"contact_phone" db:"contact_phone"`
	Address      *string `json:"address" db:"address"`
	City         *string `json:"city" db:"city"`
	Province     *string `json:"province" db:"province"`
	PostalCode   *string `json:"postal_code" db:"postal_code"`
	Website      *string `json:"website" db:"website" validate:"omitempty,url"`
	
	// Status
	Status string `json:"status" db:"status" validate:"oneof=active inactive suspended"`
	
	// Metadata
	CreatedBy *int       `json:"created_by" db:"created_by"`
	UpdatedBy *int       `json:"updated_by" db:"updated_by"`
	CreatedAt time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt time.Time  `json:"updated_at" db:"updated_at"`
	DeletedAt *time.Time `json:"deleted_at,omitempty" db:"deleted_at"`
}

// EnterpriseUser represents a user within an enterprise
type EnterpriseUser struct {
	ID           int     `json:"id" db:"id"`
	EnterpriseID int     `json:"enterprise_id" db:"enterprise_id" validate:"required"`
	UserID       *int    `json:"user_id,omitempty" db:"user_id"` // Reference to system user for login
	Username     string  `json:"username" db:"username" validate:"required,min=3,max=50"`
	Email        string `json:"email" db:"email" validate:"required,email"`

	// Personal information
	Name         string  `json:"name" db:"name" validate:"required,min=1,max=100"`
	Phone        *string `json:"phone" db:"phone"`
	Position     *string `json:"position" db:"position"`
	DepartmentID *int    `json:"department_id" db:"department_id"`
	
	// Enterprise role information
	IsPrimaryContact bool `json:"is_primary_contact" db:"is_primary_contact"`
	AccessLevel      int  `json:"access_level" db:"access_level" validate:"min=1,max=5"`
	
	// Status and metadata
	Status      string     `json:"status" db:"status" validate:"oneof=active inactive archived"`
	LastLoginAt *time.Time `json:"last_login_at,omitempty" db:"last_login_at"`
	Bio         *string    `json:"bio" db:"bio"`
	
	// Metadata
	CreatedBy *int       `json:"created_by" db:"created_by"`
	UpdatedBy *int       `json:"updated_by" db:"updated_by"`
	CreatedAt time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt time.Time  `json:"updated_at" db:"updated_at"`
	DeletedAt *time.Time `json:"deleted_at,omitempty" db:"deleted_at"`
}

// EnterpriseDepartment represents a department within an enterprise
type EnterpriseDepartment struct {
	ID           int     `json:"id" db:"id"`
	EnterpriseID int     `json:"enterprise_id" db:"enterprise_id" validate:"required"`
	Name         string  `json:"name" db:"name" validate:"required,min=1,max=255"`
	ParentID     *int    `json:"parent_id" db:"parent_id"`
	Level        int     `json:"level" db:"level"`
	Path         *string `json:"path" db:"path"`
	SortOrder    int     `json:"sort_order" db:"sort_order"`
	
	// Management information
	ManagerID     *int    `json:"manager_id" db:"manager_id"`
	Description   *string `json:"description" db:"description"`
	EmployeeCount int     `json:"employee_count" db:"employee_count"`
	
	// Status
	Status string `json:"status" db:"status" validate:"oneof=active inactive archived"`
	
	// Metadata
	CreatedBy *int       `json:"created_by" db:"created_by"`
	UpdatedBy *int       `json:"updated_by" db:"updated_by"`
	CreatedAt time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt time.Time  `json:"updated_at" db:"updated_at"`
	DeletedAt *time.Time `json:"deleted_at,omitempty" db:"deleted_at"`
}

// Request and Response models

// EnterpriseRequest represents a request to create or update an enterprise
type EnterpriseRequest struct {
	Name        string  `json:"name" validate:"required,min=1,max=255"`
	Code        string  `json:"code" validate:"required,min=1,max=100"`
	Description *string `json:"description"`
	
	IndustryType *string `json:"industry_type"`
	BusinessType string  `json:"business_type" validate:"oneof=individual partnership corporation llc"`
	
	RegistrationNumber  *string `json:"registration_number"`
	TaxID              *string `json:"tax_id"`
	LegalRepresentative *string `json:"legal_representative"`
	
	ContactEmail *string `json:"contact_email" validate:"omitempty,email"`
	ContactPhone *string `json:"contact_phone"`
	Address      *string `json:"address"`
	City         *string `json:"city"`
	Province     *string `json:"province"`
	PostalCode   *string `json:"postal_code"`
	Website      *string `json:"website" validate:"omitempty,url"`
	
	Status string `json:"status" validate:"oneof=active inactive suspended"`
}

// EnterpriseUpdateRequest represents a request to update an enterprise
type EnterpriseUpdateRequest struct {
	Name        *string `json:"name" validate:"omitempty,min=1,max=255"`
	Code        *string `json:"code" validate:"omitempty,min=1,max=100"`
	Description *string `json:"description"`
	
	IndustryType *string `json:"industry_type"`
	BusinessType *string `json:"business_type" validate:"omitempty,oneof=individual partnership corporation llc"`
	
	RegistrationNumber  *string `json:"registration_number"`
	TaxID              *string `json:"tax_id"`
	LegalRepresentative *string `json:"legal_representative"`
	
	ContactEmail *string `json:"contact_email" validate:"omitempty,email"`
	ContactPhone *string `json:"contact_phone"`
	Address      *string `json:"address"`
	City         *string `json:"city"`
	Province     *string `json:"province"`
	PostalCode   *string `json:"postal_code"`
	Website      *string `json:"website" validate:"omitempty,url"`
	
	Status *string `json:"status" validate:"omitempty,oneof=active inactive suspended"`
}

// EnterpriseResponse represents the response format for an enterprise
type EnterpriseResponse struct {
	ID          int     `json:"id"`
	Name        string  `json:"name"`
	Code        string  `json:"code"`
	Description *string `json:"description"`
	
	IndustryType     *string `json:"industry_type"`
	IndustryTypeText *string `json:"industry_type_text,omitempty"`
	BusinessType     string  `json:"business_type"`
	BusinessTypeText string  `json:"business_type_text"`
	
	RegistrationNumber  *string `json:"registration_number"`
	TaxID              *string `json:"tax_id"`
	LegalRepresentative *string `json:"legal_representative"`
	
	ContactEmail *string `json:"contact_email"`
	ContactPhone *string `json:"contact_phone"`
	Address      *string `json:"address"`
	City         *string `json:"city"`
	Province     *string `json:"province"`
	PostalCode   *string `json:"postal_code"`
	Website      *string `json:"website"`
	
	Status     string `json:"status"`
	StatusText string `json:"status_text"`
	
	// Statistics
	UserCount       int `json:"user_count,omitempty"`
	DepartmentCount int `json:"department_count,omitempty"`
	
	CreatedBy     *int      `json:"created_by"`
	CreatedByName *string   `json:"created_by_name,omitempty"`
	UpdatedBy     *int      `json:"updated_by"`
	UpdatedByName *string   `json:"updated_by_name,omitempty"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// EnterpriseUserRequest represents a request to create or update an enterprise user
type EnterpriseUserRequest struct {
	EnterpriseID int    `json:"enterprise_id" validate:"required"`
	Username     string `json:"username" validate:"required,min=3,max=50"`
	Email        string `json:"email" validate:"required,email"`
	
	Name         string  `json:"name" validate:"required,min=1,max=100"`
	Phone        *string `json:"phone"`
	Position     *string `json:"position"`
	DepartmentID *int    `json:"department_id"`
	
	IsPrimaryContact bool `json:"is_primary_contact"`
	AccessLevel      int  `json:"access_level" validate:"min=1,max=5"`
	
	Status string  `json:"status" validate:"oneof=active inactive archived"`
	Bio    *string `json:"bio"`
}

// EnterpriseUserUpdateRequest represents a request to update an enterprise user
type EnterpriseUserUpdateRequest struct {
	EnterpriseID int    `json:"enterprise_id"`
	Username     string `json:"username"`
	Email        string `json:"email" validate:"required,email"`
	
	Name         string  `json:"name" validate:"required,min=1,max=100"`
	Phone        *string `json:"phone"`
	Position     *string `json:"position"`
	DepartmentID *int    `json:"department_id"`
	
	IsPrimaryContact bool `json:"is_primary_contact"`
	AccessLevel      int  `json:"access_level" validate:"min=1,max=5"`
	
	Status string  `json:"status" validate:"oneof=active inactive archived"`
	Bio    *string `json:"bio"`
}

// EnterpriseUserResponseNew represents the response format for an enterprise user (new system)
type EnterpriseUserResponseNew struct {
	ID           int    `json:"id"`
	EnterpriseID int    `json:"enterprise_id"`
	Username     string `json:"username"`
	Email        string `json:"email"`
	
	Name     string  `json:"name"`
	Phone    *string `json:"phone"`
	Position *string `json:"position"`
	
	IsPrimaryContact    bool   `json:"is_primary_contact"`
	AccessLevel         int    `json:"access_level"`
	AccessLevelText     string `json:"access_level_text"`
	
	Status       string     `json:"status"`
	StatusText   string     `json:"status_text"`
	LastLoginAt  *time.Time `json:"last_login_at,omitempty"`
	Bio          *string    `json:"bio"`
	
	// Enterprise information
	EnterpriseName string `json:"enterprise_name,omitempty"`
	
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// EnterpriseDepartmentRequest represents a request to create or update an enterprise department
type EnterpriseDepartmentRequest struct {
	EnterpriseID  int     `json:"enterprise_id" validate:"required"`
	Name          string  `json:"name" validate:"required,min=1,max=255"`
	ParentID      *int    `json:"parent_id"`
	SortOrder     int     `json:"sort_order"`
	ManagerID     *int    `json:"manager_id"`
	Description   *string `json:"description"`
	EmployeeCount int     `json:"employee_count"`
	Status        string  `json:"status" validate:"oneof=active inactive archived"`
}

// EnterpriseDepartmentResponse represents the response format for an enterprise department
type EnterpriseDepartmentResponse struct {
	ID           int     `json:"id"`
	EnterpriseID int     `json:"enterprise_id"`
	Name         string  `json:"name"`
	ParentID     *int    `json:"parent_id"`
	Level        int     `json:"level"`
	Path         *string `json:"path"`
	SortOrder    int     `json:"sort_order"`
	
	ManagerID       *int    `json:"manager_id"`
	ManagerName     *string `json:"manager_name,omitempty"`
	Description     *string `json:"description"`
	EmployeeCount   int     `json:"employee_count"`
	
	Status     string `json:"status"`
	StatusText string `json:"status_text"`
	
	// Parent department information
	ParentName *string `json:"parent_name,omitempty"`
	
	// Enterprise information
	EnterpriseName string `json:"enterprise_name,omitempty"`
	
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Conversion methods

// ToResponse converts Enterprise to EnterpriseResponse
func (e *Enterprise) ToResponse() EnterpriseResponse {
	response := EnterpriseResponse{
		ID:          e.ID,
		Name:        e.Name,
		Code:        e.Code,
		Description: e.Description,
		
		IndustryType:        e.IndustryType,
		BusinessType:        e.BusinessType,
		BusinessTypeText:    getBusinessTypeText(e.BusinessType),
		
		RegistrationNumber:  e.RegistrationNumber,
		TaxID:              e.TaxID,
		LegalRepresentative: e.LegalRepresentative,
		
		ContactEmail: e.ContactEmail,
		ContactPhone: e.ContactPhone,
		Address:      e.Address,
		City:         e.City,
		Province:     e.Province,
		PostalCode:   e.PostalCode,
		Website:      e.Website,
		
		Status:     e.Status,
		StatusText: getEnterpriseStatusText(e.Status),
		
		CreatedBy: e.CreatedBy,
		UpdatedBy: e.UpdatedBy,
		CreatedAt: e.CreatedAt,
		UpdatedAt: e.UpdatedAt,
	}
	
	if e.IndustryType != nil {
		industryText := getIndustryTypeText(*e.IndustryType)
		response.IndustryTypeText = &industryText
	}
	
	return response
}

// ToResponse converts EnterpriseUser to EnterpriseUserResponseNew
func (eu *EnterpriseUser) ToResponse() EnterpriseUserResponseNew {
	return EnterpriseUserResponseNew{
		ID:           eu.ID,
		EnterpriseID: eu.EnterpriseID,
		Username:     eu.Username,
		Email:        eu.Email,
		
		Name:     eu.Name,
		Phone:    eu.Phone,
		Position: eu.Position,
		
		IsPrimaryContact: eu.IsPrimaryContact,
		AccessLevel:      eu.AccessLevel,
		AccessLevelText:  getEnterpriseAccessLevelText(eu.AccessLevel),
		
		Status:      eu.Status,
		StatusText:  getEnterpriseUserStatusText(eu.Status),
		LastLoginAt: eu.LastLoginAt,
		Bio:         eu.Bio,
		
		CreatedAt: eu.CreatedAt,
		UpdatedAt: eu.UpdatedAt,
	}
}

// ToResponse converts EnterpriseDepartment to EnterpriseDepartmentResponse
func (ed *EnterpriseDepartment) ToResponse() EnterpriseDepartmentResponse {
	return EnterpriseDepartmentResponse{
		ID:           ed.ID,
		EnterpriseID: ed.EnterpriseID,
		Name:         ed.Name,
		ParentID:     ed.ParentID,
		Level:        ed.Level,
		Path:         ed.Path,
		SortOrder:    ed.SortOrder,
		
		ManagerID:     ed.ManagerID,
		Description:   ed.Description,
		EmployeeCount: ed.EmployeeCount,
		
		Status:     ed.Status,
		StatusText: getEnterpriseDepartmentStatusText(ed.Status),
		
		CreatedAt: ed.CreatedAt,
		UpdatedAt: ed.UpdatedAt,
	}
}

// Helper functions for text conversion

func getEnterpriseStatusText(status string) string {
	statusMap := map[string]string{
		"active":    "活跃",
		"inactive":  "非活跃",
		"suspended": "暂停",
	}
	if text, ok := statusMap[status]; ok {
		return text
	}
	return "未知状态"
}

func getIndustryTypeText(industryType string) string {
	industryMap := map[string]string{
		"technology":    "科技",
		"finance":       "金融",
		"manufacturing": "制造业",
		"healthcare":    "医疗健康",
		"education":     "教育",
		"retail":        "零售",
		"other":         "其他",
	}
	if text, ok := industryMap[industryType]; ok {
		return text
	}
	return "未知行业"
}

func getBusinessTypeText(businessType string) string {
	businessMap := map[string]string{
		"individual":   "个人独资",
		"partnership":  "合伙企业",
		"corporation":  "股份公司",
		"llc":          "有限责任公司",
	}
	if text, ok := businessMap[businessType]; ok {
		return text
	}
	return "未知企业类型"
}


func getEnterpriseAccessLevelText(level int) string {
	levelMap := map[int]string{
		1: "基础权限",
		2: "一般权限",
		3: "中级权限",
		4: "高级权限",
		5: "完全权限",
	}
	if text, ok := levelMap[level]; ok {
		return text
	}
	return "未知权限"
}

func getEnterpriseUserStatusText(status string) string {
	statusMap := map[string]string{
		"active":   "在职",
		"inactive": "暂停",
		"archived": "离职",
	}
	if text, ok := statusMap[status]; ok {
		return text
	}
	return "未知状态"
}

func getEnterpriseDepartmentStatusText(status string) string {
	statusMap := map[string]string{
		"active":   "活跃",
		"inactive": "暂停",
		"archived": "已归档",
	}
	if text, ok := statusMap[status]; ok {
		return text
	}
	return "未知状态"
}

// Stats models for enterprise system

// EnterpriseStats represents enterprise statistics
type EnterpriseStats struct {
	TotalEnterprises      int                        `json:"total_enterprises"`
	ActiveEnterprises     int                        `json:"active_enterprises"`
	InactiveEnterprises   int                        `json:"inactive_enterprises"`
	SuspendedEnterprises  int                        `json:"suspended_enterprises"`
	TotalUsers            int                        `json:"total_users"`
	TotalDepartments      int                        `json:"total_departments"`
	ByBusinessType        []EnterpriseBusinessStats  `json:"by_business_type"`
	ByIndustryType        []EnterpriseIndustryStats  `json:"by_industry_type"`
	ByStatus              []EnterpriseStatusStats    `json:"by_status"`
}

// EnterpriseBusinessStats represents statistics by business type
type EnterpriseBusinessStats struct {
	BusinessType string  `json:"business_type"`
	Count        int     `json:"count"`
	Percentage   float64 `json:"percentage"`
}

// EnterpriseIndustryStats represents statistics by industry type
type EnterpriseIndustryStats struct {
	IndustryType string  `json:"industry_type"`
	Count        int     `json:"count"`
	Percentage   float64 `json:"percentage"`
}

// EnterpriseStatusStats represents statistics by status
type EnterpriseStatusStats struct {
	Status     string  `json:"status"`
	Count      int     `json:"count"`
	Percentage float64 `json:"percentage"`
}

// EnterpriseDepartmentStats represents department statistics for an enterprise
type EnterpriseDepartmentStats struct {
	EnterpriseID       int `json:"enterprise_id"`
	TotalDepartments   int `json:"total_departments"`
	ActiveDepartments  int `json:"active_departments"`
	InactiveDepartments int `json:"inactive_departments"`
	ArchivedDepartments int `json:"archived_departments"`
	MaxDepth           int `json:"max_depth"`
	TotalEmployees     int `json:"total_employees"`
}