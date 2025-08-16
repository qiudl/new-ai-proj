---
id: twms-integration-guide
title: TWMS 外部系统集成指南（API Key）
date: 2025-08-16
---

概述
- 目标：为 TWMS（Transport Warehouse Management System）对接提供安全的 API Key 访问方式
- 适用范围：任务管理读取/写入、项目读取、计时器同步（可通过任务写入接口实现）
- 环境约束（遵循用户规则）：
  - 开发/测试/CI：优先使用 Docker 的 Postgres
  - 生产：必须使用 Postgres
  - Jenkins：使用 Docker-based agent

权限与范围（scopes/permissions）
- 最小权限集合：
  - api.read
  - tasks.read
  - tasks.write
  - projects.read
- 可按需扩展，但建议遵循最小权限原则

速率限制
- 默认：600 次/小时（可在创建时调整 rate_limit_count、rate_limit_window）
- 超限返回：429 Too Many Requests

IP 白名单
- 建议将 TWMS 出口 IP/CIDR 配置到 allowed_ips 中
- 在网关/反向代理场景注意 X-Forwarded-For 的信任边界

创建 Key（自动脚本）
- 使用脚本：scripts/provision_twms_api_key.sh
- 依赖：jq
- 示例（仅输出一次明文 key）：
  BASE_URL=http://localhost:8081/api/v1 TWMS_IPS="203.0.113.10,203.0.113.11" \
  RATE_LIMIT_COUNT=600 RATE_LIMIT_WINDOW=per_hour \
  ./scripts/provision_twms_api_key.sh
- 安全提示：明文 key 仅显示一次，使用后请妥善保存于安全存储，并仅以环境变量注入。

请求头与认证
- 推荐请求头：X-API-Key: {{TWMS_API_KEY}}
- 兼容 Authorization: Bearer {{TWMS_API_KEY}}

常用接口示例
- 任务列表（只读）
  curl -s -H "X-API-Key: {{TWMS_API_KEY}}" \
    "{{BASE_URL}}/tasks?project_id={{PROJECT_ID}}"

- 创建/更新任务（写入）
  curl -s -X POST -H "Content-Type: application/json" \
    -H "X-API-Key: {{TWMS_API_KEY}}" \
    -d '{"title":"入库单同步","status":"in_progress"}' \
    "{{BASE_URL}}/tasks"

- 读取项目信息（只读）
  curl -s -H "X-API-Key: {{TWMS_API_KEY}}" \
    "{{BASE_URL}}/projects/{{PROJECT_ID}}"

轮换与撤销
- 轮换：新建新 Key，更新 TWMS 配置后撤销旧 Key，确保过渡期无中断
- 撤销：通过系统管理后台或 API 删除/停用（注意：明文不可恢复）

审计与监控
- 已内置 api_usage_logs 与配额统计，建议接入日志与监控面板
- 异常（高错误率/高频率）可通过视图与统计快速定位

问题排查
- 401：Key 格式不正确/不存在/已撤销/已过期
- 403：IP 白名单不匹配、权限不足、HMAC 校验失败（如启用）
- 429：触发速率限制

附录
- Key 仅返回一次明文，数据库仅存哈希
- 请勿在日志或工单中粘贴明文 Key；用于自动化时通过环境变量传递
