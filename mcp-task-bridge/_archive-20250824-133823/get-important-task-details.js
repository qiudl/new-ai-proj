import { TaskMCPServer } from './task-mcp.js';

const taskServer = new TaskMCPServer();

async function getImportantTaskDetails() {
  try {
    console.log('🔍 获取重要任务详细信息...');
    
    // 重点关注的任务ID
    const importantTaskIds = [
      617, // 进行中的任务归档数据库模型设计
      633, // MCP环境检测技术实现
      630, // MCP环境检测解决方案
      620, // 任务归档功能集成测试
      619, // 任务归档管理前端界面开发
      618  // 任务归档管理后端API开发
    ];
    
    for (const taskId of importantTaskIds) {
      try {
        const task = await taskServer.findTaskById(taskId);
        
        console.log(`\n📋 ======== 任务 ID: ${task.id} ========`);
        console.log(`   标题: ${task.title}`);
        console.log(`   状态: ${task.status}`);
        console.log(`   项目ID: ${task.project_id}`);
        console.log(`   创建时间: ${task.created_at ? new Date(task.created_at).toLocaleString('zh-CN') : 'N/A'}`);
        console.log(`   更新时间: ${task.updated_at ? new Date(task.updated_at).toLocaleString('zh-CN') : 'N/A'}`);
        console.log(`   父任务ID: ${task.parent_task_id || task.parent_id || '无 (根任务)'}`);
        
        if (task.description && task.description.trim()) {
          console.log(`   描述:`);
          console.log(`   ${task.description}`);
        } else {
          console.log(`   描述: 无`);
        }
        
        if (task.estimated_hours) {
          console.log(`   预估工时: ${task.estimated_hours}小时`);
        }
        
        if (task.actual_hours && task.actual_hours > 0) {
          console.log(`   实际工时: ${task.actual_hours}小时`);
        }
        
        // 检查自定义字段
        if (task.custom_fields) {
          console.log(`   自定义字段: ${JSON.stringify(task.custom_fields)}`);
        }
        
        // 优先级判断
        const priority = task.custom_fields?.priority || 'low';
        const priorityIcon = priority === 'high' ? '🔥' : priority === 'medium' ? '⚡' : '📋';
        console.log(`   优先级: ${priorityIcon} ${priority}`);
        
      } catch (error) {
        console.error(`❌ 获取任务 ${taskId} 失败:`, error.message);
      }
    }
    
    // 获取子任务信息
    console.log(`\n🔍 检查子任务关系...`);
    const allTasks = await taskServer.listTasks(1);
    const tasks = allTasks.tasks || [];
    
    for (const taskId of importantTaskIds) {
      const childTasks = tasks.filter(t => t.parent_task_id === taskId || t.parent_id === taskId);
      if (childTasks.length > 0) {
        console.log(`\n📊 任务 ${taskId} 的子任务 (${childTasks.length}个):`);
        childTasks.forEach(child => {
          const statusIcon = child.status === 'completed' ? '✅' : 
                           child.status === 'in_progress' ? '🚧' : '📋';
          console.log(`     ${statusIcon} ID: ${child.id}, 标题: ${child.title}, 状态: ${child.status}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ 操作失败:', error.message);
  }
}

getImportantTaskDetails();