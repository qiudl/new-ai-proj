#!/bin/bash

echo "启动带中间件的AI项目后端..."

# 检查数据库连接
if ! pg_isready -h localhost -p 5432 -U postgres > /dev/null 2>&1; then
    echo "错误: 无法连接到PostgreSQL数据库"
    echo "请确保PostgreSQL服务正在运行"
    exit 1
fi

# 运行数据库迁移
echo "运行数据库迁移..."
if [ -f "backend/migrations/002_add_middleware_tables.sql" ]; then
    PGPASSWORD=${DB_PASSWORD:-postgres} psql -h ${DB_HOST:-localhost} -p ${DB_PORT:-5432} -U ${DB_USER:-postgres} -d ${DB_NAME:-ai_project_db} -f backend/migrations/002_add_middleware_tables.sql
    echo "数据库迁移完成"
else
    echo "警告: 找不到数据库迁移文件"
fi

# 编译并启动服务
cd backend
echo "编译应用程序..."
go build -o ai-project-backend main_with_middleware.go

if [ $? -eq 0 ]; then
    echo "启动服务器..."
    ./ai-project-backend
else
    echo "编译失败"
    exit 1
fi
