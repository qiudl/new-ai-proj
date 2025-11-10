package handlers

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// RequirementHistoryHandler handles all requirement history-related operations
type RequirementHistoryHandler struct {
	db     database.DB
	logger *log.Logger
}

// NewRequirementHistoryHandler creates a new requirement history handler
func NewRequirementHistoryHandler(db database.DB, logger *log.Logger, validate interface{}) *RequirementHistoryHandler {
	return &RequirementHistoryHandler{
		db:     db,
		logger: logger,
	}
}

// GetRequirementHistory godoc
// @Summary Get requirement history
// @Description Get operation history for a specific requirement
// @Tags requirements
// @Accept json
// @Produce json
// @Param id path int true "Requirement ID"
// @Param page query int false "Page number (default: 1)"
// @Param page_size query int false "Page size (default: 20, max: 100)"
// @Param action query []string false "Filter by action types"
// @Param user_id query int false "Filter by user ID"
// @Param created_after query string false "Filter by created after date (RFC3339)"
// @Param created_before query string false "Filter by created before date (RFC3339)"
// @Param sort_order query string false "Sort order (asc, desc)" default(desc)
// @Success 200 {object} models.APIResponse{data=models.RequirementHistoryListResponse}
// @Failure 400 {object} models.APIResponse
// @Failure 401 {object} models.APIResponse
// @Failure 404 {object} models.APIResponse
// @Failure 500 {object} models.APIResponse
// @Router /api/v1/requirements/{id}/history [get]
// @Security BearerAuth
func (h *RequirementHistoryHandler) GetRequirementHistory(c *gin.Context) {
	// 解析需求ID
	requirementIDStr := c.Param("id")
	requirementID, err := strconv.Atoi(requirementIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeValidation, "无效的需求ID", nil))
		return
	}

	// 验证需求是否存在
	requirementRepo := database.NewRequirementRepository(h.db.GetDB())
	requirement, err := requirementRepo.GetByID(c.Request.Context(), requirementID)
	if err != nil {
		c.JSON(http.StatusNotFound, models.NewErrorResponse(models.ErrCodeNotFound, "需求不存在", nil))
		return
	}

	// 权限检查：用户必须属于该需求的企业
	userType := c.GetString("user_type")
	enterpriseID := c.GetInt("enterprise_id")

	// 系统管理员可以查看所有需求历史
	if userType != "system" {
		if requirement.EnterpriseID != enterpriseID {
			c.JSON(http.StatusForbidden, models.NewErrorResponse(models.ErrCodeAuthorization, "无权查看该需求的历史记录", nil))
			return
		}
	}

	// 解析查询参数
	filters := &models.RequirementHistoryFilters{}
	filters.RequirementID = &requirementID

	// 分页参数
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	filters.Page = page
	filters.PageSize = pageSize

	// 排序参数
	filters.SortOrder = c.DefaultQuery("sort_order", "DESC")

	// 用户ID过滤
	if userIDStr := c.Query("user_id"); userIDStr != "" {
		if uid, err := strconv.Atoi(userIDStr); err == nil {
			filters.UserID = &uid
		}
	}

	// 操作类型过滤
	if actions := c.QueryArray("action"); len(actions) > 0 {
		filters.Actions = actions
	}

	// 日期过滤
	if createdAfter := c.Query("created_after"); createdAfter != "" {
		if t, err := time.Parse(time.RFC3339, createdAfter); err == nil {
			filters.CreatedAfter = &t
		}
	}
	if createdBefore := c.Query("created_before"); createdBefore != "" {
		if t, err := time.Parse(time.RFC3339, createdBefore); err == nil {
			filters.CreatedBefore = &t
		}
	}

	// 查询历史记录
	historyRepo := database.NewRequirementHistoryRepository(h.db.GetDB())
	result, err := historyRepo.ListByRequirement(c.Request.Context(), requirementID, filters)
	if err != nil {
		h.logger.Printf("Error fetching requirement history: %v", err)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "获取需求历史记录失败", nil))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(result, "获取需求历史记录成功"))
}

// GetRequirementHistoryStats godoc
// @Summary Get requirement history statistics
// @Description Get statistics for requirement operation history
// @Tags requirements
// @Accept json
// @Produce json
// @Param id path int true "Requirement ID"
// @Success 200 {object} models.APIResponse{data=models.RequirementHistoryStats}
// @Failure 400 {object} models.APIResponse
// @Failure 401 {object} models.APIResponse
// @Failure 404 {object} models.APIResponse
// @Failure 500 {object} models.APIResponse
// @Router /api/v1/requirements/{id}/history/stats [get]
// @Security BearerAuth
func (h *RequirementHistoryHandler) GetRequirementHistoryStats(c *gin.Context) {
	// 解析需求ID
	requirementIDStr := c.Param("id")
	requirementID, err := strconv.Atoi(requirementIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeValidation, "无效的需求ID", nil))
		return
	}

	// 验证需求是否存在并检查权限
	requirementRepo := database.NewRequirementRepository(h.db.GetDB())
	requirement, err := requirementRepo.GetByID(c.Request.Context(), requirementID)
	if err != nil {
		c.JSON(http.StatusNotFound, models.NewErrorResponse(models.ErrCodeNotFound, "需求不存在", nil))
		return
	}

	// 权限检查
	userType := c.GetString("user_type")
	enterpriseID := c.GetInt("enterprise_id")

	if userType != "system" {
		if requirement.EnterpriseID != enterpriseID {
			c.JSON(http.StatusForbidden, models.NewErrorResponse(models.ErrCodeAuthorization, "无权查看该需求的统计信息", nil))
			return
		}
	}

	// 获取统计信息
	historyRepo := database.NewRequirementHistoryRepository(h.db.GetDB())
	stats, err := historyRepo.GetStats(c.Request.Context(), &requirementID)
	if err != nil {
		h.logger.Printf("Error fetching requirement history stats: %v", err)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "获取需求历史统计失败", nil))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(stats, "获取需求历史统计成功"))
}

// CreateRequirementHistory godoc
// @Summary Create requirement history record
// @Description Create a new history record for a requirement (internal use)
// @Tags requirements
// @Accept json
// @Produce json
// @Param id path int true "Requirement ID"
// @Param history body models.CreateRequirementHistoryRequest true "History record data"
// @Success 201 {object} models.APIResponse{data=models.RequirementHistoryResponse}
// @Failure 400 {object} models.APIResponse
// @Failure 401 {object} models.APIResponse
// @Failure 404 {object} models.APIResponse
// @Failure 500 {object} models.APIResponse
// @Router /api/v1/requirements/{id}/history [post]
// @Security BearerAuth
func (h *RequirementHistoryHandler) CreateRequirementHistory(c *gin.Context) {
	// 解析需求ID
	requirementIDStr := c.Param("id")
	requirementID, err := strconv.Atoi(requirementIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeValidation, "无效的需求ID", nil))
		return
	}

	// 解析请求数据
	var req models.CreateRequirementHistoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeValidation, fmt.Sprintf("请求参数错误: %v", err), nil))
		return
	}

	// 验证操作类型
	if !models.ValidateRequirementHistoryAction(req.Action) {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeValidation, "无效的操作类型", nil))
		return
	}

	// 确保需求ID一致
	req.RequirementID = requirementID

	// 验证需求是否存在
	requirementRepo := database.NewRequirementRepository(h.db.GetDB())
	requirement, err := requirementRepo.GetByID(c.Request.Context(), requirementID)
	if err != nil {
		c.JSON(http.StatusNotFound, models.NewErrorResponse(models.ErrCodeNotFound, "需求不存在", nil))
		return
	}

	// 权限检查
	userType := c.GetString("user_type")
	enterpriseID := c.GetInt("enterprise_id")

	if userType != "system" {
		if requirement.EnterpriseID != enterpriseID {
			c.JSON(http.StatusForbidden, models.NewErrorResponse(models.ErrCodeAuthorization, "无权操作该需求", nil))
			return
		}
	}

	// 创建历史记录
	history := &models.RequirementHistory{
		RequirementID: req.RequirementID,
		UserID:        req.UserID,
		Action:        req.Action,
		FieldName:     req.FieldName,
		OldValue:      req.OldValue,
		NewValue:      req.NewValue,
		Comment:       req.Comment,
	}

	historyRepo := database.NewRequirementHistoryRepository(h.db.GetDB())
	if err := historyRepo.Create(c.Request.Context(), history); err != nil {
		h.logger.Printf("Error creating requirement history: %v", err)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "创建需求历史记录失败", nil))
		return
	}

	c.JSON(http.StatusCreated, models.NewSuccessResponse(history.ToResponse(), "创建需求历史记录成功"))
}

// Helper function to record history (can be called by other handlers)
func RecordRequirementHistory(db database.DB, requirementID, userID int, action models.RequirementHistoryAction, fieldName, oldValue, newValue, comment *string) error {
	history := &models.RequirementHistory{
		RequirementID: requirementID,
		UserID:        userID,
		Action:        string(action),
		FieldName:     fieldName,
		OldValue:      oldValue,
		NewValue:      newValue,
		Comment:       comment,
	}

	historyRepo := database.NewRequirementHistoryRepository(db.GetDB())
	return historyRepo.Create(nil, history)
}
