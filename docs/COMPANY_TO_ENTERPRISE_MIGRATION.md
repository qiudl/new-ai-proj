# Company体系到Enterprise体系迁移指南

## 文档概述

本文档记录了从Company/Customer双轨体系迁移到统一的Enterprise企业管理体系的完整过程。

**迁移时间**: 2025年10月27日
**相关任务**: #2852 系统性清理company体系
**文档版本**: v1.0

---

## 迁移背景

### 原有架构问题

系统原本维护了两套并行的企业管理体系：

1. **Company体系** (`companies` 表)
   - 用于内部项目管理
   - 字段：company_id, company_name
   - API前缀：`/api/v1/companies`

2. **Customer体系** (`customers` 表)
   - 用于客户关系管理
   - 字段：customer_id, customer_name
   - API前缀：`/api/v1/customers`

**问题**：
- 概念重复，功能重叠
- 数据冗余，维护成本高
- 用户困惑，学习曲线陡峭
- 代码复杂度增加

### 新架构目标

统一为**Enterprise企业管理体系**：

- 单一的企业实体：`enterprises` 表
- 统一的字段命名：`enterprise_id`, `enterprise_name`
- 统一的API前缀：`/api/v1/enterprises`
- 清晰的业务语义

---

## 迁移时间线

### Phase 1: 测试环境验证 ✅

**任务**: #2853
**完成时间**: 2025-10-27

- [x] 创建数据迁移脚本
- [x] 在测试环境执行迁移
- [x] 验证数据完整性
- [x] 测试API兼容性

### Phase 2: 后端代码清理 ✅

**任务**: #2854
**完成时间**: 2025-10-27

#### 删除的代码

1. **数据库表**:
   - `companies` 表
   - `customers` 表
   - `project_companies` 关联表
   - `company_users` 关联表

2. **Go代码**:
   - `models/company.go` (323行)
   - `models/customer.go` (256行)
   - `handlers/company_handler.go` (486行)
   - `handlers/customer_handler.go` (411行)
   - `services/company_service.go` (378行)
   - `services/customer_service.go` (334行)

3. **API路由**:
   - `/api/v1/companies/*` - 所有company端点
   - `/api/v1/customers/*` - 所有customer端点

**成果**: 删除约2,200行代码，净删除1,800+行

### Phase 3: 前端代码清理 ✅

**任务**: #2855
**完成时间**: 2025-10-27

#### 删除的代码

1. **类型定义**:
   - `Company` interface (types/project.ts)
   - `ProjectCompany` interface
   - `CompanyUser` interface

2. **服务文件**:
   - `services/customerService.ts` (228行)

3. **方法和字段**:
   - `projectService.getProjectsByCompany()`
   - `permissionService.getCompanyPermissions()`
   - Project接口中的 `company_id`, `company_name` 字段

4. **组件更新**:
   - 19个文件修改
   - 所有 `company_id` 改为 `enterprise_id`
   - 所有向后兼容代码移除

**成果**: 修改20个文件，删除1个文件，净删除约400行代码

### Phase 4: 文档更新 🔄

**任务**: #2856
**进行中**: 2025-10-27

需要更新的文档：
- [ ] Swagger/OpenAPI文档（需要重新生成）
- [x] 迁移指南文档（本文档）
- [ ] API规范文档
- [ ] 数据库设计文档

### Phase 5: 生产环境执行 ⏳

**任务**: #2857
**计划**: 待定

---

## 数据迁移详情

### 迁移脚本

位置: `backend/migrations/company_to_enterprise_migration.sql`

主要步骤：

```sql
-- 1. 迁移companies数据到enterprises
INSERT INTO enterprises (id, name, code, industry, ...)
SELECT id, company_name, company_code, industry, ...
FROM companies
WHERE deleted_at IS NULL;

-- 2. 迁移customers数据到enterprises
INSERT INTO enterprises (id, name, code, industry, ...)
SELECT id + 10000, customer_name, customer_code, industry, ...
FROM customers
WHERE deleted_at IS NULL;

-- 3. 更新外键引用
UPDATE projects
SET enterprise_id = company_id
WHERE company_id IS NOT NULL;

UPDATE users
SET enterprise_id = company_id
WHERE user_type = 'company';

-- 4. 删除旧表
DROP TABLE IF EXISTS project_companies;
DROP TABLE IF EXISTS company_users;
DROP TABLE IF EXISTS companies;
DROP TABLE IF EXISTS customers;
```

### 数据映射关系

| 原字段 | 新字段 | 说明 |
|--------|--------|------|
| company_id | enterprise_id | 企业ID |
| company_name | enterprise_name | 企业名称 |
| company_code | code | 企业编码 |
| company_type | - | 已废弃 |
| customer_id | enterprise_id | 客户ID（+10000偏移） |
| customer_name | enterprise_name | 客户名称 |

---

## API变更清单

### 端点变更

| 原API | 新API | 状态 |
|-------|-------|------|
| `GET /api/v1/companies` | `GET /api/v1/enterprises` | ✅ 已更新 |
| `GET /api/v1/companies/:id` | `GET /api/v1/enterprises/:id` | ✅ 已更新 |
| `POST /api/v1/companies` | `POST /api/v1/enterprises` | ✅ 已更新 |
| `PUT /api/v1/companies/:id` | `PUT /api/v1/enterprises/:id` | ✅ 已更新 |
| `DELETE /api/v1/companies/:id` | `DELETE /api/v1/enterprises/:id` | ✅ 已更新 |
| `GET /api/v1/customers` | `GET /api/v1/enterprises` | ✅ 已合并 |
| `GET /api/v1/customers/:id` | `GET /api/v1/enterprises/:id` | ✅ 已合并 |

### 请求/响应字段变更

**Project相关API**:

```json
// Before:
{
  "id": 1,
  "name": "项目A",
  "company_id": 2,
  "company_name": "测试公司"
}

// After:
{
  "id": 1,
  "name": "项目A",
  "enterprise_id": 2,
  "enterprise_name": "测试公司"
}
```

**User相关API**:

```json
// Before:
{
  "id": 10,
  "username": "user1",
  "user_type": "company",
  "company_id": 2
}

// After:
{
  "id": 10,
  "username": "user1",
  "user_type": "company",  // 保持不变
  "enterprise_id": 2
}
```

---

## 代码迁移指南

### 后端代码更新

#### 1. Model定义

```go
// Before:
type Project struct {
    ID        uint   `json:"id"`
    Name      string `json:"name"`
    CompanyID uint   `json:"company_id"`
}

// After:
type Project struct {
    ID           uint   `json:"id"`
    Name         string `json:"name"`
    EnterpriseID uint   `json:"enterprise_id"`
}
```

#### 2. API Handler

```go
// Before:
func GetProjectsByCompany(c *gin.Context) {
    companyID := c.Param("companyId")
    // ...
}

// After:
func GetProjectsByEnterprise(c *gin.Context) {
    enterpriseID := c.Param("enterpriseId")
    // ...
}
```

#### 3. 数据库查询

```go
// Before:
db.Where("company_id = ?", companyID).Find(&projects)

// After:
db.Where("enterprise_id = ?", enterpriseID).Find(&projects)
```

### 前端代码更新

#### 1. TypeScript接口

```typescript
// Before:
interface Project {
  id: number;
  name: string;
  company_id?: number;
  company_name?: string;
}

// After:
interface Project {
  id: number;
  name: string;
  enterprise_id?: number;
  enterprise_name?: string;
}
```

#### 2. API调用

```typescript
// Before:
const projects = await projectService.getProjectsByCompany(companyId);

// After:
const projects = await projectService.getProjectsByEnterprise(enterpriseId);
```

#### 3. 组件属性

```tsx
// Before:
<ProjectList companyId={selectedCompany} />

// After:
<ProjectList enterpriseId={selectedEnterprise} />
```

---

## 向后兼容性

### 保留的Legacy字段

为了支持可能的老数据，某些类型定义中保留了`company_id`字段，但标记为Legacy：

```typescript
// types/user.ts
export interface User {
  company_id?: number; // Legacy field, kept for compatibility
  enterprise_id?: number; // New field
}
```

这些字段将在确认所有数据迁移完成后移除。

### API兼容性

当前版本的API：
- ✅ 完全支持 `enterprise_id` 参数
- ⚠️ 部分端点仍接受 `company_id` 参数（自动映射到enterprise_id）
- ❌ 不再支持 `/companies` 和 `/customers` 端点

---

## 数据库Schema变更

### 新增表

```sql
CREATE TABLE enterprises (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) UNIQUE,
    industry VARCHAR(100),
    address TEXT,
    contact_person VARCHAR(100),
    contact_phone VARCHAR(50),
    contact_email VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);
```

### 删除的表

- ❌ `companies`
- ❌ `customers`
- ❌ `project_companies`
- ❌ `company_users`

### 修改的表

**projects表**:
```sql
ALTER TABLE projects
  DROP COLUMN IF EXISTS company_id,
  ADD COLUMN enterprise_id INTEGER REFERENCES enterprises(id);
```

**users表**:
```sql
ALTER TABLE users
  DROP COLUMN IF EXISTS company_id,
  ADD COLUMN enterprise_id INTEGER REFERENCES enterprises(id);
```

---

## 测试验证

### 功能测试

- [x] 企业列表查询
- [x] 企业详情查看
- [x] 企业创建/更新/删除
- [x] 项目-企业关联
- [x] 用户-企业关联
- [x] 权限验证

### 性能测试

- [x] 查询性能（无降低）
- [x] 关联查询优化
- [x] 索引验证

### 兼容性测试

- [x] 前端UI正常显示
- [x] API响应格式正确
- [x] 老数据正常迁移

---

## 回滚计划

如果需要回滚到Company体系：

1. **数据库回滚**:
   ```sql
   -- 执行备份还原
   pg_restore -d ai_project_prod backup_before_migration.dump
   ```

2. **代码回滚**:
   ```bash
   # 回滚到迁移前的commit
   git revert <migration-commit-hash>
   ```

3. **前端回滚**:
   ```bash
   cd frontend
   git revert <migration-commit-hash>
   npm install
   npm run build
   ```

---

## 后续工作

### 待完成任务

1. **文档更新** (#2856):
   - [ ] 重新生成Swagger文档
   - [ ] 更新API规范文档
   - [ ] 更新开发者文档

2. **生产环境部署** (#2857):
   - [ ] 备份生产数据库
   - [ ] 执行迁移脚本
   - [ ] 部署新版本代码
   - [ ] 验证功能正常

### 长期优化

1. **完全移除Legacy代码**:
   - 移除types/user.ts中的company_id字段
   - 移除fallback逻辑
   - 清理临时兼容代码

2. **性能优化**:
   - 优化enterprise相关的查询索引
   - 添加缓存层
   - 优化关联查询

3. **功能增强**:
   - 企业分组管理
   - 企业层级结构
   - 企业数据统计

---

## 相关文档

- [后端清理报告](/docs/backend_company_cleanup_report.md)
- [前端清理报告](/docs/frontend_company_cleanup_report.md)
- [数据迁移脚本](/backend/migrations/company_to_enterprise_migration.sql)
- [测试报告](/docs/migration_test_report.md)

---

## 联系人

如有问题，请联系：

- 项目负责人: @admin
- 技术支持: Claude Code
- 相关任务: #2852

---

**文档生成时间**: 2025-10-27
**最后更新**: 2025-10-27
**文档状态**: 进行中
