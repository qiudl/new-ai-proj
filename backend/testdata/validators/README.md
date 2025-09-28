# Go 验证引擎框架

一个高性能、可扩展的 Go 语言验证引擎框架，支持复杂的数据验证场景。

## 特性

### 基础特性
- **高性能**: 支持并发验证，充分利用多核性能
- **可扩展**: 插件化架构，支持自定义验证规则
- **多样化规则**: 内置多种常用验证规则（必填、长度、范围、邮箱、日期等）
- **验证管道**: 支持多阶段验证管道，灵活控制验证流程  
- **详细错误信息**: 提供丰富的错误详情和修复建议
- **缓存机制**: 内置验证结果缓存，提升性能
- **统计监控**: 完整的执行统计和性能指标
- **工厂模式**: 支持通过模板快速创建验证规则

### 高级特性
- **规则组合**: 支持 AND、OR、NOT、XOR、NAND、NOR 逻辑组合规则
- **条件验证**: 基于数据状态的动态条件验证规则
- **异步验证**: 支持远程API调用、数据库查询等异步验证操作
- **批量异步**: 高效的异步验证批处理器，支持并发控制
- **错误分级**: 按严重程度对错误进行分类和过滤

## 核心组件

### 1. 验证引擎 (ValidationEngine)
- 验证任务的调度和执行
- 支持同步和异步验证模式
- 内置工作池，支持高并发处理

### 2. 验证规则 (ValidationRule)
- 内置规则：必填、长度、范围、邮箱、日期、枚举、正则表达式
- 支持自定义验证规则
- 规则组合和依赖管理

### 3. 验证管道 (ValidationPipeline)
- 多阶段验证处理
- 阶段间依赖控制
- 阶段执行统计

### 4. 验证上下文 (ValidationContext)
- 验证数据的统一访问接口
- 支持字段路径导航
- 验证状态缓存

### 5. 验证结果 (ValidationResult)
- 详细的验证错误和警告信息
- 支持结果合并和过滤
- 多种输出格式（JSON、字符串）

## 快速开始

### 基础验证示例

```go
package main

import (
    "context"
    "fmt"
)

func main() {
    // 创建用户数据
    user := &User{
        Username: "john_doe",
        Email:    "john@example.com",
        Age:      25,
    }

    // 创建验证引擎
    config := NewValidationConfig()
    engine := CreateEngine(config)

    // 注册验证规则
    engine.RegisterRule(CreateRequiredRule("req_001", "必填字段", []string{"username", "email"}))
    engine.RegisterRule(CreateLengthRule("len_001", "用户名长度", "username").SetMin(3).SetMax(20))
    engine.RegisterRule(CreateRangeRule("range_001", "年龄范围", "age").SetMin(18).SetMax(100))

    // 启动引擎并验证
    engine.Start()
    defer engine.Stop()

    result := engine.Validate(context.Background(), user)

    // 查看结果
    fmt.Printf("验证结果: %t\n", result.IsValid())
    if !result.IsValid() {
        for _, err := range result.GetErrors() {
            fmt.Printf("错误: %s - %s\n", err.Field, err.Message)
        }
    }
}
```

### 验证管道示例

```go
// 创建多阶段验证管道
pipeline := CreatePipeline("user_validation", "用户验证管道")

// 第一阶段：基础验证
stage1 := NewValidationStage("basic", "基础验证", 1)
stage1.AddRule(CreateRequiredRule("req_basic", "基础必填", []string{"username", "email"}))
pipeline.AddStage(stage1)

// 第二阶段：业务验证
stage2 := NewValidationStage("business", "业务验证", 2)
stage2.AddRule(CreateLengthRule("len_username", "用户名长度", "username").SetMin(3).SetMax(20))
pipeline.AddStage(stage2)

// 执行管道验证
result := pipeline.Execute(context.Background(), user)
```

### 自定义验证规则

```go
// 创建自定义密码策略验证
passwordRule := CreateCustomRule("password_policy", "密码策略", func(ctx IValidationContext, result *ValidationResult) error {
    passwordValue, found := ctx.GetFieldValue("password")
    if !found {
        result.AddError(ValidationError{
            Field:     "password",
            Message:   "密码字段不存在",
            Type:      ErrorTypeRequired,
            Severity:  ErrorSeverityHigh,
            Code:      "PASSWORD_MISSING",
        })
        return nil
    }

    password, ok := passwordValue.(string)
    if !ok {
        result.AddError(ValidationError{
            Field:     "password",
            Message:   "密码必须是字符串类型",
            Type:      ErrorTypeFormat,
            Severity:  ErrorSeverityHigh,
            Code:      "PASSWORD_TYPE_ERROR",
        })
        return nil
    }

    // 检查密码长度
    if len(password) < 8 {
        result.AddError(ValidationError{
            Field:     "password",
            Message:   "密码长度至少8位",
            Type:      ErrorTypeLength,
            Severity:  ErrorSeverityHigh,
            Code:      "PASSWORD_TOO_SHORT",
        })
    }

    // 检查密码复杂度（示例只检查是否包含大写字母）
    hasUpper := false
    for _, char := range password {
        if 'A' <= char && char <= 'Z' {
            hasUpper = true
            break
        }
    }

    if !hasUpper {
        result.AddWarning(ValidationWarning{
            Field:     "password",
            Message:   "密码建议包含大写字母",
            Code:      "PASSWORD_NO_UPPERCASE",
        })
    }

    return nil
})

engine.RegisterRule(passwordRule)
```

## 运行示例

编译并运行完整的示例演示：

```bash
# 编译
go build -o validator-demo .

# 运行所有示例
./validator-demo

# 基础示例
./validator-demo basic      # 基础验证示例
./validator-demo pipeline   # 验证管道示例
./validator-demo concurrent # 并发验证示例
./validator-demo factory    # 工厂使用示例
./validator-demo custom     # 自定义验证示例

# 高级示例
./validator-demo composition # 规则组合示例
./validator-demo conditional # 条件验证示例
./validator-demo async      # 异步验证示例
./validator-demo complex    # 复杂场景示例
./validator-demo advanced   # 所有高级示例

# 综合示例
./validator-demo all        # 所有示例（基础+高级）
```

## 项目结构

```
validators/
├── interfaces.go           # 核心接口定义
├── types.go               # 数据类型和枚举
├── validation_engine.go   # 验证引擎实现
├── validation_context.go  # 验证上下文实现
├── validation_result.go   # 验证结果实现
├── validation_pipeline.go # 验证管道实现
├── validation_ruleset.go  # 验证规则集实现
├── validation_factory.go  # 验证工厂实现
├── builtin_rules.go       # 内置验证规则
├── base_validator.go      # 基础验证器
├── examples.go            # 使用示例
├── main.go               # 演示程序入口
└── README.md             # 项目说明文档
```

## 配置选项

```go
config := &ValidationConfig{
    StrictMode:      true,              // 严格模式
    FailFast:        false,             // 是否快速失败
    MaxErrors:       100,               // 最大错误数
    Timeout:         30 * time.Second,  // 超时时间
    MaxConcurrency:  4,                 // 最大并发数
    WorkerPoolSize:  8,                 // 工作池大小
    EnableWarnings:  true,              // 启用警告
    EnableCaching:   true,              // 启用缓存
    EnableMetrics:   true,              // 启用指标
    EnableProfiling: false,             // 启用性能分析
    DefaultRules:    true,              // 启用默认规则
    CacheSize:       1000,              // 缓存大小
    CacheTTL:        time.Hour,         // 缓存TTL
    Locale:          "zh-CN",           // 语言环境
    TimeZone:        "Asia/Shanghai",   // 时区
    LogLevel:        "INFO",            // 日志级别
    OutputFormat:    "json",            // 输出格式
    Verbose:         false,             // 详细输出
}
```

## 内置验证规则

### 基础规则
1. **必填验证** (`CreateRequiredRule`): 检查字段是否为空
2. **长度验证** (`CreateLengthRule`): 检查字符串或切片长度
3. **范围验证** (`CreateRangeRule`): 检查数值是否在指定范围内
4. **邮箱验证** (`CreateEmailRule`): 验证邮箱格式
5. **日期验证** (`CreateDateRule`): 验证日期格式和范围
6. **枚举验证** (`CreateEnumRule`): 检查值是否在枚举列表中
7. **正则验证** (`CreateRegexRule`): 使用正则表达式验证
8. **自定义验证** (`CreateCustomRule`): 支持自定义验证逻辑

### 高级规则
9. **组合规则** (`CreateAndRule`, `CreateOrRule`, `CreateNotRule`, 等): 逻辑组合验证
10. **条件规则** (`CreateConditionalRule`, `CreateIfThenRule`): 基于条件的动态验证
11. **异步规则** (`CreateAsyncRule`, `CreateAsyncRemoteValidationRule`): 异步验证规则

## 性能特性

- **并发处理**: 支持多工作协程并发验证
- **结果缓存**: 相同数据的验证结果可以缓存复用
- **惰性计算**: 只有在需要时才执行昂贵的计算操作
- **内存优化**: 采用对象池和内存复用减少GC压力
- **统计监控**: 详细的性能统计帮助优化

## 扩展开发

### 添加新的验证规则

1. 实现 `IValidationRule` 接口
2. 在工厂中注册规则类型
3. 添加相应的创建函数

### 自定义验证上下文

可以扩展 `ValidationContext` 来支持更复杂的数据访问模式。

### 集成外部系统

可以在自定义规则中集成数据库查询、远程API调用等外部验证逻辑。

## 许可证

本项目采用 MIT 许可证。

---

这是一个功能完整的Go验证引擎框架，提供了灵活的架构和丰富的功能，适用于各种数据验证场景。欢迎贡献代码和提出改进建议！