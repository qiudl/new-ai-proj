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

// SKUHandler SKU处理器
type SKUHandler struct {
	skuRepo database.SKURepository
	spuRepo database.SPURepository
}

// NewSKUHandler 创建SKU处理器
func NewSKUHandler(skuRepo database.SKURepository, spuRepo database.SPURepository) *SKUHandler {
	return &SKUHandler{
		skuRepo: skuRepo,
		spuRepo: spuRepo,
	}
}

// CreateSKU godoc
// @Summary 创建SKU
// @Description 创建新的库存单位
// @Tags SKU管理
// @Accept json
// @Produce json
// @Param request body models.SKUCreateRequest true "创建SKU请求"
// @Success 201 {object} models.SKU "创建成功"
// @Failure 400 {object} map[string]interface{} "请求参数错误"
// @Failure 404 {object} map[string]interface{} "SPU不存在"
// @Failure 409 {object} map[string]interface{} "SKU编码已存在"
// @Failure 500 {object} map[string]interface{} "服务器错误"
// @Security BearerAuth
// @Router /api/v1/products/skus [post]
func (h *SKUHandler) CreateSKU(c *gin.Context) {
	var req models.SKUCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误: " + err.Error()})
		return
	}

	// 验证SPU是否存在
	exists, err := h.spuRepo.ExistsByID(req.SPUID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "检查SPU失败"})
		return
	}
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "SPU不存在"})
		return
	}

	// 检查SKU编码是否已存在
	exists, err = h.skuRepo.ExistsByCode(req.SKUCode, 0)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "检查SKU编码失败"})
		return
	}
	if exists {
		c.JSON(http.StatusConflict, gin.H{"error": "SKU编码已存在"})
		return
	}

	// 构建SKU对象
	sku := &models.SKU{
		SKUCode:       req.SKUCode,
		SPUID:         req.SPUID,
		Name:          req.Name,
		Price:         req.Price,
		CostPrice:     req.CostPrice,
		MarketPrice:   req.MarketPrice,
		StockQuantity: req.StockQuantity,
		AlertQuantity: req.AlertQuantity,
		Attributes:    req.Attributes,
		Barcode:       req.Barcode,
		Weight:        req.Weight,
		Volume:        req.Volume,
		Status:        req.Status,
	}

	// 创建SKU
	if err := h.skuRepo.Create(sku); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建SKU失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, sku)
}

// BatchCreateSKUs godoc
// @Summary 批量创建SKU
// @Description 为一个SPU批量创建多个SKU（如：所有颜色和尺寸的组合）
// @Tags SKU管理
// @Accept json
// @Produce json
// @Param request body models.SKUBatchCreateRequest true "批量创建SKU请求"
// @Success 201 {object} map[string]interface{} "创建成功"
// @Failure 400 {object} map[string]interface{} "请求参数错误"
// @Failure 404 {object} map[string]interface{} "SPU不存在"
// @Failure 500 {object} map[string]interface{} "服务器错误"
// @Security BearerAuth
// @Router /api/v1/products/skus/batch [post]
func (h *SKUHandler) BatchCreateSKUs(c *gin.Context) {
	var req models.SKUBatchCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误: " + err.Error()})
		return
	}

	// 验证SPU是否存在
	exists, err := h.spuRepo.ExistsByID(req.SPUID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "检查SPU失败"})
		return
	}
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "SPU不存在"})
		return
	}

	// 验证所有SKU编码是否唯一
	for _, skuReq := range req.SKUs {
		exists, err := h.skuRepo.ExistsByCode(skuReq.SKUCode, 0)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "检查SKU编码失败"})
			return
		}
		if exists {
			c.JSON(http.StatusConflict, gin.H{"error": "SKU编码 " + skuReq.SKUCode + " 已存在"})
			return
		}
	}

	// 构建SKU对象数组
	skus := make([]models.SKU, len(req.SKUs))
	for i, skuReq := range req.SKUs {
		skus[i] = models.SKU{
			SKUCode:       skuReq.SKUCode,
			SPUID:         req.SPUID,
			Name:          skuReq.Name,
			Price:         skuReq.Price,
			CostPrice:     skuReq.CostPrice,
			MarketPrice:   skuReq.MarketPrice,
			StockQuantity: skuReq.StockQuantity,
			AlertQuantity: skuReq.AlertQuantity,
			Attributes:    skuReq.Attributes,
			Barcode:       skuReq.Barcode,
			Weight:        skuReq.Weight,
			Volume:        skuReq.Volume,
			Status:        skuReq.Status,
		}
	}

	// 批量创建SKU
	if err := h.skuRepo.BatchCreate(skus); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "批量创建SKU失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "批量创建成功",
		"count":   len(skus),
		"skus":    skus,
	})
}

// GetSKU godoc
// @Summary 获取SKU详情
// @Description 根据ID获取SKU详细信息
// @Tags SKU管理
// @Produce json
// @Param id path int true "SKU ID"
// @Success 200 {object} models.SKU "获取成功"
// @Failure 400 {object} map[string]interface{} "参数错误"
// @Failure 404 {object} map[string]interface{} "SKU不存在"
// @Failure 500 {object} map[string]interface{} "服务器错误"
// @Security BearerAuth
// @Router /api/v1/products/skus/{id} [get]
func (h *SKUHandler) GetSKU(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的SKU ID"})
		return
	}

	sku, err := h.skuRepo.GetByID(uint(id))
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "SKU不存在"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取SKU失败"})
		return
	}

	c.JSON(http.StatusOK, sku)
}

// UpdateSKU godoc
// @Summary 更新SKU
// @Description 更新SKU信息
// @Tags SKU管理
// @Accept json
// @Produce json
// @Param id path int true "SKU ID"
// @Param request body models.SKUCreateRequest true "更新SKU请求"
// @Success 200 {object} models.SKU "更新成功"
// @Failure 400 {object} map[string]interface{} "请求参数错误"
// @Failure 404 {object} map[string]interface{} "SKU不存在"
// @Failure 409 {object} map[string]interface{} "SKU编码已存在"
// @Failure 500 {object} map[string]interface{} "服务器错误"
// @Security BearerAuth
// @Router /api/v1/products/skus/{id} [put]
func (h *SKUHandler) UpdateSKU(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的SKU ID"})
		return
	}

	var req models.SKUCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误: " + err.Error()})
		return
	}

	// 获取现有SKU
	sku, err := h.skuRepo.GetByID(uint(id))
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "SKU不存在"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取SKU失败"})
		return
	}

	// 如果要更新SKU编码，检查是否已存在
	if req.SKUCode != sku.SKUCode {
		exists, err := h.skuRepo.ExistsByCode(req.SKUCode, uint(id))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "检查SKU编码失败"})
			return
		}
		if exists {
			c.JSON(http.StatusConflict, gin.H{"error": "SKU编码已存在"})
			return
		}
	}

	// 更新字段
	sku.SKUCode = req.SKUCode
	sku.Name = req.Name
	sku.Price = req.Price
	sku.CostPrice = req.CostPrice
	sku.MarketPrice = req.MarketPrice
	sku.StockQuantity = req.StockQuantity
	sku.AlertQuantity = req.AlertQuantity
	sku.Attributes = req.Attributes
	sku.Barcode = req.Barcode
	sku.Weight = req.Weight
	sku.Volume = req.Volume
	if req.Status != "" {
		sku.Status = req.Status
	}

	// 保存更新
	if err := h.skuRepo.Update(sku); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "更新SKU失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, sku)
}

// BatchUpdateSKUs godoc
// @Summary 批量更新SKU
// @Description 批量更新多个SKU的价格、库存等信息
// @Tags SKU管理
// @Accept json
// @Produce json
// @Param request body models.SKUBatchUpdateRequest true "批量更新SKU请求"
// @Success 200 {object} map[string]interface{} "更新成功"
// @Failure 400 {object} map[string]interface{} "请求参数错误"
// @Failure 500 {object} map[string]interface{} "服务器错误"
// @Security BearerAuth
// @Router /api/v1/products/skus/batch [put]
func (h *SKUHandler) BatchUpdateSKUs(c *gin.Context) {
	var req models.SKUBatchUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误: " + err.Error()})
		return
	}

	// 批量更新SKU
	if err := h.skuRepo.BatchUpdate(req.Updates); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "批量更新SKU失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "批量更新成功",
		"count":   len(req.Updates),
	})
}

// DeleteSKU godoc
// @Summary 删除SKU
// @Description 软删除SKU
// @Tags SKU管理
// @Produce json
// @Param id path int true "SKU ID"
// @Success 200 {object} map[string]interface{} "删除成功"
// @Failure 400 {object} map[string]interface{} "参数错误"
// @Failure 404 {object} map[string]interface{} "SKU不存在"
// @Failure 500 {object} map[string]interface{} "服务器错误"
// @Security BearerAuth
// @Router /api/v1/products/skus/{id} [delete]
func (h *SKUHandler) DeleteSKU(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的SKU ID"})
		return
	}

	// 检查SKU是否存在
	exists, err := h.skuRepo.ExistsByID(uint(id))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "检查SKU失败"})
		return
	}
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "SKU不存在"})
		return
	}

	// 软删除SKU
	if err := h.skuRepo.SoftDelete(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "删除SKU失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "删除成功"})
}

// ListSKUs godoc
// @Summary 获取SKU列表
// @Description 获取SKU列表（支持过滤、分页、排序）
// @Tags SKU管理
// @Produce json
// @Param spu_id query int false "SPU ID过滤"
// @Param status query string false "状态过滤 (active/inactive)"
// @Param is_low_stock query bool false "是否低库存"
// @Param keyword query string false "关键词搜索（名称或编码）"
// @Param page query int false "页码" default(1)
// @Param page_size query int false "每页数量" default(20)
// @Param sort_by query string false "排序字段 (created_at/name/price/stock)" default(created_at)
// @Param sort_order query string false "排序方向 (asc/desc)" default(desc)
// @Success 200 {object} map[string]interface{} "获取成功"
// @Failure 400 {object} map[string]interface{} "参数错误"
// @Failure 500 {object} map[string]interface{} "服务器错误"
// @Security BearerAuth
// @Router /api/v1/products/skus [get]
func (h *SKUHandler) ListSKUs(c *gin.Context) {
	// 构建过滤器
	filter := &database.SKUFilter{
		Status:    c.Query("status"),
		Keyword:   c.Query("keyword"),
		Page:      1,
		PageSize:  20,
		SortBy:    c.DefaultQuery("sort_by", "created_at"),
		SortOrder: c.DefaultQuery("sort_order", "desc"),
	}

	// 解析SPU ID
	if spuIDStr := c.Query("spu_id"); spuIDStr != "" {
		if spuID, err := strconv.ParseUint(spuIDStr, 10, 32); err == nil {
			sid := uint(spuID)
			filter.SPUID = &sid
		}
	}

	// 解析低库存标志
	if isLowStockStr := c.Query("is_low_stock"); isLowStockStr == "true" {
		filter.IsLowStock = true
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

	// 查询SKU列表
	skus, total, err := h.skuRepo.List(filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "查询SKU列表失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":      skus,
		"total":     total,
		"page":      filter.Page,
		"page_size": filter.PageSize,
	})
}

// ListSKUsWithDetails godoc
// @Summary 获取SKU列表（含详细信息）
// @Description 获取SKU列表，包含SPU名称等详细信息
// @Tags SKU管理
// @Produce json
// @Param spu_id query int false "SPU ID过滤"
// @Param status query string false "状态过滤 (active/inactive)"
// @Param is_low_stock query bool false "是否低库存"
// @Param keyword query string false "关键词搜索（名称或编码）"
// @Param page query int false "页码" default(1)
// @Param page_size query int false "每页数量" default(20)
// @Param sort_by query string false "排序字段 (created_at/name/price/stock)" default(created_at)
// @Param sort_order query string false "排序方向 (asc/desc)" default(desc)
// @Success 200 {object} map[string]interface{} "获取成功"
// @Failure 400 {object} map[string]interface{} "参数错误"
// @Failure 500 {object} map[string]interface{} "服务器错误"
// @Security BearerAuth
// @Router /api/v1/products/skus/details [get]
func (h *SKUHandler) ListSKUsWithDetails(c *gin.Context) {
	// 构建过滤器（与ListSKUs相同）
	filter := &database.SKUFilter{
		Status:    c.Query("status"),
		Keyword:   c.Query("keyword"),
		Page:      1,
		PageSize:  20,
		SortBy:    c.DefaultQuery("sort_by", "created_at"),
		SortOrder: c.DefaultQuery("sort_order", "desc"),
	}

	// 解析SPU ID
	if spuIDStr := c.Query("spu_id"); spuIDStr != "" {
		if spuID, err := strconv.ParseUint(spuIDStr, 10, 32); err == nil {
			sid := uint(spuID)
			filter.SPUID = &sid
		}
	}

	// 解析低库存标志
	if isLowStockStr := c.Query("is_low_stock"); isLowStockStr == "true" {
		filter.IsLowStock = true
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

	// 查询SKU列表（含详细信息）
	skus, total, err := h.skuRepo.ListWithDetails(filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "查询SKU列表失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":      skus,
		"total":     total,
		"page":      filter.Page,
		"page_size": filter.PageSize,
	})
}

// ListSKUsBySPU godoc
// @Summary 获取SPU下的所有SKU
// @Description 根据SPU ID获取该SPU下的所有SKU
// @Tags SKU管理
// @Produce json
// @Param spu_id path int true "SPU ID"
// @Success 200 {object} map[string]interface{} "获取成功"
// @Failure 400 {object} map[string]interface{} "参数错误"
// @Failure 404 {object} map[string]interface{} "SPU不存在"
// @Failure 500 {object} map[string]interface{} "服务器错误"
// @Security BearerAuth
// @Router /api/v1/products/spus/{spu_id}/skus [get]
func (h *SKUHandler) ListSKUsBySPU(c *gin.Context) {
	spuIDStr := c.Param("id")
	spuID, err := strconv.ParseUint(spuIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的SPU ID"})
		return
	}

	// 检查SPU是否存在
	exists, err := h.spuRepo.ExistsByID(uint(spuID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "检查SPU失败"})
		return
	}
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "SPU不存在"})
		return
	}

	// 查询该SPU下的所有SKU
	skus, err := h.skuRepo.ListBySPUID(uint(spuID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "查询SKU列表失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  skus,
		"total": len(skus),
	})
}
