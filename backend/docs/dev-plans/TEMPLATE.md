# {任务标题}

<!-- 文档元数据 -->
<!-- STATUS: todo|in_progress|testing|completed -->
<!-- LAST_SYNC: YYYY-MM-DDTHH:MM:SS+08:00 -->
<!-- VERSION: 1.0.0 -->

## 📌 任务信息

| 字段 | 内容 |
|------|------|
| 任务ID | #{task_id} |
| 项目 | {project_name} |
| 父任务 | #{parent_task_id} - {parent_task_title} |
| 状态 | 🟡 进行中 / ✅ 已完成 / 📋 待处理 / 🧪 测试中 |
| 优先级 | 🔴 高 / 🟡 中 / 🟢 低 |
| 负责人 | @{assignee_username} |
| 预计工时 | {estimated_hours} 小时 |
| 实际工时 | {actual_hours} 小时 |
| 创建时间 | {created_at} |
| 更新时间 | {updated_at} |
| 截止时间 | {due_date} |

## 📝 任务描述

> 简要描述任务的背景、目的和要解决的问题

### 背景
- 为什么要做这个任务？
- 现状存在什么问题？
- 对业务/系统的影响是什么？

### 需求来源
- [ ] 产品需求
- [ ] 技术优化
- [ ] Bug 修复
- [ ] 重构改进
- [ ] 其他：_______

## 🎯 目标与范围

### 目标
1. 明确的目标1
2. 明确的目标2
3. 明确的目标3

### 范围
#### 包含范围
- ✅ 功能点1
- ✅ 功能点2
- ✅ 功能点3

#### 不包含范围
- ❌ 超出范围的功能1
- ❌ 超出范围的功能2

### 影响范围
- **后端模块**：{affected_backend_modules}
- **前端页面**：{affected_frontend_pages}
- **数据库表**：{affected_database_tables}
- **API 接口**：{affected_apis}
- **依赖服务**：{dependent_services}

## 💡 技术方案

### 方案概述
> 用一段话概括技术实现方案

### 架构设计

```
[架构图或流程图]
┌─────────────┐
│   前端层    │
└──────┬──────┘
       │
┌──────▼──────┐
│   API层     │
└──────┬──────┘
       │
┌──────▼──────┐
│  业务逻辑层 │
└──────┬──────┘
       │
┌──────▼──────┐
│  数据访问层 │
└──────┬──────┘
       │
┌──────▼──────┐
│   数据库    │
└─────────────┘
```

### 实现步骤

#### 1. 后端实现
```go
// 关键代码片段或伪代码
type NewFeature struct {
    ID   uint   `json:"id"`
    Name string `json:"name"`
}

func (s *Service) ImplementFeature() error {
    // 实现逻辑
    return nil
}
```

**涉及文件**：
- `backend/handlers/new_feature_handler.go`
- `backend/database/new_feature_repository.go`
- `backend/models/new_feature.go`
- `backend/routes/new_feature_routes.go`

#### 2. 数据库变更
```sql
-- 迁移文件: migrations/20251111_01_new_feature/up.sql
CREATE TABLE IF NOT EXISTS new_features (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_new_features_name ON new_features(name);
```

#### 3. 前端实现
```typescript
// frontend/src/services/newFeatureService.ts
export const newFeatureService = {
  async getFeatures(): Promise<Feature[]> {
    const response = await api.get('/api/v1/features');
    return response.data;
  }
};
```

**涉及文件**：
- `frontend/src/pages/NewFeaturePage.tsx`
- `frontend/src/components/NewFeatureList.tsx`
- `frontend/src/services/newFeatureService.ts`
- `frontend/src/types/newFeature.ts`

#### 4. API 接口设计

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| GET | `/api/v1/features` | 获取功能列表 | `feature:read` |
| POST | `/api/v1/features` | 创建新功能 | `feature:create` |
| PUT | `/api/v1/features/:id` | 更新功能 | `feature:update` |
| DELETE | `/api/v1/features/:id` | 删除功能 | `feature:delete` |

### 技术选型

| 技术点 | 选型 | 原因 |
|--------|------|------|
| 后端框架 | Gin | 已有技术栈 |
| 前端框架 | React + TypeScript | 已有技术栈 |
| 数据库 | PostgreSQL | 已有技术栈 |
| 缓存 | Redis | 性能优化 |

### 关键技术难点
1. **难点1**：描述 + 解决方案
2. **难点2**：描述 + 解决方案
3. **难点3**：描述 + 解决方案

## 📋 开发计划

### 第一阶段：基础实现（预计 X 小时）
- [ ] 创建数据库迁移文件
- [ ] 实现数据模型
- [ ] 实现 Repository 层
- [ ] 实现 Handler 层
- [ ] 添加路由配置

### 第二阶段：前端开发（预计 X 小时）
- [ ] 创建 API 服务层
- [ ] 实现页面组件
- [ ] 实现业务逻辑
- [ ] 集成到路由

### 第三阶段：测试与优化（预计 X 小时）
- [ ] 单元测试
- [ ] 集成测试
- [ ] E2E 测试
- [ ] 性能优化
- [ ] 代码审查

## ✅ 验收标准

### 功能验收
- [ ] 功能点1可以正常使用
- [ ] 功能点2可以正常使用
- [ ] 功能点3可以正常使用
- [ ] 错误处理正确
- [ ] 权限控制正确

### 性能验收
- [ ] API 响应时间 < 500ms (95分位)
- [ ] 数据库查询优化（有必要的索引）
- [ ] 前端首屏加载时间 < 2s

### 质量验收
- [ ] 代码覆盖率 > 80%
- [ ] 无 TypeScript 错误
- [ ] 无 ESLint 错误
- [ ] 无安全漏洞（SQL注入、XSS等）

### 文档验收
- [ ] API 文档更新（Swagger）
- [ ] README 更新
- [ ] 更新日志记录

## 🧪 测试计划

### 单元测试
```go
func TestNewFeatureHandler(t *testing.T) {
    // 测试代码
}
```

### 集成测试
```bash
# 测试命令
curl -X GET http://localhost:8080/api/v1/features
```

### E2E 测试场景
1. **场景1**：用户创建新功能
   - 步骤1
   - 步骤2
   - 预期结果

2. **场景2**：用户编辑功能
   - 步骤1
   - 步骤2
   - 预期结果

## 🔍 Code Review Checklist

- [ ] 代码符合项目规范
- [ ] 错误处理完善
- [ ] 日志记录充分
- [ ] 性能考虑合理
- [ ] 安全性检查通过
- [ ] 可维护性良好
- [ ] 注释清晰准确

## 📚 参考资料

### 相关文档
- [项目架构文档](../ARCHITECTURE.md)
- [API 规范](../API_SPECIFICATION.md)
- [数据库设计](../../database/schema.md)

### 相关任务
- #{related_task_id_1} - {related_task_title_1}
- #{related_task_id_2} - {related_task_title_2}

### 技术文档
- [Gin 文档](https://gin-gonic.com/docs/)
- [React 文档](https://react.dev/)
- [PostgreSQL 文档](https://www.postgresql.org/docs/)

## ⚠️ 风险与注意事项

### 技术风险
1. **风险1**：描述 + 应对措施
2. **风险2**：描述 + 应对措施

### 业务风险
1. **风险1**：描述 + 应对措施
2. **风险2**：描述 + 应对措施

### 兼容性注意事项
- 向后兼容性：需要/不需要
- 数据迁移：需要/不需要
- 版本要求：xxx

## 🔄 更新日志

| 日期 | 版本 | 变更内容 | 变更人 |
|------|------|----------|--------|
| 2025-11-11 | 1.0.0 | 创建任务文档 | @username |
| 2025-11-12 | 1.1.0 | 完成后端实现 | @username |
| 2025-11-13 | 1.2.0 | 完成前端实现 | @username |
| 2025-11-14 | 2.0.0 | 测试通过，上线 | @username |

## 📊 进度跟踪

```
进度: ████████░░ 80%

已完成: 8/10 子任务
预计完成: 2025-11-15
实际完成: -
```

## 💬 讨论与备注

### 2025-11-11
- 初始设计讨论
- 确认技术方案

### 2025-11-12
- 发现性能问题，调整实现方案
- 添加缓存层

---

**创建时间**: {created_at}
**最后更新**: {updated_at}
**文档版本**: v1.0.0
**维护者**: @{assignee_username}
