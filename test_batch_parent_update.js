#!/usr/bin/env node
/**
 * 测试脚本：批量更改父任务功能
 * 用途：验证问题1和问题2的修复效果
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 批量更改父任务功能测试');
console.log('================================');

// 问题1：检查TaskTreeNode是否显示任务ID
console.log('\n📋 问题1检查: 任务ID显示');

const taskTreeNodePath = '/Users/johnqiu/coding/www/projects/new-ai-proj/frontend/src/components/TaskTreeNode.tsx';
const taskTreeNodeContent = fs.readFileSync(taskTreeNodePath, 'utf8');

// 检查是否添加了任务ID显示
const hasTaskIdElement = taskTreeNodeContent.includes('task-id') && taskTreeNodeContent.includes('#{task.id}');
const hasTaskIdStyles = taskTreeNodeContent.includes('.task-id {');

console.log(`✅ TaskTreeNode组件:`);
console.log(`  - 任务ID元素: ${hasTaskIdElement ? '✓ 已添加' : '✗ 未添加'}`);
console.log(`  - 任务ID样式: ${hasTaskIdStyles ? '✓ 已添加' : '✗ 未添加'}`);

// 问题2：检查后端批量更新处理器
console.log('\n🔧 问题2检查: 批量更新API修复');

const bulkHandlerPath = '/Users/johnqiu/coding/www/projects/new-ai-proj/backend/handlers/bulk_operation_handlers.go';
const bulkHandlerContent = fs.readFileSync(bulkHandlerPath, 'utf8');

const hasBulkUpdateTasks = bulkHandlerContent.includes('func (h *BulkOperationHandler) BulkUpdateTasks');
const hasParentIdHandling = bulkHandlerContent.includes('req.ParentID') && 
                          bulkHandlerContent.includes('taskToUpdate.ParentID');
const hasValidation = bulkHandlerContent.includes('Parent task not found') && bulkHandlerContent.includes('cannot be its own parent');

console.log(`✅ 后端批量更新处理器:`);
console.log(`  - BulkUpdateTasks方法: ${hasBulkUpdateTasks ? '✓ 已添加' : '✗ 未添加'}`);
console.log(`  - ParentID处理: ${hasParentIdHandling ? '✓ 已实现' : '✗ 未实现'}`);
console.log(`  - 父任务验证: ${hasValidation ? '✓ 已实现' : '✗ 未实现'}`);

// 检查处理器映射
const handlersPath = '/Users/johnqiu/coding/www/projects/new-ai-proj/backend/application/handlers.go';
const handlersContent = fs.readFileSync(handlersPath, 'utf8');

const correctMapping = handlersContent.includes('BatchUpdateTasksHandler() gin.HandlerFunc { return app.handlers.BulkOperationHandler.BulkUpdateTasks }');

console.log(`  - 处理器映射: ${correctMapping ? '✓ 已修正' : '✗ 未修正'}`);

// 检查前端错误日志
const taskManagerPath = '/Users/johnqiu/coding/www/projects/new-ai-proj/frontend/src/components/EnhancedProjectTaskManager.tsx';
const taskManagerContent = fs.readFileSync(taskManagerPath, 'utf8');

const hasDetailedLogging = taskManagerContent.includes('[DEBUG] 批量更改父任务开始') && 
                          taskManagerContent.includes('[DEBUG] 批量更改父任务错误详情');

console.log(`  - 前端错误日志: ${hasDetailedLogging ? '✓ 已增强' : '✗ 未增强'}`);

// 检查TaskService错误日志
const taskServicePath = '/Users/johnqiu/coding/www/projects/new-ai-proj/frontend/src/services/taskService.ts';
const taskServiceContent = fs.readFileSync(taskServicePath, 'utf8');

const hasServiceLogging = taskServiceContent.includes('[DEBUG] batchUpdateTasks 开始') && 
                         taskServiceContent.includes('[DEBUG] batchUpdateTasks 错误');

console.log(`  - 服务层错误日志: ${hasServiceLogging ? '✓ 已增强' : '✗ 未增强'}`);

// 总结
console.log('\n📊 修复状态总结');
console.log('================');

const problem1Fixed = hasTaskIdElement && hasTaskIdStyles;
const problem2Fixed = hasBulkUpdateTasks && hasParentIdHandling && hasValidation && correctMapping;

console.log(`问题1 - 任务ID显示: ${problem1Fixed ? '✅ 已修复' : '❌ 需要修复'}`);
console.log(`问题2 - 批量更新API: ${problem2Fixed ? '✅ 已修复' : '❌ 需要修复'}`);

if (problem1Fixed && problem2Fixed) {
  console.log('\n🎉 所有问题已修复！请重启应用并测试功能。');
  console.log('\n📝 测试步骤:');
  console.log('1. 重启前端和后端应用');  
  console.log('2. 进入任务管理界面');
  console.log('3. 选择多个任务，点击批量操作');
  console.log('4. 验证弹窗中是否显示任务ID');
  console.log('5. 选择父任务并保存，验证操作是否成功');
} else {
  console.log('\n⚠️ 还有问题需要解决，请检查上述未修复的项目。');
}

console.log('\n🔧 下一步优化建议:');
console.log('- 添加批量操作的撤销功能');
console.log('- 改进父任务选择的用户体验');  
console.log('- 添加批量操作的进度指示器');
console.log('- 实现批量操作的预览功能');
