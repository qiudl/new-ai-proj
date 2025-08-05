const axios = require('axios');

const authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwidXNlcl90eXBlIjoic3lzdGVtIiwic3ViIjoiYWRtaW4iLCJleHAiOjE3NTQ3MTkwMTgsIm5iZiI6MTc1NDExNDIxOCwiaWF0IjoxNzU0MTE0MjE4fQ.iBXJyoqj7MQOT6ijQnSQQeiZx-q9-0_SCZ2q4eAB-J8';
const apiBase = 'http://localhost/api/v1';

const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`
};

async function findActualRootTasks() {
    try {
        console.log('🔍 查找项目1中的实际根任务...');
        
        const response = await axios.get(`${apiBase}/projects/1/tasks`, {
            headers,
            proxy: false
        });
        
        const tasks = response.data.data?.data || [];
        console.log(`📋 总任务数: ${tasks.length}`);
        
        if (tasks.length === 0) {
            console.log('❌ 项目1中没有任务');
            return null;
        }
        
        // 分析任务结构
        const rootTasks = tasks.filter(task => !task.parent_id);
        const childTasks = tasks.filter(task => task.parent_id);
        
        console.log(`\n📊 任务结构统计:`);
        console.log(`根任务数量: ${rootTasks.length}`);
        console.log(`子任务数量: ${childTasks.length}`);
        
        // 显示所有任务的parent_id信息
        console.log('\n🔍 所有任务的父子关系:');
        tasks.forEach(task => {
            const statusIcon = task.status === 'completed' ? '✅' : task.status === 'in_progress' ? '🚀' : '⏳';
            const parentInfo = task.parent_id ? `(父任务: ${task.parent_id})` : '(根任务)';
            console.log(`${statusIcon} ID ${task.id}: "${task.title}" ${parentInfo}`);
        });
        
        // 检查不存在的parent_id
        const uniqueParentIds = [...new Set(childTasks.map(t => t.parent_id))];
        const existingTaskIds = tasks.map(t => t.id);
        const missingParentIds = uniqueParentIds.filter(pid => !existingTaskIds.includes(pid));
        
        if (missingParentIds.length > 0) {
            console.log('\n⚠️ 发现孤儿任务 (父任务不存在):');
            missingParentIds.forEach(missingId => {
                const orphanTasks = childTasks.filter(t => t.parent_id === missingId);
                console.log(`   缺失的父任务ID: ${missingId}`);
                orphanTasks.forEach(orphan => {
                    console.log(`   └─ 孤儿任务: ID ${orphan.id} - "${orphan.title}"`);
                });
            });
        }
        
        if (rootTasks.length > 0) {
            console.log('\n🌳 根任务详情:');
            rootTasks.forEach(rootTask => {
                const statusIcon = rootTask.status === 'completed' ? '✅' : rootTask.status === 'in_progress' ? '🚀' : '⏳';
                console.log(`\n${statusIcon} 根任务 ID ${rootTask.id}:`);
                console.log(`   标题: "${rootTask.title}"`);
                console.log(`   状态: ${rootTask.status}`);
                console.log(`   创建时间: ${new Date(rootTask.created_at).toLocaleString()}`);
                
                if (rootTask.description) {
                    console.log(`   描述: ${rootTask.description.substring(0, 200)}...`);
                }
                
                // 查找此根任务的子任务
                const directChildren = tasks.filter(t => t.parent_id === rootTask.id);
                if (directChildren.length > 0) {
                    console.log(`   子任务数量: ${directChildren.length}`);
                    directChildren.forEach(child => {
                        const childStatusIcon = child.status === 'completed' ? '✅' : child.status === 'in_progress' ? '🚀' : '⏳';
                        console.log(`   └─ ${childStatusIcon} ${child.id}: "${child.title}"`);
                    });
                } else {
                    console.log(`   子任务数量: 0`);
                }
            });
        } else {
            console.log('\n❌ 没有找到根任务');
            console.log('所有任务都是子任务，但它们的父任务不在当前数据中');
        }
        
        // 寻找适合的归档管理根任务
        console.log('\n🎯 推荐用于归档管理功能的任务:');
        if (rootTasks.length > 0) {
            // 优先选择进行中的根任务
            const inProgressRoots = rootTasks.filter(t => t.status === 'in_progress');
            const todoRoots = rootTasks.filter(t => t.status === 'todo');
            
            if (inProgressRoots.length > 0) {
                const recommended = inProgressRoots[0];
                console.log(`✅ 推荐根任务: ID ${recommended.id} - "${recommended.title}"`);
                console.log(`   状态: ${recommended.status} (进行中，适合添加子任务)`);
                console.log(`   建议在此任务下创建归档管理相关的子任务`);
            } else if (todoRoots.length > 0) {
                const recommended = todoRoots[0];
                console.log(`⚠️ 备选根任务: ID ${recommended.id} - "${recommended.title}"`);
                console.log(`   状态: ${recommended.status} (待开始，建议先开始此任务再添加子任务)`);
            } else {
                console.log(`⚠️ 所有根任务都已完成，建议创建新的根任务用于归档管理功能`);
            }
        } else {
            console.log(`💡 建议:`);
            console.log(`   1. 创建一个新的根任务专门用于归档管理功能开发`);
            console.log(`   2. 或者检查其他项目中是否有合适的根任务`);
        }
        
        return {
            tasks,
            rootTasks,
            childTasks,
            missingParentIds,
            totalTasks: tasks.length
        };
        
    } catch (error) {
        console.error('❌ 查找失败:', error.response?.data || error.message);
        return null;
    }
}

findActualRootTasks();