# MCP Task Bridge 配置和故障排除

## 📍 正确的配置文件位置

**重要**: MCP 服务器配置位于：
```
~/.config/claude/mcp_servers.json
```

**注意**: 不是 `~/.claude/settings.json`！

## ✅ 正确的配置格式

```json
{
  "mcpServers": {
    "ai-proj": {
      "command": "/Users/johnqiu/.nvm/versions/node/v22.15.0/bin/node",
      "args": [
        "/Users/johnqiu/coding/www/projects/new-ai-proj/mcp-task-bridge/dist/index.js"
      ],
      "env": {
        "NODE_ENV": "development",
        "AUTO_DEV_LOGIN": "true",
        "TASK_API_BASE": "http://localhost:8080/api/v1",
        "DEV_LOGIN_USERNAME": "admin"
      }
    }
  }
}
```

## 🔧 必需的环境变量

| 变量 | 说明 | 值 |
|------|------|-----|
| `NODE_ENV` | 运行环境 | `development` |
| `AUTO_DEV_LOGIN` | 自动开发登录 | `true` |
| `TASK_API_BASE` | 后端API地址 | `http://localhost:8080/api/v1` |
| `DEV_LOGIN_USERNAME` | 开发登录用户 | `admin` |

## 🚀 重启 MCP 服务器

### 方法1: 重启 Claude Code (推荐)
```bash
# macOS
killall "Claude Code"
# 然后重新打开 Claude Code
```

### 方法2: 手动重载 MCP
在 Claude Code 中:
1. 打开命令面板 (Cmd+Shift+P)
2. 搜索 "MCP: Restart Servers"
3. 选择 "ai-proj" 服务器

### 方法3: 命令行验证
```bash
# 1. 检查配置文件
cat ~/.config/claude/mcp_servers.json | python3 -m json.tool

# 2. 手动启动测试
cd /Users/johnqiu/coding/www/projects/new-ai-proj/mcp-task-bridge
node dist/index.js

# 应该看到:
# [LOCK] 进程锁已获取 (PID: xxxxx)
# [MCP] Task MCP Server 已启动
# [MCP] 开发登录成功
```

## 🔍 故障排除

### 问题1: "Not connected"
**原因**: MCP 服务器未启动或配置错误

**解决**:
1. 检查配置文件: `cat ~/.config/claude/mcp_servers.json`
2. 验证 JSON 格式: `python3 -m json.tool < ~/.config/claude/mcp_servers.json`
3. 重启 Claude Code
4. 检查进程: `ps aux | grep mcp-task-bridge`

### 问题2: "网络连接失败"
**原因**: 后端服务未运行或 API 地址错误

**解决**:
1. 检查后端: `curl http://localhost:8080/health`
2. 验证端口: `lsof -i :8080`
3. 启动后端: `cd backend && go run main.go`

### 问题3: 多个 MCP 实例运行
**原因**: 进程锁失败或配置错误

**解决**:
```bash
# 杀掉所有实例
pkill -9 -f "node.*mcp-task-bridge"

# 清理锁文件
rm /tmp/mcp-task-bridge.lock

# 重启 Claude Code
```

### 问题4: "登录失败"
**原因**: Token 过期或后端认证问题

**解决**:
1. 测试开发登录:
```bash
curl -X POST http://localhost:8080/api/v1/auth/dev-quick-login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin"}' | jq '.'
```

2. 检查环境变量:
```bash
cat ~/.config/claude/mcp_servers.json | grep -A 5 '"env"'
```

## ✅ 验证步骤

### 1. 验证配置文件
```bash
cat ~/.config/claude/mcp_servers.json | python3 -m json.tool > /dev/null
echo $?  # 应该输出 0
```

### 2. 验证后端服务
```bash
curl -s http://localhost:8080/health | jq '.status'
# 应该输出: "ok"
```

### 3. 验证 MCP 进程
```bash
ps aux | grep "node.*mcp-task-bridge" | grep -v grep
# 应该看到恰好一个进程
```

### 4. 验证进程锁
```bash
cat /tmp/mcp-task-bridge.lock
ps -p $(cat /tmp/mcp-task-bridge.lock)
# 进程应该存在
```

### 5. 测试 MCP 工具
在 Claude Code 中运行:
```
使用 mcp__ai-proj__list_projects 工具
```

应该返回项目列表，而不是 "Not connected"。

## 🎯 快速修复脚本

```bash
#!/bin/bash
# fix-mcp.sh

echo "🔧 修复 MCP Task Bridge 配置"

# 1. 杀掉所有旧进程
pkill -9 -f "node.*mcp-task-bridge"
rm -f /tmp/mcp-task-bridge.lock

# 2. 验证配置文件
if ! cat ~/.config/claude/mcp_servers.json | python3 -m json.tool > /dev/null 2>&1; then
  echo "❌ 配置文件 JSON 格式错误"
  exit 1
fi

# 3. 检查后端
if ! curl -s http://localhost:8080/health > /dev/null 2>&1; then
  echo "❌ 后端服务未运行"
  exit 1
fi

# 4. 手动测试启动
cd /Users/johnqiu/coding/www/projects/new-ai-proj/mcp-task-bridge
timeout 5 node dist/index.js &
sleep 3

# 5. 验证进程
if ps aux | grep "node.*mcp-task-bridge" | grep -v grep > /dev/null; then
  echo "✅ MCP 服务器启动成功"
  pkill -f "node.*mcp-task-bridge"  # 清理测试进程
  echo "请重启 Claude Code"
else
  echo "❌ MCP 服务器启动失败"
  exit 1
fi
```

## 📝 配置检查清单

- [ ] 配置文件位置正确: `~/.config/claude/mcp_servers.json`
- [ ] JSON 格式有效
- [ ] 包含所有必需的环境变量
- [ ] Node.js 路径正确
- [ ] dist/index.js 文件存在
- [ ] 后端服务运行在 8080 端口
- [ ] 没有多个 MCP 进程运行
- [ ] 进程锁机制正常工作

## 🔗 相关文件

- 配置文件: `~/.config/claude/mcp_servers.json`
- 主程序: `mcp-task-bridge/dist/index.js`
- 进程锁: `/tmp/mcp-task-bridge.lock`
- 环境配置: `mcp-task-bridge/.env`
- 进程锁文档: `PROCESS_LOCK.md`

## 💡 最佳实践

1. **始终使用正确的配置文件** (`~/.config/claude/mcp_servers.json`)
2. **修改配置后重启 Claude Code**
3. **确保只有一个 MCP 实例运行**
4. **定期检查后端服务状态**
5. **遇到问题先查看日志** (stderr 输出)

---

**最后更新**: 2025-10-02
**维护者**: AI Project Team
