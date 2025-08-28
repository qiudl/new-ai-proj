# MCP 修复记录：task-bridge 编译与协议调用稳定性改进

时间：2025-08-27
作者：ai-pm

## 背景与现象
- 目标：检查 mcp-task-bridge/index.ts 并重新编译，验证 MCP 服务可用性。
- 现象：
  - 脚本方式调用（一次性 Node 子进程）可创建任务与列出任务。
  - 但通过“标准 MCP 工具调用”创建任务最初报错：`Cannot read properties of undefined (reading 'id')`。
  - list_tasks 在 `/projects/:id/tasks` 返回 0，但 `/tasks` 返回 50（接口行为不一致）。

## 排查过程
1) 阅读代码与构建
- 确认 `mcp-task-bridge/index.ts` 环境变量加载、Stdio 传输与工具注册均正常。
- `tsconfig.json` 使用 NodeNext，`package.json` 构建脚本为 `tsc -p tsconfig.json`。
- 执行 `npm run --prefix mcp-task-bridge build` 编译通过。

2) 冒烟测试（stdio 协议）
- 运行 `node mcp-task-bridge/e2e_mcp_smoke.mjs`：完成 initialize、tools/list、dev_quick_login；验证文档读取本地回退（mcp-documents/task-4242.md）成功。

3) 启动后台服务
- 使用 `nohup npm run --prefix mcp-task-bridge start > logs/mcp-task-bridge.log 2>&1 &` 后台运行，记录 PID 与日志。

4) 发现问题与根因
- `create_task` 通过“标准 MCP 调用”失败，错误来自响应解析假设：仅从 `response.data.data` 取值，遇到不同包装结构时 `task.id` 为空导致报错。
- 另一个差异：MCP 客户端托管的服务未加载到最新构建，导致旧代码路径仍在运行。

## 修复方案与变更
1) 响应解析兼容性
- `createTask`：兼容多种包装，优先 `response.data.data`，其次 `response.data`，并从 `payload.data || payload.task || payload` 提取任务。若缺少 `id`，抛出明确错误。
- `listTasks`：兼容 `data.data/items/list/tasks/数组顶层` 等多种结构，并增加 `page=1,page_size=1000` 参数，避免分页遗漏。
- 文案健壮性：创建成功消息支持 `title/status` 回退默认值。

2) 敏感日志治理
- `dev_quick_login`：去除 payload/token 的详细 stderr 输出，仅保留必要的调试与“权限管理器 token 已更新”。

3) 可观测性与本地回退
- 保留并说明文档本地回退目录优先级：`.mcp-documents -> mcp-documents`。

4) 脚本验证增强（便于回归）
- `e2e_create_task.mjs`：登录-创建任务-输出简要结果。
- `e2e_create_and_list.mjs`：登录-创建-列出（项目内）联合验证。
- `e2e_list_all.mjs`：登录-列出全部任务，验证解析与分页参数。

## 关键命令（摘录）
- 构建：`npm run --prefix mcp-task-bridge build`
- 启动：`nohup npm run --prefix mcp-task-bridge start > logs/mcp-task-bridge.log 2>&1 &`
- 冒烟测试：`node mcp-task-bridge/e2e_mcp_smoke.mjs`
- 创建+列表验证：`node mcp-task-bridge/e2e_create_and_list.mjs`

## 客户端托管服务刷新
- 为让“标准 MCP 调用”加载最新构建：仅终止客户端托管的旧进程，保留后台守护 PID；随后客户端自动拉起新的服务进程，`create_task` 立即成功。

## 验证结果
- 脚本方式：创建任务成功，`list_tasks`（无 projectId）返回 50 条任务。
- 标准 MCP 工具调用：
  - `dev_quick_login` 成功（令牌已注入，未回显敏感信息）。
  - `create_task` 成功，消息含标题/状态/优先级。
  - `list_tasks`（不带 projectId）成功，能正确解析多种数据结构。

## 后续建议
- 统一后端 `/projects/:id/tasks` 与 `/tasks` 的响应格式与分页；或在 `/tasks` 支持 `project_id` 过滤，统一对外使用。
- 在客户端增加“刷新/重启 MCP 服务”的显式操作入口。
- 将 e2e 脚本纳入 CI，以防回归。

## 影响评估
- 向后兼容性增强：对不同包装响应更健壮。
- 安全性提升：敏感令牌不再打印。
- 可维护性：提供稳定的 stdio 冒烟与创建/列表组合验证脚本。

