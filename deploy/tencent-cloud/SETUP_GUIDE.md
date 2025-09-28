# 🛠️ 腾讯云服务器初始化执行指导

## 服务器信息确认
- **IP地址**: 152.136.104.251 ✅ (网络连通性已验证)
- **系统**: Ubuntu
- **初始用户**: root

## 📋 执行任务2159的步骤

### 第1步：建立SSH连接

**选项A：使用密码登录**
```bash
ssh root@152.136.104.251
```

**选项B：使用SSH密钥登录**
```bash
# 如果已配置SSH密钥
ssh -i ~/.ssh/your_private_key root@152.136.104.251
```

**选项C：如果需要配置SSH密钥**
```bash
# 生成SSH密钥对（如果没有）
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"

# 复制公钥到服务器
ssh-copy-id root@152.136.104.251

# 然后登录
ssh root@152.136.104.251
```

### 第2步：上传并执行初始化脚本

一旦成功登录到服务器，执行以下步骤：

**方法1：直接上传脚本**
```bash
# 在本机执行，上传初始化脚本到服务器
scp deploy/tencent-cloud/scripts/init-server.sh root@152.136.104.251:/tmp/

# SSH登录到服务器
ssh root@152.136.104.251

# 在服务器上执行
cd /tmp
chmod +x init-server.sh
./init-server.sh
```

**方法2：通过wget下载（推荐）**
```bash
# 登录服务器后执行
ssh root@152.136.104.251

# 在服务器上执行
wget https://raw.githubusercontent.com/your-repo/ai-project/main/deploy/tencent-cloud/scripts/init-server.sh
chmod +x init-server.sh
./init-server.sh
```

**方法3：直接复制粘贴脚本内容**
如果无法上传文件，可以：
1. 在服务器上创建脚本文件：`vim /tmp/init-server.sh`
2. 将脚本内容复制粘贴进去
3. 保存并执行：`chmod +x /tmp/init-server.sh && ./tmp/init-server.sh`

### 第3步：验证初始化结果

初始化完成后，脚本会自动显示安装结果。你也可以手动验证：

```bash
# 检查Docker安装
docker --version
docker-compose --version

# 检查Node.js和Go
node --version
go version

# 检查部署用户
id aiproject

# 检查项目目录
ls -la /opt/ai-project/

# 检查防火墙状态
ufw status

# 检查系统服务
systemctl status docker
systemctl status fail2ban
```

## 🎯 预期的初始化结果

初始化脚本将完成以下任务：

### ✅ 系统更新和基础工具
- 系统包更新
- 安装curl, wget, git, vim, htop等基础工具
- 安装构建工具和依赖

### ✅ Docker环境
- Docker CE 最新版本
- Docker Compose 2.23.3版本
- Docker服务自动启动

### ✅ 开发环境
- Node.js 18.x LTS版本
- Go 1.21.5版本
- Git版本控制工具

### ✅ 安全配置
- UFW防火墙（只开放22, 80, 443端口）
- fail2ban防护（防止暴力破解）
- 系统安全优化

### ✅ 用户和目录
- 创建aiproject部署用户
- 配置sudo权限
- 创建项目目录：/opt/ai-project
- 设置正确的文件权限

### ✅ 系统优化
- 内核参数优化
- 文件描述符限制调整
- 网络参数优化

### ✅ 定时任务
- 自动备份任务（每日凌晨2点）
- SSL证书自动续期
- 日志清理任务

## 🚨 注意事项

1. **备份重要数据**：初始化前备份服务器上的重要数据
2. **网络稳定**：确保网络连接稳定，脚本执行需要10-15分钟
3. **权限确认**：确保以root用户执行初始化脚本
4. **防火墙变更**：脚本会重置防火墙规则，确保SSH访问不被阻断
5. **密钥管理**：如果设置了SSH_PUBLIC_KEY环境变量，会自动配置SSH密钥

## 🔧 故障排除

### SSH连接问题
```bash
# 测试SSH端口是否开放
telnet 152.136.104.251 22

# 使用详细模式查看连接问题
ssh -v root@152.136.104.251
```

### 脚本执行问题
```bash
# 查看脚本执行权限
ls -la /tmp/init-server.sh

# 查看脚本语法
bash -n /tmp/init-server.sh

# 逐步执行（调试模式）
bash -x /tmp/init-server.sh
```

### 网络连接问题
```bash
# 测试DNS解析
nslookup google.com

# 测试HTTP连接
curl -I http://google.com

# 检查防火墙状态
iptables -L
```

## 📝 执行记录模板

请在执行过程中记录以下信息：

```
执行时间：[记录开始时间]
服务器状态：[记录服务器基本信息]
执行方法：[记录使用的执行方法]
执行过程：[记录关键步骤和输出]
遇到的问题：[记录任何错误或警告]
解决方案：[记录问题的解决方法]
最终结果：[记录初始化是否成功]
验证结果：[记录验证命令的输出]
```

## ⏭️ 下一步

初始化完成后，任务2159将标记为完成，接下来将执行：
- 任务2160：创建生产环境Docker配置文件 ✅（已完成）
- 任务2161：配置SSL证书和Nginx反向代理 ✅（已完成）
- 任务2162：编写自动化部署和初始化脚本 ✅（已完成）
- 任务2163：配置监控、日志和安全策略
- 任务2164：执行部署和验证系统功能

---

**准备就绪！现在可以登录服务器执行初始化了。** 🚀