#!/usr/bin/env node

import { TaskMCPServer } from './task-mcp.js';

const taskServer = new TaskMCPServer();

async function searchGoogleCalendarTasks() {
    console.log('🔍 查找Google Calendar相关的任务...\n');
    
    try {
        const listResult = await taskServer.listTasks(1);
        
        if (listResult.success && listResult.tasks.length > 0) {
            console.log(`总共检查 ${listResult.tasks.length} 个任务\n`);
            
            // 查找包含Google、Calendar、集成等关键词的任务
            const keywords = ['google', 'calendar', '集成', '日历', 'Google Calendar'];
            const matchingTasks = [];
            
            for (const task of listResult.tasks) {
                const titleLower = task.title.toLowerCase();
                const hasKeyword = keywords.some(keyword => 
                    titleLower.includes(keyword.toLowerCase())
                );
                
                if (hasKeyword) {
                    try {
                        const detailedTask = await taskServer.findTaskById(task.id);
                        matchingTasks.push({
                            id: detailedTask.id,
                            title: detailedTask.title,
                            status: detailedTask.status,
                            parent_id: detailedTask.parent_id,
                            created_at: detailedTask.created_at,
                            description: detailedTask.description
                        });
                    } catch (error) {
                        console.error(`获取任务${task.id}详情失败: ${error.message}`);
                    }
                }
            }
            
            if (matchingTasks.length > 0) {
                console.log(`📋 找到 ${matchingTasks.length} 个相关任务:\n`);
                
                // 按创建时间排序
                matchingTasks.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                
                matchingTasks.forEach((task, index) => {
                    const parentInfo = task.parent_id ? ` (父任务: ${task.parent_id})` : ' (根任务)';
                    console.log(`${index + 1}. ID: ${task.id}${parentInfo}`);
                    console.log(`   标题: "${task.title}"`);
                    console.log(`   状态: ${task.status}`);
                    console.log(`   创建时间: ${task.created_at}`);
                    if (task.description && task.description.length > 0) {
                        const shortDesc = task.description.length > 100 
                            ? task.description.substring(0, 100) + '...' 
                            : task.description;
                        console.log(`   描述: ${shortDesc}`);
                    }
                    console.log('');
                });
                
                // 查找可能的父子关系
                console.log('🔗 分析任务层级关系:');
                const rootTasks = matchingTasks.filter(t => !t.parent_id);
                const childTasks = matchingTasks.filter(t => t.parent_id);
                
                console.log(`   根任务: ${rootTasks.length} 个`);
                console.log(`   子任务: ${childTasks.length} 个`);
                
                if (rootTasks.length > 0) {
                    console.log('\n📌 根任务列表:');
                    rootTasks.forEach(task => {
                        console.log(`   - ID: ${task.id} - "${task.title}"`);
                        
                        // 查找该根任务的子任务
                        const children = childTasks.filter(c => c.parent_id === task.id);
                        if (children.length > 0) {
                            console.log(`     子任务 (${children.length}个):`);
                            children.forEach(child => {
                                console.log(`       └─ ID: ${child.id} - "${child.title}"`);
                            });
                        }
                    });
                }
                
            } else {
                console.log('❌ 未找到Google Calendar相关的任务');
            }
            
        } else {
            console.log('未找到任何任务');
        }
        
    } catch (error) {
        console.error('搜索失败:', error.message);
    }
}

// 执行搜索
searchGoogleCalendarTasks().catch(console.error);