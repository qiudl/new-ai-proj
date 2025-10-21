# API响应处理修复 - 测试计划

## 📋 测试概览

**测试目标**: 验证API响应处理修复的正确性，确保所有修复的方法正常工作，特别是任务创建不再出现409误报错误。

**修复范围**: 4个服务文件，13个方法

**测试优先级**: P0 → P1 → P2

---

## 🔴 P0 优先级 - 核心功能测试 (最高优先级)

### 测试环境要求

- 后端服务运行在 `http://localhost:8080`
- 数据库连接正常（通过SSH tunnel: localhost:5433）
- 有效的JWT token

### 测试用例 P0-1: 任务创建功能（关键修复）

**测试目标**: 验证修复后的createTask方法不再出现409误报错误

**前置条件**:
- 项目118存在且可访问
- 用户有创建任务的权限

**测试步骤**:
```bash
# 1. 获取认证token
TOKEN=$(curl -s http://localhost:8080/api/v1/auth/dev-quick-login \
  -X POST -H "Content-Type: application/json" -d '{}' | jq -r '.token')

# 2. 创建新任务
curl -s -w "\n\nHTTP状态码: %{http_code}\n" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -X POST \
  "http://localhost:8080/api/v1/projects/118/tasks" \
  -d '{
    "title": "P0测试-验证409错误修复-'$(date +%s)'",
    "description": "测试修复后的API响应处理，验证不再出现409误报错误",
    "priority": "high",
    "status": "todo"
  }' | jq '.'
```

**预期结果**:
- HTTP状态码: `201`
- 响应格式:
  ```json
  {
    "success": true,
    "data": {
      "id": <task_id>,
      "title": "P0测试-验证409错误修复-...",
      "status": "todo",
      "priority": "high",
      ...
    },
    "message": "任务创建成功"
  }
  ```
- 前端不显示409错误
- 任务成功创建在项目118中

**失败标准**:
- 返回409状态码
- 前端显示"请求失败 (409)"错误
- 任务未创建

---

## 🟡 P1 优先级 - 回归测试 (重要)

### 测试用例 P1-1: taskService.ts 方法测试

#### 1. deleteTask 测试

```bash
# 删除任务（使用上面创建的任务ID）
TASK_ID=<上面创建的任务ID>

curl -s -w "\nHTTP状态码: %{http_code}\n" \
  -H "Authorization: Bearer $TOKEN" \
  -X DELETE \
  "http://localhost:8080/api/v1/projects/118/tasks/$TASK_ID"
```

**预期结果**: HTTP 200/204，无错误

#### 2. bulkDeleteTasks 测试

```bash
# 批量删除任务
curl -s -w "\nHTTP状态码: %{http_code}\n" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -X DELETE \
  "http://localhost:8080/api/v1/projects/118/tasks/bulk" \
  -d '{
    "task_ids": [<task_id_1>, <task_id_2>]
  }' | jq '.'
```

**预期结果**: 成功删除指定任务

#### 3. bulkImportTasks 测试

```bash
# 批量导入任务
curl -s -w "\nHTTP状态码: %{http_code}\n" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -X POST \
  "http://localhost:8080/api/v1/projects/118/tasks/import" \
  -d '{
    "tasks": [
      {"title": "导入测试任务1", "status": "todo"},
      {"title": "导入测试任务2", "status": "todo"}
    ]
  }' | jq '.'
```

**预期结果**: 成功导入任务，返回导入结果

#### 4. getTaskUpdates 测试

```bash
# 获取任务更新历史
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/v1/projects/118/tasks/$TASK_ID/updates?page=1&page_size=10" | jq '.'
```

**预期结果**: 返回任务更新历史列表

#### 5. getBatchUpdatePreview 测试

```bash
# 预览批量更新
curl -s -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -X POST \
  "http://localhost:8080/api/v1/projects/118/tasks/batch-update-preview" \
  -d '{
    "task_ids": [<task_id>],
    "updates": {"status": "in_progress"}
  }' | jq '.'
```

**预期结果**: 返回批量更新预览结果

### 测试用例 P1-2: taskCommentService.ts 方法测试

#### 1. createComment 测试

```bash
# 创建评论
curl -s -w "\nHTTP状态码: %{http_code}\n" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -X POST \
  "http://localhost:8080/api/v1/tasks/$TASK_ID/comments" \
  -d '{
    "content": "这是一条测试评论"
  }' | jq '.'
```

**预期结果**: HTTP 201，成功创建评论

#### 2. listComments 测试

```bash
# 获取评论列表
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/v1/tasks/$TASK_ID/comments?page=1&limit=20" | jq '.'
```

**预期结果**: 返回评论列表

#### 3. getCommentStats 测试

```bash
# 获取评论统计
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/v1/tasks/$TASK_ID/comments/stats" | jq '.'
```

**预期结果**: 返回评论统计信息

#### 4. deleteComment 测试

```bash
# 删除评论
COMMENT_ID=<评论ID>

curl -s -w "\nHTTP状态码: %{http_code}\n" \
  -H "Authorization: Bearer $TOKEN" \
  -X DELETE \
  "http://localhost:8080/api/v1/tasks/$TASK_ID/comments/$COMMENT_ID"
```

**预期结果**: HTTP 200/204，成功删除

### 测试用例 P1-3: impersonationService.ts 方法测试

#### 1. checkPermissions 测试

```bash
# 检查模拟权限
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/v1/admin/impersonate/permissions" | jq '.'
```

**预期结果**: 返回权限对象，不检查不存在的success字段

#### 2. getActiveSessions 测试

```bash
# 获取活跃会话
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/v1/admin/impersonate/active-sessions" | jq '.'
```

**预期结果**: 返回活跃会话列表或空数组

### 测试用例 P1-4: taskDocumentService.ts 方法测试

#### 1. getTaskDocuments 测试

```bash
# 获取任务文档列表
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/v1/tasks/$TASK_ID/documents" | jq '.'
```

**预期结果**: 返回文档列表，使用简化的响应处理逻辑

---

## 🟢 P2 优先级 - 可选优化测试 (较低)

### 测试用例 P2-1: 有fallback逻辑的方法

这些方法虽然有fallback，但可以进一步简化：

#### 1. getTasks 测试

```bash
# 获取任务列表
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/v1/projects/118/tasks?page=1&page_size=20" | jq '.'
```

#### 2. getTask 测试

```bash
# 获取单个任务
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/v1/projects/118/tasks/$TASK_ID" | jq '.'
```

#### 3. updateTask 测试

```bash
# 更新任务
curl -s -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -X PUT \
  "http://localhost:8080/api/v1/projects/118/tasks/$TASK_ID" \
  -d '{
    "title": "更新后的任务标题",
    "status": "in_progress"
  }' | jq '.'
```

---

## 🧪 自动化测试脚本

### 快速测试脚本

保存为 `frontend/scripts/test-api-response-fix.sh`:

```bash
#!/bin/bash

# API响应处理修复 - 自动化测试脚本

BASE_URL="http://localhost:8080/api/v1"
PROJECT_ID=118

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试计数器
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 测试结果记录
test_result() {
  local test_name=$1
  local result=$2

  TOTAL_TESTS=$((TOTAL_TESTS + 1))

  if [ "$result" = "PASS" ]; then
    echo -e "${GREEN}✓${NC} $test_name"
    PASSED_TESTS=$((PASSED_TESTS + 1))
  else
    echo -e "${RED}✗${NC} $test_name"
    FAILED_TESTS=$((FAILED_TESTS + 1))
  fi
}

# 获取token
echo "🔐 获取认证token..."
TOKEN=$(curl -s "$BASE_URL/auth/dev-quick-login" \
  -X POST -H "Content-Type: application/json" -d '{}' | jq -r '.token')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo -e "${RED}❌ 获取token失败${NC}"
  exit 1
fi

echo -e "${GREEN}✓${NC} Token获取成功\n"

# P0测试: 创建任务
echo -e "${YELLOW}======================================${NC}"
echo -e "${YELLOW}P0测试: 任务创建功能（核心修复）${NC}"
echo -e "${YELLOW}======================================${NC}\n"

TIMESTAMP=$(date +%s)
CREATE_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -X POST \
  "$BASE_URL/projects/$PROJECT_ID/tasks" \
  -d "{
    \"title\": \"P0测试-验证409错误修复-$TIMESTAMP\",
    \"description\": \"自动化测试：验证API响应处理修复\",
    \"priority\": \"high\",
    \"status\": \"todo\"
  }")

HTTP_CODE=$(echo "$CREATE_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$CREATE_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "201" ]; then
  TASK_ID=$(echo "$RESPONSE_BODY" | jq -r '.data.id')
  if [ ! -z "$TASK_ID" ] && [ "$TASK_ID" != "null" ]; then
    test_result "P0-1: 创建任务 (HTTP $HTTP_CODE, Task ID: $TASK_ID)" "PASS"
  else
    test_result "P0-1: 创建任务 (无效的任务ID)" "FAIL"
  fi
else
  test_result "P0-1: 创建任务 (HTTP $HTTP_CODE)" "FAIL"
  echo "响应: $RESPONSE_BODY"
fi

# P1测试: 其他修复的方法
echo -e "\n${YELLOW}======================================${NC}"
echo -e "${YELLOW}P1测试: 其他修复方法回归测试${NC}"
echo -e "${YELLOW}======================================${NC}\n"

if [ ! -z "$TASK_ID" ] && [ "$TASK_ID" != "null" ]; then

  # 测试 getTaskUpdates
  UPDATE_RESPONSE=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: Bearer $TOKEN" \
    "$BASE_URL/projects/$PROJECT_ID/tasks/$TASK_ID/updates")

  UPDATE_CODE=$(echo "$UPDATE_RESPONSE" | tail -n1)
  if [ "$UPDATE_CODE" = "200" ]; then
    test_result "P1-1: 获取任务更新历史" "PASS"
  else
    test_result "P1-1: 获取任务更新历史 (HTTP $UPDATE_CODE)" "FAIL"
  fi

  # 测试 createComment
  COMMENT_RESPONSE=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -X POST \
    "$BASE_URL/tasks/$TASK_ID/comments" \
    -d '{"content": "自动化测试评论"}')

  COMMENT_CODE=$(echo "$COMMENT_RESPONSE" | tail -n1)
  COMMENT_BODY=$(echo "$COMMENT_RESPONSE" | sed '$d')

  if [ "$COMMENT_CODE" = "201" ] || [ "$COMMENT_CODE" = "200" ]; then
    COMMENT_ID=$(echo "$COMMENT_BODY" | jq -r '.data.id // .id')
    test_result "P1-2: 创建评论 (Comment ID: $COMMENT_ID)" "PASS"
  else
    test_result "P1-2: 创建评论 (HTTP $COMMENT_CODE)" "FAIL"
  fi

  # 测试 listComments
  LIST_COMMENT_RESPONSE=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: Bearer $TOKEN" \
    "$BASE_URL/tasks/$TASK_ID/comments")

  LIST_COMMENT_CODE=$(echo "$LIST_COMMENT_RESPONSE" | tail -n1)
  if [ "$LIST_COMMENT_CODE" = "200" ]; then
    test_result "P1-3: 获取评论列表" "PASS"
  else
    test_result "P1-3: 获取评论列表 (HTTP $LIST_COMMENT_CODE)" "FAIL"
  fi

  # 测试 getCommentStats
  STATS_RESPONSE=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: Bearer $TOKEN" \
    "$BASE_URL/tasks/$TASK_ID/comments/stats")

  STATS_CODE=$(echo "$STATS_RESPONSE" | tail -n1)
  if [ "$STATS_CODE" = "200" ]; then
    test_result "P1-4: 获取评论统计" "PASS"
  else
    test_result "P1-4: 获取评论统计 (HTTP $STATS_CODE)" "FAIL"
  fi

  # 测试 deleteComment (如果创建成功)
  if [ ! -z "$COMMENT_ID" ] && [ "$COMMENT_ID" != "null" ]; then
    DELETE_COMMENT_RESPONSE=$(curl -s -w "\n%{http_code}" \
      -H "Authorization: Bearer $TOKEN" \
      -X DELETE \
      "$BASE_URL/tasks/$TASK_ID/comments/$COMMENT_ID")

    DELETE_COMMENT_CODE=$(echo "$DELETE_COMMENT_RESPONSE" | tail -n1)
    if [ "$DELETE_COMMENT_CODE" = "200" ] || [ "$DELETE_COMMENT_CODE" = "204" ]; then
      test_result "P1-5: 删除评论" "PASS"
    else
      test_result "P1-5: 删除评论 (HTTP $DELETE_COMMENT_CODE)" "FAIL"
    fi
  fi

  # 测试 deleteTask
  DELETE_RESPONSE=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: Bearer $TOKEN" \
    -X DELETE \
    "$BASE_URL/projects/$PROJECT_ID/tasks/$TASK_ID")

  DELETE_CODE=$(echo "$DELETE_RESPONSE" | tail -n1)
  if [ "$DELETE_CODE" = "200" ] || [ "$DELETE_CODE" = "204" ]; then
    test_result "P1-6: 删除任务" "PASS"
  else
    test_result "P1-6: 删除任务 (HTTP $DELETE_CODE)" "FAIL"
  fi

fi

# 测试总结
echo -e "\n${YELLOW}======================================${NC}"
echo -e "${YELLOW}测试总结${NC}"
echo -e "${YELLOW}======================================${NC}\n"

echo "总测试数: $TOTAL_TESTS"
echo -e "${GREEN}通过: $PASSED_TESTS${NC}"
echo -e "${RED}失败: $FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
  echo -e "\n${GREEN}🎉 所有测试通过！${NC}\n"
  exit 0
else
  echo -e "\n${RED}❌ 有测试失败，请检查${NC}\n"
  exit 1
fi
```

### 使用方法

```bash
# 1. 给脚本执行权限
chmod +x frontend/scripts/test-api-response-fix.sh

# 2. 确保后端服务和数据库正在运行

# 3. 运行测试
cd frontend
./scripts/test-api-response-fix.sh
```

---

## 📊 测试检查清单

### P0 - 核心功能 ✅
- [ ] 任务创建不再出现409误报错误
- [ ] HTTP状态码正确 (201 for success)
- [ ] 响应数据格式正确
- [ ] 前端正确显示创建成功

### P1 - 回归测试 ✅
- [ ] taskService.ts (6个方法)
  - [ ] createTask ✓ (P0已测)
  - [ ] deleteTask
  - [ ] bulkDeleteTasks
  - [ ] bulkImportTasks
  - [ ] getTaskUpdates
  - [ ] getBatchUpdatePreview

- [ ] taskCommentService.ts (4个方法)
  - [ ] createComment
  - [ ] listComments
  - [ ] getCommentStats
  - [ ] deleteComment

- [ ] impersonationService.ts (2个方法)
  - [ ] checkPermissions
  - [ ] getActiveSessions

- [ ] taskDocumentService.ts (1个方法)
  - [ ] getTaskDocuments

### P2 - 性能和优化 ✅
- [ ] 所有方法响应时间 < 100ms (不含网络延迟)
- [ ] 无内存泄漏
- [ ] 错误处理优雅降级

---

## 🐛 已知问题

### 问题1: 数据库连接失败

**现象**: `connection to server at "127.0.0.1", port 5433 failed: connection refused`

**可能原因**:
- SSH tunnel未启动
- 数据库密码错误
- 远程数据库未运行

**解决方案**:
```bash
# 检查SSH tunnel
ps aux | grep 'ssh.*5433' | grep -v grep

# 重启tunnel
./scripts/tunnel.sh restart

# 测试连接
nc -zv 127.0.0.1 5433
```

### 问题2: Token过期

**现象**: 401 Unauthorized

**解决方案**:
```bash
# 重新获取token
curl -s http://localhost:8080/api/v1/auth/dev-quick-login \
  -X POST -H "Content-Type: application/json" -d '{}'
```

---

## 📝 测试报告模板

```markdown
# API响应处理修复测试报告

**测试日期**: YYYY-MM-DD
**测试人员**: [姓名]
**测试环境**: Development

## P0测试结果

| 测试用例 | 状态 | HTTP状态码 | 备注 |
|---------|------|-----------|------|
| 创建任务 | ✅/❌ | 201 | |

## P1测试结果

| 服务文件 | 方法 | 状态 | 备注 |
|---------|------|------|------|
| taskService.ts | createTask | ✅ | P0已测 |
| taskService.ts | deleteTask | ✅/❌ | |
| ... | ... | ... | ... |

## 发现的问题

1. [问题描述]
   - 严重程度: P0/P1/P2
   - 复现步骤: ...
   - 预期结果: ...
   - 实际结果: ...

## 总结

- 测试通过率: X%
- 建议: ...
```

---

**文档版本**: 1.0
**创建日期**: 2025-10-21
**相关文档**:
- API_RESPONSE_HANDLING.md
- API_RESPONSE_FIX_SUMMARY.md
