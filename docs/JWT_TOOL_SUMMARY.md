# JWT本地签名工具 - 快速参考

## 🎯 目标

避免每次都调用MCP的`dev_quick_login`,在本地使用私钥快速生成有效的JWT token。

## 🚀 快速使用

### 一键生成

```bash
./scripts/gen-jwt.sh admin 168
```

### 使用Token

```bash
# 加载环境变量
source ~/.ai-proj-jwt.env

# 使用token访问API
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/v1/tasks
```

## 📦 组件

| 组件 | 说明 |
|------|------|
| `scripts/jwt-gen-tool.go` | JWT生成器源代码 (Go) |
| `scripts/jwt-gen-tool` | 编译后的二进制文件 |
| `scripts/gen-jwt.sh` | Shell包装脚本 |
| `scripts/setup-jwt-alias.sh` | 别名配置 |
| `~/.ai-proj-jwt-token` | Token文件 (自动生成) |
| `~/.ai-proj-jwt.env` | 环境变量文件 (自动生成) |

## ✨ 功能特性

- ✅ **本地生成**: 无需网络调用,快速生成
- ✅ **自动查询**: 从数据库自动获取用户信息
- ✅ **灵活配置**: 自定义用户和有效期
- ✅ **安全存储**: Token文件权限受保护 (600)
- ✅ **验证功能**: 自动验证token有效性
- ✅ **环境变量**: 自动生成环境变量文件

## 🔧 常用命令

```bash
# 生成token (admin用户, 7天有效期)
./scripts/gen-jwt.sh admin 168

# 生成其他用户的token
./scripts/gen-jwt.sh weier 24

# 加载环境变量
source ~/.ai-proj-jwt.env

# 刷新token
./scripts/gen-jwt.sh admin 168 && source ~/.ai-proj-jwt.env
```

## 🎨 可选: 设置别名

```bash
# 配置别名
source scripts/setup-jwt-alias.sh

# 使用别名
gen-jwt admin 168    # 生成token
load-jwt             # 加载环境变量
show-jwt             # 显示token信息
test-jwt             # 测试token
```

## 📝 Token格式

生成的JWT包含:

```json
{
  "user_id": 1,
  "username": "admin",
  "role": "admin",
  "user_type": "system",
  "sub": "admin",
  "exp": 1763649933,
  "iat": 1763045133,
  "nbf": 1763045133,
  "jti": "unique-id"
}
```

## 🔐 安全说明

- ⚠️  仅用于开发环境
- ⚠️  不要提交token文件到版本控制
- ⚠️  定期刷新token
- ⚠️  保护JWT_SECRET密钥

## 📚 相关文档

- [详细使用指南](./LOCAL_JWT_GENERATION.md)
- [脚本README](../scripts/README_JWT.md)
- [后端JWT工具](../backend/utils/jwt.go)

## 🐛 故障排除

### 数据库连接失败
```bash
./scripts/tunnel.sh start
```

### 编译失败
```bash
cd scripts
go build -o jwt-gen-tool jwt-gen-tool.go
```

### Token验证失败
检查JWT_SECRET是否一致:
```bash
grep JWT_SECRET backend/.env
```

## 🎉 示例

```bash
# 1. 生成token
$ ./scripts/gen-jwt.sh admin 168
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
  过期时间: 2025-11-20T22:46:18+08:00

# 2. 使用token
$ source ~/.ai-proj-jwt.env
$ curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/tasks?page=1&page_size=1 | jq .

{
  "success": true,
  "data": { ... }
}
```

## 📅 更新日志

- **2025-11-13**: 初始版本
  - 支持HS256签名算法
  - 自动用户信息查询
  - Token验证功能
  - 别名配置支持
