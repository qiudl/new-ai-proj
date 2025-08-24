const axios = require('axios');

const authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwidXNlcl90eXBlIjoic3lzdGVtIiwic3ViIjoiYWRtaW4iLCJleHAiOjE3NTQ3MTkwMTgsIm5iZiI6MTc1NDExNDIxOCwiaWF0IjoxNzU0MTE0MjE4fQ.iBXJyoqj7MQOT6ijQnSQQeiZx-q9-0_SCZ2q4eAB-J8';
const apiBase = 'http://localhost/api/v1';

const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`
};

async function findTask561AndRoot() {
    try {
        console.log('🔍 查找任务561及其根任务...');
        
        const response = await axios.get(`${apiBase}/projects/1/tasks`, {
            headers,
            proxy: false
        });
        
        const tasks = response.data.data?.data || [];
        console.log(`📋 总任务数: ${tasks.length}`);
        
        // 查找任务561
        const task561 = tasks.find(t => t.id === 561);
        
        if (!task561) {
            console.log('❌ 任务ID 561 未找到');
            
            // 显示所有任务的ID
            const taskIds = tasks.map(t => t.id).sort((a, b) => a - b);
            console.log(`📊 所有任务ID: ${taskIds.join(', ')}`);
            return null;
        }
        
        console.log('\n✅ 找到任务561:');
        console.log(`ID: ${task561.id}`);
        console.log(`标题: "${task561.title}"`);
        console.log(`状态: ${task561.status}`);
        console.log(`父任务ID: ${task561.parent_id || '无(根任务)'}`);
        console.log(`创建时间: ${new Date(task561.created_at).toLocaleString()}`);
        
        if (task561.description) {
            console.log(`描述: ${task561.description.substring(0, 200)}...`);
        }
        
        // 查找根任务
        let rootTask = task561;
        let level = 0;
        const hierarchy = [task561];
        
        while (rootTask.parent_id) {
            const parentTask = tasks.find(t => t.id === rootTask.parent_id);
            if (!parentTask) {
                console.log(`⚠️ 父任务ID ${rootTask.parent_id} 未找到`);
                break;
            }
            hierarchy.unshift(parentTask);
            rootTask = parentTask;
            level++;
        }
        
        console.log('\n🌳 层级结构:');
        hierarchy.forEach((task, index) => {
            const indent = '  '.repeat(index);
            const statusIcon = task.status === 'completed' ? '✅' : task.status === 'in_progress' ? '🚀' : '⏳';
            console.log(`${indent}${statusIcon} ID ${task.id}: "${task.title}"`);
        });
        
        console.log('\n🎯 推荐结果:');
        console.log(`根任务: ID ${rootTask.id} - "${rootTask.title}"`);
        console.log(`状态: ${rootTask.status}`);
        console.log(`这是适合创建归档管理子任务的父任务`);
        
        return {
            task561,
            rootTask,
            hierarchy
        };
        
    } catch (error) {
        console.error('❌ 查找失败:', error.response?.data || error.message);
        return null;
    }
}

findTask561AndRoot();