# 修复任务编辑时priority字段未保存的bug

## 问题描述

编辑任务时，报错信息：
```json
{
    "success": false,
    "error": {
        "code": "INTERNAL_ERROR",
        "message": "更新任务失败"
    }
}
```

## 问题原因

在 `backend/database/task_repository.go` 的 `Update` 方法中，SQL UPDATE 语句缺少了 `priority` 字段的更新。

虽然 Task 模型结构体中有 `Priority` 字段，但是数据库更新时没有包含它。

## 修复方案

### 修改的文件
- `/backend/database/task_repository.go`

### 具体修改
在 Update 方法中，将原来的 SQL 查询：
```go
query := `
    UPDATE tasks 
    SET title = $2, description = $3, assignee_id = $4, status = $5,
        due_date = $6, custom_fields = $7, total_time_seconds = $8,
        parent_id = $9, task_level = $10, sort_order = $11,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING updated_at`
```

修改为：
```go
query := `
    UPDATE tasks 
    SET title = $2, description = $3, assignee_id = $4, status = $5,
        due_date = $6, custom_fields = $7, total_time_seconds = $8,
        parent_id = $9, task_level = $10, sort_order = $11,
        priority = $12, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING updated_at`
```

同时在参数列表中添加 `task.Priority`：```go
row := exec.QueryRowContext(ctx, query,
    task.ID, task.Title, task.Description, task.AssigneeID,
    task.Status, task.DueDate, customFieldsJSON, task.TotalTimeSeconds,
    task.ParentID, task.TaskLevel, task.SortOrder, task.Priority)
```

## 测试验证

创建了测试脚本 `test-task-update.sh` 来验证修复：
1. 获取任务的当前信息
2. 更新任务，将 priority 从 low 改为 high
3. 重新获取任务信息，验证 priority 是否已更新

## 其他发现的问题

在调试过程中还发现了环境配置问题：
- `backend/.env.docker` 中的数据库用户名密码与 `docker-compose.yml` 不一致
- 已同步修复为 `test_user` / `test_password`

## 状态
- [x] 问题定位完成
- [x] 代码修复完成
- [ ] 测试验证（服务启动后需要验证）
- [ ] 部署到生产环境