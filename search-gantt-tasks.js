import { TaskMCPServer } from './mcp-task-bridge/task-mcp.js';

async function searchGanttTasks() {
  const taskServer = new TaskMCPServer();
  try {
    // 获取项目1的所有任务
    const response = await taskServer.listTasks(1);
    const allTasks = response.tasks || response.data || response;
    
    console.log(`📊 找到 ${allTasks.length} 个任务`);
    
    // 查找项目详情页相关的任务
    const projectDetailTasks = allTasks.filter(task => 
      task.title.toLowerCase().includes('项目详情') || 
      task.title.toLowerCase().includes('project detail') ||
      task.title.toLowerCase().includes('甘特') ||
      task.title.toLowerCase().includes('gantt') ||
      (task.description && task.description.toLowerCase().includes('项目详情')) ||
      (task.description && task.description.toLowerCase().includes('甘特图'))
    );
    
    console.log('🔍 找到相关任务:');
    projectDetailTasks.forEach(task => {
      console.log(`📋 任务${task.id}: ${task.title} (状态: ${task.status})`);
      if (task.description) {
        console.log(`   描述: ${task.description.substring(0, 100)}...`);
      }
      console.log(`   项目ID: ${task.project_id}, 父任务: ${task.parent_id || '无'}`);
      console.log('');
    });
    
    // 查找合适的父任务（项目管理或UI优化相关）
    const potentialParents = allTasks.filter(task => 
      (task.title.toLowerCase().includes('ui') || 
       task.title.toLowerCase().includes('界面') ||
       task.title.toLowerCase().includes('优化') ||
       task.title.toLowerCase().includes('项目管理') ||
       task.title.toLowerCase().includes('可视化')) &&
      task.status !== 'completed' &&
      !task.parent_id // 只考虑顶级任务作为父任务
    );
    
    console.log('🎯 建议的父任务:');
    potentialParents.slice(0, 5).forEach(task => {
      console.log(`📋 任务${task.id}: ${task.title} (状态: ${task.status})`);
    });
    
  } catch (error) {
    console.error('❌ 搜索任务失败:', error.message);
  }
}

searchGanttTasks();