// Enterprise.js - 企业模型
const BaseModel = require('./BaseModel');

class Enterprise extends BaseModel {
    constructor() {
        super('enterprises', 'id');
        
        this.fillable = [
            'name', 'code', 'domain', 'industry', 'scale',
            'contact_person', 'contact_phone', 'contact_email',
            'address', 'logo_url', 'website', 'description',
            'settings', 'is_active'
        ];
        
        this.casts = {
            'is_active': 'boolean',
            'settings': 'json'
        };
        
        this.timestamps = true;
        this.softDeletes = true;
    }

    /**
     * 根据企业代码查找企业
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
     * 根据域名查找企业
     */
    async findByDomain(domain) {
        const sql = `SELECT * FROM ${this.tableName} WHERE domain = ? AND deleted_at IS NULL`;
        
        try {
            const [rows] = await this.getConnection().execute(sql, [domain]);
            return rows.length > 0 ? this.transformRecord(rows[0]) : null;
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * 获取企业用户数量
     */
    async getEnterpriseUserCount(enterpriseId) {
        const sql = `
            SELECT COUNT(*) as user_count
            FROM users
            WHERE enterprise_id = ? AND is_active = 1 AND deleted_at IS NULL
        `;

        try {
            const [rows] = await this.getConnection().execute(sql, [enterpriseId]);
            return parseInt(rows[0].user_count);
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * 获取企业用户统计
     */
    async getEnterpriseUserStats(enterpriseId) {
        const sql = `
            SELECT 
                user_type,
                COUNT(*) as total_users,
                SUM(is_active) as active_users,
                SUM(is_verified) as verified_users
            FROM users
            WHERE enterprise_id = ? AND deleted_at IS NULL
            GROUP BY user_type
        `;

        try {
            const [rows] = await this.getConnection().execute(sql, [enterpriseId]);
            return rows;
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * 获取企业角色列表
     */
    async getEnterpriseRoles(enterpriseId) {
        const sql = `
            SELECT * FROM roles
            WHERE (enterprise_id = ? OR enterprise_id IS NULL)
            AND user_type = 'ENTERPRISE'
            AND is_active = 1 
            AND deleted_at IS NULL
            ORDER BY level ASC, name ASC
        `;

        try {
            const [rows] = await this.getConnection().execute(sql, [enterpriseId]);
            return rows;
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * 搜索企业
     */
    async search(keyword, options = {}) {
        const {
            industry = null,
            scale = null,
            isActive = true,
            limit = 20,
            offset = 0
        } = options;

        const connection = this.getConnection();
        
        let sql = `
            SELECT * FROM ${this.tableName}
            WHERE (name LIKE ? OR code LIKE ? OR domain LIKE ? OR contact_person LIKE ?)
        `;
        
        const params = [`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`];

        if (industry) {
            sql += ' AND industry = ?';
            params.push(industry);
        }

        if (scale) {
            sql += ' AND scale = ?';
            params.push(scale);
        }

        if (isActive !== null) {
            sql += ' AND is_active = ?';
            params.push(isActive);
        }

        sql += ' AND deleted_at IS NULL ORDER BY name ASC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        try {
            const [rows] = await connection.execute(sql, params);
            return rows.map(row => this.transformRecord(row));
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * 获取企业设置
     */
    async getEnterpriseSetting(enterpriseId, key) {
        const enterprise = await this.findById(enterpriseId);
        
        if (!enterprise || !enterprise.settings) {
            return null;
        }

        return enterprise.settings[key] || null;
    }

    /**
     * 更新企业设置
     */
    async updateEnterpriseSetting(enterpriseId, key, value) {
        const enterprise = await this.findById(enterpriseId);
        
        if (!enterprise) {
            throw new Error('Enterprise not found');
        }

        const settings = enterprise.settings || {};
        settings[key] = value;

        return await this.update(enterpriseId, { settings });
    }

    /**
     * 批量更新企业设置
     */
    async updateEnterpriseSettings(enterpriseId, settings) {
        const enterprise = await this.findById(enterpriseId);
        
        if (!enterprise) {
            throw new Error('Enterprise not found');
        }

        const currentSettings = enterprise.settings || {};
        const newSettings = { ...currentSettings, ...settings };

        return await this.update(enterpriseId, { settings: newSettings });
    }

    /**
     * 获取企业统计信息
     */
    async getEnterpriseStats() {
        const sql = `
            SELECT 
                industry,
                scale,
                COUNT(*) as total_enterprises,
                SUM(is_active) as active_enterprises,
                AVG(DATEDIFF(NOW(), created_at)) as avg_days_since_created
            FROM ${this.tableName}
            WHERE deleted_at IS NULL
            GROUP BY industry, scale
            ORDER BY industry, scale
        `;

        try {
            const [rows] = await this.getConnection().execute(sql);
            return rows;
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }
}

module.exports = Enterprise;
