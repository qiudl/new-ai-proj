#!/bin/bash
# MCP Task Bridge 本地启动脚本

# 切换到脚本所在目录
cd "$(dirname "$0")"

# 运行 MCP 服务器
exec node dist/entrypoints/index.js
