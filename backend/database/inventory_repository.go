package database

import (
	"errors"
	"fmt"
	"time"

	"ai-project-backend/models"

	"gorm.io/gorm"
)

// InventoryRepository 库存数据访问层接口
type InventoryRepository interface {
	// 库存记录操作
	GetInventoryBySKUID(skuID uint, warehouseID *uint) (*models.InventoryRecord, error)
	CreateInventoryRecord(record *models.InventoryRecord) error
	UpdateInventoryRecord(record *models.InventoryRecord) error
	ListInventoryRecords(filter *InventoryFilter) ([]models.InventoryRecordResponse, int64, error)

	// 库存变动操作
	RecordIn(req *models.InventoryInRequest, operatorID uint) error
	RecordOut(req *models.InventoryOutRequest, operatorID uint) error
	AdjustInventory(req *models.InventoryAdjustRequest, operatorID uint) error
	LockInventory(req *models.InventoryLockRequest, operatorID uint) error
	UnlockInventory(req *models.InventoryUnlockRequest, operatorID uint) error

	// 库存事务查询
	GetTransactionHistory(filter *TransactionFilter) ([]models.InventoryTransactionResponse, int64, error)
	GetTransactionByID(id uint) (*models.InventoryTransaction, error)

	// 验证操作
	HasSufficientStock(skuID uint, warehouseID *uint, quantity int) (bool, error)
	HasSufficientLocked(skuID uint, warehouseID *uint, quantity int) (bool, error)
}

// InventoryFilter 库存查询过滤器
type InventoryFilter struct {
	SKUID        *uint
	SKUCode      string
	WarehouseID  *uint
	IsLowStock   bool   // 是否低库存
	IsOutOfStock bool   // 是否缺货
	Keyword      string // SKU名称或编码搜索
	Page         int
	PageSize     int
	SortBy       string
	SortOrder    string
}

// TransactionFilter 库存事务查询过滤器
type TransactionFilter struct {
	SKUID           *uint
	SKUCode         string
	WarehouseID     *uint
	TransactionType string
	OperatorID      *uint
	ReferenceType   string
	ReferenceID     *uint
	StartDate       *time.Time
	EndDate         *time.Time
	Page            int
	PageSize        int
	SortBy          string
	SortOrder       string
}

// inventoryRepository 库存Repository实现
type inventoryRepository struct {
	db *gorm.DB
}

// NewInventoryRepository 创建库存Repository
func NewInventoryRepository(db *gorm.DB) InventoryRepository {
	return &inventoryRepository{db: db}
}

// GetInventoryBySKUID 根据SKU ID获取库存记录
func (r *inventoryRepository) GetInventoryBySKUID(skuID uint, warehouseID *uint) (*models.InventoryRecord, error) {
	var record models.InventoryRecord

	query := r.db.Where("sku_id = ?", skuID)
	if warehouseID != nil {
		query = query.Where("warehouse_id = ?", *warehouseID)
	} else {
		query = query.Where("warehouse_id IS NULL")
	}

	err := query.Preload("SKU").First(&record).Error
	if err != nil {
		return nil, err
	}

	return &record, nil
}

// CreateInventoryRecord 创建库存记录
func (r *inventoryRepository) CreateInventoryRecord(record *models.InventoryRecord) error {
	return r.db.Create(record).Error
}

// UpdateInventoryRecord 更新库存记录
func (r *inventoryRepository) UpdateInventoryRecord(record *models.InventoryRecord) error {
	return r.db.Save(record).Error
}

// ListInventoryRecords 获取库存记录列表（带统计信息）
func (r *inventoryRepository) ListInventoryRecords(filter *InventoryFilter) ([]models.InventoryRecordResponse, int64, error) {
	var results []models.InventoryRecordResponse
	var total int64

	// 构建基础查询
	baseQuery := r.db.Table("inventory_records ir").
		Select(`
			ir.sku_id,
			s.sku_code,
			s.name as sku_name,
			ir.warehouse_id,
			ir.available_quantity,
			ir.locked_quantity,
			ir.total_quantity,
			ir.last_in_date,
			ir.last_out_date,
			ir.last_check_date,
			ir.updated_at
		`).
		Joins("INNER JOIN skus s ON s.id = ir.sku_id AND s.deleted_at IS NULL")

	// 应用过滤器
	baseQuery = r.applyInventoryFilter(baseQuery, filter)

	// 统计总数
	countQuery := r.db.Table("(?) as filtered_inventory", baseQuery).Select("COUNT(*)")
	if err := countQuery.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// 应用分页和排序
	baseQuery = r.applyPagination(baseQuery, filter)

	// 查询数据
	if err := baseQuery.Scan(&results).Error; err != nil {
		return nil, 0, err
	}

	return results, total, nil
}

// RecordIn 入库操作
func (r *inventoryRepository) RecordIn(req *models.InventoryInRequest, operatorID uint) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		// 获取或创建库存记录
		record, err := r.getOrCreateInventoryRecord(tx, req.SKUID, req.WarehouseID)
		if err != nil {
			return err
		}

		// 记录变动前的数量
		beforeQuantity := record.AvailableQuantity

		// 更新可用库存
		record.AvailableQuantity += req.Quantity
		now := time.Now()
		record.LastInDate = &now

		// 保存库存记录（BeforeSave hook会自动更新TotalQuantity）
		if err := tx.Save(record).Error; err != nil {
			return err
		}

		// 创建库存事务记录
		transaction := &models.InventoryTransaction{
			SKUID:           req.SKUID,
			WarehouseID:     req.WarehouseID,
			TransactionType: models.TransactionTypeIn,
			Quantity:        req.Quantity,
			BeforeQuantity:  beforeQuantity,
			AfterQuantity:   record.AvailableQuantity,
			OperatorID:      &operatorID,
			Reason:          req.Reason,
			ReferenceType:   req.ReferenceType,
			ReferenceID:     req.ReferenceID,
		}

		return tx.Create(transaction).Error
	})
}

// RecordOut 出库操作
func (r *inventoryRepository) RecordOut(req *models.InventoryOutRequest, operatorID uint) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		// 获取库存记录
		record, err := r.getInventoryRecord(tx, req.SKUID, req.WarehouseID)
		if err != nil {
			return err
		}

		// 检查库存是否充足
		if record.AvailableQuantity < req.Quantity {
			return errors.New("库存不足，无法出库")
		}

		// 记录变动前的数量
		beforeQuantity := record.AvailableQuantity

		// 更新可用库存
		record.AvailableQuantity -= req.Quantity
		now := time.Now()
		record.LastOutDate = &now

		// 保存库存记录
		if err := tx.Save(record).Error; err != nil {
			return err
		}

		// 创建库存事务记录
		transaction := &models.InventoryTransaction{
			SKUID:           req.SKUID,
			WarehouseID:     req.WarehouseID,
			TransactionType: models.TransactionTypeOut,
			Quantity:        -req.Quantity, // 负数表示减少
			BeforeQuantity:  beforeQuantity,
			AfterQuantity:   record.AvailableQuantity,
			OperatorID:      &operatorID,
			Reason:          req.Reason,
			ReferenceType:   req.ReferenceType,
			ReferenceID:     req.ReferenceID,
		}

		return tx.Create(transaction).Error
	})
}

// AdjustInventory 库存调整/盘点
func (r *inventoryRepository) AdjustInventory(req *models.InventoryAdjustRequest, operatorID uint) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		// 获取或创建库存记录
		record, err := r.getOrCreateInventoryRecord(tx, req.SKUID, req.WarehouseID)
		if err != nil {
			return err
		}

		// 记录变动前的数量
		beforeQuantity := record.AvailableQuantity

		// 计算差异
		difference := req.NewQuantity - beforeQuantity

		// 更新库存
		record.AvailableQuantity = req.NewQuantity
		now := time.Now()
		record.LastCheckDate = &now

		// 保存库存记录
		if err := tx.Save(record).Error; err != nil {
			return err
		}

		// 创建库存事务记录
		transaction := &models.InventoryTransaction{
			SKUID:           req.SKUID,
			WarehouseID:     req.WarehouseID,
			TransactionType: models.TransactionTypeAdjust,
			Quantity:        difference,
			BeforeQuantity:  beforeQuantity,
			AfterQuantity:   req.NewQuantity,
			OperatorID:      &operatorID,
			Reason:          req.Reason,
		}

		return tx.Create(transaction).Error
	})
}

// LockInventory 锁定库存（用于订单下单时）
func (r *inventoryRepository) LockInventory(req *models.InventoryLockRequest, operatorID uint) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		// 获取库存记录
		record, err := r.getInventoryRecord(tx, req.SKUID, req.WarehouseID)
		if err != nil {
			return err
		}

		// 检查可用库存是否充足
		if record.AvailableQuantity < req.Quantity {
			return errors.New("可用库存不足，无法锁定")
		}

		// 记录变动前的数量
		beforeAvailable := record.AvailableQuantity
		beforeLocked := record.LockedQuantity

		// 从可用库存转移到锁定库存
		record.AvailableQuantity -= req.Quantity
		record.LockedQuantity += req.Quantity

		// 保存库存记录
		if err := tx.Save(record).Error; err != nil {
			return err
		}

		// 创建库存事务记录（记录可用库存的减少）
		transaction := &models.InventoryTransaction{
			SKUID:           req.SKUID,
			WarehouseID:     req.WarehouseID,
			TransactionType: models.TransactionTypeLock,
			Quantity:        -req.Quantity,
			BeforeQuantity:  beforeAvailable,
			AfterQuantity:   record.AvailableQuantity,
			OperatorID:      &operatorID,
			Reason:          fmt.Sprintf("锁定库存 %d -> %d (锁定数: %d -> %d): %s", beforeAvailable, record.AvailableQuantity, beforeLocked, record.LockedQuantity, req.Reason),
			ReferenceType:   req.ReferenceType,
			ReferenceID:     req.ReferenceID,
		}

		return tx.Create(transaction).Error
	})
}

// UnlockInventory 解锁库存（用于订单取消时）
func (r *inventoryRepository) UnlockInventory(req *models.InventoryUnlockRequest, operatorID uint) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		// 获取库存记录
		record, err := r.getInventoryRecord(tx, req.SKUID, req.WarehouseID)
		if err != nil {
			return err
		}

		// 检查锁定库存是否充足
		if record.LockedQuantity < req.Quantity {
			return errors.New("锁定库存不足，无法解锁")
		}

		// 记录变动前的数量
		beforeAvailable := record.AvailableQuantity
		beforeLocked := record.LockedQuantity

		// 从锁定库存转移回可用库存
		record.LockedQuantity -= req.Quantity
		record.AvailableQuantity += req.Quantity

		// 保存库存记录
		if err := tx.Save(record).Error; err != nil {
			return err
		}

		// 创建库存事务记录（记录可用库存的增加）
		transaction := &models.InventoryTransaction{
			SKUID:           req.SKUID,
			WarehouseID:     req.WarehouseID,
			TransactionType: models.TransactionTypeUnlock,
			Quantity:        req.Quantity,
			BeforeQuantity:  beforeAvailable,
			AfterQuantity:   record.AvailableQuantity,
			OperatorID:      &operatorID,
			Reason:          fmt.Sprintf("解锁库存 %d -> %d (锁定数: %d -> %d): %s", beforeAvailable, record.AvailableQuantity, beforeLocked, record.LockedQuantity, req.Reason),
			ReferenceType:   req.ReferenceType,
			ReferenceID:     req.ReferenceID,
		}

		return tx.Create(transaction).Error
	})
}

// GetTransactionHistory 获取库存事务历史
func (r *inventoryRepository) GetTransactionHistory(filter *TransactionFilter) ([]models.InventoryTransactionResponse, int64, error) {
	var results []models.InventoryTransactionResponse
	var total int64

	// 构建基础查询
	baseQuery := r.db.Table("inventory_transactions it").
		Select(`
			it.id,
			it.sku_id,
			s.sku_code,
			s.name as sku_name,
			it.transaction_type,
			it.quantity,
			it.before_quantity,
			it.after_quantity,
			it.operator_id,
			u.username as operator_name,
			it.reason,
			it.reference_type,
			it.reference_id,
			it.created_at
		`).
		Joins("INNER JOIN skus s ON s.id = it.sku_id").
		Joins("LEFT JOIN users u ON u.id = it.operator_id")

	// 应用过滤器
	baseQuery = r.applyTransactionFilter(baseQuery, filter)

	// 统计总数
	countQuery := r.db.Table("(?) as filtered_transactions", baseQuery).Select("COUNT(*)")
	if err := countQuery.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// 应用分页和排序
	baseQuery = r.applyTransactionPagination(baseQuery, filter)

	// 查询数据
	if err := baseQuery.Scan(&results).Error; err != nil {
		return nil, 0, err
	}

	return results, total, nil
}

// GetTransactionByID 根据ID获取库存事务
func (r *inventoryRepository) GetTransactionByID(id uint) (*models.InventoryTransaction, error) {
	var transaction models.InventoryTransaction
	err := r.db.Where("id = ?", id).
		Preload("SKU").
		Preload("Operator").
		First(&transaction).Error

	if err != nil {
		return nil, err
	}

	return &transaction, nil
}

// HasSufficientStock 检查可用库存是否充足
func (r *inventoryRepository) HasSufficientStock(skuID uint, warehouseID *uint, quantity int) (bool, error) {
	record, err := r.GetInventoryBySKUID(skuID, warehouseID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return false, nil
		}
		return false, err
	}

	return record.AvailableQuantity >= quantity, nil
}

// HasSufficientLocked 检查锁定库存是否充足
func (r *inventoryRepository) HasSufficientLocked(skuID uint, warehouseID *uint, quantity int) (bool, error) {
	record, err := r.GetInventoryBySKUID(skuID, warehouseID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return false, nil
		}
		return false, err
	}

	return record.LockedQuantity >= quantity, nil
}

// getInventoryRecord 获取库存记录（内部使用，支持事务）
func (r *inventoryRepository) getInventoryRecord(tx *gorm.DB, skuID uint, warehouseID *uint) (*models.InventoryRecord, error) {
	var record models.InventoryRecord

	query := tx.Where("sku_id = ?", skuID)
	if warehouseID != nil {
		query = query.Where("warehouse_id = ?", *warehouseID)
	} else {
		query = query.Where("warehouse_id IS NULL")
	}

	err := query.First(&record).Error
	if err != nil {
		return nil, err
	}

	return &record, nil
}

// getOrCreateInventoryRecord 获取或创建库存记录（内部使用，支持事务）
func (r *inventoryRepository) getOrCreateInventoryRecord(tx *gorm.DB, skuID uint, warehouseID *uint) (*models.InventoryRecord, error) {
	record, err := r.getInventoryRecord(tx, skuID, warehouseID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// 创建新的库存记录
			record = &models.InventoryRecord{
				SKUID:             skuID,
				WarehouseID:       warehouseID,
				AvailableQuantity: 0,
				LockedQuantity:    0,
				TotalQuantity:     0,
			}
			if err := tx.Create(record).Error; err != nil {
				return nil, err
			}
			return record, nil
		}
		return nil, err
	}

	return record, nil
}

// applyInventoryFilter 应用库存过滤条件
func (r *inventoryRepository) applyInventoryFilter(query *gorm.DB, filter *InventoryFilter) *gorm.DB {
	if filter == nil {
		return query
	}

	// SKU ID过滤
	if filter.SKUID != nil {
		query = query.Where("ir.sku_id = ?", *filter.SKUID)
	}

	// SKU编码过滤
	if filter.SKUCode != "" {
		query = query.Where("s.sku_code = ?", filter.SKUCode)
	}

	// 仓库过滤
	if filter.WarehouseID != nil {
		query = query.Where("ir.warehouse_id = ?", *filter.WarehouseID)
	}

	// 低库存过滤
	if filter.IsLowStock {
		query = query.Where("ir.available_quantity <= s.alert_quantity")
	}

	// 缺货过滤
	if filter.IsOutOfStock {
		query = query.Where("ir.available_quantity = 0")
	}

	// 关键词搜索（SKU名称或编码）
	if filter.Keyword != "" {
		keyword := "%" + filter.Keyword + "%"
		query = query.Where("(s.name LIKE ? OR s.sku_code LIKE ?)", keyword, keyword)
	}

	return query
}

// applyTransactionFilter 应用事务过滤条件
func (r *inventoryRepository) applyTransactionFilter(query *gorm.DB, filter *TransactionFilter) *gorm.DB {
	if filter == nil {
		return query
	}

	// SKU ID过滤
	if filter.SKUID != nil {
		query = query.Where("it.sku_id = ?", *filter.SKUID)
	}

	// SKU编码过滤
	if filter.SKUCode != "" {
		query = query.Where("s.sku_code = ?", filter.SKUCode)
	}

	// 仓库过滤
	if filter.WarehouseID != nil {
		query = query.Where("it.warehouse_id = ?", *filter.WarehouseID)
	}

	// 事务类型过滤
	if filter.TransactionType != "" {
		query = query.Where("it.transaction_type = ?", filter.TransactionType)
	}

	// 操作人过滤
	if filter.OperatorID != nil {
		query = query.Where("it.operator_id = ?", *filter.OperatorID)
	}

	// 关联单据类型过滤
	if filter.ReferenceType != "" {
		query = query.Where("it.reference_type = ?", filter.ReferenceType)
	}

	// 关联单据ID过滤
	if filter.ReferenceID != nil {
		query = query.Where("it.reference_id = ?", *filter.ReferenceID)
	}

	// 日期范围过滤
	if filter.StartDate != nil {
		query = query.Where("it.created_at >= ?", *filter.StartDate)
	}
	if filter.EndDate != nil {
		query = query.Where("it.created_at <= ?", *filter.EndDate)
	}

	return query
}

// applyPagination 应用分页和排序（库存记录）
func (r *inventoryRepository) applyPagination(query *gorm.DB, filter *InventoryFilter) *gorm.DB {
	if filter == nil {
		return query
	}

	// 排序
	sortBy := "ir.updated_at"
	sortOrder := "DESC"

	if filter.SortBy != "" {
		switch filter.SortBy {
		case "sku_code":
			sortBy = "s.sku_code"
		case "sku_name":
			sortBy = "s.name"
		case "available":
			sortBy = "ir.available_quantity"
		case "locked":
			sortBy = "ir.locked_quantity"
		case "total":
			sortBy = "ir.total_quantity"
		case "updated_at":
			sortBy = "ir.updated_at"
		}
	}

	if filter.SortOrder == "asc" {
		sortOrder = "ASC"
	}

	query = query.Order(fmt.Sprintf("%s %s", sortBy, sortOrder))

	// 分页
	if filter.Page > 0 && filter.PageSize > 0 {
		offset := (filter.Page - 1) * filter.PageSize
		query = query.Offset(offset).Limit(filter.PageSize)
	}

	return query
}

// applyTransactionPagination 应用分页和排序（库存事务）
func (r *inventoryRepository) applyTransactionPagination(query *gorm.DB, filter *TransactionFilter) *gorm.DB {
	if filter == nil {
		return query
	}

	// 排序
	sortBy := "it.created_at"
	sortOrder := "DESC"

	if filter.SortBy != "" {
		switch filter.SortBy {
		case "sku_code":
			sortBy = "s.sku_code"
		case "type":
			sortBy = "it.transaction_type"
		case "quantity":
			sortBy = "it.quantity"
		case "created_at":
			sortBy = "it.created_at"
		}
	}

	if filter.SortOrder == "asc" {
		sortOrder = "ASC"
	}

	query = query.Order(fmt.Sprintf("%s %s", sortBy, sortOrder))

	// 分页
	if filter.Page > 0 && filter.PageSize > 0 {
		offset := (filter.Page - 1) * filter.PageSize
		query = query.Offset(offset).Limit(filter.PageSize)
	}

	return query
}
