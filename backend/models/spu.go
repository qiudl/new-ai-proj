package models

import (
	"database/sql/driver"
	"encoding/json"
	"time"

	"gorm.io/gorm"
)

// SPU (Standard Product Unit) 标准产品单元
// 代表一种商品的基本信息，如"iPhone 15"
type SPU struct {
	ID       uint   `gorm:"primaryKey" json:"id"`
	SPUCode  string `gorm:"uniqueIndex;size:50;not null" json:"spu_code"`              // SPU编码
	Name     string `gorm:"size:200;not null;index:idx_spu_name_search" json:"name"`   // 商品名称

	// 关联信息
	EnterpriseID uint  `gorm:"not null;index:idx_spus_enterprise" json:"enterprise_id"` // 企业ID
	CategoryID   *uint `gorm:"index:idx_spus_category" json:"category_id,omitempty"`    // 类目ID（可选）
	Brand        string `gorm:"size:100" json:"brand,omitempty"`                        // 品牌

	// 商品信息
	Description   string         `gorm:"type:text" json:"description,omitempty"`              // 商品描述
	MainImage     string         `gorm:"size:500" json:"main_image,omitempty"`                // 主图URL
	Images        SPUImages      `gorm:"type:jsonb;default:'[]'" json:"images"`               // 图片列表
	Specifications SPUSpecs      `gorm:"type:jsonb;default:'{}'" json:"specifications"`       // 规格参数

	// 状态管理
	Status string `gorm:"size:20;not null;default:'draft';index:idx_spus_status" json:"status"` // 状态：draft/active/inactive

	// 审计字段
	CreatedBy  *uint          `json:"created_by,omitempty"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`

	// 关联关系
	Enterprise *Enterprise `gorm:"foreignKey:EnterpriseID" json:"enterprise,omitempty"`
	Creator    *User       `gorm:"foreignKey:CreatedBy" json:"creator,omitempty"`
	SKUs       []SKU       `gorm:"foreignKey:SPUID" json:"skus,omitempty"`
}

// TableName 指定表名
func (SPU) TableName() string {
	return "spus"
}

// SPUImages JSON类型，存储图片URL列表
type SPUImages []string

// Scan 实现sql.Scanner接口
func (s *SPUImages) Scan(value interface{}) error {
	if value == nil {
		*s = []string{}
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		*s = []string{}
		return nil
	}

	return json.Unmarshal(bytes, s)
}

// Value 实现driver.Valuer接口
func (s SPUImages) Value() (driver.Value, error) {
	if len(s) == 0 {
		return "[]", nil
	}
	return json.Marshal(s)
}

// SPUSpecs JSON类型，存储商品规格参数（键值对）
type SPUSpecs map[string]interface{}

// Scan 实现sql.Scanner接口
func (s *SPUSpecs) Scan(value interface{}) error {
	if value == nil {
		*s = make(map[string]interface{})
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		*s = make(map[string]interface{})
		return nil
	}

	return json.Unmarshal(bytes, s)
}

// Value 实现driver.Valuer接口
func (s SPUSpecs) Value() (driver.Value, error) {
	if len(s) == 0 {
		return "{}", nil
	}
	return json.Marshal(s)
}

// SPUStatus 定义SPU状态常量
const (
	SPUStatusDraft    = "draft"    // 草稿
	SPUStatusActive   = "active"   // 上架
	SPUStatusInactive = "inactive" // 下架
)

// ValidSPUStatuses 有效的SPU状态列表
var ValidSPUStatuses = []string{
	SPUStatusDraft,
	SPUStatusActive,
	SPUStatusInactive,
}

// IsValidStatus 检查状态是否有效
func (s *SPU) IsValidStatus() bool {
	for _, status := range ValidSPUStatuses {
		if s.Status == status {
			return true
		}
	}
	return false
}

// BeforeCreate GORM Hook - 创建前验证
func (s *SPU) BeforeCreate(tx *gorm.DB) error {
	// 默认状态为draft
	if s.Status == "" {
		s.Status = SPUStatusDraft
	}

	// 初始化JSONB字段
	if s.Images == nil {
		s.Images = []string{}
	}
	if s.Specifications == nil {
		s.Specifications = make(map[string]interface{})
	}

	return nil
}

// SPUListResponse SPU列表响应
type SPUListResponse struct {
	ID           uint      `json:"id"`
	SPUCode      string    `json:"spu_code"`
	Name         string    `json:"name"`
	Brand        string    `json:"brand"`
	MainImage    string    `json:"main_image"`
	Status       string    `json:"status"`
	SKUCount     int64     `json:"sku_count"`      // SKU数量
	TotalStock   int64     `json:"total_stock"`    // 总库存
	CreatedAt    time.Time `json:"created_at"`
}

// SPUDetailResponse SPU详情响应
type SPUDetailResponse struct {
	SPU
	SKUCount   int64 `json:"sku_count"`
	TotalStock int64 `json:"total_stock"`
}

// SPUCreateRequest SPU创建请求
type SPUCreateRequest struct {
	SPUCode        string                 `json:"spu_code" binding:"required"`
	Name           string                 `json:"name" binding:"required"`
	EnterpriseID   uint                   `json:"enterprise_id" binding:"required"`
	CategoryID     *uint                  `json:"category_id,omitempty"`
	Brand          string                 `json:"brand,omitempty"`
	Description    string                 `json:"description,omitempty"`
	MainImage      string                 `json:"main_image,omitempty"`
	Images         []string               `json:"images,omitempty"`
	Specifications map[string]interface{} `json:"specifications,omitempty"`
	Status         string                 `json:"status,omitempty"`
}

// SPUUpdateRequest SPU更新请求
type SPUUpdateRequest struct {
	SPUCode        *string                 `json:"spu_code,omitempty"`
	Name           *string                 `json:"name,omitempty"`
	CategoryID     *uint                   `json:"category_id,omitempty"`
	Brand          *string                 `json:"brand,omitempty"`
	Description    *string                 `json:"description,omitempty"`
	MainImage      *string                 `json:"main_image,omitempty"`
	Images         []string                `json:"images,omitempty"`
	Specifications map[string]interface{}  `json:"specifications,omitempty"`
	Status         *string                 `json:"status,omitempty"`
}
