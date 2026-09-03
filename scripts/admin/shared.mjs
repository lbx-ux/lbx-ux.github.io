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
  port: 8799,
  /** 正文图片优化：超过该宽度等比缩小（0 = 不限宽） */
  imageMaxWidth: 1200,
  /** 正文图片压缩质量 1-100（WebP / JPEG 通用） */
  imageQuality: 82,
  /**
   * 专栏（series）推导规则：按 source 路径子串匹配，先专后泛；
   * 都不命中时兜底 = source 顶层目录名。
   * 规则与已发布文章的 series 命名保持一致（2026-09 手工整理后的 10 个专栏），
   * 改名前先确认不会把既有专栏拆成新名字。
   */
  seriesRules: [
    { match: '算法/', series: '左神算法笔记' },
    { match: 'Mysql/', series: 'MySQL' },
    { match: 'Redis/', series: 'Redis' },
    { match: 'Mybatis', series: 'Mybatis' },
    { match: 'SSM/Spring', series: 'Spring' },
    { match: 'SpringCloud', series: 'SpringCloud' },
    { match: 'RabbitMQ', series: 'RabbitMQ' },
    { match: '实战/存储技术', series: '存储技术' },
    { match: '实战/登录技术', series: '登录技术' },
    { match: '实战/验证码', series: '验证码' },
  ],
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

/* ── 专栏推导 ─────────────────────────────────────────── */
/** 按 source 路径子串匹配专栏，先专后泛；都不命中时兜底 = source 顶层目录名 */
export function deriveSeries(rel, cfg = loadConfig()) {
  const source = rel.replace(/\.md$/, '');
  for (const rule of cfg.seriesRules ?? []) {
    if (source.includes(rule.match)) return rule.series;
  }
  return source.includes('/') ? source.split('/')[0] : '未分类';
}

/** 自然排序比较器：数字段按数值比（1 < 2.1 < 2.10 < 3），其余按字典序 */
export function naturalCompare(a, b) {
  const pa = String(a).split(/(\d+(?:\.\d+)?)/g).filter(Boolean);
  const pb = String(b).split(/(\d+(?:\.\d+)?)/g).filter(Boolean);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const xa = pa[i] ?? '';
    const xb = pb[i] ?? '';
    if (xa === xb) continue;
    const na = Number(xa);
    const nb = Number(xb);
    if (!Number.isNaN(na) && !Number.isNaN(nb) && String(na) === xa && String(nb) === xb) {
      return na - nb;
    }
    return xa < xb ? -1 : 1;
  }
  return 0;
}

/**
 * 同专栏内按 source 路径自然排序，返回 path → 序号（1..N）。
 * source 文件名前缀（1. / 2.1 / 3.）就是用户的学习顺序，比标题/文件名更可靠。
 */
export function seriesOrders(paths) {
  const sorted = [...new Set(paths)].sort(naturalCompare);
  const map = new Map();
  sorted.forEach((p, i) => map.set(p, i + 1));
  return map;
}

/**
 * 发布单篇时推导其专栏内序号：
 * 扫描博客目录中同 series 的既有文章，把新笔记的 source 并入后按自然序重排。
 * 找不到 source 时返回 null（站点按 pubDate 兜底）。
 */
export function deriveOrder(rel, series, cfg = loadConfig()) {
  if (!series) return null;
  const dir = path.join(ROOT, cfg.blogDir);
  const paths = [rel.replace(/\.md$/, '')];
  try {
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.md'))) {
      const { meta } = parseFrontmatter(fs.readFileSync(path.join(dir, file), 'utf-8'));
      if (meta.series === series && meta.source) paths.push(meta.source.replace(/\.md$/, ''));
    }
  } catch {
    /* 目录不存在则只有新笔记自己 */
  }
  return seriesOrders(paths).get(rel.replace(/\.md$/, '')) ?? null;
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
    // 跳过纯图片段落：先剥掉图片语法再取文字，避免把畸形 URL 塞进描述
    .map((p) =>
      p
        .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
        .replace(/[#>*`|[\]\s]/g, '')
        .trim(),
    )
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
 * 返回 { body: 改写后的正文, copied: 本次落盘的图片绝对路径 }（压缩在 publishNote 阶段统一做）。
 */
function processImages(body, slug, cfg) {
  // Obsidian 嵌入图 → 标准 Markdown（供下一步统一处理）
  let out = body.replace(/!\[\[([^\]]+)\]\]/g, '![]($1)');

  const seen = new Map(); // 原路径 → 是否成功复制
  const copied = []; // 本次发布复制出来的图片（绝对路径），供 optimizeCopiedImages 压缩
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
    copied.push(destFile);
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
      copied.push(destFile);
    }
    return m.replace(rawSrc, `/covers/${slug}/${encodeURIComponent(fileName)}`);
  });

  return { body: out, copied };
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
 * overrides 允许后台/CLI 覆盖自动检测的 title/description/pubDate/draft。
 */
export function buildPost(rel, overrides = {}, cfg = loadConfig()) {
  const src = path.join(cfg.vaultPath, rel);
  if (!fs.existsSync(src)) return { error: `笔记不存在：${rel}` };

  const raw = fs.readFileSync(src, 'utf-8');
  const { meta: fm, body } = parseFrontmatter(raw);

  const title = overrides.title ?? fm.title ?? path.basename(rel, '.md');
  const pubDate =
    overrides.pubDate ?? fm.pubdate ?? fm.date ?? fs.statSync(src).mtime.toISOString().slice(0, 10);

  const cleaned0 = cleanObsidianSyntax(body);
  // 先定 slug（图片要复制到以 slug 命名的目录），再处理图片路径
  let slug = makeSlug(rel);
  let n = 2;
  while (fs.existsSync(path.join(ROOT, cfg.blogDir, `${slug}.md`))) slug = `${makeSlug(rel)}-${n++}`;

  const { body: cleaned, copied } = processImages(cleaned0, slug, cfg);
  const description = overrides.description ?? fm.description ?? extractDescription(cleaned);
  const draft = overrides.draft === true || overrides.draft === 'true' || fm.draft === 'true';

  const series = overrides.series?.trim() || deriveSeries(rel, cfg);
  // 专栏内序号：手动填写优先，否则按同系列 source 路径自然序推导
  const order =
    overrides.order?.trim() !== '' && !Number.isNaN(Number(overrides.order))
      ? Number(overrides.order)
      : deriveOrder(rel, series, cfg);

  const frontmatterLines = [
    '---',
    `title: ${title}`,
    `description: ${description}`,
    `pubDate: ${pubDate}`,
    ...(series ? [`series: ${series}`] : []),
    ...(series && order != null ? [`order: ${order}`] : []),
    ...(draft ? ['draft: true'] : []),
    `source: ${rel}`,
    '---',
  ];

  return { slug, file: `${slug}.md`, content: frontmatterLines.join('\n') + '\n\n' + cleaned, title, copied };
}

/* ── 图片压缩（发布时） ───────────────────────────────── */
const IMAGE_COMPRESSIBLE_RE = /\.(png|jpe?g)$/i;

/** 动态加载 sharp（可选依赖）：未安装时返回 null，发布流程降级为「只复制不压缩」 */
async function loadSharp() {
  try {
    return (await import('sharp')).default;
  } catch {
    return null;
  }
}

/**
 * 压缩 buildPost 阶段复制到 public/covers/<slug>/ 的图片：
 *  - 宽度超过 cfg.imageMaxWidth（默认 1200）时等比缩小；
 *  - PNG：WebP 与压缩 PNG 择优，WebP 明显更小才换扩展名（正文引用同步改写）；
 *  - JPEG：mozjpeg 重编码，体积无优势则保留原图；
 *  - GIF / SVG 及处理失败的图片保持原样。
 * 返回更新后的 post（content 中引用路径已按重命名结果改写）。
 */
export async function optimizeCopiedImages(post, cfg = loadConfig()) {
  const copied = post.copied ?? [];
  if (!copied.length) return post;
  const sharp = await loadSharp();
  if (!sharp) return { ...post, imageNotice: '未安装 sharp，图片仅复制未压缩（npm install 后重试）' };

  const maxWidth = Number.isFinite(+cfg.imageMaxWidth) ? +cfg.imageMaxWidth : 1200;
  const quality = Math.min(100, Math.max(1, Number(cfg.imageQuality) || 82));
  const renames = []; // [原文件名, 新文件名] —— 扩展名变化时用于改写正文引用
  let saved = 0;

  for (const destFile of copied) {
    try {
      const ext = path.extname(destFile).toLowerCase();
      if (!IMAGE_COMPRESSIBLE_RE.test(ext)) continue;

      const orig = fs.readFileSync(destFile);
      const meta = await sharp(destFile).metadata();
      // 同一输入、同一缩放参数生成一条新管线（避免共享实例的状态干扰）
      const pipe = () => {
        const p = sharp(destFile).rotate(); // 按 EXIF 自动摆正
        if (maxWidth > 0 && (meta.width ?? 0) > maxWidth) {
          p.resize({ width: maxWidth, withoutEnlargement: true });
        }
        return p;
      };

      let best; // { buf, ext }
      if (ext === '.png') {
        const webp = await pipe().webp({ quality }).toBuffer();
        const pngOpt = await pipe().png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer();
        if (webp.length < orig.length && webp.length < pngOpt.length * 0.9) best = { buf: webp, ext: '.webp' };
        else if (pngOpt.length < orig.length) best = { buf: pngOpt, ext };
        else best = { buf: orig, ext };
      } else {
        const jpeg = await pipe().jpeg({ quality, mozjpeg: true }).toBuffer();
        best = jpeg.length < orig.length * 0.9 ? { buf: jpeg, ext } : { buf: orig, ext };
      }

      if (best.ext !== ext) {
        const baseName = path.basename(destFile);
        const newBase = baseName.slice(0, baseName.length - ext.length) + best.ext;
        fs.writeFileSync(path.join(path.dirname(destFile), newBase), best.buf);
        fs.unlinkSync(destFile);
        renames.push([baseName, newBase]);
      } else if (best.buf !== orig) {
        fs.writeFileSync(destFile, best.buf);
      }
      saved += orig.length - best.buf.length;
    } catch {
      /* 单张失败不影响其余图片 */
    }
  }

  let content = post.content;
  for (const [from, to] of renames) {
    const prefix = `/covers/${post.slug}/`;
    content = content.split(prefix + encodeURIComponent(from)).join(prefix + encodeURIComponent(to));
  }
  return { ...post, content, imageSavedBytes: saved, imageRenamed: renames.length };
}

/** 转换 + 图片压缩 + 写入博客目录 */
export async function publishNote(rel, overrides = {}, cfg = loadConfig()) {
  let post = buildPost(rel, overrides, cfg);
  if (post.error) return post;
  post = await optimizeCopiedImages(post, cfg);
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
        series: meta.series ?? null,
        order: meta.order != null ? Number(meta.order) : null,
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
  const draft = patch.draft != null ? patch.draft === true || patch.draft === 'true' : meta.draft === 'true';
  const series = patch.series != null ? String(patch.series).trim() : (meta.series ?? '');
  const orderRaw = patch.order != null ? String(patch.order).trim() : (meta.order ?? '');
  const order = orderRaw !== '' && !Number.isNaN(Number(orderRaw)) ? Number(orderRaw) : null;

  const frontmatterLines = [
    '---',
    `title: ${title}`,
    ...(description ? [`description: ${description}`] : []),
    ...(pubDate ? [`pubDate: ${pubDate}`] : []),
    ...(series ? [`series: ${series}`] : []),
    ...(series && order != null ? [`order: ${order}`] : []),
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
