import { TaskMCPServer } from './mcp-task-bridge/task-mcp.js';

async function recreateTask397() {
  const taskServer = new TaskMCPServer();
  
  try {
    console.log('🔧 重新创建32周系统Bug修复与优化任务...\n');
    
    // 1. 创建任务397的替代根任务
    console.log('📋 创建"32周：系统Bug修复与优化"根任务...');
    
    const task397Result = await taskServer.createTask(
      '32周：系统Bug修复与优化',
      1, // 项目ID 1
      {
        description: `# 32周：系统Bug修复与优化

## 任务概述
本任务专注于系统的关键Bug修复和性能优化，确保平台稳定性和用户体验。

## 主要目标
- 修复UI交互问题
- 优化系统性能
- 提升用户体验
- 增强系统稳定性

## 当前状态
- 已完成任务编辑页父任务选择器UI优化
- 待完成居中弹窗格式优化

## 创建时间
${new Date().toISOString()}

由Claude Code MCP工具重新创建以修复数据一致性问题。`,
        status: 'in_progress',
        priority: 'high'
      }
    );
    
    if (task397Result.success) {
      console.log(`✅ ${task397Result.message}`);
      const newRootTaskId = task397Result.id;
      console.log(`📌 新根任务ID: ${newRootTaskId}\n`);
      
      // 2. 获取原本父任务ID为397的孤立子任务
      console.log('🔍 查找需要重新分配的子任务...');
      const listResult = await taskServer.listTasks(1);
      
      if (listResult.success) {
        const orphanedTasks = [];
        
        for (const task of listResult.tasks) {
          try {
            const taskDetail = await taskServer.findTaskById(task.id);
            if (taskDetail.parent_id === 397) {
              orphanedTasks.push(taskDetail);
            }
          } catch (error) {
            console.log(`⚠️ 无法检查任务${task.id}: ${error.message}`);
          }
        }
        
        console.log(`✅ 找到 ${orphanedTasks.length} 个需要重新分配的子任务\n`);
        
        // 3. 将孤立的子任务分配给新的根任务
        if (orphanedTasks.length > 0) {
          console.log('🔄 重新分配子任务到新根任务...');
          
          for (const orphanedTask of orphanedTasks) {
            console.log(`📝 更新任务${orphanedTask.id}: ${orphanedTask.title}`);
            
            const updateResult = await taskServer.updateTask(orphanedTask.id, {
              parent_id: newRootTaskId
            });
            
            if (updateResult.success) {
              console.log(`   ✅ 成功分配给任务${newRootTaskId}`);
            } else {
              console.log(`   ❌ 分配失败: ${updateResult.error}`);
            }
          }
          console.log('');
        }
        
        // 4. 验证新的任务结构
        console.log('🔍 验证新的任务结构...');
        const childrenResult = await taskServer.getTaskChildren(newRootTaskId);
        
        if (childrenResult.success) {
          console.log(`📊 任务${newRootTaskId}现在有 ${childrenResult.children.length} 个子任务:\n`);
          
          childrenResult.children.forEach((child, index) => {
            console.log(`${index + 1}. 任务${child.id}: ${child.title}`);
            console.log(`   状态: ${child.status} | 优先级: ${child.priority}`);
            console.log(`   创建时间: ${child.created_at}`);
            console.log('');
          });
          
          // 5. 分析任务完成情况
          const completedTasks = childrenResult.children.filter(child => child.status === 'completed');
          const incompleteTasks = childrenResult.children.filter(child => child.status !== 'completed');
          
          console.log('📊 任务完成情况分析:');
          console.log(`   ✅ 已完成: ${completedTasks.length}个`);
          console.log(`   ⏳ 未完成: ${incompleteTasks.length}个\n`);
          
          if (incompleteTasks.length > 0) {
            console.log('⚠️ 未完成的子任务:');
            incompleteTasks.forEach((task, idx) => {
              console.log(`   ${idx + 1}. 任务${task.id}: ${task.title} (${task.status})`);
            });
            console.log('');
          }
          
          // 6. 推荐下一步操作
          console.log('💡 下一步建议:');
          if (incompleteTasks.length > 0) {
            console.log('   1. 优先完成未完成的子任务');
            console.log(`   2. 重点关注任务${incompleteTasks[0].id}: ${incompleteTasks[0].title}`);
            console.log('   3. 根据需要创建新的优化子任务');
          } else {
            console.log('   ✅ 所有子任务已完成，可以考虑:');
            console.log('   1. 创建新的系统优化子任务');
            console.log('   2. 进行性能监控和Bug收集');
            console.log('   3. 规划下一阶段的优化工作');
          }
          
        } else {
          console.log('❌ 验证任务结构失败:', childrenResult.error);
        }
        
      } else {
        console.log('❌ 获取任务列表失败:', listResult.error);
      }
      
    } else {
      console.log('❌ 创建根任务失败:', task397Result.error);
    }
    
  } catch (error) {
    console.error('❌ 操作失败:', error.message);
  }
}

recreateTask397();