package factories

import (
	"context"
	"fmt"
	"time"

	"ai-project-backend/testdata/core"
)

// FactoryHelper 工厂助手类
type FactoryHelper struct {
	registry *FactoryRegistry
	processor *BatchProcessor
	defaultConfig FactoryConfig
}

// NewFactoryHelper 创建工厂助手
func NewFactoryHelper(modelRegistry core.IModelRegistry) *FactoryHelper {
	return &FactoryHelper{
		registry:  GetFactoryRegistry(modelRegistry),
		processor: NewBatchProcessor(100, 4),
		defaultConfig: FactoryConfig{
			UseCache: true,
			GlobalSeed: time.Now().UnixNano(),
		},
	}
}

// CreateModel 创建单个模型实例
func (h *FactoryHelper) CreateModel(ctx context.Context, modelName string, config ...FactoryConfig) (interface{}, error) {
	factoryConfig := h.getEffectiveConfig(modelName, config...)
	
	factory, err := h.registry.GetDefaultFactory(modelName)
	if err != nil {
		return nil, fmt.Errorf("failed to get factory for model %s: %w", modelName, err)
	}

	return factory.Create(ctx, factoryConfig)
}

// CreateModels 批量创建模型实例
func (h *FactoryHelper) CreateModels(ctx context.Context, modelName string, count int, config ...BatchConfig) ([]interface{}, error) {
	if count <= 0 {
		return nil, fmt.Errorf("count must be positive, got %d", count)
	}

	var batchConfig BatchConfig
	if len(config) > 0 {
		batchConfig = config[0]
	} else {
		batchConfig = BatchConfig{
			FactoryConfig: h.getEffectiveConfig(modelName),
			Count:         count,
			BatchSize:     h.processor.GetBatchSize(),
			Concurrency:   h.processor.GetConcurrency(),
		}
	}

	// 确保配置正确
	batchConfig.Count = count
	if batchConfig.ModelName == "" {
		batchConfig.ModelName = modelName
	}

	factory, err := h.registry.GetDefaultFactory(modelName)
	if err != nil {
		return nil, fmt.Errorf("failed to get factory for model %s: %w", modelName, err)
	}

	return factory.CreateBatch(ctx, batchConfig)
}

// CreateWithRelations 创建带关系的模型
func (h *FactoryHelper) CreateWithRelations(ctx context.Context, modelName string, relations []RelationConfig, config ...FactoryConfig) (interface{}, error) {
	factoryConfig := h.getEffectiveConfig(modelName, config...)
	factoryConfig.Relations = relations

	factory, err := h.registry.GetDefaultFactory(modelName)
	if err != nil {
		return nil, fmt.Errorf("failed to get factory for model %s: %w", modelName, err)
	}

	return factory.Create(ctx, factoryConfig)
}

// CreateFromTemplate 从模板创建模型
func (h *FactoryHelper) CreateFromTemplate(ctx context.Context, templateName string, params map[string]interface{}) (interface{}, error) {
	// 获取模板配置
	template, err := h.loadTemplate(templateName)
	if err != nil {
		return nil, fmt.Errorf("failed to load template %s: %w", templateName, err)
	}

	// 应用参数
	config := h.applyTemplateParams(template, params)

	factory, err := h.registry.GetDefaultFactory(config.ModelName)
	if err != nil {
		return nil, fmt.Errorf("failed to get factory for model %s: %w", config.ModelName, err)
	}

	return factory.Create(ctx, config)
}

// GetFactoryStats 获取工厂统计信息
func (h *FactoryHelper) GetFactoryStats(factoryName string) (FactoryStats, error) {
	factory, err := h.registry.Get(factoryName)
	if err != nil {
		return FactoryStats{}, err
	}

	if bf, ok := factory.(*BaseFactory); ok {
		return bf.GetStats(), nil
	}

	return FactoryStats{}, fmt.Errorf("factory %s does not support statistics", factoryName)
}

// GetBatchProcessorStats 获取批处理器统计信息
func (h *FactoryHelper) GetBatchProcessorStats() BatchStats {
	return h.processor.GetStats()
}

// SetBatchSize 设置批处理大小
func (h *FactoryHelper) SetBatchSize(size int) {
	h.processor.SetBatchSize(size)
}

// SetConcurrency 设置并发数
func (h *FactoryHelper) SetConcurrency(concurrency int) {
	h.processor.SetConcurrency(concurrency)
}

// RegisterCustomFactory 注册自定义工厂
func (h *FactoryHelper) RegisterCustomFactory(name string, factory IDataFactory) error {
	return h.registry.Register(name, factory)
}

// RegisterCustomGenerator 注册自定义生成器
func (h *FactoryHelper) RegisterCustomGenerator(fieldType core.FieldType, generator IFieldGenerator) error {
	return h.registry.RegisterGenerator(fieldType, generator)
}

// ListSupportedModels 列出支持的模型
func (h *FactoryHelper) ListSupportedModels() []string {
	supportedTypes := h.registry.GetSupportedTypes()
	return supportedTypes["model_types"]
}

// ListRegisteredFactories 列出已注册的工厂
func (h *FactoryHelper) ListRegisteredFactories() []string {
	return h.registry.List()
}

// ValidateConfig 验证工厂配置
func (h *FactoryHelper) ValidateConfig(config FactoryConfig) error {
	return config.Validate()
}

// getEffectiveConfig 获取有效配置
func (h *FactoryHelper) getEffectiveConfig(modelName string, configs ...FactoryConfig) FactoryConfig {
	effectiveConfig := h.defaultConfig
	effectiveConfig.ModelName = modelName

	if len(configs) > 0 {
		provided := configs[0]
		
		// 合并配置
		if provided.ModelName != "" {
			effectiveConfig.ModelName = provided.ModelName
		}
		if provided.Template != "" {
			effectiveConfig.Template = provided.Template
		}
		if provided.Constraints != nil {
			effectiveConfig.Constraints = provided.Constraints
		}
		if provided.Generators != nil {
			effectiveConfig.Generators = provided.Generators
		}
		if provided.Relations != nil {
			effectiveConfig.Relations = provided.Relations
		}
		if provided.Metadata != nil {
			effectiveConfig.Metadata = provided.Metadata
		}
		if provided.GlobalSeed != 0 {
			effectiveConfig.GlobalSeed = provided.GlobalSeed
		}
		if provided.CacheTTL > 0 {
			effectiveConfig.CacheTTL = provided.CacheTTL
		}
		effectiveConfig.UseCache = provided.UseCache
	}

	return effectiveConfig
}

// loadTemplate 加载模板
func (h *FactoryHelper) loadTemplate(templateName string) (*TemplateConfig, error) {
	// 这里应该从配置文件或数据库加载模板
	// 暂时返回一个默认模板作为示例
	template := &TemplateConfig{
		Name:        templateName,
		Description: "Default template for " + templateName,
		Version:     "1.0.0",
		ModelName:   templateName,
		Fields:      make(map[string]FieldTemplate),
		Relations:   []RelationTemplate{},
		Constraints: []ConstraintTemplate{},
		Metadata:    make(map[string]interface{}),
	}

	return template, nil
}

// applyTemplateParams 应用模板参数
func (h *FactoryHelper) applyTemplateParams(template *TemplateConfig, params map[string]interface{}) FactoryConfig {
	config := FactoryConfig{
		ModelName:   template.ModelName,
		UseCache:    true,
		Generators:  make(map[string]GeneratorConfig),
		Relations:   make([]RelationConfig, len(template.Relations)),
		Metadata:    template.Metadata,
		GlobalSeed:  h.defaultConfig.GlobalSeed,
	}

	// 应用字段配置
	for fieldName, fieldTemplate := range template.Fields {
		config.Generators[fieldName] = fieldTemplate.Config
	}

	// 应用关系配置
	for i, relationTemplate := range template.Relations {
		config.Relations[i] = RelationConfig{
			Field:       relationTemplate.Field,
			TargetModel: relationTemplate.TargetModel,
			Strategy:    relationTemplate.Strategy,
		}
	}

	// 应用参数覆盖
	for key, value := range params {
		if config.Metadata == nil {
			config.Metadata = make(map[string]interface{})
		}
		config.Metadata[key] = value
	}

	return config
}

// QuickCreate 快速创建方法集合
type QuickCreate struct {
	helper *FactoryHelper
}

// Quick 获取快速创建方法
func (h *FactoryHelper) Quick() *QuickCreate {
	return &QuickCreate{helper: h}
}

// User 快速创建用户
func (qc *QuickCreate) User(ctx context.Context, overrides ...map[string]interface{}) (interface{}, error) {
	config := FactoryConfig{
		ModelName: "User",
		UseCache:  true,
	}

	if len(overrides) > 0 {
		config.Metadata = overrides[0]
	}

	return qc.helper.CreateModel(ctx, "User", config)
}

// Users 快速创建多个用户
func (qc *QuickCreate) Users(ctx context.Context, count int) ([]interface{}, error) {
	return qc.helper.CreateModels(ctx, "User", count)
}

// Task 快速创建任务
func (qc *QuickCreate) Task(ctx context.Context, overrides ...map[string]interface{}) (interface{}, error) {
	config := FactoryConfig{
		ModelName: "Task",
		UseCache:  true,
	}

	if len(overrides) > 0 {
		config.Metadata = overrides[0]
	}

	return qc.helper.CreateModel(ctx, "Task", config)
}

// Tasks 快速创建多个任务
func (qc *QuickCreate) Tasks(ctx context.Context, count int) ([]interface{}, error) {
	return qc.helper.CreateModels(ctx, "Task", count)
}

// Project 快速创建项目
func (qc *QuickCreate) Project(ctx context.Context, overrides ...map[string]interface{}) (interface{}, error) {
	config := FactoryConfig{
		ModelName: "Project",
		UseCache:  true,
	}

	if len(overrides) > 0 {
		config.Metadata = overrides[0]
	}

	return qc.helper.CreateModel(ctx, "Project", config)
}

// Projects 快速创建多个项目
func (qc *QuickCreate) Projects(ctx context.Context, count int) ([]interface{}, error) {
	return qc.helper.CreateModels(ctx, "Project", count)
}