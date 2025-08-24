// Simple WebSocket + HTTP progress server for demo
// Serves GET /progress (JSON) and WS /ws pushes of progress updates
import express from 'express';
import { WebSocketServer } from 'ws';
import http from 'http';

const app = express();
app.use(express.json());

// In-memory progress map
let progress = {
  T567: { id: 'T567', progress: 10, status: 'INIT', output: '拉起构建环境...' },
  T568: { id: 'T568', progress: 8, status: 'INIT', output: '加载主题变量...' },
  T569: { id: 'T569', progress: 0, status: 'WAITING_DEPS', output: '等待 T567 完成...' },
  T570: { id: 'T570', progress: 0, status: 'WAITING_DEPS', output: '等待 T567 完成...' },
  T571: { id: 'T571', progress: 0, status: 'WAITING_DEPS', output: '等待 T567/T568 完成...' },
  T573: { id: 'T573', progress: 0, status: 'WAITING_DEPS', output: '等待 T567/T569 完成...' },
  T572: { id: 'T572', progress: 0, status: 'WAITING_DEPS', output: '等待 T573 完成...' }
};

// HTTP endpoint for polling
app.get('/progress', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(Object.values(progress));
});

// Optional: manual update via POST
app.post('/progress', (req, res) => {
  const updates = Array.isArray(req.body) ? req.body : [req.body];
  updates.forEach(u => {
    if (!u || !u.id) return;
    progress[u.id] = { ...progress[u.id], ...u };
  });
  broadcast(Object.values(progress));
  res.json({ ok: true });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

function broadcast(data) {
  const payload = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === 1) client.send(payload);
  });
}

// Auto-progress simulation
setInterval(() => {
  // basic staged increments with dependency logic
  const p = progress;
  // T567, T568 move first
  if (p.T567.progress < 100) {
    p.T567.progress = Math.min(100, p.T567.progress + 8);
    p.T567.status = p.T567.progress < 100 ? 'BUILDING' : 'COMPLETED';
  }
  if (p.T568.progress < 100) {
    p.T568.progress = Math.min(100, p.T568.progress + 7);
    p.T568.status = p.T568.progress < 100 ? 'THEMING' : 'COMPLETED';
  }
  // T569 waits for T567
  if (p.T567.progress === 100 && p.T569.progress < 100) {
    p.T569.progress = Math.min(100, p.T569.progress + 6);
    p.T569.status = p.T569.progress < 100 ? 'INTEGRATING' : 'COMPLETED';
  }
  // T570 waits for T567
  if (p.T567.progress === 100 && p.T570.progress < 100) {
    p.T570.progress = Math.min(100, p.T570.progress + 5);
    p.T570.status = p.T570.progress < 100 ? 'A11Y' : 'COMPLETED';
  }
  // T571 waits for T567 & T568
  if (p.T567.progress === 100 && p.T568.progress === 100 && p.T571.progress < 100) {
    p.T571.progress = Math.min(100, p.T571.progress + 6);
    p.T571.status = p.T571.progress < 100 ? 'RESPONSIVE' : 'COMPLETED';
  }
  // T573 waits for T567 & T569
  if (p.T567.progress === 100 && p.T569.progress === 100 && p.T573.progress < 100) {
    p.T573.progress = Math.min(100, p.T573.progress + 6);
    p.T573.status = p.T573.progress < 100 ? 'INTEGRATING' : 'COMPLETED';
  }
  // T572 waits for T573
  if (p.T573.progress === 100 && p.T572.progress < 100) {
    p.T572.progress = Math.min(100, p.T572.progress + 8);
    p.T572.status = p.T572.progress < 100 ? 'TESTING' : 'COMPLETED';
  }
  broadcast(Object.values(progress));
}, 1500);

const PORT = process.env.PROGRESS_PORT || 4312;
server.listen(PORT, () => {
  console.log(`Progress server listening on http://localhost:${PORT} (WS /ws)`);
});

