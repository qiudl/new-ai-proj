#!/usr/bin/env node

/**
 * 将文档设置为任务的主文档（main relationship）
 */

import fs from 'fs';
import path from 'path';
import { TaskMCPServer } from './task-mcp.js';

async function setMainDocument() {
    const taskId = 536;
    const filePath = '/Users/johnqiu/coding/www/projects/new-ai-proj/backend/TASK-536-开发计划.md';
    
    console.log('========== 设置任务主文档 ==========\n');
    
    const server = new TaskMCPServer('http://localhost:8081/api/v1');
    
    try {
        // 读取文件内容
        const content = fs.readFileSync(filePath, 'utf8');
        const title = '开发计划：完成百分比算法与进度计算 API';
        
        console.log(`📝 准备设置任务 #${taskId} 的主文档...`);
        console.log(`  - 文档标题: ${title}`);
        console.log(`  - 文件大小: ${content.length} 字符`);
        console.log(`  - 关系类型: main (主文档)\n`);
        
        // 创建一个新的主文档版本
        const payload = {
            title: title,
            content: content,
            type: 'markdown',
            status: 'published',  // 主文档应该是已发布状态
            visibility: 'team',
            project_id: 1,
            task_id: taskId,
            attach_to_task: true,
            relation_type: 'main',  // 设置为主文档
            tags: ['开发计划', '进度算法', 'API设计', '任务536'],
            description: '任务 #536 的详细开发计划文档，包含算法设计、API设计、数据模型、实施计划等'
        };
        
        // 使用批量创建接口（单个文档）来确保正确的关系类型
        const result = await server.createBatchDocuments([payload], {
            auto_attach: true,
            skip_existing: false,  // 不跳过已有文档的任务
            default_status: 'published',
            default_visibility: 'team'
        });
        
        console.log('📊 执行结果:');
        console.log(JSON.stringify(result, null, 2));
        
        if (result.success) {
            const data = result.data?.data || result.data || {};
            
            if (data.created_documents && data.created_documents.length > 0) {
                const doc = data.created_documents[0];
                console.log('\n✅ 主文档设置成功！');
                console.log(`  - 文档ID: ${doc.id}`);
                console.log(`  - 文档标题: ${doc.title}`);
                console.log(`  - 状态: ${doc.status}`);
                console.log(`  - 可见性: ${doc.visibility}`);
                console.log(`  - 创建时间: ${doc.created_at}`);
                
                // 验证文档关联
                console.log('\n🔍 验证文档关联...');
                const hasDoc = await server.hasTaskDocument(taskId, 1);
                console.log(`  - 任务 #${taskId} 有文档: ${hasDoc.has_document ? '是' : '否'}`);
                
                if (hasDoc.has_document) {
                    // 获取文档列表查看关系类型
                    console.log('\n📚 获取任务文档列表...');
                    const getDoc = await server.getTaskDocument(taskId, 1);
                    if (getDoc.success) {
                        console.log(`  - 最新文档标题: ${getDoc.title}`);
                        console.log(`  - 文档ID: ${getDoc.document_id}`);
                        console.log(`  - 更新时间: ${getDoc.updated_at}`);
                    }
                }
                
                console.log('\n📌 总结:');
                console.log(`  任务 #${taskId} 现在有以下文档：`);
                console.log(`  1. 主文档 (main): "${title}" - 包含完整的开发计划`);
                console.log(`  2. 附件文档 (attachment): 之前创建的版本`);
                console.log('\n  主文档将作为任务的核心参考文档，在任务详情页面优先显示。');
                
            } else if (data.errors && data.errors.length > 0) {
                console.error('\n⚠️  创建时出现错误:');
                data.errors.forEach(err => {
                    console.error(`  - [${err.code}] ${err.error}`);
                });
            }
        } else {
            console.error('\n❌ 设置主文档失败！');
            console.error(`  - 错误信息: ${result.error}`);
        }
        
    } catch (error) {
        console.error('\n💥 发生未预期的错误:');
        console.error(error);
        
        if (error.response) {
            console.error('\n响应详情:');
            console.error(`  - 状态码: ${error.response.status}`);
            console.error(`  - 响应数据: ${JSON.stringify(error.response.data, null, 2)}`);
        }
    }
    
    console.log('\n========== 操作完成 ==========');
}

// 运行
setMainDocument().catch(console.error);
