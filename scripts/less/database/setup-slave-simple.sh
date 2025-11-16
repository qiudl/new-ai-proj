#!/bin/bash
set -e

echo "=== PostgreSQL Slave Setup (Simplified) ==="

SLAVE_DATA="/home/ubuntu/apps/new-ai-proj/postgres-slave-data"

echo "Step 1: Remove old slave data if exists"
sudo rm -rf "$SLAVE_DATA"
mkdir -p "$SLAVE_DATA"

echo "Step 2: Run pg_basebackup"
docker run --rm \
  --network ai-project_ai_prod_network \
  -v "$SLAVE_DATA:/backup" \
  -e PGPASSWORD='Repl1c@t0r2024!' \
  postgres:16 \
  pg_basebackup \
    -h ai_postgres_prod \
    -p 5432 \
    -U replicator \
    -D /backup \
    -Fp \
    -Xs \
    -P \
    -R

echo "Step 3: Configure slave settings"
cat >> "$SLAVE_DATA/postgresql.auto.conf" << 'EOF'

# Slave-specific settings
primary_conninfo = 'host=ai_postgres_prod port=5432 user=replicator password=Repl1c@t0r2024! application_name=slave1'
primary_slot_name = 'slave_slot_1'
EOF

echo "Step 4: Set permissions"
sudo chown -R 999:999 "$SLAVE_DATA"
sudo chmod 700 "$SLAVE_DATA"

echo "Step 5: Start slave container"
docker run -d \
  --name ai_postgres_slave \
  --network ai-project_ai_prod_network \
  --restart always \
  -p 127.0.0.1:5433:5432 \
  -v "$SLAVE_DATA:/var/lib/postgresql/data" \
  --health-cmd="pg_isready -U ai_prod_user -d ai_project_prod" \
  --health-interval=30s \
  --health-timeout=5s \
  --health-retries=3 \
  postgres:16

echo ""
echo "✅ Slave setup complete! Waiting 30 seconds for startup..."
sleep 30

echo ""
echo "=== Replication Status ==="
docker exec -i ai_postgres_prod psql -U ai_prod_user -d ai_project_prod -c "
SELECT client_addr, application_name, state, sync_state, replay_lag
FROM pg_stat_replication;
"
