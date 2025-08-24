-- Create parent task 535
INSERT INTO tasks (id, project_id, title, description, status, parent_id, created_by, assigned_to)
VALUES (535, 1, '任务详情页新增进度条（预估时长 + 完成百分比算法）', 
        '在任务详情页添加进度条功能，支持预估时长和完成百分比计算', 
        'in_progress', NULL, 6, 6)
ON CONFLICT (id) DO NOTHING;

-- Create main task 537
INSERT INTO tasks (id, project_id, title, description, status, parent_id, created_by, assigned_to)
VALUES (537, 1, '前端：进度条组件与 UI/交互集成', 
        '创建进度条前端组件并集成到任务详情页', 
        'todo', 535, 6, 6)
ON CONFLICT (id) DO NOTHING;

-- Create child tasks for 537
INSERT INTO tasks (id, project_id, title, description, status, parent_id, created_by, assigned_to, sort_order) VALUES
(538, 1, '基础进度条组件实现', '创建可复用的进度条组件', 'todo', 537, 6, 6, 1),
(539, 1, '样式与主题适配', '适配系统主题样式', 'todo', 537, 6, 6, 2),
(540, 1, '数据集成', '与后端API集成', 'todo', 537, 6, 6, 3),
(541, 1, '交互功能实现', '添加拖拽调整等交互功能', 'todo', 537, 6, 6, 4),
(542, 1, '响应式布局', '支持不同屏幕尺寸', 'todo', 537, 6, 6, 5),
(543, 1, '单元测试', '编写组件测试', 'todo', 537, 6, 6, 6),
(544, 1, '性能优化', '优化渲染性能', 'todo', 537, 6, 6, 7)
ON CONFLICT (id) DO NOTHING;

-- Create task relationships (dependencies)
INSERT INTO task_relationships (from_task_id, to_task_id, relationship_type, metadata) VALUES
-- 样式依赖基础组件
(539, 538, 'depends_on', '{"description": "样式需要基础组件完成"}'),
-- 数据集成依赖基础组件
(540, 538, 'depends_on', '{"description": "数据集成需要基础组件"}'),
-- 交互功能依赖基础组件和数据集成
(541, 538, 'depends_on', '{"description": "交互功能需要基础组件"}'),
(541, 540, 'depends_on', '{"description": "交互功能需要数据集成"}'),
-- 响应式布局依赖样式
(542, 539, 'depends_on', '{"description": "响应式布局需要样式完成"}'),
-- 测试依赖所有功能完成
(543, 538, 'depends_on', '{"description": "测试需要基础组件"}'),
(543, 539, 'depends_on', '{"description": "测试需要样式"}'),
(543, 540, 'depends_on', '{"description": "测试需要数据集成"}'),
(543, 541, 'depends_on', '{"description": "测试需要交互功能"}'),
(543, 542, 'depends_on', '{"description": "测试需要响应式布局"}'),
-- 性能优化最后进行
(544, 543, 'depends_on', '{"description": "性能优化在测试之后"}')
ON CONFLICT (from_task_id, to_task_id, relationship_type) DO NOTHING;

-- Mark some as parallel development group
INSERT INTO task_relationships (from_task_id, to_task_id, relationship_type, metadata) VALUES
(539, 540, 'parallel_with', '{"group": "ui_data", "description": "样式和数据集成可并行开发"}'),
(540, 539, 'parallel_with', '{"group": "ui_data", "description": "数据集成和样式可并行开发"}')
ON CONFLICT (from_task_id, to_task_id, relationship_type) DO NOTHING;
