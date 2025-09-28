package models

import (
	"encoding/json"
	"errors"
	"reflect"
	"time"

	"ai-project-backend/testdata/core"
)

// BaseModel 基础模型实现
type BaseModel struct {
	metadata core.ModelMetadata
}

// NewBaseModel 创建基础模型
func NewBaseModel(name, version, description string) *BaseModel {
	return &BaseModel{
		metadata: core.ModelMetadata{
			Name:        name,
			Version:     version,
			Description: description,
			Tags:        make([]string, 0),
			Properties:  make(map[string]string),
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
	}
}

// GetMetadata 获取元数据
func (b *BaseModel) GetMetadata() core.ModelMetadata {
	return b.metadata
}

// SetTags 设置标签
func (b *BaseModel) SetTags(tags []string) {
	b.metadata.Tags = tags
	b.metadata.UpdatedAt = time.Now()
}

// AddTag 添加标签
func (b *BaseModel) AddTag(tag string) {
	b.metadata.Tags = append(b.metadata.Tags, tag)
	b.metadata.UpdatedAt = time.Now()
}

// SetProperty 设置属性
func (b *BaseModel) SetProperty(key, value string) {
	b.metadata.Properties[key] = value
	b.metadata.UpdatedAt = time.Now()
}

// GetProperty 获取属性
func (b *BaseModel) GetProperty(key string) (string, bool) {
	value, exists := b.metadata.Properties[key]
	return value, exists
}

// FieldDefinition 字段定义实现
type FieldDefinition struct {
	name         string
	fieldType    core.FieldType
	required     bool
	unique       bool
	defaultValue interface{}
	constraints  []core.IConstraint
	generator    core.IFieldGenerator
}

// NewFieldDefinition 创建字段定义
func NewFieldDefinition(name string, fieldType core.FieldType) *FieldDefinition {
	return &FieldDefinition{
		name:        name,
		fieldType:   fieldType,
		required:    false,
		unique:      false,
		constraints: make([]core.IConstraint, 0),
	}
}

// GetName 获取字段名
func (fd *FieldDefinition) GetName() string {
	return fd.name
}

// GetType 获取字段类型
func (fd *FieldDefinition) GetType() core.FieldType {
	return fd.fieldType
}

// GetConstraints 获取约束列表
func (fd *FieldDefinition) GetConstraints() []core.IConstraint {
	return fd.constraints
}

// IsRequired 是否必填
func (fd *FieldDefinition) IsRequired() bool {
	return fd.required
}

// IsUnique 是否唯一
func (fd *FieldDefinition) IsUnique() bool {
	return fd.unique
}

// GetDefaultValue 获取默认值
func (fd *FieldDefinition) GetDefaultValue() interface{} {
	return fd.defaultValue
}

// GetGenerator 获取生成器
func (fd *FieldDefinition) GetGenerator() core.IFieldGenerator {
	return fd.generator
}

// SetRequired 设置必填
func (fd *FieldDefinition) SetRequired(required bool) *FieldDefinition {
	fd.required = required
	return fd
}

// SetUnique 设置唯一
func (fd *FieldDefinition) SetUnique(unique bool) *FieldDefinition {
	fd.unique = unique
	return fd
}

// SetDefaultValue 设置默认值
func (fd *FieldDefinition) SetDefaultValue(value interface{}) *FieldDefinition {
	fd.defaultValue = value
	return fd
}

// AddConstraint 添加约束
func (fd *FieldDefinition) AddConstraint(constraint core.IConstraint) *FieldDefinition {
	fd.constraints = append(fd.constraints, constraint)
	return fd
}

// SetGenerator 设置生成器
func (fd *FieldDefinition) SetGenerator(generator core.IFieldGenerator) *FieldDefinition {
	fd.generator = generator
	return fd
}

// Relation 关系定义实现
type Relation struct {
	name        string
	relType     core.RelationType
	targetModel string
	foreignKey  string
	localKey    string
	required    bool
	cardinality core.Cardinality
}

// NewRelation 创建关系定义
func NewRelation(name string, relType core.RelationType, targetModel string) *Relation {
	return &Relation{
		name:        name,
		relType:     relType,
		targetModel: targetModel,
		required:    false,
		cardinality: core.Cardinality{Min: 0, Max: -1},
	}
}

// GetName 获取关系名
func (r *Relation) GetName() string {
	return r.name
}

// GetType 获取关系类型
func (r *Relation) GetType() core.RelationType {
	return r.relType
}

// GetTargetModel 获取目标模型
func (r *Relation) GetTargetModel() string {
	return r.targetModel
}

// GetForeignKey 获取外键
func (r *Relation) GetForeignKey() string {
	return r.foreignKey
}

// GetLocalKey 获取本地键
func (r *Relation) GetLocalKey() string {
	return r.localKey
}

// IsRequired 是否必需
func (r *Relation) IsRequired() bool {
	return r.required
}

// GetCardinality 获取基数
func (r *Relation) GetCardinality() core.Cardinality {
	return r.cardinality
}

// SetForeignKey 设置外键
func (r *Relation) SetForeignKey(key string) *Relation {
	r.foreignKey = key
	return r
}

// SetLocalKey 设置本地键
func (r *Relation) SetLocalKey(key string) *Relation {
	r.localKey = key
	return r
}

// SetRequired 设置必需
func (r *Relation) SetRequired(required bool) *Relation {
	r.required = required
	return r
}

// SetCardinality 设置基数
func (r *Relation) SetCardinality(cardinality core.Cardinality) *Relation {
	r.cardinality = cardinality
	return r
}

// Constraint 约束实现
type Constraint struct {
	name        string
	consType    core.ConstraintType
	params      map[string]interface{}
	validatorFn func(interface{}) error
}

// NewConstraint 创建约束
func NewConstraint(name string, consType core.ConstraintType) *Constraint {
	return &Constraint{
		name:     name,
		consType: consType,
		params:   make(map[string]interface{}),
	}
}

// GetName 获取约束名
func (c *Constraint) GetName() string {
	return c.name
}

// GetType 获取约束类型
func (c *Constraint) GetType() core.ConstraintType {
	return c.consType
}

// GetParams 获取参数
func (c *Constraint) GetParams() map[string]interface{} {
	return c.params
}

// Validate 验证值
func (c *Constraint) Validate(value interface{}) error {
	if c.validatorFn != nil {
		return c.validatorFn(value)
	}
	return nil
}

// SetParam 设置参数
func (c *Constraint) SetParam(key string, value interface{}) *Constraint {
	c.params[key] = value
	return c
}

// SetValidator 设置验证函数
func (c *Constraint) SetValidator(fn func(interface{}) error) *Constraint {
	c.validatorFn = fn
	return c
}

// ToMap 通用的ToMap实现
func ToMapGeneric(model interface{}) map[string]interface{} {
	data := make(map[string]interface{})
	
	v := reflect.ValueOf(model)
	if v.Kind() == reflect.Ptr {
		v = v.Elem()
	}
	
	if v.Kind() != reflect.Struct {
		return data
	}
	
	t := v.Type()
	for i := 0; i < v.NumField(); i++ {
		field := t.Field(i)
		value := v.Field(i)
		
		// 跳过私有字段
		if !field.IsExported() {
			continue
		}
		
		// 使用json tag作为key，如果没有则使用字段名
		key := field.Name
		if tag := field.Tag.Get("json"); tag != "" && tag != "-" {
			key = tag
		}
		
		data[key] = value.Interface()
	}
	
	return data
}

// FromMapGeneric 通用的FromMap实现
func FromMapGeneric(model interface{}, data map[string]interface{}) error {
	v := reflect.ValueOf(model)
	if v.Kind() != reflect.Ptr {
		return errors.New("model must be a pointer")
	}
	
	v = v.Elem()
	if v.Kind() != reflect.Struct {
		return errors.New("model must be a struct")
	}
	
	t := v.Type()
	for i := 0; i < v.NumField(); i++ {
		field := t.Field(i)
		fieldValue := v.Field(i)
		
		// 跳过不可设置的字段
		if !fieldValue.CanSet() {
			continue
		}
		
		// 获取对应的数据键
		key := field.Name
		if tag := field.Tag.Get("json"); tag != "" && tag != "-" {
			key = tag
		}
		
		// 从数据中获取值
		if value, exists := data[key]; exists {
			// 类型转换并设置值
			if err := setFieldValue(fieldValue, value); err != nil {
				return err
			}
		}
	}
	
	return nil
}

// setFieldValue 设置字段值
func setFieldValue(fieldValue reflect.Value, value interface{}) error {
	if value == nil {
		return nil
	}
	
	valueReflect := reflect.ValueOf(value)
	
	// 处理类型转换
	if valueReflect.Type().ConvertibleTo(fieldValue.Type()) {
		fieldValue.Set(valueReflect.Convert(fieldValue.Type()))
	} else if fieldValue.Kind() == reflect.Ptr {
		// 处理指针类型
		if valueReflect.Type().ConvertibleTo(fieldValue.Type().Elem()) {
			newValue := reflect.New(fieldValue.Type().Elem())
			newValue.Elem().Set(valueReflect.Convert(fieldValue.Type().Elem()))
			fieldValue.Set(newValue)
		}
	} else {
		// 尝试JSON转换
		if jsonBytes, err := json.Marshal(value); err == nil {
			newValue := reflect.New(fieldValue.Type())
			if err := json.Unmarshal(jsonBytes, newValue.Interface()); err == nil {
				fieldValue.Set(newValue.Elem())
			}
		}
	}
	
	return nil
}