-- Migration: 20251006_02_extend_prompt_system.sql
-- Description: 扩展Prompt管理系统，添加prompt_type字段支持文档和描述生成
-- Task: #2886 Phase 1.3: 扩展Prompt管理系统（数据库+代码）
-- Created: 2025-10-06

BEGIN;

-- ========== 1. 扩展 prompt_templates 表 ==========

-- 添加 prompt_type 字段
ALTER TABLE prompt_templates
ADD COLUMN IF NOT EXISTS prompt_type VARCHAR(50) NOT NULL DEFAULT 'subtask';

COMMENT ON COLUMN prompt_templates.prompt_type IS
    '提示词类型: subtask(子任务生成), document(文档生成), description(描述生成)';

-- 添加索引优化查询
CREATE INDEX IF NOT EXISTS idx_prompt_templates_type
    ON prompt_templates(prompt_type);

CREATE INDEX IF NOT EXISTS idx_prompt_templates_type_category
    ON prompt_templates(prompt_type, category);


-- ========== 2. 扩展 user_prompt_history 表 ==========

-- 添加 prompt_type 字段
ALTER TABLE user_prompt_history
ADD COLUMN IF NOT EXISTS prompt_type VARCHAR(50) NOT NULL DEFAULT 'subtask';

-- 添加 document_type 字段（仅用于document类型）
ALTER TABLE user_prompt_history
ADD COLUMN IF NOT EXISTS document_type VARCHAR(50);

COMMENT ON COLUMN user_prompt_history.prompt_type IS
    '提示词类型: subtask, document, description';

COMMENT ON COLUMN user_prompt_history.document_type IS
    '文档类型（仅prompt_type=document时使用）: design, requirements, test_plan, api_doc等';

-- 添加索引优化查询
CREATE INDEX IF NOT EXISTS idx_prompt_history_type
    ON user_prompt_history(prompt_type);

CREATE INDEX IF NOT EXISTS idx_prompt_history_user_type
    ON user_prompt_history(user_id, prompt_type);


-- ========== 3. 插入文档生成系统模板 ==========

INSERT INTO prompt_templates (name, description, content, category, prompt_type, tags, recommended_models, is_system, is_active) VALUES
('技术设计文档', '生成详细的技术设计文档，包括架构、接口、数据模型等',
'请为以下任务生成详细的技术设计文档，包括：

1. **系统架构设计**
   - 整体架构图
   - 模块划分
   - 技术栈选型

2. **数据模型设计**
   - 核心实体
   - ER图
   - 表结构

3. **API设计**
   - RESTful接口规范
   - 请求/响应格式
   - 错误处理

4. **安全设计**
   - 认证授权
   - 数据加密
   - 防护措施

任务信息：{{.TaskTitle}}
{{if .ParentTask}}父任务：{{.ParentTask.Title}}{{end}}
{{if .Tags}}标签：{{join .Tags ", "}}{{end}}

请生成Markdown格式的技术设计文档。',
'design', 'document', ARRAY['设计', '技术', '架构'], ARRAY['openai', 'claude', 'deepseek'], true, true),

('需求规格说明书', '生成需求规格说明书，包括功能需求、非功能需求、验收标准',
'请为以下任务生成需求规格说明书，包括：

1. **需求概述**
   - 背景和目标
   - 用户故事
   - 核心价值

2. **功能需求**
   - 详细功能列表
   - 用例描述
   - 交互流程

3. **非功能需求**
   - 性能要求
   - 安全要求
   - 可用性要求

4. **验收标准**
   - 测试场景
   - 预期结果
   - 成功指标

任务信息：{{.TaskTitle}}
{{if .Description}}任务描述：{{.Description}}{{end}}

请生成Markdown格式的需求文档。',
'requirements', 'document', ARRAY['需求', '规格', '文档'], ARRAY['claude', 'openai'], true, true),

('测试计划文档', '生成测试计划文档，包括测试策略、用例、覆盖率要求',
'请为以下任务生成测试计划文档，包括：

1. **测试策略**
   - 测试类型（单元/集成/E2E）
   - 测试环境
   - 测试工具

2. **测试用例**
   - 功能测试用例
   - 边界条件测试
   - 异常场景测试

3. **覆盖率要求**
   - 代码覆盖率目标
   - 功能覆盖范围
   - 验收标准

4. **测试进度**
   - 测试里程碑
   - 缺陷管理
   - 测试报告

任务信息：{{.TaskTitle}}

请生成Markdown格式的测试计划。',
'test_plan', 'document', ARRAY['测试', '质量', 'QA'], ARRAY['openai', 'claude'], true, true),

('API文档', '生成API接口文档，包括端点、参数、响应格式、示例',
'请为以下任务生成API文档，包括：

1. **接口概览**
   - 基础URL
   - 认证方式
   - 通用响应格式

2. **接口列表**
   对每个接口详细描述：
   - HTTP方法和路径
   - 请求参数
   - 响应格式
   - 状态码
   - 示例代码

3. **错误处理**
   - 错误码说明
   - 错误响应格式

4. **变更日志**
   - 版本历史
   - 兼容性说明

任务信息：{{.TaskTitle}}

请生成Markdown格式的API文档。',
'api_doc', 'document', ARRAY['API', '接口', '文档'], ARRAY['openai', 'claude', 'deepseek'], true, true);


-- ========== 4. 插入描述生成系统模板 ==========

INSERT INTO prompt_templates (name, description, content, category, prompt_type, tags, recommended_models, is_system, is_active) VALUES
('简洁风格描述', '生成简洁明了的任务描述（50-150字）',
'请为以下任务生成简洁的描述（50-150字）：

任务标题：{{.TaskTitle}}
{{if .ParentTask}}父任务：{{.ParentTask.Title}}{{end}}
{{if .Tags}}标签：{{join .Tags ", "}}{{end}}

要求：
1. 描述要点明确、语言简洁
2. 包含核心目标和范围
3. 50-150字之间
4. 适合快速阅读

请生成简洁描述。',
'brief', 'description', ARRAY['简洁', '描述'], ARRAY['openai', 'claude', 'deepseek'], true, true),

('详细风格描述', '生成详细的任务描述，包括背景、目标、验收标准（200-500字）',
'请为以下任务生成详细的描述（200-500字）：

任务标题：{{.TaskTitle}}
{{if .ParentTask}}父任务：{{.ParentTask.Title}} - {{.ParentTask.Description}}{{end}}
{{if .Children}}子任务：{{range .Children}}- {{.Title}}{{end}}{{end}}
{{if .Tags}}标签：{{join .Tags ", "}}{{end}}
{{if .ProjectInfo}}项目背景：{{.ProjectInfo}}{{end}}

要求：
1. 包含：背景、目标、实现要点、验收标准
2. 支持Markdown格式
3. 200-500字
4. 结构清晰、层次分明

请生成详细描述。',
'detailed', 'description', ARRAY['详细', '描述', '完整'], ARRAY['claude', 'openai'], true, true),

('技术风格描述', '生成技术导向的任务描述，包括技术栈、实现要点（150-300字）',
'请为以下任务生成技术描述（150-300字）：

任务标题：{{.TaskTitle}}
{{if .ParentTask}}父任务：{{.ParentTask.Title}}{{end}}
{{if .Tags}}技术标签：{{join .Tags ", "}}{{end}}

要求：
1. 重点说明技术实现方案
2. 包含：技术栈、关键技术点、实现难点
3. 150-300字
4. 适合技术人员阅读

请生成技术描述。',
'technical', 'description', ARRAY['技术', '实现', '开发'], ARRAY['openai', 'claude', 'deepseek'], true, true);


-- ========== 5. 验证迁移 ==========

-- 验证字段
DO $$
BEGIN
    -- 检查 prompt_templates.prompt_type
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'prompt_templates' AND column_name = 'prompt_type'
    ) THEN
        RAISE EXCEPTION 'prompt_templates.prompt_type字段创建失败';
    END IF;

    -- 检查 user_prompt_history.prompt_type
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_prompt_history' AND column_name = 'prompt_type'
    ) THEN
        RAISE EXCEPTION 'user_prompt_history.prompt_type字段创建失败';
    END IF;

    -- 检查 user_prompt_history.document_type
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_prompt_history' AND column_name = 'document_type'
    ) THEN
        RAISE EXCEPTION 'user_prompt_history.document_type字段创建失败';
    END IF;

    RAISE NOTICE '✅ 所有字段创建成功';
END $$;

-- 验证索引
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'prompt_templates' AND indexname = 'idx_prompt_templates_type'
    ) THEN
        RAISE EXCEPTION 'idx_prompt_templates_type索引创建失败';
    END IF;

    RAISE NOTICE '✅ 所有索引创建成功';
END $$;

-- 验证模板数据
DO $$
DECLARE
    doc_count INT;
    desc_count INT;
BEGIN
    SELECT COUNT(*) INTO doc_count FROM prompt_templates WHERE prompt_type = 'document';
    SELECT COUNT(*) INTO desc_count FROM prompt_templates WHERE prompt_type = 'description';

    IF doc_count < 4 THEN
        RAISE EXCEPTION '文档模板插入数量不足: %', doc_count;
    END IF;

    IF desc_count < 3 THEN
        RAISE EXCEPTION '描述模板插入数量不足: %', desc_count;
    END IF;

    RAISE NOTICE '✅ 模板数据插入成功: document=%, description=%', doc_count, desc_count;
END $$;

COMMIT;

-- 查看插入的新模板
SELECT
    id, name, category, prompt_type, is_system, is_active
FROM prompt_templates
WHERE prompt_type IN ('document', 'description')
ORDER BY prompt_type, category;
