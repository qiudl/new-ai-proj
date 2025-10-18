#!/bin/bash

# 快速部署修复weier(superadmin)权限问题
# 问题: CheckUserPermission只检查"admin"和"super_admin",但weier的role是"superadmin"(无下划线)
# 修复: 在permission_handlers.go中添加"superadmin"到admin绕过逻辑

set -e

SERVER="152.136.104.251"
BACKEND_DIR="/Users/johnqiu/coding/www/projects/new-ai-proj/backend"

echo "🚀 开始部署修复weier权限问题"
echo "=================================="
echo ""

# 1. 编译后端
echo "1️⃣ 编译后端..."
cd "$BACKEND_DIR"

# 设置交叉编译环境变量
export GOOS=linux
export GOARCH=amd64
export CGO_ENABLED=0

# 编译
go build -o ai-project-backend-linux main.go

if [ ! -f "ai-project-backend-linux" ]; then
  echo "❌ 编译失败"
  exit 1
fi

echo "✅ 编译成功: $(ls -lh ai-project-backend-linux | awk '{print $5}')"

# 2. 上传到服务器
echo ""
echo "2️⃣ 上传到服务器..."
scp ai-project-backend-linux ubuntu@${SERVER}:/tmp/

echo "✅ 上传完成"

# 3. 在服务器上部署
echo ""
echo "3️⃣ 在服务器上部署..."
ssh ubuntu@${SERVER} << 'EOF'
  set -e
  
  echo "停止后端服务..."
  sudo systemctl stop ai-project-backend || docker stop backend-prod || true
  
  echo "备份旧版本..."
  if [ -f /opt/ai-project/backend/ai-project-backend ]; then
    sudo cp /opt/ai-project/backend/ai-project-backend /opt/ai-project/backend/ai-project-backend.backup.$(date +%Y%m%d_%H%M%S)
  fi
  
  echo "替换新版本..."
  sudo mv /tmp/ai-project-backend-linux /opt/ai-project/backend/ai-project-backend
  sudo chmod +x /opt/ai-project/backend/ai-project-backend
  sudo chown -R ubuntu:ubuntu /opt/ai-project/backend/
  
  echo "启动后端服务..."
  sudo systemctl start ai-project-backend || docker start backend-prod || true
  
  sleep 3
  
  echo "检查服务状态..."
  sudo systemctl status ai-project-backend --no-pager || docker ps | grep backend-prod || true
EOF

echo ""
echo "✅ 部署完成"

# 4. 验证修复
echo ""
echo "4️⃣ 验证修复..."
sleep 2

# 尝试访问健康检查
HEALTH_CHECK=$(curl -s http://${SERVER}:8080/health || echo "FAILED")
if echo "$HEALTH_CHECK" | grep -q "ok\|healthy\|success"; then
  echo "✅ 后端服务健康"
else
  echo "⚠️  后端服务可能未正常启动"
  echo "响应: $HEALTH_CHECK"
fi

# 清理本地编译产物
echo ""
echo "5️⃣ 清理..."
cd "$BACKEND_DIR"
rm -f ai-project-backend-linux

echo ""
echo "=================================="
echo "🎉 部署完成！"
echo ""
echo "📝 修复说明:"
echo "  - 已修复CheckUserPermission handler"
echo "  - 现在支持以下admin角色: admin, super_admin, superadmin"
echo "  - weier(superadmin)现在应该可以正常访问所有页面"
echo ""
echo "🧪 测试建议:"
echo "  1. 使用weier账户登录前端"
echo "  2. 尝试访问项目页面 (/projects)"
echo "  3. 检查是否还有403错误"
echo ""
echo "如果问题仍然存在,请检查:"
echo "  - weier用户在users表中的role字段是否为'superadmin'"
echo "  - JWT token中的role claim是否正确"
