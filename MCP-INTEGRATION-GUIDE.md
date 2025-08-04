# MCP集成指南 - AI项目管理平台

## 🚀 概述

本指南介绍如何设置和使用AI项目管理平台的Model Context Protocol (MCP) 集成功能，实现Claude Code与项目管理系统的无缝对接。

## 📋 功能特性

### ✅ 核心功能
- **任务管理**: 创建、查看、更新任务状态
- **项目操作**: 多项目支持，灵活的项目切换
- **认证集成**: JWT token自动管理和刷新
- **错误处理**: 完善的错误处理和用户反馈
- **多版本支持**: 简化版和完整版MCP桥接器

### 🔒 认证机制
- JWT Bearer Token认证
- 自动token刷新机制
- 配置文件自动更新
- Cron定时任务维护

## 🛠️ 安装配置

### 1. 环境准备

确保已安装必要依赖:
```bash
npm install @modelcontextprotocol/sdk axios
```

### 2. 后端服务配置

启动AI项目管理平台后端服务:
```bash
cd backend
go run main.go
```

确保服务运行在 `http://localhost:8080`

### 3. 获取认证Token

登录系统获取JWT token:
```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"your-username","password":"your-password"}'
```

### 4. Claude Code配置

在 `~/.claude-code/config.json` 中配置MCP服务器:

```json
{
  "mcpServers": {
    "ai-project-manager": {
      "command": "node",
      "args": ["/path/to/mcp-claude-code-bridge-simple.js"],
      "env": {
        "API_BASE_URL": "http://localhost:8080/api/v1",
        "AUTH_TOKEN": "your-jwt-token-here"
      }
    }
  }
}
```

## 📁 MCP桥接器版本

### 1. 简化版 (`mcp-claude-code-bridge-simple.js`)
- **适用场景**: 基本任务管理需求
- **功能**: 创建、查看、开始、完成任务
- **特点**: 轻量级，易于理解和维护

### 2. 最小版 (`mcp-bridge-minimal.js`)
- **适用场景**: 测试和开发环境
- **功能**: 基础的任务创建和列表查看
- **特点**: 最简实现，便于调试

### 3. 完整版 (`mcp-claude-code-bridge.js`)
- **适用场景**: 生产环境
- **功能**: 全面的项目管理功能
- **特点**: 完整功能集，高级错误处理

## 🔧 自动化工具

### Token自动刷新

设置自动token刷新:
```bash
# 使脚本可执行
chmod +x auto-refresh-token.js
chmod +x setup-token-refresh-cron.sh

# 设置定时任务
./setup-token-refresh-cron.sh
```

手动刷新token:
```bash
node auto-refresh-token.js
```

### 定时任务配置

系统会自动创建Cron任务，每天凌晨2点检查和刷新token:
```cron
0 2 * * * /usr/bin/node /path/to/auto-refresh-token.js >> ~/.claude-code/token-refresh.log 2>&1
```

## 📖 使用指南

### 基本命令

在Claude Code中使用以下MCP工具:

1. **创建任务**:
   ```
   用MCP工具创建任务: "实现用户认证功能"
   ```

2. **查看任务列表**:
   ```
   用MCP工具查看项目1的任务列表
   ```

3. **开始任务**:
   ```
   用MCP工具开始执行任务123
   ```

4. **完成任务**:
   ```
   用MCP工具完成任务123
   ```

### 高级使用

- **多项目支持**: 指定`projectId`参数操作不同项目
- **错误处理**: 系统会自动处理认证失败、网络错误等问题
- **日志记录**: 所有操作都会记录在系统日志中

## 🔍 故障排除

### 常见问题

1. **认证失败**
   - 检查token是否过期
   - 运行 `node auto-refresh-token.js` 刷新token
   - 确认配置文件中的token格式正确

2. **连接失败**
   - 确认后端服务正在运行
   - 检查API_BASE_URL配置
   - 验证网络连接

3. **MCP工具不可用**
   - 重启Claude Code
   - 检查MCP服务器配置
   - 查看错误日志

### 调试模式

启用详细日志记录:
```bash
export DEBUG=1
node mcp-claude-code-bridge-simple.js
```

## 📊 API端点

### 认证相关
- `POST /api/v1/auth/login` - 用户登录
- `POST /api/v1/auth/refresh` - 刷新token

### 任务管理
- `GET /api/v1/projects/{id}/tasks` - 获取任务列表
- `POST /api/v1/projects/{id}/tasks` - 创建新任务
- `PUT /api/v1/projects/{id}/tasks/{taskId}` - 更新任务状态

### 系统状态
- `GET /api/v1/health` - 系统健康检查

## 🎯 最佳实践

### 安全建议
- 定期更新JWT token
- 使用环境变量存储敏感信息
- 监控token使用和刷新日志

### 性能优化
- 合理设置API请求超时时间
- 使用批量操作减少API调用次数
- 缓存常用数据减少重复请求

### 错误处理
- 实现重试机制处理临时网络问题
- 提供用户友好的错误信息
- 记录详细的错误日志便于调试

## 📚 扩展开发

### 添加新功能

1. 在MCP桥接器中添加新的API方法
2. 更新工具列表注册新功能
3. 实现相应的API调用逻辑
4. 更新文档和测试

### 自定义配置

可以通过环境变量自定义:
- `API_BASE_URL`: API服务器地址
- `AUTH_TOKEN`: 认证令牌
- `REQUEST_TIMEOUT`: 请求超时时间
- `DEBUG`: 调试模式开关

## 🆘 支持与反馈

- **文档**: 查看项目README和API文档
- **日志**: 检查 `~/.claude-code/token-refresh.log`
- **调试**: 使用DEBUG模式获取详细信息

---

**更新时间**: 2025-01-04  
**版本**: v1.0.0  
**维护者**: AI项目管理平台开发团队

🎉 享受Claude Code与AI项目管理平台的无缝集成体验！