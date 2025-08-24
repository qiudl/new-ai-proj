#!/usr/bin/env node

import { TaskMCPServer } from './task-mcp.js';

const taskServer = new TaskMCPServer();

async function findTask213() {
    console.log('🔍 查找任务 213...\n');
    
    try {
        // 先获取所有任务列表，寻找任务213
        const listResult = await taskServer.listTasks();
        
        if (listResult.success && listResult.tasks.length > 0) {
            const task213 = listResult.tasks.find(task => task.id === 213);
            
            if (task213) {
                console.log('✅ 找到任务 213:');
                console.log('==========================================');
                console.log(`ID: ${task213.id}`);
                console.log(`标题: ${task213.title}`);
                console.log(`描述: ${task213.description || '无描述'}`);
                console.log(`状态: ${task213.status}`);
                console.log(`优先级: ${task213.priority || 'low'}`);
                console.log(`项目ID: ${task213.project_id}`);
                console.log(`创建时间: ${task213.created_at}`);
                console.log(`更新时间: ${task213.updated_at}`);
                console.log(`父任务ID: ${task213.parent_id || '无'}`);
                console.log(`指派用户ID: ${task213.assignee_id || '无'}`);
                console.log(`截止日期: ${task213.due_date || '无'}`);
                console.log('==========================================\n');
                
                // 检查是否有子任务
                console.log('🔄 检查子任务...');
                const childrenResult = await taskServer.getTaskChildren(213);
                
                if (childrenResult.success && childrenResult.children && childrenResult.children.length > 0) {
                    console.log(`📋 找到 ${childrenResult.children.length} 个子任务:`);
                    childrenResult.children.forEach((child, index) => {
                        console.log(`  ${index + 1}. ID: ${child.id}, 标题: "${child.title}", 状态: ${child.status}`);
                    });
                } else {
                    console.log('📋 无子任务');
                }
                
                console.log('');
                
                // 检查是否有任务文档
                console.log('📄 检查任务文档...');
                const hasDocResult = await taskServer.hasTaskDocument(213);
                
                if (hasDocResult.success && hasDocResult.hasDocument) {
                    console.log('📄 任务有关联文档，获取文档内容...');
                    const docResult = await taskServer.getTaskDocument(213);
                    
                    if (docResult.success && docResult.document) {
                        console.log('📄 文档内容:');
                        console.log('------------------------------------------');
                        console.log(`标题: ${docResult.document.title}`);
                        console.log(`内容预览: ${docResult.document.content.substring(0, 200)}${docResult.document.content.length > 200 ? '...' : ''}`);
                        console.log('------------------------------------------');
                    }
                } else {
                    console.log('📄 无关联文档');
                }
                
                return task213;
            } else {
                console.log('❌ 未找到任务 213');
                
                // 尝试通过搜索找到可能包含213的任务
                console.log('\n🔍 尝试搜索包含"213"的任务...');
                const searchResult = await taskServer.findTaskByName('213');
                
                if (searchResult.success && searchResult.tasks && searchResult.tasks.length > 0) {
                    console.log(`找到 ${searchResult.tasks.length} 个相关任务:`);
                    searchResult.tasks.forEach(task => {
                        console.log(`- ID: ${task.id}, 标题: "${task.title}", 状态: ${task.status}`);
                    });
                } else {
                    console.log('未找到包含"213"的任务');
                }
                
                return null;
            }
        } else {
            console.log('❌ 获取任务列表失败或无任务');
            return null;
        }
    } catch (error) {
        console.error('❌ 查找任务时出错:', error.message);
        return null;
    }
}

// 运行脚本
findTask213().then(task => {
    if (task) {
        console.log('\n✅ 任务 213 详情获取完成');
        console.log('\n📋 总结:');
        console.log(`- 任务标题: ${task.title}`);
        console.log(`- 当前状态: ${task.status}`);
        console.log(`- 是否有子任务: 已检查`);
        console.log(`- 是否有文档: 已检查`);
    } else {
        console.log('\n❌ 无法获取任务 213 的详情');
    }
}).catch(error => {
    console.error('脚本执行失败:', error);
    process.exit(1);
});