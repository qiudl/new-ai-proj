#!/usr/bin/env node

const axios = require('axios');

// 测试AI任务生成修复
async function testAITaskGeneration() {
    console.log('=== 测试AI任务生成修复 ===');
    
    const baseURL = 'http://localhost:8080';
    
    try {
        // 1. 登录获取token
        console.log('1. 登录...');
        const loginResponse = await axios.post(`${baseURL}/api/v1/auth/login`, {
            account: 'admin',
            password: 'password123'
        });
        
        const token = loginResponse.data.data.token;
        console.log('✓ 登录成功');
        
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
        
        // 2. 获取项目列表
        console.log('2. 获取项目列表...');
        const projectsResponse = await axios.get(`${baseURL}/api/v1/projects`, { headers });
        const projects = projectsResponse.data.data;
        
        if (projects.length === 0) {
            console.log('❌ 没有可用的项目');
            return;
        }
        
        const projectId = projects[0].id;
        console.log(`✓ 找到项目: ${projects[0].name} (ID: ${projectId})`);
        
        // 3. 测试AI任务生成
        console.log('3. 测试AI任务生成...');
        const generateRequest = {
            project_id: projectId,
            provider: "deepseek",
            input_text: "开发一个用户注册功能，包括邮箱验证和密码强度检查",
            options: {
                max_tasks: 5,
                enable_duplicate_check: true,
                enable_dependency_analysis: true,
                enable_skill_tagging: true
            }
        };
        
        console.log('发送AI任务生成请求...');
        const generateResponse = await axios.post(
            `${baseURL}/api/v1/ai-task-generator/generate`,
            generateRequest,
            { headers }
        );
        
        console.log('✓ AI任务生成成功!');
        console.log('响应数据:', JSON.stringify(generateResponse.data, null, 2));
        
        if (generateResponse.data.success) {
            console.log(`✓ 成功生成 ${generateResponse.data.data.total_tasks} 个任务`);
            generateResponse.data.data.generated_tasks.forEach((task, index) => {
                console.log(`  任务 ${index + 1}: ${task.title}`);
            });
        } else {
            console.log('❌ 任务生成失败:', generateResponse.data.error);
        }
        
    } catch (error) {
        console.error('❌ 测试失败:', error.response?.data || error.message);
        
        if (error.response?.data?.error?.message) {
            console.error('详细错误:', error.response.data.error.message);
        }
    }
}

// 运行测试
testAITaskGeneration();