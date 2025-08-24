#!/usr/bin/env node

/**
 * 测试批量创建文档的 MCP 接口
 * 用于验证批量创建和关联文档功能
 */

import { TaskMCPServer } from './task-mcp.js';

async function testBatchDocuments() {
    console.log('========== 测试批量创建文档接口 ==========\n');
    
    const server = new TaskMCPServer('http://localhost:8081/api/v1');
    
    try {
        // 1. 首先创建几个测试任务
        console.log('📝 准备测试任务...');
        const task1 = await server.createTask('批量文档测试任务1', 1);
        const task2 = await server.createTask('批量文档测试任务2', 1);
        const task3 = await server.createTask('批量文档测试任务3', 1);
        
        console.log(`  - 任务1 ID: ${task1.id}`);
        console.log(`  - 任务2 ID: ${task2.id}`);
        console.log(`  - 任务3 ID: ${task3.id}\n`);
        
        // 2. 准备批量文档数据
        const documents = [
            {
                title: `${task1.title} - 技术文档`,
                content: `# ${task1.title} - 技术文档\n\n## 概述\n这是任务 ${task1.id} 的技术文档。\n\n## 实现细节\n- 功能点1\n- 功能点2\n- 功能点3\n\n创建时间: ${new Date().toISOString()}`,
                type: 'markdown',
                status: 'draft',
                visibility: 'team',
                project_id: 1,
                task_id: task1.id,
                attach_to_task: true,
                relation_type: 'attachment',
                tags: ['技术文档', '批量创建', 'MCP测试']
            },
            {
                title: `${task2.title} - 设计文档`,
                content: `# ${task2.title} - 设计文档\n\n## 设计目标\n任务 ${task2.id} 的设计文档。\n\n## 架构设计\n- 组件1\n- 组件2\n- 组件3\n\n创建时间: ${new Date().toISOString()}`,
                type: 'markdown',
                status: 'draft',
                visibility: 'team',
                project_id: 1,
                task_id: task2.id,
                attach_to_task: true,
                relation_type: 'main',
                tags: ['设计文档', '批量创建', 'MCP测试']
            },
            {
                title: `${task3.title} - 测试文档`,
                content: `# ${task3.title} - 测试文档\n\n## 测试计划\n任务 ${task3.id} 的测试文档。\n\n## 测试用例\n1. 测试用例1\n2. 测试用例2\n3. 测试用例3\n\n创建时间: ${new Date().toISOString()}`,
                type: 'markdown',
                status: 'published',
                visibility: 'public',
                project_id: 1,
                task_id: task3.id,
                attach_to_task: true,
                relation_type: 'reference',
                tags: ['测试文档', '批量创建', 'MCP测试']
            },
            {
                title: '独立文档 - 不关联任务',
                content: `# 独立文档\n\n这是一个不关联到任何任务的独立文档。\n\n创建时间: ${new Date().toISOString()}`,
                type: 'markdown',
                status: 'draft',
                visibility: 'private',
                project_id: 1,
                attach_to_task: false,
                tags: ['独立文档', '批量创建', 'MCP测试']
            }
        ];
        
        console.log('📚 准备批量创建文档...');
        console.log(`  - 文档数量: ${documents.length}`);
        console.log(`  - 关联任务: ${documents.filter(d => d.attach_to_task).length} 个`);
        console.log(`  - 独立文档: ${documents.filter(d => !d.attach_to_task).length} 个\n`);
        
        // 3. 调用批量创建接口
        const result = await server.createBatchDocuments(documents);
        
        console.log('📊 执行结果:');
        console.log(JSON.stringify(result, null, 2));
        
        if (result.success) {
            console.log('\n✅ 批量创建成功！');
            
            // 解析返回的数据
            const data = result.data?.data || result.data || {};
            
            if (data.success_count !== undefined) {
                console.log(`  - 成功创建: ${data.success_count} 个文档`);
                console.log(`  - 失败数量: ${data.error_count || 0} 个`);
            }
            
            // 显示创建的文档信息
            if (data.created_documents && data.created_documents.length > 0) {
                console.log('\n📄 创建的文档:');
                data.created_documents.forEach((doc, index) => {
                    console.log(`  ${index + 1}. ${doc.title} (ID: ${doc.id})`);
                });
            }
            
            // 显示错误信息（如果有）
            if (data.errors && data.errors.length > 0) {
                console.log('\n⚠️  部分错误:');
                data.errors.forEach(err => {
                    console.log(`  - [${err.code}] ${err.title}: ${err.error}`);
                });
            }
            
            // 4. 验证文档是否真的被创建和关联
            console.log('\n🔍 验证文档关联...');
            
            // 检查任务1的文档
            const task1Docs = await server.hasTaskDocument(task1.id, 1);
            console.log(`  - 任务1 有文档: ${task1Docs.has_document ? '是' : '否'}`);
            
            // 检查任务2的文档
            const task2Docs = await server.hasTaskDocument(task2.id, 1);
            console.log(`  - 任务2 有文档: ${task2Docs.has_document ? '是' : '否'}`);
            
            // 检查任务3的文档
            const task3Docs = await server.hasTaskDocument(task3.id, 1);
            console.log(`  - 任务3 有文档: ${task3Docs.has_document ? '是' : '否'}`);
            
        } else {
            console.error('\n❌ 批量创建失败！');
            console.error(`  - 错误信息: ${result.error}`);
        }
        
        // 5. 清理测试数据（可选）
        console.log('\n🧹 清理测试数据...');
        await server.deleteTask(task1.id, true);
        await server.deleteTask(task2.id, true);
        await server.deleteTask(task3.id, true);
        console.log('  - 测试任务已删除');
        
    } catch (error) {
        console.error('\n💥 发生未预期的错误:');
        console.error(error);
        
        if (error.response) {
            console.error('\n响应详情:');
            console.error(`  - 状态码: ${error.response.status}`);
            console.error(`  - 响应数据: ${JSON.stringify(error.response.data, null, 2)}`);
        }
    }
    
    console.log('\n========== 测试完成 ==========');
}

// 运行测试
testBatchDocuments().catch(console.error);
