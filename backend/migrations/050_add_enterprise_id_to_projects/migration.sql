-- 050_add_enterprise_id_to_projects
-- 为projects表添加enterprise_id字段并更新项目关联关系

-- 检查是否已经添加了enterprise_id字段
DO $$ 
BEGIN
    -- 检查字段是否存在
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'projects' AND column_name = 'enterprise_id'
    ) THEN
        RAISE NOTICE '为projects表添加enterprise_id字段...';
        
        -- 添加enterprise_id字段
        ALTER TABLE projects ADD COLUMN enterprise_id INTEGER;
        
        -- 添加外键约束
        ALTER TABLE projects ADD CONSTRAINT fk_projects_enterprise_id 
        FOREIGN KEY (enterprise_id) REFERENCES enterprises(id) ON DELETE SET NULL;
        
        -- 添加索引
        CREATE INDEX idx_projects_enterprise_id ON projects(enterprise_id);
        
        RAISE NOTICE 'enterprise_id字段添加成功';
    ELSE
        RAISE NOTICE 'enterprise_id字段已存在，跳过添加';
    END IF;
END $$;

-- 显示当前projects表结构
SELECT 
    'Projects Table Structure' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'projects' 
  AND column_name IN ('id', 'name', 'company_id', 'enterprise_id')
ORDER BY ordinal_position;

-- 显示当前projects与company的关联情况
SELECT 
    'Current Projects-Company Association' as info,
    p.id as project_id,
    p.name as project_name,
    p.company_id,
    c.company_name,
    p.enterprise_id,
    CASE 
        WHEN p.company_id IS NOT NULL AND c.id IS NULL THEN '公司不存在'
        WHEN p.company_id IS NULL THEN '无公司关联'
        ELSE '正常关联'
    END as association_status
FROM projects p
LEFT JOIN companies c ON p.company_id = c.id
WHERE p.deleted_at IS NULL
ORDER BY p.id;