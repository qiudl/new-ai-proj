# 工作笔记分类管理（文件夹树）试点：多AI并行开发

## 目标与范围
- 构建工作笔记的分类管理功能，支持
  - 基于"文件夹树"的层级分类（多级目录）
  - 节点的增删改查（CRUD）、拖拽排序/移动、重命名、批量移动
  - 与笔记实体的关联（目录节点 -> 笔记集合）
  - 搜索与过滤（按名称、标签、更新时间）
  - 权限与共享（后续阶段）
- 作为多 AI 并行开发的试点，验证任务分解、依赖管理、并行批次执行策略。

## 技术与上下文假设
- 前端：React/Next.js 或 Vue（以现有项目为准），组件库建议：Ant Design / Element Plus。树组件需支持虚拟滚动与可控展开。
- 后端：Node.js（NestJS/Express）或现有后端框架。
- 数据库：PostgreSQL（遵循用户规则，优先使用 Docker 中的 Postgres 实例）。
- 部署与CI：Jenkins（Docker-based agent，遵循用户规则）。
- API 约定：REST 优先，必要时增补简单GraphQL查询。
- 数据迁移：使用迁移工具（Prisma/MikroORM/TypeORM/Knex 之一）。

## 数据模型（初版）
- tables
  - folder (目录节点)
    - id (uuid)
    - parent_id (uuid | null) 
    - name (text, not null)
    - path (ltree / text) - 若用Postgres ltree可简化路径查询
    - position (int) - 同层内排序
    - note_count_cached (int, default 0)
    - created_at, updated_at
  - note (笔记) [既有或新增]
    - id (uuid)
    - title, content, tags, updated_at
  - note_folder (多对多/多对一，按产品决定。此处采用一对多：每篇笔记归属一个目录]
    - note_id (uuid)
    - folder_id (uuid)
    - UNIQUE(note_id)

## 关键用例
1. 创建/重命名/删除目录节点（禁止删除含子节点或设置级联策略）
2. 拖拽移动（同层排序、跨层移动）
3. 展开/折叠、懒加载子节点、分页/虚拟滚动
4. 将笔记移动到目录（单个/批量）
5. 搜索目录节点（名称/路径前缀）与过滤
6. 初始迁移与种子数据

## API 草案
- GET /folders?parentId=xxx&page=1&pageSize=50
- POST /folders { name, parentId }
- PATCH /folders/:id { name? }
- DELETE /folders/:id { force? }
- PATCH /folders/:id/move { targetParentId, position }
- POST /folders/:id/notes:bulk-move { noteIds[] }
- GET /folders/:id/ancestors
- GET /folders/search?q=xxx

## 并行开发批次与依赖
为适配多 AI 并行，设计为"批次(Batch)"并行 + 明确依赖：

- Batch 0: 任务对齐与基础设施
  - T0.1 需求澄清与验收标准定义 → 全部后续任务依赖
  - T0.2 架构蓝图、数据模型冻结（v1）→ 后端/前端并行的先决条件
  - T0.3 开发环境与CI：Docker Postgres、Jenkins Docker Agent、测试框架基线 → 所有实现任务依赖

- Batch 1: 数据层&迁移（可与后端API骨架并行）
  - T1.1 选择ORM与迁移工具、初始化迁移（folder, note_folder） [依赖:T0.2,T0.3]
  - T1.2 ltree/层级结构方案实现与索引 [依赖:T1.1]
  - T1.3 种子数据脚本 [依赖:T1.1]（与T1.2可并行）

- Batch 2: 后端API骨架与服务
  - T2.1 项目目录与模块搭建（folders, notes模块） [依赖:T0.2,T0.3]
  - T2.2 CRUD: create/rename/delete/ancestors [依赖:T1.1]
  - T2.3 移动与排序(move/position) [依赖:T1.2]
  - T2.4 列表与懒加载分页 [依赖:T1.2]
  - T2.5 搜索(search by name/path prefix) [依赖:T1.2]
  - T2.6 批量移动笔记到目录 [依赖:T1.1]
  - T2.7 OpenAPI/Swagger 文档与契约测试 [依赖:T2.1]

- Batch 3: 前端功能与交互
  - T3.1 树组件选型与虚拟化PoC [依赖:T0.2]
  - T3.2 API client与状态管理（React Query/Redux等） [依赖:T2.7]
  - T3.3 目录树浏览、展开/折叠、懒加载 [依赖:T2.4]
  - T3.4 节点CRUD UI [依赖:T2.2]
  - T3.5 拖拽移动/排序 [依赖:T2.3]
  - T3.6 搜索框与高亮 [依赖:T2.5]
  - T3.7 批量选择与移动笔记 [依赖:T2.6]
  - T3.8 错误与空状态、权限态占位 [可独立] 

- Batch 4: 质量保障与交付
  - T4.1 单元测试（后端/前端）覆盖关键用例 [依赖:对应模块完成]
  - T4.2 集成测试（API契约、端到端） [依赖:T2.*,T3.*]
  - T4.3 性能基准（树加载、批量移动） [依赖:T3.3,T2.3]
  - T4.4 CI流程：lint/test/build、Docker镜像、预发环境部署 [依赖:T0.3]
  - T4.5 发布说明与运维手册

## 里程碑与验收
- M1 原型完成：可创建/浏览/重命名/删除节点、基础展开 [Batch1~2核心 + T3.3基础] 
- M2 可用版：移动与排序、搜索、批量移动 [T2.3,T2.5,T2.6,T3.5,T3.6,T3.7] 
- M3 稳定版：测试通过、性能合格、CI打通 [Batch4]

## 并行执行策略（多AI）
- 基于批次切分，每个批次内拆分粒度到"可在一天内完成"的任务卡。
- 明确输入/输出契约：
  - 数据层输出：迁移SQL与Schema定义；
  - 后端输出：OpenAPI规范；
  - 前端输出：Mock接口适配器，先行解耦真实API；
- 通过"阻塞依赖"标注，任务调度器在依赖未满足时自动排队。

## 风险与对策
- 拖拽与跨层移动的并发一致性：使用事务 + 位置重排算法（gap/均分策略）。
- 深层树性能：分页 + 展开懒加载 + 路径前缀索引(ltree)。
- 未来权限模型：目录节点附加owner/visibility，预留字段。

## 验收标准（示例）
- 100k节点下，展开任意节点<150ms（已缓存）/ <500ms（冷启动）。
- 批量移动1k笔记，95分位<2s。
- API 合约测试通过率100%，前端端到端冒烟用例全部通过。
