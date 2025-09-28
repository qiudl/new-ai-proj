package factories

import (
	"context"
	"fmt"
	"math/rand"
	"sync"
	"time"

	"ai-project-backend/testdata/core"
)

// JSONGenerator JSON生成器
type JSONGenerator struct {
	stats GeneratorStats
	mutex sync.RWMutex
}

// NewJSONGenerator 创建JSON生成器
func NewJSONGenerator() *JSONGenerator {
	return &JSONGenerator{
		stats: GeneratorStats{},
	}
}

// Generate 生成JSON值
func (g *JSONGenerator) Generate(ctx context.Context, field core.IFieldDefinition, config GeneratorConfig) (interface{}, error) {
	start := time.Now()
	defer func() {
		g.updateStats(time.Since(start))
	}()

	// 生成简单的JSON对象
	data := map[string]interface{}{
		"id":        rand.Intn(1000),
		"name":      fmt.Sprintf("item_%d", rand.Intn(100)),
		"timestamp": time.Now().Unix(),
		"active":    rand.Float64() < 0.7,
	}

	return data, nil
}

// GenerateBatch 批量生成JSON值
func (g *JSONGenerator) GenerateBatch(ctx context.Context, field core.IFieldDefinition, count int, config GeneratorConfig) ([]interface{}, error) {
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

func (g *JSONGenerator) GetType() core.FieldType       { return core.FieldTypeJSON }
func (g *JSONGenerator) GetName() string               { return "json_generator" }
func (g *JSONGenerator) Validate(config GeneratorConfig) error { return nil }
func (g *JSONGenerator) GetStats() GeneratorStats {
	g.mutex.RLock()
	defer g.mutex.RUnlock()
	return g.stats
}
func (g *JSONGenerator) ResetStats() {
	g.mutex.Lock()
	defer g.mutex.Unlock()
	g.stats = GeneratorStats{}
}
func (g *JSONGenerator) SetSeed(seed int64) {}
func (g *JSONGenerator) Clone() IFieldGenerator { return NewJSONGenerator() }

func (g *JSONGenerator) updateStats(duration time.Duration) {
	g.mutex.Lock()
	defer g.mutex.Unlock()

	g.stats.GenerationCount++
	g.stats.TotalTime += duration
	if g.stats.GenerationCount > 0 {
		g.stats.AverageTime = g.stats.TotalTime / time.Duration(g.stats.GenerationCount)
	}
	g.stats.LastGenerated = time.Now()
}