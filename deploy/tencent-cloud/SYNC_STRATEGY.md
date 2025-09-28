# 代码同步到腾讯云服务器方案

## 项目分析

### 项目结构
```
new-ai-proj/
├── backend/          # Go 1.23 后端 (Gin + GORM + PostgreSQL)
├── frontend/         # React 18 + TypeScript + Ant Design 前端
├── database/         # 数据库相关文件
├── deploy/           # 部署配置
├── mcp-task-bridge/  # MCP任务桥接服务
└── scripts/          # 各种脚本
```

### 技术栈
- **后端**: Go 1.23, Gin, GORM, PostgreSQL, Redis, JWT
- **前端**: React 18, TypeScript, Ant Design, React Query
- **数据库**: PostgreSQL
- **缓存**: Redis
- **容器**: Docker + Docker Compose

## 同步策略对比

### 方案1: rsync (推荐)
**优点**:
- 增量同步，只传输变化的文件
- 支持排除文件/目录
- 速度快，带宽消耗少
- 支持断点续传
- 可以保持文件权限和时间戳

**缺点**:
- 需要SSH访问
- 不保留版本历史

**适用场景**: 开发部署、热更新

### 方案2: Git (版本控制)
**优点**:
- 完整版本控制
- 支持分支管理
- 可回滚到任意版本
- 适合团队协作

**缺点**:
- 需要处理.git目录
- 传输整个仓库
- 需要在服务器上配置Git

**适用场景**: 生产发布、版本管理

### 方案3: SCP/SFTP (简单直接)
**优点**:
- 简单直接
- 不需要额外配置
- 支持单个文件传输

**缺点**:
- 每次都是全量传输
- 不支持增量同步
- 效率较低

**适用场景**: 一次性部署、小文件传输

## 推荐方案: 混合策略

### 开发阶段 - 使用 rsync
```bash
# 同步源码（排除不需要的文件）
rsync -avz --delete \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='tmp' \
  --exclude='*.log' \
  --exclude='build' \
  --exclude='dist' \
  ./ ubuntu@服务器IP:/opt/ai-project/
```

### 生产部署 - 使用 Git
```bash
# 在服务器上拉取最新代码
git pull origin main
# 或者 clone 最新版本
git clone https://github.com/用户名/项目名.git
```

## 同步配置

### 需要同步的目录
- `backend/` - Go 后端源码
- `frontend/` - React 前端源码  
- `database/` - 数据库迁移文件
- `deploy/tencent-cloud/` - 部署配置
- `scripts/` - 部署脚本
- `.env.prod` - 生产环境配置

### 需要排除的文件/目录
```
.git/
node_modules/
tmp/
*.log
build/
dist/
coverage/
.DS_Store
*.swp
*.swo
backend/ai-project-backend  # 编译后的二进制文件
backend/main                # 编译后的二进制文件
frontend/build/             # 前端构建产物
```

## 安全考虑

1. **SSH密钥认证**: 使用SSH密钥而不是密码
2. **最小权限原则**: 只同步必要的文件
3. **环境变量分离**: 敏感信息通过环境变量管理
4. **备份策略**: 同步前先备份服务器上的代码

## 自动化同步脚本

### 本地到服务器同步脚本
```bash
#!/bin/bash
# deploy.sh - 本地开发代码同步到服务器

SERVER_IP="your-server-ip"
SERVER_USER="ubuntu"
REMOTE_PATH="/opt/ai-project"
LOCAL_PATH="/Users/johnqiu/coding/www/projects/new-ai-proj"

# 同步代码
rsync -avz --delete \
  --exclude-from=.syncignore \
  $LOCAL_PATH/ $SERVER_USER@$SERVER_IP:$REMOTE_PATH/

# 重新构建和部署
ssh $SERVER_USER@$SERVER_IP "cd $REMOTE_PATH && ./scripts/deploy.sh"
```

### 生产发布脚本
```bash
#!/bin/bash
# release.sh - Git方式发布到生产环境

# 打标签
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0

# 在服务器上拉取最新代码
ssh ubuntu@server-ip "cd /opt/ai-project && git fetch --tags && git checkout v1.0.0"
```

## 实施步骤

1. **准备SSH密钥**: 配置无密码SSH访问
2. **创建同步脚本**: 基于rsync的增量同步
3. **创建排除文件**: .syncignore文件定义排除规则
4. **测试同步**: 小范围测试同步功能
5. **自动化集成**: 集成到CI/CD流程

## 监控和日志

- 记录同步日志
- 监控同步状态
- 失败时发送告警
- 提供回滚机制