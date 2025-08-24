// Start task 469 and document issues
const { spawn } = require('child_process');
const readline = require('readline');

async function startTask469() {
    console.log('🚀 Starting task 469...');
    
    // First, let's start the task
    const startTaskCode = `
const { McpTaskService } = require('./task-mcp');

async function startTask() {
    const taskService = new McpTaskService();
    
    try {
        console.log('Starting task 469...');
        const result = await taskService.start_task({ task_id: 469 });
        console.log('Start task result:', JSON.stringify(result, null, 2));
        
        // Check if task document exists
        console.log('Checking for existing task document...');
        const docResult = await taskService.get_task_document({ task_id: 469 });
        console.log('Document check result:', JSON.stringify(docResult, null, 2));
        
        // If no document exists, create one with the issue details
        if (!docResult.success || !docResult.document) {
            console.log('Creating task documentation...');
            const documentContent = \`# Task 469: 修复全屏模式和PDF导出问题

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
\`;
            
            const createDocResult = await taskService.create_task_document({
                task_id: 469,
                content: documentContent
            });
            console.log('Document creation result:', JSON.stringify(createDocResult, null, 2));
        }
        
    } catch (error) {
        console.error('Error:', error);
    }
}

startTask();
    `;
    
    // Write and execute the code
    require('fs').writeFileSync('/tmp/start-task-469-exec.js', startTaskCode);
    
    const child = spawn('node', ['/tmp/start-task-469-exec.js'], {
        cwd: '/Users/johnqiu/coding/www/projects/new-ai-proj/mcp-task-bridge',
        stdio: 'inherit'
    });
    
    return new Promise((resolve, reject) => {
        child.on('close', (code) => {
            if (code === 0) {
                console.log('✅ Task 469 started and documented successfully');
                resolve();
            } else {
                reject(new Error(`Process exited with code ${code}`));
            }
        });
        
        child.on('error', reject);
    });
}

startTask469().catch(console.error);