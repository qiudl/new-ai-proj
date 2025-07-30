# 🚀 AI配置模块使用指南

## 📋 概述

AI配置模块已完全调通，支持DeepSeek、OpenAI、Claude三种AI提供商的配置管理。您现在可以：

- ✅ 配置和管理AI API密钥
- ✅ 测试AI连接状态  
- ✅ 调整AI参数（温度、最大token等）
- ✅ 启用/禁用AI提供商
- ✅ 查看使用统计和测试历史

## 🔧 快速开始

### 方式一：使用前端界面（推荐）

1. **访问配置页面**
   ```
   http://localhost:3000/ai-config
   ```

2. **选择DeepSeek标签页**
   - 输入API密钥（格式：sk-xxxxxx）
   - 选择模型：deepseek-chat（推荐）
   - 调整参数（可选）
   - 点击"保存配置"

3. **测试连接**
   - 点击"测试连接"按钮
   - 查看测试结果和AI对话示例

### 方式二：使用命令行工具

```bash
# 进入项目目录
cd /Users/johnqiu/coding/www/projects/new-ai-proj

# 运行DeepSeek API密钥测试工具
node test-real-deepseek-api.js

# 按提示输入API密钥，工具会自动测试并保存配置
```

## 🔑 获取DeepSeek API密钥

1. **访问DeepSeek平台**
   ```
   https://platform.deepseek.com
   ```

2. **注册并登录账户**

3. **在控制台获取API密钥**
   - 进入API密钥管理页面
   - 创建新的API密钥
   - 复制密钥（格式：sk-xxxxxxxx）

4. **充值账户余额**（如需要）

## 🧪 测试模式

如果暂时没有真实API密钥，可以使用测试模式：

### 测试密钥示例：
```
sk-test1234567890abcdefghijklmnopqrstuvwxyz123456
sk-demo1234567890abcdefghijklmnopqrstuvwxyz123456
```

### 在命令行工具中：
```bash
node test-real-deepseek-api.js
# 当提示输入API密钥时，输入 "test" 即可使用测试模式
```

## ⚙️ 配置参数说明

| 参数 | 说明 | 推荐值 | 范围 |
|------|------|--------|------|
| **API密钥** | DeepSeek平台获取的密钥 | sk-xxxxxx | 必填 |
| **模型** | 使用的AI模型 | deepseek-chat | deepseek-chat, deepseek-coder |
| **Temperature** | 控制回答的创造性 | 0.3 | 0.0-2.0 |
| **Max Tokens** | 最大响应长度 | 2000 | 1-32000 |
| **Base URL** | API服务地址 | 默认即可 | 一般不需要修改 |

### 参数调优建议：

- **创造性任务**：Temperature = 0.7-1.0
- **事实性回答**：Temperature = 0.1-0.3  
- **代码生成**：建议使用 deepseek-coder 模型
- **一般对话**：使用 deepseek-chat 模型

## 🔧 API调用示例

### 获取AI配置
```javascript
// 前端代码示例
import aiConfigDatabaseService from '../services/aiConfigDatabaseService';

const configs = await aiConfigDatabaseService.getConfigs();
console.log('AI配置列表:', configs);
```

### 测试连接
```javascript
const testResult = await aiConfigDatabaseService.testConnection({
  provider: 'deepseek',
  apiKey: 'sk-your-api-key',
  model: 'deepseek-chat'
});

if (testResult.data.success) {
  console.log('连接成功:', testResult.data.message);
}
```

### 保存配置
```javascript
const config = await aiConfigDatabaseService.createConfig({
  provider: 'deepseek',
  apiKey: 'sk-your-api-key',
  model: 'deepseek-chat',
  temperature: 0.3,
  maxTokens: 2000,
  enabled: true
});
```

## 🛡️ 安全说明

1. **API密钥加密**：所有API密钥都使用AES-256-GCM加密存储
2. **脱敏显示**：前端界面只显示脱敏后的密钥
3. **权限控制**：需要登录权限才能访问配置
4. **审计日志**：所有操作都有日志记录

## 📊 监控和统计

### 在前端界面查看：
- 测试成功/失败次数
- 最后测试时间
- 配置状态（活跃/非活跃/错误）

### 通过API获取统计：
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \\
  http://localhost:8080/api/v1/system/ai-configs/stats
```

## 🔍 故障排除

### 常见问题：

1. **API密钥无效**
   - 检查密钥格式（应以sk-开头）
   - 确认密钥是否正确复制
   - 检查DeepSeek账户余额

2. **连接测试失败**
   - 检查网络连接
   - 确认API密钥有效性
   - 检查DeepSeek服务状态

3. **配置保存失败**
   - 确认已登录且有权限
   - 检查字段格式是否正确
   - 查看浏览器控制台错误信息

### 调试工具：

```bash
# 检查后端服务状态
curl http://localhost:8080/health

# 检查前端服务状态  
curl http://localhost:3000

# 运行完整的AI配置测试
node test-deepseek-complete.js
```

## 🔄 更新和维护

### 定期检查：
1. API密钥是否仍然有效
2. DeepSeek账户余额
3. 模型参数是否需要调整
4. 使用统计和成本分析

### 升级建议：
1. 定期更新到最新的模型版本
2. 根据使用情况调整配置参数
3. 监控API调用频率和成本

## 📞 支持和联系

如果遇到问题，可以：

1. **查看日志**：
   - 前端：浏览器开发者工具控制台
   - 后端：服务器日志文件

2. **运行测试脚本**：
   ```bash
   node test-ai-config.js           # 基础功能测试
   node test-deepseek-complete.js   # 完整功能测试  
   node test-real-deepseek-api.js   # 真实API密钥测试
   ```

3. **检查系统状态**：
   - 后端API：http://localhost:8080/health
   - 前端界面：http://localhost:3000/ai-config

---

**最后更新**：2025-07-29  
**状态**：✅ 全功能可用  
**版本**：v1.0.0
