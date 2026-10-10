/**
 * 全站客户端引导：主题切换、GSAP 生命周期绑定、液态玻璃挂载。
 * 由 BaseLayout 以 <script> 引入（Astro 打包为模块，全站去重执行）。
 */
import { initPageAnimations, cleanup } from '@/lib/animations';
import { initLiquidGlass, destroyLiquidGlass } from '@/lib/liquid-glass/glassInit';

/* ── 主题：与 BaseLayout 内联脚本同源的 localStorage 约定 ── */
export type Theme = 'dark' | 'light';

export function getTheme(): Theme {
  return (document.documentElement.dataset.theme as Theme) || 'dark';
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('theme', theme);
}

export function toggleTheme() {
  applyTheme(getTheme() === 'dark' ? 'light' : 'dark');
}

function bindThemeToggle() {
  document.querySelectorAll<HTMLElement>('[data-theme-toggle]').forEach((btn) => {
    if (btn.dataset.themeBound) return;
    btn.dataset.themeBound = '1';
    btn.setAttribute('aria-pressed', String(getTheme() === 'light'));
    btn.addEventListener('click', () => {
      toggleTheme();
      btn.setAttribute('aria-pressed', String(getTheme() === 'light'));
    });
  });
}

/* ── 移动端抽屉菜单 ── */
function bindMobileNav() {
  const btn = document.querySelector<HTMLElement>('[data-nav-toggle]');
  const drawer = document.querySelector<HTMLElement>('[data-mobile-nav]');
  if (!btn || !drawer) return;

  const setOpen = (open: boolean) => {
    btn.setAttribute('aria-expanded', String(open));
    drawer.classList.toggle('is-open', open);
    document.body.classList.toggle('nav-open', open);
  };

  if (btn.dataset.navBound) return;
  btn.dataset.navBound = '1';
  btn.addEventListener('click', () => setOpen(btn.getAttribute('aria-expanded') !== 'true'));
  drawer.querySelectorAll('a').forEach((a) =>
    a.addEventListener('click', () => setOpen(false)),
  );
}

/* ── 邮箱链接：href 运行时拼装，构建产物里不留明文 mailto:（见 src/lib/mail.ts） ── */
function bindMailLinks() {
  for (const a of document.querySelectorAll<HTMLAnchorElement>('a[data-mail-u]')) {
    const user = a.dataset.mailU;
    const domain = a.dataset.mailD;
    if (!user || !domain) continue;
    a.href = `mailto:${user}@${domain}`;
    a.removeAttribute('data-mail-u');
    a.removeAttribute('data-mail-d');
  }
}

/* ── 视图过渡生命周期 ── */
function boot() {
  bindThemeToggle();
  bindMobileNav();
  bindMailLinks();
  initPageAnimations();
  initLiquidGlass();
}

// 首次加载
boot();

// ClientRouter 视图过渡：每次换页重跑
document.addEventListener('astro:page-load', boot);
document.addEventListener('astro:before-swap', () => {
  cleanup();
  destroyLiquidGlass();
});
