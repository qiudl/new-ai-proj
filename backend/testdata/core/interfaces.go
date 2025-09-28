package core

import (
	"context"
)

// IDataModel 核心数据模型接口
type IDataModel interface {
	// 基础信息
	GetModelName() string

	// 字段和关系定义
	GetFields() map[string]IFieldDefinition
	GetRelations() map[string]IRelation

	// 验证和序列化
	ToMap() map[string]interface{}
	FromMap(data map[string]interface{}) error

	// 元数据
	GetMetadata() ModelMetadata
}

// IFieldDefinition 字段定义接口
type IFieldDefinition interface {
	GetName() string
	GetType() FieldType
	GetConstraints() []IConstraint
	IsRequired() bool
	IsUnique() bool
	GetDefaultValue() interface{}
	GetGenerator() IFieldGenerator
}

// IRelation 关系定义接口
type IRelation interface {
	GetName() string
	GetType() RelationType
	GetTargetModel() string
	GetForeignKey() string
	GetLocalKey() string
	IsRequired() bool
	GetCardinality() Cardinality
}

// IConstraint 约束接口
type IConstraint interface {
	GetName() string
	GetType() ConstraintType
	Validate(value interface{}) error
	GetParams() map[string]interface{}
}

// IFieldGenerator 字段生成器接口
type IFieldGenerator interface {
	Generate(ctx context.Context, config interface{}) (interface{}, error)
	GetType() FieldType
	SetSeed(seed int64)
}

// IModelRegistry 模型注册表接口
type IModelRegistry interface {
	RegisterModel(name string, factory func() IDataModel) error
	UnregisterModel(name string) error
	CreateInstance(name string) (IDataModel, error)
	ListModels() []string
	GetModelMetadata(name string) (ModelMetadata, error)
}
