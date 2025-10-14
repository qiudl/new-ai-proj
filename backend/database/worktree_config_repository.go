package database

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"

	"ai-project-backend/models"
)

// worktreeConfigRepositoryImpl implements WorktreeConfigRepository interface
type worktreeConfigRepositoryImpl struct {
	db interface{} // Can be *sql.DB or *sql.Tx
}

// NewWorktreeConfigRepository creates a new instance
func NewWorktreeConfigRepository(db interface{}) WorktreeConfigRepository {
	return &worktreeConfigRepositoryImpl{db: db}
}

// getDB returns the database connection (supports both *sql.DB and *sql.Tx)
func (r *worktreeConfigRepositoryImpl) getDB() DBExecutor {
	if tx, ok := r.db.(*sql.Tx); ok {
		return tx
	}
	return r.db.(*sql.DB)
}

// Create creates a new worktree configuration
func (r *worktreeConfigRepositoryImpl) Create(ctx context.Context, config *models.WorktreeConfig) (*models.WorktreeConfig, error) {
	aiExpertsJSON, err := json.Marshal(config.AIExperts)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal ai_experts: %w", err)
	}

	query := `
		INSERT INTO worktree_configs (
			project_id, worktree_root, auto_cleanup, max_worktrees, ai_experts
		) VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at, updated_at
	`

	err = r.getDB().QueryRowContext(
		ctx, query,
		config.ProjectID,
		config.WorktreeRoot,
		config.AutoCleanup,
		config.MaxWorktrees,
		aiExpertsJSON,
	).Scan(&config.ID, &config.CreatedAt, &config.UpdatedAt)

	if err != nil {
		return nil, fmt.Errorf("failed to create worktree config: %w", err)
	}

	return config, nil
}

// GetByID retrieves worktree configuration by ID
func (r *worktreeConfigRepositoryImpl) GetByID(ctx context.Context, id int) (*models.WorktreeConfig, error) {
	query := `
		SELECT id, project_id, worktree_root, auto_cleanup, max_worktrees, ai_experts, created_at, updated_at
		FROM worktree_configs
		WHERE id = $1
	`

	config := &models.WorktreeConfig{}
	var aiExpertsJSON []byte

	err := r.getDB().QueryRowContext(ctx, query, id).Scan(
		&config.ID,
		&config.ProjectID,
		&config.WorktreeRoot,
		&config.AutoCleanup,
		&config.MaxWorktrees,
		&aiExpertsJSON,
		&config.CreatedAt,
		&config.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("worktree config not found (ID: %d)", id)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get worktree config: %w", err)
	}

	if err := json.Unmarshal(aiExpertsJSON, &config.AIExperts); err != nil {
		return nil, fmt.Errorf("failed to unmarshal ai_experts: %w", err)
	}

	return config, nil
}

// GetByProjectID retrieves worktree configuration by project ID
func (r *worktreeConfigRepositoryImpl) GetByProjectID(ctx context.Context, projectID int) (*models.WorktreeConfig, error) {
	query := `
		SELECT id, project_id, worktree_root, auto_cleanup, max_worktrees, ai_experts, created_at, updated_at
		FROM worktree_configs
		WHERE project_id = $1
	`

	config := &models.WorktreeConfig{}
	var aiExpertsJSON []byte

	err := r.getDB().QueryRowContext(ctx, query, projectID).Scan(
		&config.ID,
		&config.ProjectID,
		&config.WorktreeRoot,
		&config.AutoCleanup,
		&config.MaxWorktrees,
		&aiExpertsJSON,
		&config.CreatedAt,
		&config.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("worktree config not found for project (ID: %d)", projectID)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get worktree config by project: %w", err)
	}

	if err := json.Unmarshal(aiExpertsJSON, &config.AIExperts); err != nil {
		return nil, fmt.Errorf("failed to unmarshal ai_experts: %w", err)
	}

	return config, nil
}

// Update updates worktree configuration
func (r *worktreeConfigRepositoryImpl) Update(ctx context.Context, config *models.WorktreeConfig) (*models.WorktreeConfig, error) {
	aiExpertsJSON, err := json.Marshal(config.AIExperts)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal ai_experts: %w", err)
	}

	query := `
		UPDATE worktree_configs SET
			worktree_root = $1,
			auto_cleanup = $2,
			max_worktrees = $3,
			ai_experts = $4,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $5
		RETURNING updated_at
	`

	err = r.getDB().QueryRowContext(
		ctx, query,
		config.WorktreeRoot,
		config.AutoCleanup,
		config.MaxWorktrees,
		aiExpertsJSON,
		config.ID,
	).Scan(&config.UpdatedAt)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("worktree config not found (ID: %d)", config.ID)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to update worktree config: %w", err)
	}

	return r.GetByID(ctx, config.ID)
}

// Delete deletes worktree configuration
func (r *worktreeConfigRepositoryImpl) Delete(ctx context.Context, id int) error {
	query := `DELETE FROM worktree_configs WHERE id = $1`

	result, err := r.getDB().ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete worktree config: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("worktree config not found (ID: %d)", id)
	}

	return nil
}

// UpdateAIExpert updates or adds an AI expert configuration
func (r *worktreeConfigRepositoryImpl) UpdateAIExpert(ctx context.Context, projectID int, expertID string, expertConfig map[string]interface{}) error {
	// Get current config
	config, err := r.GetByProjectID(ctx, projectID)
	if err != nil {
		return err
	}

	// Update AI expert
	if config.AIExperts == nil {
		config.AIExperts = make(models.AIExpertConfig)
	}
	config.AIExperts[expertID] = expertConfig

	// Save back
	_, err = r.Update(ctx, config)
	return err
}

// RemoveAIExpert removes an AI expert from configuration
func (r *worktreeConfigRepositoryImpl) RemoveAIExpert(ctx context.Context, projectID int, expertID string) error {
	// Get current config
	config, err := r.GetByProjectID(ctx, projectID)
	if err != nil {
		return err
	}

	// Remove AI expert
	if config.AIExperts != nil {
		delete(config.AIExperts, expertID)
	}

	// Save back
	_, err = r.Update(ctx, config)
	return err
}

// GetAIExpertConfig retrieves a specific AI expert configuration
func (r *worktreeConfigRepositoryImpl) GetAIExpertConfig(ctx context.Context, projectID int, expertID string) (map[string]interface{}, error) {
	config, err := r.GetByProjectID(ctx, projectID)
	if err != nil {
		return nil, err
	}

	if config.AIExperts == nil {
		return nil, fmt.Errorf("no AI experts configured for project (ID: %d)", projectID)
	}

	expertConfig, ok := config.AIExperts[expertID]
	if !ok {
		return nil, fmt.Errorf("AI expert not found (expertID: %s)", expertID)
	}

	// Convert to map[string]interface{}
	expertMap, ok := expertConfig.(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("invalid AI expert configuration format")
	}

	return expertMap, nil
}
