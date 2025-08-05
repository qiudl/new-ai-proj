#\!/usr/bin/env node

import { TaskMCPServer } from "./task-mcp.js";

const taskServer = new TaskMCPServer();

async function findPDFMermaidTask() {
    console.log("🔍 查找PDF Mermaid相关任务...
");
    
    try {
        // 查找包含PDF关键词的任务
        const pdfResult = await taskServer.findTaskByName("PDF");
        console.log("PDF相关任务:", JSON.stringify(pdfResult, null, 2));
        
        // 查找包含Mermaid关键词的任务
        const mermaidResult = await taskServer.findTaskByName("Mermaid");
        console.log("Mermaid相关任务:", JSON.stringify(mermaidResult, null, 2));
        
        // 查找包含流程图关键词的任务
        const flowchartResult = await taskServer.findTaskByName("流程图");
        console.log("流程图相关任务:", JSON.stringify(flowchartResult, null, 2));
        
        // 查找包含导出关键词的任务
        const exportResult = await taskServer.findTaskByName("导出");
        console.log("导出相关任务:", JSON.stringify(exportResult, null, 2));
        
        // 尝试直接获取任务497
        const task497Result = await taskServer.listTasks(1);
        if (task497Result.success) {
            const task497 = task497Result.tasks.find(t => t.id === 497);
            if (task497) {
                console.log("找到任务497:", JSON.stringify(task497, null, 2));
                return task497;
            }
        }
        
    } catch (error) {
        console.error("搜索任务时出错:", error);
    }
}

findPDFMermaidTask().catch(console.error);
