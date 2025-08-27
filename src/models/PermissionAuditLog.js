// PermissionAuditLog.js - 权限审计日志模型
const BaseModel = require('./BaseModel');

class PermissionAuditLog extends BaseModel {
    constructor() {
        super('permission_audit_logs', 'id');
        
        this.fillable = [
            'user_id', 'session_id', 'action', 'resource', 'resource_id',
            'permission_code', 'result', 'reason', 'risk_score', 'context_data',
            'ip_address', 'user_agent', 'device_info', 'location_info', 'execution_time_ms'
        ];
        
        this.casts = {
            'user_id': 'integer',
            'risk_score': 'integer',
            'execution_time_ms': 'integer',
            'context_data': 'json',
            'device_info': 'json',
            'location_info': 'json'
        };
        
        this.timestamps = false; // 只有 created_at
        this.softDeletes = false; // 审计日志不删除
    }

    /**
     * 记录权限检查日志
     */
    async logPermissionCheck(data) {
        const logData = {
            ...data,
            created_at: new Date()
        };

        return await this.create(logData);
    }

    /**
     * 获取用户权限使用日志
     */
    async getUserPermissionLogs(userId, options = {}) {
        const {
            startDate = null,
            endDate = null,
            result = null,
            limit = 50,
            offset = 0
        } = options;

        const connection = this.getConnection();
        
        let sql = `
            SELECT * FROM ${this.tableName}
            WHERE user_id = ?
        `;
        
        const params = [userId];

        if (startDate) {
            sql += ' AND created_at >= ?';
            params.push(startDate);
        }

        if (endDate) {
            sql += ' AND created_at <= ?';
            params.push(endDate);
        }

        if (result) {
            sql += ' AND result = ?';
            params.push(result);
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
     * 获取权限拒绝日志
     */
    async getPermissionDeniedLogs(options = {}) {
        const {
            userId = null,
            resource = null,
            startDate = null,
            endDate = null,
            limit = 100,
            offset = 0
        } = options;

        const connection = this.getConnection();
        
        let sql = `
            SELECT pal.*, u.username, u.email
            FROM ${this.tableName} pal
            INNER JOIN users u ON pal.user_id = u.id
            WHERE pal.result = 'DENIED'
        `;
        
        const params = [];

        if (userId) {
            sql += ' AND pal.user_id = ?';
            params.push(userId);
        }

        if (resource) {
            sql += ' AND pal.resource = ?';
            params.push(resource);
        }

        if (startDate) {
            sql += ' AND pal.created_at >= ?';
            params.push(startDate);
        }

        if (endDate) {
            sql += ' AND pal.created_at <= ?';
            params.push(endDate);
        }

        sql += ' ORDER BY pal.created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        try {
            const [rows] = await connection.execute(sql, params);
            return rows;
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * 获取权限使用统计
     */
    async getPermissionUsageStats(options = {}) {
        const {
            startDate = null,
            endDate = null,
            userId = null,
            groupBy = 'permission_code'
        } = options;

        const connection = this.getConnection();
        
        let sql = `
            SELECT 
                ${groupBy},
                COUNT(*) as total_checks,
                SUM(CASE WHEN result = 'GRANTED' THEN 1 ELSE 0 END) as granted_count,
                SUM(CASE WHEN result = 'DENIED' THEN 1 ELSE 0 END) as denied_count,
                AVG(execution_time_ms) as avg_execution_time,
                AVG(risk_score) as avg_risk_score
            FROM ${this.tableName}
            WHERE 1=1
        `;
        
        const params = [];

        if (startDate) {
            sql += ' AND created_at >= ?';
            params.push(startDate);
        }

        if (endDate) {
            sql += ' AND created_at <= ?';
            params.push(endDate);
        }

        if (userId) {
            sql += ' AND user_id = ?';
            params.push(userId);
        }

        sql += ` GROUP BY ${groupBy} ORDER BY total_checks DESC`;

        try {
            const [rows] = await connection.execute(sql, params);
            return rows;
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * 获取高风险操作日志
     */
    async getHighRiskLogs(options = {}) {
        const {
            riskThreshold = 70,
            startDate = null,
            endDate = null,
            limit = 50,
            offset = 0
        } = options;

        const connection = this.getConnection();
        
        let sql = `
            SELECT pal.*, u.username, u.email, u.user_type
            FROM ${this.tableName} pal
            INNER JOIN users u ON pal.user_id = u.id
            WHERE pal.risk_score >= ?
        `;
        
        const params = [riskThreshold];

        if (startDate) {
            sql += ' AND pal.created_at >= ?';
            params.push(startDate);
        }

        if (endDate) {
            sql += ' AND pal.created_at <= ?';
            params.push(endDate);
        }

        sql += ' ORDER BY pal.risk_score DESC, pal.created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        try {
            const [rows] = await connection.execute(sql, params);
            return rows;
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * 获取异常访问模式
     */
    async getAnomalousAccessPatterns(options = {}) {
        const {
            userId = null,
            hoursWindow = 24,
            minAttempts = 10
        } = options;

        const connection = this.getConnection();
        
        let sql = `
            SELECT 
                user_id,
                ip_address,
                resource,
                action,
                COUNT(*) as attempt_count,
                SUM(CASE WHEN result = 'DENIED' THEN 1 ELSE 0 END) as denied_count,
                MIN(created_at) as first_attempt,
                MAX(created_at) as last_attempt
            FROM ${this.tableName}
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)
        `;
        
        const params = [hoursWindow];

        if (userId) {
            sql += ' AND user_id = ?';
            params.push(userId);
        }

        sql += `
            GROUP BY user_id, ip_address, resource, action
            HAVING attempt_count >= ?
            ORDER BY denied_count DESC, attempt_count DESC
        `;
        params.push(minAttempts);

        try {
            const [rows] = await connection.execute(sql, params);
            return rows;
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * 清理历史日志
     */
    async cleanupOldLogs(daysToKeep = 90) {
        const connection = this.getConnection();
        
        const sql = `
            DELETE FROM ${this.tableName}
            WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
        `;

        try {
            const [result] = await connection.execute(sql, [daysToKeep]);
            return result.affectedRows;
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * 获取访问热力图数据
     */
    async getAccessHeatmapData(options = {}) {
        const {
            startDate = null,
            endDate = null,
            groupBy = 'hour'
        } = options;

        const connection = this.getConnection();
        
        let timeFormat;
        switch (groupBy) {
            case 'hour':
                timeFormat = '%Y-%m-%d %H:00:00';
                break;
            case 'day':
                timeFormat = '%Y-%m-%d';
                break;
            case 'week':
                timeFormat = '%Y-%u';
                break;
            default:
                timeFormat = '%Y-%m-%d %H:00:00';
        }

        let sql = `
            SELECT 
                DATE_FORMAT(created_at, '${timeFormat}') as time_period,
                COUNT(*) as total_requests,
                SUM(CASE WHEN result = 'GRANTED' THEN 1 ELSE 0 END) as granted_requests,
                SUM(CASE WHEN result = 'DENIED' THEN 1 ELSE 0 END) as denied_requests,
                COUNT(DISTINCT user_id) as unique_users
            FROM ${this.tableName}
            WHERE 1=1
        `;
        
        const params = [];

        if (startDate) {
            sql += ' AND created_at >= ?';
            params.push(startDate);
        }

        if (endDate) {
            sql += ' AND created_at <= ?';
            params.push(endDate);
        }

        sql += ' GROUP BY time_period ORDER BY time_period ASC';

        try {
            const [rows] = await connection.execute(sql, params);
            return rows;
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * 获取用户行为分析
     */
    async getUserBehaviorAnalysis(userId, days = 30) {
        const connection = this.getConnection();
        
        const sql = `
            SELECT 
                HOUR(created_at) as hour_of_day,
                DAYOFWEEK(created_at) as day_of_week,
                resource,
                action,
                COUNT(*) as access_count,
                AVG(execution_time_ms) as avg_response_time,
                SUM(CASE WHEN result = 'DENIED' THEN 1 ELSE 0 END) as denied_count
            FROM ${this.tableName}
            WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY hour_of_day, day_of_week, resource, action
            ORDER BY access_count DESC
        `;

        try {
            const [rows] = await connection.execute(sql, [userId, days]);
            return rows;
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }
}

module.exports = PermissionAuditLog;
