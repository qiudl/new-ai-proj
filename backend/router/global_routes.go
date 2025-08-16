package router

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// GlobalRoutes 全局路由处理器
type GlobalRoutes struct {
	db *sql.DB
}

// NewGlobalRoutes 创建全局路由实例
func NewGlobalRoutes(db *sql.DB) *GlobalRoutes {
	return &GlobalRoutes{db: db}
}

// TaskResponse 任务响应模型（用于全局任务列表）
type TaskResponse struct {
	ID           int                    `json:"id"`
	Title        string                 `json:"title"`
	Description  string                 `json:"description"`
	Status       string                 `json:"status"`
	ProjectID    int                    `json:"project_id"`
	ProjectName  string                 `json:"project_name"`
	AssigneeID   *int                   `json:"assignee_id"`
	AssigneeName *string                `json:"assignee_name"`
	ParentID     *int                   `json:"parent_id"`
	DueDate      *string                `json:"due_date"`
	CreatedAt    string                 `json:"created_at"`
	CustomFields map[string]interface{} `json:"custom_fields,omitempty"`
	Depth        int                    `json:"depth"`        // 任务层级深度
	HasChildren  bool                   `json:"has_children"` // 是否有子任务
}

// HandleGlobalTasks 处理全局任务列表
func (gr *GlobalRoutes) HandleGlobalTasks(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	gr.getGlobalTasks(w, r)
}

// getGlobalTasks 获取全局任务列表，包含项目信息和层级关系
func (gr *GlobalRoutes) getGlobalTasks(w http.ResponseWriter, r *http.Request) {
	query := `
		SELECT 
			t.id, t.title, t.description, t.status, t.project_id, t.assignee_id, 
			t.parent_id, t.due_date, t.created_at, t.custom_fields,
			COALESCE(p.name, '未知项目') as project_name,
			u.name as assignee_name,
			(SELECT COUNT(*) FROM tasks sub WHERE sub.parent_id = t.id) as children_count
		FROM tasks t
		LEFT JOIN projects p ON t.project_id = p.id
		LEFT JOIN users u ON t.assignee_id = u.id
		ORDER BY t.project_id, t.parent_id IS NULL DESC, t.created_at ASC
	`

	rows, err := gr.db.Query(query)
	if err != nil {
		http.Error(w, fmt.Sprintf("查询全局任务失败: %v", err), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var tasks []TaskResponse
	taskMap := make(map[int]*TaskResponse) // 用于构建层级关系

	for rows.Next() {
		var task TaskResponse
		var createdAt time.Time
		var dueDateStr sql.NullString
		var customFieldsStr sql.NullString
		var assigneeNameStr sql.NullString
		var childrenCount int

		err := rows.Scan(
			&task.ID, &task.Title, &task.Description, &task.Status,
			&task.ProjectID, &task.AssigneeID, &task.ParentID,
			&dueDateStr, &createdAt, &customFieldsStr,
			&task.ProjectName, &assigneeNameStr, &childrenCount,
		)
		if err != nil {
			http.Error(w, fmt.Sprintf("扫描全局任务数据失败: %v", err), http.StatusInternalServerError)
			return
		}

		task.CreatedAt = createdAt.Format("2006-01-02 15:04:05")
		
		if dueDateStr.Valid {
			task.DueDate = &dueDateStr.String
		}

		if assigneeNameStr.Valid {
			task.AssigneeName = &assigneeNameStr.String
		}

		task.HasChildren = childrenCount > 0

		// 解析自定义字段
		if customFieldsStr.Valid && customFieldsStr.String != "" {
			if err := json.Unmarshal([]byte(customFieldsStr.String), &task.CustomFields); err != nil {
				task.CustomFields = make(map[string]interface{})
			}
		}

		// 计算任务层级深度
		task.Depth = gr.calculateTaskDepth(task.ID, task.ParentID, taskMap)

		taskMap[task.ID] = &task
		tasks = append(tasks, task)
	}

	if err = rows.Err(); err != nil {
		http.Error(w, fmt.Sprintf("处理全局任务数据失败: %v", err), http.StatusInternalServerError)
		return
	}

	// 更新所有任务的深度信息
	for i := range tasks {
		tasks[i].Depth = gr.calculateTaskDepthRecursive(tasks[i].ID, taskMap, 0)
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(tasks); err != nil {
		http.Error(w, fmt.Sprintf("编码全局任务响应失败: %v", err), http.StatusInternalServerError)
	}
}

// calculateTaskDepth 计算任务层级深度
func (gr *GlobalRoutes) calculateTaskDepth(taskID int, parentID *int, taskMap map[int]*TaskResponse) int {
	if parentID == nil {
		return 0 // 顶级任务
	}

	// 通过数据库查询计算深度，避免循环依赖
	depth := 0
	currentParentID := parentID

	for currentParentID != nil && depth < 10 { // 限制最大深度避免无限循环
		var nextParentID sql.NullInt64
		err := gr.db.QueryRow("SELECT parent_id FROM tasks WHERE id = ?", *currentParentID).Scan(&nextParentID)
		if err != nil {
			break // 如果查询失败，停止计算
		}

		depth++
		if nextParentID.Valid {
			parentIDInt := int(nextParentID.Int64)
			currentParentID = &parentIDInt
		} else {
			currentParentID = nil
		}
	}

	return depth
}

// calculateTaskDepthRecursive 递归计算任务深度（备用方法）
func (gr *GlobalRoutes) calculateTaskDepthRecursive(taskID int, taskMap map[int]*TaskResponse, visited int) int {
	if visited > 10 { // 防止无限递归
		return 0
	}

	task, exists := taskMap[taskID]
	if !exists || task.ParentID == nil {
		return 0
	}

	_, parentExists := taskMap[*task.ParentID]
	if !parentExists {
		return 0
	}

	return 1 + gr.calculateTaskDepthRecursive(*task.ParentID, taskMap, visited+1)
}
