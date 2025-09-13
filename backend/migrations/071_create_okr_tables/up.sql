-- Migration: Create OKR (Objectives and Key Results) tables
-- Description: Creates tables for OKR management functionality

-- OKR目标表
CREATE TABLE okr_objectives (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    quarter VARCHAR(10) NOT NULL, -- '2024-Q4'
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    assignee_id INTEGER REFERENCES users(id),
    enterprise_id INTEGER REFERENCES enterprises(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- 关键结果表
CREATE TABLE okr_key_results (
    id SERIAL PRIMARY KEY,
    objective_id INTEGER REFERENCES okr_objectives(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(20) DEFAULT 'percentage' CHECK (type IN ('percentage', 'number', 'boolean')),
    target_value DECIMAL(10,2) NOT NULL,
    current_value DECIMAL(10,2) DEFAULT 0,
    unit VARCHAR(50),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    status VARCHAR(20) DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'at_risk')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- 索引优化
CREATE INDEX idx_okr_objectives_quarter ON okr_objectives(quarter, assignee_id, deleted_at);
CREATE INDEX idx_okr_objectives_status ON okr_objectives(status, deleted_at);
CREATE INDEX idx_okr_objectives_enterprise ON okr_objectives(enterprise_id, deleted_at);
CREATE INDEX idx_okr_key_results_objective ON okr_key_results(objective_id, deleted_at);

-- 自动更新 updated_at 触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_okr_objectives_updated_at 
    BEFORE UPDATE ON okr_objectives 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_okr_key_results_updated_at 
    BEFORE UPDATE ON okr_key_results 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 插入示例数据
INSERT INTO okr_objectives (title, description, quarter, status, progress, assignee_id, enterprise_id, start_date, end_date, created_by) VALUES
('提升产品用户体验', '通过优化界面设计和性能提升，显著改善用户使用体验', '2024-Q4', 'active', 65, 1, 1, '2024-10-01', '2024-12-31', 1),
('技术架构优化', '重构核心模块，提升系统性能和可维护性', '2024-Q4', 'active', 40, 1, 1, '2024-10-01', '2024-12-31', 1);

-- 插入关键结果示例数据
INSERT INTO okr_key_results (objective_id, title, description, type, target_value, current_value, unit, progress, status) VALUES
(1, '用户满意度达到4.5分', '通过用户调研和反馈收集，将整体满意度提升至4.5分', 'number', 4.5, 4.2, '分', 75, 'in_progress'),
(1, '页面加载时间<2秒', '优化前端性能，确保主要页面加载时间控制在2秒以内', 'number', 2.0, 2.3, '秒', 60, 'in_progress'),
(1, '用户留存率提升至65%', '通过产品优化提升用户粘性，月留存率达到65%', 'percentage', 65, 58, '%', 70, 'in_progress'),
(2, 'API响应时间<500ms', '优化后端API性能，平均响应时间控制在500ms以内', 'number', 500, 650, 'ms', 30, 'in_progress'),
(2, '代码覆盖率达到80%', '完善单元测试和集成测试，代码覆盖率达到80%', 'percentage', 80, 45, '%', 40, 'in_progress'),
(2, '系统可用性99.9%', '提升系统稳定性，确保可用性达到99.9%', 'percentage', 99.9, 99.5, '%', 50, 'in_progress');