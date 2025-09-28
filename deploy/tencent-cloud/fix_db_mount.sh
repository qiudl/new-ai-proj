#!/bin/bash
# 修复PostgreSQL数据库挂载问题

cd /opt/ai-project

# 备份docker-compose文件
cp docker-compose.prod.yml docker-compose.prod.yml.backup.$(date +%Y%m%d_%H%M%S)

# 修复挂载路径 - 使用正确的SQL文件路径
sed -i 's|./current/infrastructure/docker/postgres/init-prod.sql|./infrastructure/docker/postgres/init-prod.sql|g' docker-compose.prod.yml

# 验证修复
echo "修复后的挂载配置："
grep -A2 -B2 "docker-entrypoint-initdb.d" docker-compose.prod.yml

# 清理旧容器
docker stop ai_postgres_prod || true
docker rm ai_postgres_prod || true

echo "数据库挂载路径已修复"
