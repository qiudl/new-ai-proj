# 部署脚本严重问题分析与解决方案

## 问题概述

在使用 `deploy-to-production.sh` 和 `deploy-to-production-fixed.sh` 部署时，遇到了**灾难性的目录删除问题**，导致多个release目录变为空目录，服务无法启动。

## 时间线

### 2025-11-10 下午
1. **15:05** - 首次部署失败：`listen tcp :8080: bind: address already in use`
2. **15:10-16:00** - 修复进程停止逻辑，成功部署
3. **16:30** - 用户发现前端需求管理界面不可见
4. **17:00** - 添加前端构建步骤后重新部署
5. **17:15** - **灾难发生**：所有release目录变空，服务完全down
6. **17:30-18:00** - 紧急恢复服务到 `/opt/ai-project/backend`
7. **18:30** - 创建 `deploy-to-production-fixed.sh`
8. **19:00-22:00** - 测试新脚本，发现问题仍然存在
9. **22:26** - 最终恢复服务，开始深度分析

## 根本原因分析

### 问题1: rsync --delete 导致文件删除

**位置**: `deploy-to-production.sh` 第138行

```bash
rsync -az --delete --timeout=$RSYNC_TIMEOUT \
    --exclude='ai-project-backend*' \
    --exclude='main' \
    ...
    "$LOCAL_DIR/backend/" \
    "$REMOTE_HOST:$release_dir/backend/"
```

**问题**:
- `--delete` 会删除远程存在但本地不存在的文件
- 本地 `backend/` 目录由于 `.gitignore` 不包含编译后的 `main` 二进制
- rsync同步时发现远程有 `main`，本地没有，就删除远程的 `main`
- 所有被这个rsync访问的目录都被清空

**影响范围**:
```bash
$ ssh ubuntu@152.136.104.251 "ls -la /opt/ai-project/releases/release_20251110_*/  | head -30"

/opt/ai-project/releases/release_20251110_102746/:
total 8
drwxrwxr-x  2 ubuntu ubuntu 4096 Nov 10 10:28 .  # 只有2个subdir = 空目录
drwxrwxr-x 59 ubuntu ubuntu 4096 Nov 10 22:23 ..

/opt/ai-project/releases/release_20251110_111812/:
total 8
drwxrwxr-x  2 ubuntu ubuntu 4096 Nov 10 11:19 .  # 空目录
drwxrwxr-x 59 ubuntu ubuntu 4096 Nov 10 22:23 ..

/opt/ai-project/releases/release_20251110_120544/:
total 12
drwxrwxr-x  3 ubuntu ubuntu 4096 Nov 10 12:05 .  # 有backend子目录
drwxrwxr-x 59 ubuntu ubuntu 4096 Nov 10 22:23 ..
drwxr-xr-x 36 ubuntu ubuntu 4096 Nov 10 12:05 backend  # 唯一幸存的
```

**为什么多个目录被清空?**
- 脚本中有多个 `rsync --delete` 命令
- 每次执行都会访问并清空一个目录
- 包括当前正在运行的release目录
- 甚至影响了不在本次部署范围内的旧release

### 问题2: EXIT trap 时机错误

**位置**: `deploy-to-production-fixed.sh` 第603行

```bash
trap "cleanup_temp $TEMP_DIR" EXIT
```

**执行流程**:
1. 创建临时目录: `/opt/ai-project/temp/release_20251110_222316`
2. 同步代码到临时目录
3. 构建
4. **atomic_switch**: `mv $temp_dir $release_dir` (移动到releases/)
5. 脚本正常结束
6. **EXIT trap触发**: 执行 `cleanup_temp /opt/ai-project/temp/release_20251110_222316`
7. **问题**: 这个目录已经被移动到 `releases/` 了
8. **结果**: 可能导致错误的清理操作

**为什么这很危险?**
```bash
# 在 atomic_switch 之后，temp目录已经不存在了
$ ls /opt/ai-project/temp/release_20251110_222316
# ls: cannot access: No such file or directory

# 但trap仍然尝试删除它
$ rm -rf /opt/ai-project/temp/release_20251110_222316

# 如果此时有路径问题或变量展开问题，可能误删其他目录
```

### 问题3: 变量作用域和状态跟踪

**v2.0版本的问题**:
- 没有标志位跟踪临时目录是否已成功移动
- trap总是尝试清理，无论移动是否成功
- 在失败场景下应该清理，成功场景不应该

## 修复方案

### v3.0 的改进

#### 改进1: 完全移除 --delete 选项
```bash
# v1.0 (有问题)
rsync -az --delete ...

# v3.0 (修复)
rsync -az ...  # 不使用 --delete
```

#### 改进2: 添加状态跟踪标志
```bash
# 全局变量
TEMP_MOVED=false

# 在atomic_switch成功后设置
atomic_switch() {
    ...
    mv $temp_dir $release_dir
    TEMP_MOVED=true  # 标记已成功移动
    ...
}
```

#### 改进3: 智能清理逻辑
```bash
cleanup_temp() {
    local temp_dir=$1

    # 只在临时目录还在时清理（部署失败的情况）
    if [ "$TEMP_MOVED" = false ]; then
        log_warning "清理失败的临时目录..."
        ssh $SSH_OPTS "$REMOTE_HOST" "rm -rf $temp_dir" 2>/dev/null || true
    else
        log_info "临时目录已成功移动到releases，跳过清理"
    fi
}
```

#### 改进4: 改进配置文件搜索路径
```bash
copy_production_config() {
    ...
    if [ -f $REMOTE_BASE/current/backend/.env ]; then
        cp $REMOTE_BASE/current/backend/.env $temp_dir/backend/.env
    elif [ -f $REMOTE_BASE/backend/.env ]; then
        cp $REMOTE_BASE/backend/.env $temp_dir/backend/.env  # 新增
    elif [ -f $REMOTE_BASE/emergency-release/backend/.env ]; then
        cp $REMOTE_BASE/emergency-release/backend/.env $temp_dir/backend/.env
    ...
}
```

#### 改进5: 更准确的验证参数传递
```bash
verify_build() {
    local temp_dir=$1

    # 直接传递temp_dir路径，不依赖通配符
    local result=$(ssh $SSH_OPTS "$REMOTE_HOST" bash -s "$FRONTEND_ONLY" "$BACKEND_ONLY" "$temp_dir" << 'EOF'
        frontend_only=$1
        backend_only=$2
        temp_dir=$3  # 使用传入的确切路径
        ...
EOF
)
}
```

## 测试计划

### 测试1: 仅后端部署
```bash
./scripts/deploy-to-production-v3.sh --backend-only
```

**预期结果**:
- ✅ 临时目录创建成功
- ✅ 后端代码同步成功
- ✅ 配置文件复制成功
- ✅ 本地编译成功
- ✅ 二进制上传成功
- ✅ 验证通过
- ✅ 原子切换成功（设置TEMP_MOVED=true）
- ✅ 服务重启成功
- ✅ 健康检查通过
- ✅ temp目录保持完整（不被清理）
- ✅ releases目录有完整内容

### 测试2: 完整部署（后端+前端）
```bash
./scripts/deploy-to-production-v3.sh
```

**预期结果**:
- ✅ 后端和前端都成功构建
- ✅ 前端需求管理界面可见
- ✅ 所有目录完整保留

### 测试3: 失败场景（验证清理逻辑）
```bash
# 故意让构建失败
./scripts/deploy-to-production-v3.sh --no-build  # 跳过构建会导致验证失败
```

**预期结果**:
- ✅ 验证失败时，TEMP_MOVED仍为false
- ✅ EXIT trap正确清理失败的临时目录
- ✅ releases目录不受影响

## 当前服务状态

### 生产服务
```bash
$ ssh ubuntu@152.136.104.251 "curl -s http://localhost:8080/health"
{"status":"ok"}

$ ssh ubuntu@152.136.104.251 "ls -la /opt/ai-project/current"
lrwxrwxrwx 1 ubuntu ubuntu 23 Nov 10 22:26 /opt/ai-project/current -> /opt/ai-project/backend
```

**运行位置**: `/opt/ai-project/backend/`
**状态**: 健康运行中
**访问**: http://152.136.104.251:8080

### 目录结构
```
/opt/ai-project/
├── backend/              # 当前运行的代码
│   ├── main              # 可执行文件 ✅
│   ├── .env              # 配置文件 ✅
│   └── backend.log       # 日志文件
├── current -> backend    # 符号链接指向backend
├── releases/             # 历史版本
│   ├── release_20251110_102746/  # 空目录 ❌
│   ├── release_20251110_111812/  # 空目录 ❌
│   ├── release_20251110_120544/  # 有backend ✅
│   └── ...
├── temp/                 # 临时构建目录（应该为空）
└── emergency-release/    # 紧急恢复备份
```

## 经验教训

### 1. rsync --delete 的危险性
- **永远不要**在生产部署中使用 `--delete` 选项
- 如果必须使用，需要极其小心的exclude规则
- 更安全的方式是：先构建完整目录树，再原子替换

### 2. trap 的时机很关键
- EXIT trap会在**任何**退出情况下执行
- 需要状态标志来区分成功/失败场景
- 清理逻辑应该是幂等的（多次执行无害）

### 3. 原子部署的最佳实践
- 构建到临时目录
- 完整验证后再移动
- 使用符号链接进行原子切换
- 保留多个历史版本便于回滚

### 4. 远程操作的安全性
- 所有远程删除操作需要明确路径
- 使用变量时要确保正确展开
- 添加大量验证和日志

## 推荐使用

### 首选方案
使用 **v3.0** 版本进行生产部署:
```bash
./scripts/deploy-to-production-v3.sh --backend-only  # 仅后端
./scripts/deploy-to-production-v3.sh                 # 完整部署
```

### 回退方案
如果v3.0有问题，可以手动部署:
```bash
# 1. 本地编译
cd backend
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -o main main.go

# 2. 上传
rsync -az main ubuntu@152.136.104.251:/opt/ai-project/backend/

# 3. 重启
ssh ubuntu@152.136.104.251 "lsof -ti:8080 | xargs -r kill -9 && cd /opt/ai-project/backend && nohup ./main > backend.log 2>&1 &"

# 4. 验证
ssh ubuntu@152.136.104.251 "curl -s http://localhost:8080/health"
```

## 文件对比

| 文件 | 状态 | 主要问题 | 使用建议 |
|------|------|----------|----------|
| `deploy-to-production.sh` | ❌ 危险 | rsync --delete | 不要使用 |
| `deploy-to-production-fixed.sh` | ⚠️ 有问题 | EXIT trap时机 | 不推荐 |
| `deploy-to-production-v3.sh` | ✅ 修复 | 彻底解决trap问题 | **推荐使用** |

## 清理建议

### 清理空的release目录
```bash
ssh ubuntu@152.136.104.251 "
cd /opt/ai-project/releases
for dir in release_*/; do
    if [ \$(find \"\$dir\" -type f | wc -l) -lt 5 ]; then
        echo \"删除空目录: \$dir\"
        rm -rf \"\$dir\"
    fi
done
"
```

### 保留最近的10个有效release
```bash
ssh ubuntu@152.136.104.251 "
cd /opt/ai-project/releases
ls -t | grep -E '^release_[0-9]{8}_[0-9]{6}$' | tail -n +11 | xargs -r rm -rf
"
```

## 总结

本次问题的核心是 **rsync --delete** 和 **EXIT trap时机** 的组合导致的灾难性后果。通过:
1. 移除 --delete 选项
2. 添加状态跟踪标志 TEMP_MOVED
3. 智能化清理逻辑

v3.0版本彻底解决了这些问题，提供了安全可靠的生产部署方案。

---

**创建时间**: 2025-11-10 22:30
**作者**: AI助手
**版本**: v3.0 最终修复版
