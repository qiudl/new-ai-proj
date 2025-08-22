# 重构方案：全部任务页面（UI/UX）

> 目标：以任务状态为核心视角（尤其是规划中/挂起/延期），并在层级父子任务结构下提供高效的一致体验，显著降低查找与操作成本。

## 1. 设计原则
- 清晰层级：关键信息优先（标题、状态、负责人、截止、优先级），树形结构默认展开 2–3 层。
- 一致反馈：筛选、排序、批量操作、拖拽都具备即时可逆反馈。
- 可访问性：AA 对比度、键盘可达、屏幕阅读友好、焦点可见。
- 性能优先：首屏 <1s、交互 <100ms、长列表虚拟化与增量加载。

## 2. 信息架构与布局
- 顶部工具栏：全局搜索、核心筛选（状态/负责人/标签/优先级/项目/日期）、视图切换（列表/看板/日历/洞察）、批量操作入口。
- 主区域视图：
  - 列表（TreeGrid）：可配置列、保存视图、固定列、内联编辑、多列排序。
  - 看板：按状态/负责人/优先级分泳道，可拖拽；支持智能泳道（规划中/挂起/延期）。
  - 日历：周/月视图，拖拽改期，冲突高亮。
  - 洞察：逾期、工作量分布、SLA、周期时间、累计流图（CFD）。
- 右侧详情抽屉：不离开列表即可查看/编辑描述、评论、子任务、活动、依赖、历史。
- 底部状态条：选中计数、批量操作、当前筛选摘要与一键清除。

## 3. 关键交互
- 即时筛选与保存视图：任意筛选组合可另存为“视图”（私有/共享），可设默认；快捷键 f（筛选）、/（搜索）。
- 内联编辑：单元格直接编辑，乐观更新 + 撤销（5s）。
- 拖拽：看板列间拖动改变状态；列表内拖动调整优先级序。
- 批量操作：多选后统一改状态/负责人/标签/优先级/截止日期，显示影响范围。
- 空态与错误态：空态提供下一步引导；错误含重试与诊断信息。

## 4. 可视表达与样式
- 状态色条 + 中性色背景；优先级颜色+形状双编码。
- 密度可切换（舒适/紧凑）；14px 基础字号、40px 行高（紧凑）。
- 徽标：逾期（红点+天数）、即将到期（橙条）、被阻塞（禁行标）。

## 5. 数据模型与字段建议
- 核心：id、title、status、assignee、priority、due_date、project、tags、updated_at。
- 扩展：parent_id、dependencies、estimate、actual、sla、snooze_until、on_hold_reason、blocked_reason、custom_fields（JSON）。
- 默认排序：updated_at desc；支持多列排序与固定自定义排序。

## 6. 性能与技术实现
- 客户端：列表虚拟化、去抖（搜索 200ms）、视图配置本地缓存+服务端持久化、展开分支缓存。
- 服务端：游标分页、筛选字段索引、批量写接口、变更订阅（WebSocket/SSE）。
- 监控：TTFB、FCP、INP、LCP；关键交互埋点（筛选、保存视图、批量操作）。

## 7. 可访问性与国际化
- 键盘：Tab/Shift+Tab、Enter 编辑、Esc 取消、↑↓ 选择、Space 多选、Left/Right 折叠/展开。
- ARIA：role=grid / role=treegrid（树形列表）、aria-expanded/level/posinset/setsize。
- i18n：文案抽取；日期/数字本地化。

## 8. 安全与权限
- 字段级/操作级权限（含批量改负责人/跨项目移动）。
- 审计日志：批量操作、reparent、删除子树、导入导出。

## 9. 迁移与发布
- Alpha：列表 + 详情抽屉 + 基本筛选 + 内联编辑。
- Beta：看板、日历、批量操作、保存视图、层级完整交互。
- GA：洞察、导入导出、权限细化、全量埋点。
- 回滚：保留旧页面 `/tasks/legacy`，灰度开关。

---

## 11. 层级父子任务（Tree）设计
- 数据模型（Postgres）：parent_id、depth、has_children、order_in_parent、path（ltree/物化路径）、rollup_cache（jsonb）。
- 索引：btree(parent_id, order_in_parent)、btree(updated_at)、btree(status, priority)、btree(assignee)；若 ltree 则 gist(path)。
- TreeGrid：展开/折叠、父行聚合（完成/总计、开放/阻塞、加权进度、最早-最晚日期）、树内与全局排序切换。
- 看板/日历：父卡片可展开子项；父为跨度条，拖动父日期提供级联选项（不级联/相对偏移/仅未开始）。
- 批量/级联：仅当前/直接子级/全部后代三档，预览影响范围与撤销。
- a11y 与性能：role=treegrid、虚拟化树、增量加载、展开缓存、乐观 reparent。

## 12. 状态驱动的筛选与视图（规划中/挂起/延期）

### 12.1 状态语义
- 基础状态：draft、planning（规划中）、todo、in_progress、on_hold（挂起）、blocked、done、cancelled、archived。
- 时间/派生字段：due_date、start_date、completed_at、on_hold_reason、blocked_reason、snooze_until。
- 派生逻辑：
  - is_overdue：`status ∉ {done,cancelled,archived} AND due_date < now()`（查询时计算，避免在索引表达式中直接使用 now()）。
  - is_planning：`status = planning`。
  - is_on_hold：`status = on_hold`（可选含 `snooze_until > now()` ）。

### 12.2 顶部快捷筛选（主入口）
- 三枚 Chip：规划中 | 挂起 | 延期，可锁定、多选并与其他条件叠加；计数徽标受当前上下文影响。
- 快捷键：P（规划中）、H（挂起）、O（延期）。

### 12.3 默认视图与排序
- 延期（推荐默认）：is_overdue desc → due_date 升序 → priority 降序 → updated_at 降序。
- 规划中：updated_at 降序 → priority 降序 → due_date 升序。
- 挂起：snooze_until 升序（有则优先），否则 updated_at 降序。

### 12.4 层级一致性
- 命中子项时展示祖先链（弱化 + “由筛选显示”）；父层聚合显示延期/挂起/规划中计数。
- 冲突时以显式状态为准，同时显示提示徽标（例如父=todo 但有子延期）。

### 12.5 看板/日历一致性
- 看板：一键切至“规划中/挂起/延期”智能泳道；父卡片聚合、子卡片独立拖拽。
- 日历：提供“仅显示延期”开关；危险色高亮，悬停显示延期天数/原因，支持快速改期或恢复。

### 12.6 搜索 DSL
- is:overdue、status:planning、status:on_hold 可与其他条件组合。
- 示例：`is:overdue assignee:me priority:high`；`status:on_hold project:web`；`status:planning parent:none`。

### 12.7 数据库查询与索引（Postgres）
- 索引：
  - `CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);`
  - `CREATE INDEX IF NOT EXISTS idx_tasks_due_active ON tasks(due_date) WHERE status NOT IN ('done','cancelled','archived') AND due_date IS NOT NULL;`
  - `CREATE INDEX IF NOT EXISTS idx_tasks_snooze ON tasks(snooze_until) WHERE snooze_until IS NOT NULL;`
  - 复合：`CREATE INDEX IF NOT EXISTS idx_tasks_status_due ON tasks(status, due_date);`
- 查询示例：
  - 延期：`WHERE status NOT IN ('done','cancelled','archived') AND due_date < now()`（命中 idx_tasks_due_active）。
  - 规划中：`WHERE status = 'planning'`（命中 idx_tasks_status）。
  - 挂起：`WHERE status = 'on_hold' OR snooze_until > now()`（命中 idx_tasks_status / idx_tasks_snooze）。

### 12.8 UI 提示与快速操作
- 延期：红色徽标 + “+Nd”；快捷改期/+n 天、指派、改优先级、标记进行中。
- 挂起：灰/黄斜纹；悬停显示原因与“恢复”；可设置/清除 snooze_until。
- 规划中：蓝色标签；“转为待办/进行中”的显性按钮与必填校验。

### 12.9 KPI 与验收
- KPI：找到延期任务中位时间 <3s；挂起→恢复 ≤2 步；规划→执行转化率提升。
- 验收：Chip 一键筛选可保存为默认；层级聚合正确；10 万任务查询 P95 <100ms。

---

注：开发/测试使用 Docker 的 Postgres；生产使用 Postgres（符合你的偏好与生产规则）。
