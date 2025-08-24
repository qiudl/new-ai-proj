// 测试MCP客户端连接问题
console.log('🔧 测试MCP工具连接...');

// 模拟ai-proj工具调用
const testMCPCall = async () => {
    try {
        // 模拟MCP客户端调用
        const result = await new Promise((resolve, reject) => {
            // 这里模拟ai-proj工具的实际行为
            setTimeout(() => {
                // 模拟返回的错误格式
                const errorObj = new Error('Connection failed');
                errorObj.response = { data: { error: 'API Error' } };
                
                resolve({
                    success: false,
                    error: `获取任务列表失败: ${String(errorObj)}`
                });
            }, 100);
        });
        
        console.log('📤 MCP调用结果:', JSON.stringify(result, null, 2));
        
    } catch (error) {
        console.error('❌ MCP调用失败:', error);
    }
};

testMCPCall();

// 让我们尝试使用正确的方式来重新初始化ai-proj工具
console.log('\n💡 建议的修复步骤:');
console.log('1. 重启Claude应用程序以重新加载MCP配置');
console.log('2. 确保使用统一的配置文件');
console.log('3. 验证MCP服务器进程正在运行');
console.log('4. 检查Claude MCP客户端的错误日志');
