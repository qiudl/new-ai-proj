# 阶段2：文件镜像写入可选化与健康检查 实施记录

## 已完成内容
- 新增应用配置项：
  - `DOCS_MIRROR_ENABLED` (bool)：是否启用文件镜像写入（可选）。
  - `DOCS_MIRROR_PATH` (string)：镜像目录路径。
- 启动自检（非阻断）：
  - 若启用镜像且配置了路径，启动时尝试创建目录并写入一次临时文件，记录 `mirror_writable` 状态。
- 健康检查与文档一致性：
  - 基础健康 `/health` 增加 `docs` 字段，包含 `mirror_enabled`、`mirror_base_path`、`mirror_writable`。
  - 文档一致性检查（DB 级）：`GET /documents/health/docs` 返回孤儿文档与孤儿链接计数。
  - 综合健康：`GET /health/docs` 返回文档一致性（孤儿计数）+ 镜像配置与可写性。
- 路由与实现位置：
  - 后端：`backend/routes/setup.go` 新增/调整健康路由。
  - 后端：`backend/application/handlers.go` 扩展健康返回。
  - 后端：`backend/application/application.go` 启动时检测镜像可写性。
  - 后端：`backend/config/config.go` 新增 AppConfig 字段与 env 读取。

## 配置示例
```bash
export DOCS_MIRROR_ENABLED=true
export DOCS_MIRROR_PATH=/var/app/docs-mirror
```

## 使用方式
- 查看基础健康：`GET /health`
- 查看文档一致性（仅 DB 指标）：`GET /documents/health/docs`
- 查看综合健康（含镜像信息）：`GET /health/docs`

## 注意事项
- 镜像写入为可选，不影响主流程；若不可写仅记录警告与健康状态字段，不阻塞启动。
- 未改动实际写入路径逻辑，后续如需启用双写/镜像写入策略，将在服务层实现。

## 后续计划
- [ ] 根据配置在文档写入路径实现可选镜像双写（带重试与指标）。
- [ ] 健康检查扩展磁盘空间、inode、路径权限等指标。
- [ ] 提供 `/docs` 或 `/swagger` 文档索引暴露（当前有静态 OpenAPI 文件，需在后端挂载静态目录或代理）。
