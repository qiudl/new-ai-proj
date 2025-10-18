# 开发环境快速参考

一页纸快速参考所有常用命令

---

## 🚀 快速开始

```bash
# 首次安装别名
source scripts/setup-dev-aliases.sh && dev-install && source ~/.zshrc

# 启动开发环境
dev

# 查看状态
dev-status

# 停止所有服务
dev-stop
```

---

## 📋 核心命令

### 开发环境

| 命令 | 说明 |
|------|------|
| `dev` | 启动完整环境（隧道+后端+前端） |
| `dev-backend` | 仅启动后端 |
| `dev-frontend` | 仅启动前端 |
| `dev-stop` | 停止所有服务 |
| `dev-status` | 查看服务状态 |

### 数据库隧道

| 命令 | 说明 |
|------|------|
| `tunnel-start` | 启动隧道 |
| `tunnel-stop` | 停止隧道 |
| `tunnel-restart` | 重启隧道 |
| `tunnel-status` | 查看隧道状态 |
| `tunnel-check` | 快速健康检查 |

### 日志查看

| 命令 | 说明 |
|------|------|
| `log-backend` | 查看后端日志 |
| `log-frontend` | 查看前端日志 |
| `log-tunnel` | 查看隧道日志 |
| `log-all` | 查看所有日志 |

### 目录跳转

| 命令 | 说明 |
|------|------|
| `cdproj` | 跳转到项目根目录 |
| `cdback` | 跳转到backend目录 |
| `cdfront` | 跳转到frontend目录 |
| `cdscript` | 跳转到scripts目录 |

### 端口管理

| 命令 | 说明 |
|------|------|
| `port-check` | 检查端口占用 |
| `port-kill-all` | 停止所有端口进程 |

### 数据库

| 命令 | 说明 |
|------|------|
| `db-connect` | 连接数据库 |
| `db-test` | 测试数据库连接 |

### 后端开发

| 命令 | 说明 |
|------|------|
| `backend-build` | 构建后端 |
| `backend-test` | 运行测试 |
| `backend-run` | 直接运行 |

### 前端开发

| 命令 | 说明 |
|------|------|
| `frontend-install` | 安装依赖 |
| `frontend-start` | 启动开发服务器 |
| `frontend-build` | 构建生产版本 |

---

## 🛠️ 工具命令

```bash
dev-aliases     # 显示所有可用命令
dev-doctor      # 环境诊断
dev-install     # 安装别名到shell配置
```

---

## 🌐 服务地址

| 服务 | 地址 |
|------|------|
| 前端 | http://localhost:3000 |
| 后端 | http://localhost:8080 |
| 健康检查 | http://localhost:8080/health |
| 数据库隧道 | localhost:5433 |

---

## 🔧 常见场景

### 完整开发

```bash
dev              # 启动所有服务
dev-status       # 检查状态
# ... 开发工作 ...
dev-stop         # 完成后停止
```

### 仅后端调试

```bash
dev-backend      # 启动后端
log-backend      # 查看日志
curl http://localhost:8080/health
port-kill-backend  # 停止
```

### 数据库操作

```bash
tunnel-start     # 启动隧道
db-connect       # 连接数据库
# SQL操作...
\q               # 退出
tunnel-stop      # 停止隧道
```

### 端口冲突

```bash
port-check       # 查看占用
port-kill-all    # 清理所有
dev              # 重新启动
```

---

## 🚨 故障排除

### 端口被占用
```bash
port-kill-all && dev
```

### 隧道连接失败
```bash
tunnel-restart
```

### 后端启动失败
```bash
log-backend      # 查看错误
backend-build    # 重新构建
dev-backend      # 重启
```

### 前端启动失败
```bash
log-frontend     # 查看错误
cdfront && npm install  # 重装依赖
dev-frontend     # 重启
```

### 别名不生效
```bash
source ~/.zshrc  # 或 source ~/.bashrc
```

### 环境问题
```bash
dev-doctor       # 运行诊断
```

---

## 📂 文件路径

### 日志文件
- 后端: `/tmp/ai-proj-backend.log`
- 前端: `/tmp/ai-proj-frontend.log`
- 隧道: `/tmp/ai-proj-tunnel.log`

### PID文件
- 后端: `/tmp/ai-proj-backend.pid`
- 前端: `/tmp/ai-proj-frontend.pid`
- 隧道: `/tmp/ai-proj-tunnel.pid`

### 配置文件
- 后端环境: `backend/.env`
- Shell别名: `~/.zshrc` 或 `~/.bashrc`

---

## 🎯 一行命令

```bash
# 完整流程
dev && echo "✅ 开发环境已启动" && dev-status

# 快速重启
dev-stop && sleep 2 && dev

# 清理一切
port-kill-all && rm -f /tmp/ai-proj-*.{log,pid}

# 查看所有日志
tail -f /tmp/ai-proj-*.log

# 检查一切
dev-doctor && dev-status
```

---

**提示**: 使用 `dev-aliases` 随时查看完整命令列表

**详细文档**: 查看 [DEV_ENVIRONMENT_GUIDE.md](./DEV_ENVIRONMENT_GUIDE.md)
