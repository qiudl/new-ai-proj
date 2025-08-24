#!/usr/bin/env node
/*
  docs/export/mermaid-inject.js
  将 Markdown 转为 HTML，并注入 mermaid.js，使 ```mermaid 代码块能够在浏览器中渲染。
  使用: node docs/export/mermaid-inject.js <input.md> [output.html]
*/

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import MarkdownIt from 'markdown-it';

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('用法: node docs/export/mermaid-inject.js <input.md> [output.html]');
  process.exit(1);
}

const inputPath = path.resolve(args[0]);
const outputPath = path.resolve(args[1] || inputPath.replace(/\.md$/i, '.html'));

if (!fs.existsSync(inputPath)) {
  console.error(`未找到输入文件: ${inputPath}`);
  process.exit(1);
}

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true
});

// 自定义代码块渲染: 对 mermaid 代码块包上一层 <pre class="mermaid">，供前端脚本识别
const defaultFence = md.renderer.rules.fence || function(tokens, idx, options, env, self) {
  return self.renderToken(tokens, idx, options);
};

md.renderer.rules.fence = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  const info = (token.info || '').trim().toLowerCase();
  const content = token.content || '';
  if (info === 'mermaid') {
    // 不转义，交给浏览器端 mermaid 渲染
    return `\n<div class="mermaid">\n${content}\n</div>\n`;
  }
  return defaultFence(tokens, idx, options, env, self);
};

const mdContent = fs.readFileSync(inputPath, 'utf-8');
const bodyHtml = md.render(mdContent);

const html = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${path.basename(inputPath)}</title>
    <style>
      body { font-family: -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,"Apple Color Emoji","Segoe UI Emoji"; margin: 20px; }
      pre code { white-space: pre-wrap; }
      .mermaid { margin: 16px 0; }
    </style>
  </head>
  <body>
    ${bodyHtml}
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
    <script>
      (function(){
        if (window.mermaid) {
          mermaid.initialize({ startOnLoad: true, securityLevel: 'loose' });
        }
      })();
    </script>
  </body>
</html>`;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, html, 'utf-8');
console.log(`✅ 已生成: ${outputPath}`);

