# 核心数据模型设计与实现

本项目实现了智能数据生成系统的核心数据模型架构，包括模型定义、关系管理、约束验证和图形化展示等完整功能。

## 📁 项目结构

```
testdata/
├── core/               # 核心接口和类型定义
│   ├── interfaces.go   # 数据模型核心接口
│   ├── types.go        # 数据类型定义
│   └── registry.go     # 模型注册中心
├── models/             # 模型实现
│   ├── base.go         # 基础模型实现
│   └── entities.go     # 实体模型（用户、项目、任务、文档）
├── relations/          # 关系图谱
│   └── graph.go        # 模型关系图实现
├── tests/              # 测试文件
│   ├── core_test.go    # 核心功能测试
│   └── graph_test.go   # 关系图谱测试
├── examples/           # 演示示例
│   └── demo.go         # 完整功能演示
└── README.md           # 项目文档
```

## 🏗️ 核心架构

### 1. 接口设计（core/interfaces.go）

定义了数据模型系统的核心接口：

- **IDataModel**: 数据模型基础接口
- **IFieldDefinition**: 字段定义接口
- **IRelation**: 关系定义接口
- **IConstraint**: 约束验证接口
- **IFieldGenerator**: 字段生成器接口
- **IModelRegistry**: 模型注册中心接口

### 2. 数据类型系统（core/types.go）

包含完整的数据类型定义：

- **字段类型**: String, Int, Float, Boolean, Timestamp, JSON, Text, UUID等
- **关系类型**: OneToOne, OneToMany, ManyToMany, BelongsTo等
- **约束类型**: Required, Unique, Length, Range, Format, Custom等
- **元数据结构**: 模型元数据、验证结果等

### 3. 模型注册中心（core/registry.go）

提供模型的注册、管理和实例化功能：

- 模型注册与注销
- 实例创建
- 元数据管理
- 线程安全操作

### 4. 基础模型实现（models/base.go）

实现了核心接口的基础类：

- **BaseModel**: 基础模型抽象
- **FieldDefinition**: 字段定义实现
- **Relation**: 关系定义实现
- **Constraint**: 约束验证实现
- 通用数据转换功能（ToMap/FromMap）

### 5. 实体模型（models/entities.go）

实现了具体的业务实体：

- **User**: 用户模型
- **Project**: 项目模型
- **Task**: 任务模型
- **Document**: 文档模型

每个实体都包含：
- 完整的字段定义
- 关系映射
- 数据验证
- 序列化支持

### 6. 关系图谱系统（relations/graph.go）

实现了模型间关系的图形化管理：

- **模型节点管理**: 添加、删除、查询模型节点
- **关系边管理**: 构建和维护模型间的关系
- **路径查找**: 使用Dijkstra算法查找最短路径
- **图验证**: 检测循环依赖和孤立引用
- **布局算法**: 支持层次化、圆形、力导向布局
- **度量计算**: 节点数、边数、密度、连通性等指标

## 🚀 核心功能

### 1. 模型定义与注册

```go
// 注册模型
registry := core.NewModelRegistry()
err := registry.RegisterModel("User", func() core.IDataModel {
    return models.NewUser()
})

// 创建实例
user, err := registry.CreateInstance("User")
```

### 2. 字段定义与约束

```go
// 创建字段定义
field := models.NewFieldDefinition("email", core.FieldTypeString)
field.SetRequired(true).SetUnique(true)

// 添加约束
constraint := models.NewConstraint("length", core.ConstraintTypeLength)
constraint.SetParam("min", 5).SetParam("max", 100)
field.AddConstraint(constraint)
```

### 3. 关系定义

```go
// 定义关系
relation := models.NewRelation("owner", core.RelationBelongsTo, "User")
relation.SetForeignKey("id").SetLocalKey("owner_id").SetRequired(true)
```

### 4. 关系图谱操作

```go
// 创建关系图
graph := relations.NewModelGraph(registry)
graph.AddModel(userModel)

// 查找路径
path, err := graph.GetPath("User", "Task")

// 计算度量指标
metrics := graph.CalculateMetrics()

// 应用布局
err := graph.UpdateLayout(relations.LayoutHierarchical)
```

### 5. 数据转换

```go
// 转换为Map
userMap := user.ToMap()

// 从Map填充
err := user.FromMap(dataMap)
```

## 🧪 测试覆盖

项目包含全面的测试覆盖：

### 核心功能测试（tests/core_test.go）
- 模型注册中心测试
- 字段定义测试
- 关系定义测试
- 约束验证测试
- 实体模型测试

### 关系图谱测试（tests/graph_test.go）
- 图构建与管理测试
- 路径查找测试
- 图验证测试
- 布局算法测试
- 度量计算测试

### 运行测试

```bash
cd backend/testdata
go test ./tests/... -v
```

## 📊 演示示例

运行完整功能演示：

```bash
cd backend/testdata/examples
go run demo.go
```

演示内容包括：
1. 模型注册与管理
2. 实体创建与操作
3. 关系图谱构建
4. 约束验证机制
5. 数据转换功能

## 🔧 设计特点

### 1. 接口驱动设计
- 使用接口定义核心抽象
- 支持多种实现方式
- 易于扩展和测试

### 2. 元数据支持
- 完整的模型元数据管理
- 支持标签和自定义属性
- 版本控制和时间戳

### 3. 关系图谱
- 可视化模型关系
- 多种布局算法
- 图验证和度量

### 4. 约束验证
- 灵活的约束定义
- 自定义验证器
- 级联验证支持

### 5. 数据转换
- 通用的序列化机制
- 反射驱动的转换
- 类型安全保证

## 🎯 应用场景

该核心数据模型系统可用于：

1. **ORM系统**: 作为对象关系映射的基础
2. **数据生成工具**: 为数据生成提供模型定义
3. **API文档生成**: 基于模型生成接口文档
4. **数据验证系统**: 提供数据完整性验证
5. **图形化建模**: 可视化展示数据模型关系

## 📈 性能特点

- **线程安全**: 所有核心组件都支持并发访问
- **内存优化**: 合理的数据结构设计，避免内存泄漏
- **延迟加载**: 关系数据按需加载
- **缓存支持**: 模型注册中心内置缓存机制

## 🔄 扩展性

系统设计具有良好的扩展性：

1. **新字段类型**: 通过接口轻松添加新的字段类型
2. **自定义约束**: 支持自定义验证逻辑
3. **布局算法**: 可添加新的图布局算法
4. **存储后端**: 可适配不同的持久化方案

## 📝 最佳实践

1. **模型设计**: 保持模型简洁，单一职责
2. **关系定义**: 明确关系类型和约束
3. **验证逻辑**: 将验证逻辑封装在约束中
4. **性能考虑**: 合理使用缓存和延迟加载
5. **测试驱动**: 为所有核心功能编写测试

## 🚧 后续规划

1. **持久化支持**: 添加数据库适配器
2. **序列化优化**: 支持更多序列化格式
3. **性能监控**: 添加性能指标收集
4. **可视化界面**: 开发图形化管理界面
5. **分布式支持**: 支持分布式模型注册