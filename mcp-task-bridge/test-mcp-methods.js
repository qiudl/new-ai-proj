import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { TaskMCPServer } from './task-mcp.js';

// 创建一个简单的测试方法
const taskServer = new TaskMCPServer();

async function testMethods() {
    console.log('🔧 直接测试MCP方法...\n');
    
    // 测试1: findTaskByName
    console.log('🔍 测试findTaskByName...');
    try {
        const result = await taskServer.findTaskByName('31-02-04');
        console.log('✅ findTaskByName成功:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('❌ findTaskByName失败:', error);
    }
    
    console.log('\n');
    
    // 测试2: createSubTask (模拟创建测试子任务)
    console.log('🏗️ 测试createSubTask for task 73...');
    try {
        const result = await taskServer.createSubTask(73, '测试子任务：API接口参数验证逻辑');
        console.log('✅ createSubTask成功:', JSON.stringify(result, null, 2));
        
        // 如果创建成功，记住任务ID用于删除
        if (result.success && result.id) {
            console.log(`\n🗑️ 现在删除刚创建的任务 ${result.id}...`);
            
            // 等待一秒
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // 删除任务
            const deleteResult = await taskServer.deleteTask(result.id);
            console.log('✅ deleteTask结果:', JSON.stringify(deleteResult, null, 2));
        }
        
    } catch (error) {
        console.error('❌ createSubTask失败:', error);
    }
}

testMethods();
