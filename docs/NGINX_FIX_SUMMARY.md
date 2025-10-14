# Nginx 配置修复总结

## 问题描述
生产环境出现 502 Bad Gateway 错误，前端无法加载项目列表。

## 根本原因
1. **Nginx upstream 配置错误**：
   - `upstream api` 配置指向 `172.30.0.1:8080`（错误的 Docker 网络）
   - 实际后端服务运行在宿主机的 `8080` 端口
   - 正确的网关地址应该是 `172.20.0.1`

2. **Docker 服务名引用错误**：
   - Nginx 配置中引用了 `backend-prod` 服务
   - 但该服务未在 Docker Compose 中运行
   - 后端服务直接运行在宿主机

## 解决方案

### 1. 修复的配置文件
- `/opt/ai-project/nginx/nginx.conf`
- `/opt/ai-project/nginx/sites/ai-project.conf`

### 2. 执行的修改
```bash
# 替换错误的 upstream 地址
sed -i 's|backend-prod:8080|172.20.0.1:8080|g' /opt/ai-project/nginx/nginx.conf
sed -i 's|http://backend-prod:8080|http://172.20.0.1:8080|g' /opt/ai-project/nginx/sites/ai-project.conf

# 重启 Nginx
docker restart ai_nginx
```

### 3. 验证结果
✅ 健康检查通过：https://proj.joylodging.com/api/v1/health
✅ 后端服务正常响应
✅ 502 错误已解决

## 当前状态
- Nginx 容器：运行中
- 后端服务：运行中（宿主机 PID: 2214737）
- API 网关：正常工作
- Docker 网络：`ai_prod_network` (Gateway: 172.20.0.1)

## 注意事项
1. 后端服务运行在宿主机，不在 Docker 网络内
2. Nginx 通过网关地址 `172.20.0.1:8080` 访问后端
3. 配置文件通过 bind mount 挂载，修改宿主机文件即可生效

## 下次部署建议
1. 考虑将后端服务也 Docker 化，统一在 Docker 网络内运行
2. 或者在 Docker Compose 中添加 extra_hosts 配置
3. 更新部署脚本自动检查 Nginx 配置一致性

---
**修复时间**: 2025-10-12 12:15
**修复状态**: ✅ 成功
