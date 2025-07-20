package services

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"context"
	"errors"
	"fmt"
	"log"
	"regexp"
	"strings"
	"time"
)

// CustomerService provides business logic for customer operations
type CustomerService struct {
	db     database.DB
	logger *log.Logger
}

// NewCustomerService creates a new CustomerService instance
func NewCustomerService(db database.DB, logger *log.Logger) *CustomerService {
	return &CustomerService{
		db:     db,
		logger: logger,
	}
}

// CreateCustomer creates a new customer with business validation
func (s *CustomerService) CreateCustomer(ctx context.Context, req *models.CustomerRequest, userID int) (*models.Customer, error) {
	// Business validation
	if err := s.validateCustomerRequest(req); err != nil {
		return nil, err
	}

	// Check for duplicate email
	if err := s.checkDuplicateEmail(ctx, req.Email, 0); err != nil {
		return nil, err
	}

	// Check for duplicate phone
	if err := s.checkDuplicatePhone(ctx, req.Phone, 0); err != nil {
		return nil, err
	}

	// Create customer model
	customer := &models.Customer{
		Name:          req.Name,
		Company:       req.Company,
		Industry:      req.Industry,
		ContactPerson: req.ContactPerson,
		Email:         req.Email,
		Phone:         req.Phone,
		Address:       req.Address,
		Website:       req.Website,
		Status:        req.Status,
		Priority:      req.Priority,
		ContractValue: req.ContractValue,
		StartDate:     req.StartDate,
		EndDate:       req.EndDate,
		CustomFields:  req.CustomFields,
		CreatedBy:     userID,
	}

	// Set default values
	s.setDefaultValues(customer)

	// Create customer in database
	createdCustomer, err := s.db.Customers().Create(ctx, customer)
	if err != nil {
		s.logger.Printf("Error creating customer: %v", err)
		return nil, fmt.Errorf("failed to create customer: %w", err)
	}

	// Log activity
	s.logCustomerActivity(ctx, userID, "created", createdCustomer.ID, fmt.Sprintf("Customer '%s' was created", createdCustomer.Name))

	// Send notification if high priority customer
	if customer.Priority == "high" {
		s.notifyHighPriorityCustomer(ctx, createdCustomer)
	}

	return createdCustomer, nil
}

// UpdateCustomer updates an existing customer with business validation
func (s *CustomerService) UpdateCustomer(ctx context.Context, id int, req *models.CustomerRequest, userID int) (*models.Customer, error) {
	// Get existing customer
	existingCustomer, err := s.db.Customers().GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("customer not found: %w", err)
	}

	// Business validation
	if err := s.validateCustomerRequest(req); err != nil {
		return nil, err
	}

	// Check for duplicate email (excluding current customer)
	if req.Email != existingCustomer.Email {
		if err := s.checkDuplicateEmail(ctx, req.Email, id); err != nil {
			return nil, err
		}
	}

	// Check for duplicate phone (excluding current customer)
	if req.Phone != existingCustomer.Phone {
		if err := s.checkDuplicatePhone(ctx, req.Phone, id); err != nil {
			return nil, err
		}
	}

	// Track changes for audit
	changes := s.trackCustomerChanges(existingCustomer, req)

	// Update customer fields
	s.updateCustomerFields(existingCustomer, req, userID)

	// Validate business rules
	if err := s.validateBusinessRules(existingCustomer); err != nil {
		return nil, err
	}

	// Update customer in database
	updatedCustomer, err := s.db.Customers().Update(ctx, existingCustomer)
	if err != nil {
		s.logger.Printf("Error updating customer: %v", err)
		return nil, fmt.Errorf("failed to update customer: %w", err)
	}

	// Log activity if there were changes
	if len(changes) > 0 {
		changeDetails := strings.Join(changes, ", ")
		s.logCustomerActivity(ctx, userID, "updated", updatedCustomer.ID, fmt.Sprintf("Customer '%s' was updated: %s", updatedCustomer.Name, changeDetails))
	}

	return updatedCustomer, nil
}

// DeleteCustomer performs soft delete with business validation
func (s *CustomerService) DeleteCustomer(ctx context.Context, id int, userID int) error {
	// Get existing customer
	customer, err := s.db.Customers().GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("customer not found: %w", err)
	}

	// Check if customer can be deleted
	if err := s.validateCustomerDeletion(ctx, customer); err != nil {
		return err
	}

	// Perform soft delete
	if err := s.db.Customers().Delete(ctx, id); err != nil {
		s.logger.Printf("Error deleting customer: %v", err)
		return fmt.Errorf("failed to delete customer: %w", err)
	}

	// Log activity
	s.logCustomerActivity(ctx, userID, "deleted", id, fmt.Sprintf("Customer '%s' was deleted", customer.Name))

	return nil
}

// GetCustomerAnalytics returns comprehensive customer analytics
func (s *CustomerService) GetCustomerAnalytics(ctx context.Context) (*models.CustomerAnalytics, error) {
	stats, err := s.db.Customers().GetStats(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get customer stats: %w", err)
	}

	// Calculate additional metrics
	analytics := &models.CustomerAnalytics{
		Stats: *stats,
		// Add conversion rates, growth trends, etc.
		ConversionRate:     s.calculateConversionRate(stats),
		AverageLifetime:    s.calculateAverageLifetime(ctx),
		TopIndustries:      s.getTopIndustries(stats),
		RecentTrends:       s.calculateRecentTrends(ctx),
		UpcomingRenewals:   s.getUpcomingRenewals(ctx),
		RiskCustomers:      s.identifyRiskCustomers(ctx),
	}

	return analytics, nil
}

// validateCustomerRequest validates the customer request data
func (s *CustomerService) validateCustomerRequest(req *models.CustomerRequest) error {
	// Required fields validation
	if strings.TrimSpace(req.Name) == "" {
		return errors.New("customer name is required")
	}
	if strings.TrimSpace(req.Company) == "" {
		return errors.New("company name is required")
	}
	if strings.TrimSpace(req.Email) == "" {
		return errors.New("email is required")
	}
	if strings.TrimSpace(req.Phone) == "" {
		return errors.New("phone is required")
	}

	// Format validation
	if !s.isValidEmail(req.Email) {
		return errors.New("invalid email format")
	}
	if !s.isValidPhone(req.Phone) {
		return errors.New("invalid phone format")
	}
	if req.Website != "" && !s.isValidURL(req.Website) {
		return errors.New("invalid website URL format")
	}

	// Business validation
	if req.Status != "" && !s.isValidStatus(req.Status) {
		return errors.New("invalid customer status")
	}
	if req.Priority != "" && !s.isValidPriority(req.Priority) {
		return errors.New("invalid customer priority")
	}

	// Date validation
	if req.StartDate != nil && req.EndDate != nil {
		startDate, _ := time.Parse("2006-01-02", *req.StartDate)
		endDate, _ := time.Parse("2006-01-02", *req.EndDate)
		if endDate.Before(startDate) {
			return errors.New("end date cannot be before start date")
		}
	}

	// Contract value validation
	if req.ContractValue != nil && *req.ContractValue < 0 {
		return errors.New("contract value cannot be negative")
	}

	return nil
}

// checkDuplicateEmail checks for duplicate email addresses
func (s *CustomerService) checkDuplicateEmail(ctx context.Context, email string, excludeID int) error {
	// Implementation would check database for existing email
	// For now, return nil (assume no duplicates)
	return nil
}

// checkDuplicatePhone checks for duplicate phone numbers
func (s *CustomerService) checkDuplicatePhone(ctx context.Context, phone string, excludeID int) error {
	// Implementation would check database for existing phone
	// For now, return nil (assume no duplicates)
	return nil
}

// setDefaultValues sets default values for customer fields
func (s *CustomerService) setDefaultValues(customer *models.Customer) {
	if customer.Status == "" {
		customer.Status = "potential"
	}
	if customer.Priority == "" {
		customer.Priority = "medium"
	}
	if customer.CustomFields == nil {
		customer.CustomFields = make(models.CustomFields)
	}
}

// validateBusinessRules validates business-specific rules
func (s *CustomerService) validateBusinessRules(customer *models.Customer) error {
	// Rule: High priority customers must have contract value
	if customer.Priority == "high" && (customer.ContractValue == nil || *customer.ContractValue == 0) {
		return errors.New("high priority customers must have a contract value")
	}

	// Rule: Active customers must have start date
	if customer.Status == "active" && customer.StartDate == nil {
		return errors.New("active customers must have a start date")
	}

	// Rule: Closed customers must have end date
	if customer.Status == "closed" && customer.EndDate == nil {
		return errors.New("closed customers must have an end date")
	}

	return nil
}

// validateCustomerDeletion validates if customer can be deleted
func (s *CustomerService) validateCustomerDeletion(ctx context.Context, customer *models.Customer) error {
	// Rule: Cannot delete active customers with ongoing contracts
	if customer.Status == "active" && customer.EndDate != nil {
		endDate, _ := time.Parse("2006-01-02", *customer.EndDate)
		if endDate.After(time.Now()) {
			return errors.New("cannot delete customer with ongoing contract")
		}
	}

	// Rule: Cannot delete customers with high contract value without confirmation
	if customer.ContractValue != nil && *customer.ContractValue > 1000000 {
		return errors.New("cannot delete high-value customer without special approval")
	}

	return nil
}

// trackCustomerChanges tracks changes between old and new customer data
func (s *CustomerService) trackCustomerChanges(old *models.Customer, req *models.CustomerRequest) []string {
	var changes []string

	if req.Name != "" && req.Name != old.Name {
		changes = append(changes, fmt.Sprintf("name changed from '%s' to '%s'", old.Name, req.Name))
	}
	if req.Status != "" && req.Status != old.Status {
		changes = append(changes, fmt.Sprintf("status changed from '%s' to '%s'", old.Status, req.Status))
	}
	if req.Priority != "" && req.Priority != old.Priority {
		changes = append(changes, fmt.Sprintf("priority changed from '%s' to '%s'", old.Priority, req.Priority))
	}
	if req.Email != "" && req.Email != old.Email {
		changes = append(changes, "email updated")
	}
	if req.Phone != "" && req.Phone != old.Phone {
		changes = append(changes, "phone updated")
	}

	return changes
}

// updateCustomerFields updates customer fields from request
func (s *CustomerService) updateCustomerFields(customer *models.Customer, req *models.CustomerRequest, userID int) {
	if req.Name != "" {
		customer.Name = req.Name
	}
	if req.Company != "" {
		customer.Company = req.Company
	}
	if req.Industry != "" {
		customer.Industry = req.Industry
	}
	if req.ContactPerson != "" {
		customer.ContactPerson = req.ContactPerson
	}
	if req.Email != "" {
		customer.Email = req.Email
	}
	if req.Phone != "" {
		customer.Phone = req.Phone
	}
	if req.Address != "" {
		customer.Address = req.Address
	}
	if req.Website != "" {
		customer.Website = req.Website
	}
	if req.Status != "" {
		customer.Status = req.Status
	}
	if req.Priority != "" {
		customer.Priority = req.Priority
	}
	if req.ContractValue != nil {
		customer.ContractValue = req.ContractValue
	}
	if req.StartDate != nil {
		customer.StartDate = req.StartDate
	}
	if req.EndDate != nil {
		customer.EndDate = req.EndDate
	}
	if req.CustomFields != nil {
		customer.CustomFields = req.CustomFields
	}

	customer.UpdatedBy = &userID
}

// Validation helper functions
func (s *CustomerService) isValidEmail(email string) bool {
	emailRegex := regexp.MustCompile(`^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$`)
	return emailRegex.MatchString(strings.ToLower(email))
}

func (s *CustomerService) isValidPhone(phone string) bool {
	// Chinese mobile phone validation
	phoneRegex := regexp.MustCompile(`^1[3-9]\d{9}$`)
	cleaned := regexp.MustCompile(`\D`).ReplaceAllString(phone, "")
	return phoneRegex.MatchString(cleaned)
}

func (s *CustomerService) isValidURL(url string) bool {
	urlRegex := regexp.MustCompile(`^https?://[^\s/$.?#].[^\s]*$`)
	return urlRegex.MatchString(url)
}

func (s *CustomerService) isValidStatus(status string) bool {
	validStatuses := []string{"active", "inactive", "potential", "closed"}
	for _, v := range validStatuses {
		if v == status {
			return true
		}
	}
	return false
}

func (s *CustomerService) isValidPriority(priority string) bool {
	validPriorities := []string{"high", "medium", "low"}
	for _, v := range validPriorities {
		if v == priority {
			return true
		}
	}
	return false
}

// Business intelligence functions
func (s *CustomerService) calculateConversionRate(stats *models.CustomerStats) float64 {
	if stats.TotalCustomers == 0 {
		return 0
	}
	return float64(stats.ActiveCustomers) / float64(stats.TotalCustomers) * 100
}

func (s *CustomerService) calculateAverageLifetime(ctx context.Context) float64 {
	// Implementation would calculate average customer lifetime
	return 0
}

func (s *CustomerService) getTopIndustries(stats *models.CustomerStats) []models.IndustryStats {
	// Return top industries from stats
	return stats.ByIndustry
}

func (s *CustomerService) calculateRecentTrends(ctx context.Context) *models.CustomerTrends {
	// Implementation would calculate trends
	return &models.CustomerTrends{}
}

func (s *CustomerService) getUpcomingRenewals(ctx context.Context) []models.CustomerRenewal {
	// Implementation would get upcoming renewals
	return []models.CustomerRenewal{}
}

func (s *CustomerService) identifyRiskCustomers(ctx context.Context) []models.RiskCustomer {
	// Implementation would identify at-risk customers
	return []models.RiskCustomer{}
}

// Activity logging
func (s *CustomerService) logCustomerActivity(ctx context.Context, userID int, action string, customerID int, description string) {
	// Log customer activity for audit trail
	s.logger.Printf("Customer Activity: User %d %s customer %d - %s", userID, action, customerID, description)
}

// Notification functions
func (s *CustomerService) notifyHighPriorityCustomer(ctx context.Context, customer *models.Customer) {
	// Send notification for high priority customer creation
	s.logger.Printf("High priority customer created: %s (%s)", customer.Name, customer.Company)
}