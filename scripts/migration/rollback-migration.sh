#!/bin/bash

# Docker Compose 迁移回滚脚本
# 用途：将系统回滚到迁移前的状态

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  ${BLUE}⏪ Docker Compose 迁移回滚脚本${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 查找最新备份
BACKUP_DIR=$(ls -td /opt/ai-project/migration-backup-* 2>/dev/null | head -n 1)

if [ -z "$BACKUP_DIR" ]; then
  echo -e "${RED}❌ 未找到备份目录${NC}"
  echo ""
  echo "可用的备份目录："
  ls -td /opt/ai-project/migration-backup-* 2>/dev/null || echo "  无"
  echo ""
  exit 1
fi

echo -e "${BLUE}找到备份目录:${NC}"
echo "  $BACKUP_DIR"
echo ""
echo -e "${BLUE}备份信息:${NC}"
if [ -f "$BACKUP_DIR/README.txt" ]; then
  head -n 5 "$BACKUP_DIR/README.txt"
else
  ls -lh "$BACKUP_DIR" | head -n 10
fi
echo ""

# 确认回滚
echo -e "${YELLOW}⚠️  警告：此操作将：${NC}"
echo "  1. 停止当前docker-compose服务"
echo "  2. 恢复备份的数据库和配置"
echo "  3. 使用手动方式重新启动容器"
echo ""
read -p "是否确认回滚？(yes/no): " confirm
if [ "$confirm" != "yes" ]; then
  echo "回滚已取消"
  exit 0
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  阶段1: 停止Docker Compose服务${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ -f "docker-compose.prod.yml" ]; then
  echo "停止docker-compose服务..."
  docker-compose -f docker-compose.prod.yml down
  echo -e "${GREEN}✅ Docker Compose服务已停止${NC}"
else
  echo -e "${YELLOW}⚠️  未找到docker-compose.prod.yml，跳过${NC}"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  阶段2: 恢复配置文件${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ -f "$BACKUP_DIR/configs.tar.gz" ]; then
  echo "恢复配置文件..."
  cd /opt/ai-project
  tar xzf "$BACKUP_DIR/configs.tar.gz"
  echo -e "${GREEN}✅ 配置文件已恢复${NC}"
else
  echo -e "${YELLOW}⚠️  配置备份不存在，跳过${NC}"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  阶段3: 重新启动容器（手动模式）${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${YELLOW}注意：需要根据备份的容器配置手动重启容器${NC}"
echo ""
echo "从备份中查找容器配置..."

# 列出备份的容器配置
container_configs=$(ls "$BACKUP_DIR"/*_config.json 2>/dev/null)
if [ -n "$container_configs" ]; then
  echo "找到以下容器配置："
  echo "$container_configs" | xargs -n 1 basename | sed 's/_config.json//'
  echo ""
  echo -e "${YELLOW}⚠️  请根据这些配置文件手动重启容器${NC}"
  echo ""
  echo "示例命令（需要根据实际配置调整）："
  echo "  docker run -d --name ai_postgres_prod \\"
  echo "    --restart always \\"
  echo "    --network ai-project_ai_prod_network \\"
  echo "    -v ai-project_postgres_prod_data:/var/lib/postgresql/data \\"
  echo "    -e POSTGRES_USER=\$DB_USER \\"
  echo "    -e POSTGRES_PASSWORD=\$DB_PASSWORD \\"
  echo "    -e POSTGRES_DB=\$DB_NAME \\"
  echo "    postgres:16"
  echo ""
  echo "或者使用docker-compose（如果有旧的docker-compose文件）："
  echo "  docker-compose -f docker-compose.prod.yml.backup up -d"
else
  echo -e "${RED}❌ 未找到容器配置备份${NC}"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  阶段4: 恢复数据（可选）${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${YELLOW}如果数据丢失，可以恢复数据库备份：${NC}"
echo ""

# PostgreSQL恢复
if [ -f "$BACKUP_DIR/postgres_backup.sql" ]; then
  echo "PostgreSQL备份文件存在："
  echo "  $BACKUP_DIR/postgres_backup.sql"
  echo ""
  read -p "是否恢复PostgreSQL数据？(yes/no): " restore_pg
  if [ "$restore_pg" = "yes" ]; then
    echo "恢复PostgreSQL数据..."

    # 等待PostgreSQL启动
    echo "等待PostgreSQL启动..."
    for i in {1..30}; do
      if docker exec ai_postgres_prod pg_isready -U ${DB_USER:-postgres} > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PostgreSQL已就绪${NC}"
        break
      fi
      sleep 2
    done

    # 恢复数据
    docker cp "$BACKUP_DIR/postgres_backup.sql" ai_postgres_prod:/tmp/backup.sql
    docker exec ai_postgres_prod psql -U ${DB_USER:-postgres} -d ${DB_NAME:-ai_project_db} -f /tmp/backup.sql

    if [ $? -eq 0 ]; then
      echo -e "${GREEN}✅ PostgreSQL数据已恢复${NC}"
    else
      echo -e "${RED}❌ PostgreSQL数据恢复失败${NC}"
    fi
  fi
else
  echo -e "${YELLOW}⚠️  PostgreSQL备份不存在${NC}"
fi

echo ""

# Redis恢复
if [ -f "$BACKUP_DIR/redis_backup.rdb" ]; then
  echo "Redis备份文件存在："
  echo "  $BACKUP_DIR/redis_backup.rdb"
  echo ""
  read -p "是否恢复Redis数据？(yes/no): " restore_redis
  if [ "$restore_redis" = "yes" ]; then
    echo "恢复Redis数据..."
    docker cp "$BACKUP_DIR/redis_backup.rdb" ai_redis_prod:/data/dump.rdb
    docker restart ai_redis_prod

    if [ $? -eq 0 ]; then
      echo -e "${GREEN}✅ Redis数据已恢复${NC}"
    else
      echo -e "${RED}❌ Redis数据恢复失败${NC}"
    fi
  fi
else
  echo -e "${YELLOW}⚠️  Redis备份不存在${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  ${BLUE}回滚总结${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}✅ Docker Compose服务已停止${NC}"
echo -e "${GREEN}✅ 配置文件已恢复${NC}"
echo ""
echo -e "${YELLOW}⚠️  容器需要手动重启${NC}"
echo ""
echo "下一步："
echo "  1. 根据容器配置文件手动启动容器"
echo "  2. 验证服务: curl http://localhost/api/v1/health"
echo "  3. 如果数据丢失，使用备份恢复"
echo ""
echo "备份位置: $BACKUP_DIR"
echo ""
