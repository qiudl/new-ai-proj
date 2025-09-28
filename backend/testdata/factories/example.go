package factories

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"ai-project-backend/testdata/core"
)

// Example 演示工厂系统的各种使用方法
func Example() {
	// 创建模型注册中心（在实际应用中，这个会从数据库或配置加载）
	modelRegistry := createExampleModelRegistry()

	// 创建工厂助手
	helper := NewFactoryHelper(modelRegistry)

	ctx := context.Background()

	fmt.Println("=== 工厂模式架构演示 ===")

	// 1. 基本用法 - 创建单个模型
	demonstrateBasicUsage(ctx, helper)

	// 2. 批量创建
	demonstrateBatchCreation(ctx, helper)

	// 3. 快速创建方法
	demonstrateQuickCreation(ctx, helper)

	// 4. 自定义配置
	demonstrateCustomConfiguration(ctx, helper)

	// 5. 关系数据创建
	demonstrateRelationalData(ctx, helper)

	// 6. 批处理器使用
	demonstrateBatchProcessor()

	// 7. 缓存系统
	demonstrateCacheSystem()

	// 8. 统计信息
	demonstrateStatistics(helper)

	// 9. 扩展和自定义
	demonstrateExtensibility(helper)

	fmt.Println("\n=== 演示完成 ===")
}

// 1. 基本用法演示
func demonstrateBasicUsage(ctx context.Context, helper *FactoryHelper) {
	fmt.Println("\n--- 1. 基本用法 ---")

	// 创建一个用户
	user, err := helper.CreateModel(ctx, "User")
	if err != nil {
		fmt.Printf("错误: %v\n", err)
		return
	}

	fmt.Printf("创建的用户: %+v\n", user)

	// 创建一个任务
	task, err := helper.CreateModel(ctx, "Task")
	if err != nil {
		fmt.Printf("错误: %v\n", err)
		return
	}

	fmt.Printf("创建的任务: %+v\n", task)
}

// 2. 批量创建演示
func demonstrateBatchCreation(ctx context.Context, helper *FactoryHelper) {
	fmt.Println("\n--- 2. 批量创建 ---")

	// 批量创建用户
	users, err := helper.CreateModels(ctx, "User", 3)
	if err != nil {
		fmt.Printf("错误: %v\n", err)
		return
	}

	fmt.Printf("批量创建了 %d 个用户:\n", len(users))
	for i, user := range users {
		fmt.Printf("  用户 %d: %+v\n", i+1, user)
	}

	// 使用自定义批量配置
	batchConfig := BatchConfig{
		FactoryConfig: FactoryConfig{
			ModelName: "Task",
			UseCache:  true,
			GlobalSeed: 12345,
		},
		Count:       5,
		BatchSize:   2,
		Concurrency: 2,
		Async:       true,
	}

	tasks, err := helper.CreateModels(ctx, "Task", 5, batchConfig)
	if err != nil {
		fmt.Printf("错误: %v\n", err)
		return
	}

	fmt.Printf("使用自定义配置批量创建了 %d 个任务\n", len(tasks))
}

// 3. 快速创建方法演示
func demonstrateQuickCreation(ctx context.Context, helper *FactoryHelper) {
	fmt.Println("\n--- 3. 快速创建方法 ---")

	quick := helper.Quick()

	// 快速创建用户
	user, err := quick.User(ctx)
	if err != nil {
		fmt.Printf("错误: %v\n", err)
		return
	}
	fmt.Printf("快速创建用户: %+v\n", user)

	// 快速创建带自定义属性的用户
	customUser, err := quick.User(ctx, map[string]interface{}{
		"role": "admin",
		"department": "IT",
	})
	if err != nil {
		fmt.Printf("错误: %v\n", err)
		return
	}
	fmt.Printf("快速创建自定义用户: %+v\n", customUser)

	// 快速批量创建
	users, err := quick.Users(ctx, 2)
	if err != nil {
		fmt.Printf("错误: %v\n", err)
		return
	}
	fmt.Printf("快速批量创建 %d 个用户\n", len(users))
}

// 4. 自定义配置演示
func demonstrateCustomConfiguration(ctx context.Context, helper *FactoryHelper) {
	fmt.Println("\n--- 4. 自定义配置 ---")

	// 自定义生成器配置
	config := FactoryConfig{
		ModelName: "User",
		UseCache:  false,
		GlobalSeed: 54321,
		Generators: map[string]GeneratorConfig{
			"name": {
				Type:    "string",
				Pattern: "User_{random}",
				Params: map[string]interface{}{
					"length": 10,
				},
			},
			"age": {
				Type: "int",
				Range: RangeConfig{
					Min: 18,
					Max: 65,
				},
			},
		},
		Metadata: map[string]interface{}{
			"source": "custom_config",
			"version": "1.0",
		},
	}

	user, err := helper.CreateModel(ctx, "User", config)
	if err != nil {
		fmt.Printf("错误: %v\n", err)
		return
	}

	fmt.Printf("使用自定义配置创建的用户: %+v\n", user)
}

// 5. 关系数据创建演示
func demonstrateRelationalData(ctx context.Context, helper *FactoryHelper) {
	fmt.Println("\n--- 5. 关系数据创建 ---")

	// 创建带关系的数据
	relations := []RelationConfig{
		{
			Field:       "assignee",
			TargetModel: "User",
			Strategy:    "existing",
			Ratio:       0.8,
		},
		{
			Field:       "project",
			TargetModel: "Project",
			Strategy:    "create",
		},
	}

	taskWithRelations, err := helper.CreateWithRelations(ctx, "Task", relations)
	if err != nil {
		fmt.Printf("错误: %v\n", err)
		return
	}

	fmt.Printf("创建带关系的任务: %+v\n", taskWithRelations)
}

// 6. 批处理器演示
func demonstrateBatchProcessor() {
	fmt.Println("\n--- 6. 批处理器 ---")

	processor := NewBatchProcessor(3, 2)

	ctx := context.Background()
	items := []interface{}{"item1", "item2", "item3", "item4", "item5", "item6"}

	config := BatchProcessConfig{
		BatchSize:    3,
		Concurrency:  2,
		Timeout:      time.Second,
		RetryCount:   1,
		RetryDelay:   100 * time.Millisecond,
		ErrorHandler: "skip",
	}

	// 同步批处理
	fmt.Println("执行同步批处理...")
	err := processor.Process(ctx, items, config)
	if err != nil {
		fmt.Printf("批处理错误: %v\n", err)
	} else {
		fmt.Println("同步批处理完成")
	}

	// 异步批处理
	fmt.Println("执行异步批处理...")
	resultChan, err := processor.ProcessAsync(ctx, items, config)
	if err != nil {
		fmt.Printf("异步批处理启动错误: %v\n", err)
		return
	}

	var successCount, errorCount int
	for result := range resultChan {
		if result.Error != nil {
			errorCount++
			fmt.Printf("  项目 %d 处理失败: %v\n", result.Index, result.Error)
		} else {
			successCount++
			fmt.Printf("  项目 %d 处理成功: %v (耗时: %v)\n", result.Index, result.Data, result.Timing)
		}
	}

	fmt.Printf("异步批处理完成: 成功 %d, 失败 %d\n", successCount, errorCount)

	// 显示统计信息
	stats := processor.GetStats()
	fmt.Printf("批处理器统计: 批次数=%d, 项目数=%d, 平均时间=%v\n",
		stats.BatchCount, stats.ItemCount, stats.AverageTime)
}

// 7. 缓存系统演示
func demonstrateCacheSystem() {
	fmt.Println("\n--- 7. 缓存系统 ---")

	cache := NewFactoryCache(5, 2*time.Minute)

	// 设置缓存
	cache.Set("user:1", map[string]interface{}{"id": 1, "name": "Alice"}, time.Minute)
	cache.Set("user:2", map[string]interface{}{"id": 2, "name": "Bob"}, time.Minute)

	// 获取缓存
	if value, exists := cache.Get("user:1"); exists {
		fmt.Printf("从缓存获取用户: %+v\n", value)
	}

	// 缓存未命中
	if _, exists := cache.Get("user:999"); !exists {
		fmt.Println("用户 999 不在缓存中")
	}

	// 显示缓存统计
	stats := cache.Stats()
	fmt.Printf("缓存统计: 命中=%d, 未命中=%d, 命中率=%.2f%%, 大小=%d/%d\n",
		stats.HitCount, stats.MissCount, stats.HitRate*100, stats.Size, stats.MaxSize)
}

// 8. 统计信息演示
func demonstrateStatistics(helper *FactoryHelper) {
	fmt.Println("\n--- 8. 统计信息 ---")

	// 列出支持的模型
	models := helper.ListSupportedModels()
	fmt.Printf("支持的模型: %v\n", models)

	// 列出注册的工厂
	factories := helper.ListRegisteredFactories()
	fmt.Printf("已注册的工厂: %v\n", factories)

	// 获取批处理器统计
	batchStats := helper.GetBatchProcessorStats()
	fmt.Printf("批处理器统计: %+v\n", batchStats)
}

// 9. 扩展性演示
func demonstrateExtensibility(helper *FactoryHelper) {
	fmt.Println("\n--- 9. 扩展性和自定义 ---")

	// 注册自定义生成器
	customGenerator := &CustomEmailGenerator{domain: "company.com"}
	err := helper.RegisterCustomGenerator(core.FieldTypeEmail, customGenerator)
	if err != nil {
		fmt.Printf("注册自定义生成器失败: %v\n", err)
		return
	}

	fmt.Println("已注册自定义邮箱生成器")

	// 注册自定义工厂
	customFactory := &CustomUserFactory{}
	err = helper.RegisterCustomFactory("CustomUser", customFactory)
	if err != nil {
		fmt.Printf("注册自定义工厂失败: %v\n", err)
		return
	}

	fmt.Println("已注册自定义用户工厂")
}

// 创建示例模型注册中心
func createExampleModelRegistry() core.IModelRegistry {
	// 这里应该返回实际的模型注册中心实现
	// 为了演示，我们创建一个简单的实现
	registry := &ExampleModelRegistry{
		models: make(map[string]*ExampleModelDefinition),
	}

	// 注册示例模型
	registry.registerExampleModels()

	return registry
}

// 示例模型注册中心
type ExampleModelRegistry struct {
	models map[string]*ExampleModelDefinition
}

type ExampleModelDefinition struct {
	name   string
	fields map[string]*ExampleFieldDefinition
}

type ExampleFieldDefinition struct {
	name      string
	fieldType core.FieldType
	required  bool
	unique    bool
}

type ExampleDataModel struct {
	name   string
	fields map[string]interface{}
}

func (r *ExampleModelRegistry) RegisterModel(name string, factory func() core.IDataModel) error {
	r.models[name] = &ExampleModelDefinition{name: name}
	return nil
}

func (r *ExampleModelRegistry) UnregisterModel(name string) error {
	delete(r.models, name)
	return nil
}

func (r *ExampleModelRegistry) CreateInstance(name string) (core.IDataModel, error) {
	if _, exists := r.models[name]; exists {
		return &ExampleDataModel{name: name, fields: make(map[string]interface{})}, nil
	}
	return nil, fmt.Errorf("model not found: %s", name)
}

func (r *ExampleModelRegistry) ListModels() []string {
	var names []string
	for name := range r.models {
		names = append(names, name)
	}
	return names
}

func (r *ExampleModelRegistry) GetModelMetadata(name string) (core.ModelMetadata, error) {
	return core.ModelMetadata{}, nil
}

func (r *ExampleModelRegistry) registerExampleModels() {
	// 注册 User 模型
	userModel := &ExampleModelDefinition{
		name: "User",
		fields: map[string]*ExampleFieldDefinition{
			"id":    {name: "id", fieldType: core.FieldTypeInt, required: true, unique: true},
			"name":  {name: "name", fieldType: core.FieldTypeString, required: true},
			"email": {name: "email", fieldType: core.FieldTypeEmail, required: true, unique: true},
			"age":   {name: "age", fieldType: core.FieldTypeInt},
		},
	}

	// 注册 Task 模型
	taskModel := &ExampleModelDefinition{
		name: "Task",
		fields: map[string]*ExampleFieldDefinition{
			"id":          {name: "id", fieldType: core.FieldTypeInt, required: true, unique: true},
			"title":       {name: "title", fieldType: core.FieldTypeString, required: true},
			"description": {name: "description", fieldType: core.FieldTypeText},
			"completed":   {name: "completed", fieldType: core.FieldTypeBool},
			"created_at":  {name: "created_at", fieldType: core.FieldTypeTime},
		},
	}

	// 注册 Project 模型
	projectModel := &ExampleModelDefinition{
		name: "Project",
		fields: map[string]*ExampleFieldDefinition{
			"id":   {name: "id", fieldType: core.FieldTypeInt, required: true, unique: true},
			"name": {name: "name", fieldType: core.FieldTypeString, required: true},
		},
	}

	r.models["User"] = userModel
	r.models["Task"] = taskModel
	r.models["Project"] = projectModel
}

// 实现接口方法
func (m *ExampleModelDefinition) GetName() string                           { return m.name }
func (m *ExampleModelDefinition) GetFields() []interface{}       { return nil }
func (m *ExampleModelDefinition) GetField(name string) (interface{}, error) { return nil, nil }
func (m *ExampleModelDefinition) GetRelations() []interface{} { return nil }
func (m *ExampleModelDefinition) Validate() error                          { return nil }

func (f *ExampleFieldDefinition) GetName() string               { return f.name }
func (f *ExampleFieldDefinition) GetType() core.FieldType       { return f.fieldType }
func (f *ExampleFieldDefinition) GetConstraints() []core.IConstraint { return nil }
func (f *ExampleFieldDefinition) IsRequired() bool              { return f.required }
func (f *ExampleFieldDefinition) IsUnique() bool                { return f.unique }
func (f *ExampleFieldDefinition) GetDefaultValue() interface{}  { return nil }
func (f *ExampleFieldDefinition) Validate(value interface{}) error { return nil }
func (f *ExampleFieldDefinition) GetGenerator() core.IFieldGenerator { return nil }

// 实现 ExampleDataModel 的 core.IDataModel 接口
func (m *ExampleDataModel) GetModelName() string {
	return m.name
}

func (m *ExampleDataModel) GetFields() map[string]core.IFieldDefinition {
	return make(map[string]core.IFieldDefinition)
}

func (m *ExampleDataModel) GetRelations() map[string]core.IRelation {
	return make(map[string]core.IRelation)
}

func (m *ExampleDataModel) ToMap() map[string]interface{} {
	return m.fields
}

func (m *ExampleDataModel) FromMap(data map[string]interface{}) error {
	m.fields = data
	return nil
}

func (m *ExampleDataModel) GetMetadata() core.ModelMetadata {
	return core.ModelMetadata{}
}

// 自定义邮箱生成器示例
type CustomEmailGenerator struct {
	domain string
	stats  GeneratorStats
	mutex  sync.RWMutex
}

func (g *CustomEmailGenerator) Generate(ctx context.Context, field core.IFieldDefinition, config GeneratorConfig) (interface{}, error) {
	return fmt.Sprintf("user%d@%s", time.Now().UnixNano()%10000, g.domain), nil
}

func (g *CustomEmailGenerator) GenerateBatch(ctx context.Context, field core.IFieldDefinition, count int, config GeneratorConfig) ([]interface{}, error) {
	results := make([]interface{}, count)
	for i := 0; i < count; i++ {
		value, err := g.Generate(ctx, field, config)
		if err != nil {
			return nil, err
		}
		results[i] = value
	}
	return results, nil
}

func (g *CustomEmailGenerator) GetType() core.FieldType               { return core.FieldTypeEmail }
func (g *CustomEmailGenerator) GetName() string                       { return "custom_email_generator" }
func (g *CustomEmailGenerator) Validate(config GeneratorConfig) error { return nil }
func (g *CustomEmailGenerator) GetStats() GeneratorStats {
	g.mutex.RLock()
	defer g.mutex.RUnlock()
	return g.stats
}
func (g *CustomEmailGenerator) ResetStats() {}
func (g *CustomEmailGenerator) SetSeed(seed int64) {}
func (g *CustomEmailGenerator) Clone() IFieldGenerator {
	return &CustomEmailGenerator{domain: g.domain}
}

// 自定义用户工厂示例
type CustomUserFactory struct{}

func (f *CustomUserFactory) Create(ctx context.Context, config FactoryConfig) (interface{}, error) {
	return map[string]interface{}{
		"id":    time.Now().UnixNano(),
		"name":  "Custom User",
		"email": "custom@example.com",
		"type":  "premium",
	}, nil
}

func (f *CustomUserFactory) CreateBatch(ctx context.Context, config BatchConfig) ([]interface{}, error) {
	results := make([]interface{}, config.Count)
	for i := 0; i < config.Count; i++ {
		user, err := f.Create(ctx, config.FactoryConfig)
		if err != nil {
			return nil, err
		}
		results[i] = user
	}
	return results, nil
}

func (f *CustomUserFactory) SetConfig(config FactoryConfig) error       { return nil }
func (f *CustomUserFactory) GetConfig() FactoryConfig                   { return FactoryConfig{} }
func (f *CustomUserFactory) Validate() error                           { return nil }
func (f *CustomUserFactory) GetName() string                           { return "custom_user_factory" }
func (f *CustomUserFactory) GetVersion() string                        { return "1.0.0" }
func (f *CustomUserFactory) GetSupportedModels() []string              { return []string{"CustomUser"} }
func (f *CustomUserFactory) Initialize() error                         { return nil }
func (f *CustomUserFactory) Cleanup() error                            { return nil }
func (f *CustomUserFactory) Reset() error                              { return nil }

// ExampleUsageWithJSON 展示JSON输出
func ExampleUsageWithJSON() {
	modelRegistry := createExampleModelRegistry()
	helper := NewFactoryHelper(modelRegistry)
	ctx := context.Background()

	// 创建一些数据
	user, _ := helper.CreateModel(ctx, "User")
	tasks, _ := helper.CreateModels(ctx, "Task", 3)

	// 转换为JSON进行展示
	userData, _ := json.MarshalIndent(user, "", "  ")
	tasksData, _ := json.MarshalIndent(tasks, "", "  ")

	fmt.Println("创建的用户 (JSON):")
	fmt.Println(string(userData))

	fmt.Println("\n创建的任务列表 (JSON):")
	fmt.Println(string(tasksData))
}