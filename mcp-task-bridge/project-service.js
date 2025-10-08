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
exports.ProjectService = void 0;
var base_client_js_1 = require("./base-client.js");
var ProjectService = /** @class */ (function (_super) {
    __extends(ProjectService, _super);
    function ProjectService() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    // 列出所有项目
    ProjectService.prototype.listProjects = function () {
        return __awaiter(this, void 0, void 0, function () {
            var response, projects, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.makeRequest('GET', '/projects')];
                    case 1:
                        response = _a.sent();
                        if (response.success && response.data) {
                            projects = response.data.data || [];
                            return [2 /*return*/, {
                                    success: true,
                                    data: { projects: projects },
                                    total: response.data.total || projects.length,
                                    message: "\uD83D\uDCC1 \u83B7\u53D6\u5230 ".concat(projects.length, " \u4E2A\u9879\u76EE")
                                }];
                        }
                        else {
                            return [2 /*return*/, {
                                    success: false,
                                    error: response.error || '获取项目列表失败',
                                    data: { projects: [] }
                                }];
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        error_1 = _a.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u83B7\u53D6\u9879\u76EE\u5217\u8868\u5931\u8D25: ".concat(error_1.message || error_1)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 创建新项目
    // @requiresPermission('create_project')
    ProjectService.prototype.createProject = function (name, description) {
        return __awaiter(this, void 0, void 0, function () {
            var projectData, response, error_2;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        if (!name.trim()) {
                            return [2 /*return*/, { success: false, error: '项目名称不能为空' }];
                        }
                        projectData = {
                            name: name.trim(),
                            description: description || "\u901A\u8FC7Claude Code\u521B\u5EFA\uFF1A".concat(name.trim()),
                            status: 'active'
                        };
                        return [4 /*yield*/, this.makeRequest('POST', '/projects', projectData)];
                    case 1:
                        response = _b.sent();
                        if (response.success) {
                            return [2 /*return*/, {
                                    success: true,
                                    data: response.data,
                                    project_id: (_a = response.data) === null || _a === void 0 ? void 0 : _a.id,
                                    project_name: name.trim(),
                                    message: "\u2705 \u9879\u76EE \"".concat(name.trim(), "\" \u521B\u5EFA\u6210\u529F")
                                }];
                        }
                        else {
                            return [2 /*return*/, response];
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        error_2 = _b.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u521B\u5EFA\u9879\u76EE\u5931\u8D25: ".concat(error_2.message || error_2)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 获取项目详情
    ProjectService.prototype.getProject = function (projectId) {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_3;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.makeRequest('GET', "/projects/".concat(projectId))];
                    case 1:
                        response = _b.sent();
                        if (response.success) {
                            return [2 /*return*/, {
                                    success: true,
                                    data: response.data,
                                    project_id: projectId,
                                    message: "\uD83D\uDCC1 \u83B7\u53D6\u9879\u76EE \"".concat((_a = response.data) === null || _a === void 0 ? void 0 : _a.name, "\" \u8BE6\u60C5\u6210\u529F")
                                }];
                        }
                        else {
                            return [2 /*return*/, response];
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        error_3 = _b.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u83B7\u53D6\u9879\u76EE\u8BE6\u60C5\u5931\u8D25: ".concat(error_3.message || error_3)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 更新项目
    // @requiresPermission('update_project')
    ProjectService.prototype.updateProject = function (projectId, updates) {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        if (Object.keys(updates).length === 0) {
                            return [2 /*return*/, { success: false, error: '没有提供要更新的字段' }];
                        }
                        // 验证名称不为空
                        if (updates.name !== undefined && !updates.name.trim()) {
                            return [2 /*return*/, { success: false, error: '项目名称不能为空' }];
                        }
                        return [4 /*yield*/, this.makeRequest('PUT', "/projects/".concat(projectId), updates)];
                    case 1:
                        response = _a.sent();
                        if (response.success) {
                            return [2 /*return*/, {
                                    success: true,
                                    data: response.data,
                                    project_id: projectId,
                                    updated_fields: Object.keys(updates),
                                    message: "\uD83D\uDCDD \u9879\u76EE ".concat(projectId, " \u66F4\u65B0\u6210\u529F")
                                }];
                        }
                        else {
                            return [2 /*return*/, response];
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        error_4 = _a.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u66F4\u65B0\u9879\u76EE\u5931\u8D25: ".concat(error_4.message || error_4)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 删除项目
    // @requiresPermission('delete_project')
    ProjectService.prototype.deleteProject = function (projectId_1) {
        return __awaiter(this, arguments, void 0, function (projectId, force) {
            var projectResponse, projectName, response, error_5;
            var _a;
            if (force === void 0) { force = false; }
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.getProject(projectId)];
                    case 1:
                        projectResponse = _b.sent();
                        projectName = ((_a = projectResponse.data) === null || _a === void 0 ? void 0 : _a.name) || "\u9879\u76EE".concat(projectId);
                        return [4 /*yield*/, this.makeRequest('DELETE', "/projects/".concat(projectId), {
                                force: force
                            })];
                    case 2:
                        response = _b.sent();
                        if (response.success) {
                            return [2 /*return*/, {
                                    success: true,
                                    project_id: projectId,
                                    project_name: projectName,
                                    force_delete: force,
                                    message: "\uD83D\uDDD1\uFE0F \u9879\u76EE \"".concat(projectName, "\" \u5DF2\u5220\u9664").concat(force ? '（强制删除）' : '')
                                }];
                        }
                        else {
                            return [2 /*return*/, response];
                        }
                        return [3 /*break*/, 4];
                    case 3:
                        error_5 = _b.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u5220\u9664\u9879\u76EE\u5931\u8D25: ".concat(error_5.message || error_5)
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    // 归档项目
    // @requiresPermission('update_project')
    ProjectService.prototype.archiveProject = function (projectId) {
        return __awaiter(this, void 0, void 0, function () {
            var error_6;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.updateProject(projectId, { status: 'archived' })];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2:
                        error_6 = _a.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u5F52\u6863\u9879\u76EE\u5931\u8D25: ".concat(error_6.message || error_6)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 激活项目
    // @requiresPermission('update_project')
    ProjectService.prototype.activateProject = function (projectId) {
        return __awaiter(this, void 0, void 0, function () {
            var error_7;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.updateProject(projectId, { status: 'active' })];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2:
                        error_7 = _a.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u6FC0\u6D3B\u9879\u76EE\u5931\u8D25: ".concat(error_7.message || error_7)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 停用项目
    // @requiresPermission('update_project')
    ProjectService.prototype.deactivateProject = function (projectId) {
        return __awaiter(this, void 0, void 0, function () {
            var error_8;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.updateProject(projectId, { status: 'inactive' })];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2:
                        error_8 = _a.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u505C\u7528\u9879\u76EE\u5931\u8D25: ".concat(error_8.message || error_8)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 获取项目统计信息
    ProjectService.prototype.getProjectStats = function (projectId) {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_9;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.makeRequest('GET', "/projects/".concat(projectId, "/stats"))];
                    case 1:
                        response = _a.sent();
                        if (response.success) {
                            return [2 /*return*/, {
                                    success: true,
                                    project_id: projectId,
                                    stats: response.data,
                                    message: "\uD83D\uDCCA \u9879\u76EE ".concat(projectId, " \u7EDF\u8BA1\u4FE1\u606F\u83B7\u53D6\u6210\u529F")
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
                                error: "\u83B7\u53D6\u9879\u76EE\u7EDF\u8BA1\u5931\u8D25: ".concat(error_9.message || error_9)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 搜索项目
    ProjectService.prototype.searchProjects = function (query_1) {
        return __awaiter(this, arguments, void 0, function (query, options) {
            var params, response, projects, error_10;
            var _a, _b;
            if (options === void 0) { options = {}; }
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 2, , 3]);
                        if (!query.trim()) {
                            return [2 /*return*/, { success: false, error: '搜索关键词不能为空' }];
                        }
                        params = __assign({ q: query.trim(), limit: options.limit || 10, offset: options.offset || 0 }, options);
                        return [4 /*yield*/, this.makeRequest('GET', '/projects/search', undefined, params)];
                    case 1:
                        response = _c.sent();
                        if (response.success) {
                            projects = ((_a = response.data) === null || _a === void 0 ? void 0 : _a.projects) || [];
                            return [2 /*return*/, {
                                    success: true,
                                    query: query.trim(),
                                    projects: projects,
                                    total: ((_b = response.data) === null || _b === void 0 ? void 0 : _b.total) || projects.length,
                                    options: options,
                                    message: "\uD83D\uDD0D \u641C\u7D22\u5230 ".concat(projects.length, " \u4E2A\u9879\u76EE")
                                }];
                        }
                        else {
                            return [2 /*return*/, response];
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        error_10 = _c.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u641C\u7D22\u9879\u76EE\u5931\u8D25: ".concat(error_10.message || error_10)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 复制项目
    // @requiresPermission('create_project')
    ProjectService.prototype.duplicateProject = function (projectId_1, newName_1) {
        return __awaiter(this, arguments, void 0, function (projectId, newName, includeTasksAndDocs) {
            var originalResponse, original, name_1, copyResponse, newProjectId, response, error_11;
            var _a;
            if (includeTasksAndDocs === void 0) { includeTasksAndDocs = false; }
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 4, , 5]);
                        return [4 /*yield*/, this.getProject(projectId)];
                    case 1:
                        originalResponse = _b.sent();
                        if (!originalResponse.success || !originalResponse.data) {
                            return [2 /*return*/, { success: false, error: "\u9879\u76EE ".concat(projectId, " \u4E0D\u5B58\u5728") }];
                        }
                        original = originalResponse.data;
                        name_1 = newName || "".concat(original.name, " (\u526F\u672C)");
                        return [4 /*yield*/, this.createProject(name_1, "".concat(original.description || '', " (\u590D\u5236\u81EA\u9879\u76EE ").concat(projectId, ")"))];
                    case 2:
                        copyResponse = _b.sent();
                        if (!copyResponse.success) {
                            return [2 /*return*/, copyResponse];
                        }
                        newProjectId = (_a = copyResponse.data) === null || _a === void 0 ? void 0 : _a.id;
                        if (!includeTasksAndDocs) {
                            return [2 /*return*/, {
                                    success: true,
                                    original_project_id: projectId,
                                    new_project_id: newProjectId,
                                    original_name: original.name,
                                    new_name: name_1,
                                    include_tasks_and_docs: false,
                                    message: "\uD83D\uDCCB \u9879\u76EE \"".concat(original.name, "\" \u5DF2\u590D\u5236\u4E3A \"").concat(name_1, "\" (\u4EC5\u590D\u5236\u9879\u76EE\u4FE1\u606F)")
                                }];
                        }
                        return [4 /*yield*/, this.makeRequest('POST', "/projects/".concat(projectId, "/duplicate"), {
                                new_project_id: newProjectId,
                                include_tasks: includeTasksAndDocs,
                                include_documents: includeTasksAndDocs
                            })];
                    case 3:
                        response = _b.sent();
                        if (response.success) {
                            return [2 /*return*/, {
                                    success: true,
                                    original_project_id: projectId,
                                    new_project_id: newProjectId,
                                    original_name: original.name,
                                    new_name: name_1,
                                    include_tasks_and_docs: includeTasksAndDocs,
                                    copy_stats: response.data,
                                    message: "\uD83D\uDCCB \u9879\u76EE \"".concat(original.name, "\" \u5DF2\u5B8C\u6574\u590D\u5236\u4E3A \"").concat(name_1, "\"")
                                }];
                        }
                        else {
                            return [2 /*return*/, response];
                        }
                        return [3 /*break*/, 5];
                    case 4:
                        error_11 = _b.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u590D\u5236\u9879\u76EE\u5931\u8D25: ".concat(error_11.message || error_11)
                            }];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    // 获取项目成员
    ProjectService.prototype.getProjectMembers = function (projectId) {
        return __awaiter(this, void 0, void 0, function () {
            var response, members, error_12;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.makeRequest('GET', "/projects/".concat(projectId, "/members"))];
                    case 1:
                        response = _b.sent();
                        if (response.success) {
                            members = ((_a = response.data) === null || _a === void 0 ? void 0 : _a.members) || [];
                            return [2 /*return*/, {
                                    success: true,
                                    project_id: projectId,
                                    members: members,
                                    member_count: members.length,
                                    message: "\uD83D\uDC65 \u9879\u76EE ".concat(projectId, " \u6709 ").concat(members.length, " \u4E2A\u6210\u5458")
                                }];
                        }
                        else {
                            return [2 /*return*/, response];
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        error_12 = _b.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u83B7\u53D6\u9879\u76EE\u6210\u5458\u5931\u8D25: ".concat(error_12.message || error_12)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 添加项目成员
    // @requiresPermission('manage_project_members')
    ProjectService.prototype.addProjectMember = function (projectId_1, userId_1) {
        return __awaiter(this, arguments, void 0, function (projectId, userId, role) {
            var response, error_13;
            if (role === void 0) { role = 'member'; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.makeRequest('POST', "/projects/".concat(projectId, "/members"), {
                                user_id: userId,
                                role: role
                            })];
                    case 1:
                        response = _a.sent();
                        if (response.success) {
                            return [2 /*return*/, {
                                    success: true,
                                    project_id: projectId,
                                    user_id: userId,
                                    role: role,
                                    message: "\uD83D\uDC64 \u7528\u6237 ".concat(userId, " \u5DF2\u6DFB\u52A0\u5230\u9879\u76EE ").concat(projectId, "\uFF0C\u89D2\u8272\uFF1A").concat(role)
                                }];
                        }
                        else {
                            return [2 /*return*/, response];
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        error_13 = _a.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u6DFB\u52A0\u9879\u76EE\u6210\u5458\u5931\u8D25: ".concat(error_13.message || error_13)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 移除项目成员
    // @requiresPermission('manage_project_members')
    ProjectService.prototype.removeProjectMember = function (projectId, userId) {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_14;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.makeRequest('DELETE', "/projects/".concat(projectId, "/members/").concat(userId))];
                    case 1:
                        response = _a.sent();
                        if (response.success) {
                            return [2 /*return*/, {
                                    success: true,
                                    project_id: projectId,
                                    user_id: userId,
                                    message: "\uD83D\uDC64 \u7528\u6237 ".concat(userId, " \u5DF2\u4ECE\u9879\u76EE ").concat(projectId, " \u4E2D\u79FB\u9664")
                                }];
                        }
                        else {
                            return [2 /*return*/, response];
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        error_14 = _a.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u79FB\u9664\u9879\u76EE\u6210\u5458\u5931\u8D25: ".concat(error_14.message || error_14)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 更新项目成员角色
    // @requiresPermission('manage_project_members')
    ProjectService.prototype.updateMemberRole = function (projectId, userId, newRole) {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_15;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.makeRequest('PUT', "/projects/".concat(projectId, "/members/").concat(userId), {
                                role: newRole
                            })];
                    case 1:
                        response = _a.sent();
                        if (response.success) {
                            return [2 /*return*/, {
                                    success: true,
                                    project_id: projectId,
                                    user_id: userId,
                                    new_role: newRole,
                                    message: "\uD83D\uDC64 \u7528\u6237 ".concat(userId, " \u5728\u9879\u76EE ").concat(projectId, " \u4E2D\u7684\u89D2\u8272\u5DF2\u66F4\u65B0\u4E3A\uFF1A").concat(newRole)
                                }];
                        }
                        else {
                            return [2 /*return*/, response];
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        error_15 = _a.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u66F4\u65B0\u6210\u5458\u89D2\u8272\u5931\u8D25: ".concat(error_15.message || error_15)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 按状态获取项目
    ProjectService.prototype.getProjectsByStatus = function (status_1) {
        return __awaiter(this, arguments, void 0, function (status, limit, offset) {
            var params, response, projects, error_16;
            var _a, _b;
            if (limit === void 0) { limit = 10; }
            if (offset === void 0) { offset = 0; }
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 2, , 3]);
                        params = {
                            status: status,
                            limit: limit,
                            offset: offset
                        };
                        return [4 /*yield*/, this.makeRequest('GET', '/projects', undefined, params)];
                    case 1:
                        response = _c.sent();
                        if (response.success) {
                            projects = ((_a = response.data) === null || _a === void 0 ? void 0 : _a.data) || [];
                            return [2 /*return*/, {
                                    success: true,
                                    status: status,
                                    projects: projects,
                                    total: ((_b = response.data) === null || _b === void 0 ? void 0 : _b.total) || projects.length,
                                    limit: limit,
                                    offset: offset,
                                    message: "\uD83D\uDCC1 \u83B7\u53D6\u5230 ".concat(projects.length, " \u4E2A\u72B6\u6001\u4E3A \"").concat(status, "\" \u7684\u9879\u76EE")
                                }];
                        }
                        else {
                            return [2 /*return*/, response];
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        error_16 = _c.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u6309\u72B6\u6001\u83B7\u53D6\u9879\u76EE\u5931\u8D25: ".concat(error_16.message || error_16)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return ProjectService;
}(base_client_js_1.BaseClient));
exports.ProjectService = ProjectService;
