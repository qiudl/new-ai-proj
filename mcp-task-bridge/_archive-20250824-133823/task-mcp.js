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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskMCPServer = void 0;
var axios_1 = require("axios");
var TaskMCPServer = /** @class */ (function () {
    function TaskMCPServer(apiBase) {
        if (apiBase === void 0) { apiBase = 'http://localhost:8080/api/v1'; }
        this.apiBase = apiBase;
        // 从环境变量读取令牌（不再硬编码）。优先 TASK_API_TOKEN，兼容 API_TOKEN。
        var token = process.env.TASK_API_TOKEN || process.env.API_TOKEN;
        if (token && token.trim().length > 0) {
            this.authToken = token.trim();
        }
    }
    TaskMCPServer.prototype.getHeaders = function () {
        var headers = { 'Content-Type': 'application/json' };
        if (this.authToken) {
            headers['Authorization'] = "Bearer ".concat(this.authToken);
        }
        return headers;
    };
    // 辅助方法：通过ID查找任务
    TaskMCPServer.prototype.findTaskById = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var response1, tasks1, task1, projectsResponse, projects, _i, projects_1, project, tasksResponse, tasks, task, projectError_1, error_1;
            var _a, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _d.trys.push([0, 9, , 10]);
                        return [4 /*yield*/, axios_1.default.get("".concat(this.apiBase, "/projects/1/tasks"), {
                                headers: this.getHeaders(),
                                proxy: false
                            })];
                    case 1:
                        response1 = _d.sent();
                        tasks1 = ((_a = response1.data.data) === null || _a === void 0 ? void 0 : _a.data) || [];
                        task1 = tasks1.find(function (t) { return t.id === id; });
                        if (task1) {
                            return [2 /*return*/, task1];
                        }
                        return [4 /*yield*/, axios_1.default.get("".concat(this.apiBase, "/projects"), {
                                headers: this.getHeaders(),
                                proxy: false
                            })];
                    case 2:
                        projectsResponse = _d.sent();
                        projects = ((_b = projectsResponse.data.data) === null || _b === void 0 ? void 0 : _b.data) || [];
                        _i = 0, projects_1 = projects;
                        _d.label = 3;
                    case 3:
                        if (!(_i < projects_1.length)) return [3 /*break*/, 8];
                        project = projects_1[_i];
                        if (project.id === 1)
                            return [3 /*break*/, 7]; // 已经检查过项目1
                        _d.label = 4;
                    case 4:
                        _d.trys.push([4, 6, , 7]);
                        return [4 /*yield*/, axios_1.default.get("".concat(this.apiBase, "/projects/").concat(project.id, "/tasks"), {
                                headers: this.getHeaders(),
                                proxy: false
                            })];
                    case 5:
                        tasksResponse = _d.sent();
                        tasks = ((_c = tasksResponse.data.data) === null || _c === void 0 ? void 0 : _c.data) || [];
                        task = tasks.find(function (t) { return t.id === id; });
                        if (task) {
                            return [2 /*return*/, task];
                        }
                        return [3 /*break*/, 7];
                    case 6:
                        projectError_1 = _d.sent();
                        // 忽略单个项目的错误，继续查找其他项目
                        console.error("[WARNING] \u65E0\u6CD5\u83B7\u53D6\u9879\u76EE ".concat(project.id, " \u7684\u4EFB\u52A1\u5217\u8868: ").concat(projectError_1.message));
                        return [3 /*break*/, 7];
                    case 7:
                        _i++;
                        return [3 /*break*/, 3];
                    case 8: throw new Error("\u4EFB\u52A1 ID ".concat(id, " \u4E0D\u5B58\u5728"));
                    case 9:
                        error_1 = _d.sent();
                        throw new Error("\u67E5\u627E\u4EFB\u52A1\u5931\u8D25: ".concat(error_1.message));
                    case 10: return [2 /*return*/];
                }
            });
        });
    };
    // 创建任务
    TaskMCPServer.prototype.createTask = function (title_1) {
        return __awaiter(this, arguments, void 0, function (title, projectId, options) {
            var taskData, response, task, error_2, userFriendlyError, responseData;
            var _a, _b, _c, _d, _e;
            if (projectId === void 0) { projectId = 1; }
            if (options === void 0) { options = {}; }
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        _f.trys.push([0, 2, , 3]);
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
                        return [4 /*yield*/, axios_1.default.post("".concat(this.apiBase, "/projects/").concat(projectId, "/tasks"), taskData, {
                                headers: this.getHeaders(),
                                timeout: 10000,
                                proxy: false
                            })];
                    case 1:
                        response = _f.sent();
                        task = response.data.data;
                        return [2 /*return*/, {
                                success: true,
                                data: task,
                                id: task.id,
                                title: task.title,
                                status: task.status,
                                priority: ((_a = task.custom_fields) === null || _a === void 0 ? void 0 : _a.priority) || 'low',
                                message: "\u2705 \u4EFB\u52A1\u5DF2\u521B\u5EFA (ID: ".concat(task.id, ") - \"").concat(task.title, "\" [\u72B6\u6001: ").concat(task.status, ", \u4F18\u5148\u7EA7: ").concat(((_b = task.custom_fields) === null || _b === void 0 ? void 0 : _b.priority) || 'low', "]")
                            }];
                    case 2:
                        error_2 = _f.sent();
                        console.error("[ERROR] \u521B\u5EFA\u4EFB\u52A1\u5931\u8D25:", ((_c = error_2.response) === null || _c === void 0 ? void 0 : _c.data) || error_2.message);
                        userFriendlyError = error_2.message;
                        if ((_d = error_2.response) === null || _d === void 0 ? void 0 : _d.data) {
                            responseData = error_2.response.data;
                            if ((_e = responseData.error) === null || _e === void 0 ? void 0 : _e.message) {
                                // 后端返回的结构化错误信息
                                userFriendlyError = responseData.error.message;
                            }
                            else if (responseData.message) {
                                // 简单的错误信息
                                userFriendlyError = responseData.message;
                            }
                            else if (typeof responseData === 'string') {
                                userFriendlyError = responseData;
                            }
                        }
                        return [2 /*return*/, {
                                success: false,
                                error: userFriendlyError
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 开始任务
    TaskMCPServer.prototype.startTask = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var task, updateResponse, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        console.error("[DEBUG] \u5F00\u59CB\u4EFB\u52A1: ID ".concat(id));
                        return [4 /*yield*/, this.findTaskById(id)];
                    case 1:
                        task = _a.sent();
                        return [4 /*yield*/, axios_1.default.put("".concat(this.apiBase, "/projects/").concat(task.project_id, "/tasks/").concat(id), {
                                title: task.title,
                                project_id: task.project_id,
                                status: 'in_progress',
                                description: task.description,
                                parent_id: task.parent_id
                            }, {
                                headers: this.getHeaders(),
                                proxy: false
                            })];
                    case 2:
                        updateResponse = _a.sent();
                        return [2 /*return*/, {
                                success: true,
                                id: id,
                                title: task.title,
                                status: 'in_progress',
                                message: "\uD83D\uDE80 \u4EFB\u52A1 \"".concat(task.title, "\" \u5DF2\u5F00\u59CB\u6267\u884C")
                            }];
                    case 3:
                        error_3 = _a.sent();
                        console.error("[ERROR] \u5F00\u59CB\u4EFB\u52A1\u5931\u8D25:", error_3.message);
                        return [2 /*return*/, {
                                success: false,
                                error: "\u5F00\u59CB\u4EFB\u52A1\u5931\u8D25: ".concat(error_3.message)
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    // 完成任务
    TaskMCPServer.prototype.completeTask = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var task, updateResponse, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        console.error("[DEBUG] \u5B8C\u6210\u4EFB\u52A1: ID ".concat(id));
                        return [4 /*yield*/, this.findTaskById(id)];
                    case 1:
                        task = _a.sent();
                        return [4 /*yield*/, axios_1.default.put("".concat(this.apiBase, "/projects/").concat(task.project_id, "/tasks/").concat(id), {
                                title: task.title,
                                project_id: task.project_id,
                                status: 'completed',
                                description: task.description,
                                parent_id: task.parent_id
                            }, {
                                headers: this.getHeaders(),
                                proxy: false
                            })];
                    case 2:
                        updateResponse = _a.sent();
                        return [2 /*return*/, {
                                success: true,
                                id: id,
                                title: task.title,
                                status: 'completed',
                                message: "\u2705 \u4EFB\u52A1 \"".concat(task.title, "\" \u5DF2\u5B8C\u6210")
                            }];
                    case 3:
                        error_4 = _a.sent();
                        console.error("[ERROR] \u5B8C\u6210\u4EFB\u52A1\u5931\u8D25:", error_4.message);
                        return [2 /*return*/, {
                                success: false,
                                error: "\u5B8C\u6210\u4EFB\u52A1\u5931\u8D25: ".concat(error_4.message)
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    // 更新任务标题
    TaskMCPServer.prototype.updateTaskTitle = function (id, newTitle) {
        return __awaiter(this, void 0, void 0, function () {
            var task, updateResponse, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        console.error("[DEBUG] \u66F4\u65B0\u4EFB\u52A1\u6807\u9898: ID ".concat(id, ", \u65B0\u6807\u9898: ").concat(newTitle));
                        return [4 /*yield*/, this.findTaskById(id)];
                    case 1:
                        task = _a.sent();
                        return [4 /*yield*/, axios_1.default.put("".concat(this.apiBase, "/projects/").concat(task.project_id, "/tasks/").concat(id), {
                                title: newTitle,
                                project_id: task.project_id,
                                status: task.status,
                                description: task.description,
                                parent_id: task.parent_id
                            }, {
                                headers: this.getHeaders(),
                                proxy: false
                            })];
                    case 2:
                        updateResponse = _a.sent();
                        return [2 /*return*/, {
                                success: true,
                                id: id,
                                title: newTitle,
                                status: task.status,
                                message: "\u2705 \u4EFB\u52A1\u6807\u9898\u5DF2\u66F4\u65B0 \"".concat(newTitle, "\"")
                            }];
                    case 3:
                        error_5 = _a.sent();
                        console.error("[ERROR] \u66F4\u65B0\u4EFB\u52A1\u6807\u9898\u5931\u8D25:", error_5.message);
                        return [2 /*return*/, {
                                success: false,
                                error: "\u66F4\u65B0\u4EFB\u52A1\u6807\u9898\u5931\u8D25: ".concat(error_5.message)
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    // 更新任务描述
    TaskMCPServer.prototype.updateTaskDescription = function (id, newDescription) {
        return __awaiter(this, void 0, void 0, function () {
            var task, updateResponse, error_6;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        console.error("[DEBUG] \u66F4\u65B0\u4EFB\u52A1\u63CF\u8FF0: ID ".concat(id));
                        return [4 /*yield*/, this.findTaskById(id)];
                    case 1:
                        task = _a.sent();
                        return [4 /*yield*/, axios_1.default.put("".concat(this.apiBase, "/projects/").concat(task.project_id, "/tasks/").concat(id), {
                                title: task.title,
                                project_id: task.project_id,
                                status: task.status,
                                description: newDescription,
                                parent_id: task.parent_id
                            }, {
                                headers: this.getHeaders(),
                                proxy: false
                            })];
                    case 2:
                        updateResponse = _a.sent();
                        return [2 /*return*/, {
                                success: true,
                                id: id,
                                title: task.title,
                                status: task.status,
                                message: "\u2705 \u4EFB\u52A1\u63CF\u8FF0\u5DF2\u66F4\u65B0"
                            }];
                    case 3:
                        error_6 = _a.sent();
                        console.error("[ERROR] \u66F4\u65B0\u4EFB\u52A1\u63CF\u8FF0\u5931\u8D25:", error_6.message);
                        return [2 /*return*/, {
                                success: false,
                                error: "\u66F4\u65B0\u4EFB\u52A1\u63CF\u8FF0\u5931\u8D25: ".concat(error_6.message)
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    // 查看任务列表
    TaskMCPServer.prototype.listTasks = function (projectId) {
        return __awaiter(this, void 0, void 0, function () {
            var response, tasks, error_7;
            var _a, _b, _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        _e.trys.push([0, 2, , 3]);
                        console.error("[DEBUG] \u83B7\u53D6\u4EFB\u52A1\u5217\u8868, \u9879\u76EEID: ".concat(projectId));
                        return [4 /*yield*/, axios_1.default.get("".concat(this.apiBase, "/projects/").concat(projectId, "/tasks"), {
                                headers: this.getHeaders(),
                                proxy: false
                            })];
                    case 1:
                        response = _e.sent();
                        tasks = ((_a = response.data.data) === null || _a === void 0 ? void 0 : _a.data) || [];
                        return [2 /*return*/, {
                                success: true,
                                total: tasks.length,
                                tasks: tasks.map(function (task) { return ({
                                    id: task.id,
                                    title: task.title,
                                    status: task.status,
                                    created_at: task.created_at,
                                    project_id: task.project_id,
                                    parent_id: task.parent_id,
                                    custom_fields: task.custom_fields
                                }); }),
                                message: "\uD83D\uDCCB \u5171\u627E\u5230 ".concat(tasks.length, " \u4E2A\u4EFB\u52A1")
                            }];
                    case 2:
                        error_7 = _e.sent();
                        console.error("[ERROR] \u83B7\u53D6\u4EFB\u52A1\u5217\u8868\u5931\u8D25:", ((_b = error_7.response) === null || _b === void 0 ? void 0 : _b.data) || error_7.message);
                        return [2 /*return*/, {
                                success: false,
                                error: "\u83B7\u53D6\u4EFB\u52A1\u5217\u8868\u5931\u8D25: ".concat(((_d = (_c = error_7.response) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.error) || error_7.message)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 创建子任务 - 支持详细参数
    TaskMCPServer.prototype.createSubTask = function (parentId, taskData) {
        return __awaiter(this, void 0, void 0, function () {
            var title, description, _a, priority, _b, estimated_hours, _c, status_1, _d, tags, parentTask, taskPayload, response, subtask, error_8;
            var _e, _f, _g;
            return __generator(this, function (_h) {
                switch (_h.label) {
                    case 0:
                        _h.trys.push([0, 3, , 4]);
                        // 如果taskData是字符串，表示只传入了title（保持向后兼容）
                        if (typeof taskData === 'string') {
                            taskData = { title: taskData };
                        }
                        title = taskData.title, description = taskData.description, _a = taskData.priority, priority = _a === void 0 ? 'medium' : _a, _b = taskData.estimated_hours, estimated_hours = _b === void 0 ? null : _b, _c = taskData.status, status_1 = _c === void 0 ? 'todo' : _c, _d = taskData.tags, tags = _d === void 0 ? [] : _d;
                        console.error("[DEBUG] \u521B\u5EFA\u5B50\u4EFB\u52A1: ".concat(title, ", \u7236\u4EFB\u52A1ID: ").concat(parentId));
                        return [4 /*yield*/, this.findTaskById(parentId)];
                    case 1:
                        parentTask = _h.sent();
                        taskPayload = {
                            title: title,
                            project_id: parentTask.project_id,
                            parent_id: parentId,
                            status: status_1,
                            description: description || "\u901A\u8FC7Claude Code\u521B\u5EFA\u7684\u5B50\u4EFB\u52A1\uFF1A".concat(title),
                            custom_fields: {
                                priority: priority
                            }
                        };
                        // 添加预估工时
                        if (estimated_hours) {
                            taskPayload.custom_fields.estimated_hours = estimated_hours;
                        }
                        // 添加标签
                        if (tags && tags.length > 0) {
                            taskPayload.custom_fields.tags = tags;
                        }
                        return [4 /*yield*/, axios_1.default.post("".concat(this.apiBase, "/projects/").concat(parentTask.project_id, "/tasks"), taskPayload, {
                                headers: this.getHeaders(),
                                proxy: false
                            })];
                    case 2:
                        response = _h.sent();
                        subtask = response.data.data;
                        return [2 /*return*/, {
                                success: true,
                                id: subtask.id,
                                title: subtask.title,
                                parent_id: parentId,
                                status: subtask.status,
                                priority: ((_e = subtask.custom_fields) === null || _e === void 0 ? void 0 : _e.priority) || priority,
                                estimated_hours: ((_f = subtask.custom_fields) === null || _f === void 0 ? void 0 : _f.estimated_hours) || estimated_hours,
                                message: "\u2705 \u5B50\u4EFB\u52A1\u5DF2\u521B\u5EFA (ID: ".concat(subtask.id, ") - \"").concat(subtask.title, "\" [\u72B6\u6001: ").concat(subtask.status, ", \u4F18\u5148\u7EA7: ").concat(((_g = subtask.custom_fields) === null || _g === void 0 ? void 0 : _g.priority) || priority).concat(estimated_hours ? ", \u9884\u4F30: ".concat(estimated_hours, "\u5C0F\u65F6") : '', "]")
                            }];
                    case 3:
                        error_8 = _h.sent();
                        console.error("[ERROR] \u521B\u5EFA\u5B50\u4EFB\u52A1\u5931\u8D25:", error_8.message);
                        return [2 /*return*/, {
                                success: false,
                                error: "\u521B\u5EFA\u5B50\u4EFB\u52A1\u5931\u8D25: ".concat(error_8.message)
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    // 创建兄弟任务 - 与指定任务同级的任务
    TaskMCPServer.prototype.createSiblingTask = function (siblingId_1, title_1, description_1) {
        return __awaiter(this, arguments, void 0, function (siblingId, title, description, status, priority) {
            var siblingTask, taskPayload, response, newSibling, error_9;
            var _a, _b, _c;
            if (status === void 0) { status = 'todo'; }
            if (priority === void 0) { priority = 'medium'; }
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _d.trys.push([0, 3, , 4]);
                        console.error("[DEBUG] \u521B\u5EFA\u5144\u5F1F\u4EFB\u52A1: ".concat(title, ", \u5144\u5F1F\u4EFB\u52A1ID: ").concat(siblingId));
                        return [4 /*yield*/, this.findTaskById(siblingId)];
                    case 1:
                        siblingTask = _d.sent();
                        taskPayload = {
                            title: title,
                            project_id: siblingTask.project_id,
                            parent_id: siblingTask.parent_id, // 关键：使用兄弟任务的parent_id
                            status: status,
                            description: description || "\u901A\u8FC7Claude Code\u521B\u5EFA\u7684\u5144\u5F1F\u4EFB\u52A1\uFF1A".concat(title),
                            custom_fields: {
                                priority: priority
                            }
                        };
                        return [4 /*yield*/, axios_1.default.post("".concat(this.apiBase, "/projects/").concat(siblingTask.project_id, "/tasks"), taskPayload, {
                                headers: this.getHeaders(),
                                proxy: false
                            })];
                    case 2:
                        response = _d.sent();
                        newSibling = response.data.data;
                        return [2 /*return*/, {
                                success: true,
                                id: newSibling.id,
                                title: newSibling.title,
                                parent_id: newSibling.parent_id,
                                sibling_id: siblingId,
                                status: newSibling.status,
                                priority: ((_a = newSibling.custom_fields) === null || _a === void 0 ? void 0 : _a.priority) || priority,
                                estimated_hours: ((_b = newSibling.custom_fields) === null || _b === void 0 ? void 0 : _b.estimated_hours) || null,
                                message: "\u2705 \u5144\u5F1F\u4EFB\u52A1\u5DF2\u521B\u5EFA (ID: ".concat(newSibling.id, ") - \"").concat(newSibling.title, "\" [\u540C\u7EA7\u4E8E\u4EFB\u52A1 ").concat(siblingId, ", \u72B6\u6001: ").concat(newSibling.status, ", \u4F18\u5148\u7EA7: ").concat(((_c = newSibling.custom_fields) === null || _c === void 0 ? void 0 : _c.priority) || priority, "]")
                            }];
                    case 3:
                        error_9 = _d.sent();
                        console.error("[ERROR] \u521B\u5EFA\u5144\u5F1F\u4EFB\u52A1\u5931\u8D25:", error_9.message);
                        return [2 /*return*/, {
                                success: false,
                                error: "\u521B\u5EFA\u5144\u5F1F\u4EFB\u52A1\u5931\u8D25: ".concat(error_9.message)
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    // 根据名称搜索任务
    TaskMCPServer.prototype.findTaskByName = function (titlePattern) {
        return __awaiter(this, void 0, void 0, function () {
            var listResult, matchingTasks, error_10;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.listTasks()];
                    case 1:
                        listResult = _a.sent();
                        if (!listResult.success) {
                            return [2 /*return*/, listResult];
                        }
                        matchingTasks = listResult.tasks.filter(function (task) {
                            return task.title.toLowerCase().includes(titlePattern.toLowerCase());
                        });
                        return [2 /*return*/, {
                                success: true,
                                total: matchingTasks.length,
                                tasks: matchingTasks,
                                message: "\uD83D\uDD0D \u627E\u5230 ".concat(matchingTasks.length, " \u4E2A\u5339\u914D\"").concat(titlePattern, "\"\u7684\u4EFB\u52A1")
                            }];
                    case 2:
                        error_10 = _a.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u641C\u7D22\u4EFB\u52A1\u5931\u8D25: ".concat(error_10.message)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 按ID或标题搜索任务（新增）
    TaskMCPServer.prototype.findTask = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, id, titlePattern, task, mapped_1, e_1, projectsResp, projects, matches, pattern, _i, projects_2, project, resp, tasks, _b, tasks_1, t, title, err_1, mapped, error_11;
            var _c, _d, _e, _f, _g, _h;
            return __generator(this, function (_j) {
                switch (_j.label) {
                    case 0:
                        _j.trys.push([0, 12, , 13]);
                        _a = params || {}, id = _a.id, titlePattern = _a.titlePattern;
                        if (!(typeof id === 'number' && !isNaN(id))) return [3 /*break*/, 4];
                        _j.label = 1;
                    case 1:
                        _j.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.findTaskById(id)];
                    case 2:
                        task = _j.sent();
                        mapped_1 = {
                            id: task.id,
                            title: task.title,
                            status: task.status,
                            created_at: task.created_at,
                            project_id: task.project_id,
                            parent_id: task.parent_id,
                            custom_fields: task.custom_fields
                        };
                        return [2 /*return*/, {
                                success: true,
                                total: 1,
                                tasks: [mapped_1],
                                message: "\uD83D\uDD0D \u901A\u8FC7ID\u627E\u5230 1 \u4E2A\u4EFB\u52A1"
                            }];
                    case 3:
                        e_1 = _j.sent();
                        return [2 /*return*/, {
                                success: true,
                                total: 0,
                                tasks: [],
                                message: "\u672A\u627E\u5230\u4EFB\u52A1 ID ".concat(id)
                            }];
                    case 4:
                        if (!titlePattern || titlePattern.trim().length === 0) {
                            return [2 /*return*/, {
                                    success: true,
                                    total: 0,
                                    tasks: [],
                                    message: '未提供搜索条件'
                                }];
                        }
                        return [4 /*yield*/, axios_1.default.get("".concat(this.apiBase, "/projects"), {
                                headers: this.getHeaders(),
                                proxy: false
                            })];
                    case 5:
                        projectsResp = _j.sent();
                        projects = ((_d = (_c = projectsResp.data) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.data) || ((_e = projectsResp.data) === null || _e === void 0 ? void 0 : _e.data) || [];
                        matches = [];
                        pattern = titlePattern.toLowerCase();
                        _i = 0, projects_2 = projects;
                        _j.label = 6;
                    case 6:
                        if (!(_i < projects_2.length)) return [3 /*break*/, 11];
                        project = projects_2[_i];
                        _j.label = 7;
                    case 7:
                        _j.trys.push([7, 9, , 10]);
                        return [4 /*yield*/, axios_1.default.get("".concat(this.apiBase, "/projects/").concat(project.id, "/tasks"), {
                                headers: this.getHeaders(),
                                proxy: false
                            })];
                    case 8:
                        resp = _j.sent();
                        tasks = ((_g = (_f = resp.data) === null || _f === void 0 ? void 0 : _f.data) === null || _g === void 0 ? void 0 : _g.data) || ((_h = resp.data) === null || _h === void 0 ? void 0 : _h.data) || [];
                        for (_b = 0, tasks_1 = tasks; _b < tasks_1.length; _b++) {
                            t = tasks_1[_b];
                            title = (t.title || '').toLowerCase();
                            if (title.includes(pattern)) {
                                matches.push(t);
                            }
                        }
                        return [3 /*break*/, 10];
                    case 9:
                        err_1 = _j.sent();
                        // 忽略单个项目失败
                        return [3 /*break*/, 10];
                    case 10:
                        _i++;
                        return [3 /*break*/, 6];
                    case 11:
                        mapped = matches.map(function (task) { return ({
                            id: task.id,
                            title: task.title,
                            status: task.status,
                            created_at: task.created_at,
                            project_id: task.project_id,
                            parent_id: task.parent_id,
                            custom_fields: task.custom_fields
                        }); });
                        return [2 /*return*/, {
                                success: true,
                                total: mapped.length,
                                tasks: mapped,
                                message: "\uD83D\uDD0D \u627E\u5230 ".concat(mapped.length, " \u4E2A\u5339\u914D\"").concat(titlePattern, "\"\u7684\u4EFB\u52A1")
                            }];
                    case 12:
                        error_11 = _j.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u641C\u7D22\u4EFB\u52A1\u5931\u8D25: ".concat(error_11.message)
                            }];
                    case 13: return [2 /*return*/];
                }
            });
        });
    };
    // 删除任务
    TaskMCPServer.prototype.deleteTask = function (id_1) {
        return __awaiter(this, arguments, void 0, function (id, force) {
            var task, childrenResponse, allTasks, childTasks, affectedSubtasks, _i, childTasks_1, childTask, childError_1, deleteResponse, error_12;
            var _a, _b, _c, _d;
            if (force === void 0) { force = false; }
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        _e.trys.push([0, 10, , 11]);
                        console.error("[DEBUG] \u5220\u9664\u4EFB\u52A1: ID ".concat(id, ", \u5F3A\u5236\u5220\u9664: ").concat(force));
                        return [4 /*yield*/, this.findTaskById(id)];
                    case 1:
                        task = _e.sent();
                        return [4 /*yield*/, axios_1.default.get("".concat(this.apiBase, "/projects/").concat(task.project_id, "/tasks"), {
                                headers: this.getHeaders(),
                                proxy: false
                            })];
                    case 2:
                        childrenResponse = _e.sent();
                        allTasks = ((_a = childrenResponse.data.data) === null || _a === void 0 ? void 0 : _a.data) || [];
                        childTasks = allTasks.filter(function (t) { return t.parent_id === id; });
                        if (childTasks.length > 0 && !force) {
                            return [2 /*return*/, {
                                    success: false,
                                    error: "\u4EFB\u52A1\u6709 ".concat(childTasks.length, " \u4E2A\u5B50\u4EFB\u52A1\uFF0C\u8BF7\u4F7F\u7528 force=true \u5F3A\u5236\u5220\u9664\u6216\u5148\u5220\u9664\u5B50\u4EFB\u52A1"),
                                    child_count: childTasks.length,
                                    children: childTasks.map(function (t) { return ({ id: t.id, title: t.title }); })
                                }];
                        }
                        affectedSubtasks = [];
                        if (!(force && childTasks.length > 0)) return [3 /*break*/, 8];
                        console.error("[DEBUG] \u5F3A\u5236\u5220\u9664\uFF0C\u5148\u5220\u9664 ".concat(childTasks.length, " \u4E2A\u5B50\u4EFB\u52A1"));
                        _i = 0, childTasks_1 = childTasks;
                        _e.label = 3;
                    case 3:
                        if (!(_i < childTasks_1.length)) return [3 /*break*/, 8];
                        childTask = childTasks_1[_i];
                        _e.label = 4;
                    case 4:
                        _e.trys.push([4, 6, , 7]);
                        return [4 /*yield*/, axios_1.default.delete("".concat(this.apiBase, "/projects/").concat(task.project_id, "/tasks/").concat(childTask.id), {
                                headers: this.getHeaders(),
                                proxy: false
                            })];
                    case 5:
                        _e.sent();
                        affectedSubtasks.push(childTask.id);
                        console.error("[DEBUG] \u5DF2\u5220\u9664\u5B50\u4EFB\u52A1: ID ".concat(childTask.id));
                        return [3 /*break*/, 7];
                    case 6:
                        childError_1 = _e.sent();
                        console.error("[WARNING] \u5220\u9664\u5B50\u4EFB\u52A1 ".concat(childTask.id, " \u5931\u8D25: ").concat(childError_1.message));
                        return [3 /*break*/, 7];
                    case 7:
                        _i++;
                        return [3 /*break*/, 3];
                    case 8: return [4 /*yield*/, axios_1.default.delete("".concat(this.apiBase, "/projects/").concat(task.project_id, "/tasks/").concat(id), {
                            headers: this.getHeaders(),
                            proxy: false
                        })];
                    case 9:
                        deleteResponse = _e.sent();
                        return [2 /*return*/, {
                                success: true,
                                deleted_task_id: id,
                                title: task.title,
                                affected_subtasks: affectedSubtasks,
                                message: "\uD83D\uDDD1\uFE0F \u4EFB\u52A1 \"".concat(task.title, "\" \u5DF2\u5220\u9664").concat(affectedSubtasks.length > 0 ? "\uFF0C\u540C\u65F6\u5220\u9664\u4E86 ".concat(affectedSubtasks.length, " \u4E2A\u5B50\u4EFB\u52A1") : '')
                            }];
                    case 10:
                        error_12 = _e.sent();
                        console.error("[ERROR] \u5220\u9664\u4EFB\u52A1\u5931\u8D25:", ((_b = error_12.response) === null || _b === void 0 ? void 0 : _b.data) || error_12.message);
                        return [2 /*return*/, {
                                success: false,
                                error: "\u5220\u9664\u4EFB\u52A1\u5931\u8D25: ".concat(((_d = (_c = error_12.response) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.error) || error_12.message)
                            }];
                    case 11: return [2 /*return*/];
                }
            });
        });
    };
    // 更新任务信息
    TaskMCPServer.prototype.updateTask = function (id, updates) {
        return __awaiter(this, void 0, void 0, function () {
            var task_1, directFields, customFields, allFields, changedFields, updateData_1, _i, _a, _b, field, value, currentValue, hasChanged, dateRegex, updateResponse, updatedTask, error_13;
            var _c, _d, _e, _f, _g, _h;
            return __generator(this, function (_j) {
                switch (_j.label) {
                    case 0:
                        _j.trys.push([0, 3, , 4]);
                        console.error("[DEBUG] \u66F4\u65B0\u4EFB\u52A1: ID ".concat(id, ", \u66F4\u65B0\u5B57\u6BB5: ").concat(Object.keys(updates).join(', ')));
                        return [4 /*yield*/, this.findTaskById(id)];
                    case 1:
                        task_1 = _j.sent();
                        directFields = ['title', 'description', 'status', 'due_date', 'assignee_id', 'parent_id'];
                        customFields = ['priority'];
                        allFields = __spreadArray(__spreadArray([], directFields, true), customFields, true);
                        changedFields = [];
                        updateData_1 = {
                            project_id: task_1.project_id,
                            parent_id: task_1.parent_id,
                            custom_fields: __assign({}, task_1.custom_fields)
                        };
                        // 构建更新数据，只包含变更的字段
                        for (_i = 0, _a = Object.entries(updates); _i < _a.length; _i++) {
                            _b = _a[_i], field = _b[0], value = _b[1];
                            if (!allFields.includes(field)) {
                                console.error("[WARNING] \u5FFD\u7565\u4E0D\u5141\u8BB8\u7684\u5B57\u6BB5: ".concat(field));
                                continue;
                            }
                            currentValue = void 0;
                            hasChanged = false;
                            if (directFields.includes(field)) {
                                // 直接字段
                                currentValue = task_1[field];
                                hasChanged = currentValue !== value;
                                if (hasChanged) {
                                    updateData_1[field] = value;
                                }
                            }
                            else if (customFields.includes(field)) {
                                // custom_fields中的字段
                                currentValue = (_c = task_1.custom_fields) === null || _c === void 0 ? void 0 : _c[field];
                                hasChanged = currentValue !== value;
                                if (hasChanged) {
                                    updateData_1.custom_fields[field] = value;
                                }
                            }
                            if (hasChanged) {
                                changedFields.push(field);
                                console.error("[DEBUG] \u5B57\u6BB5\u53D8\u66F4: ".concat(field, " = \"").concat(currentValue, "\" -> \"").concat(value, "\""));
                            }
                        }
                        // 保持未更新的直接字段不变
                        directFields.forEach(function (field) {
                            if (!(field in updateData_1)) {
                                updateData_1[field] = task_1[field];
                            }
                        });
                        if (changedFields.length === 0) {
                            return [2 /*return*/, {
                                    success: true,
                                    data: __assign(__assign({}, task_1), { priority: (_d = task_1.custom_fields) === null || _d === void 0 ? void 0 : _d.priority }),
                                    changed_fields: [],
                                    message: "\uD83D\uDCDD \u4EFB\u52A1 \"".concat(task_1.title, "\" \u65E0\u53D8\u66F4")
                                }];
                        }
                        // 状态验证
                        if (updates.status && !['draft', 'planning', 'todo', 'in_progress', 'testing', 'completed', 'cancelled', 'on_hold', 'suspended', 'blocked', 'archived'].includes(updates.status)) {
                            return [2 /*return*/, {
                                    success: false,
                                    error: "\u65E0\u6548\u7684\u72B6\u6001\u503C: ".concat(updates.status, "\u3002\u5141\u8BB8\u7684\u503C: draft, planning, todo, in_progress, testing, completed, cancelled, on_hold, suspended, blocked, archived")
                                }];
                        }
                        // 优先级验证
                        if (updates.priority && !['low', 'medium', 'high'].includes(updates.priority)) {
                            return [2 /*return*/, {
                                    success: false,
                                    error: "\u65E0\u6548\u7684\u4F18\u5148\u7EA7\u503C: ".concat(updates.priority, "\u3002\u5141\u8BB8\u7684\u503C: low, medium, high")
                                }];
                        }
                        // 日期格式验证
                        if (updates.due_date && updates.due_date !== null) {
                            dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
                            if (!dateRegex.test(updates.due_date)) {
                                return [2 /*return*/, {
                                        success: false,
                                        error: "\u65E0\u6548\u7684\u65E5\u671F\u683C\u5F0F: ".concat(updates.due_date, "\u3002\u8BF7\u4F7F\u7528 ISO 8601 \u683C\u5F0F (YYYY-MM-DDTHH:mm:ss.sssZ)")
                                    }];
                            }
                        }
                        return [4 /*yield*/, axios_1.default.put("".concat(this.apiBase, "/projects/").concat(task_1.project_id, "/tasks/").concat(id), updateData_1, {
                                headers: this.getHeaders(),
                                proxy: false
                            })];
                    case 2:
                        updateResponse = _j.sent();
                        updatedTask = updateResponse.data.data;
                        return [2 /*return*/, {
                                success: true,
                                data: updatedTask,
                                updated_task: {
                                    id: updatedTask.id,
                                    title: updatedTask.title,
                                    description: updatedTask.description,
                                    status: updatedTask.status,
                                    priority: (_e = updatedTask.custom_fields) === null || _e === void 0 ? void 0 : _e.priority,
                                    due_date: updatedTask.due_date,
                                    assignee_id: updatedTask.assignee_id,
                                    project_id: updatedTask.project_id,
                                    parent_id: updatedTask.parent_id,
                                    updated_at: updatedTask.updated_at,
                                    custom_fields: updatedTask.custom_fields
                                },
                                changed_fields: changedFields,
                                message: "\uD83D\uDCDD \u4EFB\u52A1 \"".concat(updatedTask.title, "\" \u5DF2\u66F4\u65B0").concat(changedFields.length > 0 ? " (".concat(changedFields.join(', '), ")") : '')
                            }];
                    case 3:
                        error_13 = _j.sent();
                        console.error("[ERROR] \u66F4\u65B0\u4EFB\u52A1\u5931\u8D25:", ((_f = error_13.response) === null || _f === void 0 ? void 0 : _f.data) || error_13.message);
                        return [2 /*return*/, {
                                success: false,
                                error: "\u66F4\u65B0\u4EFB\u52A1\u5931\u8D25: ".concat(((_h = (_g = error_13.response) === null || _g === void 0 ? void 0 : _g.data) === null || _h === void 0 ? void 0 : _h.error) || error_13.message)
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    // 创建或更新任务文档（使用统一文档API）
    TaskMCPServer.prototype.createOrUpdateTaskDocument = function (taskId_1, content_1) {
        return __awaiter(this, arguments, void 0, function (taskId, content, projectId) {
            var task, actualProjectId, existingDocuments, listResp, e_2, latest, _i, existingDocuments_1, doc, error_14;
            var _a, _b, _c, _d, _e;
            if (projectId === void 0) { projectId = 1; }
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        _f.trys.push([0, 10, , 11]);
                        console.error("[DEBUG] \u521B\u5EFA/\u66F4\u65B0\u4EFB\u52A1\u6587\u6863: \u4EFB\u52A1ID ".concat(taskId, ", \u9879\u76EEID: ").concat(projectId));
                        return [4 /*yield*/, this.findTaskById(taskId)];
                    case 1:
                        task = _f.sent();
                        actualProjectId = task.project_id || projectId;
                        existingDocuments = [];
                        _f.label = 2;
                    case 2:
                        _f.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, axios_1.default.get("".concat(this.apiBase, "/projects/").concat(actualProjectId, "/tasks/").concat(taskId, "/documents/list"), {
                                headers: this.getHeaders(),
                                proxy: false
                            })];
                    case 3:
                        listResp = _f.sent();
                        existingDocuments = ((_b = (_a = listResp.data) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.documents) || [];
                        return [3 /*break*/, 5];
                    case 4:
                        e_2 = _f.sent();
                        // 如果无法获取文档列表，说明可能没有文档，继续创建流程
                        console.error('[DEBUG] 无法获取现有文档列表，将创建新文档');
                        return [3 /*break*/, 5];
                    case 5:
                        if (!(existingDocuments.length === 0)) return [3 /*break*/, 7];
                        return [4 /*yield*/, this.createAndAttachTaskDocument(taskId, content, actualProjectId)];
                    case 6: 
                    // 不存在文档：创建并关联（原子操作）
                    return [2 /*return*/, _f.sent()];
                    case 7:
                        latest = existingDocuments[0];
                        for (_i = 0, existingDocuments_1 = existingDocuments; _i < existingDocuments_1.length; _i++) {
                            doc = existingDocuments_1[_i];
                            if (doc.updated_at && latest.updated_at && new Date(doc.updated_at) > new Date(latest.updated_at)) {
                                latest = doc;
                            }
                        }
                        // 使用标准文档更新API
                        return [4 /*yield*/, axios_1.default.put("".concat(this.apiBase, "/documents/").concat(latest.id), {
                                content: content
                            }, {
                                headers: this.getHeaders(),
                                proxy: false
                            })];
                    case 8:
                        // 使用标准文档更新API
                        _f.sent();
                        return [2 /*return*/, {
                                success: true,
                                task_id: taskId,
                                project_id: actualProjectId,
                                document_id: latest.id,
                                content_length: content.length,
                                created: false,
                                message: "\uD83D\uDCC4 \u4EFB\u52A1 #".concat(taskId, " \u6587\u6863\u5DF2\u66F4\u65B0 (\u6587\u6863ID: ").concat(latest.id, ", ").concat(content.length, " \u5B57\u7B26)")
                            }];
                    case 9: return [3 /*break*/, 11];
                    case 10:
                        error_14 = _f.sent();
                        console.error("[ERROR] \u4FDD\u5B58\u4EFB\u52A1\u6587\u6863\u5931\u8D25:", ((_c = error_14.response) === null || _c === void 0 ? void 0 : _c.data) || error_14.message);
                        return [2 /*return*/, {
                                success: false,
                                error: "\u4FDD\u5B58\u4EFB\u52A1\u6587\u6863\u5931\u8D25: ".concat(((_e = (_d = error_14.response) === null || _d === void 0 ? void 0 : _d.data) === null || _e === void 0 ? void 0 : _e.error) || error_14.message)
                            }];
                    case 11: return [2 /*return*/];
                }
            });
        });
    };
    // 始终创建并关联任务文档（不走更新路径）
    TaskMCPServer.prototype.createAndAttachTaskDocument = function (taskId_1, content_1) {
        return __awaiter(this, arguments, void 0, function (taskId, content, projectId, title) {
            var task, actualProjectId, requestData, response, data, error_15, errorMessage;
            var _a, _b, _c, _d, _e, _f, _g, _h, _j;
            if (projectId === void 0) { projectId = 1; }
            return __generator(this, function (_k) {
                switch (_k.label) {
                    case 0:
                        _k.trys.push([0, 3, , 4]);
                        console.error("[DEBUG] \u521B\u5EFA\u5E76\u5173\u8054\u4EFB\u52A1\u6587\u6863: \u4EFB\u52A1ID ".concat(taskId, ", \u9879\u76EEID: ").concat(projectId));
                        return [4 /*yield*/, this.findTaskById(taskId)];
                    case 1:
                        task = _k.sent();
                        actualProjectId = task.project_id || projectId;
                        requestData = {
                            title: title || (task.title ? "".concat(task.title, " - \u6587\u6863") : "Task ".concat(taskId, " \u6587\u6863")),
                            content: content,
                            type: 'markdown', // models.DocumentType
                            status: 'draft', // models.DocumentStatus  
                            description: "\u4EFB\u52A1 #".concat(taskId, " \u7684\u5173\u8054\u6587\u6863"),
                            tags: ['mcp-generated'], // 添加标记表明通过MCP生成
                            visibility: 'team', // models.Visibility
                            is_template: false, // 不是模板
                            relationship_type: 'attachment', // 关联类型
                            metadata: {
                                source: 'claude-code-mcp',
                                created_by: 'mcp-bridge',
                                task_id: taskId.toString()
                            }
                        };
                        return [4 /*yield*/, axios_1.default.post("".concat(this.apiBase, "/projects/").concat(actualProjectId, "/tasks/").concat(taskId, "/documents/create-and-attach"), requestData, {
                                headers: this.getHeaders(),
                                proxy: false
                            })];
                    case 2:
                        response = _k.sent();
                        data = ((_a = response.data) === null || _a === void 0 ? void 0 : _a.data) || response.data || {};
                        return [2 /*return*/, {
                                success: true,
                                task_id: taskId,
                                project_id: actualProjectId,
                                document_id: data.document_id || data.id,
                                title: requestData.title,
                                content_length: content.length,
                                created: true,
                                message: "\u2705 \u4EFB\u52A1\u6587\u6863\u5DF2\u521B\u5EFA\u5E76\u5173\u8054\u5230\u6570\u636E\u5E93 (\u4EFB\u52A1#".concat(taskId, ", \u6587\u6863ID: ").concat(data.document_id || data.id, ")")
                            }];
                    case 3:
                        error_15 = _k.sent();
                        console.error("[ERROR] \u521B\u5EFA\u5E76\u5173\u8054\u4EFB\u52A1\u6587\u6863\u5931\u8D25:", ((_b = error_15.response) === null || _b === void 0 ? void 0 : _b.data) || error_15.message);
                        errorMessage = '创建并关联任务文档失败';
                        if ((_d = (_c = error_15.response) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.message) {
                            errorMessage = error_15.response.data.message;
                        }
                        else if (((_e = error_15.response) === null || _e === void 0 ? void 0 : _e.status) === 401) {
                            errorMessage = '认证失败，请检查API令牌';
                        }
                        else if (((_f = error_15.response) === null || _f === void 0 ? void 0 : _f.status) === 404) {
                            errorMessage = '任务或项目不存在';
                        }
                        else if (((_g = error_15.response) === null || _g === void 0 ? void 0 : _g.status) === 400) {
                            errorMessage = '请求参数无效';
                        }
                        return [2 /*return*/, {
                                success: false,
                                error: "".concat(errorMessage, ": ").concat(((_j = (_h = error_15.response) === null || _h === void 0 ? void 0 : _h.data) === null || _j === void 0 ? void 0 : _j.error) || error_15.message)
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    // 获取任务文档内容（使用统一文档API）
    TaskMCPServer.prototype.getTaskDocument = function (taskId_1) {
        return __awaiter(this, arguments, void 0, function (taskId, projectId) {
            var task, actualProjectId, listResp, docs, latest, _i, docs_1, d, docResp, docData, error_16;
            var _a, _b, _c, _d, _e, _f, _g;
            if (projectId === void 0) { projectId = 1; }
            return __generator(this, function (_h) {
                switch (_h.label) {
                    case 0:
                        _h.trys.push([0, 4, , 5]);
                        console.error("[DEBUG] \u83B7\u53D6\u4EFB\u52A1\u6587\u6863: \u4EFB\u52A1ID ".concat(taskId, ", \u9879\u76EEID: ").concat(projectId));
                        return [4 /*yield*/, this.findTaskById(taskId)];
                    case 1:
                        task = _h.sent();
                        actualProjectId = task.project_id || projectId;
                        return [4 /*yield*/, axios_1.default.get("".concat(this.apiBase, "/projects/").concat(actualProjectId, "/tasks/").concat(taskId, "/documents/list"), {
                                headers: this.getHeaders(),
                                proxy: false
                            })];
                    case 2:
                        listResp = _h.sent();
                        docs = ((_b = (_a = listResp.data) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.documents) || [];
                        if (!docs.length) {
                            return [2 /*return*/, {
                                    success: false,
                                    task_id: taskId,
                                    project_id: actualProjectId,
                                    error: "\u4EFB\u52A1 #".concat(taskId, " \u6682\u65E0\u6587\u6863"),
                                    not_found: true
                                }];
                        }
                        latest = docs[0];
                        for (_i = 0, docs_1 = docs; _i < docs_1.length; _i++) {
                            d = docs_1[_i];
                            if (d.updated_at && latest.updated_at && new Date(d.updated_at) > new Date(latest.updated_at)) {
                                latest = d;
                            }
                        }
                        return [4 /*yield*/, axios_1.default.get("".concat(this.apiBase, "/documents/").concat(latest.id), {
                                headers: this.getHeaders(),
                                proxy: false
                            })];
                    case 3:
                        docResp = _h.sent();
                        docData = ((_c = docResp.data) === null || _c === void 0 ? void 0 : _c.data) || docResp.data || {};
                        return [2 /*return*/, {
                                success: true,
                                task_id: taskId,
                                project_id: actualProjectId,
                                document_id: latest.id,
                                content: docData.content || '',
                                title: docData.title || latest.title || "\u4EFB\u52A1 #".concat(taskId, " \u6587\u6863"),
                                updated_at: docData.updated_at || latest.updated_at,
                                message: "\uD83D\uDCC4 \u4EFB\u52A1 #".concat(taskId, " \u6587\u6863\u5185\u5BB9\u5DF2\u83B7\u53D6")
                            }];
                    case 4:
                        error_16 = _h.sent();
                        if (((_d = error_16.response) === null || _d === void 0 ? void 0 : _d.status) === 404) {
                            return [2 /*return*/, {
                                    success: false,
                                    task_id: taskId,
                                    project_id: projectId,
                                    error: "\u4EFB\u52A1 #".concat(taskId, " \u6682\u65E0\u6587\u6863"),
                                    not_found: true
                                }];
                        }
                        console.error("[ERROR] \u83B7\u53D6\u4EFB\u52A1\u6587\u6863\u5931\u8D25:", ((_e = error_16.response) === null || _e === void 0 ? void 0 : _e.data) || error_16.message);
                        return [2 /*return*/, {
                                success: false,
                                error: "\u83B7\u53D6\u4EFB\u52A1\u6587\u6863\u5931\u8D25: ".concat(((_g = (_f = error_16.response) === null || _f === void 0 ? void 0 : _f.data) === null || _g === void 0 ? void 0 : _g.error) || error_16.message)
                            }];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    // 检查任务是否有文档（使用统一文档API）
    TaskMCPServer.prototype.hasTaskDocument = function (taskId_1) {
        return __awaiter(this, arguments, void 0, function (taskId, projectId) {
            var task, actualProjectId, response, hasDoc, error_17;
            var _a, _b, _c;
            if (projectId === void 0) { projectId = 1; }
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _d.trys.push([0, 3, , 4]);
                        console.error("[DEBUG] \u68C0\u67E5\u4EFB\u52A1\u6587\u6863: \u4EFB\u52A1ID ".concat(taskId, ", \u9879\u76EEID: ").concat(projectId));
                        return [4 /*yield*/, this.findTaskById(taskId)];
                    case 1:
                        task = _d.sent();
                        actualProjectId = task.project_id || projectId;
                        return [4 /*yield*/, axios_1.default.get("".concat(this.apiBase, "/projects/").concat(actualProjectId, "/tasks/").concat(taskId, "/documents/has"), {
                                headers: this.getHeaders(),
                                proxy: false
                            })];
                    case 2:
                        response = _d.sent();
                        hasDoc = !!(response.data && response.data.data && response.data.data.has_document);
                        return [2 /*return*/, {
                                success: true,
                                task_id: taskId,
                                project_id: actualProjectId,
                                has_document: hasDoc,
                                message: hasDoc ? "\uD83D\uDCC4 \u4EFB\u52A1 #".concat(taskId, " \u6709\u6587\u6863") : "\uD83D\uDCC4 \u4EFB\u52A1 #".concat(taskId, " \u6682\u65E0\u6587\u6863")
                            }];
                    case 3:
                        error_17 = _d.sent();
                        console.error("[ERROR] \u68C0\u67E5\u4EFB\u52A1\u6587\u6863\u5931\u8D25:", ((_a = error_17.response) === null || _a === void 0 ? void 0 : _a.data) || error_17.message);
                        return [2 /*return*/, {
                                success: false,
                                error: "\u68C0\u67E5\u4EFB\u52A1\u6587\u6863\u5931\u8D25: ".concat(((_c = (_b = error_17.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.error) || error_17.message)
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    // 删除任务文档（使用统一文档API，删除关联）
    TaskMCPServer.prototype.deleteTaskDocument = function (taskId_1) {
        return __awaiter(this, arguments, void 0, function (taskId, projectId) {
            var task, actualProjectId, listResp, docs, latest, _i, docs_2, d, error_18;
            var _a, _b, _c, _d, _e;
            if (projectId === void 0) { projectId = 1; }
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        _f.trys.push([0, 4, , 5]);
                        console.error("[DEBUG] \u5220\u9664\u4EFB\u52A1\u6587\u6863: \u4EFB\u52A1ID ".concat(taskId, ", \u9879\u76EEID: ").concat(projectId));
                        return [4 /*yield*/, this.findTaskById(taskId)];
                    case 1:
                        task = _f.sent();
                        actualProjectId = task.project_id || projectId;
                        return [4 /*yield*/, axios_1.default.get("".concat(this.apiBase, "/projects/").concat(actualProjectId, "/tasks/").concat(taskId, "/documents/list"), {
                                headers: this.getHeaders(),
                                proxy: false
                            })];
                    case 2:
                        listResp = _f.sent();
                        docs = ((_b = (_a = listResp.data) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.documents) || [];
                        if (!docs.length) {
                            return [2 /*return*/, {
                                    success: false,
                                    task_id: taskId,
                                    project_id: actualProjectId,
                                    error: "\u4EFB\u52A1 #".concat(taskId, " \u6682\u65E0\u6587\u6863\u53EF\u5220\u9664")
                                }];
                        }
                        latest = docs[0];
                        for (_i = 0, docs_2 = docs; _i < docs_2.length; _i++) {
                            d = docs_2[_i];
                            if (d.updated_at && latest.updated_at && new Date(d.updated_at) > new Date(latest.updated_at)) {
                                latest = d;
                            }
                        }
                        return [4 /*yield*/, axios_1.default.delete("".concat(this.apiBase, "/projects/").concat(actualProjectId, "/tasks/").concat(taskId, "/documents/").concat(latest.id), {
                                headers: this.getHeaders(),
                                proxy: false
                            })];
                    case 3:
                        _f.sent();
                        return [2 /*return*/, {
                                success: true,
                                task_id: taskId,
                                project_id: actualProjectId,
                                document_id: latest.id,
                                message: "\uD83D\uDDD1\uFE0F \u4EFB\u52A1 #".concat(taskId, " \u6587\u6863\u5173\u8054\u5DF2\u79FB\u9664")
                            }];
                    case 4:
                        error_18 = _f.sent();
                        console.error("[ERROR] \u5220\u9664\u4EFB\u52A1\u6587\u6863\u5931\u8D25:", ((_c = error_18.response) === null || _c === void 0 ? void 0 : _c.data) || error_18.message);
                        return [2 /*return*/, {
                                success: false,
                                error: "\u5220\u9664\u4EFB\u52A1\u6587\u6863\u5931\u8D25: ".concat(((_e = (_d = error_18.response) === null || _d === void 0 ? void 0 : _d.data) === null || _e === void 0 ? void 0 : _e.error) || error_18.message)
                            }];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    // 移动任务到其他项目
    TaskMCPServer.prototype.moveTask = function (id, targetProjectId) {
        return __awaiter(this, void 0, void 0, function () {
            var task, projectResponse, projectError_2, childrenResponse, allTasks, childTasks, moveData, createResponse, newTask, deleteResponse, error_19;
            var _a, _b, _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        _e.trys.push([0, 9, , 10]);
                        console.error("[DEBUG] \u79FB\u52A8\u4EFB\u52A1: ID ".concat(id, " \u5230\u9879\u76EE ").concat(targetProjectId));
                        return [4 /*yield*/, this.findTaskById(id)];
                    case 1:
                        task = _e.sent();
                        _e.label = 2;
                    case 2:
                        _e.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, axios_1.default.get("".concat(this.apiBase, "/projects/").concat(targetProjectId), {
                                headers: this.getHeaders(),
                                proxy: false
                            })];
                    case 3:
                        projectResponse = _e.sent();
                        if (!projectResponse.data.data) {
                            return [2 /*return*/, {
                                    success: false,
                                    error: "\u76EE\u6807\u9879\u76EE ID ".concat(targetProjectId, " \u4E0D\u5B58\u5728")
                                }];
                        }
                        return [3 /*break*/, 5];
                    case 4:
                        projectError_2 = _e.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u76EE\u6807\u9879\u76EE ID ".concat(targetProjectId, " \u4E0D\u5B58\u5728\u6216\u65E0\u6743\u9650\u8BBF\u95EE")
                            }];
                    case 5:
                        // 检查是否是移动到同一个项目
                        if (task.project_id === targetProjectId) {
                            return [2 /*return*/, {
                                    success: false,
                                    error: "\u4EFB\u52A1\u5DF2\u5728\u9879\u76EE ".concat(targetProjectId, " \u4E2D\uFF0C\u65E0\u9700\u79FB\u52A8")
                                }];
                        }
                        return [4 /*yield*/, axios_1.default.get("".concat(this.apiBase, "/projects/").concat(task.project_id, "/tasks"), {
                                headers: this.getHeaders(),
                                proxy: false
                            })];
                    case 6:
                        childrenResponse = _e.sent();
                        allTasks = ((_a = childrenResponse.data.data) === null || _a === void 0 ? void 0 : _a.data) || [];
                        childTasks = allTasks.filter(function (t) { return t.parent_id === id; });
                        if (childTasks.length > 0) {
                            return [2 /*return*/, {
                                    success: false,
                                    error: "\u4EFB\u52A1\u6709 ".concat(childTasks.length, " \u4E2A\u5B50\u4EFB\u52A1\uFF0C\u6682\u4E0D\u652F\u6301\u79FB\u52A8\u6709\u5B50\u4EFB\u52A1\u7684\u4EFB\u52A1"),
                                    child_count: childTasks.length,
                                    children: childTasks.map(function (t) { return ({ id: t.id, title: t.title }); })
                                }];
                        }
                        // 检查任务是否是子任务
                        if (task.parent_id) {
                            return [2 /*return*/, {
                                    success: false,
                                    error: "\u4EFB\u52A1\u662F\u5B50\u4EFB\u52A1\uFF08\u7236\u4EFB\u52A1ID: ".concat(task.parent_id, "\uFF09\uFF0C\u6682\u4E0D\u652F\u6301\u79FB\u52A8\u5B50\u4EFB\u52A1\u5230\u5176\u4ED6\u9879\u76EE")
                                }];
                        }
                        moveData = {
                            title: task.title,
                            description: task.description,
                            status: task.status,
                            project_id: targetProjectId,
                            assignee_id: task.assignee_id,
                            due_date: task.due_date,
                            custom_fields: task.custom_fields,
                            parent_id: null // 移动到新项目时重置父任务关系
                        };
                        return [4 /*yield*/, axios_1.default.post("".concat(this.apiBase, "/projects/").concat(targetProjectId, "/tasks"), moveData, {
                                headers: this.getHeaders(),
                                proxy: false
                            })];
                    case 7:
                        createResponse = _e.sent();
                        newTask = createResponse.data.data;
                        return [4 /*yield*/, axios_1.default.delete("".concat(this.apiBase, "/projects/").concat(task.project_id, "/tasks/").concat(id), {
                                headers: this.getHeaders(),
                                proxy: false
                            })];
                    case 8:
                        deleteResponse = _e.sent();
                        return [2 /*return*/, {
                                success: true,
                                original_task_id: id,
                                new_task_id: newTask.id,
                                title: task.title,
                                source_project_id: task.project_id,
                                target_project_id: targetProjectId,
                                message: "\uD83D\uDCE6 \u4EFB\u52A1 \"".concat(task.title, "\" \u5DF2\u4ECE\u9879\u76EE ").concat(task.project_id, " \u79FB\u52A8\u5230\u9879\u76EE ").concat(targetProjectId, " (\u65B0\u4EFB\u52A1ID: ").concat(newTask.id, ")")
                            }];
                    case 9:
                        error_19 = _e.sent();
                        console.error("[ERROR] \u79FB\u52A8\u4EFB\u52A1\u5931\u8D25:", ((_b = error_19.response) === null || _b === void 0 ? void 0 : _b.data) || error_19.message);
                        return [2 /*return*/, {
                                success: false,
                                error: "\u79FB\u52A8\u4EFB\u52A1\u5931\u8D25: ".concat(((_d = (_c = error_19.response) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.error) || error_19.message)
                            }];
                    case 10: return [2 /*return*/];
                }
            });
        });
    };
    // ========== Phase 1 新增接口 ==========
    // 1. 暂停任务
    TaskMCPServer.prototype.pauseTask = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var task, updateResponse, error_20;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        console.error("[DEBUG] \u6682\u505C\u4EFB\u52A1: ID ".concat(id));
                        return [4 /*yield*/, this.findTaskById(id)];
                    case 1:
                        task = _a.sent();
                        // 检查当前状态
                        if (task.status === 'completed') {
                            return [2 /*return*/, {
                                    success: false,
                                    error: "\u4EFB\u52A1 \"".concat(task.title, "\" \u5DF2\u5B8C\u6210\uFF0C\u65E0\u6CD5\u6682\u505C")
                                }];
                        }
                        if (task.status === 'cancelled') {
                            return [2 /*return*/, {
                                    success: false,
                                    error: "\u4EFB\u52A1 \"".concat(task.title, "\" \u5DF2\u53D6\u6D88\uFF0C\u65E0\u6CD5\u6682\u505C")
                                }];
                        }
                        return [4 /*yield*/, axios_1.default.put("".concat(this.apiBase, "/projects/").concat(task.project_id, "/tasks/").concat(id), {
                                title: task.title,
                                project_id: task.project_id,
                                status: 'pending',
                                description: task.description,
                                parent_id: task.parent_id,
                                custom_fields: task.custom_fields
                            }, {
                                headers: this.getHeaders(),
                                proxy: false
                            })];
                    case 2:
                        updateResponse = _a.sent();
                        return [2 /*return*/, {
                                success: true,
                                id: id,
                                title: task.title,
                                status: 'pending',
                                message: "\u23F8\uFE0F \u4EFB\u52A1 \"".concat(task.title, "\" \u5DF2\u6682\u505C")
                            }];
                    case 3:
                        error_20 = _a.sent();
                        console.error("[ERROR] \u6682\u505C\u4EFB\u52A1\u5931\u8D25:", error_20.message);
                        return [2 /*return*/, {
                                success: false,
                                error: "\u6682\u505C\u4EFB\u52A1\u5931\u8D25: ".concat(error_20.message)
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    // 2. 查看项目列表
    TaskMCPServer.prototype.listProjects = function () {
        return __awaiter(this, void 0, void 0, function () {
            var response, projects, error_21;
            var _a, _b, _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        _e.trys.push([0, 2, , 3]);
                        console.error("[DEBUG] \u83B7\u53D6\u9879\u76EE\u5217\u8868");
                        return [4 /*yield*/, axios_1.default.get("".concat(this.apiBase, "/projects"), {
                                headers: this.getHeaders(),
                                proxy: false
                            })];
                    case 1:
                        response = _e.sent();
                        projects = ((_a = response.data.data) === null || _a === void 0 ? void 0 : _a.data) || [];
                        return [2 /*return*/, {
                                success: true,
                                total: projects.length,
                                projects: projects.map(function (project) { return ({
                                    id: project.id,
                                    name: project.name,
                                    description: project.description,
                                    created_at: project.created_at,
                                    updated_at: project.updated_at,
                                    status: project.status
                                }); }),
                                message: "\uD83D\uDCC1 \u5171\u627E\u5230 ".concat(projects.length, " \u4E2A\u9879\u76EE")
                            }];
                    case 2:
                        error_21 = _e.sent();
                        console.error("[ERROR] \u83B7\u53D6\u9879\u76EE\u5217\u8868\u5931\u8D25:", ((_b = error_21.response) === null || _b === void 0 ? void 0 : _b.data) || error_21.message);
                        return [2 /*return*/, {
                                success: false,
                                error: "\u83B7\u53D6\u9879\u76EE\u5217\u8868\u5931\u8D25: ".concat(((_d = (_c = error_21.response) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.error) || error_21.message)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 3. 创建新项目
    TaskMCPServer.prototype.createProject = function (name, description) {
        return __awaiter(this, void 0, void 0, function () {
            var response, project, error_22;
            var _a, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _d.trys.push([0, 2, , 3]);
                        console.error("[DEBUG] \u521B\u5EFA\u65B0\u9879\u76EE: ".concat(name));
                        return [4 /*yield*/, axios_1.default.post("".concat(this.apiBase, "/projects"), {
                                name: name,
                                description: description || "\u901A\u8FC7Claude Code\u521B\u5EFA\uFF1A".concat(name),
                                status: 'active'
                            }, {
                                headers: this.getHeaders(),
                                proxy: false
                            })];
                    case 1:
                        response = _d.sent();
                        project = response.data.data;
                        return [2 /*return*/, {
                                success: true,
                                data: project,
                                id: project.id,
                                name: project.name,
                                description: project.description,
                                status: project.status,
                                message: "\u2705 \u9879\u76EE \"".concat(name, "\" \u5DF2\u521B\u5EFA (ID: ").concat(project.id, ")")
                            }];
                    case 2:
                        error_22 = _d.sent();
                        console.error("[ERROR] \u521B\u5EFA\u9879\u76EE\u5931\u8D25:", ((_a = error_22.response) === null || _a === void 0 ? void 0 : _a.data) || error_22.message);
                        return [2 /*return*/, {
                                success: false,
                                error: "\u521B\u5EFA\u9879\u76EE\u5931\u8D25: ".concat(((_c = (_b = error_22.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.error) || error_22.message)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 4. 获取任务的子任务
    TaskMCPServer.prototype.getTaskChildren = function (parentId) {
        return __awaiter(this, void 0, void 0, function () {
            var parentTask, response, allTasks, childTasks, error_23;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 3, , 4]);
                        console.error("[DEBUG] \u83B7\u53D6\u4EFB\u52A1\u5B50\u4EFB\u52A1: \u7236\u4EFB\u52A1ID ".concat(parentId));
                        return [4 /*yield*/, this.findTaskById(parentId)];
                    case 1:
                        parentTask = _b.sent();
                        return [4 /*yield*/, axios_1.default.get("".concat(this.apiBase, "/projects/").concat(parentTask.project_id, "/tasks"), {
                                headers: this.getHeaders(),
                                proxy: false
                            })];
                    case 2:
                        response = _b.sent();
                        allTasks = ((_a = response.data.data) === null || _a === void 0 ? void 0 : _a.data) || [];
                        childTasks = allTasks.filter(function (task) { return task.parent_id === parentId; });
                        return [2 /*return*/, {
                                success: true,
                                parent_id: parentId,
                                parent_title: parentTask.title,
                                total: childTasks.length,
                                children: childTasks.map(function (task) {
                                    var _a;
                                    return ({
                                        id: task.id,
                                        title: task.title,
                                        status: task.status,
                                        created_at: task.created_at,
                                        priority: ((_a = task.custom_fields) === null || _a === void 0 ? void 0 : _a.priority) || 'low'
                                    });
                                }),
                                message: "\uD83C\uDF33 \u4EFB\u52A1 \"".concat(parentTask.title, "\" \u6709 ").concat(childTasks.length, " \u4E2A\u5B50\u4EFB\u52A1")
                            }];
                    case 3:
                        error_23 = _b.sent();
                        console.error("[ERROR] \u83B7\u53D6\u5B50\u4EFB\u52A1\u5931\u8D25:", error_23.message);
                        return [2 /*return*/, {
                                success: false,
                                error: "\u83B7\u53D6\u5B50\u4EFB\u52A1\u5931\u8D25: ".concat(error_23.message)
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    // 获取任务详细信息（包含格式化的父任务、同级任务和子任务）
    TaskMCPServer.prototype.getDetailedTaskInfo = function (taskId) {
        return __awaiter(this, void 0, void 0, function () {
            var task, detailedInfo, parentId, parentTask, error_24, allTasksResponse, allTasks, parentId_1, siblingTasks, error_25, childrenResult, error_26, error_27;
            var _a, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _d.trys.push([0, 12, , 13]);
                        console.error("[DEBUG] \u83B7\u53D6\u4EFB\u52A1\u8BE6\u7EC6\u4FE1\u606F: \u4EFB\u52A1ID ".concat(taskId));
                        return [4 /*yield*/, this.findTaskById(taskId)];
                    case 1:
                        task = _d.sent();
                        if (!task) {
                            return [2 /*return*/, {
                                    success: false,
                                    error: "\u672A\u627E\u5230\u4EFB\u52A1 ID: ".concat(taskId)
                                }];
                        }
                        detailedInfo = {
                            id: task.id,
                            title: task.title,
                            status: task.status,
                            project_id: task.project_id,
                            parent_id: task.parent_id,
                            created_at: task.created_at,
                            updated_at: task.updated_at,
                            description: task.description,
                            priority: ((_a = task.custom_fields) === null || _a === void 0 ? void 0 : _a.priority) || 'low',
                            estimated_hours: task.estimated_hours,
                            actual_hours: task.actual_hours,
                            custom_fields: task.custom_fields
                        };
                        if (!(task.parent_id || task.parent_task_id)) return [3 /*break*/, 5];
                        parentId = task.parent_id || task.parent_task_id;
                        _d.label = 2;
                    case 2:
                        _d.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, this.findTaskById(parentId)];
                    case 3:
                        parentTask = _d.sent();
                        detailedInfo.parent_task = {
                            id: parentTask.id,
                            // 在任务名称前添加ID
                            title: "#".concat(parentTask.id, " ").concat(parentTask.title),
                            status: parentTask.status,
                            priority: ((_b = parentTask.custom_fields) === null || _b === void 0 ? void 0 : _b.priority) || 'low'
                        };
                        return [3 /*break*/, 5];
                    case 4:
                        error_24 = _d.sent();
                        detailedInfo.parent_task = {
                            id: parentId,
                            title: "#".concat(parentId, " (\u65E0\u6CD5\u83B7\u53D6\u8BE6\u60C5)"),
                            error: '无法获取父任务信息'
                        };
                        return [3 /*break*/, 5];
                    case 5:
                        _d.trys.push([5, 7, , 8]);
                        return [4 /*yield*/, axios_1.default.get("".concat(this.apiBase, "/projects/").concat(task.project_id, "/tasks"), {
                                headers: this.getHeaders(),
                                proxy: false
                            })];
                    case 6:
                        allTasksResponse = _d.sent();
                        allTasks = ((_c = allTasksResponse.data.data) === null || _c === void 0 ? void 0 : _c.data) || [];
                        parentId_1 = task.parent_id || task.parent_task_id;
                        siblingTasks = allTasks.filter(function (t) {
                            return (t.parent_id === parentId_1 || t.parent_task_id === parentId_1) &&
                                t.id !== taskId;
                        });
                        detailedInfo.sibling_tasks = siblingTasks.map(function (sibling) {
                            var _a;
                            return ({
                                id: sibling.id,
                                // 在任务名称前添加ID
                                title: "#".concat(sibling.id, " ").concat(sibling.title),
                                status: sibling.status,
                                priority: ((_a = sibling.custom_fields) === null || _a === void 0 ? void 0 : _a.priority) || 'low'
                            });
                        });
                        detailedInfo.sibling_count = siblingTasks.length;
                        return [3 /*break*/, 8];
                    case 7:
                        error_25 = _d.sent();
                        detailedInfo.sibling_tasks = [];
                        detailedInfo.sibling_error = '获取同级任务失败';
                        return [3 /*break*/, 8];
                    case 8:
                        _d.trys.push([8, 10, , 11]);
                        return [4 /*yield*/, this.getTaskChildren(taskId)];
                    case 9:
                        childrenResult = _d.sent();
                        if (childrenResult.success && childrenResult.children) {
                            detailedInfo.child_tasks = childrenResult.children.map(function (child) { return ({
                                id: child.id,
                                // 在任务名称前添加ID
                                title: "#".concat(child.id, " ").concat(child.title),
                                status: child.status,
                                priority: child.priority || 'low'
                            }); });
                            detailedInfo.child_count = childrenResult.children.length;
                        }
                        else {
                            detailedInfo.child_tasks = [];
                            detailedInfo.child_count = 0;
                        }
                        return [3 /*break*/, 11];
                    case 10:
                        error_26 = _d.sent();
                        detailedInfo.child_tasks = [];
                        detailedInfo.child_error = '获取子任务失败';
                        return [3 /*break*/, 11];
                    case 11: return [2 /*return*/, {
                            success: true,
                            data: detailedInfo,
                            message: "\uD83D\uDCCB \u4EFB\u52A1\u8BE6\u60C5\u5DF2\u83B7\u53D6 - #".concat(task.id, " ").concat(task.title)
                        }];
                    case 12:
                        error_27 = _d.sent();
                        console.error("[ERROR] \u83B7\u53D6\u4EFB\u52A1\u8BE6\u60C5\u5931\u8D25:", error_27.message);
                        return [2 /*return*/, {
                                success: false,
                                error: "\u83B7\u53D6\u4EFB\u52A1\u8BE6\u60C5\u5931\u8D25: ".concat(error_27.message)
                            }];
                    case 13: return [2 /*return*/];
                }
            });
        });
    };
    // 5. 开始任务计时
    TaskMCPServer.prototype.startTimer = function (taskId, description) {
        return __awaiter(this, void 0, void 0, function () {
            var task, response, timerData, error_28;
            var _a, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _d.trys.push([0, 5, , 6]);
                        console.error("[DEBUG] \u5F00\u59CB\u4EFB\u52A1\u8BA1\u65F6: \u4EFB\u52A1ID ".concat(taskId));
                        return [4 /*yield*/, this.findTaskById(taskId)];
                    case 1:
                        task = _d.sent();
                        // 检查任务状态 - 只有可工作状态的任务可以计时
                        if (!['draft', 'planning', 'todo', 'in_progress', 'testing', 'on_hold'].includes(task.status)) {
                            return [2 /*return*/, {
                                    success: false,
                                    error: "\u4EFB\u52A1 \"".concat(task.title, "\" \u72B6\u6001\u4E3A \"").concat(task.status, "\"\uFF0C\u65E0\u6CD5\u5F00\u59CB\u8BA1\u65F6")
                                }];
                        }
                        return [4 /*yield*/, axios_1.default.post("".concat(this.apiBase, "/user/timer/start"), {
                                task_id: taskId,
                                title: description || "Claude Code \u5F00\u59CB\u8BA1\u65F6\uFF1A".concat(task.title),
                                category: 'development',
                                estimated_minutes: 30 // 默认估算30分钟
                            }, {
                                headers: this.getHeaders(),
                                proxy: false
                            })];
                    case 2:
                        response = _d.sent();
                        timerData = response.data.data;
                        if (!(task.status !== 'in_progress')) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.startTask(taskId)];
                    case 3:
                        _d.sent();
                        _d.label = 4;
                    case 4: return [2 /*return*/, {
                            success: true,
                            data: timerData,
                            task_id: taskId,
                            task_title: task.title,
                            timer_id: timerData.id,
                            started_at: timerData.started_at,
                            description: timerData.description,
                            message: "\u23F1\uFE0F \u4EFB\u52A1 \"".concat(task.title, "\" \u5F00\u59CB\u8BA1\u65F6")
                        }];
                    case 5:
                        error_28 = _d.sent();
                        console.error("[ERROR] \u5F00\u59CB\u8BA1\u65F6\u5931\u8D25:", ((_a = error_28.response) === null || _a === void 0 ? void 0 : _a.data) || error_28.message);
                        return [2 /*return*/, {
                                success: false,
                                error: "\u5F00\u59CB\u8BA1\u65F6\u5931\u8D25: ".concat(((_c = (_b = error_28.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.error) || error_28.message)
                            }];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    // 6. 停止当前计时
    TaskMCPServer.prototype.stopTimer = function (taskId) {
        return __awaiter(this, void 0, void 0, function () {
            var response, timerData, task, taskError_1, error_29;
            var _a, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _d.trys.push([0, 8, , 9]);
                        console.error("[DEBUG] \u505C\u6B62\u8BA1\u65F6: ".concat(taskId ? "\u4EFB\u52A1ID ".concat(taskId) : '当前所有计时'));
                        return [4 /*yield*/, axios_1.default.post("".concat(this.apiBase, "/user/timer/stop"), {}, {
                                headers: this.getHeaders(),
                                proxy: false
                            })];
                    case 1:
                        response = _d.sent();
                        timerData = response.data.data;
                        if (!taskId) return [3 /*break*/, 6];
                        _d.label = 2;
                    case 2:
                        _d.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, this.findTaskById(taskId)];
                    case 3:
                        task = _d.sent();
                        return [2 /*return*/, {
                                success: true,
                                data: timerData,
                                task_id: taskId,
                                task_title: task.title,
                                timer_id: timerData.id,
                                duration_seconds: timerData.duration_seconds,
                                duration_formatted: this.formatDuration(timerData.duration_seconds || 0),
                                stopped_at: timerData.stopped_at,
                                message: "\u23F9\uFE0F \u4EFB\u52A1 \"".concat(task.title, "\" \u505C\u6B62\u8BA1\u65F6\uFF0C\u8017\u65F6: ").concat(this.formatDuration(timerData.duration_seconds || 0))
                            }];
                    case 4:
                        taskError_1 = _d.sent();
                        return [2 /*return*/, {
                                success: true,
                                data: timerData,
                                task_id: taskId,
                                task_title: '未知任务',
                                timer_id: timerData.id,
                                duration_seconds: timerData.duration_seconds,
                                duration_formatted: this.formatDuration(timerData.duration_seconds || 0),
                                stopped_at: timerData.stopped_at,
                                message: "\u23F9\uFE0F \u8BA1\u65F6\u5DF2\u505C\u6B62\uFF0C\u8017\u65F6: ".concat(this.formatDuration(timerData.duration_seconds || 0))
                            }];
                    case 5: return [3 /*break*/, 7];
                    case 6: return [2 /*return*/, {
                            success: true,
                            data: timerData,
                            stopped_count: 1,
                            duration_seconds: timerData.duration_seconds,
                            duration_formatted: this.formatDuration(timerData.duration_seconds || 0),
                            message: "\u23F9\uFE0F \u5DF2\u505C\u6B62\u8BA1\u65F6\uFF0C\u603B\u8017\u65F6: ".concat(this.formatDuration(timerData.duration_seconds || 0))
                        }];
                    case 7: return [3 /*break*/, 9];
                    case 8:
                        error_29 = _d.sent();
                        console.error("[ERROR] \u505C\u6B62\u8BA1\u65F6\u5931\u8D25:", ((_a = error_29.response) === null || _a === void 0 ? void 0 : _a.data) || error_29.message);
                        return [2 /*return*/, {
                                success: false,
                                error: "\u505C\u6B62\u8BA1\u65F6\u5931\u8D25: ".concat(((_c = (_b = error_29.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.error) || error_29.message)
                            }];
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    // 7. 获取当前计时状态
    TaskMCPServer.prototype.getCurrentTimer = function () {
        return __awaiter(this, void 0, void 0, function () {
            var response, timerData, task, currentDuration, timerInfo, taskError_2, timerInfo, error_30;
            var _a, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _d.trys.push([0, 6, , 7]);
                        console.error("[DEBUG] \u83B7\u53D6\u5F53\u524D\u8BA1\u65F6\u72B6\u6001");
                        return [4 /*yield*/, axios_1.default.get("".concat(this.apiBase, "/user/timer/current"), {
                                headers: this.getHeaders(),
                                proxy: false
                            })];
                    case 1:
                        response = _d.sent();
                        timerData = response.data.data;
                        if (!timerData || !timerData.task_id) {
                            return [2 /*return*/, {
                                    success: true,
                                    data: { active_timers: [] },
                                    active_timers: [],
                                    total: 0,
                                    message: "\u23F1\uFE0F \u5F53\u524D\u6CA1\u6709\u6D3B\u52A8\u7684\u8BA1\u65F6"
                                }];
                        }
                        _d.label = 2;
                    case 2:
                        _d.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, this.findTaskById(timerData.task_id)];
                    case 3:
                        task = _d.sent();
                        currentDuration = this.calculateCurrentDuration(timerData.started_at);
                        timerInfo = {
                            timer_id: timerData.id,
                            task_id: timerData.task_id,
                            task_title: task.title,
                            started_at: timerData.started_at,
                            current_duration_seconds: currentDuration,
                            current_duration_formatted: this.formatDuration(currentDuration),
                            description: timerData.description
                        };
                        return [2 /*return*/, {
                                success: true,
                                data: { active_timers: [timerInfo] },
                                active_timers: [timerInfo],
                                total: 1,
                                message: "\u23F1\uFE0F \u5F53\u524D\u6B63\u5728\u8BA1\u65F6\u4EFB\u52A1: \"".concat(task.title, "\" - ").concat(this.formatDuration(currentDuration))
                            }];
                    case 4:
                        taskError_2 = _d.sent();
                        timerInfo = {
                            timer_id: timerData.id,
                            task_id: timerData.task_id,
                            task_title: '未知任务',
                            started_at: timerData.started_at,
                            current_duration_seconds: 0,
                            current_duration_formatted: '00:00:00',
                            description: timerData.description,
                            error: '无法获取任务信息'
                        };
                        return [2 /*return*/, {
                                success: true,
                                data: { active_timers: [timerInfo] },
                                active_timers: [timerInfo],
                                total: 1,
                                message: "\u23F1\uFE0F \u5F53\u524D\u6709 1 \u4E2A\u6D3B\u52A8\u8BA1\u65F6\uFF08\u4EFB\u52A1\u4FE1\u606F\u83B7\u53D6\u5931\u8D25\uFF09"
                            }];
                    case 5: return [3 /*break*/, 7];
                    case 6:
                        error_30 = _d.sent();
                        console.error("[ERROR] \u83B7\u53D6\u5F53\u524D\u8BA1\u65F6\u72B6\u6001\u5931\u8D25:", ((_a = error_30.response) === null || _a === void 0 ? void 0 : _a.data) || error_30.message);
                        return [2 /*return*/, {
                                success: false,
                                error: "\u83B7\u53D6\u5F53\u524D\u8BA1\u65F6\u72B6\u6001\u5931\u8D25: ".concat(((_c = (_b = error_30.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.error) || error_30.message)
                            }];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    // 开发环境快速登录（仅当后端 APP_ENV=development/dev 时有效）
    TaskMCPServer.prototype.devQuickLogin = function (username) {
        return __awaiter(this, void 0, void 0, function () {
            var uname, url, resp, payload, token, error_31, status_2;
            var _a, _b, _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        _e.trys.push([0, 2, , 3]);
                        uname = (username || process.env.DEV_LOGIN_USERNAME || 'admin').trim();
                        console.error("[DEBUG] \u5F00\u53D1\u73AF\u5883\u5FEB\u901F\u767B\u5F55: username=".concat(uname));
                        url = "".concat(this.apiBase, "/auth/dev-quick-login");
                        return [4 /*yield*/, axios_1.default.post(url, { username: uname }, {
                                headers: { 'Content-Type': 'application/json' },
                                proxy: false
                            })];
                    case 1:
                        resp = _e.sent();
                        payload = ((_a = resp.data) === null || _a === void 0 ? void 0 : _a.data) || resp.data || {};
                        token = payload.token;
                        if (!token || typeof token !== 'string') {
                            return [2 /*return*/, { success: false, error: '未从响应中获取到 token。请确认后端处于开发模式(APP_ENV=development)且端点可用。' }];
                        }
                        this.authToken = token;
                        return [2 /*return*/, {
                                success: true,
                                token: token,
                                username: uname,
                                expires_at: payload.expires_at,
                                message: '开发环境快速登录成功，已更新内存中的 Authorization 令牌'
                            }];
                    case 2:
                        error_31 = _e.sent();
                        status_2 = (_b = error_31 === null || error_31 === void 0 ? void 0 : error_31.response) === null || _b === void 0 ? void 0 : _b.status;
                        if (status_2 === 404) {
                            return [2 /*return*/, { success: false, error: '后端未开启开发登录端点（APP_ENV != development）。请在开发环境下重试。' }];
                        }
                        return [2 /*return*/, { success: false, error: "\u5F00\u53D1\u73AF\u5883\u767B\u5F55\u5931\u8D25: ".concat(((_d = (_c = error_31.response) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.error) || error_31.message) }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // ========== 兼容 index.ts 中的扩展工具方法（最小实现以通过构建） ==========
    // 批量创建文档并（可选）自动关联到任务
    TaskMCPServer.prototype.createBatchDocuments = function (documents) {
        return __awaiter(this, void 0, void 0, function () {
            var resp, payload, error_32;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, axios_1.default.post("".concat(this.apiBase, "/documents/batch"), {
                                documents: documents
                            }, {
                                headers: this.getHeaders(),
                                proxy: false
                            })];
                    case 1:
                        resp = _c.sent();
                        payload = resp.data || {};
                        if (typeof payload.success === 'boolean') {
                            return [2 /*return*/, {
                                    success: payload.success,
                                    data: payload.data || payload,
                                    message: payload.message || (payload.success ? '批量文档创建成功' : '批量文档创建失败')
                                }];
                        }
                        return [2 /*return*/, {
                                success: true,
                                data: payload,
                                message: '批量文档创建请求已完成'
                            }];
                    case 2:
                        error_32 = _c.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u6279\u91CF\u6587\u6863\u521B\u5EFA\u5931\u8D25: ".concat(((_b = (_a = error_32.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.error) || error_32.message)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 基于模板生成文档（可选：自动创建到任务）
    TaskMCPServer.prototype.generateDocumentFromTemplate = function (templateType_1, context_1) {
        return __awaiter(this, arguments, void 0, function (templateType, context, autoCreate) {
            var title, taskId, projectId, now, content, error_33;
            if (autoCreate === void 0) { autoCreate = false; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        title = (context === null || context === void 0 ? void 0 : context.title) || "Generated ".concat(templateType, " Document");
                        taskId = context === null || context === void 0 ? void 0 : context.taskId;
                        projectId = (context === null || context === void 0 ? void 0 : context.projectId) || 1;
                        now = new Date().toISOString();
                        content = "# ".concat(title, "\n\n- Template: ").concat(templateType, "\n- Task ID: ").concat(taskId !== null && taskId !== void 0 ? taskId : 'N/A', "\n- Project ID: ").concat(projectId, "\n- Generated at: ").concat(now, "\n\n## Context\n\n").concat((context === null || context === void 0 ? void 0 : context.requirements) || 'No additional context provided.');
                        if (!(autoCreate && taskId)) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.createOrUpdateTaskDocument(taskId, content, projectId)];
                    case 1: 
                    // 直接创建/更新为任务文档
                    return [2 /*return*/, _a.sent()];
                    case 2: return [2 /*return*/, {
                            success: true,
                            data: { title: title, content: content, template: templateType, context: context },
                            message: '模板文档内容已生成'
                        }];
                    case 3:
                        error_33 = _a.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u6A21\u677F\u6587\u6863\u751F\u6210\u5931\u8D25: ".concat(error_33.message)
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    // 自动填充任务上下文到报告模板（最小占位实现）
    TaskMCPServer.prototype.autoFillTaskContext = function (taskIds_1, templateType_1) {
        return __awaiter(this, arguments, void 0, function (taskIds, templateType, includeSubtasks, includeDocuments, includeTimeLogs, dateRange) {
            var summaries, _i, _a, id, task, e_3, error_34;
            if (includeSubtasks === void 0) { includeSubtasks = true; }
            if (includeDocuments === void 0) { includeDocuments = true; }
            if (includeTimeLogs === void 0) { includeTimeLogs = true; }
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 7, , 8]);
                        summaries = [];
                        _i = 0, _a = taskIds || [];
                        _b.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 6];
                        id = _a[_i];
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, this.findTaskById(id)];
                    case 3:
                        task = _b.sent();
                        summaries.push({
                            task_id: id,
                            title: task.title,
                            status: task.status,
                            summary: "Auto-filled ".concat(templateType, " for task ").concat(id)
                        });
                        return [3 /*break*/, 5];
                    case 4:
                        e_3 = _b.sent();
                        summaries.push({ task_id: id, error: e_3.message });
                        return [3 /*break*/, 5];
                    case 5:
                        _i++;
                        return [3 /*break*/, 1];
                    case 6: return [2 /*return*/, {
                            success: true,
                            data: { summaries: summaries },
                            message: '任务上下文自动填充已完成'
                        }];
                    case 7:
                        error_34 = _b.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u81EA\u52A8\u586B\u5145\u4EFB\u52A1\u4E0A\u4E0B\u6587\u5931\u8D25: ".concat(error_34.message)
                            }];
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    // 批量为任务创建技术文档（精简实现）
    TaskMCPServer.prototype.createTaskDocs = function (options) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b, task_ids, _c, template_type, _d, project_id, created, errors, _i, task_ids_1, id, task, content, res, e_4, error_35;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        _e.trys.push([0, 8, , 9]);
                        _a = options || {}, _b = _a.task_ids, task_ids = _b === void 0 ? [] : _b, _c = _a.template_type, template_type = _c === void 0 ? 'technical_design' : _c, _d = _a.project_id, project_id = _d === void 0 ? 1 : _d;
                        created = [];
                        errors = [];
                        _i = 0, task_ids_1 = task_ids;
                        _e.label = 1;
                    case 1:
                        if (!(_i < task_ids_1.length)) return [3 /*break*/, 7];
                        id = task_ids_1[_i];
                        _e.label = 2;
                    case 2:
                        _e.trys.push([2, 5, , 6]);
                        return [4 /*yield*/, this.findTaskById(id)];
                    case 3:
                        task = _e.sent();
                        content = "# ".concat(task.title, " - ").concat(template_type, "\n\nAuto generated at ").concat(new Date().toISOString(), ".");
                        return [4 /*yield*/, this.createOrUpdateTaskDocument(id, content, task.project_id || project_id)];
                    case 4:
                        res = _e.sent();
                        created.push({ task_id: id, success: res.success });
                        return [3 /*break*/, 6];
                    case 5:
                        e_4 = _e.sent();
                        errors.push({ task_id: id, error: e_4.message });
                        return [3 /*break*/, 6];
                    case 6:
                        _i++;
                        return [3 /*break*/, 1];
                    case 7: return [2 /*return*/, {
                            success: errors.length === 0,
                            data: { created: created, errors: errors },
                            message: "\u6279\u91CF\u521B\u5EFA\u5B8C\u6210\uFF1A\u6210\u529F ".concat(created.length, "\uFF0C\u5931\u8D25 ").concat(errors.length)
                        }];
                    case 8:
                        error_35 = _e.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u6279\u91CF\u521B\u5EFA\u4EFB\u52A1\u6587\u6863\u5931\u8D25: ".concat(error_35.message)
                            }];
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    // 📝 工作笔记管理功能
    // 创建工作笔记
    TaskMCPServer.prototype.createWorkNote = function (title_1, content_1) {
        return __awaiter(this, arguments, void 0, function (title, content, options) {
            var requestData, response, error_36;
            var _a, _b;
            if (options === void 0) { options = {}; }
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 2, , 3]);
                        requestData = {
                            title: title,
                            content: content,
                            type: options.type || 'markdown',
                            tags: options.tags || [],
                            visibility: options.visibility || 'private',
                            status: options.status || 'draft',
                            created_by: 'mcp_bridge'
                        };
                        return [4 /*yield*/, axios_1.default.post("".concat(this.apiBase, "/work-notes"), requestData)];
                    case 1:
                        response = _c.sent();
                        return [2 /*return*/, {
                                success: true,
                                id: response.data.id,
                                title: response.data.title,
                                type: response.data.type,
                                status: response.data.status,
                                visibility: response.data.visibility,
                                created_at: response.data.created_at,
                                message: "\u2705 \u5DE5\u4F5C\u7B14\u8BB0 \"".concat(title, "\" \u5DF2\u521B\u5EFA\u6210\u529F (ID: ").concat(response.data.id, ")")
                            }];
                    case 2:
                        error_36 = _c.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u521B\u5EFA\u5DE5\u4F5C\u7B14\u8BB0\u5931\u8D25: ".concat(((_b = (_a = error_36.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || error_36.message)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 列出工作笔记
    TaskMCPServer.prototype.listWorkNotes = function () {
        return __awaiter(this, arguments, void 0, function (options) {
            var params, response, error_37;
            var _a, _b;
            if (options === void 0) { options = {}; }
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 2, , 3]);
                        params = new URLSearchParams();
                        if (options.page)
                            params.append('page', options.page.toString());
                        if (options.limit)
                            params.append('limit', options.limit.toString());
                        if (options.status)
                            params.append('status', options.status);
                        if (options.type)
                            params.append('type', options.type);
                        return [4 /*yield*/, axios_1.default.get("".concat(this.apiBase, "/work-notes?").concat(params.toString()))];
                    case 1:
                        response = _c.sent();
                        return [2 /*return*/, {
                                success: true,
                                data: response.data.data || response.data.items || response.data,
                                total: response.data.total || response.data.length,
                                page: response.data.page || options.page || 1,
                                limit: response.data.limit || options.limit || 10,
                                message: "\uD83D\uDCCB \u5171\u627E\u5230 ".concat(response.data.total || response.data.length || 0, " \u4E2A\u5DE5\u4F5C\u7B14\u8BB0")
                            }];
                    case 2:
                        error_37 = _c.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u83B7\u53D6\u5DE5\u4F5C\u7B14\u8BB0\u5217\u8868\u5931\u8D25: ".concat(((_b = (_a = error_37.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || error_37.message)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 搜索工作笔记
    TaskMCPServer.prototype.searchWorkNotes = function (query_1) {
        return __awaiter(this, arguments, void 0, function (query, options) {
            var params_1, response, error_38;
            var _a, _b;
            if (options === void 0) { options = {}; }
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 2, , 3]);
                        params_1 = new URLSearchParams();
                        params_1.append('q', query);
                        if (options.limit)
                            params_1.append('limit', options.limit.toString());
                        if (options.tags && options.tags.length > 0) {
                            options.tags.forEach(function (tag) { return params_1.append('tags', tag); });
                        }
                        return [4 /*yield*/, axios_1.default.get("".concat(this.apiBase, "/work-notes/search?").concat(params_1.toString()))];
                    case 1:
                        response = _c.sent();
                        return [2 /*return*/, {
                                success: true,
                                data: response.data.data || response.data.items || response.data,
                                total: response.data.total || response.data.length,
                                query: query,
                                message: "\uD83D\uDD0D \u627E\u5230 ".concat(response.data.total || response.data.length || 0, " \u4E2A\u5339\u914D\u7684\u5DE5\u4F5C\u7B14\u8BB0")
                            }];
                    case 2:
                        error_38 = _c.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u641C\u7D22\u5DE5\u4F5C\u7B14\u8BB0\u5931\u8D25: ".concat(((_b = (_a = error_38.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || error_38.message)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 获取工作笔记详情
    TaskMCPServer.prototype.getWorkNote = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_39;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, axios_1.default.get("".concat(this.apiBase, "/work-notes/").concat(id))];
                    case 1:
                        response = _c.sent();
                        return [2 /*return*/, {
                                success: true,
                                data: response.data,
                                id: response.data.id,
                                title: response.data.title,
                                content: response.data.content,
                                type: response.data.type,
                                status: response.data.status,
                                visibility: response.data.visibility,
                                tags: response.data.tags,
                                created_at: response.data.created_at,
                                updated_at: response.data.updated_at,
                                message: "\uD83D\uDCDD \u5DF2\u83B7\u53D6\u5DE5\u4F5C\u7B14\u8BB0 \"".concat(response.data.title, "\"")
                            }];
                    case 2:
                        error_39 = _c.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u83B7\u53D6\u5DE5\u4F5C\u7B14\u8BB0\u5931\u8D25: ".concat(((_b = (_a = error_39.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || error_39.message)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 更新工作笔记
    TaskMCPServer.prototype.updateWorkNote = function (id, updates) {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_40;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, axios_1.default.put("".concat(this.apiBase, "/work-notes/").concat(id), updates)];
                    case 1:
                        response = _c.sent();
                        return [2 /*return*/, {
                                success: true,
                                id: response.data.id,
                                title: response.data.title,
                                updated_fields: Object.keys(updates),
                                updated_at: response.data.updated_at,
                                message: "\u2705 \u5DE5\u4F5C\u7B14\u8BB0 \"".concat(response.data.title, "\" \u5DF2\u66F4\u65B0\u6210\u529F")
                            }];
                    case 2:
                        error_40 = _c.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u66F4\u65B0\u5DE5\u4F5C\u7B14\u8BB0\u5931\u8D25: ".concat(((_b = (_a = error_40.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || error_40.message)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 辅助方法：格式化时长
    TaskMCPServer.prototype.formatDuration = function (seconds) {
        var hours = Math.floor(seconds / 3600);
        var minutes = Math.floor((seconds % 3600) / 60);
        var secs = seconds % 60;
        return "".concat(hours.toString().padStart(2, '0'), ":").concat(minutes.toString().padStart(2, '0'), ":").concat(secs.toString().padStart(2, '0'));
    };
    // 辅助方法：计算当前时长
    TaskMCPServer.prototype.calculateCurrentDuration = function (startedAt) {
        var startTime = new Date(startedAt).getTime();
        var currentTime = new Date().getTime();
        return Math.floor((currentTime - startTime) / 1000);
    };
    // 🚀 核心功能1：智能启动任务并开始计时
    TaskMCPServer.prototype.startTaskWithTimer = function (taskIdOrTitle_1) {
        return __awaiter(this, arguments, void 0, function (taskIdOrTitle, projectId) {
            var taskId, searchResult, getResponse, task, updateData, response, error_41;
            if (projectId === void 0) { projectId = 1; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 5, , 6]);
                        taskId = taskIdOrTitle;
                        if (!(typeof taskIdOrTitle === 'string')) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.findTaskByTitle(taskIdOrTitle, projectId)];
                    case 1:
                        searchResult = _a.sent();
                        if (searchResult.error) {
                            return [2 /*return*/, { error: "\u627E\u4E0D\u5230\u4EFB\u52A1: ".concat(taskIdOrTitle) }];
                        }
                        taskId = searchResult.task.id;
                        _a.label = 2;
                    case 2: return [4 /*yield*/, axios_1.default.get("".concat(this.apiBase, "/tasks/").concat(taskId))];
                    case 3:
                        getResponse = _a.sent();
                        task = getResponse.data;
                        updateData = __assign(__assign({}, task), { status: 'in_progress', started_at: new Date().toISOString(), 
                            // 如果有 work_log 字段，添加工作日志
                            work_log: __spreadArray(__spreadArray([], (task.work_log || []), true), [
                                {
                                    action: 'started',
                                    timestamp: new Date().toISOString(),
                                    source: 'claude_code',
                                    message: '通过 Claude Code 开始执行任务'
                                }
                            ], false) });
                        return [4 /*yield*/, axios_1.default.put("".concat(this.apiBase, "/tasks/").concat(taskId), updateData)];
                    case 4:
                        response = _a.sent();
                        return [2 /*return*/, {
                                id: taskId,
                                title: task.title,
                                status: 'in_progress',
                                started_at: updateData.started_at,
                                message: "\uD83D\uDE80 \u4EFB\u52A1 \"".concat(task.title, "\" \u5DF2\u5F00\u59CB\u6267\u884C\uFF0C\u8BA1\u65F6\u5668\u542F\u52A8\uFF01"),
                                timer_started: true
                            }];
                    case 5:
                        error_41 = _a.sent();
                        return [2 /*return*/, {
                                error: "\u542F\u52A8\u4EFB\u52A1\u5931\u8D25: ".concat(error_41.message)
                            }];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    // 🔄 核心功能2：智能工作切换（核心功能）
    TaskMCPServer.prototype.switchToTask = function (newTaskTitle_1) {
        return __awaiter(this, arguments, void 0, function (newTaskTitle, projectId) {
            var currentTasksResponse, allTasks, currentTask, result, switchMessage, error_42;
            if (projectId === void 0) { projectId = 1; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 5, , 6]);
                        return [4 /*yield*/, axios_1.default.get("".concat(this.apiBase, "/tasks?project_id=").concat(projectId))];
                    case 1:
                        currentTasksResponse = _a.sent();
                        allTasks = currentTasksResponse.data;
                        currentTask = allTasks.find(function (task) { return task.status === 'in_progress'; });
                        if (!currentTask) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.completeTaskWithTimer(currentTask.id)];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3: return [4 /*yield*/, this.startTaskWithTimer(newTaskTitle, projectId)];
                    case 4:
                        result = _a.sent();
                        switchMessage = currentTask
                            ? "\uD83D\uDD04 \u4ECE \"".concat(currentTask.title, "\" \u5207\u6362\u5230 \"").concat(newTaskTitle, "\"")
                            : "\uD83D\uDE80 \u5F00\u59CB\u65B0\u4EFB\u52A1 \"".concat(newTaskTitle, "\"");
                        return [2 /*return*/, __assign(__assign({}, result), { previous_task: currentTask ? currentTask.title : null, message: switchMessage })];
                    case 5:
                        error_42 = _a.sent();
                        return [2 /*return*/, {
                                error: "\u4EFB\u52A1\u5207\u6362\u5931\u8D25: ".concat(error_42.message)
                            }];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    // 📈 核心功能3：生成今日工作报告
    TaskMCPServer.prototype.getDailyWorkReport = function () {
        return __awaiter(this, arguments, void 0, function (projectId) {
            var response, tasks, today_1, todayTasks, totalMinutes_1, taskSummary, totalHours, remainingMinutes, error_43;
            if (projectId === void 0) { projectId = 1; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, axios_1.default.get("".concat(this.apiBase, "/tasks?project_id=").concat(projectId))];
                    case 1:
                        response = _a.sent();
                        tasks = response.data;
                        today_1 = new Date().toISOString().split('T')[0];
                        todayTasks = tasks.filter(function (task) {
                            var taskDate = task.updated_at ? task.updated_at.split('T')[0] : null;
                            return taskDate === today_1;
                        });
                        totalMinutes_1 = 0;
                        taskSummary = todayTasks.map(function (task) {
                            var duration = task.duration_minutes || 0;
                            totalMinutes_1 += duration;
                            return {
                                title: task.title,
                                status: task.status,
                                duration_minutes: duration,
                                duration_display: duration > 0 ? "".concat(Math.floor(duration / 60), "h ").concat(duration % 60, "m") : '未计时'
                            };
                        });
                        totalHours = Math.floor(totalMinutes_1 / 60);
                        remainingMinutes = totalMinutes_1 % 60;
                        return [2 /*return*/, {
                                date: today_1,
                                total_tasks: todayTasks.length,
                                total_time: "".concat(totalHours, "h ").concat(remainingMinutes, "m"),
                                tasks: taskSummary,
                                message: "\uD83D\uDCCA \u4ECA\u65E5\u5DE5\u4F5C\u62A5\u544A\uFF1A".concat(todayTasks.length, "\u4E2A\u4EFB\u52A1\uFF0C\u603B\u8BA1").concat(totalHours, "h ").concat(remainingMinutes, "m")
                            }];
                    case 2:
                        error_43 = _a.sent();
                        return [2 /*return*/, {
                                error: "\u751F\u6210\u5DE5\u4F5C\u62A5\u544A\u5931\u8D25: ".concat(error_43.message)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 辅助方法：根据标题搜索任务
    TaskMCPServer.prototype.findTaskByTitle = function (title_1) {
        return __awaiter(this, arguments, void 0, function (title, projectId) {
            var response, tasks, matchedTask, error_44;
            if (projectId === void 0) { projectId = 1; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, axios_1.default.get("".concat(this.apiBase, "/tasks?project_id=").concat(projectId))];
                    case 1:
                        response = _a.sent();
                        tasks = response.data;
                        matchedTask = tasks.find(function (task) {
                            return task.title.toLowerCase().includes(title.toLowerCase()) ||
                                title.toLowerCase().includes(task.title.toLowerCase());
                        });
                        if (!matchedTask) {
                            return [2 /*return*/, {
                                    error: "\u672A\u627E\u5230\u5305\u542B \"".concat(title, "\" \u7684\u4EFB\u52A1")
                                }];
                        }
                        return [2 /*return*/, {
                                task: matchedTask,
                                message: "\uD83C\uDFAF \u627E\u5230\u5339\u914D\u4EFB\u52A1: \"".concat(matchedTask.title, "\"")
                            }];
                    case 2:
                        error_44 = _a.sent();
                        return [2 /*return*/, {
                                error: "\u641C\u7D22\u4EFB\u52A1\u5931\u8D25: ".concat(error_44.message)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 辅助方法：完成任务并计算耗时
    TaskMCPServer.prototype.completeTaskWithTimer = function (taskId) {
        return __awaiter(this, void 0, void 0, function () {
            var getResponse, task, duration, startTime, endTime, updateData, response, error_45;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, axios_1.default.get("".concat(this.apiBase, "/tasks/").concat(taskId))];
                    case 1:
                        getResponse = _a.sent();
                        task = getResponse.data;
                        duration = null;
                        if (task.started_at) {
                            startTime = new Date(task.started_at);
                            endTime = new Date();
                            duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60)); // 分钟
                        }
                        updateData = __assign(__assign({}, task), { status: 'completed', completed_at: new Date().toISOString(), duration_minutes: duration, work_log: __spreadArray(__spreadArray([], (task.work_log || []), true), [
                                {
                                    action: 'completed',
                                    timestamp: new Date().toISOString(),
                                    source: 'claude_code',
                                    message: "\u4EFB\u52A1\u5B8C\u6210".concat(duration ? "\uFF0C\u8017\u65F6 ".concat(duration, " \u5206\u949F") : ''),
                                    duration_minutes: duration
                                }
                            ], false) });
                        return [4 /*yield*/, axios_1.default.put("".concat(this.apiBase, "/tasks/").concat(taskId), updateData)];
                    case 2:
                        response = _a.sent();
                        return [2 /*return*/, {
                                id: taskId,
                                title: task.title,
                                status: 'completed',
                                duration_minutes: duration,
                                message: "\u2705 \u4EFB\u52A1 \"".concat(task.title, "\" \u5DF2\u5B8C\u6210\uFF01").concat(duration ? " \u8017\u65F6: ".concat(duration, " \u5206\u949F") : ''),
                                timer_stopped: true
                            }];
                    case 3:
                        error_45 = _a.sent();
                        return [2 /*return*/, {
                                error: "\u5B8C\u6210\u4EFB\u52A1\u5931\u8D25: ".concat(error_45.message)
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    return TaskMCPServer;
}());
exports.TaskMCPServer = TaskMCPServer;
