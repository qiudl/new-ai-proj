package models

import (
	"time"

	"gorm.io/gorm"
)

// InventoryRecord 库存记录
// 记录SKU的实时库存信息
type InventoryRecord struct {
	ID uint `gorm:"primaryKey" json:"id"`

	// 关联信息
	SKUID       uint  `gorm:"column:sku_id;not null;index:idx_inventory_sku" json:"sku_id"`
	WarehouseID *uint `gorm:"column:warehouse_id;index:idx_inventory_warehouse" json:"warehouse_id,omitempty"` // 仓库ID（可选）

	// 库存数量
	AvailableQuantity int `gorm:"not null;default:0;index:idx_inventory_available" json:"available_quantity"` // 可用库存
	LockedQuantity    int `gorm:"not null;default:0" json:"locked_quantity"`                                  // 锁定库存
	TotalQuantity     int `gorm:"not null;default:0" json:"total_quantity"`                                   // 总库存

	// 时间信息
	LastInDate    *time.Time `json:"last_in_date,omitempty"`    // 最后入库时间
	LastOutDate   *time.Time `json:"last_out_date,omitempty"`   // 最后出库时间
	LastCheckDate *time.Time `json:"last_check_date,omitempty"` // 最后盘点时间

	// 审计字段
	UpdatedAt time.Time `json:"updated_at"`

	// 关联关系
	SKU *SKU `gorm:"foreignKey:SKUID" json:"sku,omitempty"`
}

// TableName 指定表名
func (InventoryRecord) TableName() string {
	return "inventory_records"
}

// BeforeSave GORM Hook - 保存前自动计算总库存
func (i *InventoryRecord) BeforeSave(tx *gorm.DB) error {
	i.TotalQuantity = i.AvailableQuantity + i.LockedQuantity
	return nil
}

// InventoryTransaction 库存变动记录
// 审计追踪所有库存变动
type InventoryTransaction struct {
	ID uint `gorm:"primaryKey" json:"id"`

	// 关联信息
	SKUID       uint  `gorm:"column:sku_id;not null;index:idx_inventory_trans_sku" json:"sku_id"`
	WarehouseID *uint `gorm:"column:warehouse_id" json:"warehouse_id,omitempty"`

	// 变动信息
	TransactionType string `gorm:"size:20;not null;index:idx_inventory_trans_type" json:"transaction_type"` // 类型：in/out/adjust/lock/unlock
	Quantity        int    `gorm:"not null" json:"quantity"`                                                // 变动数量（正数增加，负数减少）
	BeforeQuantity  int    `gorm:"not null" json:"before_quantity"`                                         // 变动前数量
	AfterQuantity   int    `gorm:"not null" json:"after_quantity"`                                          // 变动后数量

	// 操作信息
	OperatorID *uint  `gorm:"index:idx_inventory_trans_operator" json:"operator_id,omitempty"`
	Reason     string `gorm:"size:200" json:"reason,omitempty"` // 原因说明

	// 关联单据
	ReferenceID   *uint  `json:"reference_id,omitempty"`                                             // 关联单据ID
	ReferenceType string `gorm:"size:50;index:idx_inventory_trans_reference" json:"reference_type,omitempty"` // 关联单据类型

	// 审计字段
	CreatedAt time.Time `gorm:"index:idx_inventory_trans_created" json:"created_at"`

	// 关联关系
	SKU      *SKU  `gorm:"foreignKey:SKUID" json:"sku,omitempty"`
	Operator *User `gorm:"foreignKey:OperatorID" json:"operator,omitempty"`
}

// TableName 指定表名
func (InventoryTransaction) TableName() string {
	return "inventory_transactions"
}

// TransactionType 定义库存变动类型常量
const (
	TransactionTypeIn     = "in"     // 入库
	TransactionTypeOut    = "out"    // 出库
	TransactionTypeAdjust = "adjust" // 调整/盘点
	TransactionTypeLock   = "lock"   // 锁定
	TransactionTypeUnlock = "unlock" // 解锁
	TransactionTypeReturn = "return" // 退货
)

// ValidTransactionTypes 有效的变动类型列表
var ValidTransactionTypes = []string{
	TransactionTypeIn,
	TransactionTypeOut,
	TransactionTypeAdjust,
	TransactionTypeLock,
	TransactionTypeUnlock,
	TransactionTypeReturn,
}

// ReferenceType 定义关联单据类型常量
const (
	ReferenceTypeOrder        = "order"         // 订单
	ReferenceTypePurchase     = "purchase"      // 采购单
	ReferenceTypeReturn       = "return"        // 退货单
	ReferenceTypeTransfer     = "transfer"      // 调拨单
	ReferenceTypeManual       = "manual"        // 手动调整
)

// InventoryInRequest 入库请求
type InventoryInRequest struct {
	SKUID         uint   `json:"sku_id" binding:"required"`
	Quantity      int    `json:"quantity" binding:"required,gt=0"`
	WarehouseID   *uint  `json:"warehouse_id,omitempty"`
	Reason        string `json:"reason,omitempty"`
	ReferenceType string `json:"reference_type,omitempty"`
	ReferenceID   *uint  `json:"reference_id,omitempty"`
}

// InventoryOutRequest 出库请求
type InventoryOutRequest struct {
	SKUID         uint   `json:"sku_id" binding:"required"`
	Quantity      int    `json:"quantity" binding:"required,gt=0"`
	WarehouseID   *uint  `json:"warehouse_id,omitempty"`
	Reason        string `json:"reason,omitempty"`
	ReferenceType string `json:"reference_type,omitempty"`
	ReferenceID   *uint  `json:"reference_id,omitempty"`
}

// InventoryAdjustRequest 库存调整请求
type InventoryAdjustRequest struct {
	SKUID       uint   `json:"sku_id" binding:"required"`
	WarehouseID *uint  `json:"warehouse_id,omitempty"`
	NewQuantity int    `json:"new_quantity" binding:"required,gte=0"` // 调整后的库存数量
	Reason      string `json:"reason" binding:"required"`
}

// InventoryLockRequest 库存锁定请求
type InventoryLockRequest struct {
	SKUID       uint   `json:"sku_id" binding:"required"`
	Quantity    int    `json:"quantity" binding:"required,gt=0"`
	WarehouseID *uint  `json:"warehouse_id,omitempty"`
	Reason      string `json:"reason,omitempty"`
	ReferenceType string `json:"reference_type,omitempty"`
	ReferenceID *uint  `json:"reference_id,omitempty"`
}

// InventoryUnlockRequest 库存解锁请求
type InventoryUnlockRequest struct {
	SKUID       uint   `json:"sku_id" binding:"required"`
	Quantity    int    `json:"quantity" binding:"required,gt=0"`
	WarehouseID *uint  `json:"warehouse_id,omitempty"`
	Reason      string `json:"reason,omitempty"`
	ReferenceType string `json:"reference_type,omitempty"`
	ReferenceID *uint  `json:"reference_id,omitempty"`
}

// InventoryTransactionResponse 库存变动记录响应
type InventoryTransactionResponse struct {
	ID              uint      `gorm:"column:id" json:"id"`
	SKUID           uint      `gorm:"column:sku_id" json:"sku_id"`
	SKUCode         string    `gorm:"column:sku_code" json:"sku_code"`
	SKUName         string    `gorm:"column:sku_name" json:"sku_name"`
	TransactionType string    `gorm:"column:transaction_type" json:"transaction_type"`
	Quantity        int       `gorm:"column:quantity" json:"quantity"`
	BeforeQuantity  int       `gorm:"column:before_quantity" json:"before_quantity"`
	AfterQuantity   int       `gorm:"column:after_quantity" json:"after_quantity"`
	OperatorID      *uint     `gorm:"column:operator_id" json:"operator_id,omitempty"`
	OperatorName    string    `gorm:"column:operator_name" json:"operator_name,omitempty"`
	Reason          string    `gorm:"column:reason" json:"reason,omitempty"`
	ReferenceType   string    `gorm:"column:reference_type" json:"reference_type,omitempty"`
	ReferenceID     *uint     `gorm:"column:reference_id" json:"reference_id,omitempty"`
	CreatedAt       time.Time `gorm:"column:created_at" json:"created_at"`
}

// InventoryRecordResponse 库存记录响应
type InventoryRecordResponse struct {
	SKUID             uint       `json:"sku_id"`
	SKUCode           string     `json:"sku_code"`
	SKUName           string     `json:"sku_name"`
	WarehouseID       *uint      `json:"warehouse_id,omitempty"`
	AvailableQuantity int        `json:"available_quantity"`
	LockedQuantity    int        `json:"locked_quantity"`
	TotalQuantity     int        `json:"total_quantity"`
	LastInDate        *time.Time `json:"last_in_date,omitempty"`
	LastOutDate       *time.Time `json:"last_out_date,omitempty"`
	LastCheckDate     *time.Time `json:"last_check_date,omitempty"`
	UpdatedAt         time.Time  `json:"updated_at"`
}
