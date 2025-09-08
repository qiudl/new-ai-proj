import { TaskMCPServer } from './dist/task-mcp.js';

async function main() {
  const apiBase = process.env.API_BASE || 'http://localhost:8080/api/v1';
  const username = process.env.DEV_LOGIN_USERNAME || 'admin';

  const server = new TaskMCPServer(apiBase);

  // Try dev quick login if no token detected by BaseClient
  let hasToken = !!process.env.TASK_API_TOKEN || !!process.env.API_TOKEN;
  if (!hasToken) {
    try {
      const login = await server.devQuickLogin(username);
      console.error('[SMOKE] devQuickLogin:', login?.success ? 'success' : login?.error || 'failed');
      hasToken = !!(login && login.success && (login.token || (login.data && login.data.token)));
    } catch (e) {
      console.error('[SMOKE] devQuickLogin error:', e?.message || e);
    }
  }

  // Now call get_active_timers via TaskMCPServer
  const res = await server.getActiveTimers();
  console.log(JSON.stringify(res, null, 2));
}

main().catch((e) => {
  console.error('[SMOKE] Fatal error:', e?.message || e);
  process.exit(1);
});

