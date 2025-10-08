"use strict";
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
exports.BaseClient = void 0;
var axios_1 = require("axios");
var permission_manager_js_1 = require("./permission-manager.js");
var unified_user_context_js_1 = require("./unified-user-context.js");
var token_storage_js_1 = require("./token-storage.js");
var token_monitor_js_1 = require("./token-monitor.js");
var BaseClient = /** @class */ (function () {
    function BaseClient(apiBase) {
        if (apiBase === void 0) { apiBase = 'http://localhost:8080/api/v1'; }
        this.REFRESH_BUFFER_MS = 60 * 1000; // 提前60秒刷新
        this.apiBase = apiBase;
        // 获取全局统一上下文管理器
        this.contextManager = (0, unified_user_context_js_1.getGlobalContextManager)(apiBase);
        // 初始化Token持久化存储
        this.tokenStorage = (0, token_storage_js_1.getGlobalTokenStorage)({
            enableEncryption: process.env.MCP_TOKEN_ENCRYPTION !== 'false' // 默认启用加密
        });
        // 初始化Token刷新监控器
        this.tokenMonitor = (0, token_monitor_js_1.getGlobalTokenMonitor)({
            enableLogging: process.env.MCP_TOKEN_MONITOR_LOGGING !== 'false', // 默认启用
            enableMetrics: process.env.MCP_TOKEN_MONITOR_METRICS !== 'false' // 默认启用
        });
        // 尝试从持久化存储加载Token（异步，不阻塞构造函数）
        this.loadPersistedToken().catch(function (error) {
            console.error('[BASE_CLIENT] 加载持久化Token失败:', error);
        });
        // 从环境变量读取令牌（不再硬编码）。优先 TASK_API_TOKEN，兼容 API_TOKEN。
        var token = process.env.TASK_API_TOKEN || process.env.API_TOKEN;
        if (token && token.trim().length > 0) {
            // 环境变量的Token作为后备选项
            if (!this.authToken) {
                this.authToken = token.trim();
                // 如果有令牌，尝试创建用户上下文
                this.initializeContextFromToken(this.authToken);
            }
        }
        // 保持原有的权限管理器以向后兼容
        this.permissionManager = new permission_manager_js_1.MCPPermissionManager(apiBase, this.authToken, {
            enablePermissionCheck: process.env.MCP_ENABLE_PERMISSIONS !== 'false', // 默认启用
            cacheTTL: parseInt(process.env.MCP_CACHE_TIMEOUT || '300') // 默认5分钟
        });
    }
    BaseClient.prototype.getHeaders = function () {
        var headers = {
            'Content-Type': 'application/json',
        };
        if (this.authToken) {
            headers['Authorization'] = "Bearer ".concat(this.authToken);
        }
        return headers;
    };
    BaseClient.prototype.makeRequest = function (method_1, url_1, data_1, params_1) {
        return __awaiter(this, arguments, void 0, function (method, url, data, params, _retry) {
            var config, response, error_1, refreshError_1;
            var _a, _b, _c, _d, _e, _f, _g, _h, _j;
            if (_retry === void 0) { _retry = false; }
            return __generator(this, function (_k) {
                switch (_k.label) {
                    case 0:
                        _k.trys.push([0, 3, , 9]);
                        // 请求前确保Token有效（自动刷新）
                        return [4 /*yield*/, this.ensureValidToken()];
                    case 1:
                        // 请求前确保Token有效（自动刷新）
                        _k.sent();
                        // Debug safe-log: do not print token value
                        console.error("[HTTP] ".concat(method, " ").concat(url, " auth=").concat(this.authToken ? 'present' : 'none'));
                        config = {
                            method: method,
                            url: "".concat(this.apiBase).concat(url),
                            headers: this.getHeaders(),
                            data: data,
                            params: params,
                            // proxy: false
                        };
                        return [4 /*yield*/, (0, axios_1.default)(config)];
                    case 2:
                        response = _k.sent();
                        // Debug: Log response structure for work notes
                        if (url.includes('list-work-notes')) {
                            console.error('[DEBUG] makeRequest response for list-work-notes:', JSON.stringify({
                                status: response.status,
                                dataKeys: response.data ? Object.keys(response.data) : 'no data',
                                hasData: !!((_a = response.data) === null || _a === void 0 ? void 0 : _a.data),
                                dataDataKeys: ((_b = response.data) === null || _b === void 0 ? void 0 : _b.data) ? Object.keys(response.data.data) : 'no data.data',
                                notesCount: ((_e = (_d = (_c = response.data) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.notes) === null || _e === void 0 ? void 0 : _e.length) || 0,
                                total: ((_g = (_f = response.data) === null || _f === void 0 ? void 0 : _f.data) === null || _g === void 0 ? void 0 : _g.total) || 'no total'
                            }, null, 2));
                        }
                        // 处理成功响应
                        if (response.data && typeof response.data === 'object') {
                            return [2 /*return*/, response.data];
                        }
                        return [2 /*return*/, {
                                success: true,
                                data: response.data,
                                message: 'Request successful'
                            }];
                    case 3:
                        error_1 = _k.sent();
                        if (!(((_h = error_1.response) === null || _h === void 0 ? void 0 : _h.status) === 401 && !_retry && ((_j = this.tokenState) === null || _j === void 0 ? void 0 : _j.refreshToken))) return [3 /*break*/, 8];
                        console.error('[HTTP] 收到401错误，尝试刷新Token后重试...');
                        _k.label = 4;
                    case 4:
                        _k.trys.push([4, 7, , 8]);
                        return [4 /*yield*/, this.refreshAccessToken()];
                    case 5:
                        _k.sent();
                        // 重试请求（标记为已重试）
                        console.error('[HTTP] Token刷新成功，重试请求...');
                        return [4 /*yield*/, this.makeRequest(method, url, data, params, true)];
                    case 6: return [2 /*return*/, _k.sent()];
                    case 7:
                        refreshError_1 = _k.sent();
                        console.error('[HTTP] Token刷新失败，无法重试请求:', refreshError_1.message);
                        return [3 /*break*/, 8];
                    case 8: return [2 /*return*/, this.handleError(error_1)];
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    BaseClient.prototype.handleError = function (error) {
        if (error.response) {
            // HTTP错误响应
            var status_1 = error.response.status;
            var data = error.response.data;
            var errorMessage = 'Unknown error';
            if (data === null || data === void 0 ? void 0 : data.message) {
                errorMessage = data.message;
            }
            else if (data === null || data === void 0 ? void 0 : data.error) {
                errorMessage = typeof data.error === 'string' ? data.error : data.error.message || 'API Error';
            }
            else if (error.message) {
                errorMessage = error.message;
            }
            // 根据HTTP状态码提供友好的错误信息
            switch (status_1) {
                case 400:
                    return { success: false, error: "\u8BF7\u6C42\u53C2\u6570\u9519\u8BEF: ".concat(errorMessage) };
                case 401:
                    // 检查是否是Token过期错误
                    if (errorMessage.toLowerCase().includes('token') &&
                        (errorMessage.toLowerCase().includes('expired') ||
                            errorMessage.toLowerCase().includes('过期') ||
                            errorMessage.toLowerCase().includes('invalid'))) {
                        return { success: false, error: "Token\u5DF2\u8FC7\u671F\uFF0C\u8BF7\u5237\u65B0Token\u540E\u91CD\u8BD5\u3002\u63D0\u793A\uFF1A\u53EF\u4F7F\u7528 dev_quick_login \u5DE5\u5177\u81EA\u52A8\u5237\u65B0" };
                    }
                    return { success: false, error: "\u8BA4\u8BC1\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5API\u4EE4\u724C: ".concat(errorMessage) };
                case 403:
                    return { success: false, error: "\u6743\u9650\u4E0D\u8DB3: ".concat(errorMessage) };
                case 404:
                    return { success: false, error: "\u8D44\u6E90\u4E0D\u5B58\u5728: ".concat(errorMessage) };
                case 422:
                    return { success: false, error: "\u6570\u636E\u9A8C\u8BC1\u5931\u8D25: ".concat(errorMessage) };
                case 500:
                    return { success: false, error: "\u670D\u52A1\u5668\u5185\u90E8\u9519\u8BEF: ".concat(errorMessage) };
                default:
                    return { success: false, error: "HTTP ".concat(status_1, ": ").concat(errorMessage) };
            }
        }
        else if (error.request) {
            // 网络错误 - 检查是否是ECONNREFUSED等连接问题
            var errorMsg = error.message || '';
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
                    error: "\u7F51\u7EDC\u8BF7\u6C42\u5931\u8D25: ".concat(errorMsg || '请检查服务器是否正常运行')
                };
            }
        }
        else {
            // 其他错误
            return {
                success: false,
                error: "\u8BF7\u6C42\u5931\u8D25: ".concat(error.message || '未知错误')
            };
        }
    };
    // 权限检查装饰器辅助方法
    BaseClient.prototype.checkPermission = function (operation, resourceType) {
        return __awaiter(this, void 0, void 0, function () {
            var res, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.permissionManager.checkPermission(operation, undefined, resourceType)];
                    case 1:
                        res = _a.sent();
                        return [2 /*return*/, !!(res === null || res === void 0 ? void 0 : res.has_permission)];
                    case 2:
                        error_2 = _a.sent();
                        console.warn("Permission check failed for ".concat(operation, ":"), error_2);
                        // 如果权限检查失败，默认允许操作（向下兼容）
                        return [2 /*return*/, true];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 获取权限管理器实例
    BaseClient.prototype.getPermissionManager = function () {
        return this.permissionManager;
    };
    // 确保Token有效（自动刷新）
    BaseClient.prototype.ensureValidToken = function () {
        return __awaiter(this, void 0, void 0, function () {
            var now, timeUntilExpiry, error_3;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.tokenState) {
                            // 没有Token状态，跳过检查
                            return [2 /*return*/];
                        }
                        now = new Date();
                        timeUntilExpiry = this.tokenState.expiresAt.getTime() - now.getTime();
                        if (!(timeUntilExpiry <= this.REFRESH_BUFFER_MS)) return [3 /*break*/, 4];
                        console.error('[TOKEN] Token即将过期，准备刷新...', {
                            expiresAt: this.tokenState.expiresAt.toISOString(),
                            timeUntilExpiry: Math.floor(timeUntilExpiry / 1000) + 's'
                        });
                        // 使用单例模式避免并发刷新
                        if (!this.refreshPromise) {
                            this.refreshPromise = this.refreshAccessToken()
                                .finally(function () {
                                _this.refreshPromise = undefined;
                            });
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.refreshPromise];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        error_3 = _a.sent();
                        console.error('[TOKEN] Token刷新失败:', error_3.message);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    // 刷新访问令牌
    BaseClient.prototype.refreshAccessToken = function () {
        return __awaiter(this, void 0, void 0, function () {
            var startTime, response, _a, access_token, refresh_token, expires_in, duration, error_4, duration, eventType;
            var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
            return __generator(this, function (_m) {
                switch (_m.label) {
                    case 0:
                        if (!((_b = this.tokenState) === null || _b === void 0 ? void 0 : _b.refreshToken)) {
                            throw new Error('No refresh token available');
                        }
                        if (this.tokenState.refreshing) {
                            console.error('[TOKEN] Token刷新已在进行中，跳过');
                            return [2 /*return*/];
                        }
                        this.tokenState.refreshing = true;
                        startTime = Date.now();
                        // 记录刷新开始事件
                        this.tokenMonitor.recordEvent(token_monitor_js_1.TokenRefreshEventType.REFRESH_STARTED, true, {
                            expiresAt: this.tokenState.expiresAt.toISOString(),
                            timeUntilExpiry: Math.floor((this.tokenState.expiresAt.getTime() - Date.now()) / 1000)
                        });
                        _m.label = 1;
                    case 1:
                        _m.trys.push([1, 3, 4, 5]);
                        console.error('[TOKEN] 开始刷新访问令牌...');
                        return [4 /*yield*/, axios_1.default.post("".concat(this.apiBase, "/auth/refresh"), {}, {
                                headers: {
                                    'Authorization': "Bearer ".concat(this.tokenState.refreshToken),
                                    'Content-Type': 'application/json'
                                }
                            })];
                    case 2:
                        response = _m.sent();
                        // 检查响应格式
                        if (!response.data || !response.data.data) {
                            throw new Error('Invalid refresh response format');
                        }
                        _a = response.data.data, access_token = _a.access_token, refresh_token = _a.refresh_token, expires_in = _a.expires_in;
                        if (!access_token || !refresh_token || !expires_in) {
                            throw new Error('Missing required fields in refresh response');
                        }
                        // 更新Token状态
                        this.updateTokenState(access_token, refresh_token, expires_in);
                        duration = Date.now() - startTime;
                        console.error('[TOKEN] 访问令牌刷新成功', {
                            expiresIn: expires_in + 's',
                            expiresAt: (_c = this.tokenState) === null || _c === void 0 ? void 0 : _c.expiresAt.toISOString(),
                            duration: duration + 'ms'
                        });
                        // 记录刷新成功事件
                        this.tokenMonitor.recordEvent(token_monitor_js_1.TokenRefreshEventType.REFRESH_SUCCESS, true, {
                            expiresAt: (_d = this.tokenState) === null || _d === void 0 ? void 0 : _d.expiresAt.toISOString(),
                            httpStatus: response.status
                        }, undefined, undefined, duration);
                        return [3 /*break*/, 5];
                    case 3:
                        error_4 = _m.sent();
                        duration = Date.now() - startTime;
                        console.error('[TOKEN] 刷新访问令牌失败:', {
                            message: error_4.message,
                            status: (_e = error_4.response) === null || _e === void 0 ? void 0 : _e.status,
                            data: (_f = error_4.response) === null || _f === void 0 ? void 0 : _f.data,
                            duration: duration + 'ms'
                        });
                        eventType = ((_g = error_4.response) === null || _g === void 0 ? void 0 : _g.status) === 401
                            ? token_monitor_js_1.TokenRefreshEventType.REFRESH_EXPIRED
                            : token_monitor_js_1.TokenRefreshEventType.REFRESH_FAILED;
                        this.tokenMonitor.recordEvent(eventType, false, {
                            httpStatus: (_h = error_4.response) === null || _h === void 0 ? void 0 : _h.status
                        }, error_4.message, (_k = (_j = error_4.response) === null || _j === void 0 ? void 0 : _j.status) === null || _k === void 0 ? void 0 : _k.toString(), duration);
                        // 如果是401错误，可能Refresh Token也过期了
                        if (((_l = error_4.response) === null || _l === void 0 ? void 0 : _l.status) === 401) {
                            console.error('[TOKEN] Refresh Token可能已过期，需要重新登录');
                            this.tokenState = undefined;
                        }
                        throw error_4;
                    case 4:
                        if (this.tokenState) {
                            this.tokenState.refreshing = false;
                        }
                        return [7 /*endfinally*/];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    // 更新Token状态
    BaseClient.prototype.updateTokenState = function (accessToken, refreshToken, expiresIn) {
        this.authToken = accessToken;
        this.tokenState = {
            accessToken: accessToken,
            refreshToken: refreshToken,
            expiresAt: new Date(Date.now() + expiresIn * 1000),
            refreshing: false
        };
        // 通知权限管理器更新Token
        this.permissionManager.setAuth(accessToken);
        console.error('[TOKEN] Token状态已更新', {
            expiresAt: this.tokenState.expiresAt.toISOString()
        });
        // 持久化保存Token
        this.persistToken();
    };
    // 加载持久化的Token
    BaseClient.prototype.loadPersistedToken = function () {
        return __awaiter(this, void 0, void 0, function () {
            var persistedData, error_5, timeUntilExpiry, error_6;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 9, , 10]);
                        return [4 /*yield*/, this.tokenStorage.loadToken()];
                    case 1:
                        persistedData = _a.sent();
                        if (!persistedData) {
                            console.error('[TOKEN] 没有找到持久化的Token');
                            return [2 /*return*/];
                        }
                        if (!this.tokenStorage.isTokenExpired(persistedData, this.REFRESH_BUFFER_MS)) return [3 /*break*/, 7];
                        console.error('[TOKEN] 持久化的Token已过期，尝试刷新...');
                        // 记录Token过期事件
                        this.tokenMonitor.recordEvent(token_monitor_js_1.TokenRefreshEventType.TOKEN_EXPIRED, false, {
                            expiresAt: persistedData.expiresAt,
                            timeUntilExpiry: Math.floor((new Date(persistedData.expiresAt).getTime() - Date.now()) / 1000)
                        });
                        // 设置临时Token状态以便刷新
                        this.tokenState = {
                            accessToken: persistedData.accessToken,
                            refreshToken: persistedData.refreshToken,
                            expiresAt: new Date(persistedData.expiresAt),
                            refreshing: false
                        };
                        this.authToken = persistedData.accessToken;
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 6]);
                        return [4 /*yield*/, this.refreshAccessToken()];
                    case 3:
                        _a.sent();
                        console.error('[TOKEN] Token刷新成功');
                        return [3 /*break*/, 6];
                    case 4:
                        error_5 = _a.sent();
                        console.error('[TOKEN] Token刷新失败，清除持久化存储:', error_5.message);
                        return [4 /*yield*/, this.tokenStorage.clearToken()];
                    case 5:
                        _a.sent();
                        this.tokenState = undefined;
                        this.authToken = undefined;
                        return [3 /*break*/, 6];
                    case 6: return [2 /*return*/];
                    case 7:
                        // Token有效，直接使用
                        this.tokenState = {
                            accessToken: persistedData.accessToken,
                            refreshToken: persistedData.refreshToken,
                            expiresAt: new Date(persistedData.expiresAt),
                            refreshing: false
                        };
                        this.authToken = persistedData.accessToken;
                        timeUntilExpiry = Math.floor((new Date(persistedData.expiresAt).getTime() - Date.now()) / 1000);
                        console.error('[TOKEN] 已加载持久化的Token', {
                            expiresAt: persistedData.expiresAt,
                            timeUntilExpiry: timeUntilExpiry + 's'
                        });
                        // 记录Token加载成功事件
                        this.tokenMonitor.recordEvent(token_monitor_js_1.TokenRefreshEventType.TOKEN_LOADED, true, {
                            expiresAt: persistedData.expiresAt,
                            timeUntilExpiry: timeUntilExpiry
                        });
                        // 初始化用户上下文
                        return [4 /*yield*/, this.initializeContextFromToken(this.authToken)];
                    case 8:
                        // 初始化用户上下文
                        _a.sent();
                        return [3 /*break*/, 10];
                    case 9:
                        error_6 = _a.sent();
                        console.error('[TOKEN] 加载持久化Token失败:', error_6.message);
                        return [3 /*break*/, 10];
                    case 10: return [2 /*return*/];
                }
            });
        });
    };
    // 持久化保存Token
    BaseClient.prototype.persistToken = function () {
        return __awaiter(this, void 0, void 0, function () {
            var persistedData, error_7;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.tokenState) {
                            return [2 /*return*/];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        persistedData = {
                            accessToken: this.tokenState.accessToken,
                            refreshToken: this.tokenState.refreshToken,
                            expiresAt: this.tokenState.expiresAt.toISOString(),
                            lastUpdate: new Date().toISOString()
                        };
                        return [4 /*yield*/, this.tokenStorage.saveToken(persistedData)];
                    case 2:
                        _a.sent();
                        // 记录Token持久化事件
                        this.tokenMonitor.recordEvent(token_monitor_js_1.TokenRefreshEventType.TOKEN_PERSISTED, true, {
                            expiresAt: persistedData.expiresAt
                        });
                        return [3 /*break*/, 4];
                    case 3:
                        error_7 = _a.sent();
                        console.error('[TOKEN] 持久化保存Token失败:', error_7.message);
                        // 记录持久化失败事件
                        this.tokenMonitor.recordEvent(token_monitor_js_1.TokenRefreshEventType.TOKEN_PERSISTED, false, undefined, error_7.message);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    // 清除持久化的Token
    BaseClient.prototype.clearPersistedToken = function () {
        return __awaiter(this, void 0, void 0, function () {
            var error_8;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.tokenStorage.clearToken()];
                    case 1:
                        _a.sent();
                        console.error('[TOKEN] 持久化Token已清除');
                        // 记录Token清除事件
                        this.tokenMonitor.recordEvent(token_monitor_js_1.TokenRefreshEventType.TOKEN_CLEARED, true);
                        return [3 /*break*/, 3];
                    case 2:
                        error_8 = _a.sent();
                        console.error('[TOKEN] 清除持久化Token失败:', error_8.message);
                        // 记录清除失败事件
                        this.tokenMonitor.recordEvent(token_monitor_js_1.TokenRefreshEventType.TOKEN_CLEARED, false, undefined, error_8.message);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 设置认证令牌
    BaseClient.prototype.setAuthToken = function (token) {
        this.authToken = token;
        this.permissionManager.setAuth(token);
        // 更新统一上下文
        this.initializeContextFromToken(token);
    };
    // 获取API基础URL
    BaseClient.prototype.getApiBase = function () {
        return this.apiBase;
    };
    // 初始化用户上下文从令牌
    BaseClient.prototype.initializeContextFromToken = function (token) {
        return __awaiter(this, void 0, void 0, function () {
            var context, error_9;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.contextManager.createContextFromToken(token)];
                    case 1:
                        context = _a.sent();
                        if (context) {
                            console.error('[BASE_CLIENT] 用户上下文初始化成功:', context.username);
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        error_9 = _a.sent();
                        console.error('[BASE_CLIENT] 用户上下文初始化失败:', error_9.message);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 通过开发环境快速登录设置上下文
    BaseClient.prototype.devQuickLogin = function () {
        return __awaiter(this, arguments, void 0, function (username) {
            var context, rawContext, error_10;
            if (username === void 0) { username = 'admin'; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.contextManager.createContextFromDevLogin(username)];
                    case 1:
                        context = _a.sent();
                        if (context && context.token) {
                            rawContext = context;
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
                            return [2 /*return*/, {
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
                                    message: "\u7528\u6237 ".concat(username, " \u767B\u5F55\u6210\u529F"),
                                    token: context.token
                                }];
                        }
                        else {
                            throw new Error('登录失败：无法创建用户上下文');
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        error_10 = _a.sent();
                        console.error('[BASE_CLIENT] 开发登录失败:', error_10);
                        return [2 /*return*/, {
                                success: false,
                                error: "\u767B\u5F55\u5931\u8D25: ".concat(error_10.message)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 获取当前用户上下文
    BaseClient.prototype.getCurrentUserContext = function () {
        return this.contextManager.getCurrentContext();
    };
    // 获取上下文状态
    BaseClient.prototype.getContextStatus = function () {
        return this.contextManager.getContextStatus();
    };
    // 统一权限检查方法
    BaseClient.prototype.checkUnifiedPermission = function (permissionCode, resourceId, resourceType) {
        return __awaiter(this, void 0, void 0, function () {
            var result, error_11;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.contextManager.checkPermission(permissionCode, resourceId, resourceType)];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.hasPermission];
                    case 2:
                        error_11 = _a.sent();
                        console.warn('[BASE_CLIENT] 统一权限检查失败:', error_11);
                        return [2 /*return*/, false];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 设置API基础URL
    BaseClient.prototype.setApiBase = function (apiBase) {
        this.apiBase = apiBase;
        this.permissionManager.setApiBase(apiBase);
    };
    // ==================== Token监控API ====================
    /**
     * 获取Token刷新统计信息
     */
    BaseClient.prototype.getTokenRefreshStats = function () {
        return this.tokenMonitor.getStats();
    };
    /**
     * 获取最近的Token刷新事件
     */
    BaseClient.prototype.getRecentTokenEvents = function (limit) {
        if (limit === void 0) { limit = 10; }
        return this.tokenMonitor.getRecentEvents(limit);
    };
    /**
     * 执行Token健康检查
     */
    BaseClient.prototype.checkTokenHealth = function () {
        return this.tokenMonitor.healthCheck();
    };
    /**
     * 重置Token监控统计
     */
    BaseClient.prototype.resetTokenMonitorStats = function () {
        this.tokenMonitor.resetStats();
    };
    /**
     * 获取Token监控日志文件路径
     */
    BaseClient.prototype.getTokenMonitorLogPath = function () {
        return this.tokenMonitor.getLogFilePath();
    };
    return BaseClient;
}());
exports.BaseClient = BaseClient;
