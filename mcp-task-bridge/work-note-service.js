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
exports.WorkNoteService = void 0;
var base_client_js_1 = require("./base-client.js");
var WorkNoteService = /** @class */ (function (_super) {
    __extends(WorkNoteService, _super);
    function WorkNoteService() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    // 创建工作笔记
    // @requiresPermission('create_work_note')
    WorkNoteService.prototype.createWorkNote = function (title_1, content_1) {
        return __awaiter(this, arguments, void 0, function (title, content, options) {
            var workNoteData, response, error_1;
            if (options === void 0) { options = {}; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        workNoteData = {
                            title: title,
                            content: content,
                            type: options.type || 'markdown',
                            status: options.status || 'draft',
                            visibility: options.visibility || 'private',
                            tags: options.tags || []
                        };
                        return [4 /*yield*/, this.makeRequest('POST', '/mcp/create-work-note', workNoteData)];
                    case 1:
                        response = _a.sent();
                        if (response.success) {
                            return [2 /*return*/, {
                                    success: true,
                                    work_note: response.data,
                                    title: title,
                                    content_length: content.length,
                                    message: "\uD83D\uDCDD \u5DE5\u4F5C\u7B14\u8BB0 \"".concat(title, "\" \u521B\u5EFA\u6210\u529F")
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
                                error: "\u521B\u5EFA\u5DE5\u4F5C\u7B14\u8BB0\u5931\u8D25: ".concat(error_1.message || error_1)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 列出工作笔记
    WorkNoteService.prototype.listWorkNotes = function () {
        return __awaiter(this, arguments, void 0, function (options) {
            var params, response, workNotes, error_2;
            var _a, _b, _c, _d, _e, _f, _g, _h;
            if (options === void 0) { options = {}; }
            return __generator(this, function (_j) {
                switch (_j.label) {
                    case 0:
                        _j.trys.push([0, 2, , 3]);
                        params = __assign({ limit: options.limit || 10, page: options.page || 1 }, options);
                        return [4 /*yield*/, this.makeRequest('GET', '/mcp/list-work-notes', undefined, params)];
                    case 1:
                        response = _j.sent();
                        // 调试信息
                        console.error('[DEBUG] listWorkNotes raw response:', JSON.stringify(response, null, 2));
                        console.error('[DEBUG] listWorkNotes response structure:', JSON.stringify({
                            success: response.success,
                            hasData: !!response.data,
                            dataKeys: response.data ? Object.keys(response.data) : 'no data',
                            dataType: typeof response.data,
                            notesExists: ((_a = response.data) === null || _a === void 0 ? void 0 : _a.notes) !== undefined,
                            notesType: typeof ((_b = response.data) === null || _b === void 0 ? void 0 : _b.notes),
                            notesLength: ((_d = (_c = response.data) === null || _c === void 0 ? void 0 : _c.notes) === null || _d === void 0 ? void 0 : _d.length) || 0,
                            total: ((_e = response.data) === null || _e === void 0 ? void 0 : _e.total) || 0
                        }, null, 2));
                        if (response.success) {
                            workNotes = ((_f = response.data) === null || _f === void 0 ? void 0 : _f.notes) || [];
                            console.error('[DEBUG] Extracted workNotes:', {
                                length: workNotes.length,
                                total: (_g = response.data) === null || _g === void 0 ? void 0 : _g.total,
                                firstNote: workNotes.length > 0 ? workNotes[0].title : 'no notes',
                                rawWorkNotes: workNotes.slice(0, 2) // Show first 2 items for debugging
                            });
                            return [2 /*return*/, {
                                    success: true,
                                    work_notes: workNotes,
                                    total: ((_h = response.data) === null || _h === void 0 ? void 0 : _h.total) || workNotes.length,
                                    page: params.page,
                                    limit: params.limit,
                                    message: "\uD83D\uDCCB \u83B7\u53D6\u5230 ".concat(workNotes.length, " \u4E2A\u5DE5\u4F5C\u7B14\u8BB0")
                                }];
                        }
                        else {
                            return [2 /*return*/, response];
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        error_2 = _j.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u83B7\u53D6\u5DE5\u4F5C\u7B14\u8BB0\u5217\u8868\u5931\u8D25: ".concat(error_2.message || error_2)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 搜索工作笔记
    WorkNoteService.prototype.searchWorkNotes = function (query_1) {
        return __awaiter(this, arguments, void 0, function (query, options) {
            var params, response, workNotes, error_3;
            if (options === void 0) { options = {}; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        if (!query.trim()) {
                            return [2 /*return*/, { success: false, error: '搜索关键词不能为空' }];
                        }
                        params = {
                            query: query.trim(),
                            limit: options.limit || 10,
                            tags: options.tags || []
                        };
                        return [4 /*yield*/, this.makeRequest('POST', '/mcp/search-work-notes', params)];
                    case 1:
                        response = _a.sent();
                        if (response.success) {
                            workNotes = response.data || [];
                            return [2 /*return*/, {
                                    success: true,
                                    query: query.trim(),
                                    work_notes: workNotes,
                                    total: workNotes.length,
                                    message: "\uD83D\uDD0D \u641C\u7D22\u5230 ".concat(workNotes.length, " \u4E2A\u5339\u914D\u7684\u5DE5\u4F5C\u7B14\u8BB0")
                                }];
                        }
                        else {
                            return [2 /*return*/, response];
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        error_3 = _a.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u641C\u7D22\u5DE5\u4F5C\u7B14\u8BB0\u5931\u8D25: ".concat(error_3.message || error_3)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 获取工作笔记详情
    WorkNoteService.prototype.getWorkNote = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_4;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.makeRequest('GET', "/mcp/get-work-note/".concat(id))];
                    case 1:
                        response = _b.sent();
                        if (response.success) {
                            return [2 /*return*/, {
                                    success: true,
                                    work_note_id: id,
                                    work_note: response.data,
                                    message: "\uD83D\uDCDD \u83B7\u53D6\u5DE5\u4F5C\u7B14\u8BB0 \"".concat((_a = response.data) === null || _a === void 0 ? void 0 : _a.title, "\" \u6210\u529F")
                                }];
                        }
                        else {
                            return [2 /*return*/, response];
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        error_4 = _b.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u83B7\u53D6\u5DE5\u4F5C\u7B14\u8BB0\u5931\u8D25: ".concat(error_4.message || error_4)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 更新工作笔记
    // @requiresPermission('update_work_note')
    WorkNoteService.prototype.updateWorkNote = function (id, updates) {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.makeRequest('PUT', "/mcp/update-work-note/".concat(id), { updates: updates })];
                    case 1:
                        response = _a.sent();
                        if (response.success) {
                            return [2 /*return*/, {
                                    success: true,
                                    work_note_id: id,
                                    updated_fields: Object.keys(updates),
                                    work_note: response.data,
                                    message: "\uD83D\uDCDD \u5DE5\u4F5C\u7B14\u8BB0 ".concat(id, " \u66F4\u65B0\u6210\u529F")
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
                                error: "\u66F4\u65B0\u5DE5\u4F5C\u7B14\u8BB0\u5931\u8D25: ".concat(error_5.message || error_5)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 删除工作笔记
    // @requiresPermission('delete_work_note')
    WorkNoteService.prototype.deleteWorkNote = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_6;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.makeRequest('DELETE', "/mcp/delete-work-note/".concat(id))];
                    case 1:
                        response = _a.sent();
                        if (response.success) {
                            return [2 /*return*/, {
                                    success: true,
                                    work_note_id: id,
                                    message: "\uD83D\uDDD1\uFE0F \u5DE5\u4F5C\u7B14\u8BB0 ".concat(id, " \u5DF2\u5220\u9664")
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
                                error: "\u5220\u9664\u5DE5\u4F5C\u7B14\u8BB0\u5931\u8D25: ".concat(error_6.message || error_6)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 发布工作笔记
    // @requiresPermission('update_work_note')
    WorkNoteService.prototype.publishWorkNote = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var error_7;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.updateWorkNote(id, { status: 'published' })];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2:
                        error_7 = _a.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u53D1\u5E03\u5DE5\u4F5C\u7B14\u8BB0\u5931\u8D25: ".concat(error_7.message || error_7)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 归档工作笔记
    // @requiresPermission('update_work_note')
    WorkNoteService.prototype.archiveWorkNote = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var error_8;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.updateWorkNote(id, { status: 'archived' })];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2:
                        error_8 = _a.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u5F52\u6863\u5DE5\u4F5C\u7B14\u8BB0\u5931\u8D25: ".concat(error_8.message || error_8)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 按标签获取工作笔记
    WorkNoteService.prototype.getWorkNotesByTags = function (tags_1) {
        return __awaiter(this, arguments, void 0, function (tags, options) {
            var params, response, workNotes, error_9;
            var _a, _b;
            if (options === void 0) { options = {}; }
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 2, , 3]);
                        if (!tags || tags.length === 0) {
                            return [2 /*return*/, { success: false, error: '标签列表不能为空' }];
                        }
                        params = {
                            tags: tags,
                            limit: options.limit || 10,
                            page: options.page || 1
                        };
                        return [4 /*yield*/, this.makeRequest('GET', '/mcp/work-notes-by-tags', undefined, params)];
                    case 1:
                        response = _c.sent();
                        if (response.success) {
                            workNotes = ((_a = response.data) === null || _a === void 0 ? void 0 : _a.notes) || [];
                            return [2 /*return*/, {
                                    success: true,
                                    tags: tags,
                                    work_notes: workNotes,
                                    total: ((_b = response.data) === null || _b === void 0 ? void 0 : _b.total) || workNotes.length,
                                    message: "\uD83C\uDFF7\uFE0F \u6309\u6807\u7B7E\u83B7\u53D6\u5230 ".concat(workNotes.length, " \u4E2A\u5DE5\u4F5C\u7B14\u8BB0")
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
                                error: "\u6309\u6807\u7B7E\u83B7\u53D6\u5DE5\u4F5C\u7B14\u8BB0\u5931\u8D25: ".concat(error_9.message || error_9)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 复制工作笔记
    // @requiresPermission('create_work_note')
    WorkNoteService.prototype.duplicateWorkNote = function (id, newTitle) {
        return __awaiter(this, void 0, void 0, function () {
            var originalResponse, original, title, copyResponse, error_10;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.getWorkNote(id)];
                    case 1:
                        originalResponse = _b.sent();
                        if (!originalResponse.success || !originalResponse.work_note) {
                            return [2 /*return*/, { success: false, error: "\u5DE5\u4F5C\u7B14\u8BB0 ".concat(id, " \u4E0D\u5B58\u5728") }];
                        }
                        original = originalResponse.work_note;
                        title = newTitle || "".concat(original.title, " (\u526F\u672C)");
                        return [4 /*yield*/, this.createWorkNote(title, original.content, {
                                type: original.type,
                                status: 'draft', // 副本默认为草稿状态
                                visibility: original.visibility,
                                tags: __spreadArray([], (original.tags || []), true)
                            })];
                    case 2:
                        copyResponse = _b.sent();
                        if (copyResponse.success) {
                            return [2 /*return*/, {
                                    success: true,
                                    original_id: id,
                                    copied_id: (_a = copyResponse.work_note) === null || _a === void 0 ? void 0 : _a.id,
                                    original_title: original.title,
                                    copied_title: title,
                                    message: "\uD83D\uDCCB \u5DE5\u4F5C\u7B14\u8BB0 \"".concat(original.title, "\" \u5DF2\u590D\u5236\u4E3A \"").concat(title, "\"")
                                }];
                        }
                        else {
                            return [2 /*return*/, copyResponse];
                        }
                        return [3 /*break*/, 4];
                    case 3:
                        error_10 = _b.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u590D\u5236\u5DE5\u4F5C\u7B14\u8BB0\u5931\u8D25: ".concat(error_10.message || error_10)
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    // 批量更新工作笔记标签
    // @requiresPermission('update_work_note')
    WorkNoteService.prototype.batchUpdateTags = function (workNoteIds, tags) {
        return __awaiter(this, void 0, void 0, function () {
            var results, successCount, errorCount, _i, workNoteIds_1, id, result, error_11, error_12;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 7, , 8]);
                        if (!workNoteIds || workNoteIds.length === 0) {
                            return [2 /*return*/, { success: false, error: '工作笔记ID列表不能为空' }];
                        }
                        results = [];
                        successCount = 0;
                        errorCount = 0;
                        _i = 0, workNoteIds_1 = workNoteIds;
                        _a.label = 1;
                    case 1:
                        if (!(_i < workNoteIds_1.length)) return [3 /*break*/, 6];
                        id = workNoteIds_1[_i];
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, this.updateWorkNote(id, { tags: tags })];
                    case 3:
                        result = _a.sent();
                        results.push({ id: id, success: result.success, result: result });
                        if (result.success)
                            successCount++;
                        else
                            errorCount++;
                        return [3 /*break*/, 5];
                    case 4:
                        error_11 = _a.sent();
                        results.push({ id: id, success: false, error: error_11.message });
                        errorCount++;
                        return [3 /*break*/, 5];
                    case 5:
                        _i++;
                        return [3 /*break*/, 1];
                    case 6: return [2 /*return*/, {
                            success: errorCount === 0,
                            total_processed: workNoteIds.length,
                            success_count: successCount,
                            error_count: errorCount,
                            results: results,
                            tags: tags,
                            message: "\uD83C\uDFF7\uFE0F \u6279\u91CF\u66F4\u65B0\u6807\u7B7E\u5B8C\u6210: \u6210\u529F ".concat(successCount, " \u4E2A\uFF0C\u5931\u8D25 ").concat(errorCount, " \u4E2A")
                        }];
                    case 7:
                        error_12 = _a.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u6279\u91CF\u66F4\u65B0\u6807\u7B7E\u5931\u8D25: ".concat(error_12.message || error_12)
                            }];
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    // 获取工作笔记统计信息
    WorkNoteService.prototype.getWorkNoteStats = function () {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_13;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.makeRequest('GET', '/mcp/work-note-stats')];
                    case 1:
                        response = _a.sent();
                        if (response.success) {
                            return [2 /*return*/, {
                                    success: true,
                                    stats: response.data,
                                    message: "\uD83D\uDCCA \u5DE5\u4F5C\u7B14\u8BB0\u7EDF\u8BA1\u4FE1\u606F\u83B7\u53D6\u6210\u529F"
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
                                error: "\u83B7\u53D6\u5DE5\u4F5C\u7B14\u8BB0\u7EDF\u8BA1\u5931\u8D25: ".concat(error_13.message || error_13)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 导出工作笔记
    WorkNoteService.prototype.exportWorkNote = function (id_1) {
        return __awaiter(this, arguments, void 0, function (id, format) {
            var response, error_14;
            var _a, _b;
            if (format === void 0) { format = 'markdown'; }
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.makeRequest('GET', "/mcp/export-work-note/".concat(id), undefined, { format: format })];
                    case 1:
                        response = _c.sent();
                        if (response.success) {
                            return [2 /*return*/, {
                                    success: true,
                                    work_note_id: id,
                                    format: format,
                                    exported_content: (_a = response.data) === null || _a === void 0 ? void 0 : _a.content,
                                    file_name: (_b = response.data) === null || _b === void 0 ? void 0 : _b.file_name,
                                    message: "\uD83D\uDCE4 \u5DE5\u4F5C\u7B14\u8BB0 ".concat(id, " \u5DF2\u5BFC\u51FA\u4E3A ").concat(format.toUpperCase(), " \u683C\u5F0F")
                                }];
                        }
                        else {
                            return [2 /*return*/, response];
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        error_14 = _c.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "\u5BFC\u51FA\u5DE5\u4F5C\u7B14\u8BB0\u5931\u8D25: ".concat(error_14.message || error_14)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return WorkNoteService;
}(base_client_js_1.BaseClient));
exports.WorkNoteService = WorkNoteService;
