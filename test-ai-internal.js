#!/usr/bin/env node

const axios = require('axios');

// 使用容器内网络测试AI任务生成修复
async function testAITaskGenerationInternal() {
    console.log('=== 测试AI任务生成修复（容器内网络）===');
    
    const baseURL = 'http://go_backend:8080';
    
    try {
        // 1. 登录获取token
        console.log('1. 登录...');
        const loginResponse = await axios.post(`${baseURL}/api/v1/auth/login`, {
            username: 'admin',
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
        console.log('项目响应:', JSON.stringify(projectsResponse.data, null, 2));
        
        const projects = projectsResponse.data.data?.data || projectsResponse.data.data || projectsResponse.data;
        
        if (!projects || projects.length === 0) {
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
            input_text: "开发一个简单的用户登录功能，包括表单验证",
            options: {
                max_tasks: 3,
                enable_duplicate_check: true,
                enable_dependency_analysis: false,
                enable_skill_tagging: false
            }
        };
        
        console.log('发送AI任务生成请求...');
        const generateResponse = await axios.post(
            `${baseURL}/api/v1/system/ai-tasks/generate`,
            generateRequest,
            { headers, timeout: 30000 }
        );
        
        console.log('✓ AI任务生成成功!');
        console.log('响应状态:', generateResponse.status);
        console.log('响应数据:', JSON.stringify(generateResponse.data, null, 2));
        
        if (generateResponse.data.success) {
            console.log(`✓ 成功生成 ${generateResponse.data.data.total_tasks} 个任务`);
            generateResponse.data.data.generated_tasks.forEach((task, index) => {
                console.log(`  任务 ${index + 1}: ${task.title}`);
                console.log(`    描述: ${task.description.substring(0, 100)}...`);
                console.log(`    优先级: ${task.priority}, 预估时间: ${task.estimated_hours}小时`);
            });
        } else {
            console.log('❌ 任务生成失败:', generateResponse.data.error);
        }
        
    } catch (error) {
        console.error('❌ 测试失败:');
        if (error.response) {
            console.error('状态码:', error.response.status);
            console.error('响应数据:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('错误信息:', error.message);
        }
    }
}

// 运行测试
testAITaskGenerationInternal();