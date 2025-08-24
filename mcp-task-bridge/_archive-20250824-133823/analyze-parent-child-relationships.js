#!/usr/bin/env node

import { TaskMCPServer } from './task-mcp.js';

const taskServer = new TaskMCPServer();

async function analyzeParentChildRelationships() {
    console.log('🔍 分析任务的父子关系...\n');
    
    try {
        const listResult = await taskServer.listTasks(1);
        
        if (listResult.success && listResult.tasks.length > 0) {
            console.log(`总共分析 ${listResult.tasks.length} 个任务\n`);
            
            // 获取所有任务的详细信息
            const allTasks = [];
            for (const task of listResult.tasks) {
                try {
                    const detailedTask = await taskServer.findTaskById(task.id);
                    allTasks.push(detailedTask);
                } catch (error) {
                    console.error(`获取任务${task.id}详情失败: ${error.message}`);
                }
            }
            
            // 分析父子关系
            const parentChildMap = new Map();
            const childParentMap = new Map();
            
            allTasks.forEach(task => {
                if (task.parent_id) {
                    // 记录子任务
                    if (!parentChildMap.has(task.parent_id)) {
                        parentChildMap.set(task.parent_id, []);
                    }
                    parentChildMap.get(task.parent_id).push(task);
                    childParentMap.set(task.id, task.parent_id);
                }
            });
            
            console.log('📊 父子关系统计:');
            console.log(`   有子任务的父任务: ${parentChildMap.size} 个`);
            console.log(`   是子任务的任务: ${childParentMap.size} 个\n`);
            
            // 显示有子任务的父任务
            console.log('📋 有子任务的父任务列表:');
            for (const [parentId, children] of parentChildMap.entries()) {
                const parentTask = allTasks.find(t => t.id === parentId);
                const parentTitle = parentTask ? parentTask.title : `任务${parentId}(不存在)`;
                const parentStatus = parentTask ? ` (${parentTask.status})` : '';
                
                console.log(`\n🔹 父任务 ID ${parentId}: "${parentTitle}"${parentStatus}`);
                console.log(`   └─ 子任务 (${children.length}个):`);
                
                children.sort((a, b) => a.id - b.id);
                children.forEach((child, index) => {
                    console.log(`      ${index + 1}. ID ${child.id}: "${child.title}" (${child.status})`);
                });
            }
            
            // 特别关注Google Calendar相关的任务
            console.log('\n\n🎯 Google Calendar相关任务的父子关系:');
            const keywords = ['google', 'calendar', '集成', '日历'];
            const googleTasks = allTasks.filter(task => {
                const titleLower = task.title.toLowerCase();
                return keywords.some(keyword => titleLower.includes(keyword.toLowerCase()));
            });
            
            if (googleTasks.length > 0) {
                console.log(`找到${googleTasks.length}个相关任务:\n`);
                
                googleTasks.forEach(task => {
                    const parentInfo = task.parent_id 
                        ? ` (子任务，父任务ID: ${task.parent_id})` 
                        : ' (根任务)';
                    console.log(`🔸 ID ${task.id}: "${task.title}"${parentInfo}`);
                    console.log(`   状态: ${task.status}, 创建时间: ${task.created_at}`);
                    
                    // 显示该任务的子任务
                    if (parentChildMap.has(task.id)) {
                        const children = parentChildMap.get(task.id);
                        console.log(`   子任务 (${children.length}个):`);
                        children.forEach(child => {
                            console.log(`     └─ ID ${child.id}: "${child.title}" (${child.status})`);
                        });
                    }
                    console.log('');
                });
            } else {
                console.log('未找到Google Calendar相关任务');
            }
            
            // 检查今天创建的任务
            console.log('\n🆕 今天创建的任务:');
            const today = new Date().toISOString().split('T')[0];
            const todayTasks = allTasks.filter(task => 
                task.created_at && task.created_at.startsWith(today)
            );
            
            if (todayTasks.length > 0) {
                todayTasks.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                todayTasks.forEach(task => {
                    const parentInfo = task.parent_id ? ` (父任务: ${task.parent_id})` : ' (根任务)';
                    console.log(`   ID ${task.id}: "${task.title}"${parentInfo} [${task.created_at}]`);
                });
            } else {
                console.log('   今天没有创建新任务');
            }
            
        } else {
            console.log('未找到任何任务');
        }
        
    } catch (error) {
        console.error('分析失败:', error.message);
    }
}

// 执行分析
analyzeParentChildRelationships().catch(console.error);