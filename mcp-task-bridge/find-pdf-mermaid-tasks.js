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

async function searchPDFTasks() {
  try {
    await client.connect(transport);
    
    // Search for tasks related to PDF export and Mermaid
    const result = await client.request({
      method: "call_tool",
      params: {
        name: "find_task",
        arguments: {
          titlePattern: "PDF"
        }
      }
    });
    
    console.log("PDF tasks found:", JSON.stringify(result, null, 2));
    
    // Also search for Mermaid
    const mermaidResult = await client.request({
      method: "call_tool",
      params: {
        name: "find_task",
        arguments: {
          titlePattern: "Mermaid"
        }
      }
    });
    
    console.log("Mermaid tasks found:", JSON.stringify(mermaidResult, null, 2));
    
    // Also search for 流程图
    const flowchartResult = await client.request({
      method: "call_tool",
      params: {
        name: "find_task",
        arguments: {
          titlePattern: "流程图"
        }
      }
    });
    
    console.log("流程图 tasks found:", JSON.stringify(flowchartResult, null, 2));
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.close();
  }
}

searchPDFTasks();
