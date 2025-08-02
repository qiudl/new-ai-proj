import { TaskMCPServer } from './task-mcp.js';

async function debugApiConnection() {
    const taskServer = new TaskMCPServer();
    
    console.log('🔍 开始调试 MCP 工具连接问题...\n');
    
    // 测试1: 直接调用listTasks
    console.log('📋 测试1: 调用 listTasks()');
    try {
        const result = await taskServer.listTasks(1);
        console.log('✅ listTasks 成功:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('❌ listTasks 失败:', error.message);
        console.error('错误详情:', error);
    }
    
    console.log('\n');
    
    // 测试2: 调用findTaskByName
    console.log('🔍 测试2: 调用 findTaskByName("31-02-04")');
    try {
        const result = await taskServer.findTaskByName('31-02-04');
        console.log('✅ findTaskByName 成功:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('❌ findTaskByName 失败:', error.message);
        console.error('错误详情:', error);
    }
    
    console.log('\n');
    
    // 测试3: 检查具体任务73
    console.log('🎯 测试3: 查找任务ID 73');
    try {
        const result = await taskServer.findTaskById(73);
        console.log('✅ findTaskById(73) 成功:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('❌ findTaskById(73) 失败:', error.message);
        console.error('错误详情:', error);
    }
}

debugApiConnection();
