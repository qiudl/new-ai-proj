# 开发计划：完成百分比算法与进度计算 API

> 任务：#536（后端：完成百分比算法与进度计算 API）  
> 状态：in_progress  
> 项目：ai-proj  
> 生成时间：2025-08-23T08:03:55Z

本计划遵循你的规则与偏好：
- 本地与测试使用 Docker 的 Postgres
- CI 使用 Docker-based Jenkins agent
- 生产环境使用 Postgres

---

## 一、目标与范围
**目标**
- 提供统一的“完成百分比（progress）”算法
- 暴露标准化 API，支持按任务/父任务/项目层级计算并返回进度与分解

**范围**
- 实现算法、必要配置与数据读写
- 提供只读查询 API（实时计算 + 可选缓存/快照）

**不在范围**
- 前端可视化与页面
- 历史回填（除非另行要求）

---

## 二、关键需求与假设（可调整）
- 实体范围：支持 task 及其父级（epic/project），可扩展 entityType
- 权重：优先使用 `story_points` 或 `estimate_hours`；若均无则权重=1
- 状态映射：如 `todo=0`, `in_progress=50`, `done=100`, `blocked=0`；可配置
- 手动覆盖：允许 `manual_override` 与 `manual_value`
- 叶子任务进度优先级：manual > checklist 完成度 > 工时进度 > 状态映射
- 父级进度：加权平均（剔除 `canceled`；`blocked` 计 0；归档可选忽略）
- 精度：百分比保留 1 位小数，范围 [0, 100]
- 性能：小规模实时；大规模支持缓存与快照

---

## 三、算法设计
**叶子任务 `progress_leaf`（按优先级取第一个可用值）**
1. `manual_override=true` → `progress = clamp(manual_value, 0..100)`
2. `checklist_total>0` → `progress = 100 * done/total`
3. `estimate_hours>0` 且 `actual_spent` 有值 → `progress = min(100, 100 * actual_spent/estimate)`
4. 否则 `progress = status_map[status]`（默认 0）

**父级 `progress_parent`**
- `children =` 过滤掉 `canceled`（或按配置）
- `weight(child) =` `estimate_hours` 或 `story_points` 或 1
- `progress = sum(child.progress * weight) / sum(weight)`

**其他规则**
- `blocked` 计 0；`done=100`；状态映射可配置
- rounding：保留 1 位小数
- 可选平滑参数（最低门槛/末端补偿）后续迭代

---

## 四、数据模型与迁移（Postgres）
**字段与表（与现有命名适配）**
- `tasks`：
  - `estimate_hours numeric`
  - `story_points numeric`
  - `status text`
  - `checklist_total int`
  - `checklist_done int`
  - `actual_spent_seconds bigint`
  - `manual_override boolean`
  - `manual_value numeric`
- `progress_snapshots`：`id, entity_type, entity_id, progress numeric, computed_at timestamptz, inputs jsonb`
- `progress_config`：`status_progress_map jsonb, include_canceled boolean, blocked_policy text, default_weight text`

**迁移策略**
- 新增字段默认空值，保持向后兼容
- 为 `progress_snapshots(entity_type, entity_id, computed_at)` 建索引

---

## 五、API 设计（v1）
- `GET /api/v1/progress/{entityType}/{id}`
  - Query：`include=children|formula|snapshots`（可多选）
  - Response：
    - `id, entity_type, progress, method_used, updated_at`
    - `breakdown`（子项进度与权重）、`inputs`（关键输入概要）、`config_id/version`
- `GET /api/v1/progress/{entityType}/{id}/snapshots?from=&to=&granularity=daily|hourly`
  - 返回时间序列
- 可选：`POST /api/v1/progress/recompute`
  - Body：`{ entityType, id, recursive: boolean, persistSnapshot: boolean }`

---

## 六、系统与性能策略
**计算策略**
- 默认实时计算（单实体 O(children)）
- 大实体提供缓存：计算结果入库（可与 snapshots 合并）
- 批量重算：队列任务，以拓扑顺序自下而上递归

**并发与一致性**
- 同步读、异步写缓存；避免写放大
- 乐观策略 + 幂等重算

---

## 七、测试计划
- 单元测试：算法分支与边界（0/100、无估算、手动覆盖、blocked/canceled 等）
- 集成测试：Postgres 读写、迁移回滚、批量重算
- 合约测试：API 入参校验与响应结构
- 性能测试：父节点 1k/10k 子项的响应时间与内存

---

## 八、交付物
- 代码：算法模块、API 控制器/路由、中间件、数据访问层、迁移脚本
- 配置：状态映射与策略开关
- 文档：接口说明、配置说明、运维指南
- 测试：自动化测试覆盖报告

---

## 九、实施计划与里程碑（3–5 天）
- D1 架构与迁移
  - 评审字段/表命名，补充迁移与索引
  - 搭建本地 Postgres（Docker）
- D2 算法与最小 API
  - 实现叶子/父级算法与输入校验
  - `GET /progress/{type}/{id}` 返回基础结果
- D3 拓展与健壮性
  - breakdown、include 参数、状态映射配置
  - 错误处理、日志/metrics
- D4 缓存与批量重算（可选）
  - snapshots/缓存持久化 + 队列任务
  - 基准测试与优化
- D5 测试完善与文档
  - 覆盖边界用例、性能测试
  - API/运维文档与发布准备

---

## 十、本地开发环境（Docker Postgres）
示例 docker-compose（以占位符代替机密）：

```yaml
version: "3.9"
services:
  postgres:
    image: postgres:16-alpine
    container_name: ai_proj_pg
    environment:
      - POSTGRES_USER=app
      - POSTGRES_PASSWORD={{POSTGRES_PASSWORD}}
      - POSTGRES_DB=appdb
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d appdb"]
      interval: 5s
      timeout: 3s
      retries: 10
volumes:
  pgdata: {}
```

---

## 十一、CI/CD（Jenkins Docker-based agent）

```groovy
pipeline {
  agent {
    docker {
      image 'node:20-alpine' // 或后端语言对应镜像
      args '-v /var/run/docker.sock:/var/run/docker.sock'
    }
  }
  stages {
    stage('Deps') { steps { sh 'make deps' } }
    stage('DB (Test)') { steps { sh 'docker compose -f docker-compose.test.yml up -d --wait' } }
    stage('Migrate') { steps { sh 'make migrate-up' } }
    stage('Test') { steps { sh 'make test' } }
    stage('Lint') { steps { sh 'make lint' } }
    stage('Package') { steps { sh 'make build' } }
  }
  post {
    always { sh 'docker compose -f docker-compose.test.yml down -v || true' }
  }
}
```

---

## 十二、接口示例

```json
{
  "id": 123,
  "entity_type": "task",
  "progress": 67.5,
  "method_used": "weighted_avg(children)",
  "updated_at": "2025-08-23T08:01:00Z",
  "breakdown": [
    { "id": 201, "progress": 100.0, "weight": 5, "status": "done" },
    { "id": 202, "progress": 50.0,  "weight": 3, "status": "in_progress" },
    { "id": 203, "progress": 0.0,   "weight": 2, "status": "blocked" }
  ],
  "inputs": {
    "status_map": { "todo": 0, "in_progress": 50, "done": 100, "blocked": 0 },
    "weight_by": "story_points",
    "excluded_status": ["canceled"]
  }
}
```

---

## 十三、验收标准
- 算法覆盖用例与文档规则一致，误差 ≤ 0.1%
- API 在常见实体（task/parent）返回 200 与正确结构
- 父节点含 1k 子任务时 P95 < 200ms（无缓存），>10k 建议使用缓存/后台重算
- 数据迁移可回滚，保持向后兼容

---

## 十四、风险与缓解
- 数据不完备：字段缺失 → 回退权重=1，并在 `inputs` 中注明
- 大层级性能：提供缓存与队列重算开关
- 业务口径差异：将状态映射与规则配置化并文档化

---

## 十五、规则对齐说明
- 本地/测试环境：使用 Docker 的 Postgres（遵循偏好与规则）
- CI：使用 Docker-based Jenkins agent（遵循偏好与规则）
- 生产：使用 Postgres 存储进度相关数据（遵循规则）

