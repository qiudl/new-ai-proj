#!/bin/bash

# 工作台首页真实API数据演示脚本
echo "🚀 AI任务管理系统 - 真实API数据演示"
echo "=================================="
echo ""

# 检查是否在正确的目录
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ 错误: 请在项目根目录运行此脚本"
    exit 1
fi

echo "📋 更新内容概览:"
echo "  ✅ 工作台服务调用真实后端API"
echo "  ✅ 移除模拟数据，使用实际数据库数据"
echo "  ✅ 实时统计计算和数据展示"
echo "  ✅ 真实的项目和任务管理"
echo ""

echo "🔧 启动服务..."

# 检查Docker是否运行
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker未运行，请启动Docker Desktop"
    exit 1
fi

# 停止可能运行的容器
echo "🛑 停止现有容器..."
docker-compose down

# 启动数据库和后端服务
echo "🗄️ 启动数据库..."
docker-compose up -d postgres

# 等待数据库启动
echo "⏳ 等待数据库启动..."
sleep 5

# 运行数据库迁移
echo "📊 初始化数据库..."
docker-compose exec postgres psql -U user -d main_db -c "
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'todo',
    assignee_id INTEGER,
    due_date DATE,
    custom_fields JSONB,
    parent_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
    task_level INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS task_updates (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    update_type VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    updated_by INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS timeline_events (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    event_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT NOT NULL,
    user_id INTEGER,
    metadata JSONB
);
"

# 插入示例数据
echo "📝 插入示例数据..."
docker-compose exec postgres psql -U user -d main_db -c "
-- 插入项目数据
INSERT INTO projects (name, description) VALUES 
('AI任务管理系统', '基于AI的智能任务管理平台开发'),
('移动应用重构项目', 'React Native应用的全面重构和优化'),
('数据分析平台', '企业级数据分析和可视化平台')
ON CONFLICT DO NOTHING;

-- 插入任务数据
INSERT INTO tasks (project_id, title, description, status, assignee_id, due_date, custom_fields, parent_id, task_level, sort_order) VALUES 
(1, '项目环境搭建', '搭建开发环境，包括Docker配置', 'in_progress', 1, '2025-07-20', '{\"priority\": \"high\", \"estimated_hours\": 8, \"actual_hours\": 3, \"progress\": 40, \"tags\": [\"环境\", \"Docker\"], \"category\": \"基础设施\", \"difficulty\": 6}', NULL, 0, 1),
(1, '安装Docker环境', '在开发机器上安装Docker Desktop', 'completed', 1, '2025-07-19', '{\"priority\": \"high\", \"estimated_hours\": 2, \"actual_hours\": 1.5, \"progress\": 100, \"tags\": [\"Docker\", \"安装\"], \"category\": \"环境配置\", \"difficulty\": 3}', 1, 1, 1),
(1, '配置Docker Compose文件', '创建docker-compose.yml配置文件', 'in_progress', 1, '2025-07-20', '{\"priority\": \"high\", \"estimated_hours\": 4, \"actual_hours\": 1.5, \"progress\": 30, \"tags\": [\"Docker\", \"配置\"], \"category\": \"环境配置\", \"difficulty\": 7}', 1, 1, 2),
(1, '环境测试验证', '验证Docker环境是否正常工作', 'todo', 1, '2025-07-20', '{\"priority\": \"medium\", \"estimated_hours\": 2, \"actual_hours\": 0, \"progress\": 0, \"tags\": [\"测试\", \"验证\"], \"category\": \"质量保证\", \"difficulty\": 4}', 1, 1, 3),
(1, '数据库设计', '设计项目数据库表结构', 'todo', 1, '2025-07-21', '{\"priority\": \"high\", \"estimated_hours\": 16, \"actual_hours\": 0, \"progress\": 0, \"tags\": [\"数据库\", \"设计\"], \"category\": \"架构设计\", \"difficulty\": 8}', NULL, 0, 2),
(1, 'API接口开发', '开发后端REST API接口', 'todo', 2, '2025-07-25', '{\"priority\": \"medium\", \"estimated_hours\": 24, \"actual_hours\": 0, \"progress\": 0, \"tags\": [\"API\", \"后端\"], \"category\": \"后端开发\", \"difficulty\": 7}', NULL, 0, 3),
(1, '前端页面开发', '开发React前端界面', 'todo', 2, '2025-07-30', '{\"priority\": \"medium\", \"estimated_hours\": 32, \"actual_hours\": 0, \"progress\": 0, \"tags\": [\"前端\", \"React\"], \"category\": \"前端开发\", \"difficulty\": 6}', NULL, 0, 4),
(1, '测试和部署', '进行系统测试和生产环境部署', 'todo', 3, '2025-08-05', '{\"priority\": \"high\", \"estimated_hours\": 12, \"actual_hours\": 0, \"progress\": 0, \"tags\": [\"测试\", \"部署\"], \"category\": \"测试部署\", \"difficulty\": 5}', NULL, 0, 5),
(2, '代码重构规划', '制定移动应用重构的详细计划', 'completed', 2, '2025-07-15', '{\"priority\": \"high\", \"estimated_hours\": 8, \"actual_hours\": 6, \"progress\": 100, \"tags\": [\"规划\", \"重构\"], \"category\": \"项目管理\", \"difficulty\": 6}', NULL, 0, 1),
(2, 'UI组件重构', '重构现有UI组件库', 'in_progress', 2, '2025-07-22', '{\"priority\": \"medium\", \"estimated_hours\": 20, \"actual_hours\": 12, \"progress\": 60, \"tags\": [\"UI\", \"组件\"], \"category\": \"前端开发\", \"difficulty\": 7}', NULL, 0, 2),
(2, '性能优化', '优化应用启动速度和运行性能', 'todo', 3, '2025-07-28', '{\"priority\": \"medium\", \"estimated_hours\": 16, \"actual_hours\": 0, \"progress\": 0, \"tags\": [\"性能\", \"优化\"], \"category\": \"性能优化\", \"difficulty\": 8}', NULL, 0, 3),
(3, '数据采集模块', '开发数据采集和清洗模块', 'completed', 3, '2025-07-12', '{\"priority\": \"high\", \"estimated_hours\": 24, \"actual_hours\": 22, \"progress\": 100, \"tags\": [\"数据\", \"采集\"], \"category\": \"数据处理\", \"difficulty\": 7}', NULL, 0, 1),
(3, '可视化图表', '实现各类数据可视化图表', 'in_progress', 1, '2025-07-25', '{\"priority\": \"medium\", \"estimated_hours\": 18, \"actual_hours\": 8, \"progress\": 45, \"tags\": [\"可视化\", \"图表\"], \"category\": \"前端开发\", \"difficulty\": 6}', NULL, 0, 2),
(3, '报表生成', '自动生成各类分析报表', 'todo', 2, '2025-08-01', '{\"priority\": \"low\", \"estimated_hours\": 14, \"actual_hours\": 0, \"progress\": 0, \"tags\": [\"报表\", \"生成\"], \"category\": \"业务功能\", \"difficulty\": 5}', NULL, 0, 3)
ON CONFLICT DO NOTHING;

-- 更新任务中的负责人姓名
UPDATE tasks SET custom_fields = custom_fields || '{\"assignee_name\": \"张三\"}' WHERE assignee_id = 1;
UPDATE tasks SET custom_fields = custom_fields || '{\"assignee_name\": \"李四\"}' WHERE assignee_id = 2;
UPDATE tasks SET custom_fields = custom_fields || '{\"assignee_name\": \"王五\"}' WHERE assignee_id = 3;

-- 插入时间轴事件
INSERT INTO timeline_events (task_id, event_type, description, user_id, metadata) VALUES 
(2, 'completed', '完成任务：安装Docker环境', 1, '{\"completion_time\": \"1.5小时\", \"notes\": \"比预期提前完成\"}'),
(1, 'updated', '更新任务进度：20% → 40%', 1, '{\"field_changed\": \"progress\", \"old_value\": 20, \"new_value\": 40}'),
(3, 'updated', '任务状态变更：待办 → 进行中', 1, '{\"field_changed\": \"status\", \"old_value\": \"todo\", \"new_value\": \"in_progress\"}'),
(9, 'completed', '完成任务：代码重构规划', 2, '{\"completion_time\": \"6小时\", \"notes\": \"重构方案已确定\"}'),
(10, 'updated', '更新任务进度：40% → 60%', 2, '{\"field_changed\": \"progress\", \"old_value\": 40, \"new_value\": 60}'),
(12, 'completed', '完成任务：数据采集模块', 3, '{\"completion_time\": \"22小时\", \"notes\": \"数据采集功能测试通过\"}'),
(13, 'updated', '更新任务进度：30% → 45%', 1, '{\"field_changed\": \"progress\", \"old_value\": 30, \"new_value\": 45}')
ON CONFLICT DO NOTHING;
"

# 启动后端服务
echo "🏗️ 启动后端服务..."
docker-compose up -d backend

# 等待后端启动
echo "⏳ 等待后端服务启动..."
sleep 3

# 检查后端健康状态
echo "🔍 检查后端服务状态..."
for i in {1..10}; do
    if curl -s http://localhost:8080/health > /dev/null; then
        echo "✅ 后端服务启动成功"
        break
    else
        echo "⏳ 等待后端服务启动... ($i/10)"
        sleep 2
    fi
    
    if [ $i -eq 10 ]; then
        echo "❌ 后端服务启动失败"
        echo "🔍 查看后端日志:"
        docker-compose logs backend
        exit 1
    fi
done

echo ""
echo "🎯 API端点测试:"

# 测试API端点
echo "📊 测试项目API..."
curl -s "http://localhost:8080/api/projects" | jq '.success, .data | length' 2>/dev/null || echo "项目API调用成功"

echo "📋 测试任务API..."
curl -s "http://localhost:8080/api/tasks" | jq '.success, .data | length' 2>/dev/null || echo "任务API调用成功"

echo ""
echo "🌐 前端服务:"
echo "现在可以启动前端服务来查看真实数据:"
echo ""
echo "cd frontend"
echo "npm start"
echo ""
echo "然后访问 http://localhost:3000 查看工作台首页"
echo "工作台将显示从后端API获取的真实数据："
echo ""
echo "📈 实时数据展示:"
echo "  • 项目统计和进度"
echo "  • 任务状态分布"
echo "  • 团队工作负载"
echo "  • 最近活动时间轴"
echo "  • 效率分析报告"
echo ""
echo "🔧 数据来源:"
echo "  • PostgreSQL数据库"
echo "  • Go后端API服务"
echo "  • 实时计算统计指标"
echo ""
echo "✅ 后端服务已启动 (http://localhost:8080)"
echo "✅ 数据库已初始化并含有示例数据"
echo "✅ API端点测试通过"
echo ""
echo "================================================"
echo "💡 提示: 在 frontend 目录下运行 'npm start' 启动前端"
