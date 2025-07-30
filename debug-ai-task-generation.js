const axios = require('axios');

// 测试AI任务生成并调试JSON解析问题
async function debugAITaskGeneration() {
    try {
        console.log('========== AI任务生成调试开始 ==========\n');
        
        // 1. 登录获取token
        console.log('1. 正在登录...');
        const loginResponse = await axios.post('http://localhost:8080/api/auth/login', {
            username: 'admin',
            password: 'admin123'
        });
        
        const token = loginResponse.data.token;
        console.log('✓ 登录成功，获取到token\n');
        
        // 2. 测试AI配置是否存在
        console.log('2. 检查AI配置...');
        try {
            const configResponse = await axios.get('http://localhost:8080/api/v1/system/ai-config', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            console.log('✓ AI配置状态:');
            console.log(JSON.stringify(configResponse.data, null, 2));
        } catch (error) {
            console.log('✗ 无法获取AI配置:', error.message);
        }
        
        // 3. 测试AI任务生成 - 简单请求
        console.log('\n3. 测试简单的AI任务生成请求...');
        const simpleRequest = {
            provider: 'deepseek',
            input_text: '创建一个用户登录功能',
            options: {
                max_tasks: 3,
                enable_duplicate_check: false,
                enable_dependency_analysis: false,
                enable_priority_assignment: true,
                enable_time_estimation: true,
                enable_skill_tagging: false
            }
        };
        
        console.log('请求内容:');
        console.log(JSON.stringify(simpleRequest, null, 2));
        
        try {
            const response = await axios.post(
                'http://localhost:8080/api/v1/system/ai-tasks/generate', 
                simpleRequest,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    validateStatus: function (status) {
                        return true; // 接受所有状态码
                    }
                }
            );
            
            console.log('\n响应状态码:', response.status);
            console.log('响应头:', response.headers);
            console.log('\n响应内容:');
            console.log(JSON.stringify(response.data, null, 2));
            
            // 如果是错误响应，尝试获取更多信息
            if (!response.data.success) {
                console.log('\n错误详情:');
                console.log('- 错误代码:', response.data.error?.code);
                console.log('- 错误消息:', response.data.error?.message);
                console.log('- 时间戳:', response.data.timestamp);
            }
            
        } catch (error) {
            console.error('\n请求失败:', error.message);
            if (error.response) {
                console.error('响应数据:', error.response.data);
            }
        }
        
        // 4. 直接测试DeepSeek API
        console.log('\n4. 直接测试DeepSeek API...');
        try {
            const deepseekResponse = await axios.post(
                'https://api.deepseek.com/v1/chat/completions',
                {
                    model: 'deepseek-chat',
                    messages: [{
                        role: 'user',
                        content: '请返回JSON格式：{"tasks": [{"title": "测试任务", "description": "测试描述", "priority": "medium", "estimated_hours": 4, "tags": [], "dependencies": [], "confidence": 0.9}]}'
                    }],
                    temperature: 0.3,
                    max_tokens: 1000
                },
                {
                    headers: {
                        'Authorization': 'Bearer sk-b6c8b9260bdb4cd4bb7252e010540277',
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            console.log('✓ DeepSeek API响应成功');
            console.log('响应内容:', JSON.stringify(deepseekResponse.data, null, 2));
            
            // 检查响应格式
            if (deepseekResponse.data.choices && deepseekResponse.data.choices[0]) {
                const content = deepseekResponse.data.choices[0].message.content;
                console.log('\nAI返回的内容:');
                console.log(content);
                
                // 尝试解析JSON
                try {
                    // 尝试提取JSON部分
                    const jsonMatch = content.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        const jsonStr = jsonMatch[0];
                        const parsed = JSON.parse(jsonStr);
                        console.log('\n成功解析的JSON:');
                        console.log(JSON.stringify(parsed, null, 2));
                    } else {
                        console.log('\n无法从响应中提取JSON');
                    }
                } catch (parseError) {
                    console.log('\nJSON解析失败:', parseError.message);
                }
            }
            
        } catch (error) {
            console.error('\nDeepSeek API测试失败:', error.message);
        }
        
        console.log('\n========== 调试结束 ==========');
        
    } catch (error) {
        console.error('\n发生错误:', error);
    }
}

// 运行调试
debugAITaskGeneration();
