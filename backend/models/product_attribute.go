package models

import (
	"time"
)

// ProductAttribute 商品属性定义
// 定义可用的属性类型，如"颜色"、"尺寸"等
type ProductAttribute struct {
	ID uint `gorm:"primaryKey" json:"id"`

	// 基础信息
	EnterpriseID uint   `gorm:"not null;index:idx_product_attributes_enterprise" json:"enterprise_id"`
	Name         string `gorm:"size:50;not null" json:"name"`                // 属性名（如：颜色、尺寸）
	DisplayName  string `gorm:"size:100;not null" json:"display_name"`       // 显示名称

	// 配置信息
	InputType    string `gorm:"size:20;not null;default:'select'" json:"input_type"` // 输入类型：select/input/color/image
	IsRequired   bool   `gorm:"default:false" json:"is_required"`                    // 是否必填
	IsVariation  bool   `gorm:"default:true;index:idx_product_attributes_variation" json:"is_variation"` // 是否作为SKU规格
	SortOrder    int    `gorm:"default:0" json:"sort_order"`                         // 排序

	// 审计字段
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	// 关联关系
	Enterprise     *Enterprise               `gorm:"foreignKey:EnterpriseID" json:"enterprise,omitempty"`
	AttributeValues []ProductAttributeValue `gorm:"foreignKey:AttributeID" json:"attribute_values,omitempty"`
}

// TableName 指定表名
func (ProductAttribute) TableName() string {
	return "product_attributes"
}

// ProductAttributeValue 商品属性值
// 定义属性的可选值，如"红色"、"蓝色"、"S"、"M"、"L"等
type ProductAttributeValue struct {
	ID uint `gorm:"primaryKey" json:"id"`

	// 关联信息
	AttributeID uint `gorm:"not null;index:idx_product_attribute_values_attr" json:"attribute_id"`

	// 属性值信息
	Value        string  `gorm:"size:100;not null" json:"value"`               // 属性值（如：红色、蓝色）
	DisplayValue string  `gorm:"size:100;not null" json:"display_value"`       // 显示值
	ImageURL     *string `gorm:"size:500" json:"image_url,omitempty"`          // 图片URL（用于颜色/图片选择器）
	HexColor     *string `gorm:"size:7" json:"hex_color,omitempty"`            // 十六进制颜色值（如：#FF0000）
	SortOrder    int     `gorm:"default:0" json:"sort_order"`                  // 排序

	// 审计字段
	CreatedAt time.Time `json:"created_at"`

	// 关联关系
	Attribute *ProductAttribute `gorm:"foreignKey:AttributeID" json:"attribute,omitempty"`
}

// TableName 指定表名
func (ProductAttributeValue) TableName() string {
	return "product_attribute_values"
}

// InputType 定义属性输入类型常量
const (
	InputTypeSelect = "select" // 下拉选择
	InputTypeInput  = "input"  // 文本输入
	InputTypeColor  = "color"  // 颜色选择器
	InputTypeImage  = "image"  // 图片选择器
)

// ValidInputTypes 有效的输入类型列表
var ValidInputTypes = []string{
	InputTypeSelect,
	InputTypeInput,
	InputTypeColor,
	InputTypeImage,
}

// IsValidInputType 检查输入类型是否有效
func (p *ProductAttribute) IsValidInputType() bool {
	for _, inputType := range ValidInputTypes {
		if p.InputType == inputType {
			return true
		}
	}
	return false
}

// ProductAttributeCreateRequest 创建属性请求
type ProductAttributeCreateRequest struct {
	Name        string `json:"name" binding:"required,max=50"`
	DisplayName string `json:"display_name" binding:"required,max=100"`
	InputType   string `json:"input_type" binding:"required,oneof=select input color image"`
	IsRequired  bool   `json:"is_required"`
	IsVariation bool   `json:"is_variation"`
	SortOrder   int    `json:"sort_order"`
}

// ProductAttributeValueCreateRequest 创建属性值请求
type ProductAttributeValueCreateRequest struct {
	Value        string  `json:"value" binding:"required,max=100"`
	DisplayValue string  `json:"display_value" binding:"required,max=100"`
	ImageURL     *string `json:"image_url,omitempty"`
	HexColor     *string `json:"hex_color,omitempty"`
	SortOrder    int     `json:"sort_order"`
}

// ProductAttributeResponse 属性响应（包含属性值）
type ProductAttributeResponse struct {
	ProductAttribute
	ValueCount int `json:"value_count"` // 属性值数量
}
