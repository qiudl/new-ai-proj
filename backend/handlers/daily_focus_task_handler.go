package handlers

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"context"
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

// candidateTask represents a candidate task for recommendation
type candidateTask struct {
	TaskID             int
	ProjectID          int
	Title              string
	Description        *string
	Status             string
	Priority           string
	DueDate            *time.Time
	AssigneeID         *int
	CreatedAt          time.Time
	UpdatedAt          time.Time
	EstimatedMinutes   *int
	TaskLevel          int
	ParentID           *int
	ProjectName        string
	ProjectLastActivity time.Time
	SubtaskCount       int
	RecentWorkCount    int
	CarryOverCount     int
}

// DailyFocusTaskHandler handles all daily focus task-related operations
type DailyFocusTaskHandler struct {
	db       database.DB
	logger   *log.Logger
	validate *validator.Validate
}

// NewDailyFocusTaskHandler creates a new daily focus task handler
func NewDailyFocusTaskHandler(db database.DB, logger *log.Logger, validate *validator.Validate) *DailyFocusTaskHandler {
	return &DailyFocusTaskHandler{
		db:       db,
		logger:   logger,
		validate: validate,
	}
}

// GetDailyFocusTasks godoc
// @Summary		Get daily focus tasks
// @Description	Retrieve daily focus tasks for the authenticated user
// @Tags			Daily Focus Tasks
// @Accept			json
// @Produce		json
// @Security		BearerAuth
// @Param			date				query		string	false	"Focus date (YYYY-MM-DD)"
// @Param			status				query		string	false	"Task status"	Enums(active, completed, removed)
// @Param			include_suggestions	query		bool	false	"Include suggestions"	default(false)
// @Success		200					{object}	models.DailyFocusTaskListResponse	"Daily focus tasks retrieved successfully"
// @Failure		400					{object}	models.ErrorResponse				"Bad request"
// @Failure		401					{object}	models.ErrorResponse				"Unauthorized"
// @Failure		500					{object}	models.ErrorResponse				"Internal server error"
// @Router			/daily-focus-tasks [get]
func (h *DailyFocusTaskHandler) GetDailyFocusTasks(c *gin.Context) {
	// 从JWT获取用户信息
	userClaims, exists := c.Get("claims")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "UNAUTHORIZED",
				Message: "用户认证信息不存在",
			},
		})
		return
	}
	
	claims, ok := userClaims.(*models.ExtendedClaims)
	if !ok {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "INVALID_TOKEN",
				Message: "无效的认证令牌",
			},
		})
		return
	}

	// 解析查询参数
	var query models.DailyFocusTaskQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "INVALID_PARAMS",
				Message: "无效的查询参数: " + err.Error(),
			},
		})
		return
	}

	// 验证参数
	if err := h.validate.Struct(query); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "VALIDATION_ERROR",
				Message: "参数验证失败: " + err.Error(),
			},
		})
		return
	}

	// 设置默认日期为今天
	focusDate := time.Now().Format("2006-01-02")
	if query.Date != nil && *query.Date != "" {
		if _, err := time.Parse("2006-01-02", *query.Date); err != nil {
			c.JSON(http.StatusBadRequest, models.ErrorResponse{
				Success: false,
				Error: &models.APIError{
					Code:    "INVALID_DATE_FORMAT",
					Message: "日期格式错误，应为YYYY-MM-DD",
				},
			})
			return
		}
		focusDate = *query.Date
	}

	ctx := context.Background()

	// 构建查询条件
	whereClause := "WHERE dft.user_id = $1 AND dft.focus_date = $2"
	args := []interface{}{claims.UserID, focusDate}
	argCounter := 2

	if query.Status != nil && *query.Status != "" {
		argCounter++
		whereClause += fmt.Sprintf(" AND dft.status = $%d", argCounter)
		args = append(args, *query.Status)
	} else {
		// 默认只显示active状态的任务，过滤掉removed状态
		argCounter++
		whereClause += fmt.Sprintf(" AND dft.status = $%d", argCounter)
		args = append(args, "active")
	}

	// 查询今日主要任务
	querySQL := `
		SELECT 
			dft.id, dft.task_id, dft.user_id, dft.project_id, dft.focus_date,
			dft.sort_order, dft.priority_level, dft.is_auto_suggested, 
			dft.suggestion_reason, dft.suggestion_score, dft.status,
			dft.completed_at, dft.carried_from_date, dft.user_notes,
			dft.estimated_duration_minutes, dft.created_at, dft.updated_at,
			t.title as task_title, t.description as task_description,
			t.status as task_status, t.priority as task_priority,
			t.due_date as task_due_date, t.assignee_id as task_assignee_id,
			p.name as project_name, p.project_number as project_code
		FROM daily_focus_tasks dft
		JOIN tasks t ON dft.task_id = t.id
		JOIN projects p ON dft.project_id = p.id
		` + whereClause + ` AND t.deleted_at IS NULL
		ORDER BY dft.sort_order ASC, dft.created_at DESC
	`
	
	// 添加调试日志
	h.logger.Printf("DEBUG: Daily Focus Tasks SQL: %s", querySQL)
	h.logger.Printf("DEBUG: Daily Focus Tasks Args: %v", args)

	rows, err := h.db.Query( querySQL, args...)
	if err != nil {
		h.logger.Printf("Failed to query daily focus tasks: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "DATABASE_ERROR",
				Message: "查询今日主要任务失败",
			},
		})
		return
	}
	defer rows.Close()

	var tasks []models.DailyFocusTaskWithDetails
	var totalCount, activeCount, completedCount, estimatedTotalMinutes int

	for rows.Next() {
		var task models.DailyFocusTaskWithDetails
		err := rows.Scan(
			&task.ID, &task.TaskID, &task.UserID, &task.ProjectID, &task.FocusDate,
			&task.SortOrder, &task.PriorityLevel, &task.IsAutoSuggested,
			&task.SuggestionReason, &task.SuggestionScore, &task.Status,
			&task.CompletedAt, &task.CarriedFromDate, &task.UserNotes,
			&task.EstimatedDurationMinutes, &task.CreatedAt, &task.UpdatedAt,
			&task.TaskTitle, &task.TaskDescription,
			&task.TaskStatus, &task.TaskPriority,
			&task.TaskDueDate, &task.TaskAssigneeID,
			&task.ProjectName, &task.ProjectCode,
		)
		if err != nil {
			h.logger.Printf("Failed to scan daily focus task: %v", err)
			continue
		}

		// 统计计算
		totalCount++
		
		// 判断任务是否完成：检查completed_at字段或task_status为completed
		isCompleted := task.CompletedAt != nil || (task.TaskStatus != nil && *task.TaskStatus == "completed")
		
		if isCompleted {
			completedCount++
		} else {
			activeCount++
		}
		
		if task.EstimatedDurationMinutes != nil {
			estimatedTotalMinutes += *task.EstimatedDurationMinutes
		}

		tasks = append(tasks, task)
	}

	// 构建响应
	response := models.DailyFocusTaskListResponse{
		FocusDate:             focusDate,
		TotalCount:            totalCount,
		ActiveCount:           activeCount,
		CompletedCount:        completedCount,
		EstimatedTotalMinutes: estimatedTotalMinutes,
		Tasks:                 tasks,
	}

	// 如果需要包含推荐
	if query.IncludeSuggestions != nil && *query.IncludeSuggestions {
		suggestions, err := h.getTaskSuggestions(ctx, claims.UserID, focusDate, 5)
		if err != nil {
			h.logger.Printf("Failed to get task suggestions: %v", err)
			// 不影响主要数据返回，只记录错误
		} else {
			response.Suggestions = suggestions
		}
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(response, "获取今日主要任务成功"))
}

// CreateDailyFocusTask godoc
// @Summary		Add daily focus task
// @Description	Add a task to daily focus list
// @Tags			Daily Focus Tasks
// @Accept			json
// @Produce		json
// @Security		BearerAuth
// @Param			request	body		models.CreateDailyFocusTaskRequest	true	"Create daily focus task request"
// @Success		201		{object}	models.DailyFocusTask				"Daily focus task created successfully"
// @Failure		400		{object}	models.ErrorResponse				"Bad request"
// @Failure		401		{object}	models.ErrorResponse				"Unauthorized"
// @Failure		409		{object}	models.ErrorResponse				"Task already exists"
// @Failure		500		{object}	models.ErrorResponse				"Internal server error"
// @Router			/daily-focus-tasks [post]
func (h *DailyFocusTaskHandler) CreateDailyFocusTask(c *gin.Context) {
	// 获取用户信息
	claims, ok := c.Get("claims")
	if !ok {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "UNAUTHORIZED",
				Message: "用户认证信息不存在",
			},
		})
		return
	}

	userClaims, ok := claims.(*models.ExtendedClaims)
	if !ok {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "INVALID_TOKEN",
				Message: "无效的认证令牌",
			},
		})
		return
	}

	// 解析请求体
	var req models.CreateDailyFocusTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "INVALID_REQUEST",
				Message: "请求格式错误: " + err.Error(),
			},
		})
		return
	}

	// 验证请求参数
	if err := h.validate.Struct(req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "VALIDATION_ERROR",
				Message: "参数验证失败: " + err.Error(),
			},
		})
		return
	}

	ctx := context.Background()

	// 验证任务是否存在且属于用户
	var taskProjectID int
	var taskAssigneeID *int
	err := h.db.QueryRow( 
		"SELECT project_id, assignee_id FROM tasks WHERE id = $1 AND deleted_at IS NULL", 
		req.TaskID).Scan(&taskProjectID, &taskAssigneeID)
	
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, models.ErrorResponse{
				Success: false,
				Error: &models.APIError{
					Code:    "TASK_NOT_FOUND",
					Message: "指定的任务不存在",
				},
			})
			return
		}
		h.logger.Printf("Failed to query task: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "DATABASE_ERROR",
				Message: "查询任务失败",
			},
		})
		return
	}

	// 验证任务是否分配给当前用户
	if taskAssigneeID == nil || *taskAssigneeID != userClaims.UserID {
		c.JSON(http.StatusForbidden, models.ErrorResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "TASK_NOT_ASSIGNED",
				Message: "任务未分配给当前用户",
			},
		})
		return
	}

	// 设置焦点日期
	focusDate := time.Now()
	if req.FocusDate != nil && *req.FocusDate != "" {
		parsedDate, err := time.Parse("2006-01-02", *req.FocusDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, models.ErrorResponse{
				Success: false,
				Error: &models.APIError{
					Code:    "INVALID_DATE_FORMAT",
					Message: "日期格式错误，应为YYYY-MM-DD",
				},
			})
			return
		}
		focusDate = parsedDate
	}

	// 检查是否已存在
	var existingID int
	err = h.db.QueryRow(
		"SELECT id FROM daily_focus_tasks WHERE task_id = $1 AND user_id = $2 AND focus_date = $3",
		req.TaskID, userClaims.UserID, focusDate.Format("2006-01-02")).Scan(&existingID)
	
	if err == nil {
		c.JSON(http.StatusConflict, models.ErrorResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "TASK_ALREADY_FOCUSED",
				Message: "任务已在今日主要任务中",
			},
		})
		return
	} else if err != sql.ErrNoRows {
		h.logger.Printf("Failed to check existing daily focus task: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "DATABASE_ERROR",
				Message: "检查任务状态失败",
			},
		})
		return
	}

	// 获取下一个排序位置
	var maxSortOrder int
	err = h.db.QueryRow(
		"SELECT COALESCE(MAX(sort_order), 0) FROM daily_focus_tasks WHERE user_id = $1 AND focus_date = $2 AND status = 'active'",
		userClaims.UserID, focusDate.Format("2006-01-02")).Scan(&maxSortOrder)
	
	if err != nil && err != sql.ErrNoRows {
		h.logger.Printf("Failed to get max sort order: %v", err)
		maxSortOrder = 0
	}

	// 设置默认值
	priorityLevel := models.PriorityMedium
	if req.PriorityLevel != "" {
		priorityLevel = req.PriorityLevel
	}

	estimatedMinutes := 0
	if req.EstimatedDurationMinutes != nil {
		estimatedMinutes = *req.EstimatedDurationMinutes
	}

	// 插入今日主要任务
	var newTaskID int
	insertSQL := `
		INSERT INTO daily_focus_tasks 
		(task_id, user_id, project_id, focus_date, sort_order, priority_level, 
		 is_auto_suggested, suggestion_reason, status, user_notes, 
		 estimated_duration_minutes, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING id
	`
	
	err = h.db.QueryRow( insertSQL,
		req.TaskID, userClaims.UserID, taskProjectID, focusDate.Format("2006-01-02"),
		maxSortOrder+1, priorityLevel, false, models.SuggestionReasonManual,
		models.StatusActive, req.UserNotes, estimatedMinutes, userClaims.UserID,
	).Scan(&newTaskID)

	if err != nil {
		h.logger.Printf("Failed to create daily focus task: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "DATABASE_ERROR",
				Message: "创建今日主要任务失败",
			},
		})
		return
	}

	// 获取创建的任务详情
	task, err := h.getDailyFocusTaskByID(ctx, newTaskID, userClaims.UserID)
	if err != nil {
		h.logger.Printf("Failed to get created daily focus task: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "DATABASE_ERROR",
				Message: "获取创建的任务失败",
			},
		})
		return
	}

	c.JSON(http.StatusCreated, models.NewSuccessResponse(task, "任务已添加到今日主要任务"))
}

// UpdateDailyFocusTask godoc
// @Summary		Update daily focus task
// @Description	Update a daily focus task
// @Tags			Daily Focus Tasks
// @Accept			json
// @Produce		json
// @Security		BearerAuth
// @Param			id		path		int									true	"Daily Focus Task ID"
// @Param			request	body		models.UpdateDailyFocusTaskRequest	true	"Update daily focus task request"
// @Success		200		{object}	models.DailyFocusTask				"Daily focus task updated successfully"
// @Failure		400		{object}	models.ErrorResponse				"Bad request"
// @Failure		401		{object}	models.ErrorResponse				"Unauthorized"
// @Failure		404		{object}	models.ErrorResponse				"Not found"
// @Failure		500		{object}	models.ErrorResponse				"Internal server error"
// @Router			/daily-focus-tasks/{id} [put]
func (h *DailyFocusTaskHandler) UpdateDailyFocusTask(c *gin.Context) {
	// 获取用户信息
	claims, ok := c.Get("claims")
	if !ok {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "UNAUTHORIZED",
				Message: "用户认证信息不存在",
			},
		})
		return
	}

	userClaims, ok := claims.(*models.ExtendedClaims)
	if !ok {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "INVALID_TOKEN",
				Message: "无效的认证令牌",
			},
		})
		return
	}

	// 获取任务ID
	idStr := c.Param("id")
	taskID, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "INVALID_ID",
				Message: "无效的任务ID",
			},
		})
		return
	}

	// 解析请求体
	var req models.UpdateDailyFocusTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "INVALID_REQUEST",
				Message: "请求格式错误: " + err.Error(),
			},
		})
		return
	}

	// 验证请求参数
	if err := h.validate.Struct(req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "VALIDATION_ERROR",
				Message: "参数验证失败: " + err.Error(),
			},
		})
		return
	}

	ctx := context.Background()

	// 验证任务是否存在且属于用户
	var existingUserID int
	err = h.db.QueryRow(
		"SELECT user_id FROM daily_focus_tasks WHERE id = $1",
		taskID).Scan(&existingUserID)
	
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, models.ErrorResponse{
				Success: false,
				Error: &models.APIError{
					Code:    "TASK_NOT_FOUND",
					Message: "指定的今日主要任务不存在",
				},
			})
			return
		}
		h.logger.Printf("Failed to query daily focus task: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "DATABASE_ERROR",
				Message: "查询任务失败",
			},
		})
		return
	}

	if existingUserID != userClaims.UserID {
		c.JSON(http.StatusForbidden, models.ErrorResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "PERMISSION_DENIED",
				Message: "没有权限修改此任务",
			},
		})
		return
	}

	// 构建更新SQL
	updates := []string{}
	args := []interface{}{}
	argCounter := 0

	if req.PriorityLevel != nil {
		argCounter++
		updates = append(updates, fmt.Sprintf("priority_level = $%d", argCounter))
		args = append(args, *req.PriorityLevel)
	}

	if req.EstimatedDurationMinutes != nil {
		argCounter++
		updates = append(updates, fmt.Sprintf("estimated_duration_minutes = $%d", argCounter))
		args = append(args, *req.EstimatedDurationMinutes)
	}

	if req.UserNotes != nil {
		argCounter++
		updates = append(updates, fmt.Sprintf("user_notes = $%d", argCounter))
		args = append(args, *req.UserNotes)
	}

	if len(updates) == 0 {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "NO_UPDATES",
				Message: "没有可更新的字段",
			},
		})
		return
	}

	// 添加updated_at和条件参数
	argCounter++
	updates = append(updates, fmt.Sprintf("updated_at = $%d", argCounter))
	args = append(args, time.Now())

	argCounter++
	whereClause := fmt.Sprintf("WHERE id = $%d", argCounter)
	args = append(args, taskID)

	updateSQL := fmt.Sprintf("UPDATE daily_focus_tasks SET %s %s", 
		strings.Join(updates, ", "), whereClause)

	_, err = h.db.Exec( updateSQL, args...)
	if err != nil {
		h.logger.Printf("Failed to update daily focus task: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "DATABASE_ERROR",
				Message: "更新任务失败",
			},
		})
		return
	}

	// 获取更新后的任务详情
	task, err := h.getDailyFocusTaskByID(ctx, taskID, userClaims.UserID)
	if err != nil {
		h.logger.Printf("Failed to get updated daily focus task: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "DATABASE_ERROR",
				Message: "获取更新后的任务失败",
			},
		})
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(task, "任务更新成功"))
}

// DeleteDailyFocusTask godoc
// @Summary		Delete daily focus task
// @Description	Remove a task from daily focus list
// @Tags			Daily Focus Tasks
// @Accept			json
// @Produce		json
// @Security		BearerAuth
// @Param			id	path		int	true	"Daily Focus Task ID"
// @Success		200	{object}	models.APIResponse	"Daily focus task deleted successfully"
// @Failure		400	{object}	models.ErrorResponse	"Bad request"
// @Failure		401	{object}	models.ErrorResponse	"Unauthorized"
// @Failure		404	{object}	models.ErrorResponse	"Not found"
// @Failure		500	{object}	models.ErrorResponse	"Internal server error"
// @Router			/daily-focus-tasks/{id} [delete]
func (h *DailyFocusTaskHandler) DeleteDailyFocusTask(c *gin.Context) {
	// 获取用户信息
	claims, ok := c.Get("claims")
	if !ok {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "UNAUTHORIZED",
				Message: "用户认证信息不存在",
			},
		})
		return
	}

	userClaims, ok := claims.(*models.ExtendedClaims)
	if !ok {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "INVALID_TOKEN",
				Message: "无效的认证令牌",
			},
		})
		return
	}

	// 获取任务ID
	idStr := c.Param("id")
	taskID, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "INVALID_ID",
				Message: "无效的任务ID",
			},
		})
		return
	}

	ctx := context.Background()
	
	// 开启事务确保数据一致性
	tx, err := h.db.BeginTx(ctx)
	if err != nil {
		h.logger.Printf("Failed to begin transaction for deleting task %d: %v", taskID, err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "DATABASE_ERROR",
				Message: "开启事务失败",
			},
		})
		return
	}
	defer tx.Rollback()

	// 验证任务是否存在且属于用户
	var existingUserID int
	err = tx.QueryRow(
		"SELECT user_id FROM daily_focus_tasks WHERE id = $1",
		taskID).Scan(&existingUserID)
	
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, models.ErrorResponse{
				Success: false,
				Error: &models.APIError{
					Code:    "TASK_NOT_FOUND",
					Message: "指定的今日主要任务不存在",
				},
			})
			return
		}
		h.logger.Printf("Failed to query daily focus task %d: %v", taskID, err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "DATABASE_ERROR",
				Message: "查询任务失败",
			},
		})
		return
	}

	if existingUserID != userClaims.UserID {
		c.JSON(http.StatusForbidden, models.ErrorResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "PERMISSION_DENIED",
				Message: "没有权限删除此任务",
			},
		})
		return
	}

	// 删除任务并验证删除结果
	h.logger.Printf("INFO: Attempting to delete daily focus task %d for user %d", taskID, userClaims.UserID)
	result, err := tx.Exec(
		"DELETE FROM daily_focus_tasks WHERE id = $1",
		taskID)
	
	if err != nil {
		h.logger.Printf("Failed to delete daily focus task %d: %v", taskID, err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "DATABASE_ERROR",
				Message: "删除任务失败",
			},
		})
		return
	}

	// 检查是否真正删除了记录
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		h.logger.Printf("Failed to get rows affected for task %d deletion: %v", taskID, err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "DATABASE_ERROR",
				Message: "无法确认删除结果",
			},
		})
		return
	}

	if rowsAffected == 0 {
		h.logger.Printf("WARNING: No rows affected when deleting task %d - task may not exist", taskID)
		c.JSON(http.StatusNotFound, models.ErrorResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "TASK_NOT_FOUND",
				Message: "任务不存在或已被删除",
			},
		})
		return
	}

	// 提交事务
	if err = tx.Commit(); err != nil {
		h.logger.Printf("Failed to commit transaction for deleting task %d: %v", taskID, err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "DATABASE_ERROR",
				Message: "提交删除操作失败",
			},
		})
		return
	}

	h.logger.Printf("SUCCESS: Deleted daily focus task %d for user %d, rows affected: %d", taskID, userClaims.UserID, rowsAffected)
	c.JSON(http.StatusOK, models.NewSuccessResponse(nil, "已从今日主要任务中移除"))
}

// 辅助方法：获取任务详情
func (h *DailyFocusTaskHandler) getDailyFocusTaskByID(ctx context.Context, taskID, userID int) (*models.DailyFocusTaskWithDetails, error) {
	querySQL := `
		SELECT 
			dft.id, dft.task_id, dft.user_id, dft.project_id, dft.focus_date,
			dft.sort_order, dft.priority_level, dft.is_auto_suggested, 
			dft.suggestion_reason, dft.suggestion_score, dft.status,
			dft.completed_at, dft.carried_from_date, dft.user_notes,
			dft.estimated_duration_minutes, dft.created_at, dft.updated_at,
			t.title as task_title, t.description as task_description,
			t.status as task_status, t.priority as task_priority,
			t.due_date as task_due_date, t.assignee_id as task_assignee_id,
			p.name as project_name, p.project_number as project_code
		FROM daily_focus_tasks dft
		JOIN tasks t ON dft.task_id = t.id
		JOIN projects p ON dft.project_id = p.id
		WHERE dft.id = $1 AND dft.user_id = $2 AND t.deleted_at IS NULL
	`

	var task models.DailyFocusTaskWithDetails
	err := h.db.QueryRow( querySQL, taskID, userID).Scan(
		&task.ID, &task.TaskID, &task.UserID, &task.ProjectID, &task.FocusDate,
		&task.SortOrder, &task.PriorityLevel, &task.IsAutoSuggested,
		&task.SuggestionReason, &task.SuggestionScore, &task.Status,
		&task.CompletedAt, &task.CarriedFromDate, &task.UserNotes,
		&task.EstimatedDurationMinutes, &task.CreatedAt, &task.UpdatedAt,
		&task.TaskTitle, &task.TaskDescription,
		&task.TaskStatus, &task.TaskPriority,
		&task.TaskDueDate, &task.TaskAssigneeID,
		&task.ProjectName, &task.ProjectCode,
	)

	return &task, err
}

// 辅助方法：获取智能推荐
func (h *DailyFocusTaskHandler) getTaskSuggestions(ctx context.Context, userID int, focusDate string, limit int) ([]models.TaskSuggestion, error) {
	// 基于优先级、截止日期等因素推荐任务
	querySQL := `
		SELECT DISTINCT
			t.id as task_id,
			CASE 
				WHEN t.due_date = $2::date THEN 'deadline_today'
				WHEN t.due_date < $2::date THEN 'overdue'
				WHEN t.due_date BETWEEN $2::date AND $2::date + INTERVAL '3 days' THEN 'deadline_approaching'
				WHEN t.priority = 'high' THEN 'high_priority'
				ELSE 'suggested'
			END as suggestion_reason,
			CASE 
				WHEN t.due_date < $2::date THEN 1.0
				WHEN t.due_date = $2::date THEN 0.95
				WHEN t.priority = 'high' THEN 0.85
				WHEN t.due_date BETWEEN $2::date AND $2::date + INTERVAL '3 days' THEN 0.75
				WHEN t.priority = 'medium' THEN 0.6
				ELSE 0.4
			END as suggestion_score,
			COALESCE(t.estimated_minutes, 60) as estimated_duration_minutes
		FROM tasks t
		WHERE t.assignee_id = $1
		  AND t.status IN ('todo', 'in_progress')
		  AND t.deleted_at IS NULL
		  AND NOT EXISTS (
			  SELECT 1 FROM daily_focus_tasks dft 
			  WHERE dft.task_id = t.id 
				AND dft.user_id = $1 
				AND dft.focus_date = $2::date
				AND dft.status = 'active'
		  )
		ORDER BY suggestion_score DESC, t.created_at ASC
		LIMIT $3
	`

	rows, err := h.db.Query( querySQL, userID, focusDate, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var suggestions []models.TaskSuggestion
	for rows.Next() {
		var suggestion models.TaskSuggestion
		err := rows.Scan(
			&suggestion.TaskID,
			&suggestion.SuggestionReason,
			&suggestion.SuggestionScore,
			&suggestion.EstimatedDurationMinutes,
		)
		if err != nil {
			h.logger.Printf("Failed to scan task suggestion: %v", err)
			continue
		}

		suggestions = append(suggestions, suggestion)
	}

	return suggestions, nil
}

// CompleteDailyFocusTask 标记任务完成
func (h *DailyFocusTaskHandler) CompleteDailyFocusTask(c *gin.Context) {
	// 获取用户信息
	claims, ok := c.Get("claims")
	if !ok {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "UNAUTHORIZED",
				Message: "用户认证信息不存在",
			},
		})
		return
	}

	userClaims, ok := claims.(*models.ExtendedClaims)
	if !ok {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "INVALID_TOKEN",
				Message: "无效的认证令牌",
			},
		})
		return
	}

	// 获取任务ID
	idStr := c.Param("id")
	taskID, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "INVALID_ID",
				Message: "无效的任务ID",
			},
		})
		return
	}

	ctx := context.Background()

	// 更新任务状态为已完成
	updateSQL := `
		UPDATE daily_focus_tasks 
		SET status = $1, completed_at = $2, updated_at = $3
		WHERE id = $4 AND user_id = $5 AND status = 'active'
	`
	
	result, err := h.db.Exec( updateSQL,
		models.StatusCompleted, time.Now(), time.Now(), taskID, userClaims.UserID)
	
	if err != nil {
		h.logger.Printf("Failed to complete daily focus task: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "DATABASE_ERROR",
				Message: "标记任务完成失败",
			},
		})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, models.ErrorResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "TASK_NOT_FOUND",
				Message: "指定的今日主要任务不存在或已完成",
			},
		})
		return
	}

	// 获取更新后的任务详情
	task, err := h.getDailyFocusTaskByID(ctx, taskID, userClaims.UserID)
	if err != nil {
		h.logger.Printf("Failed to get completed daily focus task: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "DATABASE_ERROR",
				Message: "获取完成后的任务失败",
			},
		})
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(task, "任务已标记为完成"))
}

// ReorderDailyFocusTasks 批量重排序
func (h *DailyFocusTaskHandler) ReorderDailyFocusTasks(c *gin.Context) {
	// 获取用户信息
	claims, ok := c.Get("claims")
	if !ok {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "UNAUTHORIZED",
				Message: "用户认证信息不存在",
			},
		})
		return
	}

	userClaims, ok := claims.(*models.ExtendedClaims)
	if !ok {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "INVALID_TOKEN",
				Message: "无效的认证令牌",
			},
		})
		return
	}

	// 解析请求体
	var req models.ReorderTasksRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "INVALID_REQUEST",
				Message: "请求格式错误: " + err.Error(),
			},
		})
		return
	}

	// 验证请求参数
	if err := h.validate.Struct(req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "VALIDATION_ERROR",
				Message: "参数验证失败: " + err.Error(),
			},
		})
		return
	}

	ctx := context.Background()
	
	// 开启事务
	tx, err := h.db.BeginTx(ctx)
	if err != nil {
		h.logger.Printf("Failed to begin transaction: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "DATABASE_ERROR",
				Message: "开启事务失败",
			},
		})
		return
	}
	defer tx.Rollback()

	// 验证所有任务都属于当前用户
	for _, item := range req.ReorderItems {
		var ownerID int
		err = tx.QueryRow(
			"SELECT user_id FROM daily_focus_tasks WHERE id = $1",
			item.ID).Scan(&ownerID)
		
		if err != nil {
			if err == sql.ErrNoRows {
				c.JSON(http.StatusNotFound, models.ErrorResponse{
					Success: false,
					Error: &models.APIError{
						Code:    "TASK_NOT_FOUND",
						Message: fmt.Sprintf("任务ID %d 不存在", item.ID),
					},
				})
				return
			}
			h.logger.Printf("Failed to query task owner: %v", err)
			c.JSON(http.StatusInternalServerError, models.ErrorResponse{
				Success: false,
				Error: &models.APIError{
					Code:    "DATABASE_ERROR",
					Message: "查询任务归属失败",
				},
			})
			return
		}

		if ownerID != userClaims.UserID {
			c.JSON(http.StatusForbidden, models.ErrorResponse{
				Success: false,
				Error: &models.APIError{
					Code:    "PERMISSION_DENIED",
					Message: fmt.Sprintf("没有权限修改任务 %d", item.ID),
				},
			})
			return
		}
	}

	// 批量更新排序
	for _, item := range req.ReorderItems {
		_, err = tx.Exec(
			"UPDATE daily_focus_tasks SET sort_order = $1, updated_at = $2 WHERE id = $3",
			item.SortOrder, time.Now(), item.ID)
		
		if err != nil {
			h.logger.Printf("Failed to update sort order for task %d: %v", item.ID, err)
			c.JSON(http.StatusInternalServerError, models.ErrorResponse{
				Success: false,
				Error: &models.APIError{
					Code:    "DATABASE_ERROR",
					Message: "更新排序失败",
				},
			})
			return
		}
	}

	// 提交事务
	if err = tx.Commit(); err != nil {
		h.logger.Printf("Failed to commit transaction: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "DATABASE_ERROR",
				Message: "提交事务失败",
			},
		})
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(nil, "排序更新成功"))
}

// GetTaskSuggestions 获取智能推荐
func (h *DailyFocusTaskHandler) GetTaskSuggestions(c *gin.Context) {
	// 获取用户信息
	claims, ok := c.Get("claims")
	if !ok {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "UNAUTHORIZED",
				Message: "用户认证信息不存在",
			},
		})
		return
	}

	userClaims, ok := claims.(*models.ExtendedClaims)
	if !ok {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "INVALID_TOKEN",
				Message: "无效的认证令牌",
			},
		})
		return
	}

	// 解析查询参数
	var query models.TaskSuggestionQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "INVALID_PARAMS",
				Message: "无效的查询参数: " + err.Error(),
			},
		})
		return
	}

	// 验证参数
	if err := h.validate.Struct(query); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "VALIDATION_ERROR",
				Message: "参数验证失败: " + err.Error(),
			},
		})
		return
	}

	// 设置默认日期
	focusDate := time.Now().Format("2006-01-02")
	if query.Date != nil && *query.Date != "" {
		if _, err := time.Parse("2006-01-02", *query.Date); err != nil {
			c.JSON(http.StatusBadRequest, models.ErrorResponse{
				Success: false,
				Error: &models.APIError{
					Code:    "INVALID_DATE_FORMAT",
					Message: "日期格式错误，应为YYYY-MM-DD",
				},
			})
			return
		}
		focusDate = *query.Date
	}

	// 设置限制
	limit := 5
	if query.Limit != nil && *query.Limit > 0 {
		limit = *query.Limit
	}

	ctx := context.Background()

	// 获取推荐任务
	suggestions, err := h.getTaskSuggestionsWithDetails(ctx, userClaims.UserID, focusDate, limit)
	if err != nil {
		h.logger.Printf("Failed to get task suggestions: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "DATABASE_ERROR",
				Message: "获取推荐任务失败",
			},
		})
		return
	}

	response := models.TaskSuggestionsResponse{
		Suggestions: suggestions,
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(response, "获取任务推荐成功"))
}

// AcceptSuggestions 批量采用推荐
func (h *DailyFocusTaskHandler) AcceptSuggestions(c *gin.Context) {
	// 获取用户信息
	claims, ok := c.Get("claims")
	if !ok {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "UNAUTHORIZED",
				Message: "用户认证信息不存在",
			},
		})
		return
	}

	userClaims, ok := claims.(*models.ExtendedClaims)
	if !ok {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "INVALID_TOKEN",
				Message: "无效的认证令牌",
			},
		})
		return
	}

	// 解析请求体
	var req models.AcceptSuggestionsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "INVALID_REQUEST",
				Message: "请求格式错误: " + err.Error(),
			},
		})
		return
	}

	// 验证请求参数
	if err := h.validate.Struct(req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "VALIDATION_ERROR",
				Message: "参数验证失败: " + err.Error(),
			},
		})
		return
	}

	// 设置焦点日期
	focusDate := time.Now().Format("2006-01-02")
	if req.FocusDate != nil && *req.FocusDate != "" {
		if _, err := time.Parse("2006-01-02", *req.FocusDate); err != nil {
			c.JSON(http.StatusBadRequest, models.ErrorResponse{
				Success: false,
				Error: &models.APIError{
					Code:    "INVALID_DATE_FORMAT",
					Message: "日期格式错误，应为YYYY-MM-DD",
				},
			})
			return
		}
		focusDate = *req.FocusDate
	}

	ctx := context.Background()
	
	// 开启事务
	tx, err := h.db.BeginTx(ctx)
	if err != nil {
		h.logger.Printf("Failed to begin transaction: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "DATABASE_ERROR",
				Message: "开启事务失败",
			},
		})
		return
	}
	defer tx.Rollback()

	var processedCount, failedCount int
	var failedTasks []models.DailyFocusBatchError

	// 获取当前最大排序位置
	var maxSortOrder int
	err = tx.QueryRow(
		"SELECT COALESCE(MAX(sort_order), 0) FROM daily_focus_tasks WHERE user_id = $1 AND focus_date = $2 AND status = 'active'",
		userClaims.UserID, focusDate).Scan(&maxSortOrder)
	
	if err != nil && err != sql.ErrNoRows {
		h.logger.Printf("Failed to get max sort order: %v", err)
		maxSortOrder = 0
	}

	for _, taskID := range req.TaskIDs {
		// 验证任务是否存在且分配给用户
		var taskProjectID int
		var taskAssigneeID *int
		err := tx.QueryRow(
			"SELECT project_id, assignee_id FROM tasks WHERE id = $1 AND deleted_at IS NULL",
			taskID).Scan(&taskProjectID, &taskAssigneeID)
		
		if err != nil || taskAssigneeID == nil || *taskAssigneeID != userClaims.UserID {
			failedCount++
			failedTasks = append(failedTasks, models.DailyFocusBatchError{
				TaskID: taskID,
				Error:  "任务不存在或未分配给当前用户",
			})
			continue
		}

		// 检查是否已存在
		var existingID int
		err = tx.QueryRow(
			"SELECT id FROM daily_focus_tasks WHERE task_id = $1 AND user_id = $2 AND focus_date = $3",
			taskID, userClaims.UserID, focusDate).Scan(&existingID)
		
		if err == nil {
			failedCount++
			failedTasks = append(failedTasks, models.DailyFocusBatchError{
				TaskID: taskID,
				Error:  "任务已在今日主要任务中",
			})
			continue
		} else if err != sql.ErrNoRows {
			failedCount++
			failedTasks = append(failedTasks, models.DailyFocusBatchError{
				TaskID: taskID,
				Error:  "数据库查询失败",
			})
			continue
		}

		// 插入今日主要任务
		maxSortOrder++
		_, err = tx.Exec( `
			INSERT INTO daily_focus_tasks 
			(task_id, user_id, project_id, focus_date, sort_order, priority_level, 
			 is_auto_suggested, suggestion_reason, status, created_by)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		`,
			taskID, userClaims.UserID, taskProjectID, focusDate,
			maxSortOrder, models.PriorityMedium, true, models.SuggestionReasonSuggested,
			models.StatusActive, userClaims.UserID)

		if err != nil {
			failedCount++
			failedTasks = append(failedTasks, models.DailyFocusBatchError{
				TaskID: taskID,
				Error:  "插入失败",
			})
			continue
		}

		processedCount++
	}

	// 提交事务
	if err = tx.Commit(); err != nil {
		h.logger.Printf("Failed to commit transaction: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "DATABASE_ERROR",
				Message: "提交事务失败",
			},
		})
		return
	}

	response := models.DailyFocusBatchResponse{
		ProcessedCount: processedCount,
		FailedCount:    failedCount,
		FailedTasks:    failedTasks,
	}

	c.JSON(http.StatusCreated, models.NewSuccessResponse(response, fmt.Sprintf("成功添加 %d 个推荐任务", processedCount)))
}

// 获取带任务详情的智能推荐
func (h *DailyFocusTaskHandler) getTaskSuggestionsWithDetails(ctx context.Context, userID int, focusDate string, limit int) ([]models.TaskSuggestion, error) {
	// 第一步：获取用户的历史完成情况分析
	userStats, err := h.getUserCompletionStats(ctx, userID)
	if err != nil {
		h.logger.Printf("Failed to get user completion stats: %v", err)
		// 使用默认值
		userStats = map[string]float64{
			"completion_rate": 0.7,
			"avg_task_size": 60,
			"preferred_priority": 0.6,
		}
	}

	// 第二步：获取候选任务的详细信息和初始评分
	querySQL := `
		SELECT DISTINCT
			t.id as task_id,
			t.project_id,
			t.title,
			t.description,
			t.status,
			t.priority,
			t.due_date,
			t.assignee_id,
			t.created_at,
			t.updated_at,
			t.estimated_minutes,
			t.task_level,
			t.parent_id,
			p.name as project_name,
			p.updated_at as project_last_activity,
			-- 计算子任务数量
			(SELECT COUNT(*) FROM tasks sub WHERE sub.parent_id = t.id AND sub.deleted_at IS NULL) as subtask_count,
			-- 检查是否有最近的工作记录
			(SELECT COUNT(*) FROM task_time_logs ttl 
			 WHERE ttl.task_id = t.id AND ttl.user_id = $1 
			 AND ttl.start_time >= $2::date - INTERVAL '7 days') as recent_work_count,
			-- 检查是否被频繁延期
			(SELECT COUNT(*) FROM daily_focus_tasks dft_carried 
			 WHERE dft_carried.task_id = t.id AND dft_carried.user_id = $1 
			 AND dft_carried.carried_from_date IS NOT NULL) as carry_over_count
		FROM tasks t
		JOIN projects p ON t.project_id = p.id
		WHERE t.status NOT IN ('completed', 'cancelled', 'archived')
		  AND t.deleted_at IS NULL
		  AND p.deleted_at IS NULL
		  AND NOT EXISTS (
			  SELECT 1 FROM daily_focus_tasks dft 
			  WHERE dft.task_id = t.id 
				AND dft.user_id = $1 
				AND dft.focus_date = $2::date
				AND dft.status = 'active'
		  )
		ORDER BY t.updated_at DESC, t.created_at DESC
		LIMIT $3 * 2  -- 获取更多候选任务用于评分
	`

	rows, err := h.db.Query(querySQL, userID, focusDate, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var candidates []candidateTask
	for rows.Next() {
		var candidate candidateTask
		err := rows.Scan(
			&candidate.TaskID, &candidate.ProjectID, &candidate.Title, &candidate.Description,
			&candidate.Status, &candidate.Priority, &candidate.DueDate,
			&candidate.AssigneeID, &candidate.CreatedAt, &candidate.UpdatedAt,
			&candidate.EstimatedMinutes, &candidate.TaskLevel, &candidate.ParentID,
			&candidate.ProjectName, &candidate.ProjectLastActivity,
			&candidate.SubtaskCount, &candidate.RecentWorkCount, &candidate.CarryOverCount,
		)
		if err != nil {
			h.logger.Printf("Failed to scan candidate task: %v", err)
			continue
		}
		candidates = append(candidates, candidate)
	}
	rows.Close()

	// 第三步：使用智能算法评分每个候选任务
	var allSuggestions []models.TaskSuggestion
	focusDateParsed, _ := time.Parse("2006-01-02", focusDate)
	
	for _, candidate := range candidates {
		score, reason := h.calculateTaskRecommendationScore(candidate, focusDateParsed, userStats)
		
		// 计算所有任务的评分，稍后根据需要调整阈值
		// 处理 Description 指针转换
		description := ""
		if candidate.Description != nil {
			description = *candidate.Description
		}

		task := models.Task{
			ID:           candidate.TaskID,
			ProjectID:    candidate.ProjectID,
			Title:        candidate.Title,
			Description:  description,
			Status:       candidate.Status,
			Priority:     candidate.Priority,
			DueDate:      candidate.DueDate,
			AssigneeID:   candidate.AssigneeID,
		}

		// 处理估算时间的指针转换
		estimatedMinutes := 0
		if candidate.EstimatedMinutes != nil {
			estimatedMinutes = *candidate.EstimatedMinutes
		}

		suggestion := models.TaskSuggestion{
			TaskID:                   candidate.TaskID,
			Task:                     &task,
			SuggestionReason:         reason,
			SuggestionScore:          score,
			EstimatedDurationMinutes: estimatedMinutes,
		}

		allSuggestions = append(allSuggestions, suggestion)
	}

	// 按评分排序所有任务
	for i := 0; i < len(allSuggestions); i++ {
		for j := i + 1; j < len(allSuggestions); j++ {
			if allSuggestions[j].SuggestionScore > allSuggestions[i].SuggestionScore {
				allSuggestions[i], allSuggestions[j] = allSuggestions[j], allSuggestions[i]
			}
		}
	}

	// 动态确定阈值以确保至少有指定数量的推荐任务
	var suggestions []models.TaskSuggestion
	minThreshold := 0.15 // 最低阈值，避免推荐质量过低的任务
	defaultThreshold := 0.3 // 默认阈值

	// 首先尝试默认阈值
	for _, suggestion := range allSuggestions {
		if suggestion.SuggestionScore >= defaultThreshold {
			suggestions = append(suggestions, suggestion)
		}
	}

	// 如果默认阈值下的任务数量不足，动态降低阈值
	if len(suggestions) < limit && len(allSuggestions) > 0 {
		suggestions = []models.TaskSuggestion{} // 重置
		
		// 如果候选任务总数不足请求数量，返回所有候选任务
		if len(allSuggestions) <= limit {
			for _, suggestion := range allSuggestions {
				if suggestion.SuggestionScore >= minThreshold {
					suggestions = append(suggestions, suggestion)
				}
			}
		} else {
			// 选择评分最高的limit个任务，但不低于最低阈值
			count := 0
			for _, suggestion := range allSuggestions {
				if suggestion.SuggestionScore >= minThreshold && count < limit {
					suggestions = append(suggestions, suggestion)
					count++
				}
			}
		}
	}

	// 确保不超过请求的数量
	if len(suggestions) > limit {
		suggestions = suggestions[:limit]
	}

	return suggestions, nil
}

// 获取用户历史完成情况统计
func (h *DailyFocusTaskHandler) getUserCompletionStats(ctx context.Context, userID int) (map[string]float64, error) {
	// 计算用户在过去30天的完成率
	var completionRate float64
	err := h.db.QueryRow(`
		SELECT 
			COALESCE(
				CAST(COUNT(CASE WHEN status = 'completed' THEN 1 END) AS FLOAT) / 
				NULLIF(COUNT(*), 0), 
				0.0
			) as completion_rate
		FROM daily_focus_tasks 
		WHERE user_id = $1 
		  AND focus_date >= CURRENT_DATE - INTERVAL '30 days'
	`, userID).Scan(&completionRate)
	
	if err != nil {
		completionRate = 0.7 // 默认完成率
	}

	// 计算用户偏好的任务大小（平均预估时间）
	var avgTaskSize float64
	err = h.db.QueryRow(`
		SELECT COALESCE(AVG(estimated_duration_minutes), 60.0) as avg_size
		FROM daily_focus_tasks dft
		JOIN tasks t ON dft.task_id = t.id
		WHERE dft.user_id = $1 
		  AND dft.status = 'completed'
		  AND dft.focus_date >= CURRENT_DATE - INTERVAL '30 days'
		  AND estimated_duration_minutes > 0
	`, userID).Scan(&avgTaskSize)
	
	if err != nil {
		avgTaskSize = 60.0 // 默认1小时
	}

	// 计算用户对优先级的偏好
	var preferredPriorityScore float64
	err = h.db.QueryRow(`
		SELECT 
			CASE 
				WHEN COUNT(*) = 0 THEN 0.6
				ELSE AVG(
					CASE priority_level
						WHEN 'high' THEN 1.0
						WHEN 'medium' THEN 0.6
						WHEN 'low' THEN 0.3
						ELSE 0.6
					END
				)
			END as preferred_priority
		FROM daily_focus_tasks 
		WHERE user_id = $1 
		  AND status = 'completed'
		  AND focus_date >= CURRENT_DATE - INTERVAL '30 days'
	`, userID).Scan(&preferredPriorityScore)
	
	if err != nil {
		preferredPriorityScore = 0.6
	}

	return map[string]float64{
		"completion_rate":     completionRate,
		"avg_task_size":       avgTaskSize,
		"preferred_priority":  preferredPriorityScore,
	}, nil
}

// 计算任务推荐评分的核心算法
func (h *DailyFocusTaskHandler) calculateTaskRecommendationScore(candidate candidateTask, focusDate time.Time, userStats map[string]float64) (float64, string) {
	var score float64 = 0.0
	var reason string = "suggested"

	// 1. 紧急度评分 (权重: 40%)
	urgencyScore := h.calculateUrgencyScore(candidate, focusDate)
	if urgencyScore >= 0.9 {
		reason = "overdue"
	} else if urgencyScore >= 0.8 {
		reason = "deadline_today"  
	} else if urgencyScore >= 0.6 {
		reason = "deadline_approaching"
	}
	score += urgencyScore * 0.4

	// 2. 优先级评分 (权重: 25%)
	priorityScore := h.calculatePriorityScore(candidate, userStats["preferred_priority"])
	if priorityScore >= 0.8 && reason == "suggested" {
		reason = "high_priority"
	}
	score += priorityScore * 0.25

	// 3. 工作连续性评分 (权重: 15%) - 鼓励完成正在进行的任务
	continuityScore := h.calculateContinuityScore(candidate)
	if continuityScore >= 0.8 && reason == "suggested" {
		reason = "work_in_progress" 
	}
	score += continuityScore * 0.15

	// 4. 任务规模匹配度评分 (权重: 10%)
	sizeScore := h.calculateSizeMatchScore(candidate, userStats["avg_task_size"])
	score += sizeScore * 0.1

	// 5. 项目活跃度评分 (权重: 10%) - 鼓励参与活跃项目
	projectScore := h.calculateProjectActivityScore(candidate, focusDate)
	score += projectScore * 0.1

	// 应用惩罚因子
	penaltyFactor := h.calculatePenaltyFactor(candidate)
	score *= penaltyFactor

	// 确保评分在0-1范围内
	if score > 1.0 {
		score = 1.0
	} else if score < 0.0 {
		score = 0.0
	}

	return score, reason
}

// 计算紧急度评分
func (h *DailyFocusTaskHandler) calculateUrgencyScore(candidate candidateTask, focusDate time.Time) float64 {
	if candidate.DueDate == nil {
		return 0.4 // 无截止日期的任务给予中等评分
	}

	daysUntilDue := candidate.DueDate.Sub(focusDate).Hours() / 24

	if daysUntilDue < 0 {
		// 已过期 - 最高优先级
		return 1.0
	} else if daysUntilDue == 0 {
		// 今天到期
		return 0.95
	} else if daysUntilDue <= 1 {
		// 明天到期
		return 0.85
	} else if daysUntilDue <= 3 {
		// 3天内到期
		return 0.75
	} else if daysUntilDue <= 7 {
		// 一周内到期
		return 0.6
	} else {
		// 较远的截止日期
		return 0.3
	}
}

// 计算优先级评分
func (h *DailyFocusTaskHandler) calculatePriorityScore(candidate candidateTask, userPreferredPriority float64) float64 {
	var basePriorityScore float64
	switch candidate.Priority {
	case "high":
		basePriorityScore = 1.0
	case "medium":
		basePriorityScore = 0.6
	case "low":
		basePriorityScore = 0.3
	default:
		basePriorityScore = 0.6
	}

	// 根据用户历史偏好调整评分
	adjustment := (basePriorityScore - userPreferredPriority) * 0.1
	return basePriorityScore + adjustment
}

// 计算工作连续性评分
func (h *DailyFocusTaskHandler) calculateContinuityScore(candidate candidateTask) float64 {
	score := 0.5 // 基础评分

	// 如果任务状态是in_progress，给予额外评分
	if candidate.Status == "in_progress" {
		score += 0.3
	}

	// 如果最近有工作记录，给予额外评分
	if candidate.RecentWorkCount > 0 {
		score += 0.2
	}

	// 如果是子任务且父任务在进行中，给予奖励
	if candidate.ParentID != nil {
		score += 0.1
	}

	return score
}

// 计算任务规模匹配度评分
func (h *DailyFocusTaskHandler) calculateSizeMatchScore(candidate candidateTask, userAvgTaskSize float64) float64 {
	if candidate.EstimatedMinutes == nil || *candidate.EstimatedMinutes == 0 {
		return 0.6 // 无估时的任务给予中等评分
	}

	taskSize := float64(*candidate.EstimatedMinutes)
	sizeDiff := taskSize - userAvgTaskSize

	// 计算匹配度 - 与用户平均任务大小越接近得分越高
	if sizeDiff < 0 {
		sizeDiff = -sizeDiff
	}

	if sizeDiff <= userAvgTaskSize*0.25 {
		return 1.0 // 非常匹配
	} else if sizeDiff <= userAvgTaskSize*0.5 {
		return 0.8 // 比较匹配
	} else if sizeDiff <= userAvgTaskSize {
		return 0.6 // 勉强匹配
	} else {
		return 0.3 // 不太匹配
	}
}

// 计算项目活跃度评分
func (h *DailyFocusTaskHandler) calculateProjectActivityScore(candidate candidateTask, focusDate time.Time) float64 {
	// 基于项目最近更新时间计算活跃度
	daysSinceLastActivity := focusDate.Sub(candidate.ProjectLastActivity).Hours() / 24

	if daysSinceLastActivity <= 1 {
		return 1.0 // 今天或昨天有活动
	} else if daysSinceLastActivity <= 3 {
		return 0.8 // 3天内有活动
	} else if daysSinceLastActivity <= 7 {
		return 0.6 // 一周内有活动
	} else if daysSinceLastActivity <= 14 {
		return 0.4 // 两周内有活动
	} else {
		return 0.2 // 项目不活跃
	}
}

// 计算惩罚因子
func (h *DailyFocusTaskHandler) calculatePenaltyFactor(candidate candidateTask) float64 {
	penaltyFactor := 1.0

	// 如果任务被频繁延期，降低推荐度
	if candidate.CarryOverCount >= 3 {
		penaltyFactor *= 0.7 // 重度延期任务
	} else if candidate.CarryOverCount >= 1 {
		penaltyFactor *= 0.9 // 轻度延期任务
	}

	// 如果任务有很多子任务但都未完成，可能过于复杂
	if candidate.SubtaskCount > 5 {
		penaltyFactor *= 0.8
	} else if candidate.SubtaskCount > 2 {
		penaltyFactor *= 0.9
	}

	return penaltyFactor
}

// CarryOverTasks godoc
// @Summary		Carry over daily focus tasks
// @Description	Carry over uncompleted daily focus tasks from a previous date to a new date
// @Tags			Daily Focus Tasks
// @Accept			json
// @Produce		json
// @Security		BearerAuth
// @Param			request			body		models.CarryOverTasksRequest		true	"Carry over request"
// @Success		201				{object}	models.DailyFocusBatchResponse		"Tasks carried over successfully"
// @Failure		400				{object}	models.ErrorResponse				"Bad request"
// @Failure		401				{object}	models.ErrorResponse				"Unauthorized"
// @Failure		500				{object}	models.ErrorResponse				"Internal server error"
// @Router			/daily-focus-tasks/carry-over [post]
func (h *DailyFocusTaskHandler) CarryOverTasks(c *gin.Context) {
	// 获取用户信息
	claims, ok := c.Get("claims")
	if !ok {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "UNAUTHORIZED",
				Message: "用户认证信息不存在",
			},
		})
		return
	}

	userClaims, ok := claims.(*models.ExtendedClaims)
	if !ok {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "INVALID_TOKEN",
				Message: "无效的认证令牌",
			},
		})
		return
	}

	// 解析请求体
	var req models.CarryOverTasksRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "INVALID_REQUEST",
				Message: "请求格式错误: " + err.Error(),
			},
		})
		return
	}

	// 验证请求参数
	if err := h.validate.Struct(req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "VALIDATION_ERROR",
				Message: "参数验证失败: " + err.Error(),
			},
		})
		return
	}

	// 验证日期格式
	fromDate, err := time.Parse("2006-01-02", req.FromDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "INVALID_DATE_FORMAT",
				Message: "源日期格式错误，应为YYYY-MM-DD",
			},
		})
		return
	}

	toDate, err := time.Parse("2006-01-02", req.ToDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "INVALID_DATE_FORMAT",
				Message: "目标日期格式错误，应为YYYY-MM-DD",
			},
		})
		return
	}

	// 验证日期逻辑
	if !toDate.After(fromDate) {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "INVALID_DATE_RANGE",
				Message: "目标日期必须晚于源日期",
			},
		})
		return
	}

	ctx := context.Background()
	
	// 开启事务
	tx, err := h.db.BeginTx(ctx)
	if err != nil {
		h.logger.Printf("Failed to begin transaction: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "DATABASE_ERROR",
				Message: "开启事务失败",
			},
		})
		return
	}
	defer tx.Rollback()

	// 构建查询条件
	var taskFilter string
	var queryArgs []interface{}
	queryArgs = append(queryArgs, userClaims.UserID, req.FromDate)

	if len(req.TaskIDs) > 0 {
		// 指定特定任务
		placeholders := make([]string, len(req.TaskIDs))
		for i, taskID := range req.TaskIDs {
			placeholders[i] = fmt.Sprintf("$%d", len(queryArgs)+1)
			queryArgs = append(queryArgs, taskID)
		}
		taskFilter = fmt.Sprintf("AND dft.task_id IN (%s)", strings.Join(placeholders, ","))
	}

	// 查询需要延续的任务
	querySQL := fmt.Sprintf(`
		SELECT 
			dft.id, dft.task_id, dft.project_id, dft.priority_level, 
			dft.user_notes, dft.estimated_duration_minutes,
			t.status as task_status, t.title as task_title
		FROM daily_focus_tasks dft
		JOIN tasks t ON dft.task_id = t.id
		WHERE dft.user_id = $1 
		  AND dft.focus_date = $2
		  AND dft.status = 'active'
		  AND t.status IN ('todo', 'in_progress')
		  AND t.deleted_at IS NULL
		  %s
		ORDER BY dft.sort_order
	`, taskFilter)

	rows, err := tx.Query(querySQL, queryArgs...)
	if err != nil {
		h.logger.Printf("Failed to query tasks to carry over: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "DATABASE_ERROR",
				Message: "查询待延续任务失败",
			},
		})
		return
	}
	defer rows.Close()

	// 收集需要延续的任务信息
	type carryOverTask struct {
		ID                       int
		TaskID                   int
		ProjectID                int
		PriorityLevel            string
		UserNotes                *string
		EstimatedDurationMinutes *int
		TaskStatus               string
		TaskTitle                string
	}

	var tasksToCarryOver []carryOverTask
	for rows.Next() {
		var task carryOverTask
		err := rows.Scan(
			&task.ID, &task.TaskID, &task.ProjectID, &task.PriorityLevel,
			&task.UserNotes, &task.EstimatedDurationMinutes,
			&task.TaskStatus, &task.TaskTitle,
		)
		if err != nil {
			h.logger.Printf("Failed to scan task to carry over: %v", err)
			continue
		}
		tasksToCarryOver = append(tasksToCarryOver, task)
	}
	rows.Close()

	if len(tasksToCarryOver) == 0 {
		c.JSON(http.StatusOK, models.NewSuccessResponse(models.DailyFocusBatchResponse{
			ProcessedCount: 0,
			FailedCount:    0,
		}, "没有找到需要延续的任务"))
		return
	}

	// 获取目标日期的最大排序位置
	var maxSortOrder int
	err = tx.QueryRow(
		"SELECT COALESCE(MAX(sort_order), 0) FROM daily_focus_tasks WHERE user_id = $1 AND focus_date = $2 AND status = 'active'",
		userClaims.UserID, req.ToDate).Scan(&maxSortOrder)
	
	if err != nil && err != sql.ErrNoRows {
		h.logger.Printf("Failed to get max sort order: %v", err)
		maxSortOrder = 0
	}

	var processedCount, failedCount int
	var failedTasks []models.DailyFocusBatchError
	var carriedOverTaskIDs []int

	// 延续每个任务
	for _, task := range tasksToCarryOver {
		// 检查目标日期是否已存在相同任务
		var existingID int
		err = tx.QueryRow(
			"SELECT id FROM daily_focus_tasks WHERE task_id = $1 AND user_id = $2 AND focus_date = $3",
			task.TaskID, userClaims.UserID, req.ToDate).Scan(&existingID)
		
		if err == nil {
			// 任务已存在于目标日期
			failedCount++
			failedTasks = append(failedTasks, models.DailyFocusBatchError{
				TaskID: task.TaskID,
				Error:  fmt.Sprintf("任务'%s'已存在于目标日期", task.TaskTitle),
			})
			continue
		} else if err != sql.ErrNoRows {
			failedCount++
			failedTasks = append(failedTasks, models.DailyFocusBatchError{
				TaskID: task.TaskID,
				Error:  "数据库查询失败",
			})
			continue
		}

		// 创建新的每日焦点任务记录
		maxSortOrder++
		_, err = tx.Exec(`
			INSERT INTO daily_focus_tasks 
			(task_id, user_id, project_id, focus_date, sort_order, priority_level, 
			 user_notes, estimated_duration_minutes, carried_from_date, status, created_by)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		`,
			task.TaskID, userClaims.UserID, task.ProjectID, req.ToDate,
			maxSortOrder, task.PriorityLevel, task.UserNotes, task.EstimatedDurationMinutes,
			fromDate, models.StatusActive, userClaims.UserID)

		if err != nil {
			h.logger.Printf("Failed to create carried over task for task %d: %v", task.TaskID, err)
			failedCount++
			failedTasks = append(failedTasks, models.DailyFocusBatchError{
				TaskID: task.TaskID,
				Error:  "创建延续任务失败",
			})
			continue
		}

		processedCount++
		carriedOverTaskIDs = append(carriedOverTaskIDs, task.ID)
	}

	// 注意：不需要更新原任务状态，carry-over只是复制任务到新日期
	// 源日期的任务保持原状态，这样可以保持历史记录的完整性
	// 新创建的任务通过 carried_from_date 字段记录来源

	// 提交事务
	if err = tx.Commit(); err != nil {
		h.logger.Printf("Failed to commit transaction: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "DATABASE_ERROR",
				Message: "提交事务失败",
			},
		})
		return
	}

	response := models.DailyFocusBatchResponse{
		ProcessedCount: processedCount,
		FailedCount:    failedCount,
		FailedTasks:    failedTasks,
	}

	h.logger.Printf("SUCCESS: Carried over %d tasks from %s to %s for user %d", 
		processedCount, req.FromDate, req.ToDate, userClaims.UserID)

	message := fmt.Sprintf("成功延续 %d 个任务从 %s 到 %s", processedCount, req.FromDate, req.ToDate)
	c.JSON(http.StatusCreated, models.NewSuccessResponse(response, message))
}