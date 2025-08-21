# 任务说明：检查工作笔记模块（Document Manager）的设计与数据库持久化

- 任务ID：355
- 链接：http://localhost:3001/document-manager
- 背景：用户指出在线工作笔记模块当前存在 bug，同时强调仅将笔记写入 Markdown 文件不足，需要将笔记存入数据库以便后续使用。
- 相关规则：
  - 用户偏好：开发环境优先使用 Docker 的 Postgres 数据库（而非本地实例）。
  - 生产环境：必须使用 Postgres。
  - Jenkins：偏好 Docker-based agent（若涉及 CI）。

## 目标
1. 弄清工作笔记（Document）数据模型与表结构。
2. 弄清文档创建/更新流程的 API 设计、鉴权与校验。
3. 验证数据持久化路径：Web -> API -> DB（Postgres in Docker）。
4. 复现并定位当前 bug 的触发场景与堆栈，提出修复方案。

## 非目标
- 不包含前端样式优化或编辑器富文本特性改造（除非与 bug 直接相关）。

## 初步排查计划
- 阅读后端代码：Controller/Route、Service、Repository/ORM、Migration。
- 阅读前端代码：Document Manager 页面的状态流（数据获取、保存、错误处理）。
- 检查连接配置：Docker Compose / 环境变量（DATABASE_URL 等），本地与生产差异。
- 查看日志：后端错误日志、数据库日志（约束、事务、权限）。
- 复现路径：访问 http://localhost:3001/document-manager，执行新建、更新、保存、加载操作。

## 风险与依赖
- 若未使用迁移工具，数据库结构可能与代码不一致。
- 本地环境变量与容器内网络地址（如 host.docker.internal）差异。

## 交付物
- 一份问题根因分析与修复建议。
- 若涉及 DB 结构或 API 变更，提供 Migration/Schema 变更与接口契约更新。
- 回归测试用例与自测脚本。

---
记录时间：2025-08-21 09:22Z