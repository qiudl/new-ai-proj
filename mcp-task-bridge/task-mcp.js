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
exports.TaskMCPServer = void 0;
var task_service_js_1 = require("./task-service.js");
var document_service_js_1 = require("./document-service.js");
var work_note_service_js_1 = require("./work-note-service.js");
var timer_service_js_1 = require("./timer-service.js");
var project_service_js_1 = require("./project-service.js");
var daily_focus_service_js_1 = require("./daily-focus-service.js");
/**
 * 统一的MCP任务服务器类
 * 整合了任务管理、文档管理、工作笔记、计时器、项目管理和Daily Focus Tasks功能
 */
var TaskMCPServer = /** @class */ (function () {
    function TaskMCPServer(apiBase) {
        if (apiBase === void 0) { apiBase = 'http://localhost:8080/api/v1'; }
        // 初始化各个服务
        this.taskService = new task_service_js_1.TaskService(apiBase);
        this.documentService = new document_service_js_1.DocumentService(apiBase);
        this.workNoteService = new work_note_service_js_1.WorkNoteService(apiBase);
        this.timerService = new timer_service_js_1.TimerService(apiBase);
        this.projectService = new project_service_js_1.ProjectService(apiBase);
        this.dailyFocusService = new daily_focus_service_js_1.DailyFocusService(apiBase);
    }
    // ===========================================
    // 任务管理相关方法
    // ===========================================
    TaskMCPServer.prototype.findTaskById = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.taskService.findTaskById(id)];
            });
        });
    };
    TaskMCPServer.prototype.createTask = function (title_1) {
        return __awaiter(this, arguments, void 0, function (title, projectId, options) {
            if (projectId === void 0) { projectId = 1; }
            if (options === void 0) { options = {}; }
            return __generator(this, function (_a) {
                return [2 /*return*/, this.taskService.createTask(title, projectId, options)];
            });
        });
    };
    TaskMCPServer.prototype.startTask = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.taskService.startTask(id)];
            });
        });
    };
    TaskMCPServer.prototype.completeTask = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.taskService.completeTask(id)];
            });
        });
    };
    TaskMCPServer.prototype.pauseTask = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.taskService.pauseTask(id)];
            });
        });
    };
    TaskMCPServer.prototype.updateTaskTitle = function (id, newTitle) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.taskService.updateTaskTitle(id, newTitle)];
            });
        });
    };
    TaskMCPServer.prototype.updateTaskDescription = function (id, newDescription) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.taskService.updateTaskDescription(id, newDescription)];
            });
        });
    };
    TaskMCPServer.prototype.listTasks = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.taskService.listTasks(params)];
            });
        });
    };
    TaskMCPServer.prototype.createSubTask = function (parentId, taskData) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.taskService.createSubTask(parentId, taskData)];
            });
        });
    };
    TaskMCPServer.prototype.createSiblingTask = function (siblingId_1, title_1) {
        return __awaiter(this, arguments, void 0, function (siblingId, title, options) {
            if (options === void 0) { options = {}; }
            return __generator(this, function (_a) {
                return [2 /*return*/, this.taskService.createSiblingTask(siblingId, title, options)];
            });
        });
    };
    TaskMCPServer.prototype.findTaskByName = function (titlePattern) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.taskService.findTaskByName(titlePattern)];
            });
        });
    };
    TaskMCPServer.prototype.findTask = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.taskService.findTask(params)];
            });
        });
    };
    TaskMCPServer.prototype.deleteTask = function (id_1) {
        return __awaiter(this, arguments, void 0, function (id, force) {
            if (force === void 0) { force = false; }
            return __generator(this, function (_a) {
                return [2 /*return*/, this.taskService.deleteTask(id, force)];
            });
        });
    };
    TaskMCPServer.prototype.updateTask = function (id, updates) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.taskService.updateTask(id, updates)];
            });
        });
    };
    TaskMCPServer.prototype.moveTask = function (id, targetProjectId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.taskService.moveTask(id, targetProjectId)];
            });
        });
    };
    TaskMCPServer.prototype.getTaskChildren = function (parentId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.taskService.getTaskChildren(parentId)];
            });
        });
    };
    TaskMCPServer.prototype.getDetailedTaskInfo = function (taskId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.taskService.getDetailedTaskInfo(taskId)];
            });
        });
    };
    TaskMCPServer.prototype.getTaskTimeline = function (taskId_1) {
        return __awaiter(this, arguments, void 0, function (taskId, projectId, limit, offset) {
            if (projectId === void 0) { projectId = 1; }
            if (limit === void 0) { limit = 20; }
            if (offset === void 0) { offset = 0; }
            return __generator(this, function (_a) {
                return [2 /*return*/, this.taskService.getTaskTimeline(taskId, projectId, limit, offset)];
            });
        });
    };
    // ===========================================
    // 文档管理相关方法
    // ===========================================
    TaskMCPServer.prototype.createOrUpdateTaskDocument = function (taskId_1, content_1) {
        return __awaiter(this, arguments, void 0, function (taskId, content, projectId) {
            if (projectId === void 0) { projectId = 1; }
            return __generator(this, function (_a) {
                return [2 /*return*/, this.documentService.createOrUpdateTaskDocument(taskId, content, projectId)];
            });
        });
    };
    TaskMCPServer.prototype.createAndAttachTaskDocument = function (taskId_1, content_1) {
        return __awaiter(this, arguments, void 0, function (taskId, content, projectId, title) {
            if (projectId === void 0) { projectId = 1; }
            return __generator(this, function (_a) {
                return [2 /*return*/, this.documentService.createAndAttachTaskDocument(taskId, content, projectId, title)];
            });
        });
    };
    TaskMCPServer.prototype.createAndAttachWorkNote = function (taskId, content, title) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.documentService.createAndAttachWorkNote(taskId, content, title)];
            });
        });
    };
    TaskMCPServer.prototype.getTaskDocument = function (taskId_1) {
        return __awaiter(this, arguments, void 0, function (taskId, projectId) {
            if (projectId === void 0) { projectId = 1; }
            return __generator(this, function (_a) {
                return [2 /*return*/, this.documentService.getTaskDocument(taskId, projectId)];
            });
        });
    };
    TaskMCPServer.prototype.hasTaskDocument = function (taskId_1) {
        return __awaiter(this, arguments, void 0, function (taskId, projectId) {
            if (projectId === void 0) { projectId = 1; }
            return __generator(this, function (_a) {
                return [2 /*return*/, this.documentService.hasTaskDocument(taskId, projectId)];
            });
        });
    };
    TaskMCPServer.prototype.deleteTaskDocument = function (taskId_1) {
        return __awaiter(this, arguments, void 0, function (taskId, projectId) {
            if (projectId === void 0) { projectId = 1; }
            return __generator(this, function (_a) {
                return [2 /*return*/, this.documentService.deleteTaskDocument(taskId, projectId)];
            });
        });
    };
    /**
     * 更新任务文档（完全更新）
     * @param taskId 任务ID
     * @param updates 更新内容（如content, title等）
     */
    TaskMCPServer.prototype.updateTaskDocument = function (taskId, updates) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.documentService.updateTaskDocument(taskId, updates)];
            });
        });
    };
    /**
     * 部分更新任务文档
     * @param taskId 任务ID
     * @param updates 部分更新内容
     */
    TaskMCPServer.prototype.patchTaskDocument = function (taskId, updates) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.documentService.patchTaskDocument(taskId, updates)];
            });
        });
    };
    TaskMCPServer.prototype.createBatchDocuments = function (documents) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.documentService.createBatchDocuments(documents)];
            });
        });
    };
    TaskMCPServer.prototype.generateDocumentFromTemplate = function (templateType_1, context_1) {
        return __awaiter(this, arguments, void 0, function (templateType, context, autoCreate) {
            if (autoCreate === void 0) { autoCreate = false; }
            return __generator(this, function (_a) {
                return [2 /*return*/, this.documentService.generateDocumentFromTemplate(templateType, context, autoCreate)];
            });
        });
    };
    TaskMCPServer.prototype.autoFillTaskContext = function (taskIds_1, templateType_1) {
        return __awaiter(this, arguments, void 0, function (taskIds, templateType, includeSubtasks, includeDocuments, includeTimeLogs, dateRange) {
            if (includeSubtasks === void 0) { includeSubtasks = true; }
            if (includeDocuments === void 0) { includeDocuments = true; }
            if (includeTimeLogs === void 0) { includeTimeLogs = true; }
            return __generator(this, function (_a) {
                return [2 /*return*/, this.documentService.autoFillTaskContext(taskIds, templateType, includeSubtasks, includeDocuments, includeTimeLogs, dateRange)];
            });
        });
    };
    TaskMCPServer.prototype.createTaskDocs = function (options) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.documentService.createTaskDocs(options)];
            });
        });
    };
    // ===========================================
    // 工作笔记相关方法
    // ===========================================
    TaskMCPServer.prototype.createWorkNote = function (title_1, content_1) {
        return __awaiter(this, arguments, void 0, function (title, content, options) {
            if (options === void 0) { options = {}; }
            return __generator(this, function (_a) {
                return [2 /*return*/, this.workNoteService.createWorkNote(title, content, options)];
            });
        });
    };
    TaskMCPServer.prototype.listWorkNotes = function () {
        return __awaiter(this, arguments, void 0, function (options) {
            if (options === void 0) { options = {}; }
            return __generator(this, function (_a) {
                return [2 /*return*/, this.workNoteService.listWorkNotes(options)];
            });
        });
    };
    TaskMCPServer.prototype.searchWorkNotes = function (query_1) {
        return __awaiter(this, arguments, void 0, function (query, options) {
            if (options === void 0) { options = {}; }
            return __generator(this, function (_a) {
                return [2 /*return*/, this.workNoteService.searchWorkNotes(query, options)];
            });
        });
    };
    TaskMCPServer.prototype.getWorkNote = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.workNoteService.getWorkNote(id)];
            });
        });
    };
    TaskMCPServer.prototype.updateWorkNote = function (id, updates) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.workNoteService.updateWorkNote(id, updates)];
            });
        });
    };
    TaskMCPServer.prototype.deleteWorkNote = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.workNoteService.deleteWorkNote(id)];
            });
        });
    };
    // ===========================================
    // Daily Focus Tasks相关方法
    // ===========================================
    TaskMCPServer.prototype.getDailyFocusTasks = function () {
        return __awaiter(this, arguments, void 0, function (params) {
            if (params === void 0) { params = {}; }
            return __generator(this, function (_a) {
                return [2 /*return*/, this.dailyFocusService.getDailyFocusTasks(params)];
            });
        });
    };
    TaskMCPServer.prototype.addDailyFocusTask = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.dailyFocusService.addDailyFocusTask(params)];
            });
        });
    };
    TaskMCPServer.prototype.updateDailyFocusTask = function (id, updates) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.dailyFocusService.updateDailyFocusTask(id, updates)];
            });
        });
    };
    TaskMCPServer.prototype.removeDailyFocusTask = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.dailyFocusService.removeDailyFocusTask(id)];
            });
        });
    };
    TaskMCPServer.prototype.completeDailyFocusTask = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.dailyFocusService.completeDailyFocusTask(id)];
            });
        });
    };
    TaskMCPServer.prototype.reorderDailyFocusTasks = function (reorderItems) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.dailyFocusService.reorderDailyFocusTasks(reorderItems)];
            });
        });
    };
    TaskMCPServer.prototype.getDailyFocusStats = function () {
        return __awaiter(this, arguments, void 0, function (params) {
            if (params === void 0) { params = {}; }
            return __generator(this, function (_a) {
                return [2 /*return*/, this.dailyFocusService.getDailyFocusStats(params)];
            });
        });
    };
    TaskMCPServer.prototype.getTaskRecommendations = function () {
        return __awaiter(this, arguments, void 0, function (params) {
            if (params === void 0) { params = {}; }
            return __generator(this, function (_a) {
                return [2 /*return*/, this.dailyFocusService.getTaskRecommendations(params)];
            });
        });
    };
    TaskMCPServer.prototype.acceptTaskRecommendations = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.dailyFocusService.acceptTaskRecommendations(params)];
            });
        });
    };
    TaskMCPServer.prototype.batchAddDailyFocusTasks = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.dailyFocusService.batchAddDailyFocusTasks(params)];
            });
        });
    };
    TaskMCPServer.prototype.clearCompletedTasks = function () {
        return __awaiter(this, arguments, void 0, function (params) {
            if (params === void 0) { params = {}; }
            return __generator(this, function (_a) {
                return [2 /*return*/, this.dailyFocusService.clearCompletedTasks(params)];
            });
        });
    };
    TaskMCPServer.prototype.carryOverTasks = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.dailyFocusService.carryOverTasks(params)];
            });
        });
    };
    TaskMCPServer.prototype.getDailyFocusHistory = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.dailyFocusService.getDailyFocusHistory(params)];
            });
        });
    };
    TaskMCPServer.prototype.quickAddCurrentTask = function () {
        return __awaiter(this, arguments, void 0, function (params) {
            if (params === void 0) { params = {}; }
            return __generator(this, function (_a) {
                return [2 /*return*/, this.dailyFocusService.quickAddCurrentTask(params)];
            });
        });
    };
    TaskMCPServer.prototype.focusTaskWithTimer = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.dailyFocusService.focusTaskWithTimer(params)];
            });
        });
    };
    // ===========================================
    // 计时器相关方法
    // ===========================================
    TaskMCPServer.prototype.startTimer = function (taskId, description) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.timerService.startTimer(taskId, description)];
            });
        });
    };
    TaskMCPServer.prototype.stopTimer = function (taskId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.timerService.stopTimer(taskId)];
            });
        });
    };
    TaskMCPServer.prototype.getCurrentTimer = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.timerService.getCurrentTimer()];
            });
        });
    };
    TaskMCPServer.prototype.getDailyWorkReport = function () {
        return __awaiter(this, arguments, void 0, function (projectId) {
            if (projectId === void 0) { projectId = 1; }
            return __generator(this, function (_a) {
                return [2 /*return*/, this.timerService.getDailyWorkReport(projectId)];
            });
        });
    };
    // ===========================================
    // 项目管理相关方法
    // ===========================================
    TaskMCPServer.prototype.listProjects = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.projectService.listProjects()];
            });
        });
    };
    TaskMCPServer.prototype.createProject = function (name, description) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.projectService.createProject(name, description)];
            });
        });
    };
    TaskMCPServer.prototype.getProject = function (projectId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.projectService.getProject(projectId)];
            });
        });
    };
    TaskMCPServer.prototype.updateProject = function (projectId, updates) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.projectService.updateProject(projectId, updates)];
            });
        });
    };
    TaskMCPServer.prototype.deleteProject = function (projectId_1) {
        return __awaiter(this, arguments, void 0, function (projectId, force) {
            if (force === void 0) { force = false; }
            return __generator(this, function (_a) {
                return [2 /*return*/, this.projectService.deleteProject(projectId, force)];
            });
        });
    };
    // ===========================================
    // 开发环境相关方法
    // ===========================================
    TaskMCPServer.prototype.devQuickLogin = function (username) {
        return __awaiter(this, void 0, void 0, function () {
            var result, token, error_1;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.taskService.devQuickLogin(username || 'admin')];
                    case 1:
                        result = _c.sent();
                        if (result.success && result.token) {
                            token = result.token;
                            this.setAuthToken(token);
                            console.error('[AUTH] Dev quick login: token set in all services via unified context');
                            // 保留完整的响应数据（包括tokenState）
                            return [2 /*return*/, {
                                    success: true,
                                    data: result.data, // 保留完整的context和tokenState
                                    token: token,
                                    username: ((_b = (_a = result.data) === null || _a === void 0 ? void 0 : _a.context) === null || _b === void 0 ? void 0 : _b.username) || username || 'admin',
                                    message: '开发环境快速登录成功，已通过统一上下文更新 Authorization 令牌'
                                }];
                        }
                        else {
                            return [2 /*return*/, result];
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        error_1 = _c.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u5F00\u53D1\u73AF\u5883\u767B\u5F55\u5931\u8D25: ".concat(error_1.message || error_1)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // ===========================================
    // 便利方法和实用功能
    // ===========================================
    // 设置认证令牌（同步到所有服务）
    TaskMCPServer.prototype.setAuthToken = function (token) {
        this.taskService.setAuthToken(token);
        this.documentService.setAuthToken(token);
        this.workNoteService.setAuthToken(token);
        this.timerService.setAuthToken(token);
        this.projectService.setAuthToken(token);
        this.dailyFocusService.setAuthToken(token);
    };
    // Token监控方法（委托给taskService）
    TaskMCPServer.prototype.getTokenRefreshStats = function () {
        return this.taskService.getTokenRefreshStats();
    };
    TaskMCPServer.prototype.checkTokenHealth = function () {
        return this.taskService.checkTokenHealth();
    };
    TaskMCPServer.prototype.getRecentTokenEvents = function (limit) {
        if (limit === void 0) { limit = 10; }
        return this.taskService.getRecentTokenEvents(limit);
    };
    // 设置API基础URL（同步到所有服务）
    TaskMCPServer.prototype.setApiBase = function (apiBase) {
        this.taskService.setApiBase(apiBase);
        this.documentService.setApiBase(apiBase);
        this.workNoteService.setApiBase(apiBase);
        this.timerService.setApiBase(apiBase);
        this.projectService.setApiBase(apiBase);
        this.dailyFocusService.setApiBase(apiBase);
    };
    // 获取权限管理器（从任务服务）
    TaskMCPServer.prototype.getPermissionManager = function () {
        return this.taskService.getPermissionManager();
    };
    // 获取各个服务实例（用于高级操作）
    TaskMCPServer.prototype.getTaskService = function () {
        return this.taskService;
    };
    TaskMCPServer.prototype.getDocumentService = function () {
        return this.documentService;
    };
    TaskMCPServer.prototype.getWorkNoteService = function () {
        return this.workNoteService;
    };
    TaskMCPServer.prototype.getTimerService = function () {
        return this.timerService;
    };
    TaskMCPServer.prototype.getProjectService = function () {
        return this.projectService;
    };
    TaskMCPServer.prototype.getDailyFocusService = function () {
        return this.dailyFocusService;
    };
    // 新增：列出所有活跃计时器
    TaskMCPServer.prototype.getActiveTimers = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.timerService.getActiveTimers()];
            });
        });
    };
    // 批量操作：启动任务并开始计时
    TaskMCPServer.prototype.startTaskWithTimer = function (taskId, timerDescription) {
        return __awaiter(this, void 0, void 0, function () {
            var startResult, timerResult, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.startTask(taskId)];
                    case 1:
                        startResult = _a.sent();
                        if (!startResult.success) {
                            return [2 /*return*/, startResult];
                        }
                        return [4 /*yield*/, this.startTimer(taskId, timerDescription)];
                    case 2:
                        timerResult = _a.sent();
                        if (!timerResult.success) {
                            return [2 /*return*/, timerResult];
                        }
                        return [2 /*return*/, {
                                success: true,
                                task_id: taskId,
                                task_result: startResult,
                                timer_result: timerResult,
                                message: "\uD83D\uDE80 \u4EFB\u52A1 ".concat(taskId, " \u5DF2\u542F\u52A8\u5E76\u5F00\u59CB\u8BA1\u65F6")
                            }];
                    case 3:
                        error_2 = _a.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u542F\u52A8\u4EFB\u52A1\u548C\u8BA1\u65F6\u5931\u8D25: ".concat(error_2.message || error_2)
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    // 批量操作：完成任务并停止计时
    TaskMCPServer.prototype.completeTaskAndStopTimer = function (taskId) {
        return __awaiter(this, void 0, void 0, function () {
            var timerResult, completeResult, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.stopTimer(taskId)];
                    case 1:
                        timerResult = _a.sent();
                        return [4 /*yield*/, this.completeTask(taskId)];
                    case 2:
                        completeResult = _a.sent();
                        if (!completeResult.success) {
                            return [2 /*return*/, completeResult];
                        }
                        return [2 /*return*/, {
                                success: true,
                                task_id: taskId,
                                complete_result: completeResult,
                                timer_result: timerResult,
                                message: "\uD83C\uDF89 \u4EFB\u52A1 ".concat(taskId, " \u5DF2\u5B8C\u6210\u5E76\u505C\u6B62\u8BA1\u65F6")
                            }];
                    case 3:
                        error_3 = _a.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u5B8C\u6210\u4EFB\u52A1\u548C\u505C\u6B62\u8BA1\u65F6\u5931\u8D25: ".concat(error_3.message || error_3)
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    // 智能切换任务：完成当前进行中的任务，切换到新任务（不存在则创建）
    /**
     * 智能任务匹配评分
     * @param task 任务对象
     * @param searchTitle 搜索标题
     * @param dailyFocusTaskIds Daily Focus任务ID集合
     * @returns 评分 (0-100)
     */
    TaskMCPServer.prototype.calculateTaskScore = function (task, searchTitle, dailyFocusTaskIds) {
        var score = 0;
        var title = (task.title || '').toLowerCase();
        var search = searchTitle.toLowerCase();
        // 1. 标题匹配度 (0-40分)
        if (title === search) {
            score += 40; // 完全匹配
        }
        else if (title.includes(search)) {
            score += 30; // 包含关键词
        }
        else {
            // 模糊匹配：计算相似度
            var similarity = this.calculateStringSimilarity(title, search);
            score += Math.floor(similarity * 25); // 最多25分
        }
        // 2. 任务状态 (0-25分)
        var statusScores = {
            'todo': 25,
            'in_progress': 20,
            'planning': 15,
            'draft': 10,
            'on_hold': 5,
            'blocked': 3,
            'suspended': 2,
            'completed': 0,
            'cancelled': 0,
            'archived': 0
        };
        score += statusScores[task.status] || 0;
        // 3. 优先级 (0-15分)
        var priorityScores = {
            'high': 15,
            'medium': 10,
            'low': 5
        };
        score += priorityScores[task.priority] || 5;
        // 4. 最近更新 (0-10分) - 最近7天内更新的加分
        if (task.updated_at) {
            try {
                var updatedTime = new Date(task.updated_at).getTime();
                var now = Date.now();
                var daysDiff = (now - updatedTime) / (1000 * 60 * 60 * 24);
                if (daysDiff <= 1)
                    score += 10; // 1天内
                else if (daysDiff <= 3)
                    score += 7; // 3天内
                else if (daysDiff <= 7)
                    score += 4; // 7天内
                else if (daysDiff <= 30)
                    score += 2; // 30天内
            }
            catch (_a) { }
        }
        // 5. Daily Focus任务 (0-10分)
        if (dailyFocusTaskIds.has(task.id)) {
            score += 10;
        }
        return score;
    };
    /**
     * 计算字符串相似度 (简单的编辑距离算法)
     */
    TaskMCPServer.prototype.calculateStringSimilarity = function (str1, str2) {
        var len1 = str1.length;
        var len2 = str2.length;
        if (len1 === 0)
            return len2 === 0 ? 1 : 0;
        if (len2 === 0)
            return 0;
        var matrix = Array(len1 + 1).fill(null).map(function () { return Array(len2 + 1).fill(0); });
        for (var i = 0; i <= len1; i++)
            matrix[i][0] = i;
        for (var j = 0; j <= len2; j++)
            matrix[0][j] = j;
        for (var i = 1; i <= len1; i++) {
            for (var j = 1; j <= len2; j++) {
                var cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[i][j] = Math.min(matrix[i - 1][j] + 1, // 删除
                matrix[i][j - 1] + 1, // 插入
                matrix[i - 1][j - 1] + cost // 替换
                );
            }
        }
        var maxLen = Math.max(len1, len2);
        return 1 - matrix[len1][len2] / maxLen;
    };
    /**
     * 智能切换任务（多维度匹配）
     */
    TaskMCPServer.prototype.switchToTask = function (newTaskTitle_1) {
        return __awaiter(this, arguments, void 0, function (newTaskTitle, projectId) {
            var inProgress, _i, _a, t, _b, dailyFocusTaskIds_1, dailyFocus, _c, found, candidates, targetTask, scoredTasks, created, started, error_4;
            var _this = this;
            var _d, _e, _f, _g, _h, _j, _k;
            if (projectId === void 0) { projectId = 1; }
            return __generator(this, function (_l) {
                switch (_l.label) {
                    case 0:
                        _l.trys.push([0, 16, , 17]);
                        return [4 /*yield*/, this.listTasks({ status: ['in_progress'], projectId: projectId })];
                    case 1:
                        inProgress = _l.sent();
                        if (!(inProgress.success && ((_e = (_d = inProgress.data) === null || _d === void 0 ? void 0 : _d.tasks) === null || _e === void 0 ? void 0 : _e.length))) return [3 /*break*/, 7];
                        _i = 0, _a = inProgress.data.tasks;
                        _l.label = 2;
                    case 2:
                        if (!(_i < _a.length)) return [3 /*break*/, 7];
                        t = _a[_i];
                        _l.label = 3;
                    case 3:
                        _l.trys.push([3, 5, , 6]);
                        return [4 /*yield*/, this.completeTask(t.id)];
                    case 4:
                        _l.sent();
                        return [3 /*break*/, 6];
                    case 5:
                        _b = _l.sent();
                        return [3 /*break*/, 6];
                    case 6:
                        _i++;
                        return [3 /*break*/, 2];
                    case 7:
                        dailyFocusTaskIds_1 = new Set();
                        _l.label = 8;
                    case 8:
                        _l.trys.push([8, 10, , 11]);
                        return [4 /*yield*/, this.dailyFocusService.getDailyFocusTasks({})];
                    case 9:
                        dailyFocus = _l.sent();
                        if (dailyFocus.success && ((_f = dailyFocus.data) === null || _f === void 0 ? void 0 : _f.focus_tasks)) {
                            dailyFocusTaskIds_1 = new Set(dailyFocus.data.focus_tasks
                                .filter(function (ft) { return ft.status === 'active'; })
                                .map(function (ft) { return ft.task_id; }));
                        }
                        return [3 /*break*/, 11];
                    case 10:
                        _c = _l.sent();
                        return [3 /*break*/, 11];
                    case 11: return [4 /*yield*/, this.findTaskByName(newTaskTitle)];
                    case 12:
                        found = _l.sent();
                        candidates = [];
                        if (found.success && ((_h = (_g = found.data) === null || _g === void 0 ? void 0 : _g.tasks) === null || _h === void 0 ? void 0 : _h.length)) {
                            candidates = found.data.tasks;
                        }
                        else if (found.success && ((_j = found.tasks) === null || _j === void 0 ? void 0 : _j.length)) {
                            candidates = found.tasks;
                        }
                        targetTask = null;
                        if (candidates.length > 0) {
                            scoredTasks = candidates.map(function (task) { return ({
                                task: task,
                                score: _this.calculateTaskScore(task, newTaskTitle, dailyFocusTaskIds_1)
                            }); });
                            // 按分数降序排序
                            scoredTasks.sort(function (a, b) { return b.score - a.score; });
                            // 选择得分最高的任务
                            targetTask = scoredTasks[0].task;
                            console.error("[\u667A\u80FD\u5339\u914D] \u627E\u5230 ".concat(candidates.length, " \u4E2A\u5019\u9009\u4EFB\u52A1\uFF0C\u8BC4\u5206\u7ED3\u679C\uFF1A"));
                            scoredTasks.slice(0, 5).forEach(function (st, idx) {
                                console.error("  ".concat(idx + 1, ". [").concat(st.score, "\u5206] ").concat(st.task.title, " (\u72B6\u6001:").concat(st.task.status, ", \u4F18\u5148\u7EA7:").concat(st.task.priority, ")"));
                            });
                            console.error("[\u667A\u80FD\u5339\u914D] \u9009\u62E9\u6700\u4F73\u5339\u914D\uFF1A".concat(targetTask.title, " (").concat(scoredTasks[0].score, "\u5206)"));
                        }
                        if (!!targetTask) return [3 /*break*/, 14];
                        console.error("[\u667A\u80FD\u5339\u914D] \u672A\u627E\u5230\u5339\u914D\u4EFB\u52A1\uFF0C\u521B\u5EFA\u65B0\u4EFB\u52A1: ".concat(newTaskTitle));
                        return [4 /*yield*/, this.createTask(newTaskTitle, projectId)];
                    case 13:
                        created = _l.sent();
                        if (!created.success || !((_k = created.data) === null || _k === void 0 ? void 0 : _k.id)) {
                            return [2 /*return*/, created];
                        }
                        targetTask = { id: created.data.id, title: newTaskTitle };
                        _l.label = 14;
                    case 14: return [4 /*yield*/, this.startTask(targetTask.id)];
                    case 15:
                        started = _l.sent();
                        // 增强返回信息
                        if (started.success) {
                            return [2 /*return*/, __assign(__assign({}, started), { matched_task: {
                                        id: targetTask.id,
                                        title: targetTask.title,
                                        status: targetTask.status,
                                        priority: targetTask.priority
                                    }, match_type: candidates.length > 0 ? 'intelligent_match' : 'created_new', candidates_count: candidates.length })];
                        }
                        return [2 /*return*/, started];
                    case 16:
                        error_4 = _l.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u5207\u6362\u4EFB\u52A1\u5931\u8D25: ".concat(error_4.message || error_4)
                            }];
                    case 17: return [2 /*return*/];
                }
            });
        });
    };
    // 健康检查
    TaskMCPServer.prototype.healthCheck = function () {
        return __awaiter(this, void 0, void 0, function () {
            var results, projectsResult, e_1, allHealthy, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 5, , 6]);
                        results = {
                            task_service: false,
                            document_service: false,
                            work_note_service: false,
                            timer_service: false,
                            project_service: false,
                            daily_focus_service: false
                        };
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.listProjects()];
                    case 2:
                        projectsResult = _a.sent();
                        results.project_service = projectsResult.success;
                        return [3 /*break*/, 4];
                    case 3:
                        e_1 = _a.sent();
                        results.project_service = false;
                        return [3 /*break*/, 4];
                    case 4:
                        allHealthy = Object.values(results).every(Boolean);
                        return [2 /*return*/, {
                                success: allHealthy,
                                health_status: results,
                                all_services_healthy: allHealthy,
                                message: allHealthy ? '✅ 所有服务运行正常' : '⚠️ 部分服务存在问题'
                            }];
                    case 5:
                        error_5 = _a.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u5065\u5EB7\u68C0\u67E5\u5931\u8D25: ".concat(error_5.message || error_5)
                            }];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    return TaskMCPServer;
}());
exports.TaskMCPServer = TaskMCPServer;
// 导出默认实例
exports.default = TaskMCPServer;
