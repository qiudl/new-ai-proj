#!/usr/bin/env node
/*
  docs/export/export-pdf.js
  使用 Puppeteer 将 HTML 导出为 PDF；支持直接渲染含 mermaid 的注入版HTML，或静态SVG版HTML
  使用: node docs/export/export-pdf.js <input.html> [output.pdf]
*/

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import puppeteer from 'puppeteer';

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('用法: node docs/export/export-pdf.js <input.html> [output.pdf]');
  process.exit(1);
}

const inputPath = path.resolve(args[0]);
const outputPath = path.resolve(args[1] || inputPath.replace(/\.html$/i, '.pdf'));

if (!fs.existsSync(inputPath)) {
  console.error(`未找到输入文件: ${inputPath}`);
  process.exit(1);
}

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new' // puppeteer v23+ 推荐
  });
  const page = await browser.newPage();
  await page.goto(`file://${inputPath}`, { waitUntil: 'networkidle0' });
  // 等待 mermaid 前端渲染 (若是注入版HTML)
  await page.waitForTimeout(800);
  await page.pdf({ path: outputPath, format: 'A4', printBackground: true });
  await browser.close();
  console.log(`✅ 已导出 PDF: ${outputPath}`);
})();

