#!/bin/bash

# 在生产服务器上手动初始化Git仓库
# 解决自动化部署时Git clone网络超时问题

set -e

echo "════════════════════════════════════════════════════════"
echo "🔧 生产服务器Git仓库初始化脚本"
echo "════════════════════════════════════════════════════════"
echo ""

# 读取SSH配置
source ~/.ai-proj-tunnel.env 2>/dev/null || {
    echo "❌ 未找到SSH配置文件: ~/.ai-proj-tunnel.env"
    echo "请确保文件存在并包含以下内容:"
    echo "  PROD_SSH_HOST=your-server"
    echo "  PROD_SSH_USER=your-user"
    echo "  PROD_SSH_KEY=path-to-key"
    exit 1
}

if [ -z "$PROD_SSH_HOST" ] || [ -z "$PROD_SSH_USER" ]; then
    echo "❌ SSH配置不完整"
    echo "请设置 PROD_SSH_HOST 和 PROD_SSH_USER"
    exit 1
fi

echo "📡 连接信息:"
echo "  服务器: $PROD_SSH_USER@$PROD_SSH_HOST"
echo ""

# SSH密钥参数
SSH_KEY_PARAM=""
if [ -n "$PROD_SSH_KEY" ]; then
    SSH_KEY_PARAM="-i $PROD_SSH_KEY"
fi

echo "🚀 开始在生产服务器上初始化Git仓库..."
echo ""

# 执行远程命令
ssh $SSH_KEY_PARAM \
    -o StrictHostKeyChecking=no \
    -o ServerAliveInterval=60 \
    -o ServerAliveCountMax=10 \
    -o TCPKeepAlive=yes \
    $PROD_SSH_USER@$PROD_SSH_HOST << 'REMOTE_SCRIPT'

set -e

DEPLOY_DIR="/opt/ai-project-cicd"
GIT_REPO="https://github.com/qiudl/new-ai-proj.git"
BRANCH="main"

echo "════════════════════════════════════════════════════════"
echo "📁 步骤1: 准备部署目录"
echo "════════════════════════════════════════════════════════"

# 创建部署目录
mkdir -p "$DEPLOY_DIR"
cd "$DEPLOY_DIR"

# 检查是否已经是Git仓库
if [ -d ".git" ]; then
    echo "✓ Git仓库已存在"
    echo ""
    echo "📋 当前仓库信息:"
    git remote -v
    git branch
    echo ""

    read -p "是否要重新克隆仓库? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "📥 更新现有仓库..."
        git fetch origin
        git reset --hard origin/$BRANCH
        git pull origin $BRANCH
        echo ""
        echo "✅ 仓库更新完成!"
        exit 0
    fi

    echo "⚠️  删除现有仓库..."
    cd ..
    rm -rf "$DEPLOY_DIR"
    mkdir -p "$DEPLOY_DIR"
    cd "$DEPLOY_DIR"
fi

echo ""
echo "════════════════════════════════════════════════════════"
echo "📥 步骤2: 克隆仓库 (使用浅克隆减少数据传输)"
echo "════════════════════════════════════════════════════════"
echo ""

# 使用浅克隆,只拉取最近的提交历史
echo "⏳ 开始克隆 (depth=1, 只获取最新版本)..."
echo "   仓库: $GIT_REPO"
echo "   分支: $BRANCH"
echo ""

# 尝试克隆,最多重试3次
MAX_RETRIES=3
for i in $(seq 1 $MAX_RETRIES); do
    echo "📡 尝试 $i/$MAX_RETRIES..."

    if git clone --depth 1 -b $BRANCH $GIT_REPO . ; then
        echo ""
        echo "✅ 仓库克隆成功!"
        break
    else
        echo ""
        echo "❌ 克隆失败"

        if [ $i -lt $MAX_RETRIES ]; then
            echo "⏳ 10秒后重试..."
            sleep 10

            # 清理失败的克隆
            rm -rf .git 2>/dev/null || true
            rm -rf * .[!.]* 2>/dev/null || true
        else
            echo ""
            echo "❌ 克隆失败,已达到最大重试次数"
            echo ""
            echo "💡 建议:"
            echo "  1. 检查网络连接"
            echo "  2. 尝试配置GitHub代理"
            echo "  3. 使用国内Git镜像服务"
            exit 1
        fi
    fi
done

echo ""
echo "════════════════════════════════════════════════════════"
echo "📋 步骤3: 验证仓库信息"
echo "════════════════════════════════════════════════════════"
echo ""

# 显示当前版本
echo "📌 当前版本:"
git log -1 --oneline
echo ""

# 显示仓库状态
echo "📊 仓库状态:"
git status
echo ""

# 显示目录结构
echo "📂 主要目录:"
ls -la | head -20
echo ""

echo "════════════════════════════════════════════════════════"
echo "✅ Git仓库初始化完成!"
echo "════════════════════════════════════════════════════════"
echo ""
echo "📍 仓库位置: $DEPLOY_DIR"
echo "🌿 当前分支: $(git branch --show-current)"
echo "📝 最新提交: $(git log -1 --oneline)"
echo ""
echo "💡 后续部署将使用 'git pull' 快速更新代码"
echo ""

REMOTE_SCRIPT

echo ""
echo "════════════════════════════════════════════════════════"
echo "🎉 操作完成!"
echo "════════════════════════════════════════════════════════"
echo ""
echo "下一步:"
echo "  1. ✅ Git仓库已在生产服务器上初始化完成"
echo "  2. 📝 后续可以触发自动化部署workflow"
echo "  3. 🚀 部署将使用 'git pull' 快速更新 (几秒钟)"
echo ""
