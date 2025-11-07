package database

import (
	"ai-project-backend/models"
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// MockTaskRepository implements TaskRepository for testing
type MockTaskRepository struct {
	tasks []models.Task
}

func (m *MockTaskRepository) SearchParentTasks(ctx context.Context, projectID int, keyword string, excludeTaskID *int, maxLevel int, limit, offset int) ([]*models.Task, int, error) {
	var results []*models.Task

	for _, task := range m.tasks {
		// Filter by project
		if task.ProjectID != projectID {
			continue
		}

		// Filter by keyword
		if keyword != "" {
			titleMatch := contains(task.Title, keyword)
			descMatch := task.Description != nil && contains(*task.Description, keyword)
			if !titleMatch && !descMatch {
				continue
			}
		}

		// Filter by exclude task ID
		if excludeTaskID != nil && task.ID == *excludeTaskID {
			continue
		}

		// Filter by max level
		if task.TaskLevel > maxLevel {
			continue
		}

		// Create a copy to avoid pointer issues
		taskCopy := task
		results = append(results, &taskCopy)
	}

	// Apply pagination
	total := len(results)
	start := offset
	end := offset + limit

	if start >= total {
		return []*models.Task{}, total, nil
	}
	if end > total {
		end = total
	}

	return results[start:end], total, nil
}

func (m *MockTaskRepository) CheckCircularDependency(ctx context.Context, taskID int, potentialParentID int) (bool, error) {
	// Simple circular dependency check for testing
	if taskID == potentialParentID {
		return true, nil
	}

	// Check if potentialParentID is a descendant of taskID
	visited := make(map[int]bool)
	return m.isDescendant(taskID, potentialParentID, visited), nil
}

func (m *MockTaskRepository) isDescendant(ancestorID, taskID int, visited map[int]bool) bool {
	if visited[taskID] {
		return false // Prevent infinite loops
	}
	visited[taskID] = true

	for _, task := range m.tasks {
		if task.ID == taskID && task.ParentID != nil {
			if *task.ParentID == ancestorID {
				return true
			}
			return m.isDescendant(ancestorID, *task.ParentID, visited)
		}
	}
	return false
}

// Helper function to check if a string contains a substring (case-insensitive)
func contains(str, substr string) bool {
	return len(str) >= len(substr) &&
		str[:len(substr)] == substr ||
		(len(str) > len(substr) && contains(str[1:], substr))
}

// Stub implementations for other required methods
func (m *MockTaskRepository) Create(ctx context.Context, task *models.Task) (*models.Task, error) {
	return nil, nil
}
func (m *MockTaskRepository) GetByID(ctx context.Context, id int) (*models.Task, error) {
	return nil, nil
}
func (m *MockTaskRepository) GetByProjectID(ctx context.Context, projectID int, limit, offset int) ([]*models.Task, int, error) {
	return nil, 0, nil
}
func (m *MockTaskRepository) GetAll(ctx context.Context, limit, offset int) ([]*models.Task, int, error) {
	return nil, 0, nil
}
func (m *MockTaskRepository) Update(ctx context.Context, task *models.Task) (*models.Task, error) {
	return nil, nil
}
func (m *MockTaskRepository) Delete(ctx context.Context, id int) error        { return nil }
func (m *MockTaskRepository) BulkDelete(ctx context.Context, ids []int) error { return nil }
func (m *MockTaskRepository) BulkCreate(ctx context.Context, tasks []*models.Task) ([]*models.Task, error) {
	return nil, nil
}
func (m *MockTaskRepository) UpdateStatus(ctx context.Context, id int, status string) error {
	return nil
}
func (m *MockTaskRepository) GetByStatus(ctx context.Context, status string, limit, offset int) ([]*models.Task, int, error) {
	return nil, 0, nil
}
func (m *MockTaskRepository) GetChildren(ctx context.Context, parentID int) ([]*models.Task, error) {
	return nil, nil
}
func (m *MockTaskRepository) GetTaskTree(ctx context.Context, projectID int, sortBy, sortOrder string) ([]*models.HierarchicalTask, error) {
	return nil, nil
}
func (m *MockTaskRepository) GetRootTasks(ctx context.Context, projectID int, limit, offset int) ([]*models.Task, int, error) {
	return nil, 0, nil
}
func (m *MockTaskRepository) CreateTaskUpdate(ctx context.Context, update *models.TaskUpdate) error {
	return nil
}
func (m *MockTaskRepository) GetTaskUpdates(ctx context.Context, taskID int, limit, offset int) ([]*models.TaskUpdate, int, error) {
	return nil, 0, nil
}
func (m *MockTaskRepository) UpdateTaskUpdateNotes(ctx context.Context, updateID int, notes string) error {
	return nil
}
func (m *MockTaskRepository) DeleteTaskUpdate(ctx context.Context, updateID int) error { return nil }
func (m *MockTaskRepository) CreateTimelineEvent(ctx context.Context, event *models.TimelineEvent) error {
	return nil
}
func (m *MockTaskRepository) GetTaskTimeline(ctx context.Context, taskID int, limit, offset int) ([]*models.TimelineEvent, int, error) {
	return nil, 0, nil
}
func (m *MockTaskRepository) GetProjectTimeline(ctx context.Context, projectID int, limit, offset int) ([]*models.TimelineEvent, int, error) {
	return nil, 0, nil
}

func TestSearchParentTasks(t *testing.T) {
	ctx := context.Background()

	// Create test data
	level0 := 0
	level1 := 1
	level2 := 2
	level3 := 3

	parentID1 := 1
	parentID2 := 2

	testTasks := []models.Task{
		{ID: 1, ProjectID: 1, Title: "Root Task", Description: stringPtr("Root level task"), TaskLevel: level0},
		{ID: 2, ProjectID: 1, Title: "Design Task", Description: stringPtr("UI Design work"), TaskLevel: level1, ParentID: &parentID1},
		{ID: 3, ProjectID: 1, Title: "Implementation", Description: stringPtr("Code implementation"), TaskLevel: level2, ParentID: &parentID2},
		{ID: 4, ProjectID: 1, Title: "Deep Task", Description: stringPtr("Very deep task"), TaskLevel: level3, ParentID: &parentID2},
		{ID: 5, ProjectID: 2, Title: "Other Project Task", Description: stringPtr("Different project"), TaskLevel: level0},
	}

	repo := &MockTaskRepository{tasks: testTasks}

	t.Run("Search by keyword", func(t *testing.T) {
		results, total, err := repo.SearchParentTasks(ctx, 1, "Design", nil, 2, 10, 0)

		require.NoError(t, err)
		assert.Equal(t, 1, total)
		assert.Equal(t, 1, len(results))
		assert.Equal(t, "Design Task", results[0].Title)
	})

	t.Run("Filter by project", func(t *testing.T) {
		results, total, err := repo.SearchParentTasks(ctx, 2, "", nil, 3, 10, 0)

		require.NoError(t, err)
		assert.Equal(t, 1, total)
		assert.Equal(t, "Other Project Task", results[0].Title)
	})

	t.Run("Filter by max level", func(t *testing.T) {
		results, total, err := repo.SearchParentTasks(ctx, 1, "", nil, 1, 10, 0)

		require.NoError(t, err)
		assert.Equal(t, 2, total) // Only level 0 and 1 tasks

		for _, result := range results {
			assert.LessOrEqual(t, result.TaskLevel, 1)
		}
	})

	t.Run("Exclude task ID", func(t *testing.T) {
		excludeID := 2
		results, total, err := repo.SearchParentTasks(ctx, 1, "", &excludeID, 3, 10, 0)

		require.NoError(t, err)
		assert.Equal(t, 3, total) // All tasks except ID 2

		for _, result := range results {
			assert.NotEqual(t, 2, result.ID)
		}
	})

	t.Run("Pagination", func(t *testing.T) {
		// Get first page
		results, total, err := repo.SearchParentTasks(ctx, 1, "", nil, 3, 2, 0)
		require.NoError(t, err)
		assert.Equal(t, 4, total)
		assert.Equal(t, 2, len(results))

		// Get second page
		results, total, err = repo.SearchParentTasks(ctx, 1, "", nil, 3, 2, 2)
		require.NoError(t, err)
		assert.Equal(t, 4, total)
		assert.Equal(t, 2, len(results))
	})
}

func TestCheckCircularDependency(t *testing.T) {
	ctx := context.Background()

	parentID1 := 1
	parentID2 := 2
	parentID3 := 3

	testTasks := []models.Task{
		{ID: 1, ProjectID: 1, Title: "Root", ParentID: nil},
		{ID: 2, ProjectID: 1, Title: "Child of 1", ParentID: &parentID1},
		{ID: 3, ProjectID: 1, Title: "Child of 2", ParentID: &parentID2},
		{ID: 4, ProjectID: 1, Title: "Child of 3", ParentID: &parentID3},
	}

	repo := &MockTaskRepository{tasks: testTasks}

	t.Run("Self reference", func(t *testing.T) {
		hasCircular, err := repo.CheckCircularDependency(ctx, 1, 1)
		require.NoError(t, err)
		assert.True(t, hasCircular)
	})

	t.Run("Direct circular dependency", func(t *testing.T) {
		// Task 1 -> Task 2, trying to make Task 2 -> Task 1
		hasCircular, err := repo.CheckCircularDependency(ctx, 1, 2)
		require.NoError(t, err)
		assert.True(t, hasCircular)
	})

	t.Run("Indirect circular dependency", func(t *testing.T) {
		// Task 1 -> Task 2 -> Task 3, trying to make Task 3 -> Task 1
		hasCircular, err := repo.CheckCircularDependency(ctx, 1, 3)
		require.NoError(t, err)
		assert.True(t, hasCircular)
	})

	t.Run("No circular dependency", func(t *testing.T) {
		// Task 4 -> Task 1 (no cycle)
		hasCircular, err := repo.CheckCircularDependency(ctx, 4, 1)
		require.NoError(t, err)
		assert.False(t, hasCircular)
	})

	t.Run("Root task assignment", func(t *testing.T) {
		// Any task can be made root (parent = 0)
		hasCircular, err := repo.CheckCircularDependency(ctx, 2, 0)
		require.NoError(t, err)
		assert.False(t, hasCircular)
	})
}

func TestSearchParentTasks_EdgeCases(t *testing.T) {
	ctx := context.Background()
	repo := &MockTaskRepository{tasks: []models.Task{}}

	t.Run("Empty database", func(t *testing.T) {
		results, total, err := repo.SearchParentTasks(ctx, 1, "", nil, 3, 10, 0)

		require.NoError(t, err)
		assert.Equal(t, 0, total)
		assert.Equal(t, 0, len(results))
	})

	t.Run("Invalid offset", func(t *testing.T) {
		results, total, err := repo.SearchParentTasks(ctx, 1, "", nil, 3, 10, 100)

		require.NoError(t, err)
		assert.Equal(t, 0, total)
		assert.Equal(t, 0, len(results))
	})
}
