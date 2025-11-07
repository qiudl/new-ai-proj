package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"ai-project-backend/database"
	"ai-project-backend/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// SPUHandler SPU处理器
type SPUHandler struct {
	spuRepo database.SPURepository
}

// NewSPUHandler 创建SPU处理器
func NewSPUHandler(spuRepo database.SPURepository) *SPUHandler {
	return &SPUHandler{
		spuRepo: spuRepo,
	}
}

// CreateSPU godoc
// @Summary 创建SPU
// @Description 创建新的标准产品单位
// @Tags SPU管理
// @Accept json
// @Produce json
// @Param request body models.SPUCreateRequest true "创建SPU请求"
// @Success 201 {object} models.SPU "创建成功"
// @Failure 400 {object} map[string]interface{} "请求参数错误"
// @Failure 409 {object} map[string]interface{} "SPU编码已存在"
// @Failure 500 {object} map[string]interface{} "服务器错误"
// @Security BearerAuth
// @Router /api/v1/products/spus [post]
func (h *SPUHandler) CreateSPU(c *gin.Context) {
	var req models.SPUCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误: " + err.Error()})
		return
	}

	// 获取企业ID（从上下文中获取，由中间件设置）
	enterpriseID, exists := c.Get("enterprise_id")
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "未指定企业ID"})
		return
	}

	// 检查SPU编码是否已存在
	exists, err := h.spuRepo.ExistsByCode(req.SPUCode, 0)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "检查SPU编码失败"})
		return
	}
	if exists {
		c.JSON(http.StatusConflict, gin.H{"error": "SPU编码已存在"})
		return
	}

	// 构建SPU对象
	spu := &models.SPU{
		SPUCode:        req.SPUCode,
		Name:           req.Name,
		EnterpriseID:   enterpriseID.(uint),
		CategoryID:     req.CategoryID,
		Brand:          req.Brand,
		Description:    req.Description,
		MainImage:      req.MainImage,
		Images:         req.Images,
		Specifications: req.Specifications,
		Status:         req.Status,
	}

	// 如果状态为空，设置默认值
	if spu.Status == "" {
		spu.Status = models.SPUStatusDraft
	}

	// 创建SPU
	if err := h.spuRepo.Create(spu); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建SPU失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, spu)
}

// GetSPU godoc
// @Summary 获取SPU详情
// @Description 根据ID获取SPU详细信息
// @Tags SPU管理
// @Produce json
// @Param id path int true "SPU ID"
// @Success 200 {object} models.SPU "获取成功"
// @Failure 400 {object} map[string]interface{} "参数错误"
// @Failure 404 {object} map[string]interface{} "SPU不存在"
// @Failure 500 {object} map[string]interface{} "服务器错误"
// @Security BearerAuth
// @Router /api/v1/products/spus/{id} [get]
func (h *SPUHandler) GetSPU(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的SPU ID"})
		return
	}

	spu, err := h.spuRepo.GetByID(uint(id))
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "SPU不存在"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取SPU失败"})
		return
	}

	c.JSON(http.StatusOK, spu)
}

// GetSPUDetail godoc
// @Summary 获取SPU详细信息（含统计）
// @Description 根据ID获取SPU详细信息，包含SKU数量和库存统计
// @Tags SPU管理
// @Produce json
// @Param id path int true "SPU ID"
// @Success 200 {object} models.SPUDetailResponse "获取成功"
// @Failure 400 {object} map[string]interface{} "参数错误"
// @Failure 404 {object} map[string]interface{} "SPU不存在"
// @Failure 500 {object} map[string]interface{} "服务器错误"
// @Security BearerAuth
// @Router /api/v1/products/spus/{id}/detail [get]
func (h *SPUHandler) GetSPUDetail(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的SPU ID"})
		return
	}

	detail, err := h.spuRepo.GetDetailByID(uint(id))
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "SPU不存在"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取SPU详情失败"})
		return
	}

	c.JSON(http.StatusOK, detail)
}

// UpdateSPU godoc
// @Summary 更新SPU
// @Description 更新SPU信息
// @Tags SPU管理
// @Accept json
// @Produce json
// @Param id path int true "SPU ID"
// @Param request body models.SPUUpdateRequest true "更新SPU请求"
// @Success 200 {object} models.SPU "更新成功"
// @Failure 400 {object} map[string]interface{} "请求参数错误"
// @Failure 404 {object} map[string]interface{} "SPU不存在"
// @Failure 409 {object} map[string]interface{} "SPU编码已存在"
// @Failure 500 {object} map[string]interface{} "服务器错误"
// @Security BearerAuth
// @Router /api/v1/products/spus/{id} [put]
func (h *SPUHandler) UpdateSPU(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的SPU ID"})
		return
	}

	var req models.SPUUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误: " + err.Error()})
		return
	}

	// 获取现有SPU
	spu, err := h.spuRepo.GetByID(uint(id))
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "SPU不存在"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取SPU失败"})
		return
	}

	// 如果要更新SPU编码，检查是否已存在
	if req.SPUCode != nil && *req.SPUCode != spu.SPUCode {
		exists, err := h.spuRepo.ExistsByCode(*req.SPUCode, uint(id))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "检查SPU编码失败"})
			return
		}
		if exists {
			c.JSON(http.StatusConflict, gin.H{"error": "SPU编码已存在"})
			return
		}
		spu.SPUCode = *req.SPUCode
	}

	// 更新字段
	if req.Name != nil {
		spu.Name = *req.Name
	}
	if req.CategoryID != nil {
		spu.CategoryID = req.CategoryID
	}
	if req.Brand != nil {
		spu.Brand = *req.Brand
	}
	if req.Description != nil {
		spu.Description = *req.Description
	}
	if req.MainImage != nil {
		spu.MainImage = *req.MainImage
	}
	if len(req.Images) > 0 {
		spu.Images = req.Images
	}
	if len(req.Specifications) > 0 {
		spu.Specifications = req.Specifications
	}
	if req.Status != nil {
		spu.Status = *req.Status
	}

	// 保存更新
	if err := h.spuRepo.Update(spu); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "更新SPU失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, spu)
}

// DeleteSPU godoc
// @Summary 删除SPU
// @Description 软删除SPU（同时会删除关联的SKU）
// @Tags SPU管理
// @Produce json
// @Param id path int true "SPU ID"
// @Success 200 {object} map[string]interface{} "删除成功"
// @Failure 400 {object} map[string]interface{} "参数错误"
// @Failure 404 {object} map[string]interface{} "SPU不存在"
// @Failure 500 {object} map[string]interface{} "服务器错误"
// @Security BearerAuth
// @Router /api/v1/products/spus/{id} [delete]
func (h *SPUHandler) DeleteSPU(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的SPU ID"})
		return
	}

	// 检查SPU是否存在
	exists, err := h.spuRepo.ExistsByID(uint(id))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "检查SPU失败"})
		return
	}
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "SPU不存在"})
		return
	}

	// 软删除SPU
	if err := h.spuRepo.SoftDelete(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "删除SPU失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "删除成功"})
}

// ListSPUs godoc
// @Summary 获取SPU列表
// @Description 获取SPU列表（支持过滤、分页、排序）
// @Tags SPU管理
// @Produce json
// @Param status query string false "状态过滤 (draft/active/inactive)"
// @Param category_id query int false "类目ID过滤"
// @Param brand query string false "品牌过滤"
// @Param keyword query string false "关键词搜索（名称）"
// @Param page query int false "页码" default(1)
// @Param page_size query int false "每页数量" default(20)
// @Param sort_by query string false "排序字段 (created_at/name)" default(created_at)
// @Param sort_order query string false "排序方向 (asc/desc)" default(desc)
// @Success 200 {object} map[string]interface{} "获取成功"
// @Failure 400 {object} map[string]interface{} "参数错误"
// @Failure 500 {object} map[string]interface{} "服务器错误"
// @Security BearerAuth
// @Router /api/v1/products/spus [get]
func (h *SPUHandler) ListSPUs(c *gin.Context) {
	// 获取企业ID
	enterpriseID, exists := c.Get("enterprise_id")
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "未指定企业ID"})
		return
	}

	// 构建过滤器
	filter := &database.SPUFilter{
		Status:    c.Query("status"),
		Brand:     c.Query("brand"),
		Keyword:   c.Query("keyword"),
		Page:      1,
		PageSize:  20,
		SortBy:    c.DefaultQuery("sort_by", "created_at"),
		SortOrder: c.DefaultQuery("sort_order", "desc"),
	}

	// 解析分页参数
	if pageStr := c.Query("page"); pageStr != "" {
		if page, err := strconv.Atoi(pageStr); err == nil && page > 0 {
			filter.Page = page
		}
	}
	if pageSizeStr := c.Query("page_size"); pageSizeStr != "" {
		if pageSize, err := strconv.Atoi(pageSizeStr); err == nil && pageSize > 0 {
			filter.PageSize = pageSize
		}
	}

	// 解析类目ID
	if categoryIDStr := c.Query("category_id"); categoryIDStr != "" {
		if categoryID, err := strconv.ParseUint(categoryIDStr, 10, 32); err == nil {
			cid := uint(categoryID)
			filter.CategoryID = &cid
		}
	}

	// 查询SPU列表
	spus, total, err := h.spuRepo.List(enterpriseID.(uint), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "查询SPU列表失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":      spus,
		"total":     total,
		"page":      filter.Page,
		"page_size": filter.PageSize,
	})
}

// ListSPUsWithStats godoc
// @Summary 获取SPU列表（含SKU统计）
// @Description 获取SPU列表，包含SKU数量和库存统计信息
// @Tags SPU管理
// @Produce json
// @Param status query string false "状态过滤 (draft/active/inactive)"
// @Param category_id query int false "类目ID过滤"
// @Param brand query string false "品牌过滤"
// @Param keyword query string false "关键词搜索（名称）"
// @Param page query int false "页码" default(1)
// @Param page_size query int false "每页数量" default(20)
// @Param sort_by query string false "排序字段 (created_at/name)" default(created_at)
// @Param sort_order query string false "排序方向 (asc/desc)" default(desc)
// @Success 200 {object} map[string]interface{} "获取成功"
// @Failure 400 {object} map[string]interface{} "参数错误"
// @Failure 500 {object} map[string]interface{} "服务器错误"
// @Security BearerAuth
// @Router /api/v1/products/spus/stats [get]
func (h *SPUHandler) ListSPUsWithStats(c *gin.Context) {
	// 获取企业ID
	enterpriseID, exists := c.Get("enterprise_id")
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "未指定企业ID"})
		return
	}

	// 构建过滤器（与ListSPUs相同）
	filter := &database.SPUFilter{
		Status:    c.Query("status"),
		Brand:     c.Query("brand"),
		Keyword:   c.Query("keyword"),
		Page:      1,
		PageSize:  20,
		SortBy:    c.DefaultQuery("sort_by", "created_at"),
		SortOrder: c.DefaultQuery("sort_order", "desc"),
	}

	// 解析分页参数
	if pageStr := c.Query("page"); pageStr != "" {
		if page, err := strconv.Atoi(pageStr); err == nil && page > 0 {
			filter.Page = page
		}
	}
	if pageSizeStr := c.Query("page_size"); pageSizeStr != "" {
		if pageSize, err := strconv.Atoi(pageSizeStr); err == nil && pageSize > 0 {
			filter.PageSize = pageSize
		}
	}

	// 解析类目ID
	if categoryIDStr := c.Query("category_id"); categoryIDStr != "" {
		if categoryID, err := strconv.ParseUint(categoryIDStr, 10, 32); err == nil {
			cid := uint(categoryID)
			filter.CategoryID = &cid
		}
	}

	// 查询SPU列表（含统计信息）
	spus, total, err := h.spuRepo.ListWithSKUCount(enterpriseID.(uint), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "查询SPU列表失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":      spus,
		"total":     total,
		"page":      filter.Page,
		"page_size": filter.PageSize,
	})
}
