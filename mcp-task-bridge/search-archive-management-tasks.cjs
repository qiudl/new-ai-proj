const axios = require('axios');

// System JWT token from the task-mcp.js file
const authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwidXNlcl90eXBlIjoic3lzdGVtIiwic3ViIjoiYWRtaW4iLCJleHAiOjE3NTQ3MTkwMTgsIm5iZiI6MTc1NDExNDIxOCwiaWF0IjoxNzU0MTE0MjE4fQ.iBXJyoqj7MQOT6ijQnSQQeiZx-q9-0_SCZ2q4eAB-J8';
const apiBase = 'http://localhost/api/v1';

const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`
};

async function searchArchiveManagementTasks() {
    try {
        console.log('🔍 正在搜索项目1中与"归档"、"archive"、"管理"相关的任务...');
        
        const response = await axios.get(`${apiBase}/projects/1/tasks`, {
            headers,
            proxy: false
        });
        
        const tasks = response.data.data?.data || [];
        console.log(`📋 总任务数: ${tasks.length}`);
        
        // 搜索关键词
        const keywords = ['归档', 'archive', '管理', 'Archive', 'ARCHIVE', '管理系统', '档案', '存档'];
        
        // 在任务标题和描述中搜索关键词
        const matchingTasks = tasks.filter(task => {
            const title = (task.title || '').toLowerCase();
            const description = (task.description || '').toLowerCase();
            const searchText = title + ' ' + description;
            
            return keywords.some(keyword => 
                searchText.includes(keyword.toLowerCase())
            );
        });
        
        console.log(`\n🎯 找到 ${matchingTasks.length} 个匹配的任务:`);
        console.log('=======================================');
        
        if (matchingTasks.length === 0) {
            console.log('❌ 没有找到包含关键词的任务');
            
            // 显示一些可能相关的任务（包含"功能"、"系统"、"模块"等词的任务）
            console.log('\n🔍 搜索可能相关的任务 (包含"功能"、"系统"、"模块"等关键词的任务):');
            const relatedKeywords = ['功能', '系统', '模块', 'function', 'system', 'module', '实现', '开发'];
            const relatedTasks = tasks.filter(task => {
                const title = (task.title || '').toLowerCase();
                const description = (task.description || '').toLowerCase();
                const searchText = title + ' ' + description;
                
                return relatedKeywords.some(keyword => 
                    searchText.includes(keyword.toLowerCase())
                );
            });
            
            console.log(`\n📝 找到 ${relatedTasks.length} 个可能相关的任务:`);
            relatedTasks.slice(0, 10).forEach(task => { // 只显示前10个
                const parentInfo = task.parent_id ? ` (子任务，父任务ID: ${task.parent_id})` : ' (根任务)';
                const statusIcon = task.status === 'completed' ? '✅' : task.status === 'in_progress' ? '🚀' : '⏳';
                console.log(`   ${statusIcon} ID ${task.id}: "${task.title}"${parentInfo}`);
                console.log(`      状态: ${task.status}`);
                console.log(`      创建时间: ${new Date(task.created_at).toLocaleString()}`);
                if (task.description && task.description.length > 0) {
                    console.log(`      描述: ${task.description.substring(0, 100)}${task.description.length > 100 ? '...' : ''}`);
                }
                console.log('');
            });
            
        } else {
            // 显示匹配的任务
            matchingTasks.forEach(task => {
                const parentInfo = task.parent_id ? ` (子任务，父任务ID: ${task.parent_id})` : ' (根任务)';
                const statusIcon = task.status === 'completed' ? '✅' : task.status === 'in_progress' ? '🚀' : '⏳';
                
                console.log(`${statusIcon} ID ${task.id}: "${task.title}"${parentInfo}`);
                console.log(`   状态: ${task.status}`);
                console.log(`   项目ID: ${task.project_id}`);
                console.log(`   创建时间: ${new Date(task.created_at).toLocaleString()}`);
                console.log(`   更新时间: ${new Date(task.updated_at).toLocaleString()}`);
                
                if (task.description && task.description.length > 0) {
                    console.log(`   描述: ${task.description}`);
                }
                
                // 检查匹配的关键词
                const matchedKeywords = keywords.filter(keyword => {
                    const searchText = ((task.title || '') + ' ' + (task.description || '')).toLowerCase();
                    return searchText.includes(keyword.toLowerCase());
                });
                console.log(`   匹配关键词: ${matchedKeywords.join(', ')}`);
                
                console.log('');
            });
        }
        
        // 分析根任务，寻找适合作为父任务的候选
        console.log('\n🌳 分析根任务结构 (寻找适合的父任务):');
        console.log('==========================================');
        
        const rootTasks = tasks.filter(task => !task.parent_id);
        console.log(`📊 根任务总数: ${rootTasks.length}`);
        
        // 显示最近的根任务
        const recentRootTasks = rootTasks
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 10);
            
        console.log('\n📋 最近的根任务 (适合作为归档管理功能的父任务):');
        recentRootTasks.forEach(task => {
            const childCount = tasks.filter(t => t.parent_id === task.id).length;
            const statusIcon = task.status === 'completed' ? '✅' : task.status === 'in_progress' ? '🚀' : '⏳';
            
            console.log(`${statusIcon} ID ${task.id}: "${task.title}"`);
            console.log(`   状态: ${task.status}`);
            console.log(`   子任务数: ${childCount}`);
            console.log(`   创建时间: ${new Date(task.created_at).toLocaleString()}`);
            
            if (task.description && task.description.length > 0) {
                console.log(`   描述: ${task.description.substring(0, 150)}${task.description.length > 150 ? '...' : ''}`);
            }
            console.log('');
        });
        
        // 寻找本周相关的任务
        console.log('\n📅 寻找本周相关的任务:');
        console.log('=======================');
        
        const thisWeekTasks = tasks.filter(task => {
            const title = (task.title || '').toLowerCase();
            const description = (task.description || '').toLowerCase();
            const searchText = title + ' ' + description;
            
            return searchText.includes('周') || 
                   searchText.includes('week') || 
                   searchText.includes('本周') ||
                   searchText.includes('当前');
        });
        
        if (thisWeekTasks.length > 0) {
            console.log(`找到 ${thisWeekTasks.length} 个本周相关任务:`);
            thisWeekTasks.forEach(task => {
                const parentInfo = task.parent_id ? ` (子任务，父任务ID: ${task.parent_id})` : ' (根任务)';
                const statusIcon = task.status === 'completed' ? '✅' : task.status === 'in_progress' ? '🚀' : '⏳';
                
                console.log(`${statusIcon} ID ${task.id}: "${task.title}"${parentInfo}`);
                console.log(`   状态: ${task.status}`);
                console.log(`   创建时间: ${new Date(task.created_at).toLocaleString()}`);
                console.log('');
            });
        } else {
            console.log('❌ 没有找到本周相关的任务');
        }
        
        // 推荐结果
        console.log('\n🎯 推荐结果:');
        console.log('============');
        
        if (matchingTasks.length > 0) {
            const archiveRootTasks = matchingTasks.filter(task => !task.parent_id);
            if (archiveRootTasks.length > 0) {
                console.log('✅ 找到归档相关的根任务，建议选择以下任务作为父任务:');
                archiveRootTasks.forEach(task => {
                    console.log(`   - ID ${task.id}: "${task.title}" [状态: ${task.status}]`);
                });
            } else {
                console.log('⚠️  找到归档相关任务，但都是子任务。建议找到其根任务作为父任务。');
            }
        } else {
            console.log('💡 建议:');
            console.log('   1. 在本周的根任务中创建归档管理相关的子任务');
            console.log('   2. 或者创建一个新的根任务专门用于归档管理功能开发');
            
            if (recentRootTasks.length > 0) {
                const bestCandidate = recentRootTasks[0];
                console.log(`   3. 推荐的父任务候选: ID ${bestCandidate.id} - "${bestCandidate.title}"`);
            }
        }
        
        return {
            matchingTasks,
            rootTasks: recentRootTasks,
            thisWeekTasks,
            totalTasks: tasks.length
        };
        
    } catch (error) {
        console.error('❌ 搜索失败:', error.response?.data || error.message);
        return null;
    }
}

// 运行搜索
searchArchiveManagementTasks();