import { TaskMCPServer } from './task-mcp.js';

const taskServer = new TaskMCPServer();

async function getActiveTasks() {
  try {
    console.log('🔍 查找todo和in_progress状态的任务...');
    
    // 获取项目1中的所有任务
    const result = await taskServer.listTasks(1);
    const tasks = result.tasks || [];
    
    if (!tasks || tasks.length === 0) {
      console.log('❌ 项目1中没有找到任何任务');
      return;
    }
    
    console.log(`📋 项目1中共找到 ${tasks.length} 个任务`);
    
    // 筛选todo和in_progress状态的任务
    const activeTasks = tasks.filter(t => t.status === 'todo' || t.status === 'in_progress');
    
    console.log(`\n🎯 找到 ${activeTasks.length} 个活跃任务 (todo/in_progress):`);
    
    if (activeTasks.length > 0) {
      // 按优先级和状态排序
      activeTasks.sort((a, b) => {
        // in_progress优先于todo
        if (a.status !== b.status) {
          return a.status === 'in_progress' ? -1 : 1;
        }
        // 同状态下按ID倒序
        return b.id - a.id;
      });
      
      activeTasks.forEach((task, index) => {
        const statusIcon = task.status === 'in_progress' ? '🚧' : '📋';
        const parentInfo = task.parent_task_id ? `父任务: ${task.parent_task_id}` : '根任务';
        
        console.log(`\n${statusIcon} ${index + 1}. ID: ${task.id}`);
        console.log(`   标题: ${task.title}`);
        console.log(`   状态: ${task.status}`);
        console.log(`   类型: ${parentInfo}`);
        
        if (task.description && task.description.length > 0) {
          const shortDesc = task.description.length > 100 
            ? task.description.substring(0, 100) + '...' 
            : task.description;
          console.log(`   描述: ${shortDesc}`);
        }
      });
      
      // 统计信息
      const todoCount = activeTasks.filter(t => t.status === 'todo').length;
      const inProgressCount = activeTasks.filter(t => t.status === 'in_progress').length;
      const rootTasks = activeTasks.filter(t => !t.parent_task_id).length;
      const subTasks = activeTasks.filter(t => t.parent_task_id).length;
      
      console.log(`\n📊 统计信息:`);
      console.log(`   🚧 进行中任务: ${inProgressCount}`);
      console.log(`   📋 待办任务: ${todoCount}`);
      console.log(`   🌳 根任务: ${rootTasks}`);
      console.log(`   🔗 子任务: ${subTasks}`);
      
      // 优先推荐
      console.log(`\n🎯 优先建议:`);
      const inProgressTasks = activeTasks.filter(t => t.status === 'in_progress');
      if (inProgressTasks.length > 0) {
        console.log(`   继续进行中的任务: ID ${inProgressTasks[0].id} - ${inProgressTasks[0].title}`);
      } else {
        console.log(`   开始最新的待办任务: ID ${activeTasks[0].id} - ${activeTasks[0].title}`);
      }
    } else {
      console.log('✅ 所有任务都已完成或处于其他状态');
    }
    
  } catch (error) {
    console.error('❌ 查询失败:', error.message);
  }
}

getActiveTasks();