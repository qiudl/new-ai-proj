---
task_id: 594
title: "谷歌日历集成数据库字段扩展和迁移"
status: "todo"
created_date: "2025-08-05 15:51:07"
updated_date: "2025-08-05 15:51:07"
---

# 谷歌日历集成数据库字段扩展和迁移

## 任务描述
为支持谷歌日历集成功能，扩展任务表和用户表的字段结构：

## 任务表(tasks)字段扩展：

### 日历同步相关字段：
- google_calendar_enabled (boolean): 是否启用谷歌日历同步，默认false
- google_event_id (varchar(255)): 对应的谷歌日历事件ID
- calendar_sync_status (enum): 同步状态 ['pending', 'synced', 'failed', 'disabled']
- last_calendar_sync (timestamp): 最后同步时间
- calendar_event_url (text): 日历事件的直接链接
- sync_direction (enum): 同步方向 ['task_to_calendar', 'calendar_to_task', 'bidirectional']

### 日历事件属性字段：
- calendar_reminder_minutes (integer): 日历提醒时间(分钟)，默认15
- calendar_location (varchar(500)): 事件地点
- calendar_description (text): 日历事件描述(可能与任务描述不同)
- all_day_event (boolean): 是否为全天事件，默认false

### 冲突处理字段：
- conflict_resolution_strategy (enum): 冲突解决策略 ['ask_user', 'task_priority', 'calendar_priority', 'manual']
- last_modified_source (enum): 最后修改来源 ['task', 'calendar', 'system']
- conflict_history (json): 冲突处理历史记录

## 用户表(users)字段扩展：

### 谷歌集成认证：
- google_access_token (encrypted text): 谷歌访问令牌(加密存储)
- google_refresh_token (encrypted text): 谷歌刷新令牌(加密存储)
- google_token_expires_at (timestamp): 令牌过期时间

### 用户偏好设置：
- default_calendar_id (varchar(255)): 默认日历ID
- sync_frequency (enum): 同步频率 ['realtime', 'hourly', 'daily', 'manual']
- sync_completed_tasks (boolean): 是否同步已完成任务，默认true
- auto_create_events (boolean): 是否自动创建日历事件，默认true

### 隐私和安全：
- privacy_level (enum): 隐私级别 ['public', 'private', 'restricted']
- share_calendar_data (boolean): 是否允许共享日历数据，默认false
- consent_timestamp (timestamp): 用户授权时间戳
- data_encryption_key (encrypted): 个人数据加密密钥

## 新增数据表：

### 日历同步日志表(calendar_sync_logs)：
- id (primary key)
- user_id (foreign key)
- task_id (foreign key)
- google_event_id (varchar)
- sync_action (enum): ['create', 'update', 'delete', 'conflict']
- sync_direction (enum): ['task_to_calendar', 'calendar_to_task']
- sync_status (enum): ['success', 'failed', 'partial']
- error_message (text): 错误信息
- sync_timestamp (timestamp): 同步时间
- response_data (json): API响应数据

### 数据冲突记录表(calendar_conflicts)：
- id (primary key)
- user_id (foreign key)
- task_id (foreign key)
- conflict_type (enum): ['time_overlap', 'data_mismatch', 'deletion_conflict']
- task_data (json): 任务数据快照
- calendar_data (json): 日历数据快照
- resolution_action (enum): ['manual', 'auto_task', 'auto_calendar', 'ignore']
- resolved_at (timestamp): 解决时间
- created_at (timestamp)

## 技术实现要点：
1. 使用数据库迁移脚本安全添加字段
2. 为新字段设置合适的默认值和索引
3. 加密敏感字段(令牌等)
4. 创建数据验证和约束
5. 备份现有数据确保安全

## 测试验证：
- 字段添加后的数据完整性测试
- 新字段的CRUD操作测试
- 数据加密和解密功能测试
- 迁移脚本的回滚测试

## 详细内容
请在这里添加任务的详细内容...

---
*最后更新: 2025-08-05 15:51:07*