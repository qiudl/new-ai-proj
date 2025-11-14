# MCP JWT认证问题修复总结

## 📋 问题描述

MCP接口总是报token不对的问题,需要检查并修复JWT认证流程,确保token能正确集成到MCP服务器。

## 🔍 问题分析

### 根本原因

1. **Token配置缺失**: MCP服务器的`.env`文件中`TASK_API_TOKEN`环境变量为空
2. **Token同步缺失**: 本地JWT token生成后没有自动同步到MCP配置
3. **手动维护困难**: 需要手动将token复制到MCP配置文件,容易出错且效率低

### 技术细节

- **MCP服务器认证流程**:
  - BaseClient (mcp-task-bridge/base-client.js) 在初始化时从环境变量读取token
  - 优先读取 `TASK_API_TOKEN`,其次 `API_TOKEN`
  - 如果环境变量为空,则无法进行认证

- **JWT Token存储位置**:
  - `~/.ai-proj-jwt-token`: 纯token文本文件
  - `~/.ai-proj-jwt.env`: 环境变量格式
  - `mcp-task-bridge/.env`: MCP服务器配置

## ✅ 解决方案

### 1. 直接修复 - 更新MCP配置文件

**文件**: `mcp-task-bridge/.env`

```bash
# 添加有效的JWT token
TASK_API_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. 自动化工具 - JWT自动同步脚本

创建了三个关键脚本:

#### A. `scripts/jwt-with-mcp-sync.sh` (核心脚本)

**功能**: 一键生成JWT token并自动同步到MCP配置

```bash
./scripts/jwt-with-mcp-sync.sh 7  # 生成7天有效期的token
```

**执行步骤**:
1. 调用`gen-jwt.sh`生成JWT token
2. 保存到`~/.ai-proj-jwt-token`和`~/.ai-proj-jwt.env`
3. 自动同步到`mcp-task-bridge/.env`
4. 备份原配置文件
5. 加载到当前shell环境

#### B. `scripts/sync-jwt-to-mcp.sh` (手动同步脚本)

**功能**: 手动将现有token同步到MCP配置

```bash
./scripts/sync-jwt-to-mcp.sh
```

#### C. `scripts/test-jwt-flow.sh` (测试脚本)

**功能**: 验证JWT认证流程

```bash
./scripts/test-jwt-flow.sh
```

### 3. 便捷别名 - 更新快捷命令

**文件**: `scripts/setup-jwt-shortcuts.sh`

新增/更新的快捷命令:

```bash
# 基础命令 (已增强,自动同步MCP)
jwt                 # 生成7天token并自动同步MCP(最常用)
jwt-gen             # 生成7天token并同步MCP
jwt-gen-1d          # 生成1天token并同步MCP
jwt-gen-7d          # 生成7天token并同步MCP

# MCP相关命令 (新增)
jwt-sync            # 手动同步token到MCP配置
jwt-restart-mcp     # 重启MCP服务器应用新token

# 其他命令(保持不变)
jwt-load            # 加载token到环境变量
jwt-show            # 显示token
jwt-info            # 查看token信息
jwt-copy            # 复制token到剪贴板
jwt-test            # 测试token有效性
```

## 📝 使用流程

### 方法一: 快捷命令(推荐)

```bash
# 1. 设置快捷命令(首次)
./scripts/setup-jwt-shortcuts.sh
source ~/.zshrc

# 2. 生成token并自动同步
jwt                 # 或 jwt-gen

# 3. 重启MCP服务器
jwt-restart-mcp     # 或重启Claude Code
```

### 方法二: 直接运行脚本

```bash
# 1. 生成并同步token
./scripts/jwt-with-mcp-sync.sh 7

# 2. 手动同步现有token(如果需要)
./scripts/sync-jwt-to-mcp.sh

# 3. 验证
./scripts/test-jwt-flow.sh
```

### 方法三: 手动配置

```bash
# 1. 生成token
./scripts/gen-jwt.sh admin 168

# 2. 复制token
cat ~/.ai-proj-jwt-token

# 3. 手动编辑MCP配置
vim mcp-task-bridge/.env
# 粘贴token到TASK_API_TOKEN=

# 4. 重启MCP服务器
pkill -f 'mcp-task-bridge'
```

## 🔧 技术实现细节

### Token同步实现

```bash
# 读取token(移除换行和空格)
JWT_TOKEN=$(cat ~/.ai-proj-jwt-token | tr -d '\n' | tr -d ' ')

# 转义特殊字符
ESCAPED_TOKEN=$(echo "$JWT_TOKEN" | sed 's/[\/&]/\\&/g')

# 更新配置文件
sed -i '' "s|^TASK_API_TOKEN=.*|TASK_API_TOKEN=$ESCAPED_TOKEN|" "$MCP_ENV_FILE"
```

### BaseClient Token加载

```javascript
// mcp-task-bridge/base-client.js:66-74
var token = process.env.TASK_API_TOKEN || process.env.API_TOKEN;
if (token && token.trim().length > 0) {
    this.authToken = token.trim();
    this.initializeContextFromToken(this.authToken);
}
```

## ✅ 验证测试

### 测试结果

```bash
$ ./scripts/test-jwt-flow.sh
=== JWT认证流程测试 ===

1. 读取token文件...
Token长度: 313
Token前50字符: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkI...

2. 测试API调用...
{
    "success": true,
    "message": "获取任务列表成功",
    "data": { ...tasks... }
}

3. 检查MCP .env配置...
TASK_API_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

=== 测试完成 ===
```

### API调用成功

```bash
$ source ~/.ai-proj-jwt.env
$ TOKEN=$(cat ~/.ai-proj-jwt-token | tr -d '\n' | tr -d ' ')
$ curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/v1/tasks?page=1&limit=2
{"success":true,"message":"获取任务列表成功","data":{...}}
```

## 📚 相关文档

- **JWT工具快速参考**: `scripts/JWT-QUICK-REFERENCE.md`
- **JWT工具完整指南**: `backend/docs/dev-plans/本地JWT签名工具配置完成.md`
- **Token文件位置**:
  - `~/.ai-proj-jwt-token` - 纯token
  - `~/.ai-proj-jwt.env` - 环境变量格式
  - `mcp-task-bridge/.env` - MCP服务器配置

## 🎯 最佳实践

1. **定期刷新Token**: 建议每周运行`jwt`命令刷新token
2. **Token过期处理**: 如遇认证失败,首先运行`jwt`重新生成
3. **MCP重启**: Token更新后记得重启MCP服务器(`jwt-restart-mcp`)
4. **安全提示**: Token具有admin权限,请妥善保管

## 📊 影响范围

- ✅ MCP服务器可正常认证
- ✅ 所有MCP工具(create_task, list_tasks等)恢复正常
- ✅ 自动化流程简化,减少手动操作
- ✅ Token过期时能快速刷新

## 🚀 后续优化建议

1. **Token自动刷新**: 可以添加cron job定期刷新token
2. **Token过期提醒**: 在token快过期时发送提醒
3. **环境隔离**: 为不同环境(dev/staging/prod)使用不同token
4. **MCP自动重启**: token更新后自动重启MCP服务器

---

**修复日期**: 2025-11-14
**修复人**: Claude Code
**状态**: ✅ 已完成并测试通过
