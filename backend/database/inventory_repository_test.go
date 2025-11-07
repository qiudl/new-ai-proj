package database

import (
	"ai-project-backend/models"
	"fmt"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/schema"
)

// setupInventoryTestDB 设置测试用的内存数据库
func setupInventoryTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		NamingStrategy: schema.NamingStrategy{
			SingularTable: false, // 使用复数表名
		},
	})
	require.NoError(t, err)

	// 自动迁移表结构
	err = db.AutoMigrate(
		&models.SPU{},
		&models.SKU{},
		&models.InventoryRecord{},
		&models.InventoryTransaction{},
	)
	require.NoError(t, err)

	return db
}

// createTestSKU 创建测试用的SKU
func createTestSKU(db *gorm.DB, t *testing.T, code string) *models.SKU {
	spu := &models.SPU{
		SPUCode:      "SPU-" + code,
		Name:         "测试商品",
		EnterpriseID: 1,
		Status:       "active",
	}
	err := db.Create(spu).Error
	require.NoError(t, err)

	sku := &models.SKU{
		SKUCode: code,
		SPUID:   spu.ID,
		Name:    "测试规格",
		Price:   99.99,
		Status:  "active",
	}
	err = db.Create(sku).Error
	require.NoError(t, err)

	return sku
}

func TestInventoryRepository_CreateAndGetInventoryRecord(t *testing.T) {
	db := setupInventoryTestDB(t)
	repo := NewInventoryRepository(db)

	sku := createTestSKU(db, t, "SKU-INV-001")

	// 测试创建库存记录
	record := &models.InventoryRecord{
		SKUID:             sku.ID,
		AvailableQuantity: 100,
		LockedQuantity:    0,
		TotalQuantity:     100,
	}

	err := repo.CreateInventoryRecord(record)
	assert.NoError(t, err)
	assert.NotZero(t, record.ID)

	// 测试获取库存记录
	found, err := repo.GetInventoryBySKUID(sku.ID, nil)
	assert.NoError(t, err)
	assert.NotNil(t, found)
	assert.Equal(t, sku.ID, found.SKUID)
	assert.Equal(t, 100, found.AvailableQuantity)
}

func TestInventoryRepository_UpdateInventoryRecord(t *testing.T) {
	db := setupInventoryTestDB(t)
	repo := NewInventoryRepository(db)

	sku := createTestSKU(db, t, "SKU-UPDATE-001")

	// 创建库存记录
	record := &models.InventoryRecord{
		SKUID:             sku.ID,
		AvailableQuantity: 100,
		LockedQuantity:    0,
		TotalQuantity:     100,
	}
	err := repo.CreateInventoryRecord(record)
	require.NoError(t, err)

	// 更新库存记录
	record.AvailableQuantity = 150
	record.TotalQuantity = 150
	err = repo.UpdateInventoryRecord(record)
	assert.NoError(t, err)

	// 验证更新
	updated, err := repo.GetInventoryBySKUID(sku.ID, nil)
	assert.NoError(t, err)
	assert.Equal(t, 150, updated.AvailableQuantity)
}

func TestInventoryRepository_RecordIn(t *testing.T) {
	db := setupInventoryTestDB(t)
	repo := NewInventoryRepository(db)

	sku := createTestSKU(db, t, "SKU-IN-001")

	// 初始化库存为0
	initialRecord := &models.InventoryRecord{
		SKUID:             sku.ID,
		AvailableQuantity: 0,
		LockedQuantity:    0,
		TotalQuantity:     0,
	}
	repo.CreateInventoryRecord(initialRecord)

	// 测试入库
	req := &models.InventoryInRequest{
		SKUID:    sku.ID,
		Quantity: 100,
		Reason:   "初始入库",
	}
	err := repo.RecordIn(req, 1)
	assert.NoError(t, err)

	// 验证库存增加
	record, err := repo.GetInventoryBySKUID(sku.ID, nil)
	assert.NoError(t, err)
	assert.Equal(t, 100, record.AvailableQuantity)
	assert.Equal(t, 100, record.TotalQuantity)
	assert.NotNil(t, record.LastInDate)

	// 验证交易记录
	var transaction models.InventoryTransaction
	err = db.Where("sku_id = ? AND transaction_type = ?", sku.ID, "in").First(&transaction).Error
	assert.NoError(t, err)
	assert.Equal(t, 100, transaction.Quantity)
	assert.Equal(t, 0, transaction.BeforeQuantity)
	assert.Equal(t, 100, transaction.AfterQuantity)
}

func TestInventoryRepository_RecordOut(t *testing.T) {
	db := setupInventoryTestDB(t)
	repo := NewInventoryRepository(db)

	sku := createTestSKU(db, t, "SKU-OUT-001")

	// 初始化库存
	initialRecord := &models.InventoryRecord{
		SKUID:             sku.ID,
		AvailableQuantity: 100,
		LockedQuantity:    0,
		TotalQuantity:     100,
	}
	repo.CreateInventoryRecord(initialRecord)

	// 测试出库
	req := &models.InventoryOutRequest{
		SKUID:    sku.ID,
		Quantity: 30,
		Reason:   "销售出库",
	}
	err := repo.RecordOut(req, 1)
	assert.NoError(t, err)

	// 验证库存减少
	record, err := repo.GetInventoryBySKUID(sku.ID, nil)
	assert.NoError(t, err)
	assert.Equal(t, 70, record.AvailableQuantity)
	assert.Equal(t, 70, record.TotalQuantity)
	assert.NotNil(t, record.LastOutDate)

	// 测试库存不足的情况
	req2 := &models.InventoryOutRequest{
		SKUID:    sku.ID,
		Quantity: 100,
		Reason:   "超量出库",
	}
	err = repo.RecordOut(req2, 1)
	assert.Error(t, err)
}

func TestInventoryRepository_AdjustInventory(t *testing.T) {
	db := setupInventoryTestDB(t)
	repo := NewInventoryRepository(db)

	sku := createTestSKU(db, t, "SKU-ADJUST-001")

	// 初始化库存
	initialRecord := &models.InventoryRecord{
		SKUID:             sku.ID,
		AvailableQuantity: 100,
		LockedQuantity:    0,
		TotalQuantity:     100,
	}
	repo.CreateInventoryRecord(initialRecord)

	// 测试盘点调整（增加）
	req := &models.InventoryAdjustRequest{
		SKUID:       sku.ID,
		NewQuantity: 150,
		Reason:      "盘点盈余",
	}
	err := repo.AdjustInventory(req, 1)
	assert.NoError(t, err)

	record, err := repo.GetInventoryBySKUID(sku.ID, nil)
	assert.NoError(t, err)
	assert.Equal(t, 150, record.AvailableQuantity)
	assert.NotNil(t, record.LastCheckDate)

	// 测试盘点调整（减少）
	req2 := &models.InventoryAdjustRequest{
		SKUID:       sku.ID,
		NewQuantity: 80,
		Reason:      "盘点亏损",
	}
	err = repo.AdjustInventory(req2, 1)
	assert.NoError(t, err)

	record, err = repo.GetInventoryBySKUID(sku.ID, nil)
	assert.NoError(t, err)
	assert.Equal(t, 80, record.AvailableQuantity)
	assert.Equal(t, 80, record.TotalQuantity)
}

func TestInventoryRepository_LockInventory(t *testing.T) {
	db := setupInventoryTestDB(t)
	repo := NewInventoryRepository(db)

	sku := createTestSKU(db, t, "SKU-LOCK-001")

	// 初始化库存
	initialRecord := &models.InventoryRecord{
		SKUID:             sku.ID,
		AvailableQuantity: 100,
		LockedQuantity:    0,
		TotalQuantity:     100,
	}
	repo.CreateInventoryRecord(initialRecord)

	// 测试锁定库存
	req := &models.InventoryLockRequest{
		SKUID:    sku.ID,
		Quantity: 30,
		Reason:   "订单锁定",
	}
	err := repo.LockInventory(req, 1)
	assert.NoError(t, err)

	record, err := repo.GetInventoryBySKUID(sku.ID, nil)
	assert.NoError(t, err)
	assert.Equal(t, 70, record.AvailableQuantity)  // 可用减少
	assert.Equal(t, 30, record.LockedQuantity)     // 锁定增加
	assert.Equal(t, 100, record.TotalQuantity)     // 总量不变

	// 测试锁定超过可用量
	req2 := &models.InventoryLockRequest{
		SKUID:    sku.ID,
		Quantity: 100,
		Reason:   "超量锁定",
	}
	err = repo.LockInventory(req2, 1)
	assert.Error(t, err)
}

func TestInventoryRepository_UnlockInventory(t *testing.T) {
	db := setupInventoryTestDB(t)
	repo := NewInventoryRepository(db)

	sku := createTestSKU(db, t, "SKU-UNLOCK-001")

	// 初始化库存（已锁定部分）
	initialRecord := &models.InventoryRecord{
		SKUID:             sku.ID,
		AvailableQuantity: 70,
		LockedQuantity:    30,
		TotalQuantity:     100,
	}
	repo.CreateInventoryRecord(initialRecord)

	// 测试解锁库存
	req := &models.InventoryUnlockRequest{
		SKUID:    sku.ID,
		Quantity: 20,
		Reason:   "取消订单",
	}
	err := repo.UnlockInventory(req, 1)
	assert.NoError(t, err)

	record, err := repo.GetInventoryBySKUID(sku.ID, nil)
	assert.NoError(t, err)
	assert.Equal(t, 90, record.AvailableQuantity)  // 可用增加
	assert.Equal(t, 10, record.LockedQuantity)     // 锁定减少
	assert.Equal(t, 100, record.TotalQuantity)     // 总量不变

	// 测试解锁超过锁定量
	req2 := &models.InventoryUnlockRequest{
		SKUID:    sku.ID,
		Quantity: 20,
		Reason:   "超量解锁",
	}
	err = repo.UnlockInventory(req2, 1)
	assert.Error(t, err)
}

func TestInventoryRepository_ListRecords(t *testing.T) {
	db := setupInventoryTestDB(t)
	repo := NewInventoryRepository(db)

	// 创建多个SKU和库存记录
	for i := 1; i <= 3; i++ {
		sku := createTestSKU(db, t, fmt.Sprintf("SKU-LIST-%d", i))
		record := &models.InventoryRecord{
			SKUID:             sku.ID,
			AvailableQuantity: i * 100,
			LockedQuantity:    i * 10,
			TotalQuantity:     i*100 + i*10,
		}
		repo.CreateInventoryRecord(record)
	}

	// 测试列表查询
	filter := &InventoryFilter{
		Page:     1,
		PageSize: 10,
	}
	list, total, err := repo.ListInventoryRecords(filter)
	assert.NoError(t, err)
	assert.Equal(t, int64(3), total)
	assert.Len(t, list, 3)

	// 验证返回的Response包含SKU信息
	assert.NotEmpty(t, list[0].SKUCode)
	assert.NotEmpty(t, list[0].SKUName)
}

func TestInventoryRepository_GetTransactionHistory(t *testing.T) {
	db := setupInventoryTestDB(t)
	repo := NewInventoryRepository(db)

	sku := createTestSKU(db, t, "SKU-TX-HISTORY")

	// 初始化库存
	initialRecord := &models.InventoryRecord{
		SKUID:             sku.ID,
		AvailableQuantity: 0,
		LockedQuantity:    0,
		TotalQuantity:     0,
	}
	repo.CreateInventoryRecord(initialRecord)

	// 创建多个交易记录
	repo.RecordIn(&models.InventoryInRequest{SKUID: sku.ID, Quantity: 100, Reason: "入库1"}, 1)
	time.Sleep(10 * time.Millisecond)
	repo.RecordOut(&models.InventoryOutRequest{SKUID: sku.ID, Quantity: 30, Reason: "出库1"}, 1)
	time.Sleep(10 * time.Millisecond)
	repo.LockInventory(&models.InventoryLockRequest{SKUID: sku.ID, Quantity: 20, Reason: "锁定1"}, 1)

	// 测试查询所有交易历史
	filter := &TransactionFilter{
		Page:     1,
		PageSize: 10,
	}
	list, total, err := repo.GetTransactionHistory(filter)
	assert.NoError(t, err)
	assert.Equal(t, int64(3), total)
	assert.Len(t, list, 3)

	// 测试按SKU ID过滤
	filter.SKUID = &sku.ID
	skuList, skuTotal, err := repo.GetTransactionHistory(filter)
	assert.NoError(t, err)
	assert.Equal(t, int64(3), skuTotal)
	assert.Len(t, skuList, 3)
	// 验证所有记录都属于该SKU
	for _, record := range skuList {
		assert.Equal(t, sku.ID, record.SKUID)
	}

	// 测试按交易类型过滤
	filter = &TransactionFilter{
		TransactionType: "in",
		Page:            1,
		PageSize:        10,
	}
	typeList, typeTotal, err := repo.GetTransactionHistory(filter)
	assert.NoError(t, err)
	assert.Equal(t, int64(1), typeTotal)
	assert.Equal(t, "in", typeList[0].TransactionType)
}

func TestInventoryRepository_HasSufficientStock(t *testing.T) {
	db := setupInventoryTestDB(t)
	repo := NewInventoryRepository(db)

	sku := createTestSKU(db, t, "SKU-SUFFICIENT-001")

	// 创建库存记录
	record := &models.InventoryRecord{
		SKUID:             sku.ID,
		AvailableQuantity: 100,
		LockedQuantity:    0,
		TotalQuantity:     100,
	}
	repo.CreateInventoryRecord(record)

	// 测试有足够库存
	hasSufficient, err := repo.HasSufficientStock(sku.ID, nil, 50)
	assert.NoError(t, err)
	assert.True(t, hasSufficient)

	// 测试库存不足
	notSufficient, err := repo.HasSufficientStock(sku.ID, nil, 150)
	assert.NoError(t, err)
	assert.False(t, notSufficient)
}

func TestInventoryRepository_HasSufficientLocked(t *testing.T) {
	db := setupInventoryTestDB(t)
	repo := NewInventoryRepository(db)

	sku := createTestSKU(db, t, "SKU-LOCKED-001")

	// 创建库存记录
	record := &models.InventoryRecord{
		SKUID:             sku.ID,
		AvailableQuantity: 70,
		LockedQuantity:    30,
		TotalQuantity:     100,
	}
	repo.CreateInventoryRecord(record)

	// 测试有足够锁定库存
	hasSufficient, err := repo.HasSufficientLocked(sku.ID, nil, 20)
	assert.NoError(t, err)
	assert.True(t, hasSufficient)

	// 测试锁定库存不足
	notSufficient, err := repo.HasSufficientLocked(sku.ID, nil, 50)
	assert.NoError(t, err)
	assert.False(t, notSufficient)
}

func TestInventoryRepository_GetTransactionByID(t *testing.T) {
	db := setupInventoryTestDB(t)
	repo := NewInventoryRepository(db)

	sku := createTestSKU(db, t, "SKU-TX-DETAIL")

	// 初始化库存并执行入库
	initialRecord := &models.InventoryRecord{
		SKUID:             sku.ID,
		AvailableQuantity: 0,
		LockedQuantity:    0,
		TotalQuantity:     0,
	}
	repo.CreateInventoryRecord(initialRecord)
	repo.RecordIn(&models.InventoryInRequest{SKUID: sku.ID, Quantity: 100, Reason: "测试入库"}, 1)

	// 获取交易记录ID
	var transaction models.InventoryTransaction
	err := db.Where("sku_id = ?", sku.ID).First(&transaction).Error
	require.NoError(t, err)

	// 测试获取交易详情
	detail, err := repo.GetTransactionByID(transaction.ID)
	assert.NoError(t, err)
	assert.NotNil(t, detail)
	assert.Equal(t, transaction.ID, detail.ID)
	assert.Equal(t, "测试入库", detail.Reason)
}
