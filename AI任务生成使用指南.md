# AI任务生成使用指南

## 概述

AI任务生成功能已成功修复，可以将用户的需求描述自动分解为具体的可执行任务。本指南将详细介绍如何使用这个功能。

## 🎯 功能特点

- **智能分解**：将复杂需求自动分解为具体任务
- **任务质量评估**：自动评估任务的完整性、清晰度和可行性
- **依赖关系分析**：分析任务间的依赖关系
- **重复检测**：避免生成重复的任务
- **技能标签**：为任务添加相关的技能标签
- **时间估算**：提供工作量估算

## 🔧 快速开始

### 使用调试工具（推荐）

项目已提供便捷的调试工具 `ai-task-debug-tool.sh`：

```bash
# 交互式模式
./ai-task-debug-tool.sh

# 直接指定任务
./ai-task-debug-tool.sh "开发用户注册功能" 5

# 显示帮助
./ai-task-debug-tool.sh --help
```

### API调用方式

**端点**：`POST /api/v1/system/ai-tasks/generate`

**请求格式**：
```json
{
    "project_id": 39,
    "provider": "deepseek",
    "input_text": "开发一个用户登录功能，包括表单验证和错误处理",
    "options": {
        "max_tasks": 5,
        "enable_duplicate_check": true,
        "enable_dependency_analysis": true,
        "enable_skill_tagging": true
    }
}
```

**响应格式**：
```json
{
    "success": true,
    "message": "AI任务生成成功",
    "data": {
        "generation_result": {
            "success": true,
            "generated_tasks": [
                {
                    "title": "设计并实现用户登录表单",
                    "description": "创建包含用户名和密码输入字段的登录表单...",
                    "priority": "high",
                    "estimated_hours": 4,
                    "tags": ["前端开发", "UI设计"],
                    "dependencies": [],
                    "confidence": 0.95,
                    "ai_generated_id": "ai_1753834646_0"
                }
            ],
            "total_tasks": 3,
            "processing_time_ms": 16144,
            "token_usage": {
                "prompt_tokens": 196,
                "completion_tokens": 301,
                "total_tokens": 497
            },
            "quality_metrics": {
                "overall_score": 0.8,
                "completeness_score": 0.9,
                "clarity_score": 0.85,
                "feasibility_score": 0.8,
                "duplicate_count": 0,
                "missing_dependencies": 0
            }
        }
    }
}
```

## 📝 使用示例

### 示例1：开发功能模块

**输入**：
```
开发一个商品管理系统，包括增删改查功能
```

**生成的任务**：
1. 设计商品数据模型（4小时，高优先级）
2. 开发商品管理API（8小时，高优先级）
3. 实现商品管理前端界面（6小时，中优先级）
4. 测试与调试商品管理系统（4小时，中优先级）

### 示例2：系统优化

**输入**：
```
优化系统性能，减少页面加载时间
```

**生成的任务**：
1. 分析当前性能瓶颈
2. 优化数据库查询
3. 实现前端代码分割
4. 添加缓存机制

### 示例3：用户体验改进

**输入**：
```
改进用户注册流程，提升用户体验
```

**生成的任务**：
1. 分析当前注册流程问题
2. 设计新的注册流程
3. 实现表单优化
4. 添加邮箱验证功能

## ⚙️ 配置参数说明

### 基础参数

| 参数 | 说明 | 示例 |
|------|------|------|
| `project_id` | 项目ID | 39 |
| `provider` | AI提供商 | "deepseek" |
| `input_text` | 需求描述 | "开发用户登录功能" |

### 选项参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `max_tasks` | 最大任务数量 | 5 |
| `enable_duplicate_check` | 启用重复检测 | true |
| `enable_dependency_analysis` | 启用依赖分析 | true |
| `enable_skill_tagging` | 启用技能标签 | true |

## 📊 质量指标说明

生成的任务会包含质量评估指标：

- **overall_score**：总体质量评分（0-1）
- **completeness_score**：完整性评分（0-1）
- **clarity_score**：清晰度评分（0-1）
- **feasibility_score**：可行性评分（0-1）
- **duplicate_count**：重复任务数量
- **missing_dependencies**：缺失依赖数量

## 🎯 最佳实践

### 1. 需求描述要点

**✅ 好的描述**：
- 具体明确：描述具体的功能或目标
- 包含背景：说明为什么需要这个功能
- 明确边界：说明功能的范围和限制

**❌ 避免的描述**：
- 过于笼统："做一个系统"
- 缺乏背景："添加按钮"
- 技术术语过多：对非技术人员不友好

### 2. 参数调优建议

- **小功能**：max_tasks 设为 3-5
- **大项目**：max_tasks 设为 8-10
- **原型开发**：关闭依赖分析，提高生成速度
- **复杂系统**：开启所有分析选项

### 3. 结果处理建议

1. **任务审查**：生成后检查任务的合理性
2. **优先级调整**：根据实际情况调整任务优先级
3. **时间估算**：参考AI估算，结合实际经验调整
4. **依赖关系**：验证任务间的依赖关系是否合理

## 🔍 故障排除

### 常见问题

**Q: 生成的任务太少/太多？**
A: 调整 `max_tasks` 参数，或者修改需求描述的详细程度

**Q: 任务描述不够详细？**
A: 在输入中提供更多背景信息和具体要求

**Q: 出现JSON解析错误？**
A: 检查AI配置是否正确，确保使用的是 `GenerateCompletion` 而不是 `TestConnection`

**Q: 处理时间过长？**
A: 检查网络连接，或者减少任务复杂度

### 调试方法

1. **使用调试工具**：
   ```bash
   ./ai-task-debug-tool.sh "你的需求描述"
   ```

2. **查看后端日志**：
   ```bash
   docker-compose logs backend --tail 50
   ```

3. **检查AI配置**：
   确保DeepSeek API配置正确且有足够的token配额

## 📋 技术细节

### 修复历史

原始问题是JSON解析错误 `"unexpected end of JSON input"`，根本原因是：

1. **问题**：使用了 `TestConnection` 方法（token限制150）
2. **修复**：改用 `GenerateCompletion` 方法（使用完整token配置）
3. **影响**：修复了响应截断问题，确保JSON完整性

### API变更

- **修复前**：`h.aiClient.TestConnection(ctx, &testConfig, prompt)`
- **修复后**：`h.aiClient.GenerateCompletion(ctx, &testConfig, prompt)`

### 依赖说明

- **AI提供商**：DeepSeek Chat
- **后端**：Go 1.24 + Gin框架
- **数据库**：PostgreSQL 16
- **认证**：JWT Token

## 📞 支持

如果遇到问题：

1. 首先使用调试工具进行测试
2. 查看后端日志了解详细错误信息
3. 检查AI配置和网络连接
4. 参考本指南的故障排除部分

---

*最后更新：2025-07-30*