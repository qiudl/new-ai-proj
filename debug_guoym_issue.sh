#!/bin/bash
"""
guoym用户身份问题深度调试脚本
"""

echo "=== guoym 用户身份调试分析 ==="
echo

echo "1. 检查环境变量配置:"
echo "项目根目录 .env 中的 DEV_LOGIN_USERNAME:"
grep "DEV_LOGIN_USERNAME" /Users/johnqiu/coding/www/projects/new-ai-proj/.env || echo "未找到 DEV_LOGIN_USERNAME 配置"
echo

echo "MCP Bridge .env 中的 DEV_LOGIN_USERNAME:"
grep "DEV_LOGIN_USERNAME" /Users/johnqiu/coding/www/projects/new-ai-proj/mcp-task-bridge/.env || echo "未找到 DEV_LOGIN_USERNAME 配置"
echo

echo "2. 检查JWT Token内容:"
token_file="/Users/johnqiu/coding/www/projects/new-ai-proj/.env.mcp-token"
if [ -f "$token_file" ]; then
    token=$(grep "MCP_SYSTEM_TOKEN=" "$token_file" | cut -d'=' -f2)
    echo "Token 前50个字符: ${token:0:50}..."
    
    # 解码JWT payload (第二部分)
    payload=$(echo "$token" | cut -d'.' -f2)
    # 添加padding
    len=$(echo -n "$payload" | wc -c | tr -d ' ')
    pad=$((4 - len % 4))
    if [ $pad -ne 4 ]; then
        payload="${payload}$(printf "=%0.s" $(seq 1 $pad))"
    fi
    
    echo "JWT Payload 解码:"
    echo "$payload" | base64 -d 2>/dev/null | python3 -m json.tool 2>/dev/null || echo "解码失败"
else
    echo "Token文件不存在: $token_file"
fi
echo

echo "3. 检查MCP Bridge编译后的代码:"
dist_file="/Users/johnqiu/coding/www/projects/new-ai-proj/mcp-task-bridge/dist/task-mcp.js"
if [ -f "$dist_file" ]; then
    echo "dev-quick-login 相关代码行:"
    grep -n -A2 -B2 "DEV_LOGIN_USERNAME\|dev-quick-login" "$dist_file" | head -10
else
    echo "编译文件不存在: $dist_file"
fi
echo

echo "4. 检查正在运行的MCP Bridge进程:"
ps aux | grep "mcp-task-bridge\|index\.js" | grep -v grep || echo "没有找到运行中的MCP Bridge进程"
echo

echo "5. 检查后端是否正在运行:"
curl -s "http://localhost:8081/api/v1/auth/dev-accounts" | python3 -m json.tool 2>/dev/null || echo "后端服务未响应"
echo

echo "=== 调试完成 ==="
