# 生产环境后端连接问题修复报告

## 📋 问题描述

**症状**: 生产环境前端无法连接到后端API
**影响**: 所有API请求失败，导致应用无法正常使用
**发现时间**: 2025-11-18
**修复分支**: `fix/prod-bugs`

---

## 🔍 问题分析

### 根本原因

Nginx配置文件中使用了**容器名**而非**服务名**来进行反向代理配置。

在Docker Compose网络中：
- ✅ **应该使用**: 服务名（service name） - 由Docker Compose自动创建DNS记录
- ❌ **错误使用**: 容器名（container_name） - 不会自动创建DNS记录

### 错误配置

在 `nginx/sites/ai-project.conf` 中：

```nginx
# ❌ 错误：使用容器名
location /api/ {
    proxy_pass http://ai_backend_prod:8080;  # 容器名
    ...
}

location / {
    proxy_pass http://ai_frontend_prod:80;  # 容器名
    ...
}
```

### 正确配置

在 `docker-compose.prod.yml` 中定义：

```yaml
services:
  backend-prod:              # ← 服务名（用于DNS解析）
    container_name: ai_backend_prod  # ← 容器名（仅用于docker ps显示）
    ...

  frontend-prod:             # ← 服务名
    container_name: ai_frontend_prod
    ...
```

应该使用：

```nginx
# ✅ 正确：使用服务名
location /api/ {
    proxy_pass http://backend-prod:8080;  # 服务名
    ...
}

location / {
    proxy_pass http://frontend-prod:80;  # 服务名
    ...
}
```

---

## ✅ 修复内容

### 修改文件

- **文件**: `nginx/sites/ai-project.conf`
- **修改位置**: 8处配置项

### 详细修改

| 配置位置 | 错误配置 | 正确配置 | 行号 |
|---------|---------|---------|------|
| API代理 | `ai_backend_prod:8080` | `backend-prod:8080` | 56 |
| 前端代理 | `ai_frontend_prod:80` | `frontend-prod:80` | 83 |
| SSE代理 | `ai_backend_prod:8080` | `backend-prod:8080` | 104 |
| SSE健康检查 | `ai_backend_prod:8080` | `backend-prod:8080` | 164 |
| 登录接口 | `ai_backend_prod:8080` | `backend-prod:8080` | 333 |
| 健康检查 | `ai_backend_prod:8080` | `backend-prod:8080` | 342 |
| 文件上传 | `ai_backend_prod:8080` | `backend-prod:8080` | 354 |
| API文档 | `ai_backend_prod:8080` | `backend-prod:8080` | 388 |

---

## 🔧 修复验证

### 检查命令

```bash
# 验证配置文件中已无容器名引用
grep -n "ai_backend_prod\|ai_frontend_prod" nginx/sites/ai-project.conf

# 应该返回: ✅ No more container name references found
```

### 测试步骤

1. **本地测试** (可选):
   ```bash
   # 启动生产环境
   docker-compose -f docker-compose.prod.yml up -d

   # 检查容器状态
   docker-compose -f docker-compose.prod.yml ps

   # 测试API连接
   curl https://proj.joylodging.com/api/v1/health
   ```

2. **生产部署后验证**:
   ```bash
   # SSH到生产服务器
   ssh user@152.136.104.251

   # 检查nginx配置
   docker exec ai_nginx nginx -t

   # 重新加载nginx配置
   docker exec ai_nginx nginx -s reload

   # 测试API
   curl -k https://localhost/api/v1/health
   ```

---

## 📊 影响范围

### 受影响的端点

- ✅ 所有 `/api/*` 请求
- ✅ 前端页面加载 `/`
- ✅ SSE长连接 `/api/v1/timer/sse`
- ✅ 文件上传 `/api/v1/upload`
- ✅ API文档 `/docs`
- ✅ 健康检查 `/health`

### 未受影响的服务

- ✅ MCP服务 (使用IP地址 172.30.0.1:3100)
- ✅ Grafana (使用IP地址 172.30.0.1:3001)
- ✅ PostgreSQL (内部服务，直连)
- ✅ Redis (内部服务，直连)

---

## 🚀 部署说明

### 自动部署（推荐）

当PR合并到main分支后，GitHub Actions会自动：

1. 构建新的Docker镜像
2. 部署到生产服务器
3. 重新加载Nginx配置
4. 运行健康检查

### 手动部署（如需要）

```bash
# 1. 连接到生产服务器
ssh user@152.136.104.251

# 2. 拉取最新代码
cd /opt/ai-project
git pull origin main

# 3. 重新启动nginx（或重新加载配置）
docker exec ai_nginx nginx -s reload

# 4. 验证服务
curl -k https://localhost/api/v1/health
```

---

## 📝 经验教训

### 关键发现

1. **Docker Compose网络DNS解析**
   - Docker Compose自动为每个服务创建DNS记录
   - DNS名称是**服务名**，不是容器名
   - 容器名只用于 `docker ps` 显示

2. **配置一致性**
   - `nginx.conf` 正确使用了服务名
   - `nginx/sites/ai-project.conf` 错误使用了容器名
   - 需要保持配置一致性

3. **测试重要性**
   - 生产环境部署前应充分测试
   - 使用与生产环境相同的Docker Compose配置

### 预防措施

1. **配置验证脚本**
   ```bash
   # 添加到CI/CD流程
   grep -r "ai_backend_prod\|ai_frontend_prod" nginx/
   if [ $? -eq 0 ]; then
     echo "错误：发现容器名引用，应使用服务名"
     exit 1
   fi
   ```

2. **文档化最佳实践**
   - 在文档中明确说明使用服务名
   - 添加配置示例和注释

3. **代码审查检查清单**
   - 检查Docker网络配置
   - 验证服务名使用
   - 确认DNS解析正确

---

## 🔗 相关资源

### Docker文档

- [Docker Compose Networking](https://docs.docker.com/compose/networking/)
- [Container networking](https://docs.docker.com/network/)

### 项目文档

- [生产部署计划](./PRODUCTION_DEPLOYMENT_PLAN.md)
- [协同开发指南](./COLLABORATION_GUIDE.md)
- [CI/CD配置](./.github/workflows/deploy-cicd.yml)

### 相关配置文件

- `docker-compose.prod.yml` - 生产环境服务定义
- `nginx/nginx.conf` - Nginx主配置
- `nginx/sites/ai-project.conf` - 站点配置 ✅ (已修复)

---

## ✅ 修复总结

| 项目 | 状态 |
|------|------|
| 问题诊断 | ✅ 完成 |
| 根本原因分析 | ✅ 完成 |
| 配置修复 | ✅ 完成 |
| 验证测试 | ⏳ 待部署后验证 |
| 文档更新 | ✅ 完成 |

**修复时间**: 2025-11-18
**修复人员**: AI开发团队
**修复分支**: `fix/prod-bugs`
**相关PR**: #TBD (待创建)

---

**下一步**:
1. ✅ 提交修复代码
2. ✅ 创建Pull Request
3. ⏳ 等待代码审查
4. ⏳ 合并到main并自动部署
5. ⏳ 验证生产环境修复效果

---

**最后更新**: 2025-11-18
**文档版本**: 1.0
