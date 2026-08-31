// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// ── GitHub Pages 部署配置 ────────────────────────────────────────────────
// 1. 把下面的 site 换成你的 Pages 地址：https://<用户名>.github.io
// 2. 把 base 换成仓库名：用户页仓库（<username>.github.io）保持 '/'，
//    普通仓库（如 blog）填 '/blog'
const SITE = 'https://YOUR_USERNAME.github.io';
const BASE = '/';

export default defineConfig({
  site: SITE,
  base: BASE,
  trailingSlash: 'ignore',
  output: 'static',
  devToolbar: { enabled: false },
  integrations: [
    sitemap({
      // sitemap 链接会自动带上 base
      changefreq: 'weekly',
      lastmod: new Date(),
    }),
  ],
  markdown: {
    // 暗色用 one-dark-pro，浅色用 one-light；CSS 变量双主题切换见 prose.css
    shikiConfig: {
      themes: { light: 'one-light', dark: 'one-dark-pro' },
      defaultColor: false,
      wrap: true,
    },
  },
});
