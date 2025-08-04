import { TaskMCPServer } from './mcp-task-bridge/task-mcp.js';

async function findWeeklyRootTask() {
  const taskServer = new TaskMCPServer();
  try {
    console.log('🔍 查找项目1中的任务...');
    const tasks = await taskServer.listTasks(1);
    if (tasks.success) {
      const allTasks = tasks.data || [];
      console.log('总任务数:', allTasks.length);
      
      // 查找32周的根任务
      const weeklyRootTasks = allTasks.filter(task => 
        task.title.includes('32周') && !task.parent_id
      );
      
      console.log('📋 32周的根任务 (' + weeklyRootTasks.length + '个):');
      weeklyRootTasks.forEach(task => {
        console.log('  ID:', task.id, '标题:', task.title, '状态:', task.status);
      });
      
      if (weeklyRootTasks.length === 0) {
        console.log('❌ 未找到32周的根任务');
        // 查找最近的根任务
        const recentRootTasks = allTasks
          .filter(task => !task.parent_id)
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 5);
        console.log('📋 最近的根任务:');
        recentRootTasks.forEach(task => {
          console.log('  ID:', task.id, '标题:', task.title, '状态:', task.status);
        });
      }
      
      return weeklyRootTasks.length > 0 ? weeklyRootTasks[0] : null;
    } else {
      console.log('❌ 获取任务列表失败:', tasks.error);
      return null;
    }
  } catch (error) {
    console.error('❌ 操作失败:', error.message);
    return null;
  }
}

findWeeklyRootTask();