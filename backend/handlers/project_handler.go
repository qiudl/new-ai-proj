package handlers

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// ProjectHandler handles all project-related operations
type ProjectHandler struct {
	db database.DB
}

// NewProjectHandler creates a new project handler
func NewProjectHandler(db database.DB, logger *log.Logger, validate interface{}) *ProjectHandler {
	return &ProjectHandler{db: db}
}

// GetProjects handles GET /api/v1/projects
func (h *ProjectHandler) GetProjects(c *gin.Context) {
	userID := c.GetInt("user_id")
	
	// Parse pagination parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))
	search := c.Query("search")
	status := c.Query("status")
	sortBy := c.DefaultQuery("sort_by", "updated_at")
	sortOrder := c.DefaultQuery("sort_order", "desc")

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 10
	}

	offset := (page - 1) * pageSize

	projects, total, err := h.db.Projects().GetPaginated(c.Request.Context(), userID, offset, pageSize, search, status, sortBy, sortOrder)
	if err != nil {
		log.Printf("Error getting projects: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse("获取项目列表失败"))
		return
	}

	totalPages := (total + pageSize - 1) / pageSize

	responseData := map[string]interface{}{
		"data": projects,
		"pagination": map[string]interface{}{
			"page":        page,
			"page_size":   pageSize,
			"total":       total,
			"total_pages": totalPages,
		},
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(responseData, "获取项目列表成功"))
}

// CreateProject handles POST /api/v1/projects
func (h *ProjectHandler) CreateProject(c *gin.Context) {
	userID := c.GetInt("user_id")

	var req struct {
		Name        string                 `json:"name" binding:"required,min=1,max=255"`
		Description string                 `json:"description"`
		Icon        *string                `json:"icon"`
		Color       *string                `json:"color"`
		Status      string                 `json:"status"`
		Priority    string                 `json:"priority"`
		Tags        []string               `json:"tags"`
		Metadata    map[string]interface{} `json:"metadata"`
		StartDate   *string                `json:"start_date"`
		EndDate     *string                `json:"end_date"`
		Budget      *float64               `json:"budget"`
		Currency    string                 `json:"currency"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse("请求数据格式错误"))
		return
	}

	// Parse dates
	var startDate, endDate *time.Time
	if req.StartDate != nil && *req.StartDate != "" {
		if parsed, err := time.Parse("2006-01-02", *req.StartDate); err == nil {
			startDate = &parsed
		}
	}
	if req.EndDate != nil && *req.EndDate != "" {
		if parsed, err := time.Parse("2006-01-02", *req.EndDate); err == nil {
			endDate = &parsed
		}
	}

	// Convert tags to JSON
	var tagsJSON []byte
	if len(req.Tags) > 0 {
		tagsJSON, _ = json.Marshal(req.Tags)
	}

	// Convert metadata to JSON
	var metadataJSON []byte
	if req.Metadata != nil {
		metadataJSON, _ = json.Marshal(req.Metadata)
	}

	project := &models.Project{
		Name:        req.Name,
		Description: req.Description,
		Icon:        req.Icon,
		Color:       req.Color,
		Status:      models.ProjectStatus(req.Status),
		Priority:    models.ProjectPriority(req.Priority),
		CreatedBy:   userID,
		StartDate:   startDate,
		EndDate:     endDate,
		Budget:      req.Budget,
		Currency:    req.Currency,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	if len(tagsJSON) > 0 {
		project.Tags = tagsJSON
	}
	if len(metadataJSON) > 0 {
		project.Metadata = metadataJSON
	}

	createdProject, err := h.db.Projects().Create(c.Request.Context(), project)
	if err != nil {
		log.Printf("Error creating project: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse("创建项目失败"))
		return
	}

	c.JSON(http.StatusCreated, models.NewSuccessResponse(createdProject.ToResponse(), "项目创建成功"))
}

// GetProject handles GET /api/v1/projects/:id
func (h *ProjectHandler) GetProject(c *gin.Context) {
	projectID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse("无效的项目ID"))
		return
	}

	project, err := h.db.Projects().GetByID(c.Request.Context(), projectID)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, models.ErrorResponse("项目不存在"))
		} else {
			log.Printf("Error getting project: %v", err)
			c.JSON(http.StatusInternalServerError, models.ErrorResponse("获取项目失败"))
		}
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(project.ToResponse(), "获取项目成功"))
}

// UpdateProject handles PUT /api/v1/projects/:id
func (h *ProjectHandler) UpdateProject(c *gin.Context) {
	projectID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse("无效的项目ID"))
		return
	}

	var req struct {
		Name        string                 `json:"name" binding:"required,min=1,max=255"`
		Description string                 `json:"description"`
		Icon        *string                `json:"icon"`
		Color       *string                `json:"color"`
		Status      string                 `json:"status"`
		Priority    string                 `json:"priority"`
		Tags        []string               `json:"tags"`
		Metadata    map[string]interface{} `json:"metadata"`
		StartDate   *string                `json:"start_date"`
		EndDate     *string                `json:"end_date"`
		Budget      *float64               `json:"budget"`
		Currency    string                 `json:"currency"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse("请求数据格式错误"))
		return
	}

	// Get existing project
	project, err := h.db.Projects().GetByID(c.Request.Context(), projectID)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, models.ErrorResponse("项目不存在"))
		} else {
			log.Printf("Error getting project: %v", err)
			c.JSON(http.StatusInternalServerError, models.ErrorResponse("获取项目失败"))
		}
		return
	}

	// Update fields
	project.Name = req.Name
	project.Description = req.Description
	project.Icon = req.Icon
	project.Color = req.Color
	project.Status = models.ProjectStatus(req.Status)
	project.Priority = models.ProjectPriority(req.Priority)
	project.Currency = req.Currency
	project.Budget = req.Budget
	project.UpdatedAt = time.Now()

	// Parse dates
	if req.StartDate != nil && *req.StartDate != "" {
		if parsed, err := time.Parse("2006-01-02", *req.StartDate); err == nil {
			project.StartDate = &parsed
		}
	}
	if req.EndDate != nil && *req.EndDate != "" {
		if parsed, err := time.Parse("2006-01-02", *req.EndDate); err == nil {
			project.EndDate = &parsed
		}
	}

	// Convert tags to JSON
	if len(req.Tags) > 0 {
		if tagsJSON, err := json.Marshal(req.Tags); err == nil {
			project.Tags = tagsJSON
		}
	}

	// Convert metadata to JSON
	if req.Metadata != nil {
		if metadataJSON, err := json.Marshal(req.Metadata); err == nil {
			project.Metadata = metadataJSON
		}
	}

	updatedProject, err := h.db.Projects().Update(c.Request.Context(), project)
	if err != nil {
		log.Printf("Error updating project: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse("更新项目失败"))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(updatedProject.ToResponse(), "项目更新成功"))
}

// DeleteProject handles DELETE /api/v1/projects/:id
func (h *ProjectHandler) DeleteProject(c *gin.Context) {
	projectID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse("无效的项目ID"))
		return
	}

	err = h.db.Projects().Delete(c.Request.Context(), projectID)
	if err != nil {
		log.Printf("Error deleting project: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse("删除项目失败"))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(nil, "项目删除成功"))
}

// GetProjectUsers handles GET /api/v1/projects/:id/users
func (h *ProjectHandler) GetProjectUsers(c *gin.Context) {
	projectID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse("无效的项目ID"))
		return
	}

	users, err := h.db.Projects().GetUsers(c.Request.Context(), projectID)
	if err != nil {
		log.Printf("Error getting project users: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse("获取项目成员失败"))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(users, "获取项目成员成功"))
}

// AddProjectUser handles POST /api/v1/projects/:id/users
func (h *ProjectHandler) AddProjectUser(c *gin.Context) {
	projectID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse("无效的项目ID"))
		return
	}

	var req struct {
		UserID int    `json:"user_id" binding:"required"`
		Role   string `json:"role" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse("请求数据格式错误"))
		return
	}

	err = h.db.Projects().AddUser(c.Request.Context(), projectID, req.UserID, req.Role)
	if err != nil {
		log.Printf("Error adding project user: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse("添加项目成员失败"))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(nil, "项目成员添加成功"))
}

// RemoveProjectUser handles DELETE /api/v1/projects/:id/users/:userId
func (h *ProjectHandler) RemoveProjectUser(c *gin.Context) {
	projectID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse("无效的项目ID"))
		return
	}

	userID, err := strconv.Atoi(c.Param("userId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse("无效的用户ID"))
		return
	}

	err = h.db.Projects().RemoveUser(c.Request.Context(), projectID, userID)
	if err != nil {
		log.Printf("Error removing project user: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse("移除项目成员失败"))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(nil, "项目成员移除成功"))
}

// GetProjectTimeline handles GET /api/v1/projects/:id/timeline  
func (h *ProjectHandler) GetProjectTimeline(c *gin.Context) {
	projectID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse("无效的项目ID"))
		return
	}

	// Parse query parameters
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	timeline, err := h.db.Projects().GetTimeline(c.Request.Context(), projectID, limit, offset)
	if err != nil {
		log.Printf("Error getting project timeline: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse("获取项目时间线失败"))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(timeline, "获取项目时间线成功"))
}

// GetProjectStats handles GET /api/v1/projects/:id/stats
func (h *ProjectHandler) GetProjectStats(c *gin.Context) {
	projectID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse("无效的项目ID"))
		return
	}

	stats, err := h.db.Projects().GetStats(c.Request.Context(), projectID)
	if err != nil {
		log.Printf("Error getting project stats: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse("获取项目统计失败"))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(stats, "获取项目统计成功"))
}