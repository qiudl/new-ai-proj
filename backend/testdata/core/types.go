package core

import "time"

// FieldType 字段类型枚举
type FieldType int

const (
	FieldTypeString FieldType = iota
	FieldTypeInt
	FieldTypeInt64
	FieldTypeFloat64
	FieldTypeBool
	FieldTypeTime
	FieldTypeTimestamp
	FieldTypeText
	FieldTypeJSON
	FieldTypeUUID
	FieldTypeEmail
	FieldTypeURL
)

// String 返回字段类型的字符串表示
func (ft FieldType) String() string {
	switch ft {
	case FieldTypeString:
		return "string"
	case FieldTypeInt:
		return "int"
	case FieldTypeInt64:
		return "int64"
	case FieldTypeFloat64:
		return "float64"
	case FieldTypeBool:
		return "bool"
	case FieldTypeTime:
		return "time"
	case FieldTypeTimestamp:
		return "timestamp"
	case FieldTypeText:
		return "text"
	case FieldTypeJSON:
		return "json"
	case FieldTypeUUID:
		return "uuid"
	case FieldTypeEmail:
		return "email"
	case FieldTypeURL:
		return "url"
	default:
		return "unknown"
	}
}

// RelationType 关系类型
type RelationType int

const (
	RelationOneToOne RelationType = iota
	RelationOneToMany
	RelationManyToOne
	RelationManyToMany
	RelationBelongsTo
)

// String 返回关系类型的字符串表示
func (rt RelationType) String() string {
	switch rt {
	case RelationOneToOne:
		return "one_to_one"
	case RelationOneToMany:
		return "one_to_many"
	case RelationManyToOne:
		return "many_to_one"
	case RelationManyToMany:
		return "many_to_many"
	case RelationBelongsTo:
		return "belongs_to"
	default:
		return "unknown"
	}
}

// Cardinality 基数约束
type Cardinality struct {
	Min int `json:"min"`
	Max int `json:"max"` // -1 表示无限制
}

// ConstraintType 约束类型
type ConstraintType int

const (
	ConstraintTypeRequired ConstraintType = iota
	ConstraintTypeUnique
	ConstraintTypeLength
	ConstraintTypeRange
	ConstraintTypeFormat
	ConstraintTypeCustom
)

// String 返回约束类型的字符串表示
func (ct ConstraintType) String() string {
	switch ct {
	case ConstraintTypeRequired:
		return "required"
	case ConstraintTypeUnique:
		return "unique"
	case ConstraintTypeLength:
		return "length"
	case ConstraintTypeRange:
		return "range"
	case ConstraintTypeFormat:
		return "format"
	case ConstraintTypeCustom:
		return "custom"
	default:
		return "unknown"
	}
}

// ModelMetadata 模型元数据
type ModelMetadata struct {
	Name        string            `json:"name"`
	Version     string            `json:"version"`
	Description string            `json:"description"`
	Tags        []string          `json:"tags"`
	Properties  map[string]string `json:"properties"`
	CreatedAt   time.Time         `json:"created_at"`
	UpdatedAt   time.Time         `json:"updated_at"`
}

// ValidationResult 验证结果
type ValidationResult struct {
	IsValid bool                   `json:"is_valid"`
	Errors  []ValidationError      `json:"errors"`
	Details map[string]interface{} `json:"details"`
}

// ValidationError 验证错误
type ValidationError struct {
	Field   string      `json:"field"`
	Message string      `json:"message"`
	Code    string      `json:"code"`
	Value   interface{} `json:"value"`
}