# 🌐 AI项目管理平台 - 多环境部署指南

本文档详细说明如何配置和管理AI项目管理平台的多环境部署架构。

## 📋 环境概述

项目支持三种环境配置：

| 环境 | 用途 | 数据库 | 端口配置 | 特性 |
|------|------|--------|----------|------|
| 🔧 **开发环境** (Development) | 本地开发调试 | `main_db` | 80, 3000, 8080, 5432 | 热重载、详细日志、调试工具 |
| 🧪 **测试环境** (Testing) | 集成测试验证 | `test_db` | 81, 3001, 8081, 5433 | 自动测试、数据重置、Mock服务 |
| 🚀 **生产环境** (Production) | 线上部署 | 外部数据库 | 80, 443 | 性能优化、安全增强、监控告警 |

## 🛠️ 快速开始

### 1. 环境切换

```bash
# 切换到开发环境 (推荐用于本地开发)
./scripts/switch-env.sh development

# 切换到测试环境
./scripts/switch-env.sh testing  

# 切换到生产环境 (仅用于生产部署)
./scripts/switch-env.sh production
```

### 2. 环境验证

```bash
# 验证当前环境配置
./scripts/verify-environment.sh

# 查看环境状态
./scripts/switch-env.sh status

# 列出所有环境
./scripts/switch-env.sh list
```

### 3. 服务启动

```bash
# 重启服务应用新配置
docker-compose down
docker-compose up -d

# 针对特定环境启动 (测试环境示例)
docker-compose -f docker-compose.testing.yml up -d

# 针对特定环境启动 (生产环境示例)
docker-compose -f docker-compose.production.yml up -d
```

## 📁 配置文件结构

```
project-root/
├── .env                          # 当前活动环境配置
├── .env.development             # 开发环境配置
├── .env.testing                 # 测试环境配置  
├── .env.production              # 生产环境配置
├── docker-compose.yml           # 开发环境容器配置
├── docker-compose.testing.yml   # 测试环境容器配置
├── docker-compose.production.yml# 生产环境容器配置
└── scripts/
    ├── switch-env.sh            # 环境切换脚本
    └── verify-environment.sh    # 环境验证脚本
```

## 🔧 开发环境配置

### 特性
- ✅ **热重载**: 代码修改自动重启
- ✅ **详细日志**: DEBUG级别日志输出  
- ✅ **开发工具**: React DevTools、Source Map
- ✅ **本地数据库**: 使用Docker容器内PostgreSQL

### 访问地址
- 🌐 前端页面: http://localhost/
- 🔧 后端API: http://localhost:8080
- 📊 健康检查: http://localhost:8080/health
- 🗄️ 数据库: localhost:5432/main_db

### 启动命令
```bash
./scripts/switch-env.sh development
docker-compose up -d
```

## 🧪 测试环境配置

### 特性
- ✅ **独立数据库**: 使用`test_db`避免污染开发数据
- ✅ **自动重置**: 每次启动重置数据库状态
- ✅ **Mock服务**: 外部服务使用Mock实现
- ✅ **测试数据**: 自动种子数据初始化

### 访问地址  
- 🌐 前端页面: http://localhost/
- 🔧 后端API: http://localhost:8081
- 🗄️ 数据库: localhost:5433/test_db

### 启动命令
```bash
./scripts/switch-env.sh testing
docker-compose -f docker-compose.testing.yml up -d
```

## 🚀 生产环境配置

### 特性
- ✅ **外部数据库**: 连接生产环境PostgreSQL
- ✅ **HTTPS支持**: SSL证书配置
- ✅ **性能优化**: 资源限制、缓存策略
- ✅ **安全增强**: 生产级密钥、访问控制
- ✅ **监控告警**: Prometheus监控集成

### 部署前准备
1. **修改生产环境配置**:
   ```bash
   vim .env.production
   ```
   
2. **配置必要参数**:
   - `DB_HOST`: 生产数据库主机
   - `DB_USER`: 生产数据库用户
   - `DB_PASSWORD`: 生产数据库密码
   - `JWT_SECRET`: 生产级JWT密钥
   - `ENCRYPTION_KEY`: 32位加密密钥
   - Google Calendar API配置

3. **SSL证书配置**:
   ```bash
   # 将SSL证书放置到指定目录
   mkdir -p nginx/ssl/
   cp your-cert.pem nginx/ssl/cert.pem
   cp your-key.pem nginx/ssl/key.pem
   ```

### 启动命令
```bash
./scripts/switch-env.sh production
docker-compose -f docker-compose.production.yml up -d

# 启用监控服务 (可选)
docker-compose -f docker-compose.production.yml --profile monitoring up -d
```

## ⚙️ 环境变量说明

### 核心配置
| 变量名 | 开发环境 | 测试环境 | 生产环境 | 说明 |
|--------|----------|----------|----------|------|
| `ENV` | development | testing | production | 环境标识 |
| `NODE_ENV` | development | test | production | Node.js环境 |
| `GIN_MODE` | debug | test | release | Go Gin模式 |
| `LOG_LEVEL` | debug | info | warn | 日志级别 |

### 数据库配置
| 变量名 | 开发环境 | 测试环境 | 生产环境 |
|--------|----------|----------|----------|
| `DB_HOST` | localhost | localhost | your-prod-host |
| `DB_NAME` | main_db | test_db | prod_db |
| `DB_PORT` | 5432 | 5432 | 5432 |

### 安全配置
| 变量名 | 开发环境 | 测试环境 | 生产环境 |
|--------|----------|----------|----------|
| `JWT_SECRET` | dev-secret | test-secret | **强密码** |
| `JWT_EXPIRATION` | 168h | 24h | 24h |
| `ENCRYPTION_KEY` | 开发密钥 | 测试密钥 | **32位强密钥** |

## 🔄 环境切换流程

### 自动切换 (推荐)
```bash
# 一键切换到开发环境
./scripts/switch-env.sh development

# 验证环境配置
./scripts/verify-environment.sh

# 重启服务
docker-compose restart
```

### 手动切换
```bash
# 1. 备份当前环境
cp .env .env.backup

# 2. 复制目标环境配置
cp .env.development .env

# 3. 重启服务
docker-compose down && docker-compose up -d
```

## 📊 环境监控

### 健康检查
```bash
# 后端健康状态
curl http://localhost:8080/health

# 前端页面状态  
curl -I http://localhost/

# 数据库连接状态
docker-compose exec db pg_isready -U user -d main_db
```

### 日志查看
```bash
# 查看所有服务日志
docker-compose logs

# 查看特定服务日志
docker-compose logs backend
docker-compose logs frontend  
docker-compose logs db
docker-compose logs nginx
```

## 🚨 故障排除

### 常见问题

#### 1. 端口冲突
**现象**: 服务启动失败，提示端口已被占用
```bash
# 解决方案: 检查端口占用
lsof -i :80
lsof -i :3000
lsof -i :8080
lsof -i :5432

# 关闭占用进程或修改配置文件中的端口
```

#### 2. 数据库连接失败
**现象**: 后端健康检查显示数据库连接失败
```bash
# 解决方案: 检查数据库服务状态
docker-compose ps db
docker-compose logs db

# 重启数据库服务
docker-compose restart db
```

#### 3. 环境配置不生效
**现象**: 修改环境变量后配置未生效
```bash
# 解决方案: 确保重启了服务
docker-compose down
docker-compose up -d

# 验证环境变量加载
docker-compose exec backend env | grep DB_
```

#### 4. 前端页面无法访问
**现象**: 前端页面返回502或404错误
```bash
# 解决方案: 检查nginx和前端服务
docker-compose ps nginx frontend
docker-compose logs nginx
docker-compose logs frontend

# 重建前端容器
docker-compose up -d --force-recreate frontend
```

### 日志级别调整
```bash
# 开发环境 - 启用详细日志
echo "LOG_LEVEL=debug" >> .env.development

# 生产环境 - 减少日志输出
echo "LOG_LEVEL=error" >> .env.production

# 重启生效
docker-compose restart
```

## 📋 检查清单

### 环境切换前检查
- [ ] 确认目标环境配置文件存在
- [ ] 备份当前环境配置
- [ ] 确认数据库配置正确
- [ ] 检查端口是否冲突

### 环境切换后验证
- [ ] 运行环境验证脚本
- [ ] 检查所有服务状态
- [ ] 验证API连接性
- [ ] 确认数据库连接
- [ ] 测试前端页面访问

### 生产部署前检查
- [ ] 更新生产环境密钥
- [ ] 配置SSL证书
- [ ] 设置外部数据库连接
- [ ] 配置域名和CORS
- [ ] 启用监控和日志
- [ ] 测试备份和恢复流程

## 🔗 相关资源

- 📖 [Docker Compose文档](https://docs.docker.com/compose/)
- 📖 [PostgreSQL配置指南](https://www.postgresql.org/docs/)
- 📖 [Nginx配置参考](https://nginx.org/en/docs/)
- 📖 [React环境变量](https://create-react-app.dev/docs/adding-custom-environment-variables/)
- 📖 [Go Gin框架](https://gin-gonic.com/docs/)

## 📞 支持

如有环境配置问题，请检查：
1. 运行`./scripts/verify-environment.sh`获取详细状态
2. 查看`docker-compose logs`了解错误信息  
3. 确认环境变量配置正确
4. 验证网络和端口配置

---

**📌 重要提醒**: 
- 开发环境配置包含默认密钥，**仅用于开发测试**
- 生产环境部署前**必须**修改所有默认密钥和密码
- 定期备份生产环境数据和配置文件
- 监控生产环境性能和错误日志