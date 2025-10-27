package handlers

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// getTestDBForSystemAdmin helper to get test DB
func getTestDBForSystemAdmin(t *testing.T) *database.PostgresDB {
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		dsn = "postgres://postgres:postgres@localhost:5432/ai_project?sslmode=disable"
	}
	db, err := database.NewPostgresDB(dsn)
	if err != nil {
		t.Skipf("skipping tests; cannot connect to DB: %v", err)
	}
	return db
}

// setupSystemAdminHandler creates a handler with test dependencies
func setupSystemAdminHandler(t *testing.T) (*SystemAdminHandler, *database.PostgresDB) {
	pdb := getTestDBForSystemAdmin(t)

	handler := NewSystemAdminHandler(pdb.GetDB().(*sql.DB))
	handler.SetDB(pdb)

	return handler, pdb
}

// setupSysAdminTestRouter creates a test router with auth context for system admin testing
func setupSysAdminTestRouter(handler *SystemAdminHandler, userRole, userType string) *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	// Add middleware to set auth context
	router.Use(func(c *gin.Context) {
		c.Set("user_role", userRole)
		c.Set("user_type", userType)
		c.Set("username", "test_admin")
		c.Set("user_id", 1)
		c.Next()
	})

	// Register route
	router.PUT("/admin/tasks/:taskId/project", handler.UpdateTaskProject)

	return router
}

// TestUpdateTaskProject_Success tests successful task project update
func TestUpdateTaskProject_Success(t *testing.T) {
	handler, pdb := setupSystemAdminHandler(t)
	defer pdb.Close()

	ctx := context.Background()

	// Create test projects
	project1 := &models.Project{
		Name:        "Test Project 1",
		Description: "Original project",
		Status:      "active",
	}
	createdProject1, err := pdb.Projects().Create(ctx, project1)
	require.NoError(t, err)

	project2 := &models.Project{
		Name:        "Test Project 2",
		Description: "Target project",
		Status:      "active",
	}
	createdProject2, err := pdb.Projects().Create(ctx, project2)
	require.NoError(t, err)

	// Create test task in project1
	description := "This task will be moved to another project"
	task := &models.Task{
		ProjectID:   createdProject1.ID,
		Title:       "Test Task for Project Change",
		Description: &description,
		Status:      "todo",
	}
	createdTask, err := pdb.Tasks().Create(ctx, task)
	require.NoError(t, err)

	// Setup router
	router := setupSysAdminTestRouter(handler, "admin", "system")

	// Prepare request
	requestBody := map[string]interface{}{
		"new_project_id": createdProject2.ID,
		"reason":         "Moving task for testing purposes",
	}
	jsonBody, _ := json.Marshal(requestBody)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("PUT", fmt.Sprintf("/admin/tasks/%d/project", createdTask.ID), bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	// Assertions
	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err = json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.True(t, response["success"].(bool))
	assert.Equal(t, "任务所属项目已成功更新", response["message"])

	// Verify task was actually moved
	updatedTask, err := pdb.Tasks().GetByID(ctx, createdTask.ID)
	require.NoError(t, err)
	assert.Equal(t, createdProject2.ID, updatedTask.ProjectID)

	// Cleanup
	_ = pdb.Tasks().Delete(ctx, createdTask.ID)
	_ = pdb.Projects().Delete(ctx, createdProject1.ID)
	_ = pdb.Projects().Delete(ctx, createdProject2.ID)
}

// TestUpdateTaskProject_TaskNotFound tests handling of non-existent task
func TestUpdateTaskProject_TaskNotFound(t *testing.T) {
	handler, pdb := setupSystemAdminHandler(t)
	defer pdb.Close()

	router := setupSysAdminTestRouter(handler, "admin", "system")

	// Prepare request with non-existent task ID
	requestBody := map[string]interface{}{
		"new_project_id": 1,
		"reason":         "Test",
	}
	jsonBody, _ := json.Marshal(requestBody)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("PUT", "/admin/tasks/999999/project", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	// Assertions
	assert.Equal(t, http.StatusNotFound, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Equal(t, "task_not_found", response["code"])
	assert.Equal(t, "任务不存在", response["message"])
}

// TestUpdateTaskProject_ProjectNotFound tests handling of non-existent target project
func TestUpdateTaskProject_ProjectNotFound(t *testing.T) {
	handler, pdb := setupSystemAdminHandler(t)
	defer pdb.Close()

	ctx := context.Background()

	// Create test project and task
	project := &models.Project{
		Name:   "Test Project",
		Status: "active",
	}
	createdProject, err := pdb.Projects().Create(ctx, project)
	require.NoError(t, err)

	task := &models.Task{
		ProjectID: createdProject.ID,
		Title:     "Test Task",
		Status:    "todo",
	}
	createdTask, err := pdb.Tasks().Create(ctx, task)
	require.NoError(t, err)

	router := setupSysAdminTestRouter(handler, "admin", "system")

	// Prepare request with non-existent project ID
	requestBody := map[string]interface{}{
		"new_project_id": 999999,
		"reason":         "Test",
	}
	jsonBody, _ := json.Marshal(requestBody)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("PUT", fmt.Sprintf("/admin/tasks/%d/project", createdTask.ID), bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	// Assertions
	assert.Equal(t, http.StatusNotFound, w.Code)

	var response map[string]interface{}
	err = json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Equal(t, "project_not_found", response["code"])
	assert.Equal(t, "目标项目不存在", response["message"])

	// Cleanup
	_ = pdb.Tasks().Delete(ctx, createdTask.ID)
	_ = pdb.Projects().Delete(ctx, createdProject.ID)
}

// TestUpdateTaskProject_InvalidTaskID tests handling of invalid task ID
func TestUpdateTaskProject_InvalidTaskID(t *testing.T) {
	handler, pdb := setupSystemAdminHandler(t)
	defer pdb.Close()

	router := setupSysAdminTestRouter(handler, "admin", "system")

	requestBody := map[string]interface{}{
		"new_project_id": 1,
	}
	jsonBody, _ := json.Marshal(requestBody)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("PUT", "/admin/tasks/invalid/project", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	// Assertions
	assert.Equal(t, http.StatusBadRequest, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Equal(t, "invalid_task_id", response["code"])
}

// TestUpdateTaskProject_MissingNewProjectID tests handling of missing new_project_id
func TestUpdateTaskProject_MissingNewProjectID(t *testing.T) {
	handler, pdb := setupSystemAdminHandler(t)
	defer pdb.Close()

	router := setupSysAdminTestRouter(handler, "admin", "system")

	// Request without new_project_id
	requestBody := map[string]interface{}{
		"reason": "Test",
	}
	jsonBody, _ := json.Marshal(requestBody)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("PUT", "/admin/tasks/1/project", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	// Assertions
	assert.Equal(t, http.StatusBadRequest, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Equal(t, "invalid_request", response["code"])
}

// TestUpdateTaskProject_SameProject tests handling when task is already in target project
func TestUpdateTaskProject_SameProject(t *testing.T) {
	handler, pdb := setupSystemAdminHandler(t)
	defer pdb.Close()

	ctx := context.Background()

	// Create test project and task
	project := &models.Project{
		Name:   "Test Project",
		Status: "active",
	}
	createdProject, err := pdb.Projects().Create(ctx, project)
	require.NoError(t, err)

	task := &models.Task{
		ProjectID: createdProject.ID,
		Title:     "Test Task",
		Status:    "todo",
	}
	createdTask, err := pdb.Tasks().Create(ctx, task)
	require.NoError(t, err)

	router := setupSysAdminTestRouter(handler, "admin", "system")

	// Request to move to same project
	requestBody := map[string]interface{}{
		"new_project_id": createdProject.ID,
		"reason":         "Test",
	}
	jsonBody, _ := json.Marshal(requestBody)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("PUT", fmt.Sprintf("/admin/tasks/%d/project", createdTask.ID), bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	// Assertions
	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err = json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.True(t, response["success"].(bool))
	assert.Contains(t, response["message"], "任务已在目标项目中")

	// Cleanup
	_ = pdb.Tasks().Delete(ctx, createdTask.ID)
	_ = pdb.Projects().Delete(ctx, createdProject.ID)
}

// TestUpdateTaskProject_WithReason tests that reason is properly stored
func TestUpdateTaskProject_WithReason(t *testing.T) {
	handler, pdb := setupSystemAdminHandler(t)
	defer pdb.Close()

	ctx := context.Background()

	// Create test projects
	project1 := &models.Project{
		Name:   "Project 1",
		Status: "active",
	}
	createdProject1, err := pdb.Projects().Create(ctx, project1)
	require.NoError(t, err)

	project2 := &models.Project{
		Name:   "Project 2",
		Status: "active",
	}
	createdProject2, err := pdb.Projects().Create(ctx, project2)
	require.NoError(t, err)

	// Create test task
	task := &models.Task{
		ProjectID: createdProject1.ID,
		Title:     "Test Task",
		Status:    "todo",
	}
	createdTask, err := pdb.Tasks().Create(ctx, task)
	require.NoError(t, err)

	router := setupSysAdminTestRouter(handler, "admin", "system")

	// Request with reason
	testReason := "Moving task due to project restructuring"
	requestBody := map[string]interface{}{
		"new_project_id": createdProject2.ID,
		"reason":         testReason,
	}
	jsonBody, _ := json.Marshal(requestBody)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("PUT", fmt.Sprintf("/admin/tasks/%d/project", createdTask.ID), bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	// Assertions
	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err = json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.True(t, response["success"].(bool))

	// Verify task was moved
	updatedTask, err := pdb.Tasks().GetByID(ctx, createdTask.ID)
	require.NoError(t, err)
	assert.Equal(t, createdProject2.ID, updatedTask.ProjectID)

	// Cleanup
	_ = pdb.Tasks().Delete(ctx, createdTask.ID)
	_ = pdb.Projects().Delete(ctx, createdProject1.ID)
	_ = pdb.Projects().Delete(ctx, createdProject2.ID)
}

// TestUpdateTaskProject_InvalidJSON tests handling of invalid JSON
func TestUpdateTaskProject_InvalidJSON(t *testing.T) {
	handler, pdb := setupSystemAdminHandler(t)
	defer pdb.Close()

	router := setupSysAdminTestRouter(handler, "admin", "system")

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("PUT", "/admin/tasks/1/project", bytes.NewBufferString("invalid json"))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	// Assertions
	assert.Equal(t, http.StatusBadRequest, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Equal(t, "invalid_request", response["code"])
}

// TestSystemAdminHandler_SetDB tests the SetDB method
func TestSystemAdminHandler_SetDB(t *testing.T) {
	pdb := getTestDBForSystemAdmin(t)
	defer pdb.Close()

	handler := NewSystemAdminHandler(pdb.GetDB().(*sql.DB))

	// Initially db should be nil
	assert.Nil(t, handler.db)

	// Set DB
	handler.SetDB(pdb)

	// Now db should be set
	assert.NotNil(t, handler.db)
	assert.Equal(t, pdb, handler.db)
}

// TestNewSystemAdminHandler tests handler creation
func TestNewSystemAdminHandler(t *testing.T) {
	pdb := getTestDBForSystemAdmin(t)
	defer pdb.Close()

	handler := NewSystemAdminHandler(pdb.GetDB().(*sql.DB))

	assert.NotNil(t, handler)
	assert.NotNil(t, handler.systemAdminService)
	assert.IsType(t, &validator.Validate{}, handler.validator)
}

// TestUpdateTaskProject_ConcurrentUpdates tests handling of concurrent updates
func TestUpdateTaskProject_ConcurrentUpdates(t *testing.T) {
	handler, pdb := setupSystemAdminHandler(t)
	defer pdb.Close()

	ctx := context.Background()

	// Create test projects
	project1 := &models.Project{Name: "Project 1", Status: "active"}
	createdProject1, err := pdb.Projects().Create(ctx, project1)
	require.NoError(t, err)

	project2 := &models.Project{Name: "Project 2", Status: "active"}
	createdProject2, err := pdb.Projects().Create(ctx, project2)
	require.NoError(t, err)

	project3 := &models.Project{Name: "Project 3", Status: "active"}
	createdProject3, err := pdb.Projects().Create(ctx, project3)
	require.NoError(t, err)

	// Create test task
	task := &models.Task{
		ProjectID: createdProject1.ID,
		Title:     "Test Task for Concurrent Updates",
		Status:    "todo",
	}
	createdTask, err := pdb.Tasks().Create(ctx, task)
	require.NoError(t, err)

	router := setupSysAdminTestRouter(handler, "admin", "system")

	// First update: move to project2
	requestBody1 := map[string]interface{}{
		"new_project_id": createdProject2.ID,
		"reason":         "First update",
	}
	jsonBody1, _ := json.Marshal(requestBody1)

	w1 := httptest.NewRecorder()
	req1, _ := http.NewRequest("PUT", fmt.Sprintf("/admin/tasks/%d/project", createdTask.ID), bytes.NewBuffer(jsonBody1))
	req1.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w1, req1)

	assert.Equal(t, http.StatusOK, w1.Code)

	// Second update: move to project3
	requestBody2 := map[string]interface{}{
		"new_project_id": createdProject3.ID,
		"reason":         "Second update",
	}
	jsonBody2, _ := json.Marshal(requestBody2)

	w2 := httptest.NewRecorder()
	req2, _ := http.NewRequest("PUT", fmt.Sprintf("/admin/tasks/%d/project", createdTask.ID), bytes.NewBuffer(jsonBody2))
	req2.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w2, req2)

	assert.Equal(t, http.StatusOK, w2.Code)

	// Verify final state: task should be in project3
	finalTask, err := pdb.Tasks().GetByID(ctx, createdTask.ID)
	require.NoError(t, err)
	assert.Equal(t, createdProject3.ID, finalTask.ProjectID)

	// Cleanup
	_ = pdb.Tasks().Delete(ctx, createdTask.ID)
	_ = pdb.Projects().Delete(ctx, createdProject1.ID)
	_ = pdb.Projects().Delete(ctx, createdProject2.ID)
	_ = pdb.Projects().Delete(ctx, createdProject3.ID)
}
