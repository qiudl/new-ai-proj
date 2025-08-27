// BaseModel.js - 基础模型类
// 提供所有模型的通用功能

const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

class BaseModel {
    constructor(tableName, primaryKey = 'id') {
        this.tableName = tableName;
        this.primaryKey = primaryKey;
        this.fillable = []; // 可批量赋值的字段
        this.hidden = []; // 隐藏字段（如密码）
        this.casts = {}; // 类型转换
        this.timestamps = true; // 是否自动维护时间戳
        this.softDeletes = false; // 是否支持软删除
        
        // 数据库连接池
        this.pool = null;
    }

    /**
     * 初始化数据库连接池
     */
    static initializePool(config) {
        BaseModel.pool = mysql.createPool({
            host: config.host || 'localhost',
            port: config.port || 3306,
            user: config.user || 'root',
            password: config.password || '',
            database: config.database,
            charset: 'utf8mb4',
            collation: 'utf8mb4_unicode_ci',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
            acquireTimeout: 60000,
            timeout: 60000,
            reconnect: true
        });
    }

    /**
     * 获取数据库连接
     */
    getConnection() {
        if (!BaseModel.pool) {
            throw new Error('Database pool not initialized. Call BaseModel.initializePool() first.');
        }
        return BaseModel.pool;
    }

    /**
     * 创建记录
     */
    async create(data) {
        const connection = this.getConnection();
        
        // 过滤可填充字段
        const filteredData = this.filterFillable(data);
        
        // 添加时间戳
        if (this.timestamps) {
            filteredData.created_at = new Date();
            filteredData.updated_at = new Date();
        }

        const fields = Object.keys(filteredData);
        const values = Object.values(filteredData);
        const placeholders = fields.map(() => '?').join(', ');

        const sql = `INSERT INTO ${this.tableName} (${fields.join(', ')}) VALUES (${placeholders})`;
        
        try {
            const [result] = await connection.execute(sql, values);
            return await this.findById(result.insertId);
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * 根据ID查找记录
     */
    async findById(id) {
        const connection = this.getConnection();
        
        let sql = `SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} = ?`;
        
        // 软删除支持
        if (this.softDeletes) {
            sql += ' AND deleted_at IS NULL';
        }

        try {
            const [rows] = await connection.execute(sql, [id]);
            if (rows.length === 0) {
                return null;
            }
            return this.transformRecord(rows[0]);
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * 查找多条记录
     */
    async findAll(conditions = {}, options = {}) {
        const connection = this.getConnection();
        
        const {
            select = '*',
            orderBy = `${this.primaryKey}`,
            order = 'DESC',
            limit = null,
            offset = 0
        } = options;

        let sql = `SELECT ${select} FROM ${this.tableName}`;
        const params = [];

        // 构建WHERE条件
        const whereConditions = [];
        
        // 软删除支持
        if (this.softDeletes) {
            whereConditions.push('deleted_at IS NULL');
        }

        // 添加查询条件
        for (const [field, value] of Object.entries(conditions)) {
            if (value !== undefined && value !== null) {
                whereConditions.push(`${field} = ?`);
                params.push(value);
            }
        }

        if (whereConditions.length > 0) {
            sql += ` WHERE ${whereConditions.join(' AND ')}`;
        }

        // 排序
        sql += ` ORDER BY ${orderBy} ${order}`;

        // 分页
        if (limit) {
            sql += ` LIMIT ? OFFSET ?`;
            params.push(limit, offset);
        }

        try {
            const [rows] = await connection.execute(sql, params);
            return rows.map(row => this.transformRecord(row));
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * 更新记录
     */
    async update(id, data) {
        const connection = this.getConnection();
        
        // 过滤可填充字段
        const filteredData = this.filterFillable(data);
        
        // 添加更新时间戳
        if (this.timestamps) {
            filteredData.updated_at = new Date();
        }

        const fields = Object.keys(filteredData);
        const values = Object.values(filteredData);
        const setClause = fields.map(field => `${field} = ?`).join(', ');

        let sql = `UPDATE ${this.tableName} SET ${setClause} WHERE ${this.primaryKey} = ?`;
        
        // 软删除支持
        if (this.softDeletes) {
            sql += ' AND deleted_at IS NULL';
        }

        values.push(id);

        try {
            const [result] = await connection.execute(sql, values);
            if (result.affectedRows === 0) {
                throw new Error('Record not found or already deleted');
            }
            return await this.findById(id);
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * 删除记录
     */
    async delete(id) {
        const connection = this.getConnection();

        let sql, params;

        if (this.softDeletes) {
            // 软删除
            sql = `UPDATE ${this.tableName} SET deleted_at = ? WHERE ${this.primaryKey} = ? AND deleted_at IS NULL`;
            params = [new Date(), id];
        } else {
            // 硬删除
            sql = `DELETE FROM ${this.tableName} WHERE ${this.primaryKey} = ?`;
            params = [id];
        }

        try {
            const [result] = await connection.execute(sql, params);
            return result.affectedRows > 0;
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * 统计记录数量
     */
    async count(conditions = {}) {
        const connection = this.getConnection();
        
        let sql = `SELECT COUNT(*) as total FROM ${this.tableName}`;
        const params = [];
        const whereConditions = [];

        // 软删除支持
        if (this.softDeletes) {
            whereConditions.push('deleted_at IS NULL');
        }

        // 添加查询条件
        for (const [field, value] of Object.entries(conditions)) {
            if (value !== undefined && value !== null) {
                whereConditions.push(`${field} = ?`);
                params.push(value);
            }
        }

        if (whereConditions.length > 0) {
            sql += ` WHERE ${whereConditions.join(' AND ')}`;
        }

        try {
            const [rows] = await connection.execute(sql, params);
            return parseInt(rows[0].total);
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * 分页查询
     */
    async paginate(page = 1, pageSize = 10, conditions = {}, options = {}) {
        const offset = (page - 1) * pageSize;
        
        const [data, total] = await Promise.all([
            this.findAll(conditions, { ...options, limit: pageSize, offset }),
            this.count(conditions)
        ]);

        return {
            data,
            pagination: {
                page,
                pageSize,
                total,
                totalPages: Math.ceil(total / pageSize),
                hasNext: page * pageSize < total,
                hasPrev: page > 1
            }
        };
    }

    /**
     * 过滤可填充字段
     */
    filterFillable(data) {
        if (this.fillable.length === 0) {
            return data;
        }

        const filtered = {};
        for (const field of this.fillable) {
            if (data.hasOwnProperty(field)) {
                filtered[field] = data[field];
            }
        }
        return filtered;
    }

    /**
     * 转换记录数据
     */
    transformRecord(record) {
        if (!record) return null;

        // 隐藏字段
        const transformed = { ...record };
        for (const field of this.hidden) {
            delete transformed[field];
        }

        // 类型转换
        for (const [field, type] of Object.entries(this.casts)) {
            if (transformed.hasOwnProperty(field)) {
                transformed[field] = this.castValue(transformed[field], type);
            }
        }

        return transformed;
    }

    /**
     * 类型转换
     */
    castValue(value, type) {
        if (value === null || value === undefined) {
            return value;
        }

        switch (type) {
            case 'boolean':
                return Boolean(value);
            case 'integer':
                return parseInt(value, 10);
            case 'float':
                return parseFloat(value);
            case 'json':
                return typeof value === 'string' ? JSON.parse(value) : value;
            case 'array':
                return Array.isArray(value) ? value : JSON.parse(value || '[]');
            case 'date':
                return new Date(value);
            default:
                return value;
        }
    }

    /**
     * 处理数据库错误
     */
    handleDatabaseError(error) {
        // 记录错误日志
        console.error('Database Error:', error);

        // 转换为应用错误
        if (error.code === 'ER_DUP_ENTRY') {
            return new Error('Duplicate entry: Record already exists');
        } else if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            return new Error('Foreign key constraint violation');
        } else if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return new Error('Cannot delete: Record is referenced by other records');
        } else {
            return new Error(`Database operation failed: ${error.message}`);
        }
    }

    /**
     * 开始事务
     */
    async beginTransaction() {
        const connection = await BaseModel.pool.getConnection();
        await connection.beginTransaction();
        return connection;
    }

    /**
     * 提交事务
     */
    async commitTransaction(connection) {
        await connection.commit();
        connection.release();
    }

    /**
     * 回滚事务
     */
    async rollbackTransaction(connection) {
        await connection.rollback();
        connection.release();
    }

    /**
     * 执行原生SQL
     */
    async query(sql, params = []) {
        const connection = this.getConnection();
        try {
            const [rows] = await connection.execute(sql, params);
            return rows;
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * 批量插入
     */
    async bulkCreate(dataArray) {
        if (!dataArray || dataArray.length === 0) {
            return [];
        }

        const connection = this.getConnection();
        const results = [];

        // 使用事务确保数据一致性
        const transactionConnection = await this.beginTransaction();

        try {
            for (const data of dataArray) {
                const filteredData = this.filterFillable(data);
                
                if (this.timestamps) {
                    filteredData.created_at = new Date();
                    filteredData.updated_at = new Date();
                }

                const fields = Object.keys(filteredData);
                const values = Object.values(filteredData);
                const placeholders = fields.map(() => '?').join(', ');

                const sql = `INSERT INTO ${this.tableName} (${fields.join(', ')}) VALUES (${placeholders})`;
                
                const [result] = await transactionConnection.execute(sql, values);
                results.push({ insertId: result.insertId, affectedRows: result.affectedRows });
            }

            await this.commitTransaction(transactionConnection);
            return results;
        } catch (error) {
            await this.rollbackTransaction(transactionConnection);
            throw this.handleDatabaseError(error);
        }
    }
}

module.exports = BaseModel;
