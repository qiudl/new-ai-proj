package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"ai-project-backend/database"
	"ai-project-backend/models"
	"github.com/gin-gonic/gin"
)

// getTestDB returns a postgres connection or skips if unavailable
func getDailyComparisonTestDB(t *testing.T) *database.PostgresDB {
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		dsn = "postgres://dev_user:dev_password_2024@localhost:5433/ai_project_db?sslmode=disable"
	}
	pdb, err := database.NewPostgresDB(dsn)
	if err != nil {
		t.Skipf("skip daily comparison integration tests: cannot connect to DB: %v", err)
	}
	return pdb
}

func TestDailyComparisonEndpoint(t *testing.T) {
	pdb := getDailyComparisonTestDB(t)
	defer pdb.Close()

	h := NewUnifiedTimerHandler(pdb)
	gin.SetMode(gin.TestMode)
	r := gin.New()
	
	// inject user_id via middleware for tests
	r.Use(func(c *gin.Context) { c.Set("user_id", 1); c.Next() })
	
	// register the endpoint under test
	r.GET("/api/v1/timer/daily-comparison", h.GetDailyComparison)

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/timer/daily-comparison", nil)
	r.ServeHTTP(w, req)

	// The endpoint should always return 200 OK even with no data
	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", w.Code, w.Body.String())
	}

	// Parse response to validate structure
	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("failed to parse response JSON: %v", err)
	}

	// Validate top-level structure
	if _, ok := response["data"]; !ok {
		t.Error("response missing 'data' field")
	}
	if _, ok := response["meta"]; !ok {
		t.Error("response missing 'meta' field")
	}

	// Validate data structure
	data, ok := response["data"].(map[string]interface{})
	if !ok {
		t.Fatal("data field is not a map")
	}

	requiredFields := []string{"today", "yesterday", "day_before", "trends", "insights", "updated_at"}
	for _, field := range requiredFields {
		if _, ok := data[field]; !ok {
			t.Errorf("data missing required field: %s", field)
		}
	}

	// Validate meta structure
	meta, ok := response["meta"].(map[string]interface{})
	if !ok {
		t.Fatal("meta field is not a map")
	}

	requiredMetaFields := []string{"generated_at", "timezone", "algorithm_version"}
	for _, field := range requiredMetaFields {
		if _, ok := meta[field]; !ok {
			t.Errorf("meta missing required field: %s", field)
		}
	}

	// Validate algorithm version
	if meta["algorithm_version"] != "2.0" {
		t.Errorf("expected algorithm_version '2.0', got %v", meta["algorithm_version"])
	}

	// Validate timezone
	if meta["timezone"] != "Asia/Shanghai" {
		t.Errorf("expected timezone 'Asia/Shanghai', got %v", meta["timezone"])
	}
}

func TestDailyComparisonDataStructure(t *testing.T) {
	pdb := getDailyComparisonTestDB(t)
	defer pdb.Close()

	h := NewUnifiedTimerHandler(pdb)
	gin.SetMode(gin.TestMode)
	r := gin.New()
	
	r.Use(func(c *gin.Context) { c.Set("user_id", 1); c.Next() })
	r.GET("/api/v1/timer/daily-comparison", h.GetDailyComparison)

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/timer/daily-comparison", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	// Unmarshal into typed structure to validate
	var response struct {
		Data models.DailyComparisonResponse `json:"data"`
		Meta map[string]interface{}         `json:"meta"`
	}

	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("failed to unmarshal typed response: %v", err)
	}

	// Validate day efficiency data structure
	validateDayData := func(name string, data models.DayEfficiencyData) {
		if data.Date == "" {
			t.Errorf("%s: date is empty", name)
		}
		if data.EfficiencyIndex < 0 || data.EfficiencyIndex > 100 {
			t.Errorf("%s: efficiency index out of range [0,100]: %f", name, data.EfficiencyIndex)
		}
		if data.TotalHours < 0 {
			t.Errorf("%s: negative total hours: %f", name, data.TotalHours)
		}
		if data.CompletedTasks < 0 {
			t.Errorf("%s: negative completed tasks: %d", name, data.CompletedTasks)
		}
		if len(data.HourlyDistribution) != 24 {
			t.Errorf("%s: hourly distribution should have 24 entries, got %d", name, len(data.HourlyDistribution))
		}
	}

	validateDayData("today", response.Data.Today)
	validateDayData("yesterday", response.Data.Yesterday)
	validateDayData("day_before", response.Data.DayBefore)

	// Validate trends structure
	trends := response.Data.Trends
	validDirections := map[string]bool{"improving": true, "declining": true, "stable": true}
	if !validDirections[trends.WeekTrendDirection] {
		t.Errorf("invalid week trend direction: %s", trends.WeekTrendDirection)
	}

	// Validate insights structure
	for i, insight := range response.Data.Insights {
		validTypes := map[string]bool{"positive": true, "warning": true, "suggestion": true, "info": true}
		if !validTypes[insight.Type] {
			t.Errorf("insight %d: invalid type: %s", i, insight.Type)
		}
		
		validPriorities := map[string]bool{"high": true, "medium": true, "low": true}
		if !validPriorities[insight.Priority] {
			t.Errorf("insight %d: invalid priority: %s", i, insight.Priority)
		}
		
		if insight.Title == "" {
			t.Errorf("insight %d: empty title", i)
		}
		if insight.Description == "" {
			t.Errorf("insight %d: empty description", i)
		}
	}
}

func TestDailyComparisonUnauthorized(t *testing.T) {
	pdb := getDailyComparisonTestDB(t)
	defer pdb.Close()

	h := NewUnifiedTimerHandler(pdb)
	gin.SetMode(gin.TestMode)
	r := gin.New()
	
	// Don't inject user_id to test unauthorized access
	r.GET("/api/v1/timer/daily-comparison", h.GetDailyComparison)

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/timer/daily-comparison", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected status 401 for unauthorized access, got %d", w.Code)
	}

	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("failed to parse error response: %v", err)
	}

	if response["error"] != "User not authenticated" {
		t.Errorf("expected authentication error, got: %v", response["error"])
	}
}