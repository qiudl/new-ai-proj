"use strict";
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
exports.MCP_COMMAND_PERMISSIONS = exports.MCPPermissionManager = void 0;
exports.requiresPermission = requiresPermission;
var axios_1 = require("axios");
/**
 * MCP权限管理器类
 * 提供MCP命令的权限验证功能
 */
var MCPPermissionManager = /** @class */ (function () {
    function MCPPermissionManager(apiBase, authToken, config) {
        this.apiBase = apiBase;
        this.authToken = authToken;
        this.permissionCache = new Map();
        // 默认配置
        this.config = __assign({ enablePermissionCheck: true, cachePermissions: true, cacheTTL: 300, strictMode: false, debugMode: false }, config);
        if (this.config.debugMode) {
            console.error('[MCP_PERM] Permission manager initialized with config:', this.config);
        }
    }
    /**
     * 设置API基础URL
     */
    MCPPermissionManager.prototype.setApiBase = function (apiBase) {
        this.apiBase = apiBase;
    };
    /**
     * 设置认证令牌和用户ID
     */
    MCPPermissionManager.prototype.setAuth = function (authToken, companyUserId) {
        this.authToken = authToken;
        this.companyUserId = companyUserId;
        if (this.config.debugMode) {
            console.error('[MCP_PERM] Auth updated - Token:', authToken ? 'present' : 'none', 'User ID:', companyUserId);
        }
    };
    /**
     * 检查单个权限
     */
    MCPPermissionManager.prototype.checkPermission = function (permissionCode, resourceId, resourceType) {
        return __awaiter(this, void 0, void 0, function () {
            var cached, request, response, result, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // 如果权限检查被禁用，始终允许
                        if (!this.config.enablePermissionCheck) {
                            return [2 /*return*/, {
                                    has_permission: true,
                                    reason: 'Permission check disabled',
                                    source: 'config'
                                }];
                        }
                        // 检查缓存
                        if (this.config.cachePermissions) {
                            cached = this.getCachedPermission(permissionCode, resourceId);
                            if (cached) {
                                if (this.config.debugMode) {
                                    console.error('[MCP_PERM] Cache hit for permission:', permissionCode);
                                }
                                return [2 /*return*/, cached.result];
                            }
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        request = {
                            permission_code: permissionCode,
                            resource_id: resourceId,
                            resource_type: resourceType
                        };
                        return [4 /*yield*/, axios_1.default.post("".concat(this.apiBase, "/auth/check-permission"), request, {
                                headers: this.getHeaders(),
                                timeout: 5000,
                                proxy: false
                            })];
                    case 2:
                        response = _a.sent();
                        result = response.data.data || response.data;
                        // 缓存结果
                        if (this.config.cachePermissions) {
                            this.cachePermissionResult(permissionCode, resourceId, result);
                        }
                        if (this.config.debugMode) {
                            console.error('[MCP_PERM] Permission check result:', permissionCode, result.has_permission);
                        }
                        return [2 /*return*/, result];
                    case 3:
                        error_1 = _a.sent();
                        console.error('[MCP_PERM] Permission check failed:', error_1.message);
                        // 在严格模式下，权限检查失败则拒绝访问
                        if (this.config.strictMode) {
                            return [2 /*return*/, {
                                    has_permission: false,
                                    reason: "Permission check failed: ".concat(error_1.message),
                                    source: 'error'
                                }];
                        }
                        // 非严格模式下，权限检查失败则允许访问（向后兼容）
                        return [2 /*return*/, {
                                has_permission: true,
                                reason: 'Permission check failed, allowing access in non-strict mode',
                                source: 'fallback'
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 批量检查权限
     */
    MCPPermissionManager.prototype.checkBatchPermissions = function (requests) {
        return __awaiter(this, void 0, void 0, function () {
            var results_1, batchRequest, response, batchResponse_1, error_2, results, _i, requests_1, request, _a, _b;
            var _this = this;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (!this.config.enablePermissionCheck) {
                            results_1 = {};
                            requests.forEach(function (req) {
                                results_1[req.permission_code] = {
                                    has_permission: true,
                                    reason: 'Permission check disabled',
                                    source: 'config'
                                };
                            });
                            return [2 /*return*/, results_1];
                        }
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 3, , 8]);
                        batchRequest = {
                            permissions: requests
                        };
                        return [4 /*yield*/, axios_1.default.post("".concat(this.apiBase, "/auth/check-batch-permissions"), batchRequest, {
                                headers: this.getHeaders(),
                                timeout: 10000,
                                proxy: false
                            })];
                    case 2:
                        response = _c.sent();
                        batchResponse_1 = response.data.data || response.data;
                        // 缓存批量结果
                        if (this.config.cachePermissions) {
                            requests.forEach(function (req) {
                                var result = batchResponse_1.results[req.permission_code];
                                if (result) {
                                    _this.cachePermissionResult(req.permission_code, req.resource_id, result);
                                }
                            });
                        }
                        return [2 /*return*/, batchResponse_1.results];
                    case 3:
                        error_2 = _c.sent();
                        console.error('[MCP_PERM] Batch permission check failed:', error_2.message);
                        results = {};
                        _i = 0, requests_1 = requests;
                        _c.label = 4;
                    case 4:
                        if (!(_i < requests_1.length)) return [3 /*break*/, 7];
                        request = requests_1[_i];
                        _a = results;
                        _b = request.permission_code;
                        return [4 /*yield*/, this.checkPermission(request.permission_code, request.resource_id, request.resource_type)];
                    case 5:
                        _a[_b] = _c.sent();
                        _c.label = 6;
                    case 6:
                        _i++;
                        return [3 /*break*/, 4];
                    case 7: return [2 /*return*/, results];
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 清除权限缓存
     */
    MCPPermissionManager.prototype.clearCache = function (permissionCode) {
        var _this = this;
        if (permissionCode) {
            // 清除特定权限的所有缓存
            var keysToDelete = [];
            for (var _i = 0, _a = this.permissionCache.keys(); _i < _a.length; _i++) {
                var key = _a[_i];
                if (key.startsWith("".concat(permissionCode, ":"))) {
                    keysToDelete.push(key);
                }
            }
            keysToDelete.forEach(function (key) { return _this.permissionCache.delete(key); });
        }
        else {
            // 清除所有缓存
            this.permissionCache.clear();
        }
        if (this.config.debugMode) {
            console.error('[MCP_PERM] Cache cleared for:', permissionCode || 'all');
        }
    };
    /**
     * 获取权限管理器状态
     */
    MCPPermissionManager.prototype.getStatus = function () {
        return {
            enabled: this.config.enablePermissionCheck,
            cacheSize: this.permissionCache.size,
            config: this.config,
            hasAuth: !!this.authToken
        };
    };
    /**
     * 获取HTTP请求头
     */
    MCPPermissionManager.prototype.getHeaders = function () {
        var headers = {
            'Content-Type': 'application/json'
        };
        if (this.authToken) {
            headers['Authorization'] = "Bearer ".concat(this.authToken);
        }
        return headers;
    };
    /**
     * 获取缓存的权限结果
     */
    MCPPermissionManager.prototype.getCachedPermission = function (permissionCode, resourceId) {
        var cacheKey = this.generateCacheKey(permissionCode, resourceId);
        var cached = this.permissionCache.get(cacheKey);
        if (!cached) {
            return null;
        }
        var now = Date.now();
        if (now - cached.timestamp > cached.ttl * 1000) {
            // 缓存已过期
            this.permissionCache.delete(cacheKey);
            return null;
        }
        return cached;
    };
    /**
     * 缓存权限检查结果
     */
    MCPPermissionManager.prototype.cachePermissionResult = function (permissionCode, resourceId, result) {
        var cacheKey = this.generateCacheKey(permissionCode, resourceId);
        var entry = {
            result: result,
            timestamp: Date.now(),
            ttl: this.config.cacheTTL
        };
        this.permissionCache.set(cacheKey, entry);
    };
    /**
     * 生成缓存键
     */
    MCPPermissionManager.prototype.generateCacheKey = function (permissionCode, resourceId) {
        return "".concat(permissionCode, ":").concat(resourceId || 'null');
    };
    return MCPPermissionManager;
}());
exports.MCPPermissionManager = MCPPermissionManager;
/**
 * MCP命令权限映射
 * 定义每个MCP命令需要的权限
 */
exports.MCP_COMMAND_PERMISSIONS = {
    // 任务管理
    'create_task': {
        permission: 'task.create',
        description: '创建任务'
    },
    'start_task': {
        permission: 'task.update',
        resourceType: 'task',
        requiresResourceId: true,
        description: '开始任务'
    },
    'complete_task': {
        permission: 'task.update',
        resourceType: 'task',
        requiresResourceId: true,
        description: '完成任务'
    },
    'update_task': {
        permission: 'task.update',
        resourceType: 'task',
        requiresResourceId: true,
        description: '更新任务'
    },
    'delete_task': {
        permission: 'task.delete',
        resourceType: 'task',
        requiresResourceId: true,
        description: '删除任务'
    },
    'list_tasks': {
        permission: 'task.list.read',
        description: '查看任务列表'
    },
    'find_task': {
        permission: 'task.list.read',
        description: '搜索任务'
    },
    'get_detailed_task_info': {
        permission: 'task.read',
        resourceType: 'task',
        requiresResourceId: true,
        description: '获取任务详情'
    },
    'move_task': {
        permission: 'task.update',
        resourceType: 'task',
        requiresResourceId: true,
        description: '移动任务'
    },
    // 子任务管理
    'create_subtask': {
        permission: 'task.create',
        description: '创建子任务'
    },
    'create_sibling_task': {
        permission: 'task.create',
        description: '创建兄弟任务'
    },
    'get_task_children': {
        permission: 'task.read',
        resourceType: 'task',
        requiresResourceId: true,
        description: '获取子任务'
    },
    // 项目管理
    'create_project': {
        permission: 'project.create',
        description: '创建项目'
    },
    'list_projects': {
        permission: 'project.list.read',
        description: '查看项目列表'
    },
    // 文档管理
    'create-and-attach': {
        permission: 'document.create',
        description: '创建并关联任务文档'
    },
    'get_task_document': {
        permission: 'document.read',
        resourceType: 'task',
        requiresResourceId: true,
        description: '获取任务文档'
    },
    'has_task_document': {
        permission: 'document.read',
        resourceType: 'task',
        requiresResourceId: true,
        description: '检查任务文档'
    },
    'delete_task_document': {
        permission: 'document.delete',
        resourceType: 'task',
        requiresResourceId: true,
        description: '删除任务文档'
    },
    // 工作笔记管理
    'create-and-attach-work-note': {
        permission: 'work_note.create',
        description: '创建并关联工作笔记到任务'
    },
    'create_batch_documents': {
        permission: 'document.create',
        description: '批量创建文档'
    },
    // 工作笔记
    'create_work_note': {
        permission: 'worknote.create',
        description: '创建工作笔记'
    },
    'list_work_notes': {
        permission: 'worknote.list.read',
        description: '查看工作笔记列表'
    },
    'search_work_notes': {
        permission: 'worknote.list.read',
        description: '搜索工作笔记'
    },
    'get_work_note': {
        permission: 'worknote.read',
        resourceType: 'worknote',
        requiresResourceId: true,
        description: '获取工作笔记'
    },
    'update_work_note': {
        permission: 'worknote.update',
        resourceType: 'worknote',
        requiresResourceId: true,
        description: '更新工作笔记'
    },
    // 时间管理
    'start_timer': {
        permission: 'timer.create',
        description: '开始计时'
    },
    'stop_timer': {
        permission: 'timer.update',
        description: '停止计时'
    },
    'get_current_timer': {
        permission: 'timer.read',
        description: '获取当前计时'
    },
    'get_active_timers': {
        permission: 'timer.read',
        description: '获取活跃计时列表'
    },
    // 高级功能
    'start_task_with_timer': {
        permission: 'task.update',
        resourceType: 'task',
        description: '启动任务并开始计时'
    },
    'switch_to_task': {
        permission: 'task.update',
        description: '切换任务'
    },
    'get_daily_work_report': {
        permission: 'report.read',
        description: '获取日报'
    },
    // 开发环境功能
    'dev_quick_login': {
        permission: 'auth.dev_login',
        description: '开发环境快速登录'
    }
};
/**
 * 权限装饰器工厂
 * 用于为方法添加权限检查
 */
function requiresPermission(commandName) {
    return function (target, propertyName, descriptor) {
        // 安全检查：如果descriptor不存在，创建一个
        if (!descriptor) {
            console.error("[MCP_PERM] No descriptor for ".concat(propertyName, ", creating default"));
            descriptor = {
                value: target[propertyName],
                writable: true,
                enumerable: true,
                configurable: true
            };
        }
        var originalMethod = descriptor.value;
        if (!originalMethod || typeof originalMethod !== 'function') {
            console.error("[MCP_PERM] No method found for ".concat(propertyName, ", descriptor:"), descriptor);
            return descriptor;
        }
        descriptor.value = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            return __awaiter(this, void 0, void 0, function () {
                var permissionManager, permissionConfig, resourceId, firstArg, permissionResult, error_3;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            permissionManager = this.permissionManager;
                            if (!permissionManager) {
                                console.error('[MCP_PERM] Permission manager not found, executing without permission check');
                                return [2 /*return*/, originalMethod.apply(this, args)];
                            }
                            permissionConfig = exports.MCP_COMMAND_PERMISSIONS[commandName];
                            if (!permissionConfig) {
                                console.error('[MCP_PERM] No permission configuration for command:', commandName);
                                return [2 /*return*/, originalMethod.apply(this, args)];
                            }
                            if (permissionConfig.requiresResourceId && args.length > 0) {
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
                            _a.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, permissionManager.checkPermission(permissionConfig.permission, resourceId, permissionConfig.resourceType)];
                        case 2:
                            permissionResult = _a.sent();
                            if (!permissionResult.has_permission) {
                                return [2 /*return*/, {
                                        success: false,
                                        error: "\u6743\u9650\u4E0D\u8DB3: ".concat(permissionResult.reason || '缺少必要权限'),
                                        permission_required: permissionConfig.permission,
                                        permission_description: permissionConfig.description,
                                        resource_type: permissionConfig.resourceType,
                                        resource_id: resourceId
                                    }];
                            }
                            // 权限检查通过，执行原方法
                            return [2 /*return*/, originalMethod.apply(this, args)];
                        case 3:
                            error_3 = _a.sent();
                            console.error('[MCP_PERM] Permission check error for command', commandName, ':', error_3.message);
                            // 权限检查失败，返回错误
                            return [2 /*return*/, {
                                    success: false,
                                    error: "\u6743\u9650\u9A8C\u8BC1\u5931\u8D25: ".concat(error_3.message),
                                    permission_required: permissionConfig.permission,
                                    command: commandName
                                }];
                        case 4: return [2 /*return*/];
                    }
                });
            });
        };
        return descriptor;
    };
}
