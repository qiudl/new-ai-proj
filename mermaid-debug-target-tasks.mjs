#!/usr/bin/env node

import { TaskMCPServer } from "./mcp-task-bridge/task-mcp.js";

const taskServer = new TaskMCPServer();

async function extractMermaidDebugTargets() {
    console.log("🎯 提取Mermaid调试目标任务详情...\n");
    
    // 从之前搜索结果中确定的重点任务ID
    const targetTaskIds = [
        631, // 修复Mermaid流程图不能预览的bug - 核心问题任务
        632, // 修复PDF预览打印内容一片空白的bug - PDF导出相关
        628  // 任务编辑页父任务选择器UI优化 - 可能包含相关问题
    ];
    
    const debugTargets = [];
    
    console.log(`📋 提取 ${targetTaskIds.length} 个重点任务的详细信息...\n`);
    
    for (const taskId of targetTaskIds) {
        try {
            console.log(`🔍 提取任务 #${taskId} 详情...`);
            
            // 获取任务基本信息
            const task = await taskServer.findTaskById(taskId);
            
            // 获取任务文档
            let taskDocument = null;
            try {
                const docResult = await taskServer.getTaskDocument(taskId);
                if (docResult.success && docResult.content) {
                    taskDocument = docResult.content;
                }
            } catch (docError) {
                console.log(`   ⚠️  无法获取任务文档: ${docError.message}`);
            }
            
            const debugInfo = {
                id: task.id,
                title: task.title,
                status: task.status,
                project_id: task.project_id,
                created_at: task.created_at,
                updated_at: task.updated_at,
                description: task.description,
                document: taskDocument,
                analysis: {
                    is_mermaid_bug_fix: task.title.toLowerCase().includes('mermaid'),
                    is_pdf_export_issue: task.title.toLowerCase().includes('pdf'),
                    mentions_loading_issue: false,
                    mentions_display_problem: false,
                    mentions_blank_output: false,
                    has_technical_details: false,
                    mermaid_keywords_found: [],
                    issue_keywords_found: []
                }
            };
            
            // 分析描述内容
            if (task.description) {
                const desc = task.description.toLowerCase();
                
                // 检查Mermaid相关关键词
                const mermaidKeywords = ['mermaid', 'flowchart', 'graph', '流程图', '图表'];
                mermaidKeywords.forEach(keyword => {
                    if (desc.includes(keyword)) {
                        debugInfo.analysis.mermaid_keywords_found.push(keyword);
                    }
                });
                
                // 检查问题相关关键词
                const issueKeywords = ['loading', 'isLoading', '显示不了', '空白', '不能预览', '一片空白', '渲染失败'];
                issueKeywords.forEach(keyword => {
                    if (desc.includes(keyword)) {
                        debugInfo.analysis.issue_keywords_found.push(keyword);
                    }
                });
                
                // 特定问题标记
                if (desc.includes('loading') || desc.includes('isloading')) {
                    debugInfo.analysis.mentions_loading_issue = true;
                }
                if (desc.includes('显示不了') || desc.includes('不能预览') || desc.includes('渲染失败')) {
                    debugInfo.analysis.mentions_display_problem = true;
                }
                if (desc.includes('空白') || desc.includes('一片空白')) {
                    debugInfo.analysis.mentions_blank_output = true;
                }
                if (desc.includes('markdownrenderer') || desc.includes('组件') || desc.includes('修复')) {
                    debugInfo.analysis.has_technical_details = true;
                }
            }
            
            // 分析文档内容
            if (taskDocument) {
                const doc = taskDocument.toLowerCase();
                
                // 检查文档中的关键词
                const mermaidKeywords = ['mermaid', 'flowchart', 'graph', '流程图', '图表'];
                mermaidKeywords.forEach(keyword => {
                    if (doc.includes(keyword) && !debugInfo.analysis.mermaid_keywords_found.includes(keyword)) {
                        debugInfo.analysis.mermaid_keywords_found.push(keyword);
                    }
                });
                
                const issueKeywords = ['loading', 'isLoading', '显示不了', '空白', '不能预览', '一片空白', '渲染失败'];
                issueKeywords.forEach(keyword => {
                    if (doc.includes(keyword) && !debugInfo.analysis.issue_keywords_found.includes(keyword)) {
                        debugInfo.analysis.issue_keywords_found.push(keyword);
                    }
                });
                
                // 更新问题标记
                if (doc.includes('loading') || doc.includes('isloading')) {
                    debugInfo.analysis.mentions_loading_issue = true;
                }
                if (doc.includes('显示不了') || doc.includes('不能预览') || doc.includes('渲染失败')) {
                    debugInfo.analysis.mentions_display_problem = true;
                }
                if (doc.includes('空白') || doc.includes('一片空白')) {
                    debugInfo.analysis.mentions_blank_output = true;
                }
                if (doc.includes('markdownrenderer') || doc.includes('组件') || doc.includes('修复') || doc.includes('解决方案')) {
                    debugInfo.analysis.has_technical_details = true;
                }
            }
            
            debugTargets.push(debugInfo);
            console.log(`   ✅ 任务 #${taskId} 详情提取完成`);
            
        } catch (error) {
            console.log(`   ❌ 提取任务 #${taskId} 时出错: ${error.message}`);
        }
    }
    
    // 输出详细调试信息
    console.log("\n" + "=" * 80);
    console.log("🎯 Mermaid调试目标任务详情\n");
    
    debugTargets.forEach((task, index) => {
        console.log(`\n📊 任务 #${task.id}: ${task.title}`);
        console.log("─" * 60);
        console.log(`状态: ${task.status}`);
        console.log(`项目ID: ${task.project_id}`);
        console.log(`创建时间: ${task.created_at}`);
        
        // 显示分析结果
        console.log(`\n🔍 问题分析:`);
        console.log(`   Mermaid相关: ${task.analysis.is_mermaid_bug_fix ? '✅' : '❌'}`);
        console.log(`   PDF导出相关: ${task.analysis.is_pdf_export_issue ? '✅' : '❌'}`);
        console.log(`   提到Loading问题: ${task.analysis.mentions_loading_issue ? '🚨' : '❌'}`);
        console.log(`   提到显示问题: ${task.analysis.mentions_display_problem ? '🚨' : '❌'}`);
        console.log(`   提到空白输出: ${task.analysis.mentions_blank_output ? '🚨' : '❌'}`);
        console.log(`   包含技术细节: ${task.analysis.has_technical_details ? '✅' : '❌'}`);
        
        if (task.analysis.mermaid_keywords_found.length > 0) {
            console.log(`   Mermaid关键词: ${task.analysis.mermaid_keywords_found.join(', ')}`);
        }
        
        if (task.analysis.issue_keywords_found.length > 0) {
            console.log(`   问题关键词: ${task.analysis.issue_keywords_found.join(', ')}`);
        }
        
        // 显示关键描述片段
        if (task.description) {
            console.log(`\n📝 任务描述 (${task.description.length}字符):`);
            const descLines = task.description.split('\\n').slice(0, 5);
            descLines.forEach(line => {
                if (line.trim()) {
                    console.log(`   ${line.trim().substring(0, 80)}${line.length > 80 ? '...' : ''}`);
                }
            });
        }
        
        // 显示关键文档片段
        if (task.document) {
            console.log(`\n📄 任务文档 (${task.document.length}字符):`);
            const docLines = task.document.split('\\n').slice(0, 5);
            docLines.forEach(line => {
                if (line.trim()) {
                    console.log(`   ${line.trim().substring(0, 80)}${line.length > 80 ? '...' : ''}`);
                }
            });
        }
    });
    
    // 输出调试建议
    console.log(`\n\n🛠️  调试建议:`);
    console.log(`1. 重点关注任务 #631，它是核心的Mermaid流程图预览bug修复任务`);
    console.log(`2. 检查任务 #632，它涉及PDF导出空白问题，可能与Mermaid渲染相关`);
    console.log(`3. 查看任务详情中提到的具体技术解决方案和修复代码`);
    
    const loadingIssueTasks = debugTargets.filter(t => t.analysis.mentions_loading_issue);
    if (loadingIssueTasks.length > 0) {
        console.log(`4. 特别注意提到Loading问题的任务: ${loadingIssueTasks.map(t => `#${t.id}`).join(', ')}`);
    }
    
    const displayIssueTasks = debugTargets.filter(t => t.analysis.mentions_display_problem);
    if (displayIssueTasks.length > 0) {
        console.log(`5. 特别注意提到显示问题的任务: ${displayIssueTasks.map(t => `#${t.id}`).join(', ')}`);
    }
    
    console.log(`\n📋 建议用于调试的任务ID: ${debugTargets.map(t => t.id).join(', ')}`);
    console.log(`🎯 这些任务包含了用户遇到的Mermaid loading问题的具体信息和可能的解决方案。`);
    
    return debugTargets;
}

// 执行分析
extractMermaidDebugTargets().catch(console.error);