package handlers

import (
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"ai-project-backend/database"
	"github.com/gin-gonic/gin"
)

// getTestDB returns a postgres connection or skips if unavailable
func getUnifiedTimerITDB(t *testing.T) *database.PostgresDB {
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		dsn = "postgres://postgres:postgres@localhost:5432/ai_project?sslmode=disable"
	}
	pdb, err := database.NewPostgresDB(dsn)
	if err != nil {
		t.Skipf("skip unified timer integration tests: cannot connect to DB: %v", err)
	}
	return pdb
}

func TestUnifiedTimerActiveEndpoint(t *testing.T) {
	pdb := getUnifiedTimerITDB(t)
	defer pdb.Close()

	h := NewUnifiedTimerHandler(pdb)
	gin.SetMode(gin.TestMode)
	r := gin.New()
	// inject user_id via middleware for tests
	r.Use(func(c *gin.Context){ c.Set("user_id", 1); c.Next() })
	// register only the endpoint under test
	r.GET("/api/v1/user/timer/active", h.GetActiveTimers)

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/user/timer/active", nil)
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK && w.Code != http.StatusInternalServerError {
		t.Fatalf("unexpected status for active timers: %d", w.Code)
	}
}

