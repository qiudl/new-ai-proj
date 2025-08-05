const axios = require('axios');

const authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwidXNlcl90eXBlIjoic3lzdGVtIiwic3ViIjoiYWRtaW4iLCJleHAiOjE3NTQ3MTkwMTgsIm5iZiI6MTc1NDExNDIxOCwiaWF0IjoxNzU0MTE0MjE4fQ.iBXJyoqj7MQOT6ijQnSQQeiZx-q9-0_SCZ2q4eAB-J8';
const apiBase = 'http://localhost/api/v1';

async function analyzeTasks() {
  try {
    const response = await axios.get(`${apiBase}/projects/1/tasks`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
      proxy: false
    });
    
    const tasks = response.data.data?.data || [];
    console.log('📊 任务层级结构分析:');
    console.log('==================');
    
    // 找到所有根任务（没有父任务的）
    const rootTasks = tasks.filter(t => !t.parent_id);
    console.log(`🌳 根任务数量: ${rootTasks.length}`);
    
    // 找到所有有子任务的任务
    const tasksWithChildren = tasks.filter(t => 
      tasks.some(child => child.parent_id === t.id)
    );
    console.log(`👥 有子任务的任务数量: ${tasksWithChildren.length}`);
    
    // 显示每个有子任务的任务及其子任务
    console.log('\n🔗 父子关系详情:');
    tasksWithChildren.forEach(parent => {
      const children = tasks.filter(child => child.parent_id === parent.id);
      console.log(`\n📋 ${parent.id}: "${parent.title}" [状态: ${parent.status}]`);
      children.forEach(child => {
        console.log(`  └─ 📄 ${child.id}: "${child.title}" [状态: ${child.status}]`);
        
        // 检查是否有第三层子任务
        const grandChildren = tasks.filter(gc => gc.parent_id === child.id);
        grandChildren.forEach(gc => {
          console.log(`     └─ 📝 ${gc.id}: "${gc.title}" [状态: ${gc.status}]`);
        });
      });
    });
    
    // 统计层级深度
    const depthStats = { 1: 0, 2: 0, 3: 0 };
    tasks.forEach(task => {
      if (!task.parent_id) {
        depthStats[1]++;
      } else {
        const parent = tasks.find(t => t.id === task.parent_id);
        if (parent && !parent.parent_id) {
          depthStats[2]++;
        } else if (parent && parent.parent_id) {
          depthStats[3]++;
        }
      }
    });
    
    console.log('\n📊 层级深度统计:');
    console.log(`   第1层（根任务）: ${depthStats[1]} 个`);
    console.log(`   第2层（子任务）: ${depthStats[2]} 个`);
    console.log(`   第3层（孙任务）: ${depthStats[3]} 个`);
    
    console.log('\n🎯 适合测试批量更改父任务功能的任务组:');
    console.log('=================================');
    
    // 找到适合测试的任务组 - 有多个子任务的父任务
    const goodTestTargets = tasksWithChildren.filter(parent => {
      const children = tasks.filter(child => child.parent_id === parent.id);
      return children.length >= 2; // 至少有2个子任务
    });
    
    goodTestTargets.forEach(parent => {
      const children = tasks.filter(child => child.parent_id === parent.id);
      console.log(`\n✅ 推荐测试组 - 父任务 ${parent.id}: "${parent.title}"`);
      console.log(`   包含 ${children.length} 个子任务，可用于测试批量更改父任务功能`);
      children.forEach(child => {
        console.log(`   - 子任务 ${child.id}: "${child.title}"`);
      });
    });
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
    if (error.response?.data) {
      console.error('响应详情:', error.response.data);
    }
  }
}

analyzeTasks();