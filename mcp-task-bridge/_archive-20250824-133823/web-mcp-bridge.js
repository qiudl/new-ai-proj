// Web MCP bridge: expose simple HTTP endpoints to call MCP tools from browser
// Endpoints:
//  - POST /mcp/create-document { taskId, title?, projectId?, content }
//  - POST /mcp/update-task { id, updates }
// Internally uses an MCP client (stdio) to call the running task-mcp server
import express from 'express';
import { spawn } from 'child_process';

const app = express();
app.use(express.json());
// Minimal CORS for local dev (4311 -> 4313)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

function parseMcpStdout(stdout) {
  // Attempt to parse the last JSON-RPC message and extract tool result
  const lines = stdout.trim().split(/\n+/);
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    try {
      const obj = JSON.parse(line);
      const text = obj?.result?.content?.[0]?.text;
      if (typeof text === 'string') {
        try {
          const toolResult = JSON.parse(text);
          return { ok: true, rpc: obj, data: toolResult };
        } catch (_) {
          return { ok: true, rpc: obj, rawText: text };
        }
      }
    } catch (_) {
      // not a JSON line, continue scanning backwards
    }
  }
  return { ok: false, error: 'No JSON-RPC response found in stdout', stdout };
}

function callMcpTool(toolName, args) {
  return callMcpToolsSeq([{ name: toolName, arguments: args }]);
}

function callMcpToolsSeq(calls) {
  return new Promise((resolve) => {
    const child = spawn('node', ['index.js'], { cwd: process.cwd(), stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', d => { stdout += d.toString(); });
    child.stderr.on('data', d => { stderr += d.toString(); });

    // Send tools/list first
    const listReq = { jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} };
    child.stdin.write(JSON.stringify(listReq) + '\n');

    // Then sequential tool calls
    let id = 2;
    calls.forEach(call => {
      const req = { jsonrpc: '2.0', id: id++, method: 'tools/call', params: { name: call.name, arguments: call.arguments || {} } };
      child.stdin.write(JSON.stringify(req) + '\n');
    });

    setTimeout(() => {
      try {
        const parsed = parseMcpStdout(stdout);
        resolve({ ok: true, ...parsed, stdout, stderr });
      } catch (e) {
        resolve({ ok: false, error: String(e), stdout, stderr });
      } finally {
        try { child.kill('SIGTERM'); } catch(_) {}
      }
    }, 1400);
  });
}

app.post('/mcp/create-document', async (req, res) => {
  const { taskId, content, projectId = 1, title } = req.body || {};
  if (!taskId || !content) return res.status(400).json({ ok: false, error: 'taskId & content required' });
  // Attempt dev quick login in the same MCP process, then create-and-attach
  const result = await callMcpToolsSeq([
    { name: 'dev_quick_login', arguments: {} },
    { name: 'create-and-attach', arguments: { taskId: Number(taskId), content, projectId, title } }
  ]);
  res.json(result);
});

app.post('/mcp/update-task', async (req, res) => {
  const { id, updates } = req.body || {};
  if (!id || !updates) return res.status(400).json({ ok: false, error: 'id & updates required' });
  const result = await callMcpToolsSeq([
    { name: 'dev_quick_login', arguments: {} },
    { name: 'update_task', arguments: { id: Number(id), updates } }
  ]);
  res.json(result);
});

app.post('/mcp/find-task', async (req, res) => {
  const { id, titlePattern } = req.body || {};
  const args = {};
  if (id != null) args.id = Number(id);
  if (titlePattern) args.titlePattern = titlePattern;
  const result = await callMcpTool('find_task', args);
  res.json(result);
});

// Real-time progress adapter: GET /mcp/progress?parentId=537
// Returns array of {id, progress, status, output}
app.get('/mcp/progress', async (req, res) => {
  try {
    const parentId = Number(req.query.parentId);
    if (!parentId) return res.status(400).json({ ok:false, error: 'parentId required' });
const result = await callMcpToolsSeq([
      { name: 'dev_quick_login', arguments: {} },
      { name: 'get_task_children', arguments: { parentId } }
    ]);
    // result.data should be the tool JSON string parsed from MCP server
    const tool = result?.data || {};
    const children = tool.children || tool.data?.children || [];
    const mapStatusToProgress = (s) => {
      const m = {
        draft: 0, planning: 0, todo: 0,
        in_progress: 55, testing: 80, completed: 100,
        on_hold: 10, suspended: 10, blocked: 10,
        cancelled: 100, archived: 100
      };
      return m[(s||'').toLowerCase()] ?? 0;
    };
    const payload = children.map(c => ({
      id: String(c.id),
      progress: mapStatusToProgress(c.status),
      status: (c.status || 'unknown').toUpperCase(),
      output: `${c.title} | priority: ${c.priority || 'n/a'}`
    }));
    res.setHeader('Cache-Control', 'no-store');
    return res.json(payload);
  } catch (e) {
    return res.status(500).json({ ok:false, error: String(e?.message || e) });
  }
});

const PORT = process.env.MCP_BRIDGE_PORT || 4313;
app.listen(PORT, () => {
  console.log(`Web MCP bridge listening on http://localhost:${PORT}`);
});

