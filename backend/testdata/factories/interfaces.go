package factories

import (
	"context"
	"time"

	"ai-project-backend/testdata/core"
)

// IDataFactory 数据工厂核心接口
type IDataFactory interface {
	// 基础生成方法
	Create(ctx context.Context, config FactoryConfig) (interface{}, error)
	CreateBatch(ctx context.Context, config BatchConfig) ([]interface{}, error)

	// 配置管理
	SetConfig(config FactoryConfig) error
	GetConfig() FactoryConfig
	Validate() error

	// 元数据
	GetName() string
	GetVersion() string
	GetSupportedModels() []string

	// 生命周期
	Initialize() error
	Cleanup() error
	Reset() error
}

// IFieldGenerator 字段生成器接口
type IFieldGenerator interface {
	Generate(ctx context.Context, field core.IFieldDefinition, config GeneratorConfig) (interface{}, error)
	GenerateBatch(ctx context.Context, field core.IFieldDefinition, count int, config GeneratorConfig) ([]interface{}, error)

	GetType() core.FieldType
	GetName() string
	Validate(config GeneratorConfig) error

	// 统计信息
	GetStats() GeneratorStats
	ResetStats()

	// 生命周期
	SetSeed(seed int64)
	Clone() IFieldGenerator
}

// IBatchProcessor 批处理器接口
type IBatchProcessor interface {
	Process(ctx context.Context, items []interface{}, config BatchProcessConfig) error
	ProcessAsync(ctx context.Context, items []interface{}, config BatchProcessConfig) (<-chan ProcessResult, error)

	GetBatchSize() int
	SetBatchSize(size int)
	GetConcurrency() int
	SetConcurrency(concurrency int)

	// 统计信息
	GetStats() BatchStats
}

// IFactoryRegistry 工厂注册表接口
type IFactoryRegistry interface {
	Register(name string, factory IDataFactory) error
	Unregister(name string) error
	Get(name string) (IDataFactory, error)
	List() []string

	CreateFactory(name string, config FactoryConfig) (IDataFactory, error)
	GetSupportedTypes() map[string][]string
}

// IFactoryCache 工厂缓存接口
type IFactoryCache interface {
	Get(key string) (interface{}, bool)
	Set(key string, value interface{}, ttl time.Duration)
	Delete(key string)
	Clear()
	Size() int
	Stats() CacheStats
}


// CacheStats 缓存统计信息
type CacheStats struct {
	HitCount    uint64    `json:"hit_count"`
	MissCount   uint64    `json:"miss_count"`
	HitRate     float64   `json:"hit_rate"`
	Size        int       `json:"size"`
	MaxSize     int       `json:"max_size"`
	Evictions   uint64    `json:"evictions"`
	LastCleared time.Time `json:"last_cleared"`
}

// BatchStats 批处理统计信息
type BatchStats struct {
	BatchCount      uint64        `json:"batch_count"`
	ItemCount       uint64        `json:"item_count"`
	TotalTime       time.Duration `json:"total_time"`
	AverageTime     time.Duration `json:"average_time"`
	ErrorCount      uint64        `json:"error_count"`
	SuccessCount    uint64        `json:"success_count"`
	LastProcessed   time.Time     `json:"last_processed"`
}



// ProcessResult 处理结果
type ProcessResult struct {
	Index  int         `json:"index"`
	Data   interface{} `json:"data"`
	Error  error       `json:"error"`
	Timing time.Duration `json:"timing"`
}

// FactoryError 工厂错误接口
type FactoryError interface {
	error
	GetCode() string
	GetDetails() map[string]interface{}
	IsRecoverable() bool
}

// ValidationError 验证错误
type ValidationError struct {
	Field   string      `json:"field"`
	Message string      `json:"message"`
	Value   interface{} `json:"value"`
	Code    string      `json:"code"`
}

func (e ValidationError) Error() string {
	return e.Message
}

func (e ValidationError) GetCode() string {
	return e.Code
}

func (e ValidationError) GetDetails() map[string]interface{} {
	return map[string]interface{}{
		"field": e.Field,
		"value": e.Value,
	}
}

func (e ValidationError) IsRecoverable() bool {
	return true
}