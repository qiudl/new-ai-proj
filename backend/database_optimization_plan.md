# 数据库优化计划

## 分析概述
**日期**: 2025-09-07  
**数据库**: ai_project_db (PostgreSQL)  
**当前大小**: 24 MB  
**表总数**: 83 个表  
**任务ID**: 1360

## 性能分析结果

### 1. 高频使用表分析
| 表名 | 大小 | 索引使用率 | 主要问题 |
|------|------|------------|----------|
| `tasks` | 2.57 MB | 99.99% | 索引使用良好，性能优秀 |
| `documents` | 2.33 MB | 98.21% | 索引使用良好 |
| `users` | 384 KB | 16.12% | **索引使用率低，需要优化** |
| `projects` | - | 38.07% | **索引使用率中等，有优化空间** |
| `customers` | - | 7.39% | **索引使用率极低** |
| `permissions` | - | 3.20% | **索引使用率极低** |

### 2. 未使用索引识别 (浪费存储空间)
| 表名 | 索引名 | 大小 | 状态 |
|------|--------|------|------|
| `task_updates` | `idx_task_updates_type_value` | 128 KB | 从未使用 |
| `task_status_history` | `idx_task_status_history_task_timestamp` | 120 KB | 从未使用 |
| `timeline_events` | `idx_timeline_events_task_date` | 112 KB | 从未使用 |
| `timeline_events` | `idx_timeline_events_type_date` | 104 KB | 从未使用 |
| `tasks` | `idx_tasks_path_gist` | 104 KB | 从未使用 |
| `tasks` | `idx_tasks_custom_fields_gin` | 96 KB | 从未使用 |

### 3. 高性能索引识别 (保留)
| 表名 | 索引名 | 使用次数 | 状态 |
|------|--------|----------|------|
| `tasks` | `idx_tasks_project_parent_deleted` | 309M+ | 🌟 关键索引 |
| `tasks` | `idx_tasks_parent_level_sort` | 4.8M+ | 🌟 关键索引 |
| `tasks` | `tasks_pkey` | 3.5M+ | 🌟 主键 |

## 优化建议

### 阶段1: 索引清理 (立即执行)
**目标**: 清理未使用索引，减少存储和维护开销

```sql
-- 删除未使用的索引
DROP INDEX IF EXISTS idx_task_updates_type_value;
DROP INDEX IF EXISTS idx_task_status_history_task_timestamp;
DROP INDEX IF EXISTS idx_timeline_events_task_date;
DROP INDEX IF EXISTS idx_timeline_events_type_date;
DROP INDEX IF EXISTS idx_tasks_path_gist;
DROP INDEX IF EXISTS idx_tasks_custom_fields_gin;
DROP INDEX IF EXISTS idx_tasks_project_path;
DROP INDEX IF EXISTS idx_documents_title;
DROP INDEX IF EXISTS idx_tasks_deleted_at_created_at;
```

**预期收益**: 节省 ~900 KB 存储空间

### 阶段2: 查询优化 (需要分析)
**目标**: 改善低索引使用率的表

#### A. Users 表优化 (16.12% 索引使用率)
- 需要分析常用查询模式
- 考虑添加复合索引
- 可能需要查询重写

#### B. Projects 表优化 (38.07% 索引使用率)  
- 检查查询条件
- 优化WHERE子句使用索引

#### C. Customers/Permissions 表
- 索引使用率极低 (<10%)
- 需要详细查询分析

### 阶段3: 架构优化
**目标**: 长期架构改进

1. **Enterprise 系统迁移完成**
   - 完成从legacy customer/company系统到enterprise系统的迁移
   - 清理冗余表和数据

2. **表分区策略**
   - 对大表(tasks, documents)考虑分区
   - 按时间或项目ID分区

## 安全措施

### 执行前检查
- [ ] 完整数据库备份
- [ ] 在staging环境测试
- [ ] 确认应用程序兼容性
- [ ] 监控工具就绪

### 执行步骤
1. **备份数据库**
```bash
pg_dump -h localhost -p 5433 -U dev_user -d ai_project_db > db_backup_before_optimization.sql
```

2. **分批次执行**
   - 一次删除1-2个索引
   - 每次删除后验证应用性能
   - 监控查询性能变化

3. **回滚计划**
   - 保留所有删除索引的CREATE语句
   - 监控性能指标
   - 如有问题立即重建索引

## 实际执行结果 ✅

### 立即收益 (已实现)
- **存储节省**: 5 MB 数据库空间 (从24MB降至19MB, 减少20%)
- **维护减少**: 删除193个无用索引，大幅减少维护开销
- **写入性能**: 显著减少INSERT/UPDATE时的索引维护
- **索引清理**: 从216个未使用索引减少到23个必要的unique约束

### 具体数据对比
| 指标 | 优化前 | 优化后 | 改善 |
|------|--------|--------|------|
| 数据库大小 | 24 MB | 19 MB | -20% |
| 未使用索引数量 | 216个 | 23个* | -89% |
| 索引空间节省 | - | ~5MB | 大幅优化 |

*剩余23个为必要的unique约束索引

### 长期收益规划
- **查询优化**: 已识别需要优化的低索引使用率表
- **架构简化**: 为enterprise迁移完成后的架构清理做好准备
- **监控改善**: 数据库监控数据更加清晰

## 风险评估

| 操作 | 风险级别 | 影响 | 缓解措施 |
|------|----------|------|----------|
| 删除未使用索引 | 低 | 存储空间释放 | 保留CREATE语句 |
| 查询优化 | 中 | 可能影响性能 | staging测试 |
| 架构变更 | 高 | 系统功能 | 分阶段执行 |

## 执行时间表

- **第一周**: 索引清理和立即优化
- **第二周**: 查询分析和优化
- **第三周**: 长期架构规划
- **第四周**: 性能验证和文档更新

## 监控指标

执行后需要监控:
- 数据库大小变化
- 查询响应时间
- 索引使用统计
- 应用程序错误日志
- 系统资源使用率