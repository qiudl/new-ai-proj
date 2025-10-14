package services

import (
	"context"
	"fmt"
	"path/filepath"
	"time"

	"ai-project-backend/database"
	"ai-project-backend/models"
)

// WorktreeLifecycleManager manages the lifecycle of worktrees
type WorktreeLifecycleManager struct {
	db      database.DB
	gitOps  *GitIntegrationLayer
	baseDir string // Base directory for worktrees
}

// NewWorktreeLifecycleManager creates a new worktree lifecycle manager
func NewWorktreeLifecycleManager(db database.DB, gitOps *GitIntegrationLayer, baseDir string) *WorktreeLifecycleManager {
	return &WorktreeLifecycleManager{
		db:      db,
		gitOps:  gitOps,
		baseDir: baseDir,
	}
}

// CreateWorktreeRequest represents a request to create a worktree
type CreateWorktreeRequest struct {
	ProjectID   int      `json:"project_id" validate:"required"`
	ExpertID    string   `json:"expert_id" validate:"required"`
	Branch      string   `json:"branch" validate:"required"`
	Name        string   `json:"name"`
	Description string   `json:"description"`
	TaskIDs     []int    `json:"task_ids"`
	CreatedBy   int      `json:"created_by" validate:"required"`
}

// CreateWorktree creates a new worktree with status=pending
func (m *WorktreeLifecycleManager) CreateWorktree(ctx context.Context, req *CreateWorktreeRequest) (*models.Worktree, error) {
	// Get project information
	project, err := m.db.Projects().GetByID(ctx, req.ProjectID)
	if err != nil {
		return nil, fmt.Errorf("project not found: %w", err)
	}

	// Get or create worktree config
	config, err := m.getOrCreateConfig(ctx, req.ProjectID)
	if err != nil {
		return nil, fmt.Errorf("failed to get worktree config: %w", err)
	}

	// Check max worktrees limit
	if err := m.checkWorktreeLimit(ctx, req.ProjectID, config.MaxWorktrees); err != nil {
		return nil, err
	}

	// Generate worktree path
	worktreePath := m.generateWorktreePath(config.WorktreeRoot, req.ExpertID, req.Branch)

	// Generate name if not provided
	name := req.Name
	if name == "" {
		name = fmt.Sprintf("%s-%s-%s", project.Name, req.ExpertID, req.Branch)
	}

	// Create worktree via Git
	projectPath := m.getProjectPath(project)
	if err := m.gitOps.CreateWorktree(ctx, projectPath, req.Branch, worktreePath); err != nil {
		return nil, fmt.Errorf("failed to create git worktree: %w", err)
	}

	// Create database record
	worktree := &models.Worktree{
		ProjectID:    req.ProjectID,
		ExpertID:     req.ExpertID,
		Name:         name,
		Description:  req.Description,
		WorktreePath: worktreePath,
		Branch:       req.Branch,
		Status:       models.WorktreeStatusPending,
		IsLocked:     false,
		Metadata:     make(models.CustomFields),
		CreatedBy:    req.CreatedBy,
	}

	created, err := m.db.Worktrees().Create(ctx, worktree)
	if err != nil {
		// Rollback: delete the git worktree
		_ = m.gitOps.DeleteWorktree(ctx, projectPath, worktreePath)
		return nil, fmt.Errorf("failed to create worktree record: %w", err)
	}

	// Bind tasks if provided
	if len(req.TaskIDs) > 0 {
		for i, taskID := range req.TaskIDs {
			binding := &models.WorktreeTaskBinding{
				WorktreeID:   created.ID,
				TaskID:       taskID,
				RelationType: models.RelationTypePrimary,
				Priority:     len(req.TaskIDs) - i, // Higher priority for earlier tasks
				IsActive:     true,
				CreatedBy:    req.CreatedBy,
			}
			if _, err := m.db.WorktreeTaskBindings().Create(ctx, binding); err != nil {
				// Log error but continue
				fmt.Printf("Warning: failed to bind task %d: %v\n", taskID, err)
			}
		}
	}

	// Create activity log
	_ = m.logActivity(ctx, created.ID, models.ActivityTypeCreated,
		fmt.Sprintf("Worktree created: %s", created.Name), nil, nil)

	return created, nil
}

// InitializeWorktree initializes a worktree and sets status to ready
func (m *WorktreeLifecycleManager) InitializeWorktree(ctx context.Context, worktreeID int) error {
	// Get worktree
	worktree, err := m.db.Worktrees().GetByID(ctx, worktreeID)
	if err != nil {
		return fmt.Errorf("worktree not found: %w", err)
	}

	// Check status
	if worktree.Status != models.WorktreeStatusPending {
		return fmt.Errorf("worktree must be in pending status, current: %s", worktree.Status)
	}

	// Check Git status
	gitStatus, err := m.gitOps.GetWorktreeStatus(ctx, worktree.WorktreePath)
	if err != nil {
		return fmt.Errorf("failed to get git status: %w", err)
	}

	// Update worktree with Git status
	worktree.LastCommitHash = &gitStatus.LastCommitHash
	worktree.HasUncommitted = gitStatus.HasUncommitted
	worktree.AheadCount = gitStatus.AheadCount
	worktree.BehindCount = gitStatus.BehindCount
	worktree.Status = models.WorktreeStatusReady

	if _, err := m.db.Worktrees().Update(ctx, worktree); err != nil {
		return fmt.Errorf("failed to update worktree: %w", err)
	}

	// Log activity
	_ = m.logActivity(ctx, worktreeID, models.ActivityTypeActivated,
		"Worktree initialized and ready", nil, nil)

	return nil
}

// ActivateWorktree activates a worktree and assigns it to an AI user
func (m *WorktreeLifecycleManager) ActivateWorktree(ctx context.Context, worktreeID int, aiUserID int, taskID *int) error {
	// Get worktree
	worktree, err := m.db.Worktrees().GetByID(ctx, worktreeID)
	if err != nil {
		return fmt.Errorf("worktree not found: %w", err)
	}

	// Check status
	if worktree.Status != models.WorktreeStatusReady && worktree.Status != models.WorktreeStatusPending {
		return fmt.Errorf("worktree must be in ready or pending status, current: %s", worktree.Status)
	}

	// Check if locked
	if worktree.IsLocked {
		return fmt.Errorf("worktree is locked")
	}

	// Assign AI user
	if err := m.db.Worktrees().AssignAI(ctx, worktreeID, aiUserID); err != nil {
		return fmt.Errorf("failed to assign AI user: %w", err)
	}

	// Assign task if provided
	if taskID != nil {
		if err := m.db.Worktrees().AssignTask(ctx, worktreeID, *taskID); err != nil {
			return fmt.Errorf("failed to assign task: %w", err)
		}
	}

	// Update status to active
	if err := m.db.Worktrees().UpdateStatus(ctx, worktreeID, models.WorktreeStatusActive); err != nil {
		return fmt.Errorf("failed to update status: %w", err)
	}

	// Create workspace assignment
	assignment := &models.AIWorkspaceAssignment{
		AIUserID:       aiUserID,
		WorktreeID:     worktreeID,
		TaskID:         taskID,
		AssignedAt:     time.Now(),
		AssignmentData: make(models.CustomFields),
	}
	if _, err := m.db.AIWorkspaceAssignments().Create(ctx, assignment); err != nil {
		// Log error but continue
		fmt.Printf("Warning: failed to create workspace assignment: %v\n", err)
	}

	// Log activity
	_ = m.logActivity(ctx, worktreeID, models.ActivityTypeAIAssigned,
		fmt.Sprintf("Worktree activated by AI user %d", aiUserID), &aiUserID, taskID)

	return nil
}

// DeactivateWorktree deactivates a worktree
func (m *WorktreeLifecycleManager) DeactivateWorktree(ctx context.Context, worktreeID int) error {
	// Get worktree
	worktree, err := m.db.Worktrees().GetByID(ctx, worktreeID)
	if err != nil {
		return fmt.Errorf("worktree not found: %w", err)
	}

	// Check status
	if worktree.Status != models.WorktreeStatusActive {
		return fmt.Errorf("worktree must be in active status, current: %s", worktree.Status)
	}

	// Unassign AI user
	if err := m.db.Worktrees().UnassignAI(ctx, worktreeID); err != nil {
		return fmt.Errorf("failed to unassign AI: %w", err)
	}

	// Unassign task
	if err := m.db.Worktrees().UnassignTask(ctx, worktreeID); err != nil {
		return fmt.Errorf("failed to unassign task: %w", err)
	}

	// Update status to ready
	if err := m.db.Worktrees().UpdateStatus(ctx, worktreeID, models.WorktreeStatusReady); err != nil {
		return fmt.Errorf("failed to update status: %w", err)
	}

	// End active workspace assignment if exists
	if worktree.CurrentAIID != nil {
		if assignment, err := m.db.AIWorkspaceAssignments().GetCurrentAssignmentForWorktree(ctx, worktreeID); err == nil && assignment != nil {
			_ = m.db.AIWorkspaceAssignments().EndAssignment(ctx, assignment.ID)
		}
	}

	// Log activity
	_ = m.logActivity(ctx, worktreeID, models.ActivityTypeDeactivated,
		"Worktree deactivated", worktree.CurrentAIID, nil)

	return nil
}

// CompleteWorktree marks a worktree as completed
func (m *WorktreeLifecycleManager) CompleteWorktree(ctx context.Context, worktreeID int) error {
	// Get worktree
	worktree, err := m.db.Worktrees().GetByID(ctx, worktreeID)
	if err != nil {
		return fmt.Errorf("worktree not found: %w", err)
	}

	// Check Git status
	gitStatus, err := m.gitOps.GetWorktreeStatus(ctx, worktree.WorktreePath)
	if err != nil {
		return fmt.Errorf("failed to get git status: %w", err)
	}

	// Check for uncommitted changes
	if gitStatus.HasUncommitted {
		return fmt.Errorf("worktree has uncommitted changes, cannot complete")
	}

	// Try to sync with remote
	if err := m.gitOps.SyncWorktree(ctx, worktree.WorktreePath); err != nil {
		// Log warning but continue
		fmt.Printf("Warning: failed to sync worktree: %v\n", err)
	}

	// Update status
	if err := m.db.Worktrees().UpdateStatus(ctx, worktreeID, models.WorktreeStatusCompleted); err != nil {
		return fmt.Errorf("failed to update status: %w", err)
	}

	// Remove all task bindings for this worktree
	bindings, err := m.db.WorktreeTaskBindings().GetByWorktreeID(ctx, worktreeID)
	if err == nil {
		for _, binding := range bindings {
			_ = m.db.WorktreeTaskBindings().Delete(ctx, binding.ID)
		}
	}

	// Log activity
	_ = m.logActivity(ctx, worktreeID, models.ActivityTypeDeactivated,
		"Worktree completed", nil, nil)

	return nil
}

// ArchiveWorktree archives a completed worktree
func (m *WorktreeLifecycleManager) ArchiveWorktree(ctx context.Context, worktreeID int) error {
	// Get worktree
	worktree, err := m.db.Worktrees().GetByID(ctx, worktreeID)
	if err != nil {
		return fmt.Errorf("worktree not found: %w", err)
	}

	// Check status - must be completed
	if worktree.Status != models.WorktreeStatusCompleted {
		return fmt.Errorf("worktree must be completed before archiving, current: %s", worktree.Status)
	}

	// Get project path
	project, err := m.db.Projects().GetByID(ctx, worktree.ProjectID)
	if err != nil {
		return fmt.Errorf("project not found: %w", err)
	}
	projectPath := m.getProjectPath(project)

	// Delete Git worktree
	if err := m.gitOps.DeleteWorktree(ctx, projectPath, worktree.WorktreePath); err != nil {
		// Log error but continue with soft delete
		fmt.Printf("Warning: failed to delete git worktree: %v\n", err)
	}

	// Soft delete worktree record
	if err := m.db.Worktrees().SoftDelete(ctx, worktreeID); err != nil {
		return fmt.Errorf("failed to archive worktree: %w", err)
	}

	// Update status to archived
	_ = m.db.Worktrees().UpdateStatus(ctx, worktreeID, models.WorktreeStatusArchived)

	// Log activity
	_ = m.logActivity(ctx, worktreeID, models.ActivityTypeRemoved,
		"Worktree archived", nil, nil)

	return nil
}

// LockWorktree locks a worktree with a reason
func (m *WorktreeLifecycleManager) LockWorktree(ctx context.Context, worktreeID int, reason string) error {
	// Get worktree
	_, err := m.db.Worktrees().GetByID(ctx, worktreeID)
	if err != nil {
		return fmt.Errorf("worktree not found: %w", err)
	}

	// Lock worktree
	if err := m.db.Worktrees().LockWorktree(ctx, worktreeID, reason); err != nil {
		return fmt.Errorf("failed to lock worktree: %w", err)
	}

	// Log activity
	_ = m.logActivity(ctx, worktreeID, models.ActivityTypeLocked,
		fmt.Sprintf("Worktree locked: %s", reason), nil, nil)

	return nil
}

// UnlockWorktree unlocks a worktree
func (m *WorktreeLifecycleManager) UnlockWorktree(ctx context.Context, worktreeID int) error {
	// Get worktree
	_, err := m.db.Worktrees().GetByID(ctx, worktreeID)
	if err != nil {
		return fmt.Errorf("worktree not found: %w", err)
	}

	// Unlock worktree
	if err := m.db.Worktrees().UnlockWorktree(ctx, worktreeID); err != nil {
		return fmt.Errorf("failed to unlock worktree: %w", err)
	}

	// Log activity
	_ = m.logActivity(ctx, worktreeID, models.ActivityTypeUnlocked,
		"Worktree unlocked", nil, nil)

	return nil
}

// SyncWorktreeGitStatus syncs worktree Git status
func (m *WorktreeLifecycleManager) SyncWorktreeGitStatus(ctx context.Context, worktreeID int) error {
	// Get worktree
	worktree, err := m.db.Worktrees().GetByID(ctx, worktreeID)
	if err != nil {
		return fmt.Errorf("worktree not found: %w", err)
	}

	// Get Git status
	gitStatus, err := m.gitOps.GetWorktreeStatus(ctx, worktree.WorktreePath)
	if err != nil {
		return fmt.Errorf("failed to get git status: %w", err)
	}

	// Update database
	status := &models.WorktreeGitStatus{
		LastCommitHash: &gitStatus.LastCommitHash,
		HasUncommitted: gitStatus.HasUncommitted,
		AheadCount:     gitStatus.AheadCount,
		BehindCount:    gitStatus.BehindCount,
	}

	if err := m.db.Worktrees().UpdateGitStatus(ctx, worktreeID, status); err != nil {
		return fmt.Errorf("failed to update git status: %w", err)
	}

	// Log activity if there are changes
	if gitStatus.HasUncommitted || gitStatus.AheadCount > 0 || gitStatus.BehindCount > 0 {
		_ = m.logActivity(ctx, worktreeID, models.ActivityTypeSynced,
			"Git status synced", nil, nil)
	}

	return nil
}

// ============================================
// Helper methods
// ============================================

// getOrCreateConfig gets or creates worktree config for a project
func (m *WorktreeLifecycleManager) getOrCreateConfig(ctx context.Context, projectID int) (*models.WorktreeConfig, error) {
	config, err := m.db.WorktreeConfigs().GetByProjectID(ctx, projectID)
	if err == nil {
		return config, nil
	}

	// Create default config
	defaultConfig := &models.WorktreeConfig{
		ProjectID:    projectID,
		WorktreeRoot: filepath.Join(m.baseDir, fmt.Sprintf("project-%d", projectID)),
		AutoCleanup:  true,
		MaxWorktrees: 10,
		AIExperts:    make(models.AIExpertConfig),
	}

	return m.db.WorktreeConfigs().Create(ctx, defaultConfig)
}

// checkWorktreeLimit checks if worktree limit is reached
func (m *WorktreeLifecycleManager) checkWorktreeLimit(ctx context.Context, projectID int, maxWorktrees int) error {
	activeWorktrees, err := m.db.Worktrees().GetActiveWorktrees(ctx, projectID)
	if err != nil {
		return fmt.Errorf("failed to get active worktrees: %w", err)
	}

	if len(activeWorktrees) >= maxWorktrees {
		return fmt.Errorf("worktree limit reached: %d/%d", len(activeWorktrees), maxWorktrees)
	}

	return nil
}

// generateWorktreePath generates a unique path for a worktree
func (m *WorktreeLifecycleManager) generateWorktreePath(root, expertID, branch string) string {
	timestamp := time.Now().Format("20060102-150405")
	dirname := fmt.Sprintf("%s-%s-%s", expertID, branch, timestamp)
	return filepath.Join(root, dirname)
}

// getProjectPath gets the project repository path
func (m *WorktreeLifecycleManager) getProjectPath(project *models.Project) string {
	// TODO: This should come from project configuration
	// For now, use a default structure based on project name
	// In the future, this could be configurable per project
	return filepath.Join("/var/projects", project.Name)
}

// logActivity creates an activity log entry
func (m *WorktreeLifecycleManager) logActivity(ctx context.Context, worktreeID int, activityType, description string, aiUserID, taskID *int) error {
	activity := &models.WorktreeActivity{
		WorktreeID:   worktreeID,
		ActivityType: activityType,
		Description:  &description,
		AIUserID:     aiUserID,
		TaskID:       taskID,
		ActivityData: make(models.CustomFields),
	}

	_, err := m.db.WorktreeActivities().Create(ctx, activity)
	return err
}
