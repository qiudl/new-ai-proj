import { TaskMCPServer } from './task-mcp.js';

const apiBase = process.env.API_BASE_URL || 'http://localhost:8081/api/v1';
const taskId = Number(process.env.TASK_ID || 517);
const projectId = Number(process.env.PROJECT_ID || 1);

const content = `# Refactor Task Archiving Feature — 归档/封存设计与实施方案

本文档总结并固化关于任务“归档/封存”的概念、流程、数据结构、API 与 UI 实施建议，以及与旧接口迁移的注意事项。

## 1. 定义：归档/封存（Task Sealing）
- 归档 = 封存：任务进入只读态（不可编辑），默认不在一般视图中显示，但保留数据。
- 需要记录归档原因（superseded / won’t-do / duplicate / out-of-scope / other）以及可选的后继任务（successor）。
- 支持未来“解封/反归档”（unarchive），以恢复编辑和显示。

## 2. 与其他状态的区别
- completed：已完成，有交付；仍可回看，但非只读（通常仍可追加信息）。
- cancelled：明确取消，不再推进；可与归档并存（取消 + 归档），但取消不等于只读。
- on-hold / suspended：暂缓或暂停，但未来可能恢复推进；非只读。
- blocked：被外部条件阻塞；非只读。
- archived（本提案）：只读 + 默认不在列表显示；携带明确归档原因和元数据。

## 3. 对“卡住/停滞”任务的处理流程（推荐）
1) 选择归档原因：
   - superseded：被新任务/重构取代
   - won’t-do：不再执行（策略/优先级调整）
   - duplicate：重复条目
   - out-of-scope：超出当前范围/阶段
2) 关联后继任务（如有）：为 superseded 的场景创建并关联 successorId；
3) 迁移可执行事项：把仍需推进的子任务、PR、TODO 转移到后继任务；
4) 记录归档元数据：operator、timestamp、reason、notes、successorId、linkedPR/branch 等；
5) 关闭相关分支/PR（如适用）；
6) 添加简短复盘（retrospective）：说明决策背景、经验教训。

## 4. 数据模型（建议）
- tasks.archived_at（timestamp, nullable）
- tasks.archived_reason（text or enum）
- tasks.archived_by（int, user id）
- task_relations：type = successor / predecessor，source_task_id, target_task_id
- 审计/版本：在变更日志或版本表中记录归档/解归档事件

## 5. API 设计（REST）
- POST /api/v1/projects/:id/tasks/:taskId/archive
  - body: { reason, successor_id?, notes? }
- POST /api/v1/projects/:id/tasks/:taskId/unarchive
- GET  /api/v1/projects/:id/tasks?filter=archived / archived_since / reason=...
- 版本/审计：GET /api/v1/projects/:id/tasks/:taskId/history

文档 API（已统一）：
- 列表：GET   /api/v1/projects/:id/tasks/:taskId/documents/list
- 存在：GET   /api/v1/projects/:id/tasks/:taskId/documents/has
- 创建并关联：POST  /api/v1/projects/:id/tasks/:taskId/documents
- 更新：PUT   /api/v1/documents/:documentId
- 解绑：DELETE /api/v1/projects/:id/tasks/:taskId/documents/:documentId

## 6. UI/UX 建议
- 归档确认对话框：展示影响（只读、默认隐藏），要求填写原因，可选选择后继任务；
- 归档态任务详情：顶部醒目的“已归档”横幅 + 归档元信息；
- 过滤器：默认隐藏归档项，提供“显示归档”切换；
- 列表标识：若显示，使用灰化或档案箱图标；
- 解归档流程：与归档对称，保留审计。

## 7. 迁移与旧接口（HTTP 410）
- 旧的文件式任务文档端点 /projects/:id/tasks/:taskId/document 已封存并返回 410（Gone）；
- 统一改用新的文档 API（见上），客户端/MCP 已切换到：
  - 创建：POST /projects/:id/tasks/:taskId/documents（内部自动关联）
  - 更新：PUT /documents/:documentId（先 list 选最新文档）
  - 查询存在/列表：GET /documents/has 与 /documents/list
  - 删除关联：DELETE /projects/:id/tasks/:taskId/documents/:documentId

## 8. 实施清单（Checklist）
- [ ] 后端：任务表新增 archived_* 字段与索引；
- [ ] 后端：归档/解归档 API、审计事件；
- [ ] 前端：列表过滤、归档横幅、确认与复盘表单；
- [ ] 客户端/MCP：统一文档 API 路径适配（已完成）；
- [ ] 数据迁移：历史任务状态清洗（可选）；
- [ ] 文档：团队约定与运行手册。

## 9. 附：调试与验证
- 当出现 410 时，优先检查是否仍在调用旧的 /document 单数端点；
- 统一接口健康：GET /documents/health；
- 集成测试覆盖：Create+Has+List、Update（标准/便捷）、Detach。

---
最后更新：${new Date().toISOString()}（由 MCP 自动保存）
`;

(async () => {
  const server = new TaskMCPServer(apiBase);
  console.error(`[TEST] Saving full archival analysis to taskId=${taskId} via ${apiBase}`);
  const res = await server.createOrUpdateTaskDocument(taskId, content, projectId);
  console.log(JSON.stringify(res, null, 2));
})();

