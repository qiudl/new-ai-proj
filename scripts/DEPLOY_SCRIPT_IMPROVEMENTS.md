# 生产部署脚本改进说明

## 修改时间
2025-11-10

## 问题描述
原始的 `deploy-to-production.sh` 脚本假设远程服务器上已安装 Go 编译环境，这在某些情况下可能不适用：
- 远程服务器可能没有安装 Go
- 远程服务器的 Go 版本可能不符合要求
- 在远程服务器编译可能速度较慢

## 解决方案

### 智能编译策略
脚本现在采用三层降级策略，自动选择最佳的编译方式：

```
┌──────────────────────────┐
│  1. 本地 Go 编译         │ ← 最快，优先使用
│  GOOS=linux GOARCH=amd64 │
└────────────┬─────────────┘
             │ 失败或不可用
             ↓
┌──────────────────────────┐
│  2. Docker 编译          │ ← 推荐，无需本地 Go
│  golang:1.24.0-alpine    │
└────────────┬─────────────┘
             │ 失败或不可用
             ↓
┌──────────────────────────┐
│  3. 远程服务器编译       │ ← 降级方案
│  SSH + go build          │
└──────────────────────────┘
```

### 新增功能

#### 1. 本地 Go 编译 (`build_backend_local`)
- 检测本地 Go 环境
- 使用交叉编译：`GOOS=linux GOARCH=amd64 CGO_ENABLED=0`
- 编译速度最快
- 编译成功后上传到服务器

```bash
# 示例输出
[INFO] 在本地使用 Go 构建后端...
[INFO] 使用本地 Go 编译器: go version go1.24.0 darwin/arm64
[INFO] 目标平台: Linux AMD64
[INFO] 开始编译...
[SUCCESS] 本地编译完成: 45M
```

#### 2. Docker 编译 (`build_backend_docker`)
- 使用官方 Go Docker 镜像
- 不需要本地安装 Go
- 跨平台支持（macOS/Windows/Linux）
- 环境一致性保证

```bash
# 使用的 Docker 命令
docker run --rm \
  -v "$LOCAL_DIR/backend:/app" \
  -w /app \
  golang:1.24.0-alpine \
  sh -c "go mod download && GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -v -o main main.go"
```

#### 3. 远程编译改进 (`build_backend_remote`)
- 保留原有远程编译功能
- 增加依赖下载步骤：`go mod download`
- 更详细的错误日志
- 超时保护机制

#### 4. 二进制文件上传 (`upload_binary`)
- 使用 rsync 高效传输
- 自动设置执行权限
- 上传成功后清理本地文件
- 详细的进度提示

### 优势对比

| 编译方式 | 速度 | 环境要求 | 推荐度 |
|---------|------|---------|--------|
| 本地 Go | ⭐⭐⭐⭐⭐ | Go 1.24+ | ⭐⭐⭐⭐⭐ |
| Docker  | ⭐⭐⭐⭐ | Docker | ⭐⭐⭐⭐⭐ |
| 远程编译 | ⭐⭐⭐ | 远程有 Go | ⭐⭐⭐ |

### 使用示例

#### 场景1: 本地有 Go 环境
```bash
# 自动使用本地 Go 编译，速度最快
./scripts/deploy-to-production.sh

# 输出:
# [INFO] 开始构建后端...
# [INFO] 编译策略: 本地Go → Docker → 远程服务器
# [INFO] 在本地使用 Go 构建后端...
# [SUCCESS] 使用本地 Go 编译成功
# [SUCCESS] 后端构建完成（本地编译）
```

#### 场景2: 本地有 Docker（没有 Go）
```bash
# 自动降级到 Docker 编译
./scripts/deploy-to-production.sh

# 输出:
# [WARNING] 本地 Go 编译失败或不可用
# [INFO] 使用 Docker 编译后端...
# [SUCCESS] 使用 Docker 编译成功
# [SUCCESS] 后端构建完成（Docker编译）
```

#### 场景3: 本地既没有 Go 也没有 Docker
```bash
# 降级到远程编译（需要远程有 Go）
./scripts/deploy-to-production.sh

# 输出:
# [WARNING] 本地 Go 编译失败或不可用
# [WARNING] Docker 编译失败或不可用
# [INFO] 尝试在远程服务器编译...
# [SUCCESS] 后端构建完成（远程编译）
```

#### 场景4: 所有方式都不可用
```bash
# 提供详细的解决方案
./scripts/deploy-to-production.sh

# 输出:
# [ERROR] 所有编译方式都失败了！
# [ERROR] 请检查以下内容：
# [ERROR]   1. 本地安装 Go 编译器: brew install go
# [ERROR]   2. 或安装 Docker: brew install docker
# [ERROR]   3. 或确保远程服务器安装了 Go
```

### 其他改进

1. **更新帮助信息**
   - 添加编译策略说明
   - 明确系统要求
   - 提供更多使用示例

2. **错误处理增强**
   - 每个编译方式独立的错误处理
   - 自动降级到下一个可用方式
   - 详细的错误提示和解决方案

3. **日志输出优化**
   - 清晰标注使用的编译方式
   - 显示编译后的文件大小
   - 进度信息更加详细

## 系统要求

### 本地环境（推荐以下至少一项）
- ✅ Go 1.24.0+ (最快)
- ✅ Docker (推荐，环境一致性最好)

### 远程服务器
- 如果本地无 Go/Docker，远程需要 Go 环境
- PostgreSQL 数据库服务
- 必要的系统工具 (curl, netstat/ss 等)

## 测试建议

```bash
# 1. 测试帮助信息
./scripts/deploy-to-production.sh --help

# 2. 模拟运行
./scripts/deploy-to-production.sh --dry-run

# 3. 仅编译不部署（验证编译功能）
cd backend
GOOS=linux GOARCH=amd64 go build -v -o main main.go
ls -lh main
rm main

# 4. 测试 Docker 编译
docker run --rm \
  -v "$PWD/backend:/app" \
  -w /app \
  golang:1.24.0-alpine \
  sh -c "go mod download && GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -v -o main main.go"
```

## 向后兼容性
✅ 完全向后兼容，现有使用方式不受影响
✅ 所有原有参数和功能保持不变
✅ 仅增强编译策略，不破坏现有流程

## 文件变更
- `scripts/deploy-to-production.sh`: 主要改进文件
- `scripts/DEPLOY_SCRIPT_IMPROVEMENTS.md`: 本说明文档（新增）

## 相关命令

```bash
# 安装 Go（macOS）
brew install go

# 安装 Docker（macOS）
brew install --cask docker

# 验证安装
go version
docker --version

# 查看脚本语法
bash -n scripts/deploy-to-production.sh

# 查看编译策略
./scripts/deploy-to-production.sh --help
```
