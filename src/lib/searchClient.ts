/**
 * 客户端搜索共享逻辑：索引懒加载 + 加权评分。
 * Ctrl+K 命令面板（SearchPalette）专用。
 */

export interface SearchDoc {
  id: string;
  title: string;
  description: string;
  series: string | null;
  date: string;
  body: string;
}

let docsPromise: Promise<SearchDoc[]> | null = null;

/** 首次调用时 fetch 索引并缓存 promise，之后零开销 */
export function fetchDocs(): Promise<SearchDoc[]> {
  docsPromise ??= fetch(`${import.meta.env.BASE_URL}search-index.json`).then((r) => {
    if (!r.ok) throw new Error(`搜索索引加载失败（${r.status}）`);
    return r.json() as Promise<SearchDoc[]>;
  });
  return docsPromise;
}

/** 加权匹配：标题(5) / 描述(2) / 正文(1)，出现次数加权标题 */
export function scoreDoc(doc: SearchDoc, q: string): number {
  let s = 0;
  const title = doc.title.toLowerCase();
  const desc = doc.description.toLowerCase();
  const body = doc.body.toLowerCase();
  if (title.includes(q)) s += 5 * (title.split(q).length - 1);
  if (desc.includes(q)) s += 2;
  if (body.includes(q)) s += 1;
  return s;
}

export function searchDocs(docs: SearchDoc[], query: string, limit = 12): SearchDoc[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return docs
    .map((d) => ({ d, s: scoreDoc(d, q) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.d);
}
