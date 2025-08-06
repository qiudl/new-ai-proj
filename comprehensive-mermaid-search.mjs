#!/usr/bin/env node

import { TaskMCPServer } from "./mcp-task-bridge/task-mcp.js";

const taskServer = new TaskMCPServer();

async function comprehensiveMermaidSearch() {
    console.log("🔍 全面搜索系统中所有包含Mermaid内容的任务...\n");
    
    const allMermaidTasks = [];
    const mermaidKeywords = [
        'mermaid', '```mermaid', 'flowchart', 'graph', 'sequenceDiagram',
        'classDiagram', 'gantt', '流程图', '图表', '流程', '图'
    ];
    
    try {
        // 获取所有项目
        const projectsResult = await taskServer.listProjects();
        if (!projectsResult.success) {
            console.error("❌ 无法获取项目列表:", projectsResult.error);
            return;
        }
        
        console.log(`📋 找到 ${projectsResult.projects.length} 个项目\n`);
        
        // 遍历所有项目
        for (const project of projectsResult.projects) {
            console.log(`🔍 搜索项目 ${project.id}: ${project.name}`);
            
            const tasksResult = await taskServer.listTasks(project.id);
            if (!tasksResult.success) {
                console.log(`⚠️  跳过项目 ${project.id} (无法获取任务列表): ${tasksResult.error}`);
                continue;
            }
            
            console.log(`   📊 项目包含 ${tasksResult.tasks.length} 个任务`);
            
            let projectMermaidCount = 0;
            
            // 检查每个任务
            for (const task of tasksResult.tasks) {
                try {
                    // 获取任务详细信息
                    const fullTask = await taskServer.findTaskById(task.id);
                    
                    let taskHasMermaid = false;
                    let mermaidInfo = {
                        id: fullTask.id,
                        title: fullTask.title,
                        status: fullTask.status,
                        project_id: fullTask.project_id,
                        project_name: project.name,
                        created_at: fullTask.created_at,
                        matched_keywords: [],
                        mermaid_blocks: [],
                        has_display_issues: false,
                        content_sources: [],
                        description_preview: '',
                        document_preview: ''
                    };
                    
                    // 检查任务标题
                    const titleText = (fullTask.title || '').toLowerCase();
                    for (const keyword of mermaidKeywords) {
                        if (titleText.includes(keyword.toLowerCase())) {
                            taskHasMermaid = true;
                            if (!mermaidInfo.matched_keywords.includes(keyword)) {
                                mermaidInfo.matched_keywords.push(keyword);
                            }
                            if (!mermaidInfo.content_sources.includes('title')) {
                                mermaidInfo.content_sources.push('title');
                            }
                        }
                    }
                    
                    // 检查任务描述
                    if (fullTask.description) {
                        const descText = fullTask.description.toLowerCase();
                        
                        for (const keyword of mermaidKeywords) {
                            if (descText.includes(keyword.toLowerCase())) {
                                taskHasMermaid = true;
                                if (!mermaidInfo.matched_keywords.includes(keyword)) {
                                    mermaidInfo.matched_keywords.push(keyword);
                                }
                                if (!mermaidInfo.content_sources.includes('description')) {
                                    mermaidInfo.content_sources.push('description');
                                }
                            }
                        }
                        
                        // 提取mermaid代码块
                        const mermaidBlocks = fullTask.description.match(/```mermaid[\s\S]*?```/g);
                        if (mermaidBlocks) {
                            mermaidInfo.mermaid_blocks.push(...mermaidBlocks);
                        }
                        
                        // 检查是否有显示问题
                        if (descText.includes('显示不了') || descText.includes('空白') || 
                            descText.includes('不能预览') || descText.includes('loading') ||
                            descText.includes('渲染失败') || descText.includes('图表问题')) {
                            mermaidInfo.has_display_issues = true;
                        }
                        
                        // 获取描述预览
                        mermaidInfo.description_preview = fullTask.description.substring(0, 150);
                    }
                    
                    // 检查任务文档
                    try {
                        const docResult = await taskServer.getTaskDocument(task.id);
                        if (docResult.success && docResult.content) {
                            const docText = docResult.content.toLowerCase();
                            
                            for (const keyword of mermaidKeywords) {
                                if (docText.includes(keyword.toLowerCase())) {
                                    taskHasMermaid = true;
                                    if (!mermaidInfo.matched_keywords.includes(keyword)) {
                                        mermaidInfo.matched_keywords.push(keyword);
                                    }
                                    if (!mermaidInfo.content_sources.includes('document')) {
                                        mermaidInfo.content_sources.push('document');
                                    }
                                }
                            }
                            
                            // 提取文档中的mermaid代码块
                            const docMermaidBlocks = docResult.content.match(/```mermaid[\s\S]*?```/g);
                            if (docMermaidBlocks) {
                                mermaidInfo.mermaid_blocks.push(...docMermaidBlocks);
                            }
                            
                            // 检查文档中的显示问题
                            if (docText.includes('显示不了') || docText.includes('空白') || 
                                docText.includes('不能预览') || docText.includes('loading') ||
                                docText.includes('pdf导出') && docText.includes('问题')) {
                                mermaidInfo.has_display_issues = true;
                            }
                            
                            // 获取文档预览
                            mermaidInfo.document_preview = docResult.content.substring(0, 150);
                        }
                    } catch (docError) {
                        // 忽略文档获取错误
                    }
                    
                    if (taskHasMermaid) {
                        allMermaidTasks.push(mermaidInfo);
                        projectMermaidCount++;
                    }
                    
                } catch (taskError) {
                    // 忽略单个任务错误，继续处理其他任务
                    console.log(`     ⚠️  跳过任务 ${task.id}: ${taskError.message}`);
                }
            }
            
            console.log(`   ✅ 项目 ${project.id} 找到 ${projectMermaidCount} 个包含Mermaid的任务\n`);
        }
        
        // 输出详细结果
        console.log("=" * 80);
        console.log("🎯 全面搜索结果\n");
        
        if (allMermaidTasks.length === 0) {
            console.log("❌ 没有找到包含Mermaid内容的任务");
            return [];
        }
        
        console.log(`🎉 总共找到 ${allMermaidTasks.length} 个包含Mermaid内容的任务:\n`);
        
        // 按项目分组显示
        const tasksByProject = {};
        allMermaidTasks.forEach(task => {
            if (!tasksByProject[task.project_name]) {
                tasksByProject[task.project_name] = [];
            }
            tasksByProject[task.project_name].push(task);
        });
        
        for (const [projectName, tasks] of Object.entries(tasksByProject)) {
            console.log(`\n📁 项目: ${projectName} (${tasks.length}个任务)`);
            console.log("─" * 60);
            
            tasks.forEach(task => {
                console.log(`\n🔹 任务 #${task.id}: ${task.title}`);
                console.log(`   状态: ${task.status}`);
                console.log(`   匹配关键词: ${task.matched_keywords.join(', ')}`);
                console.log(`   内容位置: ${task.content_sources.join(', ')}`);
                console.log(`   Mermaid代码块: ${task.mermaid_blocks.length}个`);
                
                if (task.has_display_issues) {
                    console.log(`   🚨 发现显示问题`);
                }
                
                if (task.description_preview) {
                    console.log(`   📝 描述预览: ${task.description_preview}${task.description_preview.length >= 150 ? '...' : ''}`);
                }
                
                if (task.document_preview) {
                    console.log(`   📄 文档预览: ${task.document_preview}${task.document_preview.length >= 150 ? '...' : ''}`);
                }
                
                console.log(`   🕒 创建时间: ${task.created_at}`);
            });
        }
        
        // 重点关注 - 有显示问题的任务
        const problemTasks = allMermaidTasks.filter(task => task.has_display_issues);
        if (problemTasks.length > 0) {
            console.log(`\n\n🚨 需要重点关注的问题任务 (${problemTasks.length}个):`);
            console.log("这些任务明确提到了Mermaid渲染或显示问题:\n");
            
            problemTasks.forEach(task => {
                console.log(`   🔥 任务 #${task.id}: ${task.title}`);
                console.log(`      项目: ${task.project_name}`);
                console.log(`      状态: ${task.status}`);
                console.log(`      代码块数量: ${task.mermaid_blocks.length}`);
                console.log(`      内容位置: ${task.content_sources.join(', ')}\n`);
            });
        }
        
        // 包含实际Mermaid代码块的任务
        const codeBlockTasks = allMermaidTasks.filter(task => task.mermaid_blocks.length > 0);
        if (codeBlockTasks.length > 0) {
            console.log(`\n📊 包含Mermaid代码块的任务 (${codeBlockTasks.length}个):`);
            console.log("这些任务包含实际的```mermaid代码块:\n");
            
            codeBlockTasks.forEach(task => {
                console.log(`   📈 任务 #${task.id}: ${task.title}`);
                console.log(`      代码块数量: ${task.mermaid_blocks.length}`);
                console.log(`      项目: ${task.project_name}`);
                console.log(`      状态: ${task.status}\n`);
            });
        }
        
        // 统计信息
        console.log("\n📊 统计信息:");
        console.log(`   总找到任务数: ${allMermaidTasks.length}`);
        console.log(`   有显示问题的: ${problemTasks.length}`);
        console.log(`   包含代码块的: ${codeBlockTasks.length}`);
        console.log(`   总Mermaid代码块: ${allMermaidTasks.reduce((sum, t) => sum + t.mermaid_blocks.length, 0)}`);
        
        // 项目分布
        const projectStats = {};
        allMermaidTasks.forEach(task => {
            projectStats[task.project_name] = (projectStats[task.project_name] || 0) + 1;
        });
        console.log(`   项目分布: ${JSON.stringify(projectStats, null, 2)}`);
        
        console.log(`\n📋 所有Mermaid相关任务ID: ${allMermaidTasks.map(t => t.id).sort((a,b) => a-b).join(', ')}`);
        
        return allMermaidTasks;
        
    } catch (error) {
        console.error("❌ 搜索过程中出错:", error);
        return [];
    }
}

// 执行搜索
comprehensiveMermaidSearch().then(results => {
    if (results.length > 0) {
        console.log(`\n🎯 搜索完成！建议重点调试任务ID: ${results.filter(t => t.has_display_issues || t.mermaid_blocks.length > 0).map(t => t.id).join(', ')}`);
    }
}).catch(console.error);