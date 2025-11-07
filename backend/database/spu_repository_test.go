package database

import (
	"ai-project-backend/models"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/schema"
)

// setupSPUTestDB 设置测试用的内存数据库
func setupSPUTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		NamingStrategy: schema.NamingStrategy{
			SingularTable: false,
		},
	})
	require.NoError(t, err)

	// 自动迁移表结构
	err = db.AutoMigrate(&models.SPU{}, &models.SKU{})
	require.NoError(t, err)

	return db
}

func TestSPURepository_Create(t *testing.T) {
	db := setupSPUTestDB(t)
	repo := NewSPURepository(db)

	spu := &models.SPU{
		SPUCode:      "SPU-TEST-001",
		Name:         "测试商品",
		EnterpriseID: 1,
		Brand:        "测试品牌",
		Description:  "测试描述",
		Status:       "active",
		Images:       []string{"image1.jpg", "image2.jpg"},
		Specifications: map[string]interface{}{
			"color": "red",
			"size":  "L",
		},
	}

	err := repo.Create(spu)
	assert.NoError(t, err)
	assert.NotZero(t, spu.ID)
	assert.Equal(t, "SPU-TEST-001", spu.SPUCode)
	assert.Equal(t, "测试商品", spu.Name)
}

func TestSPURepository_GetByID(t *testing.T) {
	db := setupSPUTestDB(t)
	repo := NewSPURepository(db)

	// 先创建一个SPU
	spu := &models.SPU{
		SPUCode:      "SPU-TEST-002",
		Name:         "测试商品2",
		EnterpriseID: 1,
		Status:       "active",
	}
	err := repo.Create(spu)
	require.NoError(t, err)

	// 测试获取
	found, err := repo.GetByID(spu.ID)
	assert.NoError(t, err)
	assert.NotNil(t, found)
	assert.Equal(t, spu.ID, found.ID)
	assert.Equal(t, "SPU-TEST-002", found.SPUCode)
	assert.Equal(t, "测试商品2", found.Name)

	// 测试不存在的ID
	notFound, err := repo.GetByID(9999)
	assert.Error(t, err)
	assert.Nil(t, notFound)
}

func TestSPURepository_GetByCode(t *testing.T) {
	db := setupSPUTestDB(t)
	repo := NewSPURepository(db)

	// 先创建一个SPU
	spu := &models.SPU{
		SPUCode:      "SPU-UNIQUE-001",
		Name:         "唯一编码商品",
		EnterpriseID: 1,
		Status:       "active",
	}
	err := repo.Create(spu)
	require.NoError(t, err)

	// 测试根据编码获取
	found, err := repo.GetByCode("SPU-UNIQUE-001")
	assert.NoError(t, err)
	assert.NotNil(t, found)
	assert.Equal(t, "SPU-UNIQUE-001", found.SPUCode)

	// 测试不存在的编码
	notFound, err := repo.GetByCode("SPU-NOT-EXIST")
	assert.Error(t, err)
	assert.Nil(t, notFound)
}

func TestSPURepository_Update(t *testing.T) {
	db := setupSPUTestDB(t)
	repo := NewSPURepository(db)

	// 创建SPU
	spu := &models.SPU{
		SPUCode:      "SPU-UPDATE-001",
		Name:         "原始名称",
		EnterpriseID: 1,
		Brand:        "原始品牌",
		Status:       "draft",
	}
	err := repo.Create(spu)
	require.NoError(t, err)

	// 更新SPU
	spu.Name = "更新后的名称"
	spu.Brand = "更新后的品牌"
	spu.Status = "active"
	err = repo.Update(spu)
	assert.NoError(t, err)

	// 验证更新
	updated, err := repo.GetByID(spu.ID)
	assert.NoError(t, err)
	assert.Equal(t, "更新后的名称", updated.Name)
	assert.Equal(t, "更新后的品牌", updated.Brand)
	assert.Equal(t, "active", updated.Status)
}

func TestSPURepository_SoftDelete(t *testing.T) {
	db := setupSPUTestDB(t)
	repo := NewSPURepository(db)

	// 创建SPU
	spu := &models.SPU{
		SPUCode:      "SPU-DELETE-001",
		Name:         "待删除商品",
		EnterpriseID: 1,
		Status:       "active",
	}
	err := repo.Create(spu)
	require.NoError(t, err)

	// 软删除
	err = repo.SoftDelete(spu.ID)
	assert.NoError(t, err)

	// 验证无法通过正常查询获取
	found, err := repo.GetByID(spu.ID)
	assert.Error(t, err)
	assert.Nil(t, found)

	// 验证在数据库中仍然存在（通过Unscoped查询）
	var deleted models.SPU
	err = db.Unscoped().Where("id = ?", spu.ID).First(&deleted).Error
	assert.NoError(t, err)
	assert.NotNil(t, deleted.DeletedAt)
}

func TestSPURepository_List(t *testing.T) {
	db := setupSPUTestDB(t)
	repo := NewSPURepository(db)

	// 创建多个SPU
	spus := []models.SPU{
		{SPUCode: "SPU-LIST-001", Name: "商品A", EnterpriseID: 1, Brand: "品牌A", Status: "active"},
		{SPUCode: "SPU-LIST-002", Name: "商品B", EnterpriseID: 1, Brand: "品牌B", Status: "active"},
		{SPUCode: "SPU-LIST-003", Name: "商品C", EnterpriseID: 1, Brand: "品牌A", Status: "draft"},
		{SPUCode: "SPU-LIST-004", Name: "商品D", EnterpriseID: 2, Brand: "品牌C", Status: "active"},
	}

	for i := range spus {
		err := repo.Create(&spus[i])
		require.NoError(t, err)
	}

	// 测试：获取企业1的所有SPU
	filter := &SPUFilter{
		Page:     1,
		PageSize: 10,
	}
	list, total, err := repo.List(1, filter)
	assert.NoError(t, err)
	assert.Equal(t, int64(3), total) // 企业1有3个SPU
	assert.Len(t, list, 3)

	// 测试：按状态过滤
	filter.Status = "active"
	activeList, activeTotal, err := repo.List(1, filter)
	assert.NoError(t, err)
	assert.Equal(t, int64(2), activeTotal)
	assert.Len(t, activeList, 2)

	// 测试：按品牌过滤
	filter.Status = ""
	filter.Brand = "品牌A"
	brandList, brandTotal, err := repo.List(1, filter)
	assert.NoError(t, err)
	assert.Equal(t, int64(2), brandTotal)
	assert.Len(t, brandList, 2)

	// 测试：关键词搜索
	filter.Brand = ""
	filter.Keyword = "商品B"
	searchList, searchTotal, err := repo.List(1, filter)
	assert.NoError(t, err)
	assert.Equal(t, int64(1), searchTotal)
	assert.Len(t, searchList, 1)
	assert.Equal(t, "商品B", searchList[0].Name)

	// 测试：分页
	filter = &SPUFilter{
		Page:     1,
		PageSize: 2,
	}
	pagedList, pagedTotal, err := repo.List(1, filter)
	assert.NoError(t, err)
	assert.Equal(t, int64(3), pagedTotal)
	assert.Len(t, pagedList, 2) // 只返回2条
}

func TestSPURepository_ListWithSKUCount(t *testing.T) {
	db := setupSPUTestDB(t)
	repo := NewSPURepository(db)

	// 创建SPU
	spu := &models.SPU{
		SPUCode:      "SPU-COUNT-001",
		Name:         "商品含SKU",
		EnterpriseID: 1,
		Status:       "active",
	}
	err := repo.Create(spu)
	require.NoError(t, err)

	// 创建关联的SKU
	skus := []models.SKU{
		{SKUCode: "SKU-001", SPUID: spu.ID, Name: "规格1", Price: 100.00, Status: "active"},
		{SKUCode: "SKU-002", SPUID: spu.ID, Name: "规格2", Price: 200.00, Status: "active"},
	}
	for i := range skus {
		err := db.Create(&skus[i]).Error
		require.NoError(t, err)
	}

	// 获取带SKU数量的列表
	filter := &SPUFilter{
		Page:     1,
		PageSize: 10,
	}
	list, total, err := repo.ListWithSKUCount(1, filter)
	assert.NoError(t, err)
	assert.Equal(t, int64(1), total)
	assert.Len(t, list, 1)
	assert.Equal(t, int64(2), list[0].SKUCount) // 有2个SKU
}

func TestSPURepository_ExistsByCode(t *testing.T) {
	db := setupSPUTestDB(t)
	repo := NewSPURepository(db)

	// 创建SPU
	spu := &models.SPU{
		SPUCode:      "SPU-EXISTS-001",
		Name:         "存在性检查商品",
		EnterpriseID: 1,
		Status:       "active",
	}
	err := repo.Create(spu)
	require.NoError(t, err)

	// 测试存在的编码
	exists, err := repo.ExistsByCode("SPU-EXISTS-001", 0)
	assert.NoError(t, err)
	assert.True(t, exists)

	// 测试不存在的编码
	notExists, err := repo.ExistsByCode("SPU-NOT-EXISTS", 0)
	assert.NoError(t, err)
	assert.False(t, notExists)

	// 测试排除自身的检查
	existsExcludeSelf, err := repo.ExistsByCode("SPU-EXISTS-001", spu.ID)
	assert.NoError(t, err)
	assert.False(t, existsExcludeSelf)
}

func TestSPURepository_ExistsByID(t *testing.T) {
	db := setupSPUTestDB(t)
	repo := NewSPURepository(db)

	// 创建SPU
	spu := &models.SPU{
		SPUCode:      "SPU-ID-EXISTS-001",
		Name:         "ID存在性检查商品",
		EnterpriseID: 1,
		Status:       "active",
	}
	err := repo.Create(spu)
	require.NoError(t, err)

	// 测试存在的ID
	exists, err := repo.ExistsByID(spu.ID)
	assert.NoError(t, err)
	assert.True(t, exists)

	// 测试不存在的ID
	notExists, err := repo.ExistsByID(9999)
	assert.NoError(t, err)
	assert.False(t, notExists)
}

func TestSPURepository_GetDetailByID(t *testing.T) {
	db := setupSPUTestDB(t)
	repo := NewSPURepository(db)

	// 创建SPU
	spu := &models.SPU{
		SPUCode:      "SPU-DETAIL-001",
		Name:         "详情测试商品",
		EnterpriseID: 1,
		Brand:        "测试品牌",
		Status:       "active",
	}
	err := repo.Create(spu)
	require.NoError(t, err)

	// 创建SKU
	sku := &models.SKU{
		SKUCode: "SKU-DETAIL-001",
		SPUID:   spu.ID,
		Name:    "测试规格",
		Price:   99.99,
		Status:  "active",
	}
	err = db.Create(sku).Error
	require.NoError(t, err)

	// 获取详情
	detail, err := repo.GetDetailByID(spu.ID)
	assert.NoError(t, err)
	assert.NotNil(t, detail)
	assert.Equal(t, spu.ID, detail.ID)
	assert.Equal(t, "SPU-DETAIL-001", detail.SPUCode)
	assert.Equal(t, int64(1), detail.SKUCount)
}

func TestSPURepository_Delete(t *testing.T) {
	db := setupSPUTestDB(t)
	repo := NewSPURepository(db)

	// 创建SPU
	spu := &models.SPU{
		SPUCode:      "SPU-HARD-DELETE-001",
		Name:         "硬删除商品",
		EnterpriseID: 1,
		Status:       "active",
	}
	err := repo.Create(spu)
	require.NoError(t, err)

	// 硬删除
	err = repo.Delete(spu.ID)
	assert.NoError(t, err)

	// 验证完全删除（连Unscoped也查不到）
	var count int64
	db.Unscoped().Model(&models.SPU{}).Where("id = ?", spu.ID).Count(&count)
	assert.Equal(t, int64(0), count)
}
