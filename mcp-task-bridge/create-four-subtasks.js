#!/usr/bin/env node

import { TaskMCPServer } from './task-mcp.js';

async function createFourSubtasks() {
    const taskServer = new TaskMCPServer();
    
    console.log('🚀 Creating 4 subtasks under task #66...\n');
    
    const subtasks = [
        {
            parentId: 66,
            title: "31-02-05：delete_task - 删除单个任务"
        },
        {
            parentId: 66,
            title: "31-02-06：update_task - 更新任务信息"
        },
        {
            parentId: 66,
            title: "31-02-07：archive_task - 归档任务"
        },
        {
            parentId: 66,
            title: "31-02-08：move_task - 移动任务到其他项目"
        }
    ];
    
    const results = [];
    
    for (let i = 0; i < subtasks.length; i++) {
        const subtask = subtasks[i];
        console.log(`📝 Creating subtask ${i + 1}/4: "${subtask.title}"`);
        
        try {
            const result = await taskServer.createSubTask(subtask.parentId, subtask.title);
            results.push(result);
            
            if (result.success) {
                console.log(`✅ Success: Task ID ${result.id} created`);
            } else {
                console.log(`❌ Failed: ${result.error}`);
            }
        } catch (error) {
            console.log(`❌ Error: ${error.message}`);
            results.push({ success: false, error: error.message });
        }
        
        console.log(''); // Add spacing
    }
    
    // Summary
    console.log('📊 Summary:');
    console.log('===========');
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log(`✅ Successfully created: ${successful.length} subtasks`);
    console.log(`❌ Failed: ${failed.length} subtasks`);
    
    if (successful.length > 0) {
        console.log('\n🎯 Created subtask IDs:');
        successful.forEach((result, index) => {
            console.log(`   ${index + 1}. ID ${result.id}: "${result.title}"`);
        });
    }
    
    if (failed.length > 0) {
        console.log('\n❌ Failed subtasks:');
        failed.forEach((result, index) => {
            console.log(`   ${index + 1}. Error: ${result.error}`);
        });
    }
    
    return results;
}

// Run the script
createFourSubtasks()
    .then(() => {
        console.log('\n🏁 Subtask creation completed!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Script failed:', error);
        process.exit(1);
    });