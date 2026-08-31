/**
 * 液态玻璃挂载入口。
 * 只在满足以下条件时启用引擎（否则宿主保留纯 CSS 毛玻璃兜底）：
 *  - 非移动端（宽度 ≥ 768px）
 *  - 未开启 prefers-reduced-motion
 *  - 元素带 [data-liquid-glass] 属性
 *  - 每个页面最多初始化 2 个（性能护栏，标记 data-liquid-glass 的元素按 DOM 顺序取前 2 个）
 */
import { createLiquidGlass } from './liquidGlass.js';
import './liquidGlass.css';

/** 文档第 2 节调好的参数 */
const PHYSICS_PRESET = {
  mode: 'physics',
  surface: 'convexSquircle',
  specular: 'physical',
  bezel: 30,
  thickness: 80,
  scale: 58,
  specularIntensity: 0.85,
  blur: 0.5,
  saturate: 1.2,
  dispersion: 0.4,
  lightAngle: 225,
  bend: 0.4,
  flip: false,
} as const;

const instances: ReturnType<typeof createLiquidGlass>[] = [];

export function initLiquidGlass() {
  if (typeof window === 'undefined') return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isDesktop = window.matchMedia('(min-width: 768px)').matches;
  if (reduced || !isDesktop) return;

  const hosts = Array.from(
    document.querySelectorAll<HTMLElement>('[data-liquid-glass]'),
  ).slice(0, 2); // 性能护栏：每页最多 2 个

  for (const host of hosts) {
    if (host.dataset.lgMounted) continue; // astro:page-load 重跑时防重复挂载
    host.dataset.lgMounted = '1';
    try {
      instances.push(createLiquidGlass(host, { ...PHYSICS_PRESET }));
    } catch {
      // 引擎失败时静默回退到纯 CSS 毛玻璃
      delete host.dataset.lgMounted;
    }
  }
}

export function destroyLiquidGlass() {
  while (instances.length) {
    const inst = instances.pop()!;
    try {
      inst.destroy();
    } catch {
      /* noop */
    }
  }
  document.querySelectorAll<HTMLElement>('[data-lg-mounted]').forEach((el) => {
    delete el.dataset.lgMounted;
  });
}
