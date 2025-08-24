#!/usr/bin/env node

/**
 * 为任务设置 custom_fields.preferred_doc_id
 * 会先读取当前任务 custom_fields，然后合并 preferred_doc_id，避免覆盖其他字段。
 */
import fs from 'fs';
import axios from 'axios';

function loadToken() {
  const p = new URL('../.env.mcp-token', import.meta.url);
  const txt = fs.readFileSync(p, 'utf8');
  const m = txt.match(/MCP_SYSTEM_TOKEN=([A-Za-z0-9_\-\.]+\.[A-Za-z0-9_\-\.]+\.[A-Za-z0-9_\-\.]+)/);
  if (!m) throw new Error('Cannot load MCP_SYSTEM_TOKEN from .env.mcp-token');
  return m[1];
}

async function getTask(apiBase, headers, projectId, taskId) {
  const { data } = await axios.get(`${apiBase}/projects/${projectId}/tasks/${taskId}`, { headers, proxy: false });
  return data?.data;
}

async function updateTaskCustomFields(apiBase, headers, projectId, task, newFields) {
  const currentCF = task.custom_fields || {};
  const merged = { ...currentCF, ...newFields };
  const body = { custom_fields: merged };
  const { data } = await axios.put(`${apiBase}/projects/${projectId}/tasks/${task.id}`, body, { headers, proxy: false });
  return data?.data;
}

async function main() {
  const API_BASE = 'http://localhost:8081/api/v1';
  const TOKEN = loadToken();
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` };
  const projectId = 1;

  const mapping = [
    { taskId: 567, docId: 716 },
    { taskId: 568, docId: 717 },
    { taskId: 569, docId: 718 },
    { taskId: 570, docId: 719 },
    { taskId: 571, docId: 720 },
    { taskId: 572, docId: 721 },
    { taskId: 573, docId: 722 },
  ];

  const results = [];
  for (const { taskId, docId } of mapping) {
    const task = await getTask(API_BASE, headers, projectId, taskId);
    const updated = await updateTaskCustomFields(API_BASE, headers, projectId, task, { preferred_doc_id: docId });
    results.push({ taskId, preferred_doc_id: docId, ok: !!updated });
  }

  console.log(JSON.stringify({ success: true, results }, null, 2));
}

main().catch(err => {
  console.error('设置 preferred_doc_id 失败:', err?.response?.data || err?.message || String(err));
  process.exit(1);
});

