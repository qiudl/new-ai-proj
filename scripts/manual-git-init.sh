#!/bin/bash

# 手动在生产服务器上初始化Git仓库
# 解决自动化CI/CD中Git clone网络超时问题
#
# 使用方法:
#   1. SSH登录生产服务器
#   2. 执行此脚本: bash manual-git-init.sh
#   3. 脚本会自动重试，直到成功

set -e

echo "════════════════════════════════════════════════════════"
echo "🔧 生产服务器Git仓库手动初始化脚本"
echo "════════════════════════════════════════════════════════"
echo ""
echo "此脚本将："
echo "  1. 创建部署目录 /opt/ai-project-cicd"
echo "  2. 克隆Git仓库（使用浅克隆减少数据量）"
echo "  3. 自动重试直到成功"
echo ""
echo "初始化成功后，CI/CD部署将只需几秒钟！"
echo ""
read -p "按Enter继续..."

DEPLOY_DIR="/opt/ai-project-cicd"
GIT_REPO="https://github.com/qiudl/new-ai-proj.git"
BRANCH="main"

echo ""
echo "════════════════════════════════════════════════════════"
echo "📁 步骤1: 准备部署目录"
echo "════════════════════════════════════════════════════════"

# 创建部署目录
sudo mkdir -p "$DEPLOY_DIR"
sudo chown -R $USER:$USER "$DEPLOY_DIR"
cd "$DEPLOY_DIR"

echo "✓ 部署目录已准备: $DEPLOY_DIR"
echo "✓ 当前用户: $USER 拥有目录权限"

# 检查是否已经是Git仓库
if [ -d ".git" ]; then
    echo ""
    echo "⚠️  检测到已存在Git仓库"
    echo ""
    echo "当前仓库信息:"
    git remote -v
    git branch
    echo ""
    echo "最新提交: $(git log -1 --oneline)"
    echo ""

    read -p "是否要更新现有仓库? (Y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        echo "📥 更新现有仓库..."
        git fetch origin
        git reset --hard origin/$BRANCH
        git pull origin $BRANCH
        echo ""
        echo "✅ 仓库更新完成!"
        echo "📋 当前版本: $(git log -1 --oneline)"
        exit 0
    else
        echo "跳过更新"
        exit 0
    fi
fi

echo ""
echo "════════════════════════════════════════════════════════"
echo "📥 步骤2: 克隆仓库（浅克隆 + 自动重试）"
echo "════════════════════════════════════════════════════════"
echo ""
echo "提示: 由于网络限制，可能需要多次尝试"
echo "      脚本会自动重试，请耐心等待..."
echo ""

# 配置Git以提高成功率
git config --global http.postBuffer 524288000  # 500MB buffer
git config --global http.lowSpeedLimit 1000    # 1KB/s
git config --global http.lowSpeedTime 600      # 超时时间10分钟

# 无限重试，直到成功
RETRY_COUNT=0
RETRY_DELAY=10

while true; do
    RETRY_COUNT=$((RETRY_COUNT + 1))

    echo ""
    echo "════════════════════════════════════════════════════════"
    echo "📡 尝试 #$RETRY_COUNT - $(date '+%H:%M:%S')"
    echo "════════════════════════════════════════════════════════"
    echo "仓库: $GIT_REPO"
    echo "分支: $BRANCH"
    echo "方式: 浅克隆 (--depth 1)"
    echo ""

    # 尝试克隆
    if git clone --depth 1 -b $BRANCH $GIT_REPO . ; then
        echo ""
        echo "════════════════════════════════════════════════════════"
        echo "🎉 仓库克隆成功！"
        echo "════════════════════════════════════════════════════════"
        break
    else
        echo ""
        echo "❌ 尝试 #$RETRY_COUNT 失败"
        echo ""

        # 清理失败的克隆
        echo "🧹 清理失败的文件..."
        rm -rf .git 2>/dev/null || true
        rm -rf * .[!.]* 2>/dev/null || true

        echo "⏳ ${RETRY_DELAY}秒后重试..."
        echo ""
        echo "💡 提示："
        echo "  - 如果持续失败，可以考虑使用Git代理"
        echo "  - 或者在网络较好的时段（如凌晨）重试"
        echo "  - 按 Ctrl+C 可随时中止"
        echo ""

        sleep $RETRY_DELAY

        # 每5次失败后，增加延迟时间
        if [ $((RETRY_COUNT % 5)) -eq 0 ]; then
            RETRY_DELAY=$((RETRY_DELAY + 5))
            echo "⚠️  已尝试 $RETRY_COUNT 次，延迟时间增加到 ${RETRY_DELAY}秒"
        fi
    fi
done

echo ""
echo "════════════════════════════════════════════════════════"
echo "📋 步骤3: 验证仓库"
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

# 显示主要文件
echo "📂 主要文件/目录:"
ls -la | head -20
echo ""

# 显示仓库大小
echo "💾 仓库大小:"
du -sh .
echo ""

echo "════════════════════════════════════════════════════════"
echo "✅ Git仓库初始化完成！"
echo "════════════════════════════════════════════════════════"
echo ""
echo "📍 仓库位置: $DEPLOY_DIR"
echo "🌿 当前分支: $(git branch --show-current)"
echo "📝 最新提交: $(git log -1 --oneline)"
echo ""
echo "🚀 后续部署说明:"
echo "  1. 在GitHub Actions中触发部署workflow"
echo "  2. 部署将自动使用 'git pull' 更新代码（只需几秒）"
echo "  3. 然后在服务器本地构建Docker镜像"
echo "  4. 整个部署过程预计 5-10分钟"
echo ""
echo "💡 测试部署:"
echo "  可以执行: bash $DEPLOY_DIR/scripts/deploy-on-server.sh"
echo ""
