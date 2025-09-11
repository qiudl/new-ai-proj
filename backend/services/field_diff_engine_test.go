package services

import (
	"ai-project-backend/models"
	"testing"
	"time"
)

func TestFieldDiffEngine_ComputeDetailedDiff(t *testing.T) {
	engine := NewFieldDiffEngine()

	// Create test tasks
	now := time.Now()
	oldTask := &models.Task{
		ID:               1,
		Title:            "Old Title",
		Description:      "Old Description",
		Status:           "todo",
		AssigneeID:       fieldDiffTestIntPtr(1),
		DueDate:          &now,
		EstimatedMinutes: 60,
		Priority:         "medium",
		ParentID:         fieldDiffTestIntPtr(2),
		ProjectID:        1,
	}

	newTask := &models.Task{
		ID:               1,
		Title:            "New Title",
		Description:      "New Description",
		Status:           "in_progress",
		AssigneeID:       fieldDiffTestIntPtr(3),
		DueDate:          &now,
		EstimatedMinutes: 120,
		Priority:         "high",
		ParentID:         fieldDiffTestIntPtr(4),
		ProjectID:        1,
	}

	t.Run("should detect title change", func(t *testing.T) {
		diff := engine.ComputeDetailedDiff(oldTask, newTask)
		
		if !diff.TitleChanged {
			t.Error("Expected TitleChanged to be true")
		}
		if diff.OldTitle != "Old Title" {
			t.Errorf("Expected OldTitle to be 'Old Title', got '%s'", diff.OldTitle)
		}
		if diff.NewTitle != "New Title" {
			t.Errorf("Expected NewTitle to be 'New Title', got '%s'", diff.NewTitle)
		}
		if !contains(diff.ChangedFields, "title") {
			t.Error("Expected 'title' in ChangedFields")
		}
	})

	t.Run("should detect status change", func(t *testing.T) {
		diff := engine.ComputeDetailedDiff(oldTask, newTask)
		
		if !diff.StatusChanged {
			t.Error("Expected StatusChanged to be true")
		}
		if diff.OldStatus != "todo" {
			t.Errorf("Expected OldStatus to be 'todo', got '%s'", diff.OldStatus)
		}
		if diff.NewStatus != "in_progress" {
			t.Errorf("Expected NewStatus to be 'in_progress', got '%s'", diff.NewStatus)
		}
	})

	t.Run("should detect assignee change", func(t *testing.T) {
		diff := engine.ComputeDetailedDiff(oldTask, newTask)
		
		if !diff.AssigneeChanged {
			t.Error("Expected AssigneeChanged to be true")
		}
		if diff.OldAssigneeID == nil || *diff.OldAssigneeID != 1 {
			t.Error("Expected OldAssigneeID to be 1")
		}
		if diff.NewAssigneeID == nil || *diff.NewAssigneeID != 3 {
			t.Error("Expected NewAssigneeID to be 3")
		}
	})

	t.Run("should detect priority change", func(t *testing.T) {
		diff := engine.ComputeDetailedDiff(oldTask, newTask)
		
		if !diff.PriorityChanged {
			t.Error("Expected PriorityChanged to be true")
		}
		if diff.OldPriority != "medium" {
			t.Errorf("Expected OldPriority to be 'medium', got '%s'", diff.OldPriority)
		}
		if diff.NewPriority != "high" {
			t.Errorf("Expected NewPriority to be 'high', got '%s'", diff.NewPriority)
		}
	})

	t.Run("should detect estimated time change", func(t *testing.T) {
		diff := engine.ComputeDetailedDiff(oldTask, newTask)
		
		if !diff.EstimatedTimeChanged {
			t.Error("Expected EstimatedTimeChanged to be true")
		}
		if diff.OldEstimatedMinutes == nil || *diff.OldEstimatedMinutes != 60 {
			t.Error("Expected OldEstimatedMinutes to be 60")
		}
		if diff.NewEstimatedMinutes == nil || *diff.NewEstimatedMinutes != 120 {
			t.Error("Expected NewEstimatedMinutes to be 120")
		}
	})

	t.Run("should detect parent change", func(t *testing.T) {
		diff := engine.ComputeDetailedDiff(oldTask, newTask)
		
		if !diff.ParentChanged {
			t.Error("Expected ParentChanged to be true")
		}
		if diff.OldParentID == nil || *diff.OldParentID != 2 {
			t.Error("Expected OldParentID to be 2")
		}
		if diff.NewParentID == nil || *diff.NewParentID != 4 {
			t.Error("Expected NewParentID to be 4")
		}
	})

	t.Run("should count total changes", func(t *testing.T) {
		diff := engine.ComputeDetailedDiff(oldTask, newTask)
		
		if diff.ChangeCount < 6 { // At least 6 changes detected above
			t.Errorf("Expected at least 6 changes, got %d", diff.ChangeCount)
		}
	})
}

func TestFieldDiffEngine_ComputeDetailedDiff_NoChanges(t *testing.T) {
	engine := NewFieldDiffEngine()

	task := &models.Task{
		ID:          1,
		Title:       "Same Title",
		Description: "Same Description",
		Status:      "todo",
		Priority:    "medium",
		ProjectID:   1,
	}

	diff := engine.ComputeDetailedDiff(task, task)

	if diff.TitleChanged {
		t.Error("Expected TitleChanged to be false")
	}
	if diff.DescriptionChanged {
		t.Error("Expected DescriptionChanged to be false")
	}
	if diff.StatusChanged {
		t.Error("Expected StatusChanged to be false")
	}
	if diff.ChangeCount != 0 {
		t.Errorf("Expected ChangeCount to be 0, got %d", diff.ChangeCount)
	}
	if len(diff.ChangedFields) != 0 {
		t.Errorf("Expected no ChangedFields, got %v", diff.ChangedFields)
	}
}

func TestFieldDiffEngine_ComputeDetailedDiff_EdgeCases(t *testing.T) {
	engine := NewFieldDiffEngine()

	t.Run("should handle nil tasks", func(t *testing.T) {
		// Test with nil old task (creation case)
		newTask := &models.Task{
			ID:     1,
			Title:  "New Task",
			Status: "todo",
		}
		
		diff := engine.ComputeDetailedDiff(nil, newTask)
		if diff == nil {
			t.Error("Expected non-nil diff for nil old task")
		}

		// Test with nil new task (deletion case)
		oldTask := &models.Task{
			ID:     1,
			Title:  "Old Task",
			Status: "todo",
		}
		
		diff = engine.ComputeDetailedDiff(oldTask, nil)
		if diff == nil {
			t.Error("Expected non-nil diff for nil new task")
		}
	})
}

// Helper functions for tests
func fieldDiffTestIntPtr(i int) *int {
	return &i
}

func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}