# AI GenerateCompletion 方法实施指南

## 概述

本指南描述了如何在 AI 项目后端中添加专门的 `GenerateCompletion` 方法，用于处理 AI 任务生成而不是使用 `TestConnection`。

## 主要改动

### 1. 新增 API 端点

在 `AIConfigHandler` 中添加了新的 `GenerateCompletion` 方法：

- **端点**: `POST /api/ai-config/generate`
- **功能**: 通用的 AI 内容生成接口
- **优势**: 
  - 专门用于生成任务，而不是测试连接
  - 支持更多的参数配置
  - 更好的错误处理和使用统计

### 2. 新增数据模型

在 `models` 包中添加了以下新结构体：

```go
// AICompletionRequest - AI完成请求
type AICompletionRequest struct {
    Provider     AIProvider  `json:"provider"`     // 必需：AI提供商
    Prompt       string      `json:"prompt"`       // 必需：提示词
    Model        string      `json:"model"`        // 可选：覆盖默认模型
    Temperature  *float64    `json:"temperature"`  // 可选：覆盖默认温度
    MaxTokens    *int        `json:"max_tokens"`   // 可选：覆盖默认token数
    SystemPrompt string      `json:"system_prompt"`// 可选：系统提示词
    Context      map[string]interface{} `json:"context"` // 可选：上下文信息
}

// AICompletionResponse - AI完成响应
type AICompletionResponse struct {
    Success      bool                  `json:"success"`
    Content      string                `json:"content"`       // AI生成的内容
    Error        string                `json:"error"`         // 错误信息
    Model        string                `json:"model"`         // 使用的模型
    Provider     string                `json:"provider"`      // 使用的提供商
    Usage        *AIUsageStatistics    `json:"usage"`         // Token使用统计
    ResponseTime int                   `json:"response_time"` // 响应时间(ms)
    Metadata     map[string]interface{} `json:"metadata"`     // 额外元数据
}
```

### 3. 更新 AIClient 接口

在 `services/ai_client.go` 中，`AIClient` 接口已包含 `GenerateCompletion` 方法：

```go
type AIClient interface {
    TestConnection(ctx context.Context, config *models.AIConfig, question string) (*models.AITestResponse, error)
    GenerateCompletion(ctx context.Context, config *models.AIConfig, prompt string) (*models.AICompletionResponse, error)
}
```

### 4. 更新任务生成逻辑

修改了 `AITaskGeneratorHandler` 中的以下方法，使用 `GenerateCompletion` 替代 `TestConnection`：

- `generateTasksWithAI`
- `validateTasksWithAI`
- `optimizeTasksWithAI`

## 实施步骤

### 步骤 1: 更新 AI 配置处理器

1. 将 `ai_config_handler_update.go` 中的 `GenerateCompletion` 方法添加到 `backend/handlers/ai_config_handler.go`
2. 添加 `recordUsage` 辅助方法用于记录使用情况

### 步骤 2: 更新数据模型

1. 将 `ai_completion_models.go` 中的新结构体添加到 `backend/models/ai_config.go` 或创建新文件
2. 确保所有验证规则正确配置

### 步骤 3: 更新任务生成处理器

1. 将 `ai_task_generator_handler_update.go` 中的更新方法替换到 `backend/handlers/ai_task_generator_handler.go`
2. 确保所有日志记录使用新的标签 `[AI_TASK_GEN]`

### 步骤 4: 更新路由配置

在 `backend/router/router.go` 或相应的路由配置文件中添加：

```go
aiGroup.POST("/generate", aiConfigHandler.GenerateCompletion)
```

### 步骤 5: 测试新功能

1. 使用提供的测试脚本 `test-generate-completion.sh` 进行基础测试
2. 测试不同的 AI 提供商（OpenAI、Claude、DeepSeek）
3. 验证错误处理和边界情况

## API 使用示例

### 基础请求

```javascript
const response = await fetch('/api/ai-config/generate', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
        provider: 'deepseek',
        prompt: '生成任务列表...',
        temperature: 0.3,
        max_tokens: 1000
    })
});
```

### 带上下文的请求

```javascript
const response = await fetch('/api/ai-config/generate', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
        provider: 'openai',
        prompt: '基于项目上下文生成任务',
        model: 'gpt-4',
        system_prompt: '你是项目管理专家',
        context: {
            project_name: '电商平台',
            phase: '开发阶段',
            team_size: 5
        }
    })
});
```

## 优势

1. **清晰的职责分离**: `TestConnection` 专门用于测试，`GenerateCompletion` 专门用于生成
2. **更好的参数控制**: 支持覆盖模型、温度、token数等参数
3. **上下文支持**: 可以传递额外的上下文信息
4. **使用统计**: 自动记录每次生成的使用情况
5. **更好的错误处理**: 统一的错误响应格式

## 注意事项

1. 确保 API 密钥正确解密
2. 设置合理的超时时间（默认 30 秒）
3. 监控 Token 使用量，避免超出配额
4. 对生成的内容进行适当的验证和清理
5. 考虑添加速率限制以防止滥用

## 后续优化建议

1. **缓存机制**: 对相同的提示词缓存响应
2. **批量处理**: 支持批量生成请求
3. **流式响应**: 支持 SSE 或 WebSocket 实时返回生成内容
4. **模板管理**: 预定义常用的提示词模板
5. **成本控制**: 实现预算限制和告警机制
6. **质量评估**: 自动评估生成内容的质量
7. **A/B 测试**: 支持不同模型的对比测试

## 迁移建议

1. 保持 `TestConnection` 端点用于向后兼容
2. 逐步将任务生成功能迁移到新端点
3. 更新前端代码使用新的 API
4. 监控两个端点的使用情况
5. 在确认稳定后弃用旧的方式
