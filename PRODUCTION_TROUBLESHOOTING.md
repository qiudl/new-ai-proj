# 生产环境故障排查快速参考

## 快速诊断命令

```bash
# 一键验证生产环境状态
./scripts/verify-production-api.sh

# 或使用SSH直接检查
ssh ubuntu@152.136.104.251 "bash -s" << 'EOF'
  echo "=== 后端进程 ==="
  pgrep -fa '/opt/ai-project.*main'

  echo -e "\n=== 端口监听 ==="
  lsof -i :8080

  echo -e "\n=== Docker容器 ==="
  docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "(nginx|frontend|postgres)"

  echo -e "\n=== 健康检查 ==="
  curl -s http://localhost:8080/health | jq .

  echo -e "\n=== Nginx配置 ==="
  grep -E "(172\.[0-9]+\.[0-9]+\.[0-9]+:8080|connect-src)" /home/ubuntu/apps/new-ai-proj/nginx/sites/ai-project.conf | head -2
EOF
```

## 常见问题及解决方案

### 1. 前端显示"网络连接失败"

**症状**:
```
Failed to load daily focus tasks: AppError: 网络连接失败
Failed to load OKR data: AppError: 网络连接失败
```

**可能原因**:
1. Nginx代理地址错误
2. CSP配置过严
3. 后端服务未运行

**诊断**:
```bash
# 检查后端是否运行
curl -k https://152.136.104.251/api/v1/health

# 检查Nginx配置
ssh ubuntu@152.136.104.251 "grep '172\.' /home/ubuntu/apps/new-ai-proj/nginx/sites/ai-project.conf | head -5"
```

**解决方案**:
```bash
# 自动修复 (推荐)
ssh ubuntu@152.136.104.251 'bash -s' << 'EOF'
  NGINX_CONF="/home/ubuntu/apps/new-ai-proj/nginx/sites/ai-project.conf"

  # 修复后端代理地址
  sed -i.bak 's|http://172.30.0.1:8080|http://172.17.0.1:8080|g' "$NGINX_CONF"

  # 修复CSP配置
  sed -i.csp 's|connect-src '\''self'\'' wss: https:|connect-src '\''self'\'' wss: ws: https: http: https://152.136.104.251|g' "$NGINX_CONF"

  # 重载Nginx
  docker exec ai_nginx nginx -s reload

  echo "✓ 配置已修复"
EOF
```

### 2. CSP阻止API访问

**错误信息**:
```
Connecting to '<URL>' violates the following Content Security Policy directive:
"connect-src 'self' wss: https:". The action has been blocked.
```

**根本原因**: CSP的`connect-src`指令过于严格

**正确配置**:
```nginx
# ✓ 正确 - 允许必要的连接
connect-src 'self' wss: ws: https: http: https://152.136.104.251;

# ✗ 错误 - 过于严格
connect-src 'self' wss: https:;
```

**快速修复**:
```bash
ssh ubuntu@152.136.104.251 "sed -i 's|connect-src '\''self'\'' wss: https:|connect-src '\''self'\'' wss: ws: https: http: https://152.136.104.251|g' /home/ubuntu/apps/new-ai-proj/nginx/sites/ai-project.conf && docker exec ai_nginx nginx -s reload"
```

### 3. Nginx无法连接后端

**症状**:
- API返回502 Bad Gateway
- Nginx日志显示"Connection refused"

**可能原因**:
1. 后端进程未运行
2. Nginx代理地址错误 (使用Docker内部IP而非网桥IP)

**检查后端**:
```bash
ssh ubuntu@152.136.104.251 "pgrep -fa './main' && lsof -i :8080"
```

**检查Nginx配置**:
```bash
ssh ubuntu@152.136.104.251 "grep 'proxy_pass.*8080' /home/ubuntu/apps/new-ai-proj/nginx/sites/ai-project.conf | head -3"
```

**正确的配置**:
```nginx
# ✓ 正确 - 使用Docker网桥IP访问宿主机
proxy_pass http://172.17.0.1:8080;

# ✗ 错误 - Docker内部网络地址,无法访问宿主机
proxy_pass http://172.30.0.1:8080;
```

**修复**:
```bash
ssh ubuntu@152.136.104.251 "sed -i 's|172.30.0.1:8080|172.17.0.1:8080|g' /home/ubuntu/apps/new-ai-proj/nginx/sites/ai-project.conf && docker exec ai_nginx nginx -s reload"
```

### 4. 后端进程未运行

**启动后端**:
```bash
ssh ubuntu@152.136.104.251 << 'EOF'
  cd /opt/ai-project/current/backend

  # 停止旧进程
  pkill -f './main' || true

  # 启动新进程
  nohup ./main > backend.log 2>&1 &

  # 验证
  sleep 2
  curl http://localhost:8080/health
EOF
```

### 5. Docker容器状态异常

**重启Nginx容器**:
```bash
ssh ubuntu@152.136.104.251 "docker restart ai_nginx"
```

**重启前端容器**:
```bash
ssh ubuntu@152.136.104.251 "docker restart ai_frontend_prod"
```

**查看容器日志**:
```bash
# Nginx日志
ssh ubuntu@152.136.104.251 "docker logs --tail 50 ai_nginx"

# 前端日志
ssh ubuntu@152.136.104.251 "docker logs --tail 50 ai_frontend_prod"
```

## 配置文件位置

| 组件 | 配置文件路径 |
|------|-------------|
| Nginx配置 | `/home/ubuntu/apps/new-ai-proj/nginx/sites/ai-project.conf` |
| 后端代码 | `/opt/ai-project/current/backend/` |
| 后端日志 | `/opt/ai-project/current/backend/backend.log` |
| 前端代码 | `/opt/ai-project/current/frontend/` |
| Docker Compose | `/opt/ai-project/docker-compose.prod.yml` |

## 关键IP地址

| 地址 | 用途 |
|------|------|
| `152.136.104.251` | 生产服务器公网IP |
| `172.17.0.1` | Docker网桥IP (宿主机) |
| `172.30.0.x` | Docker内部网络 (容器间通信) |
| `0.0.0.0:8080` | 后端监听地址 (宿主机) |

## 网络架构

```
外网请求 (HTTPS)
    ↓
152.136.104.251:443 (Nginx容器)
    ↓
/api/* → 172.17.0.1:8080 (宿主机后端)
    ↓
/* → ai_frontend_prod:80 (前端容器)
```

## 健康检查端点

```bash
# 后端健康检查
curl -k https://152.136.104.251/api/v1/health

# 前端健康检查
curl -k https://152.136.104.251/health

# Nginx状态
ssh ubuntu@152.136.104.251 "docker exec ai_nginx nginx -t"
```

## 日志查看

```bash
# 后端日志 (实时)
ssh ubuntu@152.136.104.251 "tail -f /opt/ai-project/current/backend/backend.log"

# Nginx访问日志
ssh ubuntu@152.136.104.251 "docker exec ai_nginx tail -f /var/log/nginx/access.log"

# Nginx错误日志
ssh ubuntu@152.136.104.251 "docker exec ai_nginx tail -f /var/log/nginx/error.log"

# 系统日志
ssh ubuntu@152.136.104.251 "journalctl -f -u docker"
```

## 紧急回滚

如果配置修改导致问题:

```bash
ssh ubuntu@152.136.104.251 << 'EOF'
  # 恢复Nginx配置
  cd /home/ubuntu/apps/new-ai-proj/nginx/sites

  # 使用最近的备份
  if [ -f ai-project.conf.bak ]; then
    cp ai-project.conf.bak ai-project.conf
    docker exec ai_nginx nginx -s reload
    echo "✓ 已回滚到备份配置"
  fi
EOF
```

## 自动化工具

### 验证脚本
```bash
./scripts/verify-production-api.sh
```

**检查项目**:
- ✓ 后端健康检查
- ✓ 认证保护
- ✓ Nginx代理配置
- ✓ CSP配置
- ✓ 后端进程状态
- ✓ Docker容器状态

### 部署脚本
```bash
./scripts/deploy-to-production.sh
```

**自动修复功能**:
- 自动检测并修复Nginx代理地址
- 自动检测并修复CSP配置
- 配置热重载,无需停机

## 监控指标

### 关键指标

```bash
# CPU使用率
ssh ubuntu@152.136.104.251 "top -bn1 | grep 'Cpu(s)'"

# 内存使用
ssh ubuntu@152.136.104.251 "free -h"

# 磁盘空间
ssh ubuntu@152.136.104.251 "df -h | grep -E '(Filesystem|/$)'"

# 后端进程资源
ssh ubuntu@152.136.104.251 "ps aux | grep './main' | grep -v grep"
```

### Prometheus指标
```bash
# 后端metrics
curl -k https://152.136.104.251/metrics

# Grafana仪表板
# https://152.136.104.251/grafana/
```

## 联系信息

**文档**: `backend/docs/dev-plans/session-2025-11-15-nginx-api-fix.md`

**维护时间**: 北京时间 (UTC+8)

**最后更新**: 2025-11-15
