// Role.js - 角色模型
const BaseModel = require('./BaseModel');

class Role extends BaseModel {
    constructor() {
        super('roles', 'id');
        
        this.fillable = [
            'code', 'name', 'display_name', 'description', 'user_type',
            'level', 'scope', 'parent_role_id', 'is_default', 'is_system',
            'is_active', 'enterprise_id', 'max_users', 'permissions_cache'
        ];
        
        this.casts = {
            'level': 'integer',
            'is_default': 'boolean',
            'is_system': 'boolean',
            'is_active': 'boolean',
            'enterprise_id': 'integer',
            'max_users': 'integer',
            'permissions_cache': 'json',
            'parent_role_id': 'integer'
        };
        
        this.timestamps = true;
        this.softDeletes = true;
    }

    /**
     * 根据角色代码查找角色
     */
    async findByCode(code) {
        const sql = `SELECT * FROM ${this.tableName} WHERE code = ? AND deleted_at IS NULL`;
        
        try {
            const [rows] = await this.getConnection().execute(sql, [code]);
            return rows.length > 0 ? this.transformRecord(rows[0]) : null;
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * 获取角色的所有权限
     */
    async getRolePermissions(roleId) {
        const sql = `
            SELECT p.*, rp.grant_type, rp.conditions, rp.scope_data, rp.expires_at as permission_expires_at
            FROM permissions p
            INNER JOIN role_permissions rp ON p.id = rp.permission_id
            WHERE rp.role_id = ? AND p.is_active = 1
            AND (rp.expires_at IS NULL OR rp.expires_at > NOW())
            ORDER BY p.category, p.risk_level DESC, p.name
        `;

        try {
            const [rows] = await this.getConnection().execute(sql, [roleId]);
            return rows;
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * 为角色分配权限
     */
    async assignPermission(roleId, permissionId, grantType = 'ALLOW', options = {}) {
        const {
            conditions = null,
            scopeData = null,
            expiresAt = null,
            createdBy = null
        } = options;

        const connection = this.getConnection();
        
        try {
            const sql = `
                INSERT INTO role_permissions (role_id, permission_id, grant_type, conditions, scope_data, expires_at, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                    grant_type = VALUES(grant_type),
                    conditions = VALUES(conditions),
                    scope_data = VALUES(scope_data),
                    expires_at = VALUES(expires_at),
                    created_by = VALUES(created_by)
            `;

            const [result] = await connection.execute(sql, [
                roleId, permissionId, grantType,
                conditions ? JSON.stringify(conditions) : null,
                scopeData ? JSON.stringify(scopeData) : null,
                expiresAt, createdBy
            ]);

            // 清除角色权限缓存
            await this.clearPermissionsCache(roleId);

            return result.affectedRows > 0;
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * 撤销角色权限
     */
    async revokePermission(roleId, permissionId) {
        const connection = this.getConnection();
        
        try {
            const sql = `DELETE FROM role_permissions WHERE role_id = ? AND permission_id = ?`;
            const [result] = await connection.execute(sql, [roleId, permissionId]);

            // 清除角色权限缓存
            await this.clearPermissionsCache(roleId);

            return result.affectedRows > 0;
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * 批量分配权限
     */
    async assignPermissions(roleId, permissionIds, grantType = 'ALLOW', createdBy = null) {
        const connection = await this.beginTransaction();
        
        try {
            // 先清除现有权限
            await connection.execute('DELETE FROM role_permissions WHERE role_id = ?', [roleId]);

            // 批量插入新权限
            if (permissionIds.length > 0) {
                const values = permissionIds.map(permissionId => 
                    `(${roleId}, ${permissionId}, '${grantType}', ${createdBy || 'NULL'})`
                ).join(', ');

                const sql = `
                    INSERT INTO role_permissions (role_id, permission_id, grant_type, created_by) 
                    VALUES ${values}
                `;
                
                await connection.execute(sql);
            }

            // 清除角色权限缓存
            await this.clearPermissionsCache(roleId);

            await this.commitTransaction(connection);
            return true;
        } catch (error) {
            await this.rollbackTransaction(connection);
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * 获取角色层次结构
     */
    async getRoleHierarchy(userType = null, enterpriseId = null) {
        const connection = this.getConnection();
        
        let sql = `
            SELECT 
                id, code, name, display_name, user_type, level, 
                parent_role_id, enterprise_id, is_active, is_default
            FROM ${this.tableName}
            WHERE deleted_at IS NULL
        `;
        
        const params = [];

        if (userType) {
            sql += ' AND user_type = ?';
            params.push(userType);
        }

        if (enterpriseId !== null) {
            sql += ' AND (enterprise_id = ? OR enterprise_id IS NULL)';
            params.push(enterpriseId);
        }

        sql += ' ORDER BY user_type, level ASC, name ASC';

        try {
            const [rows] = await connection.execute(sql, params);
            return this.buildHierarchyTree(rows);
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * 构建层次结构树
     */
    buildHierarchyTree(roles, parentId = null) {
        const tree = [];
        
        for (const role of roles) {
            if (role.parent_role_id === parentId) {
                const children = this.buildHierarchyTree(roles, role.id);
                if (children.length > 0) {
                    role.children = children;
                }
                tree.push(role);
            }
        }
        
        return tree;
    }

    /**
     * 获取子角色（递归）
     */
    async getChildRoles(roleId) {
        const sql = `
            WITH RECURSIVE role_tree AS (
                SELECT id, code, name, parent_role_id, level
                FROM ${this.tableName}
                WHERE parent_role_id = ? AND is_active = 1 AND deleted_at IS NULL
                
                UNION ALL
                
                SELECT r.id, r.code, r.name, r.parent_role_id, r.level
                FROM ${this.tableName} r
                INNER JOIN role_tree rt ON r.parent_role_id = rt.id
                WHERE r.is_active = 1 AND r.deleted_at IS NULL
            )
            SELECT * FROM role_tree ORDER BY level ASC, name ASC
        `;

        try {
            const [rows] = await this.getConnection().execute(sql, [roleId]);
            return rows;
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * 获取父角色链
     */
    async getParentRoles(roleId) {
        const sql = `
            WITH RECURSIVE parent_roles AS (
                SELECT id, code, name, parent_role_id, level
                FROM ${this.tableName}
                WHERE id = ? AND is_active = 1 AND deleted_at IS NULL
                
                UNION ALL
                
                SELECT r.id, r.code, r.name, r.parent_role_id, r.level
                FROM ${this.tableName} r
                INNER JOIN parent_roles pr ON r.id = pr.parent_role_id
                WHERE r.is_active = 1 AND r.deleted_at IS NULL
            )
            SELECT * FROM parent_roles WHERE id != ? ORDER BY level ASC
        `;

        try {
            const [rows] = await this.getConnection().execute(sql, [roleId, roleId]);
            return rows;
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * 检查角色是否可以分配给用户类型
     */
    async canAssignToUserType(roleId, userType) {
        const role = await this.findById(roleId);
        
        if (!role) {
            return false;
        }

        // 系统角色只能分配给系统用户，企业角色只能分配给企业用户
        return role.user_type === userType;
    }

    /**
     * 获取默认角色
     */
    async getDefaultRoles(userType, enterpriseId = null) {
        const connection = this.getConnection();
        
        let sql = `
            SELECT * FROM ${this.tableName}
            WHERE user_type = ? AND is_default = 1 AND is_active = 1 AND deleted_at IS NULL
        `;
        
        const params = [userType];

        if (userType === 'ENTERPRISE' && enterpriseId) {
            sql += ' AND (enterprise_id = ? OR enterprise_id IS NULL)';
            params.push(enterpriseId);
        }

        sql += ' ORDER BY level ASC';

        try {
            const [rows] = await connection.execute(sql, params);
            return rows.map(row => this.transformRecord(row));
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * 获取角色的用户数量
     */
    async getRoleUserCount(roleId) {
        const sql = `
            SELECT COUNT(DISTINCT ur.user_id) as user_count
            FROM user_roles ur
            INNER JOIN users u ON ur.user_id = u.id
            WHERE ur.role_id = ? AND ur.is_active = 1
            AND u.is_active = 1 AND u.deleted_at IS NULL
        `;

        try {
            const [rows] = await this.getConnection().execute(sql, [roleId]);
            return parseInt(rows[0].user_count);
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * 检查角色用户数量限制
     */
    async checkUserLimit(roleId) {
        const role = await this.findById(roleId);
        
        if (!role || !role.max_users) {
            return { canAssign: true, currentCount: 0, maxUsers: null };
        }

        const currentCount = await this.getRoleUserCount(roleId);
        
        return {
            canAssign: currentCount < role.max_users,
            currentCount,
            maxUsers: role.max_users
        };
    }

    /**
     * 根据用户类型和企业ID获取角色列表
     */
    async findByUserTypeAndEnterprise(userType, enterpriseId = null) {
        const connection = this.getConnection();
        
        let sql = `
            SELECT * FROM ${this.tableName}
            WHERE user_type = ? AND is_active = 1 AND deleted_at IS NULL
        `;
        
        const params = [userType];

        if (userType === 'ENTERPRISE' && enterpriseId) {
            sql += ' AND (enterprise_id = ? OR enterprise_id IS NULL)';
            params.push(enterpriseId);
        } else if (userType === 'SYSTEM') {
            sql += ' AND enterprise_id IS NULL';
        }

        sql += ' ORDER BY level ASC, name ASC';

        try {
            const [rows] = await connection.execute(sql, params);
            return rows.map(row => this.transformRecord(row));
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * 搜索角色
     */
    async search(keyword, options = {}) {
        const {
            userType = null,
            enterpriseId = null,
            level = null,
            isActive = true,
            limit = 20,
            offset = 0
        } = options;

        const connection = this.getConnection();
        
        let sql = `
            SELECT * FROM ${this.tableName}
            WHERE (name LIKE ? OR display_name LIKE ? OR code LIKE ? OR description LIKE ?)
        `;
        
        const params = [`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`];

        if (userType) {
            sql += ' AND user_type = ?';
            params.push(userType);
        }

        if (enterpriseId !== null) {
            sql += ' AND (enterprise_id = ? OR enterprise_id IS NULL)';
            params.push(enterpriseId);
        }

        if (level !== null) {
            sql += ' AND level = ?';
            params.push(level);
        }

        if (isActive !== null) {
            sql += ' AND is_active = ?';
            params.push(isActive);
        }

        sql += ' AND deleted_at IS NULL ORDER BY level ASC, name ASC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        try {
            const [rows] = await connection.execute(sql, params);
            return rows.map(row => this.transformRecord(row));
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * 清除权限缓存
     */
    async clearPermissionsCache(roleId) {
        try {
            await this.update(roleId, { permissions_cache: null });
        } catch (error) {
            console.warn('Failed to clear permissions cache:', error);
        }
    }

    /**
     * 构建权限缓存
     */
    async buildPermissionsCache(roleId) {
        try {
            const permissions = await this.getRolePermissions(roleId);
            const cache = {
                updated_at: new Date(),
                permissions: permissions.reduce((acc, perm) => {
                    acc[`${perm.resource}_${perm.action}`] = {
                        grant_type: perm.grant_type,
                        risk_level: perm.risk_level,
                        expires_at: perm.permission_expires_at
                    };
                    return acc;
                }, {})
            };

            await this.update(roleId, { permissions_cache: cache });
            return cache;
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * 获取角色统计信息
     */
    async getRoleStats(enterpriseId = null) {
        const connection = this.getConnection();
        
        let sql = `
            SELECT 
                user_type,
                COUNT(*) as total_roles,
                SUM(is_active) as active_roles,
                AVG(level) as avg_level,
                MIN(level) as min_level,
                MAX(level) as max_level
            FROM ${this.tableName}
            WHERE deleted_at IS NULL
        `;
        
        const params = [];

        if (enterpriseId !== null) {
            sql += ' AND (enterprise_id = ? OR enterprise_id IS NULL)';
            params.push(enterpriseId);
        }

        sql += ' GROUP BY user_type';

        try {
            const [rows] = await connection.execute(sql, params);
            return rows;
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }
}

module.exports = Role;
