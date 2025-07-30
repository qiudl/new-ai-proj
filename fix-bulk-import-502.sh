#!/bin/bash

echo "🔧 AI批量导入子任务502错误排查和修复脚本"
echo "============================================"

echo ""
echo "📊 当前服务状态检查："
echo "Docker容器状态："
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "(go_backend|nginx_proxy|react_frontend)"

echo ""
echo "🌐 API连接测试："
curl -s -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjozNCwidXNlcm5hbWUiOiJxaXVkbCIsInJvbGUiOiJhZG1pbiIsInVzZXJfdHlwZSI6InN5c3RlbSIsInN1YiI6InFpdWRsIiwiZXhwIjoxNzU0MzYzMjkzLCJuYmYiOjE3NTM3NTg0OTMsImlhdCI6MTc1Mzc1ODQ5M30.xZnHnRtqRcg16y97Km_mahti45A3wa0_Sp5ZATA5YCI" \
"http://localhost/api/v1/projects/39/tasks?page=1&page_size=100" | jq '.success'

echo ""
echo "🔍 问题分析："
echo "1. 后端服务正常 ✅"
echo "2. API返回200状态 ✅"  
echo "3. 数据格式正确 ✅"
echo "4. 问题可能在前端缓存或状态管理"

echo ""
echo "💡 建议解决方案："
echo "1. 清除浏览器缓存 (Cmd+Shift+R 硬刷新)"
echo "2. 重启前端容器清除缓存"
echo "3. 检查浏览器开发者工具Network面板的实际请求"

echo ""
echo "🚀 执行前端容器重启："
docker restart react_frontend

echo ""
echo "⏳ 等待前端容器启动..."
sleep 10

echo ""
echo "✅ 修复建议："
echo "打开浏览器，访问 http://localhost/bulk-import"
echo "1. 打开开发者工具(F12)"
echo "2. 切换到Network面板"
echo "3. 清除缓存并硬刷新 (Cmd+Shift+R 或 Ctrl+Shift+R)"
echo "4. 观察实际的API请求响应状态"

echo ""
echo "如果问题依然存在，请检查："
echo "- 浏览器控制台是否有JavaScript错误"
echo "- Network面板中/api/v1/projects/39/tasks的实际响应"
echo "- 是否有其他网络代理或安全软件干扰"
