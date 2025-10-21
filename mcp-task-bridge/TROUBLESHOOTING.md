# MCP远程访问故障排查指南

本文档详细说明如何诊断和解决MCP服务远程访问中可能遇到的问题。

## 问题诊断流程

### 步骤1: 确定问题层级

MCP远程访问涉及以下层级，按顺序排查：

```
客户端 (Claude Code)
    ↓
网络连接
    ↓
防火墙/安全组
    ↓
Nginx (端口443/80)
    ↓
MCP服务 (端口3100)
    ↓
后端API (端口8080)
    ↓
数据库 (端口5432)
```

## 常见问题及解决方案

### 问题1: "Access denied"

**症状**：
```bash
$ curl http://152.136.104.251/mcp/health
Access denied
```

**可能原因**：

#### 原因1: HTTP自动重定向到HTTPS
Nginx配置将所有HTTP请求重定向到HTTPS。

**解决方案**：
```bash
# 使用HTTPS
curl https://152.136.104.251/mcp/health

# 或忽略SSL证书
curl -k https://152.136.104.251/mcp/health
```

#### 原因2: 网络策略限制
当前网络环境可能限制访问外部服务器。

**解决方案**：
1. 从服务器本地测试
2. 从可信任的网络环境测试
3. 检查防火墙规则

#### 原因3: 云服务商安全组
云服务器的安全组可能未开放相应端口。

**解决方案**：
在云服务商控制台检查并开放：
- 端口80 (HTTP)
- 端口443 (HTTPS)

### 问题2: SSL Handshake Failure

**症状**：
```
error:0A000410:SSL routines::sslv3 alert handshake failure
```

**可能原因**：

#### 原因1: SSL证书问题
自签名证书或证书过期。

**解决方案**：

**临时解决（仅用于测试）**：
```bash
# 忽略SSL证书验证
curl -k https://152.136.104.251/mcp/health
```

**永久解决**：
1. 使用Let's Encrypt生成有效证书
2. 更新nginx SSL配置
3. 重启nginx服务

**检查证书状态**：
```bash
openssl s_client -connect 152.136.104.251:443 -servername 152.136.104.251 < /dev/null 2>&1 | \
  grep -E '(subject|issuer|Verify return code)'
```

#### 原因2: TLS版本不兼容
客户端TLS版本与服务器不匹配。

**解决方案**：
```bash
# 指定TLS版本
curl --tlsv1.2 https://152.136.104.251/mcp/health
curl --tlsv1.3 https://152.136.104.251/mcp/health
```

### 问题3: Connection Timeout

**症状**：
```
curl: (28) Connection timed out after X milliseconds
```

**诊断步骤**：

#### 步骤1: 检查网络连通性
```bash
# Ping测试
ping 152.136.104.251

# Traceroute
traceroute 152.136.104.251
```

#### 步骤2: 检查端口开放
```bash
# 使用nc
nc -zv 152.136.104.251 443

# 使用telnet
telnet 152.136.104.251 443

# 使用nmap
nmap -p 80,443,3100 152.136.104.251
```

#### 步骤3: 检查防火墙
```bash
# 在服务器上
sudo iptables -L -n | grep -E '(80|443|3100)'
sudo ufw status
```

**解决方案**：
1. 开放防火墙端口
2. 配置云服务商安全组
3. 检查路由器/网关设置

### 问题4: 401 Unauthorized

**症状**：
```json
{
  "error": "Invalid API key"
}
```

**诊断步骤**：

1. **验证API Key格式**：
```bash
# 检查API Key是否包含前缀
echo "mcpsk_prod_832138dbb8a001c681e1fb73d56a0d06" | wc -c
# 应该是43个字符（包括换行符）
```

2. **检查Header正确性**：
```bash
# 正确的方式
curl -H "X-API-Key: mcpsk_prod_832138dbb8a001c681e1fb73d56a0d06" \
  https://152.136.104.251/mcp/health

# 错误的方式（不要使用）
curl -H "Authorization: Bearer mcpsk_prod_..." \
  https://152.136.104.251/mcp/health
```

3. **检查API Key是否有效**：
在服务器端查询数据库：
```sql
SELECT * FROM service_api_keys
WHERE key_prefix = 'mcpsk_prod_'
AND status = 'active';
```

### 问题5: SSE连接断开

**症状**：
SSE连接建立后几秒/几分钟后断开。

**原因**：
1. Nginx超时设置
2. 代理超时
3. 客户端超时

**解决方案**：

**检查Nginx SSE配置**：
```nginx
location /mcp/sse {
    proxy_read_timeout 600s;     # 10分钟
    proxy_send_timeout 600s;
    keepalive_timeout 600s;

    # 禁用缓冲
    proxy_buffering off;
    add_header 'X-Accel-Buffering' 'no';
}
```

**客户端保活**：
定期发送心跳消息保持连接。

### 问题6: MCP服务未运行

**症状**：
```
curl: (7) Failed to connect to 127.0.0.1 port 3100: Connection refused
```

**诊断步骤**：

在服务器上执行：
```bash
# 检查容器状态
docker ps | grep mcp

# 检查容器日志
docker logs ai_mcp_server_prod

# 检查端口监听
netstat -tlnp | grep 3100
# 或
ss -tlnp | grep 3100
```

**解决方案**：

1. **启动MCP服务**：
```bash
cd /path/to/new-ai-proj
docker-compose -f docker-compose.prod.yml up -d mcp-server-prod
```

2. **重新构建**（如果代码有更新）：
```bash
docker-compose -f docker-compose.prod.yml build mcp-server-prod
docker-compose -f docker-compose.prod.yml up -d mcp-server-prod
```

3. **查看详细日志**：
```bash
docker-compose -f docker-compose.prod.yml logs -f mcp-server-prod
```

## 服务器端诊断脚本

在服务器上运行以下脚本进行全面诊断：

```bash
#!/bin/bash
# 保存为 diagnose-mcp.sh

echo "=== MCP服务诊断 ==="
echo ""

echo "1. 检查MCP容器状态"
docker ps | grep mcp || echo "❌ MCP容器未运行"
echo ""

echo "2. 检查端口监听"
netstat -tlnp | grep -E '(3100|3000)' || echo "❌ MCP端口未监听"
echo ""

echo "3. 测试本地健康检查"
curl -s http://localhost:3100/health || echo "❌ 本地健康检查失败"
echo ""

echo "4. 测试本地SSE连接"
timeout 2s curl -s -N http://localhost:3100/sse | head -5 || echo "❌ 本地SSE连接失败"
echo ""

echo "5. 检查Nginx配置"
docker exec ai_nginx nginx -t || echo "❌ Nginx配置有误"
echo ""

echo "6. 测试Nginx代理"
curl -s http://localhost/mcp/health || echo "❌ Nginx代理失败"
echo ""

echo "7. 检查防火墙"
sudo iptables -L -n | grep -E '(80|443)' || echo "ℹ️ 无iptables规则"
echo ""

echo "8. 检查SSL证书"
openssl x509 -in /path/to/ssl/cert.pem -text -noout | grep -E '(Subject|Issuer|Not After)' || echo "❌ SSL证书读取失败"
echo ""

echo "9. 查看MCP服务日志（最后20行）"
docker logs ai_mcp_server_prod --tail 20
echo ""

echo "=== 诊断完成 ==="
```

## 网络环境特殊情况

### 情况1: 代理环境

如果客户端在代理环境中：

```bash
# 设置代理
export https_proxy=http://proxy.example.com:8080
export http_proxy=http://proxy.example.com:8080

# 测试连接
curl https://152.136.104.251/mcp/health

# 或绕过代理
export no_proxy=152.136.104.251
```

### 情况2: VPN环境

某些VPN可能阻止SSE长连接：

**解决方案**：
1. 使用支持SSE的VPN
2. 配置VPN允许长连接
3. 使用直连（不通过VPN）

### 情况3: 容器网络

从Docker容器访问：

```bash
# 使用主机网络
docker run --network host ...

# 或使用宿主机IP
curl http://host.docker.internal/mcp/health
```

## 日志分析

### MCP服务日志

**正常日志示例**：
```
[MCP-SSE] 🚀 Initializing TaskMCPServer
[MCP-SSE] 📡 API Base URL: http://backend-prod:8080/api/v1
[MCP-SSE] ✨ Server running on port 3000
[MCP-SSE] 📡 SSE endpoint: http://localhost:3000/sse
[MCP-SSE] 💊 Health check: http://localhost:3000/health
```

**错误日志示例**：
```
[MCP-SSE] ❌ Failed to connect transport: Error: ...
[MCP-SSE] ❌ Error executing create_task: ...
```

### Nginx访问日志

**查看MCP相关请求**：
```bash
tail -f /var/log/nginx/access.log | grep '/mcp/'
```

**常见状态码**：
- `200`: 成功
- `301`: HTTP重定向到HTTPS
- `401`: 认证失败
- `404`: 端点不存在
- `502`: 后端服务不可用
- `504`: 后端超时

### Nginx错误日志

```bash
tail -f /var/log/nginx/error.log | grep mcp
```

## 性能优化

### 连接数限制

如果遇到连接数限制：

**Nginx配置**：
```nginx
# nginx.conf
events {
    worker_connections 2048;  # 增加连接数
}

http {
    limit_conn_zone $binary_remote_addr zone=conn_limit_per_ip:10m;
    limit_conn conn_limit_per_ip 100;  # 每IP 100个连接
}
```

### SSE连接优化

**减少超时断开**：
```nginx
location /mcp/sse {
    proxy_read_timeout 3600s;  # 增加到1小时
    proxy_send_timeout 3600s;
    keepalive_timeout 3600s;
}
```

## 监控和告警

### 健康检查监控

使用cron定期检查：

```bash
# crontab -e
*/5 * * * * curl -s http://localhost:3100/health | grep -q "ok" || echo "MCP health check failed" | mail -s "MCP Alert" admin@example.com
```

### 日志监控

监控错误关键词：
```bash
tail -f /var/log/mcp/error.log | grep -E '(ERROR|FATAL|Failed)' --color
```

## 常用诊断命令速查

```bash
# 容器相关
docker ps | grep mcp                              # 查看容器状态
docker logs ai_mcp_server_prod --tail 50        # 查看日志
docker exec -it ai_mcp_server_prod sh           # 进入容器
docker restart ai_mcp_server_prod               # 重启容器

# 网络相关
curl http://localhost:3100/health                # 本地测试
curl -k https://152.136.104.251/mcp/health       # 远程测试
netstat -tlnp | grep 3100                        # 查看端口
ss -tlnp | grep 3100                             # 查看端口（新版）

# Nginx相关
docker exec ai_nginx nginx -t                    # 测试配置
docker exec ai_nginx nginx -s reload             # 重载配置
docker logs ai_nginx --tail 50                   # 查看日志

# 系统相关
sudo ufw status                                  # 防火墙状态
sudo iptables -L -n                              # iptables规则
top | grep node                                  # 进程监控
```

## 获取帮助

如果以上方法都无法解决问题：

1. **收集诊断信息**：
   - 运行诊断脚本
   - 收集相关日志
   - 记录错误消息

2. **检查文档**：
   - [QUICKSTART.md](./QUICKSTART.md)
   - [REMOTE_ACCESS.md](./REMOTE_ACCESS.md)

3. **联系支持**：
   提供以下信息：
   - 问题描述
   - 错误消息
   - 诊断日志
   - 环境信息（操作系统、网络环境等）

---

**最后更新**: 2025-10-21
**维护者**: AI项目管理系统团队
