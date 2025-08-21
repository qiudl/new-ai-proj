package models

import (
	"time"
)

// Company represents a company/enterprise customer
type Company struct {
	ID                   int        `json:"id" db:"id"`
	CompanyName          string     `json:"company_name" db:"company_name" validate:"required,min=1,max=255"`
	CompanyCode          *string    `json:"company_code" db:"company_code"`
	Industry             *string    `json:"industry" db:"industry"`
	CompanyType          string     `json:"company_type" db:"company_type"`
	BusinessLicense      *string    `json:"business_license" db:"business_license"`
	TaxNumber            *string    `json:"tax_number" db:"tax_number"`
	LegalRepresentative  *string    `json:"legal_representative" db:"legal_representative"`
	
	// Contact information
	Address              *string    `json:"address" db:"address"`
	City                 *string    `json:"city" db:"city"`
	Province             *string    `json:"province" db:"province"`
	PostalCode           *string    `json:"postal_code" db:"postal_code"`
	Website              *string    `json:"website" db:"website" validate:"omitempty,url"`
	MainPhone            *string    `json:"main_phone" db:"main_phone"`
	MainEmail            *string    `json:"main_email" db:"main_email" validate:"omitempty,email"`
	
	// Business information
	Status               string     `json:"status" db:"status" validate:"oneof=active inactive potential suspended"`
	Priority             string     `json:"priority" db:"priority" validate:"oneof=high medium low"`
	AnnualContractValue  *float64   `json:"annual_contract_value" db:"annual_contract_value"`
	TotalContractValue   *float64   `json:"total_contract_value" db:"total_contract_value"`
	StartDate            *time.Time `json:"start_date" db:"start_date"`
	
	// Company scale
	EmployeeCount        *int       `json:"employee_count" db:"employee_count"`
	CompanySize          *string    `json:"company_size" db:"company_size" validate:"omitempty,oneof=startup small medium large enterprise"`
	
	// Metadata
	CreatedBy            *int       `json:"created_by" db:"created_by"`
	UpdatedBy            *int       `json:"updated_by" db:"updated_by"`
	CreatedAt            time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt            time.Time  `json:"updated_at" db:"updated_at"`
	DeletedAt            *time.Time `json:"deleted_at,omitempty" db:"deleted_at"`
}

// CompanyRequest represents a request to create or update a company
type CompanyRequest struct {
	CompanyName          string     `json:"company_name" validate:"required,min=1,max=255"`
	CompanyCode          *string    `json:"company_code"`
	Industry             *string    `json:"industry"`
	CompanyType          string     `json:"company_type" validate:"oneof=limited_company joint_stock individual partnership"`
	BusinessLicense      *string    `json:"business_license"`
	TaxNumber            *string    `json:"tax_number"`
	LegalRepresentative  *string    `json:"legal_representative"`
	
	Address              *string    `json:"address"`
	City                 *string    `json:"city"`
	Province             *string    `json:"province"`
	PostalCode           *string    `json:"postal_code"`
	Website              *string    `json:"website" validate:"omitempty,url"`
	MainPhone            *string    `json:"main_phone"`
	MainEmail            *string    `json:"main_email" validate:"omitempty,email"`
	
	Status               string     `json:"status" validate:"oneof=active inactive potential suspended"`
	Priority             string     `json:"priority" validate:"oneof=high medium low"`
	AnnualContractValue  *float64   `json:"annual_contract_value" validate:"omitempty,min=0"`
	StartDate            *time.Time `json:"start_date"`
	
	EmployeeCount        *int       `json:"employee_count" validate:"omitempty,min=0"`
	CompanySize          *string    `json:"company_size" validate:"omitempty,oneof=startup small medium large enterprise"`
}

// CompanyUpdateRequest represents a request to update a company (all fields optional)
type CompanyUpdateRequest struct {
	CompanyName          *string    `json:"company_name" validate:"omitempty,min=1,max=255"`
	CompanyCode          *string    `json:"company_code"`
	Industry             *string    `json:"industry"`
	CompanyType          *string    `json:"company_type" validate:"omitempty,oneof=limited_company joint_stock individual partnership"`
	BusinessLicense      *string    `json:"business_license"`
	TaxNumber            *string    `json:"tax_number"`
	LegalRepresentative  *string    `json:"legal_representative"`
	
	Address              *string    `json:"address"`
	City                 *string    `json:"city"`
	Province             *string    `json:"province"`
	PostalCode           *string    `json:"postal_code"`
	Website              *string    `json:"website" validate:"omitempty,url"`
	MainPhone            *string    `json:"main_phone"`
	MainEmail            *string    `json:"main_email" validate:"omitempty,email"`
	
	Status               *string    `json:"status" validate:"omitempty,oneof=active inactive potential suspended"`
	Priority             *string    `json:"priority" validate:"omitempty,oneof=high medium low"`
	AnnualContractValue  *float64   `json:"annual_contract_value" validate:"omitempty,min=0"`
	StartDate            *time.Time `json:"start_date"`
	
	EmployeeCount        *int       `json:"employee_count" validate:"omitempty,min=0"`
	CompanySize          *string    `json:"company_size" validate:"omitempty,oneof=startup small medium large enterprise"`
}

// CompanyResponse represents the response format for a company
type CompanyResponse struct {
	ID                   int        `json:"id"`
	CompanyName          string     `json:"companyName"`
	Deleted              bool       `json:"deleted,omitempty"`
	CompanyCode          *string    `json:"companyCode"`
	Industry             *string    `json:"industry"`
	CompanyType          string     `json:"companyType"`
	CompanyTypeText      string     `json:"companyTypeText"`
	BusinessLicense      *string    `json:"businessLicense"`
	TaxNumber            *string    `json:"taxNumber"`
	LegalRepresentative  *string    `json:"legalRepresentative"`
	
	Address              *string    `json:"address"`
	City                 *string    `json:"city"`
	Province             *string    `json:"province"`
	PostalCode           *string    `json:"postalCode"`
	Website              *string    `json:"website"`
	MainPhone            *string    `json:"mainPhone"`
	MainEmail            *string    `json:"mainEmail"`
	
	Status               string     `json:"status"`
	StatusText           string     `json:"statusText"`
	Priority             string     `json:"priority"`
	PriorityText         string     `json:"priorityText"`
	AnnualContractValue  *float64   `json:"annualContractValue"`
	TotalContractValue   *float64   `json:"totalContractValue"`
	StartDate            *time.Time `json:"startDate"`
	
	EmployeeCount        *int       `json:"employeeCount"`
	CompanySize          *string    `json:"companySize"`
	CompanySizeText      *string    `json:"companySizeText"`
	
	CreatedBy            *int       `json:"createdBy"`
	CreatedByName        *string    `json:"createdByName,omitempty"`
	UpdatedBy            *int       `json:"updatedBy"`
	UpdatedByName        *string    `json:"updatedByName,omitempty"`
	CreatedAt            time.Time  `json:"createdAt"`
	UpdatedAt            time.Time  `json:"updatedAt"`
	
	// Related data
	UserCount            int        `json:"userCount,omitempty"`
	ProjectCount         int        `json:"projectCount,omitempty"`
	ContractCount        int        `json:"contractCount,omitempty"`
	LastContactDate      *time.Time `json:"lastContactDate,omitempty"`
}

// CompanyUser represents a user within a company
type CompanyUser struct {
	ID                   int        `json:"id" db:"id"`
	CustomerID           int        `json:"customer_id" db:"customer_id"`
	
	Name                 string     `json:"name" db:"name" validate:"required,min=1,max=100"`
	Position             *string    `json:"position" db:"position"`
	Department           *string    `json:"department" db:"department"`
	Email                *string    `json:"email" db:"email" validate:"omitempty,email"`
	Phone                *string    `json:"phone" db:"phone"`
	Mobile               *string    `json:"mobile" db:"mobile"`
	WorkPhone            *string    `json:"work_phone" db:"work_phone"`
	
	Role                 string     `json:"role" db:"role" validate:"oneof=primary_contact technical_contact decision_maker finance_contact normal"`
	IsPrimaryContact     bool       `json:"is_primary_contact" db:"is_primary_contact"`
	CanMakeDecisions     bool       `json:"can_make_decisions" db:"can_make_decisions"`
	AccessLevel          int        `json:"access_level" db:"access_level" validate:"min=1,max=5"`
	
	Status               string     `json:"status" db:"status" validate:"oneof=active inactive left"`
	Notes                *string    `json:"notes" db:"notes"`
	
	CreatedAt            time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt            time.Time  `json:"updated_at" db:"updated_at"`
}

// CompanyUserRequest represents a request to create or update a company user
type CompanyUserRequest struct {
	CustomerID           int        `json:"customer_id" validate:"required"`
	Name                 string     `json:"name" validate:"required,min=1,max=100"`
	Position             *string    `json:"position"`
	Department           *string    `json:"department"`
	Email                *string    `json:"email" validate:"omitempty,email"`
	Phone                *string    `json:"phone"`
	Mobile               *string    `json:"mobile"`
	WorkPhone            *string    `json:"work_phone"`
	
	Role                 string     `json:"role" validate:"oneof=primary_contact technical_contact decision_maker finance_contact normal"`
	IsPrimaryContact     bool       `json:"is_primary_contact"`
	CanMakeDecisions     bool       `json:"can_make_decisions"`
	AccessLevel          int        `json:"access_level" validate:"min=1,max=5"`
	
	Status               string     `json:"status" validate:"oneof=active inactive left"`
	Notes                *string    `json:"notes"`
}

// CompanyUserResponse represents the response format for a company user
type CompanyUserResponse struct {
	ID                   int        `json:"id"`
	CustomerID           int        `json:"customerId"`
	CompanyName          string     `json:"companyName,omitempty"`
	
	Name                 string     `json:"name"`
	Position             *string    `json:"position"`
	Department           *string    `json:"department"`
	Email                *string    `json:"email"`
	Phone                *string    `json:"phone"`
	Mobile               *string    `json:"mobile"`
	WorkPhone            *string    `json:"workPhone"`
	
	Role                 string     `json:"role"`
	RoleText             string     `json:"roleText"`
	IsPrimaryContact     bool       `json:"isPrimaryContact"`
	CanMakeDecisions     bool       `json:"canMakeDecisions"`
	AccessLevel          int        `json:"accessLevel"`
	AccessLevelText      string     `json:"accessLevelText"`
	
	Status               string     `json:"status"`
	StatusText           string     `json:"statusText"`
	Notes                *string    `json:"notes"`
	
	CreatedAt            time.Time  `json:"createdAt"`
	UpdatedAt            time.Time  `json:"updatedAt"`
}

// CompanyContact represents a contact record with a company
type CompanyContact struct {
	ID                   int        `json:"id" db:"id"`
	CustomerID           int        `json:"customer_id" db:"customer_id"`
	CompanyUserID        *int       `json:"company_user_id" db:"company_user_id"`
	
	ContactType          string     `json:"contact_type" db:"contact_type" validate:"oneof=email phone meeting visit video_call other"`
	Subject              *string    `json:"subject" db:"subject"`
	Content              *string    `json:"content" db:"content"`
	
	ContactDate          time.Time  `json:"contact_date" db:"contact_date"`
	NextContactDate      *time.Time `json:"next_contact_date" db:"next_contact_date"`
	
	Status               string     `json:"status" db:"status" validate:"oneof=planned completed cancelled rescheduled"`
	Result               *string    `json:"result" db:"result" validate:"omitempty,oneof=positive neutral negative no_response follow_up_needed"`
	FollowUpRequired     bool       `json:"follow_up_required" db:"follow_up_required"`
	
	RelatedProjectID     *int       `json:"related_project_id" db:"related_project_id"`
	RelatedContractID    *int       `json:"related_contract_id" db:"related_contract_id"`
	
	ContactedBy          *int       `json:"contacted_by" db:"contacted_by"`
	CreatedAt            time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt            time.Time  `json:"updated_at" db:"updated_at"`
	
	// Related data for display
	CompanyUserName      *string    `json:"company_user_name,omitempty"`
	ContactedByName      *string    `json:"contacted_by_name,omitempty"`
}

// CompanyContactRequest represents a request to create or update a contact record
type CompanyContactRequest struct {
	CustomerID           int        `json:"customer_id" validate:"required"`
	CompanyUserID        *int       `json:"company_user_id"`
	
	ContactType          string     `json:"contact_type" validate:"required,oneof=email phone meeting visit video_call other"`
	Subject              *string    `json:"subject" validate:"omitempty,max=255"`
	Content              *string    `json:"content"`
	
	ContactDate          *time.Time `json:"contact_date"`
	NextContactDate      *time.Time `json:"next_contact_date"`
	
	Status               string     `json:"status" validate:"oneof=planned completed cancelled rescheduled"`
	Result               *string    `json:"result" validate:"omitempty,oneof=positive neutral negative no_response follow_up_needed"`
	FollowUpRequired     bool       `json:"follow_up_required"`
	
	RelatedProjectID     *int       `json:"related_project_id"`
	RelatedContractID    *int       `json:"related_contract_id"`
}

// CompanyStats represents company statistics
type CompanyStats struct {
	TotalCompanies              int                   `json:"total_companies"`
	ActiveCompanies             int                   `json:"active_companies"`
	InactiveCompanies           int                   `json:"inactive_companies"`
	PotentialCompanies          int                   `json:"potential_companies"`
	SuspendedCompanies          int                   `json:"suspended_companies"`
	HighPriorityCompanies       int                   `json:"high_priority_companies"`
	MediumPriorityCompanies     int                   `json:"medium_priority_companies"`
	LowPriorityCompanies        int                   `json:"low_priority_companies"`
	TotalAnnualContractValue    float64               `json:"total_annual_contract_value"`
	AverageAnnualContractValue  float64               `json:"average_annual_contract_value"`
	ByIndustry                  []IndustryStats       `json:"by_industry"`
	ByStatus                    []StatusStats         `json:"by_status"`
	ByPriority                  []PriorityStats       `json:"by_priority"`
	ByCompanySize               []CompanySizeStats    `json:"by_company_size"`
}

// IndustryStats represents statistics by industry
type IndustryStats struct {
	Industry   string  `json:"industry"`
	Count      int     `json:"count"`
	Percentage float64 `json:"percentage"`
	Revenue    float64 `json:"revenue"`
}

// StatusStats represents statistics by status
type StatusStats struct {
	Status     string  `json:"status"`
	Count      int     `json:"count"`
	Percentage float64 `json:"percentage"`
}

// PriorityStats represents statistics by priority
type PriorityStats struct {
	Priority   string  `json:"priority"`
	Count      int     `json:"count"`
	Percentage float64 `json:"percentage"`
}

// CompanySizeStats represents statistics by company size
type CompanySizeStats struct {
	CompanySize string  `json:"company_size"`
	Count       int     `json:"count"`
	Percentage  float64 `json:"percentage"`
}

// ToResponse converts Company to CompanyResponse
func (c *Company) ToResponse() CompanyResponse {
	response := CompanyResponse{
		ID:                  c.ID,
		CompanyName:         c.CompanyName,
		CompanyCode:         c.CompanyCode,
		Industry:            c.Industry,
		CompanyType:         c.CompanyType,
		CompanyTypeText:     getCompanyTypeText(c.CompanyType),
		BusinessLicense:     c.BusinessLicense,
		TaxNumber:           c.TaxNumber,
		LegalRepresentative: c.LegalRepresentative,
		Address:             c.Address,
		City:                c.City,
		Province:            c.Province,
		PostalCode:          c.PostalCode,
		Website:             c.Website,
		MainPhone:           c.MainPhone,
		MainEmail:           c.MainEmail,
		Status:              c.Status,
		StatusText:          getCompanyStatusText(c.Status),
		Priority:            c.Priority,
		PriorityText:        getCompanyPriorityText(c.Priority),
		AnnualContractValue: c.AnnualContractValue,
		TotalContractValue:  c.TotalContractValue,
		StartDate:           c.StartDate,
		EmployeeCount:       c.EmployeeCount,
		CompanySize:         c.CompanySize,
		CreatedBy:           c.CreatedBy,
		UpdatedBy:           c.UpdatedBy,
		CreatedAt:           c.CreatedAt,
		UpdatedAt:           c.UpdatedAt,
	}
	
	if c.CompanySize != nil {
		companySizeText := getCompanySizeText(*c.CompanySize)
		response.CompanySizeText = &companySizeText
	}
	
	return response
}

// ToResponse converts CompanyUser to CompanyUserResponse
func (cu *CompanyUser) ToResponse() CompanyUserResponse {
	return CompanyUserResponse{
		ID:               cu.ID,
		CustomerID:       cu.CustomerID,
		Name:             cu.Name,
		Position:         cu.Position,
		Department:       cu.Department,
		Email:            cu.Email,
		Phone:            cu.Phone,
		Mobile:           cu.Mobile,
		WorkPhone:        cu.WorkPhone,
		Role:             cu.Role,
		RoleText:         getCompanyUserRoleText(cu.Role),
		IsPrimaryContact: cu.IsPrimaryContact,
		CanMakeDecisions: cu.CanMakeDecisions,
		AccessLevel:      cu.AccessLevel,
		AccessLevelText:  getAccessLevelText(cu.AccessLevel),
		Status:           cu.Status,
		StatusText:       getCompanyUserStatusText(cu.Status),
		Notes:            cu.Notes,
		CreatedAt:        cu.CreatedAt,
		UpdatedAt:        cu.UpdatedAt,
	}
}

// Helper functions for text conversion
func getCompanyTypeText(companyType string) string {
	typeMap := map[string]string{
		"limited_company": "有限责任公司",
		"joint_stock":     "股份有限公司",
		"individual":      "个体工商户",
		"partnership":     "合伙企业",
	}
	if text, ok := typeMap[companyType]; ok {
		return text
	}
	return "未知类型"
}

func getCompanyStatusText(status string) string {
	statusMap := map[string]string{
		"active":     "活跃客户",
		"inactive":   "非活跃客户",
		"potential":  "潜在客户",
		"suspended":  "暂停合作",
	}
	if text, ok := statusMap[status]; ok {
		return text
	}
	return "未知状态"
}

func getCompanyPriorityText(priority string) string {
	priorityMap := map[string]string{
		"low":    "低优先级",
		"medium": "中优先级",
		"high":   "高优先级",
	}
	if text, ok := priorityMap[priority]; ok {
		return text
	}
	return "未知优先级"
}

func getCompanySizeText(size string) string {
	sizeMap := map[string]string{
		"startup":    "初创公司",
		"small":      "小型企业",
		"medium":     "中型企业",
		"large":      "大型企业",
		"enterprise": "超大型企业",
	}
	if text, ok := sizeMap[size]; ok {
		return text
	}
	return "未知规模"
}

func getCompanyUserRoleText(role string) string {
	roleMap := map[string]string{
		"primary_contact":   "主要联系人",
		"technical_contact": "技术联系人",
		"decision_maker":    "决策人",
		"finance_contact":   "财务联系人",
		"normal":            "普通用户",
	}
	if text, ok := roleMap[role]; ok {
		return text
	}
	return "未知角色"
}

func getAccessLevelText(level int) string {
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

func getCompanyUserStatusText(status string) string {
	statusMap := map[string]string{
		"active":   "在职",
		"inactive": "暂停",
		"left":     "离职",
	}
	if text, ok := statusMap[status]; ok {
		return text
	}
	return "未知状态"
}