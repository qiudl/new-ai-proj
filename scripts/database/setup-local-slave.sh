#!/bin/bash
# 配置本地PostgreSQL作为远端主库的从库
# 通过SSH隧道连接

set -e

echo "=== 本地PostgreSQL从库配置脚本 ==="
echo ""
echo "⚠️  警告: 此脚本将清空本地PostgreSQL数据并从远端主库克隆"
echo "    本地数据目录: /opt/homebrew/var/postgresql@16"
echo "    远端主库: 152.136.104.251:5432 (通过SSH隧道 127.0.0.1:5433)"
echo ""
read -p "是否继续? (yes/no): " CONFIRM

if [[ "$CONFIRM" != "yes" ]]; then
    echo "已取消"
    exit 0
fi

DATA_DIR="/opt/homebrew/var/postgresql@16"
BACKUP_DIR="/opt/homebrew/var/postgresql@16.backup.$(date +%Y%m%d_%H%M%S)"
REPL_USER="replicator"
REPL_PASSWORD="Repl1c@t0r2024!"
MASTER_HOST="127.0.0.1"
MASTER_PORT="5433"  # SSH隧道端口

echo ""
echo "Step 1: 备份当前数据目录"
echo "  备份位置: $BACKUP_DIR"
cp -r "$DATA_DIR" "$BACKUP_DIR"
echo "  ✅ 备份完成"

echo ""
echo "Step 2: 停止本地PostgreSQL"
brew services stop postgresql@16
sleep 3
echo "  ✅ PostgreSQL已停止"

echo ""
echo "Step 3: 清空数据目录"
rm -rf "$DATA_DIR"/*
echo "  ✅ 数据目录已清空"

echo ""
echo "Step 4: 使用pg_basebackup从远端主库克隆数据"
echo "  连接: $MASTER_HOST:$MASTER_PORT"
echo "  用户: $REPL_USER"

export PGPASSWORD="$REPL_PASSWORD"
pg_basebackup \
    -h "$MASTER_HOST" \
    -p "$MASTER_PORT" \
    -U "$REPL_USER" \
    -D "$DATA_DIR" \
    -Fp \
    -Xs \
    -P \
    -R

echo "  ✅ 基础备份完成"

echo ""
echo "Step 5: 配置从库连接信息"
cat >> "$DATA_DIR/postgresql.auto.conf" << EOF

# Local Slave Configuration (Added $(date +%Y-%m-%d))
primary_conninfo = 'host=$MASTER_HOST port=$MASTER_PORT user=$REPL_USER password=$REPL_PASSWORD application_name=local_slave'
hot_standby = on
EOF

# 确保standby.signal文件存在
touch "$DATA_DIR/standby.signal"

echo "  ✅ 从库配置完成"

echo ""
echo "Step 6: 启动从库"
brew services start postgresql@16
sleep 5

echo ""
echo "Step 7: 验证复制状态"
export PGPASSWORD="SecureAI2024!@#$%^"
psql -h 127.0.0.1 -p 5432 -U ai_prod_user -d ai_project_prod -c "
SELECT
    pg_is_in_recovery() as is_slave,
    CASE WHEN pg_is_in_recovery() THEN '✅ SLAVE (Standby)' ELSE '❌ MASTER (Primary)' END as role,
    pg_last_wal_receive_lsn() as receive_lsn,
    pg_last_wal_replay_lsn() as replay_lsn;
"

echo ""
echo "Step 8: 检查远端主库的复制状态"
ssh ubuntu@152.136.104.251 "docker exec -i ai_postgres_prod psql -U ai_prod_user -d ai_project_prod -c \"
SELECT
    client_addr,
    application_name,
    state,
    sync_state,
    replay_lag
FROM pg_stat_replication
WHERE application_name = 'local_slave';
\""

echo ""
echo "========================================="
echo "✅ 本地PostgreSQL从库配置完成!"
echo ""
echo "架构:"
echo "  远端主库: 152.136.104.251:5432 (Docker)"
echo "  本地从库: 127.0.0.1:5432 (Homebrew PostgreSQL)"
echo "  连接方式: SSH隧道 (127.0.0.1:5433 → 152.136.104.251:5432)"
echo ""
echo "备份位置: $BACKUP_DIR"
echo "========================================="
