package handlers_test

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"ai-project-backend/database"
	apphandlers "ai-project-backend/handlers"
	"github.com/gin-gonic/gin"
)

// getTestDB attempts to connect to Postgres for integration tests.
// It reads TEST_DATABASE_URL, otherwise tries a common local docker default.
func getTestDB(t *testing.T) *database.PostgresDB {
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		dsn = "postgres://postgres:postgres@localhost:5432/ai_project?sslmode=disable"
	}
	pdb, err := database.NewPostgresDB(dsn)
	if err != nil {
		t.Skipf("skip integration tests: cannot connect to DB: %v", err)
	}
	return pdb
}

// ensurePrerequisites makes sure required rows exist; it skips if schema is missing.
func ensurePrerequisites(t *testing.T, sqlDB *sql.DB) (projectID int, taskID int) {
	// Create minimal project and task; ignore errors if tables missing -> skip tests.
	if _, err := sqlDB.Exec("INSERT INTO projects (name) VALUES ('Test Project')"); err != nil {
		t.Skipf("skip: schema not ready (projects): %v", err)
	}
	if err := sqlDB.QueryRow("SELECT id FROM projects ORDER BY id DESC LIMIT 1").Scan(&projectID); err != nil {
		t.Fatalf("failed to read project id: %v", err)
	}
	if _, err := sqlDB.Exec("INSERT INTO tasks (project_id, title, status) VALUES ($1,'Test Task','todo')", projectID); err != nil {
		t.Skipf("skip: schema not ready (tasks): %v", err)
	}
	if err := sqlDB.QueryRow("SELECT id FROM tasks ORDER BY id DESC LIMIT 1").Scan(&taskID); err != nil {
		t.Fatalf("failed to read task id: %v", err)
	}
	return
}

func TestCreateAndAttachDocument_Success(t *testing.T) {
	pdb := getTestDB(t)
	defer pdb.Close()
	sqlDB := pdb.GetDB().(*sql.DB)

	projectID, taskID := ensurePrerequisites(t, sqlDB)

	h := apphandlers.NewDocumentHandler(pdb)
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.POST("/api/v1/projects/:id/tasks/:taskId/documents/create-and-attach", func(c *gin.Context) {
		// inject user_id into context (middleware usually sets this)
		c.Set("user_id", 1)
		h.CreateAndAttachDocument(c)
	})

	body := map[string]interface{}{
		"title":   "Test Doc",
		"content": "hello",
	}
	b, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, fmt.Sprintf("/api/v1/projects/%d/tasks/%d/documents/create-and-attach", projectID, taskID), bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d, body=%s", w.Code, w.Body.String())
	}
}

func TestCreateAndAttachDocument_RollbackOnAttachError(t *testing.T) {
	pdb := getTestDB(t)
	defer pdb.Close()
	sqlDB := pdb.GetDB().(*sql.DB)

	projectID, _ := ensurePrerequisites(t, sqlDB)

	h := apphandlers.NewDocumentHandler(pdb)
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.POST("/api/v1/projects/:id/tasks/:taskId/documents/create-and-attach", func(c *gin.Context) {
		c.Set("user_id", 1)
		h.CreateAndAttachDocument(c)
	})

	// use a non-existing task id to trigger FK error on attach
	nonExistingTaskID := 99999999
	body := map[string]interface{}{
		"title":   "Doc Should Rollback",
		"content": "x",
	}
	b, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, fmt.Sprintf("/api/v1/projects/%d/tasks/%d/documents/create-and-attach", projectID, nonExistingTaskID), bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code == http.StatusCreated {
		t.Fatalf("expected non-201 due to attach error, got %d", w.Code)
	}
}
