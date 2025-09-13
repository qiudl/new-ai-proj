package database

import (
	"ai-project-backend/models"
	"context"
	"database/sql"
)

// OKRRepository defines the interface for OKR database operations
type OKRRepository interface {
	// Objective operations
	CreateObjective(ctx context.Context, obj *models.OKRObjective) error
	GetObjectiveByID(ctx context.Context, id int) (*models.OKRObjective, error)
	UpdateObjective(ctx context.Context, obj *models.OKRObjective) error
	DeleteObjective(ctx context.Context, id int) error
	GetObjectivesByUser(ctx context.Context, userID int, quarter string) ([]models.OKRObjective, error)
	GetObjectivesByQuarter(ctx context.Context, quarter string, userID int) ([]models.OKRObjective, error)

	// Key result operations
	CreateKeyResult(ctx context.Context, kr *models.OKRKeyResult) error
	UpdateKeyResult(ctx context.Context, kr *models.OKRKeyResult) error
	DeleteKeyResult(ctx context.Context, id int) error
	GetKeyResultByID(ctx context.Context, id int) (*models.OKRKeyResult, error)
	GetKeyResultsByObjective(ctx context.Context, objectiveID int) ([]models.OKRKeyResult, error)

	// Progress logs
	CreateProgressLog(ctx context.Context, log *models.OKRProgressLog) error
	GetProgressLogsByObjective(ctx context.Context, objectiveID int, limit, offset int) ([]*models.OKRProgressLog, int, error)
	GetProgressLogsByKeyResult(ctx context.Context, keyResultID int, limit, offset int) ([]*models.OKRProgressLog, int, error)

	// Statistics
	GetUserOKRStats(ctx context.Context, userID int, quarter string) (*models.OKRStatsResponse, error)
	
	// Task-KeyResult associations
	CreateTaskKRAssociation(ctx context.Context, assoc *models.TaskKeyResultAssociation) error
	UpdateTaskKRAssociation(ctx context.Context, assoc *models.TaskKeyResultAssociation) error
	DeleteTaskKRAssociation(ctx context.Context, id int) error
	GetTaskKRAssociationsByTask(ctx context.Context, taskID int) ([]*models.TaskKRAssociationWithKR, error)
	GetTaskKRAssociationsByKeyResult(ctx context.Context, keyResultID int) ([]*models.TaskKRAssociationWithTask, error)
	GetTaskKRAssociation(ctx context.Context, taskID, keyResultID int) (*models.TaskKeyResultAssociation, error)
	
	// Progress calculation helpers
	CalculateKeyResultProgressFromTasks(ctx context.Context, keyResultID int) (int, error)
	GetAssociatedTasksForKeyResult(ctx context.Context, keyResultID int) ([]int, error)
}

type sqlExecutor interface {
	ExecContext(ctx context.Context, query string, args ...interface{}) (sql.Result, error)
	QueryContext(ctx context.Context, query string, args ...interface{}) (*sql.Rows, error)
	QueryRowContext(ctx context.Context, query string, args ...interface{}) *sql.Row
}

type okrRepository struct {
	db sqlExecutor
}

// NewOKRRepository creates a new OKR repository
func NewOKRRepository(db interface{}) OKRRepository {
	switch d := db.(type) {
	case *sql.DB:
		return &okrRepository{db: d}
	case *sql.Tx:
		// Support transactions by accepting *sql.Tx which implements the required methods
		return &okrRepository{db: d}
	default:
		panic("Unsupported database type for OKR repository")
	}
}

// CreateObjective creates a new OKR objective
func (r *okrRepository) CreateObjective(ctx context.Context, obj *models.OKRObjective) error {
	query := `
		INSERT INTO okr_objectives (title, description, quarter, status, progress, assignee_id, enterprise_id, start_date, end_date, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id, created_at, updated_at`

	err := r.db.QueryRowContext(ctx, query,
		obj.Title, obj.Description, obj.Quarter, obj.Status, obj.Progress,
		obj.AssigneeID, obj.EnterpriseID, obj.StartDate, obj.EndDate, obj.CreatedBy,
	).Scan(&obj.ID, &obj.CreatedAt, &obj.UpdatedAt)

	return err
}

// GetObjectiveByID retrieves an objective by ID with its key results
func (r *okrRepository) GetObjectiveByID(ctx context.Context, id int) (*models.OKRObjective, error) {
	query := `
		SELECT id, title, description, quarter, status, progress, assignee_id, enterprise_id, 
		       start_date, end_date, created_by, created_at, updated_at, deleted_at
		FROM okr_objectives 
		WHERE id = $1 AND deleted_at IS NULL`

	obj := &models.OKRObjective{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&obj.ID, &obj.Title, &obj.Description, &obj.Quarter, &obj.Status, &obj.Progress,
		&obj.AssigneeID, &obj.EnterpriseID, &obj.StartDate, &obj.EndDate, &obj.CreatedBy,
		&obj.CreatedAt, &obj.UpdatedAt, &obj.DeletedAt,
	)
	if err != nil {
		return nil, err
	}

	// Load key results
	keyResults, err := r.GetKeyResultsByObjective(ctx, obj.ID)
	if err != nil {
		return nil, err
	}
	obj.KeyResults = keyResults

	return obj, nil
}

// UpdateObjective updates an existing objective
func (r *okrRepository) UpdateObjective(ctx context.Context, obj *models.OKRObjective) error {
	query := `
		UPDATE okr_objectives 
		SET title = $1, description = $2, status = $3, progress = $4, 
		    start_date = $5, end_date = $6, updated_at = CURRENT_TIMESTAMP
		WHERE id = $7 AND deleted_at IS NULL`

	result, err := r.db.ExecContext(ctx, query,
		obj.Title, obj.Description, obj.Status, obj.Progress,
		obj.StartDate, obj.EndDate, obj.ID,
	)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return sql.ErrNoRows
	}

	return nil
}

// DeleteObjective soft deletes an objective
func (r *okrRepository) DeleteObjective(ctx context.Context, id int) error {
	query := `UPDATE okr_objectives SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL`
	
	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return sql.ErrNoRows
	}

	return nil
}

// GetObjectivesByUser retrieves objectives for a specific user and quarter
func (r *okrRepository) GetObjectivesByUser(ctx context.Context, userID int, quarter string) ([]models.OKRObjective, error) {
	query := `
		SELECT id, title, description, quarter, status, progress, assignee_id, enterprise_id,
		       start_date, end_date, created_by, created_at, updated_at, deleted_at
		FROM okr_objectives 
		WHERE assignee_id = $1 AND deleted_at IS NULL`
	
	args := []interface{}{userID}
	if quarter != "" {
		query += ` AND quarter = $2`
		args = append(args, quarter)
	}
	
	query += ` ORDER BY created_at DESC`

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var objectives []models.OKRObjective
	for rows.Next() {
		var obj models.OKRObjective
		err := rows.Scan(
			&obj.ID, &obj.Title, &obj.Description, &obj.Quarter, &obj.Status, &obj.Progress,
			&obj.AssigneeID, &obj.EnterpriseID, &obj.StartDate, &obj.EndDate, &obj.CreatedBy,
			&obj.CreatedAt, &obj.UpdatedAt, &obj.DeletedAt,
		)
		if err != nil {
			return nil, err
		}

		// Load key results for each objective
		keyResults, err := r.GetKeyResultsByObjective(ctx, obj.ID)
		if err != nil {
			return nil, err
		}
		obj.KeyResults = keyResults

		objectives = append(objectives, obj)
	}

	return objectives, nil
}

// GetObjectivesByQuarter retrieves objectives for a specific quarter
func (r *okrRepository) GetObjectivesByQuarter(ctx context.Context, quarter string, userID int) ([]models.OKRObjective, error) {
	return r.GetObjectivesByUser(ctx, userID, quarter)
}

// CreateKeyResult creates a new key result
func (r *okrRepository) CreateKeyResult(ctx context.Context, kr *models.OKRKeyResult) error {
	query := `
		INSERT INTO okr_key_results (objective_id, title, description, type, target_value, current_value, unit, progress, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, created_at, updated_at`

	err := r.db.QueryRowContext(ctx, query,
		kr.ObjectiveID, kr.Title, kr.Description, kr.Type, kr.TargetValue,
		kr.CurrentValue, kr.Unit, kr.Progress, kr.Status,
	).Scan(&kr.ID, &kr.CreatedAt, &kr.UpdatedAt)

	return err
}

// UpdateKeyResult updates an existing key result
func (r *okrRepository) UpdateKeyResult(ctx context.Context, kr *models.OKRKeyResult) error {
	query := `
		UPDATE okr_key_results 
		SET title = $1, description = $2, current_value = $3, progress = $4, status = $5, updated_at = CURRENT_TIMESTAMP
		WHERE id = $6 AND deleted_at IS NULL`

	result, err := r.db.ExecContext(ctx, query,
		kr.Title, kr.Description, kr.CurrentValue, kr.Progress, kr.Status, kr.ID,
	)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return sql.ErrNoRows
	}

	return nil
}

// DeleteKeyResult soft deletes a key result
func (r *okrRepository) DeleteKeyResult(ctx context.Context, id int) error {
	query := `UPDATE okr_key_results SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL`
	
	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return sql.ErrNoRows
	}

	return nil
}

// GetKeyResultsByObjective retrieves key results for an objective
func (r *okrRepository) GetKeyResultsByObjective(ctx context.Context, objectiveID int) ([]models.OKRKeyResult, error) {
	query := `
		SELECT id, objective_id, title, description, type, target_value, current_value, unit, progress, status, created_at, updated_at, deleted_at
		FROM okr_key_results 
		WHERE objective_id = $1 AND deleted_at IS NULL
		ORDER BY created_at ASC`

	rows, err := r.db.QueryContext(ctx, query, objectiveID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var keyResults []models.OKRKeyResult
	for rows.Next() {
		var kr models.OKRKeyResult
		err := rows.Scan(
			&kr.ID, &kr.ObjectiveID, &kr.Title, &kr.Description, &kr.Type,
			&kr.TargetValue, &kr.CurrentValue, &kr.Unit, &kr.Progress, &kr.Status,
			&kr.CreatedAt, &kr.UpdatedAt, &kr.DeletedAt,
		)
		if err != nil {
			return nil, err
		}
		keyResults = append(keyResults, kr)
	}

	return keyResults, nil
}

// GetKeyResultByID retrieves a key result by its ID
func (r *okrRepository) GetKeyResultByID(ctx context.Context, id int) (*models.OKRKeyResult, error) {
	query := `
		SELECT id, objective_id, title, description, type, target_value, current_value, unit, progress, status, created_at, updated_at, deleted_at
		FROM okr_key_results 
		WHERE id = $1 AND deleted_at IS NULL`

	kr := &models.OKRKeyResult{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&kr.ID, &kr.ObjectiveID, &kr.Title, &kr.Description, &kr.Type,
		&kr.TargetValue, &kr.CurrentValue, &kr.Unit, &kr.Progress, &kr.Status,
		&kr.CreatedAt, &kr.UpdatedAt, &kr.DeletedAt,
	)
	if err != nil {
		return nil, err
	}
	return kr, nil
}

// GetUserOKRStats retrieves OKR statistics for a user and quarter
func (r *okrRepository) GetUserOKRStats(ctx context.Context, userID int, quarter string) (*models.OKRStatsResponse, error) {
	query := `
		SELECT 
			COUNT(*) as total_objectives,
			COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_objectives,
			AVG(progress) as average_progress,
			COUNT(CASE WHEN status = 'active' AND progress < 50 THEN 1 END) as at_risk_count
		FROM okr_objectives 
		WHERE assignee_id = $1 AND deleted_at IS NULL`
	
	args := []interface{}{userID}
	if quarter != "" {
		query += ` AND quarter = $2`
		args = append(args, quarter)
	}

	stats := &models.OKRStatsResponse{Quarter: quarter}
	var avgProgress sql.NullFloat64
	
	err := r.db.QueryRowContext(ctx, query, args...).Scan(
		&stats.TotalObjectives, &stats.CompletedObjectives, &avgProgress, &stats.AtRiskCount,
	)
	if err != nil {
		return nil, err
	}

	if avgProgress.Valid {
		stats.AverageProgress = avgProgress.Float64
	}

	if quarter != "" {
		stats.RemainingDays = models.GetRemainingDaysInQuarter(quarter)
	}

return stats, nil
}

// CreateProgressLog creates a new progress log entry
func (r *okrRepository) CreateProgressLog(ctx context.Context, log *models.OKRProgressLog) error {
	query := `
		INSERT INTO okr_progress_logs (
			objective_id, key_result_id, user_id, change_type, field_name,
			previous_value, new_value, reason, ip_address, user_agent
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id, created_at`
	return r.db.QueryRowContext(ctx, query,
		log.ObjectiveID, log.KeyResultID, log.UserID, log.ChangeType, log.FieldName,
		log.PreviousValue, log.NewValue, log.Reason, log.IPAddress, log.UserAgent,
	).Scan(&log.ID, &log.CreatedAt)
}

// GetProgressLogsByObjective returns logs for an objective
func (r *okrRepository) GetProgressLogsByObjective(ctx context.Context, objectiveID int, limit, offset int) ([]*models.OKRProgressLog, int, error) {
	if limit <= 0 { limit = 20 }
	if offset < 0 { offset = 0 }

	countQuery := `SELECT COUNT(*) FROM okr_progress_logs WHERE objective_id = $1`
	var total int
	if err := r.db.QueryRowContext(ctx, countQuery, objectiveID).Scan(&total); err != nil {
		return nil, 0, err
	}

	query := `
		SELECT id, objective_id, key_result_id, user_id, change_type, field_name,
		       previous_value, new_value, reason, ip_address, user_agent, created_at
		FROM okr_progress_logs
		WHERE objective_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3`
	rows, err := r.db.QueryContext(ctx, query, objectiveID, limit, offset)
	if err != nil { return nil, 0, err }
	defer rows.Close()
	var logs []*models.OKRProgressLog
	for rows.Next() {
		var l models.OKRProgressLog
		var prevVal, newVal, reason, ipAddr, userAgent sql.NullString
		if err := rows.Scan(
			&l.ID, &l.ObjectiveID, &l.KeyResultID, &l.UserID, &l.ChangeType, &l.FieldName,
			&prevVal, &newVal, &reason, &ipAddr, &userAgent, &l.CreatedAt,
		); err != nil { return nil, 0, err }
		if prevVal.Valid { l.PreviousValue = &prevVal.String }
		if newVal.Valid { l.NewValue = &newVal.String }
		if reason.Valid { l.Reason = &reason.String }
		if ipAddr.Valid { l.IPAddress = &ipAddr.String }
		if userAgent.Valid { l.UserAgent = &userAgent.String }
		logs = append(logs, &l)
	}
	if err = rows.Err(); err != nil { return nil, 0, err }
	
	return logs, total, nil
}

// ==================== Task-KeyResult Association Methods ====================

// CreateTaskKRAssociation creates a new task-key result association
func (r *okrRepository) CreateTaskKRAssociation(ctx context.Context, assoc *models.TaskKeyResultAssociation) error {
	query := `
		INSERT INTO task_key_result_associations (task_id, key_result_id, weight, sync_mode)
		VALUES ($1, $2, $3, $4)
		RETURNING id, created_at, updated_at`
	
	return r.db.QueryRowContext(ctx, query, 
		assoc.TaskID, assoc.KeyResultID, assoc.Weight, assoc.SyncMode,
	).Scan(&assoc.ID, &assoc.CreatedAt, &assoc.UpdatedAt)
}

// UpdateTaskKRAssociation updates an existing association
func (r *okrRepository) UpdateTaskKRAssociation(ctx context.Context, assoc *models.TaskKeyResultAssociation) error {
	query := `
		UPDATE task_key_result_associations 
		SET weight = $1, sync_mode = $2, updated_at = CURRENT_TIMESTAMP
		WHERE id = $3 AND deleted_at IS NULL`
	
	result, err := r.db.ExecContext(ctx, query, assoc.Weight, assoc.SyncMode, assoc.ID)
	if err != nil {
		return err
	}
	
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return sql.ErrNoRows
	}
	
	return nil
}

// DeleteTaskKRAssociation soft deletes an association
func (r *okrRepository) DeleteTaskKRAssociation(ctx context.Context, id int) error {
	query := `
		UPDATE task_key_result_associations 
		SET deleted_at = CURRENT_TIMESTAMP
		WHERE id = $1 AND deleted_at IS NULL`
	
	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return err
	}
	
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return sql.ErrNoRows
	}
	
	return nil
}

// GetTaskKRAssociationsByTask returns all KR associations for a task
func (r *okrRepository) GetTaskKRAssociationsByTask(ctx context.Context, taskID int) ([]*models.TaskKRAssociationWithKR, error) {
	query := `
		SELECT 
			tka.id, tka.task_id, tka.key_result_id, tka.weight, tka.sync_mode,
			tka.created_at, tka.updated_at,
			kr.title, kr.target_value, kr.current_value, kr.progress
		FROM task_key_result_associations tka
		JOIN okr_key_results kr ON tka.key_result_id = kr.id
		WHERE tka.task_id = $1 AND tka.deleted_at IS NULL AND kr.deleted_at IS NULL
		ORDER BY tka.created_at DESC`
	
	rows, err := r.db.QueryContext(ctx, query, taskID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var associations []*models.TaskKRAssociationWithKR
	for rows.Next() {
		var assoc models.TaskKRAssociationWithKR
		if err := rows.Scan(
			&assoc.ID, &assoc.TaskID, &assoc.KeyResultID, &assoc.Weight, &assoc.SyncMode,
			&assoc.CreatedAt, &assoc.UpdatedAt,
			&assoc.KRTitle, &assoc.KRTargetValue, &assoc.KRCurrentValue, &assoc.KRProgress,
		); err != nil {
			return nil, err
		}
		associations = append(associations, &assoc)
	}
	
	return associations, nil
}

// GetTaskKRAssociationsByKeyResult returns all task associations for a key result
func (r *okrRepository) GetTaskKRAssociationsByKeyResult(ctx context.Context, keyResultID int) ([]*models.TaskKRAssociationWithTask, error) {
	query := `
		SELECT 
			tka.id, tka.task_id, tka.key_result_id, tka.weight, tka.sync_mode,
			tka.created_at, tka.updated_at,
			t.title, t.status, 
			CASE 
				WHEN t.status = 'completed' THEN 100
				WHEN t.status = 'in_progress' THEN 50
				ELSE 0 
			END as task_progress
		FROM task_key_result_associations tka
		JOIN tasks t ON tka.task_id = t.id
		WHERE tka.key_result_id = $1 AND tka.deleted_at IS NULL AND t.deleted_at IS NULL
		ORDER BY tka.created_at DESC`
	
	rows, err := r.db.QueryContext(ctx, query, keyResultID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var associations []*models.TaskKRAssociationWithTask
	for rows.Next() {
		var assoc models.TaskKRAssociationWithTask
		var taskProgress int
		if err := rows.Scan(
			&assoc.ID, &assoc.TaskID, &assoc.KeyResultID, &assoc.Weight, &assoc.SyncMode,
			&assoc.CreatedAt, &assoc.UpdatedAt,
			&assoc.TaskTitle, &assoc.TaskStatus, &taskProgress,
		); err != nil {
			return nil, err
		}
		assoc.TaskProgress = &taskProgress
		associations = append(associations, &assoc)
	}
	
	return associations, nil
}

// GetTaskKRAssociation gets a specific association by task and key result ID
func (r *okrRepository) GetTaskKRAssociation(ctx context.Context, taskID, keyResultID int) (*models.TaskKeyResultAssociation, error) {
	query := `
		SELECT id, task_id, key_result_id, weight, sync_mode, created_at, updated_at
		FROM task_key_result_associations
		WHERE task_id = $1 AND key_result_id = $2 AND deleted_at IS NULL`
	
	var assoc models.TaskKeyResultAssociation
	err := r.db.QueryRowContext(ctx, query, taskID, keyResultID).Scan(
		&assoc.ID, &assoc.TaskID, &assoc.KeyResultID, &assoc.Weight, 
		&assoc.SyncMode, &assoc.CreatedAt, &assoc.UpdatedAt,
	)
	
	if err != nil {
		return nil, err
	}
	
	return &assoc, nil
}

// CalculateKeyResultProgressFromTasks calculates progress based on associated tasks
func (r *okrRepository) CalculateKeyResultProgressFromTasks(ctx context.Context, keyResultID int) (int, error) {
	query := `
		SELECT 
			tka.weight,
			CASE 
				WHEN t.status = 'completed' THEN 100
				WHEN t.status = 'in_progress' THEN 50
				WHEN t.status = 'testing' THEN 80
				ELSE 0 
			END as task_progress
		FROM task_key_result_associations tka
		JOIN tasks t ON tka.task_id = t.id
		WHERE tka.key_result_id = $1 
			AND tka.deleted_at IS NULL 
			AND t.deleted_at IS NULL
			AND tka.sync_mode = 'auto'`
	
	rows, err := r.db.QueryContext(ctx, query, keyResultID)
	if err != nil {
		return 0, err
	}
	defer rows.Close()
	
	var totalWeight float64
	var weightedProgress float64
	
	for rows.Next() {
		var weight float64
		var taskProgress int
		
		if err := rows.Scan(&weight, &taskProgress); err != nil {
			return 0, err
		}
		
		totalWeight += weight
		weightedProgress += (weight * float64(taskProgress))
	}
	
	if totalWeight == 0 {
		return 0, nil // No associated tasks with auto sync
	}
	
	// Calculate weighted average progress
	progress := int(weightedProgress / totalWeight)
	if progress > 100 {
		progress = 100
	}
	
	return progress, nil
}

// GetAssociatedTasksForKeyResult returns task IDs associated with a key result
func (r *okrRepository) GetAssociatedTasksForKeyResult(ctx context.Context, keyResultID int) ([]int, error) {
	query := `
		SELECT task_id
		FROM task_key_result_associations
		WHERE key_result_id = $1 AND deleted_at IS NULL`
	
	rows, err := r.db.QueryContext(ctx, query, keyResultID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var taskIDs []int
	for rows.Next() {
		var taskID int
		if err := rows.Scan(&taskID); err != nil {
			return nil, err
		}
		taskIDs = append(taskIDs, taskID)
	}
	
	return taskIDs, nil
}

// GetProgressLogsByKeyResult returns logs for a key result
func (r *okrRepository) GetProgressLogsByKeyResult(ctx context.Context, keyResultID int, limit, offset int) ([]*models.OKRProgressLog, int, error) {
	if limit <= 0 { limit = 20 }
	if offset < 0 { offset = 0 }

	countQuery := `SELECT COUNT(*) FROM okr_progress_logs WHERE key_result_id = $1`
	var total int
	if err := r.db.QueryRowContext(ctx, countQuery, keyResultID).Scan(&total); err != nil {
		return nil, 0, err
	}

	query := `
		SELECT id, objective_id, key_result_id, user_id, change_type, field_name,
		       previous_value, new_value, reason, ip_address, user_agent, created_at
		FROM okr_progress_logs
		WHERE key_result_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3`
	rows, err := r.db.QueryContext(ctx, query, keyResultID, limit, offset)
	if err != nil { return nil, 0, err }
	defer rows.Close()
	var logs []*models.OKRProgressLog
	for rows.Next() {
		var l models.OKRProgressLog
		var prevVal, newVal, reason, ipAddr, userAgent sql.NullString
		if err := rows.Scan(
			&l.ID, &l.ObjectiveID, &l.KeyResultID, &l.UserID, &l.ChangeType, &l.FieldName,
			&prevVal, &newVal, &reason, &ipAddr, &userAgent, &l.CreatedAt,
		); err != nil { return nil, 0, err }
		if prevVal.Valid { l.PreviousValue = &prevVal.String }
		if newVal.Valid { l.NewValue = &newVal.String }
		if reason.Valid { l.Reason = &reason.String }
		if ipAddr.Valid { l.IPAddress = &ipAddr.String }
		if userAgent.Valid { l.UserAgent = &userAgent.String }
		logs = append(logs, &l)
	}
	if err = rows.Err(); err != nil { return nil, 0, err }
	
	return logs, total, nil
}
