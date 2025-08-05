import { TaskMCPServer } from "./task-mcp.js";

const taskServer = new TaskMCPServer();

async function verifyTask497() {
    console.log("Verifying task 497 completion...\n");
    
    try {
        // Get the updated task details
        const tasks = await taskServer.listTasks(1);
        const task497 = tasks.tasks.find(t => t.id === 497);
        
        console.log("Task 497 current status:", JSON.stringify(task497, null, 2));
        
        // Get the task document
        const docResult = await taskServer.getTaskDocument(497, 1);
        console.log("\nTask 497 document:");
        console.log(JSON.stringify(docResult, null, 2));
        
    } catch (error) {
        console.error("Error verifying task 497:", error);
    }
}

verifyTask497().catch(console.error);