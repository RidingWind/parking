#!/usr/bin/env node
/**
 * 生成可脱离平台静态托管的入口页。
 *
 * 背景：index.html 里有 {{appId}} / {{basename}} / {{{__platform}}} 等 Handlebars 占位符，
 * 原本由平台服务端渲染注入。自部署时若由 Node 的 ViewController 渲染，
 * basename 会被平台逻辑推导成 /app/（appId 为空），子路径部署下路由会错乱。
 * 因此这里在构建后直接产出一份静态 index.html：占位符填空、basename 写成部署基线。
 *
 * 用法：
 *   CLIENT_BASE_PATH=/parking node scripts/prepare-static-web.mjs
 * 产物：
 *   dist/web/index.html   （静态入口）
 *   dist/web/assets/...   （静态资源副本）
 */
import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.CLIENT_BASE_PATH || '/';
const ROOT = process.cwd();

const srcHtmlPath = join(ROOT, 'dist/client/client/index.html');
const assetsDir = join(ROOT, 'dist/client/assets');
const outDir = join(ROOT, 'dist/web');

if (!existsSync(srcHtmlPath)) {
  console.error(`找不到构建产物：${srcHtmlPath}，请先 npm run build:client`);
  process.exit(1);
}

let html = readFileSync(srcHtmlPath, 'utf8');

// 1) 平台注入的整包数据：静态托管下给空对象，前端会走降级逻辑
html = html.replace(/JSON\.parse\('\{\{\{__platform__\}\}\}'\)/g, "JSON.parse('{}')");

// 2) 路由基线：父级 BrowserRouter 会优先读 window.__BASENAME__
html = html.replace(/\{\{basename\}\}/g, BASE);

// 3) 其余占位符一律填空（三花括号先处理）
html = html.replace(/\{\{+([a-zA-Z_][a-zA-Z0-9_]*)\}\}+/g, (m) => {
  console.warn(`  · 占位符置空：${m}`);
  return '';
});

const remaining = [...html.matchAll(/\{\{[^}]*\}\}/g)].map((m) => m[0]);
if (remaining.length > 0) {
  console.warn(`仍有 ${remaining.length} 处花括号片段（可能是 JS 代码，非模板占位符）：${remaining.slice(0, 5).join(' ')}`);
}

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'index.html'), html, 'utf8');
cpSync(assetsDir, join(outDir, 'assets'), { recursive: true });
if (existsSync(join(ROOT, 'dist/client/favicon.svg'))) {
  cpSync(join(ROOT, 'dist/client/favicon.svg'), join(outDir, 'favicon.svg'));
}

console.log(`静态入口已生成：dist/web/index.html（basename = ${BASE}）`);
