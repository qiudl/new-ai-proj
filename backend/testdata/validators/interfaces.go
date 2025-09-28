package validators

import (
	"context"
	"time"
)

// IValidationEngine 验证引擎核心接口
type IValidationEngine interface {
	// 注册验证规则
	RegisterRule(rule IValidationRule) error
	
	// 注册多个验证规则
	RegisterRules(rules []IValidationRule) error
	
	// 移除验证规则
	UnregisterRule(ruleID string) error
	
	// 验证单个值
	Validate(ctx context.Context, value interface{}, context IValidationContext) IValidationResult
	
	// 批量验证
	ValidateBatch(ctx context.Context, values []interface{}, context IValidationContext) []IValidationResult
	
	// 验证对象的所有字段
	ValidateObject(ctx context.Context, obj interface{}, context IValidationContext) IValidationResult
	
	// 获取已注册的规则
	GetRegisteredRules() []IValidationRule
	
	// 获取引擎统计信息
	GetStats() EngineStats
	
	// 重置引擎状态
	Reset() error
}

// IValidationRule 验证规则接口
type IValidationRule interface {
	// 获取规则唯一标识
	GetID() string
	
	// 获取规则名称
	GetName() string
	
	// 获取规则描述
	GetDescription() string
	
	// 获取规则版本
	GetVersion() string
	
	// 检查是否可以验证指定类型
	CanValidate(valueType ValueType) bool
	
	// 执行验证
	Validate(ctx context.Context, value interface{}, context IValidationContext) IValidationResult
	
	// 获取规则优先级 (数字越大优先级越高)
	GetPriority() int
	
	// 获取规则参数
	GetParams() map[string]interface{}
	
	// 设置规则参数
	SetParams(params map[string]interface{}) error
	
	// 规则是否启用
	IsEnabled() bool
	
	// 启用/禁用规则
	SetEnabled(enabled bool)
}

// IValidationContext 验证上下文接口
type IValidationContext interface {
	// 获取上下文值
	GetValue(key string) interface{}
	
	// 设置上下文值
	SetValue(key string, value interface{})
	
	// 检查是否存在指定键
	HasValue(key string) bool
	
	// 获取所有上下文键
	GetKeys() []string
	
	// 获取验证目标信息
	GetTarget() ValidationTarget
	
	// 设置验证目标信息
	SetTarget(target ValidationTarget)
	
	// 获取验证选项
	GetOptions() ValidationOptions
	
	// 设置验证选项
	SetOptions(options ValidationOptions)
	
	// 创建子上下文
	CreateChild() IValidationContext
	
	// 合并其他上下文
	Merge(other IValidationContext) error
}

// IValidationResult 验证结果接口
type IValidationResult interface {
	// 验证是否通过
	IsValid() bool
	
	// 获取错误列表
	GetErrors() []ValidationError
	
	// 获取警告列表
	GetWarnings() []ValidationWarning
	
	// 添加错误
	AddError(err ValidationError)
	
	// 添加警告
	AddWarning(warning ValidationWarning)
	
	// 获取详细信息
	GetDetails() map[string]interface{}
	
	// 设置详细信息
	SetDetails(details map[string]interface{})
	
	// 合并其他验证结果
	Merge(other IValidationResult) error
	
	// 获取验证耗时
	GetDuration() time.Duration
	
	// 设置验证耗时
	SetDuration(duration time.Duration)
	
	// 获取验证的规则列表
	GetValidatedRules() []string
	
	// 转换为JSON格式
	ToJSON() ([]byte, error)
}

// IValidationPipeline 验证流水线接口
type IValidationPipeline interface {
	// 添加验证步骤
	AddStep(step ValidationStep) error
	
	// 移除验证步骤
	RemoveStep(stepID string) error
	
	// 执行流水线
	Execute(ctx context.Context, value interface{}, context IValidationContext) IValidationResult
	
	// 获取流水线步骤
	GetSteps() []ValidationStep
	
	// 设置流水线配置
	SetConfig(config PipelineConfig) error
	
	// 获取流水线统计
	GetStats() PipelineStats
}

// ValueType 值类型枚举
type ValueType int

const (
	TypeUnknown ValueType = iota
	TypeString
	TypeInt
	TypeInt64
	TypeFloat32
	TypeFloat64
	TypeBool
	TypeTime
	TypeStruct
	TypeSlice
	TypeMap
	TypeInterface
	TypePointer
)

// ValidationTarget 验证目标信息
type ValidationTarget struct {
	ObjectType string                 `json:"object_type"`
	FieldName  string                 `json:"field_name"`
	FieldPath  string                 `json:"field_path"`
	Metadata   map[string]interface{} `json:"metadata"`
}

// ValidationOptions 验证选项
type ValidationOptions struct {
	StopOnFirstError bool              `json:"stop_on_first_error"`
	IncludeWarnings  bool              `json:"include_warnings"`
	Timeout          time.Duration     `json:"timeout"`
	MaxConcurrency   int               `json:"max_concurrency"`
	CustomOptions    map[string]interface{} `json:"custom_options"`
}

// ValidationError 验证错误
type ValidationError struct {
	RuleID      string                 `json:"rule_id"`
	RuleName    string                 `json:"rule_name"`
	FieldName   string                 `json:"field_name"`
	FieldPath   string                 `json:"field_path"`
	Message     string                 `json:"message"`
	Code        string                 `json:"code"`
	Severity    ErrorSeverity          `json:"severity"`
	Value       interface{}            `json:"value"`
	Metadata    map[string]interface{} `json:"metadata"`
	Timestamp   time.Time              `json:"timestamp"`
}

// ValidationWarning 验证警告
type ValidationWarning struct {
	RuleID      string                 `json:"rule_id"`
	RuleName    string                 `json:"rule_name"`
	FieldName   string                 `json:"field_name"`
	FieldPath   string                 `json:"field_path"`
	Message     string                 `json:"message"`
	Code        string                 `json:"code"`
	Value       interface{}            `json:"value"`
	Metadata    map[string]interface{} `json:"metadata"`
	Timestamp   time.Time              `json:"timestamp"`
}

// ErrorSeverity 错误严重程度
type ErrorSeverity int

const (
	SeverityLow ErrorSeverity = iota
	SeverityMedium
	SeverityHigh
	SeverityCritical
)

// ValidationStep 验证步骤
type ValidationStep struct {
	ID          string                 `json:"id"`
	Name        string                 `json:"name"`
	Description string                 `json:"description"`
	Rules       []IValidationRule      `json:"-"`
	Order       int                    `json:"order"`
	Enabled     bool                   `json:"enabled"`
	Config      map[string]interface{} `json:"config"`
}

// PipelineConfig 流水线配置
type PipelineConfig struct {
	Name            string        `json:"name"`
	Version         string        `json:"version"`
	Timeout         time.Duration `json:"timeout"`
	MaxConcurrency  int          `json:"max_concurrency"`
	StopOnFirstError bool         `json:"stop_on_first_error"`
	RetryCount      int          `json:"retry_count"`
	RetryDelay      time.Duration `json:"retry_delay"`
}

// EngineStats 引擎统计信息
type EngineStats struct {
	TotalRules        int           `json:"total_rules"`
	EnabledRules      int           `json:"enabled_rules"`
	TotalValidations  int64         `json:"total_validations"`
	SuccessfulValidations int64     `json:"successful_validations"`
	FailedValidations int64         `json:"failed_validations"`
	AverageExecutionTime time.Duration `json:"average_execution_time"`
	LastResetTime     time.Time     `json:"last_reset_time"`
	StartTime         time.Time     `json:"start_time"`
}

// PipelineStats 流水线统计信息
type PipelineStats struct {
	TotalSteps       int           `json:"total_steps"`
	EnabledSteps     int           `json:"enabled_steps"`
	TotalExecutions  int64         `json:"total_executions"`
	SuccessfulExecutions int64     `json:"successful_executions"`
	FailedExecutions int64         `json:"failed_executions"`
	AverageExecutionTime time.Duration `json:"average_execution_time"`
}

// String 方法实现
func (vt ValueType) String() string {
	switch vt {
	case TypeString:
		return "string"
	case TypeInt:
		return "int"
	case TypeInt64:
		return "int64"
	case TypeFloat32:
		return "float32"
	case TypeFloat64:
		return "float64"
	case TypeBool:
		return "bool"
	case TypeTime:
		return "time"
	case TypeStruct:
		return "struct"
	case TypeSlice:
		return "slice"
	case TypeMap:
		return "map"
	case TypeInterface:
		return "interface"
	case TypePointer:
		return "pointer"
	default:
		return "unknown"
	}
}

func (es ErrorSeverity) String() string {
	switch es {
	case SeverityLow:
		return "low"
	case SeverityMedium:
		return "medium"
	case SeverityHigh:
		return "high"
	case SeverityCritical:
		return "critical"
	default:
		return "unknown"
	}
}