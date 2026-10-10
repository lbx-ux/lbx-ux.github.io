import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    /** 所属专栏（如「Redis 基础」），发布后台按 source 路径自动推导 */
    series: z.string().optional(),
    /** 专栏内序号（发布后台拖拽排序 / 上传路径自动推导），缺失时按 pubDate 排 */
    order: z.number().optional(),
    /** 草稿：构建时排除，dev 模式可见 */
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
