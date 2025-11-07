package models

import (
	"database/sql/driver"
	"encoding/json"
	"time"

	"gorm.io/gorm"
)

// SKU (Stock Keeping Unit) 库存量单位
// 代表一种商品的具体规格，如"iPhone 15 蓝色 128GB"
type SKU struct {
	ID      uint   `gorm:"primaryKey" json:"id"`
	SKUCode string `gorm:"uniqueIndex;size:50;not null" json:"sku_code"` // SKU编码
	SPUID   uint   `gorm:"column:spu_id;not null;index:idx_skus_spu" json:"spu_id"`    // 所属SPU
	Name    string `gorm:"size:200;not null" json:"name"`                // SKU名称

	// 价格信息
	Price       float64 `gorm:"type:decimal(15,2);not null;check:price >= 0" json:"price"`                       // 售价
	CostPrice   *float64 `gorm:"type:decimal(15,2);check:cost_price IS NULL OR cost_price >= 0" json:"cost_price,omitempty"` // 成本价
	MarketPrice *float64 `gorm:"type:decimal(15,2)" json:"market_price,omitempty"`                                // 市场价

	// 库存信息
	StockQuantity int  `gorm:"not null;default:0;check:stock_quantity >= 0;index:idx_skus_stock" json:"stock_quantity"` // 当前库存
	AlertQuantity int  `gorm:"default:10" json:"alert_quantity"`                                                         // 库存预警值

	// 属性信息
	Attributes SKUAttributes `gorm:"type:jsonb;default:'{}'" json:"attributes"` // SKU属性（如：{"颜色":"蓝色","容量":"128GB"}）

	// 物流信息
	Barcode string   `gorm:"size:100" json:"barcode,omitempty"`                 // 条形码
	Weight  *float64 `gorm:"type:decimal(10,3)" json:"weight,omitempty"`        // 重量（kg）
	Volume  *float64 `gorm:"type:decimal(10,3)" json:"volume,omitempty"`        // 体积（m³）

	// 状态管理
	Status string `gorm:"size:20;not null;default:'active';index:idx_skus_status" json:"status"` // 状态：active/inactive

	// 审计字段
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`

	// 关联关系
	SPU              *SPU              `gorm:"foreignKey:SPUID" json:"spu,omitempty"`
	InventoryRecords []InventoryRecord `gorm:"foreignKey:SKUID" json:"inventory_records,omitempty"`
}

// TableName 指定表名
func (SKU) TableName() string {
	return "skus"
}

// SKUAttributes JSON类型，存储SKU属性（键值对）
type SKUAttributes map[string]string

// Scan 实现sql.Scanner接口
func (a *SKUAttributes) Scan(value interface{}) error {
	if value == nil {
		*a = make(map[string]string)
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		*a = make(map[string]string)
		return nil
	}

	return json.Unmarshal(bytes, a)
}

// Value 实现driver.Valuer接口
func (a SKUAttributes) Value() (driver.Value, error) {
	if len(a) == 0 {
		return "{}", nil
	}
	return json.Marshal(a)
}

// SKUStatus 定义SKU状态常量
const (
	SKUStatusActive   = "active"   // 启用
	SKUStatusInactive = "inactive" // 禁用
)

// ValidSKUStatuses 有效的SKU状态列表
var ValidSKUStatuses = []string{
	SKUStatusActive,
	SKUStatusInactive,
}

// IsValidStatus 检查状态是否有效
func (s *SKU) IsValidStatus() bool {
	for _, status := range ValidSKUStatuses {
		if s.Status == status {
			return true
		}
	}
	return false
}

// BeforeCreate GORM Hook - 创建前验证
func (s *SKU) BeforeCreate(tx *gorm.DB) error {
	// 默认状态为active
	if s.Status == "" {
		s.Status = SKUStatusActive
	}

	// 初始化JSONB字段
	if s.Attributes == nil {
		s.Attributes = make(map[string]string)
	}

	return nil
}

// IsLowStock 检查是否低库存
func (s *SKU) IsLowStock() bool {
	return s.StockQuantity <= s.AlertQuantity
}

// SKUCreateRequest 创建SKU请求
type SKUCreateRequest struct {
	SKUCode       string        `json:"sku_code" binding:"required,max=50"`
	SPUID         uint          `json:"spu_id" binding:"required"`
	Name          string        `json:"name" binding:"required,max=200"`
	Price         float64       `json:"price" binding:"required,gte=0"`
	CostPrice     *float64      `json:"cost_price,omitempty"`
	MarketPrice   *float64      `json:"market_price,omitempty"`
	StockQuantity int           `json:"stock_quantity" binding:"gte=0"`
	AlertQuantity int           `json:"alert_quantity,omitempty"`
	Attributes    SKUAttributes `json:"attributes"`
	Barcode       string        `json:"barcode,omitempty"`
	Weight        *float64      `json:"weight,omitempty"`
	Volume        *float64      `json:"volume,omitempty"`
	Status        string        `json:"status,omitempty"`
}

// SKUBatchCreateRequest 批量创建SKU请求
type SKUBatchCreateRequest struct {
	SPUID uint               `json:"spu_id" binding:"required"`
	SKUs  []SKUCreateRequest `json:"skus" binding:"required,min=1,dive"`
}

// SKUBatchUpdateRequest 批量更新SKU请求
type SKUBatchUpdateRequest struct {
	Updates []SKUUpdateItem `json:"updates" binding:"required,min=1,dive"`
}

// SKUUpdateItem SKU更新项
type SKUUpdateItem struct {
	ID            uint          `json:"id" binding:"required"`
	Price         *float64      `json:"price,omitempty"`
	CostPrice     *float64      `json:"cost_price,omitempty"`
	MarketPrice   *float64      `json:"market_price,omitempty"`
	StockQuantity *int          `json:"stock_quantity,omitempty"`
	AlertQuantity *int          `json:"alert_quantity,omitempty"`
	Attributes    SKUAttributes `json:"attributes,omitempty"`
	Status        *string       `json:"status,omitempty"`
}

// SKUListResponse SKU列表响应
type SKUListResponse struct {
	ID            uint          `json:"id"`
	SKUCode       string        `json:"sku_code"`
	SPUID         uint          `json:"spu_id"`
	SPUName       string        `json:"spu_name"`       // SPU名称
	Name          string        `json:"name"`
	Price         float64       `json:"price"`
	StockQuantity int           `json:"stock_quantity"`
	Attributes    SKUAttributes `json:"attributes"`
	Status        string        `json:"status"`
	IsLowStock    bool          `json:"is_low_stock"`
	CreatedAt     time.Time     `json:"created_at"`
}
