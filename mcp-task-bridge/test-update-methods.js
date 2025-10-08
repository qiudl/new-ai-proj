#!/usr/bin/env node
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
var task_mcp_js_1 = require("./task-mcp.js");
function testUpdateMethods() {
    return __awaiter(this, void 0, void 0, function () {
        var mcp, token, taskResult, taskId, createResult, getResult1, doc1, updateResult, getResult2, doc2, patchResult, getResult3, doc3, error_1;
        var _a, _b, _c, _d, _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    mcp = new task_mcp_js_1.TaskMCPServer('http://localhost:8080/api/v1');
                    token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwidXNlcl90eXBlIjoic3lzdGVtIiwic3ViIjoiYWRtaW4iLCJleHAiOjE3NTk5MzM5MDcsIm5iZiI6MTc1OTg0NzUwNywiaWF0IjoxNzU5ODQ3NTA3LCJqdGkiOiI4ZDE1NWE1YmMwNTU0MTRhMzBlODk2ZDk4ZDczYTA4NCJ9.USuFzaGXtynsVE5P8wS1RMhemL8GDTsWbYdweX5a5PI';
                    mcp.setAuthToken(token);
                    console.log('=== MCP工具更新方法测试 ===\n');
                    _f.label = 1;
                case 1:
                    _f.trys.push([1, 10, , 11]);
                    // 1. 创建测试任务
                    console.log('1️⃣  创建测试任务...');
                    return [4 /*yield*/, mcp.createTask('MCP更新方法测试任务', 1)];
                case 2:
                    taskResult = _f.sent();
                    taskId = (_a = taskResult.data) === null || _a === void 0 ? void 0 : _a.id;
                    console.log("   \u2705 \u4EFB\u52A1\u521B\u5EFA\u6210\u529F\uFF0CID: ".concat(taskId, "\n"));
                    // 2. 创建初始文档
                    console.log('2️⃣  创建初始文档...');
                    return [4 /*yield*/, mcp.createAndAttachTaskDocument(taskId, '## 初始内容\\n\\n这是版本1的文档', 1, 'MCP测试文档')];
                case 3:
                    createResult = _f.sent();
                    console.log("   \u2705 ".concat(createResult.message, "\n"));
                    // 3. 读取初始文档
                    console.log('3️⃣  读取初始文档...');
                    return [4 /*yield*/, mcp.getTaskDocument(taskId)];
                case 4:
                    getResult1 = _f.sent();
                    doc1 = (_b = getResult1.documents) === null || _b === void 0 ? void 0 : _b[0];
                    console.log("   \uD83D\uDCC4 \u7248\u672C: ".concat(doc1.version));
                    console.log("   \uD83D\uDCC4 \u5185\u5BB9\u6458\u8981: ".concat(doc1.content.substring(0, 30), "...\n"));
                    // 4. 测试updateTaskDocument (PUT)
                    console.log('4️⃣  测试 updateTaskDocument (PUT更新)...');
                    return [4 /*yield*/, mcp.updateTaskDocument(taskId, {
                            content: '## 更新后的内容\\n\\n这是版本2，使用PUT方法更新。\\n\\n### 新增功能\\n- 功能A\\n- 功能B'
                        })];
                case 5:
                    updateResult = _f.sent();
                    console.log("   ".concat(updateResult.message));
                    console.log("   \uD83D\uDCCC \u7248\u672C\u53F7: ".concat(updateResult.version));
                    console.log("   \uD83D\uDCCC \u66F4\u65B0\u65F6\u95F4: ".concat(updateResult.updated_at, "\n"));
                    // 5. 验证PUT更新
                    console.log('5️⃣  验证PUT更新...');
                    return [4 /*yield*/, mcp.getTaskDocument(taskId)];
                case 6:
                    getResult2 = _f.sent();
                    doc2 = (_c = getResult2.documents) === null || _c === void 0 ? void 0 : _c[0];
                    console.log("   \uD83D\uDCC4 \u5F53\u524D\u7248\u672C: ".concat(doc2.version));
                    console.log("   \uD83D\uDCC4 \u5185\u5BB9\u6458\u8981: ".concat(doc2.content.substring(0, 40), "...\n"));
                    // 6. 测试patchTaskDocument (PATCH)
                    console.log('6️⃣  测试 patchTaskDocument (PATCH部分更新)...');
                    return [4 /*yield*/, mcp.patchTaskDocument(taskId, {
                            title: '【已更新V3】MCP测试文档'
                        })];
                case 7:
                    patchResult = _f.sent();
                    console.log("   ".concat(patchResult.message));
                    console.log("   \uD83D\uDCCC \u7248\u672C\u53F7: ".concat(patchResult.version));
                    console.log("   \uD83D\uDCCC \u66F4\u65B0\u5B57\u6BB5: ".concat((_d = patchResult.fields_updated) === null || _d === void 0 ? void 0 : _d.join(', '), "\n"));
                    // 7. 最终验证
                    console.log('7️⃣  最终验证...');
                    return [4 /*yield*/, mcp.getTaskDocument(taskId)];
                case 8:
                    getResult3 = _f.sent();
                    doc3 = (_e = getResult3.documents) === null || _e === void 0 ? void 0 : _e[0];
                    console.log("   \uD83D\uDCC4 \u6700\u7EC8\u7248\u672C: ".concat(doc3.version));
                    console.log("   \uD83D\uDCC4 \u6700\u7EC8\u6807\u9898: ".concat(doc3.title, "\n"));
                    // 8. 测试结果总结
                    console.log('=== 📊 测试结果总结 ===');
                    if (doc1.version === 1 && doc2.version === 2 && doc3.version === 3) {
                        console.log('✅ 所有测试通过！');
                        console.log("   \u2705 \u521D\u59CB\u7248\u672C: ".concat(doc1.version));
                        console.log("   \u2705 PUT\u66F4\u65B0\u540E: ".concat(doc2.version));
                        console.log("   \u2705 PATCH\u66F4\u65B0\u540E: ".concat(doc3.version));
                    }
                    else {
                        console.log('❌ 测试失败！');
                        console.log("   \u7248\u672C1: ".concat(doc1.version, " (\u671F\u671B:1)"));
                        console.log("   \u7248\u672C2: ".concat(doc2.version, " (\u671F\u671B:2)"));
                        console.log("   \u7248\u672C3: ".concat(doc3.version, " (\u671F\u671B:3)"));
                    }
                    // 清理测试数据
                    console.log('\n🧹 清理测试数据...');
                    return [4 /*yield*/, mcp.deleteTask(taskId, false)];
                case 9:
                    _f.sent();
                    console.log('✅ 测试任务已删除\n');
                    return [3 /*break*/, 11];
                case 10:
                    error_1 = _f.sent();
                    console.error('❌ 测试过程中出错:', error_1.message || error_1);
                    console.error(error_1);
                    return [3 /*break*/, 11];
                case 11: return [2 /*return*/];
            }
        });
    });
}
// 运行测试
testUpdateMethods().catch(console.error);
