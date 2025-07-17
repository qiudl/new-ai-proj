# 简化SSL设置指南

## 快速部署步骤

### 1. 确保DNS配置正确

确保域名 `proj.joylodging.com` 已正确解析到服务器IP `152.136.104.251`：

```bash
# 检查DNS解析
nslookup proj.joylodging.com
```

### 2. 连接到服务器

```bash
ssh proj-joyloding
```

### 3. 进入项目目录

```bash
cd /home/ubuntu/projects/new-ai-proj
```

### 4. 拉取最新代码

```bash
git pull origin main
```

### 5. 运行SSL设置脚本

```bash
# 给脚本执行权限
chmod +x deploy/ssl-direct-setup.sh

# 运行SSL设置脚本
./deploy/ssl-direct-setup.sh
```

### 6. 验证HTTPS

```bash
# 检查服务状态
docker-compose ps

# 测试HTTPS访问
curl -I https://proj.joylodging.com

# 检查证书状态
openssl x509 -in ssl/live/proj.joylodging.com/cert.pem -text -noout | grep "Not After"
```

## 故障排除

### 如果DNS解析失败

1. 检查域名配置
2. 等待DNS传播（最多24小时）
3. 使用以下命令检查：
   ```bash
   dig proj.joylodging.com
   ```

### 如果证书获取失败

1. 检查80端口是否开放：
   ```bash
   sudo ufw status
   sudo ufw allow 80
   ```

2. 检查nginx服务是否正常：
   ```bash
   docker-compose logs nginx
   ```

3. 手动测试webroot路径：
   ```bash
   curl http://proj.joylodging.com/.well-known/acme-challenge/test
   ```

### 如果HTTPS访问失败

1. 检查证书文件：
   ```bash
   ls -la ssl/live/proj.joylodging.com/
   ```

2. 检查nginx配置：
   ```bash
   docker-compose exec nginx nginx -t
   ```

3. 重启nginx服务：
   ```bash
   docker-compose restart nginx
   ```

## 成功标志

设置成功后，您应该能够：

1. ✅ 访问 https://proj.joylodging.com
2. ✅ HTTP自动重定向到HTTPS
3. ✅ 浏览器显示安全锁图标
4. ✅ API可通过HTTPS访问

## 后续管理

### 查看证书状态
```bash
openssl x509 -in ssl/live/proj.joylodging.com/cert.pem -text -noout | grep "Not After"
```

### 手动续期证书
```bash
sudo certbot renew --dry-run  # 测试续期
sudo certbot renew            # 实际续期
```

### 重启服务
```bash
docker-compose restart nginx
```

如有问题，请检查 `/var/log/letsencrypt/letsencrypt.log` 日志文件。