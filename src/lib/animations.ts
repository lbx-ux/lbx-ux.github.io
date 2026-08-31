/**
 * 全站 GSAP 动效编排。
 * 约定：
 *  - astro:page-load 时（重新）初始化，astro:before-swap 时清理（见 src/scripts/site.ts）；
 *  - 「必要交互」（TOC 高亮/跳转、代码复制、返回顶部、导航滚动态）不依赖动效，始终注册；
 *  - 装饰动效（视差、逐字入场、渐显、导航隐藏）在 prefers-reduced-motion: reduce 下
 *    完全跳过，元素保持自然终态（gsap.from 的初始态由 JS 设置，无 JS / 跳过时即为可见）；
 *  - 移动端（<768px）跳过视差与 3D 逐字效果，保留轻量渐显。
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Observer } from 'gsap/Observer';
import { SplitText } from 'gsap/SplitText';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { Flip } from 'gsap/Flip';

gsap.registerPlugin(ScrollTrigger, Observer, SplitText, ScrollToPlugin, Flip);

let pageCtx: gsap.Context | null = null;
let heroSplit: SplitText | null = null;
const disposers: Array<() => void> = [];

function addDisposer(fn: () => void) {
  disposers.push(fn);
}

/* ────────────────────────── 必要交互（始终注册） ────────────────────────── */

/** 导航条滚动后加深玻璃底色 */
function setupHeaderScrollState() {
  const header = document.querySelector<HTMLElement>('[data-header]');
  if (!header || header.dataset.scrollBound) return;
  header.dataset.scrollBound = '1';
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 24);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  addDisposer(() => {
    window.removeEventListener('scroll', onScroll);
    delete header.dataset.scrollBound;
  });
}

/** 代码块：注入复制按钮（运行时包一层，免 rehype 插件） */
function setupCopyCode(scope: HTMLElement) {
  scope.querySelectorAll<HTMLElement>('.astro-code').forEach((pre) => {
    if (pre.parentElement?.classList.contains('code-wrap')) return;
    const wrap = document.createElement('div');
    wrap.className = 'code-wrap';
    pre.replaceWith(wrap);
    wrap.appendChild(pre);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'copy-btn';
    btn.dataset.copyCode = '';
    btn.setAttribute('aria-label', '复制代码');
    btn.innerHTML =
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg><span data-copy-label>复制</span>';
    wrap.appendChild(btn);
  });

  scope.querySelectorAll<HTMLElement>('[data-copy-code]').forEach((btn) => {
    if (btn.dataset.copyBound) return;
    btn.dataset.copyBound = '1';
    btn.addEventListener('click', async () => {
      const code = btn.parentElement?.querySelector('pre')?.textContent;
      if (!code) return;
      try {
        await navigator.clipboard.writeText(code);
        btn.classList.add('is-copied');
        const label = btn.querySelector('[data-copy-label]');
        if (label) label.textContent = '已复制';
        setTimeout(() => {
          btn.classList.remove('is-copied');
          if (label) label.textContent = '复制';
        }, 1600);
      } catch {
        /* 剪贴板不可用（非安全上下文），静默 */
      }
    });
  });
}

/** TOC：滚动高亮 + 点击滚动（reduced-motion 时瞬时跳转） */
function setupToc(scope: HTMLElement, reduced: boolean) {
  const article = scope.querySelector<HTMLElement>('[data-article]');
  const tocLinks = Array.from(scope.querySelectorAll<HTMLAnchorElement>('[data-toc-link]'));
  if (!article || !tocLinks.length) return;

  const byId = new Map(tocLinks.map((a) => [a.getAttribute('href')!.slice(1), a]));
  const headings = Array.from(byId.keys())
    .map((id) => scope.querySelector<HTMLElement>(`#${CSS.escape(id)}`))
    .filter((h): h is HTMLElement => !!h);
  if (!headings.length) return;

  const setActive = (id: string) => {
    tocLinks.forEach((a) =>
      a.classList.toggle('is-active', a.getAttribute('href') === `#${id}`),
    );
  };
  const initial = headings.find((h) => h.getBoundingClientRect().top > 0) ?? headings[0];
  if (initial) setActive(initial.id);

  headings.forEach((h) => {
    ScrollTrigger.create({
      trigger: h,
      start: 'top 35%',
      end: 'bottom 35%',
      onToggle: (self) => self.isActive && setActive(h.id),
    });
  });

  tocLinks.forEach((a) => {
    a.addEventListener('click', (e) => {
      const target = document.getElementById(a.getAttribute('href')!.slice(1));
      if (!target) return;
      e.preventDefault();
      const y = target.getBoundingClientRect().top + window.scrollY - 96;
      if (reduced) {
        window.scrollTo(0, y);
      } else {
        gsap.to(window, { scrollTo: { y }, duration: 0.7, ease: 'power3.inOut' });
      }
    });
  });
}

/** 返回顶部 */
function setupBackToTop(scope: HTMLElement, reduced: boolean) {
  const btn = scope.querySelector<HTMLElement>('[data-back-to-top]');
  if (!btn || btn.dataset.topBound) return;
  btn.dataset.topBound = '1';
  const onScroll = () => btn.classList.toggle('is-visible', window.scrollY > 600);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  addDisposer(() => {
    window.removeEventListener('scroll', onScroll);
    delete btn.dataset.topBound;
  });
  btn.addEventListener('click', () => {
    if (reduced) {
      window.scrollTo(0, 0);
    } else {
      gsap.to(window, { scrollTo: 0, duration: 0.8, ease: 'power3.inOut' });
    }
  });
}

/* ────────────────────────── 装饰动效（reduced-motion 跳过） ────────────────────────── */

/** 极光光斑滚动视差（多层速差） */
function setupAuroraParallax(isDesktop: boolean) {
  const layers = document.querySelectorAll<HTMLElement>('[data-aurora-layer]');
  if (!layers.length) return;
  gsap.to(layers, {
    yPercent: (i) => (isDesktop ? (i % 2 === 0 ? -14 : -22) : 0),
    scale: 1.06,
    ease: 'none',
    scrollTrigger: {
      trigger: document.body,
      start: 'top top',
      end: 'max',
      scrub: 0.6,
      invalidateOnRefresh: true,
    },
  });
}

/** 首页 Hero：标题逐字符 3D 翻入 + 玻璃卡错落浮现 */
function setupHero(isDesktop: boolean) {
  const hero = document.querySelector<HTMLElement>('[data-hero]');
  if (!hero) return;

  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  tl.from('[data-hero-eyebrow]', { opacity: 0, y: 14, duration: 0.5 }, 0.1).from(
    '[data-hero-sub]',
    { opacity: 0, y: 16, duration: 0.6 },
    0.35,
  );

  const headline = hero.querySelector<HTMLElement>('[data-hero-title]');
  if (headline) {
    heroSplit = new SplitText(headline, {
      type: 'chars,words',
      charsClass: 'split-char',
      wordsClass: 'split-word',
      aria: 'auto',
    });
    tl.from(
      heroSplit.chars,
      {
        opacity: 0,
        y: isDesktop ? 34 : 18,
        rotateX: isDesktop ? -50 : 0,
        transformOrigin: '50% 100%',
        duration: 0.7,
        stagger: 0.02,
      },
      0.15,
    );
  }

  const cards = gsap.utils.toArray<HTMLElement>('[data-hero-card]');
  if (cards.length) {
    tl.from(
      cards,
      { opacity: 0, y: isDesktop ? 44 : 24, filter: 'blur(12px)', duration: 0.9, stagger: 0.1 },
      0.3,
    );
  }
}

/** 滚动渐显：.reveal 元素进入视口时 fade+up */
function setupReveals(isDesktop: boolean) {
  document.querySelectorAll<HTMLElement>('[data-stagger]').forEach((group) => {
    const items = group.querySelectorAll(':scope > .reveal');
    if (!items.length) return;
    gsap.from(items, {
      opacity: 0,
      y: isDesktop ? 26 : 14,
      duration: 0.55,
      stagger: Math.min(0.08, 0.6 / items.length),
      ease: 'power2.out',
      scrollTrigger: { trigger: group, start: 'top 88%', once: true },
    });
  });

  document.querySelectorAll<HTMLElement>('.reveal:not([data-stagger] .reveal)').forEach((el) => {
    gsap.from(el, {
      opacity: 0,
      y: isDesktop ? 22 : 12,
      duration: 0.5,
      ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
    });
  });
}

/** 导航条：下滚隐藏、上滚滑回 */
function setupHeaderHide() {
  const header = document.querySelector<HTMLElement>('[data-header]');
  if (!header) return;
  gsap.set(header, { y: 0 });
  Observer.create({
    target: window,
    type: 'wheel,touch,pointer',
    tolerance: 12,
    preventDefault: false,
    onUp: () => gsap.to(header, { y: 0, duration: 0.35, ease: 'power3.out', overwrite: 'auto' }),
    onDown: () => {
      if (window.scrollY > 120) {
        gsap.to(header, { y: -110, duration: 0.4, ease: 'power3.out', overwrite: 'auto' });
      }
    },
  });
}

/** 文章页：顶部阅读进度条 */
function setupProgressBar() {
  const progressBar = document.querySelector<HTMLElement>('[data-progress]');
  const article = document.querySelector<HTMLElement>('[data-article]');
  if (!progressBar || !article) return;
  gsap.fromTo(
    progressBar,
    { scaleX: 0 },
    {
      scaleX: 1,
      ease: 'none',
      transformOrigin: '0 50%',
      scrollTrigger: { trigger: article, start: 'top top', end: 'bottom bottom', scrub: 0.3 },
    },
  );
}

/* ────────────────────────── 沉浸式阅读 ────────────────────────── */
/**
 * 点击「沉浸式阅读」：全屏覆盖层淡入，正文经 GSAP Flip 从原位飞入屏幕正中；
 * 退出（浮条 / Esc / 点击空白）时飞回原位并尽量保持相对阅读位置。
 * 覆盖层由 JS 动态挂到 body，避免被页面结构的 inert / 视图过渡牵连。
 */

const FOCUS_OVERLAY_ID = 'focus-overlay';

function buildFocusOverlay(): HTMLElement {
  let overlay = document.getElementById(FOCUS_OVERLAY_ID);
  if (overlay) return overlay;
  overlay = document.createElement('div');
  overlay.id = FOCUS_OVERLAY_ID;
  overlay.className = 'focus-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', '沉浸式阅读');
  overlay.innerHTML = `
    <div class="focus-scroll" data-focus-scroll></div>
    <div class="focus-chrome">
      <button type="button" class="focus-exit" data-focus-exit aria-label="退出沉浸式阅读（Esc）">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" x2="21" y1="10" y2="3"/><line x1="3" x2="10" y1="21" y2="14"/></svg>
        <span>退出沉浸</span>
        <kbd>Esc</kbd>
      </button>
    </div>`;
  document.body.appendChild(overlay);
  return overlay;
}

function setupFocusReading(reduced: boolean) {
  const enterBtn = document.querySelector<HTMLElement>('[data-focus-enter]');
  const article = document.querySelector<HTMLElement>('[data-article]');
  if (!enterBtn || !article || enterBtn.dataset.focusBound) return;

  enterBtn.dataset.focusBound = '1';
  const overlay = buildFocusOverlay();
  const scrollBox = overlay.querySelector<HTMLElement>('[data-focus-scroll]')!;
  let open = false;
  let tweening = false;
  let restoreFocusTo: HTMLElement | null = null;

  // 与返回顶部一致：滚过首屏后浮现入口
  const onScroll = () => enterBtn.classList.toggle('is-visible', window.scrollY > 500 && !open);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /** 隐藏沉浸时页面上被「请走」的部分（Flip 目标态正文已属于覆盖层，其余压暗即可） */
  const dimPage = (on: boolean) => {
    document.body.classList.toggle('focus-reading', on);
  };

  const FOCUS_GUARD_MS = 1400; // tween 兜底：标签页冻结等极端情况下不锁死交互
  const guarded = (fn: () => void, settle: () => void) => {
    fn();
    // tween 正常完成会自行落定；此 timeout 只在 tween 因故未完成时兜底
    let settled = false;
    const settleOnce = () => {
      if (!settled) {
        settled = true;
        settle();
      }
    };
    window.setTimeout(settleOnce, FOCUS_GUARD_MS);
    return settleOnce;
  };

  const enter = () => {
    if (open || tweening) return;
    open = true;
    tweening = true;
    restoreFocusTo = enterBtn;

    // 1. 记录正文当前位置（此时还在页面流里）
    const state = Flip.getState(article, { props: 'opacity,boxShadow,borderRadius' });
    // 2. 把正文挪进覆盖层的滚动容器（居中态样式由 body.focus-reading 提供）
    scrollBox.appendChild(article);
    dimPage(true);
    overlay.classList.add('is-open');
    scrollBox.scrollTop = 0;

    // 3. 覆盖层淡入 + 正文从原位飞到屏幕正中
    const settleEnter = guarded(
      () => {
        const tl = gsap.timeline({ onComplete: () => settleEnter() });
        tl.to(overlay, { opacity: 1, duration: reduced ? 0 : 0.35, ease: 'power2.out' }, 0).from(
          '[data-focus-exit]',
          { opacity: 0, y: -12, duration: reduced ? 0 : 0.4, ease: 'power2.out' },
          0.25,
        );
        Flip.from(state, {
          target: article,
          duration: reduced ? 0 : 0.75,
          ease: 'power3.inOut',
          scale: false,
          nested: true,
          onComplete: () => {
            article.style.willChange = 'auto';
            overlay.querySelector<HTMLElement>('[data-focus-exit]')?.focus({ preventScroll: true });
          },
        });
      },
      () => {
        tweening = false;
        gsap.set(overlay, { opacity: 1 }); // 兜底落定：进入态必须可见（CSS 默认是 0）
      },
    );
    addDisposer(exit);
  };

  const exit = () => {
    if (!open || tweening) return;
    open = false;
    tweening = true;

    // 记录正文在覆盖层里的当前位形（可能已滚动到中部）
    const state = Flip.getState(article, { props: 'opacity,boxShadow,borderRadius' });

    // 阅读位置恢复：记录覆盖层里视口顶部对应的正文元素，退出后滚回等效位置
    const viewportTopInArticle = scrollBox.scrollTop;
    const restoreScroll = () => {
      if (viewportTopInArticle < 10) return;
      // 按比例映射（覆盖层与页面正文宽度不同，行高近似，比例足够准确）
      const ratio = Math.min(1, viewportTopInArticle / Math.max(1, article.scrollHeight - scrollBox.clientHeight));
      const target = (document.documentElement.scrollHeight - window.innerHeight) * ratio;
      window.scrollTo({ top: target, behavior: 'instant' as ScrollBehavior });
    };

    // 放回页面原位置（.post-columns 的第一个子元素）
    const columns = document.querySelector('.post-columns');
    if (columns) columns.insertBefore(article, columns.firstChild);
    dimPage(false);
    scrollBox.scrollTop = 0;
    restoreScroll();

    const settleExit = guarded(
      () => {
        const tl = gsap.timeline({ onComplete: () => settleExit() });
        tl.to('[data-focus-exit]', { opacity: 0, y: -10, duration: reduced ? 0 : 0.25, ease: 'power2.in' }, 0).to(
          overlay,
          {
            opacity: 0,
            duration: reduced ? 0 : 0.4,
            ease: 'power2.in',
            onComplete: () => overlay.classList.remove('is-open'),
          },
          0.1,
        );
        Flip.from(state, {
          target: article,
          duration: reduced ? 0 : 0.75,
          ease: 'power3.inOut',
          scale: false,
          nested: true,
          onComplete: () => {
            article.style.willChange = 'auto';
            ScrollTrigger.refresh();
            restoreFocusTo?.focus({ preventScroll: true });
            restoreFocusTo = null;
          },
        });
      },
      () => {
        tweening = false;
        overlay.classList.remove('is-open'); // 兜底落定：覆盖层必关
        gsap.set(overlay, { clearProps: 'opacity' });
        restoreFocusTo?.focus({ preventScroll: true });
        restoreFocusTo = null;
        ScrollTrigger.refresh();
      },
    );
  };

  enterBtn.addEventListener('click', enter);
  overlay.addEventListener('click', (e) => {
    if (e.target === scrollBox) exit(); // 点击正文外空白 = 退出
  });
  overlay.querySelectorAll<HTMLElement>('[data-focus-exit]').forEach((b) => b.addEventListener('click', exit));
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && open) {
      e.preventDefault();
      exit();
    }
  };
  window.addEventListener('keydown', onKey);
  addDisposer(() => {
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('scroll', onScroll);
    // 视图过渡中途销毁时兜底：正文放回页面、覆盖层复位
    if (open) {
      const columns = document.querySelector('.post-columns');
      if (columns) columns.insertBefore(article, columns.firstChild);
      document.body.classList.remove('focus-reading');
      overlay.classList.remove('is-open');
      overlay.style.opacity = '';
    }
  });
}


/** 每页载入时执行 */
export function initPageAnimations() {
  cleanup();
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isDesktop = window.matchMedia('(min-width: 768px)').matches;

  // 必要交互：任何设置下都可用
  setupHeaderScrollState();
  setupCopyCode(document.body);
  setupToc(document.body, reduced);
  setupBackToTop(document.body, reduced);
  setupFocusReading(reduced);
  if (reduced) return; // 装饰动效全部跳过，元素呈现自然终态

  pageCtx = gsap.context(() => {
    setupAuroraParallax(isDesktop);
    setupHero(isDesktop);
    setupReveals(isDesktop);
    setupHeaderHide();
    setupProgressBar();
  }, document.body);
}

export function cleanup() {
  while (disposers.length) disposers.pop()!();
  heroSplit?.revert();
  heroSplit = null;
  pageCtx?.revert();
  pageCtx = null;
  ScrollTrigger.getAll().forEach((t) => t.kill());
}
