#!/usr/bin/env node

/**
 * 统一权限上下文测试脚本
 * 测试MCP服务器和后端API的权限上下文统一性
 */

import { TaskMCPServer } from './dist/task-mcp.js';
import { getGlobalContextManager } from './dist/unified-user-context.js';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:8080/api/v1';

async function testUnifiedPermissionContext() {
  console.log('=== 统一权限上下文测试 ===\n');
  
  // 1. 创建TaskMCPServer实例
  console.log('1. 初始化TaskMCPServer...');
  const taskServer = new TaskMCPServer(API_BASE);
  
  // 2. 测试开发环境登录
  console.log('\n2. 测试开发环境快速登录...');
  const loginResult = await taskServer.devQuickLogin('admin');
  console.log('登录结果:', {
    success: loginResult.success,
    hasToken: !!loginResult.token,
    username: loginResult.username,
    message: loginResult.message
  });
  
  if (!loginResult.success) {
    console.error('❌ 登录失败，终止测试');
    return;
  }
  
  // 3. 获取统一上下文管理器并检查状态
  console.log('\n3. 检查统一上下文状态...');
  const contextManager = getGlobalContextManager(API_BASE);
  const contextStatus = contextManager.getContextStatus();
  console.log('上下文状态:', contextStatus);
  
  // 4. 测试权限检查
  console.log('\n4. 测试权限检查...');
  const permissionsToTest = [
    'task.create',
    'task.read',
    'task.update',
    'task.delete',
    'document.create',
    'document.read',
    'worknote.create',
    'worknote.read',
    'invalid.permission'
  ];
  
  for (const permission of permissionsToTest) {
    try {
      const result = await contextManager.checkPermission(permission);
      console.log(`  ${permission}: ${result.hasPermission ? '✅' : '❌'} (${result.source})`);
      if (!result.hasPermission && result.reason) {
        console.log(`    原因: ${result.reason}`);
      }
    } catch (error) {
      console.log(`  ${permission}: ❌ 检查失败 - ${error.message}`);
    }
  }
  
  // 5. 测试批量权限检查
  console.log('\n5. 测试批量权限检查...');
  try {
    const batchPermissions = [
      { permissionCode: 'task.create' },
      { permissionCode: 'task.read' },
      { permissionCode: 'document.create' },
    ];
    
    const batchResults = await contextManager.checkBatchPermissions(batchPermissions);
    console.log('批量权限检查结果:');
    Object.entries(batchResults).forEach(([permission, result]) => {
      console.log(`  ${permission}: ${result.hasPermission ? '✅' : '❌'} (${result.source})`);
    });
  } catch (error) {
    console.log('  批量权限检查失败:', error.message);
  }
  
  // 6. 测试任务操作（带权限检查）
  console.log('\n6. 测试任务操作（带权限检查）...');
  try {
    // 测试创建任务
    const createResult = await taskServer.createTask('测试任务 - 权限上下文验证', 1);
    console.log('创建任务:', {
      success: createResult.success,
      taskId: createResult.success ? createResult.data?.id : null,
      error: createResult.success ? null : createResult.error
    });
    
    if (createResult.success && createResult.data?.id) {
      const taskId = createResult.data.id;
      
      // 测试读取任务详情
      const detailResult = await taskServer.getDetailedTaskInfo(taskId);
      console.log('获取任务详情:', {
        success: detailResult.success,
        taskTitle: detailResult.success ? detailResult.data?.task?.title : null,
        error: detailResult.success ? null : detailResult.error
      });
      
      // 测试更新任务
      const updateResult = await taskServer.updateTask(taskId, {
        title: '测试任务 - 权限上下文验证 (已更新)'
      });
      console.log('更新任务:', {
        success: updateResult.success,
        error: updateResult.success ? null : updateResult.error
      });
    }
  } catch (error) {
    console.log('  任务操作测试失败:', error.message);
  }
  
  // 7. 测试工作笔记操作
  console.log('\n7. 测试工作笔记操作...');
  try {
    const noteResult = await taskServer.createWorkNote(
      '权限上下文测试笔记',
      '这是一个测试统一权限上下文的工作笔记'
    );
    console.log('创建工作笔记:', {
      success: noteResult.success,
      noteId: noteResult.success ? noteResult.data?.id : null,
      error: noteResult.success ? null : noteResult.error
    });
  } catch (error) {
    console.log('  工作笔记操作测试失败:', error.message);
  }
  
  // 8. 获取用户权限列表
  console.log('\n8. 刷新并显示用户权限列表...');
  try {
    const permissions = await contextManager.refreshUserPermissions();
    console.log(`用户权限列表 (${permissions.length}个):`, permissions);
  } catch (error) {
    console.log('  获取权限列表失败:', error.message);
  }
  
  // 9. 测试上下文清理
  console.log('\n9. 测试上下文清理...');
  contextManager.clearContext();
  const clearedStatus = contextManager.getContextStatus();
  console.log('清理后状态:', clearedStatus);
  
  console.log('\n=== 测试完成 ===');
}

// 运行测试
testUnifiedPermissionContext().catch(error => {
  console.error('❌ 测试执行失败:', error);
  process.exit(1);
});
