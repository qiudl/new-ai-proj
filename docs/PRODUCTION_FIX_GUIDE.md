# 生产环境问题快速修复指南

**问题**: 登录后页面遮罩 + 后端API连接失败
**修复时间**: 约15-30分钟

---

## 🚨 关键问题

**根本原因**: GitHub Actions构建前端时,没有通过`--build-arg`传递环境变量给Dockerfile,导致前端构建的API URL配置不正确。

---

## ✅ 已修复的文件

### 1. `.github/workflows/deploy-cicd.yml`

**修改内容**: 添加`--build-arg`参数到前端Docker镜像构建

```yaml
- name: Build frontend Docker image
  run: |
    echo "Building frontend Docker image..."
    docker build \
      -t ai-frontend:${{ github.sha }} \
      -t ai-frontend:latest \
      -f frontend/Dockerfile.prod \
      --target production \
      --build-arg REACT_APP_API_URL=https://proj.joylodging.com/api/v1 \
      --build-arg REACT_APP_ENV=production \
      --build-arg GENERATE_SOURCEMAP=false \
      frontend/
```

**变更**: 第170-172行新增三个build参数

---

## 📋 修复步骤

### 步骤1: 提交修复代码

```bash
cd /Users/johnqiu/coding/www/projects/new-ai-proj

# 查看修改
git status
git diff .github/workflows/deploy-cicd.yml

# 提交修复
git add .github/workflows/deploy-cicd.yml
git add PRODUCTION_FIX_GUIDE.md
git add docs/PRODUCTION_ISSUE_ANALYSIS.md
git add scripts/verify-prod-deployment.sh

git commit -m "fix(cicd): add build args for frontend API URL configuration

- 修复前端构建时API URL配置问题
- 添加REACT_APP_API_URL等build参数
- 确保前端能正确连接到后端API

Fixes: 登录后页面遮罩 + API连接失败问题"

# 推送到远程
git push origin main
```

### 步骤2: 触发CI/CD部署

**方式1**: 自动触发 (推荐)
- Push到main分支会自动触发deploy-cicd.yml workflow
- 等待约10-15分钟完成构建和部署

**方式2**: 手动触发
1. 访问GitHub仓库
2. Actions标签
3. 选择"CI/CD Deploy to Production" workflow
4. 点击"Run workflow"
5. 选择main分支
6. 点击"Run workflow"

### 步骤3: 监控部署进度

```bash
# 在GitHub Actions页面查看:
https://github.com/YOUR_USERNAME/new-ai-proj/actions
```

查看各个job的状态:
- ✅ build-backend
- ✅ build-frontend (关键修复)
- ✅ build-docker-images
- ✅ deploy
- ✅ verify

### 步骤4: 部署完成后验证

#### 方法A: 使用验证脚本 (推荐)

```bash
# SSH到生产服务器
ssh root@proj.joylodging.com

# 运行验证脚本
bash /opt/ai-project-cicd/scripts/verify-prod-deployment.sh
```

#### 方法B: 手动验证

```bash
# SSH到生产服务器
ssh root@proj.joylodging.com

# 1. 检查容器状态
cd /opt/ai-project-cicd/current
docker-compose ps

# 应该看到所有容器都是"Up"状态:
# ai_backend_prod    Up (healthy)
# ai_frontend_prod   Up (healthy)
# ai_postgres_prod   Up (healthy)
# ai_nginx           Up (healthy)
# ai_redis_prod      Up

# 2. 检查后端健康
curl http://localhost:8080/health
# 应该返回: {"status":"ok"}

curl https://proj.joylodging.com/api/v1/health
# 应该返回: {"status":"ok"}

# 3. 检查前端API配置
docker exec ai_frontend_prod grep -r "proj.joylodging.com" /usr/share/nginx/html/static/js/ | head -5
# 应该看到API URL配置

# 4. 检查日志
docker logs ai_backend_prod --tail=50
docker logs ai_frontend_prod --tail=50
docker logs ai_nginx --tail=50
```

#### 方法C: 浏览器验证

1. **访问主页**: https://proj.joylodging.com
   - 应该能看到登录页面
   - 无遮罩/无loading

2. **打开开发者工具** (F12)
   - **Console标签**: 不应该有错误
   - **Network标签**: 查看请求

3. **测试登录**
   ```
   用户名: admin
   密码: [你的密码]
   ```

4. **检查API请求**
   - Network标签中找到登录请求
   - 请求URL应该是: `https://proj.joylodging.com/api/v1/auth/login`
   - 状态码应该是: 200
   - 响应应该包含token

5. **测试功能**
   - ✅ 登录成功,无遮罩
   - ✅ 项目列表可加载
   - ✅ 任务列表可加载
   - ✅ 创建任务正常
   - ✅ 计时器正常

---

## 🔍 故障排查

### 问题1: 前端仍然无法连接API

**检查点**:
```bash
# 检查前端构建的API URL
docker exec ai_frontend_prod cat /usr/share/nginx/html/static/js/main.*.js | grep -o 'proj.joylodging.com' | head -1
```

**预期结果**: 应该输出 `proj.joylodging.com`

**如果没有输出**:
- CI/CD构建可能失败
- 检查GitHub Actions日志
- 重新触发workflow

### 问题2: 登录后仍有遮罩

**可能原因**:
1. 前端代码有bug
2. 全局loading状态未清除

**排查步骤**:
```bash
# 1. 打开浏览器开发者工具
# 2. Console中输入:
document.querySelector('.ant-spin-blur')
// 如果有遮罩,会返回元素

# 3. 查看是否有全局loading
document.querySelector('.ant-spin-spinning')

# 4. 强制清除遮罩(临时)
document.querySelectorAll('.ant-spin-blur').forEach(el => el.classList.remove('ant-spin-blur'))
```

**解决方案**:
- 清除浏览器缓存
- 强制刷新 (Ctrl+Shift+R 或 Cmd+Shift+R)
- 检查前端代码中的TimerContext或其他全局状态

### 问题3: 后端返回CORS错误

**检查**:
```bash
# 查看后端日志
docker logs ai_backend_prod | grep -i cors

# 检查Nginx日志
docker logs ai_nginx | grep -i cors
```

**解决**:
后端CORS配置已正确(允许所有源),如果还有问题:
```bash
# 重启后端
docker-compose restart backend-prod
```

### 问题4: 容器无法启动

```bash
# 查看完整日志
docker-compose logs

# 查看特定容器日志
docker logs ai_backend_prod
docker logs ai_frontend_prod

# 检查磁盘空间
df -h

# 检查内存
free -h

# 如果空间不足,清理Docker
docker system prune -a --volumes
```

---

## 📊 验证清单

部署后验证:

- [ ] GitHub Actions workflow成功完成
- [ ] 所有Docker容器运行正常
- [ ] 后端健康检查通过 (`/health` 返回200)
- [ ] 前端可访问 (https://proj.joylodging.com)
- [ ] 前端构建包含正确的API URL
- [ ] 登录功能正常,无遮罩
- [ ] 可以加载项目列表
- [ ] 可以加载任务列表
- [ ] 可以创建新任务
- [ ] 计时器功能正常
- [ ] 无Console错误
- [ ] Network请求正常

---

## 🛠️ 回滚方案

如果部署后问题仍未解决:

```bash
# SSH到生产服务器
ssh root@proj.joylodging.com

# 执行回滚
cd /opt/ai-project-cicd
bash scripts/rollback.sh
```

或使用GitHub Actions:
1. 访问Actions页面
2. 找到最近一次成功的部署
3. 点击"Re-run jobs"

---

## 📝 后续优化建议

### 短期 (1-2天)
1. ✅ 实施runtime配置方案,使API URL可动态配置
2. ✅ 添加部署后自动验证
3. ✅ 完善监控和告警

### 中期 (1周)
1. 统一环境变量管理
2. 添加E2E测试
3. 实现蓝绿部署

### 长期 (1月)
1. 配置中心集成
2. 完善CI/CD流水线
3. 性能监控优化

---

## 📞 需要帮助?

如果遇到问题:

1. **查看详细分析**: `docs/PRODUCTION_ISSUE_ANALYSIS.md`
2. **运行验证脚本**: `scripts/verify-prod-deployment.sh`
3. **查看日志**: `docker logs <container_name>`
4. **检查GitHub Actions**: https://github.com/YOUR_USERNAME/new-ai-proj/actions

---

**修复创建时间**: 2025-11-20
**预计修复时间**: 15-30分钟
**影响范围**: 前端API连接
**风险等级**: 低 (仅修改构建参数)
