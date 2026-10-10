// ─────────────────────────────────────────────────────────────
// 站点单一配置源：改这里即可换掉全站的站点名、作者、社交链接
// ─────────────────────────────────────────────────────────────

export const SITE_TITLE = "lbx's Blog";
export const SITE_DESCRIPTION = '一个 Java 后端开发者的个人博客。记录学习、实践与踩坑，把知识写成文章。';
export const SITE_AUTHOR = 'lbx';
export const LOCALE = 'zh-CN';

/** GitHub Pages base path（与 astro.config.mjs 的 base 保持一致） */
export const BASE_PATH = '/';

/** 每页文章数（首页分页） */
export const POSTS_PER_PAGE = 8;

export const SOCIAL_LINKS = [
  { label: 'GitHub', url: 'https://github.com/lbx-ux', icon: 'github' },
  // 想加 X / 掘金 等更多链接时，在此按 { label, url, icon } 追加即可（icon 取自 src/components/Icon.astro）
  // 邮箱单独放 EMAIL：分段存放、渲染时拼装，见 src/lib/mail.ts
] as const;

/** 联系邮箱。故意拆成两段：构建产物里不出现连续的 user@domain 字串 */
export const EMAIL = { user: '2953997419', domain: 'qq.com' } as const;

export const NAV_LINKS = [
  { label: '首页', url: '/' },
  { label: '专栏', url: '/series/' },
  { label: '关于', url: '/about/' },
] as const;
