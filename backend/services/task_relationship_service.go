package services

import (
	"database/sql"
	"fmt"
	"time"

	"new-ai-proj/backend/models"
)

// TaskRelationshipService defines the interface for task relationship operations
type TaskRelationshipService interface {
	// Basic CRUD operations
	CreateRelationship(sourceTaskID, targetTaskID int, relationshipType, status string, createdBy int, metadata models.CustomFields) (*models.TaskRelationship, error)
	GetTaskRelationships(taskID int, relationshipType string) ([]models.TaskRelationship, error)
	UpdateRelationship(relationshipID int, status string, metadata models.CustomFields) (*models.TaskRelationship, error)
	DeleteRelationship(relationshipID int) error
	
	// Advanced relationship operations
	GetTaskWithAllRelationships(taskID int) (*models.TaskWithRelationships, error)
	CheckForCycles(sourceTaskID, targetTaskID int, relationshipType string) (bool, error)
	
	// Parallel development support
	GetParallelDevelopmentGroups(projectID *int) ([]models.ParallelDevelopmentGroup, error)
	ValidateParallelTasksCanStart(taskIDs []int) (map[string]interface{}, error)
	GenerateTaskDependencyGraph(projectID, rootTaskID *int) (*models.TaskDependencyGraph, error)
	
	// Enhanced dependency graph features
	GetTaskDependencyGraphWithOptions(projectID, rootTaskID *int, options models.DependencyGraphOptions) (*models.TaskDependencyGraph, error)
	AnalyzeDependencyCycles(projectID *int) (*models.CycleAnalysisResult, error)
	GetCriticalPath(projectID *int, startTaskID, endTaskID *int) (*models.CriticalPathResult, error)
	
	// Enhanced parallel workflow operations
	GetParallelWorkflowStages(projectID *int) ([]models.WorkflowStage, error)
	InitiateParallelExecution(request models.ParallelExecutionRequest) (*models.ParallelExecutionStatus, error)
	GetParallelExecutionStatus(executionID string) (*models.ParallelExecutionStatus, error)
	SynchronizeParallelTasks(projectID *int, parallelGroupID string) (*models.ParallelSyncResult, error)
	
	// Batch operations
	BulkCreateRelationships(requests []models.TaskRelationshipRequest, createdBy int) ([]models.TaskRelationship, []models.BatchTaskError, error)
}

// taskRelationshipService implements TaskRelationshipService
type taskRelationshipService struct {
	db *sql.DB
}

// NewTaskRelationshipService creates a new task relationship service
func NewTaskRelationshipService(db *sql.DB) TaskRelationshipService {
	return &taskRelationshipService{
		db: db,
	}
}

// CreateRelationship creates a new task relationship
func (s *taskRelationshipService) CreateRelationship(sourceTaskID, targetTaskID int, relationshipType, status string, createdBy int, metadata models.CustomFields) (*models.TaskRelationship, error) {
	// Validate that both tasks exist
	if err := s.validateTasksExist(sourceTaskID, targetTaskID); err != nil {
		return nil, fmt.Errorf("task validation failed: %w", err)
	}
	
	// Prevent self-relationships
	if sourceTaskID == targetTaskID {
		return nil, fmt.Errorf("task cannot have a relationship with itself")
	}
	
	// Check for existing relationship
	if exists, err := s.relationshipExists(sourceTaskID, targetTaskID, relationshipType); err != nil {
		return nil, fmt.Errorf("failed to check existing relationship: %w", err)
	} else if exists {
		return nil, fmt.Errorf("relationship already exists between tasks %d and %d", sourceTaskID, targetTaskID)
	}
	
	// Set default status if not provided
	if status == "" {
		status = "active"
	}
	
	// Create relationship
	query := `
		INSERT INTO task_relationships (
			source_task_id, target_task_id, relationship_type, 
			relationship_status, created_by, metadata, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, source_task_id, target_task_id, relationship_type, 
				  relationship_status, created_by, metadata, created_at, updated_at`
	
	now := time.Now()
	var relationship models.TaskRelationship
	
	err := s.db.QueryRow(
		query, sourceTaskID, targetTaskID, relationshipType, 
		status, createdBy, metadata, now, now,
	).Scan(
		&relationship.ID, &relationship.SourceTaskID, &relationship.TargetTaskID,
		&relationship.RelationshipType, &relationship.RelationshipStatus,
		&relationship.CreatedBy, &relationship.Metadata,
		&relationship.CreatedAt, &relationship.UpdatedAt,
	)
	
	if err != nil {
		return nil, fmt.Errorf("failed to create relationship: %w", err)
	}
	
	// Add related task information
	if err := s.enrichRelationshipInfo(&relationship); err != nil {
		// Log warning but don't fail the operation
		fmt.Printf("Warning: failed to enrich relationship info: %v\n", err)
	}
	
	return &relationship, nil
}

// GetTaskRelationships retrieves all relationships for a specific task
func (s *taskRelationshipService) GetTaskRelationships(taskID int, relationshipType string) ([]models.TaskRelationship, error) {
	baseQuery := `
		SELECT tr.id, tr.source_task_id, tr.target_task_id, tr.relationship_type,
			   tr.relationship_status, tr.created_by, tr.metadata, tr.created_at, tr.updated_at,
			   st.title as source_task_title, tt.title as target_task_title,
			   u.username as created_by_username
		FROM task_relationships tr
		LEFT JOIN tasks st ON tr.source_task_id = st.id
		LEFT JOIN tasks tt ON tr.target_task_id = tt.id
		LEFT JOIN users u ON tr.created_by = u.id
		WHERE (tr.source_task_id = $1 OR tr.target_task_id = $1)
		AND tr.deleted_at IS NULL`
	
	args := []interface{}{taskID}
	
	if relationshipType != "" {
		baseQuery += " AND tr.relationship_type = $2"
		args = append(args, relationshipType)
	}
	
	baseQuery += " ORDER BY tr.created_at DESC"
	
	rows, err := s.db.Query(baseQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query relationships: %w", err)
	}
	defer rows.Close()
	
	var relationships []models.TaskRelationship
	for rows.Next() {
		var rel models.TaskRelationship
		err := rows.Scan(
			&rel.ID, &rel.SourceTaskID, &rel.TargetTaskID, &rel.RelationshipType,
			&rel.RelationshipStatus, &rel.CreatedBy, &rel.Metadata,
			&rel.CreatedAt, &rel.UpdatedAt,
			&rel.SourceTaskTitle, &rel.TargetTaskTitle, &rel.CreatedByUsername,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan relationship: %w", err)
		}
		relationships = append(relationships, rel)
	}
	
	return relationships, nil
}

// UpdateRelationship updates an existing task relationship
func (s *taskRelationshipService) UpdateRelationship(relationshipID int, status string, metadata models.CustomFields) (*models.TaskRelationship, error) {
	query := `
		UPDATE task_relationships 
		SET relationship_status = $1, metadata = $2, updated_at = $3
		WHERE id = $4 AND deleted_at IS NULL
		RETURNING id, source_task_id, target_task_id, relationship_type, 
				  relationship_status, created_by, metadata, created_at, updated_at`
	
	var relationship models.TaskRelationship
	err := s.db.QueryRow(query, status, metadata, time.Now(), relationshipID).Scan(
		&relationship.ID, &relationship.SourceTaskID, &relationship.TargetTaskID,
		&relationship.RelationshipType, &relationship.RelationshipStatus,
		&relationship.CreatedBy, &relationship.Metadata,
		&relationship.CreatedAt, &relationship.UpdatedAt,
	)
	
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("relationship with ID %d not found", relationshipID)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to update relationship: %w", err)
	}
	
	// Enrich with related task information
	if err := s.enrichRelationshipInfo(&relationship); err != nil {
		fmt.Printf("Warning: failed to enrich relationship info: %v\n", err)
	}
	
	return &relationship, nil
}

// DeleteRelationship soft deletes a task relationship
func (s *taskRelationshipService) DeleteRelationship(relationshipID int) error {
	query := `
		UPDATE task_relationships 
		SET deleted_at = $1 
		WHERE id = $2 AND deleted_at IS NULL`
	
	result, err := s.db.Exec(query, time.Now(), relationshipID)
	if err != nil {
		return fmt.Errorf("failed to delete relationship: %w", err)
	}
	
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get affected rows: %w", err)
	}
	
	if rowsAffected == 0 {
		return fmt.Errorf("relationship with ID %d not found", relationshipID)
	}
	
	return nil
}

// GetTaskWithAllRelationships retrieves a task with all its relationships
func (s *taskRelationshipService) GetTaskWithAllRelationships(taskID int) (*models.TaskWithRelationships, error) {
	// First get the task
	task, err := s.getTaskByID(taskID)
	if err != nil {
		return nil, fmt.Errorf("failed to get task: %w", err)
	}
	
	// Get all relationships
	relationships, err := s.GetTaskRelationships(taskID, "")
	if err != nil {
		return nil, fmt.Errorf("failed to get relationships: %w", err)
	}
	
	// Organize relationships by type
	result := &models.TaskWithRelationships{
		Task: *task,
	}
	
	for _, rel := range relationships {
		switch rel.RelationshipType {
		case "depends_on":
			if rel.SourceTaskID == taskID {
				result.Dependencies = append(result.Dependencies, rel)
			} else {
				result.Dependents = append(result.Dependents, rel)
			}
		case "blocks":
			if rel.SourceTaskID == taskID {
				result.Blocking = append(result.Blocking, rel)
			} else {
				result.BlockedBy = append(result.BlockedBy, rel)
			}
		case "parallel_with":
			result.ParallelTasks = append(result.ParallelTasks, rel)
		case "related_to":
			result.RelatedTasks = append(result.RelatedTasks, rel)
		}
	}
	
	// Get status history
	statusHistory, err := s.getTaskStatusHistory(taskID)
	if err != nil {
		fmt.Printf("Warning: failed to get status history: %v\n", err)
	} else {
		result.StatusHistory = statusHistory
	}
	
	return result, nil
}

// CheckForCycles detects circular dependencies
func (s *taskRelationshipService) CheckForCycles(sourceTaskID, targetTaskID int, relationshipType string) (bool, error) {
	// Only check for cycles in dependency-type relationships
	if relationshipType != "depends_on" && relationshipType != "blocks" {
		return false, nil
	}
	
	visited := make(map[int]bool)
	recStack := make(map[int]bool)
	
	return s.hasCycleDFS(targetTaskID, sourceTaskID, relationshipType, visited, recStack)
}

// GetParallelDevelopmentGroups retrieves parallel development groups
func (s *taskRelationshipService) GetParallelDevelopmentGroups(projectID *int) ([]models.ParallelDevelopmentGroup, error) {
	query := `
		SELECT 
			tsh.parallel_group_id,
			COUNT(*) as total_tasks,
			COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_tasks,
			COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) as in_progress_tasks,
			COUNT(CASE WHEN t.status = 'todo' THEN 1 END) as todo_tasks,
			MAX(tsh.change_timestamp) as last_update
		FROM task_status_history tsh
		JOIN tasks t ON tsh.task_id = t.id
		WHERE tsh.parallel_group_id IS NOT NULL
		AND t.deleted_at IS NULL
		AND tsh.id = (
			SELECT MAX(id) 
			FROM task_status_history tsh2 
			WHERE tsh2.task_id = tsh.task_id
		)`
	
	args := []interface{}{}
	if projectID != nil {
		query += " AND t.project_id = $1"
		args = append(args, *projectID)
	}
	
	query += " GROUP BY tsh.parallel_group_id ORDER BY last_update DESC"
	
	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query parallel groups: %w", err)
	}
	defer rows.Close()
	
	var groups []models.ParallelDevelopmentGroup
	for rows.Next() {
		var group models.ParallelDevelopmentGroup
		var lastUpdate time.Time
		
		err := rows.Scan(
			&group.GroupID, &group.TotalTasks, &group.CompletedTasks,
			&group.InProgressTasks, &group.TodoTasks, &lastUpdate,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan parallel group: %w", err)
		}
		
		group.GroupName = fmt.Sprintf("Parallel Group %s", group.GroupID)
		group.LastUpdate = lastUpdate
		group.CompletionPercent = float64(group.CompletedTasks) / float64(group.TotalTasks) * 100
		group.CanStartParallel = group.TodoTasks > 0
		
		// Get tasks in this group
		tasks, err := s.getTasksInParallelGroup(group.GroupID)
		if err != nil {
			fmt.Printf("Warning: failed to get tasks for group %s: %v\n", group.GroupID, err)
		} else {
			group.Tasks = tasks
		}
		
		groups = append(groups, group)
	}
	
	return groups, nil
}

// ValidateParallelTasksCanStart checks if parallel tasks can be started
func (s *taskRelationshipService) ValidateParallelTasksCanStart(taskIDs []int) (map[string]interface{}, error) {
	result := map[string]interface{}{
		"can_start":     true,
		"blocked_tasks": []int{},
		"dependencies":  []map[string]interface{}{},
		"warnings":      []string{},
	}
	
	var blockedTasks []int
	var dependencies []map[string]interface{}
	var warnings []string
	
	for _, taskID := range taskIDs {
		// Check if task has unresolved dependencies
		dependencies_count, err := s.getUnresolvedDependenciesCount(taskID)
		if err != nil {
			warnings = append(warnings, fmt.Sprintf("Failed to check dependencies for task %d: %v", taskID, err))
			continue
		}
		
		if dependencies_count > 0 {
			blockedTasks = append(blockedTasks, taskID)
			dependencies = append(dependencies, map[string]interface{}{
				"task_id":            taskID,
				"unresolved_deps":    dependencies_count,
			})
		}
	}
	
	result["can_start"] = len(blockedTasks) == 0
	result["blocked_tasks"] = blockedTasks
	result["dependencies"] = dependencies
	result["warnings"] = warnings
	
	return result, nil
}

// GenerateTaskDependencyGraph creates a dependency graph for visualization
func (s *taskRelationshipService) GenerateTaskDependencyGraph(projectID, rootTaskID *int) (*models.TaskDependencyGraph, error) {
	var nodes []models.GraphNode
	var edges []models.GraphEdge
	
	// Get tasks to include in graph
	tasks, err := s.getTasksForGraph(projectID, rootTaskID)
	if err != nil {
		return nil, fmt.Errorf("failed to get tasks for graph: %w", err)
	}
	
	// Create nodes
	for _, task := range tasks {
		node := models.GraphNode{
			ID:       task.ID,
			Title:    task.Title,
			Status:   task.Status,
			NodeType: "task",
			Level:    task.TaskLevel,
			CanStart: true, // Will be updated based on dependencies
			IsBlocked: false,
		}
		
		// Set coordinates (basic layout algorithm)
		node.Coordinates.X = (task.ID % 10) * 100
		node.Coordinates.Y = task.TaskLevel * 80
		
		nodes = append(nodes, node)
	}
	
	// Get relationships and create edges
	relationships, err := s.getAllRelationshipsForTasks(extractTaskIDs(tasks))
	if err != nil {
		return nil, fmt.Errorf("failed to get relationships: %w", err)
	}
	
	for _, rel := range relationships {
		edge := models.GraphEdge{
			Source:           rel.SourceTaskID,
			Target:           rel.TargetTaskID,
			RelationshipType: rel.RelationshipType,
			Weight:           1,
		}
		
		// Set edge style based on relationship type
		switch rel.RelationshipType {
		case "depends_on", "blocks":
			edge.EdgeStyle = "solid"
		case "parallel_with":
			edge.EdgeStyle = "dashed"
		default:
			edge.EdgeStyle = "dotted"
		}
		
		edges = append(edges, edge)
	}
	
	// Update node blocked status based on dependencies
	s.updateNodeBlockedStatus(nodes, edges)
	
	return &models.TaskDependencyGraph{
		Nodes: nodes,
		Edges: edges,
	}, nil
}

// BulkCreateRelationships creates multiple relationships in batch
func (s *taskRelationshipService) BulkCreateRelationships(requests []models.TaskRelationshipRequest, createdBy int) ([]models.TaskRelationship, []models.BatchTaskError, error) {
	var relationships []models.TaskRelationship
	var errors []models.BatchTaskError
	
	// Begin transaction
	tx, err := s.db.Begin()
	if err != nil {
		return nil, nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()
	
	for i, req := range requests {
		rel, err := s.createRelationshipInTx(tx, req.SourceTaskID, req.TargetTaskID, req.RelationshipType, req.RelationshipStatus, createdBy, req.Metadata)
		if err != nil {
			errors = append(errors, models.BatchTaskError{
				TaskID: req.SourceTaskID, // Use source task ID as reference
				Error:  err.Error(),
			})
			continue
		}
		relationships = append(relationships, *rel)
	}
	
	if err := tx.Commit(); err != nil {
		return nil, nil, fmt.Errorf("failed to commit transaction: %w", err)
	}
	
	return relationships, errors, nil
}

// Helper methods

func (s *taskRelationshipService) validateTasksExist(sourceTaskID, targetTaskID int) error {
	query := `SELECT COUNT(*) FROM tasks WHERE id IN ($1, $2) AND deleted_at IS NULL`
	var count int
	err := s.db.QueryRow(query, sourceTaskID, targetTaskID).Scan(&count)
	if err != nil {
		return fmt.Errorf("failed to validate tasks: %w", err)
	}
	if count != 2 {
		return fmt.Errorf("one or both tasks do not exist")
	}
	return nil
}

func (s *taskRelationshipService) relationshipExists(sourceTaskID, targetTaskID int, relationshipType string) (bool, error) {
	query := `
		SELECT COUNT(*) FROM task_relationships 
		WHERE source_task_id = $1 AND target_task_id = $2 AND relationship_type = $3 
		AND deleted_at IS NULL`
	
	var count int
	err := s.db.QueryRow(query, sourceTaskID, targetTaskID, relationshipType).Scan(&count)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func (s *taskRelationshipService) enrichRelationshipInfo(relationship *models.TaskRelationship) error {
	query := `
		SELECT st.title, tt.title, u.username
		FROM task_relationships tr
		LEFT JOIN tasks st ON tr.source_task_id = st.id
		LEFT JOIN tasks tt ON tr.target_task_id = tt.id
		LEFT JOIN users u ON tr.created_by = u.id
		WHERE tr.id = $1`
	
	return s.db.QueryRow(query, relationship.ID).Scan(
		&relationship.SourceTaskTitle,
		&relationship.TargetTaskTitle,
		&relationship.CreatedByUsername,
	)
}

func (s *taskRelationshipService) getTaskByID(taskID int) (*models.Task, error) {
	query := `
		SELECT id, project_id, title, description, status, assignee_id, due_date,
			   custom_fields, parent_id, task_level, sort_order, total_time_seconds,
			   dependencies, estimated_hours, priority, tags, created_at, updated_at
		FROM tasks WHERE id = $1 AND deleted_at IS NULL`
	
	var task models.Task
	err := s.db.QueryRow(query, taskID).Scan(
		&task.ID, &task.ProjectID, &task.Title, &task.Description, &task.Status,
		&task.AssigneeID, &task.DueDate, &task.CustomFields, &task.ParentID,
		&task.TaskLevel, &task.SortOrder, &task.TotalTimeSeconds,
		&task.Dependencies, &task.EstimatedHours, &task.Priority, &task.Tags,
		&task.CreatedAt, &task.UpdatedAt,
	)
	
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("task with ID %d not found", taskID)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get task: %w", err)
	}
	
	return &task, nil
}

func (s *taskRelationshipService) getTaskStatusHistory(taskID int) ([]models.TaskStatusHistory, error) {
	query := `
		SELECT id, task_id, old_status, new_status, change_reason, change_type,
			   changed_by, related_task_ids, workflow_stage, parallel_group_id,
			   dependency_resolved, metadata, change_timestamp, created_at
		FROM task_status_history 
		WHERE task_id = $1 
		ORDER BY change_timestamp DESC`
	
	rows, err := s.db.Query(query, taskID)
	if err != nil {
		return nil, fmt.Errorf("failed to query status history: %w", err)
	}
	defer rows.Close()
	
	var history []models.TaskStatusHistory
	for rows.Next() {
		var h models.TaskStatusHistory
		err := rows.Scan(
			&h.ID, &h.TaskID, &h.OldStatus, &h.NewStatus, &h.ChangeReason,
			&h.ChangeType, &h.ChangedBy, &h.RelatedTaskIDs, &h.WorkflowStage,
			&h.ParallelGroupID, &h.DependencyResolved, &h.Metadata,
			&h.ChangeTimestamp, &h.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan status history: %w", err)
		}
		history = append(history, h)
	}
	
	return history, nil
}

func (s *taskRelationshipService) hasCycleDFS(currentTask, targetTask int, relationshipType string, visited, recStack map[int]bool) (bool, error) {
	if currentTask == targetTask {
		return true, nil
	}
	
	visited[currentTask] = true
	recStack[currentTask] = true
	
	// Get next tasks in the dependency chain
	query := `
		SELECT target_task_id FROM task_relationships 
		WHERE source_task_id = $1 AND relationship_type = $2 AND deleted_at IS NULL`
	
	rows, err := s.db.Query(query, currentTask, relationshipType)
	if err != nil {
		return false, err
	}
	defer rows.Close()
	
	for rows.Next() {
		var nextTaskID int
		if err := rows.Scan(&nextTaskID); err != nil {
			return false, err
		}
		
		if !visited[nextTaskID] {
			if hasCycle, err := s.hasCycleDFS(nextTaskID, targetTask, relationshipType, visited, recStack); err != nil {
				return false, err
			} else if hasCycle {
				return true, nil
			}
		} else if recStack[nextTaskID] {
			return true, nil
		}
	}
	
	recStack[currentTask] = false
	return false, nil
}

func (s *taskRelationshipService) getTasksInParallelGroup(groupID string) ([]models.Task, error) {
	query := `
		SELECT DISTINCT t.id, t.project_id, t.title, t.description, t.status, t.assignee_id, 
			   t.due_date, t.custom_fields, t.parent_id, t.task_level, t.sort_order, 
			   t.total_time_seconds, t.dependencies, t.estimated_hours, t.priority, 
			   t.tags, t.created_at, t.updated_at
		FROM tasks t
		JOIN task_status_history tsh ON t.id = tsh.task_id
		WHERE tsh.parallel_group_id = $1 AND t.deleted_at IS NULL
		AND tsh.id = (
			SELECT MAX(id) FROM task_status_history tsh2 WHERE tsh2.task_id = t.id
		)`
	
	rows, err := s.db.Query(query, groupID)
	if err != nil {
		return nil, fmt.Errorf("failed to query tasks in parallel group: %w", err)
	}
	defer rows.Close()
	
	var tasks []models.Task
	for rows.Next() {
		var task models.Task
		err := rows.Scan(
			&task.ID, &task.ProjectID, &task.Title, &task.Description, &task.Status,
			&task.AssigneeID, &task.DueDate, &task.CustomFields, &task.ParentID,
			&task.TaskLevel, &task.SortOrder, &task.TotalTimeSeconds,
			&task.Dependencies, &task.EstimatedHours, &task.Priority, &task.Tags,
			&task.CreatedAt, &task.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan task: %w", err)
		}
		tasks = append(tasks, task)
	}
	
	return tasks, nil
}

func (s *taskRelationshipService) getUnresolvedDependenciesCount(taskID int) (int, error) {
	query := `
		SELECT COUNT(*) FROM task_relationships tr
		JOIN tasks t ON tr.source_task_id = t.id
		WHERE tr.target_task_id = $1 
		AND tr.relationship_type = 'depends_on'
		AND tr.deleted_at IS NULL
		AND t.status != 'completed'
		AND t.deleted_at IS NULL`
	
	var count int
	err := s.db.QueryRow(query, taskID).Scan(&count)
	return count, err
}

func (s *taskRelationshipService) getTasksForGraph(projectID, rootTaskID *int) ([]models.Task, error) {
	baseQuery := `
		SELECT id, project_id, title, description, status, assignee_id, due_date,
			   custom_fields, parent_id, task_level, sort_order, total_time_seconds,
			   dependencies, estimated_hours, priority, tags, created_at, updated_at
		FROM tasks WHERE deleted_at IS NULL`
	
	args := []interface{}{}
	
	if projectID != nil {
		baseQuery += " AND project_id = $1"
		args = append(args, *projectID)
	}
	
	if rootTaskID != nil {
		baseQuery += ` AND (id = $2 OR parent_id = $2 OR id IN (
			SELECT DISTINCT CASE 
				WHEN source_task_id = $2 THEN target_task_id
				WHEN target_task_id = $2 THEN source_task_id
			END
			FROM task_relationships 
			WHERE (source_task_id = $2 OR target_task_id = $2) AND deleted_at IS NULL
		))`
		args = append(args, *rootTaskID)
	}
	
	baseQuery += " ORDER BY task_level, sort_order"
	
	rows, err := s.db.Query(baseQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query tasks for graph: %w", err)
	}
	defer rows.Close()
	
	var tasks []models.Task
	for rows.Next() {
		var task models.Task
		err := rows.Scan(
			&task.ID, &task.ProjectID, &task.Title, &task.Description, &task.Status,
			&task.AssigneeID, &task.DueDate, &task.CustomFields, &task.ParentID,
			&task.TaskLevel, &task.SortOrder, &task.TotalTimeSeconds,
			&task.Dependencies, &task.EstimatedHours, &task.Priority, &task.Tags,
			&task.CreatedAt, &task.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan task for graph: %w", err)
		}
		tasks = append(tasks, task)
	}
	
	return tasks, nil
}

func (s *taskRelationshipService) getAllRelationshipsForTasks(taskIDs []int) ([]models.TaskRelationship, error) {
	if len(taskIDs) == 0 {
		return []models.TaskRelationship{}, nil
	}
	
	// Create placeholders for IN clause
	placeholders := make([]string, len(taskIDs))
	args := make([]interface{}, len(taskIDs))
	for i, id := range taskIDs {
		placeholders[i] = fmt.Sprintf("$%d", i+1)
		args[i] = id
	}
	
	query := fmt.Sprintf(`
		SELECT id, source_task_id, target_task_id, relationship_type,
			   relationship_status, created_by, metadata, created_at, updated_at
		FROM task_relationships 
		WHERE (source_task_id IN (%s) OR target_task_id IN (%s))
		AND deleted_at IS NULL`,
		string(placeholders[0]), string(placeholders[0]))
	
	// Duplicate args for both IN clauses
	allArgs := append(args, args...)
	
	rows, err := s.db.Query(query, allArgs...)
	if err != nil {
		return nil, fmt.Errorf("failed to query relationships for tasks: %w", err)
	}
	defer rows.Close()
	
	var relationships []models.TaskRelationship
	for rows.Next() {
		var rel models.TaskRelationship
		err := rows.Scan(
			&rel.ID, &rel.SourceTaskID, &rel.TargetTaskID, &rel.RelationshipType,
			&rel.RelationshipStatus, &rel.CreatedBy, &rel.Metadata,
			&rel.CreatedAt, &rel.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan relationship: %w", err)
		}
		relationships = append(relationships, rel)
	}
	
	return relationships, nil
}

func (s *taskRelationshipService) createRelationshipInTx(tx *sql.Tx, sourceTaskID, targetTaskID int, relationshipType, status string, createdBy int, metadata models.CustomFields) (*models.TaskRelationship, error) {
	// Similar to CreateRelationship but uses transaction
	if status == "" {
		status = "active"
	}
	
	query := `
		INSERT INTO task_relationships (
			source_task_id, target_task_id, relationship_type, 
			relationship_status, created_by, metadata, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, source_task_id, target_task_id, relationship_type, 
				  relationship_status, created_by, metadata, created_at, updated_at`
	
	now := time.Now()
	var relationship models.TaskRelationship
	
	err := tx.QueryRow(
		query, sourceTaskID, targetTaskID, relationshipType, 
		status, createdBy, metadata, now, now,
	).Scan(
		&relationship.ID, &relationship.SourceTaskID, &relationship.TargetTaskID,
		&relationship.RelationshipType, &relationship.RelationshipStatus,
		&relationship.CreatedBy, &relationship.Metadata,
		&relationship.CreatedAt, &relationship.UpdatedAt,
	)
	
	if err != nil {
		return nil, fmt.Errorf("failed to create relationship in transaction: %w", err)
	}
	
	return &relationship, nil
}

func extractTaskIDs(tasks []models.Task) []int {
	ids := make([]int, len(tasks))
	for i, task := range tasks {
		ids[i] = task.ID
	}
	return ids
}

func (s *taskRelationshipService) updateNodeBlockedStatus(nodes []models.GraphNode, edges []models.GraphEdge) {
	// Create dependency map
	dependencyMap := make(map[int][]int)
	for _, edge := range edges {
		if edge.RelationshipType == "depends_on" {
			dependencyMap[edge.Target] = append(dependencyMap[edge.Target], edge.Source)
		}
	}
	
	// Update node status based on dependencies
	for i := range nodes {
		dependencies := dependencyMap[nodes[i].ID]
		if len(dependencies) > 0 {
			// Check if any dependencies are not completed
			for _, depID := range dependencies {
				for _, node := range nodes {
					if node.ID == depID && node.Status != "completed" {
						nodes[i].IsBlocked = true
						nodes[i].CanStart = false
						break
					}
				}
				if nodes[i].IsBlocked {
					break
				}
			}
		}
	}
}

// ============= Enhanced Dependency Graph Features Implementation =============

// GetTaskDependencyGraphWithOptions generates enhanced dependency graph with advanced options
func (s *taskRelationshipService) GetTaskDependencyGraphWithOptions(projectID, rootTaskID *int, options models.DependencyGraphOptions) (*models.TaskDependencyGraph, error) {
	var nodes []models.GraphNode
	var edges []models.GraphEdge
	
	// Get tasks for graph based on options
	tasks, err := s.getTasksForGraphWithOptions(projectID, rootTaskID, options)
	if err != nil {
		return nil, fmt.Errorf("failed to get tasks for enhanced graph: %w", err)
	}
	
	// Create enhanced nodes with layout algorithm
	for _, task := range tasks {
		node := models.GraphNode{
			ID:       task.ID,
			Title:    task.Title,
			Status:   task.Status,
			NodeType: s.determineNodeType(task, options),
			Level:    task.TaskLevel,
			CanStart: true,
			IsBlocked: false,
		}
		
		// Apply layout algorithm based on options
		if options.LayoutAlgorithm == "hierarchical" {
			node.Coordinates.X = s.calculateHierarchicalX(task, tasks)
			node.Coordinates.Y = task.TaskLevel * (options.NodeSpacing + 80)
		} else if options.LayoutAlgorithm == "force_directed" {
			node.Coordinates.X = s.calculateForceDirectedX(task.ID, len(tasks))
			node.Coordinates.Y = s.calculateForceDirectedY(task.ID, len(tasks))
		} else {
			// Default grid layout
			node.Coordinates.X = (task.ID % 10) * (options.NodeSpacing + 100)
			node.Coordinates.Y = task.TaskLevel * 80
		}
		
		nodes = append(nodes, node)
	}
	
	// Get enhanced relationships
	relationships, err := s.getEnhancedRelationshipsForTasks(extractTaskIDs(tasks), options)
	if err != nil {
		return nil, fmt.Errorf("failed to get enhanced relationships: %w", err)
	}
	
	// Create enhanced edges
	for _, rel := range relationships {
		if s.shouldIncludeRelationship(rel.RelationshipType, options.IncludeRelationshipTypes) {
			edge := models.GraphEdge{
				Source:           rel.SourceTaskID,
				Target:           rel.TargetTaskID,
				RelationshipType: rel.RelationshipType,
				Weight:           s.calculateEdgeWeight(rel, options),
			}
			
			// Enhanced edge styling
			edge.EdgeStyle = s.getEnhancedEdgeStyle(rel.RelationshipType, options)
			edges = append(edges, edge)
		}
	}
	
	// Update node status with enhanced blocking detection
	s.updateEnhancedNodeBlockedStatus(nodes, edges, options)
	
	graph := &models.TaskDependencyGraph{
		Nodes: nodes,
		Edges: edges,
	}
	
	// Apply post-processing optimizations
	if options.OptimizeLayout {
		s.optimizeGraphLayout(graph)
	}
	
	return graph, nil
}

// AnalyzeDependencyCycles performs comprehensive cycle analysis
func (s *taskRelationshipService) AnalyzeDependencyCycles(projectID *int) (*models.CycleAnalysisResult, error) {
	// Get all dependency relationships for the project
	query := `
		SELECT tr.source_task_id, tr.target_task_id, tr.relationship_type,
		       st.title as source_title, tt.title as target_title
		FROM task_relationships tr
		JOIN tasks st ON tr.source_task_id = st.id
		JOIN tasks tt ON tr.target_task_id = tt.id
		WHERE tr.relationship_type IN ('depends_on', 'blocks')
		AND tr.deleted_at IS NULL
		AND st.deleted_at IS NULL
		AND tt.deleted_at IS NULL`
	
	args := []interface{}{}
	if projectID != nil {
		query += " AND st.project_id = $1 AND tt.project_id = $1"
		args = append(args, *projectID)
	}
	
	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query dependency relationships: %w", err)
	}
	defer rows.Close()
	
	// Build adjacency list for cycle detection
	graph := make(map[int][]int)
	taskInfo := make(map[int]string)
	edges := []models.DependencyEdge{}
	
	for rows.Next() {
		var sourceID, targetID int
		var relationshipType, sourceTitle, targetTitle string
		
		err := rows.Scan(&sourceID, &targetID, &relationshipType, &sourceTitle, &targetTitle)
		if err != nil {
			return nil, fmt.Errorf("failed to scan dependency relationship: %w", err)
		}
		
		graph[sourceID] = append(graph[sourceID], targetID)
		taskInfo[sourceID] = sourceTitle
		taskInfo[targetID] = targetTitle
		
		edges = append(edges, models.DependencyEdge{
			SourceID:   sourceID,
			TargetID:   targetID,
			Type:       relationshipType,
			SourceTitle: sourceTitle,
			TargetTitle: targetTitle,
		})
	}
	
	// Detect cycles using DFS
	visited := make(map[int]bool)
	recStack := make(map[int]bool)
	cycles := []models.DependencyCycle{}
	
	for nodeID := range graph {
		if !visited[nodeID] {
			cycle := s.detectCycleDFS(nodeID, graph, visited, recStack, []int{}, taskInfo)
			if len(cycle.TaskIDs) > 0 {
				cycles = append(cycles, cycle)
			}
		}
	}
	
	result := &models.CycleAnalysisResult{
		HasCycles:    len(cycles) > 0,
		CycleCount:   len(cycles),
		Cycles:       cycles,
		TotalEdges:   len(edges),
		AnalyzedAt:   time.Now(),
	}
	
	// Calculate cycle complexity and recommendations
	if len(cycles) > 0 {
		result.Severity = s.calculateCycleSeverity(cycles)
		result.Recommendations = s.generateCycleRecommendations(cycles)
	}
	
	return result, nil
}

// GetCriticalPath calculates the critical path between tasks
func (s *taskRelationshipService) GetCriticalPath(projectID *int, startTaskID, endTaskID *int) (*models.CriticalPathResult, error) {
	if startTaskID == nil || endTaskID == nil {
		return nil, fmt.Errorf("both start and end task IDs are required for critical path analysis")
	}
	
	// Get all tasks and relationships for the project
	tasks, err := s.getTasksForCriticalPath(projectID)
	if err != nil {
		return nil, fmt.Errorf("failed to get tasks for critical path: %w", err)
	}
	
	relationships, err := s.getAllRelationshipsForTasks(extractTaskIDs(tasks))
	if err != nil {
		return nil, fmt.Errorf("failed to get relationships for critical path: %w", err)
	}
	
	// Build weighted graph (using estimated hours as weights)
	graph := s.buildWeightedGraph(tasks, relationships)
	
	// Apply Dijkstra's algorithm to find shortest path
	path, totalDuration := s.dijkstraShortestPath(graph, *startTaskID, *endTaskID)
	
	if len(path) == 0 {
		return &models.CriticalPathResult{
			PathExists: false,
			Message:    "No path found between the specified tasks",
		}, nil
	}
	
	// Enrich path with task details
	pathTasks := []models.CriticalPathTask{}
	for i, taskID := range path {
		task := s.findTaskByID(tasks, taskID)
		if task != nil {
			pathTask := models.CriticalPathTask{
				TaskID:        task.ID,
				Title:         task.Title,
				Status:        task.Status,
				EstimatedHours: task.EstimatedHours,
				Position:      i,
			}
			
			// Calculate dependencies for this task in the path
			if i > 0 {
				pathTask.Dependencies = []int{path[i-1]}
			}
			
			pathTasks = append(pathTasks, pathTask)
		}
	}
	
	// Identify bottlenecks
	bottlenecks := s.identifyBottlenecks(pathTasks, relationships)
	
	result := &models.CriticalPathResult{
		PathExists:        true,
		StartTaskID:       *startTaskID,
		EndTaskID:         *endTaskID,
		PathTasks:         pathTasks,
		TotalDuration:     totalDuration,
		Bottlenecks:       bottlenecks,
		CalculatedAt:      time.Now(),
		OptimizationTips:  s.generateOptimizationTips(pathTasks, bottlenecks),
	}
	
	return result, nil
}

// ============= Enhanced Parallel Workflow Operations =============

// GetParallelWorkflowStages retrieves workflow stages for parallel execution
func (s *taskRelationshipService) GetParallelWorkflowStages(projectID *int) ([]models.WorkflowStage, error) {
	// Analyze task relationships to identify natural workflow stages
	query := `
		SELECT DISTINCT 
			t.task_level,
			COUNT(*) as task_count,
			AVG(COALESCE(t.estimated_hours, 4)) as avg_estimated_hours,
			ARRAY_AGG(t.id) as task_ids,
			ARRAY_AGG(t.title) as task_titles
		FROM tasks t
		WHERE t.deleted_at IS NULL`
	
	args := []interface{}{}
	if projectID != nil {
		query += " AND t.project_id = $1"
		args = append(args, *projectID)
	}
	
	query += " GROUP BY t.task_level ORDER BY t.task_level"
	
	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query workflow stages: %w", err)
	}
	defer rows.Close()
	
	var stages []models.WorkflowStage
	
	for rows.Next() {
		var level, taskCount int
		var avgHours float64
		var taskIDs []int
		var taskTitles []string
		
		err := rows.Scan(&level, &taskCount, &avgHours, &taskIDs, &taskTitles)
		if err != nil {
			return nil, fmt.Errorf("failed to scan workflow stage: %w", err)
		}
		
		// Check if tasks in this level can run in parallel
		canRunInParallel := s.checkParallelCapability(taskIDs)
		
		// Get dependencies for this stage
		dependencies := s.getStageDependencies(level, projectID)
		
		stage := models.WorkflowStage{
			StageID:          fmt.Sprintf("stage_%d", level),
			StageName:        fmt.Sprintf("Level %d Tasks", level),
			StageDescription: fmt.Sprintf("Tasks at hierarchy level %d (%d tasks)", level, taskCount),
			CanRunInParallel: canRunInParallel,
			Dependencies:     dependencies,
			EstimatedHours:   avgHours,
			Tasks:            taskIDs,
		}
		
		stages = append(stages, stage)
	}
	
	return stages, nil
}

// InitiateParallelExecution starts parallel execution of a task group
func (s *taskRelationshipService) InitiateParallelExecution(request models.ParallelExecutionRequest) (*models.ParallelExecutionStatus, error) {
	// Validate the parallel execution request
	if len(request.TaskIDs) == 0 {
		return nil, fmt.Errorf("at least one task ID is required for parallel execution")
	}
	
	// Check if tasks can be executed in parallel
	validation, err := s.ValidateParallelTasksCanStart(request.TaskIDs)
	if err != nil {
		return nil, fmt.Errorf("failed to validate parallel tasks: %w", err)
	}
	
	if !validation["can_start"].(bool) {
		return &models.ParallelExecutionStatus{
			ExecutionID: "",
			Status:      "blocked",
			Message:     "Some tasks have unresolved dependencies",
			BlockedTasks: validation["blocked_tasks"].([]int),
		}, nil
	}
	
	// Generate unique execution ID
	executionID := fmt.Sprintf("exec_%d_%d", time.Now().Unix(), len(request.TaskIDs))
	
	// Create parallel group ID
	parallelGroupID := fmt.Sprintf("parallel_%s", executionID)
	
	// Begin transaction for parallel execution setup
	tx, err := s.db.Begin()
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()
	
	// Update task status history to mark parallel execution start
	for _, taskID := range request.TaskIDs {
		err := s.recordParallelExecutionStart(tx, taskID, parallelGroupID, request.InitiatedBy)
		if err != nil {
			return nil, fmt.Errorf("failed to record parallel execution for task %d: %w", taskID, err)
		}
	}
	
	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit parallel execution: %w", err)
	}
	
	// Create execution status
	status := &models.ParallelExecutionStatus{
		ExecutionID:      executionID,
		ParallelGroupID:  parallelGroupID,
		TaskIDs:          request.TaskIDs,
		Status:           "running",
		StartTime:        time.Now(),
		InitiatedBy:      request.InitiatedBy,
		TotalTasks:       len(request.TaskIDs),
		CompletedTasks:   0,
		InProgressTasks:  len(request.TaskIDs),
		FailedTasks:      0,
		EstimatedCompletion: s.calculateEstimatedCompletion(request.TaskIDs),
	}
	
	return status, nil
}

// GetParallelExecutionStatus retrieves current status of parallel execution
func (s *taskRelationshipService) GetParallelExecutionStatus(executionID string) (*models.ParallelExecutionStatus, error) {
	// Extract parallel group ID from execution ID
	parallelGroupID := fmt.Sprintf("parallel_%s", executionID)
	
	// Get current status of all tasks in the parallel group
	query := `
		SELECT 
			tsh.task_id,
			t.status,
			t.title,
			tsh.change_timestamp,
			tsh.changed_by
		FROM task_status_history tsh
		JOIN tasks t ON tsh.task_id = t.id
		WHERE tsh.parallel_group_id = $1
		AND tsh.id = (
			SELECT MAX(id) FROM task_status_history tsh2 
			WHERE tsh2.task_id = tsh.task_id
		)
		AND t.deleted_at IS NULL`
	
	rows, err := s.db.Query(query, parallelGroupID)
	if err != nil {
		return nil, fmt.Errorf("failed to query parallel execution status: %w", err)
	}
	defer rows.Close()
	
	var taskIDs []int
	var completedTasks, inProgressTasks, failedTasks int
	var taskStatuses []models.ParallelTaskStatus
	var lastUpdate time.Time
	var initiatedBy int
	
	for rows.Next() {
		var taskID, changedBy int
		var status, title string
		var changeTime time.Time
		
		err := rows.Scan(&taskID, &status, &title, &changeTime, &changedBy)
		if err != nil {
			return nil, fmt.Errorf("failed to scan parallel task status: %w", err)
		}
		
		taskIDs = append(taskIDs, taskID)
		
		switch status {
		case "completed":
			completedTasks++
		case "in_progress":
			inProgressTasks++
		case "cancelled", "failed":
			failedTasks++
		}
		
		taskStatuses = append(taskStatuses, models.ParallelTaskStatus{
			TaskID:      taskID,
			Title:       title,
			Status:      status,
			LastUpdate:  changeTime,
		})
		
		if changeTime.After(lastUpdate) {
			lastUpdate = changeTime
			initiatedBy = changedBy
		}
	}
	
	if len(taskIDs) == 0 {
		return nil, fmt.Errorf("parallel execution with ID %s not found", executionID)
	}
	
	// Determine overall execution status
	overallStatus := "running"
	if completedTasks == len(taskIDs) {
		overallStatus = "completed"
	} else if failedTasks > 0 {
		overallStatus = "partial_failure"
	}
	
	status := &models.ParallelExecutionStatus{
		ExecutionID:      executionID,
		ParallelGroupID:  parallelGroupID,
		TaskIDs:          taskIDs,
		Status:           overallStatus,
		LastUpdate:       lastUpdate,
		InitiatedBy:      initiatedBy,
		TotalTasks:       len(taskIDs),
		CompletedTasks:   completedTasks,
		InProgressTasks:  inProgressTasks,
		FailedTasks:      failedTasks,
		TaskStatuses:     taskStatuses,
		CompletionPercent: float64(completedTasks) / float64(len(taskIDs)) * 100,
	}
	
	return status, nil
}

// SynchronizeParallelTasks synchronizes tasks in a parallel group
func (s *taskRelationshipService) SynchronizeParallelTasks(projectID *int, parallelGroupID string) (*models.ParallelSyncResult, error) {
	// Get all tasks in the parallel group
	query := `
		SELECT DISTINCT t.id, t.title, t.status, tsh.change_timestamp
		FROM tasks t
		JOIN task_status_history tsh ON t.id = tsh.task_id
		WHERE tsh.parallel_group_id = $1
		AND tsh.id = (
			SELECT MAX(id) FROM task_status_history tsh2 
			WHERE tsh2.task_id = t.id
		)
		AND t.deleted_at IS NULL`
	
	args := []interface{}{parallelGroupID}
	if projectID != nil {
		query += " AND t.project_id = $2"
		args = append(args, *projectID)
	}
	
	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query parallel group tasks: %w", err)
	}
	defer rows.Close()
	
	var syncIssues []models.SyncIssue
	var syncedTasks []models.SyncedTask
	
	for rows.Next() {
		var taskID int
		var title, status string
		var lastUpdate time.Time
		
		err := rows.Scan(&taskID, &title, &status, &lastUpdate)
		if err != nil {
			return nil, fmt.Errorf("failed to scan parallel task: %w", err)
		}
		
		// Check for synchronization issues
		issues := s.checkTaskSyncIssues(taskID, parallelGroupID)
		syncIssues = append(syncIssues, issues...)
		
		syncedTasks = append(syncedTasks, models.SyncedTask{
			TaskID:     taskID,
			Title:      title,
			Status:     status,
			LastUpdate: lastUpdate,
			SyncStatus: "synchronized",
		})
	}
	
	result := &models.ParallelSyncResult{
		ParallelGroupID:   parallelGroupID,
		SyncedTasks:       syncedTasks,
		SyncIssues:        syncIssues,
		TotalTasks:        len(syncedTasks),
		IssuesFound:       len(syncIssues),
		SyncTimestamp:     time.Now(),
		SyncStatus:        s.determineSyncStatus(syncIssues),
	}
	
	return result, nil
}