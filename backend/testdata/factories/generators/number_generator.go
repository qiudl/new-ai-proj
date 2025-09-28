package generators

import (
	"context"
	"math/rand"
	"sync"
	"time"

	"ai-project-backend/testdata/core"
)

// NumberGenerator 数字生成器
type NumberGenerator struct {
	fieldType core.FieldType
	rand      *rand.Rand
	stats     GeneratorStats
	mutex     sync.RWMutex
	uniqueSet map[interface{}]bool
}

// NewNumberGenerator 创建数字生成器
func NewNumberGenerator(fieldType core.FieldType) *NumberGenerator {
	return &NumberGenerator{
		fieldType: fieldType,
		rand:      rand.New(rand.NewSource(time.Now().UnixNano())),
		stats:     GeneratorStats{},
		uniqueSet: make(map[interface{}]bool),
	}
}

// NewIntGenerator 创建整数生成器
func NewIntGenerator() *NumberGenerator {
	return NewNumberGenerator(core.FieldTypeInt)
}

// NewFloatGenerator 创建浮点数生成器
func NewFloatGenerator() *NumberGenerator {
	return NewNumberGenerator(core.FieldTypeFloat64)
}

// Generate 生成数字值
func (g *NumberGenerator) Generate(ctx context.Context, field core.IFieldDefinition, config GeneratorConfig) (interface{}, error) {
	start := time.Now()
	defer func() {
		g.updateStats(time.Since(start))
	}()

	var result interface{}

	switch g.fieldType {
	case core.FieldTypeInt:
		result = g.generateInt(field, config)
	case core.FieldTypeInt64:
		result = g.generateInt64(field, config)
	case core.FieldTypeFloat64:
		result = g.generateFloat(field, config)
	default:
		result = g.generateInt(field, config)
	}

	// 确保唯一性
	if config.Unique {
		result = g.ensureUnique(result)
	}

	return result, nil
}

// GenerateBatch 批量生成数字值
func (g *NumberGenerator) GenerateBatch(ctx context.Context, field core.IFieldDefinition, count int, config GeneratorConfig) ([]interface{}, error) {
	results := make([]interface{}, count)
	for i := 0; i < count; i++ {
		value, err := g.Generate(ctx, field, config)
		if err != nil {
			return nil, err
		}
		results[i] = value

		// 检查上下文取消
		select {
		case <-ctx.Done():
			return results[:i], ctx.Err()
		default:
		}
	}
	return results, nil
}

// generateInt 生成整数
func (g *NumberGenerator) generateInt(field core.IFieldDefinition, config GeneratorConfig) int {
	min, max := g.getIntRange(field, config)
	
	if min >= max {
		return min
	}
	
	return min + g.rand.Intn(max-min+1)
}

// generateInt64 生成64位整数
func (g *NumberGenerator) generateInt64(field core.IFieldDefinition, config GeneratorConfig) int64 {
	min, max := g.getInt64Range(field, config)
	
	if min >= max {
		return min
	}
	
	return min + g.rand.Int63n(max-min+1)
}

// generateFloat 生成浮点数
func (g *NumberGenerator) generateFloat(field core.IFieldDefinition, config GeneratorConfig) float64 {
	min, max := g.getFloatRange(field, config)
	
	if min >= max {
		return min
	}
	
	return min + g.rand.Float64()*(max-min)
}

// getIntRange 获取整数范围
func (g *NumberGenerator) getIntRange(field core.IFieldDefinition, config GeneratorConfig) (int, int) {
	min, max := 0, 1000 // 默认范围

	// 从字段约束中获取范围
	for _, constraint := range field.GetConstraints() {
		params := constraint.GetParams()
		switch constraint.GetType() {
		case core.ConstraintTypeRange:
			if minVal, ok := params["min"].(int); ok {
				min = minVal
			}
			if maxVal, ok := params["max"].(int); ok {
				max = maxVal
			}
		}
	}

	// 从配置中获取范围
	if config.Range.Min != nil {
		if minVal, ok := config.Range.Min.(int); ok {
			min = minVal
		} else if minVal, ok := config.Range.Min.(float64); ok {
			min = int(minVal)
		}
	}
	if config.Range.Max != nil {
		if maxVal, ok := config.Range.Max.(int); ok {
			max = maxVal
		} else if maxVal, ok := config.Range.Max.(float64); ok {
			max = int(maxVal)
		}
	}

	if min > max {
		min, max = max, min
	}

	return min, max
}

// getInt64Range 获取64位整数范围
func (g *NumberGenerator) getInt64Range(field core.IFieldDefinition, config GeneratorConfig) (int64, int64) {
	min, max := int64(0), int64(1000000) // 默认范围

	// 从字段约束中获取范围
	for _, constraint := range field.GetConstraints() {
		params := constraint.GetParams()
		switch constraint.GetType() {
		case core.ConstraintTypeRange:
			if minVal, ok := params["min"].(int64); ok {
				min = minVal
			} else if minVal, ok := params["min"].(int); ok {
				min = int64(minVal)
			}
			if maxVal, ok := params["max"].(int64); ok {
				max = maxVal
			} else if maxVal, ok := params["max"].(int); ok {
				max = int64(maxVal)
			}
		}
	}

	// 从配置中获取范围
	if config.Range.Min != nil {
		if minVal, ok := config.Range.Min.(int64); ok {
			min = minVal
		} else if minVal, ok := config.Range.Min.(int); ok {
			min = int64(minVal)
		} else if minVal, ok := config.Range.Min.(float64); ok {
			min = int64(minVal)
		}
	}
	if config.Range.Max != nil {
		if maxVal, ok := config.Range.Max.(int64); ok {
			max = maxVal
		} else if maxVal, ok := config.Range.Max.(int); ok {
			max = int64(maxVal)
		} else if maxVal, ok := config.Range.Max.(float64); ok {
			max = int64(maxVal)
		}
	}

	if min > max {
		min, max = max, min
	}

	return min, max
}

// getFloatRange 获取浮点数范围
func (g *NumberGenerator) getFloatRange(field core.IFieldDefinition, config GeneratorConfig) (float64, float64) {
	min, max := 0.0, 1000.0 // 默认范围

	// 从字段约束中获取范围
	for _, constraint := range field.GetConstraints() {
		params := constraint.GetParams()
		switch constraint.GetType() {
		case core.ConstraintTypeRange:
			if minVal, ok := params["min"].(float64); ok {
				min = minVal
			} else if minVal, ok := params["min"].(int); ok {
				min = float64(minVal)
			}
			if maxVal, ok := params["max"].(float64); ok {
				max = maxVal
			} else if maxVal, ok := params["max"].(int); ok {
				max = float64(maxVal)
			}
		}
	}

	// 从配置中获取范围
	if config.Range.Min != nil {
		if minVal, ok := config.Range.Min.(float64); ok {
			min = minVal
		} else if minVal, ok := config.Range.Min.(int); ok {
			min = float64(minVal)
		}
	}
	if config.Range.Max != nil {
		if maxVal, ok := config.Range.Max.(float64); ok {
			max = maxVal
		} else if maxVal, ok := config.Range.Max.(int); ok {
			max = float64(maxVal)
		}
	}

	if min > max {
		min, max = max, min
	}

	return min, max
}

// ensureUnique 确保唯一性
func (g *NumberGenerator) ensureUnique(value interface{}) interface{} {
	g.mutex.Lock()
	defer g.mutex.Unlock()

	// 如果值已存在，生成新值
	for g.uniqueSet[value] {
		switch v := value.(type) {
		case int:
			value = v + 1
		case int64:
			value = v + 1
		case float64:
			value = v + 1.0
		default:
			// 对于其他类型，直接返回
			break
		}
	}

	g.uniqueSet[value] = true
	return value
}

// updateStats 更新统计信息
func (g *NumberGenerator) updateStats(duration time.Duration) {
	g.mutex.Lock()
	defer g.mutex.Unlock()

	g.stats.GenerationCount++
	g.stats.TotalTime += duration
	if g.stats.GenerationCount > 0 {
		g.stats.AverageTime = g.stats.TotalTime / time.Duration(g.stats.GenerationCount)
	}
	g.stats.LastGenerated = time.Now()
}

// GetType 获取类型
func (g *NumberGenerator) GetType() core.FieldType {
	return g.fieldType
}

// GetName 获取名称
func (g *NumberGenerator) GetName() string {
	return g.fieldType.String() + "_generator"
}

// Validate 验证配置
func (g *NumberGenerator) Validate(config GeneratorConfig) error {
	return nil
}

// GetStats 获取统计信息
func (g *NumberGenerator) GetStats() GeneratorStats {
	g.mutex.RLock()
	defer g.mutex.RUnlock()
	return g.stats
}

// ResetStats 重置统计
func (g *NumberGenerator) ResetStats() {
	g.mutex.Lock()
	defer g.mutex.Unlock()
	g.stats = GeneratorStats{}
	g.uniqueSet = make(map[interface{}]bool)
}

// SetSeed 设置种子
func (g *NumberGenerator) SetSeed(seed int64) {
	g.mutex.Lock()
	defer g.mutex.Unlock()
	g.rand = rand.New(rand.NewSource(seed))
}

// Clone 克隆生成器
func (g *NumberGenerator) Clone() *NumberGenerator {
	return &NumberGenerator{
		fieldType: g.fieldType,
		rand:      rand.New(rand.NewSource(time.Now().UnixNano())),
		stats:     GeneratorStats{},
		uniqueSet: make(map[interface{}]bool),
	}
}
