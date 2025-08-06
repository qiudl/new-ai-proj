// 由于原文件使用ES模块，我们需要使用动态导入
async function importTaskMCPServer() {
  const { TaskMCPServer } = await import('./mcp-task-bridge/task-mcp.js');
  return TaskMCPServer;
}

async function getTask397Details() {
  const TaskMCPServer = await importTaskMCPServer();
  const taskServer = new TaskMCPServer();
  try {
    console.log('🔍 获取任务397的详细信息...');
    
    // 获取任务详细信息
    const task = await taskServer.findTaskById(397);
    
    console.log('📋 任务详细信息:');
    console.log(`ID: ${task.id}`);
    console.log(`标题: ${task.title}`);
    console.log(`状态: ${task.status}`);
    console.log(`项目ID: ${task.project_id}`);
    console.log(`父任务ID: ${task.parent_id || '无（根任务）'}`);
    console.log(`创建时间: ${task.created_at}`);
    console.log(`更新时间: ${task.updated_at}`);
    console.log(`截止日期: ${task.due_date || '无'}`);
    console.log(`分配给: ${task.assignee_id || '未分配'}`);
    console.log(`优先级: ${task.custom_fields?.priority || '未设置'}`);
    
    console.log('\n📄 任务描述:');
    console.log(task.description || '无描述');
    
    // 获取子任务
    console.log('\n🌳 查找子任务...');
    const childrenResult = await taskServer.getTaskChildren(397);
    
    if (childrenResult.success) {
      console.log(`\n👶 子任务列表 (共${childrenResult.total}个):`);
      if (childrenResult.children.length > 0) {
        childrenResult.children.forEach((child, index) => {
          console.log(`${index + 1}. 任务${child.id}: ${child.title}`);
          console.log(`   状态: ${child.status}, 优先级: ${child.priority}`);
          console.log(`   创建时间: ${child.created_at}`);
          console.log('');
        });
      } else {
        console.log('此任务暂无子任务');
      }
    } else {
      console.log('❌ 获取子任务失败:', childrenResult.error);
    }
    
    // 尝试获取任务文档
    console.log('\n📄 查找任务文档...');
    const docResult = await taskServer.getTaskDocument(397);
    
    if (docResult.success) {
      console.log('✅ 任务有关联文档:');
      console.log(`文档标题: ${docResult.title}`);
      console.log(`文档长度: ${docResult.content.length} 字符`);
      console.log(`最后更新: ${docResult.updated_at}`);
      console.log('\n📖 文档内容预览 (前500字符):');
      console.log(docResult.content.substring(0, 500) + '...');
    } else if (docResult.not_found) {
      console.log('📝 任务暂无关联文档');
    } else {
      console.log('❌ 获取任务文档失败:', docResult.error);
    }
    
  } catch (error) {
    console.error('❌ 查询失败:', error.message);
  }
}

getTask397Details();