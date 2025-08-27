package database

import (
	"ai-project-backend/models"
	"context"
	"database/sql"
	"fmt"
)

// TaskLTreeRepository 包含使用ltree的任务层级操作
type TaskLTreeRepository struct {
	db interface{}
}

// getExecer returns the appropriate execer (DB or Tx)
func (r *TaskLTreeRepository) getExecer() execer {
	if tx, ok := r.db.(*sql.Tx); ok {
		return tx
	}
	return r.db.(*sql.DB)
}

// NewTaskLTreeRepository creates a new TaskLTreeRepository
func NewTaskLTreeRepository(db interface{}) *TaskLTreeRepository {
	return &TaskLTreeRepository{db: db}
}

// HierarchyInfo 包含任务层级信息
type HierarchyInfo struct {
	ID     int    `json:"id"`
	Title  string `json:"title"`
	Path   string `json:"path"`
	Depth  int    `json:"depth"`
	Level  int    `json:"level"`
}

// GetTaskAncestors 获取任务的所有祖先（包括自己）
func (r *TaskLTreeRepository) GetTaskAncestors(ctx context.Context, taskID int) ([]*HierarchyInfo, error) {
	exec := r.getExecer()
	
	query := `SELECT id, title, level FROM get_task_ancestors($1)`
	
	rows, err := exec.QueryContext(ctx, query, taskID)
	if err != nil {
		return nil, fmt.Errorf("failed to get task ancestors: %w", err)
	}
	defer rows.Close()
	
	var ancestors []*HierarchyInfo
	for rows.Next() {
		var ancestor HierarchyInfo
		err := rows.Scan(&ancestor.ID, &ancestor.Title, &ancestor.Level)
		if err != nil {
			return nil, fmt.Errorf("failed to scan ancestor: %w", err)
		}
		ancestors = append(ancestors, &ancestor)
	}
	
	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating ancestors: %w", err)
	}
	
	return ancestors, nil
}

// GetTaskDescendants 获取任务的所有后代（不包括自己）
func (r *TaskLTreeRepository) GetTaskDescendants(ctx context.Context, taskID int) ([]*HierarchyInfo, error) {
	exec := r.getExecer()
	
	query := `SELECT id, title, level FROM get_task_descendants($1)`
	
	rows, err := exec.QueryContext(ctx, query, taskID)
	if err != nil {
		return nil, fmt.Errorf("failed to get task descendants: %w", err)
	}
	defer rows.Close()
	
	var descendants []*HierarchyInfo
	for rows.Next() {
		var descendant HierarchyInfo
		err := rows.Scan(&descendant.ID, &descendant.Title, &descendant.Level)
		if err != nil {
			return nil, fmt.Errorf("failed to scan descendant: %w", err)
		}
		descendants = append(descendants, &descendant)
	}
	
	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating descendants: %w", err)
	}
	
	return descendants, nil
}

// GetTaskChildren 获取任务的直接子任务（使用ltree优化）
func (r *TaskLTreeRepository) GetTaskChildren(ctx context.Context, taskID int) ([]*models.Task, error) {
	exec := r.getExecer()
	
	// 使用传统的parent_id查询，但加入ltree字段用于排序
	query := `
		SELECT t.id, t.project_id, t.title, t.description, t.status, t.assignee_id, t.due_date, 
		       t.custom_fields, t.parent_id, t.task_level, t.sort_order, t.total_time_seconds,
		       t.dependencies, t.estimated_hours, t.priority, t.tags, t.path, t.depth,
		       t.created_at, t.updated_at, t.deleted_at,
		       COALESCE(c.children_count, 0) as children_count,
		       u.username as assignee_name
		FROM tasks t
		LEFT JOIN (
			SELECT parent_id, COUNT(*) as children_count 
			FROM tasks 
			WHERE deleted_at IS NULL AND parent_id IS NOT NULL 
			GROUP BY parent_id
		) c ON t.id = c.parent_id
		LEFT JOIN users u ON t.assignee_id = u.id
		WHERE t.parent_id = $1 AND t.deleted_at IS NULL
		ORDER BY t.path ASC, t.sort_order ASC, t.created_at ASC`
	
	rows, err := exec.QueryContext(ctx, query, taskID)
	if err != nil {
		return nil, fmt.Errorf("failed to get task children: %w", err)
	}
	defer rows.Close()
	
	var tasks []*models.Task
	for rows.Next() {
		task := &models.Task{}
		var customFieldsJSON, dependenciesJSON, tagsJSON sql.NullString
		var assigneeName sql.NullString
		var pathStr sql.NullString
		
		err := rows.Scan(
			&task.ID, &task.ProjectID, &task.Title, &task.Description, &task.Status,
			&task.AssigneeID, &task.DueDate, &customFieldsJSON, &task.ParentID,
			&task.TaskLevel, &task.SortOrder, &task.TotalTimeSeconds,
			&dependenciesJSON, &task.EstimatedHours, &task.Priority, &tagsJSON, 
			&pathStr, &task.Depth,
			&task.CreatedAt, &task.UpdatedAt, &task.DeletedAt,
			&task.ChildrenCount, &assigneeName,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan task: %w", err)
		}
		
		// 处理JSONB字段...（这部分代码与现有代码类似）
		
		tasks = append(tasks, task)
	}
	
	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating tasks: %w", err)
	}
	
	return tasks, nil
}

// GetTasksByDepth 获取指定深度的所有任务
func (r *TaskLTreeRepository) GetTasksByDepth(ctx context.Context, projectID int, depth int) ([]*models.Task, error) {
	exec := r.getExecer()
	
	query := `
		SELECT id, title, parent_id, path, depth, status, created_at
		FROM tasks 
		WHERE project_id = $1 AND depth = $2 AND deleted_at IS NULL
		ORDER BY path`
	
	rows, err := exec.QueryContext(ctx, query, projectID, depth)
	if err != nil {
		return nil, fmt.Errorf("failed to get tasks by depth: %w", err)
	}
	defer rows.Close()
	
	var tasks []*models.Task
	for rows.Next() {
		task := &models.Task{}
		var pathStr sql.NullString
		
		err := rows.Scan(
			&task.ID, &task.Title, &task.ParentID, &pathStr, 
			&task.Depth, &task.Status, &task.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan task: %w", err)
		}
		
		tasks = append(tasks, task)
	}
	
	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating tasks: %w", err)
	}
	
	return tasks, nil
}

// FindTasksByPathPattern 使用ltree路径模式查找任务
func (r *TaskLTreeRepository) FindTasksByPathPattern(ctx context.Context, projectID int, pattern string) ([]*models.Task, error) {
	exec := r.getExecer()
	
	query := `
		SELECT id, title, parent_id, path, depth, status, created_at
		FROM tasks 
		WHERE project_id = $1 AND path ~ $2 AND deleted_at IS NULL
		ORDER BY path`
	
	rows, err := exec.QueryContext(ctx, query, projectID, pattern)
	if err != nil {
		return nil, fmt.Errorf("failed to find tasks by pattern: %w", err)
	}
	defer rows.Close()
	
	var tasks []*models.Task
	for rows.Next() {
		task := &models.Task{}
		var pathStr sql.NullString
		
		err := rows.Scan(
			&task.ID, &task.Title, &task.ParentID, &pathStr, 
			&task.Depth, &task.Status, &task.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan task: %w", err)
		}
		
		tasks = append(tasks, task)
	}
	
	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating tasks: %w", err)
	}
	
	return tasks, nil
}

// MoveTask 移动任务到新的父任务
func (r *TaskLTreeRepository) MoveTask(ctx context.Context, taskID int, newParentID *int) error {
	exec := r.getExecer()
	
	var query string
	var args []interface{}
	
	if newParentID != nil {
		query = `SELECT move_task_to_parent($1, $2)`
		args = []interface{}{taskID, *newParentID}
	} else {
		query = `SELECT move_task_to_parent($1)`
		args = []interface{}{taskID}
	}
	
	var success bool
	err := exec.QueryRowContext(ctx, query, args...).Scan(&success)
	if err != nil {
		return fmt.Errorf("failed to move task: %w", err)
	}
	
	if !success {
		return fmt.Errorf("failed to move task %d", taskID)
	}
	
	return nil
}

// IsTaskAncestor 检查一个任务是否是另一个任务的祖先
func (r *TaskLTreeRepository) IsTaskAncestor(ctx context.Context, ancestorID, descendantID int) (bool, error) {
	exec := r.getExecer()
	
	query := `SELECT is_task_ancestor($1, $2)`
	
	var isAncestor bool
	err := exec.QueryRowContext(ctx, query, ancestorID, descendantID).Scan(&isAncestor)
	if err != nil {
		return false, fmt.Errorf("failed to check task ancestry: %w", err)
	}
	
	return isAncestor, nil
}

// GetTaskHierarchyStats 获取任务层级统计信息
func (r *TaskLTreeRepository) GetTaskHierarchyStats(ctx context.Context, projectID int) (map[string]interface{}, error) {
	exec := r.getExecer()
	
	query := `
		SELECT 
			COUNT(*) as total_tasks,
			MAX(depth) as max_depth,
			COUNT(CASE WHEN parent_id IS NULL THEN 1 END) as root_tasks,
			COUNT(CASE WHEN depth = 1 THEN 1 END) as level1_tasks,
			COUNT(CASE WHEN depth = 2 THEN 1 END) as level2_tasks,
			COUNT(CASE WHEN depth >= 3 THEN 1 END) as deep_tasks
		FROM tasks 
		WHERE project_id = $1 AND deleted_at IS NULL`
	
	var stats map[string]interface{}
	var totalTasks, maxDepth, rootTasks, level1Tasks, level2Tasks, deepTasks int
	
	err := exec.QueryRowContext(ctx, query, projectID).Scan(
		&totalTasks, &maxDepth, &rootTasks, &level1Tasks, &level2Tasks, &deepTasks)
	if err != nil {
		return nil, fmt.Errorf("failed to get hierarchy stats: %w", err)
	}
	
	stats = map[string]interface{}{
		"total_tasks":  totalTasks,
		"max_depth":    maxDepth,
		"root_tasks":   rootTasks,
		"level1_tasks": level1Tasks,
		"level2_tasks": level2Tasks,
		"deep_tasks":   deepTasks,
	}
	
	return stats, nil
}

// RefreshTaskPaths 刷新所有任务的ltree路径
func (r *TaskLTreeRepository) RefreshTaskPaths(ctx context.Context) error {
	exec := r.getExecer()
	
	_, err := exec.ExecContext(ctx, "SELECT refresh_all_task_paths()")
	if err != nil {
		return fmt.Errorf("failed to refresh task paths: %w", err)
	}
	
	return nil
}
