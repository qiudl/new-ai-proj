#!/usr/bin/env node

/**
 * 创建简单的批量父任务更改测试场景
 * 
 * 为了确保测试能通过验证，我们创建一个简单的测试场景：
 * 1. 创建一个独立的源任务（没有子任务）
 * 2. 创建一个独立的目标父任务
 * 3. 测试将源任务移动到目标父任务下
 */

import { TaskMCPServer } from './task-mcp.js';

const taskServer = new TaskMCPServer();

async function createSimpleTestScenario() {
  console.log('🔧 创建简单的批量父任务更改测试场景');
  console.log('=====================================');
  
  try {
    // 1. 创建一个独立的目标父任务
    console.log('\n📋 Step 1: 创建目标父任务');
    const targetParentResult = await taskServer.createTask(
      '简单测试目标父任务 - 用于验证批量移动',
      1, // project_id
      {
        description: '这是一个简单的目标父任务，用于验证批量父任务更改功能。这个任务没有子任务，没有复杂的层级关系，应该能够成功接受其他任务作为子任务。',
        status: 'todo',
        priority: 'medium'
      }
    );
    
    if (!targetParentResult.success) {
      throw new Error('创建目标父任务失败: ' + targetParentResult.error);
    }
    
    const targetParentId = targetParentResult.id;
    console.log(`✅ 目标父任务创建成功: ID ${targetParentId}`);
    
    // 2. 创建一个独立的源任务
    console.log('\n📋 Step 2: 创建源任务');
    const sourceTaskResult = await taskServer.createTask(
      '简单测试源任务 - 待移动到新父任务下',
      1, // project_id
      {
        description: '这是一个简单的源任务，将被移动到新的父任务下。这个任务没有子任务，没有循环依赖，应该能够成功移动。',
        status: 'todo',
        priority: 'low'
      }
    );
    
    if (!sourceTaskResult.success) {
      throw new Error('创建源任务失败: ' + sourceTaskResult.error);
    }
    
    const sourceTaskId = sourceTaskResult.id;
    console.log(`✅ 源任务创建成功: ID ${sourceTaskId}`);
    
    // 3. 验证任务创建成功
    console.log('\n🔍 Step 3: 验证任务创建结果');
    const targetTask = await taskServer.findTaskById(targetParentId);
    const sourceTask = await taskServer.findTaskById(sourceTaskId);
    
    console.log('目标父任务详情:');
    console.log(`  - ID: ${targetTask.id}`);
    console.log(`  - 标题: "${targetTask.title}"`);
    console.log(`  - 状态: ${targetTask.status}`);
    console.log(`  - 父任务: ${targetTask.parent_id || 'none'}`);
    
    console.log('源任务详情:');
    console.log(`  - ID: ${sourceTask.id}`);
    console.log(`  - 标题: "${sourceTask.title}"`);
    console.log(`  - 状态: ${sourceTask.status}`);
    console.log(`  - 父任务: ${sourceTask.parent_id || 'none'}`);
    
    // 4. 输出测试配置
    console.log('\n🎯 简单测试场景配置:');
    console.log('===========================');
    console.log(`目标父任务ID: ${targetParentId}`);
    console.log(`源任务ID: ${sourceTaskId}`);
    console.log('');
    console.log('📋 测试步骤:');
    console.log('1. 在UI中选择源任务 (checkbox)');
    console.log('2. 点击"更改父任务"批量操作');
    console.log('3. 在Modal中选择目标父任务');
    console.log('4. 验证预览显示正确');
    console.log('5. 确认执行批量更改');
    console.log('6. 验证源任务成功移动到目标父任务下');
    
    console.log('\n🔧 API测试配置:');
    console.log(`const SIMPLE_TEST_CONFIG = {`);
    console.log(`  TARGET_PARENT_ID: ${targetParentId},`);
    console.log(`  SOURCE_TASK_ID: ${sourceTaskId}`);
    console.log(`};`);
    
    return {
      targetParentId,
      sourceTaskId,
      success: true
    };
    
  } catch (error) {
    console.error('❌ 创建简单测试场景失败:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// 执行创建测试场景
createSimpleTestScenario()
  .then(result => {
    if (result.success) {
      console.log('\n🎉 简单测试场景创建成功!');
      console.log('现在可以使用这些任务进行批量父任务更改测试');
    } else {
      console.log('\n💥 测试场景创建失败');
    }
  })
  .catch(error => {
    console.error('💥 执行出错:', error.message);
    process.exit(1);
  });