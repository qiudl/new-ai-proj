// E2E create_task via MCP over stdio without leaking tokens in logs
// Usage: node mcp-task-bridge/e2e_create_task.mjs
import { spawn } from 'node:child_process';

function serialize(obj) { return JSON.stringify(obj) + "\n"; }

class MsgBus {
  constructor() {
    this.buf = Buffer.alloc(0);
    this.waiters = new Map();
  }
  push(chunk) {
    this.buf = Buffer.concat([this.buf, chunk]);
    while (true) {
      const nl = this.buf.indexOf('\n');
      if (nl === -1) break;
      let line = this.buf.slice(0, nl).toString('utf8');
      if (line.endsWith('\r')) line = line.slice(0, -1);
      this.buf = this.buf.slice(nl + 1);
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
  waitFor(id, timeoutMs = 12000) {
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
      MCP_DEBUG_PERMISSIONS: 'false' // reduce noise
    },
    stdio: ['pipe', 'pipe', 'pipe']
  });

  const bus = new MsgBus();
  child.stdout.on('data', (d) => bus.push(d));
  // keep stderr for diagnostics but do not print tokens from tool responses
  child.stderr.on('data', (d) => process.stderr.write(d));

  const send = (msg) => child.stdin.write(serialize(msg));

  // 1) initialize
  send({
    jsonrpc: '2.0', id: 1, method: 'initialize',
    params: {
      protocolVersion: '2025-06-18',
      capabilities: { tools: {} },
      clientInfo: { name: 'e2e-create-task', version: '0.1.0' }
    }
  });
  await bus.waitFor(1, 12000);

  // 2) login (dev quick login)
  send({
    jsonrpc: '2.0', id: 2, method: 'tools/call',
    params: { name: 'dev_quick_login', arguments: { username: process.env.DEV_LOGIN_USERNAME || 'admin' } }
  });
  await bus.waitFor(2, 12000); // don't print token

  // 3) create_task
  const title = `MCP 测试任务 - ${new Date().toISOString()}`;
  send({
    jsonrpc: '2.0', id: 3, method: 'tools/call',
    params: { name: 'create_task', arguments: { title, projectId: 1 } }
  });
  const createResp = await bus.waitFor(3, 15000);

  // Extract tool result from text content
  let result = null;
  try {
    const text = createResp?.result?.content?.[0]?.text || '{}';
    result = JSON.parse(text);
  } catch {}

  console.log(JSON.stringify({
    ok: !!result?.success,
    created: result?.success ? {
      id: result?.id ?? result?.data?.id,
      title: result?.title ?? result?.data?.title ?? title,
      status: result?.status ?? result?.data?.status,
      priority: result?.priority ?? result?.data?.custom_fields?.priority,
      message: result?.message
    } : null,
    error: result?.success ? null : (result?.error || 'unknown')
  }));

  // cleanup
  child.kill('SIGTERM');
}

main().catch((e) => {
  console.error('E2E_CREATE_TASK_ERROR', e?.message || e);
  process.exit(1);
});

