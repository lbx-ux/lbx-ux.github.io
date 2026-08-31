/**
 * 内容工具：文章集合查询（时间倒序、草稿过滤）、标签统计、相关文章、封面占位色。
 * 所有页面共用，保证列表行为一致。
 */
import { getCollection, type CollectionEntry } from 'astro:content';
import { POSTS_PER_PAGE } from '@/consts';

export type Post = CollectionEntry<'blog'> & { readingMinutes: number };

/** 拉取全部已发布文章（排除 draft），按 pubDate 倒序 */
export async function getPublishedPosts(): Promise<Post[]> {
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  return posts
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
    .map((p) => ({ ...p, readingMinutes: 0 }));
}

/** 全部标签 → 文章数，按数量降序 */
export function getTagMap(posts: Post[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.data.tags) {
      map.set(tag, (map.get(tag) ?? 0) + 1);
    }
  }
  return new Map([...map.entries()].sort((a, b) => b[1] - a[1]));
}

/** 相关文章：标签重合度 → 时间接近度加权，取前 n 篇（不含自身） */
export function getRelatedPosts(current: Post, all: Post[], n = 3): Post[] {
  const tagSet = new Set(current.data.tags);
  return all
    .filter((p) => p.id !== current.id)
    .map((p) => {
      const overlap = p.data.tags.filter((t) => tagSet.has(t)).length;
      const daysApart = Math.abs(
        p.data.pubDate.valueOf() - current.data.pubDate.valueOf(),
      ) / 86_400_000;
      return { post: p, score: overlap * 10 - Math.min(daysApart / 365, 2) };
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

export function paginate(total: number, perPage = POSTS_PER_PAGE) {
  const pageCount = Math.max(1, Math.ceil(total / perPage));
  return { pageCount, pageSizes: Array.from({ length: pageCount }, (_, i) => perPage) };
}

/** 归档：按年份分组 */
export function groupByYear(posts: Post[]): Map<number, Post[]> {
  const map = new Map<number, Post[]>();
  for (const post of posts) {
    const year = post.data.pubDate.getFullYear();
    if (!map.has(year)) map.set(year, []);
    map.get(year)!.push(post);
  }
  return map;
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
