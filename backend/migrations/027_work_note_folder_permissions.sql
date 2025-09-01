-- Migration: Add work note folder permissions
-- Date: 2025-09-01
-- Description: Add comprehensive permission system for work note folders

-- Work note folder permissions following existing permission structure
INSERT INTO permissions (permission_code, permission_name, permission_description, module, resource, action, sort_order) VALUES
    -- Basic work note folder permissions
    ('work_note_folder.read', '查看工作笔记文件夹', '查看工作笔记文件夹列表和详情', 'work_note', 'folder', 'read', 800),
    ('work_note_folder.create', '创建工作笔记文件夹', '创建新的工作笔记文件夹', 'work_note', 'folder', 'create', 801),
    ('work_note_folder.update', '更新工作笔记文件夹', '编辑工作笔记文件夹信息', 'work_note', 'folder', 'update', 802),
    ('work_note_folder.delete', '删除工作笔记文件夹', '删除工作笔记文件夹', 'work_note', 'folder', 'delete', 803),
    
    -- Advanced folder management permissions
    ('work_note_folder.move', '移动工作笔记文件夹', '移动文件夹位置和层级', 'work_note', 'folder', 'move', 804),
    ('work_note_folder.search', '搜索工作笔记文件夹', '搜索和过滤工作笔记文件夹', 'work_note', 'folder', 'search', 805),
    ('work_note_folder.tree', '查看文件夹树结构', '查看完整的文件夹层级树', 'work_note', 'folder', 'tree', 806),
    ('work_note_folder.stats', '查看文件夹统计', '查看文件夹统计信息和报告', 'work_note', 'folder', 'stats', 807),
    
    -- Folder content management permissions
    ('work_note_folder.content.read', '查看文件夹内容', '查看文件夹内的文档和子文件夹', 'work_note', 'folder_content', 'read', 808),
    ('work_note_folder.content.manage', '管理文件夹内容', '管理文件夹内的文档和子文件夹', 'work_note', 'folder_content', 'manage', 809),
    
    -- Batch operations permissions
    ('work_note_folder.batch.move', '批量移动文件夹', '批量移动多个文件夹', 'work_note', 'folder_batch', 'move', 810),
    ('work_note_folder.batch.sort', '批量排序文件夹', '批量调整文件夹排序', 'work_note', 'folder_batch', 'sort', 811),
    ('work_note_folder.batch.update', '批量更新文件夹', '批量更新多个文件夹属性', 'work_note', 'folder_batch', 'update', 812),
    
    -- Permission management permissions
    ('work_note_folder.permissions.read', '查看文件夹权限', '查看文件夹权限设置', 'work_note', 'folder_permissions', 'read', 813),
    ('work_note_folder.permissions.manage', '管理文件夹权限', '设置和管理文件夹权限', 'work_note', 'folder_permissions', 'manage', 814),
    
    -- Administrative permissions
    ('work_note_folder.admin', '工作笔记文件夹管理员', '拥有所有文件夹管理权限', 'work_note', 'folder', 'admin', 815)
ON CONFLICT (permission_code) DO NOTHING;

-- Create work note folder specific permission table for resource-level permissions
CREATE TABLE IF NOT EXISTS work_note_folder_permissions (
    id SERIAL PRIMARY KEY,
    company_user_id INTEGER NOT NULL REFERENCES company_users(id) ON DELETE CASCADE,
    folder_id INTEGER NOT NULL REFERENCES work_note_folders(id) ON DELETE CASCADE,
    permission_code VARCHAR(100) NOT NULL REFERENCES permissions(permission_code) ON DELETE CASCADE,
    is_granted BOOLEAN NOT NULL DEFAULT false,
    granted_by INTEGER REFERENCES company_users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NULL,
    reason TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(company_user_id, folder_id, permission_code)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_work_note_folder_permissions_user_folder ON work_note_folder_permissions(company_user_id, folder_id);
CREATE INDEX IF NOT EXISTS idx_work_note_folder_permissions_folder ON work_note_folder_permissions(folder_id);
CREATE INDEX IF NOT EXISTS idx_work_note_folder_permissions_permission ON work_note_folder_permissions(permission_code);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_work_note_folder_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_work_note_folder_permissions_updated_at
    BEFORE UPDATE ON work_note_folder_permissions
    FOR EACH ROW
    EXECUTE FUNCTION update_work_note_folder_permissions_updated_at();

-- Add basic permissions to existing roles
-- Add work note folder permissions to admin role (assuming role_id = 1 for admin)
INSERT INTO role_permissions (role_id, permission_id, is_granted) 
SELECT 1, p.id, true
FROM permissions p
WHERE p.permission_code LIKE 'work_note_folder.%'
AND EXISTS (SELECT 1 FROM company_roles WHERE id = 1 AND role_code = 'admin')
ON CONFLICT (role_id, permission_id) DO UPDATE SET is_granted = true;

-- Add basic work note folder permissions to company_user role (assuming role_id for regular users)
INSERT INTO role_permissions (role_id, permission_id, is_granted)
SELECT cr.id, p.id, CASE 
    WHEN p.permission_code IN (
        'work_note_folder.read',
        'work_note_folder.create', 
        'work_note_folder.update',
        'work_note_folder.search',
        'work_note_folder.tree',
        'work_note_folder.content.read'
    ) THEN true
    ELSE false
END
FROM permissions p
CROSS JOIN company_roles cr
WHERE p.permission_code LIKE 'work_note_folder.%'
AND cr.role_code = 'company_user'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Create helper function to check work note folder permission with inheritance
CREATE OR REPLACE FUNCTION check_work_note_folder_permission(
    p_company_user_id INTEGER,
    p_folder_id INTEGER,
    p_permission_code VARCHAR(100)
) RETURNS BOOLEAN AS $$
DECLARE
    v_has_permission BOOLEAN := false;
    v_parent_id INTEGER;
BEGIN
    -- Check direct folder permission
    SELECT is_granted INTO v_has_permission
    FROM work_note_folder_permissions
    WHERE company_user_id = p_company_user_id
      AND folder_id = p_folder_id
      AND permission_code = p_permission_code
      AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP);
    
    IF FOUND AND v_has_permission THEN
        RETURN true;
    END IF;
    
    -- Check role-based permission
    SELECT COUNT(*) > 0 INTO v_has_permission
    FROM company_user_roles cur
    JOIN role_permissions rp ON cur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE cur.company_user_id = p_company_user_id
      AND p.permission_code = p_permission_code
      AND rp.is_granted = true;
    
    IF v_has_permission THEN
        RETURN true;
    END IF;
    
    -- Check permission inheritance from parent folders
    SELECT parent_folder_id INTO v_parent_id
    FROM work_note_folders
    WHERE id = p_folder_id;
    
    IF v_parent_id IS NOT NULL THEN
        RETURN check_work_note_folder_permission(p_company_user_id, v_parent_id, p_permission_code);
    END IF;
    
    RETURN false;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_work_note_folder_permission(INTEGER, INTEGER, VARCHAR) IS 
'Check if a user has a specific permission on a work note folder, with inheritance from parent folders';