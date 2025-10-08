# 🚀 快速开始指南

## 一键启动后端服务

```bash
cd backend
./start-backend.sh
```

就这么简单！脚本会自动处理：
- ✅ 检查并启动SSH隧道
- ✅ 验证数据库连接
- ✅ 启动后端服务

## 常用命令

### SSH隧道管理

```bash
# 查看状态
./scripts/ssh-tunnel-manager.sh status

# 启动隧道
./scripts/ssh-tunnel-manager.sh start

# 停止隧道
./scripts/ssh-tunnel-manager.sh stop

# 重启隧道
./scripts/ssh-tunnel-manager.sh restart

# 健康检查
./scripts/ssh-tunnel-manager.sh check
```

### 后端服务

```bash
# 前台启动（开发环境）
cd backend
./start-backend.sh

# 后台启动（生产环境）
./start-backend.sh -b

# 后台 + 健康检查
./start-backend.sh -b -h

# 本地数据库（跳过隧道）
./start-backend.sh --skip-tunnel
```

### 查看日志

```bash
# SSH隧道日志
tail -f /tmp/ssh-tunnel-15433.log

# 后端服务日志
tail -f /tmp/backend-service.log

# 健康检查日志
tail -f /tmp/ssh-tunnel-health.log
```

### 测试数据库连接

```bash
export PGPASSWORD=secure_password_here
psql -h localhost -p 15433 -U app_user -d new_ai_proj_prod -c "SELECT version();"
```

### 停止所有服务

```bash
# 停止SSH隧道
./scripts/ssh-tunnel-manager.sh stop

# 停止后端服务
kill $(cat /tmp/backend-service.pid 2>/dev/null)

# 停止健康检查
kill $(cat /tmp/ssh-tunnel-health.pid 2>/dev/null)
```

## 故障排查

### 问题：SSH隧道无法启动

```bash
# 1. 检查端口占用
lsof -i :15433

# 2. 如果被占用，清理进程
lsof -ti :15433 | xargs kill -9

# 3. 重新启动
./scripts/ssh-tunnel-manager.sh start
```

### 问题：数据库连接失败

```bash
# 1. 确认隧道运行
./scripts/ssh-tunnel-manager.sh status

# 2. 测试端口
nc -zv localhost 15433

# 3. 测试数据库
export PGPASSWORD=secure_password_here
psql -h localhost -p 15433 -U app_user -d new_ai_proj_prod
```

### 问题：后端服务端口占用

```bash
# 查看占用进程
lsof -i :8080

# 杀死进程
lsof -ti :8080 | xargs kill -9

# 重新启动
./start-backend.sh
```

## 高级功能

### 自动启动（macOS）

```bash
# 安装Launchd服务（开机自启动）
./scripts/setup-launchd.sh install

# 查看服务状态
./scripts/setup-launchd.sh status

# 卸载服务
./scripts/setup-launchd.sh uninstall
```

### 自动启动（Linux）

```bash
# 安装Systemd服务
./scripts/setup-systemd.sh install

# 查看服务状态
./scripts/setup-systemd.sh status

# 查看日志
./scripts/setup-systemd.sh logs
```

### 监控和告警

```bash
# 执行单次监控检查
./scripts/monitor-tunnel.sh check

# 启动持续监控
./scripts/monitor-tunnel.sh start

# 后台运行监控（带Webhook告警）
WEBHOOK_URL=https://your-webhook-url nohup ./scripts/monitor-tunnel.sh start > /tmp/monitor.log 2>&1 &

# 查看Prometheus metrics
./scripts/monitor-tunnel.sh metrics
```

## 详细文档

- 📖 [SSH隧道完整指南](docs/SSH_TUNNEL_GUIDE.md)
- 📖 [部署改进总结](docs/DEPLOYMENT_IMPROVEMENTS.md)
- 📖 [远端数据库测试报告](/tmp/remote-db-test-report.md)

## 环境配置

### 基本配置 (backend/.env)
```bash
DB_HOST=localhost
DB_PORT=15433
DB_USER=app_user
DB_PASSWORD=secure_password_here
DB_NAME=new_ai_proj_prod
```

### SSH配置 (~/.ssh/config)
```bash
Host 152.136.104.251
    User ubuntu
    ServerAliveInterval 60
    ServerAliveCountMax 3
```

## 需要帮助？

1. 查看日志: `/tmp/ssh-tunnel-*.log`
2. 检查进程: `ps aux | grep ssh`
3. 测试连接: `./scripts/ssh-tunnel-manager.sh check`
4. 阅读文档: `docs/SSH_TUNNEL_GUIDE.md`
