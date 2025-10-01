// E2E: create a task then complete it via MCP stdio
// Usage: node mcp-task-bridge/e2e_complete_task.mjs
import { spawn } from 'node:child_process';

function sendLine(obj) { return JSON.stringify(obj) + "\n"; }

class Bus {
  constructor() { this.buf = Buffer.alloc(0); this.waiters = new Map(); }
  push(chunk) {
    this.buf = Buffer.concat([this.buf, chunk]);
    while (true) {
      const p = this.buf.indexOf('\n');
      if (p === -1) break;
      let line = this.buf.slice(0, p).toString('utf8');
      if (line.endsWith('\r')) line = line.slice(0, -1);
      this.buf = this.buf.slice(p + 1);
      if (!line.trim()) continue;
      try {
        const obj = JSON.parse(line);
        const id = obj.id;
        if (id != null && this.waiters.has(id)) {
          const { resolve, timeout } = this.waiters.get(id);
          clearTimeout(timeout);
          this.waiters.delete(id);
          resolve(obj);
        }
      } catch {}
    }
  }
  waitFor(id, timeoutMs = 20000) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.waiters.delete(id);
        reject(new Error(`Timeout waiting for id=${id}`));
      }, timeoutMs);
      this.waiters.set(id, { resolve, timeout });
    });
  }
}

async function main() {
  const serverPath = new URL('./dist/index.js', import.meta.url).pathname;
  const child = spawn('node', [serverPath], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      TASK_API_BASE: process.env.TASK_API_BASE || 'http://localhost:8080/api/v1',
      DEV_LOGIN_USERNAME: process.env.DEV_LOGIN_USERNAME || 'admin',
      MCP_DEBUG_PERMISSIONS: 'false'
    },
    stdio: ['pipe', 'pipe', 'pipe']
  });

  const bus = new Bus();
  child.stdout.on('data', d => bus.push(d));
  child.stderr.on('data', d => process.stderr.write(d));
  const send = msg => child.stdin.write(sendLine(msg));

  // 1) initialize
  send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: { tools: {} }, clientInfo: { name: 'e2e-complete-task', version: '0.1.0' } } });
  await bus.waitFor(1, 12000);

  // 2) login
  send({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'dev_quick_login', arguments: { username: process.env.DEV_LOGIN_USERNAME || 'admin' } } });
  await bus.waitFor(2, 15000);

  // 3) create_task
  const title = `MCP 完成任务测试 - ${new Date().toISOString()}`;
  send({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'create_task', arguments: { title, projectId: 1 } } });
  const createResp = await bus.waitFor(3, 20000);
  let createResult = null;
  try { createResult = JSON.parse(createResp?.result?.content?.[0]?.text || '{}'); } catch {}
  const createdId = createResult?.id ?? createResult?.data?.id ?? null;

  // 4) complete_task
  let completeResult = null;
  if (createdId != null) {
    send({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'complete_task', arguments: { id: createdId } } });
    const completeResp = await bus.waitFor(4, 20000);
    try { completeResult = JSON.parse(completeResp?.result?.content?.[0]?.text || '{}'); } catch {}
  }

  // 5) verify by fetching details
  let detailsResult = null;
  if (createdId != null) {
    send({ jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'get_detailed_task_info', arguments: { taskId: createdId } } });
    const detailsResp = await bus.waitFor(5, 20000);
    try { detailsResult = JSON.parse(detailsResp?.result?.content?.[0]?.text || '{}'); } catch {}
  }

  console.log(JSON.stringify({
    created: { ok: !!createResult?.success, id: createdId, message: createResult?.message, error: createResult?.success ? null : (createResult?.error || 'unknown') },
    completed: { ok: !!completeResult?.success, status: completeResult?.status, message: completeResult?.message, error: completeResult?.success ? null : (completeResult?.error || 'unknown') },
    details: { ok: !!detailsResult?.success, status: detailsResult?.data?.status ?? null }
  }));

  child.kill('SIGTERM');
}

main().catch(e => { console.error('E2E_COMPLETE_TASK_ERROR', e?.message || e); process.exit(1); });

