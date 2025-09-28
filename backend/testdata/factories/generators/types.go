package generators

import (
	"time"

	"ai-project-backend/testdata/core"
)

// GeneratorStats 生成器统计信息（本地副本）
type GeneratorStats struct {
	GenerationCount int64         // 生成次数
	TotalTime       time.Duration // 总耗时
	AverageTime     time.Duration // 平均耗时
	LastGenerated   time.Time     // 最后生成时间
	ErrorCount      int64         // 错误次数
}

// GeneratorConfig 生成器配置（本地副本）
type GeneratorConfig struct {
	// 基础配置
	Unique      bool                   // 是否唯一
	Nullable    bool                   // 是否可空
	Locale      string                 // 语言环境
	Pattern     string                 // 生成模式
	Params      map[string]interface{} // 自定义参数

	// 范围配置
	Range struct {
		Min interface{} // 最小值
		Max interface{} // 最大值
	}

	// 约束配置
	Constraints []core.IConstraint // 字段约束

	// 扩展配置
	Metadata map[string]interface{} // 元数据
}