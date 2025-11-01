-- Migration: 20251101_01 - Navigation Management System
-- Description: 创建导航管理系统所需的表结构

-- 1. 系统菜单项表
CREATE TABLE IF NOT EXISTS system_menu_items (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) NOT NULL UNIQUE,
    icon VARCHAR(50),
    label VARCHAR(200) NOT NULL,
    path VARCHAR(500),
    parent_id INTEGER REFERENCES system_menu_items(id) ON DELETE CASCADE,
    sort_order INTEGER DEFAULT 0,
    is_visible BOOLEAN DEFAULT TRUE,
    is_enabled BOOLEAN DEFAULT TRUE,
    permission VARCHAR(100),
    component VARCHAR(200),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_menu_items_parent_id ON system_menu_items(parent_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_sort_order ON system_menu_items(sort_order);
CREATE INDEX IF NOT EXISTS idx_menu_items_key ON system_menu_items(key);

-- 2. 系统菜单分组表
CREATE TABLE IF NOT EXISTS system_menu_groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_menu_groups_sort_order ON system_menu_groups(sort_order);

-- 3. 系统路由配置表
CREATE TABLE IF NOT EXISTS system_routes (
    id SERIAL PRIMARY KEY,
    path VARCHAR(500) NOT NULL,
    component VARCHAR(200) NOT NULL,
    exact BOOLEAN DEFAULT FALSE,
    menu_item_id INTEGER REFERENCES system_menu_items(id) ON DELETE SET NULL,
    is_protected BOOLEAN DEFAULT TRUE,
    permission VARCHAR(100),
    redirect VARCHAR(500),
    meta JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_routes_path ON system_routes(path);
CREATE INDEX IF NOT EXISTS idx_routes_menu_item_id ON system_routes(menu_item_id);

-- 4. 系统菜单权限表
CREATE TABLE IF NOT EXISTS system_menu_permissions (
    id SERIAL PRIMARY KEY,
    menu_item_id INTEGER NOT NULL REFERENCES system_menu_items(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    can_view BOOLEAN DEFAULT FALSE,
    can_edit BOOLEAN DEFAULT FALSE,
    can_delete BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(menu_item_id, role)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_menu_permissions_menu_item_id ON system_menu_permissions(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_menu_permissions_role ON system_menu_permissions(role);

-- 5. 添加触发器，自动更新updated_at字段
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为各表创建触发器
CREATE TRIGGER update_system_menu_items_updated_at BEFORE UPDATE ON system_menu_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_menu_groups_updated_at BEFORE UPDATE ON system_menu_groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_routes_updated_at BEFORE UPDATE ON system_routes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_menu_permissions_updated_at BEFORE UPDATE ON system_menu_permissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. 添加注释
COMMENT ON TABLE system_menu_items IS '系统菜单项表';
COMMENT ON TABLE system_menu_groups IS '系统菜单分组表';
COMMENT ON TABLE system_routes IS '系统路由配置表';
COMMENT ON TABLE system_menu_permissions IS '系统菜单权限表';

-- 7. 插入默认数据（可选）
-- 示例菜单项
INSERT INTO system_menu_items (key, label, icon, path, sort_order, is_visible, is_enabled)
VALUES
    ('dashboard', '仪表板', 'DashboardOutlined', '/dashboard', 1, true, true),
    ('projects', '项目管理', 'ProjectOutlined', '/projects', 2, true, true),
    ('tasks', '任务管理', 'UnorderedListOutlined', '/tasks', 3, true, true),
    ('system', '系统管理', 'SettingOutlined', NULL, 100, true, true)
ON CONFLICT (key) DO NOTHING;

-- 系统管理子菜单
INSERT INTO system_menu_items (key, label, icon, path, parent_id, sort_order, is_visible, is_enabled, permission)
VALUES
    ('system-users', '用户管理', 'UserOutlined', '/system/users', (SELECT id FROM system_menu_items WHERE key = 'system'), 1, true, true, 'system.user.list'),
    ('system-roles', '角色管理', 'TeamOutlined', '/system/roles', (SELECT id FROM system_menu_items WHERE key = 'system'), 2, true, true, 'system.role.list'),
    ('system-permissions', '权限管理', 'SafetyOutlined', '/system/permissions', (SELECT id FROM system_menu_items WHERE key = 'system'), 3, true, true, 'system.permission.list'),
    ('system-navigation', '导航管理', 'AppstoreOutlined', '/system/navigation', (SELECT id FROM system_menu_items WHERE key = 'system'), 4, true, true, 'system.navigation.manage')
ON CONFLICT (key) DO NOTHING;

-- 完成
SELECT 'Navigation management tables created successfully' AS status;
