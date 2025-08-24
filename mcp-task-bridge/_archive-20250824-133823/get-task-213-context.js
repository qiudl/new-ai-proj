#!/usr/bin/env node

import { TaskMCPServer } from './task-mcp.js';

const taskServer = new TaskMCPServer();

async function getTask213Context() {
    console.log('🔍 获取任务 213 的完整上下文...\n');
    
    try {
        // 获取所有任务
        const listResult = await taskServer.listTasks();
        
        if (!listResult.success) {
            console.log('❌ 无法获取任务列表');
            return;
        }
        
        const task213 = listResult.tasks.find(task => task.id === 213);
        const parentTask195 = listResult.tasks.find(task => task.id === 195);
        
        if (task213) {
            console.log('📋 任务 213 详情:');
            console.log('==========================================');
            console.log(`ID: ${task213.id}`);
            console.log(`标题: ${task213.title}`);
            console.log(`描述: ${task213.description || '无描述'}`);
            console.log(`状态: ${task213.status}`);
            console.log(`优先级: ${task213.priority || 'low'}`);
            console.log(`父任务ID: ${task213.parent_id || '无'}`);
            console.log('==========================================\n');
        }
        
        if (parentTask195) {
            console.log('👆 父任务 195 详情:');
            console.log('==========================================');
            console.log(`ID: ${parentTask195.id}`);
            console.log(`标题: ${parentTask195.title}`);
            console.log(`描述: ${parentTask195.description || '无描述'}`);
            console.log(`状态: ${parentTask195.status}`);
            console.log(`优先级: ${parentTask195.priority || 'low'}`);
            console.log(`父任务ID: ${parentTask195.parent_id || '无'}`);
            console.log('==========================================\n');
            
            // 获取父任务的所有子任务
            const childrenResult = await taskServer.getTaskChildren(195);
            if (childrenResult.success && childrenResult.children && childrenResult.children.length > 0) {
                console.log(`👶 父任务 195 的所有子任务 (${childrenResult.children.length} 个):`);
                childrenResult.children.forEach((child, index) => {
                    const isCurrentTask = child.id === 213 ? ' ← 当前任务' : '';
                    console.log(`  ${index + 1}. ID: ${child.id}, 标题: "${child.title}", 状态: ${child.status}${isCurrentTask}`);
                });
                console.log('');
            }
        }
        
        // 检查任务层次结构 - 是否有祖父任务
        if (parentTask195 && parentTask195.parent_id) {
            const grandParentTask = listResult.tasks.find(task => task.id === parentTask195.parent_id);
            if (grandParentTask) {
                console.log('👴 祖父任务详情:');
                console.log('==========================================');
                console.log(`ID: ${grandParentTask.id}`);
                console.log(`标题: ${grandParentTask.title}`);
                console.log(`描述: ${grandParentTask.description || '无描述'}`);
                console.log(`状态: ${grandParentTask.status}`);
                console.log('==========================================\n');
            }
        }
        
        // 搜索相关的任务（可能是兄弟任务或相关任务）
        console.log('🔍 搜索相关任务...');
        const searchTerms = ['任务详情页', '编辑任务', '父任务', 'bug', '修复'];
        
        for (const term of searchTerms) {
            const searchResult = await taskServer.findTaskByName(term);
            if (searchResult.success && searchResult.tasks && searchResult.tasks.length > 0) {
                const relatedTasks = searchResult.tasks.filter(task => task.id !== 213);
                if (relatedTasks.length > 0) {
                    console.log(`\n🔗 包含"${term}"的相关任务 (${relatedTasks.length} 个):`);
                    relatedTasks.slice(0, 5).forEach(task => {
                        console.log(`  - ID: ${task.id}, 标题: "${task.title}", 状态: ${task.status}`);
                    });
                }
            }
        }
        
        console.log('\n📊 任务 213 工作要求分析:');
        console.log('==========================================');
        console.log('任务标题: 修复任务详情页，编辑任务选择父任务出现的bugs');
        console.log('');
        console.log('📋 预期需要完成的工作:');
        console.log('1. 🐛 识别任务详情页中编辑任务功能的bug');
        console.log('2. 🔍 特别关注"选择父任务"功能的问题');
        console.log('3. 🛠️ 修复相关的前端或后端问题');
        console.log('4. ✅ 确保父任务选择功能正常工作');
        console.log('5. 🧪 测试修复后的功能');
        console.log('');
        console.log('🎯 可能涉及的文件:');
        console.log('- 前端: TaskDetailPage组件');
        console.log('- 前端: 任务编辑表单组件');
        console.log('- 前端: 父任务选择组件');
        console.log('- 后端: 任务更新API');
        console.log('- 后端: 任务层次结构相关逻辑');
        console.log('==========================================');
        
    } catch (error) {
        console.error('❌ 获取上下文时出错:', error.message);
    }
}

// 运行脚本
getTask213Context().catch(error => {
    console.error('脚本执行失败:', error);
    process.exit(1);
});