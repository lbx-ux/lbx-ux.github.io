/**
 * 笔记导入共享逻辑：CLI（import-notes.mjs）与发布后台（admin/server.mjs）共用。
 * 职责：浏览 Obsidian 库、语法清洗、frontmatter 补全、写入博客目录。
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../..');

/* ── 配置 ─────────────────────────────────────────────── */
const CONFIG_FILE = path.join(ROOT, 'scripts/admin/config.json');

const DEFAULT_CONFIG = {
  vaultPath: 'E:/Note',
  blogDir: 'src/content/blog',
  defaultTag: '笔记',
  port: 8799,
  /** 顶层目录 → 标签映射（可按需增删） */
  dirTags: {
    Java: ['Java'],
    'Java+Agent': ['Java', 'AI'],
    Java后端: ['Java', '后端'],
    实习: ['实习', '成长'],
    实战: ['实战'],
    算法: ['算法'],
    部署: ['部署', '运维'],
    项目: ['项目'],
  },
};

export function loadConfig() {
  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8')) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(patch) {
  const next = { ...loadConfig(), ...patch };
  fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(next, null, 2));
  return next;
}

/* ── 库浏览 ───────────────────────────────────────────── */
export function listAllNotes(cfg = loadConfig()) {
  const vault = cfg.vaultPath;
  const walk = (dir, base = '') => {
    const out = [];
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return out;
    }
    for (const entry of entries) {
      const rel = base ? `${base}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        out.push(...walk(path.join(dir, entry.name), rel));
      } else if (entry.name.endsWith('.md')) {
        const stat = fs.statSync(path.join(dir, entry.name));
        out.push({ rel, mtime: stat.mtime.toISOString(), size: stat.size });
      }
    }
    return out;
  };
  return walk(vault).sort((a, b) => a.rel.localeCompare(b.rel, 'zh'));
}

/** 取笔记头部信息（首个标题/首段），用于列表预览 */
export function noteHeadline(rel, cfg = loadConfig()) {
  const raw = fs.readFileSync(path.join(cfg.vaultPath, rel), 'utf-8');
  const { meta, body } = parseFrontmatter(raw);
  const heading = body.match(/^#{1,3} (.+)$/m)?.[1];
  const firstLine = body
    .split(/\n{2,}/)
    .map((p) => p.replace(/[#>*`\-|[\]]/g, '').trim())
    .find((p) => p.length > 5);
  return { title: meta.title || heading || path.basename(rel, '.md'), excerpt: (firstLine ?? '').slice(0, 80) };
}

/* ── 语法转换 ─────────────────────────────────────────── */
export function parseFrontmatter(content) {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n(\r?\n)?/);
  if (!m) return { meta: {}, body: content };
  const meta = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^(\w[\w-]*):\s*(.*)$/);
    if (kv) meta[kv[1].toLowerCase()] = kv[2].trim().replace(/^["']|["']$/g, '');
  }
  return { meta, body: content.slice(m[0].length) };
}

export function cleanObsidianSyntax(content) {
  return (
    content
      // ![[image.png]] → 标准 Markdown（图片文件本身由 processImages 负责复制）
      .replace(/!\[\[([^\]]+)\]\]/g, '![]($1)')
      // [[link|text]] / [[link]] → 纯文本
      .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
      .replace(/\[\[([^\]]+)\]\]/g, '$1')
      // 指向库内其他笔记的相对链接（xxx.md）→ 纯文本（博客里没有这些文件，避免死链）
      // (?<!!) 排除图片语法 ![](...)，图片由 processImages 处理
      .replace(/(?<!!)\[([^\]]+)\]\(([^)]+\.md)\)/g, '$1')
      // 行内 #标签（避免误伤 # 标题）
      .replace(/(^|\s)#([\w\u4e00-\u9fff][\w\u4e00-\u9fff/-]*)/g, (m, pre, tag) =>
        pre === '' && tag.length > 1 ? m : `${pre}${tag}`)
      // Obsidian callout → blockquote
      .replace(/^> \[!(\w+)\][+-]? ?(.*)$/gm, '> **$1**：$2')
  );
}

function extractDescription(body) {
  const firstPara = body
    .split(/\n{2,}/)
    .map((p) => p.replace(/[#>*`\-|[\]\s]/g, '').trim())
    .find((p) => p.length > 10);
  return firstPara ? firstPara.slice(0, 100) : '（待补充描述）';
}

/** 图片在库里找不到时，按这些目录顺序去找（笔记里常见绝对路径/库外路径） */
const IMAGE_SEARCH_DIRS = ['F:/message/pixpin'];

/**
 * 处理正文里的本地图片：
 *  1. ![[xxx.png]]（Obsidian 嵌入）先转成标准 ![](xxx.png)；
 *  2. 所有指向本地存在的图片 → 复制到 public/covers/<slug>/，路径改写为 /covers/<slug>/xxx.png；
 *  3. 找不到的图片 → 注释占位，提醒手动处理。
 * 返回改写后的正文。
 */
function processImages(body, slug, cfg) {
  // Obsidian 嵌入图 → 标准 Markdown（供下一步统一处理）
  let out = body.replace(/!\[\[([^\]]+)\]\]/g, '![]($1)');

  const seen = new Map(); // 原路径 → 是否成功复制
  out = out.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (m, alt, rawPath) => {
    const imgPath = rawPath.trim();
    // 已经是网络图/站点绝对路径，不动
    if (/^(https?:|\/\/|\/covers\/)/.test(imgPath)) return m;

    const fileName = imgPath.split(/[\\/]/).pop();
    if (seen.has(imgPath)) {
      return seen.get(imgPath) ? `![${alt}](/covers/${slug}/${encodeURIComponent(fileName)})` : `<!-- 缺图：${fileName} -->`;
    }

    // 候选源：笔记原路径（绝对/相对）、配置的搜索目录按文件名找
    const candidates = [
      imgPath.includes('\\') ? imgPath : imgPath.replace(/\//g, '\\'),
      imgPath.includes('/') ? imgPath : imgPath.replace(/\\/g, '/'),
      ...IMAGE_SEARCH_DIRS.map((d) => `${d}/${fileName}`),
    ];
    let srcFile = null;
    for (const c of candidates) {
      try {
        if (fs.existsSync(c) && fs.statSync(c).isFile()) {
          srcFile = c;
          break;
        }
      } catch {
        /* 路径非法，跳过 */
      }
    }

    if (!srcFile) {
      seen.set(imgPath, false);
      return `<!-- 缺图：${fileName} —— 未找到源文件，请手动放置到 public/covers/${slug}/ 并改此行为 ![](/covers/${slug}/${encodeURIComponent(fileName)}) -->`;
    }

    // 复制到 public/covers/<slug>/
    const destDir = path.join(ROOT, 'public/covers', slug);
    fs.mkdirSync(destDir, { recursive: true });
    const destFile = path.join(destDir, fileName);
    fs.copyFileSync(srcFile, destFile);
    seen.set(imgPath, true);
    return `![${alt}](/covers/${slug}/${encodeURIComponent(fileName)})`;
  });

  // HTML <img src="本地路径"> → 复制后改写为站点绝对路径（保留原标签的 style/alt 等属性）
  out = out.replace(/<img\s+[^>]*src=["']([^"']+)["'][^>]*>/g, (m, rawSrc) => {
    const imgPath = rawSrc.trim();
    if (/^(https?:|\/\/|\/covers\/)/.test(imgPath)) return m;

    const fileName = imgPath.split(/[\\/]/).pop();
    // Markdown 阶段已复制过同名文件就直接复用
    const destDir = path.join(ROOT, 'public/covers', slug);
    const destFile = path.join(destDir, fileName);
    if (!fs.existsSync(destFile)) {
      const candidates = [
        imgPath.includes('\\') ? imgPath : imgPath.replace(/\//g, '\\'),
        imgPath.includes('/') ? imgPath : imgPath.replace(/\\/g, '/'),
        ...IMAGE_SEARCH_DIRS.map((d) => `${d}/${fileName}`),
      ];
      let srcFile = null;
      for (const c of candidates) {
        try {
          if (fs.existsSync(c) && fs.statSync(c).isFile()) {
            srcFile = c;
            break;
          }
        } catch {
          /* 跳过非法路径 */
        }
      }
      if (!srcFile) return `<!-- 缺图：${fileName} —— 未找到源文件 -->`;
      fs.mkdirSync(destDir, { recursive: true });
      fs.copyFileSync(srcFile, destFile);
    }
    return m.replace(rawSrc, `/covers/${slug}/${encodeURIComponent(fileName)}`);
  });

  return out;
}

function makeSlug(rel) {
  const cleaned = rel
    .replace(/\.md$/, '')
    .replace(/[^\w\u4e00-\u9fff-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const hasCJK = /[^\x00-\x7F]/.test(cleaned);
  if (!hasCJK) return cleaned.toLowerCase().slice(0, 60);
  let hash = 0;
  for (const ch of cleaned) hash = (hash * 31 + ch.codePointAt(0)) >>> 0;
  const asciiPart = cleaned.replace(/[^\x00-\x7F]+/g, '').replace(/^-+|-+$/g, '').toLowerCase();
  return `${asciiPart ? asciiPart.slice(0, 30) + '-' : ''}${hash.toString(36)}`;
}

/* ── 构建文章 ─────────────────────────────────────────── */
/**
 * 把一篇笔记转换为博客文章数据（不落盘）。
 * overrides 允许后台/CLI 覆盖自动检测的 title/description/tags/pubDate/draft。
 */
export function buildPost(rel, overrides = {}, cfg = loadConfig()) {
  const src = path.join(cfg.vaultPath, rel);
  if (!fs.existsSync(src)) return { error: `笔记不存在：${rel}` };

  const raw = fs.readFileSync(src, 'utf-8');
  const { meta: fm, body } = parseFrontmatter(raw);
  const topDir = rel.includes('/') ? rel.split('/')[0] : '';

  const title = overrides.title ?? fm.title ?? path.basename(rel, '.md');
  const pubDate =
    overrides.pubDate ?? fm.pubdate ?? fm.date ?? fs.statSync(src).mtime.toISOString().slice(0, 10);
  const autoTags = [...new Set([...(cfg.dirTags[topDir] ?? []), cfg.defaultTag])];
  const overrideTags = overrides.tags
    ? overrides.tags.split(/[,，]/).map((t) => t.trim()).filter(Boolean)
    : null;
  const tags = overrideTags?.length ? overrideTags : autoTags;

  const cleaned0 = cleanObsidianSyntax(body);
  // 先定 slug（图片要复制到以 slug 命名的目录），再处理图片路径
  let slug = makeSlug(rel);
  let n = 2;
  while (fs.existsSync(path.join(ROOT, cfg.blogDir, `${slug}.md`))) slug = `${makeSlug(rel)}-${n++}`;

  const cleaned = processImages(cleaned0, slug, cfg);
  const description = overrides.description ?? fm.description ?? extractDescription(cleaned);
  const draft = overrides.draft === true || overrides.draft === 'true' || fm.draft === 'true';

  const frontmatterLines = [
    '---',
    `title: ${title}`,
    `description: ${description}`,
    `pubDate: ${pubDate}`,
    `tags: [${tags.join(', ')}]`,
    ...(draft ? ['draft: true'] : []),
    `source: ${rel}`,
    '---',
  ];

  return { slug, file: `${slug}.md`, content: frontmatterLines.join('\n') + '\n\n' + cleaned, title };
}

/** 转换并写入博客目录 */
export function publishNote(rel, overrides = {}, cfg = loadConfig()) {
  const post = buildPost(rel, overrides, cfg);
  if (post.error) return post;
  const dir = path.join(ROOT, cfg.blogDir);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, post.file), post.content, 'utf-8');
  return post;
}

/* ── 已发布管理 ───────────────────────────────────────── */
export function listPosts(cfg = loadConfig()) {
  const dir = path.join(ROOT, cfg.blogDir);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((file) => {
      const { meta } = parseFrontmatter(fs.readFileSync(path.join(dir, file), 'utf-8'));
      return {
        slug: file.replace(/\.md$/, ''),
        file,
        title: meta.title ?? file,
        description: meta.description ?? '',
        pubDate: meta.pubdate ?? '',
        tags: meta.tags ? meta.tags.replace(/^\[|\]$/g, '').split(',').map((t) => t.trim()).filter(Boolean) : [],
        draft: meta.draft === 'true',
        source: meta.source ?? null,
      };
    })
    .sort((a, b) => (b.pubDate || '').localeCompare(a.pubDate || ''));
}

/** 更新已发布文章的 frontmatter（不动正文） */
export function updatePostMeta(slug, patch, cfg = loadConfig()) {
  const file = path.join(ROOT, cfg.blogDir, `${slug}.md`);
  if (!fs.existsSync(file)) return { error: `文章不存在：${slug}` };
  const { meta, body } = parseFrontmatter(fs.readFileSync(file, 'utf-8'));

  const title = patch.title ?? meta.title ?? slug;
  const description = patch.description ?? meta.description ?? '';
  const pubDate = patch.pubDate ?? meta.pubdate ?? '';
  const tags = patch.tags != null
    ? patch.tags.split(/[,，]/).map((t) => t.trim()).filter(Boolean)
    : (meta.tags ?? '').replace(/^\[|\]$/g, '').split(',').map((t) => t.trim()).filter(Boolean);
  const draft = patch.draft != null ? patch.draft === true || patch.draft === 'true' : meta.draft === 'true';

  const frontmatterLines = [
    '---',
    `title: ${title}`,
    ...(description ? [`description: ${description}`] : []),
    ...(pubDate ? [`pubDate: ${pubDate}`] : []),
    `tags: [${tags.join(', ')}]`,
    ...(draft ? ['draft: true'] : []),
    ...(meta.source ? [`source: ${meta.source}`] : []),
    '---',
  ];
  fs.writeFileSync(file, frontmatterLines.join('\n') + '\n\n' + body.replace(/^\r?\n\r?\n/, ''), 'utf-8');
  return { slug, ok: true };
}

export function deletePost(slug, cfg = loadConfig()) {
  const file = path.join(ROOT, cfg.blogDir, `${slug}.md`);
  if (!fs.existsSync(file)) return { error: `文章不存在：${slug}` };
  fs.unlinkSync(file);
  return { slug, ok: true };
}

export { ROOT };
