#!/usr/bin/env node

import { TaskMCPServer } from "./mcp-task-bridge/task-mcp.js";

const taskServer = new TaskMCPServer();

async function searchMermaidTasksTargeted() {
    console.log("🔍 定向搜索Mermaid相关任务...\n");
    
    const searchTerms = [
        'mermaid',
        'flowchart', 
        'graph',
        '流程图',
        '图表',
        '流程',
        'PDF导出',
        'PDF',
        'export',
        '导出',
        '图'
    ];
    
    const foundTasks = [];
    
    try {
        // 首先通过任务标题搜索
        for (const term of searchTerms) {
            console.log(`🔍 搜索标题包含 "${term}" 的任务...`);
            const result = await taskServer.findTaskByName(term);
            
            if (result.success && result.tasks.length > 0) {
                console.log(`✅ 找到 ${result.tasks.length} 个任务匹配 "${term}"`);
                
                for (const task of result.tasks) {
                    // 避免重复
                    if (!foundTasks.find(t => t.id === task.id)) {
                        foundTasks.push({
                            ...task,
                            matched_term: term,
                            match_type: 'title'
                        });
                    }
                }
            } else {
                console.log(`❌ 没有找到标题包含 "${term}" 的任务`);
            }
        }
        
        // 对找到的任务进行详细检查
        console.log(`\n📋 找到 ${foundTasks.length} 个候选任务，检查详细内容...\n`);
        
        const detailedResults = [];
        
        for (const task of foundTasks) {
            try {
                console.log(`🔍 检查任务 #${task.id}: ${task.title}`);
                
                // 获取完整任务信息
                const fullTask = await taskServer.findTaskById(task.id);
                
                let mermaidContent = [];
                let hasMermaidCode = false;
                
                // 检查描述中的内容
                if (fullTask.description) {
                    console.log(`   📝 描述长度: ${fullTask.description.length} 字符`);
                    
                    // 检查是否包含mermaid代码块
                    if (fullTask.description.includes('```mermaid')) {
                        hasMermaidCode = true;
                        mermaidContent.push('description contains ```mermaid');
                        
                        // 提取mermaid代码块
                        const mermaidRegex = /```mermaid\n([\s\S]*?)\n```/g;
                        const matches = [...fullTask.description.matchAll(mermaidRegex)];
                        console.log(`   🎯 找到 ${matches.length} 个mermaid代码块`);
                    }
                    
                    // 显示描述的开头部分
                    const descPreview = fullTask.description.substring(0, 200);
                    console.log(`   📖 描述预览: ${descPreview}${fullTask.description.length > 200 ? '...' : ''}`);
                }
                
                // 检查任务文档
                try {
                    const docResult = await taskServer.getTaskDocument(task.id);
                    if (docResult.success && docResult.content) {
                        console.log(`   📄 文档长度: ${docResult.content.length} 字符`);
                        
                        if (docResult.content.includes('```mermaid')) {
                            hasMermaidCode = true;
                            mermaidContent.push('document contains ```mermaid');
                            
                            const mermaidRegex = /```mermaid\n([\s\S]*?)\n```/g;
                            const matches = [...docResult.content.matchAll(mermaidRegex)];
                            console.log(`   🎯 文档中找到 ${matches.length} 个mermaid代码块`);
                        }
                        
                        // 显示文档的开头部分
                        const docPreview = docResult.content.substring(0, 200);
                        console.log(`   📄 文档预览: ${docPreview}${docResult.content.length > 200 ? '...' : ''}`);
                    }
                } catch (docError) {
                    console.log(`   ⚠️  无法获取任务文档: ${docError.message}`);
                }
                
                detailedResults.push({
                    id: fullTask.id,
                    title: fullTask.title,
                    status: fullTask.status,
                    project_id: fullTask.project_id,
                    matched_term: task.matched_term,
                    has_mermaid_code: hasMermaidCode,
                    mermaid_content: mermaidContent,
                    description_length: fullTask.description?.length || 0,
                    created_at: fullTask.created_at
                });
                
                console.log(`   ${hasMermaidCode ? '✅ 包含Mermaid代码' : '❌ 不包含Mermaid代码'}\n`);
                
            } catch (error) {
                console.log(`   ❌ 检查任务时出错: ${error.message}\n`);
            }
        }
        
        // 输出最终结果
        console.log("=" * 60);
        console.log("🎯 最终搜索结果\n");
        
        const mermaidTasks = detailedResults.filter(t => t.has_mermaid_code);
        
        if (mermaidTasks.length > 0) {
            console.log(`🎉 找到 ${mermaidTasks.length} 个包含Mermaid代码的任务:\n`);
            
            mermaidTasks.forEach(task => {
                console.log(`🔹 任务 #${task.id}: ${task.title}`);
                console.log(`   状态: ${task.status}`);
                console.log(`   匹配词: ${task.matched_term}`);
                console.log(`   Mermaid内容: ${task.mermaid_content.join(', ')}`);
                console.log(`   创建时间: ${task.created_at}\n`);
            });
            
            console.log(`📋 包含Mermaid的任务ID: ${mermaidTasks.map(t => t.id).join(', ')}`);
        } else {
            console.log("❌ 没有找到包含Mermaid代码块的任务");
        }
        
        // 显示所有候选任务（即使不包含mermaid）
        console.log(`\n📊 所有候选任务 (${detailedResults.length}个):`);
        detailedResults.forEach(task => {
            console.log(`   - 任务 #${task.id}: ${task.title} [${task.matched_term}] ${task.has_mermaid_code ? '✅' : '❌'}`);
        });
        
    } catch (error) {
        console.error("❌ 搜索过程中出错:", error);
    }
}

// 执行搜索
searchMermaidTasksTargeted().catch(console.error);