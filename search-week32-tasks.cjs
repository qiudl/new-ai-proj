const axios = require('axios');

// System JWT token from the task-mcp.js file
const authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwidXNlcl90eXBlIjoic3lzdGVtIiwic3ViIjoiYWRtaW4iLCJleHAiOjE3NTQ3MTkwMTgsIm5iZiI6MTc1NDExNDIxOCwiaWF0IjoxNzU0MTE0MjE4fQ.iBXJyoqj7MQOT6ijQnSQQeiZx-q9-0_SCZ2q4eAB-J8';
const apiBase = 'http://localhost/api/v1';

const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`
};

async function searchWeek32Tasks() {
    try {
        console.log('🔍 正在查询项目1中的所有任务...');
        
        const response = await axios.get(`${apiBase}/projects/1/tasks`, {
            headers,
            proxy: false
        });
        
        const allTasks = response.data.data?.data || [];
        console.log(`📊 项目1中共有 ${allTasks.length} 个任务`);
        
        // 查找32周相关的任务
        const week32Keywords = ['32周', '32', 'week32', 'week 32', '系统优化', '优化', 'optimization', '第32周'];
        
        const week32Tasks = allTasks.filter(task => {
            const title = task.title ? task.title.toLowerCase() : '';
            const description = task.description ? task.description.toLowerCase() : '';
            const hasKeyword = week32Keywords.some(keyword => 
                title.includes(keyword.toLowerCase()) || description.includes(keyword.toLowerCase())
            );
            return hasKeyword;
        });
        
        console.log('\n🎯 查找32周相关任务:');
        console.log('===================');
        if (week32Tasks.length > 0) {
            week32Tasks.forEach(task => {
                const parentInfo = task.parent_id ? ` (子任务, 父任务ID: ${task.parent_id})` : ' (根任务)';
                const statusIcon = task.status === 'completed' ? '✅' : task.status === 'in_progress' ? '🚀' : '⏳';
                console.log(`${statusIcon} 任务${task.id}: ${task.title}`);
                console.log(`   状态: ${task.status}, 项目ID: ${task.project_id}${parentInfo}`);
                console.log(`   创建时间: ${new Date(task.created_at).toLocaleString()}`);
                if (task.description) {
                    console.log(`   描述: ${task.description.substring(0, 150)}...`);
                }
                console.log('');
            });
        } else {
            console.log('❌ 未找到32周相关的任务');
        }
        
        // 查找根任务（没有parent_id的任务）
        console.log('\n🌳 查找所有根任务（顶级任务）:');
        console.log('==============================');
        
        const rootTasks = allTasks.filter(task => !task.parent_id);
        console.log(`📊 找到 ${rootTasks.length} 个根任务`);
        
        // 按创建时间倒序排列，显示最近的根任务
        rootTasks.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        console.log('\n📅 最近的根任务 (前20个):');
        rootTasks.slice(0, 20).forEach((task, index) => {
            const statusIcon = task.status === 'completed' ? '✅' : task.status === 'in_progress' ? '🚀' : '⏳';
            console.log(`${statusIcon} ${index + 1}. 任务${task.id}: ${task.title}`);
            console.log(`   状态: ${task.status}, 创建时间: ${new Date(task.created_at).toLocaleString()}`);
            if (task.description) {
                console.log(`   描述: ${task.description.substring(0, 100)}...`);
            }
            console.log('');
        });
        
        // 查找包含"优化"、"系统"、"Bug"关键词的任务
        console.log('\n🔧 查找系统优化/Bug修复相关的任务:');
        console.log('=================================');
        const optimizationKeywords = ['优化', 'optimization', '系统', 'system', 'bug', 'Bug', 'BUG', '修复', 'fix', 'Fix'];
        
        const optimizationTasks = allTasks.filter(task => {
            const title = task.title ? task.title.toLowerCase() : '';
            const description = task.description ? task.description.toLowerCase() : '';
            return optimizationKeywords.some(keyword => 
                title.includes(keyword.toLowerCase()) || description.includes(keyword.toLowerCase())
            );
        });
        
        // 只显示根任务
        const optimizationRootTasks = optimizationTasks.filter(task => !task.parent_id);
        optimizationRootTasks.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        console.log(`📊 找到 ${optimizationRootTasks.length} 个优化相关的根任务:`);
        optimizationRootTasks.slice(0, 10).forEach(task => {
            const statusIcon = task.status === 'completed' ? '✅' : task.status === 'in_progress' ? '🚀' : '⏳';
            console.log(`${statusIcon} 任务${task.id}: ${task.title}`);
            console.log(`   状态: ${task.status}, 创建时间: ${new Date(task.created_at).toLocaleString()}`);
            if (task.description) {
                console.log(`   描述: ${task.description.substring(0, 100)}...`);
            }
            console.log('');
        });
        
        // 查找包含"周"字的根任务
        console.log('\n📅 查找包含"周"的根任务:');
        console.log('========================');
        const weekKeywords = ['周', 'week', '第', '本周', '上周', '下周'];
        const weekTasks = rootTasks.filter(task => {
            const title = task.title ? task.title.toLowerCase() : '';
            const description = task.description ? task.description.toLowerCase() : '';
            return weekKeywords.some(keyword => title.includes(keyword.toLowerCase()) || description.includes(keyword.toLowerCase()));
        });
        
        weekTasks.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        console.log(`📊 找到 ${weekTasks.length} 个周相关的根任务:`);
        weekTasks.slice(0, 10).forEach((task, index) => {
            const statusIcon = task.status === 'completed' ? '✅' : task.status === 'in_progress' ? '🚀' : '⏳';
            console.log(`${statusIcon} ${index + 1}. 任务${task.id}: ${task.title}`);
            console.log(`   状态: ${task.status}, 创建时间: ${new Date(task.created_at).toLocaleString()}`);
            if (task.description) {
                console.log(`   描述: ${task.description.substring(0, 100)}...`);
            }
            console.log('');
        });
        
        // 总结推荐
        console.log('\n💡 推荐结果:');
        console.log('============');
        
        // 首先检查是否有32周的根任务
        const week32RootTasks = week32Tasks.filter(task => !task.parent_id);
        
        if (week32RootTasks.length > 0) {
            console.log('✅ 找到32周相关的根任务，推荐使用:');
            week32RootTasks.forEach(task => {
                console.log(`   📋 任务${task.id}: ${task.title} (状态: ${task.status})`);
            });
        } else if (week32Tasks.length > 0) {
            console.log('⚠️ 找到32周相关任务，但都不是根任务。相关的子任务:');
            week32Tasks.forEach(task => {
                console.log(`   📋 任务${task.id}: ${task.title} (父任务ID: ${task.parent_id})`);
            });
            console.log('\n💡 建议查看这些任务的父任务，或创建新的32周根任务');
        } else if (weekTasks.length > 0) {
            console.log('💡 建议使用最近的周任务作为根任务:');
            console.log(`   📋 任务${weekTasks[0].id}: ${weekTasks[0].title} (状态: ${weekTasks[0].status})`);
        } else if (optimizationRootTasks.length > 0) {
            console.log('💡 建议使用系统优化相关的根任务:');
            console.log(`   📋 任务${optimizationRootTasks[0].id}: ${optimizationRootTasks[0].title} (状态: ${optimizationRootTasks[0].status})`);
        } else {
            console.log('❌ 未找到合适的根任务，建议创建新的32周系统优化根任务');
        }
        
    } catch (error) {
        console.error('❌ 查询失败:', error.response?.data || error.message);
    }
}

searchWeek32Tasks();