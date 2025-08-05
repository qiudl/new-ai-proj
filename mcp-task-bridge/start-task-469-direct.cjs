// Direct start task 469 and create documentation
const axios = require('axios');

const apiBase = 'http://localhost:8080/api/v1';
const authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwidXNlcl90eXBlIjoic3lzdGVtIiwic3ViIjoiYWRtaW4iLCJleHAiOjE3NTQ3MTkwMTgsIm5iZiI6MTc1NDExNDIxOCwiaWF0IjoxNzU0MTE0MjE4fQ.iBXJyoqj7MQOT6ijQnSQQeiZx-q9-0_SCZ2q4eAB-J8';

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${authToken}`
};

async function findTaskById(id) {
  try {
    // Try project 1 first
    const response1 = await axios.get(`${apiBase}/projects/1/tasks`, {
      headers,
      proxy: false
    });
    
    const tasks1 = response1.data.data?.data || [];
    const task1 = tasks1.find(t => t.id === id);
    
    if (task1) {
      return task1;
    }
    
    // Try other projects
    const projectsResponse = await axios.get(`${apiBase}/projects`, {
      headers,
      proxy: false
    });
    
    const projects = projectsResponse.data.data?.data || [];
    
    for (const project of projects) {
      if (project.id === 1) continue;
      
      try {
        const tasksResponse = await axios.get(`${apiBase}/projects/${project.id}/tasks`, {
          headers,
          proxy: false
        });
        
        const tasks = tasksResponse.data.data?.data || [];
        const task = tasks.find(t => t.id === id);
        
        if (task) {
          return task;
        }
      } catch (projectError) {
        console.error(`Warning: Cannot get tasks for project ${project.id}: ${projectError.message}`);
      }
    }
    
    throw new Error(`Task ID ${id} not found`);
  } catch (error) {
    throw new Error(`Failed to find task: ${error.message}`);
  }
}

async function startTask469() {
  try {
    console.log('🚀 Starting task 469...');
    
    // Find task 469
    const task = await findTaskById(469);
    console.log(`Found task: "${task.title}" (status: ${task.status})`);
    
    // Start the task (update status to in_progress)
    const updateResponse = await axios.put(`${apiBase}/projects/${task.project_id}/tasks/469`, {
      title: task.title,
      project_id: task.project_id,
      status: 'in_progress',
      description: task.description,
      parent_id: task.parent_id,
      custom_fields: task.custom_fields
    }, {
      headers,
      proxy: false
    });
    
    console.log('✅ Task 469 started successfully');
    
    // Check if task document exists
    console.log('📄 Checking for existing task document...');
    let hasDocument = false;
    
    try {
      const docResponse = await axios.get(`${apiBase}/projects/${task.project_id}/tasks/469/document`, {
        headers,
        proxy: false
      });
      
      if (docResponse.data.data && docResponse.data.data.content) {
        console.log('📄 Task document already exists');
        hasDocument = true;
      }
    } catch (docError) {
      if (docError.response?.status === 404) {
        console.log('📄 No existing document found');
        hasDocument = false;
      } else {
        throw docError;
      }
    }
    
    // Create documentation if it doesn't exist
    if (!hasDocument) {
      console.log('📝 Creating task documentation...');
      
      const documentContent = `# Task 469: 修复全屏模式和PDF导出问题

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
- 任务已开始执行 (${new Date().toISOString()})
- 问题已详细记录和分析
`;
      
      const createDocResponse = await axios.put(`${apiBase}/projects/${task.project_id}/tasks/469/document`, {
        content: documentContent
      }, {
        headers,
        proxy: false
      });
      
      console.log('✅ Task documentation created successfully');
    }
    
    console.log('\n🎯 Task 469 Summary:');
    console.log(`- Task ID: 469`);
    console.log(`- Title: ${task.title}`);
    console.log(`- Status: in_progress`);
    console.log(`- Project ID: ${task.project_id}`);
    console.log(`- Documentation: ${hasDocument ? 'Already exists' : 'Created'}`);
    
    console.log('\n📋 Next Steps:');
    console.log('1. 检查前端全屏模式CSS设置');
    console.log('2. 分析PDF导出代码块渲染问题');
    console.log('3. 实施修复方案');
    console.log('4. 进行测试验证');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response?.data) {
      console.error('API Error:', error.response.data);
    }
  }
}

startTask469();