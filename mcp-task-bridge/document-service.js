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
exports.DocumentService = void 0;
var base_client_js_1 = require("./base-client.js");
var DocumentService = /** @class */ (function (_super) {
    __extends(DocumentService, _super);
    function DocumentService() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    // 创建或更新任务文档
    // // @requiresPermission('create_document')
    DocumentService.prototype.createOrUpdateTaskDocument = function (taskId_1, content_1) {
        return __awaiter(this, arguments, void 0, function (taskId, content, projectId) {
            var response, error_1;
            if (projectId === void 0) { projectId = 1; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.makeRequest('POST', "/projects/".concat(projectId, "/tasks/").concat(taskId, "/documents"), {
                                content: content,
                                auto_create: true
                            })];
                    case 1:
                        response = _a.sent();
                        if (response.success) {
                            return [2 /*return*/, {
                                    success: true,
                                    task_id: taskId,
                                    project_id: projectId,
                                    content_length: content.length,
                                    message: "\uD83D\uDCC4 \u4EFB\u52A1 ".concat(taskId, " \u7684\u6587\u6863\u5DF2\u521B\u5EFA/\u66F4\u65B0 (").concat(content.length, " \u5B57\u7B26)")
                                }];
                        }
                        else {
                            return [2 /*return*/, response];
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        error_1 = _a.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u521B\u5EFA/\u66F4\u65B0\u4EFB\u52A1\u6587\u6863\u5931\u8D25: ".concat(error_1.message || error_1)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 创建并关联任务文档
    // @requiresPermission('create_document')
    DocumentService.prototype.createAndAttachTaskDocument = function (taskId_1, content_1) {
        return __awaiter(this, arguments, void 0, function (taskId, content, projectId, title) {
            var payload, response, error_2;
            var _a;
            if (projectId === void 0) { projectId = 1; }
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        payload = {
                            taskId: taskId,
                            content: content
                        };
                        if (projectId && projectId !== 1) {
                            payload.projectId = projectId;
                        }
                        if (title) {
                            payload.title = title;
                        }
                        return [4 /*yield*/, this.makeRequest('POST', '/mcp/create-and-attach', payload)];
                    case 1:
                        response = _b.sent();
                        if (response.success) {
                            return [2 /*return*/, {
                                    success: true,
                                    task_id: taskId,
                                    project_id: projectId,
                                    title: title,
                                    document_id: (_a = response.data) === null || _a === void 0 ? void 0 : _a.document_id,
                                    content_length: content.length,
                                    message: "\u2705 \u4EFB\u52A1\u6587\u6863\u5DF2\u521B\u5EFA\u5E76\u5173\u8054\u5230\u4EFB\u52A1 ".concat(taskId).concat(title ? " (\u6807\u9898: ".concat(title, ")") : '')
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
                                error: "\u521B\u5EFA\u5E76\u5173\u8054\u4EFB\u52A1\u6587\u6863\u5931\u8D25: ".concat(error_2.message || error_2)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 创建并关联工作笔记
    // @requiresPermission('create_work_note')
    DocumentService.prototype.createAndAttachWorkNote = function (taskId, content, title) {
        return __awaiter(this, void 0, void 0, function () {
            var payload, response, error_3;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        payload = {
                            taskId: taskId,
                            content: content
                        };
                        if (title) {
                            payload.title = title;
                        }
                        return [4 /*yield*/, this.makeRequest('POST', '/mcp/create-and-attach-work-note', payload)];
                    case 1:
                        response = _b.sent();
                        if (response.success) {
                            return [2 /*return*/, {
                                    success: true,
                                    task_id: taskId,
                                    title: title,
                                    work_note_id: (_a = response.data) === null || _a === void 0 ? void 0 : _a.work_note_id,
                                    content_length: content.length,
                                    message: "\uD83D\uDCDD \u5DE5\u4F5C\u7B14\u8BB0\u5DF2\u521B\u5EFA\u5E76\u5173\u8054\u5230\u4EFB\u52A1 ".concat(taskId).concat(title ? " (\u6807\u9898: ".concat(title, ")") : '')
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
                                error: "\u521B\u5EFA\u5E76\u5173\u8054\u5DE5\u4F5C\u7B14\u8BB0\u5931\u8D25: ".concat(error_3.message || error_3)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 获取任务文档
    DocumentService.prototype.getTaskDocument = function (taskId_1) {
        return __awaiter(this, arguments, void 0, function (taskId, projectId) {
            var response, error_4;
            if (projectId === void 0) { projectId = 1; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.makeRequest('GET', "/projects/".concat(projectId, "/tasks/").concat(taskId, "/documents"))];
                    case 1:
                        response = _a.sent();
                        if (response.success) {
                            return [2 /*return*/, {
                                    success: true,
                                    task_id: taskId,
                                    project_id: projectId,
                                    documents: response.data,
                                    message: "\uD83D\uDCC4 \u83B7\u53D6\u4EFB\u52A1 ".concat(taskId, " \u7684\u6587\u6863\u6210\u529F")
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
                                error: "\u83B7\u53D6\u4EFB\u52A1\u6587\u6863\u5931\u8D25: ".concat(error_4.message || error_4)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 检查任务是否有文档
    DocumentService.prototype.hasTaskDocument = function (taskId_1) {
        return __awaiter(this, arguments, void 0, function (taskId, projectId) {
            var response, error_5;
            var _a, _b;
            if (projectId === void 0) { projectId = 1; }
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.makeRequest('GET', "/projects/".concat(projectId, "/tasks/").concat(taskId, "/documents/has"))];
                    case 1:
                        response = _c.sent();
                        if (response.success) {
                            return [2 /*return*/, {
                                    success: true,
                                    task_id: taskId,
                                    project_id: projectId,
                                    has_document: ((_a = response.data) === null || _a === void 0 ? void 0 : _a.has_document) || response.data || false,
                                    message: (((_b = response.data) === null || _b === void 0 ? void 0 : _b.has_document) || response.data)
                                        ? "\u2705 \u4EFB\u52A1 ".concat(taskId, " \u5DF2\u6709\u5173\u8054\u6587\u6863")
                                        : "\uD83D\uDCC4 \u4EFB\u52A1 ".concat(taskId, " \u6682\u65E0\u5173\u8054\u6587\u6863")
                                }];
                        }
                        else {
                            return [2 /*return*/, response];
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        error_5 = _c.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u68C0\u67E5\u4EFB\u52A1\u6587\u6863\u5931\u8D25: ".concat(error_5.message || error_5)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 删除任务文档
    // @requiresPermission('delete_document')
    DocumentService.prototype.deleteTaskDocument = function (taskId_1) {
        return __awaiter(this, arguments, void 0, function (taskId, projectId) {
            var response, error_6;
            if (projectId === void 0) { projectId = 1; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.makeRequest('DELETE', "/mcp/delete-task-document", undefined, {
                                taskId: taskId,
                                projectId: projectId
                            })];
                    case 1:
                        response = _a.sent();
                        if (response.success) {
                            return [2 /*return*/, {
                                    success: true,
                                    task_id: taskId,
                                    project_id: projectId,
                                    message: "\uD83D\uDDD1\uFE0F \u4EFB\u52A1 ".concat(taskId, " \u7684\u6587\u6863\u5DF2\u5220\u9664")
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
                                error: "\u5220\u9664\u4EFB\u52A1\u6587\u6863\u5931\u8D25: ".concat(error_6.message || error_6)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 批量创建文档
    // @requiresPermission('create_document')
    DocumentService.prototype.createBatchDocuments = function (documents) {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_7;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.makeRequest('POST', '/mcp/create-batch-documents', {
                                documents: documents
                            })];
                    case 1:
                        response = _a.sent();
                        if (response.success) {
                            return [2 /*return*/, {
                                    success: true,
                                    created_count: documents.length,
                                    documents: response.data,
                                    message: "\uD83D\uDCDA \u6279\u91CF\u521B\u5EFA ".concat(documents.length, " \u4E2A\u6587\u6863\u6210\u529F")
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
                                error: "\u6279\u91CF\u521B\u5EFA\u6587\u6863\u5931\u8D25: ".concat(error_7.message || error_7)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 从模板生成文档
    // @requiresPermission('create_document')
    DocumentService.prototype.generateDocumentFromTemplate = function (templateType_1, context_1) {
        return __awaiter(this, arguments, void 0, function (templateType, context, autoCreate) {
            var response, error_8;
            var _a, _b;
            if (autoCreate === void 0) { autoCreate = false; }
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.makeRequest('POST', '/mcp/generate-document-from-template', {
                                templateType: templateType,
                                context: context,
                                autoCreate: autoCreate
                            })];
                    case 1:
                        response = _c.sent();
                        if (response.success) {
                            return [2 /*return*/, {
                                    success: true,
                                    template_type: templateType,
                                    generated_content: (_a = response.data) === null || _a === void 0 ? void 0 : _a.content,
                                    auto_created: autoCreate,
                                    document_id: (_b = response.data) === null || _b === void 0 ? void 0 : _b.document_id,
                                    message: "\uD83D\uDCCB \u4ECE\u6A21\u677F \"".concat(templateType, "\" \u751F\u6210\u6587\u6863\u6210\u529F").concat(autoCreate ? ' 并已创建' : '')
                                }];
                        }
                        else {
                            return [2 /*return*/, response];
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        error_8 = _c.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u4ECE\u6A21\u677F\u751F\u6210\u6587\u6863\u5931\u8D25: ".concat(error_8.message || error_8)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 自动填充任务上下文
    DocumentService.prototype.autoFillTaskContext = function (taskIds_1, templateType_1) {
        return __awaiter(this, arguments, void 0, function (taskIds, templateType, includeSubtasks, includeDocuments, includeTimeLogs, dateRange) {
            var payload, response, error_9;
            var _a, _b;
            if (includeSubtasks === void 0) { includeSubtasks = true; }
            if (includeDocuments === void 0) { includeDocuments = true; }
            if (includeTimeLogs === void 0) { includeTimeLogs = true; }
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 2, , 3]);
                        payload = {
                            taskIds: taskIds,
                            templateType: templateType,
                            includeSubtasks: includeSubtasks,
                            includeDocuments: includeDocuments,
                            includeTimeLogs: includeTimeLogs
                        };
                        if (dateRange) {
                            payload.dateRange = dateRange;
                        }
                        return [4 /*yield*/, this.makeRequest('POST', '/mcp/auto-fill-task-context', payload)];
                    case 1:
                        response = _c.sent();
                        if (response.success) {
                            return [2 /*return*/, {
                                    success: true,
                                    task_ids: taskIds,
                                    template_type: templateType,
                                    filled_content: (_a = response.data) === null || _a === void 0 ? void 0 : _a.content,
                                    context_info: (_b = response.data) === null || _b === void 0 ? void 0 : _b.context_info,
                                    message: "\uD83D\uDCCA \u4E3A ".concat(taskIds.length, " \u4E2A\u4EFB\u52A1\u81EA\u52A8\u586B\u5145\u4E0A\u4E0B\u6587\u6210\u529F")
                                }];
                        }
                        else {
                            return [2 /*return*/, response];
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        error_9 = _c.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u81EA\u52A8\u586B\u5145\u4EFB\u52A1\u4E0A\u4E0B\u6587\u5931\u8D25: ".concat(error_9.message || error_9)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 批量创建任务文档
    // @requiresPermission('create_document')
    DocumentService.prototype.createTaskDocs = function (options) {
        return __awaiter(this, void 0, void 0, function () {
            var defaultOptions, response, error_10;
            var _a, _b, _c, _d, _e;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        _f.trys.push([0, 2, , 3]);
                        defaultOptions = __assign({ template_type: 'auto', auto_attach: true, skip_existing: true, project_id: 1, batch_size: 10 }, options);
                        return [4 /*yield*/, this.makeRequest('POST', '/mcp/create-task-docs', defaultOptions)];
                    case 1:
                        response = _f.sent();
                        if (response.success) {
                            return [2 /*return*/, {
                                    success: true,
                                    processed_tasks: ((_a = response.data) === null || _a === void 0 ? void 0 : _a.processed_tasks) || 0,
                                    created_documents: ((_b = response.data) === null || _b === void 0 ? void 0 : _b.created_documents) || 0,
                                    skipped_tasks: ((_c = response.data) === null || _c === void 0 ? void 0 : _c.skipped_tasks) || 0,
                                    options: defaultOptions,
                                    message: "\uD83D\uDCDA \u6279\u91CF\u521B\u5EFA\u4EFB\u52A1\u6587\u6863\u5B8C\u6210: \u5904\u7406 ".concat(((_d = response.data) === null || _d === void 0 ? void 0 : _d.processed_tasks) || 0, " \u4E2A\u4EFB\u52A1\uFF0C\u521B\u5EFA ").concat(((_e = response.data) === null || _e === void 0 ? void 0 : _e.created_documents) || 0, " \u4E2A\u6587\u6863")
                                }];
                        }
                        else {
                            return [2 /*return*/, response];
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        error_10 = _f.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u6279\u91CF\u521B\u5EFA\u4EFB\u52A1\u6587\u6863\u5931\u8D25: ".concat(error_10.message || error_10)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 获取文档内容（通用方法）
    DocumentService.prototype.getDocument = function (documentId) {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_11;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.makeRequest('GET', "/documents/".concat(documentId))];
                    case 1:
                        response = _a.sent();
                        if (response.success) {
                            return [2 /*return*/, {
                                    success: true,
                                    document_id: documentId,
                                    document: response.data,
                                    message: "\uD83D\uDCC4 \u83B7\u53D6\u6587\u6863 ".concat(documentId, " \u6210\u529F")
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
                                error: "\u83B7\u53D6\u6587\u6863\u5931\u8D25: ".concat(error_11.message || error_11)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 更新文档
    // @requiresPermission('update_document')
    DocumentService.prototype.updateDocument = function (documentId, updates) {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_12;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.makeRequest('PUT', "/documents/".concat(documentId), updates)];
                    case 1:
                        response = _a.sent();
                        if (response.success) {
                            return [2 /*return*/, {
                                    success: true,
                                    document_id: documentId,
                                    updated_fields: Object.keys(updates),
                                    document: response.data,
                                    message: "\uD83D\uDCDD \u6587\u6863 ".concat(documentId, " \u66F4\u65B0\u6210\u529F")
                                }];
                        }
                        else {
                            return [2 /*return*/, response];
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        error_12 = _a.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u66F4\u65B0\u6587\u6863\u5931\u8D25: ".concat(error_12.message || error_12)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 通过任务ID更新任务文档（完全更新）
     * @param taskId 任务ID
     * @param updates 更新内容（通常包含content, title等）
     * @returns Promise<ApiResponse>
     */
    DocumentService.prototype.updateTaskDocument = function (taskId, updates) {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_13;
            var _a, _b, _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        _e.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.makeRequest('PUT', "/mcp/task-document/".concat(taskId), updates)];
                    case 1:
                        response = _e.sent();
                        if (response.success) {
                            return [2 /*return*/, {
                                    success: true,
                                    task_id: taskId,
                                    document_id: (_a = response.data) === null || _a === void 0 ? void 0 : _a.id,
                                    version: (_b = response.data) === null || _b === void 0 ? void 0 : _b.version,
                                    updated_at: (_c = response.data) === null || _c === void 0 ? void 0 : _c.updated_at,
                                    updated_fields: Object.keys(updates),
                                    message: "\u2705 \u4EFB\u52A1 ".concat(taskId, " \u7684\u6587\u6863\u5DF2\u66F4\u65B0 (\u7248\u672C: ").concat((_d = response.data) === null || _d === void 0 ? void 0 : _d.version, ")")
                                }];
                        }
                        else {
                            return [2 /*return*/, response];
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        error_13 = _e.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u66F4\u65B0\u4EFB\u52A1\u6587\u6863\u5931\u8D25: ".concat(error_13.message || error_13)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 通过任务ID部分更新任务文档
     * @param taskId 任务ID
     * @param updates 部分更新内容（只更新指定字段）
     * @returns Promise<ApiResponse>
     */
    DocumentService.prototype.patchTaskDocument = function (taskId, updates) {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_14;
            var _a, _b, _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        _e.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.makeRequest('PATCH', "/mcp/task-document/".concat(taskId), updates)];
                    case 1:
                        response = _e.sent();
                        if (response.success) {
                            return [2 /*return*/, {
                                    success: true,
                                    task_id: taskId,
                                    document_id: (_a = response.data) === null || _a === void 0 ? void 0 : _a.id,
                                    version: (_b = response.data) === null || _b === void 0 ? void 0 : _b.version,
                                    updated_at: (_c = response.data) === null || _c === void 0 ? void 0 : _c.updated_at,
                                    fields_updated: Object.keys(updates),
                                    message: "\u2705 \u4EFB\u52A1 ".concat(taskId, " \u7684\u6587\u6863\u5DF2\u90E8\u5206\u66F4\u65B0 (\u5B57\u6BB5: ").concat(Object.keys(updates).join(', '), ", \u7248\u672C: ").concat((_d = response.data) === null || _d === void 0 ? void 0 : _d.version, ")")
                                }];
                        }
                        else {
                            return [2 /*return*/, response];
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        error_14 = _e.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u90E8\u5206\u66F4\u65B0\u4EFB\u52A1\u6587\u6863\u5931\u8D25: ".concat(error_14.message || error_14)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 删除文档
    // @requiresPermission('delete_document')
    DocumentService.prototype.deleteDocument = function (documentId) {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_15;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.makeRequest('DELETE', "/documents/".concat(documentId))];
                    case 1:
                        response = _a.sent();
                        if (response.success) {
                            return [2 /*return*/, {
                                    success: true,
                                    document_id: documentId,
                                    message: "\uD83D\uDDD1\uFE0F \u6587\u6863 ".concat(documentId, " \u5DF2\u5220\u9664")
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
                                error: "\u5220\u9664\u6587\u6863\u5931\u8D25: ".concat(error_15.message || error_15)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 搜索文档
    DocumentService.prototype.searchDocuments = function (query_1) {
        return __awaiter(this, arguments, void 0, function (query, options) {
            var params, response, documents, error_16;
            var _a, _b;
            if (options === void 0) { options = {}; }
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 2, , 3]);
                        params = __assign({ q: query, limit: options.limit || 10, offset: options.offset || 0 }, options);
                        return [4 /*yield*/, this.makeRequest('GET', '/documents/search', undefined, params)];
                    case 1:
                        response = _c.sent();
                        if (response.success) {
                            documents = ((_a = response.data) === null || _a === void 0 ? void 0 : _a.documents) || [];
                            return [2 /*return*/, {
                                    success: true,
                                    query: query,
                                    documents: documents,
                                    total: ((_b = response.data) === null || _b === void 0 ? void 0 : _b.total) || documents.length,
                                    options: options,
                                    message: "\uD83D\uDD0D \u641C\u7D22\u5230 ".concat(documents.length, " \u4E2A\u6587\u6863")
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
                                error: "\u641C\u7D22\u6587\u6863\u5931\u8D25: ".concat(error_16.message || error_16)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return DocumentService;
}(base_client_js_1.BaseClient));
exports.DocumentService = DocumentService;
