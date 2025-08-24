import { TaskMCPServer } from './task-mcp.js';

const taskServer = new TaskMCPServer();

async function findCurrentWeekRootTask() {
  try {
    console.log('🔍 查找当前周的根任务...');
    console.log('📅 当前日期:', new Date().toLocaleDateString('zh-CN'));
    
    // 获取项目1中的所有任务
    const result = await taskServer.listTasks(1);
    const tasks = result.tasks || [];
    
    if (!tasks || tasks.length === 0) {
      console.log('❌ 项目1中没有找到任何任务');
      return;
    }
    
    console.log(`📋 项目1中共找到 ${tasks.length} 个任务`);
    
    // 查找根任务 (没有parent_task_id的任务)
    const rootTasks = tasks.filter(t => !t.parent_task_id);
    console.log(`🌳 找到 ${rootTasks.length} 个根任务`);
    
    if (rootTasks.length > 0) {
      // 按ID排序，显示最近的根任务
      const sortedRootTasks = rootTasks.sort((a, b) => b.id - a.id);
      
      console.log('\n🔝 最近的根任务:');
      sortedRootTasks.slice(0, 10).forEach((task, index) => {
        console.log(`${index + 1}. ID: ${task.id}, 标题: ${task.title}, 状态: ${task.status}`);
      });
      
      // 查找最新的根任务作为当前周的任务
      const latestRootTask = sortedRootTasks[0];
      console.log(`\n🎯 建议使用最新的根任务作为父任务:`);
      console.log(`   ID: ${latestRootTask.id}`);
      console.log(`   标题: ${latestRootTask.title}`);
      console.log(`   状态: ${latestRootTask.status}`);
      
      // 检查是否有子任务
      if (tasks.some(t => t.parent_task_id === latestRootTask.id)) {
        console.log(`   ✅ 此任务已有子任务`);
      } else {
        console.log(`   ℹ️  此任务还没有子任务`);
      }
      
      return latestRootTask;
    } else {
      console.log('❌ 没有找到根任务');
    }
    
    // 查找包含PDF相关的任务
    const pdfTasks = tasks.filter(t => 
      t.title && (t.title.toLowerCase().includes('pdf') ||
      (t.description && t.description.toLowerCase().includes('pdf')))
    );
    
    if (pdfTasks.length > 0) {
      console.log('\n📄 PDF相关任务:');
      pdfTasks.forEach(task => {
        console.log(`  - ID: ${task.id}, 标题: ${task.title}, 父任务: ${task.parent_task_id || '无'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ 查找失败:', error.message);
  }
}

findCurrentWeekRootTask();