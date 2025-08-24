#!/usr/bin/env node

/**
 * 自动在指定分钟后停止当前计时（针对某个任务）
 * 用法：node auto-stop-timer.js --task 567 --after 90
 */
import { TaskMCPServer } from './task-mcp.js';

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { task: null, after: 60 };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--task') out.task = parseInt(args[++i], 10);
    else if (args[i] === '--after') out.after = parseInt(args[++i], 10);
  }
  if (!out.task || Number.isNaN(out.task)) throw new Error('缺少 --task <id>');
  if (!out.after || Number.isNaN(out.after)) out.after = 60;
  return out;
}

async function main() {
  const { task, after } = parseArgs();
  const server = new TaskMCPServer('http://localhost:8081/api/v1');
  const ms = after * 60 * 1000;
  const until = new Date(Date.now() + ms);
  console.log(`⏳ 将在 ${after} 分钟后自动停止任务 #${task} 的计时（预计 ${until.toISOString()}）`);
  await new Promise(r => setTimeout(r, ms));
  const res = await server.stopTimer(task);
  console.log(JSON.stringify(res, null, 2));
}

main().catch(err => {
  console.error('自动停止失败:', err?.response?.data || err?.message || String(err));
  process.exit(1);
});

