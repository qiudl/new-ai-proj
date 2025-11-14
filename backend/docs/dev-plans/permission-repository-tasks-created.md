# Permission Repository 迁移后续任务已创建

## 任务创建时间
2025-01-14

## 任务树结构

### 父任务
- **ID**: 3688
- **标题**: Permission Repository 迁移后续优化
- **状态**: planning
- **优先级**: medium

### 子任务列表

#### 短期任务 (1-2周)

**1. 任务 3691: 短期：添加适配器层的单元测试**
- **状态**: todo
- **优先级**: high
- **预估工时**: 8 小时
- **描述**: 为 PermissionServiceRepositoryAdapter 编写完整的单元测试

**测试覆盖**:
- IsSystemAdmin()
- GetCompanyUserID()
- CheckCustomPermission()
- GetUserRolePermissions()
- GetProjectPermissions()
- CheckPermissionDelegation*()
- UpsertPermission()
- CreateRoleRecord()

**测试方法**:
- 使用 testify/mock
- 模拟数据库调用
- 边界条件测试
- 错误处理测试

---

**2. 任务 3692: 短期：监控生产环境性能**
- **状态**: todo
- **优先级**: high
- **预估工时**: 4 小时
- **描述**: 部署到生产环境后，监控权限检查相关的性能指标

**监控指标**:
- 权限检查响应时间
- 数据库查询次数
- CheckCustomPermission 额外查询影响
- 错误率和异常日志

**监控方式**:
- 添加 Prometheus metrics
- 查看应用日志
- 数据库慢查询日志
- APM 工具追踪

**期望结果**:
- 99% 请求响应时间 < 100ms
- 无性能回退
- 无新增错误

---

#### 中期任务 (1-2月)

**3. 任务 3693: 中期：重构 PermissionService 直接使用 PermissionRepository**
- **状态**: todo
- **优先级**: medium
- **预估工时**: 16 小时
- **描述**: 移除适配器层，让 PermissionService 直接依赖 PermissionRepository

**重构步骤**:
1. 分析 PermissionService 的所有方法调用
2. 将每个方法从使用 PermissionServiceRepository 改为 PermissionRepository
3. 更新方法签名（user_id vs company_user_id）
4. 重构权限检查逻辑，使用 CheckUserPermission() 的层级检查
5. 更新单元测试
6. 进行集成测试验证

**预期收益**:
- 减少一层间接调用
- 更清晰的代码结构
- 更好的性能（减少 GetCompanyUserID 查询）

---

**4. 任务 3694: 中期：废弃适配器层**
- **状态**: todo
- **优先级**: medium
- **预估工时**: 4 小时
- **依赖**: 任务 3693
- **描述**: 在完成 PermissionService 重构后，废弃并删除适配器层

**清理步骤**:
1. 确认所有代码不再使用 PermissionServiceRepositoryAdapter
2. 在 application.go 中移除适配器初始化
3. 删除 permission_service_repository_adapter.go
4. 更新文档，标记迁移完成
5. 回归测试

**验证**:
- 编译通过
- 所有测试通过
- 生产环境无异常

---

#### 长期任务 (3-6月)

**5. 任务 3695: 长期：完全删除 PermissionServiceRepository 接口**
- **状态**: todo
- **优先级**: low
- **预估工时**: 2 小时
- **依赖**: 任务 3694
- **描述**: 删除遗留的 PermissionServiceRepository 接口定义

**删除步骤**:
1. 确认没有任何代码引用此接口
2. 从 interfaces.go 中删除接口定义
3. 删除 ProjectPermissionData 结构体（如不再使用）
4. 更新所有相关文档
5. 更新迁移总结文档

**验证**:
- 全局搜索确认无引用
- 编译通过
- 文档更新完整

---

**6. 任务 3696: 长期：统一到 RBAC v2 架构**
- **状态**: todo
- **优先级**: low
- **预估工时**: 40 小时
- **依赖**: 任务 3695
- **描述**: 将所有权限管理统一到 RBAC v2 双层权限体系

**迁移计划**:
1. 评估 RBAC v1 到 v2 的迁移成本
2. 设计数据迁移方案（company_roles -> system_roles/enterprise_roles）
3. 编写数据迁移脚本
4. 更新所有权限检查逻辑使用 PermissionServiceV2Repository
5. 逐步迁移现有数据
6. 废弃 RBAC v1 相关表和代码

**预期收益**:
- 完整的多租户支持
- 更清晰的权限层级
- 统一的权限管理接口
- 更好的扩展性

**风险**:
- 数据迁移复杂度高
- 需要停机时间
- 可能影响现有功能

---

## 任务依赖关系图

```
3688 (父任务)
├── 3691 (短期：单元测试) - 可立即开始
├── 3692 (短期：性能监控) - 可立即开始
├── 3693 (中期：重构服务) - 依赖短期任务完成
├── 3694 (中期：废弃适配器) - 依赖 3693
├── 3695 (长期：删除接口) - 依赖 3694
└── 3696 (长期：统一架构) - 依赖 3695
```

## 总工时估算

| 阶段 | 任务数 | 总工时 |
|------|--------|--------|
| 短期 (1-2周) | 2 | 12 小时 |
| 中期 (1-2月) | 2 | 20 小时 |
| 长期 (3-6月) | 2 | 42 小时 |
| **总计** | **6** | **74 小时** |

## 优先级建议

### 立即开始 (本周)
- ✅ 任务 3691: 添加单元测试
- ✅ 任务 3692: 性能监控

### 下一步 (1-2月)
- 任务 3693: 重构 PermissionService
- 任务 3694: 废弃适配器层

### 计划中 (3-6月)
- 任务 3695: 删除接口
- 任务 3696: 统一架构

## 进度跟踪

可以通过以下方式查看任务进度:

```bash
# 查看父任务
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/v1/tasks/3688

# 查看所有子任务
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/v1/tasks?parent_id=3688

# 查看特定任务
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/v1/tasks/3691
```

## 相关文档

- [迁移总结](./permission-repository-migration-summary.md)
- [架构演进](./permission-repository-architecture.md)
- [使用指南](../PERMISSION_REPOSITORIES_GUIDE.md)

---

**创建人**: Claude AI Assistant
**创建时间**: 2025-01-14
**最后更新**: 2025-01-14
