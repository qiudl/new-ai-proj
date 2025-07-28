-- 006_smart_template_system.sql
-- Phase 3: 智能模板系统
-- 为任务文档提供智能模板推荐和生成功能

-- ========================================
-- 1. 任务文档模板表
-- ========================================

-- 任务文档模板主表
CREATE TABLE IF NOT EXISTS task_document_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL DEFAULT 'task', -- task, project, custom, ai_generated
    category VARCHAR(100), -- 功能分类：需求分析、技术设计、测试用例等
    content TEXT NOT NULL, -- 模板内容（支持变量占位符）
    variables JSONB DEFAULT '[]'::jsonb, -- 模板变量定义
    conditions JSONB DEFAULT '[]'::jsonb, -- 应用条件
    metadata JSONB DEFAULT '{}'::jsonb, -- 模板元数据
    usage_count INTEGER DEFAULT 0, -- 使用次数
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    is_system BOOLEAN DEFAULT false, -- 是否为系统模板
    
    CONSTRAINT check_template_type CHECK (type IN ('task', 'project', 'custom', 'ai_generated')),
    CONSTRAINT check_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
    CONSTRAINT check_content_not_empty CHECK (LENGTH(TRIM(content)) > 0)
);

-- 模板使用历史表
CREATE TABLE IF NOT EXISTS template_usage_history (
    id SERIAL PRIMARY KEY,
    template_id INTEGER NOT NULL REFERENCES task_document_templates(id) ON DELETE CASCADE,
    document_id INTEGER REFERENCES documents(id) ON DELETE SET NULL,
    task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    user_id INTEGER NOT NULL REFERENCES users(id),
    variables_used JSONB DEFAULT '{}'::jsonb, -- 实际使用的变量值
    generation_context JSONB DEFAULT '{}'::jsonb, -- 生成上下文
    satisfaction_rating INTEGER, -- 用户满意度评分 1-5
    feedback TEXT, -- 用户反馈
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT check_satisfaction_rating CHECK (satisfaction_rating IS NULL OR (satisfaction_rating >= 1 AND satisfaction_rating <= 5))
);

-- 模板分类表
CREATE TABLE IF NOT EXISTS template_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    parent_category_id INTEGER REFERENCES template_categories(id),
    icon VARCHAR(50),
    color VARCHAR(7), -- 十六进制颜色代码
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 模板标签表
CREATE TABLE IF NOT EXISTS template_tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    color VARCHAR(7),
    description TEXT,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 模板标签关联表
CREATE TABLE IF NOT EXISTS template_tag_relations (
    template_id INTEGER NOT NULL REFERENCES task_document_templates(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES template_tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (template_id, tag_id)
);

-- ========================================
-- 2. 智能推荐相关表
-- ========================================

-- 模板推荐日志表
CREATE TABLE IF NOT EXISTS template_recommendations (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    recommended_templates JSONB NOT NULL, -- 推荐的模板列表及分数
    selected_template_id INTEGER REFERENCES task_document_templates(id) ON DELETE SET NULL,
    recommendation_context JSONB DEFAULT '{}'::jsonb, -- 推荐上下文
    recommended_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    selected_at TIMESTAMP,
    
    CONSTRAINT valid_recommended_templates CHECK (jsonb_typeof(recommended_templates) = 'array')
);

-- 用户模板偏好表
CREATE TABLE IF NOT EXISTS user_template_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_id INTEGER NOT NULL REFERENCES task_document_templates(id) ON DELETE CASCADE,
    preference_score DECIMAL(3,2) DEFAULT 1.0, -- 偏好分数 0-1
    last_used_at TIMESTAMP,
    usage_frequency INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, template_id),
    CONSTRAINT check_preference_score CHECK (preference_score >= 0 AND preference_score <= 1)
);

-- ========================================
-- 3. 协作增强表
-- ========================================

-- 文档评论表
CREATE TABLE IF NOT EXISTS document_comments (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    parent_comment_id INTEGER REFERENCES document_comments(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    comment_type VARCHAR(20) DEFAULT 'general', -- general, suggestion, approval, question
    position_info JSONB, -- 评论位置信息（行号、段落等）
    is_resolved BOOLEAN DEFAULT false,
    resolved_by INTEGER REFERENCES users(id),
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    CONSTRAINT check_comment_type CHECK (comment_type IN ('general', 'suggestion', 'approval', 'question')),
    CONSTRAINT check_content_not_empty CHECK (LENGTH(TRIM(content)) > 0)
);

-- 文档协作者表
CREATE TABLE IF NOT EXISTS document_collaborators (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission_level VARCHAR(20) NOT NULL DEFAULT 'read', -- read, comment, edit, admin
    granted_by INTEGER NOT NULL REFERENCES users(id),
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    last_accessed_at TIMESTAMP,
    
    UNIQUE(document_id, user_id),
    CONSTRAINT check_permission_level CHECK (permission_level IN ('read', 'comment', 'edit', 'admin'))
);

-- 文档变更历史表
CREATE TABLE IF NOT EXISTS document_change_history (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    change_type VARCHAR(20) NOT NULL, -- create, update, delete, restore
    field_name VARCHAR(100), -- 具体变更字段
    old_value TEXT,
    new_value TEXT,
    change_summary TEXT, -- 变更摘要
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT check_change_type CHECK (change_type IN ('create', 'update', 'delete', 'restore'))
);

-- ========================================
-- 4. 索引创建
-- ========================================

-- 模板相关索引
CREATE INDEX IF NOT EXISTS idx_templates_type_active ON task_document_templates(type, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_templates_category ON task_document_templates(category) WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_templates_usage_count ON task_document_templates(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_templates_created_by ON task_document_templates(created_by);

-- 使用历史索引
CREATE INDEX IF NOT EXISTS idx_usage_history_template ON template_usage_history(template_id, used_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_history_user ON template_usage_history(user_id, used_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_history_task ON template_usage_history(task_id) WHERE task_id IS NOT NULL;

-- 推荐日志索引
CREATE INDEX IF NOT EXISTS idx_recommendations_task ON template_recommendations(task_id, recommended_at DESC);
CREATE INDEX IF NOT EXISTS idx_recommendations_user ON template_recommendations(user_id, recommended_at DESC);

-- 用户偏好索引
CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON user_template_preferences(user_id, preference_score DESC);
CREATE INDEX IF NOT EXISTS idx_user_preferences_template ON user_template_preferences(template_id, preference_score DESC);

-- 评论相关索引
CREATE INDEX IF NOT EXISTS idx_comments_document ON document_comments(document_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_comments_user ON document_comments(user_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_comments_parent ON document_comments(parent_comment_id) WHERE parent_comment_id IS NOT NULL AND deleted_at IS NULL;

-- 协作者索引
CREATE INDEX IF NOT EXISTS idx_collaborators_document ON document_collaborators(document_id, permission_level);
CREATE INDEX IF NOT EXISTS idx_collaborators_user ON document_collaborators(user_id, granted_at DESC);

-- 变更历史索引
CREATE INDEX IF NOT EXISTS idx_change_history_document ON document_change_history(document_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_change_history_user ON document_change_history(user_id, created_at DESC);

-- ========================================
-- 5. 默认数据插入
-- ========================================

-- 插入默认模板分类
INSERT INTO template_categories (name, description, icon, color, sort_order) VALUES
('需求分析', '需求分析和用户故事相关模板', 'FileSearchOutlined', '#1890ff', 1),
('技术设计', '技术方案和架构设计模板', 'DesktopOutlined', '#722ed1', 2),
('开发任务', '开发实现和编码任务模板', 'CodeOutlined', '#13c2c2', 3),
('测试验证', '测试用例和验证相关模板', 'BugOutlined', '#52c41a', 4),
('文档写作', '文档编写和说明类模板', 'EditOutlined', '#faad14', 5),
('项目管理', '项目管理和协调类模板', 'ProjectOutlined', '#f5222d', 6)
ON CONFLICT (name) DO NOTHING;

-- 插入默认标签
INSERT INTO template_tags (name, color, description) VALUES
('前端', '#1890ff', '前端开发相关'),
('后端', '#722ed1', '后端开发相关'),
('数据库', '#13c2c2', '数据库相关'),
('API', '#52c41a', 'API设计和开发'),
('UI/UX', '#faad14', '用户界面和体验'),
('测试', '#f5222d', '测试相关'),
('部署', '#fa8c16', '部署和运维'),
('文档', '#eb2f96', '文档编写')
ON CONFLICT (name) DO NOTHING;

-- 插入系统默认模板
INSERT INTO task_document_templates (name, description, type, category, content, variables, conditions, created_by, is_system) VALUES
('需求分析模板', '标准的需求分析文档模板', 'task', '需求分析', 
'# {{task_title}} - 需求分析

## 需求概述
{{task_description}}

## 功能需求
### 核心功能
- [ ] 功能点1
- [ ] 功能点2
- [ ] 功能点3

### 辅助功能
- [ ] 辅助功能1
- [ ] 辅助功能2

## 非功能需求
### 性能要求
- 响应时间: < 2秒
- 并发用户: 100+

### 安全要求
- 用户认证
- 数据加密

## 用户故事
作为 {{user_role}}，我希望 {{user_goal}}，以便 {{user_benefit}}。

## 验收标准
- [ ] 标准1
- [ ] 标准2
- [ ] 标准3

## 相关资源
- 原型设计: 
- 接口文档: 
- 数据库设计: 

---
*创建时间: {{current_date}}*
*负责人: {{assignee_name}}*',
'[{"name":"task_title","type":"string","required":true,"description":"任务标题"},
  {"name":"task_description","type":"string","required":false,"description":"任务描述"},
  {"name":"user_role","type":"string","required":false,"default_value":"用户","description":"用户角色"},
  {"name":"user_goal","type":"string","required":false,"description":"用户目标"},
  {"name":"user_benefit","type":"string","required":false,"description":"用户收益"},
  {"name":"current_date","type":"date","required":true,"description":"当前日期"},
  {"name":"assignee_name","type":"string","required":false,"description":"分配人姓名"}]'::jsonb,
'[{"field":"task.status","operator":"in","value":["todo","in_progress"],"weight":0.8},
  {"field":"task.title","operator":"contains","value":"需求","weight":0.6}]'::jsonb,
1, true),

('技术方案模板', '技术实现方案文档模板', 'task', '技术设计',
'# {{task_title}} - 技术方案

## 方案概述
简要描述技术实现方案的核心思路。

## 技术选型
### 框架选择
- 前端框架: 
- 后端框架: 
- 数据库: 

### 技术栈说明
选择理由和技术优势分析。

## 系统架构
### 整体架构
```
[架构图描述]
```

### 模块划分
1. **模块A**: 功能描述
2. **模块B**: 功能描述
3. **模块C**: 功能描述

## 实现细节
### 核心逻辑
关键算法和业务逻辑实现。

### 数据流程
数据处理和流转过程。

## 接口设计
### API列表
| 接口 | 方法 | 描述 |
|------|------|------|
| /api/example | GET | 示例接口 |

## 数据库设计
### 表结构
关键表结构设计。

## 部署方案
### 环境要求
- 操作系统: 
- 运行环境: 
- 依赖服务: 

### 部署步骤
1. 环境准备
2. 代码部署
3. 配置修改
4. 服务启动

## 风险评估
### 技术风险
- 风险1: 影响和应对措施
- 风险2: 影响和应对措施

### 时间风险
预估开发时间和关键节点。

---
*创建时间: {{current_date}}*
*技术负责人: {{assignee_name}}*',
'[{"name":"task_title","type":"string","required":true,"description":"任务标题"},
  {"name":"current_date","type":"date","required":true,"description":"当前日期"},
  {"name":"assignee_name","type":"string","required":false,"description":"技术负责人"}]'::jsonb,
'[{"field":"task.title","operator":"contains","value":"技术","weight":0.7},
  {"field":"task.title","operator":"contains","value":"方案","weight":0.6},
  {"field":"task.title","operator":"contains","value":"设计","weight":0.5}]'::jsonb,
1, true),

('开发任务模板', '标准开发任务文档模板', 'task', '开发任务',
'# {{task_title}} - 开发任务

## 任务描述
{{task_description}}

## 开发内容
### 功能实现
- [ ] 功能模块1
- [ ] 功能模块2
- [ ] 功能模块3

### 技术要求
- 编程语言: 
- 框架版本: 
- 代码规范: 

## 实现计划
### 开发步骤
1. **环境搭建** (预计: 0.5天)
   - 开发环境配置
   - 依赖包安装

2. **核心功能开发** (预计: {{dev_days}}天)
   - 业务逻辑实现
   - 接口开发

3. **测试调试** (预计: 1天)
   - 单元测试
   - 集成测试

### 时间安排
- 开始时间: {{current_date}}
- 预计完成: 
- 实际完成: 

## 技术细节
### 关键实现
详细描述关键功能的实现思路。

### 代码结构
```
project/
├── src/
│   ├── components/
│   ├── services/
│   └── utils/
└── tests/
```

## 测试用例
### 功能测试
- [ ] 测试用例1
- [ ] 测试用例2
- [ ] 测试用例3

### 边界测试
- [ ] 异常情况处理
- [ ] 性能测试

## 完成标准
- [ ] 功能完整实现
- [ ] 代码审查通过
- [ ] 测试用例通过
- [ ] 文档更新完成

## 相关链接
- 需求文档: 
- 设计稿: 
- 代码仓库: 

---
*创建时间: {{current_date}}*
*开发者: {{assignee_name}}*
*状态: {{task_status}}*',
'[{"name":"task_title","type":"string","required":true,"description":"任务标题"},
  {"name":"task_description","type":"string","required":false,"description":"任务描述"},
  {"name":"dev_days","type":"number","required":false,"default_value":3,"description":"预计开发天数"},
  {"name":"current_date","type":"date","required":true,"description":"当前日期"},
  {"name":"assignee_name","type":"string","required":false,"description":"开发者姓名"},
  {"name":"task_status","type":"string","required":false,"description":"任务状态"}]'::jsonb,
'[{"field":"task.status","operator":"equals","value":"in_progress","weight":0.9},
  {"field":"task.title","operator":"contains","value":"开发","weight":0.7}]'::jsonb,
1, true);

-- ========================================
-- 6. 触发器和函数
-- ========================================

-- 更新模板使用次数的函数
CREATE OR REPLACE FUNCTION increment_template_usage()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE task_document_templates 
    SET usage_count = usage_count + 1, updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.template_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS trigger_increment_template_usage ON template_usage_history;
CREATE TRIGGER trigger_increment_template_usage
    AFTER INSERT ON template_usage_history
    FOR EACH ROW
    EXECUTE FUNCTION increment_template_usage();

-- 更新时间戳的通用函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为相关表创建更新时间戳触发器
DROP TRIGGER IF EXISTS trigger_update_template_updated_at ON task_document_templates;
CREATE TRIGGER trigger_update_template_updated_at
    BEFORE UPDATE ON task_document_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_preferences_updated_at ON user_template_preferences;
CREATE TRIGGER trigger_update_preferences_updated_at
    BEFORE UPDATE ON user_template_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_comments_updated_at ON document_comments;
CREATE TRIGGER trigger_update_comments_updated_at
    BEFORE UPDATE ON document_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 7. 权限设置
-- ========================================

-- 为应用用户授权
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- ========================================
-- 8. 视图创建
-- ========================================

-- 模板统计视图
CREATE OR REPLACE VIEW template_statistics AS
SELECT 
    t.id,
    t.name,
    t.type,
    t.category,
    t.usage_count,
    COUNT(h.id) as actual_usage,
    AVG(h.satisfaction_rating) as avg_rating,
    COUNT(DISTINCT h.user_id) as unique_users,
    t.created_at,
    t.is_active
FROM task_document_templates t
LEFT JOIN template_usage_history h ON t.id = h.template_id
GROUP BY t.id, t.name, t.type, t.category, t.usage_count, t.created_at, t.is_active;

-- 用户模板使用统计视图
CREATE OR REPLACE VIEW user_template_stats AS
SELECT 
    u.id as user_id,
    u.username,
    COUNT(h.id) as total_templates_used,
    COUNT(DISTINCT h.template_id) as unique_templates,
    AVG(h.satisfaction_rating) as avg_satisfaction,
    MAX(h.used_at) as last_template_use
FROM users u
LEFT JOIN template_usage_history h ON u.id = h.user_id
GROUP BY u.id, u.username;

-- 文档协作统计视图
CREATE OR REPLACE VIEW document_collaboration_stats AS
SELECT 
    d.id as document_id,
    d.title,
    COUNT(dc.id) as collaborator_count,
    COUNT(cm.id) as comment_count,
    COUNT(ch.id) as change_count,
    MAX(ch.created_at) as last_change
FROM documents d
LEFT JOIN document_collaborators dc ON d.id = dc.document_id
LEFT JOIN document_comments cm ON d.id = cm.document_id AND cm.deleted_at IS NULL
LEFT JOIN document_change_history ch ON d.id = ch.document_id
WHERE d.deleted_at IS NULL
GROUP BY d.id, d.title;

-- 插入完成标记
INSERT INTO migration_status (migration_name, status, details)
VALUES ('006_smart_template_system', 'completed', 
        '{"description": "Smart template system and collaboration features created successfully"}')
ON CONFLICT (migration_name) DO UPDATE SET 
    status = 'completed',
    completed_at = CURRENT_TIMESTAMP;