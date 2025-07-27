#!/bin/bash

echo "🚀 启动Docker测试..."

# 停止现有容器
echo "1. 停止现有服务..."
cd /Users/johnqiu/coding/www/projects/new-ai-proj
docker-compose down

# 重新构建frontend容器
echo "2. 重新构建frontend容器..."
docker-compose build frontend

# 启动frontend服务
echo "3. 启动frontend服务..."
docker-compose up frontend

echo "✅ 请检查日志中是否还有CSS错误！"
