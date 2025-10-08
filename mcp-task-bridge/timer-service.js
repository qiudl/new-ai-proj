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
exports.TimerService = void 0;
var base_client_js_1 = require("./base-client.js");
var TimerService = /** @class */ (function (_super) {
    __extends(TimerService, _super);
    function TimerService() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    // 开始计时
    // @requiresPermission('start_timer')
    TimerService.prototype.startTimer = function (taskId, description) {
        return __awaiter(this, void 0, void 0, function () {
            var payload, response, timerId, startedAt, ok, timerData, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        payload = {
                            task_id: taskId, // 修正参数名：taskId -> task_id
                            title: description || "\u8BA1\u65F6\u5668-\u4EFB\u52A1".concat(taskId), // 后端必需的title字段
                            context: "dashboard" // 添加必需的context字段
                        };
                        if (description) {
                            // 将描述作为计时器的描述信息，而不是覆盖context
                            payload.description = description;
                        }
                        return [4 /*yield*/, this.makeRequest('POST', '/user/timer/start', payload)];
                    case 1:
                        response = _a.sent();
                        timerId = response === null || response === void 0 ? void 0 : response.timer_id;
                        startedAt = response === null || response === void 0 ? void 0 : response.started_at;
                        ok = (response === null || response === void 0 ? void 0 : response.success) === undefined ? (timerId !== undefined) : !!(response === null || response === void 0 ? void 0 : response.success);
                        if (ok && timerId !== undefined) {
                            timerData = {
                                id: timerId,
                                task_id: taskId,
                                started_at: startedAt || new Date().toISOString(),
                                description: description
                            };
                            return [2 /*return*/, {
                                    success: true,
                                    data: timerData,
                                    task_id: taskId,
                                    timer_id: timerId,
                                    started_at: startedAt,
                                    description: description,
                                    message: (response === null || response === void 0 ? void 0 : response.message) || "\u23F1\uFE0F \u4EFB\u52A1 \"".concat(taskId, "\" \u5F00\u59CB\u8BA1\u65F6")
                                }];
                        }
                        else {
                            return [2 /*return*/, {
                                    success: false,
                                    error: (response === null || response === void 0 ? void 0 : response.error) || '开始计时失败'
                                }];
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        error_1 = _a.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u5F00\u59CB\u8BA1\u65F6\u5931\u8D25: ".concat(error_1.message || error_1)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 停止计时
    // @requiresPermission('stop_timer')
    TimerService.prototype.stopTimer = function (taskId) {
        return __awaiter(this, void 0, void 0, function () {
            var response, timerData, durationFormatted, error_2;
            var _a, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _d.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.makeRequest('POST', '/user/timer/stop', {})];
                    case 1:
                        response = _d.sent();
                        if (response && response.success) {
                            timerData = {
                                id: response.timer_id || 0,
                                task_id: taskId || 0,
                                started_at: response.started_at || '',
                                stopped_at: new Date().toISOString(),
                                duration_seconds: ((_a = response.data) === null || _a === void 0 ? void 0 : _a.total_duration) || 0
                            };
                            durationFormatted = this.formatDuration(((_b = response.data) === null || _b === void 0 ? void 0 : _b.total_duration) || 0);
                            return [2 /*return*/, {
                                    success: true,
                                    data: timerData,
                                    task_id: taskId,
                                    timer_id: response.timer_id,
                                    started_at: response.started_at,
                                    stopped_at: new Date().toISOString(),
                                    duration_seconds: ((_c = response.data) === null || _c === void 0 ? void 0 : _c.total_duration) || 0,
                                    duration_formatted: durationFormatted,
                                    message: response.message || "\u23F9\uFE0F \u8BA1\u65F6\u5DF2\u505C\u6B62 (\u7528\u65F6: ".concat(durationFormatted, ")")
                                }];
                        }
                        else {
                            // Handle API error responses gracefully
                            if (response && !response.success) {
                                // Return the API error response as-is without additional wrapping
                                return [2 /*return*/, {
                                        success: false,
                                        error: response.error || '停止计时失败'
                                    }];
                            }
                            return [2 /*return*/, { success: false, error: '停止计时失败' }];
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        error_2 = _d.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u505C\u6B62\u8BA1\u65F6\u5931\u8D25: ".concat(error_2.message || error_2)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 获取当前计时状态（兼容多计时器改造后的返回）
    TimerService.prototype.getCurrentTimer = function () {
        return __awaiter(this, void 0, void 0, function () {
            var resp, t, active, activeTimers, error_3;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.makeRequest('GET', '/user/timer/current')];
                    case 1:
                        resp = _b.sent();
                        // 如果后端直接返回计时器对象（无 success 字段）
                        if (resp && resp.id !== undefined) {
                            t = resp;
                            active = {
                                id: t.id,
                                task_id: t.target_id || 0,
                                started_at: t.start_time,
                                description: t.description,
                                duration_seconds: t.elapsed_seconds
                            };
                            return [2 /*return*/, {
                                    success: true,
                                    data: { active_timers: [active] },
                                    active_count: 1,
                                    timers: [t],
                                    message: '⏰ 存在一个活动计时器'
                                }];
                        }
                        // 若按旧格式返回（带 success/data/active_timers）
                        if ((resp === null || resp === void 0 ? void 0 : resp.success) && ((_a = resp === null || resp === void 0 ? void 0 : resp.data) === null || _a === void 0 ? void 0 : _a.active_timers)) {
                            activeTimers = resp.data.active_timers.map(function (timer) { return ({
                                id: timer.timer_id,
                                task_id: timer.task_id,
                                started_at: timer.started_at,
                                duration_seconds: timer.duration_seconds,
                                description: timer.description
                            }); });
                            return [2 /*return*/, {
                                    success: true,
                                    data: { active_timers: activeTimers },
                                    active_count: activeTimers.length,
                                    timers: resp.data.active_timers,
                                    message: activeTimers.length > 0 ? "\u23F0 \u5F53\u524D\u6709 ".concat(activeTimers.length, " \u4E2A\u6D3B\u8DC3\u8BA1\u65F6\u5668") : '📝 当前无活跃计时器'
                                }];
                        }
                        return [2 /*return*/, { success: true, data: { active_timers: [] }, active_count: 0, timers: [], message: '📝 当前无活跃计时器' }];
                    case 2:
                        error_3 = _b.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u83B7\u53D6\u5F53\u524D\u8BA1\u65F6\u72B6\u6001\u5931\u8D25: ".concat(error_3.message || error_3)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 获取所有活跃计时器（running/paused）
    TimerService.prototype.getActiveTimers = function () {
        return __awaiter(this, void 0, void 0, function () {
            var resp, timers, mapped, activeTimers, error_4;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.makeRequest('GET', '/user/timer/active')];
                    case 1:
                        resp = _b.sent();
                        timers = (resp === null || resp === void 0 ? void 0 : resp.timers) || [];
                        if (Array.isArray(timers)) {
                            mapped = timers.map(function (t) { return ({
                                id: t.id,
                                task_id: t.target_id || 0,
                                started_at: t.start_time,
                                description: t.description,
                                duration_seconds: t.elapsed_seconds
                            }); });
                            return [2 /*return*/, {
                                    success: true,
                                    data: { active_timers: mapped },
                                    active_count: mapped.length,
                                    timers: timers,
                                    message: mapped.length > 0 ? "\u23F0 \u5F53\u524D\u6709 ".concat(mapped.length, " \u4E2A\u6D3B\u8DC3\u8BA1\u65F6\u5668") : '📝 当前无活跃计时器'
                                }];
                        }
                        // 兼容老格式
                        if ((resp === null || resp === void 0 ? void 0 : resp.success) && ((_a = resp === null || resp === void 0 ? void 0 : resp.data) === null || _a === void 0 ? void 0 : _a.active_timers)) {
                            activeTimers = resp.data.active_timers;
                            return [2 /*return*/, { success: true, data: { active_timers: activeTimers }, active_count: activeTimers.length, timers: activeTimers }];
                        }
                        return [2 /*return*/, { success: true, data: { active_timers: [] }, active_count: 0, timers: [], message: '📝 当前无活跃计时器' }];
                    case 2:
                        error_4 = _b.sent();
                        return [2 /*return*/, { success: false, error: "\u83B7\u53D6\u6D3B\u8DC3\u8BA1\u65F6\u5668\u5931\u8D25: ".concat(error_4.message || error_4) }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 获取任务计时历史
    TimerService.prototype.getTaskTimerHistory = function (taskId_1) {
        return __awaiter(this, arguments, void 0, function (taskId, limit, offset) {
            var response, timers, total, error_5;
            if (limit === void 0) { limit = 10; }
            if (offset === void 0) { offset = 0; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.makeRequest('GET', "/tasks/".concat(taskId, "/timers"), undefined, {
                                limit: limit.toString(),
                                offset: offset.toString()
                            })];
                    case 1:
                        response = _a.sent();
                        if (response.success && response.data) {
                            timers = response.data.timers || [];
                            total = response.data.total || timers.length;
                            return [2 /*return*/, {
                                    success: true,
                                    task_id: taskId,
                                    timers: timers,
                                    total: total,
                                    limit: limit,
                                    offset: offset,
                                    message: "\uD83D\uDCCA \u83B7\u53D6\u5230\u4EFB\u52A1 ".concat(taskId, " \u7684 ").concat(timers.length, " \u6761\u8BA1\u65F6\u8BB0\u5F55")
                                }];
                        }
                        else {
                            return [2 /*return*/, response];
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        error_5 = _a.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u83B7\u53D6\u4EFB\u52A1\u8BA1\u65F6\u5386\u53F2\u5931\u8D25: ".concat(error_5.message || error_5)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 获取计时器统计信息
    TimerService.prototype.getTimerStats = function (taskId, dateFrom, dateTo) {
        return __awaiter(this, void 0, void 0, function () {
            var params, response, error_6;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        params = {};
                        if (taskId)
                            params.task_id = taskId;
                        if (dateFrom)
                            params.date_from = dateFrom;
                        if (dateTo)
                            params.date_to = dateTo;
                        return [4 /*yield*/, this.makeRequest('GET', '/timers/stats', undefined, params)];
                    case 1:
                        response = _a.sent();
                        if (response.success && response.data) {
                            return [2 /*return*/, {
                                    success: true,
                                    stats: response.data,
                                    task_id: taskId,
                                    date_range: { from: dateFrom, to: dateTo },
                                    message: "\uD83D\uDCC8 \u8BA1\u65F6\u5668\u7EDF\u8BA1\u4FE1\u606F\u83B7\u53D6\u6210\u529F".concat(taskId ? " (\u4EFB\u52A1 ".concat(taskId, ")") : '')
                                }];
                        }
                        else {
                            return [2 /*return*/, response];
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        error_6 = _a.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u83B7\u53D6\u8BA1\u65F6\u5668\u7EDF\u8BA1\u5931\u8D25: ".concat(error_6.message || error_6)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 暂停计时器
    // @requiresPermission('pause_timer')
    TimerService.prototype.pauseTimer = function (timerId) {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_7;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.makeRequest('PUT', "/timers/".concat(timerId, "/pause"))];
                    case 1:
                        response = _a.sent();
                        if (response.success) {
                            return [2 /*return*/, {
                                    success: true,
                                    timer_id: timerId,
                                    status: 'paused',
                                    message: "\u23F8\uFE0F \u8BA1\u65F6\u5668 ".concat(timerId, " \u5DF2\u6682\u505C")
                                }];
                        }
                        else {
                            return [2 /*return*/, response];
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        error_7 = _a.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u6682\u505C\u8BA1\u65F6\u5668\u5931\u8D25: ".concat(error_7.message || error_7)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 恢复计时器
    // @requiresPermission('resume_timer')
    TimerService.prototype.resumeTimer = function (timerId) {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_8;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.makeRequest('PUT', "/timers/".concat(timerId, "/resume"))];
                    case 1:
                        response = _a.sent();
                        if (response.success) {
                            return [2 /*return*/, {
                                    success: true,
                                    timer_id: timerId,
                                    status: 'active',
                                    message: "\u25B6\uFE0F \u8BA1\u65F6\u5668 ".concat(timerId, " \u5DF2\u6062\u590D")
                                }];
                        }
                        else {
                            return [2 /*return*/, response];
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        error_8 = _a.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u6062\u590D\u8BA1\u65F6\u5668\u5931\u8D25: ".concat(error_8.message || error_8)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 删除计时记录
    // @requiresPermission('delete_timer')
    TimerService.prototype.deleteTimer = function (timerId) {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_9;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.makeRequest('DELETE', "/timers/".concat(timerId))];
                    case 1:
                        response = _a.sent();
                        if (response.success) {
                            return [2 /*return*/, {
                                    success: true,
                                    timer_id: timerId,
                                    message: "\uD83D\uDDD1\uFE0F \u8BA1\u65F6\u8BB0\u5F55 ".concat(timerId, " \u5DF2\u5220\u9664")
                                }];
                        }
                        else {
                            return [2 /*return*/, response];
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        error_9 = _a.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u5220\u9664\u8BA1\u65F6\u8BB0\u5F55\u5931\u8D25: ".concat(error_9.message || error_9)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 更新计时器描述
    // @requiresPermission('update_timer')
    TimerService.prototype.updateTimerDescription = function (timerId, description) {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_10;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.makeRequest('PUT', "/timers/".concat(timerId), {
                                description: description
                            })];
                    case 1:
                        response = _a.sent();
                        if (response.success) {
                            return [2 /*return*/, {
                                    success: true,
                                    timer_id: timerId,
                                    description: description,
                                    message: "\uD83D\uDCDD \u8BA1\u65F6\u5668 ".concat(timerId, " \u63CF\u8FF0\u5DF2\u66F4\u65B0")
                                }];
                        }
                        else {
                            return [2 /*return*/, response];
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        error_10 = _a.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u66F4\u65B0\u8BA1\u65F6\u5668\u63CF\u8FF0\u5931\u8D25: ".concat(error_10.message || error_10)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 获取今日工作报告（包含计时统计）
    TimerService.prototype.getDailyWorkReport = function () {
        return __awaiter(this, arguments, void 0, function (projectId) {
            var response, error_11;
            if (projectId === void 0) { projectId = 1; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.makeRequest('GET', '/mcp/get-daily-work-report', undefined, {
                                projectId: projectId
                            })];
                    case 1:
                        response = _a.sent();
                        if (response.success && response.data) {
                            return [2 /*return*/, {
                                    success: true,
                                    project_id: projectId,
                                    report: response.data,
                                    date: new Date().toISOString().split('T')[0],
                                    message: "\uD83D\uDCCA \u4ECA\u65E5\u5DE5\u4F5C\u62A5\u544A\u751F\u6210\u6210\u529F (\u9879\u76EE ".concat(projectId, ")")
                                }];
                        }
                        else {
                            return [2 /*return*/, response];
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        error_11 = _a.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u83B7\u53D6\u4ECA\u65E5\u5DE5\u4F5C\u62A5\u544A\u5931\u8D25: ".concat(error_11.message || error_11)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 批量停止计时器
    // @requiresPermission('stop_timer')
    TimerService.prototype.batchStopTimers = function (taskIds) {
        return __awaiter(this, void 0, void 0, function () {
            var currentTimersResponse, activeTimers, timersToStop, results, successCount, errorCount, _i, timersToStop_1, timer, result, error_12, error_13;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 8, , 9]);
                        return [4 /*yield*/, this.getCurrentTimer()];
                    case 1:
                        currentTimersResponse = _a.sent();
                        if (!currentTimersResponse.success || !currentTimersResponse.data) {
                            return [2 /*return*/, { success: false, error: '获取当前计时器失败' }];
                        }
                        activeTimers = currentTimersResponse.data.active_timers;
                        if (activeTimers.length === 0) {
                            return [2 /*return*/, {
                                    success: true,
                                    stopped_count: 0,
                                    message: '📝 当前无活跃计时器需要停止'
                                }];
                        }
                        timersToStop = activeTimers;
                        if (taskIds && taskIds.length > 0) {
                            timersToStop = activeTimers.filter(function (timer) { return taskIds.includes(timer.task_id); });
                        }
                        if (timersToStop.length === 0) {
                            return [2 /*return*/, {
                                    success: true,
                                    stopped_count: 0,
                                    message: '📝 没有符合条件的计时器需要停止'
                                }];
                        }
                        results = [];
                        successCount = 0;
                        errorCount = 0;
                        _i = 0, timersToStop_1 = timersToStop;
                        _a.label = 2;
                    case 2:
                        if (!(_i < timersToStop_1.length)) return [3 /*break*/, 7];
                        timer = timersToStop_1[_i];
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, 5, , 6]);
                        return [4 /*yield*/, this.stopTimer(timer.task_id)];
                    case 4:
                        result = _a.sent();
                        results.push({ task_id: timer.task_id, success: result.success, result: result });
                        if (result.success)
                            successCount++;
                        else
                            errorCount++;
                        return [3 /*break*/, 6];
                    case 5:
                        error_12 = _a.sent();
                        results.push({ task_id: timer.task_id, success: false, error: error_12.message });
                        errorCount++;
                        return [3 /*break*/, 6];
                    case 6:
                        _i++;
                        return [3 /*break*/, 2];
                    case 7: return [2 /*return*/, {
                            success: errorCount === 0,
                            total_processed: timersToStop.length,
                            success_count: successCount,
                            error_count: errorCount,
                            results: results,
                            message: "\u23F9\uFE0F \u6279\u91CF\u505C\u6B62\u8BA1\u65F6\u5668\u5B8C\u6210: \u6210\u529F ".concat(successCount, " \u4E2A\uFF0C\u5931\u8D25 ").concat(errorCount, " \u4E2A")
                        }];
                    case 8:
                        error_13 = _a.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u6279\u91CF\u505C\u6B62\u8BA1\u65F6\u5668\u5931\u8D25: ".concat(error_13.message || error_13)
                            }];
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    // 格式化时长
    TimerService.prototype.formatDuration = function (seconds) {
        if (!seconds || seconds < 0)
            return '0秒';
        var hours = Math.floor(seconds / 3600);
        var minutes = Math.floor((seconds % 3600) / 60);
        var remainingSeconds = seconds % 60;
        var parts = [];
        if (hours > 0)
            parts.push("".concat(hours, "\u5C0F\u65F6"));
        if (minutes > 0)
            parts.push("".concat(minutes, "\u5206\u949F"));
        if (remainingSeconds > 0 || parts.length === 0)
            parts.push("".concat(remainingSeconds, "\u79D2"));
        return parts.join('');
    };
    // 计算工作效率
    TimerService.prototype.calculateWorkEfficiency = function (taskId, dateFrom, dateTo) {
        return __awaiter(this, void 0, void 0, function () {
            var historyResponse, timers, filteredTimers, totalDuration, sessionCount, averageSessionDuration, dailyStats_1, error_14;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.getTaskTimerHistory(taskId, 100, 0)];
                    case 1:
                        historyResponse = _a.sent();
                        if (!historyResponse.success) {
                            return [2 /*return*/, historyResponse];
                        }
                        timers = historyResponse.timers || [];
                        filteredTimers = timers;
                        if (dateFrom || dateTo) {
                            filteredTimers = timers.filter(function (timer) {
                                var timerDate = new Date(timer.started_at).toISOString().split('T')[0];
                                if (dateFrom && timerDate < dateFrom)
                                    return false;
                                if (dateTo && timerDate > dateTo)
                                    return false;
                                return true;
                            });
                        }
                        totalDuration = filteredTimers.reduce(function (sum, timer) { return sum + (timer.duration_seconds || 0); }, 0);
                        sessionCount = filteredTimers.length;
                        averageSessionDuration = sessionCount > 0 ? totalDuration / sessionCount : 0;
                        dailyStats_1 = {};
                        filteredTimers.forEach(function (timer) {
                            var date = new Date(timer.started_at).toISOString().split('T')[0];
                            if (!dailyStats_1[date]) {
                                dailyStats_1[date] = { duration: 0, sessions: 0 };
                            }
                            dailyStats_1[date].duration += timer.duration_seconds || 0;
                            dailyStats_1[date].sessions += 1;
                        });
                        return [2 /*return*/, {
                                success: true,
                                task_id: taskId,
                                date_range: { from: dateFrom, to: dateTo },
                                efficiency_stats: {
                                    total_duration: totalDuration,
                                    total_duration_formatted: this.formatDuration(totalDuration),
                                    session_count: sessionCount,
                                    average_session_duration: averageSessionDuration,
                                    average_session_duration_formatted: this.formatDuration(Math.round(averageSessionDuration)),
                                    daily_stats: dailyStats_1,
                                    working_days: Object.keys(dailyStats_1).length
                                },
                                message: "\uD83D\uDCC8 \u4EFB\u52A1 ".concat(taskId, " \u7684\u5DE5\u4F5C\u6548\u7387\u5206\u6790\u5B8C\u6210")
                            }];
                    case 2:
                        error_14 = _a.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u8BA1\u7B97\u5DE5\u4F5C\u6548\u7387\u5931\u8D25: ".concat(error_14.message || error_14)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return TimerService;
}(base_client_js_1.BaseClient));
exports.TimerService = TimerService;
