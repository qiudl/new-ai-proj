#!/usr/bin/env node

/**
 * 个人计时器403错误完整诊断工具
 * 错误: personalTimerService.ts:210 POST http://localhost/api/v1/user/timer/start-personal 403 (Forbidden)
 * 错误: Failed to start timer: AppError: 权限不足
 */

const axios = require('axios');

async function diagnoseTimer403Issue() {
    console.log('🔍 个人计时器403错误完整诊断');
    console.log('=' .repeat(60));

    const baseURL = 'http://localhost/api/v1';
    const token = process.env.TOKEN;
    
    if (!token) {
        console.log('❌ 请设置TOKEN环境变量');
        console.log('使用方法: TOKEN=your_jwt_token node timer-403-diagnosis.js');
        console.log('\n获取token的方法:');
        console.log('1. 在浏览器开发者工具控制台运行: localStorage.getItem("token")');
        console.log('2. 或者重新登录系统获取新token');
        return;
    }

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    try {
        // Step 1: 验证用户认证状态
        console.log('1️⃣ 验证用户认证状态...');
        console.log('-' .repeat(40));
        
        let userInfo;
        try {
            const userResponse = await axios.get(`${baseURL}/users/profile`, { headers });
            userInfo = userResponse.data.data;
            console.log('✅ 用户认证成功');
            console.log(`   用户ID: ${userInfo.id}`);
            console.log(`   用户名: ${userInfo.username}`);
            console.log(`   角色: ${userInfo.role}`);
            console.log(`   用户类型: ${userInfo.user_type}`);
        } catch (error) {
            console.log('❌ 用户认证失败:', error.response?.data?.message || error.message);
            console.log('请重新登录系统');
            return;
        }

        // Step 2: 检查个人计时任务列表
        console.log('\n2️⃣ 检查个人计时任务列表...');
        console.log('-' .repeat(40));
        
        let userTimerTasks = [];
        try {
            const tasksResponse = await axios.get(`${baseURL}/user/timer-tasks`, { headers });
            userTimerTasks = tasksResponse.data.data?.tasks || [];
            console.log(`✅ 找到 ${userTimerTasks.length} 个个人计时任务`);
            
            if (userTimerTasks.length === 0) {
                console.log('⚠️  您还没有创建任何个人计时任务');
                console.log('这可能是403错误的原因 - 您尝试启动一个不存在的任务');
            } else {
                console.log('📋 您的个人计时任务列表:');
                userTimerTasks.forEach((task, index) => {
                    console.log(`   ${index + 1}. ID: ${task.id}, 标题: ${task.title}, 类别: ${task.category}`);
                });
            }
        } catch (error) {
            console.log('❌ 获取任务列表失败:', error.response?.data?.message || error.message);
        }

        // Step 3: 分析原始错误
        console.log('\n3️⃣ 分析403错误原因...');
        console.log('-' .repeat(40));
        
        console.log('根据后端代码分析，403错误可能的原因:');
        console.log('1. ❌ 任务不存在 - task_id在数据库中不存在');
        console.log('2. ❌ 任务不属于当前用户 - 任务的user_id与当前用户不匹配');
        console.log('3. ❌ 任务已被删除 - deleted_at不为NULL');

        // Step 4: 模拟创建和启动流程
        console.log('\n4️⃣ 测试完整的创建和启动流程...');
        console.log('-' .repeat(40));

        // 4a: 创建一个测试任务
        console.log('📝 创建测试个人计时任务...');
        let testTaskId;
        try {
            const createTaskData = {
                title: `测试计时任务_${Date.now()}`,
                description: '用于调试403错误的测试任务',
                category: 'work',
                color: '#1890ff',
                is_favorite: false
            };
            
            const createResponse = await axios.post(`${baseURL}/user/timer-tasks`, createTaskData, { headers });
            testTaskId = createResponse.data.data?.task?.id;
            console.log(`✅ 成功创建测试任务，ID: ${testTaskId}`);
        } catch (error) {
            console.log('❌ 创建测试任务失败:', error.response?.data?.message || error.message);
            console.log('这表明可能存在权限或认证问题');
        }

        // 4b: 尝试启动新创建的任务
        if (testTaskId) {
            console.log('\n⏰ 尝试启动新创建的任务...');
            try {
                const startTimerData = {
                    task_type: 'personal',
                    task_id: testTaskId,
                    auto_stop_others: true
                };
                
                const startResponse = await axios.post(`${baseURL}/user/timer/start-personal`, startTimerData, { headers });
                console.log('✅ 成功启动计时器!');
                console.log('   任务ID:', startResponse.data.data?.task_id);
                console.log('   任务标题:', startResponse.data.data?.task_title);
                console.log('   状态:', startResponse.data.data?.status);
                
                // 立即停止计时器以清理状态
                console.log('\n⏹️  停止测试计时器...');
                await axios.post(`${baseURL}/user/timer/stop`, {}, { headers });
                console.log('✅ 测试计时器已停止');
                
            } catch (error) {
                console.log('❌ 启动计时器仍然失败:', error.response?.data?.message || error.message);
                console.log('错误详情:', error.response?.data);
            }
        }

        // Step 5: 检查原问题中的task_id
        console.log('\n5️⃣ 检查前端传递的task_id...');
        console.log('-' .repeat(40));
        
        console.log('请检查以下内容:');
        console.log('1. 在MVPTaskDetailTimer.tsx中传递给startTimer的taskId是否正确');
        console.log('2. 该taskId是否是个人计时任务的ID（不是项目任务的ID）');
        console.log('3. 任务是否属于当前登录用户');

        // Step 6: 提供解决方案
        console.log('\n6️⃣ 解决方案...');  
        console.log('-' .repeat(40));
        
        if (userTimerTasks.length === 0) {
            console.log('🔧 立即解决方案:');
            console.log('1. 先创建个人计时任务');
            console.log('2. 使用创建返回的任务ID启动计时器');
            console.log('3. 不要使用项目任务的ID来启动个人计时器');
        } else {
            console.log('🔧 检查以下内容:');
            console.log('1. 确认前端传递的task_id是以下有效ID之一:');
            userTimerTasks.forEach(task => {
                console.log(`   - ${task.id} (${task.title})`);
            });
            console.log('2. 如果使用的是项目任务，请使用 /user/timer/start-project 端点');
        }

        console.log('\n📚 代码修复建议:');
        console.log('1. 在TimerContext.tsx中检查taskId的来源');
        console.log('2. 确保个人任务使用个人计时器端点，项目任务使用项目计时器端点');
        console.log('3. 添加错误处理，当任务不存在时给出明确提示');

    } catch (error) {
        console.log('❌ 诊断过程中发生错误:', error.message);
        if (error.response) {
            console.log('HTTP状态:', error.response.status);
            console.log('错误响应:', error.response.data);
        }
    }
}

// 运行诊断
diagnoseTimer403Issue().catch(console.error);
