#!/bin/bash
# Jenkins健康检查脚本

set -e

# 检查Jenkins是否启动
if ! curl -f -s http://localhost:8080/login > /dev/null 2>&1; then
    echo "ERROR: Jenkins web界面无法访问"
    exit 1
fi

# 检查Jenkins API
if ! curl -f -s http://localhost:8080/api/json > /dev/null 2>&1; then
    echo "ERROR: Jenkins API无法访问"
    exit 1
fi

# 检查AI后端连接
if [ -n "$AI_BACKEND_URL" ]; then
    if ! curl -f -s "$AI_BACKEND_URL/health" > /dev/null 2>&1; then
        echo "WARNING: AI后端API连接失败"
        # 不退出，因为这可能是临时问题
    fi
fi

# 检查MCP Bridge连接
if [ -n "$AI_MCP_URL" ]; then
    if ! curl -f -s "$AI_MCP_URL/health" > /dev/null 2>&1; then
        echo "WARNING: MCP Bridge连接失败"
        # 不退出，因为这可能是临时问题
    fi
fi

echo "Jenkins健康检查通过"
exit 0