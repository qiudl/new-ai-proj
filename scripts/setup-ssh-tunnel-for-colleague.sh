#!/bin/bash

# ============================================
# SSH隧道配置脚本 - 为同事配置MCP远程访问
# ============================================
# 用途: 在生产服务器上为同事创建SSH访问账号和JWT token
# 作者: AI Project Team
# 日期: 2025-11-10
# ============================================

set -e

# 配置变量
COLLEAGUE_NAME="${1:-guoym}"
SERVER_HOST="152.136.104.251"
SERVER_USER="ubuntu"
BACKEND_PORT="8080"
LOCAL_FORWARD_PORT="18080"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  为 ${COLLEAGUE_NAME} 配置 SSH 隧道访问${NC}"
echo -e "${BLUE}================================================${NC}"

# 步骤1: 检查SSH密钥
echo -e "\n${YELLOW}步骤1: 检查SSH密钥${NC}"
echo "请提供 ${COLLEAGUE_NAME} 的SSH公钥文件路径:"
echo "（例如: ~/Downloads/guoym_id_rsa.pub）"
read -r PUB_KEY_PATH

if [ ! -f "$PUB_KEY_PATH" ]; then
    echo -e "${RED}错误: 公钥文件不存在: $PUB_KEY_PATH${NC}"
    exit 1
fi

echo -e "${GREEN}✓ 找到公钥文件${NC}"

# 步骤2: 在服务器上创建用户
echo -e "\n${YELLOW}步骤2: 在服务器上创建用户账号${NC}"
cat > /tmp/setup_colleague_user.sh << 'REMOTE_SCRIPT'
#!/bin/bash
COLLEAGUE_NAME="$1"
PUB_KEY_CONTENT="$2"

# 检查用户是否已存在
if id "$COLLEAGUE_NAME" &>/dev/null; then
    echo "用户 $COLLEAGUE_NAME 已存在，跳过创建"
else
    # 创建用户（无密码登录，仅SSH密钥）
    sudo adduser --disabled-password --gecos "" "$COLLEAGUE_NAME"
    echo "✓ 用户 $COLLEAGUE_NAME 创建成功"
fi

# 配置SSH密钥
sudo mkdir -p /home/$COLLEAGUE_NAME/.ssh
echo "$PUB_KEY_CONTENT" | sudo tee /home/$COLLEAGUE_NAME/.ssh/authorized_keys > /dev/null
sudo chmod 700 /home/$COLLEAGUE_NAME/.ssh
sudo chmod 600 /home/$COLLEAGUE_NAME/.ssh/authorized_keys
sudo chown -R $COLLEAGUE_NAME:$COLLEAGUE_NAME /home/$COLLEAGUE_NAME/.ssh

echo "✓ SSH密钥配置完成"

# 配置SSH访问限制（仅允许端口转发）
cat << 'EOF' | sudo tee -a /home/$COLLEAGUE_NAME/.ssh/authorized_keys > /dev/null
# 限制: 仅允许端口转发，不允许执行命令
no-pty,permitopen="localhost:8080"
EOF

echo "✓ SSH访问限制配置完成"
REMOTE_SCRIPT

# 读取公钥内容
PUB_KEY_CONTENT=$(cat "$PUB_KEY_PATH")

# 上传并执行脚本
echo "正在连接服务器..."
ssh $SERVER_USER@$SERVER_HOST "bash -s" -- "$COLLEAGUE_NAME" "$PUB_KEY_CONTENT" < /tmp/setup_colleague_user.sh

echo -e "${GREEN}✓ 服务器用户配置完成${NC}"

# 步骤3: 生成JWT token
echo -e "\n${YELLOW}步骤3: 为 ${COLLEAGUE_NAME} 生成JWT token${NC}"

# 先检查guoym用户是否存在于数据库
echo "检查数据库中的用户..."
COLLEAGUE_USER_ID=$(ssh $SERVER_USER@$SERVER_HOST "PGPASSWORD='SecureAI2024!@#\$%^' psql -h localhost -U ai_prod_user -d ai_project_prod -p 5433 -t -c \"SELECT id FROM users WHERE username = '$COLLEAGUE_NAME' LIMIT 1;\" | xargs")

if [ -z "$COLLEAGUE_USER_ID" ]; then
    echo -e "${YELLOW}用户 ${COLLEAGUE_NAME} 不存在于数据库，将创建新用户${NC}"

    # 生成随机密码
    RANDOM_PASSWORD=$(openssl rand -base64 12)

    # 创建用户（通过SSH远程执行）
    ssh $SERVER_USER@$SERVER_HOST << EOSSH
PGPASSWORD='SecureAI2024!@#\$%^' psql -h localhost -U ai_prod_user -d ai_project_prod -p 5433 << 'EOSQL'
INSERT INTO users (username, password, email, user_type, role, created_at, updated_at)
VALUES ('${COLLEAGUE_NAME}', crypt('${RANDOM_PASSWORD}', gen_salt('bf')), '${COLLEAGUE_NAME}@company.com', 'system', 'admin', NOW(), NOW())
RETURNING id;
EOSQL
EOSSH

    echo -e "${GREEN}✓ 用户创建成功，密码: ${RANDOM_PASSWORD}${NC}"
    echo -e "${YELLOW}请将密码安全地告知 ${COLLEAGUE_NAME}${NC}"
fi

# 通过API获取token
echo "正在生成JWT token..."
TOKEN_RESPONSE=$(ssh $SERVER_USER@$SERVER_HOST "curl -s -X POST 'http://localhost:8080/api/v1/auth/dev-login' -H 'Content-Type: application/json' -d '{\"username\":\"${COLLEAGUE_NAME}\"}'")

TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo -e "${RED}错误: 无法生成JWT token${NC}"
    echo "响应: $TOKEN_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✓ JWT token 生成成功${NC}"

# 步骤4: 生成客户端配置文件
echo -e "\n${YELLOW}步骤4: 生成客户端配置文件${NC}"

# 创建输出目录
OUTPUT_DIR="/tmp/mcp-config-${COLLEAGUE_NAME}"
mkdir -p "$OUTPUT_DIR"

# 生成SSH配置
cat > "$OUTPUT_DIR/ssh-config.txt" << EOF
# ============================================
# SSH隧道配置 - ${COLLEAGUE_NAME}
# ============================================
# 将以下内容添加到你的 ~/.ssh/config 文件中

Host ai-proj-mcp
    HostName ${SERVER_HOST}
    User ${COLLEAGUE_NAME}
    LocalForward ${LOCAL_FORWARD_PORT} localhost:${BACKEND_PORT}
    ServerAliveInterval 60
    ServerAliveCountMax 3

# 使用方法:
# 1. 将此配置添加到 ~/.ssh/config
# 2. 运行: ssh ai-proj-mcp
# 3. 保持SSH连接，在另一个终端使用MCP
EOF

# 生成MCP配置
cat > "$OUTPUT_DIR/mcp-settings.json" << EOF
{
  "mcpServers": {
    "ai-proj-remote": {
      "command": "node",
      "args": [
        "/path/to/mcp-task-bridge/build/index.js"
      ],
      "env": {
        "API_BASE_URL": "http://localhost:${LOCAL_FORWARD_PORT}",
        "API_TOKEN": "${TOKEN}",
        "PROJECT_ID": "39"
      }
    }
  }
}
EOF

# 生成使用说明
cat > "$OUTPUT_DIR/README.md" << 'EOF'
# AI Project MCP 远程访问配置指南

## 概述
通过SSH隧道安全访问远程AI Project MCP服务。

## 配置步骤

### 1. 配置SSH隧道

将 `ssh-config.txt` 中的内容添加到你的 `~/.ssh/config` 文件中：

```bash
cat ssh-config.txt >> ~/.ssh/config
```

### 2. 启动SSH隧道

在终端中运行：
```bash
ssh ai-proj-mcp
```

**保持此终端窗口打开**，SSH隧道会在后台将本地18080端口转发到远程服务器的8080端口。

### 3. 配置Claude Code MCP

#### 方法A: 使用已有的mcp-task-bridge
1. 确保你已经克隆了项目仓库
2. 构建mcp-task-bridge:
   ```bash
   cd /path/to/mcp-task-bridge
   npm install
   npm run build
   ```
3. 将 `mcp-settings.json` 中的配置添加到你的 Claude Code MCP配置中
4. **重要**: 修改配置中的 `/path/to/mcp-task-bridge/build/index.js` 为实际路径

#### 方法B: 使用独立配置
如果mcp-task-bridge在其他位置，直接配置：
```json
{
  "mcpServers": {
    "ai-proj-remote": {
      "command": "node",
      "args": ["<实际路径>/mcp-task-bridge/build/index.js"],
      "env": {
        "API_BASE_URL": "http://localhost:18080",
        "API_TOKEN": "<见mcp-settings.json>",
        "PROJECT_ID": "39"
      }
    }
  }
}
```

### 4. 测试连接

启动Claude Code后，尝试执行MCP命令：
```
list_tasks
```

如果成功返回任务列表，说明配置正确。

## 故障排除

### 问题1: SSH连接失败
```bash
# 检查SSH密钥权限
chmod 600 ~/.ssh/id_rsa
chmod 644 ~/.ssh/id_rsa.pub

# 测试SSH连接
ssh -v ai-proj-mcp
```

### 问题2: 端口转发无法工作
```bash
# 检查端口是否被占用
lsof -i :18080

# 如果被占用，可以更改端口
# 修改 ~/.ssh/config 中的 LocalForward 为其他端口
```

### 问题3: MCP连接失败
1. 确认SSH隧道正在运行
2. 测试API连接:
   ```bash
   curl http://localhost:18080/api/v1/health
   ```
3. 检查JWT token是否过期（默认24小时）

### 问题4: JWT token过期
联系管理员重新生成token，或使用开发环境的dev-login接口刷新。

## 安全注意事项

1. **保护JWT token**: 不要分享或提交到版本控制
2. **SSH密钥安全**:
   - 使用密码保护的SSH密钥
   - 不要分享私钥
3. **及时关闭**: 不使用时关闭SSH连接
4. **定期更新**: 定期更换JWT token

## 常用命令

```bash
# 启动隧道（后台运行）
ssh -f -N ai-proj-mcp

# 查看SSH隧道状态
ps aux | grep "ssh.*ai-proj-mcp"

# 关闭隧道
pkill -f "ssh.*ai-proj-mcp"

# 测试API连接
curl -H "Authorization: Bearer <TOKEN>" http://localhost:18080/api/v1/tasks?page=1&page_size=5
```

## 支持

遇到问题？联系项目管理员或查看项目文档。
EOF

echo -e "${GREEN}✓ 配置文件生成完成${NC}"

# 步骤5: 生成一键配置脚本（可选）
cat > "$OUTPUT_DIR/auto-setup.sh" << 'EOF'
#!/bin/bash
# 自动配置脚本

set -e

echo "开始自动配置..."

# 1. 添加SSH配置
if ! grep -q "Host ai-proj-mcp" ~/.ssh/config 2>/dev/null; then
    cat ssh-config.txt >> ~/.ssh/config
    echo "✓ SSH配置已添加"
else
    echo "⚠ SSH配置已存在，跳过"
fi

# 2. 测试SSH连接
echo "测试SSH连接..."
ssh -o ConnectTimeout=5 ai-proj-mcp exit 2>/dev/null && echo "✓ SSH连接成功" || echo "✗ SSH连接失败，请检查密钥配置"

echo ""
echo "配置完成！"
echo ""
echo "下一步:"
echo "1. 运行: ssh ai-proj-mcp"
echo "2. 保持SSH连接"
echo "3. 在Claude Code中配置MCP（参考 mcp-settings.json）"
EOF

chmod +x "$OUTPUT_DIR/auto-setup.sh"

# 步骤6: 打包配置文件
echo -e "\n${YELLOW}步骤6: 打包配置文件${NC}"
cd /tmp
tar czf "mcp-config-${COLLEAGUE_NAME}.tar.gz" "mcp-config-${COLLEAGUE_NAME}/"
echo -e "${GREEN}✓ 配置包已生成: /tmp/mcp-config-${COLLEAGUE_NAME}.tar.gz${NC}"

# 生成摘要报告
echo -e "\n${BLUE}================================================${NC}"
echo -e "${BLUE}  配置完成摘要${NC}"
echo -e "${BLUE}================================================${NC}"
echo -e "同事姓名: ${GREEN}${COLLEAGUE_NAME}${NC}"
echo -e "服务器: ${GREEN}${SERVER_HOST}${NC}"
echo -e "SSH用户: ${GREEN}${COLLEAGUE_NAME}${NC}"
echo -e "本地端口: ${GREEN}${LOCAL_FORWARD_PORT}${NC}"
echo -e "JWT Token: ${GREEN}已生成${NC}"
echo -e "配置包: ${GREEN}/tmp/mcp-config-${COLLEAGUE_NAME}.tar.gz${NC}"
echo -e "\n${YELLOW}下一步操作:${NC}"
echo "1. 将配置包发送给 ${COLLEAGUE_NAME}:"
echo -e "   ${BLUE}scp /tmp/mcp-config-${COLLEAGUE_NAME}.tar.gz ${COLLEAGUE_NAME}@his-machine:~/${NC}"
echo "2. ${COLLEAGUE_NAME} 解压并按照 README.md 配置"
echo "3. 测试连接"
echo -e "\n${GREEN}配置完成！${NC}"
