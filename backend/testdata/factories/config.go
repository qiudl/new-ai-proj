package factories

import (
	"encoding/json"
	"time"
)

// FactoryConfig 工厂配置
type FactoryConfig struct {
	ModelName     string                       `json:"model_name"`
	Template      string                       `json:"template,omitempty"`
	Constraints   map[string]interface{}       `json:"constraints,omitempty"`
	Generators    map[string]GeneratorConfig   `json:"generators,omitempty"`
	Relations     []RelationConfig             `json:"relations,omitempty"`
	Metadata      map[string]interface{}       `json:"metadata,omitempty"`
	GlobalSeed    int64                        `json:"global_seed,omitempty"`
	UseCache      bool                         `json:"use_cache,omitempty"`
	CacheTTL      time.Duration                `json:"cache_ttl,omitempty"`
}

// BatchConfig 批量生成配置
type BatchConfig struct {
	FactoryConfig
	Count       int           `json:"count"`
	BatchSize   int           `json:"batch_size,omitempty"`
	Concurrency int           `json:"concurrency,omitempty"`
	Timeout     time.Duration `json:"timeout,omitempty"`
	Async       bool          `json:"async,omitempty"`
	Shuffle     bool          `json:"shuffle,omitempty"`
	Progress    bool          `json:"progress,omitempty"`
}

// GeneratorConfig 生成器配置
type GeneratorConfig struct {
	Type       string                 `json:"type"`
	Params     map[string]interface{} `json:"params,omitempty"`
	Locale     string                 `json:"locale,omitempty"`
	Seed       int64                  `json:"seed,omitempty"`
	Cache      bool                   `json:"cache,omitempty"`
	Unique     bool                   `json:"unique,omitempty"`
	Pattern    string                 `json:"pattern,omitempty"`
	Range      RangeConfig            `json:"range,omitempty"`
	Options    []interface{}          `json:"options,omitempty"`
	Weights    []float64              `json:"weights,omitempty"`
}

// RangeConfig 范围配置
type RangeConfig struct {
	Min interface{} `json:"min,omitempty"`
	Max interface{} `json:"max,omitempty"`
}

// RelationConfig 关系配置
type RelationConfig struct {
	Field       string      `json:"field"`
	TargetModel string      `json:"target_model"`
	Strategy    string      `json:"strategy"` // existing, create, mixed
	Ratio       float64     `json:"ratio,omitempty"`
	Filter      interface{} `json:"filter,omitempty"`
	Reference   string      `json:"reference,omitempty"`
	Cascade     bool        `json:"cascade,omitempty"`
}

// BatchProcessConfig 批处理配置
type BatchProcessConfig struct {
	BatchSize    int           `json:"batch_size"`
	Concurrency  int           `json:"concurrency"`
	Timeout      time.Duration `json:"timeout"`
	RetryCount   int           `json:"retry_count"`
	RetryDelay   time.Duration `json:"retry_delay"`
	ErrorHandler string        `json:"error_handler"` // stop, skip, retry
}

// TemplateConfig 模板配置
type TemplateConfig struct {
	Name        string                     `json:"name"`
	Description string                     `json:"description"`
	Version     string                     `json:"version"`
	ModelName   string                     `json:"model_name"`
	Fields      map[string]FieldTemplate   `json:"fields"`
	Relations   []RelationTemplate         `json:"relations"`
	Constraints []ConstraintTemplate       `json:"constraints"`
	Metadata    map[string]interface{}     `json:"metadata"`
}

// FieldTemplate 字段模板
type FieldTemplate struct {
	Type        string                 `json:"type"`
	Generator   string                 `json:"generator"`
	Config      GeneratorConfig        `json:"config"`
	Required    bool                   `json:"required"`
	Unique      bool                   `json:"unique"`
	Default     interface{}            `json:"default,omitempty"`
	Description string                 `json:"description,omitempty"`
}

// RelationTemplate 关系模板
type RelationTemplate struct {
	Field       string      `json:"field"`
	TargetModel string      `json:"target_model"`
	Type        string      `json:"type"`
	Strategy    string      `json:"strategy"`
	Config      interface{} `json:"config,omitempty"`
}

// ConstraintTemplate 约束模板
type ConstraintTemplate struct {
	Field   string                 `json:"field"`
	Type    string                 `json:"type"`
	Params  map[string]interface{} `json:"params"`
	Message string                 `json:"message,omitempty"`
}

// CacheConfig 缓存配置
type CacheConfig struct {
	Enabled    bool          `json:"enabled"`
	MaxSize    int           `json:"max_size"`
	DefaultTTL time.Duration `json:"default_ttl"`
	CleanupInterval time.Duration `json:"cleanup_interval"`
	EvictionPolicy string    `json:"eviction_policy"` // lru, lfu, ttl
}

// StatsConfig 统计配置
type StatsConfig struct {
	Enabled        bool          `json:"enabled"`
	FlushInterval  time.Duration `json:"flush_interval"`
	HistorySize    int           `json:"history_size"`
	MetricsEnabled bool          `json:"metrics_enabled"`
}

// Validate 验证工厂配置
func (c *FactoryConfig) Validate() error {
	if c.ModelName == "" {
		return &ValidationError{
			Field:   "model_name",
			Message: "model name is required",
			Code:    "MISSING_MODEL_NAME",
		}
	}

	// 验证生成器配置
	for fieldName, genConfig := range c.Generators {
		if genConfig.Type == "" {
			return &ValidationError{
				Field:   fieldName + ".type",
				Message: "generator type is required",
				Code:    "MISSING_GENERATOR_TYPE",
			}
		}
	}

	// 验证关系配置
	for i, relConfig := range c.Relations {
		if relConfig.Field == "" {
			return &ValidationError{
				Field:   "relations[" + string(rune(i)) + "].field",
				Message: "relation field is required",
				Code:    "MISSING_RELATION_FIELD",
			}
		}
		if relConfig.TargetModel == "" {
			return &ValidationError{
				Field:   "relations[" + string(rune(i)) + "].target_model",
				Message: "relation target model is required",
				Code:    "MISSING_RELATION_TARGET",
			}
		}
	}

	return nil
}

// Validate 验证批量配置
func (c *BatchConfig) Validate() error {
	if err := c.FactoryConfig.Validate(); err != nil {
		return err
	}

	if c.Count <= 0 {
		return &ValidationError{
			Field:   "count",
			Message: "count must be greater than 0",
			Code:    "INVALID_COUNT",
			Value:   c.Count,
		}
	}

	if c.BatchSize < 0 {
		return &ValidationError{
			Field:   "batch_size",
			Message: "batch size cannot be negative",
			Code:    "INVALID_BATCH_SIZE",
			Value:   c.BatchSize,
		}
	}

	if c.Concurrency < 0 {
		return &ValidationError{
			Field:   "concurrency",
			Message: "concurrency cannot be negative",
			Code:    "INVALID_CONCURRENCY",
			Value:   c.Concurrency,
		}
	}

	return nil
}

// Clone 深拷贝配置
func (c *FactoryConfig) Clone() *FactoryConfig {
	data, _ := json.Marshal(c)
	var clone FactoryConfig
	json.Unmarshal(data, &clone)
	return &clone
}

// Merge 合并配置
func (c *FactoryConfig) Merge(other *FactoryConfig) *FactoryConfig {
	result := c.Clone()

	if other.ModelName != "" {
		result.ModelName = other.ModelName
	}
	if other.Template != "" {
		result.Template = other.Template
	}

	// 合并约束
	if result.Constraints == nil {
		result.Constraints = make(map[string]interface{})
	}
	for k, v := range other.Constraints {
		result.Constraints[k] = v
	}

	// 合并生成器配置
	if result.Generators == nil {
		result.Generators = make(map[string]GeneratorConfig)
	}
	for k, v := range other.Generators {
		result.Generators[k] = v
	}

	// 合并关系配置
	result.Relations = append(result.Relations, other.Relations...)

	// 合并元数据
	if result.Metadata == nil {
		result.Metadata = make(map[string]interface{})
	}
	for k, v := range other.Metadata {
		result.Metadata[k] = v
	}

	return result
}

// SetDefaults 设置默认值
func (c *BatchConfig) SetDefaults() {
	if c.BatchSize <= 0 {
		c.BatchSize = 100
	}
	if c.Concurrency <= 0 {
		c.Concurrency = 4
	}
	if c.Timeout <= 0 {
		c.Timeout = 30 * time.Second
	}
	if c.CacheTTL <= 0 {
		c.CacheTTL = 10 * time.Minute
	}
}

// ToJSON 转换为JSON
func (c *FactoryConfig) ToJSON() ([]byte, error) {
	return json.MarshalIndent(c, "", "  ")
}

// FromJSON 从JSON加载配置
func (c *FactoryConfig) FromJSON(data []byte) error {
	return json.Unmarshal(data, c)
}