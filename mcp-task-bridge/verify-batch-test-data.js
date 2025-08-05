#!/usr/bin/env node

import { TaskMCPServer } from './task-mcp.js';

const taskServer = new TaskMCPServer();

async function verifyBatchTestData() {
    console.log('🔍 验证批量父任务更改测试数据...\n');
    
    const testTaskIds = [518, 519, 520, 521, 522, 523, 524, 530, 531, 532];
    const results = {
        found: [],
        notFound: [],
        errors: []
    };
    
    console.log('检查特定测试任务 IDs:', testTaskIds.join(', '));
    console.log('========================================\n');
    
    // 检查每个测试任务ID
    for (const taskId of testTaskIds) {
        try {
            console.log(`检查任务 ID ${taskId}...`);
            const task = await taskServer.findTaskById(taskId);
            
            if (task) {
                results.found.push({
                    id: taskId,
                    title: task.title,
                    status: task.status,
                    project_id: task.project_id,
                    parent_id: task.parent_id
                });
                console.log(`✅ 找到: ID ${taskId} - "${task.title}" [状态: ${task.status}, 父任务: ${task.parent_id || 'none'}]`);
            }
        } catch (error) {
            results.notFound.push(taskId);
            console.log(`❌ 未找到: ID ${taskId} - ${error.message}`);
        }
    }
    
    console.log('\n========================================');
    console.log('📊 验证结果汇总:');
    console.log(`✅ 找到的任务: ${results.found.length} 个`);
    console.log(`❌ 未找到的任务: ${results.notFound.length} 个`);
    
    if (results.found.length > 0) {
        console.log('\n📋 找到的任务详情:');
        results.found.forEach(task => {
            let taskType = '其他';
            if (task.id === 518) taskType = '测试容器';
            else if ([519, 520].includes(task.id)) taskType = '目标父任务';
            else if ([521, 522, 523, 524].includes(task.id)) taskType = '源任务';
            else if ([530, 531, 532].includes(task.id)) taskType = '深度层级测试任务';
            
            console.log(`  - ID ${task.id}: "${task.title}" [${taskType}] (状态: ${task.status}, 父任务: ${task.parent_id || 'none'})`);
        });
    }
    
    if (results.notFound.length > 0) {
        console.log('\n❌ 未找到的任务 IDs:', results.notFound.join(', '));
    }
    
    // 特别检查测试容器任务
    const testContainer = results.found.find(t => t.id === 518);
    if (testContainer) {
        console.log('\n🧪 测试容器任务 (ID: 518) 验证:');
        console.log(`   标题: "${testContainer.title}"`);
        console.log(`   状态: ${testContainer.status}`);
        console.log(`   项目: ${testContainer.project_id}`);
        console.log(`   父任务: ${testContainer.parent_id || 'none'}`);
        
        // 检查是否包含预期的标题关键词
        if (testContainer.title.includes('批量父任务更改测试') || testContainer.title.includes('测试容器')) {
            console.log('   ✅ 标题符合预期');
        } else {
            console.log('   ⚠️ 标题不符合预期格式');
        }
    } else {
        console.log('\n❌ 关键的测试容器任务 (ID: 518) 未找到！');
    }
    
    // 检查层级关系
    console.log('\n🌳 任务层级关系检查:');
    const sourceIds = [521, 522, 523, 524];
    const targetParentIds = [519, 520];
    const deepHierarchyIds = [530, 531, 532];
    
    sourceIds.forEach(id => {
        const task = results.found.find(t => t.id === id);
        if (task) {
            console.log(`   源任务 ${id}: 父任务 ${task.parent_id || 'none'}`);
        }
    });
    
    targetParentIds.forEach(id => {
        const task = results.found.find(t => t.id === id);
        if (task) {
            console.log(`   目标父任务 ${id}: 父任务 ${task.parent_id || 'none'}`);
        }
    });
    
    deepHierarchyIds.forEach(id => {
        const task = results.found.find(t => t.id === id);
        if (task) {
            console.log(`   深度层级任务 ${id}: 父任务 ${task.parent_id || 'none'}`);
        }
    });
    
    // 最终结论
    console.log('\n🎯 测试数据完整性评估:');
    if (results.found.length === testTaskIds.length) {
        console.log('✅ 所有批量父任务更改测试数据都存在，可以开始UI测试');
    } else if (results.found.length >= 8) {
        console.log('⚠️ 大部分测试数据存在，但有少量缺失，建议补充缺失数据后再测试');
    } else {
        console.log('❌ 测试数据不完整，需要重新创建测试数据');
    }
    
    return results;
}

// 执行验证并处理结果
verifyBatchTestData()
    .then(results => {
        console.log('\n🏁 验证完成');
        process.exit(results.notFound.length === 0 ? 0 : 1);
    })
    .catch(error => {
        console.error('\n💥 验证过程出错:', error.message);
        process.exit(1);
    });