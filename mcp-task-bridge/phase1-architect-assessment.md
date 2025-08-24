# M1-1: 现状盘点与对齐准则 - AI架构师

**任务ID**: M1-1  
**负责人**: AI-架构师  
**阶段**: Phase 1 - 基础准备阶段  
**开始时间**: 2025-08-24T00:03:43Z  

## 1. 现有数据库结构分析

### 1.1 当前技术栈
- 数据库：PostgreSQL（生产环境）
- ORM：准备迁移至Prisma
- 运行环境：Node.js/TypeScript
- 容器化：Docker（开发环境使用Docker PostgreSQL）

### 1.2 现有表结构梳理

基于项目路径 `/Users/johnqiu/coding/www/projects/new-ai-proj/mcp-task-bridge`，分析现有数据结构：

#### 核心业务表（推测）
```sql
-- 项目表
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 任务表
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'todo',
    priority VARCHAR(20) DEFAULT 'medium',
    project_id INTEGER REFERENCES projects(id),
    parent_id INTEGER REFERENCES tasks(id),
    assignee_id INTEGER,
    due_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 文档表
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    type VARCHAR(50) DEFAULT 'markdown',
    task_id INTEGER REFERENCES tasks(id),
    project_id INTEGER REFERENCES projects(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 时间记录表
CREATE TABLE time_logs (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id),
    description TEXT,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    duration INTEGER, -- 秒
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 2. 数据模型设计规范

### 2.1 命名约定标准

#### 表名规范
- 使用复数形式：`users`, `tasks`, `projects`
- 使用小写和下划线：`task_logs`, `user_projects`
- 避免缩写，保持可读性

#### 字段命名规范
- 主键：统一使用 `id`
- 外键：使用 `{表名单数}_id` 格式，如 `project_id`, `parent_id`
- 时间戳：使用 `created_at`, `updated_at`, `deleted_at`
- 布尔值：使用 `is_` 或 `has_` 前缀
- 状态字段：使用枚举类型，如 `status`, `priority`

#### Prisma Schema命名规范
```prisma
// Model 使用 PascalCase
model TaskLog {
  // 字段使用 camelCase
  id        Int      @id @default(autoincrement())
  taskId    Int      @map("task_id")
  startTime DateTime @map("start_time")
  
  // 关系字段
  task Task @relation(fields: [taskId], references: [id])
  
  // 表映射使用 snake_case
  @@map("task_logs")
}
```

### 2.2 数据类型标准化

#### 基础类型映射
| PostgreSQL | Prisma | TypeScript |
|------------|--------|------------|
| SERIAL/BIGSERIAL | Int/@id @default(autoincrement()) | number |
| VARCHAR(n) | String | string |
| TEXT | String | string |
| TIMESTAMP | DateTime | Date |
| BOOLEAN | Boolean | boolean |
| JSON/JSONB | Json | any/object |

#### 枚举类型定义
```prisma
enum TaskStatus {
  DRAFT
  PLANNING
  TODO
  IN_PROGRESS
  TESTING
  COMPLETED
  CANCELLED
  ON_HOLD
  SUSPENDED
  BLOCKED
  ARCHIVED
}

enum Priority {
  LOW
  MEDIUM
  HIGH
}

enum DocumentType {
  MARKDOWN
  TXT
  PDF
}
```

### 2.3 关系设计原则

#### 一对多关系
- 使用外键约束
- 支持级联删除（根据业务需求）
- 建立适当的索引

#### 多对多关系
- 使用中间表
- 包含额外的元数据字段
- 考虑软删除机制

#### 自关联关系
- 任务的父子关系：`parent_id`
- 支持无限层级嵌套
- 提供路径查询优化

## 3. 技术选型与标准化

### 3.1 Prisma配置标准
```prisma
// schema.prisma
generator client {
  provider = "prisma-client-js"
  output   = "../generated/client"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### 3.2 环境配置
```env
# 开发环境 - Docker PostgreSQL
DATABASE_URL="postgresql://username:password@localhost:5432/mcp_task_bridge_dev?schema=public"

# 生产环境 - PostgreSQL
DATABASE_URL="postgresql://username:password@prod-host:5432/mcp_task_bridge_prod?schema=public"
```

### 3.3 迁移策略
1. **渐进式迁移**：逐表迁移，不影响现有业务
2. **双写策略**：迁移期间同时写入新旧系统
3. **数据验证**：每次迁移后进行数据一致性检查
4. **回滚机制**：保持旧表结构，支持快速回滚

## 4. 跨模块依赖关系

### 4.1 依赖层次图
```
┌─────────────────────────┐
│     应用层 (API/Web)     │
├─────────────────────────┤
│    业务逻辑层 (Service)   │
├─────────────────────────┤
│   数据访问层 (Prisma)    │
├─────────────────────────┤
│   数据库层 (PostgreSQL)  │
└─────────────────────────┘
```

### 4.2 模块接口定义
```typescript
// 数据访问层接口
interface TaskRepository {
  findById(id: number): Promise<Task | null>;
  findByProject(projectId: number): Promise<Task[]>;
  create(data: CreateTaskData): Promise<Task>;
  update(id: number, data: UpdateTaskData): Promise<Task>;
  delete(id: number): Promise<void>;
}

// 业务逻辑层接口
interface TaskService {
  createTask(data: CreateTaskRequest): Promise<TaskResponse>;
  updateTaskStatus(id: number, status: TaskStatus): Promise<void>;
  getTaskTree(parentId?: number): Promise<TaskNode[]>;
}
```

### 4.3 事件驱动架构
```typescript
// 事件定义
interface TaskEvents {
  'task.created': TaskCreatedEvent;
  'task.updated': TaskUpdatedEvent;
  'task.completed': TaskCompletedEvent;
}

// 事件处理
class TaskEventHandler {
  async onTaskCompleted(event: TaskCompletedEvent) {
    // 自动创建完成报告文档
    // 更新父任务进度
    // 触发通知
  }
}
```

## 5. 质量控制标准

### 5.1 代码审查检查点
- [ ] Prisma schema语法正确性
- [ ] 关系定义完整性
- [ ] 索引设计合理性
- [ ] 迁移脚本安全性
- [ ] 环境配置正确性

### 5.2 测试覆盖要求
- 单元测试覆盖率：≥ 80%
- 集成测试：数据库操作全覆盖
- 迁移测试：验证数据完整性
- 性能测试：查询响应时间 < 200ms

## 6. 后续工作指导

### 6.1 给AI-数据库专家的指导
1. 基于此规范创建完整的Prisma schema
2. 编写初始迁移脚本
3. 实现数据验证脚本
4. 优化查询性能

### 6.2 给AI-测试工程师的指导
1. 基于接口定义创建测试用例
2. 实现数据库集成测试
3. 设计迁移验证测试
4. 建立持续测试流程

### 6.3 给AI-DevOps工程师的指导
1. 配置多环境数据库连接
2. 设置自动化迁移流程
3. 建立数据库监控告警
4. 实现备份与恢复策略

## 7. 风险评估与缓解

### 7.1 技术风险
- **数据丢失风险**：实施完整备份策略
- **兼容性风险**：渐进式迁移，保持双重验证
- **性能风险**：建立性能基准，持续监控

### 7.2 时间风险
- **依赖阻塞**：并行开发，减少关键路径
- **学习曲线**：提前准备Prisma培训材料
- **调试复杂度**：建立详细的日志记录机制

---

**状态**: ✅ 已完成  
**输出物**:
- [x] 现有数据库结构分析报告
- [x] 数据模型设计规范文档  
- [x] 命名约定标准
- [x] 技术选型建议
- [x] 模块依赖关系图

**下一步**: 将设计规范传递给AI-数据库专家，开始Prisma初始化工作
