package tests

import (
	"ai-project-backend/application"
	"ai-project-backend/config"
	"ai-project-backend/database"
	"ai-project-backend/models"
	"ai-project-backend/services"
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

// TestApp wraps the application for testing
type TestApp struct {
	App    *application.Application
	Router *gin.Engine
	DB     database.DB
}

// TestUser represents a test user with tokens
type TestUser struct {
	ID                int
	Username          string
	Role              string
	UserType          string
	EnterpriseID      *int
	EnterpriseUserID  *int
	AccessToken       string
	RefreshToken      string
}

// SetupTestApp initializes a test application instance
func SetupTestApp(t *testing.T) *TestApp {
	// Set Gin to test mode
	gin.SetMode(gin.TestMode)

	// Load test configuration
	cfg := config.LoadConfig()
	cfg.AppEnv = "test"

	// Initialize database connection
	db, err := database.New(cfg)
	if err != nil {
		t.Fatalf("Failed to initialize test database: %v", err)
	}

	// Initialize application
	app := application.NewApplication(db, cfg)
	if app == nil {
		t.Fatal("Failed to create application instance")
	}

	// Setup router
	router := app.SetupRouter()

	return &TestApp{
		App:    app,
		Router: router,
		DB:     db,
	}
}

// TeardownTestApp cleans up test resources
func TeardownTestApp(t *testing.T, testApp *TestApp) {
	if testApp.DB != nil {
		// Clean up test data if needed
		// testApp.DB.Exec("TRUNCATE TABLE ...")
	}
}

// CreateTestSystemUser creates a system user for testing
func CreateTestSystemUser(t *testing.T, testApp *TestApp, username string) *TestUser {
	// Create system user in database
	user := &models.User{
		Username: username,
		Password: "test_password_hash",
		Email:    fmt.Sprintf("%s@test.com", username),
		Role:     "admin",
		UserType: "system",
		Status:   "active",
	}

	err := testApp.DB.Users().Create(user)
	assert.NoError(t, err, "Failed to create test system user")

	// Generate JWT token
	tokenService := services.NewJWTTokenService(testApp.App.GetConfig())
	tokenPair, err := tokenService.GenerateTokenPair(
		user.ID,
		user.Username,
		user.Role,
		user.UserType,
		nil, // no enterprise_user_id for system users
		nil, // no enterprise_id for system users
	)
	assert.NoError(t, err, "Failed to generate token for test system user")

	return &TestUser{
		ID:           user.ID,
		Username:     user.Username,
		Role:         user.Role,
		UserType:     user.UserType,
		AccessToken:  tokenPair.AccessToken,
		RefreshToken: tokenPair.RefreshToken,
	}
}

// CreateTestEnterpriseUser creates an enterprise user for testing
func CreateTestEnterpriseUser(t *testing.T, testApp *TestApp, username string, enterpriseID int) *TestUser {
	// Create enterprise user in database
	user := &models.User{
		Username: username,
		Password: "test_password_hash",
		Email:    fmt.Sprintf("%s@enterprise.test.com", username),
		Role:     "enterprise_user",
		UserType: "enterprise",
		Status:   "active",
	}

	err := testApp.DB.Users().Create(user)
	assert.NoError(t, err, "Failed to create test enterprise user")

	// Create enterprise_users association
	enterpriseUserID := 0
	query := `
		INSERT INTO enterprise_users (enterprise_id, user_id, role, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, NOW(), NOW())
		RETURNING id
	`
	err = testApp.DB.QueryRow(query, enterpriseID, user.ID, "member", "active").Scan(&enterpriseUserID)
	assert.NoError(t, err, "Failed to create enterprise_users association")

	// Generate JWT token with enterprise context
	tokenService := services.NewJWTTokenService(testApp.App.GetConfig())
	tokenPair, err := tokenService.GenerateTokenPair(
		user.ID,
		user.Username,
		user.Role,
		user.UserType,
		&enterpriseUserID,
		&enterpriseID,
	)
	assert.NoError(t, err, "Failed to generate token for test enterprise user")

	return &TestUser{
		ID:               user.ID,
		Username:         user.Username,
		Role:             user.Role,
		UserType:         user.UserType,
		EnterpriseID:     &enterpriseID,
		EnterpriseUserID: &enterpriseUserID,
		AccessToken:      tokenPair.AccessToken,
		RefreshToken:     tokenPair.RefreshToken,
	}
}

// CreateTestEnterprise creates a test enterprise
func CreateTestEnterprise(t *testing.T, testApp *TestApp, name string) *models.Enterprise {
	enterprise := &models.Enterprise{
		Name:        name,
		Description: fmt.Sprintf("Test enterprise: %s", name),
		Status:      "active",
	}

	query := `
		INSERT INTO enterprises (name, description, status, created_at, updated_at)
		VALUES ($1, $2, $3, NOW(), NOW())
		RETURNING id, created_at, updated_at
	`
	err := testApp.DB.QueryRow(query, enterprise.Name, enterprise.Description, enterprise.Status).
		Scan(&enterprise.ID, &enterprise.CreatedAt, &enterprise.UpdatedAt)
	assert.NoError(t, err, "Failed to create test enterprise")

	return enterprise
}

// MakeAuthenticatedRequest makes an HTTP request with authentication
func MakeAuthenticatedRequest(
	t *testing.T,
	testApp *TestApp,
	method string,
	path string,
	body interface{},
	user *TestUser,
) *httptest.ResponseRecorder {
	var reqBody []byte
	var err error

	if body != nil {
		reqBody, err = json.Marshal(body)
		assert.NoError(t, err, "Failed to marshal request body")
	}

	req, err := http.NewRequest(method, path, bytes.NewBuffer(reqBody))
	assert.NoError(t, err, "Failed to create HTTP request")

	req.Header.Set("Content-Type", "application/json")
	if user != nil {
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", user.AccessToken))
	}

	w := httptest.NewRecorder()
	testApp.Router.ServeHTTP(w, req)

	return w
}

// AssertJSONResponse asserts the JSON response structure
func AssertJSONResponse(t *testing.T, w *httptest.ResponseRecorder, expectedStatus int) map[string]interface{} {
	assert.Equal(t, expectedStatus, w.Code, "Unexpected status code")

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err, "Failed to parse JSON response")

	return response
}

// AssertSuccessResponse asserts a successful API response
func AssertSuccessResponse(t *testing.T, w *httptest.ResponseRecorder) map[string]interface{} {
	response := AssertJSONResponse(t, w, http.StatusOK)
	assert.True(t, response["success"].(bool), "Expected success=true")
	return response
}

// AssertErrorResponse asserts an error API response
func AssertErrorResponse(t *testing.T, w *httptest.ResponseRecorder, expectedStatus int, expectedErrorCode string) {
	response := AssertJSONResponse(t, w, expectedStatus)
	assert.False(t, response["success"].(bool), "Expected success=false")

	error := response["error"].(map[string]interface{})
	if expectedErrorCode != "" {
		assert.Equal(t, expectedErrorCode, error["code"], "Unexpected error code")
	}
}

// CleanupTestData removes test data from database
func CleanupTestData(t *testing.T, testApp *TestApp, userIDs []int, enterpriseIDs []int) {
	// Delete test users
	if len(userIDs) > 0 {
		_, err := testApp.DB.Exec("DELETE FROM users WHERE id = ANY($1)", userIDs)
		assert.NoError(t, err, "Failed to cleanup test users")
	}

	// Delete test enterprises
	if len(enterpriseIDs) > 0 {
		_, err := testApp.DB.Exec("DELETE FROM enterprises WHERE id = ANY($1)", enterpriseIDs)
		assert.NoError(t, err, "Failed to cleanup test enterprises")
	}
}
