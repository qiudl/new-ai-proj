        // 检查是否被角色引用
        const roleSql = `
            SELECT COUNT(*) as role_reference_count
            FROM role_permissions rp
            INNER JOIN roles r ON rp.role_id = r.id
            WHERE rp.permission_id = ? AND r.is_active = 1 AND r.deleted_at IS NULL
        `;

        try {
            const [childRows] = await connection.execute(childSql, [permissionId]);
            const [roleRows] = await connection.execute(roleSql, [permissionId]);

            return {
                hasChildren: parseInt(childRows[0].child_count) > 0,
                childCount: parseInt(childRows[0].child_count),
                isReferenced: parseInt(roleRows[0].role_reference_count) > 0,
                referenceCount: parseInt(roleRows[0].role_reference_count),
                canDelete: parseInt(childRows[0].child_count) === 0 && parseInt(roleRows[0].role_reference_count) === 0
            };
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * 获取权限分组统计
     */
    async getPermissionGroupStats() {
        const sql = `
            SELECT 
                CONCAT(resource, '_', UPPER(action)) as permission_key,
                resource,
                action,
                COUNT(*) as total,
                GROUP_CONCAT(DISTINCT category) as categories,
                GROUP_CONCAT(DISTINCT risk_level) as risk_levels,
                MAX(CASE WHEN is_system = 1 THEN 'YES' ELSE 'NO' END) as is_system_permission
            FROM ${this.tableName}
            WHERE is_active = 1
            GROUP BY resource, action
            ORDER BY resource, action
        `;

        try {
            const [rows] = await this.getConnection().execute(sql);
            return rows;
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * 验证权限代码格式
     */
    validatePermissionCode(code) {
        // 权限代码格式: RESOURCE_ACTION (如: USER_CREATE, ROLE_DELETE)
        const codePattern = /^[A-Z_]+$/;
        
        if (!codePattern.test(code)) {
            throw new Error('Permission code must contain only uppercase letters and underscores');
        }

        const parts = code.split('_');
        if (parts.length < 2) {
            throw new Error('Permission code must follow RESOURCE_ACTION format');
        }

        return true;
    }

    /**
     * 创建权限（重写以添加验证）
     */
    async create(data) {
        // 验证权限代码格式
        if (data.code) {
            this.validatePermissionCode(data.code);
        }

        // 自动生成权限代码（如果未提供）
        if (!data.code && data.resource && data.action) {
            data.code = `${data.resource.toUpperCase()}_${data.action.toUpperCase()}`;
        }

        return await super.create(data);
    }

    /**
     * 更新权限（重写以添加验证）
     */
    async update(id, data) {
        // 验证权限代码格式
        if (data.code) {
            this.validatePermissionCode(data.code);
        }

        return await super.update(id, data);
    }
}

module.exports = Permission;
