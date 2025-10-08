"use strict";
/**
 * 统一用户权限上下文管理
 * 为MCP服务器和Claude Tools提供一致的用户权限上下文
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnifiedUserContextManager = void 0;
exports.getGlobalContextManager = getGlobalContextManager;
exports.resetGlobalContextManager = resetGlobalContextManager;
exports.requiresUnifiedPermission = requiresUnifiedPermission;
var permission_manager_js_1 = require("./permission-manager.js");
/**
 * 统一用户上下文管理器
 * 整合用户认证、权限检查和上下文管理功能
 */
var UnifiedUserContextManager = /** @class */ (function () {
    function UnifiedUserContextManager(apiBase, options) {
        var _a, _b;
        this.currentContext = null;
        // 缓存配置
        this.PERMISSIONS_CACHE_TTL = 5 * 60 * 1000; // 5分钟
        this.CONTEXT_REFRESH_INTERVAL = 10 * 60 * 1000; // 10分钟
        this.apiBase = apiBase;
        this.enableDebugLog = (_a = options === null || options === void 0 ? void 0 : options.enableDebugLog) !== null && _a !== void 0 ? _a : false;
        // 初始化权限管理器
        this.permissionManager = new permission_manager_js_1.MCPPermissionManager(apiBase, undefined, // 令牌稍后设置
        {
            enablePermissionCheck: true,
            cachePermissions: true,
            cacheTTL: (_b = options === null || options === void 0 ? void 0 : options.permissionCacheTTL) !== null && _b !== void 0 ? _b : 300,
            debugMode: this.enableDebugLog
        });
        if (this.enableDebugLog) {
            console.error('[UNIFIED_CTX] 统一用户上下文管理器已初始化');
        }
    }
    /**
     * 设置当前用户上下文
     */
    UnifiedUserContextManager.prototype.setUserContext = function (context) {
        this.currentContext = __assign(__assign({}, context), { requestId: context.requestId || this.generateRequestId(), clientInfo: __assign({ clientType: 'mcp' }, context.clientInfo) });
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
    };
    /**
     * 获取当前用户上下文
     */
    UnifiedUserContextManager.prototype.getCurrentContext = function () {
        return this.currentContext;
    };
    /**
     * 从JWT令牌创建用户上下文
     */
    UnifiedUserContextManager.prototype.createContextFromToken = function (token) {
        return __awaiter(this, void 0, void 0, function () {
            var payload, context;
            return __generator(this, function (_a) {
                try {
                    payload = this.parseJWTPayload(token);
                    if (!payload) {
                        return [2 /*return*/, null];
                    }
                    context = {
                        userId: payload.user_id || payload.sub,
                        username: payload.username,
                        email: payload.email,
                        userRole: payload.role || 'user',
                        userType: payload.user_type || 'regular',
                        isSuperAdmin: this.checkSuperAdminFromPayload(payload),
                        token: token,
                        tokenExpiry: new Date(payload.exp * 1000),
                        requestId: this.generateRequestId()
                    };
                    // 设置上下文
                    this.setUserContext(context);
                    // 异步获取用户权限列表
                    this.refreshUserPermissions().catch(function (err) {
                        console.error('[UNIFIED_CTX] 获取用户权限失败:', err);
                    });
                    return [2 /*return*/, context];
                }
                catch (error) {
                    console.error('[UNIFIED_CTX] 从令牌创建上下文失败:', error);
                    return [2 /*return*/, null];
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * 通过开发环境快速登录创建上下文
     */
    UnifiedUserContextManager.prototype.createContextFromDevLogin = function () {
        return __awaiter(this, arguments, void 0, function (username) {
            var response, data, token, context, error_1;
            var _a, _b;
            if (username === void 0) { username = 'admin'; }
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 6, , 7]);
                        return [4 /*yield*/, fetch("".concat(this.apiBase, "/auth/dev-quick-login"), {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({ username: username }),
                            })];
                    case 1:
                        response = _c.sent();
                        if (!response.ok) {
                            throw new Error("HTTP ".concat(response.status));
                        }
                        return [4 /*yield*/, response.json()];
                    case 2:
                        data = _c.sent();
                        if (!(data.success && (((_a = data.data) === null || _a === void 0 ? void 0 : _a.access_token) || data.token))) return [3 /*break*/, 4];
                        token = ((_b = data.data) === null || _b === void 0 ? void 0 : _b.access_token) || data.token;
                        return [4 /*yield*/, this.createContextFromToken(token)];
                    case 3:
                        context = _c.sent();
                        // 附加refresh_token和expires_in信息到上下文
                        if (context && data.data) {
                            context.refreshToken = data.data.refresh_token;
                            context.expiresIn = data.data.expires_in;
                            console.error('[UNIFIED_CTX] 开发登录成功，包含刷新Token信息');
                        }
                        return [2 /*return*/, context];
                    case 4: throw new Error(data.error || 'Login failed');
                    case 5: return [3 /*break*/, 7];
                    case 6:
                        error_1 = _c.sent();
                        console.error('[UNIFIED_CTX] 开发登录失败:', error_1);
                        return [2 /*return*/, null];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 检查权限
     */
    UnifiedUserContextManager.prototype.checkPermission = function (permissionCode, resourceId, resourceType) {
        return __awaiter(this, void 0, void 0, function () {
            var cached, result, error_2, fallbackResult;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.currentContext) {
                            return [2 /*return*/, {
                                    hasPermission: false,
                                    reason: '用户未认证',
                                    source: 'error'
                                }];
                        }
                        // 超级管理员检查
                        if (this.currentContext.isSuperAdmin) {
                            return [2 /*return*/, {
                                    hasPermission: true,
                                    reason: '超级管理员权限',
                                    source: 'super_admin',
                                    userContext: this.currentContext
                                }];
                        }
                        // 检查权限缓存
                        if (this.isPermissionCached(permissionCode)) {
                            cached = this.getCachedPermission(permissionCode);
                            if (cached !== null) {
                                return [2 /*return*/, {
                                        hasPermission: cached,
                                        reason: cached ? '权限已缓存' : '权限已缓存（无权限）',
                                        source: 'cache',
                                        userContext: this.currentContext
                                    }];
                            }
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.permissionManager.checkPermission(permissionCode, resourceId, resourceType)];
                    case 2:
                        result = _a.sent();
                        // 缓存结果
                        this.cachePermissionResult(permissionCode, result.has_permission);
                        return [2 /*return*/, {
                                hasPermission: result.has_permission,
                                reason: result.reason || '权限检查完成',
                                source: 'api',
                                userContext: this.currentContext
                            }];
                    case 3:
                        error_2 = _a.sent();
                        console.error('[UNIFIED_CTX] 权限检查失败:', error_2);
                        fallbackResult = this.fallbackPermissionCheck(permissionCode);
                        return [2 /*return*/, {
                                hasPermission: fallbackResult,
                                reason: "\u6743\u9650\u68C0\u67E5\u5931\u8D25\uFF0C\u4F7F\u7528\u56DE\u9000\u903B\u8F91: ".concat(error_2.message),
                                source: 'fallback',
                                userContext: this.currentContext
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 批量检查权限
     */
    UnifiedUserContextManager.prototype.checkBatchPermissions = function (permissions) {
        return __awaiter(this, void 0, void 0, function () {
            var results, _i, permissions_1, perm, _a, _b;
            var _this = this;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        results = {};
                        // 检查是否有用户上下文
                        if (!this.currentContext) {
                            permissions.forEach(function (perm) {
                                results[perm.permissionCode] = {
                                    hasPermission: false,
                                    reason: '用户未认证',
                                    source: 'error'
                                };
                            });
                            return [2 /*return*/, results];
                        }
                        // 如果是超级管理员，直接返回全部允许
                        if (this.currentContext.isSuperAdmin) {
                            permissions.forEach(function (perm) {
                                results[perm.permissionCode] = {
                                    hasPermission: true,
                                    reason: '超级管理员权限',
                                    source: 'super_admin',
                                    userContext: _this.currentContext
                                };
                            });
                            return [2 /*return*/, results];
                        }
                        _i = 0, permissions_1 = permissions;
                        _c.label = 1;
                    case 1:
                        if (!(_i < permissions_1.length)) return [3 /*break*/, 4];
                        perm = permissions_1[_i];
                        _a = results;
                        _b = perm.permissionCode;
                        return [4 /*yield*/, this.checkPermission(perm.permissionCode, perm.resourceId, perm.resourceType)];
                    case 2:
                        _a[_b] = _c.sent();
                        _c.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/, results];
                }
            });
        });
    };
    /**
     * 刷新用户权限列表
     */
    UnifiedUserContextManager.prototype.refreshUserPermissions = function () {
        return __awaiter(this, void 0, void 0, function () {
            var response, data, error_3;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (!((_a = this.currentContext) === null || _a === void 0 ? void 0 : _a.token)) {
                            return [2 /*return*/, []];
                        }
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 4, , 5]);
                        return [4 /*yield*/, fetch("".concat(this.apiBase, "/auth/user-permissions"), {
                                headers: {
                                    'Authorization': "Bearer ".concat(this.currentContext.token),
                                    'Content-Type': 'application/json',
                                },
                            })];
                    case 2:
                        response = _c.sent();
                        if (!response.ok) {
                            throw new Error("HTTP ".concat(response.status));
                        }
                        return [4 /*yield*/, response.json()];
                    case 3:
                        data = _c.sent();
                        if (data.success && ((_b = data.data) === null || _b === void 0 ? void 0 : _b.permissions)) {
                            this.currentContext.permissions = data.data.permissions;
                            this.currentContext.permissionsCachedAt = new Date();
                            if (this.enableDebugLog) {
                                console.error('[UNIFIED_CTX] 用户权限列表已刷新:', data.data.permissions);
                            }
                            return [2 /*return*/, data.data.permissions];
                        }
                        return [2 /*return*/, []];
                    case 4:
                        error_3 = _c.sent();
                        console.error('[UNIFIED_CTX] 刷新用户权限失败:', error_3);
                        return [2 /*return*/, []];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 清除当前用户上下文
     */
    UnifiedUserContextManager.prototype.clearContext = function () {
        this.currentContext = null;
        this.permissionManager.setAuth('');
        if (this.enableDebugLog) {
            console.error('[UNIFIED_CTX] 用户上下文已清除');
        }
    };
    /**
     * 获取上下文状态信息
     */
    UnifiedUserContextManager.prototype.getContextStatus = function () {
        var _a;
        return {
            isAuthenticated: !!this.currentContext,
            user: this.currentContext ? {
                userId: this.currentContext.userId,
                username: this.currentContext.username,
                userRole: this.currentContext.userRole,
                userType: this.currentContext.userType,
                isSuperAdmin: this.currentContext.isSuperAdmin,
                permissionsCount: ((_a = this.currentContext.permissions) === null || _a === void 0 ? void 0 : _a.length) || 0
            } : undefined,
            permissionManagerStatus: this.permissionManager.getStatus()
        };
    };
    // 私有辅助方法
    UnifiedUserContextManager.prototype.parseJWTPayload = function (token) {
        try {
            var parts = token.split('.');
            if (parts.length !== 3) {
                return null;
            }
            var payload = parts[1];
            var decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
            return JSON.parse(decoded);
        }
        catch (error) {
            console.error('[UNIFIED_CTX] JWT解析失败:', error);
            return null;
        }
    };
    UnifiedUserContextManager.prototype.checkSuperAdminFromPayload = function (payload) {
        var username = payload.username || payload.sub;
        var role = payload.role;
        var userType = payload.user_type;
        return (username === 'admin' || role === 'admin') && userType === 'system';
    };
    UnifiedUserContextManager.prototype.generateRequestId = function () {
        return "mcp-".concat(Date.now(), "-").concat(Math.random().toString(36).substr(2, 9));
    };
    UnifiedUserContextManager.prototype.isPermissionCached = function (permissionCode) {
        var _a, _b;
        if (!((_a = this.currentContext) === null || _a === void 0 ? void 0 : _a.permissions) || !((_b = this.currentContext) === null || _b === void 0 ? void 0 : _b.permissionsCachedAt)) {
            return false;
        }
        var cacheAge = Date.now() - this.currentContext.permissionsCachedAt.getTime();
        return cacheAge < this.PERMISSIONS_CACHE_TTL;
    };
    UnifiedUserContextManager.prototype.getCachedPermission = function (permissionCode) {
        var _a;
        if (!((_a = this.currentContext) === null || _a === void 0 ? void 0 : _a.permissions)) {
            return null;
        }
        return this.currentContext.permissions.includes(permissionCode);
    };
    UnifiedUserContextManager.prototype.cachePermissionResult = function (permissionCode, hasPermission) {
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
            this.currentContext.permissions = this.currentContext.permissions.filter(function (p) { return p !== permissionCode; });
        }
        this.currentContext.permissionsCachedAt = new Date();
    };
    UnifiedUserContextManager.prototype.fallbackPermissionCheck = function (permissionCode) {
        if (!this.currentContext) {
            return false;
        }
        var _a = this.currentContext, userRole = _a.userRole, userType = _a.userType;
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
    };
    return UnifiedUserContextManager;
}());
exports.UnifiedUserContextManager = UnifiedUserContextManager;
/**
 * 全局统一用户上下文管理器实例
 */
var globalContextManager = null;
/**
 * 获取全局统一用户上下文管理器
 */
function getGlobalContextManager(apiBase) {
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
function resetGlobalContextManager() {
    globalContextManager = null;
}
/**
 * 统一权限检查装饰器
 * 用于为MCP方法添加统一的权限检查
 */
function requiresUnifiedPermission(permissionCode, resourceType) {
    return function (target, propertyName, descriptor) {
        if (!descriptor) {
            descriptor = {
                value: target[propertyName],
                writable: true,
                enumerable: true,
                configurable: true
            };
        }
        var originalMethod = descriptor.value;
        if (!originalMethod || typeof originalMethod !== 'function') {
            console.error("[UNIFIED_CTX] No method found for ".concat(propertyName));
            return descriptor;
        }
        descriptor.value = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            return __awaiter(this, void 0, void 0, function () {
                var contextManager, resourceId, firstArg, permissionResult, error_4;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            contextManager = globalContextManager;
                            if (!contextManager) {
                                console.error('[UNIFIED_CTX] No global context manager available');
                                return [2 /*return*/, {
                                        success: false,
                                        error: '用户上下文管理器未初始化',
                                        permission_required: permissionCode
                                    }];
                            }
                            if (args.length > 0) {
                                firstArg = args[0];
                                if (typeof firstArg === 'number') {
                                    resourceId = firstArg;
                                }
                                else if (typeof firstArg === 'object' && firstArg && 'id' in firstArg) {
                                    resourceId = firstArg.id;
                                }
                            }
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 4, , 5]);
                            return [4 /*yield*/, contextManager.checkPermission(permissionCode, resourceId, resourceType)];
                        case 2:
                            permissionResult = _a.sent();
                            if (!permissionResult.hasPermission) {
                                return [2 /*return*/, {
                                        success: false,
                                        error: "\u6743\u9650\u4E0D\u8DB3: ".concat(permissionResult.reason),
                                        permission_required: permissionCode,
                                        resource_type: resourceType,
                                        resource_id: resourceId,
                                        check_source: permissionResult.source,
                                        user_context: permissionResult.userContext
                                    }];
                            }
                            return [4 /*yield*/, originalMethod.apply(this, args)];
                        case 3: 
                        // 权限检查通过，执行原方法
                        return [2 /*return*/, _a.sent()];
                        case 4:
                            error_4 = _a.sent();
                            console.error('[UNIFIED_CTX] Permission check error for', permissionCode, ':', error_4.message);
                            return [2 /*return*/, {
                                    success: false,
                                    error: "\u6743\u9650\u9A8C\u8BC1\u5931\u8D25: ".concat(error_4.message),
                                    permission_required: permissionCode,
                                    command: propertyName
                                }];
                        case 5: return [2 /*return*/];
                    }
                });
            });
        };
        return descriptor;
    };
}
