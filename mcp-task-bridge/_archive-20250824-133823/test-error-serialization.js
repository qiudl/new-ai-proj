import { TaskMCPServer } from './task-mcp.js';

// 测试不同类型的错误对象序列化
async function testErrorSerialization() {
    console.log('🔍 测试错误对象的JSON序列化处理...\n');
    
    const taskServer = new TaskMCPServer();
    
    // 测试1: 正常成功的响应
    console.log('📋 测试1: 正常成功响应的序列化');
    try {
        const successResult = await taskServer.listTasks(1);
        console.log('✅ 成功响应类型:', typeof successResult);
        console.log('✅ 成功响应序列化:', JSON.stringify(successResult, null, 2).substring(0, 200) + '...');
    } catch (error) {
        console.error('❌ 意外错误:', error);
    }
    
    // 测试2: 模拟网络错误
    console.log('\n🌐 测试2: 模拟网络错误响应');
    const originalApiBase = taskServer.apiBase;
    taskServer.apiBase = 'http://localhost:9999/api/v1'; // 错误的端口
    
    try {
        const errorResult = await taskServer.listTasks(1);
        console.log('❌ 意外成功:', errorResult);
    } catch (error) {
        console.log('✅ 捕获到错误类型:', typeof error);
        console.log('✅ 错误构造函数:', error.constructor.name);
        console.log('✅ 错误消息:', error.message);
        
        // 测试错误对象的序列化
        try {
            const serialized = JSON.stringify(error);
            console.log('✅ 错误对象直接序列化:', serialized);
        } catch (serError) {
            console.log('❌ 错误对象序列化失败:', serError.message);
        }
        
        // 测试错误对象转换为字符串
        try {
            const stringified = String(error);
            console.log('✅ 错误对象转字符串:', stringified);
        } catch (strError) {
            console.log('❌ 错误对象字符串化失败:', strError.message);
        }
        
        // 测试错误信息提取
        const errorInfo = {
            name: error.name,
            message: error.message,
            stack: error.stack,
            code: error.code,
            response: error.response ? {
                status: error.response.status,
                statusText: error.response.statusText,
                data: error.response.data
            } : undefined
        };
        
        console.log('✅ 提取的错误信息序列化:');
        console.log(JSON.stringify(errorInfo, null, 2));
    }
    
    // 恢复原始配置
    taskServer.apiBase = originalApiBase;
    
    // 测试3: 模拟listTasks的错误处理
    console.log('\n🔧 测试3: 检查TaskMCPServer的错误处理逻辑');
    
    // 检查listTasks方法中的错误处理
    const mockTaskServer = new TaskMCPServer('http://localhost:9999/api/v1');
    
    try {
        const result = await mockTaskServer.listTasks(1);
        console.log('结果类型:', typeof result);
        console.log('结果内容:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.log('捕获到未处理的错误:', error.message);
    }
}

testErrorSerialization();
