#!/usr/bin/env node

import { TaskMCPServer } from './task-mcp.js';

const taskServer = new TaskMCPServer();

async function verifyTask628() {
    console.log('🔍 验证新创建的任务628...\n');
    
    const listResult = await taskServer.listTasks(1);
    
    if (listResult.success && listResult.tasks.length > 0) {
        // 查找任务628
        const task628 = listResult.tasks.find(task => task.id === 628);
        
        if (task628) {
            console.log('✅ 任务628验证成功:');
            console.log(`- ID: ${task628.id}`);
            console.log(`- 标题: "${task628.title}"`);
            console.log(`- 状态: ${task628.status}`);
            console.log(`- 项目ID: ${task628.projectId}`);
            console.log(`- 父任务ID: ${task628.parentTaskId || '无（根任务）'}`);
            console.log(`- 创建时间: ${task628.createdAt}`);
            
            if (task628.customFields) {
                console.log('- 自定义字段:');
                Object.entries(task628.customFields).forEach(([key, value]) => {
                    console.log(`  - ${key}: ${value}`);
                });
            }
            
            if (task628.description) {
                console.log('\n📝 任务描述:');
                console.log(task628.description.substring(0, 300) + '...');
            }
            
            console.log('\n🎯 任务验证完成，可以在系统中查看该任务');
            console.log(`访问链接: http://localhost/projects/1/tasks/${task628.id}`);
            
            return task628;
        } else {
            console.log('❌ 任务628不存在');
            return null;
        }
    } else {
        console.log('❌ 获取任务列表失败');
        return null;
    }
}

verifyTask628().catch(console.error);