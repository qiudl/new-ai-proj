package database

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"ai-project-backend/models"
)

// aiWorkspaceAssignmentRepositoryImpl implements AIWorkspaceAssignmentRepository interface
type aiWorkspaceAssignmentRepositoryImpl struct {
	db interface{} // Can be *sql.DB or *sql.Tx
}

// NewAIWorkspaceAssignmentRepository creates a new instance
func NewAIWorkspaceAssignmentRepository(db interface{}) AIWorkspaceAssignmentRepository {
	return &aiWorkspaceAssignmentRepositoryImpl{db: db}
}

// getDB returns the database connection (supports both *sql.DB and *sql.Tx)
func (r *aiWorkspaceAssignmentRepositoryImpl) getDB() DBExecutor {
	if tx, ok := r.db.(*sql.Tx); ok {
		return tx
	}
	return r.db.(*sql.DB)
}

// Create creates a new AI workspace assignment
func (r *aiWorkspaceAssignmentRepositoryImpl) Create(ctx context.Context, assignment *models.AIWorkspaceAssignment) (*models.AIWorkspaceAssignment, error) {
	assignmentDataJSON, err := json.Marshal(assignment.AssignmentData)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal assignment_data: %w", err)
	}

	query := `
		INSERT INTO ai_workspace_assignments (
			ai_user_id, worktree_id, task_id, assigned_at, assignment_data
		) VALUES ($1, $2, $3, $4, $5)
		RETURNING id
	`

	err = r.getDB().QueryRowContext(
		ctx, query,
		assignment.AIUserID,
		assignment.WorktreeID,
		assignment.TaskID,
		assignment.AssignedAt,
		assignmentDataJSON,
	).Scan(&assignment.ID)

	if err != nil {
		return nil, fmt.Errorf("failed to create AI workspace assignment: %w", err)
	}

	return assignment, nil
}

// GetByID retrieves assignment by ID
func (r *aiWorkspaceAssignmentRepositoryImpl) GetByID(ctx context.Context, id int) (*models.AIWorkspaceAssignment, error) {
	query := `
		SELECT
			id, ai_user_id, worktree_id, task_id, assigned_at, released_at, assignment_data
		FROM ai_workspace_assignments
		WHERE id = $1
	`

	assignment := &models.AIWorkspaceAssignment{}
	var assignmentDataJSON []byte
	var releasedAt sql.NullTime
	var taskID sql.NullInt64

	err := r.getDB().QueryRowContext(ctx, query, id).Scan(
		&assignment.ID,
		&assignment.AIUserID,
		&assignment.WorktreeID,
		&taskID,
		&assignment.AssignedAt,
		&releasedAt,
		&assignmentDataJSON,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("AI workspace assignment not found (ID: %d)", id)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get AI workspace assignment: %w", err)
	}

	// Handle nullable fields
	if taskID.Valid {
		tid := int(taskID.Int64)
		assignment.TaskID = &tid
	}
	if releasedAt.Valid {
		assignment.ReleasedAt = &releasedAt.Time
	}

	if err := json.Unmarshal(assignmentDataJSON, &assignment.AssignmentData); err != nil {
		return nil, fmt.Errorf("failed to unmarshal assignment_data: %w", err)
	}

	return assignment, nil
}

// Update updates an AI workspace assignment
func (r *aiWorkspaceAssignmentRepositoryImpl) Update(ctx context.Context, assignment *models.AIWorkspaceAssignment) (*models.AIWorkspaceAssignment, error) {
	assignmentDataJSON, err := json.Marshal(assignment.AssignmentData)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal assignment_data: %w", err)
	}

	query := `
		UPDATE ai_workspace_assignments SET
			task_id = $1,
			released_at = $2,
			assignment_data = $3
		WHERE id = $4
	`

	result, err := r.getDB().ExecContext(
		ctx, query,
		assignment.TaskID,
		assignment.ReleasedAt,
		assignmentDataJSON,
		assignment.ID,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to update AI workspace assignment: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return nil, fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return nil, fmt.Errorf("AI workspace assignment not found (ID: %d)", assignment.ID)
	}

	return r.GetByID(ctx, assignment.ID)
}

// Delete deletes an AI workspace assignment
func (r *aiWorkspaceAssignmentRepositoryImpl) Delete(ctx context.Context, id int) error {
	query := `DELETE FROM ai_workspace_assignments WHERE id = $1`

	result, err := r.getDB().ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete AI workspace assignment: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("AI workspace assignment not found (ID: %d)", id)
	}

	return nil
}

// GetByAIID retrieves all assignments for an AI user
func (r *aiWorkspaceAssignmentRepositoryImpl) GetByAIID(ctx context.Context, aiID int) ([]*models.AIWorkspaceAssignment, error) {
	query := `
		SELECT
			id, ai_user_id, worktree_id, task_id, assigned_at, released_at, assignment_data
		FROM ai_workspace_assignments
		WHERE ai_user_id = $1
		ORDER BY assigned_at DESC
		LIMIT 100
	`

	rows, err := r.getDB().QueryContext(ctx, query, aiID)
	if err != nil {
		return nil, fmt.Errorf("failed to get assignments by AI ID: %w", err)
	}
	defer rows.Close()

	assignments := []*models.AIWorkspaceAssignment{}
	for rows.Next() {
		assignment := &models.AIWorkspaceAssignment{}
		var assignmentDataJSON []byte
		var releasedAt sql.NullTime
		var taskID sql.NullInt64

		err := rows.Scan(
			&assignment.ID,
			&assignment.AIUserID,
			&assignment.WorktreeID,
			&taskID,
			&assignment.AssignedAt,
			&releasedAt,
			&assignmentDataJSON,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan assignment: %w", err)
		}

		if taskID.Valid {
			tid := int(taskID.Int64)
			assignment.TaskID = &tid
		}
		if releasedAt.Valid {
			assignment.ReleasedAt = &releasedAt.Time
		}

		if err := json.Unmarshal(assignmentDataJSON, &assignment.AssignmentData); err != nil {
			return nil, fmt.Errorf("failed to unmarshal assignment_data: %w", err)
		}

		assignments = append(assignments, assignment)
	}

	return assignments, rows.Err()
}

// GetByWorktreeID retrieves all assignments for a worktree
func (r *aiWorkspaceAssignmentRepositoryImpl) GetByWorktreeID(ctx context.Context, worktreeID int) ([]*models.AIWorkspaceAssignment, error) {
	query := `
		SELECT
			id, ai_user_id, worktree_id, task_id, assigned_at, released_at, assignment_data
		FROM ai_workspace_assignments
		WHERE worktree_id = $1
		ORDER BY assigned_at DESC
		LIMIT 100
	`

	rows, err := r.getDB().QueryContext(ctx, query, worktreeID)
	if err != nil {
		return nil, fmt.Errorf("failed to get assignments by worktree ID: %w", err)
	}
	defer rows.Close()

	assignments := []*models.AIWorkspaceAssignment{}
	for rows.Next() {
		assignment := &models.AIWorkspaceAssignment{}
		var assignmentDataJSON []byte
		var releasedAt sql.NullTime
		var taskID sql.NullInt64

		err := rows.Scan(
			&assignment.ID,
			&assignment.AIUserID,
			&assignment.WorktreeID,
			&taskID,
			&assignment.AssignedAt,
			&releasedAt,
			&assignmentDataJSON,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan assignment: %w", err)
		}

		if taskID.Valid {
			tid := int(taskID.Int64)
			assignment.TaskID = &tid
		}
		if releasedAt.Valid {
			assignment.ReleasedAt = &releasedAt.Time
		}

		if err := json.Unmarshal(assignmentDataJSON, &assignment.AssignmentData); err != nil {
			return nil, fmt.Errorf("failed to unmarshal assignment_data: %w", err)
		}

		assignments = append(assignments, assignment)
	}

	return assignments, rows.Err()
}

// GetActiveAssignment retrieves the current active assignment for an AI
func (r *aiWorkspaceAssignmentRepositoryImpl) GetActiveAssignment(ctx context.Context, aiID int) (*models.AIWorkspaceAssignment, error) {
	query := `
		SELECT
			id, ai_user_id, worktree_id, task_id, assigned_at, released_at, assignment_data
		FROM ai_workspace_assignments
		WHERE ai_user_id = $1 AND released_at IS NULL
		ORDER BY assigned_at DESC
		LIMIT 1
	`

	assignment := &models.AIWorkspaceAssignment{}
	var assignmentDataJSON []byte
	var releasedAt sql.NullTime
	var taskID sql.NullInt64

	err := r.getDB().QueryRowContext(ctx, query, aiID).Scan(
		&assignment.ID,
		&assignment.AIUserID,
		&assignment.WorktreeID,
		&taskID,
		&assignment.AssignedAt,
		&releasedAt,
		&assignmentDataJSON,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("no active assignment found for AI (ID: %d)", aiID)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get active assignment: %w", err)
	}

	if taskID.Valid {
		tid := int(taskID.Int64)
		assignment.TaskID = &tid
	}
	if releasedAt.Valid {
		assignment.ReleasedAt = &releasedAt.Time
	}

	if err := json.Unmarshal(assignmentDataJSON, &assignment.AssignmentData); err != nil {
		return nil, fmt.Errorf("failed to unmarshal assignment_data: %w", err)
	}

	return assignment, nil
}

// GetCurrentAssignmentForWorktree retrieves the current active assignment for a worktree
func (r *aiWorkspaceAssignmentRepositoryImpl) GetCurrentAssignmentForWorktree(ctx context.Context, worktreeID int) (*models.AIWorkspaceAssignment, error) {
	query := `
		SELECT
			id, ai_user_id, worktree_id, task_id, assigned_at, released_at, assignment_data
		FROM ai_workspace_assignments
		WHERE worktree_id = $1 AND released_at IS NULL
		ORDER BY assigned_at DESC
		LIMIT 1
	`

	assignment := &models.AIWorkspaceAssignment{}
	var assignmentDataJSON []byte
	var releasedAt sql.NullTime
	var taskID sql.NullInt64

	err := r.getDB().QueryRowContext(ctx, query, worktreeID).Scan(
		&assignment.ID,
		&assignment.AIUserID,
		&assignment.WorktreeID,
		&taskID,
		&assignment.AssignedAt,
		&releasedAt,
		&assignmentDataJSON,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("no active assignment found for worktree (ID: %d)", worktreeID)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get current assignment for worktree: %w", err)
	}

	if taskID.Valid {
		tid := int(taskID.Int64)
		assignment.TaskID = &tid
	}
	if releasedAt.Valid {
		assignment.ReleasedAt = &releasedAt.Time
	}

	if err := json.Unmarshal(assignmentDataJSON, &assignment.AssignmentData); err != nil {
		return nil, fmt.Errorf("failed to unmarshal assignment_data: %w", err)
	}

	return assignment, nil
}

// StartAssignment starts a new assignment (releases any existing active assignment for the AI)
func (r *aiWorkspaceAssignmentRepositoryImpl) StartAssignment(ctx context.Context, aiID int, worktreeID int, taskID *int) (*models.AIWorkspaceAssignment, error) {
	// First, release any existing active assignment
	releaseQuery := `UPDATE ai_workspace_assignments SET released_at = CURRENT_TIMESTAMP WHERE ai_user_id = $1 AND released_at IS NULL`
	_, err := r.getDB().ExecContext(ctx, releaseQuery, aiID)
	if err != nil {
		return nil, fmt.Errorf("failed to release existing assignment: %w", err)
	}

	// Create new assignment
	assignment := &models.AIWorkspaceAssignment{
		AIUserID:       aiID,
		WorktreeID:     worktreeID,
		TaskID:         taskID,
		AssignedAt:     time.Now(),
		AssignmentData: make(models.CustomFields),
	}

	return r.Create(ctx, assignment)
}

// EndAssignment ends an assignment by setting released_at
func (r *aiWorkspaceAssignmentRepositoryImpl) EndAssignment(ctx context.Context, id int) error {
	query := `UPDATE ai_workspace_assignments SET released_at = CURRENT_TIMESTAMP WHERE id = $1 AND released_at IS NULL`

	result, err := r.getDB().ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to end assignment: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("assignment not found or already ended (ID: %d)", id)
	}

	return nil
}

// SwitchWorktree switches AI to a different worktree (ends current, starts new)
func (r *aiWorkspaceAssignmentRepositoryImpl) SwitchWorktree(ctx context.Context, aiID int, newWorktreeID int) (*models.AIWorkspaceAssignment, error) {
	// Get current assignment to check task
	currentAssignment, err := r.GetActiveAssignment(ctx, aiID)
	var taskID *int
	if err == nil && currentAssignment != nil {
		taskID = currentAssignment.TaskID
	}

	// Start new assignment (which will automatically release the old one)
	return r.StartAssignment(ctx, aiID, newWorktreeID, taskID)
}

// GetActiveAICount retrieves the count of active AI in a project
func (r *aiWorkspaceAssignmentRepositoryImpl) GetActiveAICount(ctx context.Context, projectID int) (int, error) {
	query := `
		SELECT COUNT(DISTINCT a.ai_user_id)
		FROM ai_workspace_assignments a
		INNER JOIN worktrees w ON a.worktree_id = w.id
		WHERE w.project_id = $1 AND a.released_at IS NULL
	`

	var count int
	err := r.getDB().QueryRowContext(ctx, query, projectID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to get active AI count: %w", err)
	}

	return count, nil
}

// GetAssignmentHistory retrieves assignment history for an AI
func (r *aiWorkspaceAssignmentRepositoryImpl) GetAssignmentHistory(ctx context.Context, aiID int, limit, offset int) ([]*models.AIWorkspaceAssignment, int, error) {
	// Get total count
	countQuery := `SELECT COUNT(*) FROM ai_workspace_assignments WHERE ai_user_id = $1`
	var total int
	err := r.getDB().QueryRowContext(ctx, countQuery, aiID).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count assignments: %w", err)
	}

	// Get paginated data
	query := `
		SELECT
			id, ai_user_id, worktree_id, task_id, assigned_at, released_at, assignment_data
		FROM ai_workspace_assignments
		WHERE ai_user_id = $1
		ORDER BY assigned_at DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := r.getDB().QueryContext(ctx, query, aiID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get assignment history: %w", err)
	}
	defer rows.Close()

	assignments := []*models.AIWorkspaceAssignment{}
	for rows.Next() {
		assignment := &models.AIWorkspaceAssignment{}
		var assignmentDataJSON []byte
		var releasedAt sql.NullTime
		var taskID sql.NullInt64

		err := rows.Scan(
			&assignment.ID,
			&assignment.AIUserID,
			&assignment.WorktreeID,
			&taskID,
			&assignment.AssignedAt,
			&releasedAt,
			&assignmentDataJSON,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan assignment: %w", err)
		}

		if taskID.Valid {
			tid := int(taskID.Int64)
			assignment.TaskID = &tid
		}
		if releasedAt.Valid {
			assignment.ReleasedAt = &releasedAt.Time
		}

		if err := json.Unmarshal(assignmentDataJSON, &assignment.AssignmentData); err != nil {
			return nil, 0, fmt.Errorf("failed to unmarshal assignment_data: %w", err)
		}

		assignments = append(assignments, assignment)
	}

	return assignments, total, rows.Err()
}

// GetWorktreeUsageStats retrieves usage statistics for a worktree
func (r *aiWorkspaceAssignmentRepositoryImpl) GetWorktreeUsageStats(ctx context.Context, worktreeID int) (*models.WorktreeUsageStats, error) {
	query := `
		SELECT
			COUNT(*) as total_assignments,
			COUNT(DISTINCT ai_user_id) as unique_ai_count,
			AVG(EXTRACT(EPOCH FROM (COALESCE(released_at, CURRENT_TIMESTAMP) - assigned_at))) as avg_duration_seconds,
			MAX(assigned_at) as last_assigned_at
		FROM ai_workspace_assignments
		WHERE worktree_id = $1
	`

	stats := &models.WorktreeUsageStats{
		WorktreeID: worktreeID,
	}
	var lastAssignedAt sql.NullTime
	var avgDuration sql.NullFloat64

	err := r.getDB().QueryRowContext(ctx, query, worktreeID).Scan(
		&stats.TotalAssignments,
		&stats.UniqueAICount,
		&avgDuration,
		&lastAssignedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to get worktree usage stats: %w", err)
	}

	if avgDuration.Valid {
		stats.AvgDurationSeconds = avgDuration.Float64
	}
	if lastAssignedAt.Valid {
		stats.LastAssignedAt = &lastAssignedAt.Time
	}

	return stats, nil
}
