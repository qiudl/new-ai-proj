package handlers

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
	"github.com/gin-gonic/gin"
)

// helper to get test db
func getITDB(t *testing.T) *database.PostgresDB {
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

// helper to create project+task
func ensureProjectTask(t *testing.T, sqlDB *sql.DB) (int, int) {
	if _, err := sqlDB.Exec("INSERT INTO projects (name) VALUES ('IT Project')"); err != nil {
		t.Skipf("skip: schema not ready (projects): %v", err)
	}
	var pid int
	if err := sqlDB.QueryRow("SELECT id FROM projects ORDER BY id DESC LIMIT 1").Scan(&pid); err != nil {
		t.Fatalf("failed to read project id: %v", err)
	}
	if _, err := sqlDB.Exec("INSERT INTO tasks (project_id, title, status) VALUES ($1,'IT Task','todo')", pid); err != nil {
		t.Skipf("skip: schema not ready (tasks): %v", err)
	}
	var tid int
	if err := sqlDB.QueryRow("SELECT id FROM tasks ORDER BY id DESC LIMIT 1").Scan(&tid); err != nil {
		t.Fatalf("failed to read task id: %v", err)
	}
	return pid, tid
}

func TestCreateAttach_Has_List_Flow(t *testing.T) {
	pdb := getITDB(t)
	defer pdb.Close()
	sqldb := pdb.GetDB().(*sql.DB)
	projectID, taskID := ensureProjectTask(t, sqldb)

	h := NewDocumentHandler(pdb)
	gin.SetMode(gin.TestMode)
	r := gin.New()
	// Routes under test
	r.POST("/api/v1/projects/:id/tasks/:taskId/documents/create-and-attach", func(c *gin.Context) {
		c.Set("user_id", 1)
		h.CreateAndAttachDocument(c)
	})
	r.GET("/api/v1/projects/:id/tasks/:taskId/documents/has", h.HasTaskDocument)
	r.GET("/api/v1/projects/:id/tasks/:taskId/documents/list", h.ListTaskDocuments)

	// 1) create and attach
	payload := map[string]any{
		"title":   "IT Doc",
		"content": "content",
	}
	b, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, fmt.Sprintf("/api/v1/projects/%d/tasks/%d/documents/create-and-attach", projectID, taskID), bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusCreated {
		t.Fatalf("create-and-attach expected 201, got %d body=%s", w.Code, w.Body.String())
	}

	// 2) has
	req2 := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/api/v1/projects/%d/tasks/%d/documents/has", projectID, taskID), nil)
	w2 := httptest.NewRecorder()
	r.ServeHTTP(w2, req2)
	if w2.Code != http.StatusOK {
		t.Fatalf("has expected 200, got %d body=%s", w2.Code, w2.Body.String())
	}

	// 3) list
	req3 := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/api/v1/projects/%d/tasks/%d/documents/list", projectID, taskID), nil)
	w3 := httptest.NewRecorder()
	r.ServeHTTP(w3, req3)
	if w3.Code != http.StatusOK {
		t.Fatalf("list expected 200, got %d body=%s", w3.Code, w3.Body.String())
	}
}
