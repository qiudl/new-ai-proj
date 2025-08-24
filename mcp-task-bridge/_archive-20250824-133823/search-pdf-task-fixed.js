import { TaskMCPServer } from "./task-mcp.js";

const taskServer = new TaskMCPServer();

async function findPDFMermaidTask() {
    console.log("Searching for PDF Mermaid related tasks...\n");
    
    try {
        // Search for tasks containing PDF keyword
        const pdfResult = await taskServer.findTaskByName("PDF");
        console.log("PDF related tasks:", JSON.stringify(pdfResult, null, 2));
        
        // Search for tasks containing Mermaid keyword
        const mermaidResult = await taskServer.findTaskByName("Mermaid");
        console.log("Mermaid related tasks:", JSON.stringify(mermaidResult, null, 2));
        
        // Search for flowchart keyword
        const flowchartResult = await taskServer.findTaskByName("流程图");
        console.log("Flowchart related tasks:", JSON.stringify(flowchartResult, null, 2));
        
        // Search for export keyword
        const exportResult = await taskServer.findTaskByName("导出");
        console.log("Export related tasks:", JSON.stringify(exportResult, null, 2));
        
        // List recent tasks to find task 497
        const recentTasks = await taskServer.listTasks(1);
        if (recentTasks.success) {
            console.log("Recent tasks:");
            recentTasks.tasks.slice(-10).forEach(task => {
                console.log(`- ID: ${task.id}, Title: "${task.title}", Status: ${task.status}`);
            });
            
            // Look for task 497
            const task497 = recentTasks.tasks.find(t => t.id === 497);
            if (task497) {
                console.log("\nFound task 497:", JSON.stringify(task497, null, 2));
                return task497;
            }
        }
        
    } catch (error) {
        console.error("Error searching tasks:", error);
    }
}

findPDFMermaidTask().catch(console.error);