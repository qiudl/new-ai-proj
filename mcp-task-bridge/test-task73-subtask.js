const axios = require('axios');

// System JWT token
const authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwidXNlcl90eXBlIjoic3lzdGVtIiwic3ViIjoiYWRtaW4iLCJleHAiOjE3NTQ3MTkwMTgsIm5iZiI6MTc1NDExNDIxOCwiaWF0IjoxNzU0MTE0MjE4fQ.iBXJyoqj7MQOT6ijQnSQQeiZx-q9-0_SCZ2q4eAB-J8';
const apiBase = 'http://localhost/api/v1';

const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`
};

async function createAndDeleteSubtask() {
    try {
        console.log('🎯 Step 1: 为任务73 "31-02-04：任务详情接口" 创建子任务...');
        
        // 创建子任务
        const createResponse = await axios.post(`${apiBase}/tasks`, {
            title: '测试子任务：API接口参数验证逻辑',
            description: '实现对任务详情接口的输入参数进行严格验证，包括task_id格式检查、权限验证、以及返回数据格式标准化',
            parent_id: 73,
            project_id: 1,
            status: 'pending',
            priority: 'medium'
        }, { headers, proxy: false });
        
        const newTaskId = createResponse.data.data.id;
        console.log(`✅ 子任务创建成功！`);
        console.log(`   任务ID: ${newTaskId}`);
        console.log(`   标题: ${createResponse.data.data.title}`);
        console.log(`   父任务ID: ${createResponse.data.data.parent_id}`);
        console.log(`   状态: ${createResponse.data.data.status}`);
        
        console.log('\n⏳ 等待2秒后删除任务...\n');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('🗑️  Step 2: 调用 delete_task 接口删除刚创建的子任务...');
        
        // 删除任务
        const deleteResponse = await axios.delete(`${apiBase}/tasks/${newTaskId}`, {
            headers,
            proxy: false
        });
        
        console.log(`✅ 任务删除成功！`);
        console.log(`   删除的任务ID: ${newTaskId}`);
        console.log(`   服务器响应:`, deleteResponse.data);
        
        console.log('\n🔍 Step 3: 验证任务确实被删除...');
        
        // 尝试获取已删除的任务（应该返回404）
        try {
            await axios.get(`${apiBase}/tasks/${newTaskId}`, {
                headers,
                proxy: false
            });
            console.log('❌ 错误：任务仍然存在，删除失败！');
        } catch (error) {
            if (error.response?.status === 404) {
                console.log('✅ 验证成功：任务已被彻底删除（返回404）');
            } else {
                console.log(`⚠️  验证时出现其他错误: ${error.response?.status} - ${error.message}`);
            }
        }
        
        console.log('\n🎉 测试完成！任务创建和删除流程执行成功。');
        
    } catch (error) {
        console.error('❌ 操作失败:', error.response?.data || error.message);
        if (error.response?.status) {
            console.error(`   HTTP状态码: ${error.response.status}`);
        }
    }
}

// 执行测试
createAndDeleteSubtask();
