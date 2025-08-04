import { TaskMCPServer } from './task-mcp.js';

async function updateTaskDocument(taskId, content, title = null) {
  const taskServer = new TaskMCPServer();
  
  try {
    console.log(`📄 更新任务${taskId}文档`);
    
    const result = await taskServer.createOrUpdateTaskDocument(taskId, content, title);
    
    if (result.success) {
      console.log(`✅ 任务${taskId}文档更新成功:`, result.message);
    } else {
      console.log(`❌ 任务${taskId}文档更新失败:`, result.error);
    }
    
    return result;
    
  } catch (error) {
    console.error(`❌ 更新任务${taskId}文档时出错:`, error.message);
    return { success: false, error: error.message };
  }
}

// 检查命令行参数
const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('使用方法: node update-task-doc.js <taskId> <content> [title]');
  console.log('示例: node update-task-doc.js 301 "# 任务文档内容" "任务标题"');
  process.exit(1);
}

const taskId = parseInt(args[0]);
const content = args[1];
const title = args[2] || null;

updateTaskDocument(taskId, content, title);