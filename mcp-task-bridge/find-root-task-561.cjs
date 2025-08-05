const axios = require('axios');

// System JWT token from the task-mcp.js file
const authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwidXNlcl90eXBlIjoic3lzdGVtIiwic3ViIjoiYWRtaW4iLCJleHAiOjE3NTQ3MTkwMTgsIm5iZiI6MTc1NDExNDIxOCwiaWF0IjoxNzU0MTE0MjE4fQ.iBXJyoqj7MQOT6ijQnSQQeiZx-q9-0_SCZ2q4eAB-J8';
const apiBase = 'http://localhost/api/v1';

const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`
};

async function findRootTask561() {
    try {
        console.log('🔍 查找任务561及其层级结构...');
        
        // 获取所有任务来进行分析
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
            
            // 显示所有任务的ID范围
            const taskIds = tasks.map(t => t.id).sort((a, b) => a - b);
            console.log(`📊 当前任务ID范围: ${taskIds[0]} - ${taskIds[taskIds.length - 1]}`);
            console.log(`📋 所有任务ID: ${taskIds.join(', ')}`);
            
            return null;
        }
        
        console.log('\n🎯 找到任务561:');
        console.log('===============');
        console.log(`ID: ${task561.id}`);
        console.log(`标题: "${task561.title}"`);
        console.log(`状态: ${task561.status}`);
        console.log(`项目ID: ${task561.project_id}`);
        console.log(`父任务ID: ${task561.parent_id || '无 (根任务)'}`);
        console.log(`创建时间: ${new Date(task561.created_at).toLocaleString()}`);
        console.log(`更新时间: ${new Date(task561.updated_at).toLocaleString()}`);
        
        if (task561.description) {
            console.log(`描述: ${task561.description}`);
        }
        
        // 如果任务561有父任务，继续向上查找根任务
        let currentTask = task561;
        let hierarchy = [currentTask];
        
        while (currentTask.parent_id) {
            const parentTask = tasks.find(t => t.id === currentTask.parent_id);
            if (!parentTask) {
                console.log(`⚠️  父任务ID ${currentTask.parent_id} 未找到`);
                break;
            }
            hierarchy.unshift(parentTask);
            currentTask = parentTask;
        }
        
        // 显示完整的层级结构
        console.log('\n🌳 任务层级结构:');
        console.log('================');
        hierarchy.forEach((task, level) => {
            const indent = '  '.repeat(level);
            const statusIcon = task.status === 'completed' ? '✅' : task.status === 'in_progress' ? '🚀' : '⏳';
            const levelText = level === 0 ? ' (根任务)' : level === 1 ? ' (子任务)' : ' (孙任务)';
            
            console.log(`${indent}${statusIcon} ID ${task.id}: "${task.title}"${levelText}`);
            console.log(`${indent}   状态: ${task.status}`);
            console.log(`${indent}   创建时间: ${new Date(task.created_at).toLocaleString()}`);
        });
        
        const rootTask = hierarchy[0];
        
        // 查找任务561的所有子任务
        const childTasks = tasks.filter(t => t.parent_id === 561);
        
        console.log('\n👶 任务561的子任务:');
        console.log('==================');
        if (childTasks.length === 0) {
            console.log('❌ 任务561没有子任务');
        } else {
            console.log(`📊 子任务数量: ${childTasks.length}`);
            childTasks.forEach(child => {
                const statusIcon = child.status === 'completed' ? '✅' : child.status === 'in_progress' ? '🚀' : '⏳';
                console.log(`${statusIcon} ID ${child.id}: "${child.title}" [${child.status}]`);
                console.log(`   创建时间: ${new Date(child.created_at).toLocaleString()}`);
            });
        }
        
        // 查找根任务的所有子任务
        if (rootTask && rootTask.id !== 561) {
            const rootChildTasks = tasks.filter(t => t.parent_id === rootTask.id);
            
            console.log(`\n🌲 根任务 ${rootTask.id} 的所有子任务:');
            console.log('===============================');
            console.log(`📊 根任务子任务数量: ${rootChildTasks.length}`);
            
            rootChildTasks.forEach(child => {
                const statusIcon = child.status === 'completed' ? '✅' : child.status === 'in_progress' ? '🚀' : '⏳';
                console.log(`${statusIcon} ID ${child.id}: "${child.title}" [${child.status}]`);
                console.log(`   创建时间: ${new Date(child.created_at).toLocaleString()}`);
                
                // 查找这个子任务的子任务
                const grandchildren = tasks.filter(t => t.parent_id === child.id);
                if (grandchildren.length > 0) {
                    console.log(`   └─ 有 ${grandchildren.length} 个子任务`);
                }
            });
        }
        
        // 推荐结果
        console.log('\n🎯 推荐结果:');
        console.log('============');
        console.log(`✅ 根任务: ID ${rootTask.id} - "${rootTask.title}"`);
        console.log(`   状态: ${rootTask.status}`);
        console.log(`   这是一个适合创建归档管理子任务的父任务`);
        
        if (rootTask.status === 'in_progress') {
            console.log(`   ✅ 推荐使用此根任务作为归档管理功能的父任务`);
        } else if (rootTask.status === 'todo') {
            console.log(`   ⚠️  根任务状态为待开始，可以考虑使用，但建议先开始此任务`);
        } else if (rootTask.status === 'completed') {
            console.log(`   ⚠️  根任务已完成，建议寻找其他进行中的根任务`);
        }
        
        return {
            task561,
            rootTask,
            hierarchy,
            childTasks
        };
        
    } catch (error) {
        console.error('❌ 查找失败:', error.response?.data || error.message);
        return null;
    }
}

// 运行查找
findRootTask561();