// Start a fresh MCP Task Server over stdio for this session and call create_or_update_task_document, then get_task_document.
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { TaskMCPServer } from './task-mcp.js';

const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:8081/api/v1';
const taskServer = new TaskMCPServer(apiBaseUrl);

const server = new Server({ name: 'task-manager-ephemeral', version: '1.0.1' }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'create_or_update_task_document',
        description: '创建或更新任务文档',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'number' },
            content: { type: 'string' },
            projectId: { type: 'number' }
          },
          required: ['taskId', 'content']
        }
      },
      {
        name: 'get_task_document',
        description: '获取任务文档内容',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'number' },
            projectId: { type: 'number' }
          },
          required: ['taskId']
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name } = request.params;
    let args = request.params.arguments;

    // Robust argument parsing: support stringified JSON or object
    if (typeof args === 'string') {
      try {
        args = JSON.parse(args);
      } catch (e) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: `Invalid arguments JSON: ${e.message}` }) }] };
      }
    }
    if (args == null || typeof args !== 'object') {
      return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: 'Arguments must be an object' }) }] };
    }

    let result;
    if (name === 'create_or_update_task_document') {
      result = await taskServer.createOrUpdateTaskDocument(args.taskId, args.content, args.projectId);
    } else if (name === 'get_task_document') {
      result = await taskServer.getTaskDocument(args.taskId, args.projectId);
    } else {
      return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: `Unknown tool: ${name}` }) }] };
    }

    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  } catch (err) {
    // Never crash the process on tool call; return structured error
    const msg = err && err.message ? err.message : String(err);
    return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: `Tool execution error: ${msg}` }) }] };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Ephemeral Task MCP Server started over stdio');

  // Keep the process alive until the stdio channel is closed by the host
  await new Promise(() => {});
}

// Do not force-exit the process on errors; just log them.
process.on('uncaughtException', (e) => { console.error('Uncaught Exception:', e); });
process.on('unhandledRejection', (r, p) => { console.error('Unhandled Rejection:', r); });

main().catch((e) => { console.error('Failed to start ephemeral server:', e); /* do not exit to avoid channel close */ });
