package factories

import (
	"context"
	"math/rand"
	"sync"
	"time"

	"ai-project-backend/testdata/core"
)

// TimeGenerator 时间生成器
type TimeGenerator struct {
	stats GeneratorStats
	mutex sync.RWMutex
}

// NewTimeGenerator 创建时间生成器
func NewTimeGenerator() *TimeGenerator {
	return &TimeGenerator{
		stats: GeneratorStats{},
	}
}

// Generate 生成时间值
func (g *TimeGenerator) Generate(ctx context.Context, field core.IFieldDefinition, config GeneratorConfig) (interface{}, error) {
	start := time.Now()
	defer func() {
		g.updateStats(time.Since(start))
	}()

	// 默认范围：过去1年到未来1年
	now := time.Now()
	minTime := now.AddDate(-1, 0, 0)
	maxTime := now.AddDate(1, 0, 0)

	// 从配置中获取时间范围
	if config.Range.Min != nil {
		if t, ok := config.Range.Min.(time.Time); ok {
			minTime = t
		} else if str, ok := config.Range.Min.(string); ok {
			if t, err := time.Parse(time.RFC3339, str); err == nil {
				minTime = t
			}
		}
	}
	if config.Range.Max != nil {
		if t, ok := config.Range.Max.(time.Time); ok {
			maxTime = t
		} else if str, ok := config.Range.Max.(string); ok {
			if t, err := time.Parse(time.RFC3339, str); err == nil {
				maxTime = t
			}
		}
	}

	// 生成随机时间
	duration := maxTime.Sub(minTime)
	randomDuration := time.Duration(rand.Int63n(int64(duration)))
	
	return minTime.Add(randomDuration), nil
}

// GenerateBatch 批量生成时间值
func (g *TimeGenerator) GenerateBatch(ctx context.Context, field core.IFieldDefinition, count int, config GeneratorConfig) ([]interface{}, error) {
	results := make([]interface{}, count)
	for i := 0; i < count; i++ {
		value, err := g.Generate(ctx, field, config)
		if err != nil {
			return nil, err
		}
		results[i] = value

		select {
		case <-ctx.Done():
			return results[:i], ctx.Err()
		default:
		}
	}
	return results, nil
}

func (g *TimeGenerator) GetType() core.FieldType       { return core.FieldTypeTime }
func (g *TimeGenerator) GetName() string               { return "time_generator" }
func (g *TimeGenerator) Validate(config GeneratorConfig) error { return nil }
func (g *TimeGenerator) GetStats() GeneratorStats {
	g.mutex.RLock()
	defer g.mutex.RUnlock()
	return g.stats
}
func (g *TimeGenerator) ResetStats() {
	g.mutex.Lock()
	defer g.mutex.Unlock()
	g.stats = GeneratorStats{}
}
func (g *TimeGenerator) SetSeed(seed int64) {}
func (g *TimeGenerator) Clone() IFieldGenerator { return NewTimeGenerator() }

func (g *TimeGenerator) updateStats(duration time.Duration) {
	g.mutex.Lock()
	defer g.mutex.Unlock()

	g.stats.GenerationCount++
	g.stats.TotalTime += duration
	if g.stats.GenerationCount > 0 {
		g.stats.AverageTime = g.stats.TotalTime / time.Duration(g.stats.GenerationCount)
	}
	g.stats.LastGenerated = time.Now()
}