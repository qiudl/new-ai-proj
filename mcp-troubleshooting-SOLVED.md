# MCP连接问题诊断报告 - 已解决

**诊断时间**：2025-10-01 13:45-13:49  
**问题状态**：✅ **已找到根本原因**

## 问题症状

调用`ai-proj:create_task`工具时返回：
```json
{
  "success": false,
  "error": "服务器内部错误: 创建任务失败"
}
```

## 根本原因

**PostgreSQL数据库连接处于只读事务模式**

从后端日志中发现的关键错误：
```
2025/10/01 13:48:23 Error creating task: failed to create task: 
pq: cannot execute INSERT in a read-only transaction
```

## 问题分析

### ✅ 已验证正常的部分

1. **MCP服务器** - 构建成功，可以正常启动并连接到后端API
2. **后端服务** - 端口8080正常监听，健康检查通过
3. **前端服务** - 端口3000正常监听  
4. **数据库连接** - PostgreSQL服务正常，包含2198条任务记录
5. **API认证** - Token刷新并正常工作
6. **用户数据** - ai-pm、admin、guoym用户都存在

### ❌ 发现的问题

**数据库连接配置错误**：Go后端的数据库连接以只读模式打开，导致所有INSERT、UPDATE、DELETE操作失败。

## 解决方案

需要修改Go后端的数据库连接配置，移除只读限制。可能的原因和修复方法：

### 方案1：检查数据库连接字符串

查看数据库连接URL中是否包含只读参数：

```go
// 错误的连接（包含只读参数）
postgresql://user:pass@host:port/db?sslmode=disable&default_transaction_read_only=on

// 正确的连接
postgresql://user:pass@host:port/db?sslmode=disable
```

**文件位置**：
- `/backend/main.go`
- `/backend/database/postgres.go`  
- `/backend/.env` (DB_SOURCE参数)

### 方案2：检查事务配置

查找代码中是否有设置只读事务的地方：

```go
// 错误示例
tx, err := db.BeginTx(ctx, &sql.TxOptions{
    ReadOnly: true,  // ❌ 这会导致只读事务
})

// 正确示例
tx, err := db.BeginTx(ctx, nil)  // ✅ 默认为读写事务
```

### 方案3：检查数据库连接池配置

```go
// 可能的问题配置
db.SetConnMaxLifetime(time.Hour)
// 缺少写权限配置
```

## 立即修复步骤

1. **检查.env文件**：
```bash
cd /Users/johnqiu/coding/www/projects/new-ai-proj
grep DB_SOURCE .env
```

确保没有`default_transaction_read_only=on`或类似参数

2. **搜索只读配置**：
```bash
cd backend
grep -r "ReadOnly.*true" .
grep -r "read_only" .
grep -r "default_transaction_read_only" .
```

3. **检查数据库初始化代码**：
```bash
# 查看database/postgres.go中的连接配置
cat database/postgres.go | grep -A 20 "func.*Connect"
```

4. **重启后端服务**（修复后）：
```bash
# 杀死当前进程
kill <backend_pid>
# 重新启动
cd /Users/johnqiu/coding/www/projects/new-ai-proj/backend
go run main.go
```

## 验证修复

修复后，使用以下命令测试创建任务：

```bash
curl -X POST http://localhost:8080/api/v1/projects/1/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_token>" \
  -d '{"title":"测试任务","description":"验证修复"}'
```

应该返回成功响应（HTTP 201）而不是500错误。

## 技术细节

### 错误追踪

1. **触发点**：`handlers/task_handler.go` 第404行 `h.db.Tasks().Create()`
2. **数据库层**：执行INSERT语句时被PostgreSQL拒绝  
3. **错误消息**：`pq: cannot execute INSERT in a read-only transaction`

### 相关代码文件

- `/backend/handlers/task_handler.go` - CreateTask方法
- `/backend/database/postgres.go` - 数据库连接初始化
- `/backend/database/task_repository.go` - Tasks()实现
- `/backend/.env` - 数据库连接配置

## 总结

- **问题**：数据库连接配置为只读事务模式
- **影响**：所有写操作（CREATE、UPDATE、DELETE）失败
- **修复**：移除只读配置，确保数据库连接具有写权限
- **状态**：待修复后验证

---

**更新时间**：2025-10-01 13:49  
**诊断结果**：根本原因已确认，等待修复
