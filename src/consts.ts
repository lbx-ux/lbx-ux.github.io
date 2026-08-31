// ─────────────────────────────────────────────────────────────
// 站点单一配置源：改这里即可换掉全站的站点名、作者、社交链接
// ─────────────────────────────────────────────────────────────

export const SITE_TITLE = "lbx's Blog";
export const SITE_DESCRIPTION = '一个 Java 后端开发者的个人博客。记录学习、实践与踩坑，把知识写成文章。';
export const SITE_AUTHOR = 'lbx';
export const LOCALE = 'zh-CN';

/** GitHub Pages base path（与 astro.config.mjs 的 base 保持一致） */
export const BASE_PATH = '/';

/** 每页文章数（首页 & 标签页分页） */
export const POSTS_PER_PAGE = 8;

export const SOCIAL_LINKS = [
  { label: 'GitHub', url: 'https://github.com/lbx-ux', icon: 'github' },
  { label: 'Email', url: 'mailto:hello@example.com', icon: 'mail' },
  { label: 'X / Twitter', url: 'https://x.com/YOUR_USERNAME', icon: 'x' },
  { label: 'RSS', url: '/rss.xml', icon: 'rss' },
] as const;

export const NAV_LINKS = [
  { label: '首页', url: '/' },
  { label: '归档', url: '/archives/' },
  { label: '标签', url: '/tags/' },
  { label: '搜索', url: '/search/' },
  { label: '关于', url: '/about/' },
] as const;
