#!/bin/bash

SERVER="152.136.104.251"

echo "测试weier账户权限..."

# 从日志中看到weier正在使用的token (需要从前端获取)
# 这里我们直接测试权限检查endpoint

echo ""
echo "1. 测试未认证的权限检查API:"
curl -s -X POST "http://${SERVER}:8080/api/v1/permissions/check" \
  -H "Content-Type: application/json" \
  -d '{"permissionCode":"project_read"}' | jq '.'

echo ""
echo "2. 如果你有weier的token,请手动测试:"
echo "curl -X POST 'http://${SERVER}:8080/api/v1/permissions/check' \\"
echo "  -H 'Authorization: Bearer YOUR_TOKEN' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"permissionCode\":\"project_read\"}'"
