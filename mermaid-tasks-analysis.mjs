#!/usr/bin/env node

import { TaskMCPServer } from "./mcp-task-bridge/task-mcp.js";

const taskServer = new TaskMCPServer();

async function analyzeMermaidTasks() {
    console.log("🔍 分析包含Mermaid内容的特定任务...\n");
    
    // 从文档搜索中发现的包含mermaid内容的任务ID
    const mermaidTaskIds = [
        631,  // 修复Mermaid流程图不能预览的bug
        497,  // PDF导出中Mermaid流程图显示问题解决方案  
        586,  // 性能专项测试用例设计完整文档 (包含mermaid图表)
        485,  // task-485.md (从文件列表推断)
        490,  // task-490.md (从文件列表推断)
        491,  // task-491.md (从文件列表推断)
        492,  // task-492.md (从文件列表推断)
        493,  // task-493.md (从文件列表推断)
        494   // task-494.md (从文件列表推断)
    ];
    
    console.log(`📋 将检查 ${mermaidTaskIds.length} 个可能包含Mermaid内容的任务...\n`);
    
    const results = [];
    
    for (const taskId of mermaidTaskIds) {
        try {
            console.log(`🔍 检查任务 #${taskId}...`);
            
            // 通过MCP获取任务详细信息
            const task = await taskServer.findTaskById(taskId);
            
            let mermaidInfo = {
                id: taskId,
                title: task.title,
                status: task.status,
                project_id: task.project_id,
                created_at: task.created_at,
                has_mermaid_in_title: false,
                has_mermaid_in_description: false,
                has_mermaid_in_document: false,
                mermaid_blocks_count: 0,
                description_length: task.description?.length || 0,
                document_length: 0,
                issues_found: [],
                mermaid_types: []
            };
            
            // 检查任务标题
            const title = (task.title || '').toLowerCase();
            if (title.includes('mermaid') || title.includes('流程图') || title.includes('图表')) {
                mermaidInfo.has_mermaid_in_title = true;
                console.log(`   ✅ 标题包含Mermaid相关词汇`);
            }
            
            // 检查任务描述
            if (task.description) {
                const desc = task.description.toLowerCase();
                if (desc.includes('mermaid') || desc.includes('```mermaid') || desc.includes('流程图') || desc.includes('图表')) {
                    mermaidInfo.has_mermaid_in_description = true;
                    console.log(`   ✅ 描述包含Mermaid相关内容`);
                    
                    // 统计mermaid代码块
                    const mermaidBlocks = task.description.match(/```mermaid[\s\S]*?```/g);
                    if (mermaidBlocks) {
                        mermaidInfo.mermaid_blocks_count += mermaidBlocks.length;
                        console.log(`   📊 描述中发现 ${mermaidBlocks.length} 个Mermaid代码块`);
                        
                        // 分析mermaid类型
                        mermaidBlocks.forEach(block => {
                            if (block.includes('flowchart') || block.includes('graph')) mermaidInfo.mermaid_types.push('flowchart');
                            if (block.includes('sequenceDiagram')) mermaidInfo.mermaid_types.push('sequence');
                            if (block.includes('classDiagram')) mermaidInfo.mermaid_types.push('class');
                            if (block.includes('gantt')) mermaidInfo.mermaid_types.push('gantt');
                            if (block.includes('erDiagram')) mermaidInfo.mermaid_types.push('er');
                        });
                    }
                }
            }
            
            // 检查任务文档
            try {
                const docResult = await taskServer.getTaskDocument(taskId);
                if (docResult.success && docResult.content) {
                    mermaidInfo.document_length = docResult.content.length;
                    const doc = docResult.content.toLowerCase();
                    
                    if (doc.includes('mermaid') || doc.includes('```mermaid') || doc.includes('流程图') || doc.includes('图表')) {
                        mermaidInfo.has_mermaid_in_document = true;
                        console.log(`   ✅ 文档包含Mermaid相关内容`);
                        
                        // 统计文档中的mermaid代码块
                        const docMermaidBlocks = docResult.content.match(/```mermaid[\s\S]*?```/g);
                        if (docMermaidBlocks) {
                            mermaidInfo.mermaid_blocks_count += docMermaidBlocks.length;
                            console.log(`   📊 文档中发现 ${docMermaidBlocks.length} 个Mermaid代码块`);
                            
                            // 分析文档中的mermaid类型
                            docMermaidBlocks.forEach(block => {
                                if (block.includes('flowchart') || block.includes('graph')) {
                                    if (!mermaidInfo.mermaid_types.includes('flowchart')) {
                                        mermaidInfo.mermaid_types.push('flowchart');
                                    }
                                }
                                if (block.includes('sequenceDiagram')) {
                                    if (!mermaidInfo.mermaid_types.includes('sequence')) {
                                        mermaidInfo.mermaid_types.push('sequence');
                                    }
                                }
                                if (block.includes('classDiagram')) {
                                    if (!mermaidInfo.mermaid_types.includes('class')) {
                                        mermaidInfo.mermaid_types.push('class');
                                    }
                                }
                                if (block.includes('gantt')) {
                                    if (!mermaidInfo.mermaid_types.includes('gantt')) {
                                        mermaidInfo.mermaid_types.push('gantt');
                                    }
                                }
                            });
                        }
                    }
                    
                    // 检查可能的渲染问题
                    if (doc.includes('显示不了') || doc.includes('空白') || doc.includes('不能预览') || doc.includes('loading')) {
                        mermaidInfo.issues_found.push('显示问题');
                    }
                    if (doc.includes('pdf导出') && doc.includes('问题')) {
                        mermaidInfo.issues_found.push('PDF导出问题');
                    }
                    
                } else {
                    console.log(`   ❌ 无法获取任务文档`);
                }
            } catch (docError) {
                console.log(`   ⚠️  文档获取错误: ${docError.message}`);
            }
            
            const hasMermaidContent = mermaidInfo.has_mermaid_in_title || 
                                     mermaidInfo.has_mermaid_in_description || 
                                     mermaidInfo.has_mermaid_in_document ||
                                     mermaidInfo.mermaid_blocks_count > 0;
            
            if (hasMermaidContent) {
                results.push(mermaidInfo);
                console.log(`   ✅ 确认包含Mermaid内容 (${mermaidInfo.mermaid_blocks_count}个代码块)`);
            } else {
                console.log(`   ❌ 未发现Mermaid内容`);
            }
            
            console.log(`   📝 描述长度: ${mermaidInfo.description_length}, 文档长度: ${mermaidInfo.document_length}\n`);
            
        } catch (error) {
            console.log(`   ❌ 检查任务 #${taskId} 时出错: ${error.message}\n`);
        }
    }
    
    // 输出分析结果
    console.log("=" * 60);
    console.log("🎯 Mermaid任务分析结果\n");
    
    if (results.length === 0) {
        console.log("❌ 没有找到包含Mermaid内容的任务");
        return;
    }
    
    console.log(`🎉 找到 ${results.length} 个包含Mermaid内容的任务:\n`);
    
    // 按状态分组
    const byStatus = {};
    results.forEach(task => {
        if (!byStatus[task.status]) byStatus[task.status] = [];
        byStatus[task.status].push(task);
    });
    
    for (const [status, tasks] of Object.entries(byStatus)) {
        console.log(`\n📊 状态: ${status} (${tasks.length}个任务)`);
        console.log("-" * 40);
        
        tasks.forEach(task => {
            console.log(`\n🔹 任务 #${task.id}: ${task.title}`);
            console.log(`   项目ID: ${task.project_id}`);
            console.log(`   创建时间: ${task.created_at}`);
            console.log(`   Mermaid代码块: ${task.mermaid_blocks_count}个`);
            
            if (task.mermaid_types.length > 0) {
                console.log(`   图表类型: ${task.mermaid_types.join(', ')}`);
            }
            
            if (task.issues_found.length > 0) {
                console.log(`   ⚠️  发现问题: ${task.issues_found.join(', ')}`);
            }
            
            const contentSources = [];
            if (task.has_mermaid_in_title) contentSources.push('标题');
            if (task.has_mermaid_in_description) contentSources.push('描述');
            if (task.has_mermaid_in_document) contentSources.push('文档');
            
            if (contentSources.length > 0) {
                console.log(`   📍 内容位置: ${contentSources.join(', ')}`);
            }
        });
    }
    
    // 重点关注的任务 - 有渲染问题的
    const problemTasks = results.filter(task => task.issues_found.length > 0);
    if (problemTasks.length > 0) {
        console.log(`\n🚨 需要重点关注的任务 (${problemTasks.length}个):`);
        console.log("这些任务可能存在Mermaid渲染或导出问题:\n");
        
        problemTasks.forEach(task => {
            console.log(`   🔥 任务 #${task.id}: ${task.title}`);
            console.log(`      问题: ${task.issues_found.join(', ')}`);
            console.log(`      状态: ${task.status}`);
            console.log(`      Mermaid代码块: ${task.mermaid_blocks_count}个\n`);
        });
    }
    
    // 统计信息
    console.log("\n📈 统计信息:");
    console.log(`   总任务数: ${results.length}`);
    console.log(`   包含代码块的任务: ${results.filter(t => t.mermaid_blocks_count > 0).length}`);
    console.log(`   总Mermaid代码块数: ${results.reduce((sum, t) => sum + t.mermaid_blocks_count, 0)}`);
    console.log(`   有问题的任务: ${problemTasks.length}`);
    
    // 图表类型统计
    const typeCount = {};
    results.forEach(task => {
        task.mermaid_types.forEach(type => {
            typeCount[type] = (typeCount[type] || 0) + 1;
        });
    });
    
    if (Object.keys(typeCount).length > 0) {
        console.log(`   图表类型分布: ${JSON.stringify(typeCount, null, 2)}`);
    }
    
    console.log(`\n📋 包含Mermaid的任务ID列表: ${results.map(t => t.id).join(', ')}`);
    
    return results;
}

// 执行分析
analyzeMermaidTasks().catch(console.error);