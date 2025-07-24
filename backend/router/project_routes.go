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

// ProjectRoutes 项目路由处理器
type ProjectRoutes struct {
	db *sql.DB
}

// NewProjectRoutes 创建项目路由实例
func NewProjectRoutes(db *sql.DB) *ProjectRoutes {
	return &ProjectRoutes{db: db}
}

// Project 项目模型
type Project struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	CreatedAt   string `json:"created_at"`
}

// HandleProjects 处理 /api/projects 路由
func (pr *ProjectRoutes) HandleProjects(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		pr.getProjects(w, r)
	case http.MethodPost:
		pr.createProject(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// HandleProject 处理 /api/projects/{id} 路由
func (pr *ProjectRoutes) HandleProject(w http.ResponseWriter, r *http.Request) {
	// 从URL路径中提取项目ID
	path := strings.TrimPrefix(r.URL.Path, "/api/projects/")
	if path == "" {
		http.Error(w, "Project ID is required", http.StatusBadRequest)
		return
	}

	id, err := strconv.Atoi(path)
	if err != nil {
		http.Error(w, "Invalid project ID", http.StatusBadRequest)
		return
	}

	switch r.Method {
	case http.MethodGet:
		pr.getProject(w, r, id)
	case http.MethodPut:
		pr.updateProject(w, r, id)
	case http.MethodDelete:
		pr.deleteProject(w, r, id)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// getProjects 获取所有项目
func (pr *ProjectRoutes) getProjects(w http.ResponseWriter, r *http.Request) {
	rows, err := pr.db.Query("SELECT id, name, description, created_at FROM projects ORDER BY created_at DESC")
	if err != nil {
		http.Error(w, fmt.Sprintf("查询项目失败: %v", err), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var projects []Project
	for rows.Next() {
		var project Project
		var createdAt time.Time
		err := rows.Scan(&project.ID, &project.Name, &project.Description, &createdAt)
		if err != nil {
			http.Error(w, fmt.Sprintf("扫描项目数据失败: %v", err), http.StatusInternalServerError)
			return
		}
		project.CreatedAt = createdAt.Format("2006-01-02 15:04:05")
		projects = append(projects, project)
	}

	if err = rows.Err(); err != nil {
		http.Error(w, fmt.Sprintf("处理项目数据失败: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(projects); err != nil {
		http.Error(w, fmt.Sprintf("编码响应失败: %v", err), http.StatusInternalServerError)
	}
}

// createProject 创建新项目
func (pr *ProjectRoutes) createProject(w http.ResponseWriter, r *http.Request) {
	var project Project
	if err := json.NewDecoder(r.Body).Decode(&project); err != nil {
		http.Error(w, fmt.Sprintf("解析请求体失败: %v", err), http.StatusBadRequest)
		return
	}

	// 验证必填字段
	if project.Name == "" {
		http.Error(w, "项目名称不能为空", http.StatusBadRequest)
		return
	}

	// 插入新项目
	result, err := pr.db.Exec(
		"INSERT INTO projects (name, description, created_at) VALUES (?, ?, ?)",
		project.Name, project.Description, time.Now(),
	)
	if err != nil {
		http.Error(w, fmt.Sprintf("创建项目失败: %v", err), http.StatusInternalServerError)
		return
	}

	// 获取新创建项目的ID
	id, err := result.LastInsertId()
	if err != nil {
		http.Error(w, fmt.Sprintf("获取项目ID失败: %v", err), http.StatusInternalServerError)
		return
	}

	project.ID = int(id)
	project.CreatedAt = time.Now().Format("2006-01-02 15:04:05")

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	if err := json.NewEncoder(w).Encode(project); err != nil {
		http.Error(w, fmt.Sprintf("编码响应失败: %v", err), http.StatusInternalServerError)
	}
}

// getProject 获取单个项目
func (pr *ProjectRoutes) getProject(w http.ResponseWriter, r *http.Request, id int) {
	var project Project
	var createdAt time.Time
	
	err := pr.db.QueryRow(
		"SELECT id, name, description, created_at FROM projects WHERE id = ?", 
		id,
	).Scan(&project.ID, &project.Name, &project.Description, &createdAt)
	
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "项目不存在", http.StatusNotFound)
		} else {
			http.Error(w, fmt.Sprintf("查询项目失败: %v", err), http.StatusInternalServerError)
		}
		return
	}

	project.CreatedAt = createdAt.Format("2006-01-02 15:04:05")

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(project); err != nil {
		http.Error(w, fmt.Sprintf("编码响应失败: %v", err), http.StatusInternalServerError)
	}
}

// updateProject 更新项目
func (pr *ProjectRoutes) updateProject(w http.ResponseWriter, r *http.Request, id int) {
	var project Project
	if err := json.NewDecoder(r.Body).Decode(&project); err != nil {
		http.Error(w, fmt.Sprintf("解析请求体失败: %v", err), http.StatusBadRequest)
		return
	}

	// 验证必填字段
	if project.Name == "" {
		http.Error(w, "项目名称不能为空", http.StatusBadRequest)
		return
	}

	// 更新项目
	result, err := pr.db.Exec(
		"UPDATE projects SET name = ?, description = ? WHERE id = ?",
		project.Name, project.Description, id,
	)
	if err != nil {
		http.Error(w, fmt.Sprintf("更新项目失败: %v", err), http.StatusInternalServerError)
		return
	}

	// 检查是否实际更新了记录
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		http.Error(w, fmt.Sprintf("检查更新结果失败: %v", err), http.StatusInternalServerError)
		return
	}

	if rowsAffected == 0 {
		http.Error(w, "项目不存在", http.StatusNotFound)
		return
	}

	project.ID = id
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(project); err != nil {
		http.Error(w, fmt.Sprintf("编码响应失败: %v", err), http.StatusInternalServerError)
	}
}

// deleteProject 删除项目
func (pr *ProjectRoutes) deleteProject(w http.ResponseWriter, r *http.Request, id int) {
	// 检查项目是否存在关联的任务
	var taskCount int
	err := pr.db.QueryRow("SELECT COUNT(*) FROM tasks WHERE project_id = ?", id).Scan(&taskCount)
	if err != nil {
		http.Error(w, fmt.Sprintf("检查关联任务失败: %v", err), http.StatusInternalServerError)
		return
	}

	if taskCount > 0 {
		http.Error(w, fmt.Sprintf("无法删除项目：存在 %d 个关联任务", taskCount), http.StatusBadRequest)
		return
	}

	// 删除项目
	result, err := pr.db.Exec("DELETE FROM projects WHERE id = ?", id)
	if err != nil {
		http.Error(w, fmt.Sprintf("删除项目失败: %v", err), http.StatusInternalServerError)
		return
	}

	// 检查是否实际删除了记录
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		http.Error(w, fmt.Sprintf("检查删除结果失败: %v", err), http.StatusInternalServerError)
		return
	}

	if rowsAffected == 0 {
		http.Error(w, "项目不存在", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
