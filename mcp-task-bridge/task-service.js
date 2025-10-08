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
exports.TaskService = void 0;
var base_client_js_1 = require("./base-client.js");
var TaskService = /** @class */ (function (_super) {
    __extends(TaskService, _super);
    function TaskService() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    // 通过ID查找任务
    TaskService.prototype.findTaskById = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.makeRequest('GET', "/tasks/".concat(id))];
                    case 1:
                        response = _a.sent();
                        if (response.success && response.data) {
                            return [2 /*return*/, response.data];
                        }
                        // 包含响应详情的错误信息
                        throw new Error("\u4EFB\u52A1 ID ".concat(id, " \u4E0D\u5B58\u5728\uFF0C\u54CD\u5E94: ").concat(JSON.stringify({ success: response.success, hasData: !!response.data, error: response.error })));
                    case 2:
                        error_1 = _a.sent();
                        throw new Error("\u67E5\u627E\u4EFB\u52A1\u5931\u8D25: ".concat((error_1 === null || error_1 === void 0 ? void 0 : error_1.message) || String(error_1)));
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 创建任务
    // @requiresPermission('create_task')
    TaskService.prototype.createTask = function (title_1) {
        return __awaiter(this, arguments, void 0, function (title, projectId, options) {
            var taskData, response, error_2;
            if (projectId === void 0) { projectId = 1; }
            if (options === void 0) { options = {}; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        console.error("[DEBUG] \u521B\u5EFA\u4EFB\u52A1: ".concat(title, ", \u9879\u76EEID: ").concat(projectId).concat(options.parent_id ? ", \u7236\u4EFB\u52A1ID: ".concat(options.parent_id) : ''));
                        taskData = {
                            title: title,
                            project_id: projectId,
                            status: options.status || 'todo', // 默认状态改为'todo'（待开始）
                            description: options.description || "\u901A\u8FC7Claude Code\u521B\u5EFA\uFF1A".concat(title),
                            custom_fields: __assign({ priority: options.priority || 'low' }, options.custom_fields)
                        };
                        // 如果有parent_id，添加到请求中
                        if (options.parent_id) {
                            taskData.parent_id = options.parent_id;
                        }
                        // 添加预估工时
                        if (options.estimated_hours) {
                            taskData.custom_fields.estimated_hours = options.estimated_hours;
                        }
                        // 添加标签
                        if (options.tags && options.tags.length > 0) {
                            taskData.custom_fields.tags = options.tags;
                        }
                        return [4 /*yield*/, this.makeRequest('POST', "/projects/".concat(projectId, "/tasks"), taskData)];
                    case 1:
                        response = _a.sent();
                        if (response.success) {
                            return [2 /*return*/, {
                                    success: true,
                                    data: response.data,
                                    message: "\u2705 \u4EFB\u52A1 \"".concat(title, "\" \u521B\u5EFA\u6210\u529F").concat(options.parent_id ? " (\u5B50\u4EFB\u52A1\uFF0C\u7236\u4EFB\u52A1ID: ".concat(options.parent_id, ")") : '')
                                }];
                        }
                        else {
                            return [2 /*return*/, response];
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        error_2 = _a.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u521B\u5EFA\u4EFB\u52A1\u5931\u8D25: ".concat(error_2.message || error_2)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 开始任务
    // @requiresPermission('update_task')
    TaskService.prototype.startTask = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var task, response, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.findTaskById(id)];
                    case 1:
                        task = _a.sent();
                        if (!task) {
                            return [2 /*return*/, { success: false, error: "\u4EFB\u52A1 ".concat(id, " \u4E0D\u5B58\u5728") }];
                        }
                        return [4 /*yield*/, this.makeRequest('PUT', "/projects/".concat(task.project_id, "/tasks/").concat(id), {
                                status: 'in_progress'
                            })];
                    case 2:
                        response = _a.sent();
                        if (response.success) {
                            return [2 /*return*/, {
                                    success: true,
                                    id: id,
                                    title: task.title,
                                    status: 'in_progress',
                                    message: "\uD83D\uDE80 \u4EFB\u52A1 \"".concat(task.title, "\" \u5DF2\u5F00\u59CB\u6267\u884C")
                                }];
                        }
                        else {
                            return [2 /*return*/, response];
                        }
                        return [3 /*break*/, 4];
                    case 3:
                        error_3 = _a.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u542F\u52A8\u4EFB\u52A1\u5931\u8D25: ".concat(error_3.message || error_3)
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    // 完成任务
    // @requiresPermission('update_task')
    TaskService.prototype.completeTask = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var task, response, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.findTaskById(id)];
                    case 1:
                        task = _a.sent();
                        if (!task) {
                            return [2 /*return*/, { success: false, error: "\u4EFB\u52A1 ".concat(id, " \u4E0D\u5B58\u5728") }];
                        }
                        return [4 /*yield*/, this.makeRequest('PUT', "/projects/".concat(task.project_id, "/tasks/").concat(id), {
                                status: 'completed'
                            })];
                    case 2:
                        response = _a.sent();
                        if (response.success) {
                            return [2 /*return*/, {
                                    success: true,
                                    id: id,
                                    title: task.title,
                                    status: 'completed',
                                    message: "\uD83C\uDF89 \u4EFB\u52A1 \"".concat(task.title, "\" \u5DF2\u5B8C\u6210")
                                }];
                        }
                        else {
                            return [2 /*return*/, response];
                        }
                        return [3 /*break*/, 4];
                    case 3:
                        error_4 = _a.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u5B8C\u6210\u4EFB\u52A1\u5931\u8D25: ".concat(error_4.message || error_4)
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    // 暂停任务
    // @requiresPermission('update_task')
    TaskService.prototype.pauseTask = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var task, response, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.findTaskById(id)];
                    case 1:
                        task = _a.sent();
                        if (!task) {
                            return [2 /*return*/, { success: false, error: "\u4EFB\u52A1 ".concat(id, " \u4E0D\u5B58\u5728") }];
                        }
                        return [4 /*yield*/, this.makeRequest('PUT', "/projects/".concat(task.project_id, "/tasks/").concat(id), {
                                status: 'on_hold'
                            })];
                    case 2:
                        response = _a.sent();
                        if (response.success) {
                            return [2 /*return*/, {
                                    success: true,
                                    id: id,
                                    title: task.title,
                                    status: 'on_hold',
                                    message: "\u23F8\uFE0F \u4EFB\u52A1 \"".concat(task.title, "\" \u5DF2\u6682\u505C")
                                }];
                        }
                        else {
                            return [2 /*return*/, response];
                        }
                        return [3 /*break*/, 4];
                    case 3:
                        error_5 = _a.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u6682\u505C\u4EFB\u52A1\u5931\u8D25: ".concat(error_5.message || error_5)
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    // 更新任务标题
    // @requiresPermission('update_task')
    TaskService.prototype.updateTaskTitle = function (id, newTitle) {
        return __awaiter(this, void 0, void 0, function () {
            var task, response, error_6;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!newTitle.trim()) {
                            return [2 /*return*/, { success: false, error: '任务标题不能为空' }];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 4, , 5]);
                        return [4 /*yield*/, this.findTaskById(id)];
                    case 2:
                        task = _a.sent();
                        if (!task) {
                            return [2 /*return*/, { success: false, error: "\u4EFB\u52A1 ".concat(id, " \u4E0D\u5B58\u5728") }];
                        }
                        return [4 /*yield*/, this.makeRequest('PUT', "/projects/".concat(task.project_id, "/tasks/").concat(id), {
                                title: newTitle.trim()
                            })];
                    case 3:
                        response = _a.sent();
                        if (response.success) {
                            return [2 /*return*/, {
                                    success: true,
                                    id: id,
                                    old_title: task.title,
                                    new_title: newTitle.trim(),
                                    message: "\uD83D\uDCDD \u4EFB\u52A1\u6807\u9898\u5DF2\u66F4\u65B0: \"".concat(task.title, "\" -> \"").concat(newTitle.trim(), "\"")
                                }];
                        }
                        else {
                            return [2 /*return*/, response];
                        }
                        return [3 /*break*/, 5];
                    case 4:
                        error_6 = _a.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u66F4\u65B0\u4EFB\u52A1\u6807\u9898\u5931\u8D25: ".concat(error_6.message || error_6)
                            }];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    // 更新任务描述
    // @requiresPermission('update_task')
    TaskService.prototype.updateTaskDescription = function (id, newDescription) {
        return __awaiter(this, void 0, void 0, function () {
            var task, response, error_7;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.findTaskById(id)];
                    case 1:
                        task = _a.sent();
                        if (!task) {
                            return [2 /*return*/, { success: false, error: "\u4EFB\u52A1 ".concat(id, " \u4E0D\u5B58\u5728") }];
                        }
                        return [4 /*yield*/, this.makeRequest('PUT', "/projects/".concat(task.project_id, "/tasks/").concat(id), {
                                description: newDescription
                            })];
                    case 2:
                        response = _a.sent();
                        if (response.success) {
                            return [2 /*return*/, {
                                    success: true,
                                    id: id,
                                    title: task.title,
                                    new_description: newDescription,
                                    message: "\uD83D\uDCC4 \u4EFB\u52A1 \"".concat(task.title, "\" \u7684\u63CF\u8FF0\u5DF2\u66F4\u65B0")
                                }];
                        }
                        else {
                            return [2 /*return*/, response];
                        }
                        return [3 /*break*/, 4];
                    case 3:
                        error_7 = _a.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u66F4\u65B0\u4EFB\u52A1\u63CF\u8FF0\u5931\u8D25: ".concat(error_7.message || error_7)
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    // 列出任务
    TaskService.prototype.listTasks = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var page, limit, sort_by, sort_order, url, queryParams, response, tasks, total, totalPages, pagination, result, error_8;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        page = (params === null || params === void 0 ? void 0 : params.page) || 1;
                        limit = Math.min((params === null || params === void 0 ? void 0 : params.limit) || 20, 100);
                        sort_by = (params === null || params === void 0 ? void 0 : params.sort_by) || 'updated_at';
                        sort_order = (params === null || params === void 0 ? void 0 : params.sort_order) || 'desc';
                        url = '/tasks';
                        queryParams = {
                            page: page,
                            page_size: limit,
                            sort_by: sort_by,
                            sort_order: sort_order
                        };
                        // 项目ID过滤
                        if (params === null || params === void 0 ? void 0 : params.projectId) {
                            url = "/projects/".concat(params.projectId, "/tasks");
                        }
                        // 状态过滤
                        if ((params === null || params === void 0 ? void 0 : params.status) && params.status.length > 0) {
                            queryParams.status = params.status.join(',');
                        }
                        // 优先级过滤
                        if ((params === null || params === void 0 ? void 0 : params.priority) && params.priority.length > 0) {
                            queryParams.priority = params.priority.join(',');
                        }
                        // 搜索关键词
                        if (params === null || params === void 0 ? void 0 : params.search) {
                            queryParams.search = params.search;
                        }
                        return [4 /*yield*/, this.makeRequest('GET', url, undefined, queryParams)];
                    case 1:
                        response = _b.sent();
                        if (response.success && response.data) {
                            tasks = response.data.data || [];
                            total = response.data.total || response.data.count || ((_a = response.data.pagination) === null || _a === void 0 ? void 0 : _a.total) || tasks.length;
                            totalPages = Math.ceil(total / limit);
                            pagination = {
                                page: page,
                                limit: limit,
                                total: total,
                                totalPages: totalPages,
                                hasNext: page < totalPages,
                                hasPrev: page > 1
                            };
                            result = {
                                tasks: tasks,
                                total: total,
                                pagination: pagination
                            };
                            return [2 /*return*/, {
                                    success: true,
                                    data: result,
                                    total: total,
                                    message: "\uD83D\uDCCB \u83B7\u53D6\u5230 ".concat(tasks.length, "/").concat(total, " \u4E2A\u4EFB\u52A1 (\u7B2C").concat(page, "/").concat(totalPages, "\u9875)").concat((params === null || params === void 0 ? void 0 : params.projectId) ? " - \u9879\u76EE".concat(params.projectId) : '').concat((params === null || params === void 0 ? void 0 : params.status) ? " - \u72B6\u6001: ".concat(params.status.join(',')) : '').concat((params === null || params === void 0 ? void 0 : params.search) ? " - \u641C\u7D22: \"".concat(params.search, "\"") : '')
                                }];
                        }
                        else {
                            return [2 /*return*/, {
                                    success: false,
                                    error: response.error || '获取任务列表失败',
                                    data: { tasks: [], total: 0, pagination: { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false } }
                                }];
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        error_8 = _b.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u83B7\u53D6\u4EFB\u52A1\u5217\u8868\u5931\u8D25: ".concat(error_8.message || error_8),
                                data: { tasks: [], total: 0, pagination: { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false } }
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 创建子任务
    // @requiresPermission('create_task')
    TaskService.prototype.createSubTask = function (parentId, taskData) {
        return __awaiter(this, void 0, void 0, function () {
            var parentTask, subTaskData, result, error_9;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.findTaskById(parentId)];
                    case 1:
                        parentTask = _a.sent();
                        if (!parentTask) {
                            return [2 /*return*/, { success: false, error: "\u7236\u4EFB\u52A1 ID ".concat(parentId, " \u4E0D\u5B58\u5728") }];
                        }
                        subTaskData = void 0;
                        if (typeof taskData === 'string') {
                            subTaskData = {
                                title: taskData,
                                priority: 'low',
                                status: 'todo'
                            };
                        }
                        else {
                            subTaskData = __assign({}, taskData);
                        }
                        return [4 /*yield*/, this.createTask(subTaskData.title, parentTask.project_id, __assign(__assign({}, subTaskData), { parent_id: parentId }))];
                    case 2:
                        result = _a.sent();
                        if (result.success) {
                            return [2 /*return*/, {
                                    success: true,
                                    parent_id: parentId,
                                    parent_title: parentTask.title,
                                    subtask: result.data,
                                    message: "\u2705 \u6210\u529F\u4E3A\u4EFB\u52A1 \"".concat(parentTask.title, "\" \u521B\u5EFA\u5B50\u4EFB\u52A1 \"").concat(subTaskData.title, "\"")
                                }];
                        }
                        else {
                            return [2 /*return*/, result];
                        }
                        return [3 /*break*/, 4];
                    case 3:
                        error_9 = _a.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u521B\u5EFA\u5B50\u4EFB\u52A1\u5931\u8D25: ".concat(error_9.message || error_9)
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    // 创建兄弟任务
    // @requiresPermission('create_task')
    TaskService.prototype.createSiblingTask = function (siblingId_1, title_1) {
        return __awaiter(this, arguments, void 0, function (siblingId, title, options) {
            var siblingTask, result, error_10;
            var _a;
            if (options === void 0) { options = {}; }
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.findTaskById(siblingId)];
                    case 1:
                        siblingTask = _b.sent();
                        if (!siblingTask) {
                            return [2 /*return*/, { success: false, error: "\u5144\u5F1F\u4EFB\u52A1 ID ".concat(siblingId, " \u4E0D\u5B58\u5728") }];
                        }
                        return [4 /*yield*/, this.createTask(title, siblingTask.project_id, {
                                description: options.description,
                                priority: options.priority || ((_a = siblingTask.custom_fields) === null || _a === void 0 ? void 0 : _a.priority) || 'medium',
                                status: options.status || 'todo',
                                parent_id: siblingTask.parent_id || siblingTask.parent_task_id
                            })];
                    case 2:
                        result = _b.sent();
                        if (result.success) {
                            return [2 /*return*/, {
                                    success: true,
                                    sibling_id: siblingId,
                                    sibling_title: siblingTask.title,
                                    new_task: result.data,
                                    message: "\u2705 \u6210\u529F\u521B\u5EFA\u5144\u5F1F\u4EFB\u52A1 \"".concat(title, "\"\uFF0C\u4E0E\u4EFB\u52A1 \"").concat(siblingTask.title, "\" \u540C\u7EA7")
                                }];
                        }
                        else {
                            return [2 /*return*/, result];
                        }
                        return [3 /*break*/, 4];
                    case 3:
                        error_10 = _b.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u521B\u5EFA\u5144\u5F1F\u4EFB\u52A1\u5931\u8D25: ".concat(error_10.message || error_10)
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    // 按名称查找任务
    TaskService.prototype.findTaskByName = function (titlePattern) {
        return __awaiter(this, void 0, void 0, function () {
            var response, tasks, error_11;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!titlePattern.trim()) {
                            return [2 /*return*/, { success: false, error: '搜索关键词不能为空' }];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.makeRequest('GET', '/tasks', undefined, { search: titlePattern.trim(), page: 1, page_size: 100 })];
                    case 2:
                        response = _a.sent();
                        if (response.success && response.data) {
                            tasks = response.data.data || [];
                            return [2 /*return*/, {
                                    success: true,
                                    data: { tasks: tasks },
                                    total: tasks.length,
                                    query: titlePattern.trim(),
                                    message: "\uD83D\uDD0D \u901A\u8FC7\u540D\u79F0\u627E\u5230 ".concat(tasks.length, " \u4E2A\u5339\u914D\u4EFB\u52A1")
                                }];
                        }
                        else {
                            return [2 /*return*/, {
                                    success: false,
                                    error: response.error || '按名称查找任务失败'
                                }];
                        }
                        return [3 /*break*/, 4];
                    case 3:
                        error_11 = _a.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u6309\u540D\u79F0\u67E5\u627E\u4EFB\u52A1\u5931\u8D25: ".concat(error_11.message || error_11)
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    // 通用查找任务方法
    TaskService.prototype.findTask = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var task, error_12, error_13;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.error("[DEBUG] findTask called with params:", JSON.stringify(params));
                        if (!params.id && !params.titlePattern) {
                            return [2 /*return*/, { success: false, error: '必须提供任务ID或标题搜索关键词' }];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 10, , 11]);
                        if (!params.id) return [3 /*break*/, 6];
                        console.error("[DEBUG] \u6309ID\u67E5\u627E\u4EFB\u52A1: ".concat(params.id));
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, this.findTaskById(params.id)];
                    case 3:
                        task = _a.sent();
                        console.error("[DEBUG] findTaskById\u6210\u529F\uFF0C\u4EFB\u52A1\u6807\u9898: ".concat(task.title));
                        return [2 /*return*/, {
                                success: true,
                                data: { tasks: [task] },
                                total: 1,
                                message: "\uD83D\uDD0D \u901A\u8FC7ID\u627E\u5230 1 \u4E2A\u4EFB\u52A1"
                            }];
                    case 4:
                        error_12 = _a.sent();
                        console.error("[DEBUG] findTaskById\u5931\u8D25:", error_12.message || error_12);
                        // 直接返回 findTaskById 的错误信息，不再包装
                        return [2 /*return*/, {
                                success: false,
                                error: error_12.message || error_12
                            }];
                    case 5: return [3 /*break*/, 9];
                    case 6:
                        if (!params.titlePattern) return [3 /*break*/, 8];
                        return [4 /*yield*/, this.findTaskByName(params.titlePattern)];
                    case 7: 
                    // 按标题模糊查找
                    return [2 /*return*/, _a.sent()];
                    case 8: return [2 /*return*/, { success: false, error: '未提供有效的查找参数' }];
                    case 9: return [3 /*break*/, 11];
                    case 10:
                        error_13 = _a.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u67E5\u627E\u4EFB\u52A1\u5931\u8D25: ".concat(error_13.message || error_13)
                            }];
                    case 11: return [2 /*return*/];
                }
            });
        });
    };
    // 删除任务
    // @requiresPermission('delete_task')
    TaskService.prototype.deleteTask = function (id_1) {
        return __awaiter(this, arguments, void 0, function (id, force) {
            var task, response, error_14;
            if (force === void 0) { force = false; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.findTaskById(id)];
                    case 1:
                        task = _a.sent();
                        if (!task) {
                            return [2 /*return*/, { success: false, error: "\u4EFB\u52A1 ".concat(id, " \u4E0D\u5B58\u5728") }];
                        }
                        return [4 /*yield*/, this.makeRequest('DELETE', "/projects/".concat(task.project_id, "/tasks/").concat(id), {
                                force: force
                            })];
                    case 2:
                        response = _a.sent();
                        if (response.success) {
                            return [2 /*return*/, {
                                    success: true,
                                    deleted_id: id,
                                    deleted_title: task.title,
                                    force_delete: force,
                                    message: "\uD83D\uDDD1\uFE0F \u4EFB\u52A1 \"".concat(task.title, "\" \u5DF2\u5220\u9664").concat(force ? '（强制删除）' : '')
                                }];
                        }
                        else {
                            return [2 /*return*/, response];
                        }
                        return [3 /*break*/, 4];
                    case 3:
                        error_14 = _a.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u5220\u9664\u4EFB\u52A1\u5931\u8D25: ".concat(error_14.message || error_14)
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    // 更新任务
    // @requiresPermission('update_task')
    TaskService.prototype.updateTask = function (id, updates) {
        return __awaiter(this, void 0, void 0, function () {
            var task, response, error_15;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.findTaskById(id)];
                    case 1:
                        task = _a.sent();
                        if (!task) {
                            return [2 /*return*/, { success: false, error: "\u4EFB\u52A1 ".concat(id, " \u4E0D\u5B58\u5728") }];
                        }
                        return [4 /*yield*/, this.makeRequest('PUT', "/projects/".concat(task.project_id, "/tasks/").concat(id), updates)];
                    case 2:
                        response = _a.sent();
                        if (response.success) {
                            return [2 /*return*/, {
                                    success: true,
                                    data: response.data,
                                    updated_fields: Object.keys(updates),
                                    message: "\uD83D\uDCDD \u4EFB\u52A1 \"".concat(task.title, "\" \u66F4\u65B0\u6210\u529F")
                                }];
                        }
                        else {
                            return [2 /*return*/, response];
                        }
                        return [3 /*break*/, 4];
                    case 3:
                        error_15 = _a.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u66F4\u65B0\u4EFB\u52A1\u5931\u8D25: ".concat(error_15.message || error_15)
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    // 移动任务到其他项目
    // @requiresPermission('update_task')
    TaskService.prototype.moveTask = function (id, targetProjectId) {
        return __awaiter(this, void 0, void 0, function () {
            var task, response, error_16;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.findTaskById(id)];
                    case 1:
                        task = _a.sent();
                        if (!task) {
                            return [2 /*return*/, { success: false, error: "\u4EFB\u52A1 ".concat(id, " \u4E0D\u5B58\u5728") }];
                        }
                        return [4 /*yield*/, this.makeRequest('PUT', "/projects/".concat(task.project_id, "/tasks/").concat(id), {
                                project_id: targetProjectId
                            })];
                    case 2:
                        response = _a.sent();
                        if (response.success) {
                            return [2 /*return*/, {
                                    success: true,
                                    task_id: id,
                                    task_title: task.title,
                                    from_project_id: task.project_id,
                                    to_project_id: targetProjectId,
                                    message: "\uD83D\uDCE6 \u4EFB\u52A1 \"".concat(task.title, "\" \u5DF2\u79FB\u52A8\u5230\u9879\u76EE ").concat(targetProjectId)
                                }];
                        }
                        else {
                            return [2 /*return*/, response];
                        }
                        return [3 /*break*/, 4];
                    case 3:
                        error_16 = _a.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u79FB\u52A8\u4EFB\u52A1\u5931\u8D25: ".concat(error_16.message || error_16)
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    // 获取任务子任务
    TaskService.prototype.getTaskChildren = function (parentId) {
        return __awaiter(this, void 0, void 0, function () {
            var response, children, error_17;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.makeRequest('GET', "/tasks/".concat(parentId, "/children"))];
                    case 1:
                        response = _b.sent();
                        if (response.success) {
                            children = ((_a = response.data) === null || _a === void 0 ? void 0 : _a.children) || [];
                            return [2 /*return*/, {
                                    success: true,
                                    data: { children: children },
                                    parent_id: parentId,
                                    children_count: children.length,
                                    message: "\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67\u200D\uD83D\uDC66 \u83B7\u53D6\u5230 ".concat(children.length, " \u4E2A\u5B50\u4EFB\u52A1")
                                }];
                        }
                        else {
                            return [2 /*return*/, response];
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        error_17 = _b.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u83B7\u53D6\u5B50\u4EFB\u52A1\u5931\u8D25: ".concat(error_17.message || error_17)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 获取任务详细信息
    TaskService.prototype.getDetailedTaskInfo = function (taskId) {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_18;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.makeRequest('GET', "/tasks/".concat(taskId, "/details"))];
                    case 1:
                        response = _b.sent();
                        if (response.success) {
                            return [2 /*return*/, {
                                    success: true,
                                    data: response.data,
                                    message: "\uD83D\uDCCB \u4EFB\u52A1\u8BE6\u60C5\u5DF2\u83B7\u53D6 - #".concat(taskId, " ").concat(((_a = response.data) === null || _a === void 0 ? void 0 : _a.title) || '')
                                }];
                        }
                        else {
                            return [2 /*return*/, response];
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        error_18 = _b.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u83B7\u53D6\u4EFB\u52A1\u8BE6\u60C5\u5931\u8D25: ".concat(error_18.message || error_18)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 获取任务时间线
    TaskService.prototype.getTaskTimeline = function (taskId_1) {
        return __awaiter(this, arguments, void 0, function (taskId, projectId, limit, offset) {
            var response, data, error_19, errorMessage;
            var _a, _b, _c, _d;
            if (projectId === void 0) { projectId = 1; }
            if (limit === void 0) { limit = 20; }
            if (offset === void 0) { offset = 0; }
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        _e.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.makeRequest('GET', "/projects/".concat(projectId, "/tasks/").concat(taskId, "/timeline"), undefined, { limit: limit.toString(), offset: offset.toString() })];
                    case 1:
                        response = _e.sent();
                        // 处理响应数据
                        if (response.success && response.data) {
                            data = response.data;
                            return [2 /*return*/, {
                                    success: true,
                                    task_id: data.task_id,
                                    task_title: data.task_title,
                                    events: data.events,
                                    pagination: data.pagination,
                                    total_events: ((_a = data.pagination) === null || _a === void 0 ? void 0 : _a.total) || 0,
                                    message: "\uD83D\uDCC5 \u6210\u529F\u83B7\u53D6\u4EFB\u52A1 \"".concat(data.task_title, "\" \u7684\u65F6\u95F4\u7EBF (").concat(((_b = data.events) === null || _b === void 0 ? void 0 : _b.length) || 0, " \u4E2A\u4E8B\u4EF6)")
                                }];
                        }
                        else {
                            return [2 /*return*/, {
                                    success: false,
                                    error: '获取时间线数据失败：响应格式异常'
                                }];
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        error_19 = _e.sent();
                        errorMessage = (error_19 === null || error_19 === void 0 ? void 0 : error_19.message) || '未知错误';
                        // 提供更友好的错误信息
                        if (((_c = error_19 === null || error_19 === void 0 ? void 0 : error_19.response) === null || _c === void 0 ? void 0 : _c.status) === 404) {
                            return [2 /*return*/, {
                                    success: false,
                                    error: "\u4EFB\u52A1\u4E0D\u5B58\u5728\u6216\u65E0\u6743\u8BBF\u95EE (\u4EFB\u52A1ID: ".concat(taskId, ")")
                                }];
                        }
                        else if (((_d = error_19 === null || error_19 === void 0 ? void 0 : error_19.response) === null || _d === void 0 ? void 0 : _d.status) === 401) {
                            return [2 /*return*/, {
                                    success: false,
                                    error: '认证失败，请检查API令牌'
                                }];
                        }
                        else {
                            return [2 /*return*/, {
                                    success: false,
                                    error: "\u83B7\u53D6\u4EFB\u52A1\u65F6\u95F4\u7EBF\u5931\u8D25: ".concat(errorMessage)
                                }];
                        }
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return TaskService;
}(base_client_js_1.BaseClient));
exports.TaskService = TaskService;
