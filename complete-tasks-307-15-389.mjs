#!/usr/bin/env node

// Script to complete tasks 307-15 (task 322) and 389 using MCP interface
import { TaskMCPServer } from './mcp-task-bridge/task-mcp.js';

async function completeTasks() {
    console.log('启动任务完成脚本...');
    
    const taskServer = new TaskMCPServer();
    
    try {
        console.log('\n=== 查找相关任务 ===');
        
        // 1. 查找任务322 (子任务307-15: 性能优化和错误处理)
        console.log('查找任务322 (子任务307-15: 性能优化和错误处理)...');
        const task322Search = await taskServer.findTaskByName('子任务307-15');
        console.log('任务322搜索结果:', JSON.stringify(task322Search, null, 2));
        
        // 2. 查找任务389 (MCP桥接器项目收尾工作)
        console.log('\n查找任务389 (MCP桥接器项目收尾工作)...');
        const task389Search = await taskServer.findTaskByName('MCP桥接器项目收尾工作');
        console.log('任务389搜索结果:', JSON.stringify(task389Search, null, 2));
        
        console.log('\n=== 完成任务 ===');
        
        // 3. 完成任务322 (如果找到)
        if (task322Search.success && task322Search.data.length > 0) {
            const task322 = task322Search.data[0];
            console.log(`\n尝试完成任务${task322.id} (子任务307-15: 性能优化和错误处理)...`);
            
            const result322 = await taskServer.completeTask(task322.id);
            console.log('任务322完成结果:', JSON.stringify(result322, null, 2));
        } else {
            console.log('未找到任务322 (子任务307-15)');
        }
        
        // 4. 完成任务389 (如果找到)
        if (task389Search.success && task389Search.data.length > 0) {
            const task389 = task389Search.data[0];
            console.log(`\n尝试完成任务${task389.id} (MCP桥接器项目收尾工作)...`);
            
            const result389 = await taskServer.completeTask(task389.id);
            console.log('任务389完成结果:', JSON.stringify(result389, null, 2));
        } else {
            console.log('未找到任务389 (MCP桥接器项目收尾工作)');
        }
        
        console.log('\n=== 验证任务状态 ===');
        
        // 5. 验证完成状态
        console.log('重新查询任务状态验证...');
        const verifyTask322 = await taskServer.findTaskByName('子任务307-15');
        const verifyTask389 = await taskServer.findTaskByName('MCP桥接器项目收尾工作');
        
        console.log('\n任务322最终状态:', JSON.stringify(verifyTask322, null, 2));
        console.log('\n任务389最终状态:', JSON.stringify(verifyTask389, null, 2));
        
        console.log('\n✅ 任务完成脚本执行完毕');
        
    } catch (error) {
        console.error('❌ 脚本执行出错:', error);
        process.exit(1);
    }
}

// 运行脚本
completeTasks().catch(error => {
    console.error('❌ 致命错误:', error);
    process.exit(1);
});