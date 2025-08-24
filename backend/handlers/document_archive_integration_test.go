package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"ai-project-backend/database"
	"ai-project-backend/models"
	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/testutil"
)

// getArchiveITDB returns a postgres connection or skips if unavailable
func getArchiveITDB(t *testing.T) *database.PostgresDB {
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		// Default to docker-compose db mapping
		dsn = "postgres://user:password@localhost:5432/main_db?sslmode=disable"
	}
	pdb, err := database.NewPostgresDB(dsn)
	if err != nil {
		t.Skipf("skip archive integration tests: cannot connect to DB: %v", err)
	}
	return pdb
}

// ensureUser ensures a user row exists for FK references
func ensureUser(t *testing.T, sqlDB *sql.DB, id int) {
	// Create minimal users table if not exists (compatible with dev DB)
	if _, err := sqlDB.Exec(`CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, username VARCHAR(255))`); err != nil {
		t.Skipf("skip: cannot ensure users table: %v", err)
	}
	// Insert the user if missing
	if _, err := sqlDB.Exec(`INSERT INTO users (id, username) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, id, fmt.Sprintf("testuser_%d", id)); err != nil {
		t.Fatalf("failed to upsert user: %v", err)
	}
}

// ensureDocumentsTable makes sure archive columns exist; skip if schema not ready
func ensureDocumentsTable(t *testing.T, sqlDB *sql.DB) {
	// Probe basic existence
	var exists bool
	if err := sqlDB.QueryRow(`SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='documents')`).Scan(&exists); err != nil || !exists {
		t.Skip("skip: documents table not found")
	}
	// Probe archive column
	if err := sqlDB.QueryRow(`SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='archived')`).Scan(&exists); err != nil || !exists {
		t.Skip("skip: documents.archived column not found; ensure migrations applied")
	}
}

func newIsolatedDocumentHandler(t *testing.T, pdb *database.PostgresDB) *DocumentHandler {
	sqlDB := pdb.GetDB().(*sql.DB)
	h := &DocumentHandler{
		db:      pdb,
		docRepo: database.NewDocumentRepository(sqlDB),
		metricArchiveReq:   prometheus.NewCounterVec(prometheus.CounterOpts{Name: "test_document_archive_requests_total"}, []string{"status", "source"}),
		metricUnarchiveReq: prometheus.NewCounterVec(prometheus.CounterOpts{Name: "test_document_unarchive_requests_total"}, []string{"status", "source"}),
		metricArchiveDur:   prometheus.NewHistogramVec(prometheus.HistogramOpts{Name: "test_document_archive_duration_seconds"}, []string{"status"}),
		metricUnarchiveDur: prometheus.NewHistogramVec(prometheus.HistogramOpts{Name: "test_document_unarchive_duration_seconds"}, []string{"status"}),
	}
	return h
}

func TestArchiveUnarchive_DatabaseAndMetrics(t *testing.T) {
	gin.SetMode(gin.TestMode)
	pdb := getArchiveITDB(t)
	defer pdb.Close()
	sqlDB := pdb.GetDB().(*sql.DB)

	ensureDocumentsTable(t, sqlDB)
	ensureUser(t, sqlDB, 1)

	// Create a minimal document via repository
	content := "integration content"
	doc := &models.Document{
		Title:      "Archive IT",
		Content:    &content,
		Type:       models.DocumentTypeMarkdown,
		Status:     models.DocumentStatusDraft,
		Tags:       []string{},
		Metadata:   models.DocumentMetadata{},
		OwnerID:    1,
		Visibility: models.VisibilityTeam,
		Version:    1,
		IsTemplate: false,
		CreatedBy:  1,
	}
	created, err := database.NewDocumentRepository(sqlDB).Create(t.Context(), doc)
	if err != nil {
		t.Fatalf("failed to create document fixture: %v", err)
	}

	h := newIsolatedDocumentHandler(t, pdb)
	r := gin.New()
	// Wrap routes to inject user_id for handler auth
	r.POST("/api/v1/documents/:id/archive", func(c *gin.Context) { c.Set("user_id", 1); h.ArchiveDocument(c) })
	r.POST("/api/v1/documents/:id/unarchive", func(c *gin.Context) { c.Set("user_id", 1); h.UnarchiveDocument(c) })

	// Metrics baseline
	_ = h.metricArchiveReq.WithLabelValues("success", "api") // ensure metric initialized
	_ = h.metricUnarchiveReq.WithLabelValues("success", "api")
	beforeArchive := testutil.ToFloat64(h.metricArchiveReq.WithLabelValues("success", "api"))
	beforeUnarchive := testutil.ToFloat64(h.metricUnarchiveReq.WithLabelValues("success", "api"))

	// 1) Archive
	wA := httptest.NewRecorder()
	reqA := httptest.NewRequest(http.MethodPost, fmt.Sprintf("/api/v1/documents/%d/archive", created.ID), nil)
	r.ServeHTTP(wA, reqA)
	if wA.Code != http.StatusOK {
		t.Fatalf("archive expected 200, got %d body=%s", wA.Code, wA.Body.String())
	}
	// Verify DB
	var archived bool
	var archivedBy sql.NullInt64
	var archivedAt sql.NullTime
	if err := sqlDB.QueryRow(`SELECT archived, archived_by, archived_at FROM documents WHERE id=$1`, created.ID).Scan(&archived, &archivedBy, &archivedAt); err != nil {
		t.Fatalf("failed to read archived flags: %v", err)
	}
	if !archived || !archivedBy.Valid || archivedBy.Int64 != 1 || !archivedAt.Valid {
		t.Fatalf("unexpected archive state: archived=%v by=%v at.valid=%v", archived, archivedBy, archivedAt.Valid)
	}
	// Verify metrics
	afterArchive := testutil.ToFloat64(h.metricArchiveReq.WithLabelValues("success", "api"))
	if afterArchive-beforeArchive < 1 {
		t.Fatalf("expected archive counter to increment by >=1, got before=%v after=%v", beforeArchive, afterArchive)
	}

	// 2) Unarchive
	wU := httptest.NewRecorder()
	reqU := httptest.NewRequest(http.MethodPost, fmt.Sprintf("/api/v1/documents/%d/unarchive", created.ID), nil)
	r.ServeHTTP(wU, reqU)
	if wU.Code != http.StatusOK {
		t.Fatalf("unarchive expected 200, got %d body=%s", wU.Code, wU.Body.String())
	}
	// Verify DB
	var unarchived bool
	var unarchivedBy sql.NullInt64
	var unarchivedAt sql.NullTime
	if err := sqlDB.QueryRow(`SELECT archived, unarchived_by, unarchived_at FROM documents WHERE id=$1`, created.ID).Scan(&unarchived, &unarchivedBy, &unarchivedAt); err != nil {
		t.Fatalf("failed to read unarchive flags: %v", err)
	}
	if unarchived || !unarchivedBy.Valid || unarchivedBy.Int64 != 1 || !unarchivedAt.Valid {
		t.Fatalf("unexpected unarchive state: archived=%v by=%v at.valid=%v", unarchived, unarchivedBy, unarchivedAt.Valid)
	}
	// Verify metrics
	afterUnarchive := testutil.ToFloat64(h.metricUnarchiveReq.WithLabelValues("success", "api"))
	if afterUnarchive-beforeUnarchive < 1 {
		t.Fatalf("expected unarchive counter to increment by >=1, got before=%v after=%v", beforeUnarchive, afterUnarchive)
	}
}
