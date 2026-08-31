import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    /** 封面图路径（public/ 下相对路径），缺省时用渐变占位 */
    cover: z.string().optional(),
    /** 草稿：构建时排除，dev 模式可见 */
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
