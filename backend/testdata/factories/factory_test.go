package factories

import (
	"context"
	"fmt"
	"testing"
	"time"

	"ai-project-backend/testdata/core"
	"ai-project-backend/testdata/factories/generators"
)

// 测试用的模型注册中心实现
type TestModelRegistry struct {
	models map[string]*TestModelDefinition
}

type TestModelDefinition struct {
	name   string
	fields map[string]*TestFieldDefinition
}

type TestFieldDefinition struct {
	name        string
	fieldType   core.FieldType
	constraints []core.IConstraint
}

type TestDataModel struct {
	name   string
	fields map[string]interface{}
}

// 实现 IModelRegistry 接口
func (r *TestModelRegistry) RegisterModel(name string, factory func() core.IDataModel) error {
	r.models[name] = &TestModelDefinition{
		name:   name,
		fields: make(map[string]*TestFieldDefinition),
	}
	return nil
}

func (r *TestModelRegistry) UnregisterModel(name string) error {
	delete(r.models, name)
	return nil
}

func (r *TestModelRegistry) CreateInstance(name string) (core.IDataModel, error) {
	if _, exists := r.models[name]; exists {
		return &TestDataModel{name: name, fields: make(map[string]interface{})}, nil
	}
	return nil, fmt.Errorf("model not found: %s", name)
}

func (r *TestModelRegistry) ListModels() []string {
	var names []string
	for name := range r.models {
		names = append(names, name)
	}
	return names
}

func (r *TestModelRegistry) GetModelMetadata(name string) (core.ModelMetadata, error) {
	return core.ModelMetadata{}, nil
}

// 实现 IModelDefinition 接口
func (m *TestModelDefinition) GetName() string {
	return m.name
}

func (m *TestModelDefinition) GetFields() []interface{} {
	var fields []interface{}
	for _, field := range m.fields {
		fields = append(fields, field)
	}
	return fields
}

func (m *TestModelDefinition) GetField(name string) (interface{}, error) {
	if field, exists := m.fields[name]; exists {
		return field, nil
	}
	return nil, fmt.Errorf("field not found: %s", name)
}

func (m *TestModelDefinition) GetRelations() []interface{} {
	return []interface{}{}
}

func (m *TestModelDefinition) Validate() error {
	return nil
}

// 实现 IFieldDefinition 接口
func (f *TestFieldDefinition) GetName() string {
	return f.name
}

func (f *TestFieldDefinition) GetType() core.FieldType {
	return f.fieldType
}

func (f *TestFieldDefinition) GetConstraints() []core.IConstraint {
	return f.constraints
}

func (f *TestFieldDefinition) IsRequired() bool {
	return false
}

func (f *TestFieldDefinition) IsUnique() bool {
	return false
}

func (f *TestFieldDefinition) GetDefaultValue() interface{} {
	return nil
}

func (f *TestFieldDefinition) Validate(value interface{}) error {
	return nil
}

func (f *TestFieldDefinition) GetGenerator() core.IFieldGenerator {
	return nil
}

// 实现 TestDataModel 的 core.IDataModel 接口
func (m *TestDataModel) GetModelName() string {
	return m.name
}

func (m *TestDataModel) GetFields() map[string]core.IFieldDefinition {
	return make(map[string]core.IFieldDefinition)
}

func (m *TestDataModel) GetRelations() map[string]core.IRelation {
	return make(map[string]core.IRelation)
}

func (m *TestDataModel) ToMap() map[string]interface{} {
	return m.fields
}

func (m *TestDataModel) FromMap(data map[string]interface{}) error {
	m.fields = data
	return nil
}

func (m *TestDataModel) GetMetadata() core.ModelMetadata {
	return core.ModelMetadata{}
}

// 创建测试模型注册中心
func createTestModelRegistry() *TestModelRegistry {
	registry := &TestModelRegistry{
		models: make(map[string]*TestModelDefinition),
	}

	// 注册测试模型
	userModel := &TestModelDefinition{
		name: "User",
		fields: map[string]*TestFieldDefinition{
			"id":    {name: "id", fieldType: core.FieldTypeInt},
			"name":  {name: "name", fieldType: core.FieldTypeString},
			"email": {name: "email", fieldType: core.FieldTypeEmail},
			"age":   {name: "age", fieldType: core.FieldTypeInt},
		},
	}

	taskModel := &TestModelDefinition{
		name: "Task",
		fields: map[string]*TestFieldDefinition{
			"id":          {name: "id", fieldType: core.FieldTypeInt},
			"title":       {name: "title", fieldType: core.FieldTypeString},
			"description": {name: "description", fieldType: core.FieldTypeText},
			"completed":   {name: "completed", fieldType: core.FieldTypeBool},
			"created_at":  {name: "created_at", fieldType: core.FieldTypeTime},
		},
	}

	registry.models["User"] = userModel
	registry.models["Task"] = taskModel

	return registry
}

// TestFactoryHelper_CreateModel 测试创建单个模型
func TestFactoryHelper_CreateModel(t *testing.T) {
	// 创建测试环境
	modelRegistry := createTestModelRegistry()
	helper := NewFactoryHelper(modelRegistry)

	ctx := context.Background()

	// 测试创建用户
	user, err := helper.CreateModel(ctx, "User")
	if err != nil {
		t.Fatalf("Failed to create user: %v", err)
	}

	if user == nil {
		t.Fatal("Created user is nil")
	}

	t.Logf("Created user: %+v", user)
}

// TestFactoryHelper_CreateModels 测试批量创建模型
func TestFactoryHelper_CreateModels(t *testing.T) {
	modelRegistry := createTestModelRegistry()
	helper := NewFactoryHelper(modelRegistry)

	ctx := context.Background()

	// 测试批量创建任务
	tasks, err := helper.CreateModels(ctx, "Task", 5)
	if err != nil {
		t.Fatalf("Failed to create tasks: %v", err)
	}

	if len(tasks) != 5 {
		t.Fatalf("Expected 5 tasks, got %d", len(tasks))
	}

	t.Logf("Created %d tasks", len(tasks))
}

// TestFactoryHelper_QuickCreate 测试快速创建功能
func TestFactoryHelper_QuickCreate(t *testing.T) {
	modelRegistry := createTestModelRegistry()
	helper := NewFactoryHelper(modelRegistry)

	ctx := context.Background()
	quick := helper.Quick()

	// 快速创建用户
	user, err := quick.User(ctx)
	if err != nil {
		t.Fatalf("Failed to quick create user: %v", err)
	}

	if user == nil {
		t.Fatal("Quick created user is nil")
	}

	// 快速创建任务
	task, err := quick.Task(ctx)
	if err != nil {
		t.Fatalf("Failed to quick create task: %v", err)
	}

	if task == nil {
		t.Fatal("Quick created task is nil")
	}

	t.Log("Quick create tests passed")
}

// TestBatchProcessor 测试批处理器
func TestBatchProcessor(t *testing.T) {
	processor := NewBatchProcessor(2, 2)

	ctx := context.Background()
	items := []interface{}{1, 2, 3, 4, 5}

	config := BatchProcessConfig{
		BatchSize:   2,
		Concurrency: 2,
		Timeout:     time.Second,
		RetryCount:  1,
	}

	// 测试同步处理
	err := processor.Process(ctx, items, config)
	if err != nil {
		t.Fatalf("Batch process failed: %v", err)
	}

	// 测试异步处理
	resultChan, err := processor.ProcessAsync(ctx, items, config)
	if err != nil {
		t.Fatalf("Async batch process failed: %v", err)
	}

	var results []ProcessResult
	for result := range resultChan {
		results = append(results, result)
	}

	if len(results) != len(items) {
		t.Fatalf("Expected %d results, got %d", len(items), len(results))
	}

	// 检查统计信息
	stats := processor.GetStats()
	if stats.BatchCount == 0 {
		t.Fatal("Expected batch count > 0")
	}

	t.Logf("Batch processor stats: %+v", stats)
}

// TestFactoryRegistry 测试工厂注册中心
func TestFactoryRegistry(t *testing.T) {
	modelRegistry := createTestModelRegistry()
	registry := NewFactoryRegistry(modelRegistry)

	// 测试获取支持的类型
	supportedTypes := registry.GetSupportedTypes()
	if len(supportedTypes) == 0 {
		t.Fatal("No supported types found")
	}

	t.Logf("Supported types: %+v", supportedTypes)

	// 测试创建默认工厂
	factory, err := registry.GetDefaultFactory("User")
	if err != nil {
		t.Fatalf("Failed to get default factory: %v", err)
	}

	if factory == nil {
		t.Fatal("Factory is nil")
	}

	t.Log("Factory registry tests passed")
}

// TestGenerators 测试各种生成器
func TestGenerators(t *testing.T) {
	ctx := context.Background()

	// 测试字符串生成器
	stringGen := generators.NewStringGenerator()
	field := &TestFieldDefinition{name: "name", fieldType: core.FieldTypeString}
	config := generators.GeneratorConfig{}

	stringValue, err := stringGen.Generate(ctx, field, config)
	if err != nil {
		t.Fatalf("String generator failed: %v", err)
	}
	t.Logf("Generated string: %v", stringValue)

	// 测试布尔生成器
	boolGen := NewBoolGenerator()
	boolField := &TestFieldDefinition{name: "active", fieldType: core.FieldTypeBool}
	
	boolValue, err := boolGen.Generate(ctx, boolField, GeneratorConfig{})
	if err != nil {
		t.Fatalf("Bool generator failed: %v", err)
	}
	t.Logf("Generated bool: %v", boolValue)

	// 测试时间生成器
	timeGen := NewTimeGenerator()
	timeField := &TestFieldDefinition{name: "created_at", fieldType: core.FieldTypeTime}
	
	timeValue, err := timeGen.Generate(ctx, timeField, GeneratorConfig{})
	if err != nil {
		t.Fatalf("Time generator failed: %v", err)
	}
	t.Logf("Generated time: %v", timeValue)

	// 测试JSON生成器
	jsonGen := NewJSONGenerator()
	jsonField := &TestFieldDefinition{name: "metadata", fieldType: core.FieldTypeJSON}
	
	jsonValue, err := jsonGen.Generate(ctx, jsonField, GeneratorConfig{})
	if err != nil {
		t.Fatalf("JSON generator failed: %v", err)
	}
	t.Logf("Generated JSON: %v", jsonValue)
}

// TestCacheSystem 测试缓存系统
func TestCacheSystem(t *testing.T) {
	cache := NewFactoryCache(10, 5*time.Minute)

	// 测试设置和获取
	cache.Set("test_key", "test_value", time.Minute)
	
	value, exists := cache.Get("test_key")
	if !exists {
		t.Fatal("Cache key should exist")
	}

	if value != "test_value" {
		t.Fatalf("Expected 'test_value', got %v", value)
	}

	// 测试统计信息
	stats := cache.Stats()
	if stats.HitCount == 0 {
		t.Fatal("Expected hit count > 0")
	}

	t.Logf("Cache stats: %+v", stats)
}

// BenchmarkFactoryCreation 性能基准测试
func BenchmarkFactoryCreation(b *testing.B) {
	modelRegistry := createTestModelRegistry()
	helper := NewFactoryHelper(modelRegistry)
	ctx := context.Background()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := helper.CreateModel(ctx, "User")
		if err != nil {
			b.Fatalf("Failed to create user: %v", err)
		}
	}
}

// BenchmarkBatchCreation 批量创建性能测试
func BenchmarkBatchCreation(b *testing.B) {
	modelRegistry := createTestModelRegistry()
	helper := NewFactoryHelper(modelRegistry)
	ctx := context.Background()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := helper.CreateModels(ctx, "User", 100)
		if err != nil {
			b.Fatalf("Failed to create users: %v", err)
		}
	}
}