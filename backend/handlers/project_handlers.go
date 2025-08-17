package handlers

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

// ProjectHandler 项目处理器
type ProjectHandler struct {
	db        database.DB
	logger    *log.Logger
	validator *validator.Validate
}

// NewProjectHandler 创建项目处理器
func NewProjectHandler(db database.DB, logger *log.Logger, validator *validator.Validate) *ProjectHandler {
	return &ProjectHandler{
		db:        db,
		logger:    logger,
		validator: validator,
	}
}

// GetProjects 获取项目列表
func (h *ProjectHandler) GetProjects(c *gin.Context) {
	// Parse pagination parameters
	var pagination models.PaginationParams
	if err := c.ShouldBindQuery(&pagination); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid pagination parameters", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Default pagination values
	if pagination.Page <= 0 {
		pagination.Page = 1
	}
	if pagination.PageSize <= 0 {
		pagination.PageSize = 20
	}

	offset := (pagination.Page - 1) * pagination.PageSize

	// Get projects from database
	projectsWithCompany, total, err := h.db.Projects().ListWithCompanyInfo(c.Request.Context(), pagination.PageSize, offset)
	if err != nil {
		h.logger.Printf("Error getting projects with company info: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve projects", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// Convert to response format
	projectResponses := make([]models.ProjectResponse, len(projectsWithCompany))
	for i, projectWithCompany := range projectsWithCompany {
		projectResponses[i] = projectWithCompany.ToResponse()
	}

	// Create pagination metadata
	totalPages := int((int64(total) + int64(pagination.PageSize) - 1) / int64(pagination.PageSize))
	paginationMeta := models.Pagination{
		Page:       pagination.Page,
		PageSize:   pagination.PageSize,
		Total:      int64(total),
		TotalPages: totalPages,
		HasNext:    pagination.Page < totalPages,
		HasPrev:    pagination.Page > 1,
	}

	paginatedResponse := models.PaginatedResponse{
		Data:       projectResponses,
		Pagination: paginationMeta,
	}

	response := models.NewSuccessResponse(paginatedResponse, "Projects retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// CreateProject 创建项目
func (h *ProjectHandler) CreateProject(c *gin.Context) {
	var req models.ProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Validate required fields
	if req.Name == "" {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Project name is required", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Parse date strings to time.Time
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

	// Set default values
	status := req.Status
	if status == "" {
		status = "planning"
	}
	priority := req.Priority
	if priority == "" {
		priority = "medium"
	}

	// Create project model (for now, use owner_id = 1 as default)
	project := &models.Project{
		ProjectNumber: req.ProjectNumber,
		Name:          req.Name,
		Description:   req.Description,
		OwnerID:       1, // TODO: Get from authenticated user context
		CompanyID:     req.CompanyID,
		Status:        status,
		Priority:      priority,
		StartDate:     startDate,
		EndDate:       endDate,
		Budget:        req.Budget,
	}

	// Validate project
	if err := h.validator.Struct(project); err != nil {
		h.logger.Printf("Project validation failed: %v", err)
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Validation failed", err.Error())
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Insert into database
	createdProject, err := h.db.Projects().Create(c.Request.Context(), project)
	if err != nil {
		h.logger.Printf("Error creating project: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to create project", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(createdProject, "Project created successfully")
	c.JSON(http.StatusCreated, response)
}

// GetProject 获取单个项目
func (h *ProjectHandler) GetProject(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid project ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	project, err := h.db.Projects().GetByID(c.Request.Context(), id)
	if err != nil {
		if err.Error() == "project not found" {
			response := models.NewErrorResponse(models.ErrCodeNotFound, "Project not found", nil)
			c.JSON(http.StatusNotFound, response)
		} else {
			h.logger.Printf("Error getting project: %v", err)
			response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve project", nil)
			c.JSON(http.StatusInternalServerError, response)
		}
		return
	}

	response := models.NewSuccessResponse(project, "Project retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// UpdateProject 更新项目
func (h *ProjectHandler) UpdateProject(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid project ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	var req models.ProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Get existing project
	existing, err := h.db.Projects().GetByID(c.Request.Context(), id)
	if err != nil {
		if err.Error() == "project not found" {
			response := models.NewErrorResponse(models.ErrCodeNotFound, "Project not found", nil)
			c.JSON(http.StatusNotFound, response)
		} else {
			h.logger.Printf("Error getting project for update: %v", err)
			response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve project", nil)
			c.JSON(http.StatusInternalServerError, response)
		}
		return
	}

	// Update fields
	if req.Name != "" {
		existing.Name = req.Name
	}
	if req.Description != "" {
		existing.Description = req.Description
	}
	if req.Status != "" {
		existing.Status = req.Status
	}
	if req.Priority != "" {
		existing.Priority = req.Priority
	}
	if req.ProjectNumber != nil && *req.ProjectNumber != "" {
		existing.ProjectNumber = req.ProjectNumber
	}
	if req.CompanyID != nil && *req.CompanyID != 0 {
		existing.CompanyID = req.CompanyID
	}
	if req.Budget != nil {
		existing.Budget = req.Budget
	}

	// Parse and update dates
	if req.StartDate != nil && *req.StartDate != "" {
		if parsed, err := time.Parse("2006-01-02", *req.StartDate); err == nil {
			existing.StartDate = &parsed
		}
	}
	if req.EndDate != nil && *req.EndDate != "" {
		if parsed, err := time.Parse("2006-01-02", *req.EndDate); err == nil {
			existing.EndDate = &parsed
		}
	}

	// Validate updated project
	if err := h.validator.Struct(existing); err != nil {
		h.logger.Printf("Project validation failed: %v", err)
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Validation failed", err.Error())
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Update in database
	updatedProject, err := h.db.Projects().Update(c.Request.Context(), existing)
	if err != nil {
		h.logger.Printf("Error updating project: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to update project", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(updatedProject, "Project updated successfully")
	c.JSON(http.StatusOK, response)
}

// DeleteProject 删除项目
func (h *ProjectHandler) DeleteProject(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid project ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	err = h.db.Projects().Delete(c.Request.Context(), id)
	if err != nil {
		if err.Error() == "project not found" {
			response := models.NewErrorResponse(models.ErrCodeNotFound, "Project not found", nil)
			c.JSON(http.StatusNotFound, response)
		} else {
			h.logger.Printf("Error deleting project: %v", err)
			response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to delete project", nil)
			c.JSON(http.StatusInternalServerError, response)
		}
		return
	}

	response := models.NewSuccessResponse(nil, "Project deleted successfully")
	c.JSON(http.StatusOK, response)
}

// GetProjectStats 获取项目统计
func (h *ProjectHandler) GetProjectStats(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid project ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Get project first to ensure it exists
	project, err := h.db.Projects().GetByID(c.Request.Context(), id)
	if err != nil {
		if err.Error() == "project not found" {
			response := models.NewErrorResponse(models.ErrCodeNotFound, "Project not found", nil)
			c.JSON(http.StatusNotFound, response)
		} else {
			h.logger.Printf("Error getting project for stats: %v", err)
			response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve project", nil)
			c.JSON(http.StatusInternalServerError, response)
		}
		return
	}

	// Return basic stats (can be extended later)
	stats := gin.H{
		"project_id": project.ID,
		"name":       project.Name,
		"status":     project.Status,
		"progress":   project.Progress,
	}

	response := models.NewSuccessResponse(stats, "Project statistics retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// GetDocumentProjects 获取文档项目列表
func (h *ProjectHandler) GetDocumentProjects(c *gin.Context) {
	// Use the List method with a high limit to get all projects
	projects, _, err := h.db.Projects().List(c.Request.Context(), 1000, 0)
	if err != nil {
		h.logger.Printf("Error getting document projects: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve projects", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(projects, "Document projects retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// GetProjectTimeline 获取项目时间线
func (h *ProjectHandler) GetProjectTimeline(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid project ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Get project first to ensure it exists
	project, err := h.db.Projects().GetByID(c.Request.Context(), id)
	if err != nil {
		if err.Error() == "project not found" {
			response := models.NewErrorResponse(models.ErrCodeNotFound, "Project not found", nil)
			c.JSON(http.StatusNotFound, response)
		} else {
			h.logger.Printf("Error getting project for timeline: %v", err)
			response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve project", nil)
			c.JSON(http.StatusInternalServerError, response)
		}
		return
	}

	// Return basic timeline data (can be extended later)
	timelineData := gin.H{
		"project_id":   project.ID,
		"name":         project.Name,
		"start_date":   project.StartDate,
		"end_date":     project.EndDate,
		"created_at":   project.CreatedAt,
		"updated_at":   project.UpdatedAt,
		"status":       project.Status,
		"progress":     project.Progress,
	}

	response := models.NewSuccessResponse(timelineData, "Project timeline retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// GetProjectUsers 获取项目用户列表 (placeholder implementation)
func (h *ProjectHandler) GetProjectUsers(c *gin.Context) {
	idStr := c.Param("id")
	projectID, err := strconv.Atoi(idStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid project ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Verify project exists
	_, err = h.db.Projects().GetByID(c.Request.Context(), projectID)
	if err != nil {
		if err.Error() == "project not found" {
			response := models.NewErrorResponse(models.ErrCodeNotFound, "Project not found", nil)
			c.JSON(http.StatusNotFound, response)
		} else {
			h.logger.Printf("Error getting project: %v", err)
			response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve project", nil)
			c.JSON(http.StatusInternalServerError, response)
		}
		return
	}

	// Return empty list for now (project user management not implemented)
	users := []gin.H{}
	response := models.NewSuccessResponse(users, "Project users retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// AddProjectUser 添加项目用户 (placeholder implementation)
func (h *ProjectHandler) AddProjectUser(c *gin.Context) {
	idStr := c.Param("id")
	projectID, err := strconv.Atoi(idStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid project ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	var req struct {
		UserID int    `json:"user_id" binding:"required"`
		Role   string `json:"role"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Verify project exists
	_, err = h.db.Projects().GetByID(c.Request.Context(), projectID)
	if err != nil {
		if err.Error() == "project not found" {
			response := models.NewErrorResponse(models.ErrCodeNotFound, "Project not found", nil)
			c.JSON(http.StatusNotFound, response)
		} else {
			h.logger.Printf("Error getting project: %v", err)
			response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve project", nil)
			c.JSON(http.StatusInternalServerError, response)
		}
		return
	}

	// Project user management not implemented yet
	response := models.NewSuccessResponse(nil, "User added to project successfully (placeholder)")
	c.JSON(http.StatusOK, response)
}

// RemoveProjectUser 移除项目用户 (placeholder implementation)
func (h *ProjectHandler) RemoveProjectUser(c *gin.Context) {
	idStr := c.Param("id")
	projectID, err := strconv.Atoi(idStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid project ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	userIDStr := c.Param("user_id")
	_, err = strconv.Atoi(userIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid user ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Verify project exists
	_, err = h.db.Projects().GetByID(c.Request.Context(), projectID)
	if err != nil {
		if err.Error() == "project not found" {
			response := models.NewErrorResponse(models.ErrCodeNotFound, "Project not found", nil)
			c.JSON(http.StatusNotFound, response)
		} else {
			h.logger.Printf("Error getting project: %v", err)
			response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve project", nil)
			c.JSON(http.StatusInternalServerError, response)
		}
		return
	}

	// Project user management not implemented yet
	response := models.NewSuccessResponse(nil, "User removed from project successfully (placeholder)")
	c.JSON(http.StatusOK, response)
}

// GetRecycledProjects 获取回收站项目列表
func (h *ProjectHandler) GetRecycledProjects(c *gin.Context) {
	// Parse pagination parameters
	var pagination models.PaginationParams
	if err := c.ShouldBindQuery(&pagination); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid pagination parameters", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Default pagination values
	if pagination.Page <= 0 {
		pagination.Page = 1
	}
	if pagination.PageSize <= 0 {
		pagination.PageSize = 20
	}

	offset := (pagination.Page - 1) * pagination.PageSize

	recycledProjects, total, err := h.db.Projects().GetRecycledProjects(c.Request.Context(), pagination.PageSize, offset)
	if err != nil {
		h.logger.Printf("Error getting recycled projects: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve recycled projects", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(gin.H{
		"projects": recycledProjects,
		"total":    total,
	}, "Recycled projects retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// RestoreProject 恢复项目
func (h *ProjectHandler) RestoreProject(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid project ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	err = h.db.Projects().RestoreProject(c.Request.Context(), id)
	if err != nil {
		h.logger.Printf("Error restoring project: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to restore project", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(nil, "Project restored successfully")
	c.JSON(http.StatusOK, response)
}

// HardDeleteProject 永久删除项目
func (h *ProjectHandler) HardDeleteProject(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid project ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	err = h.db.Projects().HardDeleteProject(c.Request.Context(), id)
	if err != nil {
		h.logger.Printf("Error hard deleting project: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to permanently delete project", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(nil, "Project permanently deleted successfully")
	c.JSON(http.StatusOK, response)
}