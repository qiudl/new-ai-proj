# Task 3696: 统一到 RBAC v2 权限系统

## 任务信息

- **任务ID**: 3696
- **标题**: 长期：统一到 RBAC v2 权限系统
- **状态**: 📋 评估中
- **优先级**: medium
- **预估工时**: 16-24小时
- **依赖**: Task 3693 ✅, Task 3694 ✅, Task 3695 ✅

## 背景分析

### 当前状态

经过 Task 3693-3695，我们已经完成:
1. ✅ 重构 `PermissionService` 直接使用 `PermissionRepository`
2. ✅ 删除适配器层 (`PermissionServiceRepositoryAdapter`)
3. ✅ 删除废弃接口 (`PermissionServiceRepository`)

现在的架构:
```
PermissionService (legacy)
   ↓
PermissionRepository
```

### RBAC v2 当前状态

根据 `RBAC_V2_FINAL_STATUS.md`，RBAC v2 已经:
- ✅ **完全实现**: 双域权限系统（系统域 + 企业域）
- ✅ **生产就绪**: 95/100 分
- ✅ **完整的后端**: 18个新文件，6个新数据库表
- ⚠️ **前端未迁移**: 仍使用旧权限系统

**核心组件**:
1. `PermissionServiceV2` - 新的权限验证服务
2. `IdentityProvider` - 身份识别服务
3. `PermissionMiddlewareV2` - 权限中间件
4. 5个 Handler (System/Enterprise User/Role/Permission)
5. 2个 Repository (SystemRole, EnterpriseRole)

## 问题识别

### 核心问题: 双权限系统并存

当前系统中存在**两套并行的权限系统**:

#### Legacy 系统 (基于 company_*)
- **Tables**: `company_users`, `company_roles`, `permissions`, etc.
- **Service**: `PermissionService` (刚重构的)
- **Repository**: `PermissionRepository`
- **使用**: 大部分业务代码仍在使用

#### RBAC v2 系统 (system_* + enterprise_*)
- **Tables**: `system_roles`, `system_permissions`, `enterprise_roles`, etc.
- **Service**: `PermissionServiceV2`
- **Repository**: `SystemRoleRepository`, `EnterpriseRoleRepository`, `PermissionServiceV2Repository`
- **使用**: 新的API端点，但业务逻辑未完全迁移

**问题**:
- ❌ 数据重复
- ❌ 逻辑不一致
- ❌ 维护成本高
- ❌ 容易出错

## 整合策略

### Option A: 完全迁移到 RBAC v2 (推荐)

**目标**: 废弃 Legacy 系统，全面使用 RBAC v2

**优点**:
- ✅ 单一权限系统
- ✅ 更现代的架构
- ✅ 双域隔离(系统域/企业域)
- ✅ 更好的扩展性

**缺点**:
- ❌ 工作量大
- ❌ 需要迁移所有业务代码
- ❌ 需要数据迁移
- ❌ 风险较高

**估算工时**: 20-24小时

### Option B: 桥接方案 (过渡)

**目标**: 让 `PermissionService` 使用 RBAC v2 的底层

**优点**:
- ✅ 逐步迁移
- ✅ 风险可控
- ✅ 保持API兼容性

**缺点**:
- ❌ 仍然是两套系统
- ❌ 增加桥接复杂度
- ❌ 临时方案

**估算工时**: 12-16小时

### Option C: 共存模式 (保持现状)

**目标**: 两套系统长期共存

**优点**:
- ✅ 无需迁移
- ✅ 风险最低

**缺点**:
- ❌ 维护复杂度高
- ❌ 技术债务累积
- ❌ 不是长期方案

**估算工时**: 0小时

### 推荐方案: Option A (分阶段完全迁移)

考虑到长期维护和系统健康度，推荐 Option A，但分阶段实施。

## 完全迁移计划 (Option A)

### Phase 1: 数据模型映射 (2-3小时)

#### 1.1 表映射关系

| Legacy Table | RBAC v2 Table | 映射方式 |
|--------------|---------------|----------|
| `company_roles` | `enterprise_roles` | 1:1 映射 |
| `permissions` | `enterprise_permissions` | 合并到企业权限 |
| `company_user_roles` | 通过 user_enterprises 关联 | 间接映射 |
| `custom_permissions` | `enterprise_permissions` (custom) | 迁移为自定义权限 |
| `company_user_project_permissions` | 待定 | 需要新设计 |

#### 1.2 权限代码映射

**Legacy** → **RBAC v2**
- `project.read` → `enterprise.project.read`
- `task.create` → `enterprise.task.create`
- `system.admin` → `system.admin` (保持不变)

### Phase 2: 数据迁移脚本 (4-5小时)

#### 2.1 角色迁移
```sql
-- 迁移企业角色
INSERT INTO enterprise_roles (code, name, description, enterprise_id, created_at)
SELECT role_code, role_name, role_description, enterprise_id, created_at
FROM company_roles
WHERE enterprise_id IS NOT NULL;

-- 迁移系统角色
INSERT INTO system_roles (code, name, description, is_builtin, created_at)
SELECT role_code, role_name, role_description, is_system_role, created_at
FROM company_roles
WHERE is_system_role = true;
```

#### 2.2 权限迁移
```sql
-- 迁移企业权限
INSERT INTO enterprise_permissions (code, name, description, resource, action, created_at)
SELECT code, name, description, resource, action, created_at
FROM permissions
WHERE code NOT LIKE 'system.%';

-- 迁移系统权限
INSERT INTO system_permissions (code, name, description, resource, action, created_at)
SELECT code, name, description, resource, action, created_at
FROM permissions
WHERE code LIKE 'system.%';
```

#### 2.3 用户-角色关联迁移
```sql
-- 需要通过 user_enterprises 建立关联
-- 复杂度较高，需要详细设计
```

### Phase 3: Service 层重构 (6-8小时)

#### 3.1 废弃 PermissionService

将 `PermissionService` 标记为废弃:
```go
// Deprecated: Use PermissionServiceV2 instead
type PermissionService struct {
    // ...
}
```

#### 3.2 迁移业务代码

逐个文件迁移，将:
```go
// 之前
permissionService.CheckPermission(ctx, permCtx)

// 之后
permissionServiceV2.CheckPermission(ctx, userID, permissionCode, resourceID)
```

**需要修改的文件** (估算 50+ 处调用):
- `handlers/*.go` - 各种业务Handler
- `middleware/*.go` - 中间件
- `services/*.go` - 其他服务
- `routes/*.go` - 路由定义

#### 3.3 API兼容性

确保对外API保持兼容:
- ✅ HTTP接口不变
- ✅ 响应格式不变
- ✅ 错误码不变

### Phase 4: Repository 层清理 (2-3小时)

#### 4.1 废弃 PermissionRepository

标记为废弃:
```go
// Deprecated: Use SystemRoleRepository and EnterpriseRoleRepository instead
type PermissionRepository interface {
    // ...
}
```

#### 4.2 删除旧表 (谨慎！)

**Warning**: 只有在100%确认迁移成功后才能删除

```sql
-- 备份旧表
CREATE TABLE company_roles_backup AS SELECT * FROM company_roles;
CREATE TABLE permissions_backup AS SELECT * FROM permissions;

-- 删除旧表 (可选，建议保留一段时间)
-- DROP TABLE company_roles;
-- DROP TABLE permissions;
```

### Phase 5: 测试验证 (4-6小时)

#### 5.1 单元测试
- 更新所有权限相关的单元测试
- 确保覆盖率 > 80%

#### 5.2 集成测试
- 验证权限检查逻辑
- 验证角色分配
- 验证权限继承

#### 5.3 E2E测试
- 用户登录
- 权限验证
- 角色管理
- 权限分配

#### 5.4 性能测试
- 权限检查延迟
- 并发压力测试
- 数据库查询优化

### Phase 6: 文档和培训 (2-3小时)

#### 6.1 更新文档
- API文档
- 架构文档
- 迁移指南

#### 6.2 团队培训
- RBAC v2 使用说明
- 新旧权限系统对比
- 常见问题解答

## 风险评估

### 高风险 🔴

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|---------|
| 数据迁移错误 | 严重 | 中 | 多次测试，保留备份 |
| 业务逻辑差异 | 严重 | 中 | 详细对比测试 |
| 性能回退 | 中 | 低 | 性能监控，优化查询 |

### 中风险 🟡

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|---------|
| API 不兼容 | 中 | 低 | 兼容性测试 |
| 测试覆盖不足 | 中 | 中 | 增加测试用例 |

### 低风险 🟢

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|---------|
| 文档不一致 | 低 | 高 | 及时更新文档 |

## 回滚计划

如果迁移失败，需要能够快速回滚:

### 数据回滚
```sql
-- 恢复旧表
DROP TABLE company_roles;
CREATE TABLE company_roles AS SELECT * FROM company_roles_backup;
```

### 代码回滚
```bash
git revert <migration-commits>
go build ./main.go
```

## 成功标准

- ✅ 所有业务代码使用 PermissionServiceV2
- ✅ 所有单元测试通过
- ✅ 所有集成测试通过
- ✅ 性能无明显回退 (P95 < 100ms)
- ✅ API 兼容性验证通过
- ✅ 数据完整性验证通过

## 时间估算

| 阶段 | 任务 | 时间 |
|------|------|------|
| Phase 1 | 数据模型映射 | 2-3h |
| Phase 2 | 数据迁移脚本 | 4-5h |
| Phase 3 | Service 层重构 | 6-8h |
| Phase 4 | Repository 层清理 | 2-3h |
| Phase 5 | 测试验证 | 4-6h |
| Phase 6 | 文档和培训 | 2-3h |
| **总计** | | **20-28h** |

## 分阶段实施建议

考虑到工作量和风险，建议分为多个小任务:

### Stage 1: 准备和规划 (当前阶段)
- ✅ 创建迁移计划 (本文档)
- ⏳ 评审和确认方案
- ⏳ 准备测试环境

### Stage 2: 数据层迁移
- ⏳ 编写数据迁移脚本
- ⏳ 在测试环境验证
- ⏳ 创建数据备份策略

### Stage 3: Service 层重构
- ⏳ 逐个模块迁移到 PermissionServiceV2
- ⏳ 更新单元测试
- ⏳ 验证功能正确性

### Stage 4: 清理和优化
- ⏳ 废弃旧的 Service 和 Repository
- ⏳ 性能优化
- ⏳ 文档更新

### Stage 5: 生产部署
- ⏳ 灰度发布
- ⏳ 监控和观察
- ⏳ 全量发布

## 建议

基于当前评估，我的建议是:

### 短期 (本次任务)
**不建议立即执行完全迁移**，原因:
1. 工作量大 (20-28小时)
2. 风险较高
3. 需要前端配合
4. 需要数据库团队支持

**建议**:
- ✅ 完成当前的重构和清理 (Task 3693-3695) - **已完成**
- ✅ 创建详细的迁移计划 (本文档) - **已完成**
- 📋 与团队评审迁移方案
- 📋 准备测试环境和数据

### 中期 (1-2个月)
- 🎯 实施 Stage 2: 数据层迁移
- 🎯 实施 Stage 3: Service 层重构
- 🎯 完成测试验证

### 长期 (3-6个月)
- 🎯 实施 Stage 4: 清理和优化
- 🎯 实施 Stage 5: 生产部署
- 🎯 完全废弃 Legacy 系统

## 替代方案: 增量迁移

如果完全迁移风险太高，可以考虑**增量迁移**:

1. **Step 1**: 新功能使用 PermissionServiceV2
2. **Step 2**: 逐步将旧功能迁移到 RBAC v2
3. **Step 3**: 保持两套系统共存一段时间
4. **Step 4**: 确认稳定后完全废弃 Legacy

这种方式:
- ✅ 风险更低
- ✅ 可以逐步验证
- ❌ 时间更长
- ❌ 维护成本高

## 下一步行动

### 立即可做
1. ✅ 创建迁移计划 (本文档)
2. 📋 与团队讨论和评审
3. 📋 确定迁移时间表
4. 📋 准备测试环境

### 等待决策
- 📋 是否执行完全迁移?
- 📋 迁移时间表?
- 📋 需要哪些资源支持?

## 相关文档

- `RBAC_V2_FINAL_STATUS.md` - RBAC v2 最终状态
- `RBAC_DEVELOPMENT_PLAN.md` - RBAC 开发计划
- `task-3693-refactoring-completed.md` - PermissionService 重构完成报告
- `task-3694-3695-completed.md` - 适配器删除完成报告

---

**创建人**: Claude AI Assistant
**创建时间**: 2025-11-14
**状态**: 📋 评估完成，待决策
**推荐**: 分阶段实施，不急于完全迁移
