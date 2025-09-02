package models

import (
	"time"
)

// CompanyUserCreateRequest represents a request to create a company user
type CompanyUserCreateRequest struct {
	CompanyID         int        `json:"company_id" validate:"required"`
	Username          string     `json:"username" validate:"required,min=3,max=50"`
	Email             string     `json:"email" validate:"required,email"`
	ContactPersonName string     `json:"contact_person_name" validate:"required,max=100"`
	ContactPhone      string     `json:"contact_phone" validate:"required,max=50"`
	DepartmentTitle   string     `json:"department_title" validate:"required,max=100"`
	IsPrimaryContact  bool       `json:"is_primary_contact"`
	AccountExpiresAt  *time.Time `json:"account_expires_at,omitempty"`
	Notes             string     `json:"notes,omitempty"`
}

// CompanyUserUpdateRequest represents a request to update a company user
type CompanyUserUpdateRequest struct {
	ContactPersonName *string    `json:"contact_person_name,omitempty" validate:"omitempty,max=100"`
	ContactPhone      *string    `json:"contact_phone,omitempty" validate:"omitempty,max=50"`
	DepartmentTitle   *string    `json:"department_title,omitempty" validate:"omitempty,max=100"`
	IsPrimaryContact  *bool      `json:"is_primary_contact,omitempty"`
	AccountExpiresAt  *time.Time `json:"account_expires_at,omitempty"`
	Status            *string    `json:"status,omitempty" validate:"omitempty,oneof=active inactive"`
	Notes             *string    `json:"notes,omitempty"`
}

// CompanyUserStatusUpdateRequest represents a request to update company user status
type CompanyUserStatusUpdateRequest struct {
	Status string `json:"status" validate:"required,oneof=active inactive"`
}

// CompanyUserListParams represents parameters for listing company users
type CompanyUserListParams struct {
	Page      int    `json:"page" validate:"min=1"`
	PageSize  int    `json:"page_size" validate:"min=1,max=100"`
	CompanyID *int   `json:"company_id,omitempty"`
	Status    string `json:"status,omitempty" validate:"omitempty,oneof=active inactive"`
	Search    string `json:"search,omitempty"`
}

// EnterpriseUserResponse represents a company user response with additional company info
type EnterpriseUserResponse struct {
	ID                int        `json:"id"`
	Username          string     `json:"username"`
	Email             string     `json:"email"`
	ContactPersonName string     `json:"contact_person_name"`
	ContactPhone      string     `json:"contact_phone"`
	DepartmentTitle   string     `json:"department_title"`
	IsPrimaryContact  bool       `json:"is_primary_contact"`
	Status            string     `json:"status"`
	CompanyID         int        `json:"company_id"`
	CompanyName       string     `json:"company_name"`
	LastLoginAt       *time.Time `json:"last_login_at,omitempty"`
	AccountExpiresAt  *time.Time `json:"account_expires_at,omitempty"`
	LastProjectAccess *time.Time `json:"last_project_access,omitempty"`
	Notes             *string    `json:"notes,omitempty"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
}

// CompanyUserListResponse represents a paginated list of company users
type CompanyUserListResponse struct {
	Data     []EnterpriseUserResponse `json:"data"`
	Total    int                      `json:"total"`
	Page     int                      `json:"page"`
	PageSize int                      `json:"page_size"`
}

// CompanyUserStats represents company user statistics
type CompanyUserStats struct {
	Total               int            `json:"total"`
	ByStatus            map[string]int `json:"by_status"`
	ByCompany           map[string]int `json:"by_company"`
	PrimaryContacts     int            `json:"primary_contacts"`
	ExpiringAccounts    int            `json:"expiring_accounts"`
	RecentRegistrations int            `json:"recent_registrations"`
}

// BatchCompanyUserRequest represents a batch operation request for company users
type BatchCompanyUserRequest struct {
	UserIDs []int  `json:"user_ids" validate:"required,min=1"`
	Action  string `json:"action" validate:"required,oneof=activate deactivate extend_expiry"`
}

// GeneratePasswordResponse represents the response for a generated password
type GeneratePasswordResponse struct {
	Password string `json:"password"`
}

// ValidateCompanyUserCreate validates a company user creation request
func (req *CompanyUserCreateRequest) ValidateCompanyUserCreate() error {
	// Validate that primary contact isn't already set for this company
	// This would be checked in the service layer against existing data
	return nil
}

// ToUser converts CompanyUserCreateRequest to User model
func (req *CompanyUserCreateRequest) ToUser(passwordHash string) *User {
	return &User{
		Username:          req.Username,
		Email:             req.Email,
		PasswordHash:      passwordHash,
		UserType:          "company",
		CompanyID:         &req.CompanyID,
		Role:              "company_admin",
		Status:            "active",
		ContactPersonName: &req.ContactPersonName,
		ContactPhone:      &req.ContactPhone,
		DepartmentTitle:   &req.DepartmentTitle,
		IsPrimaryContact:  req.IsPrimaryContact,
		AccountExpiresAt:  req.AccountExpiresAt,
		Notes:             &req.Notes,
		CreatedAt:         time.Now(),
		UpdatedAt:         time.Now(),
	}
}

// ApplyUpdate applies an update request to a user
func (req *CompanyUserUpdateRequest) ApplyUpdate(user *User) {
	if req.ContactPersonName != nil {
		user.ContactPersonName = req.ContactPersonName
	}
	if req.ContactPhone != nil {
		user.ContactPhone = req.ContactPhone
	}
	if req.DepartmentTitle != nil {
		user.DepartmentTitle = req.DepartmentTitle
	}
	if req.IsPrimaryContact != nil {
		user.IsPrimaryContact = *req.IsPrimaryContact
	}
	if req.AccountExpiresAt != nil {
		user.AccountExpiresAt = req.AccountExpiresAt
	}
	if req.Status != nil {
		user.Status = *req.Status
	}
	if req.Notes != nil {
		user.Notes = req.Notes
	}
	user.UpdatedAt = time.Now()
}
