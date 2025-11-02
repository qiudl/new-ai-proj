# 子任务4-7：企业管理员功能全面测试

**父任务**: 手工配置huangcong账号为企业管理员并测试全部权限
**阶段**: 第四~七阶段 - 功能测试
**预估时间**: 45分钟
**难度**: ⭐⭐⭐ 较难

---

## 🎯 任务目标

使用 huangcong 账号全面测试企业管理员的所有权限，覆盖企业管理、用户管理、角色管理、项目管理、任务管理、文档管理、权限管理和审计日志等功能。

---

## 📋 测试准备

### 准备工作

1. **获取 huangcong 的登录密码**（询问管理员或重置密码）
2. **确认后端服务运行**: `http://localhost:8080`
3. **准备测试工具**: curl 或 Postman
4. **创建测试记录表格**（本文档末尾提供）

### 环境变量设置

```bash
# 设置API基础URL
API_BASE="http://localhost:8080/api/v1"

# 后续命令中会设置TOKEN变量
```

---

## 🔐 阶段4.1: 登录测试

### 测试1: huangcong 账号登录

```bash
# 登录获取token（替换密码为实际密码）
curl -X POST ${API_BASE}/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "huangcong",
    "password": "实际密码"
  }' | python3 -c "import sys, json; d=json.load(sys.stdin); print('Token:', d.get('data', {}).get('token', 'ERROR')); print('User:', d.get('data', {}).get('user', {}).get('username')); print('Enterprise:', d.get('data', {}).get('user', {}).get('enterprise_name'))" 2>/dev/null
```

**预期结果**:
- ✅ 登录成功，返回 token
- ✅ 显示用户名为 huangcong
- ✅ 显示企业信息

**设置TOKEN变量**:
```bash
# 复制上面返回的token，设置环境变量
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."  # 替换为实际token
```

**测试结果**: [ ] ✅ 通过 [ ] ❌ 失败
**备注**: __________

---

## 🏢 阶段4.2: 企业管理权限测试

### 测试2: 查看企业列表

```bash
curl -s -X GET ${API_BASE}/enterprises \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**预期结果**: 返回企业列表（状态码200）

**测试结果**: [ ] ✅ 通过 [ ] ❌ 失败

---

### 测试3: 查看企业详情

```bash
# 替换 {enterprise_id} 为实际企业ID
ENTERPRISE_ID=4  # 替换为子任务1中记录的企业ID

curl -s -X GET ${API_BASE}/enterprises/${ENTERPRISE_ID} \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**预期结果**: 返回企业详细信息

**测试结果**: [ ] ✅ 通过 [ ] ❌ 失败

---

### 测试4: 修改企业信息

```bash
# 测试修改企业信息（修改描述字段）
curl -s -X PUT ${API_BASE}/enterprises/${ENTERPRISE_ID} \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "企业管理员权限测试 - '$(date +%Y%m%d_%H%M%S)'"
  }' | python3 -m json.tool
```

**预期结果**: 修改成功（状态码200）

**测试结果**: [ ] ✅ 通过 [ ] ❌ 失败

---

### 测试5: 恢复企业信息

```bash
# 恢复原来的描述
curl -s -X PUT ${API_BASE}/enterprises/${ENTERPRISE_ID} \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "原始描述"
  }' | python3 -m json.tool
```

**测试结果**: [ ] ✅ 通过 [ ] ❌ 失败

---

## 👥 阶段5.1: 用户管理权限测试

### 测试6: 查看企业用户列表

```bash
curl -s -X GET "${API_BASE}/enterprises/${ENTERPRISE_ID}/users?page=1&page_size=10" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**预期结果**: 返回用户列表

**测试结果**: [ ] ✅ 通过 [ ] ❌ 失败

---

### 测试7: 查看用户详情

```bash
# 替换为实际用户ID
USER_ID=1

curl -s -X GET ${API_BASE}/users/${USER_ID} \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**预期结果**: 返回用户详细信息

**测试结果**: [ ] ✅ 通过 [ ] ❌ 失败

---

### 测试8: 为用户分配角色（如果API支持）

```bash
# 查询可用角色列表
curl -s -X GET ${API_BASE}/enterprises/${ENTERPRISE_ID}/roles \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -50
```

**测试结果**: [ ] ✅ 通过 [ ] ❌ 失败

---

## 🎭 阶段5.2: 角色管理权限测试

### 测试9: 查看角色列表

```bash
curl -s -X GET ${API_BASE}/enterprises/${ENTERPRISE_ID}/roles \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**预期结果**: 返回角色列表

**测试结果**: [ ] ✅ 通过 [ ] ❌ 失败

---

### 测试10: 创建测试角色

```bash
# 创建一个测试角色
curl -s -X POST ${API_BASE}/enterprises/${ENTERPRISE_ID}/roles \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "权限测试角色_'$(date +%H%M%S)'",
    "description": "用于测试企业管理员权限的临时角色",
    "role_type": "custom"
  }' | python3 -m json.tool
```

**预期结果**: 创建成功，返回角色ID

**请记录测试角色ID**: __________

**测试结果**: [ ] ✅ 通过 [ ] ❌ 失败

---

### 测试11: 查看角色详情

```bash
# 替换为上面创建的角色ID
TEST_ROLE_ID=__

curl -s -X GET ${API_BASE}/enterprises/${ENTERPRISE_ID}/roles/${TEST_ROLE_ID} \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**预期结果**: 返回角色详情

**测试结果**: [ ] ✅ 通过 [ ] ❌ 失败

---

### 测试12: 为角色分配权限

```bash
# 为测试角色分配一些权限
curl -s -X POST ${API_BASE}/enterprises/${ENTERPRISE_ID}/roles/${TEST_ROLE_ID}/permissions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "permission_ids": [1, 2, 3]
  }' | python3 -m json.tool
```

**预期结果**: 权限分配成功

**测试结果**: [ ] ✅ 通过 [ ] ❌ 失败 [ ] N/A（API不支持）

---

### 测试13: 删除测试角色

```bash
# 清理：删除测试角色
curl -s -X DELETE ${API_BASE}/enterprises/${ENTERPRISE_ID}/roles/${TEST_ROLE_ID} \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**预期结果**: 删除成功

**测试结果**: [ ] ✅ 通过 [ ] ❌ 失败

---

## 📁 阶段6.1: 项目管理权限测试

### 测试14: 查看项目列表

```bash
curl -s -X GET "${API_BASE}/enterprises/${ENTERPRISE_ID}/projects?page=1&page_size=10" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**预期结果**: 返回项目列表

**测试结果**: [ ] ✅ 通过 [ ] ❌ 失败

---

### 测试15: 创建测试项目

```bash
# 创建测试项目
curl -s -X POST ${API_BASE}/enterprises/${ENTERPRISE_ID}/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "权限测试项目_'$(date +%Y%m%d_%H%M%S)'",
    "description": "用于测试企业管理员权限的临时项目",
    "status": "active",
    "priority": "medium"
  }' | python3 -m json.tool
```

**预期结果**: 创建成功，返回项目ID

**请记录测试项目ID**: __________

**测试结果**: [ ] ✅ 通过 [ ] ❌ 失败

---

### 测试16: 查看项目详情

```bash
# 替换为上面创建的项目ID
TEST_PROJECT_ID=__

curl -s -X GET ${API_BASE}/projects/${TEST_PROJECT_ID} \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**预期结果**: 返回项目详情

**测试结果**: [ ] ✅ 通过 [ ] ❌ 失败

---

### 测试17: 编辑项目

```bash
# 修改项目信息
curl -s -X PUT ${API_BASE}/projects/${TEST_PROJECT_ID} \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "已修改的描述 - '$(date +%H:%M:%S)'"
  }' | python3 -m json.tool
```

**预期结果**: 修改成功

**测试结果**: [ ] ✅ 通过 [ ] ❌ 失败

---

## ✓ 阶段6.2: 任务管理权限测试

### 测试18: 查看任务列表

```bash
curl -s -X GET "${API_BASE}/enterprises/${ENTERPRISE_ID}/projects/${TEST_PROJECT_ID}/tasks?page=1&page_size=10" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**预期结果**: 返回任务列表（可能为空）

**测试结果**: [ ] ✅ 通过 [ ] ❌ 失败

---

### 测试19: 创建测试任务

```bash
# 创建测试任务
curl -s -X POST ${API_BASE}/enterprises/${ENTERPRISE_ID}/projects/${TEST_PROJECT_ID}/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "权限测试任务_'$(date +%H%M%S)'",
    "description": "用于测试企业管理员权限",
    "status": "todo",
    "priority": "medium",
    "skip_template": true
  }' | python3 -m json.tool
```

**预期结果**: 创建成功，返回任务ID

**请记录测试任务ID**: __________

**测试结果**: [ ] ✅ 通过 [ ] ❌ 失败

---

### 测试20: 分配任务

```bash
# 替换为实际的任务ID和用户ID
TEST_TASK_ID=__
ASSIGNEE_ID=1

curl -s -X PUT ${API_BASE}/tasks/${TEST_TASK_ID} \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "assignee_id": '${ASSIGNEE_ID}'
  }' | python3 -m json.tool
```

**预期结果**: 分配成功

**测试结果**: [ ] ✅ 通过 [ ] ❌ 失败

---

### 测试21: 删除测试任务

```bash
# 清理：删除测试任务
curl -s -X DELETE ${API_BASE}/tasks/${TEST_TASK_ID} \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**预期结果**: 删除成功

**测试结果**: [ ] ✅ 通过 [ ] ❌ 失败

---

## 📄 阶段7.1: 文档管理权限测试

### 测试22: 查看文档列表

```bash
curl -s -X GET "${API_BASE}/enterprises/${ENTERPRISE_ID}/documents?page=1&page_size=10" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**预期结果**: 返回文档列表

**测试结果**: [ ] ✅ 通过 [ ] ❌ 失败

---

### 测试23: 创建测试文档

```bash
# 创建测试文档
curl -s -X POST ${API_BASE}/enterprises/${ENTERPRISE_ID}/documents \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "权限测试文档_'$(date +%H%M%S)'",
    "content": "用于测试企业管理员文档权限",
    "document_type": "note"
  }' | python3 -m json.tool
```

**预期结果**: 创建成功，返回文档ID

**请记录测试文档ID**: __________

**测试结果**: [ ] ✅ 通过 [ ] ❌ 失败

---

### 测试24: 查看文档详情

```bash
# 替换为上面创建的文档ID
TEST_DOC_ID=__

curl -s -X GET ${API_BASE}/enterprises/${ENTERPRISE_ID}/documents/${TEST_DOC_ID} \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**预期结果**: 返回文档详情

**测试结果**: [ ] ✅ 通过 [ ] ❌ 失败

---

### 测试25: 编辑文档

```bash
# 修改文档内容
curl -s -X PUT ${API_BASE}/enterprises/${ENTERPRISE_ID}/documents/${TEST_DOC_ID} \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "已修改的内容 - '$(date +%H:%M:%S)'"
  }' | python3 -m json.tool
```

**预期结果**: 修改成功

**测试结果**: [ ] ✅ 通过 [ ] ❌ 失败

---

### 测试26: 删除测试文档

```bash
# 清理：删除测试文档
curl -s -X DELETE ${API_BASE}/enterprises/${ENTERPRISE_ID}/documents/${TEST_DOC_ID} \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**预期结果**: 删除成功

**测试结果**: [ ] ✅ 通过 [ ] ❌ 失败

---

## 🔐 阶段7.2: 权限管理测试

### 测试27: 查看权限列表

```bash
curl -s -X GET ${API_BASE}/enterprises/${ENTERPRISE_ID}/permissions \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -100
```

**预期结果**: 返回权限列表

**测试结果**: [ ] ✅ 通过 [ ] ❌ 失败

---

### 测试28: 查看权限矩阵

```bash
curl -s -X GET ${API_BASE}/system/roles/permissions/matrix \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -100
```

**预期结果**: 返回角色权限矩阵

**测试结果**: [ ] ✅ 通过 [ ] ❌ 失败

---

## 📊 阶段7.3: 审计日志测试

### 测试29: 查看审计日志

```bash
curl -s -X GET "${API_BASE}/system/audit/logs?page=1&page_size=20" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**预期结果**: 返回审计日志列表（包含前面测试操作的日志）

**测试结果**: [ ] ✅ 通过 [ ] ❌ 失败

---

### 测试30: 筛选审计日志

```bash
# 按操作类型筛选
curl -s -X GET "${API_BASE}/system/audit/logs?page=1&page_size=20&action=create" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**预期结果**: 返回create操作的审计日志

**测试结果**: [ ] ✅ 通过 [ ] ❌ 失败

---

## 🧹 清理测试数据

### 清理步骤

```bash
# 1. 删除测试项目（会级联删除关联的任务）
curl -s -X DELETE ${API_BASE}/projects/${TEST_PROJECT_ID} \
  -H "Authorization: Bearer $TOKEN"

# 2. 确认清理完成
echo "清理完成，请手动验证数据已删除"
```

---

## ✅ 测试结果汇总表

| # | 测试项 | API端点 | 预期 | 实际 | 状态 | 备注 |
|---|--------|---------|------|------|------|------|
| 1 | 登录 | POST /auth/login | 成功 | | [ ] | |
| 2 | 查看企业列表 | GET /enterprises | 200 | | [ ] | |
| 3 | 查看企业详情 | GET /enterprises/{id} | 200 | | [ ] | |
| 4 | 修改企业信息 | PUT /enterprises/{id} | 200 | | [ ] | |
| 5 | 恢复企业信息 | PUT /enterprises/{id} | 200 | | [ ] | |
| 6 | 查看用户列表 | GET /enterprises/{id}/users | 200 | | [ ] | |
| 7 | 查看用户详情 | GET /users/{id} | 200 | | [ ] | |
| 8 | 查看角色列表 | GET /enterprises/{id}/roles | 200 | | [ ] | |
| 9 | 查看角色列表 | GET /enterprises/{id}/roles | 200 | | [ ] | |
| 10 | 创建角色 | POST /enterprises/{id}/roles | 200 | | [ ] | |
| 11 | 查看角色详情 | GET /enterprises/{id}/roles/{rid} | 200 | | [ ] | |
| 12 | 分配权限 | POST /enterprises/{id}/roles/{rid}/permissions | 200 | | [ ] | |
| 13 | 删除角色 | DELETE /enterprises/{id}/roles/{rid} | 200 | | [ ] | |
| 14 | 查看项目列表 | GET /enterprises/{id}/projects | 200 | | [ ] | |
| 15 | 创建项目 | POST /enterprises/{id}/projects | 200 | | [ ] | |
| 16 | 查看项目详情 | GET /projects/{id} | 200 | | [ ] | |
| 17 | 编辑项目 | PUT /projects/{id} | 200 | | [ ] | |
| 18 | 查看任务列表 | GET /enterprises/{id}/projects/{pid}/tasks | 200 | | [ ] | |
| 19 | 创建任务 | POST /enterprises/{id}/projects/{pid}/tasks | 200 | | [ ] | |
| 20 | 分配任务 | PUT /tasks/{id} | 200 | | [ ] | |
| 21 | 删除任务 | DELETE /tasks/{id} | 200 | | [ ] | |
| 22 | 查看文档列表 | GET /enterprises/{id}/documents | 200 | | [ ] | |
| 23 | 创建文档 | POST /enterprises/{id}/documents | 200 | | [ ] | |
| 24 | 查看文档详情 | GET /enterprises/{id}/documents/{did} | 200 | | [ ] | |
| 25 | 编辑文档 | PUT /enterprises/{id}/documents/{did} | 200 | | [ ] | |
| 26 | 删除文档 | DELETE /enterprises/{id}/documents/{did} | 200 | | [ ] | |
| 27 | 查看权限列表 | GET /enterprises/{id}/permissions | 200 | | [ ] | |
| 28 | 查看权限矩阵 | GET /system/roles/permissions/matrix | 200 | | [ ] | |
| 29 | 查看审计日志 | GET /system/audit/logs | 200 | | [ ] | |
| 30 | 筛选审计日志 | GET /system/audit/logs?action=create | 200 | | [ ] | |

---

## 📊 统计结果

- **总测试数**: 30
- **通过数**: __________
- **失败数**: __________
- **不适用**: __________
- **通过率**: __________%

---

## 🔄 下一步

功能测试完成后，请继续执行：
**子任务8: 测试结果记录和优化建议**

---

## ⚠️ 注意事项

1. **测试顺序**: 按照文档顺序执行，某些测试依赖前面的结果
2. **记录ID**: 创建的测试资源ID需要记录，后续测试会用到
3. **清理数据**: 测试完成后记得清理测试数据
4. **API变化**: 如果某些API不存在，标记为"N/A"并继续下一个测试
5. **错误记录**: 失败的测试请详细记录错误信息

---

## 📝 执行记录

**执行时间**: __________
**执行人**: __________
**环境**: localhost:8080
**测试账号**: huangcong
**总体结果**: [ ] ✅ 全部通过 [ ] ⚠️ 部分通过 [ ] ❌ 失败
**备注**:

---

**创建时间**: 2025-11-02
**文档版本**: v1.0
