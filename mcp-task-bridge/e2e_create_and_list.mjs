// E2E: create a task then list tasks via MCP stdio
// Usage: node mcp-task-bridge/e2e_create_and_list.mjs
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
  waitFor(id, timeoutMs = 15000) {
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
  send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: { tools: {} }, clientInfo: { name: 'e2e-create-and-list', version: '0.1.0' } } });
  await bus.waitFor(1, 12000);

  // 2) login
  send({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'dev_quick_login', arguments: { username: process.env.DEV_LOGIN_USERNAME || 'admin' } } });
  await bus.waitFor(2, 15000);

  // 3) create_task
  const title = `MCP 批量测试任务 - ${new Date().toISOString()}`;
  send({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'create_task', arguments: { title, projectId: 1 } } });
  const createResp = await bus.waitFor(3, 20000);
  let createResult = null;
  try { createResult = JSON.parse(createResp?.result?.content?.[0]?.text || '{}'); } catch {}

  // 4) list_tasks
  send({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'list_tasks', arguments: { projectId: 1 } } });
  const listResp = await bus.waitFor(4, 20000);
  let listResult = null;
  try { listResult = JSON.parse(listResp?.result?.content?.[0]?.text || '{}'); } catch {}

  const createdId = createResult?.id ?? createResult?.data?.id ?? null;
  const createdTitle = createResult?.title ?? createResult?.data?.title ?? title;

  console.log(JSON.stringify({
    create: {
      ok: !!createResult?.success,
      id: createdId,
      title: createdTitle,
      message: createResult?.message || null,
      error: createResult?.success ? null : (createResult?.error || 'unknown')
    },
    list: {
      ok: !!listResult?.success,
      total: listResult?.total ?? (Array.isArray(listResult?.tasks) ? listResult.tasks.length : null),
      hasCreated: createdId != null && Array.isArray(listResult?.tasks) ? listResult.tasks.some(t => t.id === createdId) : null,
      sample: Array.isArray(listResult?.tasks) ? listResult.tasks.slice(0, 5) : null,
      error: listResult?.success ? null : (listResult?.error || 'unknown')
    }
  }));

  child.kill('SIGTERM');
}

main().catch(e => { console.error('E2E_CREATE_AND_LIST_ERROR', e?.message || e); process.exit(1); });

