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
	userClaims, exists := c.Get("user")
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
		if task.Status == models.StatusActive {
			activeCount++
		} else if task.Status == models.StatusCompleted {
			completedCount++
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
	claims, ok := c.Get("user")
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
	claims, ok := c.Get("user")
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
// @Success		200	{object}	models.NewSuccessResponse	"Daily focus task deleted successfully"
// @Failure		400	{object}	models.ErrorResponse	"Bad request"
// @Failure		401	{object}	models.ErrorResponse	"Unauthorized"
// @Failure		404	{object}	models.ErrorResponse	"Not found"
// @Failure		500	{object}	models.ErrorResponse	"Internal server error"
// @Router			/daily-focus-tasks/{id} [delete]
func (h *DailyFocusTaskHandler) DeleteDailyFocusTask(c *gin.Context) {
	// 获取用户信息
	claims, ok := c.Get("user")
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
				Message: "没有权限删除此任务",
			},
		})
		return
	}

	// 删除任务
	_, err = h.db.Exec(
		"DELETE FROM daily_focus_tasks WHERE id = $1",
		taskID)
	
	if err != nil {
		h.logger.Printf("Failed to delete daily focus task: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "DATABASE_ERROR",
				Message: "删除任务失败",
			},
		})
		return
	}

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
	claims, ok := c.Get("user")
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
	claims, ok := c.Get("user")
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
	claims, ok := c.Get("user")
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
	claims, ok := c.Get("user")
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

// 获取带任务详情的推荐
func (h *DailyFocusTaskHandler) getTaskSuggestionsWithDetails(ctx context.Context, userID int, focusDate string, limit int) ([]models.TaskSuggestion, error) {
	querySQL := `
		SELECT DISTINCT
			t.id as task_id,
			t.title,
			t.description,
			t.status,
			t.priority,
			t.due_date,
			t.assignee_id,
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
		var task models.Task
		
		err := rows.Scan(
			&suggestion.TaskID,
			&task.Title,
			&task.Description,
			&task.Status,
			&task.Priority,
			&task.DueDate,
			&task.AssigneeID,
			&suggestion.SuggestionReason,
			&suggestion.SuggestionScore,
			&suggestion.EstimatedDurationMinutes,
		)
		if err != nil {
			h.logger.Printf("Failed to scan task suggestion: %v", err)
			continue
		}

		task.ID = suggestion.TaskID
		suggestion.Task = &task

		suggestions = append(suggestions, suggestion)
	}

	return suggestions, nil
}