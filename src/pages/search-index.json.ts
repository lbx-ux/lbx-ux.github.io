import { getPublishedPosts } from '@/lib/content';

export const GET = async () => {
  const posts = await getPublishedPosts();
  const docs = posts.map((p) => ({
    id: p.id,
    title: p.data.title,
    description: p.data.description,
    series: p.data.series ?? null,
    date: p.data.pubDate.toISOString().slice(0, 10),
    // 截断正文用于客户端轻量匹配（每篇 4KB 足够）
    body: (p.body ?? '').slice(0, 4096),
  }));
  return new Response(JSON.stringify(docs), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
