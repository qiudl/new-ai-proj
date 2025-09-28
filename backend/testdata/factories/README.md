# 工厂模式架构实现

这是一个完整的工厂模式架构实现，用于AI项目后端的测试数据生成和模型创建。该系统提供了灵活、可扩展、高性能的数据工厂解决方案。

## 📋 目录结构

```
factories/
├── README.md                 # 项目文档
├── interfaces.go            # 核心接口定义
├── types.go                 # 类型定义
├── config.go                # 配置结构
├── base_factory.go          # 基础工厂实现
├── registry.go              # 工厂注册中心
├── batch_processor.go       # 批处理器
├── factory_helper.go        # 工厂助手类
├── cache.go                 # 缓存系统
├── generators/              # 生成器包
│   ├── string_generator.go  # 字符串生成器
│   ├── number_generator.go  # 数字生成器
│   └── types.go            # 生成器类型定义
├── bool_generator.go        # 布尔生成器
├── time_generator.go        # 时间生成器
├── json_generator.go        # JSON生成器
├── factory_test.go          # 测试文件
└── example.go              # 使用示例
```

## 🏗️ 核心架构

### 1. 接口层 (interfaces.go)
定义了系统的核心接口：
- `IDataFactory`: 数据工厂核心接口
- `IFieldGenerator`: 字段生成器接口
- `IBatchProcessor`: 批处理器接口
- `IFactoryRegistry`: 工厂注册中心接口
- `IFactoryCache`: 工厂缓存接口

### 2. 实现层
- **BaseFactory**: 基础工厂实现，支持单个和批量数据创建
- **FactoryRegistry**: 工厂注册中心，管理所有工厂实例和生成器
- **BatchProcessor**: 批处理器，支持同步和异步批量处理
- **FactoryHelper**: 工厂助手类，简化工厂使用

### 3. 生成器层
- **StringGenerator**: 智能字符串生成器（姓名、邮箱、地址等）
- **NumberGenerator**: 数字生成器（整数、浮点数）
- **BoolGenerator**: 布尔值生成器
- **TimeGenerator**: 时间生成器
- **JSONGenerator**: JSON对象生成器

### 4. 缓存层
- **FactoryCache**: 多级缓存系统，支持LRU策略和TTL过期

## 🚀 主要特性

### 1. 灵活的工厂模式
- 支持多种数据模型的创建
- 可配置的生成器参数
- 支持关系数据生成
- 模板化创建

### 2. 高性能批处理
- 同步/异步批量处理
- 可配置并发度
- 错误处理策略
- 进度监控

### 3. 智能缓存系统
- 多级缓存支持
- LRU淘汰策略
- TTL过期机制
- 缓存统计

### 4. 可扩展架构
- 插件式生成器
- 自定义工厂注册
- 配置驱动
- 统计监控

### 5. 并发安全
- 线程安全设计
- 读写锁优化
- 原子操作
- 上下文取消支持

## 📖 使用指南

### 基本用法

```go
package main

import (
    "context"
    "fmt"
    "ai-project-backend/testdata/factories"
)

func main() {
    // 创建工厂助手
    modelRegistry := createModelRegistry() // 实现模型注册中心
    helper := factories.NewFactoryHelper(modelRegistry)
    
    ctx := context.Background()
    
    // 创建单个用户
    user, err := helper.CreateModel(ctx, "User")
    if err != nil {
        panic(err)
    }
    fmt.Printf("创建的用户: %+v\n", user)
    
    // 批量创建任务
    tasks, err := helper.CreateModels(ctx, "Task", 10)
    if err != nil {
        panic(err)
    }
    fmt.Printf("创建了 %d 个任务\n", len(tasks))
}
```

### 快速创建方法

```go
// 使用快速创建API
quick := helper.Quick()

// 快速创建用户
user, _ := quick.User(ctx)

// 快速创建带自定义属性的用户
customUser, _ := quick.User(ctx, map[string]interface{}{
    "role": "admin",
    "department": "IT",
})

// 快速批量创建
users, _ := quick.Users(ctx, 5)
```

### 自定义配置

```go
// 自定义生成器配置
config := factories.FactoryConfig{
    ModelName: "User",
    UseCache:  true,
    GlobalSeed: 12345,
    Generators: map[string]factories.GeneratorConfig{
        "name": {
            Type:    "string",
            Pattern: "User_{random}",
            Params:  map[string]interface{}{"length": 10},
        },
        "age": {
            Type: "int",
            Range: factories.RangeConfig{Min: 18, Max: 65},
        },
    },
}

user, err := helper.CreateModel(ctx, "User", config)
```

### 关系数据创建

```go
// 创建带关系的数据
relations := []factories.RelationConfig{
    {
        Field:       "assignee",
        TargetModel: "User",
        Strategy:    "existing",
        Ratio:       0.8,
    },
}

taskWithUser, err := helper.CreateWithRelations(ctx, "Task", relations)
```

### 批处理器使用

```go
// 创建批处理器
processor := factories.NewBatchProcessor(100, 4) // 批大小100，并发度4

ctx := context.Background()
items := []interface{}{"item1", "item2", "item3", ...}

config := factories.BatchProcessConfig{
    BatchSize:    100,
    Concurrency:  4,
    Timeout:      time.Second * 30,
    RetryCount:   3,
    RetryDelay:   time.Second,
    ErrorHandler: "skip",
}

// 同步处理
err := processor.Process(ctx, items, config)

// 异步处理
resultChan, err := processor.ProcessAsync(ctx, items, config)
for result := range resultChan {
    if result.Error != nil {
        // 处理错误
    } else {
        // 处理成功结果
    }
}
```

## 🔧 扩展开发

### 自定义生成器

```go
type CustomEmailGenerator struct {
    domain string
    stats  factories.GeneratorStats
    mutex  sync.RWMutex
}

func (g *CustomEmailGenerator) Generate(ctx context.Context, field core.IFieldDefinition, config factories.GeneratorConfig) (interface{}, error) {
    return fmt.Sprintf("user%d@%s", rand.Int()%10000, g.domain), nil
}

// 实现其他接口方法...

// 注册自定义生成器
helper.RegisterCustomGenerator(core.FieldTypeEmail, &CustomEmailGenerator{domain: "company.com"})
```

### 自定义工厂

```go
type CustomUserFactory struct{}

func (f *CustomUserFactory) Create(ctx context.Context, config factories.FactoryConfig) (interface{}, error) {
    return map[string]interface{}{
        "id":   time.Now().UnixNano(),
        "name": "Custom User",
        "type": "premium",
    }, nil
}

// 实现其他接口方法...

// 注册自定义工厂
helper.RegisterCustomFactory("CustomUser", &CustomUserFactory{})
```

## 📊 统计与监控

### 工厂统计

```go
// 获取工厂统计信息
stats, err := helper.GetFactoryStats("default_User")
if err == nil {
    fmt.Printf("工厂统计: %+v\n", stats)
}

// 批处理器统计
batchStats := helper.GetBatchProcessorStats()
fmt.Printf("批处理统计: %+v\n", batchStats)
```

### 缓存统计

```go
cache := factories.NewFactoryCache(1000, 5*time.Minute)
cache.Set("key", "value", time.Minute)

stats := cache.Stats()
fmt.Printf("缓存统计: 命中率=%.2f%%, 大小=%d/%d\n", 
    stats.HitRate*100, stats.Size, stats.MaxSize)
```

## 🧪 测试

运行测试：

```bash
cd /path/to/factories
go test -v
```

运行性能测试：

```bash
go test -bench=. -benchmem
```

## 📈 性能特点

### 内存使用
- 对象池化技术
- 延迟初始化
- 垃圾回收友好

### 并发性能
- 读写锁优化
- 无锁数据结构
- 协程池管理

### 缓存性能
- LRU淘汰策略
- 批量操作
- 预热机制

## 🔍 最佳实践

### 1. 配置管理
- 使用配置文件集中管理
- 环境特定配置
- 配置验证

### 2. 错误处理
- 优雅的错误降级
- 详细的错误信息
- 错误统计和监控

### 3. 性能优化
- 合理设置批大小
- 调整并发度
- 使用缓存减少重复计算

### 4. 扩展开发
- 遵循接口规范
- 实现统计接口
- 支持配置化

## 📄 许可证

本项目采用 MIT 许可证。详见 LICENSE 文件。

## 🤝 贡献指南

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交修改 (`git commit -m 'Add amazing feature'`)
4. 推送分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 📞 支持

如有问题或建议，请创建 Issue 或联系项目维护者。

---

**注意**: 这是一个用于AI项目的测试数据工厂系统，请根据实际需求调整配置和使用方式。