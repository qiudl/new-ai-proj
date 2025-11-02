package handlers

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// AnalyticsHandler handles analytics event ingestion
type AnalyticsHandler struct {
	db database.DB
}

func NewAnalyticsHandler(db database.DB) *AnalyticsHandler {
	return &AnalyticsHandler{db: db}
}

// eventPayload represents a single analytics event from client
type eventPayload struct {
	Event     string                 `json:"event" binding:"required"`
	UserID    string                 `json:"user_id"`
	ProjectID *int                   `json:"project_id"`
	TaskID    *int                   `json:"task_id"`
	Context   map[string]interface{} `json:"context"`
	CreatedAt *time.Time             `json:"created_at"`
}

// IngestEvents handles POST /api/v1/analytics/events
// Accepts a single object or an array of objects. Writes valid events to analytics.events,
// invalid payloads into analytics.events_dead_letter for later inspection.
func (h *AnalyticsHandler) IngestEvents(c *gin.Context) {
	// Ensure schema/tables exist (idempotent)
	if err := h.ensureSchema(c); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to ensure analytics schema", "details": err.Error()})
		return
	}

	dec := json.NewDecoder(c.Request.Body)
	dec.DisallowUnknownFields()

	var many []eventPayload
	if err := dec.Decode(&many); err != nil {
		// Try single payload
		c.Request.Body.Close()
		// Re-read body: use ShouldBindJSON for single case
		var single eventPayload
		if err2 := c.ShouldBindJSON(&single); err2 != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid payload", "details": err2.Error()})
			return
		}
		many = []eventPayload{single}
	}

	allowed := map[string]struct{}{
		"app_view":            {},
		"task_open":           {},
		"tasks_toggle_expand": {},
		"tasks_search":        {},
		"a11y_violation":      {},
	}

	inserted := 0
	dead := 0

	sqldb := h.db.GetDB().(*sql.DB)

	for _, ev := range many {
		// Basic normalization
		ev.Event = strings.TrimSpace(ev.Event)
		if ev.CreatedAt == nil {
			now := time.Now().UTC()
			ev.CreatedAt = &now
		}

		// Validate event
		if _, ok := allowed[ev.Event]; !ok {
			h.insertDeadLetter(sqldb, ev, "unsupported_event")
			dead++
			continue
		}
		// Event-specific requirements
		if ev.Event == "task_open" && ev.TaskID == nil {
			h.insertDeadLetter(sqldb, ev, "missing_task_id_for_task_open")
			dead++
			continue
		}

		// Insert into analytics.events
		ctxJSON, _ := json.Marshal(ev.Context)
		_, err := sqldb.Exec(
			`INSERT INTO analytics.events (event, user_id, project_id, task_id, context, created_at)
			 VALUES ($1,$2,$3,$4,$5::jsonb,$6)`,
			ev.Event, ev.UserID, ev.ProjectID, ev.TaskID, string(ctxJSON), ev.CreatedAt,
		)
		if err != nil {
			// On failure, insert into dead letter
			h.insertDeadLetter(sqldb, ev, "insert_error: "+err.Error())
			dead++
			continue
		}
		inserted++
	}

	status := http.StatusAccepted
	c.JSON(status, gin.H{
		"inserted":          inserted,
		"dead_letter_count": dead,
	})
}

func (h *AnalyticsHandler) ensureSchema(c *gin.Context) error {
	sqldb := h.db.GetDB().(*sql.DB)
	stmts := []string{
		"CREATE SCHEMA IF NOT EXISTS analytics",
		`CREATE TABLE IF NOT EXISTS analytics.events (
			id BIGSERIAL PRIMARY KEY,
			event TEXT NOT NULL,
			user_id TEXT,
			project_id BIGINT,
			task_id BIGINT,
			context JSONB,
			created_at TIMESTAMPTZ NOT NULL DEFAULT now()
		)`,
		"CREATE INDEX IF NOT EXISTS idx_events_event ON analytics.events(event)",
		"CREATE INDEX IF NOT EXISTS idx_events_created_at ON analytics.events(created_at)",
		"CREATE INDEX IF NOT EXISTS idx_events_task_id ON analytics.events(task_id)",
		`CREATE TABLE IF NOT EXISTS analytics.events_dead_letter (
			id BIGSERIAL PRIMARY KEY,
			payload JSONB NOT NULL,
			reason TEXT,
			created_at TIMESTAMPTZ NOT NULL DEFAULT now()
		)`,
	}
	for _, s := range stmts {
		if _, err := sqldb.Exec(s); err != nil {
			return err
		}
	}
	return nil
}

func (h *AnalyticsHandler) insertDeadLetter(sqldb *sql.DB, ev eventPayload, reason string) {
	p, _ := json.Marshal(ev)
	_, _ = sqldb.Exec(`INSERT INTO analytics.events_dead_letter (payload, reason) VALUES ($1::jsonb, $2)`, string(p), reason)
}

// GetKPI handles GET /api/v1/analytics/kpi/:name
// Basic placeholder implementation for #463. Supports:
// - events_daily: optional query params event (string), days (int, default 7)
func (h *AnalyticsHandler) GetKPI(c *gin.Context) {
	name := c.Param("name")
	sqldb := h.db.GetDB().(*sql.DB)

	switch name {
	case "events_daily":
		// Parse params
		event := strings.TrimSpace(c.Query("event"))
		days := 7
		if v := strings.TrimSpace(c.Query("days")); v != "" {
			if parsed, err := parsePositiveInt(v); err == nil {
				days = parsed
			}
		}
		// Compute threshold time
		from := time.Now().Add(-time.Duration(days) * 24 * time.Hour)
		// Query
		var rows *sql.Rows
		var err error
		if event != "" {
			rows, err = sqldb.Query(`
				SELECT date_trunc('day', created_at) AS day, event, COUNT(*) AS cnt
				FROM analytics.events
				WHERE created_at >= $1 AND event = $2
				GROUP BY 1,2
				ORDER BY day DESC
				LIMIT 1000
			`, from, event)
		} else {
			rows, err = sqldb.Query(`
				SELECT date_trunc('day', created_at) AS day, event, COUNT(*) AS cnt
				FROM analytics.events
				WHERE created_at >= $1
				GROUP BY 1,2
				ORDER BY day DESC
				LIMIT 1000
			`, from)
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "query_failed", "details": err.Error()})
			return
		}
		defer rows.Close()
		resp := make([]map[string]interface{}, 0)
		for rows.Next() {
			var day time.Time
			var ev string
			var cnt int64
			if err := rows.Scan(&day, &ev, &cnt); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "scan_failed", "details": err.Error()})
				return
			}
			resp = append(resp, map[string]interface{}{
				"day":   day.UTC().Format("2006-01-02"),
				"event": ev,
				"count": cnt,
			})
		}
		c.JSON(http.StatusOK, gin.H{"data": resp, "kpi": name, "from": from.UTC().Format(time.RFC3339)})
	default:
		c.JSON(http.StatusNotFound, models.NewErrorResponse(
			models.ErrCodeNotFound,
			fmt.Sprintf("unknown kpi: %s", name),
			nil,
		))
	}
}

func parsePositiveInt(s string) (int, error) {
	var n int
	_, err := fmt.Sscanf(s, "%d", &n)
	if err != nil {
		return 0, err
	}
	if n < 0 {
		return 0, fmt.Errorf("negative")
	}
	return n, nil
}
