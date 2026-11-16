#!/usr/bin/env node
/**
 * 把线上导出的停车场 JSON 转成可直接执行的 SQL。
 *
 * 导出方式（需要应用登录态）：在应用页面打开后，浏览器控制台执行
 *   fetch('/api/parking/all', { credentials: 'include' })
 *     .then(r => r.json())
 *     .then(d => console.log(JSON.stringify(d)));
 * 把输出保存为 parking-seed.json（形如 { items: [...] } 或 [...]）。
 *
 * 用法：
 *   node deploy/json-to-seed-sql.mjs parking-seed.json > deploy/seed.sql
 *   psql "$SUDA_DATABASE_URL" -f deploy/seed.sql
 */
import { readFileSync } from 'node:fs';

const file = process.argv[2];
if (!file) {
  console.error('用法: node deploy/json-to-seed-sql.mjs <parking-seed.json>');
  process.exit(1);
}

const raw = JSON.parse(readFileSync(file, 'utf8'));
const items = Array.isArray(raw) ? raw : (raw.items ?? []);

if (items.length === 0) {
  console.error('JSON 中没有停车场数据（期望数组或 { items: [...] }）');
  process.exit(1);
}

const q = (v) => (v === null || v === undefined || v === '' ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);
const n = (v) => (v === null || v === undefined || v === '' || Number.isNaN(Number(v)) ? 'NULL' : String(Number(v)));

function tagsLiteral(tags) {
  if (!Array.isArray(tags) || tags.length === 0) return `'{}'::varchar(255)[]`;
  const parts = tags.map((t) => `'${String(t).replace(/'/g, "''")}'`).join(',');
  return `ARRAY[${parts}]::varchar(255)[]`;
}

const rows = items.map((it) => {
  const status = it.status ?? 'approved';
  const values = [
    q(it.name),
    q(it.district),
    q(it.address),
    q(it.type ?? 'mall'),
    q(it.feeStandard),
    q(it.freePolicy),
    q(it.pointsRule),
    q(it.consumptionRule),
    q(it.chargingRule),
    q(it.holidayRule),
    q(it.openingHours),
    n(it.latitude),
    n(it.longitude),
    q(it.contactPhone),
    q(status),
    n(it.avgRating ?? 0),
    Number(it.ratingCount ?? 0),
    Number(it.commentCount ?? 0),
    tagsLiteral(it.tags),
  ];
  return `(${values.join(', ')});`;
});

const sql = [
  '-- 由 deploy/json-to-seed-sql.mjs 自动生成，请勿手工修改',
  '-- 从线上应用导出的停车场数据',
  'BEGIN;',
  'INSERT INTO parking_lot (',
  '  name, district, address, type, fee_standard, free_policy, points_rule,',
  '  consumption_rule, charging_rule, holiday_rule, opening_hours, latitude,',
  '  longitude, contact_phone, status, avg_rating, rating_count, comment_count, tags',
  ') VALUES',
].join('\n');

process.stdout.write(sql + '\n' + rows.join('\n') + '\nCOMMIT;\n');
