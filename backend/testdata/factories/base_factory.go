package factories

import (
	"context"
	"fmt"
	"sync"
	"time"

	"ai-project-backend/testdata/core"
)

// BaseFactory 基础工厂实现
type BaseFactory struct {
	name         string
	version      string
	config       FactoryConfig
	registry     core.IModelRegistry
	generators   map[string]IFieldGenerator
	cache        IFactoryCache
	stats        FactoryStats
	mutex        sync.RWMutex
	initialized  bool
}

// FactoryStats 工厂统计信息
type FactoryStats struct {
	CreationCount   uint64        `json:"creation_count"`
	BatchCount      uint64        `json:"batch_count"`
	TotalTime       time.Duration `json:"total_time"`
	AverageTime     time.Duration `json:"average_time"`
	ErrorCount      uint64        `json:"error_count"`
	CacheHitRate    float64       `json:"cache_hit_rate"`
	LastCreated     time.Time     `json:"last_created"`
	GeneratorStats  map[string]GeneratorStats `json:"generator_stats"`
}

// NewBaseFactory 创建基础工厂
func NewBaseFactory(name, version string, registry core.IModelRegistry) *BaseFactory {
	return &BaseFactory{
		name:       name,
		version:    version,
		registry:   registry,
		generators: make(map[string]IFieldGenerator),
		cache:      NewFactoryCache(1000, 10*time.Minute),
		stats:      FactoryStats{GeneratorStats: make(map[string]GeneratorStats)},
	}
}

// Initialize 初始化工厂
func (f *BaseFactory) Initialize() error {
	f.mutex.Lock()
	defer f.mutex.Unlock()

	if f.initialized {
		return nil
	}

	// 注册默认生成器
	f.registerDefaultGenerators()

	f.initialized = true
	return nil
}

// Create 创建单个数据实例
func (f *BaseFactory) Create(ctx context.Context, config FactoryConfig) (interface{}, error) {
	if !f.initialized {
		if err := f.Initialize(); err != nil {
			return nil, fmt.Errorf("factory initialization failed: %w", err)
		}
	}

	start := time.Now()
	defer func() {
		f.updateStats(time.Since(start), 1, false)
	}()

	// 验证配置
	if err := config.Validate(); err != nil {
		f.stats.ErrorCount++
		return nil, fmt.Errorf("config validation failed: %w", err)
	}

	// 检查缓存
	if config.UseCache {
		cacheKey := f.generateCacheKey(config)
		if cached, found := f.cache.Get(cacheKey); found {
			return cached, nil
		}
	}

	// 获取数据模型
	model, err := f.registry.CreateInstance(config.ModelName)
	if err != nil {
		f.stats.ErrorCount++
		return nil, fmt.Errorf("failed to create model %s: %w", config.ModelName, err)
	}

	// 生成字段数据
	data := make(map[string]interface{})
	for fieldName, fieldDef := range model.GetFields() {
		value, err := f.generateFieldValue(ctx, fieldName, fieldDef, config)
		if err != nil {
			f.stats.ErrorCount++
			return nil, fmt.Errorf("failed to generate field %s: %w", fieldName, err)
		}
		data[fieldName] = value
	}

	// 填充模型数据
	if err := model.FromMap(data); err != nil {
		f.stats.ErrorCount++
		return nil, fmt.Errorf("failed to populate model: %w", err)
	}

	// 缓存结果
	if config.UseCache {
		cacheKey := f.generateCacheKey(config)
		f.cache.Set(cacheKey, model, config.CacheTTL)
	}

	f.stats.LastCreated = time.Now()
	return model, nil
}

// CreateBatch 批量创建数据实例
func (f *BaseFactory) CreateBatch(ctx context.Context, config BatchConfig) ([]interface{}, error) {
	if !f.initialized {
		if err := f.Initialize(); err != nil {
			return nil, fmt.Errorf("factory initialization failed: %w", err)
		}
	}

	start := time.Now()
	defer func() {
		f.updateStats(time.Since(start), config.Count, true)
	}()

	// 验证配置
	if err := config.Validate(); err != nil {
		f.stats.ErrorCount++
		return nil, fmt.Errorf("batch config validation failed: %w", err)
	}

	// 设置默认值
	config.SetDefaults()

	results := make([]interface{}, 0, config.Count)

	if config.Async {
		return f.createBatchAsync(ctx, config)
	}

	// 同步批量生成
	for i := 0; i < config.Count; i += config.BatchSize {
		batchSize := config.BatchSize
		if i+batchSize > config.Count {
			batchSize = config.Count - i
		}

		batch, err := f.createBatchSync(ctx, config.FactoryConfig, batchSize)
		if err != nil {
			f.stats.ErrorCount++
			return nil, fmt.Errorf("batch creation failed at index %d: %w", i, err)
		}

		results = append(results, batch...)

		// 检查上下文取消
		select {
		case <-ctx.Done():
			return results, ctx.Err()
		default:
		}
	}

	f.stats.BatchCount++
	return results, nil
}

// createBatchSync 同步批量创建
func (f *BaseFactory) createBatchSync(ctx context.Context, config FactoryConfig, batchSize int) ([]interface{}, error) {
	results := make([]interface{}, batchSize)
	for i := 0; i < batchSize; i++ {
		result, err := f.Create(ctx, config)
		if err != nil {
			return nil, err
		}
		results[i] = result
	}
	return results, nil
}

// createBatchAsync 异步批量创建
func (f *BaseFactory) createBatchAsync(ctx context.Context, config BatchConfig) ([]interface{}, error) {
	results := make([]interface{}, config.Count)
	errors := make([]error, config.Count)
	
	// 创建工作通道
	jobs := make(chan int, config.Count)
	var wg sync.WaitGroup

	// 启动工作协程
	for w := 0; w < config.Concurrency; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for index := range jobs {
				select {
				case <-ctx.Done():
					errors[index] = ctx.Err()
					return
				default:
					result, err := f.Create(ctx, config.FactoryConfig)
					if err != nil {
						errors[index] = err
					} else {
						results[index] = result
					}
				}
			}
		}()
	}

	// 发送任务
	for i := 0; i < config.Count; i++ {
		jobs <- i
	}
	close(jobs)

	// 等待完成
	wg.Wait()

	// 检查错误
	var firstError error
	for i, err := range errors {
		if err != nil {
			if firstError == nil {
				firstError = fmt.Errorf("async creation failed at index %d: %w", i, err)
			}
			f.stats.ErrorCount++
		}
	}

	if firstError != nil {
		return nil, firstError
	}

	return results, nil
}

// generateFieldValue 生成字段值
func (f *BaseFactory) generateFieldValue(ctx context.Context, fieldName string, fieldDef core.IFieldDefinition, config FactoryConfig) (interface{}, error) {
	// 检查配置中是否有特定生成器配置
	generatorConfig, exists := config.Generators[fieldName]
	if !exists {
		generatorConfig = GeneratorConfig{
			Type: fieldDef.GetType().String(),
		}
	}

	// 设置全局种子
	if config.GlobalSeed != 0 && generatorConfig.Seed == 0 {
		generatorConfig.Seed = config.GlobalSeed
	}

	// 获取字段生成器
	generator, err := f.getFieldGenerator(fieldDef.GetType())
	if err != nil {
		return nil, err
	}

	// 生成字段值
	value, err := generator.Generate(ctx, fieldDef, generatorConfig)
	if err != nil {
		return nil, err
	}

	// 更新生成器统计
	f.updateGeneratorStats(fieldDef.GetType().String(), generator.GetStats())

	return value, nil
}

// getFieldGenerator 获取字段生成器
func (f *BaseFactory) getFieldGenerator(fieldType core.FieldType) (IFieldGenerator, error) {
	f.mutex.RLock()
	generatorName := fieldType.String()
	generator, exists := f.generators[generatorName]
	f.mutex.RUnlock()

	if !exists {
		f.mutex.Lock()
		// 双重检查
		if generator, exists = f.generators[generatorName]; !exists {
			generator = f.createDefaultGenerator(fieldType)
			f.generators[generatorName] = generator
		}
		f.mutex.Unlock()
	}

	return generator, nil
}

// SetConfig 设置配置
func (f *BaseFactory) SetConfig(config FactoryConfig) error {
	if err := config.Validate(); err != nil {
		return err
	}

	f.mutex.Lock()
	defer f.mutex.Unlock()

	f.config = config
	return nil
}

// GetConfig 获取配置
func (f *BaseFactory) GetConfig() FactoryConfig {
	f.mutex.RLock()
	defer f.mutex.RUnlock()

	return f.config
}

// Validate 验证工厂
func (f *BaseFactory) Validate() error {
	return f.config.Validate()
}

// GetName 获取名称
func (f *BaseFactory) GetName() string {
	return f.name
}

// GetVersion 获取版本
func (f *BaseFactory) GetVersion() string {
	return f.version
}

// GetSupportedModels 获取支持的模型
func (f *BaseFactory) GetSupportedModels() []string {
	if f.registry == nil {
		return []string{}
	}
	return f.registry.ListModels()
}

// Cleanup 清理工厂
func (f *BaseFactory) Cleanup() error {
	f.mutex.Lock()
	defer f.mutex.Unlock()

	if f.cache != nil {
		f.cache.Clear()
		// 如果是FactoryCache类型，停止清理协程
		if fc, ok := f.cache.(*FactoryCache); ok {
			fc.Stop()
		}
	}

	f.generators = make(map[string]IFieldGenerator)
	f.initialized = false

	return nil
}

// Reset 重置工厂
func (f *BaseFactory) Reset() error {
	f.mutex.Lock()
	defer f.mutex.Unlock()

	f.stats = FactoryStats{GeneratorStats: make(map[string]GeneratorStats)}
	if f.cache != nil {
		f.cache.Clear()
	}

	// 重置所有生成器
	for _, generator := range f.generators {
		generator.ResetStats()
	}

	return nil
}

// RegisterGenerator 注册生成器
func (f *BaseFactory) RegisterGenerator(fieldType core.FieldType, generator IFieldGenerator) {
	f.mutex.Lock()
	defer f.mutex.Unlock()

	f.generators[fieldType.String()] = generator
}

// GetStats 获取统计信息
func (f *BaseFactory) GetStats() FactoryStats {
	f.mutex.RLock()
	defer f.mutex.RUnlock()

	// 更新缓存命中率
	if f.cache != nil {
		cacheStats := f.cache.Stats()
		f.stats.CacheHitRate = cacheStats.HitRate
	}

	return f.stats
}

// generateCacheKey 生成缓存键
func (f *BaseFactory) generateCacheKey(config FactoryConfig) string {
	builder := NewCacheKeyBuilder("factory:" + f.name)
	builder.Add(config.ModelName)

	// 添加配置哈希
	if configData, err := config.ToJSON(); err == nil {
		builder.Add(string(configData))
	}

	return builder.BuildHash()
}

// updateStats 更新统计信息
func (f *BaseFactory) updateStats(duration time.Duration, count int, isBatch bool) {
	f.mutex.Lock()
	defer f.mutex.Unlock()

	f.stats.CreationCount += uint64(count)
	f.stats.TotalTime += duration

	if f.stats.CreationCount > 0 {
		f.stats.AverageTime = f.stats.TotalTime / time.Duration(f.stats.CreationCount)
	}

	if isBatch {
		f.stats.BatchCount++
	}
}

// updateGeneratorStats 更新生成器统计
func (f *BaseFactory) updateGeneratorStats(generatorName string, stats GeneratorStats) {
	f.mutex.Lock()
	defer f.mutex.Unlock()

	f.stats.GeneratorStats[generatorName] = stats
}

// registerDefaultGenerators 注册默认生成器
func (f *BaseFactory) registerDefaultGenerators() {
	// 这里会在generators包实现后注册默认生成器
	// f.generators[core.FieldTypeString.String()] = generators.NewStringGenerator()
	// f.generators[core.FieldTypeInt.String()] = generators.NewIntGenerator()
	// ... 等等
}

// createDefaultGenerator 创建默认生成器
func (f *BaseFactory) createDefaultGenerator(fieldType core.FieldType) IFieldGenerator {
	// 这里会根据字段类型创建对应的默认生成器
	// 暂时返回一个基础生成器
	return &BaseGenerator{
		fieldType: fieldType,
		name:      fieldType.String() + "_generator",
		stats:     GeneratorStats{},
	}
}

// BaseGenerator 基础生成器实现
type BaseGenerator struct {
	fieldType core.FieldType
	name      string
	stats     GeneratorStats
	mutex     sync.RWMutex
}

// Generate 生成值
func (g *BaseGenerator) Generate(ctx context.Context, field core.IFieldDefinition, config GeneratorConfig) (interface{}, error) {
	start := time.Now()
	defer func() {
		g.mutex.Lock()
		g.stats.GenerationCount++
		g.stats.TotalTime += time.Since(start)
		if g.stats.GenerationCount > 0 {
			g.stats.AverageTime = g.stats.TotalTime / time.Duration(g.stats.GenerationCount)
		}
		g.stats.LastGenerated = time.Now()
		g.mutex.Unlock()
	}()

	// 基础实现，根据字段类型返回默认值
	switch g.fieldType {
	case core.FieldTypeString:
		return "generated_string", nil
	case core.FieldTypeInt:
		return 42, nil
	case core.FieldTypeBool:
		return true, nil
	case core.FieldTypeTimestamp:
		return time.Now(), nil
	default:
		return nil, nil
	}
}

// GenerateBatch 批量生成值
func (g *BaseGenerator) GenerateBatch(ctx context.Context, field core.IFieldDefinition, count int, config GeneratorConfig) ([]interface{}, error) {
	results := make([]interface{}, count)
	for i := 0; i < count; i++ {
		value, err := g.Generate(ctx, field, config)
		if err != nil {
			return nil, err
		}
		results[i] = value
	}
	return results, nil
}

// GetType 获取类型
func (g *BaseGenerator) GetType() core.FieldType {
	return g.fieldType
}

// GetName 获取名称
func (g *BaseGenerator) GetName() string {
	return g.name
}

// Validate 验证配置
func (g *BaseGenerator) Validate(config GeneratorConfig) error {
	return nil
}

// GetStats 获取统计信息
func (g *BaseGenerator) GetStats() GeneratorStats {
	g.mutex.RLock()
	defer g.mutex.RUnlock()
	return g.stats
}

// ResetStats 重置统计
func (g *BaseGenerator) ResetStats() {
	g.mutex.Lock()
	defer g.mutex.Unlock()
	g.stats = GeneratorStats{}
}

// SetSeed 设置种子
func (g *BaseGenerator) SetSeed(seed int64) {
	// 基础实现，具体生成器会重写
}

// Clone 克隆生成器
func (g *BaseGenerator) Clone() IFieldGenerator {
	return &BaseGenerator{
		fieldType: g.fieldType,
		name:      g.name,
		stats:     GeneratorStats{},
	}
}