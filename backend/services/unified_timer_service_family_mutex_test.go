package services

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"testing"
	"time"

	_ "github.com/lib/pq"
)

// test DSN targets Docker Postgres; can override with TEST_DB_DSN env var
func resolveTestDSN() string {
	if v := os.Getenv("TEST_DB_DSN"); v != "" {
		return v
	}
	return "postgresql://user:password@localhost:5432/main_db?sslmode=disable"
}

func mustOpenTestDB(t *testing.T) *sql.DB {
	t.Helper()
	dsn := resolveTestDSN()
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	db.SetMaxOpenConns(5)
	db.SetConnMaxLifetime(2 * time.Minute)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := db.PingContext(ctx); err != nil {
		t.Fatalf("ping db: %v (ensure `make db.up migrate` is running)", err)
	}
	return db
}

func seedUser(t *testing.T, db *sql.DB) int {
	t.Helper()
	var id int
	err := db.QueryRow(`
		INSERT INTO users (username, email, password_hash, user_type, role, created_at, updated_at)
		VALUES ($1,$2,$3,'system','admin', NOW(), NOW()) RETURNING id
	`, fmt.Sprintf("user_%d", time.Now().UnixNano()), fmt.Sprintf("u%d@example.com", time.Now().UnixNano()), "x").Scan(&id)
	if err != nil {
		t.Fatalf("seed user: %v", err)
	}
	return id
}

func seedProject(t *testing.T, db *sql.DB) int {
	t.Helper()
	var id int
	if err := db.QueryRow(`INSERT INTO projects (name, created_at, updated_at) VALUES ($1, NOW(), NOW()) RETURNING id`, "Test Project").Scan(&id); err != nil {
		t.Fatalf("seed project: %v", err)
	}
	return id
}

func seedTask(t *testing.T, db *sql.DB, projectID int, title string, parentID *int) int {
	t.Helper()
	var id int
	if parentID == nil {
		if err := db.QueryRow(`INSERT INTO tasks (project_id, title, status, created_at, updated_at) VALUES ($1,$2,'todo',NOW(),NOW()) RETURNING id`, projectID, title).Scan(&id); err != nil {
			t.Fatalf("seed root task: %v", err)
		}
		return id
	}
	if err := db.QueryRow(`INSERT INTO tasks (project_id, title, parent_id, status, created_at, updated_at) VALUES ($1,$2,$3,'todo',NOW(),NOW()) RETURNING id`, projectID, title, *parentID).Scan(&id); err != nil {
		t.Fatalf("seed child task: %v", err)
	}
	return id
}

func newService(t *testing.T, db *sql.DB) UnifiedTimerService {
	t.Helper()
	tie := NewTypeInferenceEngine(db)
	notif := NewNotificationService()
	return NewUnifiedTimerService(db, tie, notif)
}

func getStatuses(t *testing.T, db *sql.DB, userID int, ids ...int) map[int]string {
	t.Helper()
	m := map[int]string{}
	for _, tid := range ids {
		var status string
		_ = db.QueryRow(`SELECT status FROM unified_timer_logs WHERE user_id=$1 AND target_type='project_task' AND target_id=$2 ORDER BY id DESC LIMIT 1`, userID, tid).Scan(&status)
		m[tid] = status
	}
	return m
}

func TestFamilyMutex_ParentToChild(t *testing.T) {
	db := mustOpenTestDB(t)
	defer db.Close()
	userID := seedUser(t, db)
	projID := seedProject(t, db)
	parent := seedTask(t, db, projID, "Parent", nil)
	child := seedTask(t, db, projID, "Child", &parent)

	svc := newService(t, db)
	ctx := context.Background()

	// Start parent
	reqParent := &UnifiedStartTimerRequest{UserID: userID, TaskID: &parent, Title: "Work on parent", Context: "task_detail"}
	if _, err := svc.StartTimer(ctx, reqParent); err != nil {
		t.Fatalf("start parent: %v", err)
	}
	// Start child -> should pause parent
	reqChild := &UnifiedStartTimerRequest{UserID: userID, TaskID: &child, Title: "Work on child", Context: "task_detail"}
	if _, err := svc.StartTimer(ctx, reqChild); err != nil {
		t.Fatalf("start child: %v", err)
	}

	st := getStatuses(t, db, userID, parent, child)
	if st[parent] != "paused" || st[child] != "running" {
		t.Fatalf("expected parent=paused, child=running, got: %+v", st)
	}
}

func TestFamilyMutex_ChildToParent(t *testing.T) {
	db := mustOpenTestDB(t)
	defer db.Close()
	userID := seedUser(t, db)
	projID := seedProject(t, db)
	parent := seedTask(t, db, projID, "Parent2", nil)
	child := seedTask(t, db, projID, "Child2", &parent)
	svc := newService(t, db)
	ctx := context.Background()

	// Start child
	reqChild := &UnifiedStartTimerRequest{UserID: userID, TaskID: &child, Title: "Work on child2", Context: "task_detail"}
	if _, err := svc.StartTimer(ctx, reqChild); err != nil {
		t.Fatalf("start child: %v", err)
	}
	// Start parent -> should pause child
	reqParent := &UnifiedStartTimerRequest{UserID: userID, TaskID: &parent, Title: "Work on parent2", Context: "task_detail"}
	if _, err := svc.StartTimer(ctx, reqParent); err != nil {
		t.Fatalf("start parent: %v", err)
	}

	st := getStatuses(t, db, userID, parent, child)
	if st[parent] != "running" || st[child] != "paused" {
		t.Fatalf("expected parent=running, child=paused, got: %+v", st)
	}
}

func TestFamilyMutex_SiblingChildSwitch(t *testing.T) {
	db := mustOpenTestDB(t)
	defer db.Close()
	userID := seedUser(t, db)
	projID := seedProject(t, db)
	parent := seedTask(t, db, projID, "Parent3", nil)
	c1 := seedTask(t, db, projID, "Child3-1", &parent)
	c2 := seedTask(t, db, projID, "Child3-2", &parent)
	svc := newService(t, db)
	ctx := context.Background()

	// Start child1 then child2 -> child1 paused, child2 running
	req1 := &UnifiedStartTimerRequest{UserID: userID, TaskID: &c1, Title: "work c1", Context: "task_detail"}
	if _, err := svc.StartTimer(ctx, req1); err != nil {
		t.Fatalf("start c1: %v", err)
	}
	req2 := &UnifiedStartTimerRequest{UserID: userID, TaskID: &c2, Title: "work c2", Context: "task_detail"}
	if _, err := svc.StartTimer(ctx, req2); err != nil {
		t.Fatalf("start c2: %v", err)
	}

	st := getStatuses(t, db, userID, c1, c2)
	if st[c1] != "paused" || st[c2] != "running" {
		t.Fatalf("expected c1=paused, c2=running, got: %+v", st)
	}
}
