# AI项目开发脚本

项目开发环境管理脚本集合 - 已整理优化 ✨

> **最后整理**: 2025-10-15
> **核心脚本**: 5个 | **归档脚本**: 29个 | **已删除**: 10个

---

## 📁 脚本总览

### 🌟 核心脚本（推荐使用）

#### 1. `dev.sh` - 开发环境统一启动脚本 ⭐

**功能**: 一键启动完整开发环境

**用法**:
```bash
./scripts/dev.sh                # 启动完整环境（推荐）
./scripts/dev.sh backend        # 仅启动后端
./scripts/dev.sh frontend       # 仅启动前端
./scripts/dev.sh stop           # 停止所有服务
./scripts/dev.sh status         # 查看服务状态
```

**特点**:
- ✅ 自动检查并启动数据库隧道
- ✅ 智能依赖检测
- ✅ 端口冲突处理
- ✅ 健康检查等待
- ✅ 友好的交互界面

---

#### 2. `tunnel.sh` - 数据库隧道管理脚本 ⭐

**功能**: 管理SSH隧道连接到远程数据库

**用法**:
```bash
./scripts/tunnel.sh start       # 启动隧道
./scripts/tunnel.sh stop        # 停止隧道
./scripts/tunnel.sh restart     # 重启隧道
./scripts/tunnel.sh status      # 查看详细状态
./scripts/tunnel.sh check       # 快速健康检查
```

**特点**:
- ✅ 统一端口: 5433
- ✅ 自动连接检测
- ✅ 数据库健康检查
- ✅ 详细日志记录
- ✅ 进程智能管理
- ✅ 安全的密码管理（环境变量）

**首次配置**:
```bash
# 1. 复制配置模板
cp scripts/.ai-proj-tunnel.env.example ~/.ai-proj-tunnel.env

# 2. 编辑配置文件，设置数据库密码
vim ~/.ai-proj-tunnel.env

# 3. 启动隧道
./scripts/tunnel.sh start
```

**连接信息**:
```
Host:     localhost
Port:     5433
Database: ai_project_prod
User:     ai_prod_user
Password: 从 ~/.ai-proj-tunnel.env 读取
```

---

#### 3. `setup-dev-aliases.sh` - 快捷命令配置脚本 ⭐

**功能**: 为开发脚本创建便捷别名

**临时使用**:
```bash
source scripts/setup-dev-aliases.sh
```

**永久安装**:
```bash
source scripts/setup-dev-aliases.sh
dev-install
source ~/.zshrc  # 重新加载配置
```

**提供的别名**:
- `dev`, `dev-backend`, `dev-frontend`, `dev-stop`, `dev-status`
- `tunnel-start`, `tunnel-stop`, `tunnel-status`, etc.
- `log-backend`, `log-frontend`, `log-tunnel`
- `port-check`, `port-kill-all`
- `db-connect`, `db-test`
- `cdproj`, `cdback`, `cdfront`
- ... 更多

**工具函数**:
- `dev-aliases` - 显示所有可用命令
- `dev-doctor` - 环境诊断
- `dev-install` - 永久安装别名

#### 4. `deploy-to-production.sh` - 生产环境部署脚本 ⭐

**功能**: 同步代码到生产服务器并部署

**用法**:
```bash
./scripts/deploy-to-production.sh              # 完整部署
./scripts/deploy-to-production.sh --backend-only    # 仅部署后端
./scripts/deploy-to-production.sh --no-restart     # 部署但不重启
./scripts/deploy-to-production.sh --dry-run        # 模拟运行
```

**特点**:
- ✅ 支持发布版本管理
- ✅ 自动创建备份
- ✅ 使用软链接切换版本
- ✅ 健康检查验证
- ✅ 统一路径 `/opt/ai-project`

---

#### 5. `backup-remote-db.sh` - 远程数据库备份脚本

**功能**: 备份生产数据库

**用法**:
```bash
./scripts/backup-remote-db.sh
```

---

## 🗄️ 归档脚本

旧版脚本已移至 `archive/` 目录，保留作为历史参考。

### 归档目录结构

```
archive/
├── legacy-deploy/      # 旧部署脚本（9个）
├── legacy-tunnel/      # 旧隧道脚本（5个）
├── legacy-dev/         # 旧开发脚本（2个）
├── tools/              # 工具脚本（7个）
├── tests/              # 测试脚本（2个）
├── fixes/              # 修复脚本（4个）
└── README.md           # 归档说明文档
```

**查看归档脚本**: `cat archive/README.md`

**注意**: 归档脚本可能已过时，建议使用核心脚本。

---

## 🚀 快速开始

### 首次使用

```bash
# 1. 进入项目目录
cd /Users/johnqiu/coding/www/projects/new-ai-proj

# 2. 安装开发别名（推荐）
source scripts/setup-dev-aliases.sh
dev-install
source ~/.zshrc

# 3. 启动开发环境
dev

# 4. 查看状态
dev-status
```

### 日常使用

```bash
# 早上开始工作
dev              # 启动所有服务

# 查看服务状态
dev-status

# 查看日志
log-backend
log-frontend

# 完成工作
dev-stop         # 停止所有服务
```

---

## 📖 详细文档

完整的使用文档和最佳实践，请参考：

- **[开发环境指南](../docs/DEV_ENVIRONMENT_GUIDE.md)** - 完整的设置和使用文档
- **[快速参考](../docs/DEV_CHEATSHEET.md)** - 一页纸快速参考

---

## 🔧 脚本架构

### 分层设计

```
┌─────────────────────────────────────┐
│     用户命令层 (Aliases)            │
│  dev, tunnel-start, log-backend     │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│     统一入口层 (dev.sh)             │
│  启动流程编排、依赖检查             │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│     服务管理层                      │
│  tunnel.sh    后端启动    前端启动  │
└─────────────────────────────────────┘
             │
┌────────────▼────────────────────────┐
│     基础设施层                      │
│  SSH隧道    PostgreSQL    HTTP      │
└─────────────────────────────────────┘
```

### 统一配置

所有新脚本统一使用以下配置：

**端口**:
- 数据库隧道: 5433
- 后端服务: 8080
- 前端服务: 3000

**日志路径**:
- `/tmp/ai-proj-backend.log`
- `/tmp/ai-proj-frontend.log`
- `/tmp/ai-proj-tunnel.log`

**PID文件**:
- `/tmp/ai-proj-backend.pid`
- `/tmp/ai-proj-frontend.pid`
- `/tmp/ai-proj-tunnel.pid`

---

## 🛠️ 开发者指南

### 添加新脚本

1. 创建脚本文件: `scripts/new-script.sh`
2. 添加执行权限: `chmod +x scripts/new-script.sh`
3. 遵循现有脚本的风格和结构
4. 添加详细的注释和帮助信息
5. 在 `setup-dev-aliases.sh` 中添加别名（如需要）
6. 更新本README

### 脚本规范

#### 文件头部模板

```bash
#!/bin/bash

###############################################################################
# 脚本标题
# 功能：简要描述脚本功能
# 用法: ./scripts/script-name.sh [options]
###############################################################################

set -e
```

#### 颜色输出

```bash
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${BLUE}ℹ${NC} $1"; }
log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1" >&2; }
log_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
```

#### 帮助信息

每个脚本都应提供 `--help` 选项和详细的使用说明。

---

## 🔍 故障排除

### 脚本没有执行权限

```bash
chmod +x scripts/*.sh
```

### 找不到脚本

```bash
ls -la scripts/
pwd  # 确保在项目根目录
```

### 别名不生效

```bash
source ~/.zshrc  # 或 source ~/.bashrc
```

### 查看脚本日志

```bash
tail -f /tmp/ai-proj-*.log
```

---

## 📊 核心脚本对比

| 脚本 | 功能 | 行数 | 推荐度 | 说明 |
|------|------|------|--------|------|
| `dev.sh` | 开发环境管理 | 570 | ⭐⭐⭐⭐⭐ | 统一启动脚本 |
| `tunnel.sh` | 数据库隧道 | 404 | ⭐⭐⭐⭐⭐ | 安全密码管理 |
| `setup-dev-aliases.sh` | 开发别名 | 348 | ⭐⭐⭐⭐⭐ | 便捷命令 |
| `deploy-to-production.sh` | 生产部署 | 349 | ⭐⭐⭐⭐⭐ | 已修复路径 |
| `backup-remote-db.sh` | 数据库备份 | ~150 | ⭐⭐⭐⭐ | 远程备份 |

---

## 💡 最佳实践

1. **优先使用标准化脚本**: `dev.sh` 和 `tunnel.sh`
2. **安装别名**: 提高效率
3. **定期查看日志**: 及时发现问题
4. **使用dev-doctor**: 遇到问题时先诊断
5. **保持更新**: `git pull` 后重启服务

---

## 📞 获取帮助

- 运行 `dev-aliases` 查看所有命令
- 运行 `dev-doctor` 进行环境诊断
- 查看 [开发环境指南](../docs/DEV_ENVIRONMENT_GUIDE.md)
- 联系开发团队

---

## 📈 整理统计

### 整理前
- **总脚本数**: 44个
- **核心功能重复**: 多个版本共存
- **端口配置**: 不统一（5433/15433）
- **密码管理**: 硬编码在脚本中

### 整理后
- **核心脚本**: 5个（保留在根目录）
- **归档脚本**: 29个（移至archive/）
- **删除脚本**: 10个（临时测试脚本）
- **整理收益**:
  - ✅ 目录更清晰
  - ✅ 功能统一标准化
  - ✅ 端口配置统一
  - ✅ 密码安全管理
  - ✅ 路径问题修复

---

## 🔄 版本历史

**v2.0.0** (2025-10-15)
- 🎉 完成scripts文件夹大规模整理
- ✅ 修复deploy-to-production.sh路径不一致问题
- 🔒 改进tunnel.sh密码管理（环境变量）
- 📁 创建归档目录，分类保存旧脚本
- 🗑️ 删除临时测试脚本
- 📝 更新所有文档

**v1.0.0** (2025-01-11)
- 初始版本，包含所有开发脚本

---

**最后更新**: 2025-10-15
**维护者**: AI项目开发团队
