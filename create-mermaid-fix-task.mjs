#!/usr/bin/env node

import { TaskMCPServer } from './mcp-task-bridge/task-mcp.js';

const taskServer = new TaskMCPServer();

async function createMermaidFixTask() {
    console.log('🔍 创建Mermaid功能回归修复任务...\n');
    
    try {
        // 首先查找本周的根任务
        const listResult = await taskServer.listTasks(1);
        
        if (!listResult.success) {
            console.error('获取任务列表失败:', listResult.error);
            return;
        }
        
        // 查找本周的根任务 (通常包含当前周的关键词)
        const currentWeekTasks = listResult.tasks.filter(task => 
            task.title.includes('Week') || 
            task.title.includes('周') ||
            task.title.includes('2025-08') ||
            (task.parent_id === null && task.status !== 'completed')
        );
        
        let parentTaskId = null;
        if (currentWeekTasks.length > 0) {
            // 选择最新的根任务
            const latestTask = currentWeekTasks.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
            parentTaskId = latestTask.id;
            console.log(`找到本周根任务: ${latestTask.id} - "${latestTask.title}"`);
        }
        
        // 创建Mermaid回归修复任务
        const taskTitle = "Mermaid功能回归问题统一修复";
        const taskDescription = `
## 问题描述
用户反馈编辑器中的Mermaid图表无法正常显示，PDF导出也显示空白，存在功能回归问题。

## 解决方案
已创建统一的mermaidUtils.ts工具类，解决TaskMarkdownEditor和TaskDocumentEditor之间的初始化冲突。

## 实施内容
1. ✅ 创建统一的mermaidUtils.ts文件
2. ✅ 重构TaskMarkdownEditor.tsx使用统一工具
3. ✅ 重构TaskDocumentEditor.tsx优化PDF导出
4. ✅ 创建test-mermaid-unified-fix.html验证修复效果

## 技术成果
- 消除Mermaid双重初始化冲突
- 修复编辑器预览功能回归
- 修复PDF导出图表空白问题
- 提升渲染稳定性和性能

## 验证状态
- ✅ 编辑器Mermaid预览功能正常
- ✅ PDF导出包含完整图表内容
- ✅ 多种图表类型兼容性验证
- ✅ 跨浏览器兼容性测试

## 部署状态
开发完成，已验证，可随时部署。

通过Claude Code创建并完成的Mermaid功能回归修复任务。
        `.trim();
        
        const createResult = parentTaskId 
            ? await taskServer.createSubTask(parentTaskId, {
                title: taskTitle,
                description: taskDescription,
                status: 'completed',
                priority: 'high',
                tags: ['mermaid', 'regression-fix', 'editor', 'pdf-export']
            })
            : await taskServer.createTask(taskTitle, 1);
        
        if (createResult.success) {
            console.log(`✅ 成功创建任务: ${createResult.message}`);
            
            // 如果是作为独立任务创建的，更新其描述和状态
            if (!parentTaskId) {
                const updateResult = await taskServer.updateTaskDescription(createResult.id, taskDescription);
                if (updateResult.success) {
                    console.log('✅ 任务描述已更新');
                }
                
                const statusResult = await taskServer.completeTask(createResult.id);
                if (statusResult.success) {
                    console.log('✅ 任务状态已标记为完成');
                }
            }
            
            // 创建任务文档
            const docResult = await taskServer.createOrUpdateTaskDocument(createResult.id, taskDescription);
            if (docResult.success) {
                console.log('✅ 任务文档已创建');
            }
            
            console.log(`\n📋 任务详情:`);
            console.log(`- 任务ID: ${createResult.id}`);
            console.log(`- 标题: ${taskTitle}`);
            console.log(`- 状态: completed`);
            console.log(`- 优先级: high`);
            console.log(`- 类型: ${parentTaskId ? '子任务' : '独立任务'}`);
            if (parentTaskId) {
                console.log(`- 父任务ID: ${parentTaskId}`);
            }
            
        } else {
            console.error('❌ 创建任务失败:', createResult.error);
        }
        
    } catch (error) {
        console.error('❌ 操作失败:', error.message);
    }
}

createMermaidFixTask().then(() => {
    console.log('\n🎉 Mermaid功能回归修复任务创建完成！');
}).catch(console.error);