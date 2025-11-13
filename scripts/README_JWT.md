# JWT本地签名工具

## 概述

本工具允许你在本地生成有效的JWT token,无需每次调用MCP的`dev_quick_login`。使用项目的JWT密钥在本地签名,快速方便。

## 快速开始

### 1. 生成Token

```bash
./scripts/gen-jwt.sh admin 168
```

参数:
- 第一个参数: 用户名 (默认: admin)
- 第二个参数: 有效期(小时) (默认: 168 = 7天)

### 2. 使用Token

#### 方法A: 加载到环境变量

```bash
source ~/.ai-proj-jwt.env
echo $TOKEN
```

#### 方法B: 从文件读取

```bash
TOKEN=$(cat ~/.ai-proj-jwt-token)
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/v1/tasks
```

### 3. 设置别名(可选)

```bash
source scripts/setup-jwt-alias.sh
```

然后就可以使用:
```bash
gen-jwt admin 168    # 生成token
load-jwt             # 加载token
show-jwt             # 显示token信息
test-jwt             # 测试token
```

## 文件说明

| 文件 | 说明 |
|------|------|
| `jwt-gen-tool.go` | Go语言编写的JWT生成器 |
| `jwt-gen-tool` | 编译后的二进制文件 |
| `gen-jwt.sh` | Shell包装脚本 |
| `setup-jwt-alias.sh` | 别名配置脚本 |
| `go.mod` | Go模块依赖 |

## Token存储

生成的token保存在:
- **Token**: `~/.ai-proj-jwt-token` (权限: 600)
- **环境变量**: `~/.ai-proj-jwt.env` (权限: 600)

## 示例

### 生成admin用户的7天token

```bash
./scripts/gen-jwt.sh admin 168
```

### 生成weier用户的24小时token

```bash
./scripts/gen-jwt.sh weier 24
```

### 在API调用中使用

```bash
# 方法1: 加载环境变量
source ~/.ai-proj-jwt.env
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/v1/tasks

# 方法2: 直接读取
curl -H "Authorization: Bearer $(cat ~/.ai-proj-jwt-token)" http://localhost:8080/api/v1/tasks
```

### 验证token内容

```bash
# 解码token (需要jq)
jq -R 'split(".") | .[1] | @base64d | fromjson' ~/.ai-proj-jwt-token

# 输出示例:
# {
#   "user_id": 1,
#   "username": "admin",
#   "role": "admin",
#   "user_type": "system",
#   "exp": 1763649933,
#   "iat": 1763045133,
#   "nbf": 1763045133,
#   "sub": "admin",
#   "jti": "2b39905c8d117a889e04e0921551f0af"
# }
```

## 环境要求

- Go 1.24+ (编译时需要)
- PostgreSQL (查询用户信息)
- jq (JSON处理)
- curl (测试token)

## 环境变量

脚本自动加载以下配置:
- `~/.ai-proj-tunnel.env` - SSH隧道配置
- `backend/.env` - 项目配置

关键变量:
```bash
JWT_SECRET=local_jwt_secret_key_2024
DB_HOST=127.0.0.1
DB_PORT=5433
DB_USER=ai_prod_user
DB_PASSWORD=SecureAI2024!@#$%^
DB_NAME=ai_project_prod
```

## 故障排除

### 编译失败

```bash
cd scripts
rm -f jwt-gen-tool go.mod go.sum
go mod init jwt-gen-tool
go get github.com/golang-jwt/jwt/v5
go build -o jwt-gen-tool jwt-gen-tool.go
```

### 数据库连接失败

确保SSH隧道已启动:
```bash
./scripts/tunnel.sh start
```

### Token验证失败

检查JWT_SECRET是否一致:
```bash
# 查看后端配置
grep JWT_SECRET backend/.env
```

## 安全注意事项

⚠️  **重要**:
1. Token文件包含敏感信息,不要提交到版本控制
2. 不要分享token给他人
3. 定期刷新token
4. 仅在开发环境使用

## 相关文档

- [详细使用指南](../docs/LOCAL_JWT_GENERATION.md)
- [后端JWT工具](../backend/utils/jwt.go)

## 更新日志

### 2025-11-13
- ✅ 初始版本发布
- ✅ 支持HS256签名
- ✅ 自动查询用户信息
- ✅ Token验证功能
- ✅ 别名配置脚本
