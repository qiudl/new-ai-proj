# 本地JWT生成工具使用指南

## 概述

为了提高开发效率,避免每次都需要调用MCP的`dev_quick_login`进行认证,我们创建了一个本地JWT签名工具。该工具使用项目的JWT密钥在本地生成有效的JWT token。

## 工具组件

### 1. JWT生成器 (Go)
- 文件: `scripts/jwt-gen-tool.go`
- 功能: 使用HS256算法签名JWT token
- 依赖: `github.com/golang-jwt/jwt/v5`

### 2. Shell脚本包装器
- 文件: `scripts/gen-jwt.sh`
- 功能:
  - 从数据库查询用户信息
  - 调用JWT生成器
  - 保存token到文件
  - 验证token有效性

## 快速开始

### 安装

首次使用需要编译JWT生成器:

```bash
cd /Users/johnqiu/coding/www/projects/new-ai-proj/scripts
go mod tidy
go build -o jwt-gen-tool jwt-gen-tool.go
```

### 生成Token

```bash
# 生成admin用户的token (默认有效期168小时=7天)
./scripts/gen-jwt.sh admin 168

# 生成其他用户的token
./scripts/gen-jwt.sh weier 168
```

### 使用Token

#### 方法1: 加载到环境变量 (推荐)

```bash
# 加载环境变量
source ~/.ai-proj-jwt.env

# 使用token
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/v1/tasks
```

#### 方法2: 从文件读取

```bash
TOKEN=$(cat ~/.ai-proj-jwt-token)
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/v1/tasks
```

#### 方法3: 在Claude Code中使用

Token文件会自动被添加到Claude Code的bash工具允许列表中,可以直接使用:

```bash
TOKEN=$(cat ~/.ai-proj-jwt-token)
# 在Claude Code的bash命令中使用
```

## Token信息

生成的token包含以下信息:

```json
{
  "user_id": 1,
  "username": "admin",
  "role": "admin",
  "user_type": "system",
  "sub": "admin",
  "exp": 1763649933,  // 过期时间戳
  "nbf": 1763045133,  // 生效时间
  "iat": 1763045133,  // 签发时间
  "jti": "unique-id"  // JWT ID
}
```

## 存储位置

- **Token文件**: `~/.ai-proj-jwt-token`
- **环境变量文件**: `~/.ai-proj-jwt.env`

这两个文件都设置了600权限,只有所有者可以读写。

## Token刷新

Token默认有效期为168小时(7天)。当token快过期时,重新运行生成脚本即可:

```bash
./scripts/gen-jwt.sh admin 168
source ~/.ai-proj-jwt.env
```

## 环境变量配置

脚本会自动加载以下环境变量:

- `~/.ai-proj-tunnel.env` - SSH隧道配置
- `backend/.env` - 项目配置

需要的关键变量:

```bash
JWT_SECRET=local_jwt_secret_key_2024  # JWT签名密钥
DB_HOST=127.0.0.1                     # 数据库主机
DB_PORT=5433                          # 数据库端口
DB_USER=ai_prod_user                  # 数据库用户
DB_PASSWORD=SecureAI2024!@#$%^        # 数据库密码
DB_NAME=ai_project_prod               # 数据库名
```

## 优点

1. **无需网络调用**: 完全在本地生成,不依赖后端服务
2. **快速**: 几秒钟内完成token生成
3. **灵活**: 可自定义有效期和用户
4. **安全**: Token文件权限受保护
5. **方便**: 自动保存到环境变量文件

## 故障排除

### 数据库连接失败

确保SSH隧道已启动:

```bash
./scripts/tunnel.sh start
```

### JWT签名密钥不匹配

确保使用的JWT_SECRET与后端配置一致:

```bash
# 查看后端配置
cat backend/.env | grep JWT_SECRET
```

### Token验证失败

检查token内容:

```bash
# 使用jwt.io或其他JWT解析工具
cat ~/.ai-proj-jwt-token | pbcopy
# 粘贴到 https://jwt.io 查看
```

## 安全注意事项

1. ⚠️  **不要提交密钥到版本控制**: JWT_SECRET应保密
2. ⚠️  **定期刷新token**: 虽然有效期较长,但建议定期刷新
3. ⚠️  **保护token文件**: 不要分享token文件给他人
4. ⚠️  **生产环境**: 此工具仅用于开发环境,生产环境应使用正式认证流程

## 高级用法

### 自定义过期时间

```bash
# 生成24小时有效期的token
./scripts/gen-jwt.sh admin 24

# 生成30天有效期的token
./scripts/gen-jwt.sh admin 720
```

### 批量生成多用户token

```bash
for user in admin weier guoym fuxing; do
    ./scripts/gen-jwt.sh $user 168
    mv ~/.ai-proj-jwt.env ~/.ai-proj-jwt-$user.env
done
```

### 在MCP服务器配置中使用

可以在MCP配置文件中直接引用token:

```json
{
  "mcpServers": {
    "ai-proj": {
      "env": {
        "API_TOKEN": "$(cat ~/.ai-proj-jwt-token)"
      }
    }
  }
}
```

## 相关文件

- `scripts/jwt-gen-tool.go` - JWT生成器源代码
- `scripts/gen-jwt.sh` - Shell包装脚本
- `scripts/go.mod` - Go模块依赖
- `backend/utils/jwt.go` - 后端JWT工具 (验证逻辑)
- `backend/.env` - 后端配置 (JWT_SECRET)

## 更新日志

- **2025-11-13**: 初始版本
  - 支持HS256签名算法
  - 自动从数据库查询用户信息
  - Token验证功能
  - 环境变量自动加载
