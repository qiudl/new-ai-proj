# 🔐 JWT本地签名 - 快速参考

## ⚡ 最常用命令

```bash
# 1. 首次设置（只需一次）
./scripts/setup-jwt-shortcuts.sh && source ~/.zshrc

# 2. 生成并加载token（推荐 - 自动同步MCP）
jwt

# 3. 使用token
curl -H "Authorization: Bearer $TOKEN" "http://localhost:8080/api/v1/..."

# 4. MCP服务器重启（token更新后）
jwt-restart-mcp
```

---

## 📝 快捷命令列表

| 命令 | 说明 | 示例 |
|------|------|------|
| `jwt` | 生成7天token并同步MCP | 最常用 ⭐ |
| `jwt-gen-1d` | 生成1天token并同步MCP | 短期测试 |
| `jwt-load` | 加载已有token | 新终端窗口 |
| `jwt-show` | 显示token | 查看完整token |
| `jwt-copy` | 复制到剪贴板 | Claude Code集成 |
| `jwt-test` | 验证token有效性 | 调试时使用 |
| `jwt-sync` | 手动同步到MCP | MCP配置 🆕 |
| `jwt-restart-mcp` | 重启MCP服务器 | 应用新token 🆕 |

---

## 🎯 常见场景

### 场景1: 每天开始开发
```bash
source ~/.zshrc
jwt-load
# 如果token过期，运行: jwt
```

### 场景2: Claude Code MCP使用
```bash
jwt              # 生成token并自动同步到MCP
jwt-restart-mcp  # 重启MCP服务器应用新token
# MCP接口现已可用
```

### 场景3: API测试
```bash
TOKEN=$(cat ~/.ai-proj-jwt-token)
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/v1/tasks
```

### 场景4: 批量脚本
```bash
source ~/.ai-proj-jwt.env
for id in {1..10}; do
  curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/v1/tasks/$id
done
```

---

## ⚙️ Token位置

| 文件 | 内容 | 用途 |
|------|------|------|
| `~/.ai-proj-jwt-token` | 纯token字符串 | 直接使用 |
| `~/.ai-proj-jwt.env` | 环境变量脚本 | source加载 |
| `mcp-task-bridge/.env` | MCP服务器配置 | MCP认证 🆕 |

---

## 🔧 故障排除

| 问题 | 解决方案 |
|------|---------|
| "用户不存在" | 检查数据库连接：`brew services list \| grep postgresql` |
| "Token无效" | 重新生成：`jwt` |
| "命令未找到" | 重新加载配置：`source ~/.zshrc` |
| "数据库连接失败" | 启动SSH隧道：`./scripts/tunnel.sh` |
| "MCP认证失败" | 同步token：`jwt-sync` 然后 `jwt-restart-mcp` 🆕 |

---

## 📚 详细文档

- **MCP认证修复总结**: `docs/MCP_JWT_AUTH_FIX_SUMMARY.md` 🆕
- **完整使用指南**: `scripts/README_JWT_LOCAL.md`
- **配置总结**: `backend/docs/dev-plans/本地JWT签名工具配置完成.md`

---

**快速帮助**: `jwt-help`
