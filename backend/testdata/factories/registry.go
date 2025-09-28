package factories

import (
	"context"
	"errors"
	"fmt"
	"sync"

	"ai-project-backend/testdata/core"
	"ai-project-backend/testdata/factories/generators"
)

// GeneratorWrapper 用于包装具体的生成器以实现接口
type GeneratorWrapper struct {
	gen interface{} // 存储具体的生成器
}

func (w *GeneratorWrapper) Generate(ctx context.Context, field core.IFieldDefinition, config GeneratorConfig) (interface{}, error) {
	switch g := w.gen.(type) {
	case *generators.StringGenerator:
		return g.Generate(ctx, field, generators.GeneratorConfig{
			Unique:  config.Unique,
			Locale:  config.Locale,
			Pattern: config.Pattern,
			Params:  config.Params,
			Range: struct {
				Min interface{}
				Max interface{}
			}{
				Min: config.Range.Min,
				Max: config.Range.Max,
			},
		})
	case *generators.NumberGenerator:
		return g.Generate(ctx, field, generators.GeneratorConfig{
			Unique:  config.Unique,
			Locale:  config.Locale,
			Pattern: config.Pattern,
			Params:  config.Params,
			Range: struct {
				Min interface{}
				Max interface{}
			}{
				Min: config.Range.Min,
				Max: config.Range.Max,
			},
		})
	default:
		return nil, fmt.Errorf("unknown generator type: %T", w.gen)
	}
}

func (w *GeneratorWrapper) GenerateBatch(ctx context.Context, field core.IFieldDefinition, count int, config GeneratorConfig) ([]interface{}, error) {
	switch g := w.gen.(type) {
	case *generators.StringGenerator:
		return g.GenerateBatch(ctx, field, count, generators.GeneratorConfig{
			Unique:  config.Unique,
			Locale:  config.Locale,
			Pattern: config.Pattern,
			Params:  config.Params,
			Range: struct {
				Min interface{}
				Max interface{}
			}{
				Min: config.Range.Min,
				Max: config.Range.Max,
			},
		})
	case *generators.NumberGenerator:
		return g.GenerateBatch(ctx, field, count, generators.GeneratorConfig{
			Unique:  config.Unique,
			Locale:  config.Locale,
			Pattern: config.Pattern,
			Params:  config.Params,
			Range: struct {
				Min interface{}
				Max interface{}
			}{
				Min: config.Range.Min,
				Max: config.Range.Max,
			},
		})
	default:
		return nil, fmt.Errorf("unknown generator type: %T", w.gen)
	}
}

func (w *GeneratorWrapper) GetType() core.FieldType {
	switch g := w.gen.(type) {
	case *generators.StringGenerator:
		return g.GetType()
	case *generators.NumberGenerator:
		return g.GetType()
	default:
		return core.FieldTypeString // default
	}
}

func (w *GeneratorWrapper) GetName() string {
	switch g := w.gen.(type) {
	case *generators.StringGenerator:
		return g.GetName()
	case *generators.NumberGenerator:
		return g.GetName()
	default:
		return "unknown_generator"
	}
}

func (w *GeneratorWrapper) Validate(config GeneratorConfig) error {
	return nil // Basic validation
}

func (w *GeneratorWrapper) GetStats() GeneratorStats {
	switch g := w.gen.(type) {
	case *generators.StringGenerator:
		stats := g.GetStats()
		return GeneratorStats{
			GenerationCount: stats.GenerationCount,
			TotalTime:       stats.TotalTime,
			AverageTime:     stats.AverageTime,
			LastGenerated:   stats.LastGenerated,
			ErrorCount:      stats.ErrorCount,
		}
	case *generators.NumberGenerator:
		stats := g.GetStats()
		return GeneratorStats{
			GenerationCount: stats.GenerationCount,
			TotalTime:       stats.TotalTime,
			AverageTime:     stats.AverageTime,
			LastGenerated:   stats.LastGenerated,
			ErrorCount:      stats.ErrorCount,
		}
	default:
		return GeneratorStats{}
	}
}

func (w *GeneratorWrapper) ResetStats() {
	switch g := w.gen.(type) {
	case *generators.StringGenerator:
		g.ResetStats()
	case *generators.NumberGenerator:
		g.ResetStats()
	}
}

func (w *GeneratorWrapper) SetSeed(seed int64) {
	switch g := w.gen.(type) {
	case *generators.StringGenerator:
		g.SetSeed(seed)
	case *generators.NumberGenerator:
		g.SetSeed(seed)
	}
}

func (w *GeneratorWrapper) Clone() IFieldGenerator {
	switch g := w.gen.(type) {
	case *generators.StringGenerator:
		return &GeneratorWrapper{gen: g.Clone()}
	case *generators.NumberGenerator:
		return &GeneratorWrapper{gen: g.Clone()}
	default:
		return nil
	}
}

// FactoryRegistry 工厂注册中心实现
type FactoryRegistry struct {
	factories   map[string]IDataFactory
	generators  map[core.FieldType]IFieldGenerator
	mutex       sync.RWMutex
	modelRegistry core.IModelRegistry
}

// NewFactoryRegistry 创建工厂注册中心
func NewFactoryRegistry(modelRegistry core.IModelRegistry) *FactoryRegistry {
	registry := &FactoryRegistry{
		factories:     make(map[string]IDataFactory),
		generators:    make(map[core.FieldType]IFieldGenerator),
		modelRegistry: modelRegistry,
	}

	// 注册默认生成器
	registry.registerDefaultGenerators()

	return registry
}

// Register 注册工厂
func (r *FactoryRegistry) Register(name string, factory IDataFactory) error {
	if name == "" {
		return errors.New("factory name cannot be empty")
	}

	if factory == nil {
		return errors.New("factory cannot be nil")
	}

	r.mutex.Lock()
	defer r.mutex.Unlock()

	// 检查是否已注册
	if _, exists := r.factories[name]; exists {
		return fmt.Errorf("factory %s already registered", name)
	}

	r.factories[name] = factory
	return nil
}

// Unregister 注销工厂
func (r *FactoryRegistry) Unregister(name string) error {
	r.mutex.Lock()
	defer r.mutex.Unlock()

	if _, exists := r.factories[name]; !exists {
		return fmt.Errorf("factory %s not found", name)
	}

	delete(r.factories, name)
	return nil
}

// Get 获取工厂
func (r *FactoryRegistry) Get(name string) (IDataFactory, error) {
	r.mutex.RLock()
	defer r.mutex.RUnlock()

	factory, exists := r.factories[name]
	if !exists {
		return nil, fmt.Errorf("factory %s not found", name)
	}

	return factory, nil
}

// List 列出所有工厂
func (r *FactoryRegistry) List() []string {
	r.mutex.RLock()
	defer r.mutex.RUnlock()

	names := make([]string, 0, len(r.factories))
	for name := range r.factories {
		names = append(names, name)
	}

	return names
}

// CreateFactory 创建工厂实例
func (r *FactoryRegistry) CreateFactory(name string, config FactoryConfig) (IDataFactory, error) {
	// 创建基础工厂
	factory := NewBaseFactory(name, "1.0.0", r.modelRegistry)

	// 注册生成器
	for fieldType, generator := range r.generators {
		factory.RegisterGenerator(fieldType, generator.Clone())
	}

	// 设置配置
	if err := factory.SetConfig(config); err != nil {
		return nil, fmt.Errorf("failed to set factory config: %w", err)
	}

	// 初始化工厂
	if err := factory.Initialize(); err != nil {
		return nil, fmt.Errorf("failed to initialize factory: %w", err)
	}

	return factory, nil
}

// GetSupportedTypes 获取支持的类型
func (r *FactoryRegistry) GetSupportedTypes() map[string][]string {
	r.mutex.RLock()
	defer r.mutex.RUnlock()

	result := make(map[string][]string)

	// 支持的字段类型
	fieldTypes := make([]string, 0, len(r.generators))
	for fieldType := range r.generators {
		fieldTypes = append(fieldTypes, fieldType.String())
	}
	result["field_types"] = fieldTypes

	// 支持的模型类型
	if r.modelRegistry != nil {
		result["model_types"] = r.modelRegistry.ListModels()
	}

	// 支持的工厂类型
	factoryTypes := make([]string, 0, len(r.factories))
	for name := range r.factories {
		factoryTypes = append(factoryTypes, name)
	}
	result["factory_types"] = factoryTypes

	return result
}

// RegisterGenerator 注册字段生成器
func (r *FactoryRegistry) RegisterGenerator(fieldType core.FieldType, generator IFieldGenerator) error {
	if generator == nil {
		return errors.New("generator cannot be nil")
	}

	r.mutex.Lock()
	defer r.mutex.Unlock()

	r.generators[fieldType] = generator
	return nil
}

// GetGenerator 获取字段生成器
func (r *FactoryRegistry) GetGenerator(fieldType core.FieldType) (IFieldGenerator, error) {
	r.mutex.RLock()
	defer r.mutex.RUnlock()

	generator, exists := r.generators[fieldType]
	if !exists {
		return nil, fmt.Errorf("generator for field type %s not found", fieldType.String())
	}

	return generator, nil
}

// registerDefaultGenerators 注册默认生成器
func (r *FactoryRegistry) registerDefaultGenerators() {
	// 字符串生成器
	stringGen := generators.NewStringGenerator()
	r.generators[core.FieldTypeString] = &GeneratorWrapper{gen: stringGen}
	r.generators[core.FieldTypeText] = &GeneratorWrapper{gen: generators.NewStringGenerator()}
	r.generators[core.FieldTypeEmail] = &GeneratorWrapper{gen: generators.NewStringGenerator()}
	r.generators[core.FieldTypeURL] = &GeneratorWrapper{gen: generators.NewStringGenerator()}
	r.generators[core.FieldTypeUUID] = &GeneratorWrapper{gen: generators.NewStringGenerator()}

	// 数字生成器
	intGen := generators.NewIntGenerator()
	r.generators[core.FieldTypeInt] = &GeneratorWrapper{gen: intGen}
	int64Gen := generators.NewNumberGenerator(core.FieldTypeInt64)
	r.generators[core.FieldTypeInt64] = &GeneratorWrapper{gen: int64Gen}
	floatGen := generators.NewFloatGenerator()
	r.generators[core.FieldTypeFloat64] = &GeneratorWrapper{gen: floatGen}

	// 布尔生成器
	r.generators[core.FieldTypeBool] = NewBoolGenerator()

	// 时间生成器
	r.generators[core.FieldTypeTime] = NewTimeGenerator()
	r.generators[core.FieldTypeTimestamp] = NewTimeGenerator()

	// JSON生成器
	r.generators[core.FieldTypeJSON] = NewJSONGenerator()
}

// GetDefaultFactory 获取默认工厂
func (r *FactoryRegistry) GetDefaultFactory(modelName string) (IDataFactory, error) {
	config := FactoryConfig{
		ModelName: modelName,
		UseCache:  true,
	}

	return r.CreateFactory("default_"+modelName, config)
}

// CreateBatchFactory 创建批量工厂
func (r *FactoryRegistry) CreateBatchFactory(modelName string, batchConfig BatchConfig) (IDataFactory, error) {
	config := FactoryConfig{
		ModelName:  modelName,
		UseCache:   true,
		Generators: batchConfig.Generators,
		Relations:  batchConfig.Relations,
		Metadata:   batchConfig.Metadata,
	}

	factory := NewBaseFactory("batch_"+modelName, "1.0.0", r.modelRegistry)

	// 配置批量处理优化
	for fieldType, generator := range r.generators {
		clonedGen := generator.Clone()
		// 为批量处理设置种子，确保可重现性
		if batchConfig.GlobalSeed != 0 {
			clonedGen.SetSeed(batchConfig.GlobalSeed)
		}
		factory.RegisterGenerator(fieldType, clonedGen)
	}

	if err := factory.SetConfig(config); err != nil {
		return nil, err
	}

	return factory, nil
}

// 全局工厂注册中心实例
var globalFactoryRegistry *FactoryRegistry

// GetFactoryRegistry 获取全局工厂注册中心
func GetFactoryRegistry(modelRegistry core.IModelRegistry) *FactoryRegistry {
	if globalFactoryRegistry == nil {
		globalFactoryRegistry = NewFactoryRegistry(modelRegistry)
	}
	return globalFactoryRegistry
}


