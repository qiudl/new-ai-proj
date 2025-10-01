// ESM test harness for MCP server over stdio
// Usage: node mcp-task-bridge/e2e_mcp_smoke.mjs
import { spawn } from 'node:child_process';

function serializeMessage(obj) {
  // SDK stdio transport uses NDJSON (one JSON message per line)
  return JSON.stringify(obj) + "\n";
}

class MessageReader {
  constructor() {
    this.buffer = Buffer.alloc(0);
    this.messages = [];
    this.waiters = new Map();
  }
  push(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    while (true) {
      const nlIndex = this.buffer.indexOf('\n');
      if (nlIndex === -1) break;
      let line = this.buffer.slice(0, nlIndex).toString('utf8');
      // trim optional CR
      if (line.endsWith('\r')) line = line.slice(0, -1);
      this.buffer = this.buffer.slice(nlIndex + 1);
      if (!line.trim()) continue;
      try {
        const obj = JSON.parse(line);
        console.error('[E2E] received message:', JSON.stringify(obj));
        this.messages.push(obj);
        const id = obj.id;
        if (id != null && this.waiters.has(id)) {
          const { resolve } = this.waiters.get(id);
          this.waiters.delete(id);
          resolve(obj);
        }
      } catch (e) {
        // ignore JSON parse errors
      }
    }
  }
  waitForId(id, timeoutMs = 5000) {
    return new Promise((resolve, reject) => {
      // check existing
      for (const m of this.messages) {
        if (m.id === id) return resolve(m);
      }
      const to = setTimeout(() => {
        if (this.waiters.has(id)) this.waiters.delete(id);
        reject(new Error(`Timeout waiting for response id=${id}`));
      }, timeoutMs);
      this.waiters.set(id, { resolve: (m) => { clearTimeout(to); resolve(m); }, reject });
    });
  }
}

async function run() {
  const serverPath = new URL('./dist/index.js', import.meta.url).pathname;
  const child = spawn('node', [serverPath], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      TASK_API_BASE: process.env.TASK_API_BASE || 'http://localhost:8080/api/v1',
      MCP_DEBUG_PERMISSIONS: 'true',
      DEV_LOGIN_USERNAME: process.env.DEV_LOGIN_USERNAME || 'admin'
    },
    stdio: ['pipe', 'pipe', 'pipe']
  });

  const reader = new MessageReader();
  child.stdout.on('data', (chunk) => reader.push(chunk));
  child.stderr.on('data', (chunk) => process.stderr.write(chunk));

  const send = (obj) => child.stdin.write(serializeMessage(obj));

  // 1) initialize
  send({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2025-06-18',
      capabilities: { tools: {} },
      clientInfo: { name: 'e2e-smoke', version: '0.1.0' }
    }
  });
  const initResp = await reader.waitForId(1, 12000);

  // 2) tools/list
  send({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
  const listResp = await reader.waitForId(2, 8000);

  // 3) tools/call dev_quick_login (may fail if backend not available; still validates tool path)
  send({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'dev_quick_login', arguments: { username: process.env.DEV_LOGIN_USERNAME || 'admin' } } });
  const loginResp = await reader.waitForId(3, 12000);

  // 4) tools/call has_task_document for local fallback (taskId=4242)
  send({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'has_task_document', arguments: { taskId: 4242 } } });
  const hasDocResp = await reader.waitForId(4, 8000);

  // 5) tools/call get_task_document for local fallback (taskId=4242)
  send({ jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'get_task_document', arguments: { taskId: 4242 } } });
  const getDocResp = await reader.waitForId(5, 8000);

  // print summary
  const out = {
    init: initResp,
    list: listResp,
    login: loginResp,
    hasDoc: hasDocResp,
    getDoc: getDocResp,
  };
  console.log(JSON.stringify(out));

  // Cleanup
  child.kill('SIGTERM');
}

run().catch((e) => {
  console.error('E2E_SMOKE_ERROR', e?.message || e);
  process.exit(1);
});
