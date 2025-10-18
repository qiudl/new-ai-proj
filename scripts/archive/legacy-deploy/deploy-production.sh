#!/bin/bash
set -e

SERVER="ubuntu@152.136.104.251"
PROJECT_DIR="/opt/ai-project"

echo "🚀 完整生产部署流程"
echo "===================="
echo ""

# 询问是否需要先发布到main
read -p "是否需要先从develop发布到main？(y/n): " release_choice

if [[ "$release_choice" == "y" ]]; then
    echo ""
    echo "=== 步骤1: 从develop发布到main ==="
    bash release-to-main.sh

    if [ $? -ne 0 ]; then
        echo "❌ 发布到main失败"
        exit 1
    fi
fi

# 部署到生产服务器
echo ""
echo "=== 步骤2: 部署到生产服务器 ==="
echo "📡 触发服务器更新（从main分支）..."

ssh $SERVER "cd $PROJECT_DIR && bash update-from-main.sh"

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 完整部署流程执行完成！"
    echo ""
    echo "🌐 访问地址:"
    echo "  前端: http://152.136.104.251:3000"
    echo "  后端API: http://152.136.104.251:8080"
    echo ""
    echo "🔍 查看日志:"
    echo "  ssh $SERVER 'cd $PROJECT_DIR && sudo docker-compose -f docker-compose.prod.yml logs -f'"
else
    echo ""
    echo "❌ 部署失败，请检查服务器日志"
    exit 1
fi
