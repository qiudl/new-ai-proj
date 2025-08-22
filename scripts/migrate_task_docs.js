#!/usr/bin/env node
/**
 * Task Docs Migration Script
 *
 * Scans backend/docs/tasks/projects/project-<projectId>/task-<taskId>.md
 * and migrates them into the database-backed document system by:
 * 1) creating a document via POST /api/v1/documents
 * 2) attaching it to the task via POST /api/v1/projects/:id/tasks/:taskId/documents/:documentId/attach
 *
 * Requirements:
 * - Node.js >= 18 (for global fetch)
 * - Set API_BASE_URL (default: http://localhost:3000/api/v1)
 * - Set API_TOKEN (Bearer token for Authorization)
 *
 * Usage:
 *   node scripts/migrate_task_docs.js --dry-run
 *   API_BASE_URL=http://localhost:8080/api/v1 API_TOKEN=... node scripts/migrate_task_docs.js
 */

const fs = require('fs');
const path = require('path');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';
const API_TOKEN = process.env.API_TOKEN || '';
const DRY_RUN = process.argv.includes('--dry-run');
const ROOT = process.cwd();
const PROJECTS_DIR = path.join(ROOT, 'backend', 'docs', 'tasks', 'projects');

function log(msg, ...args) {
  process.stdout.write(`[migrate] ${msg}${args.length ? ' ' + args.join(' ') : ''}\n`);
}

function warn(msg, ...args) {
  process.stderr.write(`[warn] ${msg}${args.length ? ' ' + args.join(' ') : ''}\n`);
}

function die(msg, code = 1) {
  process.stderr.write(`[error] ${msg}\n`);
  process.exit(code);
}

function parseFrontMatter(content) {
  // Basic front matter parser: expects starting '---' and closing '---' on its own line
  const fmRegex = /^---\s*\n([\s\S]*?)\n---\s*\n?/;
  const m = content.match(fmRegex);
  if (!m) return { meta: {}, body: content };
  const yaml = m[1];
  const body = content.slice(m[0].length);
  const meta = {};
  const lines = yaml.split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const idx = line.indexOf(':');
    if (idx > 0) {
      const key = line.slice(0, idx).trim();
      let val = line.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      meta[key] = val;
    }
  }
  return { meta, body };
}

async function httpPost(url, data) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {}),
    },
    body: JSON.stringify(data),
  });
  const isJson = (res.headers.get('content-type') || '').includes('application/json');
  const payload = isJson ? await res.json() : await res.text();
  if (!res.ok) {
    throw new Error(`POST ${url} failed: ${res.status} ${res.statusText} - ${isJson ? JSON.stringify(payload) : payload}`);
  }
  return payload;
}

async function httpGet(url) {
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      ...(API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {}),
    },
  });
  const isJson = (res.headers.get('content-type') || '').includes('application/json');
  const payload = isJson ? await res.json() : await res.text();
  if (!res.ok) {
    throw new Error(`GET ${url} failed: ${res.status} ${res.statusText} - ${isJson ? JSON.stringify(payload) : payload}`);
  }
  return payload;
}

function extractIdsFromPath(filePath) {
  // backend/docs/tasks/projects/project-<pid>/task-<tid>.md
  const rel = path.relative(PROJECTS_DIR, filePath);
  const parts = rel.split(path.sep);
  if (parts.length !== 2) return null;
  const projMatch = parts[0].match(/^project-(\d+)$/);
  const taskMatch = parts[1].match(/^task-(\d+)\.md$/);
  if (!projMatch || !taskMatch) return null;
  return { projectId: parseInt(projMatch[1], 10), taskId: parseInt(taskMatch[1], 10) };
}

function walkProjectDocsDir(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const projects = fs.readdirSync(dir, { withFileTypes: true });
  for (const p of projects) {
    if (!p.isDirectory()) continue;
    const projDir = path.join(dir, p.name);
    const files = fs.readdirSync(projDir, { withFileTypes: true });
    for (const f of files) {
      if (f.isFile() && /^task-\d+\.md$/.test(f.name)) {
        results.push(path.join(projDir, f.name));
      }
    }
  }
  return results;
}

async function migrateOne(filePath, opts) {
  const { projectId, taskId } = extractIdsFromPath(filePath) || {};
  if (!projectId || !taskId) {
    warn(`Skip (cannot extract IDs): ${filePath}`);
    return { skipped: true };
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  const { meta, body } = parseFrontMatter(raw);

  const title = meta.title || (body.match(/^#\s+(.+)$/m)?.[1] || `task-${taskId}`);
  const content = raw; // keep original as-is

  // Optional: check if task already has any documents
  let hasDocs = false;
  try {
    const list = await httpGet(`${API_BASE_URL}/projects/${projectId}/tasks/${taskId}/documents`);
    const documents = list?.data?.documents || list?.documents || [];
    hasDocs = Array.isArray(documents) && documents.length > 0;
  } catch (e) {
    // ignore listing errors; proceed
  }

  if (hasDocs && opts.skipExisting) {
    log(`Skip task ${taskId} (project ${projectId}) - already has documents`);
    return { skipped: true, reason: 'existing_docs' };
  }

  if (DRY_RUN) {
    log(`[DRY RUN] Would create doc and attach: project=${projectId}, task=${taskId}, title=${JSON.stringify(title)} | ${filePath}`);
    return { created: true, attached: true, dryRun: true };
  }

  // 1) Create document
  const createPayload = {
    project_id: projectId,
    title,
    content,
    type: 'markdown',
    status: 'published',
    visibility: 'team',
    description: `Migrated from ${path.relative(ROOT, filePath)}`,
    tags: ['migration', 'task-doc'],
    metadata: { source: 'md_migration', file_path: path.relative(ROOT, filePath) }
  };
  const created = await httpPost(`${API_BASE_URL}/documents`, createPayload);
  const doc = created?.data || created;
  if (!doc?.id) throw new Error(`Create document returned invalid payload: ${JSON.stringify(created).slice(0,200)}...`);

  // 2) Attach to task
  const attachPayload = { relationship_type: 'attachment' };
  await httpPost(`${API_BASE_URL}/projects/${projectId}/tasks/${taskId}/documents/${doc.id}/attach`, attachPayload);

  log(`Migrated: project=${projectId}, task=${taskId}, docId=${doc.id}, title=${JSON.stringify(title)}`);
  return { created: true, attached: true, documentId: doc.id };
}

async function main() {
  if (!API_TOKEN && !DRY_RUN) {
    warn('API_TOKEN is not set. Set API_TOKEN for authenticated requests. Running without token may fail.');
  }

  const files = walkProjectDocsDir(PROJECTS_DIR);
  if (files.length === 0) {
    log(`No files found under ${PROJECTS_DIR}`);
    return;
  }
  log(`Found ${files.length} candidate files.`);

  let ok = 0, skipped = 0, failed = 0;
  for (const file of files) {
    try {
      const result = await migrateOne(file, { skipExisting: true });
      if (result?.created) ok++; else skipped++;
    } catch (e) {
      failed++;
      warn(`Failed to migrate ${file}: ${e.message}`);
    }
  }

  log(`Done. created=${ok}, skipped=${skipped}, failed=${failed}`);
}

main().catch(err => die(err.stack || err.message));

