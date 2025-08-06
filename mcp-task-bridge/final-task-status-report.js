import { TaskMCPServer } from './task-mcp.js';

const taskServer = new TaskMCPServer();

async function generateFinalTaskStatusReport() {
  try {
    console.log('📊 生成任务状态报告...');
    console.log('==================================================');
    
    const result = await taskServer.listTasks(1);
    const tasks = result.tasks || [];
    
    // 统计所有任务状态
    const statusStats = {
      todo: tasks.filter(t => t.status === 'todo').length,
      in_progress: tasks.filter(t => t.status === 'in_progress').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      blocked: tasks.filter(t => t.status === 'blocked').length
    };
    
    console.log('📈 项目1任务状态总览:');
    console.log(`   📋 待办任务: ${statusStats.todo}`);
    console.log(`   🚧 进行中任务: ${statusStats.in_progress}`);
    console.log(`   ✅ 已完成任务: ${statusStats.completed}`);
    console.log(`   🚫 阻塞任务: ${statusStats.blocked}`);
    console.log(`   📊 总任务数: ${tasks.length}`);
    
    // 重点关注的活跃任务
    console.log('\n\n🎯 当前重要活跃任务详情:');
    console.log('==================================================');
    
    const importantTaskIds = [617, 633, 630, 620, 619, 618];
    const importantTasks = tasks.filter(t => importantTaskIds.includes(t.id));
    
    // 按状态和优先级排序
    importantTasks.sort((a, b) => {
      if (a.status !== b.status) {
        if (a.status === 'in_progress') return -1;
        if (b.status === 'in_progress') return 1;
        if (a.status === 'todo' && b.status !== 'todo') return -1;
        if (b.status === 'todo' && a.status !== 'todo') return 1;
      }
      
      const aPriority = a.custom_fields?.priority || 'low';
      const bPriority = b.custom_fields?.priority || 'low';
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      
      return priorityOrder[bPriority] - priorityOrder[aPriority];
    });
    
    importantTasks.forEach((task, index) => {
      const statusIcon = task.status === 'completed' ? '✅' : 
                        task.status === 'in_progress' ? '🚧' : 
                        task.status === 'blocked' ? '🚫' : '📋';
      
      const priority = task.custom_fields?.priority || 'low';
      const priorityIcon = priority === 'high' ? '🔥' : 
                          priority === 'medium' ? '⚡' : '💡';
      
      console.log(`\n${statusIcon} ${priorityIcon} ${index + 1}. 任务 ${task.id}: ${task.title}`);
      console.log(`   状态: ${task.status} | 优先级: ${priority}`);
      
      if (task.custom_fields?.estimated_hours) {
        console.log(`   预估工时: ${task.custom_fields.estimated_hours}小时`);
      }
      
      if (task.custom_fields?.progress) {
        console.log(`   进度: ${task.custom_fields.progress}%`);
      }
      
      // 显示任务类型（根任务或子任务）
      if (task.parent_task_id) {
        const parentTask = tasks.find(t => t.id === task.parent_task_id);
        console.log(`   父任务: ${task.parent_task_id} - ${parentTask?.title || '未知'}`);
      } else {
        console.log(`   类型: 根任务`);
      }
      
      // 显示简短描述
      if (task.description && task.description.trim() && !task.description.includes('通过Claude Code创建')) {
        const shortDesc = task.description.split('\n')[0];
        if (shortDesc.length > 80) {
          console.log(`   描述: ${shortDesc.substring(0, 80)}...`);
        } else {
          console.log(`   描述: ${shortDesc}`);
        }
      }
    });
    
    console.log('\n\n🎯 用户执行建议:');
    console.log('==================================================');
    
    const inProgressTask = importantTasks.find(t => t.status === 'in_progress');
    const highPriorityTodos = importantTasks.filter(t => t.status === 'todo' && t.custom_fields?.priority === 'high');
    const mediumPriorityTodos = importantTasks.filter(t => t.status === 'todo' && t.custom_fields?.priority === 'medium');
    const lowPriorityTodos = importantTasks.filter(t => t.status === 'todo' && (t.custom_fields?.priority === 'low' || !t.custom_fields?.priority));
    
    let suggestionIndex = 1;
    
    if (inProgressTask) {
      console.log(`${suggestionIndex}. 🚧 优先继续进行中的任务:`);
      console.log(`   任务 ${inProgressTask.id}: ${inProgressTask.title}`);
      console.log(`   当前进度: ${inProgressTask.custom_fields?.progress || 0}%`);
      console.log(`   建议: 继续推进，争取尽快完成`);
      suggestionIndex++;
    }
    
    if (highPriorityTodos.length > 0) {
      console.log(`\n${suggestionIndex}. 🔥 启动高优先级任务:`);
      highPriorityTodos.forEach(task => {
        console.log(`   任务 ${task.id}: ${task.title}`);
        if (task.custom_fields?.estimated_hours) {
          console.log(`   预估工时: ${task.custom_fields.estimated_hours}小时`);
        }
      });
      suggestionIndex++;
    }
    
    if (mediumPriorityTodos.length > 0) {
      console.log(`\n${suggestionIndex}. ⚡ 中等优先级任务 (按工时排序):`);
      const sortedMediumTasks = mediumPriorityTodos.sort((a, b) => {
        const aHours = a.custom_fields?.estimated_hours || 999;
        const bHours = b.custom_fields?.estimated_hours || 999;
        return aHours - bHours;
      });
      
      sortedMediumTasks.forEach(task => {
        console.log(`   任务 ${task.id}: ${task.title} (${task.custom_fields?.estimated_hours || '未估算'}小时)`);
      });
      suggestionIndex++;
    }
    
    if (lowPriorityTodos.length > 0) {
      console.log(`\n${suggestionIndex}. 💡 低优先级任务 (有空时处理):`);
      lowPriorityTodos.slice(0, 3).forEach(task => {
        console.log(`   任务 ${task.id}: ${task.title}`);
      });
      if (lowPriorityTodos.length > 3) {
        console.log(`   ... 还有 ${lowPriorityTodos.length - 3} 个低优先级任务`);
      }
    }
    
    console.log('\n\n📋 替代建议 (如当前任务受阻):');
    console.log('==================================================');
    
    // MCP相关任务组
    const mcpTasks = importantTasks.filter(t => t.title.toLowerCase().includes('mcp') && t.status === 'todo');
    if (mcpTasks.length > 0) {
      console.log('🔧 MCP环境相关任务:');
      mcpTasks.forEach(task => {
        console.log(`   • 任务 ${task.id}: ${task.title}`);
      });
    }
    
    // 归档功能相关任务组  
    const archiveTasks = importantTasks.filter(t => t.title.includes('归档') && t.status === 'todo');
    if (archiveTasks.length > 0) {
      console.log('\n📦 任务归档功能相关任务:');
      archiveTasks.sort((a, b) => {
        const order = ['后端API', '前端界面', '集成测试'];
        const aOrder = order.findIndex(o => a.title.includes(o));
        const bOrder = order.findIndex(o => b.title.includes(o));
        return (aOrder === -1 ? 999 : aOrder) - (bOrder === -1 ? 999 : bOrder);
      });
      
      archiveTasks.forEach((task, idx) => {
        console.log(`   ${idx + 1}. 任务 ${task.id}: ${task.title}`);
        if (task.custom_fields?.estimated_hours) {
          console.log(`      预估: ${task.custom_fields.estimated_hours}小时`);
        }
      });
    }
    
    console.log('\n✨ 报告生成完成!');
    
  } catch (error) {
    console.error('❌ 生成报告失败:', error.message);
  }
}

generateFinalTaskStatusReport();