package models

import (
	"time"
)

// Customer represents a customer entity
type Customer struct {
	ID                 int          `json:"id" db:"id"`
	Name               string       `json:"name" db:"name" validate:"required,min=1,max=255"`
	Company            *string      `json:"company" db:"company"`
	Industry           *string      `json:"industry" db:"industry"`
	ContactPerson      *string      `json:"contact_person" db:"contact_person"`
	Email              *string      `json:"email" db:"email" validate:"omitempty,email"`
	Phone              *string      `json:"phone" db:"phone"`
	Address            *string      `json:"address" db:"address"`
	Website            *string      `json:"website" db:"website" validate:"omitempty,url"`
	Description        *string      `json:"description" db:"description"`
	Status             string       `json:"status" db:"status" validate:"oneof=active inactive potential closed"`
	ContractValue      *float64     `json:"contract_value" db:"contract_value"`
	ContractStartDate  *time.Time   `json:"contract_start_date" db:"contract_start_date"`
	ContractEndDate    *time.Time   `json:"contract_end_date" db:"contract_end_date"`
	Priority           string       `json:"priority" db:"priority" validate:"oneof=low medium high urgent"`
	CustomFields       CustomFields `json:"custom_fields" db:"custom_fields"`
	CreatedBy          *int         `json:"created_by" db:"created_by"`
	UpdatedBy          *int         `json:"updated_by" db:"updated_by"`
	CreatedAt          time.Time    `json:"created_at" db:"created_at"`
	UpdatedAt          time.Time    `json:"updated_at" db:"updated_at"`
	DeletedAt          *time.Time   `json:"deleted_at,omitempty" db:"deleted_at"`
}

// CustomerRequest represents a request to create or update a customer
type CustomerRequest struct {
	Name              string       `json:"name" validate:"required,min=1,max=255"`
	Company           *string      `json:"company" validate:"omitempty,max=255"`
	Industry          *string      `json:"industry" validate:"omitempty,max=100"`
	ContactPerson     *string      `json:"contact_person" validate:"omitempty,max=255"`
	Email             *string      `json:"email" validate:"omitempty,email"`
	Phone             *string      `json:"phone" validate:"omitempty,max=50"`
	Address           *string      `json:"address"`
	Website           *string      `json:"website" validate:"omitempty,url"`
	Description       *string      `json:"description"`
	Status            string       `json:"status" validate:"oneof=active inactive potential closed"`
	ContractValue     *float64     `json:"contract_value" validate:"omitempty,min=0"`
	ContractStartDate *time.Time   `json:"contract_start_date"`
	ContractEndDate   *time.Time   `json:"contract_end_date"`
	Priority          string       `json:"priority" validate:"oneof=low medium high urgent"`
	CustomFields      CustomFields `json:"custom_fields"`
}

// CustomerResponse represents the response format for a customer
type CustomerResponse struct {
	ID                 int                        `json:"id"`
	Name               string                     `json:"name"`
	Company            *string                    `json:"company"`
	Industry           *string                    `json:"industry"`
	ContactPerson      *string                    `json:"contact_person"`
	Email              *string                    `json:"email"`
	Phone              *string                    `json:"phone"`
	Address            *string                    `json:"address"`
	Website            *string                    `json:"website"`
	Description        *string                    `json:"description"`
	Status             string                     `json:"status"`
	StatusText         string                     `json:"status_text"`
	ContractValue      *float64                   `json:"contract_value"`
	ContractStartDate  *time.Time                 `json:"contract_start_date"`
	ContractEndDate    *time.Time                 `json:"contract_end_date"`
	Priority           string                     `json:"priority"`
	PriorityText       string                     `json:"priority_text"`
	CustomFields       CustomFields               `json:"custom_fields"`
	CreatedBy          *int                       `json:"created_by"`
	CreatedByName      *string                    `json:"created_by_name,omitempty"`
	UpdatedBy          *int                       `json:"updated_by"`
	UpdatedByName      *string                    `json:"updated_by_name,omitempty"`
	CreatedAt          time.Time                  `json:"created_at"`
	UpdatedAt          time.Time                  `json:"updated_at"`
	AssociatedUsers    []CustomerUserResponse     `json:"associated_users,omitempty"`
	RecentContacts     []CustomerContactResponse  `json:"recent_contacts,omitempty"`
}

// CustomerUser represents the association between customers and users
type CustomerUser struct {
	ID           int          `json:"id" db:"id"`
	CustomerID   int          `json:"customer_id" db:"customer_id"`
	UserID       int          `json:"user_id" db:"user_id"`
	Role         string       `json:"role" db:"role" validate:"oneof=contact manager viewer admin"`
	IsPrimary    bool         `json:"is_primary" db:"is_primary"`
	Permissions  CustomFields `json:"permissions" db:"permissions"`
	AccessLevel  int          `json:"access_level" db:"access_level"`
	CreatedAt    time.Time    `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time    `json:"updated_at" db:"updated_at"`
}

// CustomerUserRequest represents a request to associate a user with a customer
type CustomerUserRequest struct {
	UserID      int          `json:"user_id" validate:"required"`
	Role        string       `json:"role" validate:"oneof=contact manager viewer admin"`
	IsPrimary   bool         `json:"is_primary"`
	Permissions CustomFields `json:"permissions"`
	AccessLevel int          `json:"access_level" validate:"min=1,max=10"`
}

// CustomerUserResponse represents the response format for customer-user association
type CustomerUserResponse struct {
	ID           int          `json:"id"`
	CustomerID   int          `json:"customer_id"`
	UserID       int          `json:"user_id"`
	UserName     string       `json:"user_name"`
	UserEmail    string       `json:"user_email"`
	Role         string       `json:"role"`
	RoleText     string       `json:"role_text"`
	IsPrimary    bool         `json:"is_primary"`
	Permissions  CustomFields `json:"permissions"`
	AccessLevel  int          `json:"access_level"`
	CreatedAt    time.Time    `json:"created_at"`
	UpdatedAt    time.Time    `json:"updated_at"`
}

// CustomerContact represents a contact record with a customer
type CustomerContact struct {
	ID              int        `json:"id" db:"id"`
	CustomerID      int        `json:"customer_id" db:"customer_id"`
	ContactType     string     `json:"contact_type" db:"contact_type" validate:"oneof=email phone meeting visit other"`
	Subject         *string    `json:"subject" db:"subject"`
	Content         *string    `json:"content" db:"content"`
	ContactDate     time.Time  `json:"contact_date" db:"contact_date"`
	NextContactDate *time.Time `json:"next_contact_date" db:"next_contact_date"`
	Status          string     `json:"status" db:"status" validate:"oneof=planned completed cancelled"`
	Result          *string    `json:"result" db:"result"`
	ContactedBy     *int       `json:"contacted_by" db:"contacted_by"`
	CreatedAt       time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at" db:"updated_at"`
}

// CustomerContactRequest represents a request to create or update a contact record
type CustomerContactRequest struct {
	ContactType     string     `json:"contact_type" validate:"required,oneof=email phone meeting visit other"`
	Subject         *string    `json:"subject" validate:"omitempty,max=255"`
	Content         *string    `json:"content"`
	ContactDate     *time.Time `json:"contact_date"`
	NextContactDate *time.Time `json:"next_contact_date"`
	Status          string     `json:"status" validate:"oneof=planned completed cancelled"`
	Result          *string    `json:"result" validate:"omitempty,max=100"`
}

// CustomerContactResponse represents the response format for a contact record
type CustomerContactResponse struct {
	ID                int       `json:"id"`
	CustomerID        int       `json:"customer_id"`
	ContactType       string    `json:"contact_type"`
	ContactTypeText   string    `json:"contact_type_text"`
	Subject           *string   `json:"subject"`
	Content           *string   `json:"content"`
	ContactDate       time.Time `json:"contact_date"`
	NextContactDate   *time.Time `json:"next_contact_date"`
	Status            string    `json:"status"`
	StatusText        string    `json:"status_text"`
	Result            *string   `json:"result"`
	ContactedBy       *int      `json:"contacted_by"`
	ContactedByName   *string   `json:"contacted_by_name,omitempty"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

// ToResponse converts Customer to CustomerResponse
func (c *Customer) ToResponse() CustomerResponse {
	response := CustomerResponse{
		ID:                c.ID,
		Name:              c.Name,
		Company:           c.Company,
		Industry:          c.Industry,
		ContactPerson:     c.ContactPerson,
		Email:             c.Email,
		Phone:             c.Phone,
		Address:           c.Address,
		Website:           c.Website,
		Description:       c.Description,
		Status:            c.Status,
		StatusText:        getCustomerStatusText(c.Status),
		ContractValue:     c.ContractValue,
		ContractStartDate: c.ContractStartDate,
		ContractEndDate:   c.ContractEndDate,
		Priority:          c.Priority,
		PriorityText:      getCustomerPriorityText(c.Priority),
		CustomFields:      c.CustomFields,
		CreatedBy:         c.CreatedBy,
		UpdatedBy:         c.UpdatedBy,
		CreatedAt:         c.CreatedAt,
		UpdatedAt:         c.UpdatedAt,
	}
	return response
}

// ToResponse converts CustomerUser to CustomerUserResponse
func (cu *CustomerUser) ToResponse() CustomerUserResponse {
	return CustomerUserResponse{
		ID:          cu.ID,
		CustomerID:  cu.CustomerID,
		UserID:      cu.UserID,
		Role:        cu.Role,
		RoleText:    getCustomerUserRoleText(cu.Role),
		IsPrimary:   cu.IsPrimary,
		Permissions: cu.Permissions,
		AccessLevel: cu.AccessLevel,
		CreatedAt:   cu.CreatedAt,
		UpdatedAt:   cu.UpdatedAt,
	}
}

// ToResponse converts CustomerContact to CustomerContactResponse
func (cc *CustomerContact) ToResponse() CustomerContactResponse {
	return CustomerContactResponse{
		ID:              cc.ID,
		CustomerID:      cc.CustomerID,
		ContactType:     cc.ContactType,
		ContactTypeText: getContactTypeText(cc.ContactType),
		Subject:         cc.Subject,
		Content:         cc.Content,
		ContactDate:     cc.ContactDate,
		NextContactDate: cc.NextContactDate,
		Status:          cc.Status,
		StatusText:      getContactStatusText(cc.Status),
		Result:          cc.Result,
		ContactedBy:     cc.ContactedBy,
		CreatedAt:       cc.CreatedAt,
		UpdatedAt:       cc.UpdatedAt,
	}
}

// Helper functions for text conversion
func getCustomerStatusText(status string) string {
	statusMap := map[string]string{
		"active":    "活跃客户",
		"inactive":  "非活跃客户",
		"potential": "潜在客户",
		"closed":    "已关闭",
	}
	if text, ok := statusMap[status]; ok {
		return text
	}
	return "未知状态"
}

func getCustomerPriorityText(priority string) string {
	priorityMap := map[string]string{
		"low":    "低优先级",
		"medium": "中优先级",
		"high":   "高优先级",
		"urgent": "紧急",
	}
	if text, ok := priorityMap[priority]; ok {
		return text
	}
	return "未知优先级"
}

func getCustomerUserRoleText(role string) string {
	roleMap := map[string]string{
		"contact": "联系人",
		"manager": "管理员",
		"viewer":  "查看者",
		"admin":   "超级管理员",
	}
	if text, ok := roleMap[role]; ok {
		return text
	}
	return "未知角色"
}

func getContactTypeText(contactType string) string {
	typeMap := map[string]string{
		"email":   "邮件联系",
		"phone":   "电话联系",
		"meeting": "会议",
		"visit":   "实地拜访",
		"other":   "其他",
	}
	if text, ok := typeMap[contactType]; ok {
		return text
	}
	return "未知类型"
}

func getContactStatusText(status string) string {
	statusMap := map[string]string{
		"planned":   "计划中",
		"completed": "已完成",
		"cancelled": "已取消",
	}
	if text, ok := statusMap[status]; ok {
		return text
	}
	return "未知状态"
}