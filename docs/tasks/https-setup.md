# HTTPS配置指南

## 概述

本指南将帮助您为AI项目管理平台配置HTTPS SSL证书，使用Let's Encrypt提供的免费SSL证书。

## 域名信息

- **域名**: proj.joylodging.com
- **服务器IP**: 152.136.104.251
- **邮箱**: admin@joylodging.com

## 前提条件

### 1. DNS配置

确保域名已正确指向服务器IP地址：

```bash
# 检查DNS解析
nslookup proj.joylodging.com
dig proj.joylodging.com

# 预期结果应该显示：
# proj.joylodging.com -> 152.136.104.251
```

**DNS记录配置**：
- 类型: A
- 主机记录: proj.joylodging.com
- 记录值: 152.136.104.251
- TTL: 600

### 2. 防火墙配置

确保服务器防火墙允许HTTP和HTTPS端口：

```bash
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw status
```

### 3. 域名验证

在配置SSL之前，确保域名可以正常访问：

```bash
curl -I http://proj.joylodging.com
```

## HTTPS配置步骤

### 步骤1: 准备SSL配置文件

所有必要的配置文件已经准备好：

- `nginx/conf.d/default.conf` - 已配置HTTPS支持
- `deploy/ssl-setup.sh` - SSL证书获取脚本
- `deploy/ssl-renew.sh` - SSL证书续期脚本
- `deploy/ssl-manage.sh` - SSL证书管理脚本

### 步骤2: 连接到服务器

```bash
ssh proj-joyloding
```

### 步骤3: 执行SSL设置

```bash
# 使用SSL管理脚本
./deploy/ssl-manage.sh setup

# 或者直接运行设置脚本
sudo ./deploy/ssl-setup.sh
```

### 步骤4: 验证SSL证书

```bash
# 检查SSL证书状态
./deploy/ssl-manage.sh status

# 测试SSL证书
./deploy/ssl-manage.sh test
```

### 步骤5: 验证HTTPS访问

访问以下地址验证HTTPS配置：

- **HTTPS网站**: https://proj.joylodging.com
- **HTTPS API**: https://proj.joylodging.com/api/v1/health
- **HTTP重定向**: http://proj.joylodging.com (应该重定向到HTTPS)

## SSL证书管理

### 查看证书状态

```bash
./deploy/ssl-manage.sh status
```

### 续期证书

```bash
# 自动续期（如果需要）
./deploy/ssl-manage.sh renew

# 强制续期
./deploy/ssl-manage.sh renew --force
```

### 测试SSL配置

```bash
./deploy/ssl-manage.sh test
```

### 备份SSL证书

```bash
./deploy/ssl-manage.sh backup
```

### 恢复SSL证书

```bash
./deploy/ssl-manage.sh restore [backup_name]
```

## 自动续期配置

SSL证书将自动续期，续期配置包括：

1. **Cron任务**: 每天凌晨2点检查证书续期
2. **续期脚本**: `/etc/cron.d/certbot-renewal`
3. **部署钩子**: 证书续期后自动部署

查看续期配置：

```bash
sudo cat /etc/cron.d/certbot-renewal
```

手动测试续期：

```bash
sudo certbot renew --dry-run
```

## 故障排除

### 1. DNS解析问题

```bash
# 检查DNS解析
nslookup proj.joylodging.com
ping proj.joylodging.com

# 如果DNS解析失败，请检查域名配置
```

### 2. 证书获取失败

```bash
# 检查webroot目录
ls -la /var/www/certbot/

# 检查nginx配置
docker-compose exec nginx nginx -t

# 查看nginx日志
docker-compose logs nginx
```

### 3. HTTPS访问失败

```bash
# 检查SSL证书文件
ls -la /home/ubuntu/projects/new-ai-proj/ssl/live/proj.joylodging.com/

# 检查nginx容器
docker-compose ps nginx
docker-compose logs nginx

# 测试SSL连接
openssl s_client -connect proj.joylodging.com:443 -servername proj.joylodging.com
```

### 4. 证书续期失败

```bash
# 检查续期日志
sudo journalctl -u certbot

# 手动续期测试
sudo certbot renew --dry-run

# 检查续期脚本
cat /home/ubuntu/projects/new-ai-proj/deploy/ssl-deploy-hook.sh
```

## 安全配置

### SSL安全等级测试

访问以下链接测试SSL安全等级：

https://www.ssllabs.com/ssltest/analyze.html?d=proj.joylodging.com

### 安全头配置

当前配置包含以下安全头：

- `Strict-Transport-Security` (HSTS)
- `X-Frame-Options`
- `X-Content-Type-Options`
- `X-XSS-Protection`
- `Referrer-Policy`
- `Content-Security-Policy`

### 证书监控

设置证书到期监控：

```bash
# 检查证书到期时间
openssl x509 -in /etc/letsencrypt/live/proj.joylodging.com/cert.pem -text -noout | grep "Not After"

# 检查证书是否即将过期（30天内）
openssl x509 -in /etc/letsencrypt/live/proj.joylodging.com/cert.pem -checkend 2592000
```

## 配置文件说明

### Nginx SSL配置

```nginx
# SSL证书配置
ssl_certificate /etc/nginx/ssl/live/proj.joylodging.com/fullchain.pem;
ssl_certificate_key /etc/nginx/ssl/live/proj.joylodging.com/privkey.pem;

# SSL安全配置
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-CHACHA20-POLY1305;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
ssl_session_tickets off;
```

### 环境变量配置

```env
# SSL配置
SSL_ENABLED=true
SSL_DOMAIN=proj.joylodging.com
SSL_EMAIL=admin@joylodging.com

# 前端HTTPS配置
REACT_APP_API_URL=https://proj.joylodging.com
REACT_APP_ENABLE_HTTPS=true
```

## 联系方式

如有HTTPS配置问题，请检查：

1. DNS解析是否正确
2. 防火墙是否允许443端口
3. 域名是否已生效
4. SSL证书是否有效

更多帮助请查看项目文档或联系技术支持。