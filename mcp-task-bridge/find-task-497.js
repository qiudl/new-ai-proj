import { TaskMCPServer } from './task-mcp.js';

const taskServer = new TaskMCPServer();

async function findTask497() {
  try {
    // 首先尝试直接查找任务497
    const task = await taskServer.findTaskById(497);
    console.log('✅ 找到任务497:', JSON.stringify(task, null, 2));
  } catch (error) {
    console.log('❌ 任务497不存在:', error.message);
    
    // 查找项目1中的所有任务
    console.log('🔍 查找项目1中的所有任务...');
    const tasks = await taskServer.listTasks(1);
    
    if (tasks && tasks.length > 0) {
      console.log(`📋 项目1中共找到 ${tasks.length} 个任务:`);
      
      // 查找最近的根任务或相关任务
      const recentTasks = tasks
        .filter(t => !t.parent_task_id) // 只显示根任务
        .sort((a, b) => b.id - a.id) // 按ID降序排列
        .slice(0, 10); // 取最近的10个
      
      console.log('🔝 最近的根任务:');
      recentTasks.forEach(task => {
        console.log(`  - ID: ${task.id}, 标题: ${task.title}, 状态: ${task.status}`);
      });
      
      // 查找包含PDF相关的任务
      const pdfTasks = tasks.filter(t => 
        t.title.toLowerCase().includes('pdf') ||
        t.description && t.description.toLowerCase().includes('pdf')
      );
      
      if (pdfTasks.length > 0) {
        console.log('\n📄 PDF相关任务:');
        pdfTasks.forEach(task => {
          console.log(`  - ID: ${task.id}, 标题: ${task.title}, 父任务: ${task.parent_task_id || '无'}`);
        });
      }
    } else {
      console.log('❌ 项目1中没有找到任何任务');
    }
  }
}

findTask497();