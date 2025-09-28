package factories

import (
	"context"
	"math/rand"
	"sync"
	"time"

	"ai-project-backend/testdata/core"
)

// BoolGenerator 布尔值生成器
type BoolGenerator struct {
	stats GeneratorStats
	mutex sync.RWMutex
}

// NewBoolGenerator 创建布尔生成器
func NewBoolGenerator() *BoolGenerator {
	return &BoolGenerator{
		stats: GeneratorStats{},
	}
}

// Generate 生成布尔值
func (g *BoolGenerator) Generate(ctx context.Context, field core.IFieldDefinition, config GeneratorConfig) (interface{}, error) {
	start := time.Now()
	defer func() {
		g.updateStats(time.Since(start))
	}()

	// 从配置中获取概率
	probability := 0.5 // 默认50%概率为true
	if prob, exists := config.Params["probability"]; exists {
		if p, ok := prob.(float64); ok {
			probability = p
		}
	}

	return rand.Float64() < probability, nil
}

// GenerateBatch 批量生成布尔值
func (g *BoolGenerator) GenerateBatch(ctx context.Context, field core.IFieldDefinition, count int, config GeneratorConfig) ([]interface{}, error) {
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

func (g *BoolGenerator) GetType() core.FieldType       { return core.FieldTypeBool }
func (g *BoolGenerator) GetName() string               { return "bool_generator" }
func (g *BoolGenerator) Validate(config GeneratorConfig) error { return nil }
func (g *BoolGenerator) GetStats() GeneratorStats {
	g.mutex.RLock()
	defer g.mutex.RUnlock()
	return g.stats
}
func (g *BoolGenerator) ResetStats() {
	g.mutex.Lock()
	defer g.mutex.Unlock()
	g.stats = GeneratorStats{}
}
func (g *BoolGenerator) SetSeed(seed int64) {}
func (g *BoolGenerator) Clone() IFieldGenerator { return NewBoolGenerator() }

func (g *BoolGenerator) updateStats(duration time.Duration) {
	g.mutex.Lock()
	defer g.mutex.Unlock()

	g.stats.GenerationCount++
	g.stats.TotalTime += duration
	if g.stats.GenerationCount > 0 {
		g.stats.AverageTime = g.stats.TotalTime / time.Duration(g.stats.GenerationCount)
	}
	g.stats.LastGenerated = time.Now()
}