package database

import (
	"ai-project-backend/models"
	"fmt"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/schema"
)

// Helper function to create float64 pointer
func floatPtr(f float64) *float64 {
	return &f
}

// Helper function to create int pointer
func intPtr(i int) *int {
	return &i
}

// Note: stringPtr already exists in document_repository.go

// setupSKUTestDB 设置测试用的内存数据库
func setupSKUTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		NamingStrategy: schema.NamingStrategy{
			SingularTable: false,
		},
	})
	require.NoError(t, err)

	// 自动迁移表结构
	err = db.AutoMigrate(&models.SPU{}, &models.SKU{}, &models.InventoryRecord{})
	require.NoError(t, err)

	return db
}

func TestSKURepository_Create(t *testing.T) {
	db := setupSKUTestDB(t)
	repo := NewSKURepository(db)

	// 先创建SPU
	spu := &models.SPU{
		SPUCode:      "SPU-SKU-TEST-001",
		Name:         "测试商品",
		EnterpriseID: 1,
		Status:       "active",
	}
	err := db.Create(spu).Error
	require.NoError(t, err)

	// 创建SKU
	sku := &models.SKU{
		SKUCode:    "SKU-TEST-001",
		SPUID:      spu.ID,
		Name:       "红色-L码",
		Price:      199.99,
		CostPrice:  floatPtr(100.00),
		Status:     "active",
		Attributes: models.SKUAttributes{"color": "red", "size": "L"},
	}

	err = repo.Create(sku)
	assert.NoError(t, err)
	assert.NotZero(t, sku.ID)
	assert.Equal(t, "SKU-TEST-001", sku.SKUCode)
	assert.Equal(t, spu.ID, sku.SPUID)
}

func TestSKURepository_GetByID(t *testing.T) {
	db := setupSKUTestDB(t)
	repo := NewSKURepository(db)

	// 创建SPU和SKU
	spu := &models.SPU{SPUCode: "SPU-002", Name: "商品", EnterpriseID: 1, Status: "active"}
	db.Create(spu)

	sku := &models.SKU{
		SKUCode: "SKU-GET-001",
		SPUID:   spu.ID,
		Name:    "规格A",
		Price:   99.99,
		Status:  "active",
	}
	err := repo.Create(sku)
	require.NoError(t, err)

	// 测试获取
	found, err := repo.GetByID(sku.ID)
	assert.NoError(t, err)
	assert.NotNil(t, found)
	assert.Equal(t, sku.ID, found.ID)
	assert.Equal(t, "SKU-GET-001", found.SKUCode)

	// 测试不存在的ID
	notFound, err := repo.GetByID(9999)
	assert.Error(t, err)
	assert.Nil(t, notFound)
}

func TestSKURepository_GetByCode(t *testing.T) {
	db := setupSKUTestDB(t)
	repo := NewSKURepository(db)

	// 创建SKU
	spu := &models.SPU{SPUCode: "SPU-003", Name: "商品", EnterpriseID: 1, Status: "active"}
	db.Create(spu)

	sku := &models.SKU{
		SKUCode: "SKU-UNIQUE-CODE",
		SPUID:   spu.ID,
		Name:    "唯一编码规格",
		Price:   199.99,
		Status:  "active",
	}
	err := repo.Create(sku)
	require.NoError(t, err)

	// 测试根据编码获取
	found, err := repo.GetByCode("SKU-UNIQUE-CODE")
	assert.NoError(t, err)
	assert.NotNil(t, found)
	assert.Equal(t, "SKU-UNIQUE-CODE", found.SKUCode)

	// 测试不存在的编码
	notFound, err := repo.GetByCode("SKU-NOT-EXIST")
	assert.Error(t, err)
	assert.Nil(t, notFound)
}

func TestSKURepository_Update(t *testing.T) {
	db := setupSKUTestDB(t)
	repo := NewSKURepository(db)

	// 创建SKU
	spu := &models.SPU{SPUCode: "SPU-004", Name: "商品", EnterpriseID: 1, Status: "active"}
	db.Create(spu)

	sku := &models.SKU{
		SKUCode:   "SKU-UPDATE-001",
		SPUID:     spu.ID,
		Name:      "原始名称",
		Price:     100.00,
		CostPrice: floatPtr(50.00),
		Status:    "draft",
	}
	err := repo.Create(sku)
	require.NoError(t, err)

	// 更新SKU
	sku.Name = "更新后名称"
	sku.Price = 150.00
	sku.Status = "active"
	err = repo.Update(sku)
	assert.NoError(t, err)

	// 验证更新
	updated, err := repo.GetByID(sku.ID)
	assert.NoError(t, err)
	assert.Equal(t, "更新后名称", updated.Name)
	assert.Equal(t, 150.00, updated.Price)
	assert.Equal(t, "active", updated.Status)
}

func TestSKURepository_SoftDelete(t *testing.T) {
	db := setupSKUTestDB(t)
	repo := NewSKURepository(db)

	// 创建SKU
	spu := &models.SPU{SPUCode: "SPU-005", Name: "商品", EnterpriseID: 1, Status: "active"}
	db.Create(spu)

	sku := &models.SKU{
		SKUCode: "SKU-DELETE-001",
		SPUID:   spu.ID,
		Name:    "待删除规格",
		Price:   99.99,
		Status:  "active",
	}
	err := repo.Create(sku)
	require.NoError(t, err)

	// 软删除
	err = repo.SoftDelete(sku.ID)
	assert.NoError(t, err)

	// 验证无法通过正常查询获取
	found, err := repo.GetByID(sku.ID)
	assert.Error(t, err)
	assert.Nil(t, found)
}

func TestSKURepository_List(t *testing.T) {
	db := setupSKUTestDB(t)
	repo := NewSKURepository(db)

	// 创建SPU
	spu := &models.SPU{SPUCode: "SPU-LIST-001", Name: "商品", EnterpriseID: 1, Status: "active"}
	db.Create(spu)

	// 创建多个SKU
	skus := []models.SKU{
		{SKUCode: "SKU-LIST-001", SPUID: spu.ID, Name: "红色-L", Price: 100.00, Status: "active"},
		{SKUCode: "SKU-LIST-002", SPUID: spu.ID, Name: "蓝色-M", Price: 150.00, Status: "active"},
		{SKUCode: "SKU-LIST-003", SPUID: spu.ID, Name: "绿色-S", Price: 80.00, Status: "draft"},
	}
	for i := range skus {
		err := repo.Create(&skus[i])
		require.NoError(t, err)
	}

	// 测试：获取所有SKU
	filter := &SKUFilter{Page: 1, PageSize: 10}
	list, total, err := repo.List(filter)
	assert.NoError(t, err)
	assert.Equal(t, int64(3), total)
	assert.Len(t, list, 3)

	// 测试：按状态过滤
	filter.Status = "active"
	list, total, err = repo.List(filter)
	assert.NoError(t, err)
	assert.Equal(t, int64(2), total)
	assert.Len(t, list, 2)

	// 测试：按SPU ID过滤
	filter = &SKUFilter{SPUID: &spu.ID, Page: 1, PageSize: 10}
	list, total, err = repo.List(filter)
	assert.NoError(t, err)
	assert.Equal(t, int64(3), total)
	assert.Len(t, list, 3)

	// 测试：关键词搜索
	filter = &SKUFilter{Keyword: "红色", Page: 1, PageSize: 10}
	list, total, err = repo.List(filter)
	assert.NoError(t, err)
	assert.Equal(t, int64(1), total)
	assert.Len(t, list, 1)
	assert.Equal(t, "SKU-LIST-001", list[0].SKUCode)
}

func TestSKURepository_ListBySPUID(t *testing.T) {
	db := setupSKUTestDB(t)
	repo := NewSKURepository(db)

	// 创建两个SPU
	spu1 := &models.SPU{SPUCode: "SPU-A", Name: "商品A", EnterpriseID: 1, Status: "active"}
	spu2 := &models.SPU{SPUCode: "SPU-B", Name: "商品B", EnterpriseID: 1, Status: "active"}
	db.Create(spu1)
	db.Create(spu2)

	// 为SPU1创建SKU
	skus1 := []models.SKU{
		{SKUCode: "SKU-A1", SPUID: spu1.ID, Name: "规格A1", Price: 100.00, Status: "active"},
		{SKUCode: "SKU-A2", SPUID: spu1.ID, Name: "规格A2", Price: 200.00, Status: "active"},
	}
	for i := range skus1 {
		repo.Create(&skus1[i])
	}

	// 为SPU2创建SKU
	sku2 := &models.SKU{SKUCode: "SKU-B1", SPUID: spu2.ID, Name: "规格B1", Price: 300.00, Status: "active"}
	repo.Create(sku2)

	// 测试获取SPU1的SKU
	list, err := repo.ListBySPUID(spu1.ID)
	assert.NoError(t, err)
	assert.Len(t, list, 2)
	for _, sku := range list {
		assert.Equal(t, spu1.ID, sku.SPUID)
	}
}

func TestSKURepository_BatchCreate(t *testing.T) {
	db := setupSKUTestDB(t)
	repo := NewSKURepository(db)

	// 创建SPU
	spu := &models.SPU{SPUCode: "SPU-BATCH", Name: "批量商品", EnterpriseID: 1, Status: "active"}
	db.Create(spu)

	// 批量创建SKU
	skus := []models.SKU{
		{SKUCode: "SKU-BATCH-001", SPUID: spu.ID, Name: "批量规格1", Price: 100.00, Status: "active"},
		{SKUCode: "SKU-BATCH-002", SPUID: spu.ID, Name: "批量规格2", Price: 200.00, Status: "active"},
		{SKUCode: "SKU-BATCH-003", SPUID: spu.ID, Name: "批量规格3", Price: 300.00, Status: "active"},
	}

	err := repo.BatchCreate(skus)
	assert.NoError(t, err)

	// 验证创建成功
	list, err := repo.ListBySPUID(spu.ID)
	assert.NoError(t, err)
	assert.Len(t, list, 3)
}

func TestSKURepository_BatchUpdate(t *testing.T) {
	db := setupSKUTestDB(t)
	repo := NewSKURepository(db)

	// 创建SKU
	spu := &models.SPU{SPUCode: "SPU-BATCH-UPDATE", Name: "商品", EnterpriseID: 1, Status: "active"}
	db.Create(spu)

	skus := []models.SKU{
		{SKUCode: "SKU-BU-001", SPUID: spu.ID, Name: "规格1", Price: 100.00, Status: "draft"},
		{SKUCode: "SKU-BU-002", SPUID: spu.ID, Name: "规格2", Price: 200.00, Status: "draft"},
	}
	for i := range skus {
		repo.Create(&skus[i])
	}

	// 批量更新
	updates := []models.SKUUpdateItem{
		{
			ID:     skus[0].ID,
			Price:  floatPtr(150.00),
			Status: stringPtr("active"),
		},
		{
			ID:     skus[1].ID,
			Price:  floatPtr(250.00),
			Status: stringPtr("active"),
		},
	}

	err := repo.BatchUpdate(updates)
	assert.NoError(t, err)

	// 验证更新
	updated1, _ := repo.GetByID(skus[0].ID)
	assert.Equal(t, 150.00, updated1.Price)
	assert.Equal(t, "active", updated1.Status)

	updated2, _ := repo.GetByID(skus[1].ID)
	assert.Equal(t, 250.00, updated2.Price)
	assert.Equal(t, "active", updated2.Status)
}

func TestSKURepository_ListWithDetails(t *testing.T) {
	db := setupSKUTestDB(t)
	repo := NewSKURepository(db)

	// 创建SPU
	spu := &models.SPU{
		SPUCode:      "SPU-DETAIL-TEST",
		Name:         "详情测试商品",
		EnterpriseID: 1,
		Status:       "active",
	}
	db.Create(spu)

	// 创建SKU
	sku := &models.SKU{
		SKUCode: "SKU-DETAIL-001",
		SPUID:   spu.ID,
		Name:    "详情规格",
		Price:   99.99,
		Status:  "active",
	}
	repo.Create(sku)

	// 创建库存记录
	inventory := &models.InventoryRecord{
		SKUID:             sku.ID,
		AvailableQuantity: 100,
		LockedQuantity:    10,
		TotalQuantity:     110,
	}
	db.Create(inventory)

	// 获取带详情的列表
	filter := &SKUFilter{Page: 1, PageSize: 10}
	list, total, err := repo.ListWithDetails(filter)
	assert.NoError(t, err)
	assert.Equal(t, int64(1), total)
	assert.Len(t, list, 1)
	assert.NotEmpty(t, list[0].SPUName)
	assert.Equal(t, "详情测试商品", list[0].SPUName)
}

func TestSKURepository_ExistsByCode(t *testing.T) {
	db := setupSKUTestDB(t)
	repo := NewSKURepository(db)

	// 创建SKU
	spu := &models.SPU{SPUCode: "SPU-EXISTS", Name: "商品", EnterpriseID: 1, Status: "active"}
	db.Create(spu)

	sku := &models.SKU{
		SKUCode: "SKU-EXISTS-CODE",
		SPUID:   spu.ID,
		Name:    "存在检查",
		Price:   99.99,
		Status:  "active",
	}
	repo.Create(sku)

	// 测试存在的编码
	exists, err := repo.ExistsByCode("SKU-EXISTS-CODE", 0)
	assert.NoError(t, err)
	assert.True(t, exists)

	// 测试不存在的编码
	notExists, err := repo.ExistsByCode("SKU-NOT-EXISTS", 0)
	assert.NoError(t, err)
	assert.False(t, notExists)

	// 测试排除自身
	existsExcludeSelf, err := repo.ExistsByCode("SKU-EXISTS-CODE", sku.ID)
	assert.NoError(t, err)
	assert.False(t, existsExcludeSelf)
}

func TestSKURepository_ExistsBySPUID(t *testing.T) {
	db := setupSKUTestDB(t)
	repo := NewSKURepository(db)

	// 创建SPU
	spu := &models.SPU{SPUCode: "SPU-EXISTS-SPUID", Name: "测试商品", EnterpriseID: 1, Status: "active"}
	db.Create(spu)

	// 创建多个SKU
	for i := 1; i <= 3; i++ {
		sku := &models.SKU{
			SKUCode: fmt.Sprintf("SKU-EXISTS-%d", i),
			SPUID:   spu.ID,
			Name:    fmt.Sprintf("规格%d", i),
			Price:   100.00,
			Status:  "active",
		}
		repo.Create(sku)
	}

	// 测试SPU下是否有SKU
	exists, err := repo.ExistsBySPUID(spu.ID)
	assert.NoError(t, err)
	assert.True(t, exists)

	// 测试不存在的SPU
	notExists, err := repo.ExistsBySPUID(9999)
	assert.NoError(t, err)
	assert.False(t, notExists)
}
