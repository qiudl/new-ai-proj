#!/usr/bin/env node

const axios = require('axios');

// 测试AI批量导入功能
async function testAIBulkImport() {
    console.log('=== 测试AI批量导入功能 ===');
    
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
        const projects = projectsResponse.data.data?.data || projectsResponse.data.data || projectsResponse.data;
        
        if (!projects || projects.length === 0) {
            console.log('❌ 没有可用的项目');
            return;
        }
        
        const projectId = projects[0].id;
        console.log(`✓ 找到项目: ${projects[0].name} (ID: ${projectId})`);
        
        // 3. 测试AI批量导入
        console.log('3. 测试AI批量导入...');
        const importRequest = {
            provider: "deepseek",
            input_text: "开发一个用户权限管理模块，包括角色分配和权限验证",
            parent_task_id: null,
            generation_options: {
                max_tasks: 4,
                enable_duplicate_check: true,
                enable_dependency_analysis: true,
                enable_priority_assignment: true,
                enable_time_estimation: true,
                enable_skill_tagging: true
            },
            import_options: {
                auto_import: true,
                validate_first: true,
                create_in_batches: false,
                batch_size: 10
            }
        };
        
        console.log('发送AI批量导入请求...');
        console.log('请求数据:', JSON.stringify(importRequest, null, 2));
        
        const importResponse = await axios.post(
            `${baseURL}/api/v1/projects/${projectId}/tasks/ai-bulk-import`,
            importRequest,
            { headers, timeout: 60000 }
        );
        
        console.log('✓ AI批量导入请求成功!');
        console.log('响应状态:', importResponse.status);
        console.log('响应数据:', JSON.stringify(importResponse.data, null, 2));
        
        if (importResponse.data.success) {
            const result = importResponse.data.data;
            console.log(`\n📊 导入结果统计:`);
            console.log(`  生成任务数: ${result.total_generated}`);
            console.log(`  导入成功数: ${result.total_imported || 0}`);
            console.log(`  导入失败数: ${result.total_failed || 0}`);
            console.log(`  处理时间: ${result.processing_time_ms}ms`);
            
            // 显示生成的任务
            if (result.generation_result && result.generation_result.generated_tasks) {
                console.log(`\n📋 生成的任务:`);
                result.generation_result.generated_tasks.forEach((task, index) => {
                    console.log(`  ${index + 1}. ${task.title}`);
                    console.log(`     描述: ${task.description.substring(0, 80)}...`);
                    console.log(`     优先级: ${task.priority}, 预估: ${task.estimated_hours}小时`);
                    console.log(`     标签: ${task.tags ? task.tags.join(', ') : '无'}`);
                });
            }
            
            // 显示导入的任务
            if (result.imported_tasks && result.imported_tasks.length > 0) {
                console.log(`\n✅ 成功导入的任务:`);
                result.imported_tasks.forEach((task, index) => {
                    console.log(`  ${index + 1}. ${task.title} (ID: ${task.id})`);
                    console.log(`     状态: ${task.status}`);
                    console.log(`     项目ID: ${task.project_id}`);
                });
            }
            
            // 显示失败的任务
            if (result.failed_tasks && result.failed_tasks.length > 0) {
                console.log(`\n❌ 导入失败的任务:`);
                result.failed_tasks.forEach((task, index) => {
                    console.log(`  ${index + 1}. ${task.title}`);
                });
            }
            
        } else {
            console.log('❌ AI批量导入失败:', importResponse.data.error);
        }
        
        // 4. 验证任务是否成功创建到数据库
        console.log('\n4. 验证任务是否成功创建...');
        const tasksResponse = await axios.get(`${baseURL}/api/v1/projects/${projectId}/tasks`, { headers });
        
        if (tasksResponse.data.success) {
            const tasks = tasksResponse.data.data.data || tasksResponse.data.data;
            console.log(`✓ 项目当前任务总数: ${tasks.length}`);
            
            // 查找最近创建的任务
            const recentTasks = tasks
                .filter(task => task.custom_fields?.ai_generated === true)
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .slice(0, 5);
                
            if (recentTasks.length > 0) {
                console.log(`\n🤖 最近AI生成的任务 (前5个):`);
                recentTasks.forEach((task, index) => {
                    const createdTime = new Date(task.created_at).toLocaleString();
                    console.log(`  ${index + 1}. ${task.title} (${createdTime})`);
                    console.log(`     ID: ${task.id}, 状态: ${task.status}`);
                    if (task.custom_fields?.ai_confidence) {
                        console.log(`     AI置信度: ${task.custom_fields.ai_confidence}`);
                    }
                });
            } else {
                console.log('⚠️ 没有找到AI生成的任务');
            }
        }
        
    } catch (error) {
        console.error('❌ 测试失败:');
        if (error.response) {
            console.error('状态码:', error.response.status);
            console.error('响应数据:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('错误信息:', error.message);
        }
        
        // 如果是网络错误，提供调试建议
        if (error.code === 'ECONNREFUSED') {
            console.error('\n🔍 调试建议:');
            console.error('1. 检查Docker容器是否正常运行: docker-compose ps');
            console.error('2. 检查后端服务日志: docker-compose logs backend');
            console.error('3. 确认网络连接正常');
        }
    }
}

// 运行测试
testAIBulkImport();