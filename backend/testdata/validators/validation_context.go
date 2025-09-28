package main

import (
	"fmt"
	"reflect"
	"strings"
	"sync"
)

// ValidationContext 验证上下文实现
type ValidationContext struct {
	rootValue       interface{}
	currentValue    interface{}
	model           interface{}
	pathSegments    []string
	values          map[string]interface{}
	cache           map[string]interface{}
	visited         map[string]bool
	validationLevel int
	validationCount int
	mutex           sync.RWMutex
}

// NewValidationContext 创建新的验证上下文
func NewValidationContext(rootValue interface{}) *ValidationContext {
	return &ValidationContext{
		rootValue:    rootValue,
		currentValue: rootValue,
		model:        rootValue,
		pathSegments: make([]string, 0),
		values:       make(map[string]interface{}),
		cache:        make(map[string]interface{}),
		visited:      make(map[string]bool),
	}
}

// GetRootValue 获取根值
func (c *ValidationContext) GetRootValue() interface{} {
	return c.rootValue
}

// GetCurrentValue 获取当前值
func (c *ValidationContext) GetCurrentValue() interface{} {
	return c.currentValue
}

// GetFieldValue 根据路径获取字段值
func (c *ValidationContext) GetFieldValue(path string) (interface{}, bool) {
	c.mutex.RLock()
	defer c.mutex.RUnlock()

	// 首先检查缓存
	if value, exists := c.cache[path]; exists {
		return value, true
	}

	// 从根值开始查找
	value, found := c.findValueByPath(c.rootValue, path)
	if found {
		// 缓存结果
		c.cache[path] = value
	}

	return value, found
}

// findValueByPath 根据路径查找值
func (c *ValidationContext) findValueByPath(root interface{}, path string) (interface{}, bool) {
	if root == nil || path == "" {
		return nil, false
	}

	segments := strings.Split(path, ".")
	current := root

	for _, segment := range segments {
		value, found := c.getFieldFromValue(current, segment)
		if !found {
			return nil, false
		}
		current = value
	}

	return current, true
}

// getFieldFromValue 从值中获取字段
func (c *ValidationContext) getFieldFromValue(value interface{}, fieldName string) (interface{}, bool) {
	if value == nil {
		return nil, false
	}

	v := reflect.ValueOf(value)
	
	// 如果是指针，解引用
	if v.Kind() == reflect.Ptr {
		if v.IsNil() {
			return nil, false
		}
		v = v.Elem()
	}

	switch v.Kind() {
	case reflect.Map:
		// 处理 map 类型
		mapValue := v.MapIndex(reflect.ValueOf(fieldName))
		if !mapValue.IsValid() {
			return nil, false
		}
		return mapValue.Interface(), true

	case reflect.Struct:
		// 处理 struct 类型
		fieldValue := v.FieldByName(fieldName)
		if !fieldValue.IsValid() {
			// 尝试使用不同的命名规则查找字段
			fieldValue = c.findStructField(v, fieldName)
		}
		if fieldValue.IsValid() {
			return fieldValue.Interface(), true
		}
		return nil, false

	default:
		return nil, false
	}
}

// findStructField 查找结构体字段（支持不同命名规则）
func (c *ValidationContext) findStructField(structValue reflect.Value, fieldName string) reflect.Value {
	structType := structValue.Type()
	
	// 尝试不同的字段名变体
	variations := []string{
		fieldName,
		strings.Title(fieldName),
		strings.ToLower(fieldName),
		strings.ToUpper(fieldName),
		toCamelCase(fieldName),
		toSnakeCase(fieldName),
	}

	for _, variation := range variations {
		if field := structValue.FieldByName(variation); field.IsValid() {
			return field
		}

		// 尝试通过 JSON 标签查找
		for i := 0; i < structType.NumField(); i++ {
			field := structType.Field(i)
			if jsonTag := field.Tag.Get("json"); jsonTag != "" {
				tagName := strings.Split(jsonTag, ",")[0]
				if tagName == variation {
					return structValue.Field(i)
				}
			}
		}
	}

	return reflect.Value{}
}

// toCamelCase 转换为驼峰命名
func toCamelCase(s string) string {
	parts := strings.Split(s, "_")
	for i := 1; i < len(parts); i++ {
		parts[i] = strings.Title(parts[i])
	}
	return strings.Join(parts, "")
}

// toSnakeCase 转换为蛇形命名
func toSnakeCase(s string) string {
	var result []rune
	for i, r := range s {
		if i > 0 && 'A' <= r && r <= 'Z' {
			result = append(result, '_')
		}
		result = append(result, rune(strings.ToLower(string(r))[0]))
	}
	return string(result)
}

// GetParentValue 获取父级值
func (c *ValidationContext) GetParentValue() (interface{}, bool) {
	if len(c.pathSegments) == 0 {
		return nil, false
	}

	// 构建父级路径
	parentPath := strings.Join(c.pathSegments[:len(c.pathSegments)-1], ".")
	if parentPath == "" {
		return c.rootValue, true
	}

	return c.GetFieldValue(parentPath)
}

// GetCurrentPath 获取当前路径
func (c *ValidationContext) GetCurrentPath() string {
	if len(c.pathSegments) == 0 {
		return ""
	}
	return c.pathSegments[len(c.pathSegments)-1]
}

// GetFullPath 获取完整路径
func (c *ValidationContext) GetFullPath() string {
	return strings.Join(c.pathSegments, ".")
}

// PushPath 添加路径段
func (c *ValidationContext) PushPath(segment string) {
	c.mutex.Lock()
	defer c.mutex.Unlock()

	c.pathSegments = append(c.pathSegments, segment)
	
	// 更新当前值
	if value, found := c.GetFieldValue(c.GetFullPath()); found {
		c.currentValue = value
	}
}

// PopPath 移除最后一个路径段
func (c *ValidationContext) PopPath() {
	c.mutex.Lock()
	defer c.mutex.Unlock()

	if len(c.pathSegments) > 0 {
		c.pathSegments = c.pathSegments[:len(c.pathSegments)-1]
		
		// 更新当前值
		if len(c.pathSegments) == 0 {
			c.currentValue = c.rootValue
		} else {
			if value, found := c.GetFieldValue(c.GetFullPath()); found {
				c.currentValue = value
			}
		}
	}
}

// GetModel 获取数据模型
func (c *ValidationContext) GetModel() interface{} {
	return c.model
}

// GetField 根据字段名获取字段定义
func (c *ValidationContext) GetField(name string) (interface{}, bool) {
	// 简化实现，直接返回字段值
	return c.GetFieldValue(name)
}

// GetRelations 获取所有关系定义
func (c *ValidationContext) GetRelations() []interface{} {
	// 简化实现，返回空切片
	return []interface{}{}
}

// SetCache 设置缓存值
func (c *ValidationContext) SetCache(key string, value interface{}) {
	c.mutex.Lock()
	defer c.mutex.Unlock()
	c.cache[key] = value
}

// GetCache 获取缓存值
func (c *ValidationContext) GetCache(key string) (interface{}, bool) {
	c.mutex.RLock()
	defer c.mutex.RUnlock()
	value, exists := c.cache[key]
	return value, exists
}

// ClearCache 清空缓存
func (c *ValidationContext) ClearCache() {
	c.mutex.Lock()
	defer c.mutex.Unlock()
	c.cache = make(map[string]interface{})
}

// WithValue 创建带有额外值的新上下文
func (c *ValidationContext) WithValue(key string, value interface{}) IValidationContext {
	c.mutex.Lock()
	defer c.mutex.Unlock()

	// 创建新的上下文副本
	newCtx := &ValidationContext{
		rootValue:       c.rootValue,
		currentValue:    c.currentValue,
		model:           c.model,
		pathSegments:    make([]string, len(c.pathSegments)),
		values:          make(map[string]interface{}),
		cache:           make(map[string]interface{}),
		visited:         make(map[string]bool),
		validationLevel: c.validationLevel,
		validationCount: c.validationCount,
	}

	// 复制数据
	copy(newCtx.pathSegments, c.pathSegments)
	
	for k, v := range c.values {
		newCtx.values[k] = v
	}
	for k, v := range c.cache {
		newCtx.cache[k] = v
	}
	for k, v := range c.visited {
		newCtx.visited[k] = v
	}

	// 设置新值
	newCtx.values[key] = value

	return newCtx
}

// GetValue 获取上下文值
func (c *ValidationContext) GetValue(key string) interface{} {
	c.mutex.RLock()
	defer c.mutex.RUnlock()
	return c.values[key]
}

// MarkVisited 标记路径为已访问
func (c *ValidationContext) MarkVisited(path string) {
	c.mutex.Lock()
	defer c.mutex.Unlock()
	c.visited[path] = true
}

// IsVisited 检查路径是否已访问
func (c *ValidationContext) IsVisited(path string) bool {
	c.mutex.RLock()
	defer c.mutex.RUnlock()
	return c.visited[path]
}

// GetValidationLevel 获取验证级别
func (c *ValidationContext) GetValidationLevel() int {
	return c.validationLevel
}

// SetValidationLevel 设置验证级别
func (c *ValidationContext) SetValidationLevel(level int) {
	c.validationLevel = level
}

// IncrementValidationCount 增加验证计数
func (c *ValidationContext) IncrementValidationCount() {
	c.mutex.Lock()
	defer c.mutex.Unlock()
	c.validationCount++
}

// GetValidationCount 获取验证计数
func (c *ValidationContext) GetValidationCount() int {
	c.mutex.RLock()
	defer c.mutex.RUnlock()
	return c.validationCount
}

// Clone 克隆上下文
func (c *ValidationContext) Clone() *ValidationContext {
	c.mutex.RLock()
	defer c.mutex.RUnlock()

	newCtx := &ValidationContext{
		rootValue:       c.rootValue,
		currentValue:    c.currentValue,
		model:           c.model,
		pathSegments:    make([]string, len(c.pathSegments)),
		values:          make(map[string]interface{}),
		cache:           make(map[string]interface{}),
		visited:         make(map[string]bool),
		validationLevel: c.validationLevel,
		validationCount: c.validationCount,
	}

	// 深度复制数据
	copy(newCtx.pathSegments, c.pathSegments)
	
	for k, v := range c.values {
		newCtx.values[k] = v
	}
	for k, v := range c.cache {
		newCtx.cache[k] = v
	}
	for k, v := range c.visited {
		newCtx.visited[k] = v
	}

	return newCtx
}

// Reset 重置上下文
func (c *ValidationContext) Reset() {
	c.mutex.Lock()
	defer c.mutex.Unlock()

	c.currentValue = c.rootValue
	c.pathSegments = c.pathSegments[:0]
	c.cache = make(map[string]interface{})
	c.visited = make(map[string]bool)
	c.validationCount = 0
}

// String 返回上下文的字符串表示
func (c *ValidationContext) String() string {
	return fmt.Sprintf("ValidationContext{path: %s, level: %d, count: %d}", 
		c.GetFullPath(), c.validationLevel, c.validationCount)
}

// GetDebugInfo 获取调试信息
func (c *ValidationContext) GetDebugInfo() map[string]interface{} {
	c.mutex.RLock()
	defer c.mutex.RUnlock()

	return map[string]interface{}{
		"full_path":         c.GetFullPath(),
		"current_path":      c.GetCurrentPath(),
		"validation_level":  c.validationLevel,
		"validation_count":  c.validationCount,
		"path_segments":     c.pathSegments,
		"cache_size":        len(c.cache),
		"visited_paths":     len(c.visited),
		"has_model":         c.model != nil,
		"root_value_type":   fmt.Sprintf("%T", c.rootValue),
		"current_value_type": fmt.Sprintf("%T", c.currentValue),
	}
}