# AI 自动化部署指令文档

> **目标读者**: AI 助手（如 Claude Code）
> **目的**: 让 AI 能够从零开始在用户本机部署 AI Project 项目
> **前提**: 用户已克隆代码到本地

---

## 执行说明

这是一份供 AI 助手执行的部署指令。当用户请求"帮我部署这个项目"时，AI 应该：

1. 首先检测用户的操作系统
2. 按顺序执行以下步骤
3. 每一步都验证结果后再继续
4. 遇到错误时尝试自动修复或向用户报告

---

## 阶段 0: 环境检测

### 0.1 检测操作系统

```bash
uname -s
```

**判断逻辑**:
- `Darwin` → macOS，使用 Homebrew
- `Linux` → 检查发行版，使用 apt/yum

### 0.2 检测已安装的工具

依次检查以下命令是否可用：

```bash
# 检查 Git
git --version

# 检查 Go
go version

# 检查 Node.js
node --version
npm --version

# 检查 PostgreSQL
psql --version
pg_isready -h localhost -p 5432
```

**记录结果**: 将缺失的工具记入待安装列表。

---

## 阶段 1: 安装缺失工具

### 1.1 macOS 安装流程

#### 安装 Homebrew (如果缺失)

```bash
# 检查 Homebrew
if ! command -v brew &> /dev/null; then
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

    # Apple Silicon Mac
    if [[ $(uname -m) == "arm64" ]]; then
        echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zshrc
        eval "$(/opt/homebrew/bin/brew shellenv)"
    else
        echo 'eval "$(/usr/local/bin/brew shellenv)"' >> ~/.zshrc
        eval "$(/usr/local/bin/brew shellenv)"
    fi
fi
```

#### 安装 Git

```bash
if ! command -v git &> /dev/null; then
    brew install git
fi
```

#### 安装 Go

```bash
if ! command -v go &> /dev/null; then
    brew install go
fi
```

#### 安装 Node.js

```bash
if ! command -v node &> /dev/null; then
    brew install node@20
    # 确保 node@20 在 PATH 中
    echo 'export PATH="/opt/homebrew/opt/node@20/bin:$PATH"' >> ~/.zshrc
    export PATH="/opt/homebrew/opt/node@20/bin:$PATH"
fi
```

#### 安装 PostgreSQL

```bash
if ! command -v psql &> /dev/null; then
    brew install postgresql@16
    echo 'export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"' >> ~/.zshrc
    export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
fi

# 启动 PostgreSQL 服务
brew services start postgresql@16

# 等待服务启动
sleep 3

# 验证服务运行
pg_isready -h localhost -p 5432
```

### 1.2 Ubuntu/Debian 安装流程

```bash
sudo apt update

# Git
if ! command -v git &> /dev/null; then
    sudo apt install -y git
fi

# Go
if ! command -v go &> /dev/null; then
    wget -q https://go.dev/dl/go1.24.0.linux-amd64.tar.gz
    sudo rm -rf /usr/local/go
    sudo tar -C /usr/local -xzf go1.24.0.linux-amd64.tar.gz
    rm go1.24.0.linux-amd64.tar.gz
    echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
    export PATH=$PATH:/usr/local/go/bin
fi

# Node.js
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi

# PostgreSQL
if ! command -v psql &> /dev/null; then
    sudo apt install -y postgresql postgresql-contrib
fi

# 启动 PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

---

## 阶段 2: 数据库配置

### 2.1 创建数据库用户和数据库

**macOS:**

```bash
# 创建用户（如果不存在）
createuser -s ai_dev 2>/dev/null || echo "用户 ai_dev 已存在"

# 设置密码
psql postgres -c "ALTER USER ai_dev WITH PASSWORD 'ai_dev_2024';"

# 创建数据库（如果不存在）
createdb -O ai_dev ai_project_local 2>/dev/null || echo "数据库 ai_project_local 已存在"
```

**Ubuntu/Debian:**

```bash
sudo -u postgres psql << 'EOSQL'
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'ai_dev') THEN
        CREATE USER ai_dev WITH PASSWORD 'ai_dev_2024' CREATEDB;
    END IF;
END
$$;

SELECT 'CREATE DATABASE ai_project_local OWNER ai_dev'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'ai_project_local')\gexec

GRANT ALL PRIVILEGES ON DATABASE ai_project_local TO ai_dev;
EOSQL
```

### 2.2 验证数据库连接

```bash
PGPASSWORD="ai_dev_2024" psql -h localhost -p 5432 -U ai_dev -d ai_project_local -c "SELECT 'Database connection successful!' as status;"
```

**预期输出**: `Database connection successful!`

**失败时的处理**:
1. 检查 PostgreSQL 服务是否运行: `pg_isready`
2. 检查用户权限: `psql postgres -c "\du"`
3. 检查 pg_hba.conf 是否允许 md5 认证

---

## 阶段 3: 后端配置

### 3.1 进入后端目录

```bash
cd backend
```

### 3.2 创建环境配置文件

```bash
# 检查是否存在 .env 文件
if [ ! -f .env ]; then
    cp .env.example .env
    echo "已创建 .env 文件"
else
    echo ".env 文件已存在"
fi
```

### 3.3 生成 JWT Secret

```bash
JWT_SECRET=$(openssl rand -hex 32)
echo "生成的 JWT_SECRET: $JWT_SECRET"
```

### 3.4 更新 .env 配置

使用 sed 或直接写入更新配置：

```bash
# 设置数据库配置
sed -i.bak 's/^DB_HOST=.*/DB_HOST=localhost/' .env
sed -i.bak 's/^DB_PORT=.*/DB_PORT=5432/' .env
sed -i.bak 's/^DB_USER=.*/DB_USER=ai_dev/' .env
sed -i.bak 's/^DB_PASSWORD=.*/DB_PASSWORD=ai_dev_2024/' .env
sed -i.bak 's/^DB_NAME=.*/DB_NAME=ai_project_local/' .env

# 设置 JWT Secret
sed -i.bak "s/^JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env

# 设置环境
sed -i.bak 's/^APP_ENV=.*/APP_ENV=development/' .env

# 清理备份文件
rm -f .env.bak
```

**macOS 注意**: macOS 的 sed 需要 `-i ''` 而不是 `-i.bak`，或使用 gsed。

### 3.5 安装 Go 依赖

```bash
# 设置 Go 代理（加速下载）
go env -w GOPROXY=https://goproxy.cn,direct

# 下载依赖
go mod download

# 整理依赖
go mod tidy
```

### 3.6 验证后端可编译

```bash
go build -o main . && rm main
echo "后端编译测试通过"
```

---

## 阶段 4: 前端配置

### 4.1 进入前端目录

```bash
cd ../frontend
```

### 4.2 创建本地环境配置

```bash
cat > .env.local << 'EOF'
REACT_APP_API_URL=http://localhost:8080/api/v1
REACT_APP_API_BASE_URL=http://localhost:8080/api/v1
REACT_APP_ENV=development
EOF
```

### 4.3 安装 npm 依赖

```bash
# 设置 npm 镜像（加速下载）
npm config set registry https://registry.npmmirror.com

# 安装依赖
npm install
```

**预计时间**: 3-5 分钟

### 4.4 验证前端可构建

```bash
# 检查 TypeScript 编译
npm run type-check 2>/dev/null || echo "跳过类型检查"
```

---

## 阶段 5: 启动服务

### 5.1 启动后端服务

在一个终端中：

```bash
cd backend
go run main.go
```

或者使用 Air 热重载：

```bash
cd backend

# 安装 Air（如果未安装）
go install github.com/air-verse/air@latest

# 启动
air
```

### 5.2 验证后端启动

等待 5-10 秒后，在另一个终端执行：

```bash
curl -s http://localhost:8080/health | head -c 100
```

**预期输出**: 包含 `"status":"ok"` 的 JSON

### 5.3 启动前端服务

在新终端中：

```bash
cd frontend
npm start
```

### 5.4 验证前端启动

等待编译完成（约 30 秒），然后：

```bash
curl -s http://localhost:3000 | head -c 100
```

**预期输出**: HTML 内容

---

## 阶段 6: 部署验证

### 6.1 检查所有服务

```bash
echo "=== 服务状态检查 ==="

# 后端健康检查
echo -n "后端: "
if curl -sf http://localhost:8080/health > /dev/null; then
    echo "✅ 运行正常"
else
    echo "❌ 未响应"
fi

# 前端检查
echo -n "前端: "
if curl -sf http://localhost:3000 > /dev/null; then
    echo "✅ 运行正常"
else
    echo "❌ 未响应"
fi

# 数据库检查
echo -n "数据库: "
if pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo "✅ 运行正常"
else
    echo "❌ 未响应"
fi
```

### 6.2 输出访问信息

```bash
cat << 'EOF'

=== 部署完成 ===

访问地址:
- 前端页面: http://localhost:3000
- 后端 API: http://localhost:8080/api/v1
- API 文档: http://localhost:8080/docs
- 健康检查: http://localhost:8080/health

数据库连接:
- Host: localhost
- Port: 5432
- User: ai_dev
- Password: ai_dev_2024
- Database: ai_project_local

EOF
```

---

## 错误处理指南

### E1: PostgreSQL 服务未运行

**症状**: `pg_isready` 返回 "no response" 或连接被拒绝

**修复步骤**:
```bash
# macOS
brew services restart postgresql@16

# Ubuntu
sudo systemctl restart postgresql
```

### E2: 端口被占用

**症状**: `address already in use`

**修复步骤**:
```bash
# 查找占用进程
lsof -i :8080  # 或 :3000

# 终止进程
kill -9 <PID>
```

### E3: Go 模块下载失败

**症状**: `go mod download` 超时或失败

**修复步骤**:
```bash
go env -w GOPROXY=https://goproxy.cn,direct
go clean -modcache
go mod download
```

### E4: npm 安装失败

**症状**: `npm install` 报错

**修复步骤**:
```bash
# 清理缓存
npm cache clean --force

# 删除 node_modules 和 lock 文件
rm -rf node_modules package-lock.json

# 重新安装
npm install
```

### E5: 内存不足

**症状**: `JavaScript heap out of memory`

**修复步骤**:
```bash
export NODE_OPTIONS="--max-old-space-size=4096"
npm start
```

---

## 快速命令参考

| 任务 | 命令 |
|------|------|
| 启动后端 | `cd backend && go run main.go` |
| 启动前端 | `cd frontend && npm start` |
| 检查后端 | `curl http://localhost:8080/health` |
| 连接数据库 | `PGPASSWORD="ai_dev_2024" psql -h localhost -U ai_dev -d ai_project_local` |
| 查看日志 | 后端日志直接输出到终端 |
| 停止服务 | `Ctrl+C` 终止运行中的进程 |

---

## 使用开发脚本

项目提供了 `scripts/dev.sh` 脚本简化操作：

```bash
# 查看帮助
./scripts/dev.sh help

# 启动本地模式
./scripts/dev.sh local

# 查看状态
./scripts/dev.sh status

# 停止服务
./scripts/dev.sh stop
```

---

**文档版本**: v1.0
**最后更新**: 2025-12-15
**适用于**: Claude Code, GPT-4, 及其他 AI 助手
