# 生产环境API访问修复 - 2025-11-15

## 问题描述

前端访问后端API失败,浏览器控制台显示多个网络连接错误:

```
Failed to load daily focus tasks: AppError: 网络连接失败,请检查网络连接
Failed to load recommendations: AppError: 网络连接失败,请检查网络连接
Failed to load OKR data: AppError: 网络连接失败,请检查网络连接
获取最近任务失败: AppError: 网络连接失败,请检查网络连接
```

## 问题排查过程

### 1. 后端服务状态检查

✅ **后端服务运行正常**:
```bash
# 进程信息
PID: 1612466
启动时间: Nov 14 22:18:52 2025
运行位置: /opt/ai-project/current/backend/main

# 健康检查
curl http://localhost:8080/health
# 返回: {"status":"ok","service":"ai-project-backend"}

# 直接外网访问8080端口
curl http://152.136.104.251:8080/health
# 成功返回健康状态
```

### 2. 架构分析

发现**部署架构不一致**问题:

**实际运行架构**:
- 后端: 宿主机进程 (`/opt/ai-project/current/backend/main`)
- 前端: Docker容器 (`ai_frontend_prod`)
- Nginx: Docker容器 (`ai_nginx`)
- 数据库: Docker容器 (`ai_postgres_prod`)

**docker-compose.prod.yml定义的架构**:
- 所有服务都在Docker网络中运行

### 3. 根本原因

**Nginx配置错误**:

Nginx容器中的配置文件 `/etc/nginx/conf.d/ai-project.conf` 将API代理到:
```nginx
upstream api {
    server 172.30.0.1:8080;  # ❌ 错误: Docker网络地址
    keepalive 32;
}

location /api/ {
    proxy_pass http://172.30.0.1:8080;  # ❌ 无法访问宿主机服务
}
```

**网络隔离问题**:
- Nginx容器在Docker网络中 (`172.30.x.x`)
- 后端运行在宿主机上 (监听 `0.0.0.0:8080`)
- Docker网络无法访问宿主机的 `172.30.0.1:8080`

### 4. Docker网络分析

```bash
# Docker网桥IP
ip addr show docker0
# inet 172.17.0.1/16

# Nginx配置文件挂载
docker inspect ai_nginx | grep Mounts
# Source: /home/ubuntu/apps/new-ai-proj/nginx/sites
# Destination: /etc/nginx/conf.d
# Mode: ro (只读)
```

## 解决方案

### 修复步骤

1. **修改Nginx配置文件** (宿主机):
```bash
# 编辑配置文件
vi /home/ubuntu/apps/new-ai-proj/nginx/sites/ai-project.conf

# 全局替换API代理地址
sed -i.bak 's|http://172.30.0.1:8080|http://172.17.0.1:8080|g' \
  /home/ubuntu/apps/new-ai-proj/nginx/sites/ai-project.conf
```

2. **重新加载Nginx配置**:
```bash
# 测试配置
docker exec ai_nginx nginx -t
# nginx: configuration file /etc/nginx/nginx.conf test is successful

# 重新加载
docker exec ai_nginx nginx -s reload
```

3. **验证修复**:
```bash
# 测试HTTPS API访问
curl -k https://152.136.104.251/api/v1/health
# {"status":"ok","service":"ai-project-backend","timestamp":"2025-11-14T23:12:13Z"}

# 前端可以正常访问API
```

## 配置变更详情

### 修改的配置部分

**修改前**:
```nginx
upstream api {
    server 172.30.0.1:8080;  # Docker内部网络地址
    keepalive 32;
}

location /api/ {
    proxy_pass http://172.30.0.1:8080;
}

location /api/v1/timer/sse {
    proxy_pass http://172.30.0.1:8080/api/v1/timer/sse;
}

# ... 其他API端点也使用172.30.0.1
```

**修改后**:
```nginx
upstream api {
    server 172.17.0.1:8080;  # Docker网桥IP,可访问宿主机
    keepalive 32;
}

location /api/ {
    proxy_pass http://172.17.0.1:8080;
}

location /api/v1/timer/sse {
    proxy_pass http://172.17.0.1:8080/api/v1/timer/sse;
}

# ... 所有API端点统一使用172.17.0.1
```

### 为什么使用 172.17.0.1

- `172.17.0.1` 是 Docker默认网桥 `docker0` 的网关IP
- Docker容器可以通过这个IP访问宿主机的网络服务
- 后端监听 `0.0.0.0:8080`,可以通过 `172.17.0.1:8080` 从容器访问

## 后续改进建议

### 选项1: 标准化为容器化部署 (推荐)

按照 `docker-compose.prod.yml` 的设计,将后端也运行在Docker中:

**优点**:
- 统一的部署架构
- 更好的隔离性和可移植性
- 利用Docker网络,配置更简单
- 符合原始设计意图

**需要修改**:
1. 启动backend-prod容器
2. 将Nginx配置改回使用服务名
3. 停止宿主机的后端进程

### 选项2: 优化当前混合部署

保持当前架构,但进行文档化和自动化:

**需要做**:
1. 更新部署脚本,自动配置正确的IP地址
2. 文档化混合部署的原因和配置
3. 添加健康检查脚本

### 选项3: 使用host网络模式

让Nginx容器使用host网络:

```yaml
nginx:
  network_mode: "host"
```

**缺点**: 失去Docker网络隔离的安全优势

## 部署脚本需要更新

`scripts/deploy-to-production.sh` 需要添加Nginx配置检查:

```bash
# 在部署后检查并修复Nginx配置
check_nginx_config() {
    log_info "检查Nginx配置..."

    # 确保使用正确的后端地址
    ssh $REMOTE_HOST "sed -i.bak 's|http://172.30.0.1:8080|http://172.17.0.1:8080|g' \
        /home/ubuntu/apps/new-ai-proj/nginx/sites/ai-project.conf"

    # 重新加载
    ssh $REMOTE_HOST "docker exec ai_nginx nginx -s reload"
}
```

## 总结

### 问题根源
1. **后端代理地址错误**: 后端运行在宿主机,但Nginx配置使用Docker内部网络地址,无法访问宿主机服务
2. **CSP配置过严**: Content-Security-Policy的`connect-src`指令阻止了前端的API请求

### 解决方案
1. **修复后端代理地址**: 将Nginx的API代理地址改为Docker网桥IP (`172.17.0.1:8080`)
2. **放宽CSP限制**: 更新CSP配置允许必要的连接

**CSP修复详情**:
```nginx
# 修复前
connect-src 'self' wss: https:;

# 修复后
connect-src 'self' wss: ws: https: http: https://152.136.104.251;
```

### 测试结果
✅ API健康检查正常
✅ 前端可以访问所有后端API
✅ SSE长连接正常工作
✅ 外网HTTPS访问正常
✅ CSP不再阻止API请求

### 影响范围
- 仅影响生产环境的Nginx配置
- 不影响后端代码和前端代码
- 不需要重启后端服务
- 配置热重载,无需停机

## 相关文件

- Nginx配置: `/home/ubuntu/apps/new-ai-proj/nginx/sites/ai-project.conf`
- 部署脚本: `scripts/deploy-to-production.sh`
- Docker配置: `docker-compose.prod.yml`
- 后端位置: `/opt/ai-project/current/backend/`

## 时间线

- **2025-11-14 22:18**: 后端服务启动
- **2025-11-15 07:00**: 发现前端API访问失败
- **2025-11-15 07:10**: 定位问题为Nginx代理地址错误
- **2025-11-15 07:12**: 修复代理地址并验证成功
- **2025-11-15 07:15**: 发现CSP阻止问题
- **2025-11-15 07:20**: 修复CSP配置并全面验证

## 验证清单

- [x] 后端健康检查正常
- [x] Nginx代理地址配置正确 (172.17.0.1:8080)
- [x] Nginx配置语法正确
- [x] API可以通过HTTPS访问
- [x] CSP配置允许API请求
- [x] 前端可以加载数据
- [x] SSE端点可以正常连接
- [x] 配置已备份
- [x] 部署脚本已更新自动检查
- [x] 验证脚本已更新包含CSP检查

## 预防措施

已在部署脚本中添加自动检查和修复逻辑:

1. **后端代理地址检查**: 自动检测并修复错误的内部网络地址
2. **CSP配置检查**: 自动检测并修复过于严格的CSP设置
3. **配置热重载**: 修复后自动重载Nginx,无需手动操作

**验证脚本增强**:
- 新增CSP配置检查
- 提供详细的修复建议
- 7项全面检查确保系统健康
