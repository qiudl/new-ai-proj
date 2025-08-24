import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "node",
  args: ["index.js"]
});

const client = new Client({
  name: "task-searcher",
  version: "1.0.0"
}, {
  capabilities: {}
});

async function searchTasks() {
  try {
    await client.connect(transport);
    
    // Search for tasks related to PDF export and Mermaid
    const result = await client.request({
      method: "call_tool",
      params: {
        name: "search_tasks",
        arguments: {
          query: "PDF导出中Mermaid流程图显示问题"
        }
      }
    });
    
    console.log("Search results:", JSON.stringify(result, null, 2));
    
    // Also search for task 497 specifically
    try {
      const task497 = await client.request({
        method: "call_tool", 
        params: {
          name: "get_task",
          arguments: {
            task_id: 497
          }
        }
      });
      
      console.log("Task 497 details:", JSON.stringify(task497, null, 2));
    } catch (error) {
      console.log("Task 497 not found or error:", error.message);
    }
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.close();
  }
}

searchTasks();
