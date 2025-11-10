#!/bin/bash

# ============================================
# 快速为guoym配置SSH隧道访问
# ============================================

set -e

COLLEAGUE_NAME="guoym"
SERVER_HOST="152.136.104.251"
SERVER_USER="ubuntu"

echo "🚀 为 $COLLEAGUE_NAME 快速配置 MCP 远程访问"
echo ""

# 步骤1: 获取guoym的SSH公钥
echo "📋 步骤1: 请提供 guoym 的SSH公钥"
echo "方式1: 直接粘贴公钥内容（以 ssh-rsa 或 ssh-ed25519 开头）"
echo "方式2: 提供公钥文件路径（例如: ~/Downloads/guoym_id_rsa.pub）"
echo ""
read -r INPUT

if [ -f "$INPUT" ]; then
    # 是文件路径
    PUB_KEY=$(cat "$INPUT")
    echo "✓ 从文件读取公钥"
else
    # 直接输入的公钥
    PUB_KEY="$INPUT"
    echo "✓ 使用输入的公钥"
fi

# 验证公钥格式
if [[ ! "$PUB_KEY" =~ ^(ssh-rsa|ssh-ed25519|ecdsa-sha2-nistp256) ]]; then
    echo "❌ 错误: 公钥格式不正确"
    echo "公钥应该以 ssh-rsa 或 ssh-ed25519 开头"
    exit 1
fi

echo ""
echo "📡 步骤2: 连接服务器并配置"

# 在服务器上执行配置
ssh $SERVER_USER@$SERVER_HOST << EOSSH
set -e

COLLEAGUE_NAME="$COLLEAGUE_NAME"
PUB_KEY="$PUB_KEY"

echo "检查用户 \$COLLEAGUE_NAME..."

# 检查用户是否存在
if id "\$COLLEAGUE_NAME" &>/dev/null; then
    echo "✓ 用户已存在"
else
    echo "创建用户 \$COLLEAGUE_NAME..."
    sudo adduser --disabled-password --gecos "" "\$COLLEAGUE_NAME"
    echo "✓ 用户创建成功"
fi

# 配置SSH
echo "配置SSH密钥..."
sudo mkdir -p /home/\$COLLEAGUE_NAME/.ssh
echo "\$PUB_KEY" | sudo tee /home/\$COLLEAGUE_NAME/.ssh/authorized_keys > /dev/null
sudo chmod 700 /home/\$COLLEAGUE_NAME/.ssh
sudo chmod 600 /home/\$COLLEAGUE_NAME/.ssh/authorized_keys
sudo chown -R \$COLLEAGUE_NAME:\$COLLEAGUE_NAME /home/\$COLLEAGUE_NAME/.ssh
echo "✓ SSH密钥配置完成"

# 检查数据库用户
echo "检查数据库用户..."
USER_EXISTS=\$(PGPASSWORD='SecureAI2024!@#\\\$%^' psql -h localhost -U ai_prod_user -d ai_project_prod -p 5433 -t -c "SELECT COUNT(*) FROM users WHERE username = '\$COLLEAGUE_NAME';" | xargs)

if [ "\$USER_EXISTS" -eq "0" ]; then
    echo "创建数据库用户..."
    RANDOM_PASSWORD=\$(openssl rand -base64 12)
    PGPASSWORD='SecureAI2024!@#\\\$%^' psql -h localhost -U ai_prod_user -d ai_project_prod -p 5433 << 'EOSQL'
INSERT INTO users (username, password, email, user_type, role, created_at, updated_at)
VALUES ('$COLLEAGUE_NAME', crypt('\$RANDOM_PASSWORD', gen_salt('bf')), '${COLLEAGUE_NAME}@company.com', 'system', 'admin', NOW(), NOW());
EOSQL
    echo "✓ 数据库用户创建成功"
    echo "密码: \$RANDOM_PASSWORD" > /tmp/guoym_password.txt
else
    echo "✓ 数据库用户已存在"
fi

# 生成JWT token
echo "生成JWT token..."
TOKEN_RESPONSE=\$(curl -s -X POST 'http://localhost:8080/api/v1/auth/dev-login' -H 'Content-Type: application/json' -d '{"username":"${COLLEAGUE_NAME}"}')
TOKEN=\$(echo "\$TOKEN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "\$TOKEN" ]; then
    echo "❌ JWT token生成失败"
    exit 1
fi

echo "\$TOKEN" > /tmp/guoym_token.txt
echo "✓ JWT token已生成"

echo ""
echo "========================================"
echo "服务器配置完成！"
echo "========================================"
EOSSH

# 从服务器获取生成的token
echo ""
echo "📥 步骤3: 获取配置信息"
TOKEN=$(ssh $SERVER_USER@$SERVER_HOST "cat /tmp/guoym_token.txt 2>/dev/null || echo ''")
PASSWORD=$(ssh $SERVER_USER@$SERVER_HOST "cat /tmp/guoym_password.txt 2>/dev/null || echo ''")

# 清理服务器上的临时文件
ssh $SERVER_USER@$SERVER_HOST "rm -f /tmp/guoym_token.txt /tmp/guoym_password.txt"

if [ -z "$TOKEN" ]; then
    echo "❌ 无法获取JWT token"
    exit 1
fi

# 生成客户端配置
OUTPUT_DIR="/tmp/guoym-mcp-config"
mkdir -p "$OUTPUT_DIR"

# SSH配置
cat > "$OUTPUT_DIR/01-ssh-config.txt" << EOF
# ============================================
# 添加到 ~/.ssh/config
# ============================================

Host ai-proj-mcp
    HostName $SERVER_HOST
    User $COLLEAGUE_NAME
    LocalForward 18080 localhost:8080
    ServerAliveInterval 60
    ServerAliveCountMax 3

# 使用方法:
# ssh ai-proj-mcp
# 保持连接打开
EOF

# MCP配置
cat > "$OUTPUT_DIR/02-mcp-settings.json" << EOF
{
  "mcpServers": {
    "ai-proj-remote": {
      "command": "node",
      "args": [
        "/path/to/mcp-task-bridge/build/index.js"
      ],
      "env": {
        "API_BASE_URL": "http://localhost:18080",
        "API_TOKEN": "$TOKEN",
        "PROJECT_ID": "39"
      }
    }
  }
}
EOF

# 使用说明
cat > "$OUTPUT_DIR/README.md" << 'EOF'
# MCP远程访问配置 - guoym

## 快速开始

### 1. 配置SSH
```bash
cat 01-ssh-config.txt >> ~/.ssh/config
```

### 2. 测试SSH连接
```bash
ssh ai-proj-mcp
```
成功后你会看到服务器提示符，**保持这个终端窗口打开**。

### 3. 配置Claude Code MCP

打开Claude Code的MCP配置文件，添加 `02-mcp-settings.json` 中的内容。

**重要**: 修改 `/path/to/mcp-task-bridge/build/index.js` 为实际路径。

如果没有mcp-task-bridge，联系管理员获取。

### 4. 测试
重启Claude Code，执行:
```
list_tasks
```

## 故障排除

### SSH连接失败
```bash
# 检查私钥权限
chmod 600 ~/.ssh/id_rsa

# 详细连接日志
ssh -v ai-proj-mcp
```

### MCP无法连接
1. 确认SSH隧道运行中
2. 测试端口:
   ```bash
   curl http://localhost:18080/api/v1/health
   ```

### JWT过期
联系管理员重新生成token。

## 后台运行SSH隧道

```bash
# 后台启动
ssh -f -N ai-proj-mcp

# 查看状态
ps aux | grep ssh.*ai-proj-mcp

# 停止
pkill -f ssh.*ai-proj-mcp
```
EOF

# 如果有密码，保存到文件
if [ -n "$PASSWORD" ]; then
    echo "$PASSWORD" > "$OUTPUT_DIR/00-INITIAL-PASSWORD.txt"
    cat >> "$OUTPUT_DIR/README.md" << EOF

## 初始密码

数据库初始密码已保存在 \`00-INITIAL-PASSWORD.txt\`

**请妥善保管，建议首次登录后更改密码。**
EOF
fi

# 打包
cd /tmp
tar czf guoym-mcp-config.tar.gz guoym-mcp-config/

echo ""
echo "✅ 配置完成！"
echo ""
echo "📦 配置包位置: /tmp/guoym-mcp-config.tar.gz"
echo ""
echo "📧 下一步: 将配置包发送给 guoym"
echo ""
echo "发送方式:"
echo "1. 邮件附件"
echo "2. 企业IM（钉钉/企业微信）"
echo "3. scp/sftp 传输"
echo ""
echo "guoym 收到后，解压并按照 README.md 操作即可。"
echo ""
