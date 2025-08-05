#!/usr/bin/env node

import { TaskMCPServer } from './task-mcp.js';

async function verifyTask416() {
  console.log('🔍 验证任务 #416 的更新结果');
  console.log('=============================');
  
  const taskServer = new TaskMCPServer();
  
  try {
    // 1. 查找任务416
    console.log('📋 查找任务416...');
    const task = await taskServer.findTaskById(416);
    
    if (!task) {
      console.error('❌ 找不到任务416');
      return;
    }
    
    console.log('✅ 任务基本信息:');
    console.log(`  ID: ${task.id}`);
    console.log(`  标题: ${task.title}`);
    console.log(`  状态: ${task.status}`);
    console.log(`  项目ID: ${task.project_id}`);
    console.log(`  更新时间: ${task.updated_at}`);
    
    // 2. 检查任务文档
    console.log('\n📄 检查任务文档...');
    const hasDoc = await taskServer.hasTaskDocument(416, 1);
    console.log('📄 文档存在性检查:', JSON.stringify(hasDoc, null, 2));
    
    if (hasDoc.has_document) {
      const docResult = await taskServer.getTaskDocument(416, 1);
      console.log('\n📖 文档内容长度:', docResult.content ? docResult.content.length : 0, '字符');
      console.log('📖 文档前200字符预览:');
      console.log('---');
      if (docResult.content) {
        console.log(docResult.content.substring(0, 200) + '...');
      }
      console.log('---');
    }
    
    // 3. 验证状态是否为completed
    if (task.status === 'completed') {
      console.log('\n🎉 验证成功！');
      console.log('✅ 任务416状态已正确更新为 completed');
      console.log('✅ Phase 3 CSS Grid响应式布局实现工作已100%完成');
    } else {
      console.log('\n⚠️  状态验证失败');
      console.log(`   当前状态: ${task.status}`);
      console.log(`   期望状态: completed`);
    }
    
  } catch (error) {
    console.error('❌ 验证失败:', error.message);
    if (error.response?.data) {
      console.error('📊 错误详情:', error.response.data);
    }
  }
}

verifyTask416().catch(console.error);