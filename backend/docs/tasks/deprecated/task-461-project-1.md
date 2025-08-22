---
task_id: 461
title: "32周-01:单元测试体系分析总结与补漏（迁移自本地MD）"
status: "todo"
created_date: "2025-08-05 03:20:25"
updated_date: "2025-08-22 11:18:35"
source: "migrated_from_md"
---

# 32周-01:单元测试体系分析总结与补漏（迁移自本地MD）

本任务文档已从本地 Markdown 文件迁移，旧文件：
- backend/docs/tasks/projects/project-34/task-461.md
- backend/docs/tasks/projects/project-1/task-461.md

今后所有任务文档统一保存在“任务文档”系统中（数据库），不再新建/更新本地 .md 文件。

## 任务描述
通过Claude Code创建：32周-01:单元测试体系分析总结与补漏

## 详细内容
请在这里添加任务的详细内容...

---

## 改造说明（来自旧文档）

### Bug：任务文档创建方式不符合约定（统一规范与自动化）

#### 背景
- 当前在完成子任务后创建任务文档时，未完全遵循项目约定的存放路径/命名与内容结构。

#### 复现
1. 完成任务后在 docs/tasks/projects/project-1/ 下创建 task-<id>.md
2. 期望：遵循预设模板（标题、摘要、交付项、验收标准、回滚、关联PR、时间统计等）
3. 实际：存在字段缺失/命名不一致。

#### 预期修复
- 统一模板（MD）：
  - 标题：任务 <id>：<title>
  - 元数据：task_id, project_id, status, assignee, started_at, completed_at
  - 摘要、交付项（含路径/路由）、变更清单（按文件）、验收标准、回滚策略、关联PR/commit、耗时统计（来自计时）。
- 统一存放规则：docs/tasks/projects/<projectId>/task-<id>.md
- 提供脚本：scripts/task.sh doc <id> 自动生成模板并补全元数据。

#### 验收标准（DoD）
- [ ] 新增模板文件 docs/tasks/task-template.md（含占位符）。
- [ ] 新增脚本 scripts/task.sh 支持生成文档与自动填充元数据。
- [ ] 在完成一次任务后验证文档生成符合模板并含必要元数据。
- [ ] 更新 README 或 docs/tasks/readme.md 说明流程。

#### 关联
- 触发自 #459，影响后续 #460 #425 子任务文档生成流程。

---
*最后更新: 2025-08-22 11:18:35*