package handlers

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"bytes"
	"context"
	"encoding/json"
	"log"
	"net/http"
	"net/http/httptest"
	"os"
	"strconv"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockCustomerRepository is a mock implementation of CustomerRepository
type MockCustomerRepository struct {
	mock.Mock
}

func (m *MockCustomerRepository) Create(ctx context.Context, customer *models.Customer) (*models.Customer, error) {
	args := m.Called(ctx, customer)
	return args.Get(0).(*models.Customer), args.Error(1)
}

func (m *MockCustomerRepository) GetByID(ctx context.Context, id int) (*models.Customer, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Customer), args.Error(1)
}

func (m *MockCustomerRepository) Update(ctx context.Context, customer *models.Customer) (*models.Customer, error) {
	args := m.Called(ctx, customer)
	return args.Get(0).(*models.Customer), args.Error(1)
}

func (m *MockCustomerRepository) Delete(ctx context.Context, id int) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockCustomerRepository) List(ctx context.Context, limit, offset int, filter models.CustomerFilter) ([]*models.Customer, int, error) {
	args := m.Called(ctx, limit, offset, filter)
	return args.Get(0).([]*models.Customer), args.Int(1), args.Error(2)
}

func (m *MockCustomerRepository) GetStats(ctx context.Context) (*models.CustomerStats, error) {
	args := m.Called(ctx)
	return args.Get(0).(*models.CustomerStats), args.Error(1)
}

func (m *MockCustomerRepository) AssociateUser(ctx context.Context, customerID, userID int, role string, permissions []string) error {
	args := m.Called(ctx, customerID, userID, role, permissions)
	return args.Error(0)
}

func (m *MockCustomerRepository) DisassociateUser(ctx context.Context, customerID, userID int) error {
	args := m.Called(ctx, customerID, userID)
	return args.Error(0)
}

func (m *MockCustomerRepository) CreateContact(ctx context.Context, contact *models.CustomerContact) (*models.CustomerContact, error) {
	args := m.Called(ctx, contact)
	return args.Get(0).(*models.CustomerContact), args.Error(1)
}

func (m *MockCustomerRepository) GetContacts(ctx context.Context, customerID, limit, offset int) ([]*models.CustomerContact, int, error) {
	args := m.Called(ctx, customerID, limit, offset)
	return args.Get(0).([]*models.CustomerContact), args.Int(1), args.Error(2)
}

// MockDB is a mock implementation of the DB interface
type MockDB struct {
	mock.Mock
	customerRepo *MockCustomerRepository
}

func (m *MockDB) Customers() database.CustomerRepository {
	return m.customerRepo
}

func (m *MockDB) Users() database.UserRepository     { return nil }
func (m *MockDB) Projects() database.ProjectRepository { return nil }
func (m *MockDB) Tasks() database.TaskRepository     { return nil }
func (m *MockDB) System() database.SystemRepository  { return nil }
func (m *MockDB) Begin(ctx context.Context) (database.Tx, error) { return nil, nil }
func (m *MockDB) Ping() error                        { return nil }
func (m *MockDB) Close() error                       { return nil }

func setupTestHandler() (*CustomerHandler, *MockDB, *MockCustomerRepository) {
	mockCustomerRepo := &MockCustomerRepository{}
	mockDB := &MockDB{
		customerRepo: mockCustomerRepo,
	}
	
	logger := log.New(os.Stdout, "[TEST] ", log.LstdFlags)
	validator := validator.New()
	
	handler := NewCustomerHandler(mockDB, logger, validator)
	
	return handler, mockDB, mockCustomerRepo
}

func setupTestRouter(handler *CustomerHandler) *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	
	v1 := router.Group("/api/v1")
	customers := v1.Group("/customers")
	{
		customers.GET("", handler.GetCustomers)
		customers.POST("", handler.CreateCustomer)
		customers.GET("/stats", handler.GetCustomerStats)
		customers.GET("/:id", handler.GetCustomer)
		customers.PUT("/:id", handler.UpdateCustomer)
		customers.DELETE("/:id", handler.DeleteCustomer)
		customers.POST("/:id/users", handler.AddCustomerUser)
		customers.DELETE("/:id/users/:userId", handler.RemoveCustomerUser)
		customers.GET("/:id/contacts", handler.GetCustomerContacts)
		customers.POST("/:id/contacts", handler.CreateContact)
	}
	
	return router
}

func TestCreateCustomer(t *testing.T) {
	handler, _, mockRepo := setupTestHandler()
	router := setupTestRouter(handler)

	t.Run("Success", func(t *testing.T) {
		// Create test customer request
		customerReq := models.CustomerRequest{
			Name:          "Test Customer",
			Company:       "Test Company",
			Industry:      "Technology",
			ContactPerson: "John Doe",
			Email:         "john@test.com",
			Phone:         "13800138000",
			Address:       "Test Address",
			Status:        "potential",
			Priority:      "medium",
		}

		// Expected created customer
		createdCustomer := &models.Customer{
			ID:            1,
			Name:          customerReq.Name,
			Company:       customerReq.Company,
			Industry:      customerReq.Industry,
			ContactPerson: customerReq.ContactPerson,
			Email:         customerReq.Email,
			Phone:         customerReq.Phone,
			Address:       customerReq.Address,
			Status:        customerReq.Status,
			Priority:      customerReq.Priority,
			CreatedBy:     1,
		}

		// Mock repository call
		mockRepo.On("Create", mock.Anything, mock.AnythingOfType("*models.Customer")).Return(createdCustomer, nil)

		// Create request
		reqBody, _ := json.Marshal(customerReq)
		req, _ := http.NewRequest("POST", "/api/v1/customers", bytes.NewBuffer(reqBody))
		req.Header.Set("Content-Type", "application/json")

		// Perform request
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		// Assertions
		assert.Equal(t, http.StatusCreated, w.Code)

		var response models.ApiResponse[models.CustomerResponse]
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.True(t, response.Success)
		assert.Equal(t, "Customer created successfully", response.Message)
		assert.Equal(t, createdCustomer.Name, response.Data.Name)
		assert.Equal(t, createdCustomer.Company, response.Data.Company)

		mockRepo.AssertExpectations(t)
	})

	t.Run("Invalid Request", func(t *testing.T) {
		// Create invalid request (missing required fields)
		customerReq := models.CustomerRequest{
			Name: "Test Customer",
			// Missing required fields
		}

		reqBody, _ := json.Marshal(customerReq)
		req, _ := http.NewRequest("POST", "/api/v1/customers", bytes.NewBuffer(reqBody))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)

		var response models.ApiResponse[interface{}]
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.False(t, response.Success)
		assert.Contains(t, response.Message, "Validation failed")
	})
}

func TestGetCustomer(t *testing.T) {
	handler, _, mockRepo := setupTestHandler()
	router := setupTestRouter(handler)

	t.Run("Success", func(t *testing.T) {
		customerID := 1
		customer := &models.Customer{
			ID:            customerID,
			Name:          "Test Customer",
			Company:       "Test Company",
			Industry:      "Technology",
			ContactPerson: "John Doe",
			Email:         "john@test.com",
			Phone:         "13800138000",
			Address:       "Test Address",
			Status:        "active",
			Priority:      "high",
			CreatedBy:     1,
		}

		mockRepo.On("GetByID", mock.Anything, customerID).Return(customer, nil)

		req, _ := http.NewRequest("GET", "/api/v1/customers/"+strconv.Itoa(customerID), nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response models.ApiResponse[models.CustomerResponse]
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.True(t, response.Success)
		assert.Equal(t, customer.Name, response.Data.Name)
		assert.Equal(t, customer.Company, response.Data.Company)

		mockRepo.AssertExpectations(t)
	})

	t.Run("Customer Not Found", func(t *testing.T) {
		customerID := 999
		mockRepo.On("GetByID", mock.Anything, customerID).Return(nil, assert.AnError)

		req, _ := http.NewRequest("GET", "/api/v1/customers/"+strconv.Itoa(customerID), nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusInternalServerError, w.Code)

		mockRepo.AssertExpectations(t)
	})

	t.Run("Invalid Customer ID", func(t *testing.T) {
		req, _ := http.NewRequest("GET", "/api/v1/customers/invalid", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)

		var response models.ApiResponse[interface{}]
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.False(t, response.Success)
		assert.Equal(t, "Invalid customer ID", response.Message)
	})
}

func TestUpdateCustomer(t *testing.T) {
	handler, _, mockRepo := setupTestHandler()
	router := setupTestRouter(handler)

	t.Run("Success", func(t *testing.T) {
		customerID := 1
		existingCustomer := &models.Customer{
			ID:            customerID,
			Name:          "Old Name",
			Company:       "Old Company",
			Industry:      "Technology",
			ContactPerson: "John Doe",
			Email:         "john@test.com",
			Phone:         "13800138000",
			Address:       "Test Address",
			Status:        "potential",
			Priority:      "medium",
			CreatedBy:     1,
		}

		updateReq := models.CustomerRequest{
			Name:          "Updated Name",
			Company:       "Updated Company",
			Industry:      "Technology",
			ContactPerson: "John Doe",
			Email:         "john@test.com",
			Phone:         "13800138000",
			Address:       "Test Address",
			Status:        "active",
			Priority:      "high",
		}

		updatedCustomer := &models.Customer{
			ID:            customerID,
			Name:          updateReq.Name,
			Company:       updateReq.Company,
			Industry:      updateReq.Industry,
			ContactPerson: updateReq.ContactPerson,
			Email:         updateReq.Email,
			Phone:         updateReq.Phone,
			Address:       updateReq.Address,
			Status:        updateReq.Status,
			Priority:      updateReq.Priority,
			CreatedBy:     1,
			UpdatedBy:     &[]int{1}[0],
		}

		mockRepo.On("GetByID", mock.Anything, customerID).Return(existingCustomer, nil)
		mockRepo.On("Update", mock.Anything, mock.AnythingOfType("*models.Customer")).Return(updatedCustomer, nil)

		reqBody, _ := json.Marshal(updateReq)
		req, _ := http.NewRequest("PUT", "/api/v1/customers/"+strconv.Itoa(customerID), bytes.NewBuffer(reqBody))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response models.ApiResponse[models.CustomerResponse]
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.True(t, response.Success)
		assert.Equal(t, updateReq.Name, response.Data.Name)
		assert.Equal(t, updateReq.Status, response.Data.Status)

		mockRepo.AssertExpectations(t)
	})
}

func TestDeleteCustomer(t *testing.T) {
	handler, _, mockRepo := setupTestHandler()
	router := setupTestRouter(handler)

	t.Run("Success", func(t *testing.T) {
		customerID := 1

		mockRepo.On("Delete", mock.Anything, customerID).Return(nil)

		req, _ := http.NewRequest("DELETE", "/api/v1/customers/"+strconv.Itoa(customerID), nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response models.ApiResponse[interface{}]
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.True(t, response.Success)
		assert.Equal(t, "Customer deleted successfully", response.Message)

		mockRepo.AssertExpectations(t)
	})

	t.Run("Customer Not Found", func(t *testing.T) {
		customerID := 999

		mockRepo.On("Delete", mock.Anything, customerID).Return(assert.AnError)

		req, _ := http.NewRequest("DELETE", "/api/v1/customers/"+strconv.Itoa(customerID), nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusInternalServerError, w.Code)

		mockRepo.AssertExpectations(t)
	})
}

func TestGetCustomers(t *testing.T) {
	handler, _, mockRepo := setupTestHandler()
	router := setupTestRouter(handler)

	t.Run("Success", func(t *testing.T) {
		customers := []*models.Customer{
			{
				ID:            1,
				Name:          "Customer 1",
				Company:       "Company 1",
				Industry:      "Technology",
				ContactPerson: "Person 1",
				Email:         "person1@test.com",
				Phone:         "13800138001",
				Address:       "Address 1",
				Status:        "active",
				Priority:      "high",
				CreatedBy:     1,
			},
			{
				ID:            2,
				Name:          "Customer 2",
				Company:       "Company 2",
				Industry:      "Finance",
				ContactPerson: "Person 2",
				Email:         "person2@test.com",
				Phone:         "13800138002",
				Address:       "Address 2",
				Status:        "potential",
				Priority:      "medium",
				CreatedBy:     1,
			},
		}

		mockRepo.On("List", mock.Anything, 20, 0, mock.AnythingOfType("models.CustomerFilter")).Return(customers, 2, nil)

		req, _ := http.NewRequest("GET", "/api/v1/customers?page=1&pageSize=20", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response models.ApiResponse[models.PaginatedResponse[[]models.CustomerResponse]]
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.True(t, response.Success)
		assert.Len(t, response.Data.Data, 2)
		assert.Equal(t, int64(2), response.Data.Pagination.Total)

		mockRepo.AssertExpectations(t)
	})
}

func TestGetCustomerStats(t *testing.T) {
	handler, _, mockRepo := setupTestHandler()
	router := setupTestRouter(handler)

	t.Run("Success", func(t *testing.T) {
		stats := &models.CustomerStats{
			TotalCustomers:     10,
			ActiveCustomers:    7,
			InactiveCustomers:  2,
			PotentialCustomers: 1,
			ClosedCustomers:    0,
			TotalContractValue: 1000000.0,
			AverageContractValue: 100000.0,
		}

		mockRepo.On("GetStats", mock.Anything).Return(stats, nil)

		req, _ := http.NewRequest("GET", "/api/v1/customers/stats", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response models.ApiResponse[models.CustomerStats]
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.True(t, response.Success)
		assert.Equal(t, stats.TotalCustomers, response.Data.TotalCustomers)
		assert.Equal(t, stats.ActiveCustomers, response.Data.ActiveCustomers)

		mockRepo.AssertExpectations(t)
	})
}