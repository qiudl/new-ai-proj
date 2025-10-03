/**
 * 统一用户权限上下文管理
 * 为MCP服务器和Claude Tools提供一致的用户权限上下文
 */
import { MCPPermissionManager } from './permission-manager.js';
/**
 * 统一用户上下文管理器
 * 整合用户认证、权限检查和上下文管理功能
 */
export class UnifiedUserContextManager {
    constructor(apiBase, options) {
        this.currentContext = null;
        // 缓存配置
        this.PERMISSIONS_CACHE_TTL = 5 * 60 * 1000; // 5分钟
        this.CONTEXT_REFRESH_INTERVAL = 10 * 60 * 1000; // 10分钟
        this.apiBase = apiBase;
        this.enableDebugLog = options?.enableDebugLog ?? false;
        // 初始化权限管理器
        this.permissionManager = new MCPPermissionManager(apiBase, undefined, // 令牌稍后设置
        {
            enablePermissionCheck: true,
            cachePermissions: true,
            cacheTTL: options?.permissionCacheTTL ?? 300,
            debugMode: this.enableDebugLog
        });
        if (this.enableDebugLog) {
            console.error('[UNIFIED_CTX] 统一用户上下文管理器已初始化');
        }
    }
    /**
     * 设置当前用户上下文
     */
    setUserContext(context) {
        this.currentContext = {
            ...context,
            requestId: context.requestId || this.generateRequestId(),
            clientInfo: {
                clientType: 'mcp',
                ...context.clientInfo
            }
        };
        // 更新权限管理器的认证信息
        if (context.token) {
            this.permissionManager.setAuth(context.token, context.userId);
        }
        if (this.enableDebugLog) {
            console.error('[UNIFIED_CTX] 用户上下文已更新:', {
                userId: context.userId,
                username: context.username,
                userRole: context.userRole,
                isSuperAdmin: context.isSuperAdmin,
                hasToken: !!context.token
            });
        }
    }
    /**
     * 获取当前用户上下文
     */
    getCurrentContext() {
        return this.currentContext;
    }
    /**
     * 从JWT令牌创建用户上下文
     */
    async createContextFromToken(token) {
        try {
            // 解析JWT令牌（这里简化处理，实际应该验证签名）
            const payload = this.parseJWTPayload(token);
            if (!payload) {
                return null;
            }
            const context = {
                userId: payload.user_id || payload.sub,
                username: payload.username,
                email: payload.email,
                userRole: payload.role || 'user',
                userType: payload.user_type || 'regular',
                isSuperAdmin: this.checkSuperAdminFromPayload(payload),
                token,
                tokenExpiry: new Date(payload.exp * 1000),
                requestId: this.generateRequestId()
            };
            // 设置上下文
            this.setUserContext(context);
            // 异步获取用户权限列表
            this.refreshUserPermissions().catch(err => {
                console.error('[UNIFIED_CTX] 获取用户权限失败:', err);
            });
            return context;
        }
        catch (error) {
            console.error('[UNIFIED_CTX] 从令牌创建上下文失败:', error);
            return null;
        }
    }
    /**
     * 通过开发环境快速登录创建上下文
     */
    async createContextFromDevLogin(username = 'admin') {
        try {
            const response = await fetch(`${this.apiBase}/auth/dev-quick-login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username }),
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const data = await response.json();
            if (data.success && (data.data?.access_token || data.token)) {
                const token = data.data?.access_token || data.token;
                const context = await this.createContextFromToken(token);
                // 附加refresh_token和expires_in信息到上下文
                if (context && data.data) {
                    context.refreshToken = data.data.refresh_token;
                    context.expiresIn = data.data.expires_in;
                    console.error('[UNIFIED_CTX] 开发登录成功，包含刷新Token信息');
                }
                return context;
            }
            else {
                throw new Error(data.error || 'Login failed');
            }
        }
        catch (error) {
            console.error('[UNIFIED_CTX] 开发登录失败:', error);
            return null;
        }
    }
    /**
     * 检查权限
     */
    async checkPermission(permissionCode, resourceId, resourceType) {
        if (!this.currentContext) {
            return {
                hasPermission: false,
                reason: '用户未认证',
                source: 'error'
            };
        }
        // 超级管理员检查
        if (this.currentContext.isSuperAdmin) {
            return {
                hasPermission: true,
                reason: '超级管理员权限',
                source: 'super_admin',
                userContext: this.currentContext
            };
        }
        // 检查权限缓存
        if (this.isPermissionCached(permissionCode)) {
            const cached = this.getCachedPermission(permissionCode);
            if (cached !== null) {
                return {
                    hasPermission: cached,
                    reason: cached ? '权限已缓存' : '权限已缓存（无权限）',
                    source: 'cache',
                    userContext: this.currentContext
                };
            }
        }
        // 调用权限管理器进行检查
        try {
            const result = await this.permissionManager.checkPermission(permissionCode, resourceId, resourceType);
            // 缓存结果
            this.cachePermissionResult(permissionCode, result.has_permission);
            return {
                hasPermission: result.has_permission,
                reason: result.reason || '权限检查完成',
                source: 'api',
                userContext: this.currentContext
            };
        }
        catch (error) {
            console.error('[UNIFIED_CTX] 权限检查失败:', error);
            // 回退逻辑
            const fallbackResult = this.fallbackPermissionCheck(permissionCode);
            return {
                hasPermission: fallbackResult,
                reason: `权限检查失败，使用回退逻辑: ${error.message}`,
                source: 'fallback',
                userContext: this.currentContext
            };
        }
    }
    /**
     * 批量检查权限
     */
    async checkBatchPermissions(permissions) {
        const results = {};
        // 检查是否有用户上下文
        if (!this.currentContext) {
            permissions.forEach(perm => {
                results[perm.permissionCode] = {
                    hasPermission: false,
                    reason: '用户未认证',
                    source: 'error'
                };
            });
            return results;
        }
        // 如果是超级管理员，直接返回全部允许
        if (this.currentContext.isSuperAdmin) {
            permissions.forEach(perm => {
                results[perm.permissionCode] = {
                    hasPermission: true,
                    reason: '超级管理员权限',
                    source: 'super_admin',
                    userContext: this.currentContext
                };
            });
            return results;
        }
        // 逐个检查权限（可以考虑优化为真正的批量调用）
        for (const perm of permissions) {
            results[perm.permissionCode] = await this.checkPermission(perm.permissionCode, perm.resourceId, perm.resourceType);
        }
        return results;
    }
    /**
     * 刷新用户权限列表
     */
    async refreshUserPermissions() {
        if (!this.currentContext?.token) {
            return [];
        }
        try {
            const response = await fetch(`${this.apiBase}/auth/user-permissions`, {
                headers: {
                    'Authorization': `Bearer ${this.currentContext.token}`,
                    'Content-Type': 'application/json',
                },
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const data = await response.json();
            if (data.success && data.data?.permissions) {
                this.currentContext.permissions = data.data.permissions;
                this.currentContext.permissionsCachedAt = new Date();
                if (this.enableDebugLog) {
                    console.error('[UNIFIED_CTX] 用户权限列表已刷新:', data.data.permissions);
                }
                return data.data.permissions;
            }
            return [];
        }
        catch (error) {
            console.error('[UNIFIED_CTX] 刷新用户权限失败:', error);
            return [];
        }
    }
    /**
     * 清除当前用户上下文
     */
    clearContext() {
        this.currentContext = null;
        this.permissionManager.setAuth('');
        if (this.enableDebugLog) {
            console.error('[UNIFIED_CTX] 用户上下文已清除');
        }
    }
    /**
     * 获取上下文状态信息
     */
    getContextStatus() {
        return {
            isAuthenticated: !!this.currentContext,
            user: this.currentContext ? {
                userId: this.currentContext.userId,
                username: this.currentContext.username,
                userRole: this.currentContext.userRole,
                userType: this.currentContext.userType,
                isSuperAdmin: this.currentContext.isSuperAdmin,
                permissionsCount: this.currentContext.permissions?.length || 0
            } : undefined,
            permissionManagerStatus: this.permissionManager.getStatus()
        };
    }
    // 私有辅助方法
    parseJWTPayload(token) {
        try {
            const parts = token.split('.');
            if (parts.length !== 3) {
                return null;
            }
            const payload = parts[1];
            const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
            return JSON.parse(decoded);
        }
        catch (error) {
            console.error('[UNIFIED_CTX] JWT解析失败:', error);
            return null;
        }
    }
    checkSuperAdminFromPayload(payload) {
        const username = payload.username || payload.sub;
        const role = payload.role;
        const userType = payload.user_type;
        return (username === 'admin' || role === 'admin') && userType === 'system';
    }
    generateRequestId() {
        return `mcp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    isPermissionCached(permissionCode) {
        if (!this.currentContext?.permissions || !this.currentContext?.permissionsCachedAt) {
            return false;
        }
        const cacheAge = Date.now() - this.currentContext.permissionsCachedAt.getTime();
        return cacheAge < this.PERMISSIONS_CACHE_TTL;
    }
    getCachedPermission(permissionCode) {
        if (!this.currentContext?.permissions) {
            return null;
        }
        return this.currentContext.permissions.includes(permissionCode);
    }
    cachePermissionResult(permissionCode, hasPermission) {
        if (!this.currentContext) {
            return;
        }
        if (!this.currentContext.permissions) {
            this.currentContext.permissions = [];
        }
        if (hasPermission && !this.currentContext.permissions.includes(permissionCode)) {
            this.currentContext.permissions.push(permissionCode);
        }
        else if (!hasPermission && this.currentContext.permissions.includes(permissionCode)) {
            this.currentContext.permissions = this.currentContext.permissions.filter(p => p !== permissionCode);
        }
        this.currentContext.permissionsCachedAt = new Date();
    }
    fallbackPermissionCheck(permissionCode) {
        if (!this.currentContext) {
            return false;
        }
        const { userRole, userType } = this.currentContext;
        // Admin角色拥有所有权限
        if (userRole === 'admin') {
            return true;
        }
        // System用户拥有大部分权限
        if (userType === 'system') {
            return true;
        }
        // 基于权限码的基本检查
        switch (permissionCode) {
            case 'task.read':
            case 'task.list.read':
            case 'document.read':
            case 'worknote.list.read':
                return true; // 读权限对所有认证用户开放
            case 'task.create':
            case 'task.update':
            case 'document.create':
            case 'worknote.create':
                return userRole === 'admin' || userRole === 'editor';
            case 'task.delete':
            case 'document.delete':
                return userRole === 'admin';
            default:
                return userRole === 'admin'; // 未知权限默认需要管理员权限
        }
    }
}
/**
 * 全局统一用户上下文管理器实例
 */
let globalContextManager = null;
/**
 * 获取全局统一用户上下文管理器
 */
export function getGlobalContextManager(apiBase) {
    if (!globalContextManager) {
        if (!apiBase) {
            throw new Error('API base URL is required for first initialization');
        }
        globalContextManager = new UnifiedUserContextManager(apiBase, {
            enableDebugLog: process.env.MCP_DEBUG === 'true'
        });
    }
    return globalContextManager;
}
/**
 * 重置全局上下文管理器（主要用于测试）
 */
export function resetGlobalContextManager() {
    globalContextManager = null;
}
/**
 * 统一权限检查装饰器
 * 用于为MCP方法添加统一的权限检查
 */
export function requiresUnifiedPermission(permissionCode, resourceType) {
    return function (target, propertyName, descriptor) {
        if (!descriptor) {
            descriptor = {
                value: target[propertyName],
                writable: true,
                enumerable: true,
                configurable: true
            };
        }
        const originalMethod = descriptor.value;
        if (!originalMethod || typeof originalMethod !== 'function') {
            console.error(`[UNIFIED_CTX] No method found for ${propertyName}`);
            return descriptor;
        }
        descriptor.value = async function (...args) {
            // 获取统一上下文管理器
            const contextManager = globalContextManager;
            if (!contextManager) {
                console.error('[UNIFIED_CTX] No global context manager available');
                return {
                    success: false,
                    error: '用户上下文管理器未初始化',
                    permission_required: permissionCode
                };
            }
            // 提取资源ID（如果需要）
            let resourceId;
            if (args.length > 0) {
                const firstArg = args[0];
                if (typeof firstArg === 'number') {
                    resourceId = firstArg;
                }
                else if (typeof firstArg === 'object' && firstArg && 'id' in firstArg) {
                    resourceId = firstArg.id;
                }
            }
            try {
                // 执行统一权限检查
                const permissionResult = await contextManager.checkPermission(permissionCode, resourceId, resourceType);
                if (!permissionResult.hasPermission) {
                    return {
                        success: false,
                        error: `权限不足: ${permissionResult.reason}`,
                        permission_required: permissionCode,
                        resource_type: resourceType,
                        resource_id: resourceId,
                        check_source: permissionResult.source,
                        user_context: permissionResult.userContext
                    };
                }
                // 权限检查通过，执行原方法
                return await originalMethod.apply(this, args);
            }
            catch (error) {
                console.error('[UNIFIED_CTX] Permission check error for', permissionCode, ':', error.message);
                return {
                    success: false,
                    error: `权限验证失败: ${error.message}`,
                    permission_required: permissionCode,
                    command: propertyName
                };
            }
        };
        return descriptor;
    };
}
