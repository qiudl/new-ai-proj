# 生产环境部署指南 v3.0

## 快速开始

### 推荐方式：使用部署脚本

```bash
# 完整部署（后端 + 前端）
./scripts/deploy-to-production.sh

# 仅部署后端
./scripts/deploy-to-production.sh --backend-only

# 仅部署前端
./scripts/deploy-to-production.sh --frontend-only

# 模拟运行（不实际部署）
./scripts/deploy-to-production.sh --dry-run
```

## 部署选项

| 选项 | 说明 |
|------|------|
| `--backend-only` | 仅部署后端服务 |
| `--frontend-only` | 仅部署前端资源 |
| `--no-build` | 跳过构建步骤（使用已有的构建产物） |
| `--no-restart` | 跳过服务重启 |
| `--dry-run` | 模拟运行，不实际执行 |
| `--help` | 显示帮助信息 |

## 部署流程

### 自动化流程（推荐）

1. **本地开发完成** → 提交代码到git
2. **执行部署脚本**
   ```bash
   ./scripts/deploy-to-production-v3.sh --backend-only
   ```
3. **脚本自动完成**:
   - ✅ 检查SSH连接
   - ✅ 创建临时构建目录
   - ✅ 同步代码到服务器
   - ✅ 复制生产配置（.env）
   - ✅ 编译后端（本地交叉编译）
   - ✅ 上传二进制文件
   - ✅ 构建前端（远程npm build）
   - ✅ 验证构建产物
   - ✅ 原子切换到新版本
   - ✅ 重启服务
   - ✅ 健康检查
   - ✅ 清理临时文件

### 手动部署（备用方案）

如果自动化脚本失败，可以手动部署：

```bash
# 1. 本地编译后端
cd /Users/johnqiu/coding/www/projects/new-ai-proj/backend
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -o main main.go

# 2. 上传到服务器
rsync -az main ubuntu@152.136.104.251:/opt/ai-project/backend/

# 3. 重启服务
ssh ubuntu@152.136.104.251 "lsof -ti:8080 | xargs -r kill -9 2>/dev/null || true && cd /opt/ai-project/backend && nohup ./main > backend.log 2>&1 &"

# 4. 验证服务
sleep 5
ssh ubuntu@152.136.104.251 "curl -s http://localhost:8080/health"
```

## 常见场景

### 场景1: 快速修复后端bug

```bash
# 修改代码后，仅部署后端
./scripts/deploy-to-production.sh --backend-only
```

**预计时间**: 2-3分钟
- 编译: 30秒
- 上传: 10秒
- 重启验证: 30秒

### 场景2: 更新前端界面

```bash
# 修改前端代码后，仅部署前端
./scripts/deploy-to-production.sh --frontend-only
```

**预计时间**: 5-8分钟
- npm install: 2-3分钟
- npm build: 2-3分钟
- 部署: 30秒

### 场景3: 完整版本发布

```bash
# 前后端都有更新
./scripts/deploy-to-production.sh
```

**预计时间**: 8-10分钟

### 场景4: 紧急回滚

```bash
# 回滚到上一个版本
ssh ubuntu@152.136.104.251 "
    ln -snf \$(readlink /opt/ai-project/previous) /opt/ai-project/current
    lsof -ti:8080 | xargs -r kill -9 2>/dev/null || true
    cd /opt/ai-project/current/backend
    nohup ./main > backend.log 2>&1 &
"

# 验证
ssh ubuntu@152.136.104.251 "curl -s http://localhost:8080/health"
```

## 验证部署结果

### 1. 健康检查

```bash
# 直接访问服务器
ssh ubuntu@152.136.104.251 "curl -s http://localhost:8080/health"

# 预期输出
{
  "status": "ok",
  "message": "Service is healthy",
  "service": "ai-project-backend",
  "timestamp": "2025-11-10T14:38:26Z"
}
```

### 2. 查看服务日志

```bash
# 实时查看日志
ssh ubuntu@152.136.104.251 "tail -f /opt/ai-project/current/backend/backend.log"

# 查看最近100行
ssh ubuntu@152.136.104.251 "tail -100 /opt/ai-project/current/backend/backend.log"

# 搜索错误
ssh ubuntu@152.136.104.251 "grep -i error /opt/ai-project/current/backend/backend.log | tail -20"
```

### 3. 检查进程状态

```bash
# 查看进程
ssh ubuntu@152.136.104.251 "ps aux | grep '[m]ain'"

# 查看端口监听
ssh ubuntu@152.136.104.251 "lsof -i:8080"
```

### 4. 验证前端

```bash
# 测试API（从外部访问）
curl -s http://152.136.104.251:8080/health

# 如果有域名
curl -s https://your-domain.com/api/v1/health
```

## 故障排查

### 问题1: 服务启动失败

**症状**:
```
[ERROR] 服务启动失败
[ERROR] 健康检查失败
```

**排查步骤**:
```bash
# 1. 查看日志
ssh ubuntu@152.136.104.251 "tail -50 /opt/ai-project/current/backend/backend.log"

# 2. 检查配置文件
ssh ubuntu@152.136.104.251 "cat /opt/ai-project/current/backend/.env | grep -v PASSWORD"

# 3. 检查端口占用
ssh ubuntu@152.136.104.251 "lsof -i:8080"

# 4. 手动启动测试
ssh ubuntu@152.136.104.251 "cd /opt/ai-project/current/backend && ./main"
```

**常见原因**:
- ❌ 端口被占用 → 强制停止旧进程: `lsof -ti:8080 | xargs kill -9`
- ❌ 配置文件缺失 → 检查 `.env` 文件是否存在
- ❌ 数据库连接失败 → 检查数据库配置和网络
- ❌ 权限问题 → `chmod +x main`

### 问题2: 前端构建失败

**症状**:
```
[ERROR] 前端构建失败
ERROR: 构建目录不存在
```

**排查步骤**:
```bash
# 1. 检查Node.js环境
ssh ubuntu@152.136.104.251 "node -v && npm -v"

# 2. 手动构建测试
ssh ubuntu@152.136.104.251 "
    cd /opt/ai-project/temp/release_*/frontend
    npm install --legacy-peer-deps
    CI=false npm run build
"

# 3. 查看构建日志
ssh ubuntu@152.136.104.251 "ls -la /opt/ai-project/temp/release_*/frontend/"
```

**常见原因**:
- ❌ Node.js版本不兼容 → 升级到Node 18+
- ❌ npm install失败 → 检查网络和package.json
- ❌ 内存不足 → 增加swap或服务器内存

### 问题3: 部署后前端界面不更新

**原因**: 浏览器缓存

**解决方案**:
```bash
# 1. 清理浏览器缓存（Ctrl+Shift+R 或 Cmd+Shift+R）

# 2. 检查Nginx配置（如果使用Nginx）
ssh ubuntu@152.136.104.251 "cat /etc/nginx/sites-enabled/ai-project"

# 3. 添加缓存控制头
# 在Nginx配置中添加:
# add_header Cache-Control "no-cache, no-store, must-revalidate";
```

## 最佳实践

### 1. 部署前准备

- ✅ 本地测试通过
- ✅ 运行单元测试: `go test ./...`
- ✅ 前端类型检查: `npm run type-check`
- ✅ 提交所有更改到git
- ✅ 创建git tag: `git tag v1.2.3`

### 2. 部署时机

- ✅ 选择低流量时段（如凌晨或周末）
- ✅ 通知团队成员
- ✅ 准备回滚方案
- ✅ 监控系统指标

### 3. 部署后验证

- ✅ 健康检查通过
- ✅ 关键功能测试（登录、核心API）
- ✅ 查看日志无严重错误
- ✅ 监控服务指标（CPU、内存、响应时间）
- ✅ 保持监控15-30分钟

### 4. 版本管理

```bash
# 查看所有版本
ssh ubuntu@152.136.104.251 "ls -lt /opt/ai-project/releases/ | head -10"

# 查看当前版本
ssh ubuntu@152.136.104.251 "readlink /opt/ai-project/current"

# 查看上一个版本
ssh ubuntu@152.136.104.251 "readlink /opt/ai-project/previous"
```

### 5. 定期清理

```bash
# 清理空的release目录
ssh ubuntu@152.136.104.251 "
cd /opt/ai-project/releases
for dir in release_*/; do
    if [ \$(find \"\$dir\" -type f | wc -l) -lt 5 ]; then
        echo \"删除空目录: \$dir\"
        rm -rf \"\$dir\"
    fi
done
"

# 保留最近10个有效版本
ssh ubuntu@152.136.104.251 "
cd /opt/ai-project/releases
ls -t | grep -E '^release_[0-9]{8}_[0-9]{6}$' | tail -n +11 | xargs -r rm -rf
"
```

## 脚本版本说明

当前部署脚本 **`deploy-to-production.sh`** 是v5.0版本，经过多次实战测试，已彻底修复所有已知问题:

### v5.0 新增功能（2025-11-11）
- ✅ **部署锁机制** - 防止并发部署导致文件冲突和丢失
- ✅ **三步验证** - mv前验证、mv后验证、最终验证，确保文件完整性
- ✅ **详细日志** - 记录每步的文件数量，便于问题追溯
- ✅ **智能锁超时** - 自动清理30分钟以上的过期锁
- ✅ **改进heredoc参数传递** - 修复bash heredoc参数传递问题

### 历史版本修复
- ✅ v4.0 - 修复 frontend-only 模式错误创建新release的问题
- ✅ v3.0 - 彻底修复 trap 时机问题,添加状态跟踪
- ✅ v2.0 - 移除 rsync --delete，但仍有EXIT trap问题
- ❌ v1.0 - 有 rsync --delete bug（已删除）

### 测试验证
- ✅ 2025-11-11 backend-only 部署成功
- ✅ 文件完整性验证通过（1545个文件）
- ✅ 服务健康检查通过
- ✅ 部署锁机制工作正常

## 紧急联系

如果遇到严重问题无法解决:

1. **立即回滚** (参考"场景4: 紧急回滚")
2. **查看文档**: `/docs/deployment-issue-analysis.md`
3. **检查健康**: `ssh ubuntu@152.136.104.251 "curl -s http://localhost:8080/health"`
4. **联系团队**: 通知技术负责人

## 服务器信息

- **主机**: ubuntu@152.136.104.251
- **部署目录**: /opt/ai-project
- **服务端口**: 8080
- **日志位置**: /opt/ai-project/current/backend/backend.log
- **配置文件**: /opt/ai-project/current/backend/.env

## 相关文档

- [部署问题分析](../docs/deployment-issue-analysis.md) - 详细的问题分析和解决方案
- [CLAUDE.md](../CLAUDE.md) - 项目开发指南
- [README.md](../README.md) - 项目说明

---

**版本**: v3.0
**更新时间**: 2025-11-10
**维护者**: 开发团队
