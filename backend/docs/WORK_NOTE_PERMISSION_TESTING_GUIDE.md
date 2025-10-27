# 工作笔记权限系统测试指南

## 概述

本文档提供工作笔记权限系统的完整测试指南，包括单元测试、集成测试和手动测试。

## 测试架构

```
测试层次结构
├── 单元测试 (Unit Tests)
│   ├── utils/permission_checker_test.go (47个测试用例 ✅)
│   └── 权限检查函数测试
│
├── 集成测试 (Integration Tests)
│   ├── handlers/work_note_permission_integration_test.go
│   ├── 完整权限流程测试
│   └── 跨模块交互测试
│
└── 手动测试 (Manual Tests)
    ├── API端点测试
    ├── 前端UI测试
    └── 端到端用户场景测试
```

## 1. 单元测试

### 1.1 权限检查函数测试 ✅

**文件**: `backend/utils/permission_checker_test.go`

**测试套件**:

| 测试套件 | 测试用例数 | 状态 | 覆盖功能 |
|---------|-----------|------|---------|
| TestIsSystemAdmin | 5 | ✅ | 系统管理员检查 |
| TestGetUserID | 5 | ✅ | 用户ID获取 |
| TestCanCommentNote | 6 | ✅ | 评论创建权限 |
| TestCanDeleteNoteComment | 5 | ✅ | 评论删除权限 |
| TestCanEditNoteComment | 4 | ✅ | 评论编辑权限 |
| TestCheckNoteCommentPermission | 13 | ✅ | 综合评论权限 |
| TestCheckPublicNotePermission | 4 | ✅ | 公开笔记权限 |
| TestCheckNoteVisibilityPermission | 5 | ✅ | 笔记可见性权限 |
| **总计** | **47** | **✅** | **全部通过** |

**运行测试**:
```bash
# 运行所有权限检查测试
cd backend
go test -v ./utils -run "TestCan.*NoteComment|TestCheckNoteCommentPermission"

# 运行特定测试
go test -v ./utils -run TestCanCommentNote

# 生成覆盖率报告
go test -coverprofile=coverage.out ./utils
go tool cover -html=coverage.out -o coverage.html
```

**预期结果**:
```
=== RUN   TestCanCommentNote
--- PASS: TestCanCommentNote (0.00s)
=== RUN   TestCanDeleteNoteComment
--- PASS: TestCanDeleteNoteComment (0.00s)
=== RUN   TestCanEditNoteComment
--- PASS: TestCanEditNoteComment (0.00s)
=== RUN   TestCheckNoteCommentPermission
--- PASS: TestCheckNoteCommentPermission (0.00s)
PASS
ok      ai-project-backend/utils    0.365s
```

### 1.2 关键测试场景

#### 私有笔记权限测试
```go
// 测试用例：私有笔记-创建者可以评论
{
    visibility:  "private",
    userID:      1,  // 创建者
    creatorID:   1,
    expectError: false,
}

// 测试用例：私有笔记-其他用户不能评论
{
    visibility:  "private",
    userID:      2,  // 非创建者
    creatorID:   1,
    expectError: true,
    errorMsg:    "只有笔记创建者可以评论私有笔记",
}
```

#### 团队笔记权限测试
```go
// 测试用例：团队笔记-所有登录用户可以评论
{
    visibility:  "team",
    userID:      2,  // 任何登录用户
    creatorID:   1,
    expectError: false,
}
```

#### 公开笔记权限测试
```go
// 测试用例：公开笔记-所有登录用户可以评论
{
    visibility:  "public",
    userID:      3,  // 任何登录用户
    creatorID:   1,
    expectError: false,
}
```

#### 系统管理员特权测试
```go
// 测试用例：系统管理员可以删除任何评论
{
    userID:          99,
    userType:        "system",
    role:            "admin",
    commentAuthorID: 1,  // 其他用户的评论
    expected:        true,
}

// 测试用例：系统管理员不能编辑他人评论
{
    userID:          99,
    userType:        "system",
    role:            "admin",
    commentAuthorID: 1,  // 其他用户的评论
    expected:        false,
}
```

## 2. 集成测试

### 2.1 权限集成测试

**文件**: `backend/handlers/work_note_permission_integration_test.go`

**测试场景**:

#### 场景1: 私有笔记权限流程
```
1. 用户A创建私有笔记
2. 用户A可以查看和编辑
3. 用户B尝试查看（应失败）
4. 用户B尝试编辑（应失败）
5. 系统管理员尝试编辑（应失败）
```

#### 场景2: 团队笔记权限流程
```
1. 用户A创建团队笔记
2. 用户A可以编辑
3. 用户B可以查看
4. 用户B不能编辑
5. 用户C可以添加评论
```

#### 场景3: 公开笔记权限流程
```
1. 系统管理员创建公开笔记
2. 所有登录用户可以查看
3. 普通用户可以添加评论
4. 只有系统管理员可以编辑
5. 系统管理员可以删除不当评论
```

#### 场景4: 评论权限流程
```
1. 在团队笔记上添加评论
2. 评论作者可以编辑自己的评论
3. 其他用户不能编辑评论
4. 评论作者可以删除自己的评论
5. 系统管理员可以删除任何评论
6. 系统管理员不能编辑他人评论
```

#### 场景5: 文件夹权限流程
```
1. 在私有树创建文件夹
2. 系统管理员在公开树创建文件夹
3. 测试文件夹的编辑和删除权限
```

### 2.2 复杂场景测试

#### 跨笔记类型权限测试
```
场景：笔记可见性转换
1. 创建私有笔记
2. 验证只有创建者可访问
3. 转换为团队笔记（如果实现）
4. 验证所有登录用户可访问
5. 尝试转换为公开笔记（应失败，除非是系统管理员）
```

#### 系统管理员权限边界测试
```
验证内容：
✅ 可以创建公开笔记
✅ 可以删除任何评论
❌ 不能编辑他人的私有笔记
❌ 不能编辑他人的评论
```

#### 多用户协作场景
```
1. 用户A创建团队笔记
2. 用户B添加评论
3. 用户C查看笔记和评论
4. 用户B编辑自己的评论
5. 用户C尝试编辑用户B的评论（应失败）
6. 系统管理员删除不当评论
```

### 2.3 运行集成测试

```bash
# 运行所有集成测试
go test -v ./handlers -run TestWorkNotePermissionIntegration

# 运行特定场景
go test -v ./handlers -run TestWorkNotePermissionIntegration/Private笔记权限流程

# 运行复杂场景测试
go test -v ./handlers -run TestPermissionScenarios
```

**注意**: 由于集成测试需要完整的工作笔记评论功能，当前版本的集成测试主要验证测试逻辑和场景设计。实际API测试将在评论功能实现后进行。

## 3. 手动测试

### 3.1 准备工作

#### 创建测试用户

```sql
-- 创建测试用户
INSERT INTO users (username, email, user_type, role, status)
VALUES
    ('test_user1', 'user1@test.com', 'enterprise', 'user', 'active'),
    ('test_user2', 'user2@test.com', 'enterprise', 'user', 'active'),
    ('test_admin', 'admin@test.com', 'system', 'admin', 'active');
```

#### 获取认证Token

```bash
# 登录获取token
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test_user1",
    "password": "password123"
  }'

# 保存token到环境变量
export TOKEN="<your_jwt_token>"
```

### 3.2 测试用例

#### 测试1: 私有笔记权限

**步骤1**: 用户1创建私有笔记
```bash
curl -X POST http://localhost:8080/api/v1/work-notes \
  -H "Authorization: Bearer $TOKEN_USER1" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "我的私有笔记",
    "content": "这是私有内容",
    "visibility": "private"
  }'
```

**预期结果**: ✅ 创建成功

**步骤2**: 用户1查看自己的私有笔记
```bash
curl -X GET http://localhost:8080/api/v1/work-notes/{note_id} \
  -H "Authorization: Bearer $TOKEN_USER1"
```

**预期结果**: ✅ 查看成功

**步骤3**: 用户2尝试查看用户1的私有笔记
```bash
curl -X GET http://localhost:8080/api/v1/work-notes/{note_id} \
  -H "Authorization: Bearer $TOKEN_USER2"
```

**预期结果**: ❌ 403 Forbidden - "无权访问此私有笔记"

**步骤4**: 用户2尝试编辑用户1的私有笔记
```bash
curl -X PUT http://localhost:8080/api/v1/work-notes/{note_id} \
  -H "Authorization: Bearer $TOKEN_USER2" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "尝试修改",
    "content": "尝试修改内容"
  }'
```

**预期结果**: ❌ 403 Forbidden

#### 测试2: 团队笔记权限

**步骤1**: 用户1创建团队笔记
```bash
curl -X POST http://localhost:8080/api/v1/work-notes \
  -H "Authorization: Bearer $TOKEN_USER1" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "团队协作笔记",
    "content": "团队共享内容",
    "visibility": "team"
  }'
```

**预期结果**: ✅ 创建成功

**步骤2**: 用户2查看团队笔记
```bash
curl -X GET http://localhost:8080/api/v1/work-notes/{note_id} \
  -H "Authorization: Bearer $TOKEN_USER2"
```

**预期结果**: ✅ 查看成功

**步骤3**: 用户2尝试编辑团队笔记
```bash
curl -X PUT http://localhost:8080/api/v1/work-notes/{note_id} \
  -H "Authorization: Bearer $TOKEN_USER2" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "尝试修改团队笔记"
  }'
```

**预期结果**: ❌ 403 Forbidden - 只有创建者可以编辑

#### 测试3: 公开笔记权限

**步骤1**: 普通用户尝试创建公开笔记
```bash
curl -X POST http://localhost:8080/api/v1/work-notes \
  -H "Authorization: Bearer $TOKEN_USER1" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "尝试创建公开笔记",
    "content": "公开内容",
    "visibility": "public"
  }'
```

**预期结果**: ❌ 403 Forbidden - "只有系统管理员可以创建公开笔记"

**步骤2**: 系统管理员创建公开笔记
```bash
curl -X POST http://localhost:8080/api/v1/work-notes \
  -H "Authorization: Bearer $TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "官方公告",
    "content": "这是一条公开信息",
    "visibility": "public"
  }'
```

**预期结果**: ✅ 创建成功

**步骤3**: 普通用户查看公开笔记
```bash
curl -X GET http://localhost:8080/api/v1/work-notes/{note_id} \
  -H "Authorization: Bearer $TOKEN_USER1"
```

**预期结果**: ✅ 查看成功

**步骤4**: 普通用户尝试编辑公开笔记
```bash
curl -X PUT http://localhost:8080/api/v1/work-notes/{note_id} \
  -H "Authorization: Bearer $TOKEN_USER1" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "尝试修改公告"
  }'
```

**预期结果**: ❌ 403 Forbidden - "只有系统管理员可以编辑公开笔记"

#### 测试4: 评论权限（待评论功能实现后测试）

**测试4.1**: 私有笔记评论
```bash
# 创建者可以评论私有笔记
curl -X POST http://localhost:8080/api/v1/work-notes/{note_id}/comments \
  -H "Authorization: Bearer $TOKEN_USER1" \
  -H "Content-Type: application/json" \
  -d '{"content": "我的备注"}'
# 预期: ✅ 成功

# 其他用户不能评论私有笔记
curl -X POST http://localhost:8080/api/v1/work-notes/{note_id}/comments \
  -H "Authorization: Bearer $TOKEN_USER2" \
  -H "Content-Type: application/json" \
  -d '{"content": "尝试评论"}'
# 预期: ❌ 403 Forbidden
```

**测试4.2**: 团队笔记评论
```bash
# 任何登录用户可以评论团队笔记
curl -X POST http://localhost:8080/api/v1/work-notes/{note_id}/comments \
  -H "Authorization: Bearer $TOKEN_USER2" \
  -H "Content-Type: application/json" \
  -d '{"content": "团队讨论"}'
# 预期: ✅ 成功
```

**测试4.3**: 评论编辑和删除
```bash
# 评论作者可以编辑自己的评论
curl -X PUT http://localhost:8080/api/v1/work-notes/{note_id}/comments/{comment_id} \
  -H "Authorization: Bearer $TOKEN_USER2" \
  -H "Content-Type: application/json" \
  -d '{"content": "修改后的评论"}'
# 预期: ✅ 成功

# 其他用户不能编辑评论
curl -X PUT http://localhost:8080/api/v1/work-notes/{note_id}/comments/{comment_id} \
  -H "Authorization: Bearer $TOKEN_USER1" \
  -H "Content-Type: application/json" \
  -d '{"content": "尝试修改"}'
# 预期: ❌ 403 Forbidden

# 系统管理员可以删除任何评论
curl -X DELETE http://localhost:8080/api/v1/work-notes/{note_id}/comments/{comment_id} \
  -H "Authorization: Bearer $TOKEN_ADMIN"
# 预期: ✅ 成功
```

### 3.3 测试检查清单

#### Private笔记测试
- [ ] 创建者可以创建私有笔记
- [ ] 创建者可以查看私有笔记
- [ ] 创建者可以编辑私有笔记
- [ ] 创建者可以删除私有笔记
- [ ] 其他用户不能查看私有笔记
- [ ] 其他用户不能编辑私有笔记
- [ ] 系统管理员也不能编辑他人的私有笔记

#### Team笔记测试
- [ ] 任何登录用户可以创建团队笔记
- [ ] 创建者可以编辑团队笔记
- [ ] 所有登录用户可以查看团队笔记
- [ ] 非创建者不能编辑团队笔记
- [ ] 创建者可以删除团队笔记

#### Public笔记测试
- [ ] 只有系统管理员可以创建公开笔记
- [ ] 普通用户不能创建公开笔记
- [ ] 所有登录用户可以查看公开笔记
- [ ] 只有系统管理员可以编辑公开笔记
- [ ] 普通用户不能编辑公开笔记
- [ ] 只有系统管理员可以删除公开笔记

#### 评论权限测试（待实现）
- [ ] 私有笔记：只有创建者可以评论
- [ ] 团队笔记：所有登录用户可以评论
- [ ] 公开笔记：所有登录用户可以评论
- [ ] 只有评论作者可以编辑评论
- [ ] 系统管理员不能编辑他人评论
- [ ] 评论作者可以删除自己的评论
- [ ] 系统管理员可以删除任何评论

#### 文件夹权限测试
- [ ] 用户可以在私有树创建文件夹
- [ ] 用户可以编辑自己的私有文件夹
- [ ] 其他用户不能编辑私有文件夹
- [ ] 系统管理员可以在公开树创建文件夹
- [ ] 普通用户不能在公开树创建文件夹
- [ ] 系统管理员可以编辑公开文件夹
- [ ] 普通用户不能编辑公开文件夹

## 4. 测试数据

### 4.1 测试用户

| 用户ID | 用户名 | 用户类型 | 角色 | 说明 |
|-------|--------|----------|------|------|
| 1 | test_user1 | enterprise | user | 普通用户1 |
| 2 | test_user2 | enterprise | user | 普通用户2 |
| 3 | test_user3 | enterprise | user | 普通用户3 |
| 99 | test_admin | system | admin | 系统管理员 |

### 4.2 测试笔记

| 笔记ID | 标题 | 创建者 | 可见性 | 说明 |
|-------|------|--------|--------|------|
| 1001 | 私有测试笔记 | user1 | private | 用于测试私有权限 |
| 1002 | 团队测试笔记 | user1 | team | 用于测试团队权限 |
| 1003 | 公开测试笔记 | admin | public | 用于测试公开权限 |

## 5. 问题排查

### 5.1 常见问题

**Q1**: 测试时提示"请先登录"
- **A**: 检查JWT token是否正确设置在Authorization header中

**Q2**: 403 Forbidden错误
- **A**: 检查用户权限是否正确，确认用户类型和角色

**Q3**: 单元测试编译失败
- **A**: 检查是否有其他测试文件的编译错误影响

**Q4**: 集成测试无法运行
- **A**: 确认评论功能是否已实现，当前版本主要是设计验证

### 5.2 调试技巧

#### 启用调试日志
```go
log.Printf("[PERMISSION CHECK] operation=%s, visibility=%s, creatorID=%d, userID=%d",
    operation, visibility, creatorID, userID)
```

#### 检查用户上下文
```go
userID, _ := c.Get("user_id")
userType, _ := c.Get("user_type")
userRole, _ := c.Get("user_role")
log.Printf("[DEBUG] User: id=%v, type=%v, role=%v", userID, userType, userRole)
```

## 6. 测试报告模板

### 测试执行报告

**测试日期**: YYYY-MM-DD
**测试人员**: XXX
**环境**: Development / Staging / Production

#### 单元测试结果
- 总测试用例数: 47
- 通过: 47
- 失败: 0
- 跳过: 0
- 覆盖率: 100%

#### 集成测试结果
- 总场景数: 5
- 通过: X
- 失败: X
- 跳过: X

#### 手动测试结果
- 总检查项: 30
- 通过: X
- 失败: X
- 待测试: X

#### 发现的问题
1. [问题描述]
   - 严重程度: 高/中/低
   - 复现步骤: ...
   - 预期结果: ...
   - 实际结果: ...

#### 总结
- 整体质量评估: 优秀/良好/需改进
- 建议上线: 是/否
- 备注: ...

## 7. 持续改进

### 7.1 未来测试计划
1. 增加性能测试（权限检查性能）
2. 增加压力测试（多用户并发访问）
3. 增加安全测试（权限绕过尝试）
4. 增加UI自动化测试（前端权限控制）

### 7.2 测试工具
- Go testing框架
- testify/assert断言库
- Postman/Insomnia（API测试）
- Cypress/Playwright（前端E2E测试）

---

**文档版本**: 1.0
**最后更新**: 2025-10-27
**维护人员**: AI Development Team
