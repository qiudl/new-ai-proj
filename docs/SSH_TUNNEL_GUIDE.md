# SSH隧道自动管理指南

## 概述

本项目提供了自动化的SSH隧道管理解决方案，用于安全地连接远程PostgreSQL数据库。

## 架构

```
本地开发环境                SSH隧道                    远程服务器
┌─────────────┐         ┌───────────┐            ┌──────────────┐
│ 后端服务     │  连接   │  SSH隧道   │   加密传输  │  PostgreSQL  │
│ :8080       │ ------> │ :15433    │ ---------> │  :5432       │
└─────────────┘         └───────────┘            └──────────────┘
                        localhost                 152.136.104.251
```

## 核心脚本

### 1. SSH隧道管理脚本

**位置**: `scripts/ssh-tunnel-manager.sh`

**功能**:
- ✅ 启动/停止/重启SSH隧道
- ✅ 健康检查和自动重连
- ✅ 状态监控
- ✅ 日志记录

**命令**:

```bash
# 启动隧道
./scripts/ssh-tunnel-manager.sh start

# 查看状态
./scripts/ssh-tunnel-manager.sh status

# 停止隧道
./scripts/ssh-tunnel-manager.sh stop

# 重启隧道
./scripts/ssh-tunnel-manager.sh restart

# 单次健康检查
./scripts/ssh-tunnel-manager.sh check

# 启动持续健康检查（前台）
./scripts/ssh-tunnel-manager.sh health

# 后台运行健康检查
nohup ./scripts/ssh-tunnel-manager.sh health > /dev/null 2>&1 &
```

**环境变量**:

```bash
# 远程主机
export REMOTE_HOST="ubuntu@152.136.104.251"

# 本地端口
export LOCAL_PORT=15433

# 远程端口
export REMOTE_PORT=5432

# 最大重试次数
export MAX_RETRY=3

# 健康检查间隔（秒）
export HEALTH_CHECK_INTERVAL=30
```

**示例 - 自定义配置**:

```bash
# 使用不同的端口
LOCAL_PORT=5433 ./scripts/ssh-tunnel-manager.sh start

# 连接到不同的远程主机
REMOTE_HOST=user@example.com LOCAL_PORT=6543 ./scripts/ssh-tunnel-manager.sh start
```

### 2. 后端启动脚本

**位置**: `backend/start-backend.sh`

**功能**:
- ✅ 自动检查并启动SSH隧道
- ✅ 验证数据库连接
- ✅ 启动后端服务
- ✅ 可选的健康检查守护进程

**命令**:

```bash
# 前台启动（推荐用于开发）
cd backend
./start-backend.sh

# 后台启动
./start-backend.sh --background

# 后台启动 + 启用健康检查守护进程（推荐用于生产）
./start-backend.sh -b -h

# 跳过SSH隧道检查（如果数据库在本地）
./start-backend.sh --skip-tunnel

# 跳过数据库测试
./start-backend.sh --skip-db

# 显示帮助
./start-backend.sh --help
```

**选项**:

- `-b, --background`: 后台运行后端服务
- `-h, --health`: 启用SSH隧道健康检查守护进程
- `-s, --skip-tunnel`: 跳过SSH隧道检查
- `-d, --skip-db`: 跳过数据库连接测试

## 使用场景

### 场景1: 开发环境快速启动

```bash
# 一键启动（自动处理隧道、数据库检查）
cd backend
./start-backend.sh
```

**流程**:
1. 检查SSH隧道状态
2. 如果未运行，自动启动隧道
3. 验证数据库连接
4. 前台启动后端服务

### 场景2: 生产环境部署

```bash
# 后台运行 + 健康检查
cd backend
./start-backend.sh -b -h
```

**流程**:
1. 启动SSH隧道
2. 启动健康检查守护进程（每30秒检查一次，自动重连）
3. 后台启动后端服务

**日志文件**:
- 后端服务: `/tmp/backend-service.log`
- SSH隧道: `/tmp/ssh-tunnel-15433.log`
- 健康检查: `/tmp/ssh-tunnel-health.log`

### 场景3: 故障排查

```bash
# 1. 检查SSH隧道状态
./scripts/ssh-tunnel-manager.sh status

# 输出示例:
# ==================================
# SSH隧道状态
# ==================================
# 本地端口: 15433
# 远程主机: ubuntu@152.136.104.251
# 远程端口: 5432
#
# 状态: 运行中
# PID: 12345
# 端口监听: 正常
# 连通性测试: 通过
# ==================================

# 2. 查看隧道日志
tail -f /tmp/ssh-tunnel-15433.log

# 3. 手动测试数据库连接
export PGPASSWORD=secure_password_here
psql -h localhost -p 15433 -U app_user -d new_ai_proj_prod -c "SELECT version();"

# 4. 重启隧道
./scripts/ssh-tunnel-manager.sh restart
```

### 场景4: 本地数据库开发

```bash
# 跳过SSH隧道检查
cd backend
./start-backend.sh --skip-tunnel

# 或设置环境变量
SKIP_TUNNEL_CHECK=true ./start-backend.sh
```

## 监控和维护

### 健康检查机制

健康检查会持续监控隧道状态：

1. **检查频率**: 每30秒（可配置）
2. **检查内容**:
   - SSH进程是否运行
   - 端口是否监听
   - 连通性测试
3. **自动恢复**:
   - 检测到异常时自动重启隧道
   - 最多重试3次
   - 重试失败后退出并记录错误

### 日志管理

**查看实时日志**:

```bash
# SSH隧道日志
tail -f /tmp/ssh-tunnel-15433.log

# 后端服务日志
tail -f /tmp/backend-service.log

# 健康检查日志
tail -f /tmp/ssh-tunnel-health.log
```

**清理日志**:

```bash
# 清理所有日志
rm -f /tmp/ssh-tunnel-*.log /tmp/backend-service.log

# 重启服务（会创建新的日志文件）
cd backend
./start-backend.sh -b -h
```

### 进程管理

**查看运行中的进程**:

```bash
# SSH隧道进程
ps aux | grep "ssh.*15433"

# 后端服务进程
ps aux | grep "go run"

# 健康检查守护进程
ps aux | grep "ssh-tunnel-manager.sh health"
```

**停止所有服务**:

```bash
# 停止SSH隧道
./scripts/ssh-tunnel-manager.sh stop

# 停止后端服务
kill $(cat /tmp/backend-service.pid)

# 停止健康检查守护进程
kill $(cat /tmp/ssh-tunnel-health.pid)

# 或者一键清理
pkill -f "ssh.*15433"
pkill -f "go run"
pkill -f "ssh-tunnel-manager.sh health"
```

## 故障排查

### 问题1: SSH隧道无法启动

**现象**:
```
[ERROR] SSH隧道启动失败，退出码: 255
```

**可能原因**:
1. SSH密钥配置问题
2. 远程主机不可达
3. 端口已被占用

**解决方案**:

```bash
# 1. 检查SSH密钥
ssh -T ubuntu@152.136.104.251

# 2. 检查端口占用
lsof -i :15433
# 如果被占用，杀死进程
lsof -ti :15433 | xargs kill -9

# 3. 手动测试SSH隧道
ssh -v -L 15433:127.0.0.1:5432 ubuntu@152.136.104.251
```

### 问题2: 数据库连接失败

**现象**:
```
[ERROR] 数据库连接失败
```

**解决方案**:

```bash
# 1. 确认SSH隧道运行
./scripts/ssh-tunnel-manager.sh status

# 2. 测试端口连通性
nc -zv localhost 15433

# 3. 测试数据库登录
export PGPASSWORD=secure_password_here
psql -h localhost -p 15433 -U app_user -d new_ai_proj_prod

# 4. 检查.env配置
cat backend/.env | grep "DB_"
```

### 问题3: 隧道频繁断开

**现象**: 健康检查日志显示频繁重连

**解决方案**:

```bash
# 1. 增加SSH保活配置
# 编辑 ~/.ssh/config
cat >> ~/.ssh/config << EOF
Host 152.136.104.251
    ServerAliveInterval 60
    ServerAliveCountMax 3
    TCPKeepAlive yes
EOF

# 2. 增加健康检查间隔
HEALTH_CHECK_INTERVAL=60 ./scripts/ssh-tunnel-manager.sh health

# 3. 检查网络连接
ping -c 5 152.136.104.251
```

## 最佳实践

### 开发环境

1. **使用前台启动**，便于查看日志和调试
   ```bash
   ./start-backend.sh
   ```

2. **定期重启隧道**，避免长时间运行导致的连接问题
   ```bash
   ./scripts/ssh-tunnel-manager.sh restart
   ```

### 生产环境

1. **使用后台启动 + 健康检查**
   ```bash
   ./start-backend.sh -b -h
   ```

2. **配置systemd服务**（可选）
   ```bash
   # 创建systemd服务文件
   sudo tee /etc/systemd/system/ssh-tunnel.service << EOF
   [Unit]
   Description=SSH Tunnel for PostgreSQL
   After=network.target

   [Service]
   Type=simple
   User=$USER
   ExecStart=/path/to/scripts/ssh-tunnel-manager.sh health
   Restart=always
   RestartSec=10

   [Install]
   WantedBy=multi-user.target
   EOF

   # 启动服务
   sudo systemctl daemon-reload
   sudo systemctl enable ssh-tunnel
   sudo systemctl start ssh-tunnel
   ```

3. **监控和告警**
   - 使用日志聚合工具监控错误
   - 设置告警规则（如连续重试失败）

### 安全建议

1. **使用SSH密钥认证**，避免密码登录
2. **限制SSH隧道只监听localhost**（脚本已实现）
3. **定期更新远程服务器的SSH配置**
4. **使用防火墙限制数据库访问**

## 配置文件参考

### backend/.env

```bash
# Database configuration - Remote Production PostgreSQL via SSH Tunnel
DB_HOST=localhost
DB_PORT=15433
DB_USER=app_user
DB_PASSWORD=secure_password_here
DB_NAME=new_ai_proj_prod
DB_SSL_MODE=disable
```

### ~/.ssh/config (推荐)

```bash
Host 152.136.104.251
    User ubuntu
    IdentityFile ~/.ssh/id_rsa
    ServerAliveInterval 60
    ServerAliveCountMax 3
    TCPKeepAlive yes
    Compression yes
```

## 常见命令速查

```bash
# 快速启动开发环境
cd backend && ./start-backend.sh

# 快速启动生产环境
cd backend && ./start-backend.sh -b -h

# 检查隧道状态
./scripts/ssh-tunnel-manager.sh status

# 重启隧道
./scripts/ssh-tunnel-manager.sh restart

# 查看实时日志
tail -f /tmp/ssh-tunnel-15433.log

# 测试数据库连接
PGPASSWORD=secure_password_here psql -h localhost -p 15433 -U app_user -d new_ai_proj_prod -c "SELECT 1"

# 停止所有服务
./scripts/ssh-tunnel-manager.sh stop
kill $(cat /tmp/backend-service.pid 2>/dev/null)
kill $(cat /tmp/ssh-tunnel-health.pid 2>/dev/null)
```

## 技术支持

如遇问题，请检查：
1. 日志文件: `/tmp/ssh-tunnel-*.log`
2. 进程状态: `ps aux | grep ssh`
3. 端口监听: `lsof -i :15433`
4. 数据库连接: `psql -h localhost -p 15433`

更多问题请参考故障排查章节或联系开发团队。
