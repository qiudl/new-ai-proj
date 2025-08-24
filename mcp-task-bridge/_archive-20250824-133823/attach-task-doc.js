#!/usr/bin/env node

/**
 * 将本地 Markdown 文件作为文档创建并关联到指定任务
 * 用法：node attach-task-doc.js <taskId> <filePath> [title]
 */

import fs from 'fs';
import path from 'path';
import { TaskMCPServer } from './task-mcp.js';

function extractTitle(content, fallback) {
  // 优先使用第一行 H1 标题
  const m = content.match(/^#\s+(.+)$/m);
  if (m && m[1]) return m[1].trim();
  return fallback;
}

async function main() {
  const [,, taskIdArg, filePathArg, titleArg] = process.argv;
  if (!taskIdArg || !filePathArg) {
    console.error('用法: node attach-task-doc.js <taskId> <filePath> [title]');
    process.exit(1);
  }

  const taskId = Number(taskIdArg);
  if (!Number.isInteger(taskId)) {
    console.error('错误: taskId 必须是整数');
    process.exit(1);
  }

  const absPath = path.isAbsolute(filePathArg)
    ? filePathArg
    : path.join(process.cwd(), filePathArg);

  if (!fs.existsSync(absPath)) {
    console.error(`错误: 文件不存在: ${absPath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(absPath, 'utf8');
  const fallbackTitle = path.basename(absPath).replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
  const title = titleArg || extractTitle(content, fallbackTitle);

  const API_BASE = process.env.TASK_API_BASE || process.env.API_BASE_URL || 'http://localhost:8080/api/v1';
  const server = new TaskMCPServer(API_BASE);

  // 若未提供令牌，则尝试开发环境快速登录以获取 JWT（不输出令牌）
  if (!process.env.TASK_API_TOKEN && !process.env.API_TOKEN) {
    try {
      const loginRes = await server.devQuickLogin(process.env.DEV_LOGIN_USERNAME);
      console.log(`🔐 开发登录: ${loginRes.success ? '成功' : `失败(${loginRes.error})`}`);
    } catch (e) {
      console.log(`🔐 开发登录失败: ${e?.message || e}`);
    }
  }

  console.log(`准备将文档关联到任务 #${taskId}`);
  console.log(`- 文件: ${absPath}`);
  console.log(`- 标题: ${title}`);

  try {
    const res = await server.createAndAttachTaskDocument(taskId, content, 1, title);
    console.log(JSON.stringify(res, null, 2));

    if (!res.success) {
      process.exit(2);
    }

    // 简单验证：检查任务是否有文档
    const hasRes = await server.hasTaskDocument(taskId, 1);
    console.log(JSON.stringify({ verify_has_document: hasRes?.has_document === true }, null, 2));
  } catch (err) {
    console.error('关联失败:', err?.response?.data || err?.message || String(err));
    process.exit(3);
  }
}

main();

