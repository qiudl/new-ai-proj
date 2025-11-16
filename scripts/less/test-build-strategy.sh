#!/bin/bash

###############################################################################
# 测试编译策略选择脚本
# 用于演示 deploy-to-production.sh 的智能编译策略
###############################################################################

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "============================================"
echo "🧪 测试编译策略选择"
echo "============================================"
echo ""

# 1. 检查本地 Go 环境
echo -e "${BLUE}[检查 1]${NC} 本地 Go 环境"
if command -v go &> /dev/null; then
    echo -e "  ${GREEN}✅ Go 已安装:${NC} $(go version)"
    echo -e "  ${GREEN}→ 建议策略: 本地 Go 编译（最快）${NC}"
else
    echo -e "  ${YELLOW}⚠️  Go 未安装${NC}"
    echo -e "  ${YELLOW}→ 将尝试 Docker 编译${NC}"
fi
echo ""

# 2. 检查 Docker 环境
echo -e "${BLUE}[检查 2]${NC} Docker 环境"
if command -v docker &> /dev/null; then
    echo -e "  ${GREEN}✅ Docker 已安装:${NC} $(docker --version | head -1)"
    # 检查 Docker 是否运行
    if docker ps &> /dev/null; then
        echo -e "  ${GREEN}✅ Docker 服务正在运行${NC}"
        echo -e "  ${GREEN}→ 可以使用 Docker 编译${NC}"
    else
        echo -e "  ${YELLOW}⚠️  Docker 已安装但未运行${NC}"
        echo -e "  ${YELLOW}→ 请启动 Docker Desktop${NC}"
    fi
else
    echo -e "  ${YELLOW}⚠️  Docker 未安装${NC}"
    echo -e "  ${YELLOW}→ 将尝试远程编译${NC}"
fi
echo ""

# 3. 编译策略选择建议
echo -e "${BLUE}[编译策略]${NC} 自动选择建议"
echo ""

if command -v go &> /dev/null; then
    echo "  🥇 优先选择: 本地 Go 编译"
    echo "     - 速度: ⭐⭐⭐⭐⭐"
    echo "     - 命令: GOOS=linux GOARCH=amd64 go build"
    echo ""
elif command -v docker &> /dev/null && docker ps &> /dev/null; then
    echo "  🥈 备选方案: Docker 编译"
    echo "     - 速度: ⭐⭐⭐⭐"
    echo "     - 镜像: golang:1.24.0-alpine"
    echo ""
else
    echo "  🥉 降级方案: 远程服务器编译"
    echo "     - 速度: ⭐⭐⭐"
    echo "     - 要求: 远程需要 Go 环境"
    echo ""
fi

# 4. 安装建议
echo -e "${BLUE}[安装建议]${NC}"
echo ""

if ! command -v go &> /dev/null; then
    echo "  📦 安装 Go (推荐):"
    echo "     brew install go"
    echo ""
fi

if ! command -v docker &> /dev/null; then
    echo "  🐳 安装 Docker (推荐):"
    echo "     brew install --cask docker"
    echo ""
fi

# 5. 测试命令
echo -e "${BLUE}[测试部署]${NC}"
echo ""
echo "  查看完整帮助:"
echo "    ./scripts/deploy-to-production.sh --help"
echo ""
echo "  模拟部署（不实际执行）:"
echo "    ./scripts/deploy-to-production.sh --dry-run"
echo ""
echo "  实际部署:"
echo "    ./scripts/deploy-to-production.sh"
echo ""

echo "============================================"
echo "✅ 检查完成"
echo "============================================"
