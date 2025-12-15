# AI Project 本地部署手册（新手小白版）

> 本手册面向零基础用户，手把手教你在本机部署 AI Project 项目。
> 预计耗时：30-60 分钟（首次部署）

---

## 目录

1. [环境要求](#1-环境要求)
2. [安装必要工具](#2-安装必要工具)
3. [获取代码](#3-获取代码)
4. [数据库配置](#4-数据库配置)
5. [后端配置与启动](#5-后端配置与启动)
6. [前端配置与启动](#6-前端配置与启动)
7. [验证部署](#7-验证部署)
8. [常见问题](#8-常见问题)
9. [日常开发命令](#9-日常开发命令)

---

## 1. 环境要求

### 操作系统
- **macOS** (推荐 macOS 12+)
- **Linux** (Ubuntu 20.04+, Debian 11+)
- **Windows** (需要 WSL2)

### 硬件要求
- CPU: 2核以上
- 内存: 8GB 以上（推荐 16GB）
- 磁盘: 10GB 可用空间

---

## 2. 安装必要工具

### 2.1 安装 Homebrew (仅 macOS)

打开终端（Terminal），执行：

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

安装完成后，按提示将 Homebrew 添加到 PATH：

```bash
# 对于 Apple Silicon (M1/M2/M3) Mac
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zshrc
source ~/.zshrc

# 对于 Intel Mac
echo 'eval "$(/usr/local/bin/brew shellenv)"' >> ~/.zshrc
source ~/.zshrc
```

验证安装：
```bash
brew --version
# 应该显示类似: Homebrew 4.x.x
```

### 2.2 安装 Git

**macOS:**
```bash
brew install git
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install git -y
```

验证安装：
```bash
git --version
# 应该显示类似: git version 2.x.x
```

### 2.3 安装 Go (后端语言)

**macOS:**
```bash
brew install go
```

**Ubuntu/Debian:**
```bash
# 下载 Go 1.24
wget https://go.dev/dl/go1.24.0.linux-amd64.tar.gz
sudo rm -rf /usr/local/go
sudo tar -C /usr/local -xzf go1.24.0.linux-amd64.tar.gz

# 添加到 PATH
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
source ~/.bashrc
```

验证安装：
```bash
go version
# 应该显示类似: go version go1.24.0 darwin/arm64
```

### 2.4 安装 Node.js (前端环境)

**macOS:**
```bash
brew install node@20
```

**Ubuntu/Debian:**
```bash
# 使用 NodeSource 仓库
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

验证安装：
```bash
node --version
# 应该显示类似: v20.x.x

npm --version
# 应该显示类似: 10.x.x
```

### 2.5 安装 PostgreSQL (数据库)

**macOS:**
```bash
brew install postgresql@16
brew services start postgresql@16

# 将 PostgreSQL 添加到 PATH
echo 'export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

**Ubuntu/Debian:**
```bash
sudo apt install postgresql postgresql-contrib -y
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

验证安装：
```bash
psql --version
# 应该显示类似: psql (PostgreSQL) 16.x

# 检查服务是否运行
pg_isready
# 应该显示: accepting connections
```

---

## 3. 获取代码

### 3.1 克隆仓库

```bash
# 创建工作目录
mkdir -p ~/coding/projects
cd ~/coding/projects

# 克隆代码（替换为实际的仓库地址）
git clone git@github.com:your-org/new-ai-proj.git

# 或使用 HTTPS（如果没有配置 SSH）
git clone https://github.com/your-org/new-ai-proj.git

# 进入项目目录
cd new-ai-proj
```

### 3.2 查看项目结构

```bash
ls -la
# 你应该看到以下目录:
# backend/      - Go 后端代码
# frontend/     - React 前端代码
# scripts/      - 工具脚本
# docs/         - 文档
# docker-compose.*.yml - Docker 配置
```

---

## 4. 数据库配置

### 4.1 创建数据库用户和数据库

**macOS (使用当前用户):**
```bash
# 创建数据库用户
createuser -s ai_dev 2>/dev/null || echo "用户已存在"

# 设置密码（进入 psql）
psql postgres -c "ALTER USER ai_dev WITH PASSWORD 'ai_dev_2024';"

# 创建数据库
createdb -O ai_dev ai_project_local 2>/dev/null || echo "数据库已存在"
```

**Ubuntu/Debian (使用 postgres 用户):**
```bash
sudo -u postgres psql << EOF
CREATE USER ai_dev WITH PASSWORD 'ai_dev_2024' CREATEDB;
CREATE DATABASE ai_project_local OWNER ai_dev;
GRANT ALL PRIVILEGES ON DATABASE ai_project_local TO ai_dev;
EOF
```

### 4.2 验证数据库连接

```bash
PGPASSWORD="ai_dev_2024" psql -h localhost -U ai_dev -d ai_project_local -c "SELECT 1 as test;"
```

如果看到输出 `test | 1`，说明数据库配置成功！

### 4.3 (可选) 导入现有数据

如果你有数据库备份文件，可以导入：

```bash
PGPASSWORD="ai_dev_2024" psql -h localhost -U ai_dev -d ai_project_local < your_backup.sql
```

---

## 5. 后端配置与启动

### 5.1 配置环境变量

```bash
cd backend

# 从模板创建配置文件
cp .env.example .env

# 编辑配置文件
nano .env   # 或使用你喜欢的编辑器: vim, code, etc.
```

**必须修改的配置项：**

```bash
# 数据库配置（使用上面创建的用户和数据库）
DB_HOST=localhost
DB_PORT=5432
DB_USER=ai_dev
DB_PASSWORD=ai_dev_2024
DB_NAME=ai_project_local

# JWT 密钥（生成一个随机字符串）
JWT_SECRET=your-random-secret-key-at-least-32-chars

# 应用环境
APP_ENV=development
```

**生成随机 JWT 密钥的方法：**
```bash
# 方法1: 使用 openssl
openssl rand -hex 32

# 方法2: 使用 /dev/urandom
head -c 32 /dev/urandom | base64
```

### 5.2 安装 Go 依赖

```bash
cd backend
go mod download
go mod tidy
```

### 5.3 启动后端服务

**方式一：直接运行（推荐新手）**
```bash
go run main.go
```

**方式二：使用 Air 热重载（开发推荐）**
```bash
# 先安装 Air
go install github.com/air-verse/air@latest

# 运行
air
```

**方式三：编译后运行**
```bash
go build -o main .
./main
```

### 5.4 验证后端启动

打开新的终端窗口：
```bash
curl http://localhost:8080/health
```

应该返回：
```json
{"status":"ok","time":"2025-xx-xx..."}
```

---

## 6. 前端配置与启动

### 6.1 安装依赖

```bash
cd frontend
npm install
```

> 首次安装可能需要 3-5 分钟，请耐心等待。

### 6.2 配置环境变量

创建本地配置文件：
```bash
cat > .env.local << 'EOF'
REACT_APP_API_URL=http://localhost:8080/api/v1
REACT_APP_API_BASE_URL=http://localhost:8080/api/v1
REACT_APP_ENV=development
EOF
```

### 6.3 启动前端开发服务器

```bash
npm start
```

等待编译完成，浏览器会自动打开 http://localhost:3000

---

## 7. 验证部署

### 7.1 检查服务状态

| 服务 | 地址 | 预期结果 |
|------|------|---------|
| 后端健康检查 | http://localhost:8080/health | `{"status":"ok"...}` |
| 后端 API 文档 | http://localhost:8080/docs | Swagger UI 页面 |
| 前端页面 | http://localhost:3000 | 登录页面 |

### 7.2 测试登录

1. 打开 http://localhost:3000
2. 使用默认账号登录（如果有初始数据）
3. 或注册新账号

### 7.3 一键检查脚本

```bash
# 在项目根目录执行
./scripts/dev.sh status
```

---

## 8. 常见问题

### Q1: `go: command not found`

**原因：** Go 未正确安装或未添加到 PATH

**解决：**
```bash
# 检查 Go 安装位置
which go || ls /usr/local/go/bin/go || ls /opt/homebrew/bin/go

# 添加到 PATH（根据实际位置）
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.zshrc
source ~/.zshrc
```

### Q2: `npm: command not found`

**原因：** Node.js 未正确安装

**解决：**
```bash
# macOS
brew install node@20

# 或使用 nvm（Node 版本管理器）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.zshrc
nvm install 20
nvm use 20
```

### Q3: PostgreSQL 连接失败

**错误信息：** `connection refused` 或 `role does not exist`

**解决：**
```bash
# 检查 PostgreSQL 是否运行
pg_isready

# 如果未运行，启动服务
# macOS:
brew services start postgresql@16

# Ubuntu:
sudo systemctl start postgresql

# 检查用户是否存在
psql postgres -c "\du"
```

### Q4: 端口被占用

**错误信息：** `address already in use`

**解决：**
```bash
# 查看占用端口的进程
lsof -i :8080  # 后端端口
lsof -i :3000  # 前端端口

# 终止进程
kill -9 <PID>
```

### Q5: 前端编译失败 - 内存不足

**错误信息：** `JavaScript heap out of memory`

**解决：**
```bash
# 增加 Node.js 内存限制
export NODE_OPTIONS="--max-old-space-size=4096"
npm start
```

### Q6: Go 依赖下载缓慢

**解决：** 使用国内代理
```bash
go env -w GOPROXY=https://goproxy.cn,direct
go mod download
```

### Q7: npm 安装缓慢

**解决：** 使用国内镜像
```bash
npm config set registry https://registry.npmmirror.com
npm install
```

---

## 9. 日常开发命令

### 快速启动（使用脚本）

```bash
# 查看帮助
./scripts/dev.sh help

# 启动所有服务（本地数据库模式）
./scripts/dev.sh local

# 查看服务状态
./scripts/dev.sh status

# 重启后端
./scripts/dev.sh restart-backend

# 重启前端
./scripts/dev.sh restart-frontend

# 停止所有服务
./scripts/dev.sh stop
```

### 单独启动服务

```bash
# 后端
cd backend && air

# 前端（新终端窗口）
cd frontend && npm start
```

### 数据库操作

```bash
# 连接数据库
PGPASSWORD="ai_dev_2024" psql -h localhost -U ai_dev -d ai_project_local

# 常用 SQL 命令
\dt          # 查看所有表
\d tablename # 查看表结构
\q           # 退出
```

### Git 操作

```bash
# 拉取最新代码
git pull origin main

# 查看修改
git status

# 提交修改
git add .
git commit -m "描述你的修改"
git push
```

---

## 附录：完整安装脚本

将以下内容保存为 `setup.sh` 并执行：

```bash
#!/bin/bash
# AI Project 一键安装脚本 (macOS)

set -e

echo "=== AI Project 本地环境安装 ==="

# 检查 Homebrew
if ! command -v brew &> /dev/null; then
    echo "安装 Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

# 安装依赖
echo "安装依赖..."
brew install git go node@20 postgresql@16

# 启动 PostgreSQL
echo "启动 PostgreSQL..."
brew services start postgresql@16

# 等待 PostgreSQL 启动
sleep 3

# 创建数据库
echo "配置数据库..."
createuser -s ai_dev 2>/dev/null || true
psql postgres -c "ALTER USER ai_dev WITH PASSWORD 'ai_dev_2024';" 2>/dev/null || true
createdb -O ai_dev ai_project_local 2>/dev/null || true

echo "=== 安装完成！==="
echo ""
echo "下一步："
echo "1. cd backend && cp .env.example .env"
echo "2. 编辑 backend/.env 设置 JWT_SECRET"
echo "3. cd backend && go run main.go"
echo "4. 新终端: cd frontend && npm install && npm start"
```

---

## 获取帮助

- **项目文档**: `docs/` 目录
- **API 文档**: http://localhost:8080/docs (启动后端后访问)
- **问题反馈**: 联系项目负责人或提交 Issue

---

**文档版本**: v1.0
**最后更新**: 2025-12-15
**适用项目版本**: main 分支最新版
