// index.js - 模型统一导出文件
const BaseModel = require('./BaseModel');
const User = require('./User');
const Role = require('./Role');
const Permission = require('./Permission');
const Enterprise = require('./Enterprise');
const PermissionAuditLog = require('./PermissionAuditLog');

// 模型实例化
const models = {
    BaseModel,
    User: new User(),
    Role: new Role(),
    Permission: new Permission(),
    Enterprise: new Enterprise(),
    PermissionAuditLog: new PermissionAuditLog()
};

// 数据库连接初始化
const initializeDatabase = (config) => {
    BaseModel.initializePool(config);
    console.log('Database connection pool initialized');
};

// 测试数据库连接
const testConnection = async () => {
    try {
        const connection = models.User.getConnection();
        const [rows] = await connection.execute('SELECT 1 as test');
        console.log('Database connection test successful:', rows[0]);
        return true;
    } catch (error) {
        console.error('Database connection test failed:', error);
        return false;
    }
};

// 权限检查助手函数
const checkUserPermission = async (userId, resource, action, context = null) => {
    try {
        const hasPermission = await models.User.hasPermission(userId, resource, action);
        
        // 记录权限检查日志
        await models.PermissionAuditLog.logPermissionCheck({
            user_id: userId,
            action: action,
            resource: resource,
            permission_code: `${resource}_${action.toUpperCase()}`,
            result: hasPermission ? 'GRANTED' : 'DENIED',
            reason: hasPermission ? '权限验证通过' : '缺少相应权限',
            context_data: context,
            execution_time_ms: Date.now() % 1000 // 简化的执行时间
        });

        return hasPermission;
    } catch (error) {
        console.error('Permission check error:', error);
        return false;
    }
};

// 用户认证助手函数
const authenticateUser = async (usernameOrEmail, password, context = {}) => {
    try {
        const result = await models.User.authenticate(usernameOrEmail, password);
        
        // 记录登录尝试日志
        await models.PermissionAuditLog.logPermissionCheck({
            user_id: result.user ? result.user.id : null,
            action: 'LOGIN',
            resource: 'AUTH',
            permission_code: 'AUTH_LOGIN',
            result: result.success ? 'GRANTED' : 'DENIED',
            reason: result.message,
            context_data: context,
            ip_address: context.ip_address,
            user_agent: context.user_agent
        });

        return result;
    } catch (error) {
        console.error('Authentication error:', error);
        return { success: false, message: '认证过程中发生错误' };
    }
};

// 角色分配助手函数
const assignRoleToUser = async (userId, roleId, assignedBy, options = {}) => {
    try {
        const result = await models.User.assignRole(userId, roleId, assignedBy, options);
        
        if (result) {
            // 记录角色分配日志
            await models.PermissionAuditLog.logPermissionCheck({
                user_id: assignedBy,
                action: 'ASSIGN_ROLE',
                resource: 'ROLE',
                resource_id: roleId.toString(),
                permission_code: 'ROLE_ASSIGN',
                result: 'GRANTED',
                reason: `角色分配给用户 ${userId}`,
                context_data: { target_user_id: userId, role_id: roleId, options }
            });
        }

        return result;
    } catch (error) {
        console.error('Role assignment error:', error);
        throw error;
    }
};

// 权限分配助手函数
const assignPermissionToRole = async (roleId, permissionId, grantType, createdBy, options = {}) => {
    try {
        const result = await models.Role.assignPermission(roleId, permissionId, grantType, options);
        
        if (result && createdBy) {
            // 记录权限分配日志
            await models.PermissionAuditLog.logPermissionCheck({
                user_id: createdBy,
                action: 'ASSIGN_PERMISSION',
                resource: 'PERMISSION',
                resource_id: permissionId.toString(),
                permission_code: 'PERMISSION_ASSIGN',
                result: 'GRANTED',
                reason: `权限分配给角色 ${roleId}`,
                context_data: { role_id: roleId, permission_id: permissionId, grant_type: grantType }
            });
        }

        return result;
    } catch (error) {
        console.error('Permission assignment error:', error);
        throw error;
    }
};

// 数据库健康检查
const healthCheck = async () => {
    try {
        const stats = await Promise.all([
            models.User.count(),
            models.Role.count(),
            models.Permission.count(),
            models.Enterprise.count()
        ]);

        return {
            status: 'healthy',
            counts: {
                users: stats[0],
                roles: stats[1],
                permissions: stats[2],
                enterprises: stats[3]
            },
            timestamp: new Date()
        };
    } catch (error) {
        return {
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date()
        };
    }
};

// 系统初始化检查
const systemInitCheck = async () => {
    try {
        // 检查是否有超级管理员用户
        const adminUsers = await models.User.findAll({ user_type: 'SYSTEM' }, { limit: 1 });
        
        // 检查是否有基础角色
        const systemRoles = await models.Role.findAll({ user_type: 'SYSTEM', is_system: true }, { limit: 1 });
        
        // 检查是否有基础权限
        const systemPermissions = await models.Permission.findAll({ is_system: true }, { limit: 1 });

        return {
            hasAdminUsers: adminUsers.length > 0,
            hasSystemRoles: systemRoles.length > 0,
            hasSystemPermissions: systemPermissions.length > 0,
            isInitialized: adminUsers.length > 0 && systemRoles.length > 0 && systemPermissions.length > 0
        };
    } catch (error) {
        console.error('System init check error:', error);
        return {
            hasAdminUsers: false,
            hasSystemRoles: false,
            hasSystemPermissions: false,
            isInitialized: false,
            error: error.message
        };
    }
};

// 清理过期数据
const cleanupExpiredData = async () => {
    try {
        const results = {
            auditLogs: 0,
            expiredRoles: 0,
            expiredPermissions: 0
        };

        // 清理90天前的审计日志
        results.auditLogs = await models.PermissionAuditLog.cleanupOldLogs(90);

        // 清理过期的用户角色关联
        const connection = models.User.getConnection();
        const [expiredRolesResult] = await connection.execute(
            'UPDATE user_roles SET is_active = 0 WHERE expires_at IS NOT NULL AND expires_at < NOW()'
        );
        results.expiredRoles = expiredRolesResult.affectedRows;

        // 清理过期的角色权限关联
        const [expiredPermResult] = await connection.execute(
            'DELETE FROM role_permissions WHERE expires_at IS NOT NULL AND expires_at < NOW()'
        );
        results.expiredPermissions = expiredPermResult.affectedRows;

        console.log('Cleanup completed:', results);
        return results;
    } catch (error) {
        console.error('Cleanup error:', error);
        throw error;
    }
};

module.exports = {
    // 模型
    models,
    BaseModel,
    User,
    Role,
    Permission,
    Enterprise,
    PermissionAuditLog,

    // 初始化函数
    initializeDatabase,
    testConnection,

    // 助手函数
    checkUserPermission,
    authenticateUser,
    assignRoleToUser,
    assignPermissionToRole,

    // 系统管理函数
    healthCheck,
    systemInitCheck,
    cleanupExpiredData
};
