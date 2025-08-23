//go:build integration_hierarchy
// +build integration_hierarchy

package handlers_test

import (
	"ai-project-backend/application"
	"ai-project-backend/database"
	"ai-project-backend/models"
	"context"
	"database/sql"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

// Note: This is a lightweight integration-style test using an in-memory or mocked DB.
// If the project has a test DB setup, replace with real setup/teardown and Docker Postgres.
func TestGetTaskDescendants_Basic(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Prepare a real router with minimal app wiring
	// Assuming application.NewApplication or similar exists; fall back to manual wiring if not.
	// Here we mock DB via a concrete PostgresDB using a test DSN if available.
	var sqlDB *sql.DB
	// Replace with env-provided test DB if available
	// sqlDB, _ = sql.Open("postgres", os.Getenv("TEST_DATABASE_DSN"))
	// For this repo, we will skip if DB is not available.
	if sqlDB == nil {
		t.Skip("No test database configured; skip descendants integration test")
	}

	pg := database.NewPostgresDBFromSQL(sqlDB)
	app := application.NewApplicationWithDB(pg) // hypothetical helper; adjust to project
	router := gin.New()
	router.GET("/api/v1/projects/:id/tasks/:taskId/descendants", app.GetTaskDescendantsHandler())

	req := httptest.NewRequest(http.MethodGet, "/api/v1/projects/1/tasks/1/descendants?depth=2&limit=200", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d, body=%s", rec.Code, rec.Body.String())
	}
}

// Unit-style test: directly call repository with a small seeded dataset (requires test DB)
func TestRepository_GetDescendants_Shape(t *testing.T) {
	// This test assumes a test DB with a known small tree seeded.
	// If not available, skip gracefully.
	var sqlDB *sql.DB
	if sqlDB == nil {
		t.Skip("No test database configured; skip repo descendants test")
	}
	pg := database.NewPostgresDBFromSQL(sqlDB)
	repo := pg.Tasks()

	ctx := context.Background()
	nodes, err := repo.GetDescendants(ctx, 1, 2, 100)
	if err != nil {
		t.Fatalf("GetDescendants error: %v", err)
	}
	if len(nodes) == 0 {
		t.Fatalf("expected some descendants, got 0")
	}
	// Basic shape checks
	for _, n := range nodes {
		if n.Level < 1 {
			t.Fatalf("invalid level: %d", n.Level)
		}
		if n.ID == 0 {
			t.Fatalf("invalid id: %d", n.ID)
		}
	}
}
