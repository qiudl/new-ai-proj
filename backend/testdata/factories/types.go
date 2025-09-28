package factories

import (
	"time"
)

// GeneratorStats 生成器统计信息
type GeneratorStats struct {
	GenerationCount int64         // 生成次数
	TotalTime       time.Duration // 总耗时
	AverageTime     time.Duration // 平均耗时
	LastGenerated   time.Time     // 最后生成时间
	ErrorCount      int64         // 错误次数
}



// CacheLevel 缓存级别
type CacheLevel int

const (
	CacheLevelL1 CacheLevel = iota // L1缓存
	CacheLevelL2                   // L2缓存
	CacheLevelL3                   // L3缓存
)

// CacheEntry 缓存条目
type CacheEntry struct {
	Key       string      // 缓存键
	Value     interface{} // 缓存值
	CreatedAt time.Time   // 创建时间
	ExpiresAt time.Time   // 过期时间
	Level     CacheLevel  // 缓存级别
	Size      int64       // 数据大小（字节）
}