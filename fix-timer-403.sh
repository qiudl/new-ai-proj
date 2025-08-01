#\!/bin/bash

echo "=== 修复个人计时403错误 ==="
echo

# 1. 重新启动前端服务清除缓存
echo "1. 重新启动前端服务..."
docker-compose restart frontend

# 2. 等待服务启动
echo "2. 等待服务启动..."
sleep 10

# 3. 检查服务状态
echo "3. 检查服务状态..."
docker-compose ps

echo
echo "=== 解决方案建议 ==="
echo "1. 打开浏览器访问 http://localhost:3000"
echo "2. 按F12打开开发者工具"
echo "3. 在Console中运行：localStorage.clear()"
echo "4. 刷新页面重新登录"
echo "5. 选择正确的个人计时任务开始计时"
echo
echo "如果问题仍然存在，请检查："
echo "- 确保选择的任务属于当前登录用户"
echo "- 检查网络请求中的Authorization header是否正确"
echo "- 查看Console中的详细错误信息"
EOF < /dev/null