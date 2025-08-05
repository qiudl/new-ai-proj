package router

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"
)

// TaskRoutes 任务路由处理器
type TaskRoutes struct {
	db *sql.DB
}

// NewTaskRoutes 创建任务路由实例
func NewTaskRoutes(db *sql.DB) *TaskRoutes {
	return &TaskRoutes{db: db}
}

// Task 任务模型
type Task struct {
	ID          int            `json:"id"`
	Title       string         `json:"title"`
	Description string         `json:"description"`
	Status      string         `json:"status"`
	ProjectID   int            `json:"project_id"`
	AssigneeID  *int           `json:"assignee_id"`
	ParentID    *int           `json:"parent_id"`
	DueDate     *string        `json:"due_date"`
	CreatedAt   string         `json:"created_at"`
	CustomFields map[string]interface{} `json:"custom_fields,omitempty"`
}

// HandleTasks 处理 /api/tasks 路由
func (tr *TaskRoutes) HandleTasks(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		tr.getTasks(w, r)
	case http.MethodPost:
		tr.createTask(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// HandleTask 处理 /api/tasks/{id} 路由
func (tr *TaskRoutes) HandleTask(w http.ResponseWriter, r *http.Request) {
	// 从URL路径中提取任务ID
	path := strings.TrimPrefix(r.URL.Path, "/api/tasks/")
	if path == "" {
		http.Error(w, "Task ID is required", http.StatusBadRequest)
		return
	}

	id, err := strconv.Atoi(path)
	if err != nil {
		http.Error(w, "Invalid task ID", http.StatusBadRequest)
		return
	}

	switch r.Method {
	case http.MethodGet:
		tr.getTask(w, r, id)
	case http.MethodPut:
		tr.updateTask(w, r, id)
	case http.MethodDelete:
		tr.deleteTask(w, r, id)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// HandleSubTasks 处理子任务创建
func (tr *TaskRoutes) HandleSubTasks(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	tr.createSubTask(w, r)
}

// getTasks 获取任务列表
func (tr *TaskRoutes) getTasks(w http.ResponseWriter, r *http.Request) {
	projectIDStr := r.URL.Query().Get("project_id")
	
	var query string
	var args []interface{}
	
	if projectIDStr != "" {
		projectID, err := strconv.Atoi(projectIDStr)
		if err != nil {
			http.Error(w, "Invalid project ID", http.StatusBadRequest)
			return
		}
		query = `
			SELECT id, title, description, status, project_id, assignee_id, 
			       parent_id, due_date, created_at, custom_fields 
			FROM tasks 
			WHERE project_id = ? 
			ORDER BY created_at DESC
		`
		args = append(args, projectID)
	} else {
		query = `
			SELECT id, title, description, status, project_id, assignee_id, 
			       parent_id, due_date, created_at, custom_fields 
			FROM tasks 
			ORDER BY created_at DESC
		`
	}

	rows, err := tr.db.Query(query, args...)
	if err != nil {
		http.Error(w, fmt.Sprintf("查询任务失败: %v", err), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var tasks []Task
	for rows.Next() {
		var task Task
		var createdAt time.Time
		var dueDateStr sql.NullString
		var customFieldsStr sql.NullString

		err := rows.Scan(
			&task.ID, &task.Title, &task.Description, &task.Status,
			&task.ProjectID, &task.AssigneeID, &task.ParentID,
			&dueDateStr, &createdAt, &customFieldsStr,
		)
		if err != nil {
			http.Error(w, fmt.Sprintf("扫描任务数据失败: %v", err), http.StatusInternalServerError)
			return
		}

		task.CreatedAt = createdAt.Format("2006-01-02 15:04:05")
		
		if dueDateStr.Valid {
			task.DueDate = &dueDateStr.String
		}

		// 解析自定义字段
		if customFieldsStr.Valid && customFieldsStr.String != "" {
			if err := json.Unmarshal([]byte(customFieldsStr.String), &task.CustomFields); err != nil {
				// 如果解析失败，设置为空的map
				task.CustomFields = make(map[string]interface{})
			}
		}

		tasks = append(tasks, task)
	}

	if err = rows.Err(); err != nil {
		http.Error(w, fmt.Sprintf("处理任务数据失败: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(tasks); err != nil {
		http.Error(w, fmt.Sprintf("编码响应失败: %v", err), http.StatusInternalServerError)
	}
}

// createTask 创建新任务
func (tr *TaskRoutes) createTask(w http.ResponseWriter, r *http.Request) {
	var task Task
	if err := json.NewDecoder(r.Body).Decode(&task); err != nil {
		http.Error(w, fmt.Sprintf("解析请求体失败: %v", err), http.StatusBadRequest)
		return
	}

	// 验证必填字段
	if task.Title == "" {
		http.Error(w, "任务标题不能为空", http.StatusBadRequest)
		return
	}
	if task.ProjectID == 0 {
		http.Error(w, "项目ID不能为空", http.StatusBadRequest)
		return
	}

	// 检查任务标题是否在同一项目中重复
	var existingTaskID int
	err := tr.db.QueryRow(`
		SELECT id FROM tasks 
		WHERE title = ? AND project_id = ? AND deleted_at IS NULL
		LIMIT 1
	`, task.Title, task.ProjectID).Scan(&existingTaskID)
	
	if err != sql.ErrNoRows {
		if err != nil {
			http.Error(w, fmt.Sprintf("检查任务标题重复性失败: %v", err), http.StatusInternalServerError)
			return
		}
		// 如果找到了重复的任务，返回错误
		http.Error(w, fmt.Sprintf("任务标题重复：'%s' 已存在于当前项目中（任务ID: %d）。请修改任务标题后重试，或者查看已存在的任务是否可以复用。", task.Title, existingTaskID), http.StatusConflict)
		return
	}

	// 序列化自定义字段
	var customFieldsJSON []byte
	var err error
	if task.CustomFields != nil {
		customFieldsJSON, err = json.Marshal(task.CustomFields)
		if err != nil {
			http.Error(w, fmt.Sprintf("序列化自定义字段失败: %v", err), http.StatusBadRequest)
			return
		}
	}

	// 插入新任务
	result, err := tr.db.Exec(`
		INSERT INTO tasks (title, description, status, project_id, assignee_id, parent_id, due_date, created_at, custom_fields) 
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, task.Title, task.Description, task.Status, task.ProjectID, task.AssigneeID, task.ParentID, task.DueDate, time.Now(), string(customFieldsJSON))
	
	if err != nil {
		http.Error(w, fmt.Sprintf("创建任务失败: %v", err), http.StatusInternalServerError)
		return
	}

	// 获取新创建任务的ID
	id, err := result.LastInsertId()
	if err != nil {
		http.Error(w, fmt.Sprintf("获取任务ID失败: %v", err), http.StatusInternalServerError)
		return
	}

	task.ID = int(id)
	task.CreatedAt = time.Now().Format("2006-01-02 15:04:05")

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	if err := json.NewEncoder(w).Encode(task); err != nil {
		http.Error(w, fmt.Sprintf("编码响应失败: %v", err), http.StatusInternalServerError)
	}
}

// getTask 获取单个任务
func (tr *TaskRoutes) getTask(w http.ResponseWriter, r *http.Request, id int) {
	var task Task
	var createdAt time.Time
	var dueDateStr sql.NullString
	var customFieldsStr sql.NullString

	err := tr.db.QueryRow(`
		SELECT id, title, description, status, project_id, assignee_id, parent_id, due_date, created_at, custom_fields 
		FROM tasks WHERE id = ?
	`, id).Scan(
		&task.ID, &task.Title, &task.Description, &task.Status,
		&task.ProjectID, &task.AssigneeID, &task.ParentID,
		&dueDateStr, &createdAt, &customFieldsStr,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "任务不存在", http.StatusNotFound)
		} else {
			http.Error(w, fmt.Sprintf("查询任务失败: %v", err), http.StatusInternalServerError)
		}
		return
	}

	task.CreatedAt = createdAt.Format("2006-01-02 15:04:05")
	
	if dueDateStr.Valid {
		task.DueDate = &dueDateStr.String
	}

	// 解析自定义字段
	if customFieldsStr.Valid && customFieldsStr.String != "" {
		if err := json.Unmarshal([]byte(customFieldsStr.String), &task.CustomFields); err != nil {
			task.CustomFields = make(map[string]interface{})
		}
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(task); err != nil {
		http.Error(w, fmt.Sprintf("编码响应失败: %v", err), http.StatusInternalServerError)
	}
}

// updateTask 更新任务
func (tr *TaskRoutes) updateTask(w http.ResponseWriter, r *http.Request, id int) {
	var task Task
	if err := json.NewDecoder(r.Body).Decode(&task); err != nil {
		http.Error(w, fmt.Sprintf("解析请求体失败: %v", err), http.StatusBadRequest)
		return
	}

	// 验证必填字段
	if task.Title == "" {
		http.Error(w, "任务标题不能为空", http.StatusBadRequest)
		return
	}

	// 序列化自定义字段
	var customFieldsJSON []byte
	var err error
	if task.CustomFields != nil {
		customFieldsJSON, err = json.Marshal(task.CustomFields)
		if err != nil {
			http.Error(w, fmt.Sprintf("序列化自定义字段失败: %v", err), http.StatusBadRequest)
			return
		}
	}

	// 更新任务
	result, err := tr.db.Exec(`
		UPDATE tasks 
		SET title = ?, description = ?, status = ?, assignee_id = ?, due_date = ?, custom_fields = ?
		WHERE id = ?
	`, task.Title, task.Description, task.Status, task.AssigneeID, task.DueDate, string(customFieldsJSON), id)
	
	if err != nil {
		http.Error(w, fmt.Sprintf("更新任务失败: %v", err), http.StatusInternalServerError)
		return
	}

	// 检查是否实际更新了记录
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		http.Error(w, fmt.Sprintf("检查更新结果失败: %v", err), http.StatusInternalServerError)
		return
	}

	if rowsAffected == 0 {
		http.Error(w, "任务不存在", http.StatusNotFound)
		return
	}

	task.ID = id
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(task); err != nil {
		http.Error(w, fmt.Sprintf("编码响应失败: %v", err), http.StatusInternalServerError)
	}
}

// deleteTask 删除任务
func (tr *TaskRoutes) deleteTask(w http.ResponseWriter, r *http.Request, id int) {
	// 检查是否有子任务
	var childCount int
	err := tr.db.QueryRow("SELECT COUNT(*) FROM tasks WHERE parent_id = ?", id).Scan(&childCount)
	if err != nil {
		http.Error(w, fmt.Sprintf("检查子任务失败: %v", err), http.StatusInternalServerError)
		return
	}

	if childCount > 0 {
		http.Error(w, fmt.Sprintf("无法删除任务：存在 %d 个子任务", childCount), http.StatusBadRequest)
		return
	}

	// 删除任务
	result, err := tr.db.Exec("DELETE FROM tasks WHERE id = ?", id)
	if err != nil {
		http.Error(w, fmt.Sprintf("删除任务失败: %v", err), http.StatusInternalServerError)
		return
	}

	// 检查是否实际删除了记录
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		http.Error(w, fmt.Sprintf("检查删除结果失败: %v", err), http.StatusInternalServerError)
		return
	}

	if rowsAffected == 0 {
		http.Error(w, "任务不存在", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// createSubTask 创建子任务
func (tr *TaskRoutes) createSubTask(w http.ResponseWriter, r *http.Request) {
	var task Task
	if err := json.NewDecoder(r.Body).Decode(&task); err != nil {
		http.Error(w, fmt.Sprintf("解析请求体失败: %v", err), http.StatusBadRequest)
		return
	}

	// 验证必填字段
	if task.Title == "" {
		http.Error(w, "任务标题不能为空", http.StatusBadRequest)
		return
	}
	if task.ParentID == nil {
		http.Error(w, "父任务ID不能为空", http.StatusBadRequest)
		return
	}

	// 获取父任务信息以继承项目ID
	var parentProjectID int
	err := tr.db.QueryRow("SELECT project_id FROM tasks WHERE id = ?", *task.ParentID).Scan(&parentProjectID)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "父任务不存在", http.StatusBadRequest)
		} else {
			http.Error(w, fmt.Sprintf("查询父任务失败: %v", err), http.StatusInternalServerError)
		}
		return
	}

	// 子任务继承父任务的项目ID
	task.ProjectID = parentProjectID

	// 检查任务标题是否在同一项目中重复
	var existingTaskID int
	err = tr.db.QueryRow(`
		SELECT id FROM tasks 
		WHERE title = ? AND project_id = ? AND deleted_at IS NULL
		LIMIT 1
	`, task.Title, task.ProjectID).Scan(&existingTaskID)
	
	if err != sql.ErrNoRows {
		if err != nil {
			http.Error(w, fmt.Sprintf("检查任务标题重复性失败: %v", err), http.StatusInternalServerError)
			return
		}
		// 如果找到了重复的任务，返回错误
		http.Error(w, fmt.Sprintf("任务标题重复：'%s' 已存在于当前项目中（任务ID: %d）。请修改任务标题后重试，或者查看已存在的任务是否可以复用。", task.Title, existingTaskID), http.StatusConflict)
		return
	}

	// 序列化自定义字段
	var customFieldsJSON []byte
	if task.CustomFields != nil {
		customFieldsJSON, err = json.Marshal(task.CustomFields)
		if err != nil {
			http.Error(w, fmt.Sprintf("序列化自定义字段失败: %v", err), http.StatusBadRequest)
			return
		}
	}

	// 插入子任务
	result, err := tr.db.Exec(`
		INSERT INTO tasks (title, description, status, project_id, assignee_id, parent_id, due_date, created_at, custom_fields) 
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, task.Title, task.Description, task.Status, task.ProjectID, task.AssigneeID, task.ParentID, task.DueDate, time.Now(), string(customFieldsJSON))
	
	if err != nil {
		http.Error(w, fmt.Sprintf("创建子任务失败: %v", err), http.StatusInternalServerError)
		return
	}

	// 获取新创建任务的ID
	id, err := result.LastInsertId()
	if err != nil {
		http.Error(w, fmt.Sprintf("获取任务ID失败: %v", err), http.StatusInternalServerError)
		return
	}

	task.ID = int(id)
	task.CreatedAt = time.Now().Format("2006-01-02 15:04:05")

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	if err := json.NewEncoder(w).Encode(task); err != nil {
		http.Error(w, fmt.Sprintf("编码响应失败: %v", err), http.StatusInternalServerError)
	}
}
