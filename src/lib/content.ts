/**
 * 内容工具：文章集合查询（专栏层级排序、草稿过滤）、相关文章、封面占位色。
 * 所有页面共用，保证列表行为一致。
 */
import { getCollection, type CollectionEntry } from 'astro:content';
import { seriesRank } from '@/lib/series';

export type Post = CollectionEntry<'blog'> & { readingMinutes: number };

/**
 * 拉取全部已发布文章（排除 draft），顺序 = 发布后台拖拽出的层级排序：
 * 专栏顺序（series-order.json）→ 专栏内 order → pubDate 倒序兜底。
 */
export async function getPublishedPosts(): Promise<Post[]> {
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  return posts
    .sort((a, b) => {
      const ra = seriesRank(a.data.series);
      const rb = seriesRank(b.data.series);
      if (ra !== rb) return ra - rb;
      const oa = a.data.order;
      const ob = b.data.order;
      if (oa != null && ob != null && oa !== ob) return oa - ob;
      if (oa != null && ob == null) return -1;
      if (oa == null && ob != null) return 1;
      return b.data.pubDate.valueOf() - a.data.pubDate.valueOf();
    })
    .map((p) => ({ ...p, readingMinutes: 0 }));
}

/** 相关文章：同专栏优先 → 时间接近度加权，取前 n 篇（不含自身） */
export function getRelatedPosts(current: Post, all: Post[], n = 3): Post[] {
  return all
    .filter((p) => p.id !== current.id)
    .map((p) => {
      const daysApart = Math.abs(
        p.data.pubDate.valueOf() - current.data.pubDate.valueOf(),
      ) / 86_400_000;
      const sameSeries = p.data.series != null && p.data.series === current.data.series;
      return { post: p, score: (sameSeries ? 10 : 0) - Math.min(daysApart / 365, 2) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map((x) => x.post);
}

/** 上一篇 / 下一篇（按时间线相邻） */
export function getAdjacentPosts(current: Post, all: Post[]) {
  const idx = all.findIndex((p) => p.id === current.id);
  return {
    newer: idx > 0 ? all[idx - 1] : null,
    older: idx >= 0 && idx < all.length - 1 ? all[idx + 1] : null,
  };
}

/** 无封面时的渐变占位：按 slug 哈希在预设的极光渐变里挑一组 */
export const COVER_GRADIENTS = [
  ['#6366f1', '#a855f7', '#22d3ee'],
  ['#f472b6', '#a855f7', '#6366f1'],
  ['#22d3ee', '#6366f1', '#7c3aed'],
  ['#f59e0b', '#f472b6', '#a855f7'],
  ['#34d399', '#22d3ee', '#6366f1'],
  ['#a855f7', '#f43f5e', '#f59e0b'],
] as const;

export function coverGradient(slug: string): readonly [string, string, string] {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = (hash * 31 + slug.charCodeAt(i)) >>> 0;
  }
  const g = COVER_GRADIENTS[hash % COVER_GRADIENTS.length];
  return [g[0], g[1], g[2]];
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
