const axios = require('axios');

// 测试AI任务生成API
async function testAITaskGeneration() {
    try {
        // 首先获取token
        const loginResponse = await axios.post('http://localhost:8080/api/auth/login', {
            username: 'admin',
            password: 'admin123'
        });
        
        const token = loginResponse.data.token;
        console.log('登录成功，获取到token');
        
        // 准备测试请求
        const request = {
            provider: 'deepseek', // 或者 'openai', 'claude'
            input_text: '为一个电商网站开发购物车功能',
            project_id: 1, // 根据实际项目ID调整
            parent_task_id: null,
            options: {
                max_tasks: 5,
                enable_duplicate_check: true,
                enable_dependency_analysis: true,
                enable_priority_assignment: true,
                enable_time_estimation: true,
                enable_skill_tagging: true
            }
        };
        
        console.log('\n发送AI任务生成请求:');
        console.log(JSON.stringify(request, null, 2));
        
        // 调用AI任务生成API
        const response = await axios.post('http://localhost:8080/api/v1/system/ai-tasks/generate', request, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('\n响应状态:', response.status);
        console.log('\n响应数据:');
        console.log(JSON.stringify(response.data, null, 2));
        
    } catch (error) {
        console.error('\n错误详情:');
        if (error.response) {
            console.error('状态码:', error.response.status);
            console.error('响应数据:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('请求错误:', error.message);
        }
    }
}

// 运行测试
testAITaskGeneration();
