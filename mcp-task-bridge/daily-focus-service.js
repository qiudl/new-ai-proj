"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
exports.DailyFocusService = void 0;
var base_client_js_1 = require("./base-client.js");
/**
 * Daily Focus Tasks Service
 * 管理今日主要任务的MCP服务
 */
var DailyFocusService = /** @class */ (function (_super) {
    __extends(DailyFocusService, _super);
    function DailyFocusService(apiBase) {
        if (apiBase === void 0) { apiBase = 'http://localhost:8080/api/v1'; }
        return _super.call(this, apiBase) || this;
    }
    // ===========================================
    // 核心任务管理接口
    // ===========================================
    /**
     * 获取今日主要任务列表
     */
    DailyFocusService.prototype.getDailyFocusTasks = function () {
        return __awaiter(this, arguments, void 0, function (params) {
            var queryParams, url, result, error_1;
            var _a, _b, _c;
            if (params === void 0) { params = {}; }
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _d.trys.push([0, 2, , 3]);
                        queryParams = new URLSearchParams();
                        if (params.date)
                            queryParams.append('date', params.date);
                        if (params.status)
                            queryParams.append('status', params.status);
                        if (params.priority)
                            queryParams.append('priority', params.priority);
                        if (params.include_suggestions !== undefined) {
                            queryParams.append('include_suggestions', params.include_suggestions.toString());
                        }
                        url = "/daily-focus-tasks".concat(queryParams.toString() ? '?' + queryParams.toString() : '');
                        return [4 /*yield*/, this.makeRequest('GET', url)];
                    case 1:
                        result = _d.sent();
                        return [2 /*return*/, {
                                success: true,
                                data: {
                                    tasks: ((_a = result.data) === null || _a === void 0 ? void 0 : _a.tasks) || [],
                                    stats: ((_b = result.data) === null || _b === void 0 ? void 0 : _b.stats) || {
                                        total_count: 0,
                                        completed_count: 0,
                                        pending_count: 0,
                                        completion_rate: 0,
                                        priority_distribution: { critical: 0, high: 0, medium: 0, low: 0 }
                                    },
                                    suggestions: ((_c = result.data) === null || _c === void 0 ? void 0 : _c.suggestions) || []
                                },
                                message: result.message || '获取今日主要任务成功'
                            }];
                    case 2:
                        error_1 = _d.sent();
                        return [2 /*return*/, this.handleError(error_1)];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 添加任务到今日主要任务
     */
    DailyFocusService.prototype.addDailyFocusTask = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var requestData, result, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        requestData = {
                            task_id: params.task_id,
                            priority: params.priority || 'medium',
                            notes: params.notes,
                            estimated_duration_minutes: params.estimated_duration_minutes,
                            focus_date: params.focus_date
                        };
                        return [4 /*yield*/, this.makeRequest('POST', '/daily-focus-tasks', requestData)];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, {
                                success: true,
                                data: result.data,
                                message: result.message || '添加今日主要任务成功'
                            }];
                    case 2:
                        error_2 = _a.sent();
                        return [2 /*return*/, this.handleError(error_2)];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 更新今日主要任务信息
     */
    DailyFocusService.prototype.updateDailyFocusTask = function (id, updates) {
        return __awaiter(this, void 0, void 0, function () {
            var result, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.makeRequest('PUT', "/daily-focus-tasks/".concat(id), updates)];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, {
                                success: true,
                                data: result.data,
                                message: result.message || '更新今日主要任务成功'
                            }];
                    case 2:
                        error_3 = _a.sent();
                        return [2 /*return*/, this.handleError(error_3)];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 从今日主要任务中移除
     */
    DailyFocusService.prototype.removeDailyFocusTask = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var result, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.makeRequest('DELETE', "/daily-focus-tasks/".concat(id))];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, {
                                success: true,
                                message: result.message || '移除今日主要任务成功'
                            }];
                    case 2:
                        error_4 = _a.sent();
                        return [2 /*return*/, this.handleError(error_4)];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // ===========================================
    // 状态管理接口
    // ===========================================
    /**
     * 标记任务完成
     */
    DailyFocusService.prototype.completeDailyFocusTask = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var result, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.makeRequest('PATCH', "/daily-focus-tasks/".concat(id, "/complete"))];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, {
                                success: true,
                                data: result.data,
                                message: result.message || '标记任务完成成功'
                            }];
                    case 2:
                        error_5 = _a.sent();
                        return [2 /*return*/, this.handleError(error_5)];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 批量调整任务顺序
     */
    DailyFocusService.prototype.reorderDailyFocusTasks = function (reorderItems) {
        return __awaiter(this, void 0, void 0, function () {
            var requestData, result, error_6;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        requestData = { reorder_items: reorderItems };
                        return [4 /*yield*/, this.makeRequest('PATCH', '/daily-focus-tasks/reorder', requestData)];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, {
                                success: true,
                                message: result.message || '重排序成功'
                            }];
                    case 2:
                        error_6 = _a.sent();
                        return [2 /*return*/, this.handleError(error_6)];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 获取统计信息
     */
    DailyFocusService.prototype.getDailyFocusStats = function () {
        return __awaiter(this, arguments, void 0, function (params) {
            var queryParams, url, result, error_7;
            if (params === void 0) { params = {}; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        queryParams = new URLSearchParams();
                        if (params.date)
                            queryParams.append('date', params.date);
                        if (params.period)
                            queryParams.append('period', params.period);
                        url = "/daily-focus-tasks/stats".concat(queryParams.toString() ? '?' + queryParams.toString() : '');
                        return [4 /*yield*/, this.makeRequest('GET', url)];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, {
                                success: true,
                                data: result.data,
                                message: result.message || '获取统计信息成功'
                            }];
                    case 2:
                        error_7 = _a.sent();
                        return [2 /*return*/, this.handleError(error_7)];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // ===========================================
    // 智能推荐接口
    // ===========================================
    /**
     * 获取智能推荐
     */
    DailyFocusService.prototype.getTaskRecommendations = function () {
        return __awaiter(this, arguments, void 0, function (params) {
            var queryParams, url, result, error_8;
            var _a;
            if (params === void 0) { params = {}; }
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        queryParams = new URLSearchParams();
                        if (params.limit)
                            queryParams.append('limit', params.limit.toString());
                        if (params.date)
                            queryParams.append('date', params.date);
                        if (params.exclude_existing !== undefined) {
                            queryParams.append('exclude_existing', params.exclude_existing.toString());
                        }
                        url = "/daily-focus-tasks/suggestions".concat(queryParams.toString() ? '?' + queryParams.toString() : '');
                        return [4 /*yield*/, this.makeRequest('GET', url)];
                    case 1:
                        result = _b.sent();
                        return [2 /*return*/, {
                                success: true,
                                data: {
                                    suggestions: ((_a = result.data) === null || _a === void 0 ? void 0 : _a.suggestions) || []
                                },
                                message: result.message || '获取智能推荐成功'
                            }];
                    case 2:
                        error_8 = _b.sent();
                        return [2 /*return*/, this.handleError(error_8)];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 批量采用推荐
     */
    DailyFocusService.prototype.acceptTaskRecommendations = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var requestData, result, error_9;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        requestData = {
                            task_ids: params.task_ids,
                            focus_date: params.focus_date,
                            default_priority: params.default_priority || 'medium'
                        };
                        return [4 /*yield*/, this.makeRequest('POST', '/daily-focus-tasks/accept-suggestions', requestData)];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, {
                                success: true,
                                data: result.data,
                                message: result.message || '批量采用推荐成功'
                            }];
                    case 2:
                        error_9 = _a.sent();
                        return [2 /*return*/, this.handleError(error_9)];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // ===========================================
    // 批量操作接口
    // ===========================================
    /**
     * 批量添加任务
     */
    DailyFocusService.prototype.batchAddDailyFocusTasks = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var requestData, result, error_10;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        requestData = {
                            task_ids: params.task_ids,
                            priority: params.priority || 'medium',
                            notes: params.notes,
                            focus_date: params.focus_date
                        };
                        return [4 /*yield*/, this.makeRequest('POST', '/daily-focus-tasks/batch', requestData)];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, {
                                success: true,
                                data: result.data,
                                message: result.message || '批量添加任务成功'
                            }];
                    case 2:
                        error_10 = _a.sent();
                        return [2 /*return*/, this.handleError(error_10)];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 清理已完成任务
     */
    DailyFocusService.prototype.clearCompletedTasks = function () {
        return __awaiter(this, arguments, void 0, function (params) {
            var focusTasksResult, completedTasks, deletePromises, deleteResults, successCount, error_11;
            var _this = this;
            var _a, _b;
            if (params === void 0) { params = {}; }
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.getDailyFocusTasks({
                                date: params.date,
                                status: 'completed'
                            })];
                    case 1:
                        focusTasksResult = _c.sent();
                        if (!focusTasksResult.success || !((_b = (_a = focusTasksResult.data) === null || _a === void 0 ? void 0 : _a.tasks) === null || _b === void 0 ? void 0 : _b.length)) {
                            return [2 /*return*/, {
                                    success: true,
                                    data: { cleared_count: 0 },
                                    message: '没有已完成的任务需要清理'
                                }];
                        }
                        if (!params.confirm) {
                            return [2 /*return*/, {
                                    success: false,
                                    error: '请确认清理操作（设置 confirm: true）'
                                }];
                        }
                        completedTasks = focusTasksResult.data.tasks;
                        deletePromises = completedTasks.map(function (task) {
                            return _this.removeDailyFocusTask(task.id);
                        });
                        return [4 /*yield*/, Promise.allSettled(deletePromises)];
                    case 2:
                        deleteResults = _c.sent();
                        successCount = deleteResults.filter(function (result) {
                            return result.status === 'fulfilled' && result.value.success;
                        }).length;
                        return [2 /*return*/, {
                                success: true,
                                data: {
                                    cleared_count: successCount,
                                    total_completed: completedTasks.length
                                },
                                message: "\u6210\u529F\u6E05\u7406 ".concat(successCount, " \u4E2A\u5DF2\u5B8C\u6210\u4EFB\u52A1")
                            }];
                    case 3:
                        error_11 = _c.sent();
                        return [2 /*return*/, this.handleError(error_11)];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    // ===========================================
    // 高级功能接口
    // ===========================================
    /**
     * 延续未完成任务
     */
    DailyFocusService.prototype.carryOverTasks = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var requestData, result, error_12;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        requestData = {
                            from_date: params.from_date,
                            to_date: params.to_date,
                            task_ids: params.task_ids,
                            update_priority: params.update_priority || false
                        };
                        return [4 /*yield*/, this.makeRequest('POST', '/daily-focus-tasks/carry-over', requestData)];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, {
                                success: true,
                                data: result.data,
                                message: result.message || '任务延续成功'
                            }];
                    case 2:
                        error_12 = _a.sent();
                        return [2 /*return*/, this.handleError(error_12)];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 获取历史记录
     */
    DailyFocusService.prototype.getDailyFocusHistory = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var queryParams, url, result, error_13;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        queryParams = new URLSearchParams();
                        queryParams.append('start_date', params.start_date);
                        queryParams.append('end_date', params.end_date);
                        if (params.limit)
                            queryParams.append('limit', params.limit.toString());
                        if (params.include_stats !== undefined) {
                            queryParams.append('include_stats', params.include_stats.toString());
                        }
                        url = "/daily-focus-tasks/history?".concat(queryParams.toString());
                        return [4 /*yield*/, this.makeRequest('GET', url)];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, {
                                success: true,
                                data: result.data,
                                message: result.message || '获取历史记录成功'
                            }];
                    case 2:
                        error_13 = _a.sent();
                        return [2 /*return*/, this.handleError(error_13)];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // ===========================================
    // 快捷操作接口
    // ===========================================
    /**
     * 快速添加当前正在进行的任务
     */
    DailyFocusService.prototype.quickAddCurrentTask = function () {
        return __awaiter(this, arguments, void 0, function (params) {
            var response, currentTask, error_14;
            var _a, _b;
            if (params === void 0) { params = {}; }
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.makeRequest('GET', '/tasks', {
                                status: ['in_progress'],
                                limit: 1
                            })];
                    case 1:
                        response = _c.sent();
                        if (!response.success || !((_b = (_a = response.data) === null || _a === void 0 ? void 0 : _a.tasks) === null || _b === void 0 ? void 0 : _b.length)) {
                            return [2 /*return*/, {
                                    success: false,
                                    error: '没有找到正在进行的任务'
                                }];
                        }
                        currentTask = response.data.tasks[0];
                        return [4 /*yield*/, this.addDailyFocusTask({
                                task_id: currentTask.id,
                                priority: params.priority || 'high',
                                notes: params.notes
                            })];
                    case 2: 
                    // 添加到今日主要任务
                    return [2 /*return*/, _c.sent()];
                    case 3:
                        error_14 = _c.sent();
                        return [2 /*return*/, this.handleError(error_14)];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 聚焦任务并开始计时
     */
    DailyFocusService.prototype.focusTaskWithTimer = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var focusTasksResult, focusTask, timerResult, error_15;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.getDailyFocusTasks()];
                    case 1:
                        focusTasksResult = _a.sent();
                        if (!focusTasksResult.success) {
                            return [2 /*return*/, focusTasksResult];
                        }
                        focusTask = focusTasksResult.data.tasks.find(function (task) { return task.id === params.daily_focus_task_id; });
                        if (!focusTask) {
                            return [2 /*return*/, {
                                    success: false,
                                    error: '找不到指定的今日主要任务'
                                }];
                        }
                        return [4 /*yield*/, this.makeRequest('POST', '/timers/start', {
                                task_id: focusTask.task_id,
                                description: params.timer_description || "\u805A\u7126\u4EFB\u52A1: ".concat(focusTask.task_title)
                            })];
                    case 2:
                        timerResult = _a.sent();
                        return [2 /*return*/, {
                                success: true,
                                data: {
                                    focus_task: focusTask,
                                    timer_result: timerResult.data
                                },
                                message: "\u5F00\u59CB\u805A\u7126\u4EFB\u52A1: ".concat(focusTask.task_title)
                            }];
                    case 3:
                        error_15 = _a.sent();
                        return [2 /*return*/, this.handleError(error_15)];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    // ===========================================
    // 实用工具方法
    // ===========================================
    /**
     * 验证今日主要任务请求参数
     */
    DailyFocusService.prototype.validateDailyFocusTaskRequest = function (params) {
        var errors = [];
        if (!params.task_id || typeof params.task_id !== 'number' || params.task_id <= 0) {
            errors.push('任务ID无效');
        }
        if (params.priority && !['critical', 'high', 'medium', 'low'].includes(params.priority)) {
            errors.push('优先级无效');
        }
        if (params.notes && typeof params.notes === 'string' && params.notes.length > 500) {
            errors.push('备注不能超过500字符');
        }
        if (params.estimated_duration_minutes &&
            (typeof params.estimated_duration_minutes !== 'number' || params.estimated_duration_minutes < 0)) {
            errors.push('预估时间必须为非负数');
        }
        return errors;
    };
    /**
     * 格式化今日主要任务数据
     */
    DailyFocusService.prototype.formatDailyFocusTask = function (task) {
        return {
            id: task.id,
            task_id: task.task_id,
            task_title: task.task_title,
            priority: task.priority,
            notes: task.notes,
            sort_order: task.sort_order,
            completed_at: task.completed_at,
            estimated_duration_minutes: task.estimated_duration_minutes,
            focus_date: task.focus_date,
            project_id: task.project_id,
            created_at: task.created_at,
            updated_at: task.updated_at
        };
    };
    return DailyFocusService;
}(base_client_js_1.BaseClient));
exports.DailyFocusService = DailyFocusService;
exports.default = DailyFocusService;
