package handlers

import (
	"ai-project-backend/cache"
	"ai-project-backend/database"
	"ai-project-backend/models"
	"ai-project-backend/services"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// TaskHandler handles all task-related operations
type TaskHandler struct {
	db             database.DB
	aiCacheService *cache.AICacheService
}

// NewTaskHandler creates a new task handler
func NewTaskHandler(db database.DB, aiCacheService *cache.AICacheService, logger *log.Logger, validate interface{}) *TaskHandler {
	return &TaskHandler{
		db:             db,
		aiCacheService: aiCacheService,
	}
}

// GetTasks godoc
// @Summary		Get tasks for a project
// @Description	Retrieve tasks for a specific project with optional filtering and pagination
// @Tags			Tasks
// @Accept			json
// @Produce		json
// @Security		BearerAuth
// @Param			id				path		int		true	"Project ID"
// @Param			page			query		int		false	"Page number"	default(1)
// @Param			page_size		query		int		false	"Page size"		default(50)
// @Param			search			query		string	false	"Search term"
// @Param			status			query		string	false	"Task status"
// @Param			assignee_id		query		string	false	"Assignee ID"
// @Param			priority		query		string	false	"Task priority"
// @Param			sort_by			query		string	false	"Sort field"	default(created_at)
// @Param			sort_order		query		string	false	"Sort order"	default(desc)
// @Success		200				{object}	models.PaginatedResponse	"Tasks retrieved successfully"
// @Failure		400				{object}	models.ErrorResponse		"Bad request"
// @Failure		401				{object}	models.ErrorResponse		"Unauthorized"
// @Failure		500				{object}	models.ErrorResponse		"Internal server error"
// @Router			/projects/{id}/tasks [get]
func (h *TaskHandler) GetTasks(c *gin.Context) {
	projectID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeInternal, "无效的项目ID", nil))
		return
	}

	// 企业数据隔离检查 - 验证用户是否有权访问此项目的任务列表
	var projectEnterpriseID *int
	query := `SELECT enterprise_id FROM projects WHERE id = $1 AND deleted_at IS NULL`
	err = h.db.QueryRow(query, projectID).Scan(&projectEnterpriseID)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, models.NewErrorResponse(
			models.ErrCodeNotFound,
			"项目不存在",
			nil,
		))
		return
	}
	if err != nil {
		log.Printf("[GetTasks] Failed to query project enterprise_id: %v", err)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			models.ErrCodeInternal,
			"查询项目信息失败",
			nil,
		))
		return
	}

	// 使用helper函数检查访问权限
	if hasAccess, errMsg := CheckEnterpriseAccess(c, projectEnterpriseID); !hasAccess {
		c.JSON(http.StatusForbidden, models.NewErrorResponse(
			models.ErrCodeAuthorization,
			"无权访问此项目的任务列表",
			errMsg,
		))
		return
	}

	// Parse pagination parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "50"))
	// Parse query parameters
	search := c.Query("search")
	q := c.Query("q")
	if search == "" {
		search = q
	}
	status := c.Query("status")
	assigneeID := c.Query("assignee_id")
	priority := c.Query("priority")
	taskIDParam := c.Query("task_id")
	workDate := c.Query("work_date") // YYYY-MM-DD format
	sortBy := c.DefaultQuery("sort_by", "created_at")
	sortOrder := c.DefaultQuery("sort_order", "desc")
	onlyRootsParam := c.DefaultQuery("only_roots", "false")
	onlyRoots := onlyRootsParam == "true" || onlyRootsParam == "1"

	var assigneePtr *int
	if assigneeID != "" {
		if v, err := strconv.Atoi(assigneeID); err == nil {
			assigneePtr = &v
		}
	}
	var taskIDPtr *int
	if taskIDParam != "" {
		if v, err := strconv.Atoi(taskIDParam); err == nil {
			taskIDPtr = &v
		}
	}

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 1000 {
		pageSize = 50
	}

	offset := (page - 1) * pageSize

	// Delegate to filtered repository with project constraint
	options := &models.TaskListOptions{
		Preset:    "", // project内不使用预设
		Status:    status,
		Priority:  priority,
		Search:    search,
		Assignee:  assigneePtr,
		ProjectID: &projectID,
		TaskID:    taskIDPtr,
		OnlyRoots: onlyRoots,
		WorkDate:  workDate,
		SortBy:    sortBy,
		SortOrder: sortOrder,
	}

	tasks, total, err := h.db.Tasks().GetAllFiltered(c.Request.Context(), options, pageSize, offset)
	if err != nil {
		log.Printf("Error getting tasks: %v", err)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "获取任务列表失败", nil))
		return
	}

	totalPages := (total + pageSize - 1) / pageSize

	responseData := map[string]interface{}{
		"data": tasks,
		"pagination": map[string]interface{}{
			"page":        page,
			"page_size":   pageSize,
			"total":       total,
			"total_pages": totalPages,
		},
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(responseData, "获取任务列表成功"))
}

// GetAllTasks handles GET /api/v1/tasks
func (h *TaskHandler) GetAllTasks(c *gin.Context) {
	userID := c.GetInt("user_id")
	userRole, _ := c.Get("user_role")
	
	// Parse pagination parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "50"))
	// Parse query parameters
	search := c.Query("search")
	if search == "" {
		search = c.Query("q")
	}
	status := c.Query("status")
	projectID := c.Query("project_id")
	assigneeID := c.Query("assignee_id")
	priority := c.Query("priority")
	taskIDParam := c.Query("task_id")
	enterpriseIDParam := c.Query("enterprise_id")
	workDate := c.Query("work_date") // YYYY-MM-DD format
	sortBy := c.DefaultQuery("sort_by", "created_at")
	sortOrder := c.DefaultQuery("sort_order", "desc")
	preset := c.DefaultQuery("preset", "") // overdue | planning | on_hold
	onlyRootsParam := c.DefaultQuery("only_roots", "false")
	onlyRoots := onlyRootsParam == "true" || onlyRootsParam == "1"

	var assigneePtr *int
	if assigneeID != "" {
		if v, err := strconv.Atoi(assigneeID); err == nil {
			assigneePtr = &v
		}
	}
	var projectPtr *int
	if projectID != "" {
		if v, err := strconv.Atoi(projectID); err == nil {
			projectPtr = &v
		}
	}
	var taskIDPtr *int
	if taskIDParam != "" {
		if v, err := strconv.Atoi(taskIDParam); err == nil {
			taskIDPtr = &v
		}
	}

	// ✅ 企业数据隔离：优先使用query参数，如果没有则根据用户角色自动获取
	var enterpriseIDPtr *int
	if enterpriseIDParam != "" {
		// 1. 如果query参数指定了enterprise_id，使用它
		if v, err := strconv.Atoi(enterpriseIDParam); err == nil {
			enterpriseIDPtr = &v
			log.Printf("[GetAllTasks] Using enterprise_id from query parameter: %d", v)
		}
	} else if userRole != nil {
		// 2. 如果没有query参数，根据用户角色自动获取enterprise_id
		roleStr := userRole.(string)

		// Admin和super_admin可以看到所有任务
		if roleStr != "admin" && roleStr != "super_admin" {
			if roleStr == "enterprise_admin" || roleStr == "enterprise_user" ||
			   roleStr == "company_admin" || roleStr == "company_user" {
				// ✅ 使用新的getUserEnterpriseID方法（支持enterprise和company体系）
				enterpriseID, err := h.getUserEnterpriseID(uint(userID), roleStr)
				if err != nil {
					log.Printf("[GetAllTasks] Error getting user enterprise ID: %v", err)
					c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "获取用户企业信息失败", nil))
					return
				}
				if enterpriseID > 0 {
					enterpriseIDInt := int(enterpriseID)
					enterpriseIDPtr = &enterpriseIDInt
					log.Printf("[GetAllTasks] User %d (role=%s) filtered by enterprise_id=%d", userID, roleStr, enterpriseID)
				}
			}
		} else {
			log.Printf("[GetAllTasks] User %d (role=%s) can see ALL tasks", userID, roleStr)
		}
	}

	// If preset is overdue and client didn't specify sort, prefer due_date ASC
	if preset == "overdue" {
		if c.Query("sort_by") == "" {
			sortBy = "due_date"
		}
		if c.Query("sort_order") == "" {
			sortOrder = "asc"
		}
	}

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 1000 {
		pageSize = 50
	}

	offset := (page - 1) * pageSize

	options := &models.TaskListOptions{
		Preset:       preset,
		Status:       status,
		Priority:     priority,
		Search:       search,
		Assignee:     assigneePtr,
		ProjectID:    projectPtr,
		TaskID:       taskIDPtr,
		CompanyID:    nil, // ❌ 废弃旧系统的company_id过滤
		EnterpriseID: enterpriseIDPtr, // ✅ 使用新系统的enterprise_id过滤
		OnlyRoots:    onlyRoots,
		WorkDate:     workDate,
		SortBy:       sortBy,
		SortOrder:    sortOrder,
	}

	tasks, total, err := h.db.Tasks().GetAllFiltered(c.Request.Context(), options, pageSize, offset)
	if err != nil {
		log.Printf("Error getting all tasks (filtered): %v", err)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "获取任务列表失败", nil))
		return
	}

	totalPages := (total + pageSize - 1) / pageSize

	responseData := map[string]interface{}{
		"data": tasks,
		"pagination": map[string]interface{}{
			"page":        page,
			"page_size":   pageSize,
			"total":       total,
			"total_pages": totalPages,
		},
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(responseData, "获取任务列表成功"))
}

// CreateTask handles POST /api/v1/projects/:projectId/tasks and POST /api/v1/tasks
func (h *TaskHandler) CreateTask(c *gin.Context) {
	var req struct {
		Title         string                 `json:"title" binding:"required,min=1,max=255"`
		Description   *string                `json:"description"`
		ProjectID     *int                   `json:"project_id"` // Support project_id from request body
		Status        string                 `json:"status"`
		Priority      string                 `json:"priority"`
		AssigneeID    *int                   `json:"assignee_id"`
		ParentID      *int                   `json:"parent_id"`
		DueDate       *string                `json:"due_date"`
		Tags          []string               `json:"tags"`
		CustomFields  map[string]interface{} `json:"custom_fields"`
		EstimatedTime *int                   `json:"estimated_time"`
		// Enhanced time management fields
		StartDatetime      *string  `json:"start_datetime"`
		DueDatetime        *string  `json:"due_datetime"`
		EstimatedMinutes   *int     `json:"estimated_minutes"`
		ActualMinutes      *int     `json:"actual_minutes"`
		TimeUnitPreference *string  `json:"time_unit_preference"`
		WorkHoursPerDay    *float64 `json:"work_hours_per_day"`
		TimeTrackingMode   *string  `json:"time_tracking_mode"`
		// Skip auto-template generation
		SkipTemplate       *bool    `json:"skip_template"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeInternal, "请求数据格式错误", nil))
		return
	}

	// Validate and normalize status field
	validStatuses := map[string]bool{
		"draft": true, "planning": true, "todo": true, "in_progress": true,
		"testing": true, "completed": true, "cancelled": true,
		"on_hold": true, "suspended": true, "blocked": true, "archived": true,
	}
	if req.Status == "" {
		req.Status = "todo" // Default status
	} else if !validStatuses[req.Status] {
		log.Printf("[CreateTask] Invalid status provided: %s", req.Status)
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeInternal, 
			fmt.Sprintf("无效的任务状态: %s. 有效值: draft, planning, todo, in_progress, testing, completed, cancelled, on_hold, suspended, blocked, archived", req.Status), nil))
		return
	}

	// Get project_id: priority order: request body > path parameter
	var projectID int
	if req.ProjectID != nil && *req.ProjectID > 0 {
		// From request body (Android/mobile client)
		projectID = *req.ProjectID
	} else if paramID := c.Param("id"); paramID != "" {
		// From path parameter (Web client via /projects/:id/tasks)
		var err error
		projectID, err = strconv.Atoi(paramID)
		if err != nil {
			c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeInternal, "无效的项目ID", nil))
			return
		}
	} else {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeInternal, "请提供项目ID (请求体project_id字段或路径参数)", nil))
		return
	}

	// Verify project exists with improved error handling
	ctx := c.Request.Context()
	project, err := h.db.Projects().GetByID(ctx, projectID)
	if err != nil {
		log.Printf("[CreateTask] Database error checking project existence: projectID=%d, error=%v", projectID, err)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "数据库查询失败，请稍后重试", nil))
		return
	}
	if project == nil {
		log.Printf("[CreateTask] Project not found: projectID=%d", projectID)
		c.JSON(http.StatusNotFound, models.NewErrorResponse(models.ErrCodeNotFound, fmt.Sprintf("项目不存在 (ID: %d)", projectID), nil))
		return
	}

	// 获取当前用户ID作为创建人
	currentUserID := c.GetInt("user_id")

	// 默认负责人：使用当前创建人
	if req.AssigneeID == nil && currentUserID > 0 {
		req.AssigneeID = &currentUserID
		log.Printf("[CreateTask] Assigned to creator (ID: %d)", currentUserID)
	}

	// Parse due date with multiple format support
	var dueDate *time.Time
	if req.DueDate != nil && *req.DueDate != "" {
		parsed, err := parseDateTimeFlexible(*req.DueDate)
		if err != nil {
			log.Printf("[CreateTask] Failed to parse due_date '%s': %v", *req.DueDate, err)
			c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeInternal, 
				fmt.Sprintf("无效的截止日期格式: %s. 支持格式: 2006-01-02, 2006-01-02T15:04:05Z, 2006-01-02 15:04:05", *req.DueDate), nil))
			return
		}
		dueDate = &parsed
	}

	// Parse start datetime with multiple format support
	var startDatetime *time.Time
	if req.StartDatetime != nil && *req.StartDatetime != "" {
		parsed, err := parseDateTimeFlexible(*req.StartDatetime)
		if err != nil {
			log.Printf("[CreateTask] Failed to parse start_datetime '%s': %v", *req.StartDatetime, err)
			c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeInternal,
				fmt.Sprintf("无效的开始日期格式: %s. 支持格式: 2006-01-02, 2006-01-02T15:04:05Z, 2006-01-02 15:04:05", *req.StartDatetime), nil))
			return
		}
		startDatetime = &parsed
	}

	// Parse due datetime with multiple format support
	var dueDatetime *time.Time
	if req.DueDatetime != nil && *req.DueDatetime != "" {
		parsed, err := parseDateTimeFlexible(*req.DueDatetime)
		if err != nil {
			log.Printf("[CreateTask] Failed to parse due_datetime '%s': %v", *req.DueDatetime, err)
			c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeInternal,
				fmt.Sprintf("无效的截止时间格式: %s. 支持格式: 2006-01-02, 2006-01-02T15:04:05Z, 2006-01-02 15:04:05", *req.DueDatetime), nil))
			return
		}
		dueDatetime = &parsed
	}

	// Verify parent task exists if provided
	if req.ParentID != nil && *req.ParentID > 0 {
		parentTask, err := h.db.Tasks().GetByID(ctx, *req.ParentID)
		if err != nil {
			log.Printf("[CreateTask] Database error checking parent task: parentID=%d, error=%v", *req.ParentID, err)
			c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "数据库查询失败，请稍后重试", nil))
			return
		}
		if parentTask == nil {
			log.Printf("[CreateTask] Parent task not found: parentID=%d", *req.ParentID)
			c.JSON(http.StatusNotFound, models.NewErrorResponse(models.ErrCodeNotFound, fmt.Sprintf("父任务不存在 (ID: %d)", *req.ParentID), nil))
			return
		}
		// Verify parent task is in the same project
		if parentTask.ProjectID != projectID {
			log.Printf("[CreateTask] Parent task project mismatch: parentID=%d, parentProjectID=%d, currentProjectID=%d", *req.ParentID, parentTask.ProjectID, projectID)
			c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeInternal, fmt.Sprintf("父任务不在当前项目中 (Parent Project ID: %d, Current Project ID: %d)", parentTask.ProjectID, projectID), nil))
			return
		}
	}

	// Convert custom fields to JSON
	var customFieldsJSON []byte
	if req.CustomFields != nil {
		customFieldsJSON, _ = json.Marshal(req.CustomFields)
	}

	// 设置创建人
	var createdByPtr *int
	if currentUserID > 0 {
		createdByPtr = &currentUserID
	}

	task := &models.Task{
		Title:       req.Title,
		Description: req.Description,
		Status:      req.Status,
		Priority:    req.Priority,
		ProjectID:   projectID,
		AssigneeID:  req.AssigneeID,
		ParentID:    req.ParentID,
		DueDate:     dueDate,
		CreatedBy:   createdByPtr,
		// Enhanced time management fields
		StartDatetime:      startDatetime,
		DueDatetime:        dueDatetime,
		EstimatedMinutes:   getIntValue(req.EstimatedMinutes),
		ActualMinutes:      getIntValue(req.ActualMinutes),
		TimeUnitPreference: getStringValue(req.TimeUnitPreference, "auto"),
		WorkHoursPerDay:    getFloat64Value(req.WorkHoursPerDay, 8.0),
		TimeTrackingMode:   getStringValue(req.TimeTrackingMode, "manual"),
	}

	if len(customFieldsJSON) > 0 {
		task.CustomFields = models.CustomFields{}
		if err := task.CustomFields.Scan(customFieldsJSON); err == nil {
			// CustomFields successfully unmarshaled
		}
	}

	createdTask, err := h.db.Tasks().Create(c.Request.Context(), task)
	if err != nil {
		log.Printf("[CreateTask] Database error creating task: projectID=%d, title=%s, error=%v", projectID, req.Title, err)
		// Check if it's a duplicate title error
		if strings.Contains(err.Error(), "任务标题重复") {
			c.JSON(http.StatusConflict, models.NewErrorResponse("DUPLICATE_TITLE", err.Error(), nil))
		} else if strings.Contains(err.Error(), "foreign key") || strings.Contains(err.Error(), "violates") {
			c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeInternal, "数据关联错误，请检查相关数据是否存在", nil))
		} else if strings.Contains(err.Error(), "connection") || strings.Contains(err.Error(), "timeout") {
			c.JSON(http.StatusServiceUnavailable, models.NewErrorResponse(models.ErrCodeInternal, "数据库连接失败，请稍后重试", nil))
		} else {
			c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "创建任务失败", nil))
		}
		return
	}

	// Lifecycle trigger: Auto-create Task Description document upon task creation
	// Skip if skip_template is true
	skipTemplate := req.SkipTemplate != nil && *req.SkipTemplate
	if !skipTemplate {
		// Using a background goroutine with proper error handling and timeout
		go func() {
			// Create a new context with timeout for the async operation
			ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
			defer cancel()

			// Add structured logging with timestamp
			start := time.Now()
			log.Printf("[AsyncTask][CreateTask][Start] Creating auto-doc for task_id=%d, user_id=%d",
				createdTask.ID, currentUserID)

			if err := h.autoCreateTaskDescription(ctx, createdTask, currentUserID); err != nil {
				log.Printf("[AsyncTask][CreateTask][Error] Failed to create task description: task_id=%d, user_id=%d, duration=%v, error=%v",
					createdTask.ID, currentUserID, time.Since(start), err)
			} else {
				log.Printf("[AsyncTask][CreateTask][Success] Auto-doc created: task_id=%d, duration=%v",
					createdTask.ID, time.Since(start))
			}
		}()
	} else {
		log.Printf("[CreateTask] Skipped auto-doc generation for task_id=%d (skip_template=true)", createdTask.ID)
	}

	c.JSON(http.StatusCreated, models.NewSuccessResponse(createdTask.ToResponse(), "任务创建成功"))
}

// BulkImportTasks handles POST /api/v1/projects/:projectId/tasks/bulk-import
func (h *TaskHandler) BulkImportTasks(c *gin.Context) {
	projectID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeInternal, "无效的项目ID", nil))
		return
	}

	userID := c.GetInt("user_id") // For future implementation
	_ = userID

	var req struct {
		Tasks []struct {
			Title         string                 `json:"title" binding:"required"`
			Description   *string                `json:"description"`
			Status        string                 `json:"status"`
			Priority      string                 `json:"priority"`
			AssigneeID    *int                   `json:"assignee_id"`
			ParentID      *int                   `json:"parent_id"`
			DueDate       *string                `json:"due_date"`
			CustomFields  map[string]interface{} `json:"custom_fields"`
			EstimatedTime *int                   `json:"estimated_time"`
		} `json:"tasks" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeInternal, "请求数据格式错误", nil))
		return
	}

	var createdTasks []models.TaskResponse
	var errors []string

	// 预取默认负责人ID，使用智能fallback策略
	var defaultAssigneeID *int
	ctx := c.Request.Context()

	// 优先级1: 查找ai-pm用户
	if aiPM, err := h.db.Users().GetByUsername(ctx, "ai-pm"); err == nil && aiPM != nil {
		defaultAssigneeID = &aiPM.ID
		log.Printf("[BulkImportTasks] Default assignee set to 'ai-pm' (ID: %d)", aiPM.ID)
	} else {
		// 优先级2: 查找admin用户作为fallback
		if admin, err := h.db.Users().GetByUsername(ctx, "admin"); err == nil && admin != nil {
			defaultAssigneeID = &admin.ID
			log.Printf("[BulkImportTasks] ai-pm not found, fallback to admin user (ID: %d)", admin.ID)
		} else {
			// 优先级3: 使用当前创建任务的用户
			currentUserID := c.GetInt("user_id")
			if currentUserID > 0 {
				defaultAssigneeID = &currentUserID
				log.Printf("[BulkImportTasks] admin not found, fallback to current user (ID: %d)", currentUserID)
			} else {
				// 优先级4: 查找任何可用的管理员用户
				if anyAdmin, err := h.db.Users().GetFirstAdminUser(ctx); err == nil && anyAdmin != nil {
					defaultAssigneeID = &anyAdmin.ID
					log.Printf("[BulkImportTasks] fallback to first available admin user (ID: %d)", anyAdmin.ID)
				} else {
					// 最后兜底：不设置默认负责人
					log.Printf("[BulkImportTasks] No default assignee found, tasks will be unassigned")
				}
			}
		}
	}

	for i, taskReq := range req.Tasks {
		// 若未指定负责人且存在默认负责人，则设置为 ai-pm
		if taskReq.AssigneeID == nil && defaultAssigneeID != nil {
			taskReq.AssigneeID = defaultAssigneeID
		}

		// Parse due date
		var dueDate *time.Time
		if taskReq.DueDate != nil && *taskReq.DueDate != "" {
			if parsed, err := time.Parse("2006-01-02T15:04:05Z", *taskReq.DueDate); err == nil {
				dueDate = &parsed
			} else if parsed, err := time.Parse("2006-01-02", *taskReq.DueDate); err == nil {
				dueDate = &parsed
			}
		}

		// Convert custom fields to JSON
		var customFieldsJSON []byte
		if taskReq.CustomFields != nil {
			customFieldsJSON, _ = json.Marshal(taskReq.CustomFields)
		}

		task := &models.Task{
			Title:              taskReq.Title,
			Description:        taskReq.Description,
			Status:             taskReq.Status,
			Priority:           taskReq.Priority,
			ProjectID:          projectID,
			AssigneeID:         taskReq.AssigneeID,
			ParentID:           taskReq.ParentID,
			DueDate:            dueDate,
			TimeTrackingMode:   "manual", // 设置默认时间追踪模式
			TimeUnitPreference: "auto",   // 设置默认时间单位偏好
			WorkHoursPerDay:    8.0,      // 设置默认每日工作时长
		}

		if len(customFieldsJSON) > 0 {
			task.CustomFields = models.CustomFields{}
			if err := task.CustomFields.Scan(customFieldsJSON); err == nil {
				// CustomFields successfully unmarshaled
			}
		}

		createdTask, err := h.db.Tasks().Create(c.Request.Context(), task)
		if err != nil {
			errors = append(errors, fmt.Sprintf("任务 %d: %v", i+1, err))
			continue
		}

		createdTasks = append(createdTasks, createdTask.ToResponse())
	}

	responseData := map[string]interface{}{
		"created_tasks": createdTasks,
		"created_count": len(createdTasks),
		"total_count":   len(req.Tasks),
		"errors":        errors,
	}

	message := fmt.Sprintf("批量导入完成，成功创建 %d/%d 个任务", len(createdTasks), len(req.Tasks))
	c.JSON(http.StatusOK, models.NewSuccessResponse(responseData, message))
}

// GetTask handles GET /api/v1/projects/:projectId/tasks/:taskId
func (h *TaskHandler) GetTask(c *gin.Context) {
	// Support both "id" (from /tasks/:id) and "taskId" (from /projects/:id/tasks/:taskId) parameter names
	taskIDStr := c.Param("taskId")
	if taskIDStr == "" {
		taskIDStr = c.Param("id")
	}
	
	taskID, err := strconv.Atoi(taskIDStr)
	if err != nil || taskIDStr == "" {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeInternal, "无效的任务ID", nil))
		return
	}

	task, err := h.db.Tasks().GetByID(c.Request.Context(), taskID)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, models.NewErrorResponse(models.ErrCodeInternal, "任务不存在", nil))
		} else {
			log.Printf("Error getting task: %v", err)
			c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "获取任务失败", nil))
		}
		return
	}

	response := task.ToResponse()

	c.JSON(http.StatusOK, models.NewSuccessResponse(response, "获取任务成功"))
}

// GetTaskDetailedInfo handles GET /api/v1/tasks/:id/details
func (h *TaskHandler) GetTaskDetailedInfo(c *gin.Context) {
	// Support both "id" (from /tasks/:id/details) and "taskId" parameter names
	taskIDStr := c.Param("taskId")
	if taskIDStr == "" {
		taskIDStr = c.Param("id")
	}
	
	taskID, err := strconv.Atoi(taskIDStr)
	if err != nil || taskIDStr == "" {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeInternal, "无效的任务ID", nil))
		return
	}

	task, err := h.db.Tasks().GetByID(c.Request.Context(), taskID)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, models.NewErrorResponse(models.ErrCodeInternal, "任务不存在", nil))
		} else {
			log.Printf("Error getting task details: %v", err)
			c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "获取任务详情失败", nil))
		}
		return
	}

	// Build detailed response with hierarchical information
	response := task.ToResponse()

	// Get parent task if exists
	var parentTask interface{}
	if task.ParentID != nil {
		parent, err := h.db.Tasks().GetByID(c.Request.Context(), *task.ParentID)
		if err == nil {
			parentResp := parent.ToResponse()
			parentTask = map[string]interface{}{
				"id":       parentResp.ID,
				"title":    parentResp.Title,
				"status":   parentResp.Status,
				"priority": parentResp.Priority,
			}
		}
	}

	// Get sibling tasks (tasks with same parent)
	var siblings []interface{}
	if task.ParentID != nil {
		siblingTasks, err := h.db.Tasks().GetChildren(c.Request.Context(), *task.ParentID)
		if err == nil {
			for _, sibling := range siblingTasks {
				// Exclude current task from siblings
				if sibling.ID != task.ID {
					siblingResp := sibling.ToResponse()
					siblings = append(siblings, map[string]interface{}{
						"id":       siblingResp.ID,
						"title":    siblingResp.Title,
						"status":   siblingResp.Status,
						"priority": siblingResp.Priority,
					})
				}
			}
		}
	}
	if siblings == nil {
		siblings = []interface{}{}
	}

	// Get child tasks
	var children []interface{}
	childTasks, err := h.db.Tasks().GetChildren(c.Request.Context(), task.ID)
	if err == nil {
		for _, child := range childTasks {
			childResp := child.ToResponse()
			children = append(children, map[string]interface{}{
				"id":             childResp.ID,
				"title":          childResp.Title,
				"status":         childResp.Status,
				"priority":       childResp.Priority,
				"has_children":   childResp.HasChildren,
				"children_count": childResp.ChildrenCount,
			})
		}
	}
	if children == nil {
		children = []interface{}{}
	}

	// Build task path (from root to current task)
	var path []interface{}
	if task.ParentID != nil {
		currentParentID := task.ParentID
		for currentParentID != nil {
			parentTaskRecord, err := h.db.Tasks().GetByID(c.Request.Context(), *currentParentID)
			if err != nil {
				break
			}
			parentResp := parentTaskRecord.ToResponse()
			path = append([]interface{}{map[string]interface{}{
				"id":    parentResp.ID,
				"title": parentResp.Title,
			}}, path...)
			currentParentID = parentTaskRecord.ParentID
		}
	}
	if path == nil {
		path = []interface{}{}
	}

	detailedInfo := map[string]interface{}{
		"task":        response,
		"parent":      parentTask,
		"siblings":    siblings,
		"children":    children,
		"path":        path,
		"level":       task.TaskLevel,
		"depth":       task.Depth,
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(detailedInfo, "获取任务详情成功"))
}

// UpdateTask handles PUT /api/v1/projects/:projectId/tasks/:taskId
func (h *TaskHandler) UpdateTask(c *gin.Context) {
	taskID, err := strconv.Atoi(c.Param("taskId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeInternal, "无效的任务ID", nil))
		return
	}

	var req struct {
		Title         *string                `json:"title"`
		Description   *string                `json:"description"`
		Status        *string                `json:"status"`
		Priority      *string                `json:"priority"`
		AssigneeID    *int                   `json:"assignee_id"`
		ParentID      *int                   `json:"parent_id"`
		ProjectID     *int                   `json:"project_id"`
		DueDate       *string                `json:"due_date"`
		CustomFields  map[string]interface{} `json:"custom_fields"`
		EstimatedTime *int                   `json:"estimated_time"`
		ActualTime    *int                   `json:"actual_time"`
		// Enhanced time management fields
		StartDatetime      *string  `json:"start_datetime"`
		DueDatetime        *string  `json:"due_datetime"`
		EstimatedMinutes   *int     `json:"estimated_minutes"`
		ActualMinutes      *int     `json:"actual_minutes"`
		TimeUnitPreference *string  `json:"time_unit_preference"`
		WorkHoursPerDay    *float64 `json:"work_hours_per_day"`
		TimeTrackingMode   *string  `json:"time_tracking_mode"`
		// Skip auto-template generation
		SkipTemplate       *bool    `json:"skip_template"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("[UpdateTask] JSON binding error for task %d: %v", taskID, err)
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			models.ErrCodeValidation,
			fmt.Sprintf("请求数据格式错误: %v", err),
			nil,
		))
		return
	}

	// Get existing task
	task, err := h.db.Tasks().GetByID(c.Request.Context(), taskID)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, models.NewErrorResponse(models.ErrCodeInternal, "任务不存在", nil))
		} else {
			log.Printf("Error getting task: %v", err)
			c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "获取任务失败", nil))
		}
		return
	}

	// 企业数据隔离检查 - 更新前验证访问权限
	var projectEnterpriseID *int
	query := `SELECT enterprise_id FROM projects WHERE id = $1 AND deleted_at IS NULL`
	err = h.db.QueryRow(query, task.ProjectID).Scan(&projectEnterpriseID)
	if err != nil && err != sql.ErrNoRows {
		log.Printf("[UpdateTask] Failed to query project enterprise_id: %v", err)
	}
	if hasAccess, errMsg := CheckEnterpriseAccess(c, projectEnterpriseID); !hasAccess {
		c.JSON(http.StatusForbidden, models.NewErrorResponse(
			models.ErrCodeAuthorization,
			"无权修改此任务",
			errMsg,
		))
		return
	}

	// Validate task is not archived (unless we're un-archiving it)
	if req.Status == nil || *req.Status != "todo" && *req.Status != "in_progress" && *req.Status != "completed" {
		if errResp := h.validateTaskNotArchived(task, "修改"); errResp != nil {
			c.JSON(http.StatusConflict, errResp)
			return
		}
	}

	// Store original status for comparison before making changes
	originalStatus := task.Status

	// Update fields (apply only if provided)
	if req.Title != nil {
		task.Title = *req.Title
	}
	if req.Description != nil {
		task.Description = req.Description
	}
	if req.Status != nil {
		// Validate status field
		validStatuses := map[string]bool{
			"draft": true, "planning": true, "todo": true, "in_progress": true,
			"testing": true, "completed": true, "cancelled": true,
			"on_hold": true, "suspended": true, "blocked": true, "archived": true,
		}
		if !validStatuses[*req.Status] {
			log.Printf("[UpdateTask] Invalid status provided: %s", *req.Status)
			c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeValidation,
				fmt.Sprintf("无效的任务状态: %s. 有效值: draft, planning, todo, in_progress, testing, completed, cancelled, on_hold, suspended, blocked, archived", *req.Status), nil))
			return
		}
		task.Status = *req.Status
	}
	if req.Priority != nil {
		priority := *req.Priority
		// Validate priority value
		validPriorities := map[string]bool{
			"low": true, "medium": true, "high": true,
		}
		if priority != "" && !validPriorities[priority] {
			log.Printf("[UpdateTask] Invalid priority value: %s", priority)
			c.JSON(http.StatusBadRequest, models.NewErrorResponse(
				models.ErrCodeValidation,
				fmt.Sprintf("无效的优先级值: %s, 必须是 low, medium 或 high", priority),
				nil,
			))
			return
		}
		task.Priority = priority
	}
	if req.AssigneeID != nil {
		task.AssigneeID = req.AssigneeID
	}
	if req.ParentID != nil {
		task.ParentID = req.ParentID
	}
	if req.ProjectID != nil {
		task.ProjectID = *req.ProjectID
	}

	// Parse due date with improved flexible parsing
	if req.DueDate != nil && *req.DueDate != "" {
		parsed, err := parseDateTimeFlexible(*req.DueDate)
		if err != nil {
			log.Printf("[UpdateTask] Failed to parse due_date '%s': %v", *req.DueDate, err)
			c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeValidation,
				fmt.Sprintf("无效的截止日期格式: %s. 支持格式: 2006-01-02, 2006-01-02T15:04:05Z, 2006-01-02 15:04:05", *req.DueDate), nil))
			return
		}
		task.DueDate = &parsed
	} else {
		task.DueDate = nil
	}

	// Parse and update start datetime with improved flexible parsing
	if req.StartDatetime != nil && *req.StartDatetime != "" {
		parsed, err := parseDateTimeFlexible(*req.StartDatetime)
		if err != nil {
			log.Printf("[UpdateTask] Failed to parse start_datetime '%s': %v", *req.StartDatetime, err)
			c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeValidation,
				fmt.Sprintf("无效的开始日期格式: %s. 支持格式: 2006-01-02, 2006-01-02T15:04:05Z, 2006-01-02 15:04:05", *req.StartDatetime), nil))
			return
		}
		task.StartDatetime = &parsed
	} else {
		task.StartDatetime = nil
	}

	// Parse and update due datetime with improved flexible parsing
	if req.DueDatetime != nil && *req.DueDatetime != "" {
		parsed, err := parseDateTimeFlexible(*req.DueDatetime)
		if err != nil {
			log.Printf("[UpdateTask] Failed to parse due_datetime '%s': %v", *req.DueDatetime, err)
			c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeValidation,
				fmt.Sprintf("无效的截止时间格式: %s. 支持格式: 2006-01-02, 2006-01-02T15:04:05Z, 2006-01-02 15:04:05", *req.DueDatetime), nil))
			return
		}
		task.DueDatetime = &parsed
	} else {
		task.DueDatetime = nil
	}

	// Update enhanced time management fields
	if req.EstimatedMinutes != nil {
		task.EstimatedMinutes = *req.EstimatedMinutes
	}
	if req.ActualMinutes != nil {
		task.ActualMinutes = *req.ActualMinutes
	}
	if req.TimeUnitPreference != nil {
		task.TimeUnitPreference = *req.TimeUnitPreference
	}
	if req.WorkHoursPerDay != nil {
		task.WorkHoursPerDay = *req.WorkHoursPerDay
	}
	if req.TimeTrackingMode != nil {
		task.TimeTrackingMode = *req.TimeTrackingMode
	}

	// Convert custom fields to JSON
	if req.CustomFields != nil {
		customFieldsJSON, err := json.Marshal(req.CustomFields)
		if err != nil {
			log.Printf("[UpdateTask] Error marshaling custom fields for task %d: %v", taskID, err)
			c.JSON(http.StatusBadRequest, models.NewErrorResponse(
				models.ErrCodeValidation,
				"自定义字段格式错误: 无法序列化",
				nil,
			))
			return
		}

		var customFields models.CustomFields
		if err := json.Unmarshal(customFieldsJSON, &customFields); err != nil {
			log.Printf("[UpdateTask] Error unmarshaling custom fields for task %d: %v", taskID, err)
			c.JSON(http.StatusBadRequest, models.NewErrorResponse(
				models.ErrCodeValidation,
				fmt.Sprintf("自定义字段格式错误: %v", err),
				nil,
			))
			return
		}
		task.CustomFields = customFields
	}

	updatedTask, err := h.db.Tasks().Update(c.Request.Context(), task)
	if err != nil {
		log.Printf("Error updating task: %v", err)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "更新任务失败", nil))
		return
	}

	// 智能缓存失效：任务更新后自动清理相关AI缓存
	// Using a background goroutine with proper error handling and timeout
	if h.aiCacheService != nil {
		go func() {
			// Create a new context with timeout for the async operation
			ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			defer cancel()
			
			// Add structured logging with timestamp
			start := time.Now()
			log.Printf("[AsyncTask][UpdateTask][Start] Invalidating cache for task_id=%d", updatedTask.ID)
			
			if err := h.aiCacheService.InvalidateAllTaskCache(ctx, updatedTask.ID); err != nil {
				log.Printf("[AsyncTask][UpdateTask][Error] Failed to invalidate cache: task_id=%d, duration=%v, error=%v",
					updatedTask.ID, time.Since(start), err)
			} else {
				log.Printf("[AsyncTask][UpdateTask][Success] Cache invalidated: task_id=%d, duration=%v",
					updatedTask.ID, time.Since(start))
			}
		}()
	}

	// If task status changed to completed, stop any running timer for this task
	if originalStatus != "completed" && updatedTask.Status == "completed" {
		if err := h.stopTimerForCompletedTask(c.Request.Context(), updatedTask.ID); err != nil {
			log.Printf("Warning: Failed to stop timer for completed task %d: %v", updatedTask.ID, err)
			// Don't fail the request, just log the warning
		}
	}

	// Lifecycle trigger: When status transitions to in_progress, auto-create Task Document if not exists
	// Skip if skip_template is true
	skipTemplate := req.SkipTemplate != nil && *req.SkipTemplate
	if originalStatus != "in_progress" && updatedTask.Status == "in_progress" && !skipTemplate {
		uid := c.GetInt("user_id")
		go func() {
			ctx := c.Request.Context()
			if err := h.autoCreateTaskMainDoc(ctx, updatedTask, uid); err != nil {
				log.Printf("[AutoDoc] failed to create task main doc for task %d: %v", updatedTask.ID, err)
			}
		}()
	} else if skipTemplate {
		log.Printf("[UpdateTask] Skipped auto-doc generation for task_id=%d (skip_template=true)", updatedTask.ID)
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(updatedTask.ToResponse(), "任务更新成功"))
}

// DeleteTask handles DELETE /api/v1/projects/:projectId/tasks/:taskId
func (h *TaskHandler) DeleteTask(c *gin.Context) {
	taskID, err := strconv.Atoi(c.Param("taskId"))
	if err != nil {
		log.Printf("[DeleteTask] 无效的任务ID参数: %v", err)
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeInternal, "无效的任务ID", nil))
		return
	}

	log.Printf("[DeleteTask] 开始删除任务: taskID=%d", taskID)

	// Get existing task to check if archived
	task, err := h.db.Tasks().GetByID(c.Request.Context(), taskID)
	if err != nil {
		if err == sql.ErrNoRows {
			log.Printf("[DeleteTask] 任务不存在: taskID=%d", taskID)
			c.JSON(http.StatusNotFound, models.NewErrorResponse(models.ErrCodeNotFound, "任务不存在", nil))
		} else {
			log.Printf("[DeleteTask] 获取任务失败: taskID=%d, error=%v", taskID, err)
			c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "获取任务失败", nil))
		}
		return
	}

	log.Printf("[DeleteTask] 任务信息: taskID=%d, title=%s, status=%s, archived=%v",
		taskID, task.Title, task.Status, task.CustomFields != nil && task.CustomFields["archived"] == "true")

	// 企业数据隔离检查 - 删除前验证访问权限
	var projectEnterpriseID *int
	query := `SELECT enterprise_id FROM projects WHERE id = $1 AND deleted_at IS NULL`
	err = h.db.QueryRow(query, task.ProjectID).Scan(&projectEnterpriseID)
	if err != nil && err != sql.ErrNoRows {
		log.Printf("[DeleteTask] Failed to query project enterprise_id: %v", err)
	}
	if hasAccess, errMsg := CheckEnterpriseAccess(c, projectEnterpriseID); !hasAccess {
		c.JSON(http.StatusForbidden, models.NewErrorResponse(
			models.ErrCodeAuthorization,
			"无权删除此任务",
			errMsg,
		))
		return
	}

	// Validate task is not archived
	if errResp := h.validateTaskNotArchived(task, "删除"); errResp != nil {
		log.Printf("[DeleteTask] 任务已归档，无法删除: taskID=%d", taskID)
		c.JSON(http.StatusConflict, errResp)
		return
	}

	// 执行删除操作
	err = h.db.Tasks().Delete(c.Request.Context(), taskID)
	if err != nil {
		log.Printf("[DeleteTask] 删除任务失败: taskID=%d, error=%v, errorType=%T", taskID, err, err)

		// 尝试提取更详细的错误信息
		errorMessage := "删除任务失败"
		if err != nil {
			errorMessage = fmt.Sprintf("删除任务失败: %v", err)
		}

		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, errorMessage, map[string]interface{}{
			"task_id": taskID,
			"error_detail": err.Error(),
		}))
		return
	}

	// 智能缓存失效：任务删除后自动清理相关AI缓存
	if h.aiCacheService != nil {
		go func() {
			ctx := context.Background()
			if err := h.aiCacheService.InvalidateAllTaskCache(ctx, taskID); err != nil {
				log.Printf("[CACHE_INVALIDATION] Failed to invalidate cache for deleted task %d: %v", taskID, err)
			} else {
				log.Printf("[CACHE_INVALIDATION] Successfully invalidated AI cache for deleted task %d", taskID)
			}
		}()
	}

	log.Printf("[DeleteTask] 任务删除成功: taskID=%d", taskID)
	c.JSON(http.StatusOK, models.NewSuccessResponse(nil, "任务删除成功"))
}

// GetTaskTree handles GET /api/v1/projects/:projectId/tasks/tree
func (h *TaskHandler) GetTaskTree(c *gin.Context) {
	_, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeInternal, "无效的项目ID", nil))
		return
	}

	// TODO: Implement GetTree method in TaskRepository
	c.JSON(http.StatusNotImplemented, models.NewErrorResponse("NOT_IMPLEMENTED", "功能暂未实现", nil))
}

// GetRootTasks handles GET /api/v1/projects/:projectId/tasks/roots
func (h *TaskHandler) GetRootTasks(c *gin.Context) {
	_, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeInternal, "无效的项目ID", nil))
		return
	}

	// Parse pagination parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	_ = (page - 1) * pageSize // offset for future implementation

	// TODO: Implement GetRoots method in TaskRepository
	c.JSON(http.StatusNotImplemented, models.NewErrorResponse("NOT_IMPLEMENTED", "功能暂未实现", nil))
}

// SearchParentTasks handles GET /api/v1/projects/:projectId/tasks/search-parents
func (h *TaskHandler) SearchParentTasks(c *gin.Context) {
	_, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeInternal, "无效的项目ID", nil))
		return
	}

	_ = c.Query("query")      // query for future implementation
	_ = c.Query("exclude_id") // excludeID for future implementation

	// TODO: Implement SearchParents method in TaskRepository
	c.JSON(http.StatusNotImplemented, models.NewErrorResponse("NOT_IMPLEMENTED", "功能暂未实现", nil))
}

// GetTaskChildren handles GET /api/v1/projects/:projectId/tasks/:taskId/children
func (h *TaskHandler) GetTaskChildren(c *gin.Context) {
	_, err := strconv.Atoi(c.Param("taskId")) // taskID for future implementation
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeInternal, "无效的任务ID", nil))
		return
	}

	// TODO: Implement GetChildren method in TaskRepository
	c.JSON(http.StatusNotImplemented, models.NewErrorResponse("NOT_IMPLEMENTED", "功能暂未实现", nil))
}

// GetTaskUpdates handles GET /api/v1/projects/:projectId/tasks/:taskId/updates
func (h *TaskHandler) GetTaskUpdates(c *gin.Context) {
	_, err := strconv.Atoi(c.Param("taskId")) // taskID for future implementation
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeInternal, "无效的任务ID", nil))
		return
	}

	// Parse pagination parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 50 {
		pageSize = 10
	}

	_ = (page - 1) * pageSize // offset for future implementation

	// TODO: Implement GetUpdates method in TaskRepository
	c.JSON(http.StatusNotImplemented, models.NewErrorResponse("NOT_IMPLEMENTED", "功能暂未实现", nil))
}

// UpdateTaskUpdate handles PUT /api/v1/projects/:projectId/tasks/:id/updates/:updateId
func (h *TaskHandler) UpdateTaskUpdate(c *gin.Context) {
	_, err := strconv.Atoi(c.Param("updateId")) // updateID for future implementation
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeInternal, "无效的更新ID", nil))
		return
	}

	var req struct {
		Notes string `json:"notes" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeInternal, "请求数据格式错误", nil))
		return
	}

	// TODO: Implement UpdateUpdate method in TaskRepository
	c.JSON(http.StatusNotImplemented, models.NewErrorResponse("NOT_IMPLEMENTED", "功能暂未实现", nil))
}

// DeleteTaskUpdate handles DELETE /api/v1/projects/:projectId/tasks/:id/updates/:updateId
func (h *TaskHandler) DeleteTaskUpdate(c *gin.Context) {
	_, err := strconv.Atoi(c.Param("updateId")) // updateID for future implementation
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeInternal, "无效的更新ID", nil))
		return
	}

	// TODO: Implement DeleteUpdate method in TaskRepository
	c.JSON(http.StatusNotImplemented, models.NewErrorResponse("NOT_IMPLEMENTED", "功能暂未实现", nil))
}

// GetTaskTimeline handles GET /api/v1/projects/:projectId/tasks/:taskId/timeline
// GetTaskProgress handles GET /api/v1/tasks/:id/progress and /api/v1/projects/:projectId/tasks/:taskId/progress
func (h *TaskHandler) GetTaskProgress(c *gin.Context) {
	// Try to parse task ID from different params
	taskIDStr := c.Param("id")
	if taskIDStr == "" {
		taskIDStr = c.Param("taskId")
	}
	taskID, err := strconv.Atoi(taskIDStr)
	if err != nil || taskID <= 0 {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeInternal, "无效的任务ID", nil))
		return
	}

	// Compute progress using service
	svc := services.NewTaskProgressService(h.db)
	prog, err := svc.ComputeForTask(c.Request.Context(), taskID)
	if err != nil {
		log.Printf("Error computing task progress for %d: %v", taskID, err)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "计算任务进度失败", nil))
		return
	}
	if prog == nil {
		c.JSON(http.StatusNotFound, models.NewErrorResponse(models.ErrCodeInternal, "任务不存在", nil))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(prog, "获取任务进度成功"))
}

func (h *TaskHandler) GetTaskTimeline(c *gin.Context) {
	taskID, err := strconv.Atoi(c.Param("taskId"))
	if err != nil || taskID <= 0 {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeInternal, "无效的任务ID", nil))
		return
	}

	// Parse query parameters
	limitStr := c.DefaultQuery("limit", "20")
	offsetStr := c.DefaultQuery("offset", "0")

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100 // Maximum limit
	}

	offset, err := strconv.Atoi(offsetStr)
	if err != nil || offset < 0 {
		offset = 0
	}

	// Verify task exists and user has access
	task, err := h.db.Tasks().GetByID(c.Request.Context(), taskID)
	if err != nil {
		c.JSON(http.StatusNotFound, models.NewErrorResponse(models.ErrCodeNotFound, "任务不存在", nil))
		return
	}

	// Get task timeline events
	events, total, err := h.db.Tasks().GetTaskTimeline(c.Request.Context(), taskID, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "获取任务时间线失败", err.Error()))
		return
	}

	// Build response with pagination info
	response := map[string]interface{}{
		"task_id":    taskID,
		"task_title": task.Title,
		"events":     events,
		"pagination": map[string]interface{}{
			"total":  total,
			"limit":  limit,
			"offset": offset,
			"page":   (offset / limit) + 1,
			"pages":  (total + limit - 1) / limit,
		},
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(response, "获取任务时间线成功"))
}

// ValidateParent handles POST /api/v1/projects/:projectId/tasks/validate-parent
func (h *TaskHandler) ValidateParent(c *gin.Context) {
	var req struct {
		ParentID int `json:"parent_id" binding:"required"`
		ChildID  int `json:"child_id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeInternal, "请求数据格式错误", nil))
		return
	}

	// TODO: Implement ValidateParentChild method in TaskRepository
	c.JSON(http.StatusNotImplemented, models.NewErrorResponse("NOT_IMPLEMENTED", "功能暂未实现", nil))
}

// stopTimerForCompletedTask stops any running timer for the specified task
func (h *TaskHandler) stopTimerForCompletedTask(ctx context.Context, taskID int) error {
	// 1) Stop legacy per-user timers (users.current_timing_task_id) if any
	users, err := h.db.Users().GetUsersTimingTask(ctx, taskID)
	if err != nil {
		return fmt.Errorf("failed to get users timing task %d: %w", taskID, err)
	}
	for _, user := range users {
		if err := h.stopCurrentTimerForUser(ctx, &user, taskID); err != nil {
			log.Printf("Warning: Failed to stop legacy timer for user %d on task %d: %v", user.ID, taskID, err)
			// Continue with other users even if one fails
		}
	}

	// 2) Stop unified timers (unified_timer_logs) for this task across all users
	if err := h.stopUnifiedTimersForTask(ctx, taskID); err != nil {
		log.Printf("Warning: Failed to stop unified timers for task %d: %v", taskID, err)
	}

	return nil
}

// stopUnifiedTimersForTask stops any active unified timers linked to the given task across all users
func (h *TaskHandler) stopUnifiedTimersForTask(ctx context.Context, taskID int) error {
	// Access underlying *sql.DB
	sqlDB, ok := h.db.GetDB().(*sql.DB)
	if !ok || sqlDB == nil {
		return fmt.Errorf("sql.DB not available")
	}

	// Query active unified timers for this task
	rows, err := sqlDB.QueryContext(ctx, `
		SELECT id, user_id
		FROM unified_timer_logs
		WHERE target_type = 'project_task'
		  AND target_id = $1
		  AND status IN ('running', 'paused')
	`, taskID)
	if err != nil {
		return fmt.Errorf("query active unified timers: %w", err)
	}
	defer rows.Close()

	type timerRef struct{ id, userID int }
	var timers []timerRef
	for rows.Next() {
		var t timerRef
		if err := rows.Scan(&t.id, &t.userID); err != nil {
			return fmt.Errorf("scan unified timer row: %w", err)
		}
		timers = append(timers, t)
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("iterate unified timers: %w", err)
	}

	if len(timers) == 0 {
		return nil // nothing to do
	}

	// Instantiate unified timer service to leverage existing stop logic
	inference := services.NewTypeInferenceEngine(sqlDB)
	// notif := services.NewNotificationService() // Temporarily disabled
	svc := services.NewUnifiedTimerService(sqlDB, inference)

	for _, t := range timers {
		if _, err := svc.StopTimerByID(ctx, t.userID, t.id, "Auto-stopped due to task completion"); err != nil {
			log.Printf("Warning: Failed to stop unified timer %d for user %d on task %d: %v", t.id, t.userID, taskID, err)
		}
	}

	return nil
}

// stopCurrentTimerForUser stops the current timer for a specific user and task
func (h *TaskHandler) stopCurrentTimerForUser(ctx context.Context, user *models.User, taskID int) error {
	// Verify the user is actually timing this specific task
	if user.TimingStatus != string(models.TimingStatusRunning) ||
		user.CurrentTimingTaskID == nil ||
		*user.CurrentTimingTaskID != taskID {
		return nil // User is not timing this task
	}

	// Calculate duration
	endTime := time.Now()
	duration := endTime.Sub(*user.TimingStartTime)
	durationSeconds := int(duration.Seconds())

	// Ensure duration is not negative
	if durationSeconds < 0 {
		durationSeconds = 0
	}

	// Create time log entry
	timeLog := &models.TaskTimeLog{
		TaskID:          user.CurrentTimingTaskID,
		UserID:          user.ID,
		StartTime:       *user.TimingStartTime,
		EndTime:         &endTime,
		DurationSeconds: durationSeconds,
	}

	if err := h.db.Timer().Create(ctx, timeLog); err != nil {
		return fmt.Errorf("failed to create time log: %w", err)
	}

	// Update task total time
	task, err := h.db.Tasks().GetByID(ctx, taskID)
	if err != nil {
		return fmt.Errorf("failed to get task for time update: %w", err)
	}

	task.TotalTimeSeconds += durationSeconds
	_, err = h.db.Tasks().Update(ctx, task)
	if err != nil {
		log.Printf("Warning: Failed to update task total time: %v", err)
		// Don't fail the operation just for this
	}

	// Clear user timer state
	user.CurrentTimingTaskID = nil
	user.TimingStartTime = nil
	user.TimingStatus = string(models.TimingStatusStopped)

	_, err = h.db.Users().Update(ctx, user)
	if err != nil {
		return fmt.Errorf("failed to stop timer for user: %w", err)
	}

	log.Printf("Auto-stopped timer for user %d on completed task %d (duration: %s)",
		user.ID, taskID, models.FormatDuration(durationSeconds))

	return nil
}

// ===== Auto document generation and quality checks =====

// autoCreateTaskDescription creates an initial task description document and attaches it to the task.
func (h *TaskHandler) autoCreateTaskDescription(ctx context.Context, task *models.Task, userID int) error {
	// Build content using a standard template
	projectName := ""
	if p, err := h.db.Projects().GetByID(ctx, task.ProjectID); err == nil && p != nil {
		projectName = p.Name
	}

	title := fmt.Sprintf("任务描述 - %s", task.Title)
	content := h.renderTaskDescriptionTemplate(task, projectName)
	metadata := models.DocumentMetadata{
		"doc_kind":         "task_description",
		"generated_by":     "lifecycle_trigger",
		"generated_reason": "task_created",
	}
	issues, passed := h.runQualityCheck(content, "task_description")
	metadata["quality_check"] = map[string]interface{}{
		"passed":     passed,
		"issues":     issues,
		"checked_at": time.Now().Format(time.RFC3339),
	}

	// Create and attach via repository
	sqlDB, ok := h.db.GetDB().(*sql.DB)
	if !ok {
		return fmt.Errorf("sql.DB not available")
	}
	docRepo := database.NewDocumentRepository(sqlDB)
	projID := task.ProjectID
	doc := &models.Document{
		ProjectID:  &projID,
		Title:      title,
		Content:    &content,
		Type:       models.DocumentTypeMarkdown,
		Status:     models.DocumentStatusDraft,
		Tags:       []string{"auto_generated", "task_description"},
		Metadata:   metadata,
		OwnerID:    userID,
		Visibility: models.VisibilityTeam,
		Version:    1,
		IsTemplate: false,
		CreatedBy:  userID,
	}
	created, err := docRepo.Create(ctx, doc)
	if err != nil {
		return err
	}
	// Attach as main document
	if err := docRepo.AttachToTask(ctx, task.ID, created.ID, "main", userID); err != nil {
		return err
	}
	return nil
}

// autoCreateTaskMainDoc creates a main task document when task moves to in_progress, if not exists.
func (h *TaskHandler) autoCreateTaskMainDoc(ctx context.Context, task *models.Task, userID int) error {
	sqlDB, ok := h.db.GetDB().(*sql.DB)
	if !ok {
		return fmt.Errorf("sql.DB not available")
	}
	docRepo := database.NewDocumentRepository(sqlDB)
	// Check existing docs to avoid duplicates
	docs, err := docRepo.GetTaskDocuments(ctx, task.ID)
	if err == nil {
		for _, d := range docs {
			if d != nil && d.Metadata != nil {
				if kind, ok := d.Metadata["doc_kind"].(string); ok && kind == "task_doc" {
					return nil // already exists
				}
			}
			if strings.HasPrefix(d.Title, "任务文档 -") {
				return nil
			}
		}
	}
	// Build content
	projectName := ""
	if p, err := h.db.Projects().GetByID(ctx, task.ProjectID); err == nil && p != nil {
		projectName = p.Name
	}
	title := fmt.Sprintf("任务文档 - %s", task.Title)
	content := h.renderTaskMainDocTemplate(task, projectName)
	metadata := models.DocumentMetadata{
		"doc_kind":         "task_doc",
		"generated_by":     "lifecycle_trigger",
		"generated_reason": "status_in_progress",
	}
	issues, passed := h.runQualityCheck(content, "task_doc")
	metadata["quality_check"] = map[string]interface{}{
		"passed":     passed,
		"issues":     issues,
		"checked_at": time.Now().Format(time.RFC3339),
	}

	projID := task.ProjectID
	doc := &models.Document{
		ProjectID:  &projID,
		Title:      title,
		Content:    &content,
		Type:       models.DocumentTypeMarkdown,
		Status:     models.DocumentStatusDraft,
		Tags:       []string{"auto_generated", "task_doc"},
		Metadata:   metadata,
		OwnerID:    userID,
		Visibility: models.VisibilityTeam,
		Version:    1,
		IsTemplate: false,
		CreatedBy:  userID,
	}
	created, err := docRepo.Create(ctx, doc)
	if err != nil {
		return err
	}
	if err := docRepo.AttachToTask(ctx, task.ID, created.ID, "main", userID); err != nil {
		return err
	}
	return nil
}

// renderTaskDescriptionTemplate returns markdown content for task description
func (h *TaskHandler) renderTaskDescriptionTemplate(task *models.Task, projectName string) string {
	assignee := ""
	if task.AssigneeID != nil {
		if u, err := h.db.Users().GetByID(context.Background(), *task.AssigneeID); err == nil && u != nil {
			assignee = u.Username
		}
	}
	due := ""
	if task.DueDate != nil {
		due = task.DueDate.Format("2006-01-02")
	}
	b := &strings.Builder{}
	fmt.Fprintf(b, "# 任务描述 - %s\n\n", task.Title)
	fmt.Fprintf(b, "- 任务ID: %d\n", task.ID)
	fmt.Fprintf(b, "- 项目: %s (#%d)\n", projectName, task.ProjectID)
	if assignee != "" {
		fmt.Fprintf(b, "- 负责人: %s\n", assignee)
	}
	fmt.Fprintf(b, "- 状态: %s\n", task.Status)
	if due != "" {
		fmt.Fprintf(b, "- 期望截止: %s\n", due)
	}
	b.WriteString("\n## 背景与目标\n- 背景：\n- 业务目标：\n- 技术目标：\n\n")
	b.WriteString("## 范围定义\n- 在范围：\n- 不在范围：\n\n")
	b.WriteString("## 验收标准\n- [ ] Given ..., When ..., Then ...\n- [ ] Given ..., When ..., Then ...\n- [ ] Given ..., When ..., Then ...\n\n")
	b.WriteString("## 依赖与风险\n- 依赖：\n- 风险与对策：\n\n")
	b.WriteString("## 里程碑计划\n- M1（设计冻结）：\n- M2（开发完成）：\n- M3（测试通过）：\n- M4（发布上线）：\n\n")
	b.WriteString("## 成功指标\n- 指标与口径：\n")
	return b.String()
}

// renderTaskMainDocTemplate returns markdown content for task main document
func (h *TaskHandler) renderTaskMainDocTemplate(task *models.Task, projectName string) string {
	b := &strings.Builder{}
	fmt.Fprintf(b, "# 任务文档 - %s\n\n", task.Title)
	fmt.Fprintf(b, "- 任务ID: %d\n- 项目: %s (#%d)\n", task.ID, projectName, task.ProjectID)
	b.WriteString("- 环境要求：\n  - 开发：Docker PostgreSQL\n  - 生产：PostgreSQL\n  - CI：Jenkins（Docker-based Agent）\n\n")
	b.WriteString("## 概览\n- 背景与目标（链接任务描述）：\n- 架构/流程图（占位）：\n\n")
	b.WriteString("## 需求说明\n- 用户故事/用例：\n- 约束与合规：\n\n")
	b.WriteString("## 技术方案\n- 系统架构：\n- 数据模型（ER/DDL摘要）：\n- 接口设计（REST/gRPC/GraphQL）：\n- 配置 & Feature Flags：\n\n")
	b.WriteString("## 安全与合规\n- 身份与权限：\n- 数据安全（加密/脱敏）：\n- 审计与留痕：\n\n")
	b.WriteString("## 测试计划\n- 单元/集成/端到端：\n- 回归清单与准入准出标准：\n\n")
	b.WriteString("## 发布与运维\n- 部署流程：\n- 监控与告警（SLO/SLA）：\n- 回滚预案：\n\n")
	b.WriteString("## 风险评估\n- 风险清单与应对：\n")
	return b.String()
}

// runQualityCheck validates content structure and returns issues and pass flag
func (h *TaskHandler) runQualityCheck(content string, kind string) ([]string, bool) {
	issues := []string{}
	minAccept := 3
	minRisks := 1

	// Required sections by kind
	requiredSections := []string{}
	switch kind {
	case "task_description":
		requiredSections = []string{"## 背景与目标", "## 范围定义", "## 验收标准", "## 依赖与风险"}
	case "task_doc":
		requiredSections = []string{"## 技术方案", "## 测试计划", "## 发布与运维", "## 风险评估"}
	}
	for _, sec := range requiredSections {
		if !strings.Contains(content, sec) {
			issues = append(issues, fmt.Sprintf("缺少必要章节: %s", sec))
		}
	}
	// Count acceptance criteria
	if strings.Contains(content, "## 验收标准") {
		count := 0
		lines := strings.Split(content, "\n")
		inSec := false
		for _, ln := range lines {
			if strings.HasPrefix(strings.TrimSpace(ln), "## ") {
				inSec = strings.HasPrefix(strings.TrimSpace(ln), "## 验收标准")
				continue
			}
			if inSec {
				trim := strings.TrimSpace(ln)
				if strings.HasPrefix(trim, "- ") || strings.HasPrefix(trim, "- [ ]") || strings.HasPrefix(trim, "- [x]") {
					count++
				}
			}
		}
		if count < minAccept {
			issues = append(issues, fmt.Sprintf("验收标准条目过少: 期望≥%d, 实际=%d", minAccept, count))
		}
	}
	// Count risks entries
	if strings.Contains(content, "## 风险评估") || strings.Contains(content, "## 依赖与风险") {
		count := 0
		lines := strings.Split(content, "\n")
		inSec := false
		for _, ln := range lines {
			if strings.HasPrefix(strings.TrimSpace(ln), "## ") {
				inSec = strings.HasPrefix(strings.TrimSpace(ln), "## 风险评估") || strings.HasPrefix(strings.TrimSpace(ln), "## 依赖与风险")
				continue
			}
			if inSec {
				trim := strings.TrimSpace(ln)
				if strings.HasPrefix(trim, "- ") || strings.HasPrefix(trim, "- [ ]") || strings.HasPrefix(trim, "- [x]") {
					count++
				}
			}
		}
		if count < minRisks {
			issues = append(issues, fmt.Sprintf("风险清单条目过少: 期望≥%d, 实际=%d", minRisks, count))
		}
	}

	passed := len(issues) == 0
	return issues, passed
}

// Helper functions for handling nullable values in task creation/update

func getIntValue(ptr *int) int {
	if ptr != nil {
		return *ptr
	}
	return 0
}

func getStringValue(ptr *string, defaultValue string) string {
	if ptr != nil && *ptr != "" {
		return *ptr
	}
	return defaultValue
}

func getFloat64Value(ptr *float64, defaultValue float64) float64 {
	if ptr != nil {
		return *ptr
	}
	return defaultValue
}

// MoveTask handles moving a task to a different project or parent
// @Summary Move task to different project or parent

// 独立任务处理方法（跨项目）

// CreateGlobalTask handles POST /api/v1/tasks
func (h *TaskHandler) CreateGlobalTask(c *gin.Context) {
	var req struct {
		ProjectID      int        `json:"project_id" binding:"required"`
		Title          string     `json:"title" binding:"required,min=1,max=255"`
		Description    *string    `json:"description"`
		Status         string     `json:"status"`
		Priority       string     `json:"priority"`
		AssigneeID     *int       `json:"assignee_id"`
		ParentID       *int       `json:"parent_id"`
		DueDate        *time.Time `json:"due_date"`
		EstimatedHours *float64   `json:"estimated_hours"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse("INVALID_REQUEST", "Invalid request payload", err.Error()))
		return
	}

	task := &models.Task{
		ProjectID:          req.ProjectID,
		Title:              req.Title,
		Description:        req.Description,
		Status:             getStringValue(&req.Status, "todo"),
		Priority:           getStringValue(&req.Priority, "medium"),
		AssigneeID:         req.AssigneeID,
		ParentID:           req.ParentID,
		DueDate:            req.DueDate,
		EstimatedHours:     req.EstimatedHours,
		TimeTrackingMode:   "manual", // 设置默认时间追踪模式
		TimeUnitPreference: "auto",   // 设置默认时间单位偏好
		WorkHoursPerDay:    8.0,      // 设置默认每日工作时长
	}

	createdTask, err := h.db.Tasks().Create(c.Request.Context(), task)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse("CREATE_FAILED", "Failed to create task", err.Error()))
		return
	}

	c.JSON(http.StatusCreated, models.NewSuccessResponse(createdTask, "任务创建成功"))
}

// GetTaskById handles GET /api/v1/tasks/:id
func (h *TaskHandler) GetTaskById(c *gin.Context) {
	taskID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse("INVALID_ID", "Invalid task ID", ""))
		return
	}

	task, err := h.db.Tasks().GetByID(c.Request.Context(), taskID)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, models.NewErrorResponse("TASK_NOT_FOUND", "Task not found", ""))
		} else {
			c.JSON(http.StatusInternalServerError, models.NewErrorResponse("DB_ERROR", "Database error", err.Error()))
		}
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(task, "获取任务成功"))
}

// GetTaskByUUID godoc
// @Summary		Get task by UUID
// @Description	Get a task by its globally unique UUID for cross-database sync
// @Tags			Tasks
// @Accept			json
// @Produce		json
// @Security		BearerAuth
// @Param			uuid	path		string	true	"Task UUID"
// @Success		200		{object}	models.SuccessResponse	"Task retrieved successfully"
// @Failure		400		{object}	models.ErrorResponse	"Invalid UUID"
// @Failure		404		{object}	models.ErrorResponse	"Task not found"
// @Failure		500		{object}	models.ErrorResponse	"Internal server error"
// @Router			/tasks/uuid/{uuid} [get]
func (h *TaskHandler) GetTaskByUUID(c *gin.Context) {
	uuidParam := c.Param("uuid")
	if uuidParam == "" {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse("INVALID_UUID", "UUID is required", ""))
		return
	}

	task, err := h.db.Tasks().GetByUUID(c.Request.Context(), uuidParam)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			c.JSON(http.StatusNotFound, models.NewErrorResponse("TASK_NOT_FOUND", "Task not found", ""))
		} else {
			c.JSON(http.StatusInternalServerError, models.NewErrorResponse("DB_ERROR", "Database error", err.Error()))
		}
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(task, "获取任务成功"))
}

// UpdateTaskById handles PUT /api/v1/tasks/:id
func (h *TaskHandler) UpdateTaskById(c *gin.Context) {
	taskID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse("INVALID_ID", "Invalid task ID", ""))
		return
	}

	var req models.TaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse("INVALID_REQUEST", "Invalid request payload", err.Error()))
		return
	}

	// 首先获取现有任务
	existingTask, err := h.db.Tasks().GetByID(c.Request.Context(), taskID)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, models.NewErrorResponse("TASK_NOT_FOUND", "Task not found", ""))
		} else {
			c.JSON(http.StatusInternalServerError, models.NewErrorResponse("DB_ERROR", "Database error", err.Error()))
		}
		return
	}

	// Validate task is not archived (unless we're un-archiving it)
	if req.Status != "todo" && req.Status != "in_progress" && req.Status != "completed" {
		if errResp := h.validateTaskNotArchived(existingTask, "修改"); errResp != nil {
			c.JSON(http.StatusConflict, errResp)
			return
		}
	}

	// 更新字段
	existingTask.Title = req.Title
	existingTask.Description = req.Description
	existingTask.Status = req.Status
	existingTask.Priority = req.Priority
	existingTask.AssigneeID = req.AssigneeID
	existingTask.ParentID = req.ParentID
	existingTask.DueDate = req.DueDate
	existingTask.EstimatedHours = req.EstimatedHours

	updatedTask, err := h.db.Tasks().Update(c.Request.Context(), existingTask)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse("UPDATE_FAILED", "Failed to update task", err.Error()))
		return
	}

	// 智能缓存失效：任务更新后自动清理相关AI缓存
	if h.aiCacheService != nil {
		go func() {
			ctx := context.Background()
			if err := h.aiCacheService.InvalidateAllTaskCache(ctx, updatedTask.ID); err != nil {
				log.Printf("[CACHE_INVALIDATION] Failed to invalidate cache for task %d: %v", updatedTask.ID, err)
			}
		}()
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(updatedTask, "任务更新成功"))
}

// DeleteTaskById handles DELETE /api/v1/tasks/:id
func (h *TaskHandler) DeleteTaskById(c *gin.Context) {
	taskID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse("INVALID_ID", "Invalid task ID", ""))
		return
	}

	// Get existing task to check if archived
	task, err := h.db.Tasks().GetByID(c.Request.Context(), taskID)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, models.NewErrorResponse("TASK_NOT_FOUND", "Task not found", ""))
		} else {
			c.JSON(http.StatusInternalServerError, models.NewErrorResponse("DB_ERROR", "Database error", err.Error()))
		}
		return
	}

	// Validate task is not archived
	if errResp := h.validateTaskNotArchived(task, "删除"); errResp != nil {
		c.JSON(http.StatusConflict, errResp)
		return
	}

	err = h.db.Tasks().Delete(c.Request.Context(), taskID)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, models.NewErrorResponse("TASK_NOT_FOUND", "Task not found", ""))
		} else {
			c.JSON(http.StatusInternalServerError, models.NewErrorResponse("DELETE_FAILED", "Failed to delete task", err.Error()))
		}
		return
	}

	// 智能缓存失效：任务删除后自动清理相关AI缓存
	if h.aiCacheService != nil {
		go func() {
			ctx := context.Background()
			if err := h.aiCacheService.InvalidateAllTaskCache(ctx, taskID); err != nil {
				log.Printf("[CACHE_INVALIDATION] Failed to invalidate cache for deleted task %d: %v", taskID, err)
			}
		}()
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(nil, "任务删除成功"))
}

// UpdateTaskStatus handles PATCH /api/v1/tasks/:id/status
func (h *TaskHandler) UpdateTaskStatus(c *gin.Context) {
	taskID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse("INVALID_ID", "Invalid task ID", ""))
		return
	}

	var req struct {
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse("INVALID_REQUEST", "Invalid request payload", err.Error()))
		return
	}

	// 首先获取现有任务
	existingTask, err := h.db.Tasks().GetByID(c.Request.Context(), taskID)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, models.NewErrorResponse("TASK_NOT_FOUND", "Task not found", ""))
		} else {
			c.JSON(http.StatusInternalServerError, models.NewErrorResponse("DB_ERROR", "Database error", err.Error()))
		}
		return
	}

	// 更新状态
	existingTask.Status = req.Status
	updatedTask, err := h.db.Tasks().Update(c.Request.Context(), existingTask)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse("UPDATE_FAILED", "Failed to update task status", err.Error()))
		return
	}

	// 智能缓存失效：任务状态更新后自动清理相关AI缓存
	if h.aiCacheService != nil {
		go func() {
			ctx := context.Background()
			if err := h.aiCacheService.InvalidateAllTaskCache(ctx, updatedTask.ID); err != nil {
				log.Printf("[CACHE_INVALIDATION] Failed to invalidate cache for task %d: %v", updatedTask.ID, err)
			}
		}()
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(updatedTask, "任务状态更新成功"))
}

// CompleteTask handles POST /api/v1/tasks/:id/complete
func (h *TaskHandler) CompleteTask(c *gin.Context) {
	taskID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse("BAD_REQUEST", "Invalid task ID", ""))
		return
	}

	// 首先获取现有任务
	existingTask, err := h.db.Tasks().GetByID(c.Request.Context(), taskID)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, models.NewErrorResponse("TASK_NOT_FOUND", "Task not found", ""))
		} else {
			c.JSON(http.StatusInternalServerError, models.NewErrorResponse("DB_ERROR", "Database error", err.Error()))
		}
		return
	}

	// 更新状态为completed
	existingTask.Status = "completed"
	updatedTask, err := h.db.Tasks().Update(c.Request.Context(), existingTask)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse("UPDATE_FAILED", "Failed to complete task", err.Error()))
		return
	}

	// 智能缓存失效：任务状态更新后自动清理相关AI缓存
	if h.aiCacheService != nil {
		go func() {
			ctx := context.Background()
			if err := h.aiCacheService.InvalidateAllTaskCache(ctx, updatedTask.ID); err != nil {
				log.Printf("[CACHE_INVALIDATION] Failed to invalidate cache for task %d: %v", updatedTask.ID, err)
			}
		}()
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(updatedTask, "任务完成成功"))
}

// MoveTaskById handles POST /api/v1/tasks/:id/move
func (h *TaskHandler) MoveTaskById(c *gin.Context) {
	taskID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse("INVALID_ID", "Invalid task ID", ""))
		return
	}

	var req struct {
		ProjectID *int `json:"project_id"`
		ParentID  *int `json:"parent_id"`
		Position  *int `json:"position"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse("INVALID_REQUEST", "Invalid request payload", err.Error()))
		return
	}

	// 首先获取现有任务
	existingTask, err := h.db.Tasks().GetByID(c.Request.Context(), taskID)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, models.NewErrorResponse("TASK_NOT_FOUND", "Task not found", ""))
		} else {
			c.JSON(http.StatusInternalServerError, models.NewErrorResponse("DB_ERROR", "Database error", err.Error()))
		}
		return
	}

	// Validate task is not archived
	if errResp := h.validateTaskNotArchived(existingTask, "移动"); errResp != nil {
		c.JSON(http.StatusConflict, errResp)
		return
	}

	// 更新字段
	if req.ProjectID != nil {
		existingTask.ProjectID = *req.ProjectID
	}
	if req.ParentID != nil {
		existingTask.ParentID = req.ParentID
	}
	if req.Position != nil {
		existingTask.SortOrder = *req.Position
	}

	updatedTask, err := h.db.Tasks().Update(c.Request.Context(), existingTask)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse("MOVE_FAILED", "Failed to move task", err.Error()))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(updatedTask, "任务移动成功"))
}

// ReorderTaskById handles POST /api/v1/tasks/:id/reorder
func (h *TaskHandler) ReorderTaskById(c *gin.Context) {
	taskID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse("INVALID_ID", "Invalid task ID", ""))
		return
	}

	var req struct {
		Position int `json:"position" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse("INVALID_REQUEST", "Invalid request payload", err.Error()))
		return
	}

	// 首先获取现有任务
	existingTask, err := h.db.Tasks().GetByID(c.Request.Context(), taskID)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, models.NewErrorResponse("TASK_NOT_FOUND", "Task not found", ""))
		} else {
			c.JSON(http.StatusInternalServerError, models.NewErrorResponse("DB_ERROR", "Database error", err.Error()))
		}
		return
	}

	// Validate task is not archived
	if errResp := h.validateTaskNotArchived(existingTask, "重新排序"); errResp != nil {
		c.JSON(http.StatusConflict, errResp)
		return
	}

	// 更新位置
	existingTask.SortOrder = req.Position
	updatedTask, err := h.db.Tasks().Update(c.Request.Context(), existingTask)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse("REORDER_FAILED", "Failed to reorder task", err.Error()))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(updatedTask, "任务重排序成功"))
}

// parseDateTimeFlexible parses datetime strings in multiple formats
func parseDateTimeFlexible(dateStr string) (time.Time, error) {
	// Try multiple datetime formats
	formats := []string{
		"2006-01-02T15:04:05Z",     // ISO 8601 UTC
		"2006-01-02T15:04:05Z07:00", // ISO 8601 with timezone
		"2006-01-02 15:04:05",      // Date time
		"2006-01-02",               // Date only
		time.RFC3339,               // RFC3339
	}
	
	for _, format := range formats {
		if parsed, err := time.Parse(format, dateStr); err == nil {
			return parsed, nil
		}
	}
	
	return time.Time{}, fmt.Errorf("unable to parse date time: %s", dateStr)
}

// getUserCompanyID 获取用户关联的企业ID
// getUserEnterpriseID 获取用户的企业ID（支持新旧体系）
// 优先使用enterprise体系（user_type='enterprise'），向后兼容company体系（user_type='company'）
func (h *TaskHandler) getUserEnterpriseID(userID uint, role string) (uint, error) {
	// ✅ 新体系：enterprise_admin 和 enterprise_user（优先使用）
	if role == "enterprise_admin" || role == "enterprise_user" {
		// 从enterprise_users表获取enterprise_id
		postgresDB, ok := h.db.(*database.PostgresDB)
		if !ok {
			log.Printf("[getUserEnterpriseID] Failed to cast db to PostgresDB")
			return 0, fmt.Errorf("database type assertion failed")
		}

		exec, ok := postgresDB.GetDB().(*sql.DB)
		if !ok {
			log.Printf("[getUserEnterpriseID] Failed to cast GetDB to *sql.DB")
			return 0, fmt.Errorf("database connection type assertion failed")
		}

		var enterpriseID int
		err := exec.QueryRow("SELECT enterprise_id FROM enterprise_users WHERE user_id = $1 AND deleted_at IS NULL", userID).Scan(&enterpriseID)
		if err != nil {
			if err == sql.ErrNoRows {
				log.Printf("[getUserEnterpriseID] User %d with role %s not found in enterprise_users table", userID, role)
				return 0, nil
			}
			log.Printf("[getUserEnterpriseID] Error querying enterprise_users for user %d: %v", userID, err)
			return 0, fmt.Errorf("failed to get enterprise_id for user %d: %w", userID, err)
		}
		log.Printf("[getUserEnterpriseID] User %d (role=%s) -> enterprise_id=%d", userID, role, enterpriseID)
		return uint(enterpriseID), nil
	}

	// ⚠️ 向后兼容：支持旧的company体系（将来移除）
	if role == "company_admin" {
		// 从users表直接获取enterprise_id
		user, err := h.db.Users().GetByID(context.Background(), int(userID))
		if err != nil {
			log.Printf("[getUserEnterpriseID] Error getting user %d: %v", userID, err)
			return 0, err
		}
		// v1.5: Use GetEnterpriseID() for backward compatibility
		if enterpriseID := user.GetEnterpriseID(); enterpriseID != nil {
			log.Printf("[getUserEnterpriseID] User %d (role=%s) using enterprise_id=%d", userID, role, *enterpriseID)
			return uint(*enterpriseID), nil
		}
	}

	if role == "company_user" {
		// 从company_users表获取customer_id
		postgresDB, ok := h.db.(*database.PostgresDB)
		if !ok {
			log.Printf("[getUserEnterpriseID] Failed to cast db to PostgresDB")
			return 0, fmt.Errorf("database type assertion failed")
		}

		exec, ok := postgresDB.GetDB().(*sql.DB)
		if !ok {
			log.Printf("[getUserEnterpriseID] Failed to cast GetDB to *sql.DB")
			return 0, fmt.Errorf("database connection type assertion failed")
		}

		var customerID int
		err := exec.QueryRow("SELECT customer_id FROM company_users WHERE user_id = $1", userID).Scan(&customerID)
		if err != nil {
			if err == sql.ErrNoRows {
				log.Printf("[getUserEnterpriseID] No company_users record for user %d", userID)
				return 0, nil
			}
			log.Printf("[getUserEnterpriseID] Error querying company_users for user %d: %v", userID, err)
			return 0, err
		}
		log.Printf("[getUserEnterpriseID] User %d (role=%s) using legacy customer_id=%d", userID, role, customerID)
		return uint(customerID), nil
	}

	return 0, nil
}

// getUserCompanyID DEPRECATED: 使用getUserEnterpriseID替代
// 保留此方法用于向后兼容，将在下一个版本移除
func (h *TaskHandler) getUserCompanyID(userID uint, role string) (uint, error) {
	log.Printf("[DEPRECATED] getUserCompanyID called, please use getUserEnterpriseID instead")
	return h.getUserEnterpriseID(userID, role)
}

// validateTaskNotArchived checks if a task is archived and returns appropriate error response
func (h *TaskHandler) validateTaskNotArchived(task *models.Task, operation string) *models.ErrorResponse {
	if task.Status == "archived" {
		message := fmt.Sprintf("无法%s已归档的任务", operation)
		return models.NewErrorResponse(models.ErrCodeConflict, message, map[string]interface{}{
			"task_id": task.ID,
			"status":  task.Status,
			"operation": operation,
		})
	}
	return nil
}

// ArchiveTask handles POST /api/v1/tasks/:id/archive
func (h *TaskHandler) ArchiveTask(c *gin.Context) {
	taskID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeBadRequest, "无效的任务ID", nil))
		return
	}

	// Get existing task
	task, err := h.db.Tasks().GetByID(c.Request.Context(), taskID)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, models.NewErrorResponse(models.ErrCodeNotFound, "任务不存在", nil))
		} else {
			log.Printf("Error getting task: %v", err)
			c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "获取任务失败", nil))
		}
		return
	}

	// Check if already archived
	if task.Status == "archived" {
		c.JSON(http.StatusConflict, models.NewErrorResponse(models.ErrCodeConflict, "任务已经是归档状态", map[string]interface{}{
			"task_id": task.ID,
			"current_status": task.Status,
		}))
		return
	}

	// Update task status to archived
	task.Status = "archived"
	updatedTask, err := h.db.Tasks().Update(c.Request.Context(), task)
	if err != nil {
		log.Printf("Error archiving task: %v", err)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "归档任务失败", nil))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(updatedTask.ToResponse(), "任务归档成功"))
}

// UnarchiveTask handles POST /api/v1/tasks/:id/unarchive
func (h *TaskHandler) UnarchiveTask(c *gin.Context) {
	taskID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeBadRequest, "无效的任务ID", nil))
		return
	}

	// Parse request body for target status
	var req struct {
		Status string `json:"status" validate:"required,oneof=todo in_progress completed"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		// Default to "todo" if no status provided
		req.Status = "todo"
	}

	// Validate target status
	if req.Status != "todo" && req.Status != "in_progress" && req.Status != "completed" {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeBadRequest, "无效的目标状态，只能恢复为todo、in_progress或completed", nil))
		return
	}

	// Get existing task
	task, err := h.db.Tasks().GetByID(c.Request.Context(), taskID)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, models.NewErrorResponse(models.ErrCodeNotFound, "任务不存在", nil))
		} else {
			log.Printf("Error getting task: %v", err)
			c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "获取任务失败", nil))
		}
		return
	}

	// Check if task is archived
	if task.Status != "archived" {
		c.JSON(http.StatusConflict, models.NewErrorResponse(models.ErrCodeConflict, "只能对归档状态的任务执行取消归档操作", map[string]interface{}{
			"task_id": task.ID,
			"current_status": task.Status,
		}))
		return
	}

	// Update task status to target status
	task.Status = req.Status
	updatedTask, err := h.db.Tasks().Update(c.Request.Context(), task)
	if err != nil {
		log.Printf("Error unarchiving task: %v", err)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "取消归档任务失败", nil))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(updatedTask.ToResponse(), fmt.Sprintf("任务已从归档状态恢复为%s", req.Status)))
}

// BulkArchiveTasks handles POST /api/v1/tasks/bulk/archive
func (h *TaskHandler) BulkArchiveTasks(c *gin.Context) {
	var req struct {
		TaskIDs []int `json:"task_ids" validate:"required,min=1,max=100"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeBadRequest, "请求数据格式错误", err.Error()))
		return
	}

	if len(req.TaskIDs) == 0 {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeBadRequest, "任务ID列表不能为空", nil))
		return
	}

	if len(req.TaskIDs) > 100 {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeBadRequest, "批量操作最多支持100个任务", nil))
		return
	}

	var successful []int
	var failed []map[string]interface{}
	var skipped []map[string]interface{}

	for _, taskID := range req.TaskIDs {
		// Get existing task
		task, err := h.db.Tasks().GetByID(c.Request.Context(), taskID)
		if err != nil {
			if err == sql.ErrNoRows {
				failed = append(failed, map[string]interface{}{
					"task_id": taskID,
					"reason":  "任务不存在",
					"code":    models.ErrCodeNotFound,
				})
			} else {
				log.Printf("Error getting task %d: %v", taskID, err)
				failed = append(failed, map[string]interface{}{
					"task_id": taskID,
					"reason":  "获取任务失败",
					"code":    models.ErrCodeInternal,
				})
			}
			continue
		}

		// Check if already archived
		if task.Status == "archived" {
			skipped = append(skipped, map[string]interface{}{
				"task_id":        taskID,
				"reason":         "任务已经是归档状态",
				"current_status": task.Status,
			})
			continue
		}

		// Update task status to archived
		task.Status = "archived"
		_, err = h.db.Tasks().Update(c.Request.Context(), task)
		if err != nil {
			log.Printf("Error archiving task %d: %v", taskID, err)
			failed = append(failed, map[string]interface{}{
				"task_id": taskID,
				"reason":  "归档任务失败",
				"code":    models.ErrCodeInternal,
			})
			continue
		}

		successful = append(successful, taskID)
	}

	responseData := map[string]interface{}{
		"total":           len(req.TaskIDs),
		"successful":      successful,
		"successful_count": len(successful),
		"failed":          failed,
		"failed_count":    len(failed),
		"skipped":         skipped,
		"skipped_count":   len(skipped),
	}

	// Determine HTTP status code
	statusCode := http.StatusOK
	message := "批量归档操作完成"

	if len(failed) > 0 && len(successful) == 0 {
		statusCode = http.StatusBadRequest
		message = "批量归档操作失败"
	} else if len(failed) > 0 {
		statusCode = http.StatusMultiStatus
		message = "批量归档操作部分成功"
	}

	c.JSON(statusCode, models.NewSuccessResponse(responseData, message))
}

// BulkUnarchiveTasks handles POST /api/v1/tasks/bulk/unarchive
func (h *TaskHandler) BulkUnarchiveTasks(c *gin.Context) {
	var req struct {
		TaskIDs []int  `json:"task_ids" validate:"required,min=1,max=100"`
		Status  string `json:"status" validate:"omitempty,oneof=todo in_progress completed"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeBadRequest, "请求数据格式错误", err.Error()))
		return
	}

	if len(req.TaskIDs) == 0 {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeBadRequest, "任务ID列表不能为空", nil))
		return
	}

	if len(req.TaskIDs) > 100 {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeBadRequest, "批量操作最多支持100个任务", nil))
		return
	}

	// Default to "todo" if no status provided
	targetStatus := req.Status
	if targetStatus == "" {
		targetStatus = "todo"
	}

	// Validate target status
	if targetStatus != "todo" && targetStatus != "in_progress" && targetStatus != "completed" {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeBadRequest, "无效的目标状态，只能恢复为todo、in_progress或completed", nil))
		return
	}

	var successful []map[string]interface{}
	var failed []map[string]interface{}
	var skipped []map[string]interface{}

	for _, taskID := range req.TaskIDs {
		// Get existing task
		task, err := h.db.Tasks().GetByID(c.Request.Context(), taskID)
		if err != nil {
			if err == sql.ErrNoRows {
				failed = append(failed, map[string]interface{}{
					"task_id": taskID,
					"reason":  "任务不存在",
					"code":    models.ErrCodeNotFound,
				})
			} else {
				log.Printf("Error getting task %d: %v", taskID, err)
				failed = append(failed, map[string]interface{}{
					"task_id": taskID,
					"reason":  "获取任务失败",
					"code":    models.ErrCodeInternal,
				})
			}
			continue
		}

		// Check if task is archived
		if task.Status != "archived" {
			skipped = append(skipped, map[string]interface{}{
				"task_id":        taskID,
				"reason":         "只能对归档状态的任务执行取消归档操作",
				"current_status": task.Status,
			})
			continue
		}

		// Update task status to target status
		originalStatus := task.Status
		task.Status = targetStatus
		_, err = h.db.Tasks().Update(c.Request.Context(), task)
		if err != nil {
			log.Printf("Error unarchiving task %d: %v", taskID, err)
			failed = append(failed, map[string]interface{}{
				"task_id": taskID,
				"reason":  "取消归档任务失败",
				"code":    models.ErrCodeInternal,
			})
			continue
		}

		successful = append(successful, map[string]interface{}{
			"task_id":         taskID,
			"original_status": originalStatus,
			"new_status":      targetStatus,
		})
	}

	responseData := map[string]interface{}{
		"total":            len(req.TaskIDs),
		"target_status":    targetStatus,
		"successful":       successful,
		"successful_count": len(successful),
		"failed":           failed,
		"failed_count":     len(failed),
		"skipped":          skipped,
		"skipped_count":    len(skipped),
	}

	// Determine HTTP status code
	statusCode := http.StatusOK
	message := fmt.Sprintf("批量取消归档操作完成，恢复为%s状态", targetStatus)

	if len(failed) > 0 && len(successful) == 0 {
		statusCode = http.StatusBadRequest
		message = "批量取消归档操作失败"
	} else if len(failed) > 0 {
		statusCode = http.StatusMultiStatus
		message = fmt.Sprintf("批量取消归档操作部分成功，恢复为%s状态", targetStatus)
	}

	c.JSON(statusCode, models.NewSuccessResponse(responseData, message))
}

// CheckTaskTitleUnique godoc
// @Summary		Check if task title is unique
// @Description	Check if a task title is unique within a project (for real-time validation)
// @Tags			Tasks
// @Accept			json
// @Produce		json
// @Security		BearerAuth
// @Param			id			path		int		true	"Project ID"
// @Param			title		query		string	true	"Task title to check"
// @Param			exclude_id	query		int		false	"Task ID to exclude from check (for edit mode)"
// @Success		200			{object}	models.APIResponse	"Title uniqueness check result"
// @Failure		400			{object}	models.ErrorResponse	"Bad request"
// @Failure		401			{object}	models.ErrorResponse	"Unauthorized"
// @Failure		500			{object}	models.ErrorResponse	"Internal server error"
// @Router			/projects/{id}/tasks/check-title [get]
func (h *TaskHandler) CheckTaskTitleUnique(c *gin.Context) {
	// Parse project ID
	projectID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			models.ErrCodeValidation,
			"无效的项目ID",
			nil,
		))
		return
	}

	// Get title from query parameter
	title := c.Query("title")
	if title == "" {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			models.ErrCodeValidation,
			"请提供任务标题",
			nil,
		))
		return
	}

	// Get optional exclude_id (for edit mode)
	excludeID := 0
	if excludeIDStr := c.Query("exclude_id"); excludeIDStr != "" {
		excludeID, err = strconv.Atoi(excludeIDStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, models.NewErrorResponse(
				models.ErrCodeValidation,
				"无效的exclude_id参数",
				nil,
			))
			return
		}
	}

	// Check title uniqueness
	ctx := c.Request.Context()
	isUnique, conflictTaskID, err := h.db.Tasks().CheckTitleUnique(ctx, projectID, title, excludeID)
	if err != nil {
		log.Printf("[CheckTaskTitleUnique] Error checking title uniqueness: %v", err)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			models.ErrCodeInternal,
			"检查标题唯一性失败",
			nil,
		))
		return
	}

	responseData := map[string]interface{}{
		"is_unique": isUnique,
		"title":     title,
	}

	message := "标题可用"
	if !isUnique && conflictTaskID != nil {
		responseData["conflict_task_id"] = *conflictTaskID
		message = fmt.Sprintf("标题 \"%s\" 已被任务 #%d 使用", title, *conflictTaskID)
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(responseData, message))
}
