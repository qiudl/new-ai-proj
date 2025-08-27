// User.js - 用户模型
const BaseModel = require('./BaseModel');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

class User extends BaseModel {
    constructor() {
        super('users', 'id');
        
        this.fillable = [
            'username', 'email', 'password_hash', 'salt', 'user_type',
            'enterprise_id', 'department', 'position', 'phone', 'avatar_url',
            'is_active', 'is_verified'
        ];
        
        this.hidden = ['password_hash', 'salt'];
        
        this.casts = {
            'is_active': 'boolean',
            'is_verified': 'boolean',
            'failed_login_attempts': 'integer',
            'enterprise_id': 'integer'
        };
        
        this.timestamps = true;
        this.softDeletes = true;
    }

    /**
     * 创建用户（重写以处理密码加密）
     */
    async create(data) {
        if (data.password) {
            const { hash, salt } = await this.hashPassword(data.password);
            data.password_hash = hash;
            data.salt = salt;
            delete data.password; // 移除明文密码
        }

        return await super.create(data);
    }

    /**
     * 更新用户（处理密码更新）
     */
    async update(id, data) {
        if (data.password) {
            const { hash, salt } = await this.hashPassword(data.password);
            data.password_hash = hash;
            data.salt = salt;
            data.password_changed_at = new Date();
            delete data.password; // 移除明文密码
        }

        return await super.update(id, data);
    }

    /**
     * 密码加密
     */
    async hashPassword(password) {
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = await bcrypt.hash(password + salt, 12);
        return { hash, salt };
    }

    /**
     * 验证密码
     */
    async verifyPassword(password, hash, salt) {
        return await bcrypt.compare(password + salt, hash);
    }

    /**
     * 根据用户名或邮箱查找用户
     */
    async findByUsernameOrEmail(usernameOrEmail) {
        const sql = `
            SELECT * FROM ${this.tableName} 
            WHERE (username = ? OR email = ?) 
            AND deleted_at IS NULL
        `;
        
        try {
            const [rows] = await this.getConnection().execute(sql, [usernameOrEmail, usernameOrEmail]);
            return rows.length > 0 ? this.transformRecord(rows[0]) : null;
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * 用户登录验证
     */
    async authenticate(usernameOrEmail, password) {
        try {
            // 查找用户（包含隐藏字段用于验证）
            const sql = `
                SELECT * FROM ${this.tableName} 
                WHERE (username = ? OR email = ?) 
                AND deleted_at IS NULL
            `;
            
            const [rows] = await this.getConnection().execute(sql, [usernameOrEmail, usernameOrEmail]);
            
            if (rows.length === 0) {
                return { success: false, message: '用户不存在' };
            }

            const user = rows[0];

            // 检查账户状态
            if (!user.is_active) {
                return { success: false, message: '账户已被禁用' };
            }

            // 检查账户是否被锁定
            if (user.locked_until && new Date(user.locked_until) > new Date()) {
                return { success: false, message: '账户已被锁定，请稍后再试' };
            }

            // 验证密码
            const passwordValid = await this.verifyPassword(password, user.password_hash, user.salt);
            
            if (!passwordValid) {
                // 增加失败尝试次数
                await this.incrementFailedAttempts(user.id);
                return { success: false, message: '密码错误' };
            }

            // 重置失败尝试次数并更新最后登录信息
            await this.resetFailedAttempts(user.id);

            return {
                success: true,
                user: this.transformRecord(user),
                message: '登录成功'
            };
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * 增加登录失败次数
     */
    async incrementFailedAttempts(userId, maxAttempts = 5, lockDuration = 30) {
        const connection = this.getConnection();
        
        try {
            // 获取当前失败次数
            const [rows] = await connection.execute(
                `SELECT failed_login_attempts FROM ${this.tableName} WHERE id = ?`,
                [userId]
            );

            const currentAttempts = rows[0]?.failed_login_attempts || 0;
            const newAttempts = currentAttempts + 1;

            // 更新失败次数
            let sql = `UPDATE ${this.tableName} SET failed_login_attempts = ?`;
            const params = [newAttempts];

            // 如果达到最大尝试次数，锁定账户
            if (newAttempts >= maxAttempts) {
                const lockUntil = new Date(Date.now() + lockDuration * 60 * 1000); // 锁定时间（分钟）
                sql += `, locked_until = ?`;
                params.push(lockUntil);
            }

            sql += ` WHERE id = ?`;
            params.push(userId);

            await connection.execute(sql, params);
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * 重置登录失败次数
     */
    async resetFailedAttempts(userId, ipAddress = null) {
        const connection = this.getConnection();
        
        try {
            const sql = `
                UPDATE ${this.tableName} 
                SET failed_login_attempts = 0, 
                    locked_until = NULL,
                    last_login_at = ?,
                    last_login_ip = ?
                WHERE id = ?
            `;
            
            await connection.execute(sql, [new Date(), ipAddress, userId]);
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * 获取用户的所有角色
     */
    async getUserRoles(userId) {
        const sql = `
            SELECT r.*, ur.scope_type, ur.scope_id, ur.expires_at as role_expires_at
            FROM roles r
            INNER JOIN user_roles ur ON r.id = ur.role_id
            WHERE ur.user_id = ? AND ur.is_active = 1 AND r.is_active = 1
            AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
            ORDER BY r.level ASC, r.name ASC
        `;

        try {
            const [rows] = await this.getConnection().execute(sql, [userId]);
            return rows;
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * 获取用户的所有权限
     */
    async getUserPermissions(userId) {
        const sql = `
            SELECT DISTINCT p.*, rp.grant_type
            FROM permissions p
            INNER JOIN role_permissions rp ON p.id = rp.permission_id
            INNER JOIN user_roles ur ON rp.role_id = ur.role_id
            WHERE ur.user_id = ? 
            AND ur.is_active = 1 
            AND p.is_active = 1
            AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
            AND (rp.expires_at IS NULL OR rp.expires_at > NOW())
            ORDER BY p.risk_level DESC, p.category, p.name
        `;

        try {
            const [rows] = await this.getConnection().execute(sql, [userId]);
            return rows;
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * 检查用户是否有特定权限
     */
    async hasPermission(userId, resource, action) {
        const sql = `
            SELECT COUNT(*) as permission_count,
                   SUM(CASE WHEN rp.grant_type = 'DENY' THEN 1 ELSE 0 END) as deny_count
            FROM permissions p
            INNER JOIN role_permissions rp ON p.id = rp.permission_id
            INNER JOIN user_roles ur ON rp.role_id = ur.role_id
            INNER JOIN users u ON ur.user_id = u.id
            WHERE ur.user_id = ? 
            AND p.resource = ? 
            AND p.action = ?
            AND ur.is_active = 1 
            AND p.is_active = 1
            AND u.is_active = 1
            AND u.deleted_at IS NULL
            AND (u.locked_until IS NULL OR u.locked_until <= NOW())
            AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
            AND (rp.expires_at IS NULL OR rp.expires_at > NOW())
        `;

        try {
            const [rows] = await this.getConnection().execute(sql, [userId, resource, action]);
            const result = rows[0];
            
            // 如果有明确拒绝的权限，返回false
            if (result.deny_count > 0) {
                return false;
            }
            
            // 如果有允许的权限，返回true
            return result.permission_count > 0;
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * 为用户分配角色
     */
    async assignRole(userId, roleId, assignedBy, options = {}) {
        const {
            scopeType = 'GLOBAL',
            scopeId = null,
            expiresAt = null,
            conditions = null
        } = options;

        const connection = this.getConnection();
        
        try {
            const sql = `
                INSERT INTO user_roles (user_id, role_id, scope_type, scope_id, assigned_by, expires_at, conditions)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                    is_active = 1, 
                    expires_at = VALUES(expires_at),
                    conditions = VALUES(conditions),
                    assigned_by = VALUES(assigned_by),
                    assigned_at = NOW()
            `;

            const [result] = await connection.execute(sql, [
                userId, roleId, scopeType, scopeId, assignedBy, expiresAt, 
                conditions ? JSON.stringify(conditions) : null
            ]);

            return result.affectedRows > 0;
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * 撤销用户角色
     */
    async revokeRole(userId, roleId, scopeType = 'GLOBAL', scopeId = null) {
        const connection = this.getConnection();
        
        try {
            const sql = `
                UPDATE user_roles 
                SET is_active = 0 
                WHERE user_id = ? AND role_id = ? AND scope_type = ? 
                AND (scope_id = ? OR (scope_id IS NULL AND ? IS NULL))
            `;

            const [result] = await connection.execute(sql, [userId, roleId, scopeType, scopeId, scopeId]);
            return result.affectedRows > 0;
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * 根据企业ID获取用户列表
     */
    async findByEnterpriseId(enterpriseId, options = {}) {
        const conditions = { enterprise_id: enterpriseId };
        return await this.findAll(conditions, options);
    }

    /**
     * 根据用户类型获取用户列表
     */
    async findByUserType(userType, options = {}) {
        const conditions = { user_type: userType };
        return await this.findAll(conditions, options);
    }

    /**
     * 搜索用户
     */
    async search(keyword, options = {}) {
        const {
            userType = null,
            enterpriseId = null,
            isActive = null,
            limit = 20,
            offset = 0
        } = options;

        const connection = this.getConnection();
        
        let sql = `
            SELECT * FROM ${this.tableName} 
            WHERE (username LIKE ? OR email LIKE ? OR phone LIKE ?)
        `;
        
        const params = [`%${keyword}%`, `%${keyword}%`, `%${keyword}%`];

        // 添加过滤条件
        if (userType) {
            sql += ' AND user_type = ?';
            params.push(userType);
        }

        if (enterpriseId) {
            sql += ' AND enterprise_id = ?';
            params.push(enterpriseId);
        }

        if (isActive !== null) {
            sql += ' AND is_active = ?';
            params.push(isActive);
        }

        // 软删除支持
        if (this.softDeletes) {
            sql += ' AND deleted_at IS NULL';
        }

        sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        try {
            const [rows] = await connection.execute(sql, params);
            return rows.map(row => this.transformRecord(row));
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * 获取活跃用户统计
     */
    async getActiveUserStats(enterpriseId = null) {
        const connection = this.getConnection();
        
        let sql = `
            SELECT 
                user_type,
                COUNT(*) as total,
                SUM(is_active) as active_count,
                SUM(is_verified) as verified_count
            FROM ${this.tableName}
            WHERE deleted_at IS NULL
        `;
        
        const params = [];
        
        if (enterpriseId) {
            sql += ' AND enterprise_id = ?';
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

module.exports = User;
