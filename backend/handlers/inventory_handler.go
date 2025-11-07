package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"time"

	"ai-project-backend/database"
	"ai-project-backend/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// InventoryHandler 库存处理器
type InventoryHandler struct {
	inventoryRepo database.InventoryRepository
	skuRepo       database.SKURepository
}

// NewInventoryHandler 创建库存处理器
func NewInventoryHandler(inventoryRepo database.InventoryRepository, skuRepo database.SKURepository) *InventoryHandler {
	return &InventoryHandler{
		inventoryRepo: inventoryRepo,
		skuRepo:       skuRepo,
	}
}

// RecordIn godoc
// @Summary 库存入库
// @Description 记录库存入库操作
// @Tags 库存管理
// @Accept json
// @Produce json
// @Param request body models.InventoryInRequest true "入库请求"
// @Success 200 {object} map[string]interface{} "入库成功"
// @Failure 400 {object} map[string]interface{} "请求参数错误"
// @Failure 404 {object} map[string]interface{} "SKU不存在"
// @Failure 500 {object} map[string]interface{} "服务器错误"
// @Security BearerAuth
// @Router /api/v1/inventory/in [post]
func (h *InventoryHandler) RecordIn(c *gin.Context) {
	var req models.InventoryInRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误: " + err.Error()})
		return
	}

	// 验证SKU是否存在
	exists, err := h.skuRepo.ExistsByID(req.SKUID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "检查SKU失败"})
		return
	}
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "SKU不存在"})
		return
	}

	// 获取操作人ID
	operatorID, _ := c.Get("user_id")

	// 执行入库操作
	if err := h.inventoryRepo.RecordIn(&req, operatorID.(uint)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "入库失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "入库成功", "quantity": req.Quantity})
}

// RecordOut godoc
// @Summary 库存出库
// @Description 记录库存出库操作
// @Tags 库存管理
// @Accept json
// @Produce json
// @Param request body models.InventoryOutRequest true "出库请求"
// @Success 200 {object} map[string]interface{} "出库成功"
// @Failure 400 {object} map[string]interface{} "请求参数错误或库存不足"
// @Failure 404 {object} map[string]interface{} "SKU不存在"
// @Failure 500 {object} map[string]interface{} "服务器错误"
// @Security BearerAuth
// @Router /api/v1/inventory/out [post]
func (h *InventoryHandler) RecordOut(c *gin.Context) {
	var req models.InventoryOutRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误: " + err.Error()})
		return
	}

	// 验证SKU是否存在
	exists, err := h.skuRepo.ExistsByID(req.SKUID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "检查SKU失败"})
		return
	}
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "SKU不存在"})
		return
	}

	// 获取操作人ID
	operatorID, _ := c.Get("user_id")

	// 执行出库操作
	if err := h.inventoryRepo.RecordOut(&req, operatorID.(uint)); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "出库成功", "quantity": req.Quantity})
}

// AdjustInventory godoc
// @Summary 库存调整/盘点
// @Description 调整库存数量（用于盘点、纠错等）
// @Tags 库存管理
// @Accept json
// @Produce json
// @Param request body models.InventoryAdjustRequest true "调整请求"
// @Success 200 {object} map[string]interface{} "调整成功"
// @Failure 400 {object} map[string]interface{} "请求参数错误"
// @Failure 404 {object} map[string]interface{} "SKU不存在"
// @Failure 500 {object} map[string]interface{} "服务器错误"
// @Security BearerAuth
// @Router /api/v1/inventory/adjust [post]
func (h *InventoryHandler) AdjustInventory(c *gin.Context) {
	var req models.InventoryAdjustRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误: " + err.Error()})
		return
	}

	// 验证SKU是否存在
	exists, err := h.skuRepo.ExistsByID(req.SKUID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "检查SKU失败"})
		return
	}
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "SKU不存在"})
		return
	}

	// 获取操作人ID
	operatorID, _ := c.Get("user_id")

	// 执行库存调整
	if err := h.inventoryRepo.AdjustInventory(&req, operatorID.(uint)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "库存调整失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "库存调整成功", "new_quantity": req.NewQuantity})
}

// LockInventory godoc
// @Summary 锁定库存
// @Description 锁定库存（用于订单下单时）
// @Tags 库存管理
// @Accept json
// @Produce json
// @Param request body models.InventoryLockRequest true "锁定请求"
// @Success 200 {object} map[string]interface{} "锁定成功"
// @Failure 400 {object} map[string]interface{} "请求参数错误或可用库存不足"
// @Failure 404 {object} map[string]interface{} "SKU不存在"
// @Failure 500 {object} map[string]interface{} "服务器错误"
// @Security BearerAuth
// @Router /api/v1/inventory/lock [post]
func (h *InventoryHandler) LockInventory(c *gin.Context) {
	var req models.InventoryLockRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误: " + err.Error()})
		return
	}

	// 验证SKU是否存在
	exists, err := h.skuRepo.ExistsByID(req.SKUID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "检查SKU失败"})
		return
	}
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "SKU不存在"})
		return
	}

	// 获取操作人ID
	operatorID, _ := c.Get("user_id")

	// 执行库存锁定
	if err := h.inventoryRepo.LockInventory(&req, operatorID.(uint)); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "库存锁定成功", "quantity": req.Quantity})
}

// UnlockInventory godoc
// @Summary 解锁库存
// @Description 解锁库存（用于订单取消时）
// @Tags 库存管理
// @Accept json
// @Produce json
// @Param request body models.InventoryUnlockRequest true "解锁请求"
// @Success 200 {object} map[string]interface{} "解锁成功"
// @Failure 400 {object} map[string]interface{} "请求参数错误或锁定库存不足"
// @Failure 404 {object} map[string]interface{} "SKU不存在"
// @Failure 500 {object} map[string]interface{} "服务器错误"
// @Security BearerAuth
// @Router /api/v1/inventory/unlock [post]
func (h *InventoryHandler) UnlockInventory(c *gin.Context) {
	var req models.InventoryUnlockRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误: " + err.Error()})
		return
	}

	// 验证SKU是否存在
	exists, err := h.skuRepo.ExistsByID(req.SKUID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "检查SKU失败"})
		return
	}
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "SKU不存在"})
		return
	}

	// 获取操作人ID
	operatorID, _ := c.Get("user_id")

	// 执行库存解锁
	if err := h.inventoryRepo.UnlockInventory(&req, operatorID.(uint)); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "库存解锁成功", "quantity": req.Quantity})
}

// GetInventoryBySKU godoc
// @Summary 获取SKU库存
// @Description 根据SKU ID获取当前库存信息
// @Tags 库存管理
// @Produce json
// @Param sku_id path int true "SKU ID"
// @Param warehouse_id query int false "仓库ID"
// @Success 200 {object} models.InventoryRecord "获取成功"
// @Failure 400 {object} map[string]interface{} "参数错误"
// @Failure 404 {object} map[string]interface{} "库存记录不存在"
// @Failure 500 {object} map[string]interface{} "服务器错误"
// @Security BearerAuth
// @Router /api/v1/inventory/skus/{sku_id} [get]
func (h *InventoryHandler) GetInventoryBySKU(c *gin.Context) {
	skuIDStr := c.Param("sku_id")
	skuID, err := strconv.ParseUint(skuIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的SKU ID"})
		return
	}

	// 解析仓库ID（可选）
	var warehouseID *uint
	if warehouseIDStr := c.Query("warehouse_id"); warehouseIDStr != "" {
		if wid, err := strconv.ParseUint(warehouseIDStr, 10, 32); err == nil {
			w := uint(wid)
			warehouseID = &w
		}
	}

	// 获取库存记录
	record, err := h.inventoryRepo.GetInventoryBySKUID(uint(skuID), warehouseID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "库存记录不存在"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取库存失败"})
		return
	}

	c.JSON(http.StatusOK, record)
}

// ListInventoryRecords godoc
// @Summary 获取库存记录列表
// @Description 获取库存记录列表（支持过滤、分页、排序）
// @Tags 库存管理
// @Produce json
// @Param sku_id query int false "SKU ID过滤"
// @Param sku_code query string false "SKU编码过滤"
// @Param warehouse_id query int false "仓库ID过滤"
// @Param is_low_stock query bool false "是否低库存"
// @Param is_out_of_stock query bool false "是否缺货"
// @Param keyword query string false "关键词搜索（SKU名称或编码）"
// @Param page query int false "页码" default(1)
// @Param page_size query int false "每页数量" default(20)
// @Param sort_by query string false "排序字段 (updated_at/sku_code/available/total)" default(updated_at)
// @Param sort_order query string false "排序方向 (asc/desc)" default(desc)
// @Success 200 {object} map[string]interface{} "获取成功"
// @Failure 400 {object} map[string]interface{} "参数错误"
// @Failure 500 {object} map[string]interface{} "服务器错误"
// @Security BearerAuth
// @Router /api/v1/inventory/records [get]
func (h *InventoryHandler) ListInventoryRecords(c *gin.Context) {
	// 构建过滤器
	filter := &database.InventoryFilter{
		SKUCode:   c.Query("sku_code"),
		Keyword:   c.Query("keyword"),
		Page:      1,
		PageSize:  20,
		SortBy:    c.DefaultQuery("sort_by", "updated_at"),
		SortOrder: c.DefaultQuery("sort_order", "desc"),
	}

	// 解析SKU ID
	if skuIDStr := c.Query("sku_id"); skuIDStr != "" {
		if skuID, err := strconv.ParseUint(skuIDStr, 10, 32); err == nil {
			sid := uint(skuID)
			filter.SKUID = &sid
		}
	}

	// 解析仓库ID
	if warehouseIDStr := c.Query("warehouse_id"); warehouseIDStr != "" {
		if warehouseID, err := strconv.ParseUint(warehouseIDStr, 10, 32); err == nil {
			wid := uint(warehouseID)
			filter.WarehouseID = &wid
		}
	}

	// 解析低库存标志
	if isLowStockStr := c.Query("is_low_stock"); isLowStockStr == "true" {
		filter.IsLowStock = true
	}

	// 解析缺货标志
	if isOutOfStockStr := c.Query("is_out_of_stock"); isOutOfStockStr == "true" {
		filter.IsOutOfStock = true
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

	// 查询库存记录列表
	records, total, err := h.inventoryRepo.ListInventoryRecords(filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "查询库存记录失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":      records,
		"total":     total,
		"page":      filter.Page,
		"page_size": filter.PageSize,
	})
}

// GetTransactionHistory godoc
// @Summary 获取库存事务历史
// @Description 获取库存变动历史记录（支持过滤、分页、排序）
// @Tags 库存管理
// @Produce json
// @Param sku_id query int false "SKU ID过滤"
// @Param sku_code query string false "SKU编码过滤"
// @Param warehouse_id query int false "仓库ID过滤"
// @Param transaction_type query string false "事务类型过滤 (in/out/adjust/lock/unlock/return)"
// @Param operator_id query int false "操作人ID过滤"
// @Param reference_type query string false "关联单据类型过滤 (order/purchase/return/transfer/manual)"
// @Param reference_id query int false "关联单据ID过滤"
// @Param start_date query string false "开始日期 (YYYY-MM-DD)"
// @Param end_date query string false "结束日期 (YYYY-MM-DD)"
// @Param page query int false "页码" default(1)
// @Param page_size query int false "每页数量" default(20)
// @Param sort_by query string false "排序字段 (created_at/sku_code/type/quantity)" default(created_at)
// @Param sort_order query string false "排序方向 (asc/desc)" default(desc)
// @Success 200 {object} map[string]interface{} "获取成功"
// @Failure 400 {object} map[string]interface{} "参数错误"
// @Failure 500 {object} map[string]interface{} "服务器错误"
// @Security BearerAuth
// @Router /api/v1/inventory/transactions [get]
func (h *InventoryHandler) GetTransactionHistory(c *gin.Context) {
	// 构建过滤器
	filter := &database.TransactionFilter{
		SKUCode:         c.Query("sku_code"),
		TransactionType: c.Query("transaction_type"),
		ReferenceType:   c.Query("reference_type"),
		Page:            1,
		PageSize:        20,
		SortBy:          c.DefaultQuery("sort_by", "created_at"),
		SortOrder:       c.DefaultQuery("sort_order", "desc"),
	}

	// 解析SKU ID
	if skuIDStr := c.Query("sku_id"); skuIDStr != "" {
		if skuID, err := strconv.ParseUint(skuIDStr, 10, 32); err == nil {
			sid := uint(skuID)
			filter.SKUID = &sid
		}
	}

	// 解析仓库ID
	if warehouseIDStr := c.Query("warehouse_id"); warehouseIDStr != "" {
		if warehouseID, err := strconv.ParseUint(warehouseIDStr, 10, 32); err == nil {
			wid := uint(warehouseID)
			filter.WarehouseID = &wid
		}
	}

	// 解析操作人ID
	if operatorIDStr := c.Query("operator_id"); operatorIDStr != "" {
		if operatorID, err := strconv.ParseUint(operatorIDStr, 10, 32); err == nil {
			oid := uint(operatorID)
			filter.OperatorID = &oid
		}
	}

	// 解析关联单据ID
	if referenceIDStr := c.Query("reference_id"); referenceIDStr != "" {
		if referenceID, err := strconv.ParseUint(referenceIDStr, 10, 32); err == nil {
			rid := uint(referenceID)
			filter.ReferenceID = &rid
		}
	}

	// 解析日期范围
	if startDateStr := c.Query("start_date"); startDateStr != "" {
		if startDate, err := time.Parse("2006-01-02", startDateStr); err == nil {
			filter.StartDate = &startDate
		}
	}
	if endDateStr := c.Query("end_date"); endDateStr != "" {
		if endDate, err := time.Parse("2006-01-02", endDateStr); err == nil {
			// 设置为当天结束时间
			endDate = endDate.Add(23*time.Hour + 59*time.Minute + 59*time.Second)
			filter.EndDate = &endDate
		}
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

	// 查询库存事务历史
	transactions, total, err := h.inventoryRepo.GetTransactionHistory(filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "查询库存事务历史失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":      transactions,
		"total":     total,
		"page":      filter.Page,
		"page_size": filter.PageSize,
	})
}

// GetTransaction godoc
// @Summary 获取库存事务详情
// @Description 根据ID获取库存事务详细信息
// @Tags 库存管理
// @Produce json
// @Param id path int true "事务ID"
// @Success 200 {object} models.InventoryTransaction "获取成功"
// @Failure 400 {object} map[string]interface{} "参数错误"
// @Failure 404 {object} map[string]interface{} "事务不存在"
// @Failure 500 {object} map[string]interface{} "服务器错误"
// @Security BearerAuth
// @Router /api/v1/inventory/transactions/{id} [get]
func (h *InventoryHandler) GetTransaction(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的事务ID"})
		return
	}

	transaction, err := h.inventoryRepo.GetTransactionByID(uint(id))
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "事务不存在"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取事务失败"})
		return
	}

	c.JSON(http.StatusOK, transaction)
}
