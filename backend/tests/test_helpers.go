package tests

import (
	"ai-project-backend/application"
	"ai-project-backend/database"
	"ai-project-backend/models"
	"ai-project-backend/routes"
	"bytes"
	"context"
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
	ID               int
	Username         string
	Role             string
	UserType         string
	EnterpriseID     *int
	EnterpriseUserID *int
	AccessToken      string
	RefreshToken     string
}

// SetupTestApp initializes a test application instance
func SetupTestApp(t *testing.T) *TestApp {
	// Set Gin to test mode
	gin.SetMode(gin.TestMode)

	// Initialize application (it loads config and DB internally)
	app, err := application.NewApplication()
	if err != nil {
		t.Fatalf("Failed to initialize test application: %v", err)
	}

	// Get DB from app
	db := app.GetDB()
	if db == nil {
		t.Fatal("Failed to get database connection")
	}

	// Setup router using the routes package
	router := routes.SetupRouter(app)

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
	ctx := context.Background()

	// Create system user in database
	user := &models.User{
		Username:     username,
		PasswordHash: "test_password_hash",
		Email:        fmt.Sprintf("%s@test.com", username),
		Role:         "admin",
		UserType:     "system",
		Status:       "active",
	}

	createdUser, err := testApp.DB.Users().Create(ctx, user)
	assert.NoError(t, err, "Failed to create test system user")

	// Get JWT manager from app
	jwtManager := testApp.App.GetJWTManager()
	if jwtManager == nil {
		t.Fatal("Failed to get JWT manager")
	}

	// Generate JWT token
	accessToken, err := jwtManager.GenerateToken(
		createdUser.ID,
		createdUser.Username,
		createdUser.Role,
		createdUser.Role, // roleV2
		createdUser.UserType,
		nil, // no enterprise_user_id for system users
		nil, // no enterprise_id for system users
	)
	assert.NoError(t, err, "Failed to generate token for test system user")

	return &TestUser{
		ID:           createdUser.ID,
		Username:     createdUser.Username,
		Role:         createdUser.Role,
		UserType:     createdUser.UserType,
		AccessToken:  accessToken,
		RefreshToken: "", // Not needed for tests
	}
}

// CreateTestEnterpriseUser creates an enterprise user for testing
func CreateTestEnterpriseUser(t *testing.T, testApp *TestApp, username string, enterpriseID int) *TestUser {
	ctx := context.Background()

	// Create enterprise user in database
	user := &models.User{
		Username:     username,
		PasswordHash: "test_password_hash",
		Email:        fmt.Sprintf("%s@enterprise.test.com", username),
		Role:         "enterprise_user",
		UserType:     "company", // Changed from "enterprise" to "company" to match model validation
		Status:       "active",
	}

	createdUser, err := testApp.DB.Users().Create(ctx, user)
	assert.NoError(t, err, "Failed to create test enterprise user")

	// Create enterprise_users association
	enterpriseUserID := 0
	query := `
		INSERT INTO enterprise_users (enterprise_id, user_id, role, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, NOW(), NOW())
		RETURNING id
	`
	err = testApp.DB.QueryRow(query, enterpriseID, createdUser.ID, "member", "active").Scan(&enterpriseUserID)
	assert.NoError(t, err, "Failed to create enterprise_users association")

	// Get JWT manager from app
	jwtManager := testApp.App.GetJWTManager()
	if jwtManager == nil {
		t.Fatal("Failed to get JWT manager")
	}

	// Generate JWT token with enterprise context
	accessToken, err := jwtManager.GenerateToken(
		createdUser.ID,
		createdUser.Username,
		createdUser.Role,
		createdUser.Role, // roleV2
		createdUser.UserType,
		&enterpriseUserID,
		&enterpriseID,
	)
	assert.NoError(t, err, "Failed to generate token for test enterprise user")

	return &TestUser{
		ID:               createdUser.ID,
		Username:         createdUser.Username,
		Role:             createdUser.Role,
		UserType:         createdUser.UserType,
		EnterpriseID:     &enterpriseID,
		EnterpriseUserID: &enterpriseUserID,
		AccessToken:      accessToken,
		RefreshToken:     "", // Not needed for tests
	}
}

// CreateTestEnterprise creates a test enterprise
func CreateTestEnterprise(t *testing.T, testApp *TestApp, name string) *models.Enterprise {
	desc := fmt.Sprintf("Test enterprise: %s", name)
	enterprise := &models.Enterprise{
		Name:        name,
		Description: &desc,
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
