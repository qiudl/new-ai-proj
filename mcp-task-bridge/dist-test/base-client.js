import axios from 'axios';
import { MCPPermissionManager } from './permission-manager.js';
import { getGlobalContextManager } from './unified-user-context.js';
export class BaseClient {
    constructor(apiBase = 'http://localhost:8080/api/v1') {
        this.REFRESH_BUFFER_MS = 60 * 1000; // 提前60秒刷新
        this.apiBase = apiBase;
        // 获取全局统一上下文管理器
        this.contextManager = getGlobalContextManager(apiBase);
        // 从环境变量读取令牌（不再硬编码）。优先 TASK_API_TOKEN，兼容 API_TOKEN。
        const token = process.env.TASK_API_TOKEN || process.env.API_TOKEN;
        if (token && token.trim().length > 0) {
            this.authToken = token.trim();
            // 如果有令牌，尝试创建用户上下文
            this.initializeContextFromToken(this.authToken);
        }
        // 保持原有的权限管理器以向后兼容
        this.permissionManager = new MCPPermissionManager(apiBase, this.authToken, {
            enablePermissionCheck: process.env.MCP_ENABLE_PERMISSIONS !== 'false', // 默认启用
            cacheTTL: parseInt(process.env.MCP_CACHE_TIMEOUT || '300') // 默认5分钟
        });
    }
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json',
        };
        if (this.authToken) {
            headers['Authorization'] = `Bearer ${this.authToken}`;
        }
        return headers;
    }
    async makeRequest(method, url, data, params, _retry = false) {
        try {
            // 请求前确保Token有效（自动刷新）
            await this.ensureValidToken();
            // Debug safe-log: do not print token value
            console.error(`[HTTP] ${method} ${url} auth=${this.authToken ? 'present' : 'none'}`);
            const config = {
                method,
                url: `${this.apiBase}${url}`,
                headers: this.getHeaders(),
                data,
                params,
                // proxy: false
            };
            const response = await axios(config);
            // Debug: Log response structure for work notes
            if (url.includes('list-work-notes')) {
                console.error('[DEBUG] makeRequest response for list-work-notes:', JSON.stringify({
                    status: response.status,
                    dataKeys: response.data ? Object.keys(response.data) : 'no data',
                    hasData: !!response.data?.data,
                    dataDataKeys: response.data?.data ? Object.keys(response.data.data) : 'no data.data',
                    notesCount: response.data?.data?.notes?.length || 0,
                    total: response.data?.data?.total || 'no total'
                }, null, 2));
            }
            // 处理成功响应
            if (response.data && typeof response.data === 'object') {
                return response.data;
            }
            return {
                success: true,
                data: response.data,
                message: 'Request successful'
            };
        }
        catch (error) {
            // 如果是401错误且未重试过，尝试刷新Token后重试
            if (error.response?.status === 401 && !_retry && this.tokenState?.refreshToken) {
                console.error('[HTTP] 收到401错误，尝试刷新Token后重试...');
                try {
                    await this.refreshAccessToken();
                    // 重试请求（标记为已重试）
                    console.error('[HTTP] Token刷新成功，重试请求...');
                    return await this.makeRequest(method, url, data, params, true);
                }
                catch (refreshError) {
                    console.error('[HTTP] Token刷新失败，无法重试请求:', refreshError.message);
                    // 继续返回原始错误
                }
            }
            return this.handleError(error);
        }
    }
    handleError(error) {
        if (error.response) {
            // HTTP错误响应
            const status = error.response.status;
            const data = error.response.data;
            let errorMessage = 'Unknown error';
            if (data?.message) {
                errorMessage = data.message;
            }
            else if (data?.error) {
                errorMessage = typeof data.error === 'string' ? data.error : data.error.message || 'API Error';
            }
            else if (error.message) {
                errorMessage = error.message;
            }
            // 根据HTTP状态码提供友好的错误信息
            switch (status) {
                case 400:
                    return { success: false, error: `请求参数错误: ${errorMessage}` };
                case 401:
                    // 检查是否是Token过期错误
                    if (errorMessage.toLowerCase().includes('token') &&
                        (errorMessage.toLowerCase().includes('expired') ||
                            errorMessage.toLowerCase().includes('过期') ||
                            errorMessage.toLowerCase().includes('invalid'))) {
                        return { success: false, error: `Token已过期，请刷新Token后重试。提示：可使用 dev_quick_login 工具自动刷新` };
                    }
                    return { success: false, error: `认证失败，请检查API令牌: ${errorMessage}` };
                case 403:
                    return { success: false, error: `权限不足: ${errorMessage}` };
                case 404:
                    return { success: false, error: `资源不存在: ${errorMessage}` };
                case 422:
                    return { success: false, error: `数据验证失败: ${errorMessage}` };
                case 500:
                    return { success: false, error: `服务器内部错误: ${errorMessage}` };
                default:
                    return { success: false, error: `HTTP ${status}: ${errorMessage}` };
            }
        }
        else if (error.request) {
            // 网络错误 - 检查是否是ECONNREFUSED等连接问题
            const errorMsg = error.message || '';
            if (errorMsg.includes('ECONNREFUSED')) {
                return {
                    success: false,
                    error: '无法连接到后端服务，请检查服务器是否正常运行'
                };
            }
            else if (errorMsg.includes('ETIMEDOUT') || errorMsg.includes('timeout')) {
                return {
                    success: false,
                    error: '请求超时，请检查网络连接或服务器状态'
                };
            }
            else {
                return {
                    success: false,
                    error: `网络请求失败: ${errorMsg || '请检查服务器是否正常运行'}`
                };
            }
        }
        else {
            // 其他错误
            return {
                success: false,
                error: `请求失败: ${error.message || '未知错误'}`
            };
        }
    }
    // 权限检查装饰器辅助方法
    async checkPermission(operation, resourceType) {
        try {
            const res = await this.permissionManager.checkPermission(operation, undefined, resourceType);
            return !!res?.has_permission;
        }
        catch (error) {
            console.warn(`Permission check failed for ${operation}:`, error);
            // 如果权限检查失败，默认允许操作（向下兼容）
            return true;
        }
    }
    // 获取权限管理器实例
    getPermissionManager() {
        return this.permissionManager;
    }
    // 确保Token有效（自动刷新）
    async ensureValidToken() {
        if (!this.tokenState) {
            // 没有Token状态，跳过检查
            return;
        }
        const now = new Date();
        const timeUntilExpiry = this.tokenState.expiresAt.getTime() - now.getTime();
        // 如果Token即将过期（在缓冲时间内）或已过期
        if (timeUntilExpiry <= this.REFRESH_BUFFER_MS) {
            console.error('[TOKEN] Token即将过期，准备刷新...', {
                expiresAt: this.tokenState.expiresAt.toISOString(),
                timeUntilExpiry: Math.floor(timeUntilExpiry / 1000) + 's'
            });
            // 使用单例模式避免并发刷新
            if (!this.refreshPromise) {
                this.refreshPromise = this.refreshAccessToken()
                    .finally(() => {
                    this.refreshPromise = undefined;
                });
            }
            try {
                await this.refreshPromise;
            }
            catch (error) {
                console.error('[TOKEN] Token刷新失败:', error.message);
                // 不抛出错误，让请求继续尝试（可能会收到401）
            }
        }
    }
    // 刷新访问令牌
    async refreshAccessToken() {
        if (!this.tokenState?.refreshToken) {
            throw new Error('No refresh token available');
        }
        if (this.tokenState.refreshing) {
            console.error('[TOKEN] Token刷新已在进行中，跳过');
            return;
        }
        this.tokenState.refreshing = true;
        try {
            console.error('[TOKEN] 开始刷新访问令牌...');
            const response = await axios.post(`${this.apiBase}/auth/refresh`, {}, {
                headers: {
                    'Authorization': `Bearer ${this.tokenState.refreshToken}`,
                    'Content-Type': 'application/json'
                }
            });
            // 检查响应格式
            if (!response.data || !response.data.data) {
                throw new Error('Invalid refresh response format');
            }
            const { access_token, refresh_token, expires_in } = response.data.data;
            if (!access_token || !refresh_token || !expires_in) {
                throw new Error('Missing required fields in refresh response');
            }
            // 更新Token状态
            this.updateTokenState(access_token, refresh_token, expires_in);
            console.error('[TOKEN] 访问令牌刷新成功', {
                expiresIn: expires_in + 's',
                expiresAt: this.tokenState?.expiresAt.toISOString()
            });
        }
        catch (error) {
            console.error('[TOKEN] 刷新访问令牌失败:', {
                message: error.message,
                status: error.response?.status,
                data: error.response?.data
            });
            // 如果是401错误，可能Refresh Token也过期了
            if (error.response?.status === 401) {
                console.error('[TOKEN] Refresh Token可能已过期，需要重新登录');
                this.tokenState = undefined;
            }
            throw error;
        }
        finally {
            if (this.tokenState) {
                this.tokenState.refreshing = false;
            }
        }
    }
    // 更新Token状态
    updateTokenState(accessToken, refreshToken, expiresIn) {
        this.authToken = accessToken;
        this.tokenState = {
            accessToken,
            refreshToken,
            expiresAt: new Date(Date.now() + expiresIn * 1000),
            refreshing: false
        };
        // 通知权限管理器更新Token
        this.permissionManager.setAuth(accessToken);
        console.error('[TOKEN] Token状态已更新', {
            expiresAt: this.tokenState.expiresAt.toISOString()
        });
    }
    // 设置认证令牌
    setAuthToken(token) {
        this.authToken = token;
        this.permissionManager.setAuth(token);
        // 更新统一上下文
        this.initializeContextFromToken(token);
    }
    // 获取API基础URL
    getApiBase() {
        return this.apiBase;
    }
    // 初始化用户上下文从令牌
    async initializeContextFromToken(token) {
        try {
            const context = await this.contextManager.createContextFromToken(token);
            if (context) {
                console.error('[BASE_CLIENT] 用户上下文初始化成功:', context.username);
            }
        }
        catch (error) {
            console.error('[BASE_CLIENT] 用户上下文初始化失败:', error.message);
        }
    }
    // 通过开发环境快速登录设置上下文
    async devQuickLogin(username = 'admin') {
        try {
            const context = await this.contextManager.createContextFromDevLogin(username);
            if (context && context.token) {
                // 检查响应中是否包含refresh_token和expires_in
                const rawContext = context;
                if (rawContext.refreshToken && rawContext.expiresIn) {
                    // 初始化Token状态（支持自动刷新）
                    this.updateTokenState(context.token, rawContext.refreshToken, rawContext.expiresIn);
                    console.error('[BASE_CLIENT] 开发登录成功，Token自动刷新已启用');
                }
                else {
                    // 兼容模式：只设置访问Token
                    this.authToken = context.token;
                    this.permissionManager.setAuth(context.token, context.userId);
                    console.error('[BASE_CLIENT] 开发登录成功（兼容模式，无自动刷新）');
                }
                return {
                    success: true,
                    data: {
                        context: {
                            userId: context.userId,
                            username: context.username,
                            userRole: context.userRole,
                            userType: context.userType,
                            isSuperAdmin: context.isSuperAdmin
                        },
                        tokenState: this.tokenState ? {
                            expiresAt: this.tokenState.expiresAt.toISOString(),
                            hasRefreshToken: !!this.tokenState.refreshToken
                        } : null
                    },
                    message: `用户 ${username} 登录成功`,
                    token: context.token
                };
            }
            else {
                throw new Error('登录失败：无法创建用户上下文');
            }
        }
        catch (error) {
            console.error('[BASE_CLIENT] 开发登录失败:', error);
            return {
                success: false,
                error: `登录失败: ${error.message}`
            };
        }
    }
    // 获取当前用户上下文
    getCurrentUserContext() {
        return this.contextManager.getCurrentContext();
    }
    // 获取上下文状态
    getContextStatus() {
        return this.contextManager.getContextStatus();
    }
    // 统一权限检查方法
    async checkUnifiedPermission(permissionCode, resourceId, resourceType) {
        try {
            const result = await this.contextManager.checkPermission(permissionCode, resourceId, resourceType);
            return result.hasPermission;
        }
        catch (error) {
            console.warn('[BASE_CLIENT] 统一权限检查失败:', error);
            return false;
        }
    }
    // 设置API基础URL
    setApiBase(apiBase) {
        this.apiBase = apiBase;
        this.permissionManager.setApiBase(apiBase);
    }
}
