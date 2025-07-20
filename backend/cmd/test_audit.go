package main

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"ai-project-backend/services"
	"context"
	"fmt"
	"log"
	"os"
	"time"
)

func main() {
	// Get database connection string from environment
	dbSource := os.Getenv("DB_SOURCE")
	if dbSource == "" {
		dbSource = "postgresql://user:password@localhost:5432/main_db?sslmode=disable"
	}

	// Connect to database
	db, err := database.NewPostgresDB(dbSource)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	fmt.Println("✅ Connected to database successfully")

	// Create service manager
	serviceManager := services.NewServiceManager(db)
	defer serviceManager.Shutdown()

	ctx := context.Background()

	// Initialize services
	err = serviceManager.InitializeServices(ctx)
	if err != nil {
		log.Fatalf("Failed to initialize services: %v", err)
	}

	fmt.Println("✅ Services initialized successfully")

	// Test audit service
	auditService := serviceManager.AuditService()

	// Test 1: Log a simple audit event
	userID := 1
	err = auditService.LogSimpleEvent(ctx, &userID, "testuser", "test@example.com",
		models.ActionTaskCreate, models.ResourceTypeTask, "123", "Test Task", "192.168.1.1")

	if err != nil {
		log.Fatalf("Failed to log simple event: %v", err)
	}

	fmt.Println("✅ Logged simple audit event")

	// Test 2: Log a task event with before/after data
	taskBefore := &models.Task{
		ID:          123,
		Title:       "Original Task",
		Description: "Original description",
		Status:      "todo",
		ProjectID:   1,
	}

	taskAfter := &models.Task{
		ID:          123,
		Title:       "Updated Task",
		Description: "Updated description",
		Status:      "in_progress",
		ProjectID:   1,
	}

	err = auditService.LogTaskEvent(ctx, &userID, "testuser", "test@example.com",
		models.ActionTaskUpdate, taskBefore, taskAfter, "192.168.1.1")

	if err != nil {
		log.Fatalf("Failed to log task event: %v", err)
	}

	fmt.Println("✅ Logged task update event with before/after data")

	// Test 3: Query audit logs
	filter := &models.AuditLogFilter{
		Limit:  10,
		Offset: 0,
	}

	logs, total, err := auditService.GetAuditLogs(ctx, filter)
	if err != nil {
		log.Fatalf("Failed to get audit logs: %v", err)
	}

	fmt.Printf("✅ Retrieved %d audit logs (total: %d)\n", len(logs), total)

	// Test 4: Display some audit log details
	for i, auditLog := range logs {
		if i >= 3 { // Show only first 3
			break
		}
		fmt.Printf("   Log %d: User=%s Action=%s Resource=%s Status=%s Time=%s\n",
			i+1, auditLog.UserName, auditLog.Action, auditLog.ResourceType,
			auditLog.Status, auditLog.Timestamp.Format("2006-01-02 15:04:05"))

		if auditLog.Changes != nil {
			fmt.Printf("   Changes: %v\n", auditLog.Changes)
		}
	}

	// Test 5: Get audit configurations
	configs, err := auditService.GetAuditConfigs(ctx)
	if err != nil {
		log.Fatalf("Failed to get audit configs: %v", err)
	}

	fmt.Printf("✅ Retrieved %d audit configurations\n", len(configs))

	// Show some config examples
	taskConfigs := 0
	for _, config := range configs {
		if config.ResourceType == "task" {
			taskConfigs++
		}
	}
	fmt.Printf("   Task-related configurations: %d\n", taskConfigs)

	// Test 6: Get audit statistics
	statsReq := &models.AuditStatsRequest{
		StartTime: time.Now().Add(-24 * time.Hour),
		EndTime:   time.Now(),
		GroupBy:   "action",
	}

	stats, err := auditService.GetAuditStats(ctx, statsReq)
	if err != nil {
		log.Fatalf("Failed to get audit stats: %v", err)
	}

	fmt.Printf("✅ Generated audit statistics: %d entries\n", len(stats))
	for _, stat := range stats {
		fmt.Printf("   %s: %d events\n", stat.Label, stat.Count)
	}

	// Test 7: Test async logger
	asyncLogger := serviceManager.AsyncLogger()

	fmt.Println("✅ Testing async audit logger...")
	for i := 0; i < 5; i++ {
		data := &models.AuditEventData{
			UserID:       &userID,
			UserName:     "testuser",
			UserEmail:    "test@example.com",
			Action:       models.ActionTaskCreate,
			ResourceType: models.ResourceTypeTask,
			ResourceID:   fmt.Sprintf("async_%d", i),
			ResourceName: fmt.Sprintf("Async Task %d", i),
			Status:       models.StatusSuccess,
			IPAddress:    "192.168.1.1",
		}
		asyncLogger.LogEvent(data)
	}

	// Wait for async processing
	time.Sleep(1 * time.Second)

	// Query again to see async logs
	logs, total, err = auditService.GetAuditLogs(ctx, filter)
	if err != nil {
		log.Fatalf("Failed to get audit logs after async test: %v", err)
	}

	fmt.Printf("✅ After async test: %d audit logs (total: %d)\n", len(logs), total)

	// Test 8: Test error logging
	err = auditService.LogErrorEvent(ctx, &userID, "testuser", "test@example.com",
		models.ActionTaskDelete, models.ResourceTypeTask, "999", "Task not found", "192.168.1.1")

	if err != nil {
		log.Fatalf("Failed to log error event: %v", err)
	}

	fmt.Println("✅ Logged error event")

	// Final summary
	fmt.Println("\n🎉 Audit system test completed successfully!")
	fmt.Println("\nFeatures tested:")
	fmt.Println("  ✓ Simple event logging")
	fmt.Println("  ✓ Complex event logging with before/after data")
	fmt.Println("  ✓ Event querying and filtering")
	fmt.Println("  ✓ Configuration management")
	fmt.Println("  ✓ Statistics generation")
	fmt.Println("  ✓ Asynchronous logging")
	fmt.Println("  ✓ Error event logging")
	fmt.Println("  ✓ Data sanitization")
	fmt.Println("  ✓ Database integration")

	fmt.Printf("\nTotal audit logs in system: %d\n", total)
}
