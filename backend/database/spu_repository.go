package database

import (
	"fmt"

	"ai-project-backend/models"

	"gorm.io/gorm"
)

// SPURepository SPU数据访问层接口
type SPURepository interface {
	// CRUD操作
	Create(spu *models.SPU) error
	GetByID(id uint) (*models.SPU, error)
	GetByCode(code string) (*models.SPU, error)
	Update(spu *models.SPU) error
	Delete(id uint) error
	SoftDelete(id uint) error

	// 查询操作
	List(enterpriseID uint, filter *SPUFilter) ([]models.SPU, int64, error)
	ListWithSKUCount(enterpriseID uint, filter *SPUFilter) ([]models.SPUListResponse, int64, error)
	GetDetailByID(id uint) (*models.SPUDetailResponse, error)

	// 验证操作
	ExistsByCode(code string, excludeID uint) (bool, error)
	ExistsByID(id uint) (bool, error)
}

// SPUFilter SPU查询过滤器
type SPUFilter struct {
	Status     string
	CategoryID *uint
	Brand      string
	Keyword    string // 名称搜索
	Page       int
	PageSize   int
	SortBy     string // 排序字段：created_at, name
	SortOrder  string // 排序方向：asc, desc
}

// spuRepository SPU Repository实现
type spuRepository struct {
	db *gorm.DB
}

// NewSPURepository 创建SPU Repository
func NewSPURepository(db *gorm.DB) SPURepository {
	return &spuRepository{db: db}
}

// Create 创建SPU
func (r *spuRepository) Create(spu *models.SPU) error {
	return r.db.Create(spu).Error
}

// GetByID 根据ID获取SPU
func (r *spuRepository) GetByID(id uint) (*models.SPU, error) {
	var spu models.SPU
	err := r.db.Where("id = ?", id).
		Preload("SKUs").
		First(&spu).Error

	if err != nil {
		return nil, err
	}

	return &spu, nil
}

// GetByCode 根据SPU编码获取
func (r *spuRepository) GetByCode(code string) (*models.SPU, error) {
	var spu models.SPU
	err := r.db.Where("spu_code = ?", code).First(&spu).Error

	if err != nil {
		return nil, err
	}

	return &spu, nil
}

// Update 更新SPU
func (r *spuRepository) Update(spu *models.SPU) error {
	return r.db.Save(spu).Error
}

// Delete 硬删除SPU
func (r *spuRepository) Delete(id uint) error {
	return r.db.Unscoped().Delete(&models.SPU{}, id).Error
}

// SoftDelete 软删除SPU
func (r *spuRepository) SoftDelete(id uint) error {
	return r.db.Delete(&models.SPU{}, id).Error
}

// List 获取SPU列表
func (r *spuRepository) List(enterpriseID uint, filter *SPUFilter) ([]models.SPU, int64, error) {
	var spus []models.SPU
	var total int64

	query := r.db.Model(&models.SPU{}).Where("enterprise_id = ?", enterpriseID)

	// 应用过滤器
	query = r.applyFilter(query, filter)

	// 统计总数
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// 应用分页和排序
	query = r.applyPagination(query, filter)

	// 查询数据
	if err := query.Find(&spus).Error; err != nil {
		return nil, 0, err
	}

	return spus, total, nil
}

// ListWithSKUCount 获取SPU列表（包含SKU数量和库存统计）
func (r *spuRepository) ListWithSKUCount(enterpriseID uint, filter *SPUFilter) ([]models.SPUListResponse, int64, error) {
	var results []models.SPUListResponse
	var total int64

	// 构建基础查询
	baseQuery := r.db.Table("spus").
		Select(`
			spus.id,
			spus.spu_code,
			spus.name,
			spus.brand,
			spus.main_image,
			spus.status,
			spus.created_at,
			COALESCE(COUNT(DISTINCT skus.id), 0) as sku_count,
			COALESCE(SUM(skus.stock_quantity), 0) as total_stock
		`).
		Joins("LEFT JOIN skus ON skus.spu_id = spus.id AND skus.deleted_at IS NULL").
		Where("spus.enterprise_id = ? AND spus.deleted_at IS NULL", enterpriseID).
		Group("spus.id")

	// 应用过滤器（不包括分页）
	baseQuery = r.applyFilter(baseQuery, filter)

	// 统计总数（使用子查询）
	countQuery := r.db.Table("(?) as filtered_spus", baseQuery).Select("COUNT(*)")
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

// GetDetailByID 获取SPU详情（包含统计信息）
func (r *spuRepository) GetDetailByID(id uint) (*models.SPUDetailResponse, error) {
	var result models.SPUDetailResponse

	// 先获取SPU基本信息
	if err := r.db.Where("id = ?", id).First(&result.SPU).Error; err != nil {
		return nil, err
	}

	// 统计SKU数量和总库存
	var stats struct {
		SKUCount   int64
		TotalStock int64
	}

	err := r.db.Table("skus").
		Select("COUNT(*) as sku_count, COALESCE(SUM(stock_quantity), 0) as total_stock").
		Where("spu_id = ? AND deleted_at IS NULL", id).
		Scan(&stats).Error

	if err != nil {
		return nil, err
	}

	result.SKUCount = stats.SKUCount
	result.TotalStock = stats.TotalStock

	return &result, nil
}

// ExistsByCode 检查SPU编码是否已存在
func (r *spuRepository) ExistsByCode(code string, excludeID uint) (bool, error) {
	var count int64

	query := r.db.Model(&models.SPU{}).Where("spu_code = ?", code)

	if excludeID > 0 {
		query = query.Where("id != ?", excludeID)
	}

	err := query.Count(&count).Error
	return count > 0, err
}

// ExistsByID 检查SPU是否存在
func (r *spuRepository) ExistsByID(id uint) (bool, error) {
	var count int64
	err := r.db.Model(&models.SPU{}).Where("id = ?", id).Count(&count).Error
	return count > 0, err
}

// applyFilter 应用过滤条件
func (r *spuRepository) applyFilter(query *gorm.DB, filter *SPUFilter) *gorm.DB {
	if filter == nil {
		return query
	}

	// 状态过滤
	if filter.Status != "" {
		query = query.Where("spus.status = ?", filter.Status)
	}

	// 类目过滤
	if filter.CategoryID != nil {
		query = query.Where("spus.category_id = ?", *filter.CategoryID)
	}

	// 品牌过滤
	if filter.Brand != "" {
		query = query.Where("spus.brand = ?", filter.Brand)
	}

	// 关键词搜索（名称）
	if filter.Keyword != "" {
		keyword := "%" + filter.Keyword + "%"
		query = query.Where("spus.name LIKE ?", keyword)
	}

	return query
}

// applyPagination 应用分页和排序
func (r *spuRepository) applyPagination(query *gorm.DB, filter *SPUFilter) *gorm.DB {
	if filter == nil {
		return query
	}

	// 排序
	sortBy := "spus.created_at"
	sortOrder := "DESC"

	if filter.SortBy != "" {
		switch filter.SortBy {
		case "name":
			sortBy = "spus.name"
		case "created_at":
			sortBy = "spus.created_at"
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
