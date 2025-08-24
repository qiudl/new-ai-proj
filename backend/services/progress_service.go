
package services

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"encoding/json"
	"fmt"
	"math"
	"time"
)

// ProgressService handles progress calculation for tasks and entities
type ProgressService struct {
	db     database.DB
	config *ProgressConfig
}

// ProgressConfig represents the configuration for progress calculation
type ProgressConfig struct {
	ID                 int                    `json:"id" db:"id"`
	ConfigName         string                 `json:"config_name" db:"config_name"`
	StatusProgressMap  map[string]float64     `json:"status_progress_map" db:"status_progress_map"`
	IncludeCancelled   bool                   `json:"include_cancelled" db:"include_cancelled"`
	IncludeArchived    bool                   `json:"include_archived" db:"include_archived"`
	BlockedPolicy      string                 `json:"blocked_policy" db:"blocked_policy"`
	DefaultWeightField string                 `json:"default_weight_field" db:"default_weight_field"`
	EnableCaching      bool                   `json:"enable_caching" db:"enable_caching"`
	CacheTTLSeconds    int                    `json:"cache_ttl_seconds" db:"cache_ttl_seconds"`
}

// ProgressResult represents the result of a progress calculation
type ProgressResult struct {
	EntityType    string                 `json:"entity_type"`
	EntityID      int                    `json:"entity_id"`
	Progress      float64                `json:"progress"`
	MethodUsed    string                 `json:"method_used"`
	UpdatedAt     time.Time              `json:"updated_at"`
	Breakdown     []ProgressBreakdown    `json:"breakdown,omitempty"`
	Inputs        map[string]interface{} `json:"inputs,omitempty"`
	ConfigVersion int                    `json:"config_version,omitempty"`
}

// ProgressBreakdown represents the progress breakdown of child items
type ProgressBreakdown struct {
	ID       int     `json:"id"`
	Title    string  `json:"title,omitempty"`
	Progress float64 `json:"progress"`
	Weight   float64 `json:"weight"`
	Status   string  `json:"status"`
	Method   string  `json:"method,omitempty"`
}

// TaskWithProgress extends Task with progress-specific fields
type TaskWithProgress struct {
	models.Task
	ManualProgressOverride bool     `db:"manual_progress_override"`
	ManualProgressValue    *float64 `db:"manual_progress_value"`
	ChecklistTotal         int      `db:"checklist_total"`
	ChecklistDone          int      `db:"checklist_done"`
	ActualSpentSeconds     int64    `db:"actual_spent_seconds"`
	StoryPoints            *float64 `db:"story_points"`
}

// NewProgressService creates a new progress service instance
func NewProgressService(db database.DB) (*ProgressService, error) {
	service := &ProgressService{
		db: db,
	}
	
	// Load default configuration
	config, err := service.loadConfig("default")
	if err != nil {
		return nil, fmt.Errorf("failed to load progress config: %v", err)
	}
	service.config = config
	
	return service, nil
}

// CalculateProgress calculates progress for a given entity
func (s *ProgressService) CalculateProgress(entityType string, entityID int, useCache bool) (*ProgressResult, error) {
	// Check cache if enabled
	if useCache && s.config.EnableCaching {
		cached, err := s.getFromCache(entityType, entityID)
		if err == nil && cached != nil {
			return cached, nil
		}
	}
	
	// Calculate based on entity type
	var result *ProgressResult
	var err error
	
	switch entityType {
	case "task":
		result, err = s.calculateTaskProgress(entityID)
	case "project":
		result, err = s.calculateProjectProgress(entityID)
	default:
		return nil, fmt.Errorf("unsupported entity type: %s", entityType)
	}
	
	if err != nil {
		return nil, err
	}
	
	// Store in cache if enabled
	if s.config.EnableCaching && result != nil {
		_ = s.storeInCache(result)
	}
	
	return result, nil
}

// calculateTaskProgress calculates progress for a single task
func (s *ProgressService) calculateTaskProgress(taskID int) (*ProgressResult, error) {
	// Get task with progress fields
	task, err := s.getTaskWithProgress(taskID)
	if err != nil {
		return nil, fmt.Errorf("failed to get task: %v", err)
	}
	
	// Check if task has children
	hasChildren, err := s.taskHasChildren(taskID)
	if err != nil {
		return nil, err
	}
	
	var progress float64
	var method string
	var breakdown []ProgressBreakdown
	
	if hasChildren {
		// Calculate parent progress based on children
		progress, breakdown, err = s.calculateParentProgress(taskID)
		if err != nil {
			return nil, err
		}
		method = "weighted_avg(children)"
	} else {
		// Calculate leaf task progress
		progress, method = s.calculateLeafProgress(task)
	}
	
	// Round to 1 decimal place
	progress = math.Round(progress*10) / 10
	
	result := &ProgressResult{
		EntityType:    "task",
		EntityID:      taskID,
		Progress:      progress,
		MethodUsed:    method,
		UpdatedAt:     time.Now(),
		Breakdown:     breakdown,
		ConfigVersion: s.config.ID,
		Inputs: map[string]interface{}{
			"status_map":       s.config.StatusProgressMap,
			"weight_by":        s.config.DefaultWeightField,
			"excluded_status":  s.getExcludedStatuses(),
		},
	}
	
	return result, nil
}

// calculateLeafProgress calculates progress for a leaf task (no children)
func (s *ProgressService) calculateLeafProgress(task *TaskWithProgress) (float64, string) {
	// Priority 1: Manual override
	if task.ManualProgressOverride && task.ManualProgressValue != nil {
		return s.clampProgress(*task.ManualProgressValue), "manual_override"
	}
	
	// Priority 2: Checklist completion
	if task.ChecklistTotal > 0 {
		progress := (float64(task.ChecklistDone) / float64(task.ChecklistTotal)) * 100
		return s.clampProgress(progress), "checklist"
	}
	
	// Priority 3: Time-based progress (actual vs estimated)
	if task.EstimatedHours != nil && *task.EstimatedHours > 0 && task.ActualSpentSeconds > 0 {
		actualHours := float64(task.ActualSpentSeconds) / 3600.0
		progress := (actualHours / *task.EstimatedHours) * 100
		return s.clampProgress(progress), "time_tracking"
	}
	
	// Priority 4: Time-based progress using EstimatedMinutes
	if task.EstimatedMinutes > 0 && task.ActualSpentSeconds > 0 {
		actualMinutes := float64(task.ActualSpentSeconds) / 60.0
		progress := (actualMinutes / float64(task.EstimatedMinutes)) * 100
		return s.clampProgress(progress), "time_tracking_minutes"
	}
	
	// Priority 5: Status mapping
	if progress, exists := s.config.StatusProgressMap[task.Status]; exists {
		return progress, "status_mapping"
	}
	
	// Default to 0
	return 0, "default"
}

// calculateParentProgress calculates weighted average progress of children
func (s *ProgressService) calculateParentProgress(parentID int) (float64, []ProgressBreakdown, error) {
	// Get children tasks
	children, err := s.getChildrenTasks(parentID)
	if err != nil {
		return 0, nil, err
	}
	
	if len(children) == 0 {
		// No children, treat as leaf
		parent, err := s.getTaskWithProgress(parentID)
		if err != nil {
			return 0, nil, err
		}
		progress, method := s.calculateLeafProgress(parent)
		return progress, []ProgressBreakdown{{
			ID:       parentID,
			Progress: progress,
			Weight:   1,
			Status:   parent.Status,
			Method:   method,
		}}, nil
	}
	
	var totalWeight float64
	var weightedSum float64
	breakdown := make([]ProgressBreakdown, 0, len(children))
	
	for _, child := range children {
		// Skip excluded statuses
		if s.shouldExcludeTask(&child) {
			continue
		}
		
		// Calculate child progress (recursive)
		childResult, err := s.calculateTaskProgress(child.ID)
		if err != nil {
			return 0, nil, err
		}
		
		// Determine weight
		weight := s.getTaskWeight(&child)
		
		// Handle blocked tasks based on policy
		childProgress := childResult.Progress
		if child.Status == "blocked" {
			switch s.config.BlockedPolicy {
			case "zero":
				childProgress = 0
			case "ignore":
				continue // Skip this task entirely
			case "last_known":
				// Keep the calculated progress
			}
		}
		
		totalWeight += weight
		weightedSum += childProgress * weight
		
		breakdown = append(breakdown, ProgressBreakdown{
			ID:       child.ID,
			Title:    child.Title,
			Progress: childProgress,
			Weight:   weight,
			Status:   child.Status,
			Method:   childResult.MethodUsed,
		})
	}
	
	if totalWeight == 0 {
		return 0, breakdown, nil
	}
	
	progress := weightedSum / totalWeight
	return s.clampProgress(progress), breakdown, nil
}

// calculateProjectProgress calculates progress for an entire project
func (s *ProgressService) calculateProjectProgress(projectID int) (*ProgressResult, error) {
	// Get all root tasks for the project (tasks without parent_id)
	query := `
		SELECT t.*, 
		       t.manual_progress_override,
		       t.manual_progress_value,
		       t.checklist_total,
		       t.checklist_done,
		       t.actual_spent_seconds,
		       t.story_points
		FROM tasks t
		WHERE t.project_id = $1 
		  AND t.parent_id IS NULL
		  AND t.deleted_at IS NULL
		ORDER BY t.sort_order, t.id`
	
	var tasks []TaskWithProgress
	err := s.db.Select(&tasks, query, projectID)
	if err != nil {
		return nil, fmt.Errorf("failed to get project tasks: %v", err)
	}
	
	if len(tasks) == 0 {
		return &ProgressResult{
			EntityType: "project",
			EntityID:   projectID,
			Progress:   0,
			MethodUsed: "no_tasks",
			UpdatedAt:  time.Now(),
		}, nil
	}
	
	var totalWeight float64
	var weightedSum float64
	breakdown := make([]ProgressBreakdown, 0, len(tasks))
	
	for _, task := range tasks {
		// Skip excluded statuses
		if s.shouldExcludeTask(&task) {
			continue
		}
		
		// Calculate task progress (recursive if has children)
		taskResult, err := s.calculateTaskProgress(task.ID)
		if err != nil {
			return nil, err
		}
		
		// Determine weight
		weight := s.getTaskWeight(&task)
		
		totalWeight += weight
		weightedSum += taskResult.Progress * weight
		
		breakdown = append(breakdown, ProgressBreakdown{
			ID:       task.ID,
			Title:    task.Title,
			Progress: taskResult.Progress,
			Weight:   weight,
			Status:   task.Status,
			Method:   taskResult.MethodUsed,
		})
	}
	
	if totalWeight == 0 {
		return &ProgressResult{
			EntityType: "project",
			EntityID:   projectID,
			Progress:   0,
			MethodUsed: "no_weighted_tasks",
			UpdatedAt:  time.Now(),
			Breakdown:  breakdown,
		}, nil
	}
	
	progress := s.clampProgress(weightedSum / totalWeight)
	
	return &ProgressResult{
		EntityType:    "project",
		EntityID:      projectID,
		Progress:      math.Round(progress*10) / 10,
		MethodUsed:    "weighted_avg(root_tasks)",
		UpdatedAt:     time.Now(),
		Breakdown:     breakdown,
		ConfigVersion: s.config.ID,
		Inputs: map[string]interface{}{
			"weight_by":       s.config.DefaultWeightField,
			"excluded_status": s.getExcludedStatuses(),
			"task_count":      len(tasks),
		},
	}, nil
}

// Helper methods

func (s *ProgressService) getTaskWithProgress(taskID int) (*TaskWithProgress, error) {
	query := `
		SELECT t.*, 
		       COALESCE(t.manual_progress_override, false) as manual_progress_override,
		       t.manual_progress_value,
		       COALESCE(t.checklist_total, 0) as checklist_total,
		       COALESCE(t.checklist_done, 0) as checklist_done,
		       COALESCE(t.actual_spent_seconds, 0) as actual_spent_seconds,
		       t.story_points
		FROM tasks t
		WHERE t.id = $1 AND t.deleted_at IS NULL`
	
	var task TaskWithProgress
	err := s.db.Get(&task, query, taskID)
	if err != nil {
		return nil, err
	}
	
	return &task, nil
}

func (s *ProgressService) getChildrenTasks(parentID int) ([]TaskWithProgress, error) {
	query := `
		SELECT t.*, 
		       COALESCE(t.manual_progress_override, false) as manual_progress_override,
		       t.manual_progress_value,
		       COALESCE(t.checklist_total, 0) as checklist_total,
		       COALESCE(t.checklist_done, 0) as checklist_done,
		       COALESCE(t.actual_spent_seconds, 0) as actual_spent_seconds,
		       t.story_points
		FROM tasks t
		WHERE t.parent_id = $1 AND t.deleted_at IS NULL
		ORDER BY t.sort_order, t.id`
	
	var tasks []TaskWithProgress
	err := s.db.Select(&tasks, query, parentID)
	if err != nil {
		return nil, err
	}
	
	return tasks, nil
}

func (s *ProgressService) taskHasChildren(taskID int) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM tasks WHERE parent_id = $1 AND deleted_at IS NULL)`
	var exists bool
	err := s.db.Get(&exists, query, taskID)
	return exists, err
}

func (s *ProgressService) getTaskWeight(task *TaskWithProgress) float64 {
	switch s.config.DefaultWeightField {
	case "story_points":
		if task.StoryPoints != nil && *task.StoryPoints > 0 {
			return *task.StoryPoints
		}
	case "estimated_hours":
		if task.EstimatedHours != nil && *task.EstimatedHours > 0 {
			return *task.EstimatedHours
		}
	case "estimated_minutes":
		if task.EstimatedMinutes > 0 {
			return float64(task.EstimatedMinutes)
		}
	}
	// Default weight is 1
	return 1.0
}

func (s *ProgressService) shouldExcludeTask(task *TaskWithProgress) bool {
	if !s.config.IncludeCancelled && task.Status == "cancelled" {
		return true
	}
	if !s.config.IncludeArchived && task.Status == "archived" {
		return true
	}
	return false
}

func (s *ProgressService) getExcludedStatuses() []string {
	excluded := []string{}
	if !s.config.IncludeCancelled {
		excluded = append(excluded, "cancelled")
	}
	if !s.config.IncludeArchived {
		excluded = append(excluded, "archived")
	}
	return excluded
}

func (s *ProgressService) clampProgress(progress float64) float64 {
	if progress < 0 {
		return 0
	}
	if progress > 100 {
		return 100
	}
	return progress
}

func (s *ProgressService) loadConfig(configName string) (*ProgressConfig, error) {
	query := `
		SELECT id, config_name, status_progress_map, include_cancelled, 
		       include_archived, blocked_policy, default_weight_field,
		       enable_caching, cache_ttl_seconds
		FROM progress_config
		WHERE config_name = $1`
	
	var config ProgressConfig
	var statusMapJSON []byte
	
	row := s.db.QueryRow(query, configName)
	err := row.Scan(
		&config.ID,
		&config.ConfigName,
		&statusMapJSON,
		&config.IncludeCancelled,
		&config.IncludeArchived,
		&config.BlockedPolicy,
		&config.DefaultWeightField,
		&config.EnableCaching,
		&config.CacheTTLSeconds,
	)
	
	if err != nil {
		return nil, err
	}
	
	// Parse status progress map
	if err := json.Unmarshal(statusMapJSON, &config.StatusProgressMap); err != nil {
		return nil, fmt.Errorf("failed to parse status_progress_map: %v", err)
	}
	
	return &config, nil
}

// Cache methods

func (s *ProgressService) getFromCache(entityType string, entityID int) (*ProgressResult, error) {
	query := `
		SELECT progress, method_used, computed_at, breakdown, inputs
		FROM progress_cache
		WHERE entity_type = $1 AND entity_id = $2 
		  AND is_stale = false AND expires_at > NOW()`
	
	var progress float64
	var methodUsed string
	var computedAt time.Time
	var breakdownJSON, inputsJSON []byte
	
	err := s.db.QueryRow(query, entityType, entityID).Scan(
		&progress, &methodUsed, &computedAt, &breakdownJSON, &inputsJSON,
	)
	
	if err != nil {
		return nil, err
	}
	
	result := &ProgressResult{
		EntityType: entityType,
		EntityID:   entityID,
		Progress:   progress,
		MethodUsed: methodUsed,
		UpdatedAt:  computedAt,
	}
	
	// Parse breakdown if present
	if len(breakdownJSON) > 0 {
		_ = json.Unmarshal(breakdownJSON, &result.Breakdown)
	}
	
	// Parse inputs if present
	if len(inputsJSON) > 0 {
		_ = json.Unmarshal(inputsJSON, &result.Inputs)
	}
	
	return result, nil
}

func (s *ProgressService) storeInCache(result *ProgressResult) error {
	breakdownJSON, _ := json.Marshal(result.Breakdown)
	inputsJSON, _ := json.Marshal(result.Inputs)
	
	expiresAt := time.Now().Add(time.Duration(s.config.CacheTTLSeconds) * time.Second)
	
	query := `
		INSERT INTO progress_cache 
		(entity_type, entity_id, progress, method_used, computed_at, expires_at, breakdown, inputs, is_stale)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false)
		ON CONFLICT (entity_type, entity_id) 
		DO UPDATE SET 
			progress = EXCLUDED.progress,
			method_used = EXCLUDED.method_used,
			computed_at = EXCLUDED.computed_at,
			expires_at = EXCLUDED.expires_at,
			breakdown = EXCLUDED.breakdown,
			inputs = EXCLUDED.inputs,
			is_stale = false`
	
	_, err := s.db.Exec(query,
		result.EntityType,
		result.EntityID,
		result.Progress,
		result.MethodUsed,
		result.UpdatedAt,
		expiresAt,
		breakdownJSON,
		inputsJSON,
	)
	
	return err
}

// SaveSnapshot saves a progress snapshot for historical tracking
func (s *ProgressService) SaveSnapshot(result *ProgressResult) error {
	breakdownJSON, _ := json.Marshal(result.Breakdown)
	inputsJSON, _ := json.Marshal(result.Inputs)
	
	query := `
		INSERT INTO progress_snapshots 
		(entity_type, entity_id, progress, method_used, computed_at, inputs, breakdown, config_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`
	
	_, err := s.db.Exec(query,
		result.EntityType,
		result.EntityID,
		result.Progress,
		result.MethodUsed,
		result.UpdatedAt,
		inputsJSON,
		breakdownJSON,
		s.config.ID,
	)
	
	return err
}

// GetSnapshots retrieves historical progress snapshots
func (s *ProgressService) GetSnapshots(entityType string, entityID int, from, to time.Time) ([]ProgressResult, error) {
	query := `
		SELECT entity_type, entity_id, progress, method_used, computed_at, breakdown, inputs
		FROM progress_snapshots
		WHERE entity_type = $1 AND entity_id = $2 
		  AND computed_at >= $3 AND computed_at <= $4
		ORDER BY computed_at DESC`
	
	rows, err := s.db.Query(query, entityType, entityID, from, to)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var snapshots []ProgressResult
	for rows.Next() {
		var result ProgressResult
		var breakdownJSON, inputsJSON []byte
		
		err := rows.Scan(
			&result.EntityType,
			&result.EntityID,
			&result.Progress,
			&result.MethodUsed,
			&result.UpdatedAt,
			&breakdownJSON,
			&inputsJSON,
		)
		
		if err != nil {
			continue
		}
		
		// Parse JSON fields
		if len(breakdownJSON) > 0 {
			_ = json.Unmarshal(breakdownJSON, &result.Breakdown)
		}
		if len(inputsJSON) > 0 {
			_ = json.Unmarshal(inputsJSON, &result.Inputs)
		}
		
		snapshots = append(snapshots, result)
	}
	
	return snapshots, nil
}
