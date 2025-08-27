-- 009_create_views_and_procedures.sql
-- 创建视图和存储过程
-- 执行时间：预计 5-10秒

-- 删除现有视图和存储过程
DROP VIEW IF EXISTS view_user_permissions;
DROP VIEW IF EXISTS view_role_hierarchy;
DROP PROCEDURE IF EXISTS sp_check_user_permission;

-- 创建用户权限视图
CREATE VIEW view_user_permissions AS
SELECT 
    u.id as user_id,
    u.username,
    u.user_type,
    u.enterprise_id,
    r.id as role_id,
    r.code as role_code,
    r.name as role_name,
    r.level as role_level,
    p.id as permission_id,
    p.code as permission_code,
    p.name as permission_name,
    p.resource,
    p.action,
    p.risk_level,
    rp.grant_type,
    ur.scope_type,
    ur.scope_id,
    ur.expires_at as role_expires_at
FROM users u
INNER JOIN user_roles ur ON u.id = ur.user_id AND ur.is_active = 1
INNER JOIN roles r ON ur.role_id = r.id AND r.is_active = 1
INNER JOIN role_permissions rp ON r.id = rp.role_id
INNER JOIN permissions p ON rp.permission_id = p.id AND p.is_active = 1
WHERE u.is_active = 1
  AND u.deleted_at IS NULL
  AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
  AND (rp.expires_at IS NULL OR rp.expires_at > NOW());

-- 创建角色层级视图（递归CTE）
CREATE VIEW view_role_hierarchy AS
WITH RECURSIVE role_tree AS (
    -- 根节点：没有父角色的角色
    SELECT 
        id,
        code,
        name,
        display_name,
        user_type,
        level,
        parent_role_id,
        enterprise_id,
        0 as depth,
        CAST(CONCAT('/', code) AS CHAR(1000)) as path,
        CAST(id AS CHAR(1000)) as id_path
    FROM roles 
    WHERE parent_role_id IS NULL AND is_active = 1
    
    UNION ALL
    
    -- 递归查询子节点
    SELECT 
        r.id,
        r.code,
        r.name,
        r.display_name,
        r.user_type,
        r.level,
        r.parent_role_id,
        r.enterprise_id,
        rt.depth + 1,
        CAST(CONCAT(rt.path, '/', r.code) AS CHAR(1000)),
        CAST(CONCAT(rt.id_path, '->', r.id) AS CHAR(1000))
    FROM roles r
    INNER JOIN role_tree rt ON r.parent_role_id = rt.id
    WHERE r.is_active = 1 AND rt.depth < 10  -- 防止无限递归
)
SELECT 
    id,
    code,
    name,
    display_name,
    user_type,
    level,
    parent_role_id,
    enterprise_id,
    depth,
    path,
    id_path
FROM role_tree
ORDER BY user_type, level, depth, code;

-- 创建权限检查存储过程
DELIMITER //

CREATE PROCEDURE sp_check_user_permission(
    IN p_user_id BIGINT,
    IN p_resource VARCHAR(100),
    IN p_action VARCHAR(50),
    IN p_context_data JSON,
    OUT p_result BOOLEAN,
    OUT p_reason TEXT
)
BEGIN
    DECLARE v_permission_count INT DEFAULT 0;
    DECLARE v_deny_count INT DEFAULT 0;
    DECLARE v_user_active INT DEFAULT 0;
    DECLARE v_user_locked INT DEFAULT 0;
    DECLARE v_user_type VARCHAR(20);
    DECLARE v_enterprise_id BIGINT;
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        SET p_result = FALSE;
        SET p_reason = 'Database error occurred during permission check';
        ROLLBACK;
    END;
    
    -- 检查用户状态
    SELECT 
        is_active,
        CASE WHEN locked_until IS NOT NULL AND locked_until > NOW() THEN 1 ELSE 0 END,
        user_type,
        enterprise_id
    INTO v_user_active, v_user_locked, v_user_type, v_enterprise_id
    FROM users 
    WHERE id = p_user_id AND deleted_at IS NULL;
    
    -- 用户不存在
    IF v_user_active IS NULL THEN
        SET p_result = FALSE;
        SET p_reason = '用户不存在';
    -- 用户未激活    
    ELSEIF v_user_active = 0 THEN
        SET p_result = FALSE;
        SET p_reason = '用户未激活';
    -- 用户被锁定
    ELSEIF v_user_locked = 1 THEN
        SET p_result = FALSE;
        SET p_reason = '用户账户已锁定';
    ELSE
        -- 检查明确拒绝的权限
        SELECT COUNT(*)
        INTO v_deny_count
        FROM view_user_permissions
        WHERE user_id = p_user_id
          AND resource = p_resource
          AND action = p_action
          AND grant_type = 'DENY';
        
        IF v_deny_count > 0 THEN
            SET p_result = FALSE;
            SET p_reason = '权限被明确拒绝';
            
            -- 记录拒绝的审计日志
            INSERT INTO permission_audit_logs (
                user_id, action, resource, permission_code, result, reason, 
                context_data, created_at
            ) VALUES (
                p_user_id, p_action, p_resource, 
                CONCAT(p_resource, '_', UPPER(p_action)),
                'DENIED', p_reason, p_context_data, NOW()
            );
        ELSE
            -- 检查允许的权限
            SELECT COUNT(*)
            INTO v_permission_count
            FROM view_user_permissions
            WHERE user_id = p_user_id
              AND resource = p_resource
              AND action = p_action
              AND grant_type = 'ALLOW';
            
            IF v_permission_count > 0 THEN
                SET p_result = TRUE;
                SET p_reason = '权限验证通过';
                
                -- 记录成功的审计日志
                INSERT INTO permission_audit_logs (
                    user_id, action, resource, permission_code, result, reason,
                    context_data, created_at
                ) VALUES (
                    p_user_id, p_action, p_resource,
                    CONCAT(p_resource, '_', UPPER(p_action)),
                    'GRANTED', p_reason, p_context_data, NOW()
                );
            ELSE
                SET p_result = FALSE;
                SET p_reason = '缺少相应权限';
                
                -- 记录失败的审计日志
                INSERT INTO permission_audit_logs (
                    user_id, action, resource, permission_code, result, reason,
                    context_data, created_at
                ) VALUES (
                    p_user_id, p_action, p_resource,
                    CONCAT(p_resource, '_', UPPER(p_action)),
                    'DENIED', p_reason, p_context_data, NOW()
                );
            END IF;
        END IF;
    END IF;
    
END //

DELIMITER ;

-- 创建快速权限检查函数（用于简单场景）
DELIMITER //

CREATE FUNCTION fn_has_permission(
    p_user_id BIGINT,
    p_resource VARCHAR(100),
    p_action VARCHAR(50)
) RETURNS BOOLEAN
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE v_count INT DEFAULT 0;
    DECLARE v_deny_count INT DEFAULT 0;
    DECLARE v_user_active INT DEFAULT 0;
    
    -- 检查用户状态
    SELECT is_active INTO v_user_active
    FROM users 
    WHERE id = p_user_id AND deleted_at IS NULL 
      AND (locked_until IS NULL OR locked_until <= NOW());
    
    IF v_user_active != 1 THEN
        RETURN FALSE;
    END IF;
    
    -- 检查拒绝权限
    SELECT COUNT(*) INTO v_deny_count
    FROM view_user_permissions
    WHERE user_id = p_user_id
      AND resource = p_resource
      AND action = p_action
      AND grant_type = 'DENY';
      
    IF v_deny_count > 0 THEN
        RETURN FALSE;
    END IF;
    
    -- 检查允许权限
    SELECT COUNT(*) INTO v_count
    FROM view_user_permissions
    WHERE user_id = p_user_id
      AND resource = p_resource
      AND action = p_action
      AND grant_type = 'ALLOW';
    
    RETURN v_count > 0;
END //

DELIMITER ;
