# MCP工具上下文优化开发方案

## 问题背景

当前MCP工具上下文约29,596 tokens，超过了25,000的推荐阈值，导致Claude响应速度变慢，处理效率降低。

## 优化目标

将MCP context从~30K tokens降低到10-15K tokens，显著提升Claude的响应速度和处理效率。

## 实施策略

### 1. 工具精简策略

#### 1.1 合并相似功能的工具
- **任务管理类工具合并**
  - `create_task` + `create_subtask` → `create_task_unified`
  - `update_task` + `complete_task` → `task_operation`
  - `get_task_info` + `get_detailed_task_info` → `get_task_info_enhanced`

- **文档管理类工具合并**
  - `create_work_note` + `create_and_attach` → `create_document_unified`
  - `get_task_document` + `get_task_children` → `get_task_data_unified`

- **定时器管理类工具合并**
  - `start_timer` + `start_task_with_timer` → `timer_control_unified`
  - `get_current_timer` + `get_active_timers` → `get_timer_status`

#### 1.2 移除不常用的工具
- **低频使用工具**（基于使用频率统计）
  - `delete_task_document`（很少主动删除）
  - `has_task_document`（可通过其他接口判断）
  - `stop_timer`（可合并到timer_control_unified）

- **重复功能工具**
  - `find_task`（功能与list_tasks重叠）
  - `get_task_timeline`（可通过get_task_info获取）

#### 1.3 简化工具描述
**当前问题**：描述过于详细的中文说明
```json
{
  "name": "create_task",
  "description": "创建一个新任务。支持设置任务标题、描述、优先级、截止时间等属性，并可以指定父任务ID来创建子任务。创建成功后返回任务详细信息包括自动生成的任务ID。适用于项目管理、待办事项管理等场景。",
  "parameters": {...}
}
```

**优化后**：简洁明了的描述
```json
{
  "name": "create_task",
  "description": "Create a new task with title, description, priority and deadline",
  "parameters": {...}
}
```

### 2. 配置优化策略

#### 2.1 Claude配置中限制MCP工具加载
创建`.claude/config.json`配置文件：
```json
{
  "mcpServers": {
    "ai-proj": {
      "command": "node",
      "args": ["./mcp-task-bridge/dist/index.js"],
      "env": {
        "TOOL_FILTER": "essential"
      }
    }
  },
  "toolFilters": {
    "essential": [
      "create_task_unified",
      "task_operation", 
      "get_task_info_enhanced",
      "create_document_unified",
      "timer_control_unified"
    ]
  }
}
```

#### 2.2 创建不同场景的工具集
- **开发场景**：任务管理 + 文档管理
- **项目管理场景**：任务管理 + 定时器
- **文档场景**：仅文档相关工具

#### 2.3 实现按需加载机制
```typescript
class ToolManager {
  private loadedTools: Set<string> = new Set();
  
  async loadToolsForScenario(scenario: 'dev' | 'pm' | 'doc') {
    const toolSets = {
      dev: ['create_task_unified', 'create_document_unified'],
      pm: ['create_task_unified', 'timer_control_unified'],
      doc: ['create_document_unified', 'get_task_document']
    };
    
    return this.loadTools(toolSets[scenario]);
  }
}
```

### 3. 进程管理策略

#### 3.1 定期清理僵尸进程
创建定期清理脚本：
```bash
#!/bin/bash
# scripts/cleanup-mcp-processes.sh

echo "🧹 清理MCP僵尸进程..."

# 查找并清理僵尸进程
ZOMBIE_PROCESSES=$(ps aux | grep "mcp-task-bridge" | grep -v grep | awk '{print $2}')

if [ -n "$ZOMBIE_PROCESSES" ]; then
    echo "发现 $(echo "$ZOMBIE_PROCESSES" | wc -l) 个MCP进程"
    
    # 只保留最新的进程
    LATEST_PID=$(echo "$ZOMBIE_PROCESSES" | tail -1)
    OLD_PIDS=$(echo "$ZOMBIE_PROCESSES" | head -n -1)
    
    if [ -n "$OLD_PIDS" ]; then
        echo "清理旧进程: $OLD_PIDS"
        echo "$OLD_PIDS" | xargs kill -9
    fi
    
    echo "保留最新进程: $LATEST_PID"
else
    echo "未发现MCP进程"
fi
```

#### 3.2 使用单例模式运行MCP服务
```typescript
// mcp-task-bridge/src/singleton-manager.ts
class MCPSingletonManager {
  private static instance: MCPSingletonManager;
  private isRunning = false;
  private pidFile = '/tmp/mcp-task-bridge.pid';
  
  static getInstance() {
    if (!MCPSingletonManager.instance) {
      MCPSingletonManager.instance = new MCPSingletonManager();
    }
    return MCPSingletonManager.instance;
  }
  
  async start() {
    if (this.isAlreadyRunning()) {
      console.log('MCP服务已在运行，退出重复实例');
      process.exit(0);
    }
    
    this.writePidFile();
    this.setupCleanup();
    // 启动服务...
  }
  
  private isAlreadyRunning(): boolean {
    try {
      const pid = fs.readFileSync(this.pidFile, 'utf8');
      return process.kill(parseInt(pid), 0);
    } catch {
      return false;
    }
  }
}
```

#### 3.3 添加进程监控脚本
```bash
#!/bin/bash
# scripts/monitor-mcp-service.sh

PIDFILE="/tmp/mcp-task-bridge.pid"
LOGFILE="/tmp/mcp-monitor.log"

monitor_service() {
    while true; do
        if [ -f "$PIDFILE" ]; then
            PID=$(cat "$PIDFILE")
            if ! kill -0 "$PID" 2>/dev/null; then
                echo "$(date): MCP服务异常退出，重新启动..." >> "$LOGFILE"
                cd /Users/johnqiu/coding/www/projects/new-ai-proj
                node mcp-task-bridge/dist/index.js &
            fi
        else
            echo "$(date): MCP服务未运行，启动服务..." >> "$LOGFILE"
            cd /Users/johnqiu/coding/www/projects/new-ai-proj
            node mcp-task-bridge/dist/index.js &
        fi
        
        sleep 30
    done
}

monitor_service
```

## 实施计划

### 阶段1：工具精简（预计2-3小时）
1. 分析当前工具使用频率
2. 合并相似功能工具
3. 移除不常用工具
4. 简化工具描述

### 阶段2：配置优化（预计1-2小时）
1. 创建Claude配置文件
2. 实现工具过滤机制
3. 创建场景化工具集
4. 实现按需加载

### 阶段3：进程管理（预计1小时）
1. 创建清理脚本
2. 实现单例模式
3. 添加进程监控
4. 测试稳定性

### 阶段4：测试验证（预计1小时）
1. 测试token数量减少效果
2. 验证功能完整性
3. 性能对比测试
4. 文档更新

## 预期效果

- **Token减少**：从29,596降低到10,000-15,000
- **响应速度**：提升30-50%
- **稳定性**：减少进程冲突和资源占用
- **维护性**：更清晰的工具结构和配置管理

## 监控指标

- MCP context token数量
- Claude响应时间
- 工具调用成功率
- 进程资源占用
- 用户使用体验满意度

---

*此文档将持续更新，记录优化过程中的问题和解决方案*