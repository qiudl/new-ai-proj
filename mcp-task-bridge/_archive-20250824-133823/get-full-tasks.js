import axios from 'axios';

async function getFullTasks() {
  const apiBase = 'http://localhost:8080/api/v1';
  const authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwidXNlcl90eXBlIjoic3lzdGVtIiwic3ViIjoiYWRtaW4iLCJleHAiOjE3NTQ3MTkwMTgsIm5iZiI6MTc1NDExNDIxOCwiaWF0IjoxNzU0MTE0MjE4fQ.iBXJyoqj7MQOT6ijQnSQQeiZx-q9-0_SCZ2q4eAB-J8';
  
  try {
    console.log('🔍 获取项目1的完整任务数据...');
    
    const response = await axios.get(`${apiBase}/projects/1/tasks`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      proxy: false
    });
    
    const tasks = response.data.data?.data || [];
    console.log(`📋 找到 ${tasks.length} 个任务`);
    
    if (tasks.length === 0) {
      console.log('❌ 项目1中没有任务');
      return;
    }
    
    // 查找根任务
    const rootTasks = tasks.filter(t => !t.parent_task_id);
    console.log(`🌳 根任务数量: ${rootTasks.length}`);
    
    if (rootTasks.length > 0) {
      // 按ID排序
      const sortedRootTasks = rootTasks.sort((a, b) => b.id - a.id);
      
      console.log('\n🔝 最近的根任务:');
      sortedRootTasks.slice(0, 10).forEach((task, index) => {
        console.log(`${index + 1}. ID: ${task.id}`);
        console.log(`   标题: ${task.title}`);
        console.log(`   状态: ${task.status}`);
        console.log(`   创建时间: ${task.created_at}`);
        console.log('');
      });
      
      // 推荐最新的根任务
      const latestRoot = sortedRootTasks[0];
      console.log(`🎯 建议的父任务ID: ${latestRoot.id}`);
      console.log(`🎯 建议的父任务标题: ${latestRoot.title}`);
      
      // 检查子任务
      const children = tasks.filter(t => t.parent_task_id === latestRoot.id);
      console.log(`📝 该任务已有 ${children.length} 个子任务`);
      
      if (children.length > 0) {
        console.log('\n子任务列表:');
        children.forEach((child, index) => {
          console.log(`  ${index + 1}. ID: ${child.id}, 标题: ${child.title}`);
        });
      }
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
    console.error('❌ 获取任务失败:', error.message);
    if (error.response) {
      console.error('错误详情:', error.response.data);
    }
  }
}

getFullTasks();