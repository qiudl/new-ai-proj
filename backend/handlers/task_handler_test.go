package handlers

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"context"
	"database/sql"
	"net/http"
	"net/http/httptest"
	"os"
	"strconv"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

// helper to get test DB (docker postgres per user rule assumed)
func getTestDB(t *testing.T) *database.PostgresDB {
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

// Test that completing a task stops any active unified timers for that task
func TestStopUnifiedTimersOnTaskCompletion(t *testing.T) {
	pdb := getTestDB(t)
	defer pdb.Close()
	
	// Create handler under test
	h := NewTaskHandler(pdb, nil, nil)
	gin.SetMode(gin.TestMode)
	r := gin.New()
	// Minimal route to hit UpdateTask
	r.PUT("/api/v1/projects/1/tasks/:taskId", h.UpdateTask)

	ctx := context.Background()
	// Precondition: ensure required tables exist (skip if not)
	if _, err := pdb.GetDB().(*sql.DB).ExecContext(ctx, "SELECT 1 FROM unified_timer_logs LIMIT 1"); err != nil {
		t.Skip("unified_timer_logs not available; skipping integration-like test")
	}

	// Create a dummy task
	task := &models.Task{ProjectID: 1, Title: "Test timer stop on completion", Status: "in_progress"}
	created, err := pdb.Tasks().Create(ctx, task)
	if err != nil {
		t.Fatalf("failed to create task: %v", err)
	}

	// Insert a running unified timer for this task for user 1
	sqlDB := pdb.GetDB().(*sql.DB)
	_, err = sqlDB.ExecContext(ctx, `
		INSERT INTO unified_timer_logs (user_id, target_type, target_id, target_title, status, start_time, created_by)
		VALUES (1, 'project_task', $1, 'Test timer', 'running', NOW(), 1)
	`, created.ID)
	if err != nil {
		t.Fatalf("failed to insert running unified timer: %v", err)
	}

	// Call UpdateTask to set status=completed
	body := strings.NewReader(`{"status":"completed"}`)
	req := httptest.NewRequest(http.MethodPut, "/api/v1/projects/1/tasks/"+strconv.Itoa(created.ID), body)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("unexpected status: %d, body=%s", w.Code, w.Body.String())
	}

	// Verify unified timer for this task is no longer running
	var count int
	err = sqlDB.QueryRowContext(ctx, `SELECT COUNT(*) FROM unified_timer_logs WHERE target_type='project_task' AND target_id=$1 AND status IN ('running','paused')`, created.ID).Scan(&count)
	if err != nil {
		t.Fatalf("failed to query timers: %v", err)
	}
	if count != 0 {
		t.Fatalf("expected no active timers for task, found %d", count)
	}
}
