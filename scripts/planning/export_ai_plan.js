#!/usr/bin/env node
/*
Generates AI execution plan JSON (v2) from a local tasks dump.
- Input: data/planning/tasks_dump.json (override with --input)
- Output: planning/ai_execution_plan.v2.json (override with --output)

This is a local bootstrap script. In phase 2, replace the loader to pull tasks from your task system API,
then parse Meta from task.description (Category/OwnerHint/Parallelizable/ReadyWhen/Batch).
*/

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

// --- CLI parsing ---
function parseArgs(argv) {
  const args = {
    input: path.join(ROOT, 'data/planning/tasks_dump.json'),
    output: path.join(ROOT, 'planning/ai_execution_plan.v2.json'),
    focusBatch: 'M1',
    limits: {
      'ai:infra': 1,
      'ai:backend': 3,
      'ai:frontend': 2,
      'ai:planner': 1,
      'ai:orchestrator': 1,
    },
    dryRun: false,
    fromApi: false,
  };
  for (const raw of argv.slice(2)) {
    if (!raw.startsWith('--')) continue;
    const [k, v] = raw.includes('=') ? raw.split('=') : [raw, ''];
    switch (k) {
      case '--input': args.input = v || args.input; break;
      case '--output': args.output = v || args.output; break;
      case '--focus-batch': args.focusBatch = v || args.focusBatch; break;
      case '--limits':
        try { args.limits = v ? JSON.parse(v) : args.limits; } catch { /* ignore invalid JSON, keep default */ }
        break;
      case '--dry-run': args.dryRun = true; break;
      case '--from-api': args.fromApi = true; break;
      case '--help':
        printHelp();
        process.exit(0);
      default:
        // ignore unknown
        break;
    }
  }
  return args;
}

function printHelp() {
  console.log(`Usage: export_ai_plan [--input=path] [--output=path] [--focus-batch=M1|M2|ALL] [--limits='{...}'] [--dry-run] [--from-api]\n\nExamples:\n  node scripts/planning/export_ai_plan.js \n  node scripts/planning/export_ai_plan.js --input=data/planning/tasks_dump.json --output=planning/ai_execution_plan.v2.json\n  node scripts/planning/export_ai_plan.js --focus-batch=M2 --limits='{"ai:backend":2,"ai:infra":1}' --dry-run\n  TASK_API_ENDPOINT=https://api.example.com TASK_API_TOKEN=*** node scripts/planning/export_ai_plan.js --from-api --focus-batch=ALL\n`);
}

function loadTasks(inputPath) {
  const raw = fs.readFileSync(inputPath, 'utf8');
  return JSON.parse(raw);
}

// --- API loader (Phase 2 capable; optional) ---
async function loadTasksFromApi() {
  const endpoint = process.env.TASK_API_ENDPOINT;
  const token = process.env.TASK_API_TOKEN;
  if (!endpoint || !token) {
    throw new Error('TASK_API_ENDPOINT or TASK_API_TOKEN not set');
  }
  const url = endpoint.replace(/\/$/, '') + '/tasks';
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`API request failed: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  // Expect an array of tasks; transform to local shape {id,title,status,meta:{...}}
  return data.map(t => ({
    id: t.id,
    title: t.title,
    status: t.status || 'todo',
    meta: parseMetaFromDescription(t.description || ''),
  }));
}

function parseMetaFromDescription(desc) {
  // Parse a [Meta] block with lines like: Key: Value
  const meta = {};
  const lines = desc.split(/\r?\n/);
  let inMeta = false;
  for (const line of lines) {
    if (/^\s*\[Meta\]\s*$/i.test(line)) { inMeta = true; continue; }
    if (inMeta) {
      if (/^\s*\[/.test(line)) break; // next section
      const m = line.match(/^\s*([A-Za-z][A-Za-z0-9:_-]*)\s*:\s*(.+)\s*$/);
      if (m) {
        const key = m[1];
        let val = m[2];
        if (key === 'Parallelizable') {
          meta.Parallelizable = /^true$/i.test(val);
        } else if (key === 'ReadyWhen') {
          try { meta.ReadyWhen = JSON.parse(val); } catch { meta.ReadyWhen = []; }
        } else {
          meta[key] = val;
        }
      }
    }
  }
  return meta;
}

function indexById(tasks) {
  const map = new Map();
  for (const t of tasks) map.set(t.id, t);
  return map;
}

function computePlan(tasks, focusBatch, limits) {
  const byId = indexById(tasks);
  const owners = new Map();

  function pushOwner(owner) {
    if (!owners.has(owner)) owners.set(owner, { ready: [], blocked: [] });
  }

  // Determine if task is ready (all ReadyWhen are done) or blocked (list blockers)
  function blockersOf(t) {
    const deps = Array.isArray(t.meta?.ReadyWhen) ? t.meta.ReadyWhen : [];
    const blockers = [];
    for (const depId of deps) {
      const dep = byId.get(depId);
      const isDone = dep && dep.status === 'done';
      if (!isDone) blockers.push(depId);
    }
    return blockers;
  }

  // Optional: filter by batch (keep tasks without meta or with matching Batch)
  const filtered = tasks.filter(t => !t.meta?.Batch || t.meta.Batch === focusBatch || focusBatch === 'ALL');

  for (const t of filtered) {
    const owner = t.meta?.OwnerHint || 'ai:unassigned';
    pushOwner(owner);
    const blks = blockersOf(t);
    const entry = { id: t.id, title: t.title, blocked_by: blks };
    if (blks.length === 0 && t.status !== 'done') {
      owners.get(owner).ready.push(entry);
    } else if (t.status !== 'done') {
      owners.get(owner).blocked.push(entry);
    }
  }

  const plan = {
    generated_at: new Date().toISOString(),
    version: 'v2',
    batch_focus: focusBatch,
    concurrency_limits: limits,
    owners: Object.fromEntries(owners),
    notes: [
      'This file is auto-generated by scripts/planning/export_ai_plan.js',
      'Replace the loader with your task system API to go live.',
    ],
  };
  return plan;
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

(async function main() {
  try {
    const args = parseArgs(process.argv);
    let tasks;
    if (args.fromApi) {
      try {
        tasks = await loadTasksFromApi();
      } catch (e) {
        console.error('API mode failed:', e.message);
        process.exit(1);
      }
    } else {
      tasks = loadTasks(args.input);
    }
    const plan = computePlan(tasks, args.focusBatch, args.limits);
    if (args.dryRun) {
      console.log(JSON.stringify(plan, null, 2));
      return;
    }
    ensureDir(path.dirname(args.output));
    fs.writeFileSync(args.output, JSON.stringify(plan, null, 2) + '\n', 'utf8');
    console.log(`✓ Wrote ${args.output}`);
  } catch (err) {
    console.error('Failed to generate execution plan:', err);
    process.exit(1);
  }
})();

