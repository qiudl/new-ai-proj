package services

import (
	"context"
	"fmt"
	"time"

	"ai-project-backend/database"
	"ai-project-backend/models"
)

// WorktreeService provides business logic for worktree management
type WorktreeService struct {
	db        database.DB
	lifecycle *WorktreeLifecycleManager
	gitOps    *GitIntegrationLayer
}

// NewWorktreeService creates a new worktree service
func NewWorktreeService(db database.DB, baseDir string) *WorktreeService {
	gitOps := NewGitIntegrationLayer()
	lifecycle := NewWorktreeLifecycleManager(db, gitOps, baseDir)

	return &WorktreeService{
		db:        db,
		lifecycle: lifecycle,
		gitOps:    gitOps,
	}
}

// ============================================
// CRUD Operations
// ============================================

// CreateWorktree creates a new worktree
func (s *WorktreeService) CreateWorktree(ctx context.Context, req *CreateWorktreeRequest) (*models.Worktree, error) {
	// Delegate to lifecycle manager
	worktree, err := s.lifecycle.CreateWorktree(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("failed to create worktree: %w", err)
	}

	return worktree, nil
}

// GetWorktree gets a worktree by ID
func (s *WorktreeService) GetWorktree(ctx context.Context, id int) (*models.Worktree, error) {
	worktree, err := s.db.Worktrees().GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get worktree: %w", err)
	}

	return worktree, nil
}

// ListWorktreesOptions represents options for listing worktrees
type ListWorktreesOptions struct {
	ProjectID *int
	Status    *string
	ExpertID  *string
	AIUserID  *int
	Limit     int
	Offset    int
}

// ListWorktrees lists worktrees with pagination
func (s *WorktreeService) ListWorktrees(ctx context.Context, opts *ListWorktreesOptions) ([]*models.Worktree, int, error) {
	if opts == nil {
		opts = &ListWorktreesOptions{
			Limit:  20,
			Offset: 0,
		}
	}

	// Set defaults
	if opts.Limit <= 0 {
		opts.Limit = 20
	}
	if opts.Limit > 100 {
		opts.Limit = 100
	}

	var worktrees []*models.Worktree
	var total int
	var err error

	// Apply filters based on options
	if opts.ProjectID != nil {
		worktrees, total, err = s.db.Worktrees().GetByProjectID(ctx, *opts.ProjectID, opts.Limit, opts.Offset)
	} else if opts.Status != nil {
		worktrees, total, err = s.db.Worktrees().GetByStatus(ctx, *opts.Status, opts.Limit, opts.Offset)
	} else if opts.ExpertID != nil && opts.ProjectID != nil {
		// Get by expert - fallback to GetByProjectID then filter
		worktrees, total, err = s.db.Worktrees().GetByProjectID(ctx, *opts.ProjectID, opts.Limit, opts.Offset)
		if err == nil {
			filtered := []*models.Worktree{}
			for _, wt := range worktrees {
				if wt.ExpertID == *opts.ExpertID {
					filtered = append(filtered, wt)
				}
			}
			worktrees = filtered
			total = len(filtered)
		}
	} else {
		// Get all active worktrees by default
		worktrees, total, err = s.db.Worktrees().GetByStatus(ctx, "active", opts.Limit, opts.Offset)
	}

	if err != nil {
		return nil, 0, fmt.Errorf("failed to list worktrees: %w", err)
	}

	return worktrees, total, nil
}

// UpdateWorktreeRequest represents a worktree update request
type UpdateWorktreeRequest struct {
	Name        *string `json:"name"`
	Description *string `json:"description"`
	Status      *string `json:"status"`
}

// UpdateWorktree updates a worktree
func (s *WorktreeService) UpdateWorktree(ctx context.Context, id int, req *UpdateWorktreeRequest) (*models.Worktree, error) {
	// Get existing worktree
	worktree, err := s.db.Worktrees().GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("worktree not found: %w", err)
	}

	// Apply updates
	if req.Name != nil {
		worktree.Name = *req.Name
	}
	if req.Description != nil {
		worktree.Description = *req.Description
	}
	if req.Status != nil {
		// Status changes should go through lifecycle methods
		return nil, fmt.Errorf("use lifecycle methods to change status")
	}

	// Update in database
	updated, err := s.db.Worktrees().Update(ctx, worktree)
	if err != nil {
		return nil, fmt.Errorf("failed to update worktree: %w", err)
	}

	return updated, nil
}

// DeleteWorktree deletes a worktree
func (s *WorktreeService) DeleteWorktree(ctx context.Context, id int) error {
	// Get worktree
	worktree, err := s.db.Worktrees().GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("worktree not found: %w", err)
	}

	// Check if can be deleted
	if worktree.Status == "active" {
		return fmt.Errorf("cannot delete active worktree, deactivate it first")
	}

	// If completed, archive it
	if worktree.Status == "completed" {
		return s.lifecycle.ArchiveWorktree(ctx, id)
	}

	// For other statuses, delete git worktree and database record
	if worktree.WorktreePath != "" {
		project, err := s.db.Projects().GetByID(ctx, worktree.ProjectID)
		if err == nil {
			projectPath := s.lifecycle.getProjectPath(project)
			_ = s.gitOps.DeleteWorktree(ctx, projectPath, worktree.WorktreePath)
		}
	}

	// Soft delete
	if err := s.db.Worktrees().Delete(ctx, id); err != nil {
		return fmt.Errorf("failed to delete worktree: %w", err)
	}

	return nil
}

// ============================================
// Lifecycle Operations
// ============================================

// InitializeWorktree initializes a worktree
func (s *WorktreeService) InitializeWorktree(ctx context.Context, id int) error {
	return s.lifecycle.InitializeWorktree(ctx, id)
}

// ActivateWorktree activates a worktree
func (s *WorktreeService) ActivateWorktree(ctx context.Context, id int, aiUserID int, taskID *int) error {
	return s.lifecycle.ActivateWorktree(ctx, id, aiUserID, taskID)
}

// DeactivateWorktree deactivates a worktree
func (s *WorktreeService) DeactivateWorktree(ctx context.Context, id int) error {
	return s.lifecycle.DeactivateWorktree(ctx, id)
}

// CompleteWorktree completes a worktree
func (s *WorktreeService) CompleteWorktree(ctx context.Context, id int) error {
	return s.lifecycle.CompleteWorktree(ctx, id)
}

// ArchiveWorktree archives a worktree
func (s *WorktreeService) ArchiveWorktree(ctx context.Context, id int) error {
	return s.lifecycle.ArchiveWorktree(ctx, id)
}

// LockWorktree locks a worktree
func (s *WorktreeService) LockWorktree(ctx context.Context, id int, reason string) error {
	return s.lifecycle.LockWorktree(ctx, id, reason)
}

// UnlockWorktree unlocks a worktree
func (s *WorktreeService) UnlockWorktree(ctx context.Context, id int) error {
	return s.lifecycle.UnlockWorktree(ctx, id)
}

// ============================================
// Status Queries
// ============================================

// WorktreeStats represents worktree statistics
type WorktreeStats struct {
	Total      int            `json:"total"`
	ByStatus   map[string]int `json:"by_status"`
	ByExpert   map[string]int `json:"by_expert"`
	Active     int            `json:"active"`
	Completed  int            `json:"completed"`
	Failed     int            `json:"failed"`
	Locked     int            `json:"locked"`
	AverageDuration *time.Duration `json:"average_duration,omitempty"`
}

// GetWorktreeStats gets worktree statistics for a project
func (s *WorktreeService) GetWorktreeStats(ctx context.Context, projectID int) (*WorktreeStats, error) {
	worktrees, _, err := s.db.Worktrees().GetByProjectID(ctx, projectID, 1000, 0)
	if err != nil {
		return nil, fmt.Errorf("failed to get worktrees: %w", err)
	}

	stats := &WorktreeStats{
		Total:    len(worktrees),
		ByStatus: make(map[string]int),
		ByExpert: make(map[string]int),
	}

	var totalDuration time.Duration
	var completedCount int

	for _, wt := range worktrees {
		// Count by status
		stats.ByStatus[wt.Status]++

		// Count by expert
		stats.ByExpert[wt.ExpertID]++

		// Count special statuses
		if wt.Status == "active" {
			stats.Active++
		}
		if wt.Status == "completed" {
			stats.Completed++
			// Calculate duration based on UpdatedAt (when status changed to completed)
			duration := wt.UpdatedAt.Sub(wt.CreatedAt)
			totalDuration += duration
			completedCount++
		}
		if wt.Status == "failed" {
			stats.Failed++
		}
		if wt.IsLocked {
			stats.Locked++
		}
	}

	// Calculate average duration
	if completedCount > 0 {
		avgDuration := totalDuration / time.Duration(completedCount)
		stats.AverageDuration = &avgDuration
	}

	return stats, nil
}

// GetWorktreesByStatus gets worktrees by status
func (s *WorktreeService) GetWorktreesByStatus(ctx context.Context, projectID int, status string) ([]*models.Worktree, error) {
	allWorktrees, _, err := s.db.Worktrees().GetByProjectID(ctx, projectID, 1000, 0)
	if err != nil {
		return nil, fmt.Errorf("failed to get worktrees: %w", err)
	}

	var filtered []*models.Worktree
	for _, wt := range allWorktrees {
		if wt.Status == status {
			filtered = append(filtered, wt)
		}
	}

	return filtered, nil
}

// GetActiveWorktrees gets all active worktrees for a project
func (s *WorktreeService) GetActiveWorktrees(ctx context.Context, projectID int) ([]*models.Worktree, error) {
	return s.GetWorktreesByStatus(ctx, projectID, "active")
}

// GetWorktreesByExpert gets worktrees by expert ID
func (s *WorktreeService) GetWorktreesByExpert(ctx context.Context, projectID int, expertID string) ([]*models.Worktree, error) {
	// Get worktrees for project and filter by expert
	worktrees, _, err := s.db.Worktrees().GetByProjectID(ctx, projectID, 100, 0)
	if err != nil {
		return nil, fmt.Errorf("failed to get worktrees: %w", err)
	}

	filtered := []*models.Worktree{}
	for _, wt := range worktrees {
		if wt.ExpertID == expertID {
			filtered = append(filtered, wt)
		}
	}

	return filtered, nil
}

// ============================================
// Health and Sync
// ============================================

// HealthCheckResult represents health check result
type HealthCheckResult struct {
	WorktreeID     int       `json:"worktree_id"`
	Healthy        bool      `json:"healthy"`
	GitExists      bool      `json:"git_exists"`
	GitStatus      *GitStatus `json:"git_status,omitempty"`
	Issues         []string  `json:"issues"`
	LastChecked    time.Time `json:"last_checked"`
}

// HealthCheck performs health check on a worktree
func (s *WorktreeService) HealthCheck(ctx context.Context, id int) (*HealthCheckResult, error) {
	worktree, err := s.db.Worktrees().GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("worktree not found: %w", err)
	}

	result := &HealthCheckResult{
		WorktreeID:  id,
		Healthy:     true,
		Issues:      []string{},
		LastChecked: time.Now(),
	}

	// Check if git worktree exists
	project, err := s.db.Projects().GetByID(ctx, worktree.ProjectID)
	if err != nil {
		result.Issues = append(result.Issues, "project not found")
		result.Healthy = false
		return result, nil
	}

	projectPath := s.lifecycle.getProjectPath(project)
	worktrees, err := s.gitOps.ListWorktrees(ctx, projectPath)
	if err != nil {
		result.Issues = append(result.Issues, "failed to list git worktrees")
		result.Healthy = false
		return result, nil
	}

	// Check if worktree path exists in git
	found := false
	for _, wt := range worktrees {
		if wt.Path == worktree.WorktreePath {
			found = true
			break
		}
	}

	result.GitExists = found
	if !found && worktree.Status != "archived" {
		result.Issues = append(result.Issues, "git worktree does not exist")
		result.Healthy = false
	}

	// Get git status if exists
	if found {
		gitStatus, err := s.gitOps.GetWorktreeStatus(ctx, worktree.WorktreePath)
		if err != nil {
			result.Issues = append(result.Issues, "failed to get git status")
			result.Healthy = false
		} else {
			result.GitStatus = gitStatus

			// Check for issues
			if gitStatus.HasUncommitted && worktree.Status == "completed" {
				result.Issues = append(result.Issues, "completed worktree has uncommitted changes")
				result.Healthy = false
			}

			// Check for conflicts
			hasConflicts, err := s.gitOps.CheckConflicts(ctx, worktree.WorktreePath)
			if err == nil && hasConflicts {
				result.Issues = append(result.Issues, "worktree has merge conflicts")
				result.Healthy = false
			}
		}
	}

	// Check database consistency
	if worktree.Status == "active" && worktree.CurrentAIID == nil {
		result.Issues = append(result.Issues, "active worktree has no AI user assigned")
		result.Healthy = false
	}

	// Check if locked worktree has a reason in metadata
	if worktree.IsLocked {
		if lockReason, ok := worktree.Metadata["lock_reason"].(string); !ok || lockReason == "" {
			result.Issues = append(result.Issues, "locked worktree has no reason")
			result.Healthy = false
		}
	}

	return result, nil
}

// SyncWorktree syncs a worktree with Git status
func (s *WorktreeService) SyncWorktree(ctx context.Context, id int) error {
	return s.lifecycle.SyncWorktreeGitStatus(ctx, id)
}

// SyncAllWorktrees syncs all worktrees in a project
func (s *WorktreeService) SyncAllWorktrees(ctx context.Context, projectID int) error {
	worktrees, _, err := s.db.Worktrees().GetByProjectID(ctx, projectID, 1000, 0)
	if err != nil {
		return fmt.Errorf("failed to get worktrees: %w", err)
	}

	var syncErrors []error
	for _, wt := range worktrees {
		if wt.Status != "archived" {
			if err := s.lifecycle.SyncWorktreeGitStatus(ctx, wt.ID); err != nil {
				syncErrors = append(syncErrors, fmt.Errorf("worktree %d: %w", wt.ID, err))
			}
		}
	}

	if len(syncErrors) > 0 {
		return fmt.Errorf("sync errors: %v", syncErrors)
	}

	return nil
}

// ============================================
// Task Binding
// ============================================

// BindTask binds a task to a worktree
func (s *WorktreeService) BindTask(ctx context.Context, worktreeID, taskID int, relationType string) error {
	// Validate relation type
	validRelations := map[string]bool{
		"primary":   true,
		"secondary": true,
		"readonly":  true,
	}
	if !validRelations[relationType] {
		return fmt.Errorf("invalid relation type: %s", relationType)
	}

	// Check if task exists
	task, err := s.db.Tasks().GetByID(ctx, taskID)
	if err != nil {
		return fmt.Errorf("task not found: %w", err)
	}

	// Check if worktree exists
	worktree, err := s.db.Worktrees().GetByID(ctx, worktreeID)
	if err != nil {
		return fmt.Errorf("worktree not found: %w", err)
	}

	// Check if task belongs to the same project
	if task.ProjectID != worktree.ProjectID {
		return fmt.Errorf("task and worktree belong to different projects")
	}

	// Create binding
	binding := &models.WorktreeTaskBinding{
		WorktreeID:   worktreeID,
		TaskID:       taskID,
		RelationType: relationType,
		IsActive:     true,
	}

	_, err = s.db.WorktreeTaskBindings().Create(ctx, binding)
	if err != nil {
		return fmt.Errorf("failed to bind task: %w", err)
	}

	// Log activity
	description := fmt.Sprintf("Bound task #%d (%s)", taskID, relationType)
	_ = s.lifecycle.logActivity(ctx, worktreeID, "task_bind", description, nil, &taskID)

	return nil
}

// UnbindTask unbinds a task from a worktree
func (s *WorktreeService) UnbindTask(ctx context.Context, worktreeID, taskID int) error {
	// Remove binding using repository method
	if err := s.db.WorktreeTaskBindings().RemoveBinding(ctx, taskID, worktreeID); err != nil {
		return fmt.Errorf("failed to unbind task: %w", err)
	}

	// Log activity
	description := fmt.Sprintf("Unbound task #%d", taskID)
	_ = s.lifecycle.logActivity(ctx, worktreeID, "task_unbind", description, nil, &taskID)

	return nil
}

// GetWorktreeTasks gets all tasks bound to a worktree
func (s *WorktreeService) GetWorktreeTasks(ctx context.Context, worktreeID int) ([]*models.WorktreeTaskBinding, error) {
	return s.db.WorktreeTaskBindings().GetByWorktreeID(ctx, worktreeID)
}

// ============================================
// Activity Logs
// ============================================

// GetWorktreeActivities gets activity logs for a worktree
func (s *WorktreeService) GetWorktreeActivities(ctx context.Context, worktreeID int, limit, offset int) ([]*models.WorktreeActivity, int, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	return s.db.WorktreeActivities().GetByWorktreeID(ctx, worktreeID, limit, offset)
}

// ============================================
// Workspace Assignment
// ============================================

// GetWorkspaceAssignment gets the current workspace assignment for a worktree
func (s *WorktreeService) GetWorkspaceAssignment(ctx context.Context, worktreeID int) (*models.AIWorkspaceAssignment, error) {
	return s.db.AIWorkspaceAssignments().GetCurrentAssignmentForWorktree(ctx, worktreeID)
}

// GetAIUserWorkspaces gets all workspace assignments for an AI user
func (s *WorktreeService) GetAIUserWorkspaces(ctx context.Context, aiUserID int) ([]*models.AIWorkspaceAssignment, error) {
	return s.db.AIWorkspaceAssignments().GetByAIID(ctx, aiUserID)
}
