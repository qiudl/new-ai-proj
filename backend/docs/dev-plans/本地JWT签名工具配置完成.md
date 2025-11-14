# 本地JWT签名工具配置完成总结

## 📝 任务概述

为AI Project创建本地JWT签名工具，替代每次调用MCP `dev_quick_login`进行认证的方式。

**完成时间**: 2025-11-13
**状态**: ✅ 已完成

---

## ✅ 已完成的工作

### 1. 发现并测试现有工具

项目中已存在完善的JWT生成工具：
- **脚本**: `scripts/gen-jwt.sh`
- **Go工具**: `scripts/jwt-gen-tool.go`
- **功能**:
  - 从数据库自动查询用户信息
  - 使用项目JWT_SECRET本地签名
  - 自动验证token有效性
  - 保存到环境变量文件

### 2. 创建详细使用文档

**文档位置**: `scripts/README_JWT_LOCAL.md`

包含内容：
- ✅ 快速开始指南
- ✅ 使用示例（API调用、MCP集成）
- ✅ 多用户token生成
- ✅ 常见问题解答
- ✅ 技术细节说明
- ✅ 最佳实践
- ✅ 故障排除指南

### 3. 创建快捷别名系统

**脚本**: `scripts/setup-jwt-shortcuts.sh`

添加的快捷命令：
```bash
jwt              # 生成7天token并加载（最常用）
jwt-gen          # 生成7天token
jwt-gen-1d       # 生成1天token
jwt-gen-7d       # 生成7天token
jwt-load         # 加载token到环境变量
jwt-show         # 显示token
jwt-info         # 查看token信息
jwt-copy         # 复制token到剪贴板
jwt-test         # 测试token有效性
jwt-help         # 显示帮助信息
```

---

## 🚀 使用方法

### 快速开始（推荐）

```bash
# 1. 首次设置：运行快捷命令配置脚本
./scripts/setup-jwt-shortcuts.sh

# 2. 重新加载shell配置
source ~/.zshrc

# 3. 生成并加载token（一条命令搞定）
jwt

# 4. 使用token调用API
curl -H "Authorization: Bearer $TOKEN" "http://localhost:8080/api/v1/tasks?page=1&page_size=5"
```

### 传统方式

```bash
# 生成token
./scripts/gen-jwt.sh admin 24

# 加载环境变量
source ~/.ai-proj-jwt.env

# 使用token
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/v1/...
```

---

## 📊 对比：本地签名 vs MCP认证

| 特性 | 本地JWT签名 | MCP dev_quick_login |
|------|------------|---------------------|
| **速度** | ⚡ 快（本地签名） | 🐢 慢（需API调用） |
| **依赖** | 数据库连接 | 后端服务运行 |
| **灵活性** | 可自定义过期时间 | 固定24小时 |
| **使用场景** | 命令行、脚本、批量操作 | Claude Code MCP工具 |
| **一次性设置** | ✅ 7天有效 | ❌ 每次24小时 |

**推荐使用本地JWT签名工具的场景：**
- ✅ 日常开发和测试
- ✅ 批量操作（如数据导入）
- ✅ 脚本自动化
- ✅ 长时间开发会话

---

## 🎯 实际测试结果

### 测试1: 生成admin用户24小时token

```bash
$ ./scripts/gen-jwt.sh admin 24

🔐 本地JWT生成工具
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 查询用户信息...
✓ 用户: admin (ID: 1, 角色: admin)
🔑 生成JWT token...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ JWT Token 生成成功!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Token信息:
  用户: admin (ID: 1)
  角色: admin
  类型: system
  过期时间: 2025-11-14T22:59:35+08:00

💾 已保存到:
  • /Users/johnqiu/.ai-proj-jwt-token
  • /Users/johnqiu/.ai-proj-jwt.env
```

### 测试2: 使用token调用API

```bash
$ TOKEN=$(cat ~/.ai-proj-jwt-token)
$ curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/v1/tasks?page=1&page_size=3&project_id=39"

{
  "success": true,
  "message": "获取任务列表成功",
  "data": {
    "data": [
      {
        "id": 3647,
        "title": "测试MCP需求管理工具的完整功能",
        "status": "todo",
        ...
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 3,
      "total": 66
    }
  }
}
```

**结果**: ✅ Token正常工作

---

## 📦 相关文件

### 核心文件
- `scripts/gen-jwt.sh` - JWT生成主脚本
- `scripts/jwt-gen-tool.go` - Go JWT签名工具
- `scripts/jwt-gen-tool` - 编译后的二进制文件（自动生成）

### 文档文件
- `scripts/README_JWT_LOCAL.md` - 详细使用文档
- `scripts/setup-jwt-shortcuts.sh` - 快捷命令设置脚本
- `backend/docs/dev-plans/本地JWT签名工具配置完成.md` - 本文档

### Token保存位置
- `~/.ai-proj-jwt-token` - Token文件（权限600）
- `~/.ai-proj-jwt.env` - 环境变量文件（权限600）

---

## 🔧 技术实现

### JWT Claims结构

```json
{
  "user_id": 1,
  "username": "admin",
  "role": "admin",
  "user_type": "system",
  "sub": "admin",
  "exp": 1731648000,
  "nbf": 1731561600,
  "iat": 1731561600,
  "jti": "random-hex-string"
}
```

### 签名算法
- **算法**: HS256 (HMAC SHA-256)
- **密钥来源**: `JWT_SECRET` 环境变量
- **实现**: Go标准库 `github.com/golang-jwt/jwt/v5`

### 用户信息查询

```sql
SELECT id, username, COALESCE(role, 'user'), COALESCE(user_type, 'system')
FROM users
WHERE username = '$TARGET_USERNAME' AND deleted_at IS NULL
LIMIT 1;
```

---

## 💡 最佳实践

### 1. 日常开发
```bash
# 每周一次生成7天token
jwt-gen-7d && jwt-load
```

### 2. 脚本使用
```bash
#!/bin/bash
# 自动加载token
source ~/.ai-proj-jwt.env

# 使用token
curl -H "Authorization: Bearer $TOKEN" ...
```

### 3. Claude Code集成
```bash
# 生成长期token
jwt-gen-7d

# 复制token
jwt-copy

# 在Claude Code中更新Bash工具预授权：
# Bash(TOKEN="<粘贴的token>":*)
```

---

## ⚠️ 安全注意事项

1. **Token文件权限**: 自动设置为600（仅用户可读写）
2. **不要提交到Git**: token文件已在`.gitignore`中
3. **定期刷新**: 建议每周刷新一次
4. **生产环境**: 使用更短的过期时间（1-24小时）

---

## 🎉 成果总结

### 解决的问题
- ✅ 避免频繁调用MCP认证API
- ✅ 提高开发效率（从每次10秒降至一次性设置）
- ✅ 支持长期有效token（最长7天）
- ✅ 提供便捷的命令行工具

### 带来的好处
- 🚀 **效率提升**: 一次生成，7天有效
- 💻 **开发体验**: 简单的命令行工具
- 🔧 **灵活性**: 可自定义用户和过期时间
- 📚 **文档完善**: 详细的使用指南

### 适用人员
- 后端开发人员
- API测试人员
- 数据运维人员
- 所有需要频繁调用API的开发者

---

## 📞 后续支持

### 常见问题排查

**问题1: 脚本报错"用户不存在"**
```bash
# 检查数据库连接
brew services list | grep postgresql

# 检查SSH隧道（远程数据库）
ps aux | grep ssh | grep 5433

# 重新建立隧道
./scripts/tunnel.sh
```

**问题2: Token无效**
```bash
# 验证token
jwt-test

# 重新生成
jwt-gen && jwt-load
```

**问题3: Go编译失败**
```bash
cd /Users/johnqiu/coding/www/projects/new-ai-proj/scripts
rm -f jwt-gen-tool
go mod tidy
go build -o jwt-gen-tool jwt-gen-tool.go
```

---

## 📈 下一步改进建议

1. **自动刷新**: 添加cron任务自动刷新过期token
2. **多环境支持**: 区分开发、测试、生产环境的token
3. **Web界面**: 提供简单的Web UI管理token
4. **Token轮换**: 实现自动token轮换机制

---

**文档版本**: 1.0
**创建日期**: 2025-11-13
**维护者**: AI Project Team
**相关任务**: 本地JWT签名工具配置
