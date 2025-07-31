# 快速部署指南

## 🚀 方案一：GitHub仓库部署（推荐）

### 第一步：推送代码到GitHub

```bash
# 如果还没有GitHub仓库，先创建一个
# 访问 https://github.com/new 创建仓库

# 添加所有文件
git add .

# 提交更改
git commit -m "feat: 添加完整的CI/CD部署方案"

# 推送到GitHub
git push origin main
```

### 第二步：在腾讯云服务器运行初始化

```bash
# 使用你的实际GitHub链接
wget https://raw.githubusercontent.com/YOUR_USERNAME/new-ai-proj/main/scripts/tencent-cloud-setup.sh

# 或者使用curl
curl -sSL https://raw.githubusercontent.com/YOUR_USERNAME/new-ai-proj/main/scripts/tencent-cloud-setup.sh -o tencent-cloud-setup.sh

# 赋予执行权限并运行
chmod +x tencent-cloud-setup.sh
sudo ./tencent-cloud-setup.sh
```

## 🔧 方案二：本地脚本部署

### 从本地上传脚本

```bash
# 上传初始化脚本到服务器
scp scripts/tencent-cloud-setup.sh ubuntu@YOUR_SERVER_IP:/tmp/

# SSH连接到服务器
ssh ubuntu@YOUR_SERVER_IP

# 运行脚本
sudo chmod +x /tmp/tencent-cloud-setup.sh
sudo /tmp/tencent-cloud-setup.sh
```

## 📋 方案三：手动分步部署

### 1. 服务器基础环境

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装基础工具
sudo apt install -y curl wget git unzip tree htop

# 安装Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 配置Docker
sudo usermod -aG docker $USER
sudo systemctl enable docker
sudo systemctl start docker
```

### 2. 克隆项目

```bash
# 创建项目目录
sudo mkdir -p /opt/new-ai-proj
sudo chown -R $USER:$USER /opt/new-ai-proj

# 克隆项目
cd /opt/new-ai-proj
git clone https://github.com/YOUR_USERNAME/new-ai-proj.git .
```

### 3. 配置环境

```bash
# 复制环境配置
cp .env.production.template .env.production

# 编辑配置文件
nano .env.production
```

### 4. 启动服务

```bash
# 启动生产环境
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d

# 查看状态
docker-compose -f docker-compose.prod.yml ps
```

## 📊 方案四：GitHub Actions自动部署

### 配置GitHub Secrets

在GitHub仓库的 Settings > Secrets and variables > Actions 中添加：

| Secret名称 | 说明 | 示例值 |
|------------|------|--------|
| `TENCENT_CLOUD_HOST` | 服务器IP | `123.456.789.0` |
| `TENCENT_CLOUD_USER` | SSH用户名 | `ubuntu` |
| `TENCENT_CLOUD_SSH_KEY` | SSH私钥 | `-----BEGIN RSA...` |
| `DB_USER` | 数据库用户名 | `prod_user` |
| `DB_PASSWORD` | 数据库密码 | `secure_password` |
| `DB_NAME` | 数据库名称 | `prod_db` |
| `JWT_SECRET` | JWT密钥 | `your_secret_key` |
| `DOMAIN` | 域名 | `your-domain.com` |

### 触发自动部署

```bash
# 推送到main分支触发生产部署
git push origin main

# 或者创建版本标签
git tag v1.0.0
git push origin v1.0.0
```

## 🔍 验证部署

### 检查服务状态

```bash
# 检查容器
docker ps

# 检查日志
docker-compose logs -f

# 健康检查
curl http://localhost/health
curl http://localhost/
```

### 查看监控

```bash
# 查看系统资源
htop
df -h

# 查看服务日志
tail -f /opt/new-ai-proj/logs/health-check.log
```

## 🚨 故障排除

### 常见问题

1. **权限问题**
   ```bash
   sudo chown -R $USER:$USER /opt/new-ai-proj
   ```

2. **端口冲突**
   ```bash
   sudo netstat -tulpn | grep :80
   sudo fuser -k 80/tcp
   ```

3. **Docker问题**
   ```bash
   sudo systemctl restart docker
   docker system prune -f
   ```

4. **查看详细错误**
   ```bash
   docker-compose logs [service_name]
   journalctl -u docker
   ```

## 📞 需要帮助？

1. 查看完整部署指南：`docs/DEPLOYMENT_GUIDE.md`
2. 运行部署检查：`scripts/check-deployment-ready.sh`
3. 查看GitHub Actions日志
4. 检查服务器日志：`/opt/new-ai-proj/logs/`

---

**注意**: 请将所有的 `YOUR_USERNAME` 替换为你的实际GitHub用户名，`YOUR_SERVER_IP` 替换为你的腾讯云服务器IP地址。