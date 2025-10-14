# MCP Worktree Tools for Claude Code

**Phase 5: Native Worktree Support for Claude Code**

This document describes 12 MCP tools that provide Git Worktree management capabilities directly within Claude Code, enabling AI-driven parallel development workflows.

## Overview

The MCP Worktree toolset allows Claude Code to:
- Create and manage isolated development workspaces (Git worktrees)
- Intelligently allocate workspaces to AI users for parallel development
- Bind tasks to worktrees for organized work tracking
- Detect and resolve conflicts across multiple workspaces
- Monitor worktree health and system status

All tools are available via HTTP POST/GET requests to `/api/v1/mcp/wt/*` endpoints.

---

## Tool Reference

### 1. `wt_create` - Create New Worktree

Creates a new Git worktree for isolated development.

**Endpoint:** `POST /api/v1/mcp/wt/create`

**Request:**
```json
{
  "project_id": 1,
  "branch": "feature/task-123",
  "name": "worktree-task-123",
  "description": "Development workspace for task #123",
  "expert_id": "backend-ai-1"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "project_id": 1,
    "name": "worktree-task-123",
    "path": "/var/ai-proj-worktrees/project-1/worktree-task-123",
    "branch": "feature/task-123",
    "status": "created",
    "expert_id": "backend-ai-1",
    "created_at": "2025-10-14T08:30:00Z"
  },
  "message": "Worktree created successfully"
}
```

**Use Cases:**
- Start development on a new feature or bug fix
- Create isolated workspace for AI agent
- Set up parallel development environment

---

### 2. `wt_assign` - Assign Worktree to AI User

Assigns (activates) a worktree for use by a specific AI user/agent.

**Endpoint:** `POST /api/v1/mcp/wt/assign`

**Request:**
```json
{
  "worktree_id": 1,
  "ai_user_id": 42,
  "task_id": 123
}
```

**Response:**
```json
{
  "success": true,
  "worktree_id": 1,
  "ai_user_id": 42,
  "message": "Worktree assigned successfully"
}
```

**Use Cases:**
- Activate a worktree for development
- Link AI agent to specific workspace
- Start work on an assigned task

---

### 3. `wt_status` - View Worktree Status

Gets detailed status of a worktree including bindings and conflicts.

**Endpoint:** `GET /api/v1/mcp/wt/:id/status`

**Response:**
```json
{
  "success": true,
  "worktree": {
    "id": 1,
    "name": "worktree-task-123",
    "status": "active",
    "branch": "feature/task-123",
    "current_ai_user_id": 42
  },
  "bindings": [
    {
      "task_id": 123,
      "relation_type": "primary",
      "priority": 5,
      "status": "active"
    }
  ],
  "has_conflict": false,
  "conflict_info": null
}
```

**Use Cases:**
- Check worktree state before starting work
- View task bindings
- Identify conflicts

---

### 4. `wt_list` - List All Worktrees

Lists worktrees with optional filtering.

**Endpoint:** `GET /api/v1/mcp/wt/list?project_id=1&status=active&expert_id=backend-ai-1`

**Query Parameters:**
- `project_id` (optional): Filter by project
- `status` (optional): Filter by status (created, active, completed, etc.)
- `expert_id` (optional): Filter by expert/agent ID

**Response:**
```json
{
  "success": true,
  "worktrees": [
    {
      "id": 1,
      "name": "worktree-task-123",
      "status": "active",
      "branch": "feature/task-123"
    },
    {
      "id": 2,
      "name": "worktree-task-456",
      "status": "created",
      "branch": "bugfix/issue-456"
    }
  ],
  "total": 2
}
```

**Use Cases:**
- View available workspaces
- Find worktrees by status
- List agent's assigned worktrees

---

### 5. `wt_bind_task` - Bind Task to Worktree

Binds a task to a worktree using intelligent binding strategy.

**Endpoint:** `POST /api/v1/mcp/wt/bind-task`

**Request:**
```json
{
  "worktree_id": 1,
  "task_id": 123,
  "relation_type": "primary",
  "priority": 5,
  "auto_activate": true
}
```

**Parameters:**
- `relation_type`: "primary", "secondary", "dependency"
- `priority`: 1-10 (higher = more important)
- `auto_activate`: Auto-activate worktree when binding

**Response:**
```json
{
  "success": true,
  "result": {
    "binding_id": 1,
    "worktree_id": 1,
    "task_id": 123,
    "status": "active"
  },
  "message": "Task bound to worktree successfully"
}
```

**Use Cases:**
- Link task to workspace
- Set task priority within worktree
- Organize multi-task workflows

---

### 6. `wt_unbind_task` - Unbind Task from Worktree

Removes task binding from worktree.

**Endpoint:** `POST /api/v1/mcp/wt/unbind-task`

**Request:**
```json
{
  "worktree_id": 1,
  "task_id": 123
}
```

**Response:**
```json
{
  "success": true,
  "worktree_id": 1,
  "task_id": 123,
  "message": "Task unbound from worktree successfully"
}
```

**Use Cases:**
- Remove completed task from worktree
- Reorganize task assignments
- Clean up worktree bindings

---

### 7. `wt_conflict_check` - Detect Conflicts

Forces immediate conflict detection for a worktree (bypasses cache).

**Endpoint:** `POST /api/v1/mcp/wt/:id/conflict-check`

**Response:**
```json
{
  "success": true,
  "result": {
    "has_conflict": true,
    "level": "medium",
    "total_count": 3,
    "conflicts": [
      {
        "type": "file",
        "severity": "medium",
        "description": "File overlap detected: src/services/user.go",
        "affected_files": ["src/services/user.go"],
        "affected_tasks": [123, 456]
      }
    ],
    "suggestions": [
      "Consider isolating tasks to separate worktrees",
      "Review file modification patterns"
    ],
    "detected_at": "2025-10-14T08:35:00Z"
  }
}
```

**Conflict Levels:**
- `none`: No conflicts detected
- `low`: Minor potential conflicts
- `medium`: Moderate conflicts requiring attention
- `high`: Significant conflicts blocking work
- `critical`: Severe conflicts requiring immediate resolution

**Use Cases:**
- Check for conflicts before merging
- Validate parallel development safety
- Prevent merge conflicts

---

### 8. `wt_conflict_resolve` - Generate Resolution Plans

Generates actionable resolution plans for detected conflicts.

**Endpoint:** `POST /api/v1/mcp/wt/:id/conflict-resolve`

**Response:**
```json
{
  "success": true,
  "result": {
    "worktree_id": 1,
    "conflict_summary": "3 conflicts detected",
    "plans": [
      {
        "strategy": "isolate",
        "priority": 8,
        "confidence": 0.9,
        "description": "将冲突任务隔离到不同的worktree",
        "actions": [
          {
            "step": 1,
            "action": "create_worktree",
            "description": "为任务456创建新worktree",
            "automated": true
          },
          {
            "step": 2,
            "action": "move_task",
            "description": "将任务456移动到新worktree",
            "automated": true
          }
        ],
        "estimated_time": "5m",
        "impact": "最小化文件冲突"
      },
      {
        "strategy": "reorder",
        "priority": 6,
        "confidence": 0.7,
        "description": "调整任务执行顺序避免冲突",
        "actions": [...],
        "estimated_time": "2m",
        "impact": "需要重新排序任务"
      }
    ]
  }
}
```

**Resolution Strategies:**
- `isolate`: Separate conflicting tasks to different worktrees
- `reorder`: Adjust task execution order
- `merge`: Merge changes with manual review
- `postpone`: Delay conflicting task
- `manual_review`: Requires human intervention

**Use Cases:**
- Resolve detected conflicts
- Get automated resolution suggestions
- Plan conflict resolution workflow

---

### 9. `wt_allocate` - Smart Workspace Allocation

Intelligently allocates the best workspace for a task and AI user.

**Endpoint:** `POST /api/v1/mcp/wt/allocate`

**Request:**
```json
{
  "task_id": 123,
  "ai_user_id": 42,
  "expert_id": "backend-ai-1",
  "prefer_reuse": true
}
```

**Parameters:**
- `prefer_reuse`: Prefer reusing existing worktree over creating new one

**Response:**
```json
{
  "success": true,
  "decision": {
    "decision": "reuse",
    "worktree_id": 2,
    "worktree": {
      "id": 2,
      "name": "worktree-backend-dev",
      "status": "active"
    },
    "reason": "Found compatible existing worktree with low conflict score",
    "alternatives": [
      {
        "option": "create_new",
        "score": 0.75,
        "pros": ["完全隔离", "无冲突"],
        "cons": ["需要初始化时间"]
      }
    ]
  },
  "message": "Workspace allocated successfully"
}
```

**Decision Types:**
- `reuse`: Use existing worktree
- `create_new`: Create new worktree
- `reclaim`: Reclaim idle worktree

**Use Cases:**
- Start working on a new task
- Find optimal workspace automatically
- Balance resource usage

---

### 10. `wt_release` - Release Workspace

Releases a worktree from an AI user (deactivates).

**Endpoint:** `POST /api/v1/mcp/wt/release`

**Request:**
```json
{
  "worktree_id": 1,
  "ai_user_id": 42
}
```

**Response:**
```json
{
  "success": true,
  "worktree_id": 1,
  "ai_user_id": 42,
  "message": "Workspace released successfully"
}
```

**Use Cases:**
- Finish work in a worktree
- Free up resources for other AI agents
- Complete task development

---

### 11. `wt_sync` - Sync Worktree Code

Synchronizes worktree with upstream changes (git pull/rebase).

**Endpoint:** `POST /api/v1/mcp/wt/:id/sync`

**Response:**
```json
{
  "success": true,
  "worktree_id": 1,
  "message": "Worktree synced successfully"
}
```

**Use Cases:**
- Update worktree with latest changes
- Sync before starting work
- Pull upstream updates

---

### 12. `wt_health` - System Health Check

Checks overall worktree system health.

**Endpoint:** `GET /api/v1/mcp/wt/health?project_id=1`

**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "health_score": 0.85,
  "statistics": {
    "total_worktrees": 10,
    "with_conflicts": 2,
    "active_worktrees": 5,
    "idle_worktrees": 3
  },
  "timestamp": "2025-10-14T08:40:00Z"
}
```

**Health Status:**
- `healthy`: Score >= 0.5
- `warning`: Score < 0.5
- `critical`: Score < 0.3

**Use Cases:**
- Monitor system health
- Check resource usage
- Identify system issues

---

## Usage Examples

### Example 1: Start Work on New Task

```bash
# 1. Allocate workspace
curl -X POST http://localhost:8080/api/v1/mcp/wt/allocate \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "task_id": 123,
    "ai_user_id": 42,
    "prefer_reuse": true
  }'

# 2. Check for conflicts
curl -X POST http://localhost:8080/api/v1/mcp/wt/1/conflict-check \
  -H "Authorization: Bearer $TOKEN"

# 3. Start development...
```

### Example 2: Resolve Conflicts

```bash
# 1. Check conflicts
curl -X POST http://localhost:8080/api/v1/mcp/wt/1/conflict-check \
  -H "Authorization: Bearer $TOKEN"

# 2. Get resolution plans
curl -X POST http://localhost:8080/api/v1/mcp/wt/1/conflict-resolve \
  -H "Authorization: Bearer $TOKEN"

# 3. Apply resolution (implement plan manually or automatically)
```

### Example 3: Monitor Worktree Health

```bash
# Check overall health
curl -X GET http://localhost:8080/api/v1/mcp/wt/health?project_id=1 \
  -H "Authorization: Bearer $TOKEN"

# List all worktrees
curl -X GET http://localhost:8080/api/v1/mcp/wt/list?project_id=1 \
  -H "Authorization: Bearer $TOKEN"
```

---

## Best Practices

### 1. Workspace Allocation
- Always use `wt_allocate` instead of manually creating worktrees
- Set `prefer_reuse: true` to optimize resource usage
- Check conflicts before starting work

### 2. Conflict Management
- Run `wt_conflict_check` before committing changes
- Review resolution plans carefully before applying
- Prefer `isolate` strategy for critical conflicts

### 3. Task Binding
- Bind primary task first, then dependencies
- Set appropriate priorities (1-10)
- Use `auto_activate` for immediate work start

### 4. Resource Management
- Release worktrees when done (`wt_release`)
- Sync worktrees regularly (`wt_sync`)
- Monitor health metrics (`wt_health`)

### 5. Error Handling
- Check `success` field in all responses
- Handle `false` success gracefully
- Review `error` field for details

---

## Integration with Claude Code

Claude Code can use these tools through the MCP protocol:

1. **Tool Discovery:** Claude Code automatically discovers MCP tools
2. **Authentication:** Uses JWT token from environment or config
3. **Invocation:** Tools called via HTTP requests to backend API
4. **Error Handling:** Standard error responses across all tools

### Environment Variables

```bash
# Backend API endpoint
MCP_API_ENDPOINT=http://localhost:8080/api/v1

# JWT authentication
JWT_TOKEN=eyJhbGci...
```

---

## Architecture

The MCP Worktree system consists of 6 phases:

- **Phase 1:** Git Worktree基础设施 ✅
- **Phase 2:** Core Worktree Management ✅
- **Phase 3:** Intelligent Workspace Coordination ✅
- **Phase 4:** Multi-layer Conflict Detection ✅
- **Phase 5:** MCP Integration (This Document) ✅
- **Phase 6:** Optimization & Deployment (Pending)

### Service Dependencies

```
MCPWorktreeHandler
  ├── WorktreeService (Phase 2)
  ├── AIWorkspaceCoordinator (Phase 3)
  ├── TaskBindingCoordinator (Phase 3)
  ├── ConflictDetectionEngine (Phase 4)
  ├── ConflictMonitor (Phase 4)
  └── ConflictResolutionService (Phase 4)
```

---

## Troubleshooting

### Common Issues

**1. "Worktree not found"**
- Verify worktree ID exists
- Check if worktree was deleted
- Use `wt_list` to find available worktrees

**2. "Conflict detected"**
- Run `wt_conflict_check` for details
- Use `wt_conflict_resolve` for solutions
- Consider isolating tasks

**3. "AI user already assigned"**
- Release previous worktree first
- Check AI user's current assignments
- Use `wt_release` before new allocation

**4. "Authentication failed"**
- Verify JWT token is valid
- Check token expiration
- Ensure proper authorization headers

---

## API Version

**Current Version:** v1
**Base URL:** `/api/v1/mcp/wt`
**Authentication:** JWT Bearer Token
**Content-Type:** `application/json`

---

## Support

For issues or questions:
- Check backend logs for detailed errors
- Review conflict detection results
- Monitor system health metrics
- Consult Phase 4 documentation for conflict details

**Last Updated:** 2025-10-14
**Phase:** 5 of 6
