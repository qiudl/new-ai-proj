package mcp

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

// ========== 工具参数结构体 ==========

// ListTasksArgs list_tasks 工具参数
type ListTasksArgs struct {
	ProjectID *int     `json:"projectId,omitempty" jsonschema:"description=项目ID(可选,不指定则显示所有任务)"`
	Status    []string `json:"status,omitempty" jsonschema:"description=过滤任务状态,如['todo','in_progress']"`
	Priority  []string `json:"priority,omitempty" jsonschema:"description=过滤优先级,如['high','medium']"`
	Search    string   `json:"search,omitempty" jsonschema:"description=搜索关键词(任务标题或描述)"`
	Page      int      `json:"page,omitempty" jsonschema:"description=页码,从1开始,默认1"`
	Limit     int      `json:"limit,omitempty" jsonschema:"description=每页数量,默认20,最大100"`
	SortBy    string   `json:"sort_by,omitempty" jsonschema:"description=排序字段(created_at,updated_at,due_date,priority,title)"`
	SortOrder string   `json:"sort_order,omitempty" jsonschema:"description=排序方向(asc,desc)"`
}

// CreateTaskArgs create_task 工具参数
type CreateTaskArgs struct {
	Title       string `json:"title" jsonschema:"required,description=任务标题"`
	ProjectID   *int   `json:"projectId,omitempty" jsonschema:"description=项目ID(可选,默认为1)"`
	Description string `json:"description,omitempty" jsonschema:"description=任务描述"`
	Priority    string `json:"priority,omitempty" jsonschema:"description=优先级(low,medium,high)"`
	ParentID    *int   `json:"parentId,omitempty" jsonschema:"description=父任务ID(创建子任务时使用)"`
}

// FindTaskArgs find_task 工具参数
type FindTaskArgs struct {
	ID           *int   `json:"id,omitempty" jsonschema:"description=任务ID(可选,优先使用)"`
	TitlePattern string `json:"titlePattern,omitempty" jsonschema:"description=任务标题搜索关键词(可选)"`
}

// UpdateTaskArgs update_task 工具参数
type UpdateTaskArgs struct {
	ID          int     `json:"id" jsonschema:"required,description=要更新的任务ID"`
	Title       *string `json:"title,omitempty" jsonschema:"description=新标题"`
	Description *string `json:"description,omitempty" jsonschema:"description=新描述"`
	Status      *string `json:"status,omitempty" jsonschema:"description=新状态(draft,planning,todo,in_progress,testing,completed,cancelled,on_hold,suspended,blocked,archived)"`
	Priority    *string `json:"priority,omitempty" jsonschema:"description=新优先级(low,medium,high)"`
	DueDate     *string `json:"due_date,omitempty" jsonschema:"description=新截止日期(ISO 8601)"`
	AssigneeID  *int    `json:"assignee_id,omitempty" jsonschema:"description=新指派用户ID"`
}

// DeleteTaskArgs delete_task 工具参数
type DeleteTaskArgs struct {
	ID    int  `json:"id" jsonschema:"required,description=要删除的任务ID"`
	Force bool `json:"force,omitempty" jsonschema:"description=是否强制删除(包含子任务)"`
}

// TaskIDArgs 简单任务ID参数（用于 start/complete/pause）
type TaskIDArgs struct {
	ID int `json:"id" jsonschema:"required,description=任务ID"`
}

// CreateSubtaskArgs create_subtask 工具参数
type CreateSubtaskArgs struct {
	ParentID    int    `json:"parentId" jsonschema:"required,description=父任务ID"`
	Title       string `json:"title" jsonschema:"required,description=子任务标题"`
	Description string `json:"description,omitempty" jsonschema:"description=子任务描述"`
	Priority    string `json:"priority,omitempty" jsonschema:"description=优先级(low,medium,high)"`
}

// ========== 工具返回结构体 ==========

// TaskResult 任务操作结果
type TaskResult struct {
	Success   bool        `json:"success"`
	Message   string      `json:"message"`
	Data      interface{} `json:"data,omitempty"`
	Timestamp string      `json:"timestamp"`
}

// TaskItem 任务项（完整版，用于单任务查询）
type TaskItem struct {
	ID          int        `json:"id"`
	ProjectID   int        `json:"project_id"`
	ProjectName string     `json:"project_name,omitempty"`
	Title       string     `json:"title"`
	Description string     `json:"description,omitempty"`
	Status      string     `json:"status"`
	Priority    string     `json:"priority,omitempty"`
	ParentID    *int       `json:"parent_id,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	DueDate     *time.Time `json:"due_date,omitempty"`
}

// TaskListItem 任务列表项（精简版，用于列表查询，减少响应数据量）
type TaskListItem struct {
	ID          int    `json:"id"`
	Title       string `json:"title"`
	Status      string `json:"status"`
	Priority    string `json:"priority,omitempty"`
	ParentID    *int   `json:"parent_id,omitempty"`
	ProjectName string `json:"project_name,omitempty"`
	UpdatedAt   string `json:"updated_at"` // 使用简化的日期格式
}

// ListTasksResult 任务列表结果（使用精简版任务项）
type ListTasksResult struct {
	Tasks []TaskListItem `json:"tasks"`
	Total int            `json:"total"`
	Page  int            `json:"page"`
	Limit int            `json:"limit"`
}

// ========== 工具注册实现 ==========

// registerListTasks 注册 list_tasks 工具
func (s *MCPServer) registerListTasks(server *mcp.Server) {
	mcp.AddTool(server, &mcp.Tool{
		Name:        "list_tasks",
		Description: "查看任务列表，支持分页、过滤和排序",
	}, func(ctx context.Context, req *mcp.CallToolRequest, args ListTasksArgs) (*mcp.CallToolResult, any, error) {
		log.Printf("[MCP_TOOL] list_tasks called with args: %+v", args)

		// 设置默认值
		if args.Page < 1 {
			args.Page = 1
		}
		if args.Limit < 1 {
			args.Limit = 20
		}
		if args.Limit > 100 {
			args.Limit = 100
		}
		if args.SortBy == "" {
			args.SortBy = "updated_at"
		}
		if args.SortOrder == "" {
			args.SortOrder = "desc"
		}

		// 构建查询 - 精简版只查询必要字段，不包含 description
		baseQuery := `SELECT t.id, t.title, t.status, COALESCE(t.priority, '') as priority,
			t.parent_id, p.name as project_name, t.updated_at
			FROM tasks t
			LEFT JOIN projects p ON t.project_id = p.id
			WHERE t.deleted_at IS NULL`

		countQuery := `SELECT COUNT(*) FROM tasks t WHERE t.deleted_at IS NULL`

		var queryArgs []interface{}
		argIndex := 1

		// 项目过滤
		if args.ProjectID != nil {
			baseQuery += fmt.Sprintf(" AND t.project_id = $%d", argIndex)
			countQuery += fmt.Sprintf(" AND t.project_id = $%d", argIndex)
			queryArgs = append(queryArgs, *args.ProjectID)
			argIndex++
		}

		// 状态过滤
		if len(args.Status) > 0 {
			placeholders := make([]string, len(args.Status))
			for i, status := range args.Status {
				placeholders[i] = fmt.Sprintf("$%d", argIndex)
				queryArgs = append(queryArgs, status)
				argIndex++
			}
			filter := fmt.Sprintf(" AND t.status IN (%s)", strings.Join(placeholders, ","))
			baseQuery += filter
			countQuery += filter
		}

		// 优先级过滤
		if len(args.Priority) > 0 {
			placeholders := make([]string, len(args.Priority))
			for i, priority := range args.Priority {
				placeholders[i] = fmt.Sprintf("$%d", argIndex)
				queryArgs = append(queryArgs, priority)
				argIndex++
			}
			filter := fmt.Sprintf(" AND t.priority IN (%s)", strings.Join(placeholders, ","))
			baseQuery += filter
			countQuery += filter
		}

		// 搜索
		if args.Search != "" {
			filter := fmt.Sprintf(" AND (t.title ILIKE $%d OR t.description ILIKE $%d)", argIndex, argIndex+1)
			searchPattern := "%" + args.Search + "%"
			queryArgs = append(queryArgs, searchPattern, searchPattern)
			argIndex += 2
			baseQuery += filter
			countQuery += filter
		}

		// 排序
		validSortFields := map[string]string{
			"created_at": "t.created_at",
			"updated_at": "t.updated_at",
			"due_date":   "t.due_date",
			"priority":   "t.priority",
			"title":      "t.title",
		}
		sortField := validSortFields[args.SortBy]
		if sortField == "" {
			sortField = "t.updated_at"
		}
		sortOrder := "DESC"
		if strings.ToLower(args.SortOrder) == "asc" {
			sortOrder = "ASC"
		}
		baseQuery += fmt.Sprintf(" ORDER BY %s %s", sortField, sortOrder)

		// 分页
		offset := (args.Page - 1) * args.Limit
		baseQuery += fmt.Sprintf(" LIMIT $%d OFFSET $%d", argIndex, argIndex+1)
		queryArgs = append(queryArgs, args.Limit, offset)

		// 执行计数查询
		var total int
		countArgs := queryArgs[:len(queryArgs)-2] // 移除 LIMIT 和 OFFSET 参数
		err := s.config.DB.QueryRow(countQuery, countArgs...).Scan(&total)
		if err != nil {
			return nil, TaskResult{Success: false, Message: err.Error(), Timestamp: time.Now().Format(time.RFC3339)}, nil
		}

		// 执行主查询
		rows, err := s.config.DB.Query(baseQuery, queryArgs...)
		if err != nil {
			return nil, TaskResult{Success: false, Message: err.Error(), Timestamp: time.Now().Format(time.RFC3339)}, nil
		}
		defer rows.Close()

		var tasks []TaskListItem
		for rows.Next() {
			var task TaskListItem
			var projectName sql.NullString
			var parentID sql.NullInt64
			var updatedAt time.Time
			err := rows.Scan(&task.ID, &task.Title, &task.Status, &task.Priority,
				&parentID, &projectName, &updatedAt)
			if err != nil {
				log.Printf("[MCP_TOOL] Error scanning task: %v", err)
				continue
			}
			if projectName.Valid {
				task.ProjectName = projectName.String
			}
			if parentID.Valid {
				pid := int(parentID.Int64)
				task.ParentID = &pid
			}
			// 使用简化的日期格式 YYYY-MM-DD HH:mm
			task.UpdatedAt = updatedAt.Format("2006-01-02 15:04")
			tasks = append(tasks, task)
		}

		result := ListTasksResult{
			Tasks: tasks,
			Total: total,
			Page:  args.Page,
			Limit: args.Limit,
		}

		return &mcp.CallToolResult{
			Content: []mcp.Content{
				&mcp.TextContent{Text: formatJSON(result)},
			},
		}, nil, nil
	})
}

// registerCreateTask 注册 create_task 工具
func (s *MCPServer) registerCreateTask(server *mcp.Server) {
	mcp.AddTool(server, &mcp.Tool{
		Name:        "create_task",
		Description: "创建新任务",
	}, func(ctx context.Context, req *mcp.CallToolRequest, args CreateTaskArgs) (*mcp.CallToolResult, any, error) {
		log.Printf("[MCP_TOOL] create_task called with args: %+v", args)

		projectID := 1
		if args.ProjectID != nil {
			projectID = *args.ProjectID
		}

		priority := "medium"
		if args.Priority != "" {
			priority = args.Priority
		}

		query := `INSERT INTO tasks (project_id, title, description, status, priority, parent_id, created_at, updated_at)
			VALUES ($1, $2, $3, 'todo', $4, $5, NOW(), NOW())
			RETURNING id, project_id, title, description, status, priority, parent_id, created_at, updated_at`

		var task TaskItem
		var parentID sql.NullInt64
		if args.ParentID != nil {
			parentID = sql.NullInt64{Int64: int64(*args.ParentID), Valid: true}
		}

		err := s.config.DB.QueryRow(query, projectID, args.Title, args.Description, priority, parentID).
			Scan(&task.ID, &task.ProjectID, &task.Title, &task.Description, &task.Status, &task.Priority, &parentID, &task.CreatedAt, &task.UpdatedAt)
		if err != nil {
			return nil, TaskResult{Success: false, Message: err.Error(), Timestamp: time.Now().Format(time.RFC3339)}, nil
		}

		if parentID.Valid {
			pid := int(parentID.Int64)
			task.ParentID = &pid
		}

		return &mcp.CallToolResult{
			Content: []mcp.Content{
				&mcp.TextContent{Text: formatJSON(TaskResult{
					Success:   true,
					Message:   "任务创建成功",
					Data:      task,
					Timestamp: time.Now().Format(time.RFC3339),
				})},
			},
		}, nil, nil
	})
}

// registerFindTask 注册 find_task 工具
func (s *MCPServer) registerFindTask(server *mcp.Server) {
	mcp.AddTool(server, &mcp.Tool{
		Name:        "find_task",
		Description: "根据名称或ID搜索任务",
	}, func(ctx context.Context, req *mcp.CallToolRequest, args FindTaskArgs) (*mcp.CallToolResult, any, error) {
		log.Printf("[MCP_TOOL] find_task called with args: %+v", args)

		var tasks []TaskItem

		if args.ID != nil {
			// 按 ID 查找
			query := `SELECT id, project_id, title, COALESCE(description, '') as description, status,
				COALESCE(priority, '') as priority, parent_id, created_at, updated_at, due_date
				FROM tasks WHERE id = $1 AND deleted_at IS NULL`
			var task TaskItem
			var parentID sql.NullInt64
			var dueDate sql.NullTime
			err := s.config.DB.QueryRow(query, *args.ID).
				Scan(&task.ID, &task.ProjectID, &task.Title, &task.Description, &task.Status, &task.Priority, &parentID, &task.CreatedAt, &task.UpdatedAt, &dueDate)
			if err != nil {
				if err == sql.ErrNoRows {
					return &mcp.CallToolResult{
						Content: []mcp.Content{
							&mcp.TextContent{Text: formatJSON(TaskResult{
								Success:   false,
								Message:   fmt.Sprintf("未找到ID为 %d 的任务", *args.ID),
								Timestamp: time.Now().Format(time.RFC3339),
							})},
						},
					}, nil, nil
				}
				return nil, TaskResult{Success: false, Message: err.Error(), Timestamp: time.Now().Format(time.RFC3339)}, nil
			}
			if parentID.Valid {
				pid := int(parentID.Int64)
				task.ParentID = &pid
			}
			if dueDate.Valid {
				task.DueDate = &dueDate.Time
			}
			tasks = append(tasks, task)
		} else if args.TitlePattern != "" {
			// 按标题模式查找
			query := `SELECT id, project_id, title, COALESCE(description, '') as description, status,
				COALESCE(priority, '') as priority, parent_id, created_at, updated_at, due_date
				FROM tasks WHERE title ILIKE $1 AND deleted_at IS NULL ORDER BY updated_at DESC LIMIT 10`
			rows, err := s.config.DB.Query(query, "%"+args.TitlePattern+"%")
			if err != nil {
				return nil, TaskResult{Success: false, Message: err.Error(), Timestamp: time.Now().Format(time.RFC3339)}, nil
			}
			defer rows.Close()

			for rows.Next() {
				var task TaskItem
				var parentID sql.NullInt64
				var dueDate sql.NullTime
				err := rows.Scan(&task.ID, &task.ProjectID, &task.Title, &task.Description, &task.Status, &task.Priority, &parentID, &task.CreatedAt, &task.UpdatedAt, &dueDate)
				if err != nil {
					continue
				}
				if parentID.Valid {
					pid := int(parentID.Int64)
					task.ParentID = &pid
				}
				if dueDate.Valid {
					task.DueDate = &dueDate.Time
				}
				tasks = append(tasks, task)
			}
		} else {
			return &mcp.CallToolResult{
				Content: []mcp.Content{
					&mcp.TextContent{Text: formatJSON(TaskResult{
						Success:   false,
						Message:   "请提供任务ID或标题搜索关键词",
						Timestamp: time.Now().Format(time.RFC3339),
					})},
				},
			}, nil, nil
		}

		return &mcp.CallToolResult{
			Content: []mcp.Content{
				&mcp.TextContent{Text: formatJSON(TaskResult{
					Success:   true,
					Message:   fmt.Sprintf("找到 %d 个任务", len(tasks)),
					Data:      tasks,
					Timestamp: time.Now().Format(time.RFC3339),
				})},
			},
		}, nil, nil
	})
}

// registerUpdateTask 注册 update_task 工具
func (s *MCPServer) registerUpdateTask(server *mcp.Server) {
	mcp.AddTool(server, &mcp.Tool{
		Name:        "update_task",
		Description: "更新任务信息",
	}, func(ctx context.Context, req *mcp.CallToolRequest, args UpdateTaskArgs) (*mcp.CallToolResult, any, error) {
		log.Printf("[MCP_TOOL] update_task called with args: %+v", args)

		// 构建更新语句
		var setClauses []string
		var queryArgs []interface{}
		argIndex := 1

		if args.Title != nil {
			setClauses = append(setClauses, fmt.Sprintf("title = $%d", argIndex))
			queryArgs = append(queryArgs, *args.Title)
			argIndex++
		}
		if args.Description != nil {
			setClauses = append(setClauses, fmt.Sprintf("description = $%d", argIndex))
			queryArgs = append(queryArgs, *args.Description)
			argIndex++
		}
		if args.Status != nil {
			setClauses = append(setClauses, fmt.Sprintf("status = $%d", argIndex))
			queryArgs = append(queryArgs, *args.Status)
			argIndex++
		}
		if args.Priority != nil {
			setClauses = append(setClauses, fmt.Sprintf("priority = $%d", argIndex))
			queryArgs = append(queryArgs, *args.Priority)
			argIndex++
		}
		if args.DueDate != nil {
			setClauses = append(setClauses, fmt.Sprintf("due_date = $%d", argIndex))
			queryArgs = append(queryArgs, *args.DueDate)
			argIndex++
		}
		if args.AssigneeID != nil {
			setClauses = append(setClauses, fmt.Sprintf("assignee_id = $%d", argIndex))
			queryArgs = append(queryArgs, *args.AssigneeID)
			argIndex++
		}

		if len(setClauses) == 0 {
			return &mcp.CallToolResult{
				Content: []mcp.Content{
					&mcp.TextContent{Text: formatJSON(TaskResult{
						Success:   false,
						Message:   "没有提供要更新的字段",
						Timestamp: time.Now().Format(time.RFC3339),
					})},
				},
			}, nil, nil
		}

		setClauses = append(setClauses, "updated_at = NOW()")
		queryArgs = append(queryArgs, args.ID)

		query := fmt.Sprintf(`UPDATE tasks SET %s WHERE id = $%d AND deleted_at IS NULL
			RETURNING id, project_id, title, COALESCE(description, '') as description, status,
			COALESCE(priority, '') as priority, parent_id, created_at, updated_at, due_date`,
			strings.Join(setClauses, ", "), argIndex)

		var task TaskItem
		var parentID sql.NullInt64
		var dueDate sql.NullTime
		err := s.config.DB.QueryRow(query, queryArgs...).
			Scan(&task.ID, &task.ProjectID, &task.Title, &task.Description, &task.Status, &task.Priority, &parentID, &task.CreatedAt, &task.UpdatedAt, &dueDate)
		if err != nil {
			if err == sql.ErrNoRows {
				return &mcp.CallToolResult{
					Content: []mcp.Content{
						&mcp.TextContent{Text: formatJSON(TaskResult{
							Success:   false,
							Message:   fmt.Sprintf("未找到ID为 %d 的任务", args.ID),
							Timestamp: time.Now().Format(time.RFC3339),
						})},
					},
				}, nil, nil
			}
			return nil, TaskResult{Success: false, Message: err.Error(), Timestamp: time.Now().Format(time.RFC3339)}, nil
		}
		if parentID.Valid {
			pid := int(parentID.Int64)
			task.ParentID = &pid
		}
		if dueDate.Valid {
			task.DueDate = &dueDate.Time
		}

		return &mcp.CallToolResult{
			Content: []mcp.Content{
				&mcp.TextContent{Text: formatJSON(TaskResult{
					Success:   true,
					Message:   "任务更新成功",
					Data:      task,
					Timestamp: time.Now().Format(time.RFC3339),
				})},
			},
		}, nil, nil
	})
}

// registerDeleteTask 注册 delete_task 工具
func (s *MCPServer) registerDeleteTask(server *mcp.Server) {
	mcp.AddTool(server, &mcp.Tool{
		Name:        "delete_task",
		Description: "删除单个任务",
	}, func(ctx context.Context, req *mcp.CallToolRequest, args DeleteTaskArgs) (*mcp.CallToolResult, any, error) {
		log.Printf("[MCP_TOOL] delete_task called with args: %+v", args)

		// 软删除
		query := `UPDATE tasks SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL`
		if args.Force {
			// 强制删除（包括子任务）
			query = `UPDATE tasks SET deleted_at = NOW() WHERE (id = $1 OR parent_id = $1) AND deleted_at IS NULL`
		}

		result, err := s.config.DB.Exec(query, args.ID)
		if err != nil {
			return nil, TaskResult{Success: false, Message: err.Error(), Timestamp: time.Now().Format(time.RFC3339)}, nil
		}

		rowsAffected, _ := result.RowsAffected()
		if rowsAffected == 0 {
			return &mcp.CallToolResult{
				Content: []mcp.Content{
					&mcp.TextContent{Text: formatJSON(TaskResult{
						Success:   false,
						Message:   fmt.Sprintf("未找到ID为 %d 的任务", args.ID),
						Timestamp: time.Now().Format(time.RFC3339),
					})},
				},
			}, nil, nil
		}

		return &mcp.CallToolResult{
			Content: []mcp.Content{
				&mcp.TextContent{Text: formatJSON(TaskResult{
					Success:   true,
					Message:   fmt.Sprintf("成功删除 %d 个任务", rowsAffected),
					Timestamp: time.Now().Format(time.RFC3339),
				})},
			},
		}, nil, nil
	})
}

// registerStartTask 注册 start_task 工具
func (s *MCPServer) registerStartTask(server *mcp.Server) {
	mcp.AddTool(server, &mcp.Tool{
		Name:        "start_task",
		Description: "开始执行任务（将状态更新为 in_progress）",
	}, func(ctx context.Context, req *mcp.CallToolRequest, args TaskIDArgs) (*mcp.CallToolResult, any, error) {
		log.Printf("[MCP_TOOL] start_task called with id: %d", args.ID)

		query := `UPDATE tasks SET status = 'in_progress', updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL
			RETURNING id, project_id, title, COALESCE(description, '') as description, status,
			COALESCE(priority, '') as priority, parent_id, created_at, updated_at`

		var task TaskItem
		var parentID sql.NullInt64
		err := s.config.DB.QueryRow(query, args.ID).
			Scan(&task.ID, &task.ProjectID, &task.Title, &task.Description, &task.Status, &task.Priority, &parentID, &task.CreatedAt, &task.UpdatedAt)
		if err != nil {
			if err == sql.ErrNoRows {
				return &mcp.CallToolResult{
					Content: []mcp.Content{
						&mcp.TextContent{Text: formatJSON(TaskResult{
							Success:   false,
							Message:   fmt.Sprintf("未找到ID为 %d 的任务", args.ID),
							Timestamp: time.Now().Format(time.RFC3339),
						})},
					},
				}, nil, nil
			}
			return nil, TaskResult{Success: false, Message: err.Error(), Timestamp: time.Now().Format(time.RFC3339)}, nil
		}
		if parentID.Valid {
			pid := int(parentID.Int64)
			task.ParentID = &pid
		}

		return &mcp.CallToolResult{
			Content: []mcp.Content{
				&mcp.TextContent{Text: formatJSON(TaskResult{
					Success:   true,
					Message:   "任务已开始",
					Data:      task,
					Timestamp: time.Now().Format(time.RFC3339),
				})},
			},
		}, nil, nil
	})
}

// registerCompleteTask 注册 complete_task 工具
func (s *MCPServer) registerCompleteTask(server *mcp.Server) {
	mcp.AddTool(server, &mcp.Tool{
		Name:        "complete_task",
		Description: "完成任务（将状态更新为 completed）",
	}, func(ctx context.Context, req *mcp.CallToolRequest, args TaskIDArgs) (*mcp.CallToolResult, any, error) {
		log.Printf("[MCP_TOOL] complete_task called with id: %d", args.ID)

		query := `UPDATE tasks SET status = 'completed', updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL
			RETURNING id, project_id, title, COALESCE(description, '') as description, status,
			COALESCE(priority, '') as priority, parent_id, created_at, updated_at`

		var task TaskItem
		var parentID sql.NullInt64
		err := s.config.DB.QueryRow(query, args.ID).
			Scan(&task.ID, &task.ProjectID, &task.Title, &task.Description, &task.Status, &task.Priority, &parentID, &task.CreatedAt, &task.UpdatedAt)
		if err != nil {
			if err == sql.ErrNoRows {
				return &mcp.CallToolResult{
					Content: []mcp.Content{
						&mcp.TextContent{Text: formatJSON(TaskResult{
							Success:   false,
							Message:   fmt.Sprintf("未找到ID为 %d 的任务", args.ID),
							Timestamp: time.Now().Format(time.RFC3339),
						})},
					},
				}, nil, nil
			}
			return nil, TaskResult{Success: false, Message: err.Error(), Timestamp: time.Now().Format(time.RFC3339)}, nil
		}
		if parentID.Valid {
			pid := int(parentID.Int64)
			task.ParentID = &pid
		}

		return &mcp.CallToolResult{
			Content: []mcp.Content{
				&mcp.TextContent{Text: formatJSON(TaskResult{
					Success:   true,
					Message:   "任务已完成",
					Data:      task,
					Timestamp: time.Now().Format(time.RFC3339),
				})},
			},
		}, nil, nil
	})
}

// registerPauseTask 注册 pause_task 工具
func (s *MCPServer) registerPauseTask(server *mcp.Server) {
	mcp.AddTool(server, &mcp.Tool{
		Name:        "pause_task",
		Description: "暂停任务（将状态更新为 on_hold）",
	}, func(ctx context.Context, req *mcp.CallToolRequest, args TaskIDArgs) (*mcp.CallToolResult, any, error) {
		log.Printf("[MCP_TOOL] pause_task called with id: %d", args.ID)

		query := `UPDATE tasks SET status = 'on_hold', updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL
			RETURNING id, project_id, title, COALESCE(description, '') as description, status,
			COALESCE(priority, '') as priority, parent_id, created_at, updated_at`

		var task TaskItem
		var parentID sql.NullInt64
		err := s.config.DB.QueryRow(query, args.ID).
			Scan(&task.ID, &task.ProjectID, &task.Title, &task.Description, &task.Status, &task.Priority, &parentID, &task.CreatedAt, &task.UpdatedAt)
		if err != nil {
			if err == sql.ErrNoRows {
				return &mcp.CallToolResult{
					Content: []mcp.Content{
						&mcp.TextContent{Text: formatJSON(TaskResult{
							Success:   false,
							Message:   fmt.Sprintf("未找到ID为 %d 的任务", args.ID),
							Timestamp: time.Now().Format(time.RFC3339),
						})},
					},
				}, nil, nil
			}
			return nil, TaskResult{Success: false, Message: err.Error(), Timestamp: time.Now().Format(time.RFC3339)}, nil
		}
		if parentID.Valid {
			pid := int(parentID.Int64)
			task.ParentID = &pid
		}

		return &mcp.CallToolResult{
			Content: []mcp.Content{
				&mcp.TextContent{Text: formatJSON(TaskResult{
					Success:   true,
					Message:   "任务已暂停",
					Data:      task,
					Timestamp: time.Now().Format(time.RFC3339),
				})},
			},
		}, nil, nil
	})
}

// registerGetDetailedTaskInfo 注册 get_detailed_task_info 工具
func (s *MCPServer) registerGetDetailedTaskInfo(server *mcp.Server) {
	mcp.AddTool(server, &mcp.Tool{
		Name:        "get_detailed_task_info",
		Description: "获取任务详细信息（包含格式化的父任务、同级任务和子任务，任务名称前显示ID）",
	}, func(ctx context.Context, req *mcp.CallToolRequest, args TaskIDArgs) (*mcp.CallToolResult, any, error) {
		log.Printf("[MCP_TOOL] get_detailed_task_info called with id: %d", args.ID)

		// 获取主任务
		query := `SELECT id, project_id, title, COALESCE(description, '') as description, status,
			COALESCE(priority, '') as priority, parent_id, created_at, updated_at, due_date
			FROM tasks WHERE id = $1 AND deleted_at IS NULL`

		var task TaskItem
		var parentID sql.NullInt64
		var dueDate sql.NullTime
		err := s.config.DB.QueryRow(query, args.ID).
			Scan(&task.ID, &task.ProjectID, &task.Title, &task.Description, &task.Status, &task.Priority, &parentID, &task.CreatedAt, &task.UpdatedAt, &dueDate)
		if err != nil {
			if err == sql.ErrNoRows {
				return &mcp.CallToolResult{
					Content: []mcp.Content{
						&mcp.TextContent{Text: formatJSON(TaskResult{
							Success:   false,
							Message:   fmt.Sprintf("未找到ID为 %d 的任务", args.ID),
							Timestamp: time.Now().Format(time.RFC3339),
						})},
					},
				}, nil, nil
			}
			return nil, TaskResult{Success: false, Message: err.Error(), Timestamp: time.Now().Format(time.RFC3339)}, nil
		}
		if parentID.Valid {
			pid := int(parentID.Int64)
			task.ParentID = &pid
		}
		if dueDate.Valid {
			task.DueDate = &dueDate.Time
		}

		// 获取子任务
		childrenQuery := `SELECT id, project_id, title, status, COALESCE(priority, '') as priority
			FROM tasks WHERE parent_id = $1 AND deleted_at IS NULL ORDER BY created_at`
		childRows, err := s.config.DB.Query(childrenQuery, args.ID)
		if err != nil {
			log.Printf("[MCP_TOOL] Error fetching children: %v", err)
		}
		defer func() {
			if childRows != nil {
				childRows.Close()
			}
		}()

		var children []map[string]interface{}
		if childRows != nil {
			for childRows.Next() {
				var id, projectID int
				var title, status, priority string
				childRows.Scan(&id, &projectID, &title, &status, &priority)
				children = append(children, map[string]interface{}{
					"id":       id,
					"title":    fmt.Sprintf("[#%d] %s", id, title),
					"status":   status,
					"priority": priority,
				})
			}
		}

		// 获取同级任务（如果有父任务）
		var siblings []map[string]interface{}
		if parentID.Valid {
			siblingQuery := `SELECT id, title, status FROM tasks
				WHERE parent_id = $1 AND id != $2 AND deleted_at IS NULL ORDER BY created_at`
			siblingRows, err := s.config.DB.Query(siblingQuery, parentID.Int64, args.ID)
			if err == nil {
				defer siblingRows.Close()
				for siblingRows.Next() {
					var id int
					var title, status string
					siblingRows.Scan(&id, &title, &status)
					siblings = append(siblings, map[string]interface{}{
						"id":     id,
						"title":  fmt.Sprintf("[#%d] %s", id, title),
						"status": status,
					})
				}
			}
		}

		// 获取父任务信息
		var parentTask map[string]interface{}
		if parentID.Valid {
			parentQuery := `SELECT id, title, status FROM tasks WHERE id = $1 AND deleted_at IS NULL`
			var pid int
			var ptitle, pstatus string
			err := s.config.DB.QueryRow(parentQuery, parentID.Int64).Scan(&pid, &ptitle, &pstatus)
			if err == nil {
				parentTask = map[string]interface{}{
					"id":     pid,
					"title":  fmt.Sprintf("[#%d] %s", pid, ptitle),
					"status": pstatus,
				}
			}
		}

		result := map[string]interface{}{
			"task":      task,
			"parent":    parentTask,
			"siblings":  siblings,
			"children":  children,
			"formatted": fmt.Sprintf("[#%d] %s", task.ID, task.Title),
		}

		return &mcp.CallToolResult{
			Content: []mcp.Content{
				&mcp.TextContent{Text: formatJSON(result)},
			},
		}, nil, nil
	})
}

// registerCreateSubtask 注册 create_subtask 工具
func (s *MCPServer) registerCreateSubtask(server *mcp.Server) {
	mcp.AddTool(server, &mcp.Tool{
		Name:        "create_subtask",
		Description: "创建子任务",
	}, func(ctx context.Context, req *mcp.CallToolRequest, args CreateSubtaskArgs) (*mcp.CallToolResult, any, error) {
		log.Printf("[MCP_TOOL] create_subtask called with args: %+v", args)

		// 先获取父任务的项目ID
		var projectID int
		err := s.config.DB.QueryRow("SELECT project_id FROM tasks WHERE id = $1 AND deleted_at IS NULL", args.ParentID).Scan(&projectID)
		if err != nil {
			if err == sql.ErrNoRows {
				return &mcp.CallToolResult{
					Content: []mcp.Content{
						&mcp.TextContent{Text: formatJSON(TaskResult{
							Success:   false,
							Message:   fmt.Sprintf("未找到父任务ID为 %d 的任务", args.ParentID),
							Timestamp: time.Now().Format(time.RFC3339),
						})},
					},
				}, nil, nil
			}
			return nil, TaskResult{Success: false, Message: err.Error(), Timestamp: time.Now().Format(time.RFC3339)}, nil
		}

		priority := "medium"
		if args.Priority != "" {
			priority = args.Priority
		}

		query := `INSERT INTO tasks (project_id, title, description, status, priority, parent_id, created_at, updated_at)
			VALUES ($1, $2, $3, 'todo', $4, $5, NOW(), NOW())
			RETURNING id, project_id, title, description, status, priority, parent_id, created_at, updated_at`

		var task TaskItem
		var parentID sql.NullInt64
		err = s.config.DB.QueryRow(query, projectID, args.Title, args.Description, priority, args.ParentID).
			Scan(&task.ID, &task.ProjectID, &task.Title, &task.Description, &task.Status, &task.Priority, &parentID, &task.CreatedAt, &task.UpdatedAt)
		if err != nil {
			return nil, TaskResult{Success: false, Message: err.Error(), Timestamp: time.Now().Format(time.RFC3339)}, nil
		}

		if parentID.Valid {
			pid := int(parentID.Int64)
			task.ParentID = &pid
		}

		return &mcp.CallToolResult{
			Content: []mcp.Content{
				&mcp.TextContent{Text: formatJSON(TaskResult{
					Success:   true,
					Message:   "子任务创建成功",
					Data:      task,
					Timestamp: time.Now().Format(time.RFC3339),
				})},
			},
		}, nil, nil
	})
}

// ========== 辅助函数 ==========

// formatJSON 将数据格式化为 JSON 字符串
func formatJSON(data interface{}) string {
	b, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return fmt.Sprintf(`{"error": "failed to marshal: %v"}`, err)
	}
	return string(b)
}
