#!/bin/bash

# Docker Compose迁移前备份脚本
# 用途：在迁移到Docker Compose管理之前创建完整备份

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置
BACKUP_DIR="/opt/ai-project/migration-backup-$(date +%Y%m%d_%H%M%S)"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  ${BLUE}📦 迁移前备份脚本${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 创建备份目录
mkdir -p "$BACKUP_DIR"
echo -e "${GREEN}✅ 创建备份目录: $BACKUP_DIR${NC}"
echo ""

# 检查环境变量
if [ -z "$DB_USER" ] || [ -z "$DB_NAME" ]; then
    echo -e "${YELLOW}⚠️  未设置数据库环境变量，尝试从.env.production加载...${NC}"
    if [ -f ".env.production" ]; then
        source .env.production
    else
        echo -e "${RED}❌ 未找到.env.production文件${NC}"
        exit 1
    fi
fi

# 1. 备份PostgreSQL主数据库
echo -e "${BLUE}1/7 备份PostgreSQL主数据库...${NC}"
docker exec ai_postgres_prod pg_dump -U ${DB_USER} ${DB_NAME} > "$BACKUP_DIR/postgres_backup.sql" 2>&1
if [ $? -eq 0 ]; then
    size=$(du -h "$BACKUP_DIR/postgres_backup.sql" | cut -f1)
    echo -e "${GREEN}   ✅ PostgreSQL主库备份完成 ($size)${NC}"
else
    echo -e "${RED}   ❌ PostgreSQL备份失败${NC}"
    exit 1
fi

# 2. 备份PostgreSQL从数据库
echo -e "${BLUE}2/7 备份PostgreSQL从数据库...${NC}"
if docker ps | grep -q ai_postgres_slave; then
    docker exec ai_postgres_slave pg_dump -U ${DB_USER} ${DB_NAME} > "$BACKUP_DIR/postgres_slave_backup.sql" 2>&1
    if [ $? -eq 0 ]; then
        size=$(du -h "$BACKUP_DIR/postgres_slave_backup.sql" | cut -f1)
        echo -e "${GREEN}   ✅ PostgreSQL从库备份完成 ($size)${NC}"
    else
        echo -e "${YELLOW}   ⚠️  PostgreSQL从库备份失败（可选）${NC}"
    fi
else
    echo -e "${YELLOW}   ⚠️  从数据库容器未运行，跳过${NC}"
fi

# 3. 备份Redis数据
echo -e "${BLUE}3/7 备份Redis数据...${NC}"
docker exec ai_redis_prod redis-cli --rdb /data/backup.rdb > /dev/null 2>&1
sleep 2
docker cp ai_redis_prod:/data/backup.rdb "$BACKUP_DIR/redis_backup.rdb" 2>&1
if [ $? -eq 0 ]; then
    size=$(du -h "$BACKUP_DIR/redis_backup.rdb" | cut -f1)
    echo -e "${GREEN}   ✅ Redis备份完成 ($size)${NC}"
else
    echo -e "${YELLOW}   ⚠️  Redis备份失败（可选）${NC}"
fi

# 4. 备份Docker volumes
echo -e "${BLUE}4/7 备份Docker volumes...${NC}"

# 备份postgres volume
if docker volume ls | grep -q ai-project_postgres_prod_data; then
    docker run --rm -v ai-project_postgres_prod_data:/source -v "$BACKUP_DIR":/backup alpine \
      tar czf /backup/postgres_volume.tar.gz -C /source . 2>&1
    if [ $? -eq 0 ]; then
        size=$(du -h "$BACKUP_DIR/postgres_volume.tar.gz" | cut -f1)
        echo -e "${GREEN}   ✅ PostgreSQL volume备份完成 ($size)${NC}"
    fi
else
    echo -e "${YELLOW}   ⚠️  PostgreSQL volume不存在${NC}"
fi

# 备份redis volume
if docker volume ls | grep -q ai-project_redis_prod_data; then
    docker run --rm -v ai-project_redis_prod_data:/source -v "$BACKUP_DIR":/backup alpine \
      tar czf /backup/redis_volume.tar.gz -C /source . 2>&1
    if [ $? -eq 0 ]; then
        size=$(du -h "$BACKUP_DIR/redis_volume.tar.gz" | cut -f1)
        echo -e "${GREEN}   ✅ Redis volume备份完成 ($size)${NC}"
    fi
else
    echo -e "${YELLOW}   ⚠️  Redis volume不存在${NC}"
fi

# 5. 备份配置文件
echo -e "${BLUE}5/7 备份配置文件...${NC}"
tar czf "$BACKUP_DIR/configs.tar.gz" \
  docker-compose.prod.yml \
  .env.production \
  nginx/ \
  config/ \
  ssl/ \
  2>/dev/null || true

if [ -f "$BACKUP_DIR/configs.tar.gz" ]; then
    size=$(du -h "$BACKUP_DIR/configs.tar.gz" | cut -f1)
    echo -e "${GREEN}   ✅ 配置文件备份完成 ($size)${NC}"
else
    echo -e "${YELLOW}   ⚠️  配置文件备份失败${NC}"
fi

# 6. 备份容器配置
echo -e "${BLUE}6/7 保存容器配置...${NC}"
containers=(ai_backend_prod ai_frontend_prod ai_nginx ai_postgres_prod ai_redis_prod ai_mcp_server_prod ai_postgres_slave)
for container in "${containers[@]}"; do
    if docker ps -a | grep -q $container; then
        docker inspect $container > "$BACKUP_DIR/${container}_config.json" 2>&1
    fi
done
echo -e "${GREEN}   ✅ 容器配置已保存${NC}"

# 7. 生成备份清单
echo -e "${BLUE}7/7 生成备份清单...${NC}"
cat > "$BACKUP_DIR/README.txt" <<EOF
Docker Compose迁移备份
=====================

备份时间: $(date)
备份目录: $BACKUP_DIR

文件清单:
$(ls -lh "$BACKUP_DIR")

恢复说明:
1. PostgreSQL主库: docker exec ai_postgres_prod psql -U ${DB_USER} -d ${DB_NAME} -f /backups/postgres_backup.sql
2. Redis: docker cp redis_backup.rdb ai_redis_prod:/data/dump.rdb && docker restart ai_redis_prod
3. 配置文件: tar xzf configs.tar.gz

环境信息:
- DB_USER: ${DB_USER}
- DB_NAME: ${DB_NAME}
- Docker版本: $(docker --version)
- Docker Compose版本: $(docker-compose --version)
EOF

echo -e "${GREEN}   ✅ 备份清单已生成${NC}"

# 显示备份摘要
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  ${GREEN}✅ 备份完成${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${BLUE}备份目录:${NC} $BACKUP_DIR"
echo ""
echo -e "${BLUE}备份文件列表:${NC}"
ls -lh "$BACKUP_DIR" | tail -n +2 | awk '{printf "  %s  %s\n", $9, $5}'
echo ""
echo -e "${BLUE}总大小:${NC} $(du -sh "$BACKUP_DIR" | cut -f1)"
echo ""
echo -e "${GREEN}备份已完成，可以继续迁移流程${NC}"
echo ""
