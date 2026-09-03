#!/usr/bin/env node
/**
 * 笔记导入 CLI（命令行版）。可视化操作请用：scripts/admin/启动发布后台.bat
 *
 * 用法：
 *   node scripts/import-notes.mjs list                 # 浏览库里所有笔记（带序号）
 *   node scripts/import-notes.mjs list Java            # 只看路径含 Java 的
 *   node scripts/import-notes.mjs import 3 7 12        # 按序号导入
 *   node scripts/import-notes.mjs import "算法/5.二叉树.md"
 *   node scripts/import-notes.mjs imported             # 查看博客现有文章
 */
import readline from 'node:readline';
import path from 'node:path';
import { loadConfig, listAllNotes, publishNote, listPosts } from './admin/shared.mjs';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const confirm = (q) =>
  new Promise((res) => rl.question(`${q} [y/N] `, (a) => res(a.trim().toLowerCase() === 'y')));

const [cmd, ...args] = process.argv.slice(2);
const cfg = loadConfig();

if (cmd === 'list') {
  const filter = args[0]?.toLowerCase();
  let notes = listAllNotes(cfg);
  if (filter) notes = notes.filter((n) => n.rel.toLowerCase().includes(filter));
  notes.forEach((n, i) => {
    console.log(`${String(i).padStart(3)}  ${n.rel}  (${(n.size / 1024).toFixed(0)}KB, ${n.mtime.slice(0, 10)})`);
  });
  console.log(`\n共 ${notes.length} 篇。导入：node scripts/import-notes.mjs import <序号...|路径>`);
} else if (cmd === 'import') {
  if (!args.length) {
    console.log('用法：import <序号...> 或 import "路径"。先运行 list 查看序号。');
  } else {
    const notes = listAllNotes(cfg);
    const rels = [];
    for (const arg of args) {
      if (/^\d+$/.test(arg)) {
        const note = notes[Number(arg)];
        if (note) rels.push(note.rel);
        else console.log(`✗ 序号 ${arg} 不存在`);
      } else {
        rels.push(arg);
      }
    }
    console.log('即将导入：');
    rels.forEach((r) => console.log(`  ${r}`));
    if (await confirm(`共 ${rels.length} 篇，确认？`)) {
      for (const rel of rels) {
        const r = await publishNote(rel, {}, cfg);
        if (r.error) console.log(`✗ ${rel}: ${r.error}`);
        else console.log(`✓ ${rel}  →  ${r.file}`);
      }
      console.log('\n完成。运行 npm run dev 预览。');
    } else {
      console.log('已取消。');
    }
  }
  rl.close();
} else if (cmd === 'imported') {
  const posts = listPosts(cfg);
  console.log(`博客目录现有 ${posts.length} 篇文章：`);
  posts.forEach((p) => console.log(`  ${p.file}  「${p.title}」 ${p.pubDate}${p.draft ? ' [草稿]' : ''}`));
} else {
  console.log(`笔记导入 CLI
  list [过滤词]      浏览 Obsidian 库笔记
  import <序号|路径> 导入为博客文章
  imported           查看博客现有文章

可视化后台：双击 scripts/admin/启动发布后台.bat`);
}
