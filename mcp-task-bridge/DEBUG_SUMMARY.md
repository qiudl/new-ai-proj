# start_task_with_timer MCP Tool 调试总结

## 问题现象

当通过Claude Code调用 `start_task_with_timer` MCP工具时，返回错误：
```json
{"success": false, "error": "开始计时失败"}
```

## 调查过程

### 1. 验证后端端点
- ✅ 后端统一端点 `/api/v1/mcp/start-task-with-timer` 工作正常
- ✅ 通过curl测试成功

### 2. 验证TypeScript实现
- ✅ 代码逻辑正确
- ✅ 编译成功，dist/index.js代码正确
- ✅ 直接调用 `TaskMCPServer.startTaskWithTimer()` 方法成功

### 3. 测试脚本验证

创建了 `test-start-task-with-timer.js` 直接测试实现：

```bash
node test-start-task-with-timer.js
```

**结果：两个测试都成功**
- ✅ Test 1 (使用任务ID 2578): SUCCESS
- ✅ Test 2 (使用任务标题 "Phase 2"): SUCCESS

这证明：
- 实现逻辑完全正确
- 认证机制正常工作
- 后端端点正常工作

### 4. 发现根本原因

检查运行中的MCP服务器进程：

```bash
ps aux | grep -E "node.*mcp-task-bridge|node.*index.js"
```

**发现：有20+个MCP服务器进程在运行！**

- 多个进程来自不同时间（最早的从周三6AM开始）
- PID 62332 进程CPU使用率97.6%，已运行1918小时
- 这些是**过时的进程**，运行的是旧版本代码
- Claude Code连接到这些过时进程，导致MCP工具失败

## 根本原因

**多个过时的MCP服务器进程正在运行，Claude Code连接到这些进程时使用的是旧版本代码。**

## 解决方案

### 方案1: 清理所有MCP进程（推荐）

```bash
# 杀掉所有mcp-task-bridge进程
pkill -f "node.*mcp-task-bridge"

# 或者更精确地：
ps aux | grep "mcp-task-bridge" | grep -v grep | awk '{print $2}' | xargs kill
```

然后重启Claude Code，让它创建新的MCP服务器进程。

### 方案2: 重启Claude Code

完全退出并重启Claude Code应用，这会清理所有MCP连接。

### 方案3: 使用最新的compiled代码

确保每次修改后都重新编译：

```bash
npm run build
```

## 验证步骤

1. 清理所有MCP进程
2. 重启Claude Code
3. 调用 `dev_quick_login` 认证
4. 调用 `start_task_with_timer` MCP工具
5. 应该看到成功结果

## 经验教训

1. **MCP服务器进程管理**: Claude Code会为每个会话创建新的MCP服务器进程，但不总是正确清理旧进程
2. **调试策略**: 当MCP工具失败但直接代码调用成功时，首先检查是否有多个服务器进程运行
3. **进程监控**: 定期检查并清理过时的MCP服务器进程
4. **CPU监控**: 高CPU使用率的MCP进程通常表示存在问题（死循环、错误处理等）

## 代码验证

以下代码已验证工作正常：

**task-mcp.ts** (startTaskWithTimer方法):
```typescript
async startTaskWithTimer(taskIdOrTitle: number | string, timerDescription?: string, projectId: number = 1) {
    try {
        const response = await (this.taskService as any).makeRequest(
            'POST',
            '/mcp/start-task-with-timer',
            {
                taskIdOrTitle: taskIdOrTitle,
                timerDescription: timerDescription,
                projectId: projectId
            }
        );
        // ... 处理响应
    }
}
```

**index.ts** (MCP工具处理):
```typescript
case 'start_task_with_timer':
  result = await taskServer.startTaskWithTimer(
    args.taskIdOrTitle,
    args.timerDescription,
    args.projectId || 1
  );
  break;
```

## 下一步行动

1. ✅ 问题已定位：多个过时MCP进程
2. ⏭️ 清理所有MCP进程
3. ⏭️ 重启Claude Code
4. ⏭️ 重新测试MCP工具

---

**调试时间**: 2025-10-16
**最终结论**: 代码实现正确，问题在于MCP进程管理
