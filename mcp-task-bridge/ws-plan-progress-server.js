// WebSocket progress server for plan-535-multi-ai.json
// Streams real-time task progress to reusable-parallel-monitor.html via WS
// Modes:
//   MODE=sim     -> simulate progress from plan (default)
//   MODE=bridge  -> accept external updates via HTTP and broadcast only
// Usage:
//   PORT=3001 PLAN=plan-535-multi-ai.json SPEED=1 TICK_MS=300 MODE=sim node ws-plan-progress-server.js
// Notes:
//   - Client expects array of {id, progress, status, output}
//   - In bridge mode, POST /update with an object or array of such payloads

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import express from 'express';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3001);
const PLAN = process.env.PLAN || 'plan-535-multi-ai.json';
const TICK_MS = Number(process.env.TICK_MS || 300);
const SPEED = Number(process.env.SPEED || 1);
const MODE = String(process.env.MODE || 'sim'); // 'sim' | 'bridge'

function resolvePlan(p) {
  return path.isAbsolute(p) ? p : path.resolve(__dirname, p);
}

function loadPlan(planPath) {
  const raw = fs.readFileSync(planPath, 'utf-8');
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) throw new Error('Plan must be an array');
  return data;
}

const planPath = resolvePlan(PLAN);
const plan = loadPlan(planPath);
const tasks = plan.filter(t => !t.summaryOf);

const state = new Map();
for (const cfg of tasks) {
  state.set(String(cfg.id), {
    id: String(cfg.id),
    started: false,
    done: false,
    progress: 0,
    status: 'INITIALIZING',
    output: '等待开始',
    stageIdx: 0,
    stageStartAt: null,
    delayStartUntil: null,
  });
}

function depsDone(cfg) {
  const deps = Array.isArray(cfg.dependsOn) ? cfg.dependsOn.map(String) : [];
  if (deps.length === 0) return true;
  return deps.every(d => state.get(d)?.done === true);
}

function prevStageProgress(stages, idx) {
  if (!stages || idx <= 0) return 0;
  const prev = stages[idx - 1];
  return typeof prev.progress === 'number' ? prev.progress : 0;
}

function scaled(ms) {
  const s = SPEED > 0 ? SPEED : 1;
  return Math.max(50, Math.round(ms / s));
}

function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

function computeUpdate(cfg, st, now) {
  if (st.done) return { id: st.id, progress: st.progress, status: '✅ COMPLETED', output: st.output };

  // deps
  if (!depsDone(cfg)) {
    st.status = 'WAITING_DEPS';
    st.output = '等待依赖完成...';
    return { id: st.id, progress: st.progress, status: st.status, output: st.output };
  }

  // start delay
  const startDelay = Number(cfg.startDelayMs || 0);
  if (!st.started) {
    if (startDelay > 0 && st.delayStartUntil == null) st.delayStartUntil = now + startDelay;
    if (st.delayStartUntil && now < st.delayStartUntil) {
      const remain = st.delayStartUntil - now;
      st.status = 'DELAYED_START';
      st.output = `延迟启动 ${remain}ms...`;
      return { id: st.id, progress: st.progress, status: st.status, output: st.output };
    }
    st.started = true;
    st.stageIdx = 0;
    st.stageStartAt = now;
  }

  const stages = Array.isArray(cfg.stages) && cfg.stages.length > 0 ? cfg.stages : [
    { name: '默认阶段1', duration: 1500, progress: 50 },
    { name: '默认阶段2', duration: 1500, progress: 100 }
  ];

  if (st.stageIdx >= stages.length) {
    st.done = true;
    st.progress = 100;
    st.status = '✅ COMPLETED';
    st.output = '任务完成';
    return { id: st.id, progress: st.progress, status: st.status, output: st.output };
  }

  const stage = stages[st.stageIdx];
  const stageName = String(stage.name || `阶段${st.stageIdx + 1}`);
  const duration = scaled(Number(stage.duration || 1000));
  const target = clamp(Number(stage.progress || 0), 0, 100);
  const base = prevStageProgress(stages, st.stageIdx);

  const elapsed = Math.max(0, now - st.stageStartAt);
  const ratio = clamp(elapsed / duration, 0, 1);
  const cur = Math.round(base + (target - base) * ratio);

  st.progress = Math.max(st.progress, cur);
  st.status = stageName.toUpperCase();
  st.output = `执行中: ${stageName}`;

  if (elapsed >= duration) {
    st.stageIdx += 1;
    st.stageStartAt = now;
    if (st.stageIdx >= stages.length && target >= 100) {
      st.done = true;
      st.progress = 100;
      st.status = '✅ COMPLETED';
      st.output = `${stageName} 完成，任务完成`;
    } else {
      st.output = `${stageName} 完成`;
    }
  }

  return { id: st.id, progress: st.progress, status: st.status, output: st.output };
}

// ---- Server (HTTP + WS) ----
const app = express();
app.use(express.json());
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log(`[ws] client connected, total=${clients.size}`);

  // send snapshot
  const snapshot = Array.from(state.values()).map(s => ({ id: s.id, progress: s.progress, status: s.status, output: s.output }));
  try { ws.send(JSON.stringify(snapshot)); } catch {}

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`[ws] client disconnected, total=${clients.size}`);
  });
});

function broadcast(arr) {
  const text = JSON.stringify(arr);
  for (const ws of clients) {
    if (ws.readyState === 1) {
      try { ws.send(text); } catch {}
    }
  }
}

// Control/health endpoints
app.get('/health', (_req, res) => {
  res.json({ ok: true, mode: MODE, port: PORT, plan: planPath, tickMs: TICK_MS, speed: SPEED, tasks: Array.from(state.keys()) });
});

// Accept external updates in bridge or hybrid modes
app.post('/update', (req, res) => {
  const updates = Array.isArray(req.body) ? req.body : [req.body];
  const applied = [];
  for (const u of updates) {
    if (!u || u.id == null) continue;
    const id = String(u.id);
    if (!state.has(id)) state.set(id, { id, started: true, done: false, progress: 0, status: 'INITIALIZING', output: '' });
    const st = state.get(id);
    if (typeof u.progress === 'number') st.progress = clamp(u.progress, 0, 100);
    if (typeof u.status === 'string') st.status = u.status;
    if (typeof u.output === 'string') st.output = u.output;
    if (st.progress >= 100) { st.done = true; st.status = '✅ COMPLETED'; }
    applied.push({ id, progress: st.progress, status: st.status, output: st.output });
  }
  if (applied.length) broadcast(applied);
  res.json({ ok: true, count: applied.length });
});

// Optional: adjust speed/tick at runtime
app.post('/control', (req, res) => {
  const { speed, tickMs } = req.body || {};
  if (typeof speed === 'number' && speed > 0) process.env.SPEED = String(speed);
  if (typeof tickMs === 'number' && tickMs >= 50) process.env.TICK_MS = String(tickMs);
  res.json({ ok: true, speed: process.env.SPEED || SPEED, tickMs: process.env.TICK_MS || TICK_MS });
});

server.listen(PORT, () => {
  console.log(`[ws] Listening on ws://localhost:${PORT}`);
  console.log(`[ws] Plan: ${planPath}`);
  console.log(`[ws] tick=${TICK_MS}ms speed=${SPEED} mode=${MODE}`);
});

// Simulation loop only when MODE !== 'bridge'
if (MODE !== 'bridge') {
  setInterval(() => {
    const now = Date.now();
    const updates = [];
    for (const cfg of tasks) {
      const st = state.get(String(cfg.id));
      if (!st) continue;
      updates.push(computeUpdate(cfg, st, now));
    }
    if (updates.length) broadcast(updates);
  }, TICK_MS);
}

process.on('SIGINT', () => { console.log('[ws] SIGINT'); process.exit(0); });
process.on('SIGTERM', () => { console.log('[ws] SIGTERM'); process.exit(0); });

