# 任务详情页计时器：多计时器功能设计（草案）

任务ID：528
负责人：ai-pm（默认）
状态：草案

## 背景
系统已支持并行多计时，但任务详情页的计时区仍以单计时假设为主：
- 当其他任务在计时时，仅提供“切换计时”操作，不利于并行控制。
- 缺少多计时场景的显式列表与逐条控制（暂停/继续/完成）。
- 缺少从当前任务选择“并行启动/自动停止其他/遵循默认策略”的入口。

因此，需要对任务详情页的计时功能区进行重新设计，使其成为多计时的就近控制中枢。

## 目标
1) 在任务详情页的计时卡片中：
   - 就地完成本任务的开始/暂停/继续/停止。
   - 展示“所有正在计时的任务”列表，并支持逐条暂停/继续/完成，以及跳转查看。
   - 从当前任务提供“并行启动”“启动并自动停止其他”“遵循默认策略启动”的入口。
2) 与统一计时服务保持一致（/user/timer/* API + useUnifiedTimer），避免重复实现；统一行为和状态刷新。
3) 保持 UI 简洁，优先关键操作，兼容移动端布局。

## 信息架构与交互
### A. 当前任务计时区（卡片上半部分）
- 头部：图标 + 状态 Badge（未计时/运行中/已暂停）。
- 主行动：
  - 未计时：
    - 主要按钮：开始（默认策略）。
    - 下拉菜单：
      - 并行启动（不停止其他计时器）。
      - 启动并自动停止其他（auto_stop_others=true）。
      - 遵循默认设置启动（读取用户偏好，若无则等同默认）。
  - 运行中：
    - 暂停（次要）
    - 完成（主按钮，危险态）
  - 已暂停：
    - 继续（主按钮）
    - 完成（次要，危险态）
- 状态区：
  - 实时计时（HH:MM:SS，每秒本地刷新）。
  - 开始时间（辅助信息/tooltip）。
  - 快捷键提示（Ctrl/Cmd + Space 开始/暂停/继续；Ctrl/Cmd + E 停止）。

### B. 正在计时的任务列表（卡片下半部分）
- 标题：⏱️ 正在计时的任务（N） + 刷新。
- 列表项（每条）：
  - 状态点：运行中（绿）/ 已暂停（橙）。
  - 标题 + 项目名（若为项目任务）。
  - 实时时长（start_time − pause_total_seconds 计算，本地每秒刷新）。
  - 行尾动作：
    - 运行中：暂停 / 完成
    - 已暂停：继续 / 完成
  - 若具备 project_id + target_id：显示“查看”（跳转任务详情）。
- （可选v2）批量操作：全部暂停/全部继续/全部完成。

### C. 空态与引导
- 无活动计时器：只显示本任务的操作与引导提示（“点击开始为此任务记录时间”）。
- 其他任务计时中：顶部不再仅“切换计时”，而是提供“开始”下拉选项；下方列表可对他条进行暂停/完成。

## API 与数据流
- 统一服务 unifiedTimerService：
  - POST /user/timer/start（payload: task_type, task_id, title, category?, estimated_minutes?, tags?, template_id?, auto_stop_others?）。
  - POST /user/timer/pause, /resume, /stop（当前计时器）。
  - GET  /user/timer/current（当前计时器）。
  - GET  /user/timer/active（所有活动计时器集合）。
  - POST /user/timer/{id}/pause|resume|stop（针对某个活动计时器）。
- Hook：useUnifiedTimer
  - 提供 activeTimers、refreshActiveTimers、pauseTimerById、resumeTimerById、stopTimerById。
  - 内置 15s 轮询同步；UI 每秒本地 tick 仅用于时长展示（不拉取后端）。
- TimerContext（useTimer）
  - 保持对当前任务的开始/停止快捷调用，兼容历史组件逻辑。

## 组件改造建议
- MVPTaskDetailTimer.tsx：
  - 顶部按钮：开始（带下拉：并行/自动停其他/默认）、暂停/继续、完成。
  - 新增“活动计时器列表”渲染块（使用 useUnifiedTimer.activeTimers）。
  - 每条活动计时器支持：暂停/继续/完成；若具备 project_id + target_id，提供“查看”。
  - 本地 setInterval 每秒刷新用时显示；操作后刷新 current + active 列表。
- UserTimerPreferences（若有）：
  - 读取默认策略（如 auto_stop_others 默认值），用于“开始（默认策略）”。
- 保持与 UniversalTimerWidget 的交互一致性（文案、图标、颜色）。

## 可访问性与易用性
- 按钮文本+图标，带 Tooltip。（例如：并行启动：不停止其他计时器；自动停止：启动本计时并停止其他正在运行的计时器）
- 键盘快捷键：Ctrl/Cmd + Space（开始/暂停/继续）、Ctrl/Cmd + E（停止）。
- 移动端：按钮组垂直堆叠，列表项操作折叠为更多菜单。

## 验收标准（Acceptance Criteria）
1. 当其他任务在计时时，本任务卡片提供：
   - 开始（默认策略）
   - 并行启动（不停止其他）
   - 启动并自动停止其他
2. 活动计时器列表动态显示所有运行中条目：逐条可暂停/继续/完成，且用时每秒更新。
3. 若具备 project_id + target_id，点击“查看”跳转对应任务详情。
4. 与 Dashboard/个人计时页行为一致，无回归。
5. 所有操作（开始/暂停/继续/完成）成功后，current 与 active 列表 2s 内同步。

## 里程碑
- M1（设计对齐）：本设计文档评审与UI线框。
- M2（前端实现）：MVPTaskDetailTimer 改造 + 联调 useUnifiedTimer。
- M3（测试发布）：交互验收、移动端检查、E2E 基本脚本、回滚开关。

## 风险与回滚
- 若 /user/timer/active 不稳定：通过 Feature Flag 隐藏活动列表，仅保留当前任务计时控制。
- 若并行计时策略与团队习惯冲突：默认先开放“并行启动”，将“自动停止其他”置于下拉选项，保守启用。

