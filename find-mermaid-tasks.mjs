#!/usr/bin/env node

import { TaskMCPServer } from "./mcp-task-bridge/task-mcp.js";

const taskServer = new TaskMCPServer();

async function searchMermaidTasks() {
    console.log("🔍 搜索包含Mermaid内容的任务...\n");
    
    const mermaidKeywords = [
        'mermaid',
        '```mermaid',
        'flowchart',
        'sequenceDiagram', 
        'classDiagram',
        'gantt',
        'graph',
        '流程图',
        'erDiagram',
        'journey'
    ];
    
    const foundTasks = [];
    
    try {
        // 获取所有项目
        const projectsResult = await taskServer.listProjects();
        if (!projectsResult.success) {
            console.error("❌ 无法获取项目列表:", projectsResult.error);
            return;
        }
        
        console.log(`📋 找到 ${projectsResult.projects.length} 个项目，开始搜索...\n`);
        
        // 遍历所有项目
        for (const project of projectsResult.projects) {
            console.log(`🔍 搜索项目 ${project.id}: ${project.name}`);
            
            const tasksResult = await taskServer.listTasks(project.id);
            if (!tasksResult.success) {
                console.log(`⚠️  跳过项目 ${project.id} (无法获取任务列表)`);
                continue;
            }
            
            // 遍历所有任务
            for (const task of tasksResult.tasks) {
                try {
                    // 获取任务详细信息
                    const fullTask = await taskServer.findTaskById(task.id);
                    let hasMermaidContent = false;
                    let matchedKeywords = [];
                    let contentSources = [];
                    
                    // 检查任务标题
                    const titleText = (fullTask.title || '').toLowerCase();
                    for (const keyword of mermaidKeywords) {
                        if (titleText.includes(keyword.toLowerCase())) {
                            hasMermaidContent = true;
                            matchedKeywords.push(keyword);
                            contentSources.push('title');
                            break;
                        }
                    }
                    
                    // 检查任务描述
                    const descText = (fullTask.description || '').toLowerCase();
                    for (const keyword of mermaidKeywords) {
                        if (descText.includes(keyword.toLowerCase())) {
                            hasMermaidContent = true;
                            if (!matchedKeywords.includes(keyword)) {
                                matchedKeywords.push(keyword);
                            }
                            if (!contentSources.includes('description')) {
                                contentSources.push('description');
                            }
                        }
                    }
                    
                    // 检查任务文档
                    try {
                        const docResult = await taskServer.getTaskDocument(task.id);
                        if (docResult.success && docResult.content) {
                            const docText = docResult.content.toLowerCase();
                            for (const keyword of mermaidKeywords) {
                                if (docText.includes(keyword.toLowerCase())) {
                                    hasMermaidContent = true;
                                    if (!matchedKeywords.includes(keyword)) {
                                        matchedKeywords.push(keyword);
                                    }
                                    if (!contentSources.includes('document')) {
                                        contentSources.push('document');
                                    }
                                }
                            }
                        }
                    } catch (docError) {
                        // 忽略文档获取错误，可能任务没有文档
                    }
                    
                    if (hasMermaidContent) {
                        foundTasks.push({
                            id: fullTask.id,
                            title: fullTask.title,
                            project_id: fullTask.project_id,
                            project_name: project.name,
                            status: fullTask.status,
                            matched_keywords: matchedKeywords,
                            content_sources: contentSources,
                            description: fullTask.description,
                            created_at: fullTask.created_at
                        });
                    }
                    
                } catch (taskError) {
                    // 忽略单个任务的错误
                    console.log(`⚠️  跳过任务 ${task.id}: ${taskError.message}`);
                }
            }
        }
        
        // 输出结果
        console.log(`\n🎯 搜索完成！找到 ${foundTasks.length} 个包含Mermaid内容的任务:\n`);
        
        if (foundTasks.length === 0) {
            console.log("❌ 没有找到包含Mermaid内容的任务");
            return;
        }
        
        // 按项目分组显示结果
        const tasksByProject = {};
        foundTasks.forEach(task => {
            if (!tasksByProject[task.project_name]) {
                tasksByProject[task.project_name] = [];
            }
            tasksByProject[task.project_name].push(task);
        });
        
        for (const [projectName, tasks] of Object.entries(tasksByProject)) {
            console.log(`\n📁 项目: ${projectName}`);
            console.log("─".repeat(50));
            
            tasks.forEach(task => {
                console.log(`\n🔹 任务 #${task.id}: ${task.title}`);
                console.log(`   状态: ${task.status}`);
                console.log(`   匹配关键词: ${task.matched_keywords.join(', ')}`);
                console.log(`   内容位置: ${task.content_sources.join(', ')}`);
                
                if (task.description && task.description.length > 0) {
                    const shortDesc = task.description.length > 100 
                        ? task.description.substring(0, 100) + '...' 
                        : task.description;
                    console.log(`   描述: ${shortDesc}`);
                }
                
                console.log(`   创建时间: ${task.created_at}`);
            });
        }
        
        // 输出任务ID列表供进一步调试
        console.log(`\n📋 任务ID列表: ${foundTasks.map(t => t.id).join(', ')}`);
        
        // 特别关注包含```mermaid的任务
        const mermaidCodeBlockTasks = foundTasks.filter(task => 
            task.matched_keywords.some(keyword => keyword.includes('```mermaid'))
        );
        
        if (mermaidCodeBlockTasks.length > 0) {
            console.log(`\n🚨 特别关注 - 包含 \`\`\`mermaid 代码块的任务 (${mermaidCodeBlockTasks.length}个):`);
            mermaidCodeBlockTasks.forEach(task => {
                console.log(`   - 任务 #${task.id}: ${task.title}`);
            });
        }
        
    } catch (error) {
        console.error("❌ 搜索过程中出错:", error);
    }
}

// 执行搜索
searchMermaidTasks().catch(console.error);