/**
 * 一次性迁移：为 src/content/blog/ 下的旧文章回写 series / order frontmatter。
 * series 按 source 路径子串规则推导；order 按同系列 source 路径自然序统一编号（1..N）。
 * 可重复执行（幂等：先移除旧 series/order 行再重算）。
 * 运行：node scripts/sync-series.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, loadConfig, deriveSeries, seriesOrders, parseFrontmatter } from './admin/shared.mjs';

const cfg = loadConfig();
const blogDir = path.join(ROOT, cfg.blogDir);

// 1. 收集所有文章的 source 与 series
const entries = [];
for (const file of fs.readdirSync(blogDir).filter((f) => f.endsWith('.md'))) {
  const full = path.join(blogDir, file);
  const raw = fs.readFileSync(full, 'utf-8');
  const { meta } = parseFrontmatter(raw);
  if (!meta.source) {
    console.warn(`⚠ ${file} 无 source 字段，跳过`);
    continue;
  }
  entries.push({ file, full, raw, source: meta.source, series: deriveSeries(meta.source, cfg) });
}

// 2. 按 series 分组，组内按 source 自然序编号
const bySeries = new Map();
for (const e of entries) {
  if (!bySeries.has(e.series)) bySeries.set(e.series, []);
  bySeries.get(e.series).push(e.source);
}
const orderMap = new Map(); // source → order
for (const [series, sources] of bySeries) {
  const om = seriesOrders(sources);
  for (const [src, n] of om) orderMap.set(src, n);
}

// 3. 回写 frontmatter（移除旧 series/order 行，在 pubDate 行后插入新值）
let updated = 0;
for (const e of entries) {
  const order = orderMap.get(e.source) ?? null;
  const lines = e.raw.split(/\r?\n/).filter((l) => !l.startsWith('series:') && !l.startsWith('order:'));
  const pubDateIdx = lines.findIndex((l) => l.startsWith('pubDate:'));
  if (pubDateIdx === -1) {
    console.warn(`⚠ ${e.file} 找不到 pubDate 行，跳过`);
    continue;
  }
  const insert = [`series: ${e.series}`];
  if (order != null) insert.push(`order: ${order}`);
  lines.splice(pubDateIdx + 1, 0, ...insert);
  fs.writeFileSync(e.full, lines.join('\n'), 'utf-8');
  updated++;
  console.log(`✓ ${e.file} → ${e.series} #${order}`);
}

console.log(`\n完成：更新 ${updated} 篇，${bySeries.size} 个专栏`);
