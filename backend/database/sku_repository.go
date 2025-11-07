package database

import (
	"fmt"

	"ai-project-backend/models"

	"gorm.io/gorm"
)

// SKURepository SKU数据访问层接口
type SKURepository interface {
	// CRUD操作
	Create(sku *models.SKU) error
	BatchCreate(skus []models.SKU) error
	GetByID(id uint) (*models.SKU, error)
	GetByCode(code string) (*models.SKU, error)
	Update(sku *models.SKU) error
	BatchUpdate(updates []models.SKUUpdateItem) error
	Delete(id uint) error
	SoftDelete(id uint) error

	// 查询操作
	List(filter *SKUFilter) ([]models.SKU, int64, error)
	ListBySPUID(spuID uint) ([]models.SKU, error)
	ListWithDetails(filter *SKUFilter) ([]models.SKUListResponse, int64, error)

	// 验证操作
	ExistsByCode(code string, excludeID uint) (bool, error)
	ExistsByID(id uint) (bool, error)
	ExistsBySPUID(spuID uint) (bool, error)
}

// SKUFilter SKU查询过滤器
type SKUFilter struct {
	SPUID      *uint
	Status     string
	IsLowStock bool   // 是否低库存
	Keyword    string // SKU名称或编码搜索
	Page       int
	PageSize   int
	SortBy     string
	SortOrder  string
}

// skuRepository SKU Repository实现
type skuRepository struct {
	db *gorm.DB
}

// NewSKURepository 创建SKU Repository
func NewSKURepository(db *gorm.DB) SKURepository {
	return &skuRepository{db: db}
}

// Create 创建SKU
func (r *skuRepository) Create(sku *models.SKU) error {
	return r.db.Create(sku).Error
}

// BatchCreate 批量创建SKU
func (r *skuRepository) BatchCreate(skus []models.SKU) error {
	if len(skus) == 0 {
		return nil
	}

	// 使用事务批量创建
	return r.db.Transaction(func(tx *gorm.DB) error {
		// 批量插入（GORM会自动处理）
		return tx.Create(&skus).Error
	})
}

// GetByID 根据ID获取SKU
func (r *skuRepository) GetByID(id uint) (*models.SKU, error) {
	var sku models.SKU
	err := r.db.Where("id = ?", id).
		Preload("SPU").
		First(&sku).Error

	if err != nil {
		return nil, err
	}

	return &sku, nil
}

// GetByCode 根据SKU编码获取
func (r *skuRepository) GetByCode(code string) (*models.SKU, error) {
	var sku models.SKU
	err := r.db.Where("sku_code = ?", code).
		Preload("SPU").
		First(&sku).Error

	if err != nil {
		return nil, err
	}

	return &sku, nil
}

// Update 更新SKU
func (r *skuRepository) Update(sku *models.SKU) error {
	return r.db.Save(sku).Error
}

// BatchUpdate 批量更新SKU
func (r *skuRepository) BatchUpdate(updates []models.SKUUpdateItem) error {
	if len(updates) == 0 {
		return nil
	}

	return r.db.Transaction(func(tx *gorm.DB) error {
		for _, update := range updates {
			// 构建更新map
			updateMap := make(map[string]interface{})

			if update.Price != nil {
				updateMap["price"] = *update.Price
			}
			if update.CostPrice != nil {
				updateMap["cost_price"] = *update.CostPrice
			}
			if update.MarketPrice != nil {
				updateMap["market_price"] = *update.MarketPrice
			}
			if update.StockQuantity != nil {
				updateMap["stock_quantity"] = *update.StockQuantity
			}
			if update.AlertQuantity != nil {
				updateMap["alert_quantity"] = *update.AlertQuantity
			}
			if update.Status != nil {
				updateMap["status"] = *update.Status
			}
			if update.Attributes != nil && len(update.Attributes) > 0 {
				updateMap["attributes"] = update.Attributes
			}

			if len(updateMap) > 0 {
				if err := tx.Model(&models.SKU{}).Where("id = ?", update.ID).Updates(updateMap).Error; err != nil {
					return err
				}
			}
		}

		return nil
	})
}

// Delete 硬删除SKU
func (r *skuRepository) Delete(id uint) error {
	return r.db.Unscoped().Delete(&models.SKU{}, id).Error
}

// SoftDelete 软删除SKU
func (r *skuRepository) SoftDelete(id uint) error {
	return r.db.Delete(&models.SKU{}, id).Error
}

// List 获取SKU列表
func (r *skuRepository) List(filter *SKUFilter) ([]models.SKU, int64, error) {
	var skus []models.SKU
	var total int64

	query := r.db.Model(&models.SKU{})

	// 应用过滤器
	query = r.applyFilter(query, filter)

	// 统计总数
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// 应用分页和排序
	query = r.applyPagination(query, filter)

	// 预加载SPU信息
	query = query.Preload("SPU")

	// 查询数据
	if err := query.Find(&skus).Error; err != nil {
		return nil, 0, err
	}

	return skus, total, nil
}

// ListBySPUID 根据SPU ID获取所有SKU
func (r *skuRepository) ListBySPUID(spuID uint) ([]models.SKU, error) {
	var skus []models.SKU
	err := r.db.Where("spu_id = ?", spuID).
		Order("created_at ASC").
		Find(&skus).Error

	return skus, err
}

// ListWithDetails 获取SKU列表（包含详细信息）
func (r *skuRepository) ListWithDetails(filter *SKUFilter) ([]models.SKUListResponse, int64, error) {
	var results []models.SKUListResponse
	var total int64

	// 构建基础查询
	baseQuery := r.db.Table("skus").
		Select(`
			skus.id,
			skus.sku_code,
			skus.spu_id,
			skus.name,
			skus.price,
			skus.stock_quantity,
			skus.attributes,
			skus.status,
			skus.alert_quantity,
			skus.created_at,
			spus.name as spu_name,
			CASE WHEN skus.stock_quantity <= skus.alert_quantity THEN true ELSE false END as is_low_stock
		`).
		Joins("LEFT JOIN spus ON spus.id = skus.spu_id").
		Where("skus.deleted_at IS NULL")

	// 应用过滤器（不包括分页）
	baseQuery = r.applyFilter(baseQuery, filter)

	// 统计总数
	countQuery := r.db.Table("(?) as filtered_skus", baseQuery).Select("COUNT(*)")
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

// ExistsByCode 检查SKU编码是否已存在
func (r *skuRepository) ExistsByCode(code string, excludeID uint) (bool, error) {
	var count int64

	query := r.db.Model(&models.SKU{}).Where("sku_code = ?", code)

	if excludeID > 0 {
		query = query.Where("id != ?", excludeID)
	}

	err := query.Count(&count).Error
	return count > 0, err
}

// ExistsByID 检查SKU是否存在
func (r *skuRepository) ExistsByID(id uint) (bool, error) {
	var count int64
	err := r.db.Model(&models.SKU{}).Where("id = ?", id).Count(&count).Error
	return count > 0, err
}

// ExistsBySPUID 检查SPU下是否有SKU
func (r *skuRepository) ExistsBySPUID(spuID uint) (bool, error) {
	var count int64
	err := r.db.Model(&models.SKU{}).Where("spu_id = ?", spuID).Count(&count).Error
	return count > 0, err
}

// applyFilter 应用过滤条件
func (r *skuRepository) applyFilter(query *gorm.DB, filter *SKUFilter) *gorm.DB {
	if filter == nil {
		return query
	}

	// SPU过滤
	if filter.SPUID != nil {
		query = query.Where("skus.spu_id = ?", *filter.SPUID)
	}

	// 状态过滤
	if filter.Status != "" {
		query = query.Where("skus.status = ?", filter.Status)
	}

	// 低库存过滤
	if filter.IsLowStock {
		query = query.Where("skus.stock_quantity <= skus.alert_quantity")
	}

	// 关键词搜索（SKU名称或编码）
	if filter.Keyword != "" {
		keyword := "%" + filter.Keyword + "%"
		query = query.Where("(skus.name LIKE ? OR skus.sku_code LIKE ?)", keyword, keyword)
	}

	return query
}

// applyPagination 应用分页和排序
func (r *skuRepository) applyPagination(query *gorm.DB, filter *SKUFilter) *gorm.DB {
	if filter == nil {
		return query
	}

	// 排序
	sortBy := "skus.created_at"
	sortOrder := "DESC"

	if filter.SortBy != "" {
		switch filter.SortBy {
		case "name":
			sortBy = "skus.name"
		case "price":
			sortBy = "skus.price"
		case "stock":
			sortBy = "skus.stock_quantity"
		case "created_at":
			sortBy = "skus.created_at"
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
