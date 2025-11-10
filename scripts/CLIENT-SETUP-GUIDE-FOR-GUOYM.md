# MCP远程访问配置指南 - for guoym

> 本文档由管理员提供给你，帮助你配置远程访问AI Project的MCP服务

## 📦 你收到的配置包

解压后应该包含：
- `01-ssh-config.txt` - SSH隧道配置
- `02-mcp-settings.json` - Claude Code MCP配置
- `README.md` - 详细说明
- `00-INITIAL-PASSWORD.txt` - 初始密码（如果是新账号）

## 🚀 快速开始（10分钟配置）

### 步骤1: 配置SSH隧道 (2分钟)

1. 打开终端，编辑SSH配置文件：
```bash
nano ~/.ssh/config
```

2. 将 `01-ssh-config.txt` 的内容复制粘贴到文件末尾

3. 保存并退出（Ctrl+X, Y, Enter）

### 步骤2: 测试SSH连接 (3分钟)

```bash
# 启动SSH隧道
ssh ai-proj-mcp
```

**期望结果**:
- 成功连接到服务器
- 看到服务器提示符（如 `ubuntu@server:~$`）
- **保持这个终端窗口打开**

如果遇到问题，跳到"故障排除"部分。

### 步骤3: 配置Claude Code MCP (5分钟)

1. 确保你有mcp-task-bridge代码：
```bash
# 如果没有，联系管理员获取
cd ~/projects  # 或你的项目目录
git clone <mcp-task-bridge-repo>
cd mcp-task-bridge
npm install
npm run build
```

2. 找到Claude Code的MCP配置文件位置：
   - **MacOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Linux**: `~/.config/claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

3. 打开配置文件，添加 `02-mcp-settings.json` 中的配置

4. **重要**: 修改配置中的路径：
```json
{
  "mcpServers": {
    "ai-proj-remote": {
      "command": "node",
      "args": [
        "/Users/guoym/projects/mcp-task-bridge/build/index.js"  // 改为你的实际路径
      ],
      "env": {
        "API_BASE_URL": "http://localhost:18080",
        "API_TOKEN": "eyJ...",  // 保持不变
        "PROJECT_ID": "39"       // 保持不变
      }
    }
  }
}
```

5. 重启Claude Code

### 步骤4: 测试MCP连接 (1分钟)

在Claude Code中输入：
```
list_tasks
```

**期望结果**: 看到任务列表

🎉 **恭喜！配置成功！**

## 📖 日常使用

### 每次使用前

1. 打开终端，启动SSH隧道：
```bash
ssh ai-proj-mcp
```

2. **保持终端打开**

3. 使用Claude Code的MCP功能

### 使用完毕后

关闭SSH隧道终端即可。

### 后台运行（可选）

如果不想保持终端打开：
```bash
# 后台启动隧道
ssh -f -N ai-proj-mcp

# 查看是否运行
ps aux | grep "ssh.*ai-proj-mcp"

# 停止隧道
pkill -f "ssh.*ai-proj-mcp"
```

## 🔧 故障排除

### 问题1: SSH连接失败

**症状**: `Permission denied` 或 `Connection refused`

**解决**:
```bash
# 1. 检查私钥权限
chmod 600 ~/.ssh/id_rsa
chmod 644 ~/.ssh/id_rsa.pub

# 2. 详细日志查看问题
ssh -v ai-proj-mcp

# 3. 确认使用正确的私钥
# 如果你的私钥不是默认的 id_rsa，需要在SSH配置中指定：
# 编辑 ~/.ssh/config，在 ai-proj-mcp 配置中添加：
# IdentityFile ~/.ssh/your_key_name
```

### 问题2: 端口18080被占用

**症状**: `bind: Address already in use`

**解决**:
```bash
# 方法1: 查看占用端口的进程并终止
lsof -i :18080
kill <PID>

# 方法2: 更换端口
# 编辑 ~/.ssh/config，修改：
# LocalForward 18081 localhost:8080  # 改为18081

# 同时修改MCP配置中的 API_BASE_URL:
# "API_BASE_URL": "http://localhost:18081"
```

### 问题3: MCP无法连接API

**症状**: Claude Code提示MCP错误或无响应

**诊断步骤**:
```bash
# 1. 确认SSH隧道正在运行
ps aux | grep "ssh.*ai-proj-mcp"
# 应该看到ssh进程

# 2. 测试本地端口是否可访问
curl http://localhost:18080/api/v1/health
# 应该返回: {"status":"ok"}

# 3. 测试API认证
curl -H "Authorization: Bearer <你的TOKEN>" \
  http://localhost:18080/api/v1/tasks?page=1&page_size=5
# 应该返回任务列表

# 4. 检查mcp-task-bridge是否正确构建
cd ~/projects/mcp-task-bridge
npm run build
ls -la build/index.js  # 应该存在
```

### 问题4: JWT Token过期

**症状**: API返回 401 Unauthorized

**解决**: 联系管理员重新生成token，或自行刷新：
```bash
# 通过SSH连接到服务器
ssh ai-proj-mcp

# 生成新token
curl -s -X POST 'http://localhost:8080/api/v1/auth/dev-login' \
  -H 'Content-Type: application/json' \
  -d '{"username":"guoym"}' | grep -o '"token":"[^"]*"'

# 复制新token，更新Claude Code的MCP配置
```

### 问题5: Claude Code找不到MCP服务

**解决**:
```bash
# 1. 验证mcp-task-bridge路径
node /path/to/mcp-task-bridge/build/index.js
# 如果报错 "Cannot find module"，说明路径不对

# 2. 检查Claude Code配置文件格式
# 确保是有效的JSON，可以用工具验证：
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json | python -m json.tool

# 3. 重启Claude Code
# 完全退出（Cmd+Q）后重新打开
```

## 💡 高级技巧

### 自动启动SSH隧道

创建启动脚本 `~/start-mcp-tunnel.sh`:
```bash
#!/bin/bash
# 检查隧道是否已运行
if ! ps aux | grep -q "[s]sh.*ai-proj-mcp"; then
    echo "启动SSH隧道..."
    ssh -f -N ai-proj-mcp
    echo "✓ SSH隧道已启动"
else
    echo "SSH隧道已在运行"
fi
```

添加执行权限：
```bash
chmod +x ~/start-mcp-tunnel.sh
```

使用：
```bash
~/start-mcp-tunnel.sh
```

### 快速检查连接状态

创建检查脚本 `~/check-mcp-status.sh`:
```bash
#!/bin/bash
echo "检查SSH隧道..."
if ps aux | grep -q "[s]sh.*ai-proj-mcp"; then
    echo "✓ SSH隧道运行中"
else
    echo "✗ SSH隧道未运行"
fi

echo "检查API连接..."
if curl -s http://localhost:18080/api/v1/health | grep -q "ok"; then
    echo "✓ API可访问"
else
    echo "✗ API无法访问"
fi
```

### 配置别名（快捷命令）

在 `~/.zshrc` 或 `~/.bashrc` 中添加：
```bash
# MCP隧道管理
alias mcp-start='ssh -f -N ai-proj-mcp'
alias mcp-stop='pkill -f "ssh.*ai-proj-mcp"'
alias mcp-status='ps aux | grep "[s]sh.*ai-proj-mcp"'
alias mcp-test='curl http://localhost:18080/api/v1/health'
```

然后：
```bash
source ~/.zshrc  # 或 source ~/.bashrc
```

使用：
```bash
mcp-start   # 启动隧道
mcp-status  # 查看状态
mcp-test    # 测试连接
mcp-stop    # 停止隧道
```

## 🔒 安全提醒

1. **保护JWT Token**:
   - 不要分享给他人
   - 不要提交到git仓库
   - Token有效期24小时

2. **保护SSH私钥**:
   - 不要分享私钥文件
   - 设置正确的文件权限（600）
   - 建议使用密码保护的私钥

3. **及时关闭隧道**:
   - 不使用时关闭SSH连接
   - 定期检查是否有僵尸进程

4. **定期更新**:
   - 定期更换JWT token
   - 保持SSH密钥安全

## 📞 获取帮助

如果遇到无法解决的问题：

1. 收集诊断信息：
```bash
# SSH连接日志
ssh -vvv ai-proj-mcp 2>&1 | tee ssh-debug.log

# 系统信息
uname -a
ssh -V
node --version
```

2. 联系管理员，提供：
   - 具体的错误信息
   - ssh-debug.log文件
   - 你的操作系统版本
   - 你执行的步骤

## ✅ 配置检查清单

配置完成后，检查以下项目：

- [ ] SSH配置已添加到 ~/.ssh/config
- [ ] 可以成功执行 `ssh ai-proj-mcp`
- [ ] mcp-task-bridge已构建（build/index.js存在）
- [ ] Claude Code MCP配置已更新
- [ ] MCP配置中的路径正确
- [ ] 可以执行 `curl http://localhost:18080/api/v1/health`
- [ ] Claude Code可以执行 `list_tasks`

全部打勾即配置成功！🎉

---

**配置时间**: 预计10-15分钟
**难度**: ⭐⭐☆☆☆
**需要技能**: 基础终端操作，编辑配置文件

有问题随时联系管理员！
