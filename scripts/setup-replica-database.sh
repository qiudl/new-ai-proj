#!/bin/bash

# PostgreSQL 从库设置脚本
# 在本机设置PostgreSQL从库，从Docker主库进行流复制

set -e

# 配置变量
MASTER_HOST="localhost"
MASTER_PORT="5433"
REPLICA_PORT="5432"
REPL_USER="repl_user"
REPL_PASSWORD="repl_password_2024"
DB_USER="dev_user"
DB_NAME="ai_project_db"

# 本机PostgreSQL数据目录（根据系统调整）
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    PG_VERSION=$(postgres --version | grep -oE '[0-9]+\.[0-9]+' | head -1)
    DATA_DIR="/usr/local/var/postgresql@${PG_VERSION}"
    CONFIG_DIR="/usr/local/var/postgresql@${PG_VERSION}"
    PG_CTL="/usr/local/bin/pg_ctl"
    PSQL="/usr/local/bin/psql"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    PG_VERSION=$(sudo -u postgres psql -t -c "SHOW server_version;" | grep -oE '[0-9]+\.[0-9]+' | head -1)
    DATA_DIR="/var/lib/postgresql/${PG_VERSION}/main"
    CONFIG_DIR="/etc/postgresql/${PG_VERSION}/main"
    PG_CTL="sudo -u postgres pg_ctl"
    PSQL="sudo -u postgres psql"
fi

BACKUP_DIR="/tmp/pg_backup_$(date +%Y%m%d_%H%M%S)"

echo "=========================================="
echo "PostgreSQL 从库设置脚本"
echo "=========================================="
echo "主库地址: ${MASTER_HOST}:${MASTER_PORT}"
echo "从库端口: ${REPLICA_PORT}"
echo "数据目录: ${DATA_DIR}"
echo "备份目录: ${BACKUP_DIR}"
echo "=========================================="

# 检查Docker主库是否运行
echo "检查Docker主库连接..."
if ! nc -z $MASTER_HOST $MASTER_PORT; then
    echo "错误: 无法连接到Docker主库 ${MASTER_HOST}:${MASTER_PORT}"
    echo "请确保运行: docker-compose -f docker-compose.dev.yml up -d postgres-master"
    exit 1
fi

# 停止本机PostgreSQL服务
echo "停止本机PostgreSQL服务..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    brew services stop postgresql@$(echo $PG_VERSION | cut -d. -f1)
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    sudo systemctl stop postgresql
fi

# 备份现有数据目录
if [ -d "$DATA_DIR" ]; then
    echo "备份现有数据目录到 $BACKUP_DIR..."
    mkdir -p $BACKUP_DIR
    sudo cp -r $DATA_DIR $BACKUP_DIR/
fi

# 清理数据目录
echo "清理数据目录..."
sudo rm -rf $DATA_DIR/*

# 使用pg_basebackup创建基础备份
echo "从主库创建基础备份..."
PGPASSWORD=$REPL_PASSWORD pg_basebackup \
    -h $MASTER_HOST \
    -p $MASTER_PORT \
    -U $REPL_USER \
    -D $DATA_DIR \
    -P \
    -W \
    -R \
    -X stream

# 创建从库配置
echo "配置从库设置..."

# 创建postgresql.conf配置（从库特定设置）
cat > /tmp/postgresql_replica.conf << EOF
# PostgreSQL 从库配置
# 基础设置
listen_addresses = 'localhost'
port = $REPLICA_PORT
max_connections = 100

# 内存设置
shared_buffers = 128MB
effective_cache_size = 512MB
work_mem = 2MB
maintenance_work_mem = 32MB

# WAL和复制设置
wal_level = replica
hot_standby = on
max_wal_senders = 0
wal_keep_size = 64MB

# 从库特定设置
hot_standby_feedback = on
max_standby_streaming_delay = 30s
max_standby_archive_delay = 60s

# 日志设置
log_destination = 'stderr'
logging_collector = on
log_directory = 'log'
log_filename = 'postgresql-%Y-%m-%d.log'
log_statement = 'none'
log_min_duration_statement = 5000

# 连接设置
tcp_keepalives_idle = 600
tcp_keepalives_interval = 30
tcp_keepalives_count = 3

# 只读模式确认
default_transaction_read_only = on
EOF

# 复制配置文件
sudo cp /tmp/postgresql_replica.conf $CONFIG_DIR/postgresql.conf

# 创建recovery配置（PostgreSQL 12+使用postgresql.conf）
if [ ! -f "$DATA_DIR/standby.signal" ]; then
    sudo touch $DATA_DIR/standby.signal
fi

# 更新连接信息到postgresql.conf
sudo bash -c "cat >> $DATA_DIR/postgresql.conf << EOF

# 从库连接配置
primary_conninfo = 'host=$MASTER_HOST port=$MASTER_PORT user=$REPL_USER password=$REPL_PASSWORD application_name=replica_$(hostname)'
primary_slot_name = 'replica_slot'
EOF"

# 设置权限
if [[ "$OSTYPE" == "darwin"* ]]; then
    sudo chown -R $(whoami):staff $DATA_DIR
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    sudo chown -R postgres:postgres $DATA_DIR
    sudo chmod 700 $DATA_DIR
fi

# 启动从库
echo "启动PostgreSQL从库..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    brew services start postgresql@$(echo $PG_VERSION | cut -d. -f1)
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    sudo systemctl start postgresql
fi

# 等待服务启动
sleep 10

# 验证复制状态
echo "验证复制状态..."
echo "主库复制状态:"
PGPASSWORD=dev_password_2024 psql -h $MASTER_HOST -p $MASTER_PORT -U $DB_USER -d $DB_NAME \
    -c "SELECT client_addr, state, sync_state FROM pg_stat_replication;"

echo ""
echo "从库状态:"
$PSQL -p $REPLICA_PORT -d $DB_NAME \
    -c "SELECT pg_is_in_recovery(), pg_last_wal_receive_lsn(), pg_last_wal_replay_lsn();"

echo ""
echo "=========================================="
echo "PostgreSQL从库设置完成！"
echo "=========================================="
echo "主库: ${MASTER_HOST}:${MASTER_PORT} (Docker)"
echo "从库: localhost:${REPLICA_PORT} (本机)"
echo "数据备份: $BACKUP_DIR"
echo ""
echo "连接从库命令:"
echo "$PSQL -p $REPLICA_PORT -d $DB_NAME"
echo ""
echo "监控复制状态:"
echo "docker exec ai_postgres_master psql -U dev_user -d ai_project_db -c \"SELECT * FROM pg_stat_replication;\""
echo "=========================================="