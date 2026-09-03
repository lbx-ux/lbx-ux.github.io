/**
 * 专栏（series）工具：分组、排序、URL slug、成员位置。
 * 数据来自 frontmatter 的 series / order（发布后台自动推导，见 scripts/admin/shared.mjs）。
 */
import type { Post } from '@/lib/content';

export interface SeriesGroup {
  name: string;
  slug: string;
  posts: Post[];
  /** 最近更新时间（成员最大 pubDate） */
  lastUpdated: Date;
}

/** 专栏名 → URL slug：CJK 直接保留，其余转连字符 */
export function seriesSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}

/** 同序号时的次级排序：pubDate 早的在前 */
function compareMembers(a: Post, b: Post): number {
  const oa = a.data.order;
  const ob = b.data.order;
  if (oa != null && ob != null && oa !== ob) return oa - ob;
  if (oa != null && ob == null) return -1;
  if (oa == null && ob != null) return 1;
  return a.data.pubDate.valueOf() - b.data.pubDate.valueOf();
}

/** 全部文章 → 专栏分组（按最近更新倒序） */
export function buildSeriesMap(posts: Post[]): SeriesGroup[] {
  const map = new Map<string, Post[]>();
  for (const post of posts) {
    const name = post.data.series;
    if (!name) continue;
    if (!map.has(name)) map.set(name, []);
    map.get(name)!.push(post);
  }
  return [...map.entries()]
    .map(([name, members]) => ({
      name,
      slug: seriesSlug(name),
      posts: members.sort(compareMembers),
      lastUpdated: members.reduce((max, p) => (p.data.pubDate > max ? p.data.pubDate : max), members[0].data.pubDate),
    }))
    .sort((a, b) => b.lastUpdated.valueOf() - a.lastUpdated.valueOf());
}

/** 文章在其专栏内的位置信息（无专栏或未找到时 series 为 null） */
export function getPostSeries(post: Post, all: Post[]) {
  const name = post.data.series;
  if (!name) return { series: null as SeriesGroup | null, index: -1 };
  const group = buildSeriesMap(all).find((s) => s.name === name) ?? null;
  if (!group) return { series: null as SeriesGroup | null, index: -1 };
  const index = group.posts.findIndex((p) => p.id === post.id);
  return { series: group, index };
}
