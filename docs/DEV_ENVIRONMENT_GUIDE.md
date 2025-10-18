# AI项目开发环境指南

完整的开发环境设置和使用文档

---

## 📑 目录

- [快速开始](#快速开始)
- [核心脚本](#核心脚本)
- [快捷命令](#快捷命令)
- [详细使用](#详细使用)
- [故障排除](#故障排除)
- [最佳实践](#最佳实践)
- [FAQ](#faq)

---

## 🚀 快速开始

### 1. 首次设置

```bash
# 进入项目目录
cd /Users/johnqiu/coding/www/projects/new-ai-proj

# 安装开发别名（可选，推荐）
source scripts/setup-dev-aliases.sh
dev-install

# 重新加载shell配置
source ~/.zshrc  # 或 source ~/.bashrc
```

### 2. 启动开发环境

```bash
# 方式1: 使用别名（如果已安装）
dev

# 方式2: 直接运行脚本
./scripts/dev.sh

# 查看状态
dev-status
```

### 3. 停止开发环境

```bash
# 方式1: 使用别名
dev-stop

# 方式2: 直接运行脚本
./scripts/dev.sh stop
```

---

## 🛠️ 核心脚本

### 1. `scripts/tunnel.sh` - 数据库隧道管理

统一的SSH隧道管理工具，连接远程数据库。

#### 基本用法

```bash
./scripts/tunnel.sh start    # 启动隧道
./scripts/tunnel.sh stop     # 停止隧道
./scripts/tunnel.sh restart  # 重启隧道
./scripts/tunnel.sh status   # 查看详细状态
./scripts/tunnel.sh check    # 快速健康检查
```

#### 特性

- ✅ 自动连接检测
- ✅ 数据库健康检查
- ✅ 智能进程管理
- ✅ 详细日志记录
- ✅ 友好的状态显示

#### 连接信息

```
Host:     localhost
Port:     5433
Database: ai_project_prod
User:     ai_prod_user
Password: SecureAI2024!@#$%^
```

---

### 2. `scripts/dev.sh` - 开发环境统一启动

一键启动完整开发环境的脚本。

#### 基本用法

```bash
./scripts/dev.sh              # 启动完整环境（隧道+后端+前端）
./scripts/dev.sh both         # 同上
./scripts/dev.sh backend      # 仅启动后端
./scripts/dev.sh frontend     # 仅启动前端
./scripts/dev.sh stop         # 停止所有服务
./scripts/dev.sh status       # 查看服务状态
```

#### 启动流程

1. **检查隧道**: 自动检测并启动SSH隧道
2. **启动后端**:
   - 检查Go编译的可执行文件
   - 如不存在，提示构建
   - 启动并等待健康检查通过
3. **启动前端**:
   - 检查node_modules
   - 如不存在，提示安装依赖
   - 启动React开发服务器

#### 智能特性

- ✅ 自动依赖检查
- ✅ 端口冲突检测
- ✅ 健康检查等待
- ✅ 友好的交互提示
- ✅ 详细的启动日志

---

### 3. `scripts/setup-dev-aliases.sh` - 快捷命令配置

为开发脚本创建便捷的别名。

#### 安装别名

```bash
# 临时使用（当前会话有效）
source scripts/setup-dev-aliases.sh

# 永久安装（添加到shell配置）
source scripts/setup-dev-aliases.sh
dev-install
source ~/.zshrc  # 重新加载配置
```

#### 查看可用命令

```bash
dev-aliases    # 显示所有快捷命令
dev-doctor     # 环境诊断
```

---

## ⚡ 快捷命令

安装别名后可用的快捷命令：

### 开发环境管理

```bash
dev                 # 启动完整开发环境
dev-start           # 启动后端和前端
dev-backend         # 仅启动后端
dev-frontend        # 仅启动前端
dev-stop            # 停止所有服务
dev-status          # 查看服务状态
```

### 数据库隧道

```bash
tunnel              # 隧道管理帮助
tunnel-start        # 启动隧道
tunnel-stop         # 停止隧道
tunnel-restart      # 重启隧道
tunnel-status       # 查看隧道状态
tunnel-check        # 快速健康检查
```

### 目录跳转

```bash
cdproj              # 跳转到项目根目录
cdback              # 跳转到backend目录
cdfront             # 跳转到frontend目录
cdscript            # 跳转到scripts目录
```

### 日志查看

```bash
log-backend         # 实时查看后端日志
log-frontend        # 实时查看前端日志
log-tunnel          # 实时查看隧道日志
log-all             # 实时查看所有日志
```

### 端口管理

```bash
port-check          # 检查端口占用情况
port-kill-backend   # 停止后端端口进程
port-kill-frontend  # 停止前端端口进程
port-kill-tunnel    # 停止隧道端口进程
port-kill-all       # 停止所有端口进程
```

### 数据库操作

```bash
db-connect          # 连接到数据库（psql）
db-test             # 测试数据库连接
```

### 后端开发

```bash
backend-build       # 构建后端
backend-test        # 运行后端测试
backend-run         # 直接运行后端（go run）
```

### 前端开发

```bash
frontend-install    # 安装前端依赖
frontend-start      # 启动前端开发服务器
frontend-build      # 构建前端生产版本
frontend-test       # 运行前端测试
```

---

## 📖 详细使用

### 场景1: 完整开发环境

启动隧道、后端、前端的完整开发环境。

```bash
# 启动
dev

# 验证服务
dev-status

# 访问应用
# 前端: http://localhost:3000
# 后端: http://localhost:8080
# 健康检查: http://localhost:8080/health

# 停止
dev-stop
```

### 场景2: 仅后端开发

只需要开发和测试后端API。

```bash
# 启动（会自动启动隧道）
dev-backend

# 查看日志
log-backend

# 测试API
curl http://localhost:8080/health

# 停止
port-kill-backend
```

### 场景3: 仅前端开发

假设后端已在远程运行，只需开发前端。

```bash
# 启动前端
dev-frontend

# 查看日志
log-frontend

# 停止
port-kill-frontend
```

### 场景4: 数据库调试

需要直接连接数据库进行SQL调试。

```bash
# 启动隧道
tunnel-start

# 连接数据库
db-connect

# 或手动连接
PGPASSWORD='SecureAI2024!@#$%^' psql -h localhost -p 5433 -U ai_prod_user -d ai_project_prod

# SQL操作
\dt                           # 列出所有表
\d tasks                      # 查看tasks表结构
SELECT COUNT(*) FROM tasks;   # 查询任务数

# 退出
\q
```

### 场景5: 环境诊断

遇到问题时进行环境检查。

```bash
# 运行诊断
dev-doctor

# 检查具体服务
tunnel-status    # 隧道详细状态
dev-status       # 所有服务状态
port-check       # 端口占用情况
```

---

## 🔧 故障排除

### 问题1: 端口被占用

**症状**: 启动时提示端口已被占用

**解决方案**:

```bash
# 方法1: 查看占用端口的进程
lsof -i :8080    # 后端
lsof -i :3000    # 前端
lsof -i :5433    # 隧道

# 方法2: 使用快捷命令
port-check       # 查看所有端口

# 方法3: 停止占用进程
port-kill-all    # 停止所有项目相关进程

# 方法4: 手动停止
dev-stop
```

### 问题2: 隧道连接失败

**症状**: 隧道启动失败或数据库连接超时

**排查步骤**:

```bash
# 1. 检查SSH连接
ssh ubuntu@152.136.104.251 "echo 'SSH OK'"

# 2. 检查端口是否被占用
port-kill-tunnel

# 3. 重启隧道
tunnel-restart

# 4. 查看详细日志
tail -f /tmp/ai-proj-tunnel.log

# 5. 手动测试连接
nc -zv localhost 5433

# 6. 测试数据库连接
db-test
```

### 问题3: 后端启动失败

**症状**: 后端服务无法启动或健康检查失败

**排查步骤**:

```bash
# 1. 检查后端日志
log-backend

# 2. 检查是否需要构建
cdback
ls -la backend     # 检查可执行文件

# 3. 重新构建
backend-build

# 4. 检查环境变量
cat .env

# 5. 测试数据库连接
db-test

# 6. 手动运行后端（查看详细错误）
backend-run
```

### 问题4: 前端启动失败

**症状**: 前端服务无法启动或webpack编译失败

**排查步骤**:

```bash
# 1. 检查前端日志
log-frontend

# 2. 检查依赖
cdfront
ls -la node_modules

# 3. 清理并重新安装
rm -rf node_modules package-lock.json
npm install

# 4. 清理缓存
rm -rf node_modules/.cache

# 5. 手动启动（查看详细错误）
npm start
```

### 问题5: 脚本没有执行权限

**症状**: bash: permission denied

**解决方案**:

```bash
# 添加执行权限
chmod +x scripts/*.sh

# 或单独添加
chmod +x scripts/dev.sh
chmod +x scripts/tunnel.sh
chmod +x scripts/setup-dev-aliases.sh
```

### 问题6: 别名不生效

**症状**: command not found: dev

**解决方案**:

```bash
# 1. 重新加载别名
source scripts/setup-dev-aliases.sh

# 2. 或永久安装
source scripts/setup-dev-aliases.sh
dev-install
source ~/.zshrc  # 或 source ~/.bashrc

# 3. 检查是否已安装
grep "AI Project Dev Aliases" ~/.zshrc

# 4. 手动添加（如果dev-install失败）
echo 'source ~/coding/www/projects/new-ai-proj/scripts/setup-dev-aliases.sh' >> ~/.zshrc
source ~/.zshrc
```

---

## 💡 最佳实践

### 1. 日常开发流程

```bash
# 早上开始工作
cdproj              # 进入项目目录
git pull            # 拉取最新代码
dev                 # 启动开发环境

# 开发中...
log-backend         # 需要时查看日志
dev-status          # 检查服务状态

# 完成工作
git add .
git commit -m "feat: xxxx"
git push
dev-stop            # 停止所有服务
```

### 2. 调试后端

```bash
# 启动后端并查看日志
dev-backend
log-backend

# 另一个终端测试API
curl http://localhost:8080/api/v1/tasks | jq

# 需要时直接连接数据库
db-connect
```

### 3. 调试前端

```bash
# 启动前端
dev-frontend

# 在浏览器打开开发者工具
# http://localhost:3000

# 查看webpack编译信息
log-frontend
```

### 4. 性能优化

```bash
# 后端只需运行一次编译
cdback
go build -o backend main.go

# 前端生产构建测试
cdfront
npm run build
npx serve -s build
```

### 5. 团队协作

```bash
# 提交代码前检查
dev-status          # 确保所有服务正常
backend-test        # 运行后端测试
frontend-test       # 运行前端测试

# 拉取代码后重启服务
git pull
dev-stop
dev
```

---

## ❓ FAQ

### Q1: 为什么要统一端口为5433?

**A**: 统一端口避免多个隧道脚本冲突，5433是PostgreSQL的常用备用端口，不与系统默认5432冲突。

### Q2: 隧道会自动重连吗?

**A**: `tunnel.sh` 本身不自动重连，但可以使用 `~/scripts/db-tunnel-persistent.sh monitor` 实现自动重连，或配置cron任务使用 `~/scripts/check-tunnel-health.sh`。

### Q3: 可以同时运行多个开发环境吗?

**A**: 不建议。端口会冲突。如需要，可以修改端口配置。

### Q4: 为什么前端启动这么慢?

**A**: React开发服务器首次启动需要编译，正常需要30-60秒。后续hot reload会很快。

### Q5: 如何在生产环境使用这些脚本?

**A**: 这些脚本主要为开发设计。生产环境建议使用:
- Docker容器化
- Systemd服务
- 专业的进程管理工具 (PM2, Supervisor等)

### Q6: 日志文件会占用大量磁盘空间吗?

**A**: 日志在 `/tmp` 目录，会在系统重启后自动清理。如需手动清理:

```bash
rm -f /tmp/ai-proj-*.log
rm -f /tmp/ai-proj-*.pid
```

### Q7: 如何升级这些脚本?

**A**:

```bash
git pull    # 拉取最新代码
dev-stop    # 停止旧服务
dev         # 使用新脚本启动
```

### Q8: Windows或Linux下能用这些脚本吗?

**A**: 这些脚本为macOS优化，但大部分功能在Linux下可用。Windows需要使用WSL或Git Bash。

---

## 📚 相关文档

- [项目README](../README.md)
- [后端API文档](../backend/README.md)
- [前端开发指南](../frontend/README.md)
- [部署文档](../docs/DEPLOYMENT.md)

---

## 🆘 获取帮助

如果遇到问题:

1. 运行 `dev-doctor` 进行环境诊断
2. 查看日志文件: `log-backend`, `log-frontend`, `log-tunnel`
3. 查看本文档的[故障排除](#故障排除)章节
4. 联系开发团队

---

**最后更新**: 2025-01-11
**版本**: 1.0.0
**维护者**: AI项目开发团队
