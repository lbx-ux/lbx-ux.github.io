// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// ── GitHub Pages 部署配置 ────────────────────────────────────────────────
// 推荐用「用户主页仓库」：仓库名 = <用户名>.github.io，部署在根路径，
// 站内 /covers/、/posts/ 等绝对路径链接零改动即可工作。
// 若改用普通仓库名（如 blog），BASE 需改为 '/blog' 并同步 src/consts.ts 的 BASE_PATH，
// 且已发布文章里 /covers/ 图片路径需一并处理（不推荐）。
const SITE = 'https://lbx-ux.github.io';
const BASE = '/';

/** 正文图片懒加载：构建期为 Markdown 里的 <img> 注入 loading/decoding，零运行时开销 */
function rehypeLazyImages() {
  return (tree) => {
    const visit = (node) => {
      if (node.type === 'element' && node.tagName === 'img') {
        node.properties.loading ??= 'lazy';
        node.properties.decoding ??= 'async';
      }
      (node.children ?? []).forEach(visit);
    };
    visit(tree);
  };
}

export default defineConfig({
  site: SITE,
  base: BASE,
  trailingSlash: 'ignore',
  output: 'static',
  devToolbar: { enabled: false },
  // 悬停预取内链，配合 ClientRouter 视图过渡近乎秒开
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
  integrations: [
    sitemap({
      // sitemap 链接会自动带上 base
      // 不设全局 lastmod：避免每次构建把全站标成"刚更新"，干扰搜索引擎
      changefreq: 'weekly',
    }),
  ],
  markdown: {
    rehypePlugins: [rehypeLazyImages],
    // 暗色用 one-dark-pro，浅色用 one-light；CSS 变量双主题切换见 prose.css
    shikiConfig: {
      themes: { light: 'one-light', dark: 'one-dark-pro' },
      defaultColor: false,
      wrap: true,
    },
  },
});
