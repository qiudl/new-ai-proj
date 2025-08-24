#!/usr/bin/env node
/*
  docs/export/mermaid-static.js
  将 Markdown 转为纯静态 HTML：把 ```mermaid 代码块转换为 SVG 并内联
  使用 mermaid-cli (mmdc) 渲染，最终 HTML 无需前端脚本即可显示
  使用: node docs/export/mermaid-static.js <input.md> [output.html]
*/

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { execFileSync } from 'node:child_process';
import MarkdownIt from 'markdown-it';

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('用法: node docs/export/mermaid-static.js <input.md> [output.html]');
  process.exit(1);
}

const inputPath = path.resolve(args[0]);
const outputPath = path.resolve(args[1] || inputPath.replace(/\.md$/i, '.static.html'));

if (!fs.existsSync(inputPath)) {
  console.error(`未找到输入文件: ${inputPath}`);
  process.exit(1);
}

const md = new MarkdownIt({ html: true, linkify: true, typographer: true });

// 将 mermaid 代码块替换为占位符，收集内容后用 mmdc 渲染，再回填 SVG
let mermaidBlocks = [];
const defaultFence = md.renderer.rules.fence || function(tokens, idx, options, env, self) {
  return self.renderToken(tokens, idx, options);
};

md.renderer.rules.fence = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  const info = (token.info || '').trim().toLowerCase();
  const content = token.content || '';
  if (info === 'mermaid') {
    const id = `MERMAID_BLOCK_${mermaidBlocks.length}_${Date.now()}`;
    mermaidBlocks.push({ id, code: content });
    return `\n<div id="${id}" class="mermaid-svg">__MERMAID_PLACEHOLDER__${id}__</div>\n`;
  }
  return defaultFence(tokens, idx, options, env, self);
};

const mdContent = fs.readFileSync(inputPath, 'utf-8');
let htmlBody = md.render(mdContent);

// 使用 mermaid-cli 渲染每个 mermaid 代码块为 SVG 并替换占位符
function renderWithMMDC(code) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mmdc-'));
  const inFile = path.join(tmpDir, 'diagram.mmd');
  const outFile = path.join(tmpDir, 'diagram.svg');
  fs.writeFileSync(inFile, code, 'utf-8');
  // mmdc 默认命令名（由 @mermaid-js/mermaid-cli 提供）
  execFileSync(process.platform === 'win32' ? 'mmdc.cmd' : 'mmdc', ['-i', inFile, '-o', outFile], { stdio: 'ignore' });
  const svg = fs.readFileSync(outFile, 'utf-8');
  fs.rmSync(tmpDir, { recursive: true, force: true });
  return svg;
}

for (const block of mermaidBlocks) {
  try {
    const svg = renderWithMMDC(block.code);
    htmlBody = htmlBody.replace(`__MERMAID_PLACEHOLDER__${block.id}__`, svg);
  } catch (e) {
    htmlBody = htmlBody.replace(`__MERMAID_PLACEHOLDER__${block.id}__`, `<pre>Mermaid 渲染失败: ${String(e)}</pre>`);
  }
}

const finalHtml = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${path.basename(inputPath)} (static)</title>
    <style>
      body { font-family: -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial; margin: 20px; }
      pre code { white-space: pre-wrap; }
      .mermaid-svg { margin: 16px 0; }
      svg { max-width: 100%; height: auto; }
    </style>
  </head>
  <body>
    ${htmlBody}
  </body>
</html>`;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, finalHtml, 'utf-8');
console.log(`✅ 已生成静态HTML(内联SVG): ${outputPath}`);

