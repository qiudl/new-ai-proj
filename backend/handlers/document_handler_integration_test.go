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

	apphandlers "ai-project-backend/handlers"
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

	h := apphandlers.NewDocumentHandler(pdb)
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

func TestUpdateDocument_BothRoutes_OK(t *testing.T) {
	pdb := getITDB(t)
	defer pdb.Close()
	sqldb := pdb.GetDB().(*sql.DB)
	projectID, taskID := ensureProjectTask(t, sqldb)

	h := apphandlers.NewDocumentHandler(pdb)
	gin.SetMode(gin.TestMode)
	r := gin.New()

	// Routes: create, list, update (standard), update (convenience)
	r.POST("/api/v1/projects/:id/tasks/:taskId/documents/create-and-attach", func(c *gin.Context) {
		c.Set("user_id", 1)
		h.CreateAndAttachDocument(c)
	})
	r.GET("/api/v1/projects/:id/tasks/:taskId/documents/list", h.ListTaskDocuments)
	r.PUT("/api/v1/documents/:id", h.UpdateDocument)
	r.PUT("/api/v1/projects/:id/tasks/:taskId/documents/:documentId", h.UpdateDocument)

	// 1) create a document and capture document_id
	body := map[string]any{"title": "To Update", "content": "v1"}
	b, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, fmt.Sprintf("/api/v1/projects/%d/tasks/%d/documents/create-and-attach", projectID, taskID), bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusCreated {
		t.Fatalf("create-and-attach expected 201, got %d body=%s", w.Code, w.Body.String())
	}
	var resp struct {
		Success bool `json:"success"`
		Data struct {
			DocumentID int `json:"document_id"`
		} `json:"data"`
	}
	_ = json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Data.DocumentID == 0 {
		t.Fatalf("expected document_id in response, got: %s", w.Body.String())
	}
	docID := resp.Data.DocumentID

	// 2) standard update route
	upd1 := map[string]any{"content": "v2"}
	b1, _ := json.Marshal(upd1)
	reqU1 := httptest.NewRequest(http.MethodPut, fmt.Sprintf("/api/v1/documents/%d", docID), bytes.NewReader(b1))
	reqU1.Header.Set("Content-Type", "application/json")
	wU1 := httptest.NewRecorder()
	r.ServeHTTP(wU1, reqU1)
	if wU1.Code != http.StatusOK {
		t.Fatalf("standard update expected 200, got %d body=%s", wU1.Code, wU1.Body.String())
	}

	// 3) convenience update route
	upd2 := map[string]any{"content": "v3"}
	b2, _ := json.Marshal(upd2)
	reqU2 := httptest.NewRequest(http.MethodPut, fmt.Sprintf("/api/v1/projects/%d/tasks/%d/documents/%d", projectID, taskID, docID), bytes.NewReader(b2))
	reqU2.Header.Set("Content-Type", "application/json")
	wU2 := httptest.NewRecorder()
	r.ServeHTTP(wU2, reqU2)
	if wU2.Code != http.StatusOK {
		t.Fatalf("convenience update expected 200, got %d body=%s", wU2.Code, wU2.Body.String())
	}
}
