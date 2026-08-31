/**
 * lbx's Blog 发布后台 —— 本地 Node 服务（零依赖，仅绑定 127.0.0.1）。
 * 功能：浏览 Obsidian 库 → 挑选笔记 → 可视化编辑元信息 → 发布/下架/删除博客文章。
 * 启动：双击 scripts/admin/启动发布后台.bat，或 node scripts/admin/server.mjs
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {
  loadConfig, saveConfig, listAllNotes, noteHeadline,
  publishNote, listPosts, updatePostMeta, deletePost, ROOT,
} from './shared.mjs';

const HOST = '127.0.0.1';
const cfg = loadConfig();
const PORT = cfg.port;
const ADMIN_DIR = path.join(ROOT, 'scripts', 'admin');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
};

/* ── 工具 ─────────────────────────────────────────────── */
function json(res, code, data) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (c) => {
      body += c;
      if (body.length > 5e6) req.destroy(); // 5MB 上限
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(new Error('请求体不是合法 JSON'));
      }
    });
    req.on('error', reject);
  });
}

function serveFile(res, filePath) {
  if (!fs.existsSync(filePath)) {
    res.writeHead(404).end('Not Found');
    return;
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] ?? 'text/plain; charset=utf-8' });
  res.end(fs.readFileSync(filePath));
}

/* ── 路由 ─────────────────────────────────────────────── */
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  const { pathname } = url;

  try {
    /* API */
    if (pathname === '/api/notes' && req.method === 'GET') {
      const q = (url.searchParams.get('q') ?? '').toLowerCase();
      const cfgNow = loadConfig();
      let notes = listAllNotes(cfgNow);
      if (q) notes = notes.filter((n) => n.rel.toLowerCase().includes(q));
      const withMeta = notes.map((n) => {
        try {
          return { ...n, ...noteHeadline(n.rel, cfgNow) };
        } catch {
          return { ...n, title: path.basename(n.rel, '.md'), excerpt: '' };
        }
      });
      return json(res, 200, { notes: withMeta, vault: cfgNow.vaultPath });
    }

    if (pathname === '/api/preview' && req.method === 'POST') {
      const { rel } = await readBody(req);
      const cfgNow = loadConfig();
      const raw = fs.readFileSync(path.join(cfgNow.vaultPath, rel), 'utf-8');
      return json(res, 200, { raw });
    }

    if (pathname === '/api/publish' && req.method === 'POST') {
      const { rel, ...overrides } = await readBody(req);
      if (!rel) return json(res, 400, { error: '缺少 rel 参数' });
      const result = publishNote(rel, overrides);
      return result.error ? json(res, 400, result) : json(res, 200, result);
    }

    if (pathname === '/api/posts' && req.method === 'GET') {
      return json(res, 200, { posts: listPosts() });
    }

    if (pathname.startsWith('/api/posts/') && req.method === 'PATCH') {
      const slug = decodeURIComponent(pathname.split('/').pop());
      const patch = await readBody(req);
      const result = updatePostMeta(slug, patch);
      return result.error ? json(res, 400, result) : json(res, 200, result);
    }

    if (pathname.startsWith('/api/posts/') && req.method === 'DELETE') {
      const slug = decodeURIComponent(pathname.split('/').pop());
      const result = deletePost(slug);
      return result.error ? json(res, 400, result) : json(res, 200, result);
    }

    if (pathname === '/api/config' && req.method === 'PATCH') {
      const patch = await readBody(req);
      // 只允许改 vaultPath / port，防止把任意路径当文件系统入口
      const next = {};
      if (typeof patch.vaultPath === 'string' && patch.vaultPath.trim()) next.vaultPath = patch.vaultPath.trim();
      if (Number.isInteger(patch.port) && patch.port > 0 && patch.port < 65536) next.port = patch.port;
      saveConfig(next);
      return json(res, 200, { ok: true, config: loadConfig() });
    }

    /* 静态页面 */
    if (pathname === '/' || pathname === '/index.html') {
      return serveFile(res, path.join(ADMIN_DIR, 'index.html'));
    }
    if (pathname === '/style.css') {
      return serveFile(res, path.join(ADMIN_DIR, 'style.css'));
    }
    if (pathname === '/app.js') {
      return serveFile(res, path.join(ADMIN_DIR, 'app.js'));
    }

    res.writeHead(404).end('Not Found');
  } catch (e) {
    json(res, 500, { error: e.message });
  }
});

// 安全护栏：仅本机回环地址
server.listen(PORT, HOST, () => {
  console.log('┌─────────────────────────────────────────────┐');
  console.log('│   lbx\'s Blog 发布后台已启动                 │');
  console.log(`│   ${`http://${HOST}:${PORT}`.padEnd(44)}│`);
  console.log('│   仅限本机访问，关闭此窗口即停止服务        │');
  console.log('└─────────────────────────────────────────────┘');
  console.log(`Obsidian 库：${cfg.vaultPath}`);
});
