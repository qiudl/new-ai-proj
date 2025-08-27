#!/bin/bash
# 本地运行 Go 服务（跳过 Docker）

export DB_HOST=localhost
export DB_PORT=5433
export DB_USER=dev_user
export DB_PASSWORD=dev_password_2024
export DB_NAME=ai_project_db
export APP_ENV=development
export PORT=8080
export JWT_SECRET=dev_jwt_secret_key_2024

echo "🚀 本地启动 Go 服务..."
echo "数据库: ${DB_HOST}:${DB_PORT}"
echo "端口: ${PORT}"

go run main.go
