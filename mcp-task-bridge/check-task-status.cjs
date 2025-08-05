// Check what tasks exist and their status
const axios = require('axios');

const apiBase = 'http://localhost:8080/api/v1';
const authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwidXNlcl90eXBlIjoic3lzdGVtIiwic3ViIjoiYWRtaW4iLCJleHAiOjE3NTQ3MTkwMTgsIm5iZiI6MTc1NDExNDIxOCwiaWF0IjoxNzU0MTE0MjE4fQ.iBXJyoqj7MQOT6ijQnSQQeiZx-q9-0_SCZ2q4eAB-J8';

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${authToken}`
};

async function checkTasks() {
  try {
    console.log('🔍 Checking for tasks...');
    
    // Get project 1 tasks
    const response = await axios.get(`${apiBase}/projects/1/tasks`, {
      headers,
      proxy: false
    });
    
    const tasks = response.data.data?.data || [];
    console.log(`📋 Found ${tasks.length} tasks in project 1`);
    
    // Look for tasks around ID 469
    const nearbyTasks = tasks.filter(task => task.id >= 460 && task.id <= 470);
    
    if (nearbyTasks.length > 0) {
      console.log('\n📋 Tasks near ID 469:');
      nearbyTasks.forEach(task => {
        console.log(`- ID ${task.id}: "${task.title}" (${task.status})`);
      });
    }
    
    // Check if task 469 exists specifically
    const task469 = tasks.find(task => task.id === 469);
    if (task469) {
      console.log('\n✅ Task 469 found:');
      console.log(`- Title: ${task469.title}`);
      console.log(`- Status: ${task469.status}`);
      console.log(`- Project ID: ${task469.project_id}`);
    } else {
      console.log('\n❌ Task 469 not found');
      
      // Check highest task ID
      const maxId = Math.max(...tasks.map(t => t.id));
      console.log(`📊 Highest task ID in project 1: ${maxId}`);
      
      // If task 469 doesn't exist, we need to create it
      console.log('\n💡 Since task 469 does not exist, we should create it first');
      
      // Create task 469
      console.log('🚀 Creating task 469...');
      const createResponse = await axios.post(`${apiBase}/projects/1/tasks`, {
        title: '修复全屏模式和PDF导出问题',
        project_id: 1,
        status: 'in_progress',
        description: '用户报告的两个关键问题：1. 全屏模式无滚动条问题 2. PDF导出代码块显示异常',
        custom_fields: {
          priority: 'high'
        }
      }, {
        headers,
        proxy: false
      });
      
      const newTask = createResponse.data.data;
      console.log(`✅ Task created with ID: ${newTask.id}`);
      console.log(`- Title: ${newTask.title}`);
      console.log(`- Status: ${newTask.status}`);
      
      // Create documentation for the new task
      console.log('📝 Creating task documentation...');
      
      const documentContent = `# Task ${newTask.id}: 修复全屏模式和PDF导出问题

## 问题描述

用户报告了两个关键问题需要修复：

### 问题1: 全屏模式无滚动条问题
- **现象**: 全屏模式下没有滚动条，只能显示第一屏内容
- **影响**: 用户无法查看完整的任务内容
- **优先级**: 高

### 问题2: PDF导出代码块显示异常
- **现象**: 导出PDF时，代码段落不能正常显示，只显示背景色而不显示代码内容
- **影响**: 导出的PDF文档缺失关键代码信息
- **优先级**: 高

## 解决方案规划

### 全屏模式修复
1. 检查全屏模式下的CSS样式设置
2. 确保overflow属性正确配置
3. 添加滚动条样式支持

### PDF导出修复  
1. 检查PDF导出时的代码块渲染逻辑
2. 确保代码内容在PDF中正确显示
3. 测试各种代码块格式的导出效果

## 测试计划
- [ ] 测试全屏模式下的滚动功能
- [ ] 测试PDF导出中代码块的正确显示
- [ ] 验证修复后不影响其他功能

## 完成标准
- 全屏模式可以正常滚动查看完整内容
- PDF导出包含完整的代码内容显示
- 现有功能不受影响

## 状态记录
- 任务已创建并开始执行 (${new Date().toISOString()})
- 问题已详细记录和分析
- 准备开始技术调研和修复实施
`;
      
      const docResponse = await axios.put(`${apiBase}/projects/1/tasks/${newTask.id}/document`, {
        content: documentContent
      }, {
        headers,
        proxy: false
      });
      
      console.log('✅ Task documentation created successfully');
      
      console.log(`\n🎯 Task ${newTask.id} Summary:`);
      console.log(`- Task ID: ${newTask.id}`);
      console.log(`- Title: ${newTask.title}`);
      console.log(`- Status: ${newTask.status}`);
      console.log(`- Priority: ${newTask.custom_fields?.priority || 'medium'}`);
      console.log(`- Project ID: ${newTask.project_id}`);
      console.log(`- Documentation: Created`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response?.data) {
      console.error('API Error:', error.response.data);
    }
  }
}

checkTasks();