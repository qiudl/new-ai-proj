#!/usr/bin/env node

/**
 * 设置任务 537 的子任务依赖关系（批量）
 * 关系语义：source depends_on target => source 依赖 target 完成后才能开始
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

async function main() {
  // 子任务ID
  const BASE = 567; // 基础组件
  const STYLE = 568; // 样式与主题
  const DATA = 569; // 数据集成
  const INTERACT = 570; // 交互与可访问性
  const RESPONSIVE = 571; // 响应式与布局
  const TEST = 572; // 测试
  const INTEGRATE = 573; // 详情页集成与性能

  const API_BASE = 'http://localhost:8081/api/v1';
  const TOKEN = loadToken();
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` };

  const relationships = [
    // 核心基础 -> 后续能力
    { source_task_id: DATA, target_task_id: BASE, relationship_type: 'depends_on' },
    { source_task_id: STYLE, target_task_id: BASE, relationship_type: 'depends_on' },
    { source_task_id: INTERACT, target_task_id: BASE, relationship_type: 'depends_on' },
    { source_task_id: RESPONSIVE, target_task_id: BASE, relationship_type: 'depends_on' },
    // 集成任务依赖所有前置
    { source_task_id: INTEGRATE, target_task_id: BASE, relationship_type: 'depends_on' },
    { source_task_id: INTEGRATE, target_task_id: STYLE, relationship_type: 'depends_on' },
    { source_task_id: INTEGRATE, target_task_id: DATA, relationship_type: 'depends_on' },
    { source_task_id: INTEGRATE, target_task_id: INTERACT, relationship_type: 'depends_on' },
    { source_task_id: INTEGRATE, target_task_id: RESPONSIVE, relationship_type: 'depends_on' },
    // 测试依赖集成
    { source_task_id: TEST, target_task_id: INTEGRATE, relationship_type: 'depends_on' },
  ];

  const resp = await axios.post(`${API_BASE}/task-relationships/batch`, relationships, { headers, proxy: false });
  console.log(JSON.stringify(resp.data, null, 2));
}

main().catch(err => {
  console.error('设置依赖失败:', err?.response?.data || err?.message || String(err));
  process.exit(1);
});

