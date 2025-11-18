# CI/CD 部署问题修复记录

## 问题描述

首次 CI/CD 部署失败，错误：`[ERROR] docker-compose.yml 不存在`

## 根本原因

部署脚本 `deploy.sh` 期望从 `/opt/ai-project-cicd/shared/env/docker-compose.prod.yml` 复制配置文件到版本目录，但该文件不存在。

## 解决方案

创建了适用于 CI/CD 的 docker-compose.yml 文件：

1. **简化配置**: 移除了构建指令（build），改用预构建的 Docker 镜像
2. **使用镜像标签**: `ai-backend:latest` 和 `ai-frontend:latest`
3. **环境变量**: 通过 `env_file` 引用 `/opt/ai-project-cicd/shared/env/.env`
4. **服务简化**: 
   - PostgreSQL 16
   - Go 后端 (端口 8080)
   - React 前端 (端口 3000)
   - Redis 缓存 (端口 6379)

## 部署流程

1. GitHub Actions 构建 Docker 镜像
2. 镜像上传到服务器
3. 部署脚本加载镜像并标记为 latest
4. docker-compose 使用 latest 镜像启动服务

## 文件位置

- **服务器**: `/opt/ai-project-cicd/shared/env/docker-compose.prod.yml`
- **本地**: `/tmp/docker-compose.cicd.yml`

## 修复时间

2025-11-18 20:10

## 后续测试

重新触发 GitHub Actions 工作流以验证修复。
