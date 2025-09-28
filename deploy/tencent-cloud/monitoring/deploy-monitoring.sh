#!/bin/bash

# 监控系统部署脚本
# 部署 Prometheus、Grafana、AlertManager 等监控服务

set -e

# 配置变量
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="/opt/ai-project"
MONITORING_DIR="$PROJECT_DIR/monitoring"
SERVER_USER="${REMOTE_USER:-aiproject}"
SERVER_HOST="${REMOTE_HOST}"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 日志函数
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

# 检查参数
check_parameters() {
    if [[ -z "$SERVER_HOST" ]]; then
        log_error "请设置 SERVER_HOST 环境变量"
        log "使用方法: SERVER_HOST=your-server-ip ./deploy-monitoring.sh"
        exit 1
    fi
}

# 创建本地目录结构
create_local_structure() {
    log "创建本地监控配置目录结构..."
    
    mkdir -p "$SCRIPT_DIR"/{alertmanager,grafana/{provisioning/{datasources,dashboards,notifiers},dashboards},loki,promtail}
}

# 生成 AlertManager 配置
generate_alertmanager_config() {
    log "生成 AlertManager 配置..."
    
    cat > "$SCRIPT_DIR/alertmanager/alertmanager.yml" << 'EOF'
global:
  smtp_smarthost: 'localhost:587'
  smtp_from: 'alerts@ai-project.com'
  smtp_auth_username: ''
  smtp_auth_password: ''

# 告警路由配置
route:
  group_by: ['alertname', 'service']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'web.hook'
  routes:
    - match:
        severity: critical
      receiver: 'critical-alerts'
      repeat_interval: 5m
    - match:
        severity: warning
      receiver: 'warning-alerts'
      repeat_interval: 30m

# 告警接收器
receivers:
  - name: 'web.hook'
    webhook_configs:
      - url: 'http://localhost:5001/webhook'
        send_resolved: true
        
  - name: 'critical-alerts'
    webhook_configs:
      - url: 'http://localhost:5001/webhook/critical'
        send_resolved: true
        title: '🚨 Critical Alert - {{ .GroupLabels.alertname }}'
        text: |
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          Value: {{ .Annotations.value }}
          Labels: {{ range .Labels.SortedPairs }}{{ .Name }}={{ .Value }} {{ end }}
          {{ end }}
    
  - name: 'warning-alerts'
    webhook_configs:
      - url: 'http://localhost:5001/webhook/warning'
        send_resolved: true
        title: '⚠️ Warning Alert - {{ .GroupLabels.alertname }}'
        text: |
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          Value: {{ .Annotations.value }}
          {{ end }}

# 告警抑制规则
inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'instance']
EOF
}

# 生成 Grafana 配置
generate_grafana_config() {
    log "生成 Grafana 配置..."
    
    # 数据源配置
    cat > "$SCRIPT_DIR/grafana/provisioning/datasources/datasources.yml" << 'EOF'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
    jsonData:
      timeInterval: 15s
      
  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
    editable: true
    jsonData:
      maxLines: 1000
      
  - name: Jaeger
    type: jaeger
    access: proxy
    url: http://jaeger:16686
    editable: true
EOF

    # 仪表板配置
    cat > "$SCRIPT_DIR/grafana/provisioning/dashboards/dashboards.yml" << 'EOF'
apiVersion: 1

providers:
  - name: 'default'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /var/lib/grafana/dashboards
EOF

    # 创建基础仪表板
    create_grafana_dashboards
}

# 创建 Grafana 仪表板
create_grafana_dashboards() {
    log "创建 Grafana 仪表板..."
    
    # 系统监控仪表板
    cat > "$SCRIPT_DIR/grafana/dashboards/system-monitoring.json" << 'EOF'
{
  "dashboard": {
    "id": null,
    "title": "AI项目 - 系统监控",
    "tags": ["ai-project", "system"],
    "style": "dark",
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "CPU使用率",
        "type": "stat",
        "targets": [
          {
            "expr": "100 - (avg by (instance) (rate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)",
            "legendFormat": "CPU使用率"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percent",
            "min": 0,
            "max": 100
          }
        }
      },
      {
        "id": 2,
        "title": "内存使用率",
        "type": "stat",
        "targets": [
          {
            "expr": "(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100",
            "legendFormat": "内存使用率"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percent",
            "min": 0,
            "max": 100
          }
        }
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "refresh": "30s"
  }
}
EOF
}

# 生成 Loki 配置
generate_loki_config() {
    log "生成 Loki 配置..."
    
    cat > "$SCRIPT_DIR/loki/loki-config.yml" << 'EOF'
auth_enabled: false

server:
  http_listen_port: 3100
  grpc_listen_port: 9096

ingester:
  wal:
    enabled: true
    dir: /loki/wal
  lifecycler:
    address: 127.0.0.1
    ring:
      kvstore:
        store: inmemory
      replication_factor: 1
    final_sleep: 0s
  chunk_idle_period: 1h
  max_chunk_age: 1h
  chunk_target_size: 1048576
  chunk_retain_period: 30s
  max_transfer_retries: 0

schema_config:
  configs:
    - from: 2020-10-24
      store: boltdb-shipper
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 24h

storage_config:
  boltdb_shipper:
    active_index_directory: /loki/boltdb-shipper-active
    cache_location: /loki/boltdb-shipper-cache
    cache_ttl: 24h
    shared_store: filesystem
  filesystem:
    directory: /loki/chunks

compactor:
  working_directory: /loki/boltdb-shipper-compactor
  shared_store: filesystem

limits_config:
  reject_old_samples: true
  reject_old_samples_max_age: 168h

chunk_store_config:
  max_look_back_period: 0s

table_manager:
  retention_deletes_enabled: false
  retention_period: 0s

ruler:
  storage:
    type: local
    local:
      directory: /loki/rules
  rule_path: /loki/rules
  alertmanager_url: http://alertmanager:9093
  ring:
    kvstore:
      store: inmemory
  enable_api: true
EOF
}

# 生成 Promtail 配置
generate_promtail_config() {
    log "生成 Promtail 配置..."
    
    cat > "$SCRIPT_DIR/promtail/promtail-config.yml" << 'EOF'
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  # 系统日志
  - job_name: system
    static_configs:
      - targets:
          - localhost
        labels:
          job: varlogs
          __path__: /var/log/*.log
          
  # Docker 容器日志
  - job_name: containers
    static_configs:
      - targets:
          - localhost
        labels:
          job: containerlogs
          __path__: /var/lib/docker/containers/*/*.log
    pipeline_stages:
      - json:
          expressions:
            output: log
            stream: stream
            attrs:
      - labels:
          stream:
      - output:
          source: output
          
  # 应用日志
  - job_name: ai-project
    static_configs:
      - targets:
          - localhost
        labels:
          job: ai-project
          __path__: /opt/ai-project/logs/*.log
    pipeline_stages:
      - match:
          selector: '{job="ai-project"}'
          stages:
            - regex:
                expression: '(?P<timestamp>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z) (?P<level>\w+) (?P<message>.*)'
            - labels:
                level:
                
  # Nginx 访问日志
  - job_name: nginx
    static_configs:
      - targets:
          - localhost
        labels:
          job: nginx
          __path__: /var/log/nginx/*.log
    pipeline_stages:
      - match:
          selector: '{job="nginx"}'
          stages:
            - regex:
                expression: '(?P<remote_addr>[\d\.]+) - (?P<remote_user>\S+) \[(?P<time_local>[^\]]+)\] "(?P<method>\S+) (?P<path>\S+) (?P<protocol>\S+)" (?P<status>\d+) (?P<body_bytes_sent>\d+)'
            - labels:
                method:
                status:
EOF
}

# 上传配置到服务器
upload_configs() {
    log "上传监控配置到服务器..."
    
    # 创建远程目录
    ssh "$SERVER_USER@$SERVER_HOST" "sudo mkdir -p $MONITORING_DIR && sudo chown -R $SERVER_USER:$SERVER_USER $MONITORING_DIR"
    
    # 上传所有配置文件
    scp -r "$SCRIPT_DIR/"* "$SERVER_USER@$SERVER_HOST:$MONITORING_DIR/"
    
    # 设置正确的权限
    ssh "$SERVER_USER@$SERVER_HOST" "sudo chown -R $SERVER_USER:$SERVER_USER $MONITORING_DIR"
}

# 在服务器上部署监控服务
deploy_monitoring_services() {
    log "在服务器上部署监控服务..."
    
    ssh "$SERVER_USER@$SERVER_HOST" << 'EOF'
set -e

cd /opt/ai-project/monitoring

# 停止现有的监控服务
if docker-compose -f docker-compose.monitoring.yml ps -q | grep -q .; then
    echo "停止现有的监控服务..."
    docker-compose -f docker-compose.monitoring.yml down
fi

# 创建必要的目录
sudo mkdir -p /var/log/ai-project
sudo chown aiproject:aiproject /var/log/ai-project

# 启动监控服务
echo "启动监控服务..."
docker-compose -f docker-compose.monitoring.yml up -d

# 等待服务启动
echo "等待服务启动..."
sleep 30

# 检查服务状态
echo "检查服务状态..."
docker-compose -f docker-compose.monitoring.yml ps

# 检查服务健康状态
echo "检查服务健康状态..."
for service in prometheus grafana alertmanager loki; do
    container_name="ai-project-$service"
    if docker ps --format "table {{.Names}}\t{{.Status}}" | grep "$container_name" | grep -q "Up"; then
        echo "✓ $service 运行正常"
    else
        echo "✗ $service 运行异常"
    fi
done

echo "监控服务部署完成！"
echo "访问地址："
echo "  - Prometheus: http://$(curl -s ifconfig.me):9090"
echo "  - Grafana: http://$(curl -s ifconfig.me):3000 (admin/admin123)"
echo "  - AlertManager: http://$(curl -s ifconfig.me):9093"
EOF
}

# 配置系统监控脚本
setup_system_monitoring() {
    log "配置系统监控脚本..."
    
    ssh "$SERVER_USER@$SERVER_HOST" << 'EOF'
# 上传系统监控脚本
sudo cp /opt/ai-project/monitoring/system-monitor.sh /usr/local/bin/
sudo chmod +x /usr/local/bin/system-monitor.sh

# 配置日志轮转
sudo cp /opt/ai-project/monitoring/logrotate.conf /etc/logrotate.d/ai-project-monitoring

# 设置定时任务
(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/system-monitor.sh >/dev/null 2>&1") | crontab -

echo "系统监控脚本配置完成"
EOF
}

# 测试监控系统
test_monitoring() {
    log "测试监控系统..."
    
    ssh "$SERVER_USER@$SERVER_HOST" << 'EOF'
# 测试 Prometheus
echo "测试 Prometheus..."
curl -s http://localhost:9090/-/healthy && echo "Prometheus OK" || echo "Prometheus FAILED"

# 测试 Grafana
echo "测试 Grafana..."
curl -s http://localhost:3000/api/health && echo "Grafana OK" || echo "Grafana FAILED"

# 测试 AlertManager
echo "测试 AlertManager..."
curl -s http://localhost:9093/-/healthy && echo "AlertManager OK" || echo "AlertManager FAILED"

# 测试 Loki
echo "测试 Loki..."
curl -s http://localhost:3100/ready && echo "Loki OK" || echo "Loki FAILED"

# 运行系统监控检查
echo "运行系统监控检查..."
/usr/local/bin/system-monitor.sh
EOF
}

# 显示部署信息
show_deployment_info() {
    log "监控系统部署完成！"
    echo ""
    echo "========================================"
    echo "         监控系统访问信息"
    echo "========================================"
    echo "🔍 Prometheus:   http://$SERVER_HOST:9090"
    echo "📊 Grafana:      http://$SERVER_HOST:3000"
    echo "   用户名/密码:   admin/admin123"
    echo "🚨 AlertManager: http://$SERVER_HOST:9093"
    echo "📝 Loki:         http://$SERVER_HOST:3100"
    echo "🔍 Jaeger:       http://$SERVER_HOST:16686"
    echo "========================================"
    echo ""
    echo "📋 下一步操作："
    echo "1. 访问 Grafana 并导入仪表板"
    echo "2. 配置 AlertManager 通知渠道"
    echo "3. 检查各项监控指标是否正常收集"
    echo "4. 配置应用程序的 metrics 端点"
    echo ""
}

# 主函数
main() {
    log "开始部署监控系统..."
    
    check_parameters
    create_local_structure
    generate_alertmanager_config
    generate_grafana_config
    generate_loki_config
    generate_promtail_config
    upload_configs
    deploy_monitoring_services
    setup_system_monitoring
    test_monitoring
    show_deployment_info
    
    log "监控系统部署完成！"
}

# 运行主函数
main "$@"