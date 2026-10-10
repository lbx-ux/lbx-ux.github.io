/**
 * lbx's Blog 发布后台 —— 本地 Node 服务（零依赖，仅绑定 127.0.0.1）。
 * 功能：上传 .md + 图片 → 可视化编辑元信息 → 发布；已发布文章的元信息与正文在线编辑。
 * 启动：双击 scripts/admin/启动发布后台.bat，或 node scripts/admin/server.mjs
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {
  loadConfig, publishUploaded, getPost, listPosts, updatePostMeta, deletePost,
  parseFrontmatter, cleanObsidianSyntax, extractDescription, deriveSeries, deriveOrder, ROOT,
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

function readJsonBody(req) {
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

/** 收集原始 body（Buffer），multipart 用（200MB 上限，够一次批量传图） */
function readRawBody(req, max = 200e6) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > max) {
        req.destroy();
        reject(new Error('请求体过大'));
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

/**
 * 零依赖 multipart/form-data 解析。
 * 返回 { fields: {name: value}, files: [{name, filename, data}] }。
 */
function parseMultipart(body, contentType) {
  const m = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType);
  if (!m) throw new Error('缺少 multipart boundary');
  const boundary = Buffer.from(`--${(m[1] || m[2]).trim()}`);
  const fields = {};
  const files = [];

  let pos = body.indexOf(boundary);
  while (pos !== -1) {
    const partStart = pos + boundary.length;
    // 结束标记 --boundary--
    if (body.slice(partStart, partStart + 2).toString() === '--') break;
    // 每个 part：\r\n 头部 \r\n\r\n 内容 \r\n
    const headEnd = body.indexOf('\r\n\r\n', partStart);
    if (headEnd === -1) break;
    const next = body.indexOf(boundary, headEnd + 4);
    if (next === -1) break;
    const head = body.slice(partStart + 2, headEnd).toString('utf-8');
    const data = body.slice(headEnd + 4, next - 2); // 去掉尾部 \r\n

    const nameM = /name="([^"]*)"/i.exec(head);
    const fileM = /filename="([^"]*)"/i.exec(head);
    const fieldName = nameM?.[1] ?? '';
    if (fileM && fileM[1]) {
      files.push({ name: fieldName, filename: fileM[1], data });
    } else if (fieldName) {
      fields[fieldName] = data.toString('utf-8');
    }
    pos = next;
  }
  return { fields, files };
}

function serveFile(res, filePath) {
  if (!fs.existsSync(filePath)) {
    res.writeHead(404).end('Not Found');
    return;
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] ?? 'text/plain; charset=utf-8' });
  res.end(fs.readFileSync(filePath));
}

/** 私密目录提醒（仅提示，不阻断）：这些顶层目录的笔记默认不发博客 */
const PRIVATE_DIRS = ['实习', '简历', '日常'];
const isPrivateRel = (rel) => PRIVATE_DIRS.some((d) => rel === d || rel.startsWith(`${d}/`));

/* ── 路由 ─────────────────────────────────────────────── */
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  const { pathname } = url;

  try {
    /* 上传预览：前端把 md 文本发来，返回清洗预览 + 自动推导的元信息建议 */
    if (pathname === '/api/upload/preview' && req.method === 'POST') {
      const { rel, raw } = await readJsonBody(req);
      if (!rel || typeof raw !== 'string') return json(res, 400, { error: '缺少 rel 或 raw' });
      const cfgNow = loadConfig();
      const { meta: fm, body } = parseFrontmatter(raw);
      const cleaned = cleanObsidianSyntax(body);
      const title = fm.title || path.basename(rel, '.md');
      const series = deriveSeries(rel, cfgNow);
      return json(res, 200, {
        title,
        description: fm.description || extractDescription(cleaned),
        series,
        order: deriveOrder(rel, series, cfgNow),
        raw: cleaned.length > 6000 ? `${cleaned.slice(0, 6000)}\n\n…（后文省略，共 ${cleaned.length} 字符）` : cleaned,
        privateHint: isPrivateRel(rel),
      });
    }

    /* 上传发布：multipart —— note = .md 文件，images = 正文引用的图片 */
    if (pathname === '/api/upload/publish' && req.method === 'POST') {
      const body = await readRawBody(req);
      const { fields, files } = parseMultipart(body, req.headers['content-type'] ?? '');
      const note = files.find((f) => f.name === 'note');
      if (!note) return json(res, 400, { error: '缺少笔记文件（note）' });

      const rel = (fields.rel || note.filename).replace(/\.(md|markdown)$/i, '');
      if (!rel) return json(res, 400, { error: '缺少 rel' });

      const images = new Map();
      for (const f of files) {
        if (f.name === 'images' || f.name === 'note') {
          if (f !== note) images.set(f.filename.toLowerCase(), f.data);
        }
      }

      const result = await publishUploaded({
        rel: rel.replace(/\.md$/i, ''),
        raw: note.data.toString('utf-8'),
        images,
        overrides: {
          title: fields.title?.trim() || undefined,
          description: fields.description?.trim() || undefined,
          series: fields.series?.trim() || undefined,
          order: fields.order?.trim() || undefined,
          pubDate: fields.pubDate || undefined,
          draft: fields.draft === 'true',
        },
      });
      if (result.error) return json(res, 400, result);
      const { copied, content, ...rest } = result;
      return json(res, 200, rest);
    }

    /* 已发布列表 */
    if (pathname === '/api/posts' && req.method === 'GET') {
      return json(res, 200, { posts: listPosts() });
    }

    /* 单篇读取（编辑弹窗） */
    if (pathname.startsWith('/api/posts/') && req.method === 'GET') {
      const slug = decodeURIComponent(pathname.split('/').pop());
      const result = getPost(slug);
      return result.error ? json(res, 404, result) : json(res, 200, result);
    }

    if (pathname.startsWith('/api/posts/') && req.method === 'PATCH') {
      const slug = decodeURIComponent(pathname.split('/').pop());
      const patch = await readJsonBody(req);
      const result = updatePostMeta(slug, patch);
      return result.error ? json(res, 400, result) : json(res, 200, result);
    }

    if (pathname.startsWith('/api/posts/') && req.method === 'DELETE') {
      const slug = decodeURIComponent(pathname.split('/').pop());
      const result = deletePost(slug);
      return result.error ? json(res, 400, result) : json(res, 200, result);
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
});
